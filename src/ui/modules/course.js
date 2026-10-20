// Time course after a nerve lesion: the disease clock (days → years) is separate from the
// waveform clock (ms). Curves are computed from the same model at a set of days; the
// waveforms for the selected day are shown in full.

import { L } from '../../content/i18n.js';
import { scenario, DEFAULT_PARAMS } from '../../physiology/subject.js';
import { POS, LESION_SITES } from '../../physiology/nerve.js';
import { synthCMAP, synthSNAP } from '../../synthesis/ncs.js';
import { needleMUAPs } from '../../synthesis/emg.js';
import { measureCompound, measureMUAP } from '../../synthesis/measure.js';
import { computeNCS, ncsDefaults } from './ncs.js';
import { computeEMG, emgDefaults } from './emg.js';
import { fibOnsetDays } from '../../physiology/lesions.js';
import { drawCrossSection } from '../../render/meso.js';
import { theme, withAlpha, unitColor } from '../../render/theme.js';
import { PV } from '../../core/params.js';
import { F_DENERVATED } from '../../physiology/muscle.js';
import * as T from '../../content/course.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
export const CURVE_DAYS = [0.5, 2, 4, 7, 10, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365, 540, 730];

export function courseDefaults() {
  return { kind: 'partial', frac: 0.6, reinnervation: 0.7, regeneration: true, block: 0.6, day: 21, view: 'ncs', needle: { x: 10, y: 6, z: 12 } };
}

// Map the course settings at a given day to simulator parameters.
export function paramsAt(c, day) {
  const p = clone(DEFAULT_PARAMS);
  p.day = day;
  if (c.kind === 'partial') {
    p.axonal = { ...p.axonal, on: true, site: 'forearm', frac: c.frac, population: 'both' };
    p.reinnervation = c.reinnervation;
  } else if (c.kind === 'complete') {
    p.axonal = { ...p.axonal, on: true, site: 'forearm', frac: 1, population: 'both' };
    p.reinnervation = 0;
    p.regeneration = { on: !!c.regeneration, mmPerDay: 1 };
  } else if (c.kind === 'block') {
    // remyelination: block and slowing resolve over weeks (time constant illustrative)
    const k = Math.exp(-day / 30);
    p.demyel = { ...p.demyel, on: k * c.block > 0.01, site: 'forearm', slowing: 0.45 * k, dispersion: 0.4 * k, block: +(c.block * k).toFixed(3), mechanism: 'demyelination' };
  }
  return p;
}

const curveCache = new Map();
const SURVEY = [
  [7, 5],
  [11, 7],
  [14, 4.5],
];
export function computeCurves(c) {
  const key = JSON.stringify({ k: c.kind, f: c.frac, r: c.reinnervation, g: c.regeneration, b: c.block });
  if (curveCache.has(key)) return curveCache.get(key);
  const pts = [];
  let ref = null;
  for (const day of [null, ...CURVE_DAYS]) {
    const p = day === null ? clone(DEFAULT_PARAMS) : paramsAt(c, day);
    const sc = scenario(p);
    const subj = sc.subj;
    const cw = measureCompound(synthCMAP({ nerve: subj.nerve, prep: sc.prep, pool: sc.pool, lesion: sc.lesion, day: sc.day, stimPos: POS.WRIST, scale: subj.cmapScale, stride: 4 }).trace);
    const ce = measureCompound(synthCMAP({ nerve: subj.nerve, prep: sc.prep, pool: sc.pool, lesion: sc.lesion, day: sc.day, stimPos: POS.ELBOW, sweepMs: 40, scale: subj.cmapScale, stride: 4 }).trace);
    const sw = measureCompound(synthSNAP({ nerve: subj.nerve, prep: sc.prep, lesion: sc.lesion, day: sc.day, scale: subj.snapScale }).trace, { kind: 'snap' });
    let fib = 0;
    let den = 0;
    for (const f of sc.pool.fibers) {
      if (f.fibrillating) fib++;
      if (f.state === F_DENERVATED) den++;
    }
    const durs = [];
    const amps = [];
    for (const [x, y] of SURVEY) {
      for (const e of needleMUAPs(sc.pool, subj.grid, { x, y, z: 12 }).values()) {
        const q = measureMUAP(e.wave);
        if (q.present && q.p2p >= 0.2) {
          durs.push(q.duration);
          amps.push(q.p2p);
        }
      }
    }
    const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
    const units = sc.pool.units.filter((u) => u.alive && sc.voluntary[u.id]).length;
    const v = { day, cmapW: cw.amp, cmapE: ce.amp, snap: sw.amp, fib, den, dur: mean(durs), amp: mean(amps), units, nFib: sc.pool.fibers.length };
    if (day === null) ref = v;
    else pts.push(v);
  }
  const res = { ref, pts };
  curveCache.set(key, res);
  return res;
}

