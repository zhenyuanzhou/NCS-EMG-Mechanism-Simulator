// Oscilloscope-style waveform display.
// Display convention (textbook p.21): NEGATIVE IS UP. Signals are stored physically
// (negative = negative) and flipped here.

import { theme, withAlpha } from './theme.js';
import { DT } from '../synthesis/volume.js';

export function fmtGain(mvPerDiv) {
  if (mvPerDiv >= 1) return `${+mvPerDiv.toFixed(2)} mV/div`;
  return `${Math.round(mvPerDiv * 1000)} µV/div`;
}

// rows: [{ label, gain (mV/div), traces:[{data, color, width, dash, alpha, t0}], markers:[{t,color,label}],
//          spans:[{t0,t1,color,label}], fill:{data,t0,t1,color}, note }]
export function drawScope(ctx, w, h, opts) {
  const th = theme();
  const {
    rows,
    sweep = 3, // ms per division
    divisions = 10,
    t0 = 0,
    cursor = null,
    drawUntil = null,
    title = '',
    footer = '',
    compact = false,
  } = opts;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  const padL = 96;
  const padR = 14;
  const padT = title ? 24 : 10;
  const padB = 24;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const nRows = Math.max(1, rows.length);
  const rowH = plotH / nRows;
  const xOf = (t) => padL + ((t - t0) / (sweep * divisions)) * plotW;
  if (title) {
    ctx.fillStyle = th.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, padL, 15);
  }
  // vertical grid
  for (let i = 0; i <= divisions; i++) {
    const x = padL + (i / divisions) * plotW;
    ctx.strokeStyle = i === 0 || i === divisions ? th.gridMajor : th.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, padT);
    ctx.lineTo(x + 0.5, padT + plotH);
    ctx.stroke();
  }
  rows.forEach((row, ri) => {
    const top = padT + ri * rowH;
    // a row may carry its own time base (e.g. an expanded view of one discharge)
    const own = !!row.sweep;
    const rT0 = own ? row.t0 ?? 0 : t0;
    const rSweep = own ? row.sweep : sweep;
    const xOf = (t) => padL + ((t - rT0) / (rSweep * divisions)) * plotW;
    if (own) {
      ctx.fillStyle = withAlpha(th.highlight, 0.05);
      ctx.fillRect(padL, top, plotW, rowH);
    }
    const vDiv = compact || nRows > 2 ? 4 : 8;
    const divPx = rowH / vDiv;
    const base = top + rowH * (row.baselineFrac ?? (nRows > 2 ? 0.62 : 0.6));
    // horizontal grid for this row
    for (let j = 0; j <= vDiv; j++) {
      const y = top + j * divPx;
      ctx.strokeStyle = j === 0 || j === vDiv ? th.gridMajor : th.grid;
      ctx.beginPath();
      ctx.moveTo(padL, y + 0.5);
      ctx.lineTo(padL + plotW, y + 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = withAlpha(th.muted, 0.35);
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(padL, base + 0.5);
    ctx.lineTo(padL + plotW, base + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    const yOf = (v) => base + (v / row.gain) * divPx; // negative up
    // spans (e.g. negative-peak duration)
    (row.spans || []).forEach((s) => {
      ctx.fillStyle = withAlpha(s.color || th.highlight, s.alpha ?? 0.12);
      const x0 = Math.max(padL, xOf(s.t0));
      const x1 = Math.min(padL + plotW, xOf(s.t1));
      if (x1 > x0) ctx.fillRect(x0, top + 1, x1 - x0, rowH - 2);
    });
    // fill (negative-peak area)
    if (row.fill && row.fill.data) {
      const f = row.fill;
      ctx.save();
      ctx.beginPath();
      ctx.rect(padL, top, plotW, rowH);
      ctx.clip();
      ctx.fillStyle = withAlpha(f.color || th.trace, 0.16);
      ctx.beginPath();
      ctx.moveTo(xOf(f.t0), base);
      const i0 = Math.max(0, Math.floor(f.t0 / DT));
      const i1 = Math.min(f.data.length - 1, Math.ceil(f.t1 / DT));
      for (let i = i0; i <= i1; i++) {
        const v = Math.min(0, f.data[i]);
        ctx.lineTo(xOf(i * DT), yOf(v));
      }
      ctx.lineTo(xOf(f.t1), base);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // traces
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, top, plotW, rowH);
    ctx.clip();
    (row.traces || []).forEach((tr) => {
      if (!tr || !tr.data) return;
      const d = tr.data;
      const tStart = tr.t0 || 0;
      const tLimit = tr.ignoreCursor || own || drawUntil === null ? Infinity : drawUntil;
      ctx.strokeStyle = tr.alpha !== undefined ? withAlpha(tr.color || th.trace, tr.alpha) : tr.color || th.trace;
      ctx.lineWidth = tr.width || 1.6;
      ctx.setLineDash(tr.dash || []);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const tEnd = Math.min(rT0 + rSweep * divisions, tLimit);
      const iA = Math.max(0, Math.floor((rT0 - tStart) / DT));
      const iB = Math.min(d.length - 1, Math.ceil((tEnd - tStart) / DT));
      // decimate to ~2 points per pixel (min/max) for long records
      const ptsPerPx = (iB - iA) / plotW;
      if (ptsPerPx > 3) {
        const step = ptsPerPx / 2;
        let first = true;
        for (let k = iA; k < iB; k += step) {
          const k0 = Math.floor(k);
          const k1 = Math.min(iB, Math.floor(k + step));
          let mn = Infinity;
          let mx = -Infinity;
          for (let q = k0; q <= k1; q++) {
            if (d[q] < mn) mn = d[q];
            if (d[q] > mx) mx = d[q];
          }
          const x = xOf(tStart + k0 * DT);
          if (first) {
            ctx.moveTo(x, yOf(mn));
            first = false;
          } else ctx.lineTo(x, yOf(mn));
          ctx.lineTo(x, yOf(mx));
        }
      } else {
        for (let i = iA; i <= iB; i++) {
          const x = xOf(tStart + i * DT);
          const y = yOf(d[i]);
          if (i === iA) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.restore();
    // markers
    (row.markers || []).forEach((m) => {
      if (m.t === null || m.t === undefined) return;
      const x = xOf(m.t);
      if (x < padL || x > padL + plotW) return;
      ctx.strokeStyle = m.color || th.accent;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (m.y !== undefined) {
        const y = yOf(m.y);
        ctx.moveTo(x, y - 7);
        ctx.lineTo(x, y + 7);
      } else {
        ctx.moveTo(x, top + 3);
        ctx.lineTo(x, top + rowH - 3);
      }
      ctx.stroke();
      if (m.label) {
        ctx.fillStyle = m.color || th.accent;
        ctx.font = '10.5px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.label, x, top + 12 + (m.labelRow || 0) * 11);
      }
    });
    // amplitude bracket (baseline → negative peak)
    if (row.ampBracket) {
      const { t, v } = row.ampBracket;
      const x = xOf(t) + 8;
      if (x > padL && x < padL + plotW) {
        ctx.strokeStyle = th.accent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.lineTo(x, Math.max(top + 2, yOf(v)));
        ctx.moveTo(x - 3, base);
        ctx.lineTo(x + 3, base);
        ctx.moveTo(x - 3, Math.max(top + 2, yOf(v)));
        ctx.lineTo(x + 3, Math.max(top + 2, yOf(v)));
        ctx.stroke();
      }
    }
    // row labels
    ctx.fillStyle = th.ink;
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    const lines = String(row.label || '').split('\n');
    lines.forEach((ln, k) => ctx.fillText(ln, padL - 8, top + 16 + k * 13));
    ctx.fillStyle = th.muted;
    ctx.font = '10.5px system-ui, sans-serif';
    ctx.fillText(fmtGain(row.gain), padL - 8, top + rowH - 8);
    if (own) {
      ctx.fillStyle = th.highlight;
      ctx.fillText(`${+rSweep.toFixed(2)} ms/div`, padL - 8, top + rowH - 21);
    }
    // cursor (only on rows that share the main time base)
    if (!own && cursor !== null && cursor !== undefined) {
      const x = xOf(cursor);
      if (x >= padL && x <= padL + plotW) {
        ctx.strokeStyle = th.highlight;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, top + rowH);
        ctx.stroke();
      }
    }
    if (row.note) {
      ctx.textAlign = 'right';
      ctx.fillStyle = th.muted;
      ctx.fillText(row.note, padL + plotW - 6, top + rowH - 8);
    }
  });
  // time axis labels
  ctx.fillStyle = th.muted;
  ctx.font = '10.5px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i <= divisions; i += divisions >= 10 ? 2 : 1) {
    const t = t0 + i * sweep;
    ctx.fillText(t >= 1000 ? `${(t / 1000).toFixed(1)} s` : `${+t.toFixed(1)}`, padL + (i / divisions) * plotW, padT + plotH + 15);
  }
  ctx.textAlign = 'left';
  ctx.fillText(`${sweep >= 1 ? +sweep.toFixed(1) : sweep} ms/div`, 6, padT + plotH + 15);
  ctx.textAlign = 'right';
  ctx.fillText(footer || 'negative up ↑', w - padR, padT + plotH + 15);
  // cursor
  if (cursor !== null && cursor !== undefined) {
    const x = xOf(cursor);
    if (x >= padL && x <= padL + plotW) {
      ctx.fillStyle = th.highlight;
      ctx.beginPath();
      ctx.moveTo(x - 5, padT);
      ctx.lineTo(x + 5, padT);
      ctx.lineTo(x, padT + 7);
      ctx.fill();
    }
  }
  return { padL, padR, padT, padB, plotW, plotH, rowH, xOf, tOfX: (x) => t0 + ((x - padL) / plotW) * sweep * divisions };
}
