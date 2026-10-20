// Nerve conduction studies module: motor (CMAP) and sensory (SNAP) studies with proximal and
// distal stimulation; axonal loss, demyelination (slowing / dispersion / block / nodal
// failure), myopathy; synchronized anatomy and waveform.

import { L } from '../../content/i18n.js';
import { scenario, normalScenario, DEFAULT_PARAMS } from '../../physiology/subject.js';
import { POS, LESION_SITES, STIM_SITES, frontAt, axonSegments, conduct } from '../../physiology/nerve.js';
import { synthCMAP, synthSNAP, unitSurfaceTemplates, unitContribution, addArtifact, addNoise, DEFAULT_MONTAGE } from '../../synthesis/ncs.js';
import { measureCompound } from '../../synthesis/measure.js';
import { drawMacro } from '../../render/macro.js';
import { drawMyelinatedAxon } from '../../render/micro.js';
import { theme, withAlpha, unitColor } from '../../render/theme.js';
import { DT } from '../../synthesis/volume.js';
import { PV } from '../../core/params.js';
import * as T from '../../content/ncs.js';

const MOTOR_SITES = ['wrist', 'elbow', 'axilla'];
const SENSORY_SITES = ['wrist', 'elbow'];

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

export function ncsDefaults() {
  return {
    ...clone(DEFAULT_PARAMS),
    day: 21, // Wallerian degeneration complete, collateral reinnervation not yet started
    study: 'motor',
    stim: 'elbow',
    showSites: 'all',
    noise: true,
  };
}

function scenarioParams(p) {
  const { study, stim, showSites, noise, ...rest } = p;
  return rest;
}

export function computeNCS(p) {
  const sp = scenarioParams(p);
  const sc = scenario(sp);
  const nsc = normalScenario(p.seed || 1);
  const subj = sc.subj;
  const sites = p.study === 'motor' ? MOTOR_SITES : SENSORY_SITES;
  const rows = sites.map((key) => {
    const pos = STIM_SITES[key].pos;
    const sweepMs = p.study === 'motor' ? 60 : 30;
    let ab;
    let nm;
    if (p.study === 'motor') {
      ab = synthCMAP({ nerve: subj.nerve, prep: sc.prep, pool: sc.pool, lesion: sc.lesion, day: sc.day, stimPos: pos, sweepMs, scale: subj.cmapScale });
      nm = synthCMAP({ nerve: subj.nerve, prep: nsc.prep, pool: subj.pool, lesion: nsc.lesion, day: 365, stimPos: pos, sweepMs, scale: subj.cmapScale });
    } else {
      ab = synthSNAP({ nerve: subj.nerve, prep: sc.prep, lesion: sc.lesion, day: sc.day, stimPos: pos, sweepMs, scale: subj.snapScale });
      nm = synthSNAP({ nerve: subj.nerve, prep: nsc.prep, lesion: nsc.lesion, day: 365, stimPos: pos, sweepMs, scale: subj.snapScale });
    }
    const kind = p.study === 'motor' ? 'cmap' : 'snap';
    const noiseMv = p.noise ? (p.study === 'motor' ? 0.004 : 0.0007) : 0;
    const artAmp = p.study === 'motor' ? 0.6 : 0.006;
    return {
      key,
      pos,
      ab,
      nm,
      mAb: measureCompound(ab.trace, { kind }),
      mNm: measureCompound(nm.trace, { kind }),
      disp: addNoise(addArtifact(ab.trace, artAmp), noiseMv, 7 + pos),
      dispN: nm.trace,
    };
  });
  // segmental velocities: distance / (proximal onset − distal onset)  (textbook p.25)
  const segs = [];
  for (let i = 1; i < rows.length; i++) {
    const d = rows[i - 1];
    const q = rows[i];
    const dist = q.pos - d.pos;
    const cvAb = d.mAb.present && q.mAb.present ? dist / (q.mAb.onset - d.mAb.onset) : null;
    const cvNm = dist / (q.mNm.onset - d.mNm.onset);
    segs.push({ from: d.key, to: q.key, dist, cvAb, cvNm });
  }
  // sensory distal CV from onset latency (single site)
  let sensCV = null;
  if (p.study === 'sensory') {
    const r0 = rows[0];
    const dist = POS.WRIST - POS.RING_G1;
    sensCV = { ab: r0.mAb.present ? dist / r0.mAb.onset : null, nm: dist / r0.mNm.onset, dist };
  }
  // representative axons for the anatomy view (quantiles of conduction velocity)
  const list = p.study === 'motor' ? subj.nerve.motor : subj.nerve.sensory;
  const sorted = list.slice().sort((a, b) => b.cv - a.cv);
  const reps = [0.02, 0.18, 0.35, 0.5, 0.65, 0.82, 0.97].map((q) => sorted[Math.floor(q * (sorted.length - 1))]);
  // a few individual units for the "contributions" overlay (motor)
  let contrib = [];
  if (p.study === 'motor') {
    const tpl = unitSurfaceTemplates(sc.pool, DEFAULT_MONTAGE, sc.lesion.tempC ?? PV.refTempC);
    const site = rows.find((r) => r.key === p.stim) || rows[0];
    contrib = reps
      .map((a) => site.ab.arrivals.find((x) => x.id === a.id))
      .filter((x) => x && x.ok)
      .map((arr) => ({ id: arr.id, data: unitContribution(tpl, arr, 60, subj.cmapScale * 6), t: arr.t }));
  }
  return { p: clone(p), sc, nsc, rows, segs, sensCV, reps, contrib };
}

