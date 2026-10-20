// Late responses: F wave and H reflex, generated from the same nerve and muscle model.

import { L } from '../../content/i18n.js';
import { DT } from '../../synthesis/volume.js';
import { synthCMAP, unitSurfaceTemplates, terminalDelay, DEFAULT_MONTAGE, addNoise } from '../../synthesis/ncs.js';
import { measureCompound } from '../../synthesis/measure.js';
import { scenario, DEFAULT_PARAMS } from '../../physiology/subject.js';
import { POS, STIM_SITES, LESION_SITES, conduct } from '../../physiology/nerve.js';
import { PV } from '../../core/params.js';
import { fBackfires, iaAfferents, hReflexAt } from '../../physiology/late.js';
import { theme, withAlpha, unitColor } from '../../render/theme.js';
import * as T from '../../content/late.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
const SWEEP = 50; // ms
const NSTIM = 20;

export function lateDefaults() {
  return { response: 'f', stim: 'wrist', lesion: 'none', severity: 0.6, intensity: 18, seed: 1 };
}

function lesionParams(c) {
  const p = clone(DEFAULT_PARAMS);
  p.seed = c.seed;
  p.day = 60;
  const s = c.severity;
  if (c.lesion === 'proxDemyel') p.demyel = { ...p.demyel, on: true, site: 'proximal', slowing: 0.6 * s, dispersion: 0.4 * s, block: +(0.8 * s).toFixed(2), mechanism: 'demyelination' };
  if (c.lesion === 'diffuse') p.demyel = { ...p.demyel, on: true, site: 'diffuse', diffuseSlowing: 0.45 * s, slowing: 0, dispersion: 0, block: 0 };
  if (c.lesion === 'axonal') p.axonal = { ...p.axonal, on: true, site: 'forearm', frac: +(0.9 * s).toFixed(2), population: 'motor' };
  return p;
}

function place(tpl, units, scale, td) {
  const n = Math.round(SWEEP / DT);
  const out = new Float64Array(n);
  for (const u of units) {
    const src = tpl[u.id];
    const d0 = (u.t + td) / DT;
    const k0 = Math.floor(d0);
    const fr = d0 - k0;
    for (let k = 0; k < src.length; k++) {
      const j = k0 + k;
      if (j < 0) continue;
      if (j >= n - 1) break;
      out[j] += src[k] * (1 - fr) * scale;
      out[j + 1] += src[k] * fr * scale;
    }
  }
  return out;
}

function onsetAfter(sig, t0, thr) {
  for (let i = Math.round(t0 / DT); i < sig.length; i++) if (Math.abs(sig[i]) > thr) return i * DT;
  return null;
}

