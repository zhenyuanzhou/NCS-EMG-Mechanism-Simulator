// Meso-scale views.
//  • Cross-section of the muscle: every modelled fibre, intermingled motor units (mosaic),
//    the needle tip and its pickup zone. Fibre state is shown (denervated, reinnervated,
//    lost, irritable). Selected units are coloured with the same colour as their trace.
//  • Longitudinal motor-unit view: a few axons, their terminal branches and fibres, with the
//    action potential spreading from the endplate along each fibre at the modelled time.

import { theme, withAlpha, unitColor } from './theme.js';
import { MUSCLE_W, MUSCLE_H, F_DENERVATED, F_LOST, F_REINNERVATED } from '../physiology/muscle.js';

const baseCache = new Map();

function baseLayer(pool, w, h, view, th, dim) {
  const key = `${pool.seed}|${pool.version}|${pool.tag || ''}|${w}|${h}|${view.x0.toFixed(2)}|${view.y0.toFixed(2)}|${view.s.toFixed(3)}|${dim}|${th.bg}`;
  if (baseCache.has(key)) return baseCache.get(key);
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w * 2, h * 2) : Object.assign(document.createElement('canvas'), { width: w * 2, height: h * 2 });
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  ctx.fillStyle = withAlpha(th.muscle, 0.45);
  ctx.fillRect(0, 0, w, h);
  const r = Math.max(0.9, view.s * 0.045);
  for (const f of pool.fibers) {
    const x = (f.x - view.x0) * view.s;
    const y = (f.y - view.y0) * view.s;
    if (x < -3 || y < -3 || x > w + 3 || y > h + 3) continue;
    if (f.state === F_LOST) {
      ctx.strokeStyle = withAlpha(th.muted, 0.25);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    const rr = r * Math.max(0.45, Math.min(1.6, f.diam));
    if (f.state === F_DENERVATED) {
      ctx.fillStyle = withAlpha(th.muted, 0.35);
    } else {
      ctx.fillStyle = dim ? withAlpha(th.muscleDark, 0.55) : withAlpha(unitColor(f.unit), 0.75);
    }
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  baseCache.set(key, c);
  if (baseCache.size > 12) baseCache.delete(baseCache.keys().next().value);
  return c;
}

// opts: { pool, needle, zoom (mm half-width or null for whole muscle), highlight:Set(uid),
//         active: Map(uid → 0..1 brightness), showStates, lang, rings:[mm…], spontaneous:[fid…] }
export function drawCrossSection(ctx, w, h, opts) {
  const th = theme();
  const { pool, needle } = opts;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  let view;
  if (opts.zoom && needle) {
    const half = opts.zoom;
    const s = Math.min(w / (2 * half * 1.6), h / (2 * half));
    view = { x0: needle.x - w / (2 * s), y0: needle.y - h / (2 * s), s };
  } else {
    const s = Math.min((w - 20) / MUSCLE_W, (h - 30) / MUSCLE_H);
    view = { x0: -(w / s - MUSCLE_W) / 2, y0: -(h / s - MUSCLE_H) / 2 + 0.3, s };
  }
  const hl = opts.highlight || new Set();
  const dim = hl.size > 0;
  const base = baseLayer(pool, Math.round(w), Math.round(h), view, th, dim);
  ctx.drawImage(base, 0, 0, w, h);
  const r = Math.max(1, view.s * 0.045);
  // highlighted units drawn on top in their colours
  if (dim) {
    for (const uid of hl) {
      const u = pool.units[uid];
      if (!u) continue;
      const act = opts.active ? opts.active.get(uid) || 0 : 0;
      for (const fid of u.fibers) {
        const f = pool.fibers[fid];
        if (f.state === F_LOST || f.state === F_DENERVATED) continue;
        const x = (f.x - view.x0) * view.s;
        const y = (f.y - view.y0) * view.s;
        if (x < -3 || y < -3 || x > w + 3 || y > h + 3) continue;
        const rr = r * Math.max(0.5, Math.min(1.7, f.diam)) * (1 + 0.6 * act);
        ctx.fillStyle = unitColor(uid);
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fill();
        if (f.state === F_REINNERVATED) {
          ctx.strokeStyle = th.ink;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
      // territory outline
      ctx.strokeStyle = withAlpha(unitColor(uid), 0.7);
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc((u.cx - view.x0) * view.s, (u.cy - view.y0) * view.s, u.radius * view.s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // spontaneously active fibres
  if (opts.spontaneous) {
    for (const [fid, a] of opts.spontaneous) {
      const f = pool.fibers[fid];
      const x = (f.x - view.x0) * view.s;
      const y = (f.y - view.y0) * view.s;
      ctx.fillStyle = withAlpha(th.bad, 0.35 + 0.65 * a);
      ctx.beginPath();
      ctx.arc(x, y, r * (1.3 + a), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // needle
  if (needle) {
    const nx = (needle.x - view.x0) * view.s;
    const ny = (needle.y - view.y0) * view.s;
    (opts.rings || [0.5, 1.0]).forEach((rmm, i) => {
      ctx.strokeStyle = withAlpha(th.ink, i ? 0.25 : 0.5);
      ctx.setLineDash(i ? [3, 4] : []);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(nx, ny, rmm * view.s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = th.muted;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${rmm} mm`, nx + rmm * view.s * 0.72 + 2, ny - rmm * view.s * 0.72 - 2);
    });
    // shaft towards the skin (up)
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = Math.max(2, view.s * 0.45);
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(nx - view.s * 0.6, -10);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = th.highlight;
    ctx.beginPath();
    ctx.arc(nx, ny, Math.max(2.5, view.s * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
  // scale bar
  const bar = 1 * view.s;
  ctx.strokeStyle = th.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w - 14 - bar, h - 12);
  ctx.lineTo(w - 14, h - 12);
  ctx.stroke();
  ctx.fillStyle = th.ink;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('1 mm', w - 14, h - 17);
  if (opts.caption) {
    ctx.textAlign = 'left';
    ctx.fillStyle = th.muted;
    ctx.fillText(opts.caption, 8, h - 8);
  }
  return { view, toMm: (px, py) => ({ x: px / view.s + view.x0, y: py / view.s + view.y0 }) };
}

// Longitudinal view of a few motor units.
// units: [{ uid, color, arrival (ms, null = no impulse), fibers:[{zEp, state, sprout}], label, lost }]
// t: current physiological time (ms); vFiber mm/ms; needleZ optional
export function drawUnitsLongitudinal(ctx, w, h, { units, t = null, vFiber = 4, needleZ = null, lang = 'zh', caption = '' }) {
  const th = theme();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const left = 70;
  const right = w - 16;
  const zMin = -30;
  const zMax = 30;
  const xOf = (z) => left + ((z - zMin) / (zMax - zMin)) * (right - left);
  // interleave fibres of all units (mosaic) vertically
  const rows = [];
  units.forEach((u) => u.fibers.forEach((f, k) => rows.push({ u, f, k })));
  rows.sort((a, b) => (a.k - b.k) * 10 + (a.u.uid - b.u.uid) * 0.01);
  const top = 24;
  const rowH = Math.min(14, (h - top - 30) / Math.max(1, rows.length));
  // muscle background
  ctx.fillStyle = withAlpha(th.muscle, 0.4);
  ctx.fillRect(left, top - 6, right - left, rows.length * rowH + 12);
  ctx.fillStyle = th.muted;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(lang === 'en' ? 'endplate band' : '终板带', xOf(0), top - 9);
  rows.forEach((r, i) => {
    const y = top + i * rowH + rowH / 2;
    const col = r.u.color;
    const lost = r.f.state === F_LOST;
    const den = r.f.state === F_DENERVATED || r.u.lost;
    ctx.strokeStyle = lost ? withAlpha(th.muted, 0.2) : den ? withAlpha(th.muted, 0.45) : withAlpha(col, 0.55);
    ctx.lineWidth = Math.max(2, rowH * 0.45);
    ctx.setLineDash(lost ? [2, 3] : []);
    ctx.beginPath();
    ctx.moveTo(xOf(zMin), y);
    ctx.lineTo(xOf(zMax), y);
    ctx.stroke();
    ctx.setLineDash([]);
    // endplate
    const xe = xOf(r.f.zEp);
    ctx.fillStyle = den || lost ? th.muted : col;
    ctx.beginPath();
    ctx.arc(xe, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // active zone
    if (t !== null && r.u.arrival !== null && !lost && !den) {
      const tt = t - r.u.arrival - (r.f.delay || 0);
      if (tt >= 0) {
        const d = tt * vFiber;
        for (const sgn of [-1, 1]) {
          const front = r.f.zEp + sgn * d;
          if (front < zMin - 6 || front > zMax + 6) continue;
          const back = r.f.zEp + sgn * Math.max(0, d - 3.5);
          ctx.strokeStyle = th.highlight;
          ctx.lineWidth = Math.max(3, rowH * 0.7);
          ctx.beginPath();
          ctx.moveTo(xOf(Math.max(zMin, Math.min(zMax, back))), y);
          ctx.lineTo(xOf(Math.max(zMin, Math.min(zMax, front))), y);
          ctx.stroke();
        }
      }
    }
  });
  // axons from the left to their endplates
  units.forEach((u, ui) => {
    const ys = rows.map((r, i) => (r.u === u ? top + i * rowH + rowH / 2 : null)).filter((v) => v !== null);
    if (!ys.length) return;
    const yA = 10 + ui * 6;
    ctx.strokeStyle = u.lost ? withAlpha(th.muted, 0.4) : u.color;
    ctx.lineWidth = 1.4;
    ctx.setLineDash(u.lost ? [3, 3] : []);
    rows.forEach((r, i) => {
      if (r.u !== u) return;
      const y = top + i * rowH + rowH / 2;
      ctx.beginPath();
      ctx.moveTo(8, yA + top);
      ctx.bezierCurveTo(left * 0.6, yA + top, left * 0.6, y, xOf(r.f.zEp), y - rowH * 0.35);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.fillStyle = u.lost ? th.muted : u.color;
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(u.label || `MU ${u.uid}`, 4, yA + top - 3);
  });
  if (needleZ !== null) {
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xOf(needleZ) - 14, 0);
    ctx.lineTo(xOf(needleZ), top + rows.length * rowH * 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = th.muted;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  if (caption) ctx.fillText(caption, 8, h - 8);
}