function niceSweep(maxT) {
  const opts = [0.5, 1, 2, 3, 5, 10];
  for (const o of opts) if (maxT <= o * 10) return o;
  return 10;
}

export default {
  id: 'ncs',
  phase: 1,
  title: { zh: '神经传导 NCS', en: 'Nerve conduction' },
  scales: ['macro', 'meso', 'micro'],
  hasContributions: true,
  anatomyClickable: true,
  defaults: ncsDefaults,
  controls: (p) => T.controls(p),
  compute: computeNCS,
  sweeps: () => [0.5, 1, 2, 3, 5, 10],

  timeWindow(r, p) {
    const last = r.rows.reduce((m, row) => Math.max(m, (row.mAb.present ? row.mAb.negEnd : 0) || 0, row.mNm.negEnd || 0), 0);
    const end = Math.max(p.study === 'motor' ? 20 : 8, last + (p.study === 'motor' ? 8 : 3));
    const sweep = niceSweep(end);
    return { t0: 0, t1: sweep * 10, step: p.study === 'motor' ? 0.2 : 0.05, defaultSpeed: p.study === 'motor' ? 0.002 : 0.0005, key: 'ncs-' + p.study };
  },

  scope(r, p, vo) {
    const th = theme();
    const win = this.timeWindow(r, p);
    const sweep = win.t1 / 10;
    const unit = p.study === 'motor' ? 'mV' : 'µV';
    const gain = p.study === 'motor' ? (r.rows.length > 2 ? 5 : 2) : 0.01;
    const rows = r.rows.map((row) => {
      const traces = [];
      if (vo.overlayNormal) traces.push({ data: row.dispN, color: th.normal, width: 1.3, dash: [5, 3], ignoreCursor: true });
      traces.push({ data: row.disp, color: th.normal, alpha: 0.25, width: 1.2, ignoreCursor: true });
      traces.push({ data: row.disp, color: th.trace, width: 1.8 });
      if (vo.showContrib && p.study === 'motor' && row.key === p.stim) {
        r.contrib.forEach((c) => traces.push({ data: c.data, color: unitColor(c.id), width: 1.1, alpha: 0.9 }));
      }
      const m = row.mAb;
      const markers = [];
      if (m.present) {
        markers.push({ t: m.onset, color: th.accent, label: L('潜伏期', 'onset') });
        markers.push({ t: m.negPeakLat, color: th.muted, y: -m.amp });
      }
      return {
        label: `${L(STIM_SITES[row.key])}${row.key === p.stim ? ' ⚡' : ''}`,
        gain,
        traces,
        markers,
        spans: m.present ? [{ t0: m.negStart, t1: m.negEnd, color: th.highlight, alpha: 0.1 }] : [],
        fill: m.present ? { data: row.disp, t0: m.negStart, t1: m.negEnd, color: th.trace } : null,
        ampBracket: m.present ? { t: m.negPeakLat, v: -m.amp } : null,
        note: m.present ? `${m.amp >= 1 ? m.amp.toFixed(1) + ' mV' : (m.amp * 1000).toFixed(0) + ' µV'} · ${m.onset.toFixed(2)} ms` : L('无反应', 'no response'),
      };
    });
    const legend = `<span><i style="background:${th.trace}"></i>${L('当前', 'current')}</span>${vo.overlayNormal ? `<span><i style="background:${th.normal}"></i>${L('正常（同一受试者）', 'normal (same subject)')}</span>` : ''}<span><i style="background:${th.highlight};opacity:.4"></i>${L('负相时程', 'negative-peak duration')}</span><span><i style="background:${th.trace};opacity:.3"></i>${L('负相面积', 'negative area')}</span>${vo.showContrib && p.study === 'motor' ? `<span>${L('彩色细线：单个运动单位的贡献（×6 放大）', 'thin coloured: single-unit contributions (×6)')}</span>` : ''}`;
    return {
      rows,
      sweep,
      t0: 0,
      title: p.study === 'motor' ? L('运动传导：记录拇短展肌（皮肤表面，肌腹-肌腱导联）', 'Motor NCS: recording APB (belly–tendon surface montage)') : L('感觉传导（逆向）：腕刺激，示指指环电极记录', 'Sensory NCS (antidromic): stimulate wrist, ring electrodes on digit 2'),
      footer: L('负相向上 ↑', 'negative up ↑'),
      legend,
    };
  },

  compareScope(list, p, vo) {
    const th = theme();
    const rows = [];
    list.forEach(({ preset, result }) => {
      result.rows.forEach((row, i) => {
        if (i > 1) return;
        rows.push({
          label: `${L(preset.label)}\n${L(STIM_SITES[row.key])}`,
          gain: p.study === 'motor' ? 5 : 0.01,
          traces: [
            { data: row.dispN, color: th.normal, dash: [5, 3], width: 1.2, ignoreCursor: true },
            { data: row.disp, color: th.trace, width: 1.7 },
          ],
          markers: row.mAb.present ? [{ t: row.mAb.onset, color: th.accent }] : [],
          fill: row.mAb.present ? { data: row.disp, t0: row.mAb.negStart, t1: row.mAb.negEnd, color: th.trace } : null,
          note: row.mAb.present ? `${p.study === 'motor' ? row.mAb.amp.toFixed(1) + ' mV' : (row.mAb.amp * 1000).toFixed(0) + ' µV'}` : '—',
        });
      });
    });
    const win = this.timeWindow(list[0].result, p);
    return { rows, sweep: win.t1 / 10, t0: 0, title: L('机制比较：远端与近端刺激', 'Mechanism comparison: distal and proximal stimulation'), compact: true, legend: `<span><i style="background:${th.normal}"></i>${L('正常', 'normal')}</span><span><i style="background:${th.trace}"></i>${L('该机制', 'mechanism')}</span>` };
  },

  comparePresets: () => T.comparePresets(),
  compareExplain: (list, p) => T.compareExplain(list, p),

  drawAnatomy(ctx, w, h, r, p, vo) {
    const th = theme();
    const sc = r.sc;
    const site = STIM_SITES[p.stim] || STIM_SITES.wrist;
    const isMotor = p.study === 'motor';
    const distal = isMotor ? POS.MOTOR_POINT : POS.RING_G2;
    if (vo.scale === 'macro') {
      const axons = r.reps.map((ax, i) => {
        const pa = isMotor ? sc.prep.motor[ax.id] : sc.prep.sensory[ax.id];
        const segments = axonSegments(ax, pa, sc.lesion, sc.day, distal);
        const impulses = [];
        const stops = [];
        const fd = frontAt(ax, pa, site.pos, distal, sc.lesion, sc.day, vo.t);
        const fp = frontAt(ax, pa, site.pos, POS.CORD, sc.lesion, sc.day, vo.t);
        if (fd) {
          if (!fd.arrived) impulses.push(fd.pos);
          if (fd.stopped) stops.push({ pos: fd.pos });
        } else stops.push({ pos: site.pos });
        if (fp && !fp.arrived && !fp.stopped) impulses.push(fp.pos);
        return {
          kind: isMotor ? 'motor' : 'sensory',
          lane: (i - 3) * 1.6,
          color: isMotor ? unitColor(ax.id) : unitColor(ax.id + 5),
          segments,
          impulses,
          stops,
          highlight: false,
        };
      });
      const lesions = [];
      if (p.axonal.on) lesions.push({ site: p.axonal.site, kind: 'axonal' });
      if (p.demyel.on && p.demyel.site !== 'diffuse') lesions.push({ site: p.demyel.site, kind: 'demyel' });
      // muscle activation: fraction of motor units whose response is in progress
      let act = 0;
      if (isMotor) {
        const row = r.rows.find((x) => x.key === p.stim);
        if (row) {
          const ok = row.ab.arrivals.filter((a) => a.ok);
          const on = ok.filter((a) => vo.t >= a.t && vo.t <= a.t + 6).length;
          act = on / Math.max(1, sc.subj.nerve.motor.length);
        }
      }
      const out = drawMacro(ctx, w, h, {
        lang: vo.lang,
        axons,
        lesions,
        stimSite: p.stim,
        stimSites: (isMotor ? MOTOR_SITES : SENSORY_SITES).map((k) => ({ key: k, pos: STIM_SITES[k].pos, label: L(STIM_SITES[k]) })),
        recording: isMotor ? 'motor' : 'sensory',
        muscleActivation: Math.min(1, act * 2.5),
        drgHighlight: p.axonal.on && p.axonal.site === 'rootPre',
        caption: L('点击 ⚡ 选择动画中的刺激部位；圆点 = 代表性轴突中的冲动', 'Click ⚡ to choose the animated stimulation site; dots = impulses in representative axons'),
      });
      out.legend = T.macroLegend(p, th);
      return out;
    }
    if (vo.scale === 'meso') return drawRace(ctx, w, h, r, p, vo);
    // micro: saltatory conduction in the fastest axon crossing the lesion segment
    const demy = p.demyel.on;
    const nodes = 14;
    const rel = vo.t / (this.timeWindow(r, p).t1 || 1);
    const pa = isMotor ? sc.prep.motor[r.reps[0].id] : sc.prep.sensory[r.reps[0].id];
    const blocked = demy && pa.blocked;
    const seg = demy ? [5, 9] : null;
    const slowF = demy ? pa.segFactor : 1;
    // node index reached at this fraction of the animation (slower inside the segment)
    const tNode = (i) => (seg && i > seg[0] ? seg[0] + Math.min(i, seg[1]) - seg[0] + (Math.min(i, seg[1]) - seg[0]) * (1 / slowF - 1) + Math.max(0, i - seg[1]) : i);
    const total = tNode(nodes);
    let pos = 0;
    const tt = rel * total * 1.05;
    for (let i = 0; i <= nodes; i++) if (tNode(i) <= tt) pos = i;
    if (blocked && pos > seg[0]) pos = seg[0];
    drawMyelinatedAxon(ctx, w, h, {
      pos,
      demyel: seg,
      block: blocked,
      lang: vo.lang,
      nodes,
      title: demy ? (p.demyel.mechanism === 'nodal' ? L('节性功能障碍：结区钠通道/旁结区受累 → 传导失败而髓鞘大体完整（示意）', 'Nodal dysfunction: nodal/paranodal failure → conduction failure without gross demyelination (schematic)') : L(`脱髓鞘段：此轴突在病灶段速度 ×${slowF.toFixed(2)}${blocked ? '，且发生传导阻滞' : ''}`, `Demyelinated internodes: this axon conducts ×${slowF.toFixed(2)} in the segment${blocked ? ' and is blocked' : ''}`)) : L('正常有髓轴突：动作电位在郎飞结间跳跃（示意，非比例）', 'Normal myelinated axon: impulse jumps node to node (schematic, not to scale)'),
    });
    return { hits: [], legend: T.microLegend(p) };
  },

  onAnatomyClick({ hit }, p) {
    if (hit && hit.kind === 'stim') {
      p.stim = hit.key;
      return p;
    }
    return null;
  },

  explain: (r, p) => T.explain(r, p),
  why: (prev, cur, lang) => T.why(prev, cur),
  modelNotes: () => T.modelNotes(),
};

