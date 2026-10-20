// Needle EMG module: fibre potentials → MUAP → repeated firing → recruitment/interference;
// rest, insertion, mild and strong contraction; neurogenic (acute/chronic, reinnervation),
// conduction block, myopathy (fibre loss / irritability), reduced central activation.
// Neural drive, firing rate, number of recruited units and force are computed separately.

import { L } from '../../content/i18n.js';
import { scenario, normalScenario, DEFAULT_PARAMS } from '../../physiology/subject.js';
import { needleMUAPs, muapDischarge, voluntarySignal, restSignal, fiberContributions, MUAP_PRE_MS } from '../../synthesis/emg.js';
import { stateAtDrive, driveForForce, DMAX, unitForceCapacity } from '../../physiology/recruitment.js';
import { measureMUAP } from '../../synthesis/measure.js';
import { addNoise } from '../../synthesis/ncs.js';
import { drawCrossSection, drawUnitsLongitudinal } from '../../render/meso.js';
import { theme, unitColor, withAlpha } from '../../render/theme.js';
import { DT } from '../../synthesis/volume.js';
import { hashSeed } from '../../core/rng.js';
import { PV } from '../../core/params.js';
import { MUSCLE_W, MUSCLE_H, unitStats, F_DENERVATED, F_LOST } from '../../physiology/muscle.js';
import * as T from '../../content/emg.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
export const DISCERNIBLE_MV = 0.5; // MUAPs ≥0.5 mV p-p at this site count as "discernible" (calibration of the 5:1 rule)
const SURVEY = [
  [5, 4],
  [9, 6],
  [13, 4.5],
  [15, 8],
  [7, 8.5],
  [11, 9.5],
  [10, 3],
  [14, 6.5],
];

export function emgDefaults() {
  return {
    ...clone(DEFAULT_PARAMS),
    axonal: { ...DEFAULT_PARAMS.axonal, population: 'motor', frac: 0.6 },
    activity: 'mild',
    effortMode: 'force',
    targetForce: 15,
    drive: 30,
    needle: { x: 10, y: 6, z: 12 },
    focus: null,
    display: 'muap',
    zoom: true,
    block: 0,
  };
}

function scenarioParams(p) {
  const sp = clone(DEFAULT_PARAMS);
  for (const k of Object.keys(sp)) if (p[k] !== undefined) sp[k] = clone(p[k]);
  if (p.block > 0) sp.demyel = { ...sp.demyel, on: true, site: 'forearm', slowing: 0.2, dispersion: 0.1, block: p.block, mechanism: 'demyelination' };
  return sp;
}

const surveyCache = new Map();
function survey(pool, grid, key, tempC) {
  if (surveyCache.has(key)) return surveyCache.get(key);
  const list = [];
  for (const [x, y] of SURVEY) {
    const m = needleMUAPs(pool, grid, { x, y, z: 12 }, { tempC });
    for (const e of m.values()) {
      const q = measureMUAP(e.wave);
      if (q.present && q.p2p >= 0.2) list.push(q);
    }
  }
  const mean = (f) => list.reduce((s, q) => s + f(q), 0) / Math.max(1, list.length);
  const out = {
    n: list.length,
    dur: mean((q) => q.duration),
    amp: mean((q) => q.p2p),
    poly: (100 * list.filter((q) => q.phases > 4).length) / Math.max(1, list.length),
    phases: mean((q) => q.phases),
  };
  surveyCache.set(key, out);
  if (surveyCache.size > 30) surveyCache.delete(surveyCache.keys().next().value);
  return out;
}

function effort(p, pool, refMax) {
  const cap = DMAX * (p.centralCap ?? 1);
  if (p.activity === 'rest' || p.activity === 'insertion') return { drive: 0, reached: true, cap };
  if (p.activity === 'max') return { drive: cap, reached: true, cap, max: true };
  if (p.effortMode === 'force') {
    const r = driveForForce(pool, p.targetForce, refMax, cap);
    return { ...r, cap };
  }
  return { drive: Math.min(cap, (p.drive / 100) * DMAX), reached: true, cap };
}