function computeF(c, sc, nsc) {
  const subj = sc.subj;
  const stimPos = STIM_SITES[c.stim].pos;
  const td = terminalDelay();
  const tpl = unitSurfaceTemplates(sc.pool, DEFAULT_MONTAGE);
  const tplN = unitSurfaceTemplates(subj.pool, DEFAULT_MONTAGE);
  const mk = (s, pool, t) => {
    const M = synthCMAP({ nerve: subj.nerve, prep: s.prep, pool, lesion: s.lesion, day: s.day, stimPos, sweepMs: SWEEP, scale: subj.cmapScale }).trace;
    const bf = fBackfires(subj.nerve, s.prep, s.lesion, s.day, stimPos, NSTIM, c.seed);
    const sweeps = bf.map((units, k) => {
      const F = place(t, units, subj.cmapScale, td);
      const tot = new Float64Array(M.length);
      for (let i = 0; i < tot.length; i++) tot[i] = M[i] + F[i];
      return { units, F, trace: addNoise(tot, 0.004, 100 + k) };
    });
    const mM = measureCompound(M, { kind: 'cmap' });
    const fLat = sweeps.map((s) => (s.units.length ? onsetAfter(s.F, mM.present ? mM.onset + 12 : 15, 0.02) : null));
    const present = fLat.filter((v) => v !== null);
    const fAmp = sweeps.map((s) => {
      let mn = 0;
      let mx = 0;
      for (const v of s.F) {
        mn = Math.min(mn, v);
        mx = Math.max(mx, v);
      }
      return mx - mn;
    });
    return {
      M,
      mM,
      sweeps,
      fLat,
      minLat: present.length ? Math.min(...present) : null,
      meanLat: present.length ? present.reduce((a, b) => a + b, 0) / present.length : null,
      chrono: present.length ? Math.max(...present) - Math.min(...present) : null,
      persistence: (100 * present.length) / NSTIM,
      fAmpMean: fAmp.filter((v, i) => fLat[i] !== null).reduce((a, b, _, arr) => a + b / arr.length, 0),
    };
  };
  const ab = mk(sc, sc.pool, tpl);
  const nm = mk(nsc, subj.pool, tplN);
  // F estimate (p.44–45): (2D/CV)×10 + 1 + DL, D in cm from the stimulation site to the cord
  const fEst = (s, pool) => {
    const w = measureCompound(synthCMAP({ nerve: subj.nerve, prep: s.prep, pool, lesion: s.lesion, day: s.day, stimPos: POS.WRIST, sweepMs: SWEEP, scale: subj.cmapScale }).trace, { kind: 'cmap' });
    const e = measureCompound(synthCMAP({ nerve: subj.nerve, prep: s.prep, pool, lesion: s.lesion, day: s.day, stimPos: POS.ELBOW, sweepMs: SWEEP, scale: subj.cmapScale }).trace, { kind: 'cmap' });
    if (!w.present || !e.present) return null;
    const cv = (POS.ELBOW - POS.WRIST) / (e.onset - w.onset);
    const D = (POS.CORD - POS.WRIST) / 10;
    return { cv, dl: w.onset, est: ((2 * D) / cv) * 10 + PV.ahcTurnaroundMs + w.onset };
  };
  // representative axons for the pathway animation: the units that backfired on sweep 1 plus others
  const bf0 = ab.sweeps[0].units;
  const ids = [...bf0.map((u) => u.id).slice(0, 3)];
  for (const i of [8, 30, 52, 74, 96, 116]) if (ids.length < 7 && !ids.includes(i)) ids.push(i);
  ids.sort((a, b) => a - b);
  const lanes = ids.map((i) => {
    const ax = subj.nerve.motor[i];
    const up = conduct(ax, sc.prep.motor[i], stimPos, POS.CORD, sc.lesion, sc.day);
    const m = conduct(ax, sc.prep.motor[i], stimPos, POS.MOTOR_POINT, sc.lesion, sc.day);
    const b = bf0.find((u) => u.id === i);
    let stopPos = null;
    if (!up.ok) {
      const site = sc.lesion.demyel?.site && LESION_SITES[sc.lesion.demyel.site] ? LESION_SITES[sc.lesion.demyel.site] : sc.lesion.axonal ? LESION_SITES[sc.lesion.axonal.site] : null;
      stopPos = site ? site.a : stimPos;
    }
    return { id: i, v: (POS.CORD - stimPos) / (up.ok ? up.t : (POS.CORD - stimPos) / ax.cv), up: up.ok ? up.t : null, mT: m.ok ? m.t : null, stopPos, backfire: !!b, down: b ? b.down : null, dead: !m.ok && !up.ok };
  });
  return { ab, nm, est: fEst(sc, sc.pool), estN: fEst(nsc, subj.pool), lanes, stimPos };
}

function computeH(c, sc) {
  const subj = sc.subj;
  const stimPos = STIM_SITES[c.stim].pos;
  const ia = iaAfferents(c.seed);
  const rank = subj.pool.units.map((u) => u.rank ?? u.threshold);
  const td = terminalDelay();
  const tpl = unitSurfaceTemplates(sc.pool, DEFAULT_MONTAGE);
  const at = (I) => {
    const h = hReflexAt(subj.nerve, sc.prep, sc.lesion, sc.day, stimPos, I, ia, rank);
    const M = synthCMAP({ nerve: subj.nerve, prep: sc.prep, pool: sc.pool, lesion: sc.lesion, day: sc.day, stimPos, intensity: I, sweepMs: SWEEP, scale: subj.cmapScale }).trace;
    const H = place(tpl, h.units, subj.cmapScale, td);
    const pp = (x) => {
      let mn = 0;
      let mx = 0;
      for (const v of x) {
        mn = Math.min(mn, v);
        mx = Math.max(mx, v);
      }
      return mx - mn;
    };
    return { I, h, M, H, mAmp: pp(M), hAmp: pp(H) };
  };
  const curve = [];
  for (let I = 2; I <= 46; I += 2) curve.push(at(I));
  const supra = at(Infinity);
  const cur = at(c.intensity);
  const trace = new Float64Array(cur.M.length);
  for (let i = 0; i < trace.length; i++) trace[i] = cur.M[i] + cur.H[i];
  const hMax = Math.max(...curve.map((p) => p.hAmp));
  const mMax = supra.mAmp;
  const hLat = cur.h.units.length ? onsetAfter(cur.H, 0, 0.02) : null;
  const lanes = [4, 20, 36, 52, 68, 84, 100, 116].map((i) => {
    const ax = subj.nerve.motor[i];
    return { id: i, v: ax.cv, direct: cur.h.direct[i], reflex: cur.h.reflex.has(i), collided: cur.h.collided.includes(i) };
  });
  return { curve, supra, cur, trace: addNoise(trace, 0.004, 9), hMax, mMax, hLat, lanes, stimPos, iaV: PV.iaCV };
}