export default {
  id: 'course',
  phase: 2,
  title: { zh: '病程与时间', en: 'Time course' },
  scales: ['macro', 'meso'],
  hasContributions: false,
  anatomyClickable: true,
  defaults: courseDefaults,
  controls: (p) => T.controls(p),
  compute(c) {
    const p = paramsAt(c, c.day);
    const curves = computeCurves(c);
    const nm = computeNCS({ ...ncsDefaults(), ...p, study: 'motor', stim: 'elbow' });
    const ns = computeNCS({ ...ncsDefaults(), ...p, study: 'sensory', stim: 'wrist' });
    const e = computeEMG({ ...emgDefaults(), ...p, activity: 'mild', effortMode: 'force', targetForce: 15, display: 'muap', needle: c.needle, block: 0 });
    return { c: clone(c), p, curves, nm, ns, e, fibOnset: fibOnsetDays(LESION_SITES.forearm.a - POS.MOTOR_POINT) };
  },
  timeWindow(r, c) {
    if (c.view === 'rest') return { t0: 0, t1: 1000, step: 5, defaultSpeed: 0.1, key: 'course-rest' };
    return { t0: 0, t1: 30, step: 0.2, defaultSpeed: 0.002, key: 'course-' + c.view };
  },
  scope(r, c, vo) {
    const th = theme();
    if (c.view === 'ncs') {
      const rows = [];
      for (const [res, key, lab, gain] of [
        [r.nm, 'wrist', L('CMAP 腕刺激', 'CMAP wrist'), 5],
        [r.nm, 'elbow', L('CMAP 肘刺激\n（跨病灶）', 'CMAP elbow\n(across lesion)'), 5],
        [r.ns, 'wrist', L('SNAP 腕刺激', 'SNAP wrist'), 0.01],
      ]) {
        const row = res.rows.find((x) => x.key === key);
        const m = row.mAb;
        rows.push({
          label: lab,
          gain,
          traces: [{ data: row.dispN, color: th.normal, dash: [5, 3], width: 1.2, ignoreCursor: true }, { data: row.disp, color: th.trace, width: 1.7 }],
          markers: m.present ? [{ t: m.onset, color: th.accent }] : [],
          note: m.present ? (gain > 1 ? `${m.amp.toFixed(1)} mV` : `${(m.amp * 1000).toFixed(0)} µV`) : L('无反应', 'absent'),
        });
      }
      return { rows, sweep: 3, t0: 0, title: L(`第 ${T.dayLabel(c.day)} 的神经传导（虚线 = 正常）`, `Nerve conduction on ${T.dayLabel(c.day)} (dashed = normal)`), compact: true };
    }
    if (c.view === 'rest') {
      return {
        rows: [{ label: L('静息', 'rest'), gain: 0.05, traces: [{ data: r.e.rest.sig, color: th.trace, width: 1.2 }], note: L(`针尖 1.2 mm 内 ${new Set(r.e.rest.events.map((e) => e.fid)).size} 根纤维自发放电`, `${new Set(r.e.rest.events.map((e) => e.fid)).size} fibres firing within 1.2 mm`) }],
        sweep: 100,
        t0: 0,
        title: L('静息针极记录（拇短展肌）：50 µV/div', 'Needle at rest (APB): 50 µV/div'),
      };
    }
    const q = r.e.fm ? r.e.qA.get(r.e.focus) : null;
    return {
      rows: [
        { label: `MUAP · MU ${r.e.focus ?? '—'}`, gain: 0.2, traces: [r.e.fmN ? { data: r.e.fmN.wave, color: th.normal, dash: [5, 3], width: 1.2, ignoreCursor: true } : null, r.e.fm ? { data: r.e.fm.wave, color: unitColor(r.e.focus), width: 2 } : null].filter(Boolean), note: q && q.present ? `${(q.p2p * 1000).toFixed(0)} µV · ${q.duration.toFixed(1)} ms · ${q.phases} ${L('相', 'ph')}` : '' },
        { label: L('6 次放电叠加', '6 discharges'), gain: 0.2, traces: r.e.discharges.map((d) => ({ data: d, color: unitColor(r.e.focus), width: 1, alpha: 0.55 })), note: L('卫星电位/不稳定 = 不成熟的芽枝与终板', 'satellites/instability = immature sprouts and endplates') },
      ],
      sweep: 3,
      t0: 0,
      title: L('MUAP（轻收缩）', 'MUAP (mild contraction)'),
    };
  },
  drawAnatomy(ctx, w, h, r, c, vo) {
    if (vo.scale === 'meso') {
      const out = drawCrossSection(ctx, w, h, { pool: r.e.sc.pool, needle: c.needle, zoom: null, highlight: new Set(r.e.focus !== null ? [r.e.focus] : []), spontaneous: [], rings: [1], caption: L(`第 ${T.dayLabel(c.day)}：灰 = 去神经纤维；黑框 = 再支配纤维；彩色 = 聚焦单位`, `${T.dayLabel(c.day)}: grey = denervated; outlined = reinnervated; colour = focus unit`) });
      return { hits: [], legend: '' };
    }
    return T.drawTimeline(ctx, w, h, r, c, vo);
  },
  onAnatomyClick({ x, y, info }, c, app) {
    if (app.ui.course.scale !== 'macro' || !info || !info.dayOfX) return null;
    const d = info.dayOfX(x);
    if (d === null) return null;
    // snap to the nearest computed day
    c.day = CURVE_DAYS.reduce((a, b) => (Math.abs(Math.log(b) - Math.log(d)) < Math.abs(Math.log(a) - Math.log(d)) ? b : a));
    return c;
  },
  explain: (r, c) => T.explain(r, c),
  why: (prev, cur) => T.why(prev, cur),
  modelNotes: () => T.modelNotes(),
};
