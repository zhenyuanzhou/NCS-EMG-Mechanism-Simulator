// Localization by pattern: one lesion, many sampled nerves and muscles. Each nerve/muscle gets
// its own effective lesion (from the root–nerve–muscle map), and the full simulator is run for
// it: CMAP/SNAP waveforms are synthesized; muscle findings are read from the simulated muscle
// state (denervated/fibrillating fibres, fibres per surviving unit, units available).

import { L } from '../../content/i18n.js';
import { scenario, normalScenario, DEFAULT_PARAMS } from '../../physiology/subject.js';
import { POS } from '../../physiology/nerve.js';
import { F_INNERVATED, F_REINNERVATED } from '../../physiology/muscle.js';
import { synthCMAP, synthSNAP } from '../../synthesis/ncs.js';
import { measureCompound } from '../../synthesis/measure.js';
import { MUSCLES, NERVES, muscleInvolvement, nerveInvolvement } from '../../physiology/localize.js';
import { fibOnsetDays } from '../../physiology/lesions.js';
import { computeEMG, emgDefaults } from './emg.js';
import { theme, unitColor } from '../../render/theme.js';
import { drawPlexus, drawRootGrid } from '../../render/plexus.js';
import * as T from '../../content/localize.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
const q20 = (x) => Math.round(x * 20) / 20;
export const LOC_DAYS = [2, 7, 14, 21, 35, 60, 120, 365];

export function locDefaults() {
  return { lesion: 'c8', sev: 0.5, day: 35, inflam: true, sel: 'apb', seed: 1 };
}

export function muscleParams(c, mi) {
  const p = clone(DEFAULT_PARAMS);
  p.seed = c.seed;
  p.day = c.day;
  if (mi.myo > 0) {
    p.myopathy = { on: true, fiberLoss: q20(0.55 * mi.myo), sizeVar: q20(mi.myo), irritability: !!c.inflam };
  } else if (mi.fm >= 0.025) {
    if (mi.mnd) p.mnd = { on: true, frac: q20(mi.fm) };
    else p.axonal = { ...p.axonal, on: true, site: mi.site, frac: q20(mi.fm), population: 'motor' };
    p.lesionToMuscleMm = mi.lenMm;
  }
  return p;
}
function sensoryParams(c, ni) {
  const p = clone(DEFAULT_PARAMS);
  p.seed = c.seed;
  p.day = c.day;
  if (ni.fs >= 0.025) p.axonal = { ...p.axonal, on: true, site: ni.sensSite, frac: q20(ni.fs), population: 'sensory' };
  return p;
}

const sumCache = new Map();
let normalFibMean = null;
function fibresPerUnit(pool, voluntary) {
  const n = new Float64Array(pool.units.length);
  let reinn = 0;
  let imm = 0;
  let inn = 0;
  for (const f of pool.fibers) {
    if (f.state !== F_INNERVATED && f.state !== F_REINNERVATED) continue;
    inn++;
    n[f.unit] += f.diam * f.diam; // fibre "weight" ∝ cross-section (myopathy atrophy shrinks it)
    if (f.state === F_REINNERVATED) {
      reinn++;
      imm += 1 - (f.maturity ?? 1);
    }
  }
  let s = 0;
  let k = 0;
  pool.units.forEach((u, i) => {
    if (u.alive !== false && voluntary[i] !== false) {
      s += n[i];
      k++;
    }
  });
  return { mean: k ? s / k : 0, units: k, reinnFrac: inn ? reinn / inn : 0, immature: reinn ? imm / reinn : 0 };
}

export function muscleSummary(p) {
  const key = 'm' + JSON.stringify(p);
  if (sumCache.has(key)) return sumCache.get(key);
  if (normalFibMean === null) {
    const n = normalScenario(p.seed);
    normalFibMean = fibresPerUnit(n.pool, n.voluntary).mean;
  }
  const sc = scenario(p);
  let fib = 0;
  for (const f of sc.pool.fibers) if (f.fibrillating) fib++;
  const fpu = fibresPerUnit(sc.pool, sc.voluntary);
  const out = {
    fibFrac: fib / sc.pool.fibers.length,
    sizeIdx: fpu.mean / normalFibMean,
    recruit: fpu.units / sc.pool.units.length,
    reinnFrac: fpu.reinnFrac,
    immature: fpu.immature,
  };
  sumCache.set(key, out);
  return out;
}

