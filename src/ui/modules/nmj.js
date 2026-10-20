// Neuromuscular junction: repetitive nerve stimulation (RNS) and single-fibre EMG (SFEMG).
// Kept conceptually separate from NCS and needle EMG: RNS = a TRAIN of supramaximal CMAPs
// (how many muscle fibres reach threshold at each stimulus); SFEMG = the VARIABILITY of
// transmission time at individual endplates (jitter) and its failure (blocking).
// The CMAP of every stimulus is built from the same muscle model: fibres are grouped by their
// EPP gain (safety factor), each group has its own surface template, and the fraction of each
// group that reaches threshold comes from the quantal model (physiology/nmj.js).

import { L } from '../../content/i18n.js';
import { DT } from '../../synthesis/volume.js';
import { getSurfaceTable, DEFAULT_MONTAGE } from '../../synthesis/ncs.js';
import { fibWaveform, add } from '../../synthesis/emg.js';
import { highPass } from '../../synthesis/filters.js';
import { measureCompound } from '../../synthesis/measure.js';
import { getSubject } from '../../physiology/subject.js';
import { F_LOST, F_DENERVATED } from '../../physiology/muscle.js';
import { PV } from '../../core/params.js';
import { runProtocol, gainClasses, sfemgPair, decrementPct, incrementPct } from '../../physiology/nmj.js';
import { drawNMJ } from '../../render/micro.js';
import { theme, withAlpha } from '../../render/theme.js';
import * as T from '../../content/nmj.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
const NCLASS = 24;
const DL0 = 70 / 60 + 1.4; // conduction to the motor point + terminal/NMJ delay (ms), from the model's defaults
const SLOT = { slow: 25, rapid: 20, exercise: 25, exhaust: 25 };
const RESP_MS = 25;

export function nmjDefaults() {
  return { study: 'rns', disease: 'mg', severity: 0.7, protocol: 'slow', seed: 1 };
}

// surface templates per safety class (fibres assigned by their own EPP gain)
const classCache = new Map();
function classTemplates(seed) {
  if (classCache.has(seed)) return classCache.get(seed);
  const { pool } = getSubject(seed);
  const centers = gainClasses(NCLASS, seed);
  const tab = getSurfaceTable();
  const m = DEFAULT_MONTAGE;
  const nT = Math.round(RESP_MS / DT);
  const out = centers.map(() => new Float64Array(nT));
  const scale = getSubject(seed).cmapScale;
  for (const f of pool.fibers) {
    if (f.state === F_LOST || f.state === F_DENERVATED) continue;
    let c = 0;
    for (let i = 1; i < centers.length; i++) if (Math.abs(centers[i] - f.nmjGain) < Math.abs(centers[c] - f.nmjGain)) c = i;
    const dy = f.y + m.skin;
    const r1 = Math.hypot(f.x - m.g1X, dy);
    const r2 = Math.hypot(f.x - m.g2X, dy);
    const v = PV.muscleFiberCV * f.diam * (f.cvFactor || 1);
    const gain = f.diam * f.diam * scale;
    const delay = DL0 + f.termDelay;
    tab.addInto(out[c], r1, m.g1Z - f.zEp, delay, gain, v);
    tab.addInto(out[c], r2, m.g2Z - f.zEp, delay, -gain, v);
  }
  // equalise class counts: each class holds ≈1/NCLASS of the fibres by construction of quantiles
  const res = { centers, out };
  classCache.set(seed, res);
  return res;
}

// compress a response in time around its onset (pseudofacilitation: more synchronous fibre
// potentials → larger, shorter, same area; schematic, ≤40% in normals p.61–62)
function synchronise(x, s) {
  if (s === 1) return x;
  const y = new Float64Array(x.length);
  const i0 = Math.round(DL0 / DT);
  for (let i = 0; i < x.length; i++) {
    const src = i0 + (i - i0) * s;
    const k = Math.floor(src);
    const fr = src - k;
    if (k < 0 || k + 1 >= x.length) continue;
    y[i] = s * (x[k] * (1 - fr) + x[k + 1] * fr);
  }
  return y;
}

