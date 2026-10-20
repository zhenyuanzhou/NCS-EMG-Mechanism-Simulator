// Recording principles: what an electrode measures (volume conduction), how electrode position
// changes polarity and shape without any change in the source, and how compound potentials
// arise by summation (with phase cancellation).

import { L } from '../../content/i18n.js';
import { fiberFieldSeries, DT, TravellingKernel, logspace } from '../../synthesis/volume.js';
import { measureCompound } from '../../synthesis/measure.js';
import { drawFiberElectrode } from '../../render/micro.js';
import { theme, withAlpha, unitColor } from '../../render/theme.js';
import { getKernel, sensoryTau, unitSurfaceTemplates, DEFAULT_MONTAGE } from '../../synthesis/ncs.js';
import { getSubject } from '../../physiology/subject.js';
import { PV } from '../../core/params.js';
import * as T from '../../content/basics.js';

const FIBER = { halfLen: 30, v: PV.muscleFiberCV, s: 0.7, endTaper: 10 };
export const POSITIONS = {
  under: { z0: 0, en: 'Over the endplate (origin)', zh: '位于终板上方（起源处）' },
  approach: { z0: 14, en: 'Along the fibre, 14 mm from the endplate', zh: '沿纤维，距终板 14 mm' },
  beyond: { z0: 44, en: 'Beyond the fibre end (never reached)', zh: '纤维末端之外（冲动到不了）' },
};

function fieldAt(z0, r, extra = {}) {
  const [w] = fiberFieldSeries({ v: FIBER.v, s: FIBER.s, halfLen: FIBER.halfLen, endTaper: FIBER.endTaper, endMode: 'fade', T: 16, electrodes: [{ r, z0 }], ...extra });
  return w;
}

function computeElectrode(p) {
  const z0 = POSITIONS[p.position].z0;
  const r = p.distance;
  const g1 = fieldAt(z0, r);
  let g2 = null;
  let rec = g1;
  if (p.montage === 'bipolar') {
    g2 = fieldAt(z0 + p.g2offset, r);
    rec = g1.map((v, i) => v - g2[i]);
  }
  // reference shapes at the canonical positions for comparison (same distance)
  const ref = Object.fromEntries(Object.keys(POSITIONS).map((k) => [k, fieldAt(POSITIONS[k].z0, r)]));
  const m = shapeInfo(rec);
  return { kind: 'electrode', p: { ...p }, g1, g2, rec, ref, m, z0 };
}

export function shapeInfo(a) {
  let mx = 0;
  for (const v of a) mx = Math.max(mx, Math.abs(v));
  const thr = 0.08 * mx;
  const lobes = [];
  let cur = 0;
  let first = null;
  let firstT = null;
  for (let i = 0; i < a.length; i++) {
    const s = Math.abs(a[i]) > thr ? Math.sign(a[i]) : 0;
    if (s !== 0 && first === null) {
      first = s;
      firstT = i * DT;
    }
    if (s !== 0 && s !== cur) {
      lobes.push(s > 0 ? '+' : '−');
      cur = s;
    }
  }
  let vmin = 0;
  let vmax = 0;
  for (const v of a) {
    vmin = Math.min(vmin, v);
    vmax = Math.max(vmax, v);
  }
  return { first: first === null ? null : first > 0 ? '+' : '−', firstT, lobes: lobes.join(' '), p2p: vmax - vmin, neg: -vmin, pos: vmax };
}

let sumCache = null;
function baseComponents() {
  if (sumCache) return sumCache;
  // sensory: one fast fibre recorded bipolar (G1 − G2 3.5 cm apart), from the SNAP model
  const k = getKernel();
  const tau = sensoryTau();
  const v = 55;
  const s = v * tau;
  const sens = new Float64Array(Math.round(20 / DT));
  k.addInto(sens, 3, tau, 6 / s, 1);
  k.addInto(sens, 3 + 35 / v, tau, (6 / s) * 1.6, -1);
  // motor: an average-sized unit's surface potential from the CMAP model
  const subj = getSubject(1);
  const tpl = unitSurfaceTemplates(subj.pool, DEFAULT_MONTAGE);
  const mot = new Float64Array(Math.round(20 / DT));
  const uid = 60;
  for (let i = 0; i < tpl[uid].length && i + Math.round(3 / DT) < mot.length; i++) mot[i + Math.round(3 / DT)] = tpl[uid][i];
  const norm = (a) => {
    let mx = 0;
    for (const x of a) mx = Math.max(mx, -x);
    return a.map((x) => x / mx);
  };
  sumCache = { sensory: norm(sens), motor: norm(mot) };
  return sumCache;
}

