// Neuromuscular transmission: the textbook teaching model (p.57–60), m = p·n.
//   n  immediately available store (quanta), refilled from the mobilization store
//   p  release probability, raised by residual presynaptic Ca²⁺ when stimuli come faster
//      than Ca²⁺ is cleared (≈100 ms, p.58)
//   EPP = m × (mV per quantum) × postsynaptic receptor factor × fibre gain
//   a muscle fibre fires when its EPP reaches threshold (safety factor = margin above it).
// Postsynaptic disease (MG) lowers the receptor factor; presynaptic disease (LEMS, botulism)
// lowers p. Refill kinetics and Ca²⁺ increments are illustrative, tuned so that the
// textbook behaviours emerge (normal: no decrement; MG: decrement with a U-shape; LEMS: low
// baseline CMAP, decrement at 3 Hz, large increment after rapid RNS or brief exercise).

import { PV } from '../core/params.js';
import { makeRng, hashSeed } from '../core/rng.js';

export const NMJ_K = {
  refillTauS: 0.87, // refill of the immediately available store at rest (illustrative)
  mobilizedTauS: 0.45, // faster refill once the mobilization store contributes (after ≈1.5 s)
  caRefill: 3.8, // residual Ca²⁺ also speeds refill (illustrative; keeps normal 50 Hz trains stable)
  caStep: 0.32, // residual Ca²⁺ increment per impulse (relative to baseline p; illustrative)
  pMax: 0.45, // ceiling on release probability (illustrative)
  fibreGainSd: 0.12, // fibre-to-fibre safety-factor scatter (as in the muscle model)
  ptpAfterExercise: 0.7, // release enhancement just after 10 s–1 min maximal exercise (illustrative)
  ptpTauMs: 8000, // decay of post-exercise facilitation (illustrative; textbook ≈10 s window)
};

export const DISEASES = {
  normal: { zh: '正常', en: 'Normal' },
  mg: { zh: '重症肌无力（突触后）', en: 'Myasthenia gravis (postsynaptic)' },
  lems: { zh: 'Lambert–Eaton（突触前）', en: 'Lambert–Eaton (presynaptic)' },
  botulism: { zh: '肉毒中毒（突触前）', en: 'Botulism (presynaptic)' },
  reinn: { zh: '早期再支配（不成熟终板）', en: 'Early reinnervation (immature endplates)' },
};

// severity 0..1 → receptor factor (postsynaptic) and release factor (presynaptic)
export function diseaseFactors(disease, severity) {
  const s = Math.max(0, Math.min(1, severity));
  if (disease === 'mg') return { receptor: 1 - 0.65 * s, release: 1 };
  if (disease === 'lems') return { receptor: 1, release: 1 - 0.85 * s };
  if (disease === 'botulism') return { receptor: 1, release: 1 - 0.85 * s };
  if (disease === 'reinn') return { receptor: 1 - 0.55 * s, release: 1 }; // immature endplates: low safety factor (illustrative)
  return { receptor: 1, release: 1 };
}

// Standard-normal CDF (Abramowitz–Stegun 7.1.26 via erf).
export function phi(x) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(x) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return 0.5 * (1 + (x >= 0 ? y : -y));
}

// Fibre safety classes: quantiles of the fibre EPP gain distribution.
export function gainClasses(k = 24, seed = 1) {
  const rng = makeRng(hashSeed('nmjclass', seed));
  const g = [];
  for (let i = 0; i < 4000; i++) g.push(Math.max(0.55, rng.normal(1, NMJ_K.fibreGainSd)));
  g.sort((a, b) => a - b);
  const out = [];
  for (let c = 0; c < k; c++) out.push(g[Math.floor(((c + 0.5) / k) * g.length)]);
  return out;
}

