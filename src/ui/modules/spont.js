// Spontaneous activity lab: one generator at a time (single muscle fibre, a loop of fibres,
// a whole motor unit, or the endplate), its firing pattern, and what the needle records.
// Waveforms come from the same line-source needle model as the MUAPs; event timing comes
// from physiology/spontaneous.js. Every measurement is taken from the generated signal/events.

import { L } from '../../content/i18n.js';
import { PV } from '../../core/params.js';
import { makeRng, hashSeed } from '../../core/rng.js';
import { DT } from '../../synthesis/volume.js';
import { fibWaveform, pswWaveform, endplateSpikeWaveform, needleMUAPs, add, PSW_OVER } from '../../synthesis/emg.js';
import { measureMUAP } from '../../synthesis/measure.js';
import { getSubject, scenario, DEFAULT_PARAMS } from '../../physiology/subject.js';
import { fibersNear } from '../../physiology/muscle.js';
import { atrophyFactor } from '../../physiology/lesions.js';
import { regularTrain, irregularTrain, waxWaneTrain, crdTrain, sputterTrain } from '../../physiology/spontaneous.js';
import { drawCrossSection } from '../../render/meso.js';
import { drawFiberElectrode } from '../../render/micro.js';
import { theme, withAlpha, unitColor } from '../../render/theme.js';
import { drawGenerator } from '../../render/generator.js';
import * as T from '../../content/spont.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
export const TYPES = ['fib', 'psw', 'endplate', 'myotonic', 'crd', 'fasc'];
const FIB_DIST = 8; // mm from the endplate (origin) to the needle along the fibre
const G = PV.spontFiberGain; // calibration of spontaneous single-fibre amplitudes (see params)

export function spontDefaults() {
  return {
    type: 'fib',
    dist: 0.3, // needle–fibre distance (mm)
    months: 1, // since denervation (fib/PSW)
    rate: 5, // Hz (fib/PSW)
    nSources: 1,
    epKind: 'both',
    myoMax: 120,
    myoWave: 'spike',
    crdFibers: 5,
    crdRate: 30,
    crdDrop: false,
    fascUnit: 'normal',
    fascPattern: 'single',
    fascRate: 0.5,
    seed: 1,
  };
}

export function windowMs(type, pattern) {
  if (type === 'fasc') return 10000;
  if (type === 'myotonic') return 1500;
  if (type === 'crd') return 500;
  if (type === 'endplate') return 500;
  return 1000;
}

// ---- generator geometry: real fibres of the modelled muscle near a fixed needle site ----
const NEEDLE = { x: 10, y: 6, z: 12 };
function sourceFibres(pool, grid, dist, n, seed) {
  const near = fibersNear(pool, grid, NEEDLE.x, NEEDLE.y, 1.2);
  near.sort((a, b) => Math.abs(a[1] - dist) - Math.abs(b[1] - dist));
  const first = near[0];
  const out = [first];
  const rng = makeRng(hashSeed('src', seed));
  const rest = near.filter(([f, r]) => f !== first[0] && r > 0.12 && r < 1.0);
  rng.shuffle(rest);
  for (let i = 0; out.length < n && i < rest.length; i++) out.push(rest[i]);
  return out;
}
function crdCluster(pool, grid, n) {
  // adjacent fibres (grouped atrophy): the n nearest fibres to a point 0.15 mm from the needle
  const cx = NEEDLE.x + 0.15;
  const cy = NEEDLE.y;
  const near = fibersNear(pool, grid, cx, cy, 0.8).map(([f]) => [f, Math.hypot(f.x - cx, f.y - cy)]);
  near.sort((a, b) => a[1] - b[1]);
  return near.slice(0, n).map(([f]) => [f, Math.hypot(f.x - NEEDLE.x, f.y - NEEDLE.y)]);
}

function noise(n, seed, rmsMv) {
  const rng = makeRng(hashSeed('noise', seed));
  const a = new Float64Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp = 0.6 * lp + 0.4 * rng.normal(0, 1);
    a[i] = lp * rmsMv * 1.9;
  }
  return a;
}

