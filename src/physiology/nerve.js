// Peripheral nerve model (median-like upper-limb nerve).
//
// Positions are millimetres along the limb, wrist stimulation site = 0, proximal positive.
// Each modelled axon has its own conduction velocity; a lesion acts on individual axons
// (transection, focal demyelination, conduction failure). Conduction times are
// integrated segment by segment, so slowing, dispersion and block are explicit.

import { makeRng, hashSeed } from '../core/rng.js';
import { PV } from '../core/params.js';

export const POS = {
  RING_G2: -(PV.distWristToRing + PV.ringSeparation),
  RING_G1: -PV.distWristToRing,
  MOTOR_POINT: -PV.distWristToMotorPoint,
  WRIST: 0,
  ELBOW: PV.distWristToElbow,
  AXILLA: PV.distWristToElbow + PV.distElbowToAxilla,
  ERB: PV.distWristToElbow + PV.distElbowToAxilla + 170,
  DRG: PV.distWristToElbow + PV.distElbowToAxilla + PV.distAxillaToCord - 30,
  CORD: PV.distWristToElbow + PV.distElbowToAxilla + PV.distAxillaToCord,
};

// Lesion sites offered in the UI. 'rootPre' lies between the DRG and the cord.
export const LESION_SITES = {
  distal: { a: -45, b: -15, en: 'Distal (wrist → muscle/digit)', zh: '远端（腕→肌肉/手指之间）' },
  forearm: { a: 95, b: 135, en: 'Forearm (between wrist and elbow sites)', zh: '前臂（腕与肘刺激点之间）' },
  upperArm: { a: 265, b: 295, en: 'Upper arm (between elbow and axilla sites)', zh: '上臂（肘与腋刺激点之间）' },
  plexus: { a: POS.AXILLA + 90, b: POS.AXILLA + 120, en: 'Plexus (proximal to all stimulation sites, distal to DRG)', zh: '神经丛（所有刺激点近端，DRG远端）' },
  rootPre: { a: POS.DRG + 8, b: POS.DRG + 22, en: 'Root, preganglionic (between DRG and cord)', zh: '神经根，节前（DRG与脊髓之间）' },
  // long proximal segment (plexus + spinal nerve) used by the late-response module only
  proximal: { a: POS.AXILLA + 20, b: POS.DRG - 10, en: 'Proximal (plexus to spinal nerve)', zh: '近端（神经丛至脊神经）', hidden: true },
};

export const STIM_SITES = {
  wrist: { pos: POS.WRIST, en: 'Wrist', zh: '腕' },
  elbow: { pos: POS.ELBOW, en: 'Elbow', zh: '肘' },
  axilla: { pos: POS.AXILLA, en: 'Axilla', zh: '腋' },
};

function bellBetween(rng, lo, hi) {
  // sum of uniforms → bell-shaped within [lo, hi]
  const u = (rng.next() + rng.next() + rng.next()) / 3;
  return lo + (hi - lo) * u;
}

export function buildNerve(seed = 1, pool = null) {
  const rng = makeRng(hashSeed('nerve', seed));
  const motor = [];
  for (let i = 0; i < PV.nMotorAxons; i++) {
    // size principle: larger (higher-threshold) units have larger, faster axons
    const rank = pool ? pool.units[i].rank : i / (PV.nMotorAxons - 1);
    // bell-shaped distribution: most fibres between ≈45 and ≈60 m/s, tails to the textbook extremes
    const u = Math.min(1, Math.max(0, 0.42 + 0.42 * rank + rng.normal(0, 0.13)));
    const cv = PV.motorCVSlow + (PV.motorCVFast - PV.motorCVSlow) * u;
    motor.push({
      id: i,
      kind: 'motor',
      cv,
      size: cv / PV.motorCVFast,
      stimThreshold: 12 + 26 * (1 - u) + rng.normal(0, 2.5), // mA at optimal position (illustrative)
      degenDay: rng.uniform(PV.wallerianMotorDays[0], PV.wallerianMotorDays[1]),
      depthMm: rng.uniform(2.5, 4.5),
    });
  }
  const sensory = [];
  for (let i = 0; i < PV.nSensoryAxons; i++) {
    // broad, flat-topped distribution: sensory CV range is wider than motor (p.32)
    const u = 0.5 * rng.next() + 0.5 * (rng.next() + rng.next()) / 2;
    const cv = PV.sensoryCVSlow + (PV.sensoryCVFast - PV.sensoryCVSlow) * u;
    sensory.push({
      id: i,
      kind: 'sensory',
      cv,
      size: cv / PV.sensoryCVFast,
      stimThreshold: 5 + 16 * (1 - (cv - PV.sensoryCVSlow) / (PV.sensoryCVFast - PV.sensoryCVSlow)) + rng.normal(0, 1.5),
      degenDay: rng.uniform(PV.wallerianSensoryDays[0], PV.wallerianSensoryDays[1]),
      rMm: rng.uniform(5, 7), // effective distance from digital nerve fibres to the ring electrodes (illustrative)
    });
  }
  return { seed, motor, sensory };
}