// Run a stimulus train. times: stimulus times (ms). preCa: residual Ca (e.g. after exercise).
// storeFactor: available-store scaling (post-exercise exhaustion).
export function runTrain(times, { disease = 'normal', severity = 0.5, preCa = 0, ptp = 0, storeFactor = 1, classes = gainClasses() } = {}) {
  const f = diseaseFactors(disease, severity);
  const n0 = PV.quantaStore * storeFactor;
  const p0 = PV.releaseP * f.release;
  let n = n0;
  let ca = preCa;
  let tPrev = null;
  const out = [];
  for (let k = 0; k < times.length; k++) {
    const t = times[k];
    if (tPrev !== null) {
      const dt = t - tPrev;
      ca *= Math.exp(-dt / PV.caClearMs);
      const tau = ((t > PV.mobilizationS * 1000 ? NMJ_K.mobilizedTauS : NMJ_K.refillTauS) * 1000) / (1 + NMJ_K.caRefill * ca);
      n = n + (n0 - n) * (1 - Math.exp(-dt / tau));
    }
    // post-tetanic potentiation after exercise decays over ≈10 s (p.60; time constant illustrative)
    const pot = ptp * Math.exp(-t / NMJ_K.ptpTauMs);
    const p = Math.min(NMJ_K.pMax, p0 * (1 + ca) * (1 + pot));
    const m = p * n;
    const sdQ = Math.sqrt(Math.max(1e-9, n * p * (1 - p)));
    const epp = m * PV.eppPerQuantumMv * f.receptor; // for a fibre of gain 1
    const eppSd = sdQ * PV.eppPerQuantumMv * f.receptor;
    // fraction of fibres in each safety class reaching threshold
    const fire = classes.map((g) => phi((epp * g - PV.eppThresholdMv) / Math.max(1e-6, eppSd * g)));
    const frac = fire.reduce((s, v) => s + v, 0) / classes.length;
    out.push({ t, n, p, m, epp, eppSd, fire, frac, ca });
    n -= m;
    ca += NMJ_K.caStep;
    tPrev = t;
  }
  return out;
}

export const PROTOCOLS = {
  slow: { zh: '低频 RNS 3 Hz × 10', en: 'Slow RNS 3 Hz × 10' },
  rapid: { zh: '高频 RNS 50 Hz × 50（1 s）', en: 'Rapid RNS 50 Hz × 50 (1 s)' },
  exercise: { zh: '10 秒最大用力后单次刺激', en: 'Single stimulus before / after 10 s exercise' },
  exhaust: { zh: '1 分钟运动后 0–4 分钟 3 Hz', en: '3 Hz before and 0–4 min after 1 min exercise' },
};

// Store depression after 1 min of exercise: develops and recovers over minutes, maximal at
// 2–4 min (postexercise exhaustion, p.60). Illustrative shape.
export function exhaustionFactor(minAfter) {
  if (minAfter <= 0) return 1;
  const bump = Math.exp(-((minAfter - 3) ** 2) / 2.2);
  return 1 - 0.15 * bump;
}

export function runProtocol(protocol, opts) {
  if (protocol === 'slow') {
    const times = Array.from({ length: 10 }, (_, k) => k * (1000 / 3));
    return { trains: [{ label: 'rest', res: runTrain(times, opts) }] };
  }
  if (protocol === 'rapid') {
    const times = Array.from({ length: 50 }, (_, k) => k * 20);
    return { trains: [{ label: 'rapid', res: runTrain(times, opts) }] };
  }
  if (protocol === 'exercise') {
    const pre = runTrain([0], opts);
    // brief exercise: residual Ca facilitates for ~10 s; a little store depletion is offset by mobilization
    const post = runTrain([0], { ...opts, ptp: NMJ_K.ptpAfterExercise * Math.exp(-2000 / NMJ_K.ptpTauMs) });
    return { trains: [{ label: 'pre', res: pre }, { label: 'post', res: post }] };
  }
  // exhaustion: 3 Hz trains at baseline and 0, 1, 2, 3, 4 min after 1 min of exercise
  const times = Array.from({ length: 10 }, (_, k) => k * (1000 / 3));
  const trains = [{ label: 'base', min: null, res: runTrain(times, opts) }];
  for (const mn of [0, 1, 2, 3, 4]) {
    const ptp = NMJ_K.ptpAfterExercise * Math.exp(-(mn * 60000 + 2000) / NMJ_K.ptpTauMs);
    trains.push({ label: `${mn} min`, min: mn, res: runTrain(times, { ...opts, ptp, storeFactor: exhaustionFactor(mn) }) });
  }
  return { trains };
}