export function computeEMG(p) {
  const sp = scenarioParams(p);
  const sc = scenario(sp);
  const nsc = normalScenario(p.seed || 1, sp.tempC);
  const subj = sc.subj;
  const grid = subj.grid;
  const needle = p.needle;
  const tempC = sp.tempC;
  const muaps = needleMUAPs(sc.pool, grid, needle, { tempC });
  const muapsN = needleMUAPs(subj.pool, grid, needle, { tempC });
  const refMax = subj.refMaxForce;
  // effort: the same instruction applied to the abnormal and the normal muscle
  const eA = effort(p, sc.pool, refMax);
  const eN = effort({ ...p, centralCap: 1 }, subj.pool, refMax);
  const stA = stateAtDrive(sc.pool, eA.drive, refMax, unitForceCapacity(sc.pool));
  const stN = stateAtDrive(subj.pool, eN.drive, refMax, unitForceCapacity(subj.pool));
  // MUAP measurements at this site
  const measured = (m) => new Map([...m].map(([uid, e]) => [uid, measureMUAP(e.wave)]));
  const qA = measured(muaps);
  const qN = measured(muapsN);
  // "Discernible" MUAPs at this site: in the normal muscle, units ≥0.5 mV (the definition
  // used to calibrate the 5:1 rule). In the abnormal muscle the needle samples the SAME units
  // (followed while still ≥0.1 mV and voluntarily available) plus any unit that has newly
  // become ≥0.5 mV (e.g. enlarged by reinnervation).
  const byThr = (pool) => (a, b) => pool.units[a].threshold - pool.units[b].threshold;
  const dN = [...muapsN.keys()].filter((u) => qN.get(u).p2p >= DISCERNIBLE_MV).sort(byThr(subj.pool));
  const dA = [...muaps.keys()]
    .filter((u) => {
      const q = qA.get(u);
      const avail = sc.pool.units[u].alive && sc.pool.units[u].voluntary !== false;
      if (!avail) return false;
      return (dN.includes(u) && q.p2p >= 0.1) || q.p2p >= DISCERNIBLE_MV;
    })
    .sort(byThr(sc.pool));
  const thrA = DISCERNIBLE_MV;
  const firingA = dA.filter((u) => stA.rates[u] > 0);
  const firingN = dN.filter((u) => stN.rates[u] > 0);
  const maxRate = (list, st) => list.reduce((m, u) => Math.max(m, st.rates[u]), 0);
  // focus unit: user choice, else the lowest-threshold discernible unit that exists in both
  let focus = p.focus;
  if (focus === null || !muaps.has(focus)) {
    const pick = dA.find((u) => sc.pool.units[u].alive) ?? [...muaps.keys()].sort((a, b) => qA.get(b).p2p - qA.get(a).p2p)[0];
    focus = pick ?? null;
  }
  const fm = focus !== null ? muaps.get(focus) : null;
  const fmN = focus !== null ? muapsN.get(focus) : null;
  const contrib = focus !== null ? fiberContributions(sc.pool, grid, needle, focus, 8) : [];
  const discharges = focus !== null ? Array.from({ length: 6 }, (_, k) => muapDischarge(sc.pool, grid, needle, focus, hashSeed('dis', k, focus, sc.pool.version), { jitterMs: 0.02 })) : [];
  // continuous record
  const W = 1000;
  const seed = hashSeed('rec', p.seed || 1, needle.x.toFixed(1), needle.y.toFixed(1));
  const rest = restSignal(sc.pool, grid, needle, W, seed, { insertion: p.activity === 'insertion' });
  const restN = restSignal(subj.pool, grid, needle, W, seed, { insertion: p.activity === 'insertion' });
  const vol = voluntarySignal(muaps, stA.rates, W, seed);
  const volN = voluntarySignal(muapsN, stN.rates, W, seed);
  const rec = addNoise(rest.sig.map((v, i) => v + vol.sig[i]), 0.003, seed);
  const recN = addNoise(restN.sig.map((v, i) => v + volN.sig[i]), 0.003, seed);
  // survey of MUAPs over several sites (≈20 MUAPs as in quantitative EMG, p.246)
  const sA = survey(sc.pool, grid, `${sc.pool.tag || 'n'}|${sc.pool.version}|${tempC}`, tempC);
  const sN = survey(subj.pool, grid, `normal|${subj.seed}|${tempC}`, tempC);
  // whole-muscle counts
  const aliveUnits = sc.pool.units.filter((u) => u.alive && u.voluntary !== false && unitStats(sc.pool, u).nFibers > 0).length;
  let denervated = 0;
  let fibrillating = 0;
  let lost = 0;
  for (const f of sc.pool.fibers) {
    if (f.state === F_DENERVATED) denervated++;
    if (f.fibrillating) fibrillating++;
    if (f.state === F_LOST) lost++;
  }
  return {
    p: clone(p),
    sc,
    nsc,
    muaps,
    muapsN,
    qA,
    qN,
    focus,
    fm,
    fmN,
    contrib,
    discharges,
    rec,
    recN,
    rest,
    vol,
    volN,
    eA,
    eN,
    stA,
    stN,
    dA,
    dN,
    firingA,
    firingN,
    rateA: maxRate(firingA, stA),
    rateN: maxRate(firingN, stN),
    sA,
    sN,
    aliveUnits,
    totalUnits: sc.pool.units.length,
    denervated,
    fibrillating,
    lost,
    W,
    thrA,
  };
}

