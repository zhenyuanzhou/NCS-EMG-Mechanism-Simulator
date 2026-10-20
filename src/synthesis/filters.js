// Recording filters applied to the generated signal (causal, like an amplifier).
// Low-frequency filter = high-pass; high-frequency filter = low-pass (textbook p.83).
// 2nd-order Butterworth sections (RBJ cookbook biquads).

import { DT } from './volume.js';

function biquad(sig, b0, b1, b2, a1, a2) {
  const out = new Float64Array(sig.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < sig.length; i++) {
    const x = sig[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    out[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  return out;
}

const FS = 1000 / DT; // Hz

export function highPass(sig, fc) {
  if (!fc || fc <= 0) return Float64Array.from(sig);
  const w0 = (2 * Math.PI * Math.min(fc, FS * 0.45)) / FS;
  const Q = Math.SQRT1_2;
  const alpha = Math.sin(w0) / (2 * Q);
  const cos = Math.cos(w0);
  const a0 = 1 + alpha;
  return biquad(sig, (1 + cos) / 2 / a0, -(1 + cos) / a0, (1 + cos) / 2 / a0, (-2 * cos) / a0, (1 - alpha) / a0);
}

export function lowPass(sig, fc) {
  if (!fc || fc >= FS * 0.45) return Float64Array.from(sig);
  const w0 = (2 * Math.PI * fc) / FS;
  const Q = Math.SQRT1_2;
  const alpha = Math.sin(w0) / (2 * Q);
  const cos = Math.cos(w0);
  const a0 = 1 + alpha;
  return biquad(sig, (1 - cos) / 2 / a0, (1 - cos) / a0, (1 - cos) / 2 / a0, (-2 * cos) / a0, (1 - alpha) / a0);
}

export function bandPass(sig, lff, hff) {
  return lowPass(highPass(sig, lff), hff);
}