export function decrementPct(res) {
  const base = res[0].frac;
  const low = Math.min(...res.slice(0, 5).map((r) => r.frac));
  return (100 * (base - low)) / base;
}
export function incrementPct(res) {
  const base = res[0].frac;
  const hi = Math.max(...res.map((r) => r.frac));
  return (100 * (hi - base)) / base;
}

// --------------------------------------------------------------------------------------
// SFEMG: two fibres of one motor unit. NMJ transmission time = time for the EPP (rising
// exponentially, τ illustrative) to reach threshold; quantal fluctuation of the EPP makes it
// vary from discharge to discharge (jitter); an EPP below threshold = blocking (p.658).
// --------------------------------------------------------------------------------------
export const SF_K = { riseTauMs: 0.25, propagationJitterUs: 4 };

export function sfemgPair({ disease = 'normal', severity = 0.5, n = 100, seed = 1, rateHz = 10, gains = [0.95, 1.05] } = {}) {
  const f = diseaseFactors(disease, severity);
  const rng = makeRng(hashSeed('sfemg', disease, severity.toFixed(3), seed));
  // steady state of the immediately available store at the voluntary firing rate
  const dt = 1000 / rateHz;
  const caSS = (NMJ_K.caStep * Math.exp(-dt / PV.caClearMs)) / (1 - Math.exp(-dt / PV.caClearMs));
  const a = 1 - Math.exp(-(dt * (1 + NMJ_K.caRefill * caSS)) / (NMJ_K.mobilizedTauS * 1000));
  const p = Math.min(NMJ_K.pMax, PV.releaseP * f.release * (1 + caSS));
  const nSS = (PV.quantaStore * a) / (1 - (1 - p) * (1 - a));
  const m = p * nSS;
  const sdQ = Math.sqrt(m * (1 - p));
  const lat = [[], []];
  const blocked = [[], []];
  for (let k = 0; k < n; k++) {
    for (let j = 0; j < 2; j++) {
      const q = Math.max(0, m + sdQ * rng.normal(0, 1));
      const epp = q * PV.eppPerQuantumMv * f.receptor * gains[j];
      const th = PV.eppThresholdMv;
      if (epp <= th) {
        blocked[j].push(true);
        lat[j].push(null);
        continue;
      }
      blocked[j].push(false);
      const t = -SF_K.riseTauMs * Math.log(1 - th / epp) + (rng.normal(0, SF_K.propagationJitterUs) / 1000);
      lat[j].push(0.8 + j * 0.7 + t); // fixed axonal/muscle path offsets (illustrative)
    }
  }
  // interpotential intervals and MCD (mean consecutive difference), only when both fired
  const ipi = [];
  for (let k = 0; k < n; k++) ipi.push(lat[0][k] !== null && lat[1][k] !== null ? lat[1][k] - lat[0][k] : null);
  const diffs = [];
  for (let k = 1; k < n; k++) if (ipi[k] !== null && ipi[k - 1] !== null) diffs.push(Math.abs(ipi[k] - ipi[k - 1]));
  const mcd = diffs.length ? (1000 * diffs.reduce((s, v) => s + v, 0)) / diffs.length : NaN;
  const blockPct = (100 * (blocked[0].filter(Boolean).length + blocked[1].filter(Boolean).length)) / (2 * n);
  return { lat, ipi, mcd, blockPct, epp: m * PV.eppPerQuantumMv * f.receptor, eppSd: sdQ * PV.eppPerQuantumMv * f.receptor, m, p };
}