// "Race" view: every axon's impulse front at time t along the path from the stimulation
// site to the recording electrode → shows temporal dispersion, slowing and block directly.
function drawRace(ctx, w, h, r, p, vo) {
  const th = theme();
  const sc = r.sc;
  const isMotor = p.study === 'motor';
  const site = STIM_SITES[p.stim] || STIM_SITES.wrist;
  const target = isMotor ? POS.MOTOR_POINT : POS.RING_G1;
  const list = isMotor ? sc.subj.nerve.motor : sc.subj.nerve.sensory;
  const preps = isMotor ? sc.prep.motor : sc.prep.sensory;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const left = 60;
  const right = w - 30;
  const span = site.pos - target;
  const xOf = (pos) => left + ((site.pos - pos) / span) * (right - left);
  // lesion bands
  const bands = [];
  if (p.axonal.on) bands.push([LESION_SITES[p.axonal.site], th.lesion]);
  if (p.demyel.on && p.demyel.site !== 'diffuse') bands.push([LESION_SITES[p.demyel.site], th.warn]);
  bands.forEach(([s, col]) => {
    if (!s) return;
    const a = Math.max(target, Math.min(site.pos, s.a));
    const b = Math.max(target, Math.min(site.pos, s.b));
    if (b > a) {
      ctx.fillStyle = withAlpha(col, 0.15);
      ctx.fillRect(xOf(b), 18, xOf(a) - xOf(b), h - 50);
    }
  });
  const sorted = list.map((a, i) => ({ a, pa: preps[i] })).sort((x, y) => y.a.cv - x.a.cv);
  const n = sorted.length;
  const rowH = (h - 60) / n;
  let arrivedCount = 0;
  sorted.forEach(({ a, pa }, i) => {
    const y = 22 + i * rowH;
    const f = frontAt(a, pa, site.pos, target, sc.lesion, sc.day, vo.t);
    const col = a.cv > 55 ? th.trace : a.cv > 45 ? th.sensory : th.motor;
    if (!f) {
      ctx.fillStyle = withAlpha(th.muted, 0.25);
      ctx.fillRect(left, y, 3, Math.max(1, rowH * 0.8));
      return;
    }
    const x = xOf(f.pos);
    ctx.fillStyle = withAlpha(col, 0.18);
    ctx.fillRect(left, y + rowH * 0.35, x - left, Math.max(1, rowH * 0.3));
    ctx.fillStyle = f.stopped ? th.lesion : col;
    ctx.fillRect(x - 1.5, y, 3, Math.max(1.5, rowH * 0.9));
    if (f.arrived) arrivedCount++;
  });
  // electrode line
  ctx.strokeStyle = th.ink;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(xOf(target), 14);
  ctx.lineTo(xOf(target), h - 34);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = th.ink;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(isMotor ? L('运动点/NMJ', 'motor point/NMJ') : 'G1', xOf(target), 12);
  ctx.textAlign = 'left';
  ctx.fillText(`⚡ ${L(site)}`, left - 50, 12);
  ctx.font = '10.5px system-ui, sans-serif';
  ctx.fillStyle = th.muted;
  ctx.fillText(L(`每一行 = 一根${isMotor ? '运动' : '感觉'}轴突（按传导速度由快到慢排列）。竖线 = 此刻冲动前沿；红色 = 被阻滞/中断。`, `Each row = one ${isMotor ? 'motor' : 'sensory'} axon (fastest at top). Bar = impulse front now; red = blocked/interrupted.`), 8, h - 18);
  ctx.fillText(L(`已到达：${arrivedCount}/${n}`, `arrived: ${arrivedCount}/${n}`), 8, h - 5);
  return {
    hits: [],
    legend: `<span><i style="background:${th.trace}"></i>&gt;55 m/s</span><span><i style="background:${th.sensory}"></i>45–55 m/s</span><span><i style="background:${th.motor}"></i>&lt;45 m/s</span><span>${L('到达时间的离散 = 时间离散（temporal dispersion）', 'spread of arrival times = temporal dispersion')}</span>`,
  };
}
