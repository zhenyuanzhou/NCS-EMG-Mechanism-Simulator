// Voluntary activation (needle EMG).
//
// Four quantities are kept separate (textbook p.251–254):
//   neural drive D   – central excitatory input to the motor-neuron pool (0 … DMAX)
//   firing rate f_i  – each recruited unit starts at ≈5 Hz and speeds up with D (rate coding)
//   recruited units  – unit i fires when D exceeds its threshold θ_i (size principle)
//   force            – Σ (functioning fibre force of unit i) × twitch-summation(f_i)
// Thresholds and the rate gain are calibrated so that, in a normal muscle, roughly one
// new unit appears at the needle for every ≈5 Hz increase of the first unit (5:1 rule).

import { PV } from '../core/params.js';
import { unitStats } from './muscle.js';
import { makeRng, hashSeed } from '../core/rng.js';

export const DMAX = 1.6;
export const RATE_GAIN = 40; // Hz per unit drive (calibrated, see tests/recruitment.test.mjs)

export function unitRate(u, D) {
  // a unit can be driven voluntarily only if its axon conducts from the cord to the muscle
  if (!u.alive || u.voluntary === false || D < u.threshold) return 0;
  return Math.min(PV.maxFiringHz, PV.onsetFiringHz + RATE_GAIN * (D - u.threshold));
}

// Twitch summation: force per unit rises with rate and saturates near tetanic fusion.
export function summation(f) {
  if (f <= 0) return 0;
  const fc = PV.fusionHz / 3;
  return (1 - Math.exp(-f / fc)) / (1 - Math.exp(-PV.maxFiringHz / fc));
}

export function unitForceCapacity(pool) {
  return pool.units.map((u) => (u.alive ? unitStats(pool, u).force : 0));
}

// Normalisation: force of the NORMAL pool at maximal drive = 100 %.
export function maxForceOf(pool) {
  const cap = unitForceCapacity(pool);
  let F = 0;
  pool.units.forEach((u, i) => {
    F += cap[i] * summation(unitRate(u, DMAX));
  });
  return F;
}

export function stateAtDrive(pool, D, refMaxForce, cap = unitForceCapacity(pool)) {
  let F = 0;
  const rates = new Float64Array(pool.units.length);
  let nActive = 0;
  pool.units.forEach((u, i) => {
    const f = unitRate(u, D);
    rates[i] = f;
    if (f > 0 && cap[i] > 0) nActive++;
    F += cap[i] * summation(f);
  });
  return { drive: D, rates, nActive, forcePct: (100 * F) / refMaxForce };
}

// Find the drive that produces a target force (matched-force mode). If the target is not
// reachable within the available (possibly centrally capped) drive, returns the maximum.
export function driveForForce(pool, targetPct, refMaxForce, driveCap = DMAX) {
  const cap = unitForceCapacity(pool);
  const fAt = (D) => stateAtDrive(pool, D, refMaxForce, cap).forcePct;
  if (fAt(driveCap) < targetPct) return { drive: driveCap, reached: false };
  let lo = 0;
  let hi = driveCap;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (fAt(mid) < targetPct) lo = mid;
    else hi = mid;
  }
  return { drive: hi, reached: true };
}

// Semirhythmic discharge times (ms) for one unit over a window.
export function dischargeTimes(rateHz, windowMs, seed) {
  if (rateHz <= 0) return [];
  const rng = makeRng(seed);
  const isi = 1000 / rateHz;
  const out = [];
  let t = rng.uniform(0, isi);
  while (t < windowMs) {
    out.push(t);
    t += Math.max(isi * 0.4, rng.normal(isi, isi * PV.isiCV));
  }
  return out;
}

export function unitSeed(seed, uid, tag = 'fire') {
  return hashSeed(tag, seed, uid);
}