function meppWave(ampMv) {
  // monophasic negative endplate potential recorded extracellularly (schematic shape)
  const n = Math.round(6 / DT);
  const w = new Float64Array(n);
  let pk = 0;
  for (let i = 0; i < n; i++) {
    const t = i * DT;
    w[i] = -(1 - Math.exp(-t / 0.25)) * Math.exp(-t / 1.2);
    pk = Math.min(pk, w[i]);
  }
  for (let i = 0; i < n; i++) w[i] *= ampMv / -pk;
  return w;
}

function muapOf(type, seed) {
  // fasciculation: a whole motor unit discharges; normal pool or a chronically reinnervated one
  let pool;
  let grid;
  if (type === 'reinnervated') {
    const p = clone(DEFAULT_PARAMS);
    p.seed = seed;
    p.day = 365;
    p.axonal = { ...p.axonal, on: true, site: 'forearm', frac: 0.7, population: 'motor' };
    p.reinnervation = 0.85;
    const sc = scenario(p);
    pool = sc.pool;
    grid = sc.subj.grid;
  } else {
    const s = getSubject(seed);
    pool = s.pool;
    grid = s.grid;
  }
  let best = null;
  for (const [uid, e] of needleMUAPs(pool, grid, NEEDLE)) {
    const q = measureMUAP(e.wave);
    if (!q.present) continue;
    // a typical, not extreme, unit: the largest within the 0.3–3 mV band
    if (q.p2p > 3) continue;
    if (!best || q.p2p > best.q.p2p) best = { uid, wave: e.wave, q };
  }
  return { ...best, pool, grid };
}

function fascEvents(c, W, seed) {
  const rng = makeRng(hashSeed('fpat', seed));
  if (c.fascPattern === 'myokymic') {
    const out = [];
    let t = 150;
    while (t < W) {
      const n = 2 + rng.int(6); // number per burst varies (p.240)
      for (let k = 0; k < n; k++) out.push({ t: t + (k * 1000) / 30, amp: 1, burst: k > 0 });
      t += 1000 / 1 + rng.normal(0, 60);
    }
    return out.filter((e) => e.t < W - 30);
  }
  const base = irregularTrain(c.fascRate, W - 40, seed);
  if (c.fascPattern === 'single') return base;
  const out = [];
  for (const e of base) {
    const n = c.fascPattern === 'doublet' ? 2 : 3;
    for (let k = 0; k < n; k++) out.push({ t: e.t + k * PV.doubletIntervalMs, amp: 1, burst: k > 0 });
  }
  return out;
}