function responseOf(tpl, fire, sync) {
  const r = new Float64Array(tpl.out[0].length);
  fire.forEach((fr, c) => {
    if (fr < 1e-4) return;
    const t = tpl.out[c];
    for (let i = 0; i < r.length; i++) r[i] += fr * t[i];
  });
  return synchronise(r, sync);
}

function computeRNS(c) {
  const tpl = classTemplates(c.seed);
  const opts = { disease: c.disease, severity: c.severity };
  const normal = runProtocol(c.protocol, { disease: 'normal', severity: 0 });
  const prot = runProtocol(c.protocol, opts);
  const slot = SLOT[c.protocol];
  const build = (trains) =>
    trains.map((tr) => {
      const resp = tr.res.map((st, k) => {
        const sync = c.protocol === 'rapid' ? 1 + 0.22 * (1 - Math.exp(-k / 8)) : 1;
        return responseOf(tpl, st.fire, sync);
      });
      const meas = resp.map((x) => measureCompound(x, { kind: 'cmap' }));
      const mont = new Float64Array(Math.round((resp.length * slot) / DT));
      resp.forEach((x, k) => {
        const n = Math.min(x.length, Math.round(slot / DT));
        const off = Math.round((k * slot) / DT);
        for (let i = 0; i < n; i++) mont[off + i] = x[i];
      });
      const amps = meas.map((m) => (m.present ? m.amp : 0));
      const areas = meas.map((m) => (m.present ? m.area : 0));
      const dec = amps.length > 1 ? (100 * (amps[0] - Math.min(...amps.slice(0, 5)))) / amps[0] : 0;
      const inc = (100 * (Math.max(...amps) - amps[0])) / Math.max(1e-9, amps[0]);
      return { ...tr, resp, meas, mont, amps, areas, dec, inc };
    });
  const trains = build(prot.trains);
  const trainsN = build(normal.trains);
  const out = { c: clone(c), study: 'rns', trains, trainsN, slot, ref: trainsN[0].amps[0] };
  if (c.protocol === 'exercise') {
    const pre = trains[0].amps[0];
    const post = trains[1].amps[0];
    out.exInc = (100 * (post - pre)) / pre;
  }
  return out;
}

function computeSF(c) {
  const sf = sfemgPair({ disease: c.disease, severity: c.severity, n: 100, seed: c.seed });
  const sfN = sfemgPair({ disease: 'normal', severity: 0, n: 100, seed: c.seed });
  // single-fibre potential seen by an SFEMG electrode (very close, low-frequency filter 500 Hz, p.659)
  const w = highPass(fibWaveform(0.03, 3, 1), 500);
  let pk = 0;
  for (const v of w) pk = Math.max(pk, Math.abs(v));
  const W = 5; // ms per discharge window, triggered on fibre 1 at 1.5 ms
  const nShow = 40;
  const traces = [];
  const mont = new Float64Array(Math.round((10 * W) / DT));
  let shown = 0;
  for (let k = 0; k < sf.lat[0].length && traces.length < nShow; k++) {
    if (sf.lat[0][k] === null) continue; // cannot trigger without fibre 1
    const x = new Float64Array(Math.round(W / DT));
    add(x, w, 1.5 - 0.5 - 0.3, 1); // fibWaveform peaks ≈0.8 ms after its start
    if (sf.lat[1][k] !== null) add(x, w, 1.5 + (sf.lat[1][k] - sf.lat[0][k]) - 0.8, 0.85);
    traces.push(x);
    if (shown < 10) {
      const off = Math.round((shown * W) / DT);
      for (let i = 0; i < x.length; i++) mont[off + i] = x[i];
      shown++;
    }
  }
  return { c: clone(c), study: 'sfemg', sf, sfN, traces, mont, W, pk };
}

export function computeNMJ(c) {
  return c.study === 'sfemg' ? computeSF(c) : computeRNS(c);
}

// index of the stimulus at the cursor
function stimIndex(r, t) {
  if (r.study !== 'rns') return 0;
  const n = r.trains[0].resp.length;
  return Math.max(0, Math.min(n - 1, Math.floor((t ?? 0) / r.slot)));
}