export default {
  id: 'emg',
  phase: 1,
  title: { zh: '针极肌电图', en: 'Needle EMG' },
  scales: ['meso', 'micro'],
  anatomyClickable: true,
  hasContributions: true,
  defaults: emgDefaults,
  controls: (p, r) => T.controls(p, r),
  compute: computeEMG,
  onParam(p, path, v) {
    if (path === 'activity') {
      if (v === 'mild') Object.assign(p, { targetForce: 15, drive: 25 });
      if (v === 'strong') Object.assign(p, { targetForce: 60, drive: 75 });
      if (v === 'rest' || v === 'insertion') p.display = 'record';
    }
    if (path === 'needle.z' || path === 'needle.x') p.focus = null;
  },
  sweeps: (p) => (p.display === 'muap' ? [1, 2, 3, 5] : [10, 20, 50, 100]),
  timeWindow(r, p) {
    if (p.display === 'muap') return { t0: 0, t1: 30, step: 0.2, defaultSpeed: 0.002, key: 'emg-muap' };
    return { t0: 0, t1: r.W, step: 5, defaultSpeed: 0.1, key: 'emg-rec' };
  },
  scope(r, p, vo) {
    const th = theme();
    if (p.display === 'muap') {
      const rows = [];
      if (vo.showContrib && r.contrib.length) {
        rows.push({
          label: L('单根肌纤维\n（该单位最近 8 根）', 'single fibres\n(8 nearest of unit)'),
          gain: 0.2,
          traces: r.contrib.map((c, i) => ({ data: c.data, color: c.reinnervated ? th.accent : unitColor(r.focus), width: 1, alpha: 0.35 + 0.65 * Math.max(0, 1 - c.r / 1.2) })),
          note: L('越近（颜色越深）对波幅贡献越大', 'closer (darker) fibres dominate amplitude'),
        });
      }
      const q = r.fm ? r.qA.get(r.focus) : null;
      const qn = r.fmN ? r.qN.get(r.focus) : null;
      const traces = [];
      if (vo.overlayNormal && r.fmN) traces.push({ data: r.fmN.wave, color: th.normal, dash: [5, 3], width: 1.3, ignoreCursor: true });
      if (r.fm) traces.push({ data: r.fm.wave, color: th.normal, alpha: 0.3, ignoreCursor: true }, { data: r.fm.wave, color: unitColor(r.focus), width: 2.2 });
      rows.push({
        label: `MUAP · MU ${r.focus ?? '—'}`,
        gain: 0.2,
        traces,
        spans: q && q.present ? [{ t0: q.start, t1: q.end, color: th.highlight, alpha: 0.12 }] : [],
        markers: q && q.present ? [{ t: q.start, color: th.accent, label: L('起', 'start') }, { t: q.end, color: th.accent, label: L('止', 'end') }] : [],
        note: q && q.present ? `${(q.p2p * 1000).toFixed(0)} µV · ${q.duration.toFixed(1)} ms · ${q.phases} ${L('相', 'phases')}` : L('该位置无此单位电位', 'no potential at this site'),
      });
      rows.push({
        label: L('连续 6 次放电\n（叠加）', '6 consecutive\ndischarges'),
        gain: 0.2,
        traces: r.discharges.map((d, i) => ({ data: d, color: unitColor(r.focus), width: 1, alpha: 0.55 })),
        note: L('稳定性：形态逐次变化 = 不稳定（NMJ 不成熟/病变）', 'stability: shape varying between discharges = unstable (immature/diseased NMJ)'),
      });
      return {
        rows,
        sweep: 3,
        t0: 0,
        title: L('MUAP 分析：200 µV/div，触发对齐（textbook p.137 推荐 MUAP 增益）', 'MUAP analysis: 200 µV/div, triggered (recommended MUAP gain, p.137)'),
        legend: `<span><i style="background:${unitColor(r.focus ?? 0)}"></i>MU ${r.focus ?? ''} ${L('（与解剖图同色）', '(same colour as in the anatomy)')}</span>${vo.overlayNormal ? `<span><i style="background:${th.normal}"></i>${L('同一单位在正常肌肉中', 'same unit in the normal muscle')}</span>` : ''}${vo.showContrib ? `<span><i style="background:${th.accent}"></i>${L('再支配纤维', 'reinnervated fibres')}</span>` : ''}`,
      };
    }
    const rest = p.activity === 'rest' || p.activity === 'insertion';
    const gain = rest ? 0.05 : p.activity === 'strong' || p.activity === 'max' ? 1 : 0.2;
    const rows = [
      {
        label: L('当前', 'current'),
        gain,
        traces: [{ data: r.rec, color: th.normal, alpha: 0.25, ignoreCursor: true, width: 1 }, { data: r.rec, color: th.trace, width: 1.3 }],
        note: rest ? `${r.rest.events.filter((e) => e.kind !== 'insertion').length} ${L('个自发电位/秒', 'spontaneous potentials/s')}` : `${L('力', 'force')} ${r.stA.forcePct.toFixed(0)}% · ${L('可辨单位', 'discernible units')} ${r.firingA.length} · ${L('最快', 'fastest')} ${r.rateA.toFixed(0)} Hz`,
      },
    ];
    if (vo.overlayNormal) {
      rows.push({
        label: L('正常\n（同一指令）', 'normal\n(same instruction)'),
        gain,
        traces: [{ data: r.recN, color: th.normal, width: 1.2 }],
        note: rest ? '' : `${L('力', 'force')} ${r.stN.forcePct.toFixed(0)}% · ${L('可辨单位', 'units')} ${r.firingN.length} · ${L('最快', 'fastest')} ${r.rateN.toFixed(0)} Hz`,
      });
    }
    return {
      rows,
      sweep: 100,
      t0: 0,
      title: rest ? L('静息记录：50 µV/div（p.137）', 'Rest recording: 50 µV/div (p.137)') : L('随意收缩记录：每个尖峰 = 一个运动单位的一次放电', 'Voluntary recording: each spike = one discharge of one motor unit'),
      legend: rest ? `<span>${L('纤颤电位/正锐波来自去神经的单根肌纤维', 'fibrillations/PSWs come from single denervated fibres')}</span>` : `<span>${L('选择更快的扫描（10 ms/div）可辨认单个 MUAP', 'choose a faster sweep (10 ms/div) to identify individual MUAPs')}</span>`,
    };
  },
  drawAnatomy(ctx, w, h, r, p, vo) {
    const th = theme();
    const pool = r.sc.pool;
    // which units are "lit" at time t
    const active = new Map();
    if (p.display !== 'muap') {
      for (const [uid, times] of r.vol.trains) {
        const hit = times.some((t) => vo.t >= t && vo.t < t + 12);
        if (hit) active.set(uid, 1);
      }
    } else if (r.focus !== null) active.set(r.focus, vo.t > MUAP_PRE_MS && vo.t < MUAP_PRE_MS + 14 ? 1 : 0);
    if (vo.scale === 'meso') {
      const hl = new Set(p.display === 'muap' ? [r.focus] : [...r.firingA.slice(0, 8), r.focus]);
      hl.delete(null);
      const spont = [];
      if (p.display !== 'muap') {
        for (const e of r.rest.events) if (vo.t >= e.t && vo.t < e.t + 8) spont.push([e.fid, 1 - (vo.t - e.t) / 8]);
      } else {
        for (const f of pool.fibers) if (f.fibrillating && Math.hypot(f.x - p.needle.x, f.y - p.needle.y) < 3) spont.push([f.id, 0.4]);
      }
      const out = drawCrossSection(ctx, w, h, {
        pool,
        needle: p.needle,
        zoom: p.zoom ? 3 : null,
        highlight: hl,
        active,
        spontaneous: spont,
        rings: [0.5, 1],
        caption: L('点击：移动针尖（或选中最近的运动单位）', 'Click: move the needle tip (or select the nearest unit)'),
      });
      this._view = out;
      return { hits: [], legend: T.mesoLegend(th, r), view: out };
    }
    // micro: longitudinal view of the focus unit's fibres near the needle
    if (r.focus === null) return { hits: [], legend: '' };
    const near = r.contrib.slice(0, 6).map((c) => {
      const f = pool.fibers[c.fid];
      return { zEp: f.zEp, state: f.state, delay: f.termDelay + f.sproutDelay };
    });
    const other = [...r.muaps.keys()].filter((u) => u !== r.focus).slice(0, 2);
    const units = [{ uid: r.focus, color: unitColor(r.focus), arrival: MUAP_PRE_MS, fibers: near, label: `MU ${r.focus}` }];
    other.forEach((u) => {
      const fl = fiberContributions(pool, r.sc.subj.grid, p.needle, u, 3).map((c) => ({ zEp: pool.fibers[c.fid].zEp, state: pool.fibers[c.fid].state, delay: pool.fibers[c.fid].termDelay }));
      units.push({ uid: u, color: withAlpha(unitColor(u), 0.6), arrival: null, fibers: fl, label: `MU ${u}` });
    });
    drawUnitsLongitudinal(ctx, w, h, {
      units,
      t: p.display === 'muap' ? vo.t : null,
      vFiber: PV.muscleFiberCV,
      needleZ: p.needle.z,
      lang: vo.lang,
      caption: L('同一运动单位的肌纤维与其他单位的肌纤维交错排列；黄色 = 由终板向两端传播的动作电位；黑线 = 针尖位置', 'Fibres of one unit intermingle with others; yellow = AP spreading from the endplate; black line = needle tip'),
    });
    return { hits: [], legend: '' };
  },
  onAnatomyClick({ x, y, info }, p) {
    if (!info || !info.view) return null;
    const mm = info.view.toMm(x, y);
    if (mm.x < 0.3 || mm.y < 0.3 || mm.x > MUSCLE_W - 0.3 || mm.y > MUSCLE_H - 0.3) return null;
    p.needle = { ...p.needle, x: +mm.x.toFixed(2), y: +mm.y.toFixed(2) };
    p.focus = null;
    return p;
  },
  comparePresets: () => T.comparePresets(),
  compareScope: (list, p, vo) => T.compareScope(list, p, vo),
  compareExplain: (list, p) => T.compareExplain(list, p),
  explain: (r, p) => T.explain(r, p),
  why: (prev, cur) => T.why(prev, cur),
  modelNotes: () => T.modelNotes(),
};