export function computeSpont(c) {
  const W = c.winOverride || windowMs(c.type, c.fascPattern);
  const n = Math.round(W / DT);
  const sig = noise(n, hashSeed(c.seed, c.type), (PV.noiseUv * 2) / 1000);
  const subj = getSubject(c.seed);
  const out = { c: clone(c), W, sig, events: [], sources: [], single: null };
  if (c.type === 'fib' || c.type === 'psw') {
    const days = c.months * 30.4;
    const diam = atrophyFactor(days);
    out.diam = diam;
    const src = sourceFibres(subj.pool, subj.grid, c.dist, c.nSources, c.seed);
    src.forEach(([f, r], k) => {
      // only the first source is "under" the needle (may be deformed → PSW); others are fibrillations
      const asPSW = c.type === 'psw' && k === 0;
      const w = asPSW ? pswWaveform(Math.max(0.03, r), FIB_DIST).map((v) => v * diam * diam) : fibWaveform(Math.max(0.03, r), FIB_DIST + k * 1.7, diam).map((v) => v * G);
      const rate = k === 0 ? c.rate : PV.fibRateHz[0] + ((PV.fibRateHz[1] - PV.fibRateHz[0]) * ((f.id * 37) % 100)) / 100;
      const ev = regularTrain(rate, W - 15, hashSeed(c.seed, f.id));
      ev.forEach((e) => {
        add(sig, w, e.t, 1);
        out.events.push({ ...e, src: k });
      });
      out.sources.push({ fid: f.id, r, rate, kind: asPSW ? 'psw' : 'fib', wave: w });
    });
    out.single = out.sources[0].wave;
  } else if (c.type === 'endplate') {
    const [[f, r]] = sourceFibres(subj.pool, subj.grid, c.dist, 1, c.seed);
    const sp = endplateSpikeWaveform(Math.max(0.05, r)).map((v) => v * G);
    const mepp = meppWave(PV.meppAmpUv / 1000);
    if (c.epKind !== 'spikes') {
      const rng = makeRng(hashSeed('mepp', c.seed));
      let t = rng.exponential(1000 / 30);
      while (t < W - 8) {
        add(sig, mepp, t, 0.6 + 0.8 * rng.next());
        out.events.push({ t, src: 1, kind: 'mepp' });
        t += Math.max(2, rng.exponential(1000 / 30));
      }
    }
    if (c.epKind !== 'noise') {
      sputterTrain(15, W - 15, c.seed).forEach((e) => {
        add(sig, sp, e.t, e.amp);
        out.events.push({ ...e, src: 0, kind: 'spike' });
      });
    }
    out.sources.push({ fid: f.id, r, kind: 'endplate', wave: c.epKind === 'noise' ? mepp : sp });
    out.single = c.epKind === 'noise' ? mepp : sp;
  } else if (c.type === 'myotonic') {
    const [[f, r]] = sourceFibres(subj.pool, subj.grid, c.dist, 1, c.seed);
    const w = c.myoWave === 'psw' ? pswWaveform(Math.max(0.03, r), FIB_DIST) : fibWaveform(Math.max(0.03, r), FIB_DIST, 1).map((v) => v * G);
    waxWaneTrain(PV.myotonicHz[0], c.myoMax, W - 15, c.seed).forEach((e) => {
      add(sig, w, e.t, e.amp);
      out.events.push({ ...e, src: 0 });
    });
    out.sources.push({ fid: f.id, r, kind: 'myotonic', wave: w });
    out.single = w;
  } else if (c.type === 'crd') {
    const cl = crdCluster(subj.pool, subj.grid, c.crdFibers);
    const waves = cl.map(([f, r], i) => fibWaveform(Math.max(0.04, r), 4 + ((i * 2.3) % 7), 1).map((v) => v * G));
    const { events, delays } = crdTrain({ nFibers: c.crdFibers, rateHz: c.crdRate, windowMs: W, startMs: 60, stopMs: W - 70, dropAt: c.crdDrop ? W / 2 : null, seed: c.seed });
    events.forEach((e) => {
      add(sig, waves[e.fiber], e.t, 1);
      out.events.push({ ...e, src: e.fiber });
    });
    cl.forEach(([f, r], i) => out.sources.push({ fid: f.id, r, kind: 'crd', delay: delays[i], wave: waves[i] }));
    // one complex = all fibres at their loop delays
    const cx = new Float64Array(Math.round((delays[delays.length - 1] + 14) / DT));
    waves.forEach((w, i) => add(cx, w, delays[i], 1));
    out.single = cx;
    out.delays = delays;
  } else if (c.type === 'fasc') {
    const mu = muapOf(c.fascUnit, c.seed);
    out.mu = mu;
    fascEvents(c, W, c.seed).forEach((e) => {
      add(sig, mu.wave, e.t, 1);
      out.events.push({ ...e, src: 0 });
    });
    out.sources.push({ uid: mu.uid, kind: 'fasc', wave: mu.wave });
    out.single = mu.wave;
  }
  out.events.sort((a, b) => a.t - b.t);
  out.meas = measureFiring(out);
  return out;
}

