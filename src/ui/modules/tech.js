// Technical confounders (textbook Ch 8, p.78–97; p.21, p.32–33). These controls change the
// RECORDING, never the patient: the nerve and muscle are normal throughout. Every trace is the
// same model nerve/muscle synthesized with the chosen temperature, stimulus, electrode
// position, filters and display sensitivity, measured exactly as a reader would.

import { L } from '../../content/i18n.js';
import { DT } from '../../synthesis/volume.js';
import { synthCMAP, synthSNAP, DEFAULT_MONTAGE } from '../../synthesis/ncs.js';
import { bandPass } from '../../synthesis/filters.js';
import { measureCompound } from '../../synthesis/measure.js';
import { getSubject, normalScenario } from '../../physiology/subject.js';
import { POS, STIM_SITES } from '../../physiology/nerve.js';
import { PV } from '../../core/params.js';
import { theme } from '../../render/theme.js';
import * as T from '../../content/tech.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
export const GAINS = { motor: [0.2, 0.5, 2, 5, 10], sensory: [0.002, 0.005, 0.01, 0.02, 0.05] };
export const STD = { tempC: 33, intensity: 60, offset: 0, filter: 'standard', gainIdx: 2 };
export const FILTERS = {
  standard: { motor: [10, 10000], sensory: [20, 2000] },
  lowLFF: { motor: [2, 10000], sensory: [2, 2000] },
  highLFF: { motor: [100, 10000], sensory: [500, 2000] },
  lowHFF: { motor: [10, 500], sensory: [20, 500] },
};
const VISUAL_DIV = 0.05; // smallest deflection a reader can see, in divisions (illustrative)

export function techDefaults() {
  return { study: 'motor', stim: 'wrist', ...STD };
}

function record(c, settings) {
  const s = { ...c, ...settings };
  const sc = normalScenario(c.seed || 1);
  const subj = sc.subj;
  const lesion = { tempC: s.tempC };
  const I = s.intensity >= 60 ? Infinity : s.intensity;
  const band = FILTERS[s.filter][s.study];
  if (s.study === 'motor') {
    const pos = STIM_SITES[s.stim].pos;
    const montage = { ...DEFAULT_MONTAGE, g1Z: DEFAULT_MONTAGE.g1Z + s.offset };
    const raw = synthCMAP({ nerve: subj.nerve, prep: sc.prep, pool: sc.pool, lesion, stimPos: pos, intensity: I, montage, sweepMs: 40, scale: subj.cmapScale });
    const sig = bandPass(raw.trace, band[0], band[1]);
    const gain = GAINS.motor[s.gainIdx];
    const m = measureCompound(sig, { kind: 'cmap', onsetThr: VISUAL_DIV * gain });
    const nAct = raw.arrivals.filter((a) => a.reason !== 'not stimulated').length;
    return { sig, m, gain, nAct, nTot: subj.nerve.motor.length, band };
  }
  const raw = synthSNAP({ nerve: subj.nerve, prep: sc.prep, lesion, stimPos: POS.WRIST, intensity: I, sweepMs: 12, scale: subj.snapScale });
  const sig = bandPass(raw.trace, band[0], band[1]);
  const gain = GAINS.sensory[s.gainIdx];
  const m = measureCompound(sig, { kind: 'snap', onsetThr: VISUAL_DIV * gain });
  const nAct = raw.arrivals ? raw.arrivals.filter((a) => a.reason !== 'not stimulated').length : null;
  return { sig, m, gain, nAct, nTot: subj.nerve.sensory.length, band };
}

function cvAt(c, tempC) {
  if (c.study !== 'motor') {
    const r = record({ ...c, stim: 'wrist' }, { tempC, intensity: 60, offset: 0, filter: 'standard', gainIdx: 2 });
    return r.m.present ? (POS.WRIST - POS.RING_G1) / r.m.onset : null;
  }
  const w = record({ ...c, stim: 'wrist' }, { tempC, intensity: 60, offset: 0, filter: 'standard', gainIdx: 2 });
  const e = record({ ...c, stim: 'elbow' }, { tempC, intensity: 60, offset: 0, filter: 'standard', gainIdx: 2 });
  return w.m.present && e.m.present ? (POS.ELBOW - POS.WRIST) / (e.m.onset - w.m.onset) : null;
}

export function computeTech(c) {
  const cur = record(c, {});
  const ref = record(c, STD);
  const subj = getSubject(c.seed || 1);
  const thresholds = (c.study === 'motor' ? subj.nerve.motor : subj.nerve.sensory).map((a) => a.stimThreshold).sort((a, b) => a - b);
  return { c: clone(c), cur, ref, cv: cvAt(c, c.tempC), cvRef: cvAt(c, 33), thresholds };
}

export default {
  id: 'tech',
  phase: 3,
  title: { zh: '技术因素', en: 'Technical factors' },
  scales: ['macro', 'meso'],
  hasContributions: false,
  noOverlay: true,
  defaults: techDefaults,
  controls: (p) => T.controls(p),
  compute: (c) => computeTech(c),
  timeWindow: (r, c) => (c.study === 'motor' ? { t0: 0, t1: 30, step: 0.2, defaultSpeed: 0.002, key: 'tech-m' } : { t0: 0, t1: 10, step: 0.05, defaultSpeed: 0.0005, key: 'tech-s' }),
  scope(r, c, vo) {
    const th = theme();
    const m = r.cur.m;
    const mr = r.ref.m;
    const fmtA = (a) => (c.study === 'motor' ? `${a.toFixed(1)} mV` : `${(a * 1000).toFixed(0)} µV`);
    return {
      rows: [
        {
          label: L('当前设置', 'Current\nsettings'),
          gain: r.cur.gain,
          traces: [
            { data: r.ref.sig, color: th.normal, dash: [5, 3], width: 1.2, ignoreCursor: true },
            { data: r.cur.sig, color: th.trace, width: 1.8 },
          ],
          markers: [m.present ? { t: m.onset, color: th.accent, label: L('读出的起始', 'onset read') } : null, mr.present ? { t: mr.onset, color: th.normal } : null].filter(Boolean),
          note: m.present ? `${L('潜伏期', 'latency')} ${m.onset.toFixed(2)} ms · ${fmtA(m.amp)} · ${L('时程', 'dur')} ${m.duration.toFixed(1)} ms` : L('无反应', 'no response'),
        },
      ],
      sweep: c.study === 'motor' ? 3 : 1,
      t0: 0,
      title: L('虚线 = 标准条件（33 °C、超强刺激、G1 在运动点、标准滤波、标准灵敏度）；显示灵敏度 = 当前设置', 'Dashed = standard conditions (33 °C, supramaximal, G1 on the motor point, standard filters and sensitivity); display sensitivity = current setting'),
      legend: T.scopeLegend(),
    };
  },
  drawAnatomy(ctx, w, h, r, c, vo) {
    if (vo.scale === 'meso') T.drawActivation(ctx, w, h, r, c, vo.lang);
    else T.drawSetup(ctx, w, h, r, c, vo.lang);
    return { hits: [], legend: vo.scale === 'meso' ? T.mesoLegend() : T.macroLegend() };
  },
  explain: (r, c) => T.explain(r, c),
  why: (prev, cur) => T.why(prev, cur),
  modelNotes: () => T.modelNotes(),
};