// ---------------------------------------------------------------------------
// Lesion description (all optional):
// {
//   axonal: { site, fracMotor, fracSensory, selection:'random'|'largest'|'smallest', day },
//   demyel: { site | 'diffuse', slowing 0..0.9, dispersion 0..1, block 0..1,
//             mechanism:'demyelination'|'nodal', diffuseSlowing 0..0.8 },
//   tempC
// }
// prepareLesion() turns it into per-axon flags with a reproducible RNG.
// ---------------------------------------------------------------------------
export function prepareLesion(nerve, lesion = {}, seed = 1) {
  const rng = makeRng(hashSeed('lesion', seed));
  const prep = { motor: [], sensory: [], lesion };
  const ax = lesion.axonal;
  const dm = lesion.demyel;
  for (const kind of ['motor', 'sensory']) {
    const list = nerve[kind];
    const frac = ax ? (kind === 'motor' ? ax.fracMotor || 0 : ax.fracSensory || 0) : 0;
    // choose which axons are transected
    const nCut = Math.round(frac * list.length);
    let order;
    if (ax && ax.selection === 'largest') order = list.slice().sort((a, b) => b.cv - a.cv);
    else if (ax && ax.selection === 'smallest') order = list.slice().sort((a, b) => a.cv - b.cv);
    else order = rng.shuffle(list);
    const cut = new Set(order.slice(0, nCut).map((a) => a.id));
    // demyelination factors
    const blockRng = makeRng(hashSeed('block', seed, kind));
    const severity = list.map(() => rng.normal(0, 1));
    const blockSet = new Set();
    if (dm && dm.block > 0) {
      const ids = blockRng.shuffle(list.map((a) => a.id));
      ids.slice(0, Math.round(dm.block * list.length)).forEach((id) => blockSet.add(id));
    }
    list.forEach((a, i) => {
      let segFactor = 1;
      if (dm && dm.mechanism !== 'nodal') {
        const mean = 1 - (dm.slowing || 0);
        const spread = 0.55 * (dm.dispersion || 0);
        segFactor = Math.max(0.06, Math.min(1, mean * Math.exp(spread * severity[i] - 0.5 * spread * spread)));
      }
      prep[kind].push({
        transected: cut.has(a.id),
        segFactor,
        blocked: blockSet.has(a.id),
      });
    });
  }
  return prep;
}

export function tempFactor(tempC = PV.refTempC) {
  // linear CV change (textbook 1.5–2.5 m/s per °C, applied proportionally to a 52 m/s fibre)
  return Math.max(0.3, 1 - (PV.cvPerDegC / 52) * (PV.refTempC - tempC));
}

function segmentOverlap(lo, hi, a, b) {
  return Math.max(0, Math.min(hi, b) - Math.max(lo, a));
}

// Does the axon still exist (excitable) at a given position along the limb on `day`?
function excitableAt(axon, pa, pos, lesion, day) {
  const ax = lesion && lesion.axonal;
  if (!ax || !pa.transected) return true;
  const site = LESION_SITES[ax.site];
  if (!site) return true;
  // sensory peripheral processes are attached to the DRG: a preganglionic lesion
  // leaves them (and the SNAP) intact (textbook p.28–29, Fig 3.10)
  if (axon.kind === 'sensory' && ax.site === 'rootPre') return true;
  const lesionPos = site.a;
  const distalToLesion = pos < lesionPos;
  if (!distalToLesion) return true; // proximal stump stays alive (cell body attached)
  return day < axon.degenDay; // Wallerian degeneration of the distal stump
}

// Conduction of one axon from position `from` to `to`. Returns {t (ms), ok, reason}.
export function conduct(axon, pa, from, to, lesion = {}, day = 365) {
  const ax = lesion.axonal;
  const dm = lesion.demyel;
  const tf = tempFactor(lesion.tempC);
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  // axon must be excitable at the stimulation site and along the path
  if (!excitableAt(axon, pa, from, lesion, day)) return { t: Infinity, ok: false, reason: 'degenerated' };
  if (!excitableAt(axon, pa, Math.min(from, to), lesion, day)) return { t: Infinity, ok: false, reason: 'degenerated' };
  // transection: impulse cannot cross the lesion
  if (ax && pa.transected && LESION_SITES[ax.site]) {
    const s = LESION_SITES[ax.site];
    const sensoryPre = axon.kind === 'sensory' && ax.site === 'rootPre';
    if (!sensoryPre && segmentOverlap(lo, hi, s.a, s.b) > 0) return { t: Infinity, ok: false, reason: 'transected' };
  }
  let base = axon.cv * tf * (pa.cvScale || 1);
  if (dm && dm.site === 'diffuse') base *= 1 - (dm.diffuseSlowing || 0);
  let t = 0;
  let L = hi - lo;
  if (dm && dm.site && dm.site !== 'diffuse' && LESION_SITES[dm.site]) {
    const s = LESION_SITES[dm.site];
    const sensoryPre = axon.kind === 'sensory' && dm.site === 'rootPre';
    const ov = sensoryPre ? 0 : segmentOverlap(lo, hi, s.a, s.b);
    if (ov > 0) {
      if (pa.blocked) return { t: Infinity, ok: false, reason: 'block' };
      t += ov / (base * pa.segFactor);
      L -= ov;
    }
  }
  t += L / base;
  return { t, ok: true, reason: '' };
}