// Firing measurements, from the generated events and the generated single discharge.
export function measureFiring(r) {
  const c = r.c;
  // the generator whose pattern we characterise: source 0 (or complexes for CRD)
  let ev = r.events.filter((e) => e.src === 0 && e.kind !== 'mepp');
  if (c.type === 'endplate' && c.epKind === 'noise') ev = r.events.filter((e) => e.kind === 'mepp');
  if (c.type === 'fasc' && c.fascPattern !== 'single') ev = r.events.filter((e) => !e.burst); // burst leaders
  const t = ev.map((e) => e.t);
  const isi = [];
  for (let i = 1; i < t.length; i++) isi.push(t[i] - t[i - 1]);
  const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
  const mi = mean(isi);
  const sdv = isi.length > 1 ? Math.sqrt(isi.reduce((s, v) => s + (v - mi) ** 2, 0) / (isi.length - 1)) : NaN;
  const inst = isi.map((d) => 1000 / d);
  // all potentials on screen pooled (what the eye sees when several generators fire)
  const allT = r.events.filter((e) => e.kind !== 'mepp').map((e) => e.t);
  if (c.type === 'crd') {
    // complexes: first-fibre events
    const cxT = r.events.filter((e) => e.fiber === 0).map((e) => e.t);
    allT.length = 0;
    allT.push(...cxT);
  }
  const pisi = [];
  for (let i = 1; i < allT.length; i++) pisi.push(allT[i] - allT[i - 1]);
  const pm = mean(pisi);
  const psd = pisi.length > 1 ? Math.sqrt(pisi.reduce((s, v) => s + (v - pm) ** 2, 0) / (pisi.length - 1)) : NaN;
  // single potential morphology
  const w = r.single;
  const q = measureMUAP(w, { thrAbs: 0.004 });
  let pk = 0;
  for (const v of w) pk = Math.max(pk, Math.abs(v));
  let init = 0;
  for (const v of w) {
    if (Math.abs(v) > 0.1 * pk) {
      init = Math.sign(v);
      break;
    }
  }
  let p2p = 0;
  let mn = Infinity;
  let mx = -Infinity;
  for (const v of w) {
    mn = Math.min(mn, v);
    mx = Math.max(mx, v);
  }
  p2p = mx - mn;
  // CRD: spread of the intra-complex timing between successive complexes (jitter)
  let jitter = null;
  if (c.type === 'crd') {
    const lastIdx = c.crdFibers - 1;
    const firsts = r.events.filter((e) => e.fiber === 0);
    const lasts = r.events.filter((e) => e.fiber === lastIdx);
    const d = [];
    for (const a of firsts) {
      const b = lasts.find((x) => x.t > a.t && x.t - a.t < 30);
      if (b) d.push(b.t - a.t);
    }
    const md = mean(d);
    jitter = d.length > 1 ? Math.sqrt(d.reduce((s, v) => s + (v - md) ** 2, 0) / (d.length - 1)) * 1000 : 0;
  }
  return {
    n: t.length,
    rate: isi.length ? 1000 / mi : NaN,
    isiCV: isi.length > 1 ? (100 * sdv) / mi : NaN,
    fMin: inst.length ? Math.min(...inst) : NaN,
    fMax: inst.length ? Math.max(...inst) : NaN,
    pooledN: allT.length,
    pooledCV: pisi.length > 1 ? (100 * psd) / pm : NaN,
    p2p: p2p * 1000,
    duration: q.present ? q.duration : NaN,
    phases: q.present ? q.phases : NaN,
    initial: init, // +1 positive (displayed down), −1 negative (displayed up)
    jitter,
  };
}

function autoGain(sig) {
  let pk = 0;
  for (const v of sig) pk = Math.max(pk, Math.abs(v));
  for (const g of [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2]) if (pk / g <= 2.3) return g;
  return 2;
}

// index of the last event at or before t (for the expanded view and the animations)
function lastEventBefore(r, t, filter = () => true) {
  let best = null;
  for (const e of r.events) {
    if (e.t > t) break;
    if (filter(e)) best = e;
  }
  return best;
}

