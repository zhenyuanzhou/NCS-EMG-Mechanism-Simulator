// Macro-scale schematic: spinal cord, DRG, roots, plexus, limb nerve, muscle, digit,
// stimulation/recording sites, lesion, and travelling impulses of representative axons.
// Positions come from the same millimetre coordinates used by the physiology layer.

import { theme, withAlpha, unitColor } from './theme.js';
import { POS, LESION_SITES } from '../physiology/nerve.js';

// fraction along the drawing for a limb position (mm); trunk from cord (left) to wrist
const TRUNK = [
  [POS.CORD, 0.115],
  [POS.DRG, 0.175],
  [POS.ERB, 0.29],
  [POS.AXILLA, 0.42],
  [POS.ELBOW, 0.6],
  [POS.WRIST, 0.79],
];

function trunkFrac(pos) {
  if (pos >= TRUNK[0][0]) return TRUNK[0][1];
  for (let i = 0; i < TRUNK.length - 1; i++) {
    const [p0, f0] = TRUNK[i];
    const [p1, f1] = TRUNK[i + 1];
    if (pos <= p0 && pos >= p1) return f0 + ((p0 - pos) / (p0 - p1)) * (f1 - f0);
  }
  return TRUNK[TRUNK.length - 1][1];
}

export function geometry(w, h) {
  const y0 = h * 0.43;
  const g = {
    w,
    h,
    y0,
    cord: { x: w * 0.065, y: y0, r: Math.min(w * 0.045, h * 0.16) },
    muscle: { x: w * 0.885, y: h * 0.72, rx: w * 0.05, ry: h * 0.1 },
    digit: { x0: w * 0.88, x1: w * 0.985, y: h * 0.27 },
  };
  // map a limb position to canvas point for 'motor' or 'sensory' branches
  g.point = (pos, kind = 'motor', lane = 0) => {
    const laneOff = lane * 2.2;
    if (pos >= POS.WRIST) {
      const f = trunkFrac(pos);
      // proximal of DRG the sensory and motor paths separate (dorsal vs ventral roots)
      if (pos > POS.DRG - 1) {
        const rootSplit = (pos - (POS.DRG - 1)) / (POS.CORD - POS.DRG + 1);
        const dy = kind === 'sensory' ? -h * 0.1 * Math.min(1, rootSplit * 1.6) : h * 0.08 * Math.min(1, rootSplit * 1.6);
        return { x: w * f, y: y0 + dy + laneOff };
      }
      // gentle arm curvature
      const curve = Math.sin(((f - 0.175) / 0.62) * Math.PI) * h * 0.035;
      return { x: w * f, y: y0 + curve + laneOff };
    }
    const wristX = w * 0.79;
    const wristY = y0 + Math.sin(((0.79 - 0.175) / 0.62) * Math.PI) * h * 0.035;
    if (kind === 'motor') {
      const t = Math.min(1, (POS.WRIST - pos) / (POS.WRIST - POS.MOTOR_POINT));
      return { x: wristX + (g.muscle.x - wristX) * t, y: wristY + laneOff + (g.muscle.y - g.muscle.ry * 0.2 - wristY) * t };
    }
    const span = POS.WRIST - POS.RING_G2;
    const t = Math.min(1.05, (POS.WRIST - pos) / span);
    return { x: wristX + (g.digit.x1 - 4 - wristX) * t, y: wristY + laneOff + (g.digit.y - wristY) * Math.min(1, t * 1.25) };
  };
  return g;
}

function label(ctx, txt, x, y, color, align = 'center', size = 11, weight = 500) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(txt, x, y);
}

function polyline(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
}

function pathPoints(g, from, to, kind, lane, step = 6) {
  const pts = [];
  const n = Math.max(2, Math.ceil(Math.abs(from - to) / step));
  for (let i = 0; i <= n; i++) pts.push(g.point(from + ((to - from) * i) / n, kind, lane));
  return pts;
}