function nerveSummary(kind, p) {
  const key = kind + JSON.stringify(p);
  if (sumCache.has(key)) return sumCache.get(key);
  const sc = scenario(p);
  const subj = sc.subj;
  let tr;
  if (kind === 'motor') tr = synthCMAP({ nerve: subj.nerve, prep: sc.prep, pool: sc.pool, lesion: sc.lesion, day: sc.day, stimPos: POS.WRIST, sweepMs: 30, scale: subj.cmapScale, stride: 2 }).trace;
  else tr = synthSNAP({ nerve: subj.nerve, prep: sc.prep, lesion: sc.lesion, day: sc.day, stimPos: POS.WRIST, sweepMs: 10, scale: subj.snapScale }).trace;
  const m = measureCompound(tr, { kind: kind === 'motor' ? 'cmap' : 'snap' });
  const out = { trace: tr, m };
  sumCache.set(key, out);
  if (sumCache.size > 400) sumCache.delete(sumCache.keys().next().value);
  return out;
}

// qualitative descriptors from model quantities (mapping thresholds are illustrative)
export function fibGrade(f) {
  if (f < 0.003) return 0;
  if (f < 0.05) return 1;
  if (f < 0.15) return 2;
  if (f < 0.45) return 3;
  return 4;
}
export function muapClass(s, myo) {
  if (myo > 0 && s.sizeIdx < 0.85) return 'myopathic';
  if (s.reinnFrac > 0.04 && s.immature > 0.45) return 'unstable';
  if (s.sizeIdx >= 1.2) return 'reinnervated';
  return 'normal';
}
export function recruitClass(s, myo) {
  if (s.recruit < 0.85) return 'reduced';
  if (myo > 0 && s.sizeIdx < 0.9) return 'early';
  return 'normal';
}

export function computeLocalize(c) {
  const normal = clone(DEFAULT_PARAMS);
  normal.seed = c.seed;
  const nMotor = nerveSummary('motor', normal);
  const nSens = nerveSummary('sensory', normal);
  const muscles = MUSCLES.map((m) => {
    const mi = muscleInvolvement(c.lesion, c.sev, m);
    const p = muscleParams(c, mi);
    const s = muscleSummary(p);
    const onset = mi.fm > 0 ? fibOnsetDays(mi.lenMm) : null;
    return {
      ...m,
      mi,
      p,
      s,
      onset,
      grade: fibGrade(s.fibFrac),
      muap: muapClass(s, mi.myo),
      recruit: recruitClass(s, mi.myo),
      fasc: mi.mnd && mi.fm > 0.05,
    };
  });
  const nerves = NERVES.map((n) => {
    const ni = nerveInvolvement(c.lesion, c.sev, n);
    let p;
    let s;
    if (n.kind === 'motor') {
      const mi = n.muscle ? muscleInvolvement(c.lesion, c.sev, MUSCLES.find((x) => x.id === n.muscle)) : { fm: ni.fm, site: ni.site, lenMm: 300, myo: 0, mnd: !!ni.mnd };
      p = muscleParams(c, mi);
      s = nerveSummary('motor', p);
    } else {
      p = sensoryParams(c, ni);
      s = nerveSummary('sensory', p);
    }
    const ref = n.kind === 'motor' ? nMotor : nSens;
    return { ...n, ni, p, s, ref, pct: s.m.present ? (100 * s.m.amp) / ref.m.amp : 0 };
  });
  // drill-down: the selected item in full
  let detail = null;
  const selM = muscles.find((m) => m.id === c.sel);
  const selN = nerves.find((n) => n.id === c.sel);
  if (selM) {
    const e = computeEMG({ ...emgDefaults(), ...selM.p, activity: 'mild', effortMode: 'force', targetForce: 15, display: 'muap', needle: { x: 10, y: 6, z: 12 }, block: 0, focus: null });
    detail = { kind: 'muscle', item: selM, e };
  } else if (selN) detail = { kind: 'nerve', item: selN };
  return { c: clone(c), muscles, nerves, detail };
}