export default {
  id: 'nmj',
  phase: 3,
  title: { zh: '神经肌肉接头 RNS/SFEMG', en: 'NMJ: RNS & SFEMG' },
  scales: ['macro', 'meso', 'micro'],
  hasContributions: false,
  noOverlay: true,
  defaults: nmjDefaults,
  controls: (p) => T.controls(p),
  compute: (c) => computeNMJ(c),
  timeWindow(r, c) {
    if (r.study === 'sfemg') return { t0: 0, t1: 10 * r.W, step: 0.25, defaultSpeed: 0.005, key: 'nmj-sf' };
    const n = r.trains[0].resp.length;
    const t1 = n * r.slot;
    return { t0: 0, t1, step: r.slot / 5, defaultSpeed: c.protocol === 'rapid' ? 0.02 : 0.02, key: 'nmj-' + c.protocol };
  },
  scope(r, c, vo) {
    const th = theme();
    if (r.study === 'sfemg') {
      return {
        rows: [
          {
            label: L(`${r.traces.length} 次放电叠加\n（触发：纤维 1）`, `${r.traces.length} discharges\n(trigger: fibre 1)`),
            gain: r.pk / 2.5,
            sweep: 0.5,
            t0: 0,
            traces: r.traces.map((x) => ({ data: x, color: th.trace, width: 1, alpha: 0.35 })),
            note: `MCD ${isFinite(r.sf.mcd) ? r.sf.mcd.toFixed(0) : '—'} µs · ${L('阻滞', 'blocking')} ${r.sf.blockPct.toFixed(0)}%`,
          },
          {
            label: L('连续 10 次\n（每格一次）', '10 in a row\n(one per div)'),
            gain: r.pk / 2.5,
            traces: [{ data: r.mont, color: th.trace, width: 1.2 }],
            note: L('纤维 2 的位置在变 = 抖动；消失 = 阻滞', 'fibre 2 moves = jitter; missing = blocking'),
          },
        ],
        sweep: r.W,
        t0: 0,
        title: L('单纤维 EMG：同一运动单位的两根纤维（低频滤波 500 Hz）', 'Single-fibre EMG: two fibres of one motor unit (low-frequency filter 500 Hz)'),
        legend: T.sfLegend(),
      };
    }
    const k = stimIndex(r, vo.t);
    const tr = r.trains;
    if (c.protocol === 'exercise' || c.protocol === 'exhaust') {
      const rows = tr.map((x, i) => ({
        label: T.trainLabel(x, c),
        gain: 5,
        traces: [{ data: r.trainsN[i] ? r.trainsN[i].mont : null, color: th.normal, dash: [4, 3], width: 1, ignoreCursor: true }, { data: x.mont, color: th.trace, width: 1.3 }].filter((q) => q.data),
        note: c.protocol === 'exercise' ? `${x.amps[0].toFixed(1)} mV` : `${L('递减', 'decr.')} ${x.dec.toFixed(0)}%`,
      }));
      return { rows, sweep: (tr[0].resp.length * r.slot) / 10, t0: 0, title: T.scopeTitle(r, c), compact: true, legend: T.rnsLegend(c) };
    }
    const x = tr[0];
    return {
      rows: [
        {
          label: L('刺激序列\n（每格=一次）', 'Train\n(one per slot)'),
          gain: 2,
          traces: [{ data: r.trainsN[0].mont, color: th.normal, dash: [4, 3], width: 1, ignoreCursor: true }, { data: x.mont, color: th.trace, width: 1.3 }],
          note: c.protocol === 'slow' ? `${L('递减', 'decrement')} ${x.dec.toFixed(0)}%` : `${L('递增', 'increment')} ${x.inc.toFixed(0)}%`,
        },
        {
          label: L(`第 1 次 vs 第 ${k + 1} 次`, `#1 vs #${k + 1}`),
          gain: 2,
          sweep: 2.5,
          t0: 0,
          traces: [
            { data: x.resp[0], color: th.normal, dash: [5, 3], width: 1.3 },
            { data: x.resp[k], color: th.trace, width: 2 },
          ],
          note: `${x.amps[k].toFixed(1)} mV · ${L('面积', 'area')} ${x.areas[k].toFixed(1)} mV·ms`,
        },
      ],
      sweep: (x.resp.length * r.slot) / 10,
      t0: 0,
      title: T.scopeTitle(r, c),
      legend: T.rnsLegend(c),
    };
  },
  drawAnatomy(ctx, w, h, r, c, vo) {
    const th = theme();
    const lang = vo.lang;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = th.panel;
    ctx.fillRect(0, 0, w, h);
    if (r.study === 'sfemg') {
      if (vo.scale === 'micro') {
        const s = r.sf;
        drawNMJ(ctx, w, h, { quanta: PV.quantaStore, released: s.m, epp: s.epp, threshold: PV.eppThresholdMv, fired: s.epp > PV.eppThresholdMv, lang, receptor: T.receptorOf(c), label: L('稳态（约 10 Hz 随意放电）时一次冲动', 'One impulse at steady voluntary firing (~10 Hz)'), extra: L(`EPP 波动 ±${s.eppSd.toFixed(1)} mV（量子数随机） → 达阈时间波动 = 抖动`, `EPP fluctuates ±${s.eppSd.toFixed(1)} mV (random quantal content) → time-to-threshold varies = jitter`) });
        return { hits: [], legend: T.microLegend(r) };
      }
      if (vo.scale === 'meso') T.drawEppToThreshold(ctx, w, h, r, lang);
      else T.drawIpiPlot(ctx, w, h, r, lang);
      return { hits: [], legend: vo.scale === 'meso' ? T.mesoSfLegend() : T.macroSfLegend() };
    }
    const k = stimIndex(r, vo.t);
    const st = r.trains[0].res[k];
    if (vo.scale === 'micro') {
      const gMid = 1;
      drawNMJ(ctx, w, h, {
        quanta: st.n,
        released: st.m,
        epp: st.epp * gMid,
        threshold: PV.eppThresholdMv,
        fired: st.epp * gMid >= PV.eppThresholdMv,
        lang,
        receptor: T.receptorOf(c),
        label: L(`第 ${k + 1} 次刺激：n = ${st.n.toFixed(0)}，p = ${st.p.toFixed(2)}，m = p·n = ${st.m.toFixed(0)}`, `Stimulus #${k + 1}: n = ${st.n.toFixed(0)}, p = ${st.p.toFixed(2)}, m = p·n = ${st.m.toFixed(0)}`),
        extra: L('（典型纤维，EPP 增益 = 1）', '(typical fibre, EPP gain = 1)'),
      });
      return { hits: [], legend: T.microLegend(r) };
    }
    if (vo.scale === 'meso') {
      T.drawSafetyClasses(ctx, w, h, r, k, lang);
      return { hits: [], legend: T.mesoLegend() };
    }
    T.drawTrainPlot(ctx, w, h, r, c, k, lang);
    return { hits: [], legend: T.macroLegend(c) };
  },
  explain: (r, c) => T.explain(r, c),
  why: (prev, cur) => T.why(prev, cur),
  modelNotes: () => T.modelNotes(),
  comparePresets: () => T.comparePresets(),
  compareScope(list, c, vo) {
    const th = theme();
    if (list[0].result.study === 'sfemg')
      return { rows: list.map(({ preset, result }) => ({ label: L(preset.label), gain: result.pk / 2.5, sweep: 0.5, t0: 0, traces: result.traces.map((x) => ({ data: x, color: th.trace, width: 1, alpha: 0.35 })), note: `MCD ${isFinite(result.sf.mcd) ? result.sf.mcd.toFixed(0) : '—'} µs · ${result.sf.blockPct.toFixed(0)}%` })), sweep: 5, t0: 0, title: L('SFEMG：相同参数，不同病理', 'SFEMG: same settings, different pathology'), compact: true };
    const rows = list.map(({ preset, result }) => {
      const x = result.trains[0];
      return { label: L(preset.label), gain: 5, traces: [{ data: x.mont, color: th.trace, width: 1.3 }], note: c.protocol === 'slow' ? `${L('递减', 'decr.')} ${x.dec.toFixed(0)}%` : `${L('递增', 'incr.')} ${x.inc.toFixed(0)}%` };
    });
    const r0 = list[0].result;
    return { rows, sweep: (r0.trains[0].resp.length * r0.slot) / 10, t0: 0, title: L('同一刺激方案，不同病理', 'Same protocol, different pathology'), compact: true };
  },
  compareExplain: (list, c) => T.compareExplain(list, c),
};