// Which axons are activated by a stimulus of `intensity` mA (Infinity = supramaximal)
// delivered `offsetMm` lateral to the optimal position (textbook p.32–33).
export function activated(axon, intensity = Infinity, offsetMm = 0) {
  if (!Number.isFinite(intensity)) return true;
  const need = axon.stimThreshold * (1 + 0.55 * offsetMm * offsetMm);
  return intensity >= need;
}

// Position (mm) of the impulse front of one axon `t` ms after stimulation at `from`, moving
// towards `toward`. Used to animate the anatomy view with the same physiology as the traces.
// Returns { pos, stopped, reason } or null when the axon is not excitable at the stimulus site.
export function frontAt(axon, pa, from, toward, lesion = {}, day = 365, t = 0) {
  if (!excitableAt(axon, pa, from, lesion, day)) return null;
  const dir = toward < from ? -1 : 1;
  const ax = lesion.axonal;
  const dm = lesion.demyel;
  const tf = tempFactor(lesion.tempC);
  let base = axon.cv * tf * (pa.cvScale || 1);
  if (dm && dm.site === 'diffuse') base *= 1 - (dm.diffuseSlowing || 0);
  // ordered list of breakpoints along the path
  const pts = new Set([from, toward]);
  let seg = null;
  if (dm && dm.site && dm.site !== 'diffuse' && LESION_SITES[dm.site]) {
    const s = LESION_SITES[dm.site];
    if (!(axon.kind === 'sensory' && dm.site === 'rootPre')) seg = s;
  }
  let cut = null;
  if (ax && pa.transected && LESION_SITES[ax.site] && !(axon.kind === 'sensory' && ax.site === 'rootPre')) cut = LESION_SITES[ax.site];
  for (const s of [seg, cut]) if (s) [s.a, s.b].forEach((p) => (Math.min(from, toward) < p && p < Math.max(from, toward) ? pts.add(p) : null));
  const sorted = [...pts].sort((a, b) => (dir > 0 ? a - b : b - a));
  let pos = from;
  let tLeft = t;
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const mid = (pos + next) / 2;
    // transection: impulse cannot enter the lesion
    if (cut && mid > cut.a && mid < cut.b) return { pos, stopped: true, reason: 'transected' };
    // distal stump degenerated?
    if (!excitableAt(axon, pa, mid, lesion, day)) return { pos, stopped: true, reason: 'degenerated' };
    let v = base;
    if (seg && mid > seg.a && mid < seg.b) {
      if (pa.blocked) return { pos, stopped: true, reason: 'block' };
      v = base * pa.segFactor;
    }
    const len = Math.abs(next - pos);
    const tNeed = len / v;
    if (tLeft <= tNeed) return { pos: pos + dir * v * tLeft, stopped: false, reason: '' };
    tLeft -= tNeed;
    pos = next;
  }
  return { pos: toward, stopped: false, arrived: true, reason: '' };
}

// Segment states of one axon for drawing (normal / demyelinated / degenerated distal stump).
export function axonSegments(axon, pa, lesion = {}, day = 365, distalEnd) {
  const out = [];
  const top = axon.kind === 'sensory' ? POS.CORD : POS.CORD;
  const ax = lesion.axonal;
  const dm = lesion.demyel;
  const cuts = [];
  if (ax && pa.transected && LESION_SITES[ax.site] && !(axon.kind === 'sensory' && ax.site === 'rootPre')) cuts.push(LESION_SITES[ax.site]);
  const demy = dm && dm.site && dm.site !== 'diffuse' && LESION_SITES[dm.site] && !(axon.kind === 'sensory' && dm.site === 'rootPre') ? LESION_SITES[dm.site] : null;
  const marks = [top, distalEnd];
  cuts.forEach((c) => marks.push(c.a, c.b));
  if (demy) marks.push(demy.a, demy.b);
  const pts = [...new Set(marks)].filter((p) => p <= top && p >= distalEnd).sort((a, b) => b - a);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const mid = (a + b) / 2;
    let state = 'normal';
    if (cuts.length && cuts.some((c) => mid > c.a && mid < c.b)) state = 'degenerated';
    else if (!excitableAt(axon, pa, mid, lesion, day)) state = 'degenerated';
    else if (dm && dm.site === 'diffuse') state = 'demyel';
    else if (demy && mid > demy.a && mid < demy.b) state = 'demyel';
    out.push({ from: a, to: b, state });
  }
  return out;
}
