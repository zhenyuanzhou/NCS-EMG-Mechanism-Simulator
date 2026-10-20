// Localization views.
// Macro: schematic cervical roots (with dorsal-root ganglia) → brachial plexus trunks/cords →
// nerves → sampled muscles and SNAP recording sites, plus a small lower-limb strip.
// Meso: the root–muscle map (Table 32.6 marker muscles) with the lesion overlay and findings.
// Schematic, not to scale. Click a muscle or a nerve study to show its waveforms.

import { theme, withAlpha } from './theme.js';
import { ROOTS } from '../physiology/localize.js';

function txt(ctx, s, x, y, color, align = 'left', size = 10.5, weight = 500) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}
function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a);
  const B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
const safeHex = (c, fb) => (/^#[0-9a-f]{6}$/i.test(c) ? c : fb);

export function severityOf(m) {
  let s = m.grade / 4;
  if (m.muap !== 'normal') s = Math.max(s, 0.55);
  if (m.recruit !== 'normal') s = Math.max(s, 0.45);
  return s;
}
const short = (m, zh) => (zh ? m.abZh : m.abEn);

export function drawPlexus(ctx, w, h, r, c, lang) {
  const th = theme();
  const zh = lang !== 'en';
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const bad = safeHex(th.bad, '#b8325a');
  const panel = safeHex(th.panel, '#ffffff');
  const hits = [];
  const upperH = h * 0.72;
  const top = 26;
  const bot = upperH - 50;
  const cordX = 22;
  const rowY = (i) => top + ((bot - top) * i) / (ROOTS.length - 1);
  const drgX = cordX + 58;
  // spinal cord
  ctx.fillStyle = withAlpha(th.muted, 0.12);
  ctx.strokeStyle = th.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cordX, top - 14, 18, bot - top + 28, 8);
  ctx.fill();
  ctx.stroke();
  txt(ctx, zh ? '颈髓' : 'cord', cordX + 9, top - 18, th.muted, 'center', 10);
  const lesion = c.lesion;
  const mndOn = lesion === 'mnd';
  // roots with DRG
  const rootIdx = { C5: 0, C6: 1, C7: 2, C8: 3, T1: 4 };
  ROOTS.forEach((rt, i) => {
    const y = rowY(i);
    ctx.fillStyle = mndOn ? bad : th.motor;
    ctx.beginPath();
    ctx.arc(cordX + 9, y, mndOn ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cordX + 18, y);
    ctx.lineTo(w * 0.27, y);
    ctx.stroke();
    // DRG
    ctx.fillStyle = withAlpha(th.sensory, 0.35);
    ctx.strokeStyle = th.sensory;
    ctx.beginPath();
    ctx.ellipse(drgX, y - 5, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    txt(ctx, rt, cordX - 2, y + 4, th.ink, 'right', 10.5, 700);
  });
  txt(ctx, 'DRG', drgX, top - 16, th.sensory, 'center', 10, 700);
  // paraspinals via dorsal rami of C7, C8
  const psX = drgX + 30;
  const psY = bot + 30;
  ctx.strokeStyle = th.muted;
  ctx.lineWidth = 1;
  [2, 3].forEach((i) => {
    ctx.beginPath();
    ctx.moveTo(drgX + 16, rowY(i));
    ctx.lineTo(psX, psY - 8);
    ctx.stroke();
  });
  // trunks & cords
  const tx = w * 0.27;
  const cx = w * 0.4;
  const trunkY = { upper: (rowY(0) + rowY(1)) / 2, middle: rowY(2), lower: (rowY(3) + rowY(4)) / 2 };
  ctx.strokeStyle = th.ink;
  ctx.lineWidth = 2;
  [
    [0, 'upper'],
    [1, 'upper'],
    [2, 'middle'],
    [3, 'lower'],
    [4, 'lower'],
  ].forEach(([i, t]) => {
    ctx.beginPath();
    ctx.moveTo(tx, rowY(i));
    ctx.lineTo(tx + 26, trunkY[t]);
    ctx.stroke();
  });
  const cordY = { lateral: rowY(0) + 6, posterior: rowY(2), medial: rowY(4) - 6 };
  const links = [
    ['upper', 'lateral'],
    ['middle', 'lateral'],
    ['upper', 'posterior'],
    ['middle', 'posterior'],
    ['lower', 'posterior'],
    ['lower', 'medial'],
  ];
  links.forEach(([t, cd]) => {
    ctx.beginPath();
    ctx.moveTo(tx + 26, trunkY[t]);
    ctx.lineTo(cx, cordY[cd]);
    ctx.stroke();
  });
  txt(ctx, zh ? '干' : 'trunks', tx + 13, top - 16, th.muted, 'center', 10);
  txt(ctx, zh ? '束' : 'cords', cx, top - 16, th.muted, 'center', 10);
  // nerve lanes
  const lx0 = w * 0.5;
  const lx1 = w - 16;
  const laneY = {
    axillary: top - 6,
    musculocutaneous: top + (bot - top) * 0.15,
    radial: top + (bot - top) * 0.34,
    median: top + (bot - top) * 0.57,
    ulnar: top + (bot - top) * 0.8,
    mabc: bot + 14,
  };
  const laneCord = { axillary: ['posterior'], musculocutaneous: ['lateral'], radial: ['posterior'], median: ['lateral', 'medial'], ulnar: ['medial'], mabc: ['medial'] };
  const laneName = { axillary: zh ? '腋' : 'axillary', musculocutaneous: zh ? '肌皮' : 'musculocut.', radial: zh ? '桡' : 'radial', median: zh ? '正中' : 'median', ulnar: zh ? '尺' : 'ulnar', mabc: 'MABC' };
  ctx.lineWidth = 1.6;
  for (const [ln, ys] of Object.entries(laneY)) {
    ctx.strokeStyle = th.ink;
    laneCord[ln].forEach((cd) => {
      ctx.beginPath();
      ctx.moveTo(cx, cordY[cd]);
      ctx.lineTo(lx0, ys);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(lx0, ys);
    ctx.lineTo(ln === 'mabc' ? lx0 + (lx1 - lx0) * 0.45 : lx1 - 40, ys);
    ctx.stroke();
    txt(ctx, laneName[ln], lx0 - 4, ys - 4, th.muted, 'right', 9.5, 600);
  }
  const xOfLen = (L) => lx0 + 30 + ((lx1 - lx0 - 90) * (L - 200)) / 600;
  const laneOf = (m) => (m.nerve.startsWith('axillary') ? 'axillary' : m.nerve.startsWith('musculo') ? 'musculocutaneous' : m.nerve.startsWith('radial') ? 'radial' : m.nerve.startsWith('median') ? 'median' : m.nerve.startsWith('ulnar') ? 'ulnar' : null);
  // lesion overlays
  ctx.save();
  ctx.strokeStyle = bad;
  ctx.fillStyle = withAlpha(bad, 0.25);
  ctx.lineWidth = 2;
  const band = (x, y, ww, hh, label, la = 'center') => {
    ctx.fillRect(x - ww / 2, y - hh / 2, ww, hh);
    ctx.strokeRect(x - ww / 2, y - hh / 2, ww, hh);
    if (label) txt(ctx, label, la === 'left' ? x + ww / 2 + 4 : x, la === 'left' ? y + 4 : y - hh / 2 - 4, bad, la, 10, 700);
  };
  if (lesion === 'c7' || lesion === 'c8') band(cordX + 32, rowY(rootIdx[lesion === 'c7' ? 'C7' : 'C8']), 14, 14, zh ? '节前病灶' : 'preganglionic', 'center');
  if (lesion === 'lowerTrunk') band(tx + 13, trunkY.lower, 18, 22, zh ? '下干' : 'lower trunk', 'center');
  const wristX = lx0 + 40 + (lx1 - 160 - lx0) * 0.72;
  if (lesion === 'medianWrist') band(wristX, laneY.median, 10, 16, zh ? '腕' : 'wrist', 'center');
  if (lesion === 'ulnarElbow') band(lx0 + 18, laneY.ulnar, 10, 16, zh ? '肘' : 'elbow', 'center');
  if (lesion === 'lengthDep') {
    const g = ctx.createLinearGradient(xOfLen(400), 0, lx1, 0);
    g.addColorStop(0, withAlpha(bad, 0));
    g.addColorStop(1, withAlpha(bad, 0.22));
    ctx.fillStyle = g;
    ctx.fillRect(xOfLen(400), top - 14, lx1 - xOfLen(400), bot - top + 40);
    txt(ctx, zh ? '远端轴突逆死（长度依赖）' : 'distal dying-back (length-dependent)', lx1 - 4, top - 16, bad, 'right', 10, 700);
  }
  if (mndOn) txt(ctx, zh ? '前角细胞丢失' : 'anterior horn cell loss', cordX + 22, top - 18, bad, 'left', 10, 700);
  ctx.restore();
  // muscles
  const nodeR = 13;
  const drawNode = (x, y, label, sev, sub, selected, id, shape = 'rect') => {
    const fill = mix(panel, bad, Math.min(1, sev) * 0.8);
    ctx.fillStyle = fill;
    ctx.strokeStyle = selected ? th.highlight : sev > 0.02 ? bad : th.muted;
    ctx.lineWidth = selected ? 3 : 1.2;
    ctx.beginPath();
    if (shape === 'diamond') {
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x + 9, y);
      ctx.lineTo(x, y + 9);
      ctx.lineTo(x - 9, y);
      ctx.closePath();
    } else ctx.roundRect(x - 8, y - 8, 16, 16, 4);
    ctx.fill();
    ctx.stroke();
    txt(ctx, label, x, y - 12, th.ink, 'center', 9.5, 600);
    if (sub) txt(ctx, sub, x, y + 19, sev > 0.02 ? bad : th.muted, 'center', 9, 500);
    hits.push({ x, y, r: nodeR, id, kind: 'sel' });
  };
  const bySel = c.sel;
  // muscles evenly spaced along each nerve, proximal → distal (order from path length)
  const xA = lx0 + 40;
  const xB = lx1 - 120;
  const byLane = new Map();
  for (const m of r.muscles) {
    if (m.lower || m.paraspinal) continue;
    const ln = laneOf(m);
    if (!byLane.has(ln)) byLane.set(ln, []);
    byLane.get(ln).push(m);
  }
  const muscleX = new Map();
  for (const [ln, list] of byLane) {
    list.sort((a, b) => a.lenMm - b.lenMm);
    list.forEach((m, k) => {
      // a lone proximal muscle sits near the start; distal hand muscles near the end
      const u = list.length === 1 ? Math.min(0.85, Math.max(0.1, (m.lenMm - 200) / 600)) : 0.1 + (0.8 * (k + (m.lenMm > 700 ? 1 : 0))) / Math.max(1, list.length);
      const x = xA + (xB - xA) * Math.min(1, u);
      muscleX.set(m.id, x);
      drawNode(x, laneY[ln], short(m, zh), severityOf(m), findingCompact(m, zh), bySel === m.id, m.id);
    });
  }
  // paraspinal node
  const ps = r.muscles.find((m) => m.paraspinal);
  drawNode(psX, psY, zh ? '椎旁肌' : 'paraspinals', severityOf(ps), findingCompact(ps, zh), bySel === ps.id, ps.id);
  // SNAP / CMAP nodes
  const nerveNode = (id, x, y, label) => {
    const n = r.nerves.find((q) => q.id === id);
    const sev = n.pct >= 99 ? 0 : Math.min(1, (100 - n.pct) / 70);
    drawNode(x, y, label, sev, `${n.pct.toFixed(0)}%`, bySel === id, id, 'diamond');
  };
  nerveNode('medSen', lx1 - 22, laneY.median - 14, zh ? 'SNAP 示指' : 'SNAP index');
  nerveNode('ulnSen', lx1 - 22, laneY.ulnar - 14, zh ? 'SNAP 小指' : 'SNAP 5th');
  nerveNode('radSen', lx1 - 22, laneY.radial - 14, zh ? 'SNAP 桡浅' : 'SNAP radial');
  nerveNode('mabc', lx0 + (lx1 - lx0) * 0.45 + 12, laneY.mabc, 'SNAP MABC');
  // CMAP labels near APB/ADM
  nerveNode('medMot', muscleX.get('apb') + 46, laneY.median, 'CMAP');
  nerveNode('ulnMot', muscleX.get('adm') + 46, laneY.ulnar, 'CMAP');
  // lower-limb strip
  const ly = upperH + 22;
  const lh = h - ly - 16;
  ctx.strokeStyle = th.faint;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(8, upperH);
  ctx.lineTo(w - 8, upperH);
  ctx.stroke();
  ctx.setLineDash([]);
  txt(ctx, zh ? '下肢（长度依赖对照）' : 'Lower limb (length-dependence reference)', 10, upperH + 14, th.muted, 'left', 10, 600);
  ctx.fillStyle = withAlpha(th.muted, 0.12);
  ctx.strokeStyle = th.muted;
  ctx.beginPath();
  ctx.roundRect(cordX, ly + 4, 40, lh - 8, 6);
  ctx.fill();
  ctx.stroke();
  txt(ctx, 'L5–S1', cordX + 20, ly + lh / 2 + 4, th.ink, 'center', 10, 700);
  if (mndOn) {
    ctx.fillStyle = bad;
    ctx.beginPath();
    ctx.arc(cordX + 20, ly + 12, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const sy = ly + lh * 0.5;
  ctx.strokeStyle = th.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cordX + 40, sy);
  ctx.lineTo(w * 0.35, sy);
  ctx.lineTo(w - 30, ly + 6);
  ctx.moveTo(w * 0.35, sy);
  ctx.lineTo(w - 30, ly + lh - 4);
  ctx.stroke();
  txt(ctx, zh ? '坐骨' : 'sciatic', w * 0.25, sy - 5, th.muted, 'center', 9.5, 600);
  if (lesion === 'lengthDep') {
    const g = ctx.createLinearGradient(w * 0.45, 0, w - 10, 0);
    g.addColorStop(0, withAlpha(bad, 0));
    g.addColorStop(1, withAlpha(bad, 0.28));
    ctx.fillStyle = g;
    ctx.fillRect(w * 0.45, ly, w * 0.55 - 10, lh);
  }
  const ta = r.muscles.find((m) => m.id === 'ta');
  const mg = r.muscles.find((m) => m.id === 'mg');
  const lerp = (a, b, t) => a + (b - a) * t;
  const upY = (t) => lerp(sy, ly + 6, (t - 0.35) / 0.65);
  const dnY = (t) => lerp(sy, ly + lh - 4, (t - 0.35) / 0.65);
  drawNode(w * 0.62, upY(0.62), short(ta, zh), severityOf(ta), findingCompact(ta, zh), bySel === 'ta', 'ta');
  drawNode(w * 0.55, dnY(0.55), short(mg, zh), severityOf(mg), findingCompact(mg, zh), bySel === 'mg', 'mg');
  nerveNode('perMot', w * 0.86, upY(0.86), zh ? 'CMAP 腓总' : 'CMAP peroneal');
  nerveNode('sural', w * 0.86, dnY(0.86), 'SNAP sural');
  return {
    hits,
    legend: zh
      ? '宏观：节前（DRG 与脊髓之间）病灶不损伤 DRG 细胞及其远端感觉轴突 → SNAP 保留。方块 = 针极取样肌肉，菱形 = 神经传导；颜色越红越异常（模型）。点击查看波形。示意图，不按比例。'
      : 'Macro: a preganglionic lesion (between DRG and cord) spares the DRG cells and their distal sensory axons → SNAPs preserved. Squares = needle-sampled muscles, diamonds = nerve conduction studies; redder = more abnormal (model). Click to see waveforms. Schematic, not to scale.',
  };
}

export function findingCompact(m, zh) {
  if (m.grade) return `fib ${m.grade}+${m.fasc ? (zh ? ' 束颤' : ' fasc') : ''}`;
  if (m.muap === 'myopathic') return zh ? '小MUAP' : 'small';
  if (m.muap !== 'normal') return zh ? 'MUAP异常' : 'MUAP abn';
  if (m.recruit === 'reduced') return zh ? '募集↓' : 'recr↓';
  if (m.recruit === 'early') return zh ? '早募集' : 'early';
  if (m.fasc) return zh ? '束颤' : 'fasc';
  return zh ? '正常' : 'normal';
}

export function findingShort(m, zh) {
  const parts = [];
  if (m.grade) parts.push(`fib ${m.grade}+`);
  if (m.fasc) parts.push(zh ? '束颤' : 'fasc');
  if (m.muap === 'reinnervated') parts.push(zh ? '大MUAP' : 'large');
  else if (m.muap === 'unstable') parts.push(zh ? '不稳' : 'unstable');
  else if (m.muap === 'myopathic') parts.push(zh ? '小MUAP' : 'small');
  if (m.recruit === 'reduced') parts.push(zh ? '募集↓' : 'recr↓');
  else if (m.recruit === 'early') parts.push(zh ? '早募集' : 'early');
  return parts.join(' ') || (zh ? '正常' : 'normal');
}

export function drawRootGrid(ctx, w, h, r, c, lang) {
  const th = theme();
  const zh = lang !== 'en';
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const bad = safeHex(th.bad, '#b8325a');
  const panel = safeHex(th.panel, '#ffffff');
  const hits = [];
  const narrow = w < 640;
  const gridW = narrow ? w : w * 0.64;
  const rows = r.muscles;
  const top = 34;
  const rowH = Math.min(24, (h - top - 8) / rows.length);
  const nameW = gridW * 0.36;
  const rootW = (gridW * 0.3) / ROOTS.length;
  const findX = nameW + rootW * ROOTS.length + 6;
  txt(ctx, zh ? '肌肉（神经）' : 'Muscle (nerve)', 8, 16, th.muted, 'left', 10, 700);
  ROOTS.forEach((rt, i) => txt(ctx, rt, nameW + rootW * (i + 0.5), 16, th.ink, 'center', 10, 700));
  txt(ctx, zh ? '模型所见' : 'Model findings', findX, 16, th.muted, 'left', 10, 700);
  txt(ctx, zh ? '● 主要  · 次要（表 32.6）' : '● marker  · less often (Table 32.6)', nameW, 29, th.muted, 'left', 9, 500);
  const lesRoot = c.lesion === 'c7' ? 'C7' : c.lesion === 'c8' ? 'C8' : null;
  const lesRoots = c.lesion === 'lowerTrunk' ? ['C8', 'T1'] : lesRoot ? [lesRoot] : [];
  lesRoots.forEach((rt) => {
    const i = ROOTS.indexOf(rt);
    ctx.fillStyle = withAlpha(bad, 0.1);
    ctx.fillRect(nameW + rootW * i, top - 2, rootW, rowH * rows.length);
  });
  rows.forEach((m, k) => {
    const y = top + k * rowH;
    if (c.sel === m.id) {
      ctx.fillStyle = withAlpha(th.highlight, 0.18);
      ctx.fillRect(2, y - 1, gridW - 4, rowH);
    }
    const sev = severityOf(m);
    ctx.fillStyle = mix(panel, bad, sev * 0.55);
    ctx.fillRect(findX - 4, y + 1, gridW - findX, rowH - 3);
    const nm = `${zh ? m.zh.replace(/（.*?）/, '') : m.en.replace(/ \(.*\)/, '')}`;
    txt(ctx, nm, 8, y + rowH * 0.62, th.ink, 'left', narrow ? 9.5 : 10.5, 600);
    txt(ctx, zh ? m.nerveZh : m.nerve, nameW - 6, y + rowH * 0.62, th.muted, 'right', 9, 500);
    ROOTS.forEach((rt, i) => {
      const g = m.roots[rt];
      if (!g) return;
      ctx.fillStyle = lesRoots.includes(rt) ? bad : th.ink;
      ctx.beginPath();
      ctx.arc(nameW + rootW * (i + 0.5), y + rowH / 2, g === 'G' ? 4.5 : 2, 0, Math.PI * 2);
      ctx.fill();
    });
    if (m.lower) txt(ctx, zh ? '下肢' : 'lower limb', nameW + rootW * 2.5, y + rowH * 0.62, th.muted, 'center', 9, 500);
    txt(ctx, findingShort(m, zh), findX, y + rowH * 0.62, sev > 0.02 ? bad : th.muted, 'left', 10, 600);
    for (let x = 10; x < gridW - 6; x += 18) hits.push({ x, y: y + rowH / 2, r: Math.min(10, rowH / 2), id: m.id, kind: 'sel' });
  });
  // nerve studies list
  const x0 = narrow ? 8 : gridW + 14;
  const y0 = narrow ? top + rows.length * rowH + 16 : top;
  if (!narrow || h - y0 > 60) {
    txt(ctx, zh ? '神经传导（波幅 % 正常）' : 'Nerve conduction (amplitude % normal)', x0, narrow ? y0 - 4 : 16, th.muted, 'left', 10, 700);
    const nH = Math.min(26, (h - y0 - 8) / r.nerves.length);
    r.nerves.forEach((n, k) => {
      const y = y0 + k * nH;
      if (c.sel === n.id) {
        ctx.fillStyle = withAlpha(th.highlight, 0.18);
        ctx.fillRect(x0 - 4, y - 1, w - x0 - 4, nH);
      }
      const sev = n.pct >= 99 ? 0 : Math.min(1, (100 - n.pct) / 70);
      const bw = (w - x0 - 60) * Math.min(1.2, n.pct / 100);
      ctx.fillStyle = mix(panel, bad, sev * 0.7);
      ctx.fillRect(x0, y + nH * 0.55, Math.max(2, bw), nH * 0.32);
      txt(ctx, zh ? n.zh : n.en, x0, y + nH * 0.45, th.ink, 'left', 9.5, 600);
      txt(ctx, `${n.pct.toFixed(0)}%`, w - 10, y + nH * 0.8, sev > 0.05 ? bad : th.muted, 'right', 10, 700);
      for (let x = x0 + 8; x < w - 8; x += 18) hits.push({ x, y: y + nH / 2, r: Math.min(10, nH / 2), id: n.id, kind: 'sel' });
    });
  }
  return {
    hits,
    legend: zh
      ? '中观：神经根–肌肉图（表 32.6，p.564）。病变根所在列加红。按模式判读：同一肌节、跨多条周围神经 → 根或丛；只限一条神经 → 单神经病；远端重于近端 → 长度依赖。点击行查看波形。'
      : 'Meso: root–muscle map (Table 32.6, p.564). The lesioned root column is shaded. Read the pattern: one myotome across several peripheral nerves → root or plexus; one nerve only → mononeuropathy; distal worse than proximal → length-dependent. Click a row for waveforms.',
  };
}
