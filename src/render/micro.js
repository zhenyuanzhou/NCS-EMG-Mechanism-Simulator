// Micro-scale views: one muscle fibre with a travelling action potential and the recording
// electrode; a myelinated axon with nodes (saltatory conduction, demyelinated internodes);
// a neuromuscular junction with quanta, receptors and the endplate potential vs threshold.

import { theme, withAlpha } from './theme.js';
import { rosenfalck } from '../synthesis/volume.js';

function txt(ctx, s, x, y, color, align = 'center', size = 11, weight = 500) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

// fibre: { halfLen mm, v mm/ms, s mm }, electrodes: [{z0, r, label, color}], t ms,
// blockAt (mm) optional – crushed zone (positive sharp wave demonstration)
export function drawFiberElectrode(ctx, w, h, { fiber, electrodes, t, lang = 'zh', blockAt = null, showCurrents = true, title = '' }) {
  const th = theme();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const L = fiber.halfLen;
  const span = L + 20;
  const left = 30;
  const right = w - 30;
  const xOf = (z) => left + ((z + span) / (2 * span)) * (right - left);
  const yF = h * 0.62;
  const fibH = 16;
  // extracellular tissue + fibre
  ctx.fillStyle = withAlpha(th.muscle, 0.25);
  ctx.fillRect(0, yF - h * 0.45, w, h * 0.65);
  ctx.fillStyle = th.muscle;
  ctx.strokeStyle = th.muscleDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(xOf(-L), yF - fibH / 2, xOf(L) - xOf(-L), fibH, 8);
  ctx.fill();
  ctx.stroke();
  // tendons
  ctx.fillStyle = th.bone;
  ctx.fillRect(xOf(-L) - 22, yF - 5, 20, 10);
  ctx.fillRect(xOf(L) + 2, yF - 5, 20, 10);
  txt(ctx, lang === 'en' ? 'tendon' : '肌腱', xOf(L) + 12, yF + 22, th.muted, 'center', 10);
  // endplate
  ctx.fillStyle = th.motor;
  ctx.beginPath();
  ctx.arc(xOf(0), yF - fibH / 2 - 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = th.motor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(xOf(0), yF - fibH / 2 - 6);
  ctx.lineTo(xOf(0) - 18, yF - h * 0.38);
  ctx.stroke();
  txt(ctx, lang === 'en' ? 'endplate (motor point)' : '终板（运动点）', xOf(0) - 20, yF - h * 0.39 - 4, th.motor, 'center', 10);
  // depolarised zone & membrane currents at time t
  if (t !== null && t >= 0) {
    const front = fiber.v * t;
    const grid = [];
    const h2 = 0.25;
    for (let z = -L; z <= L; z += h2) {
      let zz = (front - Math.abs(z)) / fiber.s;
      if (blockAt !== null && z > blockAt) zz = -1;
      grid.push([z, zz > 0 && front - Math.abs(z) >= 0 && front <= L + 30 ? rosenfalck(zz) : 0]);
    }
    let maxV = 1;
    grid.forEach(([, v]) => (maxV = Math.max(maxV, v)));
    for (let i = 1; i < grid.length - 1; i++) {
      const [z, v] = grid[i];
      if (v <= 0.5) continue;
      ctx.fillStyle = withAlpha(th.highlight, Math.min(0.9, (v / maxV) * 0.9));
      ctx.fillRect(xOf(z), yF - fibH / 2 + 2, Math.max(1, xOf(z + h2) - xOf(z)), fibH - 4);
    }
    if (showCurrents) {
      // second difference → sources (+) and sinks (−)
      for (let i = 4; i < grid.length - 4; i += 4) {
        const im = grid[i - 4][1] - 2 * grid[i][1] + grid[i + 4][1];
        if (Math.abs(im) < maxV * 0.05) continue;
        const x = xOf(grid[i][0]);
        const sink = im < 0;
        ctx.strokeStyle = sink ? th.bad : th.sensory;
        ctx.fillStyle = sink ? th.bad : th.sensory;
        ctx.lineWidth = 1.2;
        const y1 = yF - fibH / 2 - 2;
        const y2 = y1 - 12 * Math.min(1, Math.abs(im) / (maxV * 0.3));
        ctx.beginPath();
        if (sink) {
          ctx.moveTo(x, y2);
          ctx.lineTo(x, y1);
          ctx.moveTo(x - 3, y1 - 4);
          ctx.lineTo(x, y1);
          ctx.lineTo(x + 3, y1 - 4);
        } else {
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y2);
          ctx.moveTo(x - 3, y2 + 4);
          ctx.lineTo(x, y2);
          ctx.lineTo(x + 3, y2 + 4);
        }
        ctx.stroke();
      }
      txt(ctx, lang === 'en' ? '↓ sink (inward, −)   ↑ source (outward, +)' : '↓ 电流汇（内向，−）  ↑ 电流源（外向，+）', 8, h - 8, th.muted, 'left', 10);
    }
  }
  if (blockAt !== null) {
    ctx.strokeStyle = th.lesion;
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(xOf(blockAt), yF - fibH);
    ctx.lineTo(xOf(blockAt), yF + fibH);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // electrodes
  electrodes.forEach((e) => {
    const x = xOf(e.z0);
    const yTip = yF - fibH / 2 - Math.min(h * 0.4, 8 + e.r * 9);
    ctx.strokeStyle = e.color || th.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.lineTo(x, yTip);
    ctx.stroke();
    ctx.fillStyle = e.color || th.ink;
    ctx.beginPath();
    ctx.arc(x, yTip, 4, 0, Math.PI * 2);
    ctx.fill();
    txt(ctx, e.label, x + 8, 16, e.color || th.ink, 'left', 11, 700);
  });
  if (title) txt(ctx, title, w / 2, h - 24, th.ink, 'center', 11, 600);
  return { xOf };
}

// Myelinated axon: internodes with nodes, impulse position (mm), demyelinated range, block.
export function drawMyelinatedAxon(ctx, w, h, { pos = null, demyel = null, block = false, lang = 'zh', nodes = 14, title = '' }) {
  const th = theme();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const left = 20;
  const right = w - 20;
  const y = h * 0.45;
  const step = (right - left) / nodes;
  for (let i = 0; i < nodes; i++) {
    const x0 = left + i * step + 3;
    const x1 = left + (i + 1) * step - 3;
    const inDemy = demyel && i >= demyel[0] && i < demyel[1];
    ctx.fillStyle = inDemy ? withAlpha(th.myelin, 0.35) : th.myelin;
    ctx.strokeStyle = inDemy ? withAlpha(th.warn, 0.8) : th.faint;
    ctx.setLineDash(inDemy ? [3, 2] : []);
    ctx.beginPath();
    ctx.roundRect(x0, y - 12, x1 - x0, 24, 10);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = th.motor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left - 10, y);
  ctx.lineTo(right + 10, y);
  ctx.stroke();
  for (let i = 0; i <= nodes; i++) {
    const x = left + i * step;
    const active = pos !== null && Math.abs(pos - i) < 0.5;
    ctx.fillStyle = active ? th.highlight : th.motor;
    ctx.beginPath();
    ctx.arc(x, y, active ? 6 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (demyel) {
    txt(ctx, block ? (lang === 'en' ? 'conduction failure' : '传导失败') : lang === 'en' ? 'slowed internodal conduction' : '结间传导减慢', left + ((demyel[0] + demyel[1]) / 2) * step, y + 34, th.warn, 'center', 10.5, 600);
  }
  txt(ctx, lang === 'en' ? 'nodes of Ranvier · saltatory conduction' : '郎飞结 · 跳跃式传导', w / 2, h - 10, th.muted, 'center', 10);
  if (title) txt(ctx, title, 10, 16, th.ink, 'left', 11, 600);
}

// Neuromuscular junction: quanta released, EPP vs threshold.
export function drawNMJ(ctx, w, h, { quanta = 1000, released = 200, epp = 40, threshold = 15, fired = true, lang = 'zh', label = '', receptor = 1, extra = '' }) {
  const th = theme();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const cx = w * 0.35;
  // terminal
  ctx.fillStyle = withAlpha(th.motor, 0.15);
  ctx.strokeStyle = th.motor;
  ctx.beginPath();
  ctx.ellipse(cx, h * 0.3, w * 0.22, h * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const nShow = Math.round(Math.min(60, quanta / 18));
  for (let i = 0; i < nShow; i++) {
    const a = (i * 2.399) % (Math.PI * 2);
    const r = Math.sqrt((i + 0.5) / nShow) * w * 0.18;
    ctx.fillStyle = th.motor;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, h * 0.3 + Math.sin(a) * r * 0.75, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }
  const nRel = Math.round(Math.min(30, released / 8));
  for (let i = 0; i < nRel; i++) {
    ctx.fillStyle = withAlpha(th.motor, 0.6);
    ctx.beginPath();
    ctx.arc(cx - w * 0.18 + (i / Math.max(1, nRel - 1)) * w * 0.36, h * 0.53, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // postsynaptic membrane with folds
  ctx.strokeStyle = th.muscleDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const x = cx - w * 0.25 + (i / 12) * w * 0.5;
    ctx.lineTo(x, h * 0.6 + (i % 2 ? 9 : 0));
  }
  ctx.stroke();
  // ACh receptors on the fold crests (fewer in postsynaptic disease)
  const nR = Math.round(24 * Math.max(0, Math.min(1, receptor)));
  for (let i = 0; i < nR; i++) {
    const x = cx - w * 0.24 + ((i + 0.5) / 24) * w * 0.48 + ((i * 7) % 3) * 0.5;
    ctx.fillStyle = th.muscleDark;
    ctx.fillRect(x - 1.5, h * 0.6 - 5 + ((Math.floor(((x - (cx - w * 0.25)) / (w * 0.5)) * 12) % 2) ? 9 : 0), 3, 4);
  }
  txt(ctx, lang === 'en' ? 'presynaptic terminal (quanta)' : '突触前末梢（ACh 量子）', cx, h * 0.08, th.motor, 'center', 10.5);
  txt(ctx, lang === 'en' ? 'postsynaptic membrane (AChR)' : '突触后膜（ACh 受体）', cx, h * 0.75, th.muscleDark, 'center', 10.5);
  // EPP bar
  const bx = w * 0.78;
  const by = h * 0.85;
  const scale = (h * 0.7) / 60;
  ctx.fillStyle = fired ? withAlpha(th.good, 0.7) : withAlpha(th.bad, 0.7);
  ctx.fillRect(bx - 14, by - epp * scale, 28, epp * scale);
  ctx.strokeStyle = th.ink;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(bx - 30, by - threshold * scale);
  ctx.lineTo(bx + 30, by - threshold * scale);
  ctx.stroke();
  ctx.setLineDash([]);
  txt(ctx, `EPP ${epp.toFixed(0)} mV`, bx, by - epp * scale - 6, th.ink, 'center', 10.5, 600);
  txt(ctx, lang === 'en' ? 'threshold' : '阈值', bx + 32, by - threshold * scale + 4, th.muted, 'left', 10);
  txt(ctx, fired ? (lang === 'en' ? 'fibre fires' : '肌纤维兴奋') : lang === 'en' ? 'transmission fails' : '传递失败', bx, by + 14, fired ? th.good : th.bad, 'center', 10.5, 700);
  if (label) txt(ctx, label, 8, 14, th.ink, 'left', 11, 600);
  if (extra) {
    const lines = String(extra).split('\n');
    lines.forEach((ln, i) => txt(ctx, ln, 8, h - 8 - (lines.length - 1 - i) * 13, th.muted, 'left', 10.5, 500));
  }
}
