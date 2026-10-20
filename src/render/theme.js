// Colours are defined as CSS custom properties (light/dark) and read here for canvas drawing.

export function theme() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fb) => (cs.getPropertyValue(name) || fb).trim() || fb;
  return {
    bg: v('--scope-bg', '#fbfaf7'),
    panel: v('--panel', '#ffffff'),
    ink: v('--ink', '#1d232b'),
    muted: v('--muted', '#69707a'),
    faint: v('--faint', '#c9ccd1'),
    grid: v('--grid', '#e6e3dc'),
    gridMajor: v('--grid-major', '#d3cfc5'),
    trace: v('--trace', '#1f5f8b'),
    normal: v('--trace-normal', '#9aa0a6'),
    accent: v('--accent', '#c0562f'),
    motor: v('--motor', '#c0562f'),
    sensory: v('--sensory', '#2f7a6d'),
    lesion: v('--lesion', '#b8325a'),
    myelin: v('--myelin', '#e9dfc8'),
    muscle: v('--muscle', '#e8c6bd'),
    muscleDark: v('--muscle-dark', '#c98f81'),
    bone: v('--bone', '#efeae0'),
    skin: v('--skin', '#f3e3d3'),
    good: v('--good', '#2f7a4d'),
    warn: v('--warn', '#b07a12'),
    bad: v('--bad', '#b8325a'),
    highlight: v('--highlight', '#e0a100'),
  };
}

// Qualitative palette for individual motor units / axons (stable by index).
const UNIT_PALETTE = ['#d1495b', '#00798c', '#edae49', '#30638e', '#6a4c93', '#3c9d5d', '#e07a5f', '#8d6a9f', '#1b998b', '#c97c5d', '#5c80bc', '#a23e48'];
export function unitColor(i) {
  return UNIT_PALETTE[((i % UNIT_PALETTE.length) + UNIT_PALETTE.length) % UNIT_PALETTE.length];
}

export function withAlpha(hex, a) {
  if (hex.startsWith('rgb')) return hex;
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Prepare a canvas for crisp drawing at device pixel ratio; returns 2D context sized in CSS px.
export function fitCanvas(canvas) {
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(10, Math.round(rect.width));
  const h = Math.max(10, Math.round(rect.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
