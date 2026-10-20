// Nerve conduction synthesis.
//   CMAP = Σ over motor units that are reached by the stimulus of
//          (that unit's surface motor-unit potential, built fibre by fibre with the
//           line-source model) shifted by (nerve conduction time + terminal/NMJ delay).
//   SNAP = Σ over activated sensory axons of the travelling single-fibre potential at
//          G1 minus that at G2 (bipolar recording along the nerve).
// Phase cancellation, dispersion and electrode-position effects are therefore emergent.

import { FiberTable, TravellingKernel, DT, logspace, linspace } from './volume.js';
import { PV } from '../core/params.js';
import { POS, conduct, activated, tempFactor } from '../physiology/nerve.js';
import { MUSCLE_W, F_LOST, F_DENERVATED } from '../physiology/muscle.js';
import { makeRng, hashSeed } from '../core/rng.js';

let surfaceTable = null;
export function getSurfaceTable() {
  if (!surfaceTable) {
    const near = linspace(-30, 30, 61);
    const farPos = linspace(32.5, 100, 28);
    const z0s = [...farPos.map((z) => -z).reverse(), ...near, ...farPos];
    surfaceTable = new FiberTable({
      rs: logspace(1.5, 45, 14),
      z0s,
      vRef: PV.muscleFiberCV,
      s: 0.7,
      halfLen: 50,
      endTaper: 20, // AP decrements towards the fibre ends (schematic termination)
      T: 24,
      h: 0.4,
      aniso: 3, // muscle conducts better along than across fibres (illustrative ratio)
    });
  }
  return surfaceTable;
}

let kernel = null;
let tauCal = null;
export function getKernel() {
  if (!kernel) kernel = new TravellingKernel({ rhos: logspace(0.03, 40, 34) });
  return kernel;
}

// Calibrate the time scale of single sensory-fibre APs so that a fast fibre recorded at
// ≈3 mm has a ≈0.5 ms negative phase (textbook p.31).
export function sensoryTau() {
  if (tauCal) return tauCal;
  const k = getKernel();
  const v = PV.sensoryCVFast;
  const r = 6;
  let tau = 0.1;
  for (let it = 0; it < 30; it++) {
    const s = v * tau;
    const a = new Float64Array(400);
    k.addInto(a, 6, tau, r / s, 1);
    // negative phase width
    let iMin = 0;
    for (let i = 0; i < a.length; i++) if (a[i] < a[iMin]) iMin = i;
    let i0 = iMin;
    while (i0 > 0 && a[i0] < 0) i0--;
    let i1 = iMin;
    while (i1 < a.length - 1 && a[i1] < 0) i1++;
    const w = (i1 - i0) * DT;
    tau *= PV.sensoryNegPhaseMs / Math.max(w, 1e-3);
  }
  tauCal = tau;
  return tau;
}

// ---------------------------------------------------------------------------
// Electrode montage for motor studies.
// g1Z: axial offset of G1 from the motor point (mm); g1X: lateral position (mm);
// g2Z: G2 axial position (tendon, beyond the fibre ends).
// ---------------------------------------------------------------------------
export const DEFAULT_MONTAGE = { g1Z: 0, g1X: MUSCLE_W / 2, g2Z: 90, g2X: MUSCLE_W / 2, skin: 6 };

const templateCache = new Map();

// Surface motor-unit potential (bipolar G1−G2) for every unit, relative to the moment the
// nerve impulse reaches the motor point. Window 0…28 ms.
export function unitSurfaceTemplates(pool, montage = DEFAULT_MONTAGE, tempC = PV.refTempC, stride = 1) {
  const key = `${pool.seed}|${pool.version}|${pool.tag || ''}|${JSON.stringify(montage)}|${tempC}|${stride}`;
  if (templateCache.has(key)) return templateCache.get(key);
  const tab = getSurfaceTable();
  const nT = Math.round(28 / DT);
  const cool = Math.max(0, PV.refTempC - tempC);
  // cooling: slower muscle-fibre conduction, larger/longer fibre potentials (p.78)
  const vScale = tempFactor(tempC);
  const ampScale = 1 + 0.5 * PV.apWidthPerDegC * cool;
  const out = pool.units.map(() => new Float64Array(nT));
  for (let fi = 0; fi < pool.fibers.length; fi += stride) {
    const f = pool.fibers[fi];
    if (f.state === F_LOST || f.state === F_DENERVATED) continue;
    const dst = out[f.unit];
    const dy = f.y + montage.skin;
    const r1 = Math.hypot(f.x - montage.g1X, dy);
    const r2 = Math.hypot(f.x - montage.g2X, dy);
    const v = PV.muscleFiberCV * f.diam * (f.cvFactor || 1) * vScale;
    const gain = f.diam * f.diam * ampScale * stride;
    const delay = 0.3 + f.termDelay + f.sproutDelay;
    tab.addInto(dst, r1, montage.g1Z - f.zEp, delay, gain, v);
    tab.addInto(dst, r2, montage.g2Z - f.zEp, delay, -gain, v);
  }
  templateCache.set(key, out);
  if (templateCache.size > 40) templateCache.delete(templateCache.keys().next().value);
  return out;
}

export function clearTemplateCache() {
  templateCache.clear();
}

// Terminal axon + NMJ delay with temperature (DL changes ≈0.2 ms/°C in total, p.78;
// the nerve part comes from CV slowing, the rest is assigned here – derived).
export function terminalDelay(tempC = PV.refTempC) {
  const cool = PV.refTempC - tempC;
  return PV.terminalDelayMs + 0.14 * cool;
}