export default {
  id: 'spont',
  phase: 2,
  title: { zh: '自发电位实验室', en: 'Spontaneous activity' },
  scales: ['macro', 'meso', 'micro'],
  hasContributions: false,
  noOverlay: true,
  defaults: spontDefaults,
  controls: (p) => T.controls(p),
  compute: (c) => computeSpont(c),
  audio: (r) => r.sig,
  timeWindow(r, c) {
    const W = r.W;
    return { t0: 0, t1: W, step: W / 400, defaultSpeed: W >= 5000 ? 1 : 0.25, key: 'spont-' + c.type + W };
  },
  scope(r, c, vo) {
    const th = theme();
    const W = r.W;
    const g = autoGain(r.sig);
    const col = c.type === 'fasc' ? unitColor(r.mu?.uid ?? 0) : th.trace;
    const cur = vo.t ?? W;
    // expanded view: the discharge (or complex) nearest before the cursor
    const isLead = (e) => (c.type === 'crd' ? e.fiber === 0 : c.type === 'endplate' && c.epKind === 'both' ? e.kind === 'spike' : true);
    const e = lastEventBefore(r, cur, isLead) || r.events.find(isLead);
    const span = c.type === 'crd' || c.type === 'fasc' ? 30 : c.type === 'endplate' ? 10 : 15;
    const pre = c.type === 'fasc' ? 6 : 2.5;
    const rows = [
      {
        label: L('连续记录', 'Free run'),
        gain: g,
        traces: [{ data: r.sig, color: col, width: 1.1 }],
        markers: e ? [{ t: e.t, color: th.highlight }] : [],
        note: T.firingNote(r),
      },
    ];
    if (e) {
      rows.push({
        label: L('放大单次放电', 'One discharge,\nexpanded'),
        gain: autoGain(r.single) / (c.type === 'fasc' ? 1 : 1),
        sweep: span / 10,
        t0: e.t - pre,
        traces: [{ data: r.sig, color: col, width: 1.8 }],
        note: T.morphNote(r),
      });
    }
    return { rows, sweep: W / 10, t0: 0, title: T.scopeTitle(r), legend: T.scopeLegend(r) };
  },
  drawAnatomy(ctx, w, h, r, c, vo) {
    const t = vo.t ?? 0;
    const lang = vo.lang;
    if (vo.scale === 'meso') {
      const subj = getSubject(c.seed);
      const pool = c.type === 'fasc' ? r.mu.pool : subj.pool;
      const last = new Map();
      for (const e of r.events) {
        if (e.t > t) break;
        last.set(e.src, e.t);
      }
      const spont = [];
      if (c.type !== 'fasc') {
        r.sources.forEach((s, k) => {
          if (s.fid === undefined) return;
          const lt = last.get(k);
          const a = lt === undefined ? 0.25 : Math.max(0.25, Math.exp(-(t - lt) / 25));
          spont.push([s.fid, a]);
        });
      }
      let active;
      if (c.type === 'fasc') {
        const lt = last.get(0);
        active = new Map([[r.mu.uid, lt === undefined ? 0.15 : Math.max(0.15, Math.exp(-(t - lt) / 30))]]);
      }
      drawCrossSection(ctx, w, h, {
        pool,
        needle: NEEDLE,
        zoom: c.type === 'fasc' ? null : 1.1,
        highlight: c.type === 'fasc' ? new Set([r.mu.uid]) : new Set(),
        active,
        spontaneous: spont,
        rings: c.type === 'fasc' ? [1] : [0.5, 1],
        lang,
        caption: T.mesoCaption(r),
      });
      return { hits: [], legend: T.mesoLegend(r) };
    }
    if (vo.scale === 'micro' && c.type !== 'crd' && c.type !== 'fasc') {
      const e = lastEventBefore(r, t, (x) => x.src === 0 && x.kind !== 'mepp');
      const since = e ? t - e.t : null;
      const s0 = r.sources[0];
      const atEp = c.type === 'endplate';
      drawFiberElectrode(ctx, w, h, {
        fiber: { halfLen: 30, v: PV.muscleFiberCV * (r.diam ?? 1), s: 1 },
        electrodes: [{ z0: atEp ? 0 : FIB_DIST + (c.type === 'psw' || (c.type === 'myotonic' && c.myoWave === 'psw') ? PSW_OVER : 0), r: s0.r, label: L('针尖', 'needle tip'), color: theme().accent }],
        t: since !== null && since < 12 ? since + 0.3 : null,
        lang,
        blockAt: c.type === 'psw' || (c.type === 'myotonic' && c.myoWave === 'psw') ? FIB_DIST : null,
        title: T.microTitle(r),
      });
      return { hits: [], legend: T.microLegend(r) };
    }
    drawGenerator(ctx, w, h, r, c, t, lang);
    return { hits: [], legend: T.macroLegend(r) };
  },
  explain: (r, c) => T.explain(r, c),
  why: (prev, cur) => T.why(prev, cur),
  modelNotes: () => T.modelNotes(),
  comparePresets: () => T.comparePresets(),
  compareWindow: () => ({ t0: 0, t1: 1000, step: 2.5, defaultSpeed: 0.1, key: 'spont-compare' }),
  compareScope(list, c, vo) {
    const th = theme();
    const rows = list.map(({ preset, result }) => ({
      label: L(preset.label),
      gain: autoGain(result.sig.subarray(0, Math.round(1000 / DT))),
      traces: [{ data: result.sig, color: th.trace, width: 1.1 }],
      note: T.firingNote(result),
    }));
    return { rows, sweep: 100, t0: 0, title: L('同一时间窗（1 s）：形态相似，放电方式不同', 'Same 1-s window: similar morphology, different firing'), compact: list.length > 2 };
  },
  compareExplain: (list, c) => T.compareExplain(list, c),
};
