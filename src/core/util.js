// Small numeric helpers shared by all layers.

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

export function zeros(n) {
  return new Float64Array(n);
}

// Add src (sampled at the same dt) into dst with a delay given in samples (fractional allowed).
export function addShifted(dst, src, delaySamples, gain = 1) {
  if (gain === 0) return;
  const i0 = Math.floor(delaySamples);
  const f = delaySamples - i0;
  const n = dst.length;
  const m = src.length;
  for (let k = 0; k < m; k++) {
    const v = src[k] * gain;
    const j = i0 + k;
    if (j >= 0 && j < n) dst[j] += v * (1 - f);
    if (j + 1 >= 0 && j + 1 < n) dst[j + 1] += v * f;
  }
}

// Linear interpolation of a sampled array at fractional index.
export function sampleAt(arr, idx) {
  if (idx <= 0) return arr[0];
  const n = arr.length;
  if (idx >= n - 1) return arr[n - 1];
  const i = Math.floor(idx);
  const f = idx - i;
  return arr[i] * (1 - f) + arr[i + 1] * f;
}

export function mean(a) {
  let s = 0;
  for (const v of a) s += v;
  return a.length ? s / a.length : 0;
}

export function sd(a) {
  const m = mean(a);
  let s = 0;
  for (const v of a) s += (v - m) * (v - m);
  return a.length > 1 ? Math.sqrt(s / (a.length - 1)) : 0;
}

export function fmt(x, digits = 1) {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  if (!Number.isFinite(x)) return '—';
  return x.toFixed(digits);
}

export function pctChange(a, b) {
  if (!a) return null;
  return ((b - a) / a) * 100;
}

// Read / write a nested property by dotted path ("axonal.frac").
export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
export function setPath(obj, path, value) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = value;
}