// ---------------------------------------------------------------------------
// CMAP for one stimulation site. Returns trace (mV), per-unit arrival info, scale factor.
// ---------------------------------------------------------------------------
export function synthCMAP({
  nerve,
  prep,
  pool,
  lesion = {},
  day = 365,
  stimPos = POS.WRIST,
  intensity = Infinity,
  stimOffsetMm = 0,
  montage = DEFAULT_MONTAGE,
  sweepMs = 30,
  scale = 1,
  units = null, // optional subset of unit ids
  stride = 1, // fibre subsampling for fast approximate templates (time-course curves)
}) {
  const tempC = lesion.tempC ?? PV.refTempC;
  const tpl = unitSurfaceTemplates(pool, montage, tempC, stride);
  const n = Math.round(sweepMs / DT);
  const trace = new Float64Array(n);
  const arrivals = [];
  const td = terminalDelay(tempC);
  for (let i = 0; i < nerve.motor.length; i++) {
    if (units && !units.includes(i)) continue;
    const axon = nerve.motor[i];
    const pa = prep.motor[i];
    if (!activated(axon, intensity, stimOffsetMm)) {
      arrivals.push({ id: i, ok: false, reason: 'not stimulated' });
      continue;
    }
    const c = conduct(axon, pa, stimPos, POS.MOTOR_POINT, lesion, day);
    if (!c.ok) {
      arrivals.push({ id: i, ok: false, reason: c.reason });
      continue;
    }
    const t0 = c.t + td;
    arrivals.push({ id: i, ok: true, t: t0, nerveT: c.t });
    const src = tpl[i];
    const d0 = t0 / DT;
    const k0 = Math.floor(d0);
    const fr = d0 - k0;
    for (let k = 0; k < src.length; k++) {
      const j = k0 + k;
      if (j >= n - 1) break;
      if (j < 0) continue;
      trace[j] += src[k] * (1 - fr) * scale;
      trace[j + 1] += src[k] * fr * scale;
    }
  }
  return { trace, arrivals };
}

// Single-unit contribution (for highlighting one unit's share of the CMAP).
export function unitContribution(tpl, arrival, sweepMs, scale) {
  const n = Math.round(sweepMs / DT);
  const out = new Float64Array(n);
  if (!arrival || !arrival.ok) return out;
  const src = tpl[arrival.id];
  const d0 = arrival.t / DT;
  for (let k = 0; k < src.length; k++) {
    const j = Math.floor(d0) + k;
    if (j >= 0 && j < n) out[j] = src[k] * scale;
  }
  return out;
}

// ---------------------------------------------------------------------------
// SNAP (antidromic by default: stimulate at stimPos, record ring electrodes on digit).
// ---------------------------------------------------------------------------
export function synthSNAP({
  nerve,
  prep,
  lesion = {},
  day = 365,
  stimPos = POS.WRIST,
  intensity = Infinity,
  stimOffsetMm = 0,
  g1Pos = POS.RING_G1,
  g2Pos = POS.RING_G2,
  rScale = 1,
  sweepMs = 12,
  scale = 1,
}) {
  const tempC = lesion.tempC ?? PV.refTempC;
  const k = getKernel();
  const tau0 = sensoryTau();
  const cool = Math.max(0, PV.refTempC - tempC);
  const tau = tau0 * (1 + PV.apWidthPerDegC * cool); // longer fibre APs when cool (p.78)
  const tf = tempFactor(tempC);
  const n = Math.round(sweepMs / DT);
  const trace = new Float64Array(n);
  const arrivals = [];
  const dm = lesion.demyel;
  for (let i = 0; i < nerve.sensory.length; i++) {
    const axon = nerve.sensory[i];
    const pa = prep.sensory[i];
    if (!activated(axon, intensity, stimOffsetMm)) {
      arrivals.push({ id: i, ok: false, reason: 'not stimulated' });
      continue;
    }
    const c1 = conduct(axon, pa, stimPos, g1Pos, lesion, day);
    const c2 = conduct(axon, pa, stimPos, g2Pos, lesion, day);
    if (!c1.ok) {
      arrivals.push({ id: i, ok: false, reason: c1.reason });
      continue;
    }
    // local velocity under the electrodes sets the spatial extent of the AP
    let vLocal = axon.cv * tf;
    if (dm && dm.site === 'diffuse') vLocal *= 1 - (dm.diffuseSlowing || 0);
    const s = vLocal * tau;
    const rho = (axon.rMm * rScale) / s;
    const g = 1 + PV.coolAmpPerDegC * cool; // larger fibre APs when cool (p.78)
    k.addInto(trace, c1.t, tau, rho, g * scale);
    // G2 sits over the distal phalanx where the digital branches are thinner and deeper:
    // modelled as a larger effective distance (illustrative)
    if (c2.ok) k.addInto(trace, c2.t, tau, rho * 1.6, -g * scale);
    arrivals.push({ id: i, ok: true, t: c1.t });
  }
  return { trace, arrivals };
}

// ---------------------------------------------------------------------------
// Stimulus artefact (far-field: appears at the same time at every recording site, p.21)
// and display noise.
// ---------------------------------------------------------------------------
export function addArtifact(trace, ampMv, seed = 1) {
  const n = trace.length;
  const out = Float64Array.from(trace);
  for (let i = 0; i < Math.min(n, Math.round(1.2 / DT)); i++) {
    const t = i * DT;
    out[i] += ampMv * (t < 0.1 ? 1 : -0.45 * Math.exp(-(t - 0.1) / 0.25));
  }
  return out;
}

export function addNoise(trace, rmsMv, seed = 1) {
  if (!rmsMv) return trace;
  const rng = makeRng(hashSeed('noise', seed));
  const out = Float64Array.from(trace);
  let prev = 0;
  for (let i = 0; i < out.length; i++) {
    prev = 0.6 * prev + 0.4 * rng.normal(0, rmsMv * 1.6);
    out[i] += prev;
  }
  return out;
}
