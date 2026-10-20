// Reproducible pseudo-random numbers. Every stochastic process in the simulator
// draws from a seeded generator so that the same settings always give the same traces.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Combine several numbers/strings into one 32-bit seed (FNV-1a style).
export function hashSeed(...parts) {
  let h = 2166136261 >>> 0;
  const s = parts.map((p) => String(p)).join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function makeRng(seed) {
  const r = mulberry32(seed);
  let spare = null;
  const api = {
    next: r,
    uniform(a = 0, b = 1) {
      return a + (b - a) * r();
    },
    normal(mean = 0, sd = 1) {
      if (spare !== null) {
        const v = spare;
        spare = null;
        return mean + sd * v;
      }
      let u = 0;
      let v = 0;
      while (u === 0) u = r();
      while (v === 0) v = r();
      const mag = Math.sqrt(-2 * Math.log(u));
      spare = mag * Math.sin(2 * Math.PI * v);
      return mean + sd * mag * Math.cos(2 * Math.PI * v);
    },
    int(n) {
      return Math.floor(r() * n);
    },
    chance(p) {
      return r() < p;
    },
    pick(arr) {
      return arr[Math.floor(r() * arr.length)];
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    exponential(mean) {
      let u = 0;
      while (u === 0) u = r();
      return -Math.log(u) * mean;
    },
  };
  return api;
}