function computeSummation(p) {
  const base = baseComponents()[p.sumKind];
  const n = 20;
  const comps = [];
  const out = new Float64Array(base.length);
  const sync = new Float64Array(base.length);
  for (let i = 0; i < n; i++) {
    const shift = p.spread * ((i / (n - 1)) * 2 - 1) * 1.73; // uniform spread with the chosen SD
    const c = new Float64Array(base.length);
    const d = shift / DT;
    for (let k = 0; k < base.length; k++) {
      const j = Math.round(k + d);
      if (j >= 0 && j < base.length) c[j] += base[k] / n;
    }
    comps.push({ shift, data: c });
    for (let k = 0; k < base.length; k++) {
      out[k] += c[k];
      sync[k] += base[k] / n;
    }
  }
  const mS = measureCompound(sync, { tStartMs: 0.2 });
  const mD = measureCompound(out, { tStartMs: 0.2 });
  return { kind: 'sum', p: { ...p }, comps, out, sync, mS, mD };
}

export default {
  id: 'basics',
  phase: 1,
  title: { zh: '记录原理', en: 'Recording basics' },
  scales: ['micro'],
  defaults: () => ({ demo: 'electrode', position: 'approach', distance: 0.5, montage: 'mono', g2offset: 20, sumKind: 'sensory', spread: 0.3 }),
  controls: (p) => T.controls(p),
  compute: (p) => (p.demo === 'electrode' ? computeElectrode(p) : computeSummation(p)),
  timeWindow(r) {
    return r.kind === 'electrode' ? { t0: 0, t1: 14, tInit: 3.5, step: 0.1, defaultSpeed: 0.0005, key: 'basics-e' } : { t0: 0, t1: 15, step: 0.1, defaultSpeed: 0.002, key: 'basics-s' };
  },
  sweeps: () => [0.5, 1, 1.5, 2],
  scope(r, p, vo) {
    const th = theme();
    if (r.kind === 'electrode') {
      let mx = 0;
      for (const v of r.rec) mx = Math.max(mx, Math.abs(v));
      const gain = niceGain(mx / 2.5);
      const rows = [];
      const ghost = vo.overlayNormal
        ? Object.entries(r.ref)
            .filter(([k]) => k !== p.position)
            .map(([k, d]) => ({ data: d, color: th.normal, dash: [4, 3], width: 1, ignoreCursor: true }))
        : [];
      rows.push({
        label: p.montage === 'bipolar' ? 'G1' : L('G1（单极）', 'G1 (monopolar)'),
        gain,
        traces: [...(p.montage === 'bipolar' ? [] : ghost), { data: r.g1, color: th.normal, alpha: 0.3, ignoreCursor: true }, { data: r.g1, color: th.trace, width: 2 }],
        note: `${L('首个偏转', 'first deflection')}: ${r.m.first || '—'} · ${L('相', 'phases')}: ${shapeInfo(r.g1).lobes}`,
      });
      if (p.montage === 'bipolar') {
        rows.push({ label: 'G2', gain, traces: [{ data: r.g2, color: th.muted, width: 1.6 }] });
        rows.push({ label: 'G1 − G2', gain, traces: [{ data: r.rec, color: th.normal, alpha: 0.3, ignoreCursor: true }, { data: r.rec, color: th.accent, width: 2 }], note: `${r.m.lobes}` });
      }
      return {
        rows,
        sweep: 1.4,
        t0: 0,
        title: L('单根肌纤维动作电位在电极处产生的细胞外电位（体积导体）', 'Extracellular potential of one muscle-fibre AP at the electrode (volume conduction)'),
        legend: `<span><i style="background:${th.trace}"></i>${L('当前电极位置', 'current electrode position')}</span>${vo.overlayNormal && p.montage !== 'bipolar' ? `<span><i style="background:${th.normal}"></i>${L('其他标准位置（同一纤维、同一距离）', 'other canonical positions (same fibre, same distance)')}</span>` : ''}`,
      };
    }
    const rows = [
      {
        label: L('各成分', 'components'),
        gain: 0.25,
        traces: r.comps.map((c, i) => ({ data: c.data.map((x) => x * 5), color: unitColor(i), width: 1, alpha: 0.75 })),
        note: L('（每个成分放大 ×5）', '(each component ×5)'),
      },
      {
        label: L('总和', 'sum'),
        gain: 0.25,
        traces: [
          ...(vo.overlayNormal ? [{ data: r.sync, color: th.normal, dash: [5, 3], width: 1.2, ignoreCursor: true }] : []),
          { data: r.out, color: th.trace, width: 2 },
        ],
        fill: r.mD.present ? { data: r.out, t0: r.mD.negStart, t1: r.mD.negEnd, color: th.trace } : null,
        note: `${L('峰值', 'peak')} ${(r.mD.amp * 100).toFixed(0)}% · ${L('面积', 'area')} ${((r.mD.area / r.mS.area) * 100).toFixed(0)}% · ${L('时程', 'duration')} ${r.mD.duration.toFixed(2)} ms`,
      },
    ];
    return {
      rows,
      sweep: 1.5,
      t0: 0,
      title: p.sumKind === 'sensory' ? L('20 根感觉纤维电位（每根约 0.5 ms 负相）的总和', 'Sum of 20 sensory-fibre potentials (≈0.5 ms negative phase each)') : L('20 个运动单位表面电位（每个约 5 ms）的总和', 'Sum of 20 motor-unit surface potentials (≈5 ms each)'),
      legend: `<span><i style="background:${th.trace}"></i>${L('有离散的总和', 'sum with dispersion')}</span><span><i style="background:${th.normal}"></i>${L('完全同步的总和', 'perfectly synchronous sum')}</span>`,
    };
  },
  drawAnatomy(ctx, w, h, r, p, vo) {
    const th = theme();
    if (r.kind === 'electrode') {
      const els = [{ z0: r.z0, r: p.distance, label: 'G1', color: th.ink }];
      if (p.montage === 'bipolar') els.push({ z0: r.z0 + p.g2offset, r: p.distance, label: 'G2', color: th.muted });
      drawFiberElectrode(ctx, w, h, { fiber: FIBER, electrodes: els, t: vo.t, lang: vo.lang, title: '' });
      return { hits: [], legend: T.electrodeLegend(th) };
    }
    // summation: arrival timeline of the components
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = th.panel;
    ctx.fillRect(0, 0, w, h);
    const left = 70;
    const right = w - 20;
    const xOf = (t) => left + (t / 15) * (right - left);
    const n = r.comps.length;
    const rowH = (h - 50) / n;
    r.comps.forEach((c, i) => {
      const y = 20 + i * rowH + rowH / 2;
      const t0 = 3 + c.shift;
      ctx.strokeStyle = withAlpha(unitColor(i), 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      const active = vo.t >= t0;
      ctx.fillStyle = active ? unitColor(i) : withAlpha(unitColor(i), 0.3);
      ctx.beginPath();
      ctx.arc(xOf(t0), y, active ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = th.highlight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xOf(vo.t), 10);
    ctx.lineTo(xOf(vo.t), h - 26);
    ctx.stroke();
    ctx.fillStyle = th.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(L('每行 = 一个成分的到达时间（同一时间轴）', 'each row = arrival time of one component (same time axis)'), 10, h - 8);
    return { hits: [], legend: '' };
  },
  explain: (r, p) => T.explain(r, p),
  why: (prev, cur) => T.why(prev, cur),
  modelNotes: () => T.modelNotes(),
};

function niceGain(x) {
  const steps = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];
  for (const s of steps) if (s >= x) return s;
  return 5;
}