export function computeLate(c) {
  const sc = scenario(lesionParams(c));
  const nsc = scenario({ ...clone(DEFAULT_PARAMS), seed: c.seed });
  const out = { c: clone(c) };
  if (c.response === 'h') Object.assign(out, { kind: 'h' }, computeH(c, nsc));
  else Object.assign(out, { kind: 'f' }, computeF(c, sc, nsc));
  return out;
}

export default {
  id: 'late',
  phase: 3,
  title: { zh: '晚反应 F 波 / H 反射', en: 'Late responses F / H' },
  scales: ['macro', 'meso'],
  hasContributions: false,
  noOverlay: true,
  defaults: lateDefaults,
  controls: (p) => T.controls(p),
  compute: (c) => computeLate(c),
  timeWindow: (r, c) => ({ t0: 0, t1: SWEEP, step: 0.25, defaultSpeed: 0.005, key: 'late-' + c.response }),
  scope(r, c, vo) {
    const th = theme();
    if (r.kind === 'h') {
      return {
        rows: [
          {
            label: L(`${c.intensity} mA\n（1 ms 脉冲）`, `${c.intensity} mA\n(1 ms pulse)`),
            gain: 0.5,
            traces: [{ data: r.trace, color: th.trace, width: 1.6 }],
            markers: [r.hLat !== null ? { t: r.hLat, color: th.accent, label: 'H' } : null, { t: 3, color: th.muted, label: 'M' }].filter(Boolean),
            note: `M ${r.cur.mAmp.toFixed(2)} mV · H ${r.cur.hAmp.toFixed(2)} mV · H/M ${(r.cur.hAmp / Math.max(1e-6, r.mMax) * 100).toFixed(0)}%`,
          },
          {
            label: L('超强刺激', 'Supramaximal'),
            gain: 0.5,
            traces: [{ data: r.supra.M, color: th.normal, width: 1.3, ignoreCursor: true }],
            note: L('H 消失（全部碰撞）；此时可见的晚波是 F', 'H gone (all collided); late waves now are F'),
          },
        ],
        sweep: SWEEP / 10,
        t0: 0,
        title: L('H 反射（示意：成人常规为胫神经–比目鱼肌；此处用同一模型神经）', 'H reflex (schematic: in adults routinely tibial→soleus; here the same model nerve)'),
        legend: T.hLegend(),
      };
    }
    const rows = [
      {
        label: L(`${NSTIM} 次叠加`, `${NSTIM} sweeps`),
        gain: 0.2,
        traces: r.ab.sweeps.map((s) => ({ data: s.trace, color: th.trace, width: 0.9, alpha: 0.4 })),
        markers: r.ab.minLat !== null ? [{ t: r.ab.minLat, color: th.accent, label: L('最短 F', 'min F') }] : [],
        note: `${L('持续率', 'persistence')} ${r.ab.persistence.toFixed(0)}% · ${L('最短潜伏期', 'min latency')} ${r.ab.minLat !== null ? r.ab.minLat.toFixed(1) + ' ms' : '—'}`,
      },
      {
        label: L('前 3 次（不同单位）', 'First 3 sweeps\n(different units)'),
        gain: 0.2,
        traces: r.ab.sweeps.slice(0, 3).map((s, i) => ({ data: s.trace, color: unitColor(i * 3 + 1), width: 1.4 })),
        note: L('每次回返放电的前角细胞不同 → F 形态与潜伏期都在变', 'A different set of neurons backfires each time → F shape and latency vary'),
      },
    ];
    if (c.lesion !== 'none')
      rows.push({
        label: L('正常对照', 'Normal'),
        gain: 0.2,
        traces: r.nm.sweeps.map((s) => ({ data: s.trace, color: th.normal, width: 0.9, alpha: 0.4 })),
        note: `${L('最短', 'min')} ${r.nm.minLat !== null ? r.nm.minLat.toFixed(1) : '—'} ms`,
      });
    return { rows, sweep: SWEEP / 10, t0: 0, title: L(`F 波：${c.stim === 'wrist' ? '腕' : '肘'}部刺激，200 µV/div（M 波被截顶）`, `F waves: ${c.stim} stimulation, 200 µV/div (M wave clipped)`), compact: rows.length > 2, legend: T.fLegend() };
  },
  drawAnatomy(ctx, w, h, r, c, vo) {
    if (vo.scale === 'meso') {
      if (r.kind === 'h') T.drawHCurve(ctx, w, h, r, c, vo.lang);
      else T.drawFRaster(ctx, w, h, r, c, vo.lang);
      return { hits: [], legend: r.kind === 'h' ? T.hCurveLegend() : T.fRasterLegend() };
    }
    T.drawPathway(ctx, w, h, r, c, vo.t ?? 0, vo.lang);
    return { hits: [], legend: T.pathwayLegend(r) };
  },
  explain: (r, c) => T.explain(r, c),
  why: (prev, cur) => T.why(prev, cur),
  modelNotes: () => T.modelNotes(),
};