// opts: { lang, stimSite, lesionSite, lesionKind ('axonal'|'demyel'|'both'|null), showSensory,
//         showMotor, axons:[{kind, lane, color, segments:[{from,to,state}], impulses:[pos…]}],
//         recording: 'motor'|'sensory'|'both', drgHighlight, labels }
export function drawMacro(ctx, w, h, opts) {
  const th = theme();
  const L = (zh, en) => (opts.lang === 'en' ? en : zh);
  const g = geometry(w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const hits = [];
  // limb silhouette (arm + hand)
  ctx.fillStyle = withAlpha(th.skin, 0.55);
  ctx.beginPath();
  ctx.moveTo(w * 0.25, g.y0 - h * 0.17);
  ctx.quadraticCurveTo(w * 0.55, g.y0 - h * 0.12, w * 0.8, g.y0 - h * 0.12);
  ctx.lineTo(w * 0.84, h * 0.17);
  ctx.lineTo(w * 0.995, h * 0.19);
  ctx.lineTo(w * 0.995, h * 0.34);
  ctx.lineTo(w * 0.86, h * 0.36);
  ctx.quadraticCurveTo(w * 0.95, h * 0.62, w * 0.95, h * 0.84);
  ctx.lineTo(w * 0.8, h * 0.86);
  ctx.quadraticCurveTo(w * 0.79, g.y0 + h * 0.2, w * 0.75, g.y0 + h * 0.15);
  ctx.quadraticCurveTo(w * 0.5, g.y0 + h * 0.2, w * 0.25, g.y0 + h * 0.17);
  ctx.closePath();
  ctx.fill();
  // spinal cord cross-section
  const c = g.cord;
  ctx.fillStyle = th.bone;
  ctx.strokeStyle = th.faint;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = withAlpha(th.myelin, 0.95);
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, c.r, c.r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = withAlpha(th.muted, 0.28);
  ctx.beginPath(); // butterfly grey matter
  ctx.ellipse(c.x + c.r * 0.28, c.y - c.r * 0.35, c.r * 0.22, c.r * 0.38, -0.5, 0, Math.PI * 2);
  ctx.ellipse(c.x + c.r * 0.33, c.y + c.r * 0.38, c.r * 0.3, c.r * 0.33, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // anterior horn cell
  ctx.fillStyle = th.motor;
  ctx.beginPath();
  ctx.arc(c.x + c.r * 0.38, c.y + c.r * 0.42, 4.2, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, L('脊髓', 'Spinal cord'), c.x, c.y + c.r * 1.35 + 14, th.muted);
  label(ctx, L('前角细胞', 'AHC'), c.x + c.r * 0.4, c.y + c.r * 0.42 + 15, th.motor, 'center', 10);
  // lesion overlay (behind axons)
  const drawLesion = (siteKey, kind) => {
    const s = LESION_SITES[siteKey];
    if (!s) return;
    const paths = [];
    for (const k of ['motor', 'sensory']) {
      if (siteKey === 'distal') {
        paths.push(pathPoints(g, s.b, s.a, k, 0));
      } else paths.push(pathPoints(g, s.b, s.a, k, 0));
    }
    ctx.lineCap = 'round';
    for (const pts of paths) {
      ctx.strokeStyle = withAlpha(kind === 'demyel' ? th.warn : th.lesion, 0.28);
      ctx.lineWidth = 26;
      polyline(ctx, pts);
    }
    ctx.lineCap = 'butt';
    const mid = g.point((s.a + s.b) / 2, siteKey === 'rootPre' ? 'motor' : 'motor', 0);
    const yLab = siteKey === 'distal' ? mid.y + 30 : mid.y - 26;
    label(ctx, kind === 'demyel' ? L('脱髓鞘区', 'demyelination') : kind === 'both' ? L('病灶', 'lesion') : L('轴突病灶', 'axonal lesion'), mid.x, yLab, kind === 'demyel' ? th.warn : th.lesion, 'center', 10.5, 600);
  };
  if (opts.lesions) opts.lesions.forEach((l) => drawLesion(l.site, l.kind));
  // nerve trunk sheath
  ctx.lineCap = 'round';
  ctx.strokeStyle = withAlpha(th.myelin, 1);
  ctx.lineWidth = 15;
  polyline(ctx, pathPoints(g, POS.DRG - 2, POS.WRIST, 'motor', 0, 8));
  ctx.lineWidth = 9;
  polyline(ctx, pathPoints(g, POS.WRIST, POS.MOTOR_POINT, 'motor', 0));
  polyline(ctx, pathPoints(g, POS.WRIST, POS.RING_G2 - 8, 'sensory', 0));
  ctx.lineWidth = 7;
  polyline(ctx, pathPoints(g, POS.CORD, POS.DRG - 2, 'motor', 0));
  polyline(ctx, pathPoints(g, POS.CORD, POS.DRG - 2, 'sensory', 0));
  ctx.lineCap = 'butt';
  // DRG
  const drg = g.point(POS.DRG + 4, 'sensory', 0);
  ctx.fillStyle = opts.drgHighlight ? withAlpha(th.sensory, 0.45) : withAlpha(th.sensory, 0.22);
  ctx.strokeStyle = th.sensory;
  ctx.lineWidth = opts.drgHighlight ? 2 : 1;
  ctx.beginPath();
  ctx.ellipse(drg.x, drg.y, 13, 9, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  label(ctx, L('背根神经节 DRG', 'DRG'), drg.x + 2, drg.y - 14, th.sensory, 'center', 10.5, 600);
  const vr = g.point(POS.CORD - 10, 'motor', 0);
  label(ctx, L('前根', 'ventral root'), vr.x + 34, vr.y + 16, th.muted, 'center', 10);
  const dr = g.point(POS.CORD - 10, 'sensory', 0);
  label(ctx, L('后根', 'dorsal root'), dr.x + 32, dr.y - 9, th.muted, 'center', 10);
  // plexus marker
  const px = g.point(POS.AXILLA + 105, 'motor', 0);
  label(ctx, L('神经丛', 'plexus'), px.x, px.y + 26, th.muted, 'center', 10);
  // muscle
  const m = g.muscle;
  ctx.fillStyle = th.muscle;
  ctx.strokeStyle = th.muscleDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(m.x, m.y, m.rx, m.ry, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = withAlpha(th.muscleDark, 0.5);
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(m.x - m.rx * 0.8, m.y + k * m.ry * 0.22 + m.rx * 0.2);
    ctx.lineTo(m.x + m.rx * 0.8, m.y + k * m.ry * 0.22 - m.rx * 0.2);
    ctx.stroke();
  }
  label(ctx, L('拇短展肌 APB', 'APB muscle'), m.x - m.rx * 0.2, m.y + m.ry + 16, th.muted, 'center', 10.5);
  // digit
  ctx.strokeStyle = withAlpha(th.muted, 0.4);
  ctx.lineWidth = 1;
  label(ctx, L('示指 D2', 'Digit 2'), g.digit.x1 - 18, g.digit.y - 18, th.muted, 'center', 10.5);
  // axons
  (opts.axons || []).forEach((ax) => {
    ctx.lineWidth = ax.highlight ? 2.6 : 1.4;
    for (const seg of ax.segments) {
      const pts = pathPoints(g, seg.from, seg.to, ax.kind, ax.lane);
      ctx.strokeStyle = seg.state === 'degenerated' ? withAlpha(ax.color, 0.18) : withAlpha(ax.color, ax.dim ? 0.35 : 0.9);
      ctx.setLineDash(seg.state === 'degenerated' ? [3, 4] : seg.state === 'demyel' ? [6, 3] : []);
      polyline(ctx, pts);
    }
    ctx.setLineDash([]);
    // blocks / transections
    (ax.stops || []).forEach((s) => {
      const p = g.point(s.pos, ax.kind, ax.lane);
      ctx.strokeStyle = th.lesion;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(p.x - 4, p.y - 4);
      ctx.lineTo(p.x + 4, p.y + 4);
      ctx.moveTo(p.x + 4, p.y - 4);
      ctx.lineTo(p.x - 4, p.y + 4);
      ctx.stroke();
    });
    // impulses
    (ax.impulses || []).forEach((pos) => {
      const p = g.point(pos, ax.kind, ax.lane);
      ctx.fillStyle = withAlpha(ax.color, 0.25);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ax.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  // muscle activation glow
  if (opts.muscleActivation) {
    ctx.fillStyle = withAlpha(th.accent, 0.35 * opts.muscleActivation);
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, m.rx, m.ry, -0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  // stimulation sites
  const sites = opts.stimSites || [];
  sites.forEach((s) => {
    const p = g.point(s.pos, 'motor', 0);
    const active = s.key === opts.stimSite;
    ctx.fillStyle = active ? th.highlight : th.panel;
    ctx.strokeStyle = active ? th.ink : th.muted;
    ctx.lineWidth = active ? 1.8 : 1;
    ctx.beginPath();
    ctx.moveTo(p.x - 3, p.y - 26);
    ctx.lineTo(p.x + 5, p.y - 26);
    ctx.lineTo(p.x + 1, p.y - 18);
    ctx.lineTo(p.x + 6, p.y - 18);
    ctx.lineTo(p.x - 4, p.y - 6);
    ctx.lineTo(p.x - 1, p.y - 15);
    ctx.lineTo(p.x - 6, p.y - 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    label(ctx, s.label, p.x, p.y - 31, active ? th.ink : th.muted, 'center', 10.5, active ? 700 : 500);
    hits.push({ kind: 'stim', key: s.key, x: p.x, y: p.y - 16, r: 18 });
  });
  // recording electrodes
  const rec = opts.recording || 'motor';
  if (rec === 'motor' || rec === 'both') {
    const e1 = { x: m.x - m.rx * 0.05, y: m.y - m.ry * 0.85 };
    const e2 = { x: m.x + m.rx * 1.1, y: m.y + m.ry * 0.9 };
    [
      [e1, 'G1'],
      [e2, 'G2'],
    ].forEach(([e, t]) => {
      ctx.fillStyle = t === 'G1' ? th.ink : th.muted;
      ctx.fillRect(e.x - 5, e.y - 3, 10, 6);
      label(ctx, t, e.x + 13, e.y + 4, th.ink, 'left', 10, 600);
    });
  }
  if (rec === 'sensory' || rec === 'both') {
    for (const [pos, t] of [
      [POS.RING_G1, 'G1'],
      [POS.RING_G2, 'G2'],
    ]) {
      const p = g.point(pos, 'sensory', 0);
      ctx.strokeStyle = t === 'G1' ? th.ink : th.muted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 4, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      label(ctx, t, p.x, p.y - 15, th.ink, 'center', 10, 600);
    }
  }
  if (opts.caption) label(ctx, opts.caption, 10, h - 10, th.muted, 'left', 11);
  return { hits, g };
}
