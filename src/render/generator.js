// Macro view of the spontaneous-activity lab: where in the motor unit the generator sits.
// Schematic (not to scale): anterior horn cell → myelinated axon → terminal twigs → NMJs →
// muscle fibres, with the needle. The generator for the chosen type glows when it fires
// (glow timed from the same events that build the trace).

import { theme, withAlpha, unitColor } from './theme.js';

function txt(ctx, s, x, y, color, align = 'left', size = 11, weight = 500) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

export function drawGenerator(ctx, w, h, r, c, t, lang) {
  const th = theme();
  const zh = lang !== 'en';
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const type = c.type;
  // glow from the most recent event(s)
  const lastBySrc = new Map();
  for (const e of r.events) {
    if (e.t > t) break;
    lastBySrc.set(e.src, e);
  }
  const glow = (src, tau = 18) => {
    const e = lastBySrc.get(src);
    return e ? Math.exp(-(t - e.t) / tau) : 0;
  };
  const top = 26;
  const bot = h - (w < 520 ? 70 : 46);
  const yAx = top + (bot - top) * 0.3;
  // spinal cord
  const cordR = Math.min(w * 0.09, (bot - top) * 0.3);
  const cx = 14 + cordR;
  ctx.fillStyle = withAlpha(th.nerve || th.muted, 0.1);
  ctx.strokeStyle = th.muted;
  ctx.beginPath();
  ctx.ellipse(cx, yAx, cordR, cordR * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  txt(ctx, zh ? '脊髓前角' : 'anterior horn', cx, yAx + cordR * 1.15 + 14, th.muted, 'center', 10);
  // motor unit colour
  const uc = type === 'fasc' ? unitColor(r.mu?.uid ?? 0) : th.motor;
  const fascG = type === 'fasc' ? glow(0, 40) : 0;
  // soma
  ctx.fillStyle = withAlpha(uc, 0.35 + 0.65 * fascG);
  ctx.strokeStyle = uc;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx + cordR * 0.3, yAx, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // axon with myelin
  const ax0 = cx + cordR * 0.3 + 9;
  const ax1 = w * 0.55;
  ctx.strokeStyle = uc;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ax0, yAx);
  ctx.lineTo(ax1, yAx);
  ctx.stroke();
  const nSeg = 9;
  const demyelSeg = type === 'fasc' && c.fascPattern === 'myokymic' ? 4 : -1;
  for (let i = 0; i < nSeg; i++) {
    const x0 = ax0 + 10 + ((ax1 - ax0 - 20) * i) / nSeg;
    const x1 = x0 + ((ax1 - ax0 - 20) / nSeg) * 0.82;
    if (i === demyelSeg) {
      ctx.strokeStyle = th.bad;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x0, yAx - 5, x1 - x0, 10);
      ctx.setLineDash([]);
      txt(ctx, zh ? '脱髓鞘节段（异位放电/电突触传递）' : 'demyelinated segment (ectopic / ephaptic)', (x0 + x1) / 2, yAx - 10, th.bad, 'center', 10);
      continue;
    }
    ctx.fillStyle = withAlpha(th.myelin || th.muted, 0.55);
    ctx.fillRect(x0, yAx - 4, x1 - x0, 8);
  }
  txt(ctx, zh ? '运动轴突' : 'motor axon', (ax0 + ax1) / 2, yAx + 20, th.muted, 'center', 10);
  // fibres
  const fx0 = w * 0.6;
  const fx1 = w - 12;
  const nF = 7;
  const fy = (i) => top + 6 + ((bot - top - 12) * i) / (nF - 1);
  const own = new Set([0, 2, 4, 5]); // this unit's fibres (intermingled with others)
  const src = 3; // source fibre for single-fibre generators
  const crdSet = new Set([1, 2, 3, 4].slice(0, Math.min(4, c.crdFibers)));
  const denerv = new Set(type === 'fib' || type === 'psw' ? [src] : type === 'crd' ? [...crdSet] : []);
  const nmjX = (i) => fx0 + (fx1 - fx0) * (0.38 + 0.06 * ((i * 5) % 3));
  // which CRD fibre is active now
  let crdActive = -1;
  if (type === 'crd') {
    const e = [...lastBySrc.values()].sort((a, b) => b.t - a.t)[0];
    if (e && t - e.t < 3) crdActive = e.fiber;
  }
  for (let i = 0; i < nF; i++) {
    const y = fy(i);
    let g = 0;
    if ((type === 'fib' || type === 'psw' || type === 'myotonic') && i === src) g = glow(0);
    if (type === 'endplate' && i === 2) g = glow(0, 10);
    if (type === 'fasc' && own.has(i)) g = fascG;
    if (type === 'crd' && crdSet.has(i)) g = crdActive >= 0 && [...crdSet][crdActive % crdSet.size] === i ? 1 : 0.15;
    const isDen = denerv.has(i);
    ctx.fillStyle = withAlpha(isDen ? th.muted : th.muscle, isDen ? 0.35 : 0.8);
    ctx.strokeStyle = th.muscleDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(fx0, y - 6, fx1 - fx0, 12, 6);
    ctx.fill();
    ctx.stroke();
    if (g > 0.02) {
      ctx.fillStyle = withAlpha(th.highlight, Math.min(0.85, g));
      ctx.beginPath();
      ctx.roundRect(fx0 + 2, y - 4, fx1 - fx0 - 4, 8, 4);
      ctx.fill();
    }
    // NMJ + twig
    const nx = nmjX(i);
    if (own.has(i)) {
      ctx.strokeStyle = uc;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(ax1, yAx);
      ctx.quadraticCurveTo(fx0 - 10, y, nx, y - 7);
      ctx.stroke();
      ctx.fillStyle = uc;
      ctx.beginPath();
      ctx.arc(nx, y - 7, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (isDen) {
      // lost twig: empty endplate
      ctx.strokeStyle = th.muted;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(nx, y - 7, 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // innervated by another unit (twig from below, grey)
      ctx.strokeStyle = withAlpha(th.muted, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nx - 30, bot + 18);
      ctx.quadraticCurveTo(nx - 20, y + 10, nx, y - 7);
      ctx.stroke();
      ctx.fillStyle = withAlpha(th.muted, 0.7);
      ctx.beginPath();
      ctx.arc(nx, y - 7, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // CRD loop arrows (ephaptic, fibre to fibre)
  if (type === 'crd') {
    const ids = [...crdSet];
    ctx.strokeStyle = th.bad;
    ctx.lineWidth = 1.4;
    const xL = fx1 - 26;
    for (let k = 0; k < ids.length; k++) {
      const a = fy(ids[k]);
      const b = fy(ids[(k + 1) % ids.length]);
      ctx.beginPath();
      const xx = k === ids.length - 1 ? xL + 14 : xL;
      ctx.moveTo(xx, a);
      ctx.quadraticCurveTo(xx + (k === ids.length - 1 ? 14 : 8), (a + b) / 2, xx, b);
      ctx.stroke();
    }
    txt(ctx, zh ? '电突触样环路' : 'ephaptic loop', xL - 4, fy(ids[0]) - 10, th.bad, 'right', 10, 600);
  }
  // needle
  const tipFibre = type === 'endplate' ? 2 : type === 'crd' ? 2 : 3;
  const tipX = type === 'endplate' ? nmjX(2) + 4 : fx0 + (fx1 - fx0) * 0.72;
  const tipY = fy(tipFibre) - (type === 'psw' || (type === 'myotonic' && c.myoWave === 'psw') ? 3 : 10);
  ctx.strokeStyle = th.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tipX + 40, 4);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.fillStyle = th.accent;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 3.5, 0, Math.PI * 2);
  ctx.fill();
  txt(ctx, zh ? '针电极' : 'needle', tipX + 44, 14, th.ink, 'left', 10, 600);
  if (type === 'psw' || (type === 'myotonic' && c.myoWave === 'psw')) {
    ctx.fillStyle = withAlpha(th.bad, 0.4);
    ctx.fillRect(tipX - 6, fy(tipFibre) - 6, 12, 12);
    txt(ctx, zh ? '针致膜变形（不可兴奋区）' : 'needle-deformed, inexcitable membrane', tipX, fy(tipFibre) + 22, th.bad, 'center', 10);
  }
  // generator marker
  const mark = (x, y, label) => {
    ctx.strokeStyle = th.bad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.stroke();
    txt(ctx, label, x, y - 15, th.bad, 'center', 10.5, 700);
  };
  if (type === 'fib' || type === 'psw') mark(fx0 + 14, fy(src), zh ? '发生源：去神经肌纤维' : 'generator: denervated fibre');
  else if (type === 'myotonic') mark(fx0 + 14, fy(src), zh ? '发生源：肌膜（离子通道）' : 'generator: muscle membrane');
  else if (type === 'endplate') mark(nmjX(2), fy(2) - 7, c.epKind === 'noise' ? (zh ? 'MEPP：终板' : 'MEPPs: endplate') : zh ? '针刺激末梢支 → 终板' : 'needle irritates twig → endplate');
  else if (type === 'crd') mark(fx0 + 14, fy([...crdSet][0]), zh ? '起搏纤维' : 'pacemaker fibre');
  else if (type === 'fasc') {
    if (c.fascPattern === 'myokymic') mark(ax0 + 10 + ((ax1 - ax0 - 20) * 4.4) / nSeg, yAx, zh ? '脱髓鞘神经段' : 'demyelinated nerve');
    else {
      mark(ax1 - 30, yAx, zh ? '多数起源：远端轴突' : 'most arise: distal axon');
      ctx.strokeStyle = withAlpha(th.bad, 0.5);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(cx + cordR * 0.3, yAx, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      txt(ctx, zh ? '或胞体' : 'or soma', cx + cordR * 0.3, yAx - 18, th.bad, 'center', 10);
    }
  }
  // causal one-liner at the bottom
  const lines = {
    fib: zh ? '去神经 → 静息膜电位不稳 → 单纤维自发 AP → 沿纤维传向针尖 → 起始正相的短小棘波（规则）' : 'denervation → unstable resting membrane → single-fibre AP → travels past the tip → brief spike, initial positive (regular)',
    psw: zh ? '同一自发 AP，到针致变形区停止 → 只记录到正相 + 缓慢回复 = 正锐波' : 'same spontaneous AP stops at the needle-deformed zone → positive phase + slow return = positive sharp wave',
    endplate: zh ? '终板区：MEPP（正常）/ 针刺激末梢支引发的 AP 起始于针下 → 起始负相' : 'endplate: MEPPs (normal) / needle-triggered twig → AP starts under the tip → initial negative',
    myotonic: zh ? '肌膜离子通道异常 → 单纤维反复放电，频率与波幅渐增渐减' : 'membrane channel disorder → single fibre fires repetitively, rate and amplitude wax and wane',
    crd: zh ? '相邻去神经纤维间电突触样传递，环路回到起搏点 → 完全规则重复的多棘复合波' : 'ephaptic spread between adjacent denervated fibres, looping back to the pacemaker → perfectly regular multi-spike complex',
    fasc: zh ? '运动神经元/轴突自发去极化 → 整个运动单位放电 → MUAP 形态，慢而不规则' : 'motor neuron/axon depolarises spontaneously → whole unit fires → MUAP morphology, slow and irregular',
  }[type];
  // wrap the one-liner to the canvas width (up to 3 lines, bottom-aligned)
  ctx.font = '500 11px system-ui, sans-serif';
  const maxW = w - 24;
  const out = [];
  let cur = '';
  const tokens = zh ? [...lines] : lines.split(/(\s+)/);
  for (const tk of tokens) {
    if (ctx.measureText(cur + tk).width > maxW && cur) {
      out.push(cur.trimEnd());
      cur = tk.trimStart();
    } else cur += tk;
  }
  if (cur) out.push(cur);
  out.slice(0, 3).forEach((ln, i, arr) => txt(ctx, ln, 12, h - 14 - (arr.length - 1 - i) * 14, th.ink, 'left', 11, 500));
}