export default {
  id: 'localize',
  phase: 2,
  title: { zh: '定位诊断', en: 'Localization' },
  scales: ['macro', 'meso'],
  hasContributions: false,
  noOverlay: true,
  anatomyClickable: true,
  anatHeight: { desktop: 430, mobile: 380 },
  defaults: locDefaults,
  controls: (p, r) => T.controls(p, r),
  compute: (c) => computeLocalize(c),
  timeWindow(r, c) {
    if (r.detail && r.detail.kind === 'muscle') return { t0: 0, t1: 1000, step: 5, defaultSpeed: 0.25, key: 'loc-m' };
    const motor = r.detail && r.detail.item.kind === 'motor';
    return { t0: 0, t1: motor ? 30 : 10, step: motor ? 0.2 : 0.05, defaultSpeed: 0.002, key: 'loc-n' + (motor ? 'm' : 's') };
  },
  scope(r, c, vo) {
    const th = theme();
    const d = r.detail;
    if (!d) return { rows: [], sweep: 3, t0: 0 };
    if (d.kind === 'nerve') {
      const n = d.item;
      const motor = n.kind === 'motor';
      const m = n.s.m;
      return {
        rows: [
          {
            label: motor ? 'CMAP' : 'SNAP',
            gain: motor ? 2 : 0.01,
            traces: [
              { data: n.ref.trace, color: th.normal, dash: [5, 3], width: 1.2, ignoreCursor: true },
              { data: n.s.trace, color: th.trace, width: 1.8 },
            ],
            markers: m.present ? [{ t: m.onset, color: th.accent }] : [],
            note: m.present ? (motor ? `${m.amp.toFixed(1)} mV` : `${(m.amp * 1000).toFixed(0)} µV`) + ` · ${n.pct.toFixed(0)}% ${L('正常', 'of normal')}` : L('无反应', 'absent'),
          },
        ],
        sweep: motor ? 3 : 1,
        t0: 0,
        title: L(`${L(n)}，腕部刺激（虚线 = 正常）`, `${L(n)}, wrist stimulation (dashed = normal)`),
      };
    }
    const e = d.e;
    const qq = e.fm ? e.qA.get(e.focus) : null;
    return {
      rows: [
        { label: L('静息', 'Rest'), gain: 0.05, traces: [{ data: e.rest.sig, color: th.trace, width: 1.1 }], note: `${L('纤颤分级（模型）', 'fib grade (model)')} ${T.gradeText(d.item.grade)}` },
        {
          label: L('MUAP（轻收缩）', 'MUAP (mild)'),
          gain: 0.2,
          sweep: 3,
          t0: 0,
          traces: [e.fmN ? { data: e.fmN.wave, color: th.normal, dash: [5, 3], width: 1.2 } : null, e.fm ? { data: e.fm.wave, color: unitColor(e.focus), width: 2 } : null].filter(Boolean),
          note: qq && qq.present ? `${(qq.p2p * 1000).toFixed(0)} µV · ${qq.duration.toFixed(1)} ms · ${qq.phases} ${L('相', 'ph')}` : L('此处无可辨认 MUAP', 'no discernible MUAP here'),
        },
      ],
      sweep: 100,
      t0: 0,
      title: L(`${L(d.item)}：上 = 静息 1 s（50 µV/div）；下 = 一个 MUAP（虚线 = 正常同一单位）`, `${L(d.item)}: top = rest 1 s (50 µV/div); bottom = one MUAP (dashed = same unit, normal)`),
    };
  },
  drawAnatomy(ctx, w, h, r, c, vo) {
    if (vo.scale === 'meso') return drawRootGrid(ctx, w, h, r, c, vo.lang);
    return drawPlexus(ctx, w, h, r, c, vo.lang);
  },
  onAnatomyClick({ hit }, c) {
    if (!hit || !hit.id) return null;
    c.sel = hit.id;
    return c;
  },
  explain: (r, c) => T.explain(r, c),
  why: (prev, cur) => T.why(prev, cur),
  modelNotes: () => T.modelNotes(),
};
