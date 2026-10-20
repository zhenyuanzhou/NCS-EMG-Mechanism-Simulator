// Generators of spontaneous discharges (textbook Ch 14, p.231–242, Table 14.1).
// Each returns event times (ms) plus per-event parameters; the synthesis layer turns them into
// waveforms with the line-source model. Rates/patterns are drawn from the textbook ranges.

import { makeRng, hashSeed } from '../core/rng.js';

// Fibrillation / positive sharp wave: very regular, may slow gradually (p.234).
export function regularTrain(rateHz, windowMs, seed, { drift = -0.08 } = {}) {
  const rng = makeRng(hashSeed('reg', seed));
  const out = [];
  let t = rng.uniform(5, 1000 / rateHz);
  let rate = rateHz;
  while (t < windowMs) {
    out.push({ t, amp: 1 });
    rate = Math.max(0.3, rate * (1 + (drift * (1000 / rate)) / windowMs));
    t += (1000 / rate) * (1 + rng.normal(0, 0.004));
  }
  return out;
}

// Fasciculation: single, irregular, slow discharges of a whole motor unit (<1–2 Hz, p.238).
export function irregularTrain(meanHz, windowMs, seed) {
  const rng = makeRng(hashSeed('fasc', seed));
  const out = [];
  let t = rng.exponential(1000 / meanHz) * 0.5;
  while (t < windowMs) {
    out.push({ t, amp: 1 });
    // gamma(2)-distributed intervals: irregular (CV ≈ 70%) but not as clumped as Poisson
    t += Math.max(80, (rng.exponential(1000 / meanHz) + rng.exponential(1000 / meanHz)) / 2);
  }
  return out;
}

// Myotonic discharge: rate and amplitude wax and wane between 20 and 150 Hz (p.238).
export function waxWaneTrain(fMin, fMax, windowMs, seed, { cycles = 1 } = {}) {
  const rng = makeRng(hashSeed('myo', seed));
  const out = [];
  let t = 20;
  while (t < windowMs) {
    const ph = (t / windowMs) * cycles;
    const s = Math.sin(Math.PI * (ph % 1)); // 0 → 1 → 0: accelerate then slow
    const f = fMin + (fMax - fMin) * s * s;
    // amplitude falls as the rate rises (schematic: partial Na-channel inactivation)
    const amp = 1 - 0.55 * s * s + rng.normal(0, 0.02);
    out.push({ t, amp, rate: f });
    t += 1000 / f;
  }
  return out;
}

// Complex repetitive discharge: a loop of fibres re-activated ephaptically; each cycle is
// identical (perfectly regular) with abrupt onset/offset; a fibre may drop out → quantal
// change in shape and frequency (p.236–237).
export function crdTrain({ nFibers, rateHz, windowMs, startMs = 80, stopMs = null, dropAt = null, seed = 1 }) {
  const rng = makeRng(hashSeed('crd', seed));
  const delays = [];
  let d = 0;
  for (let i = 0; i < nFibers; i++) {
    delays.push(d);
    d += rng.uniform(0.35, 1.1); // ephaptic transmission delay to the next fibre
  }
  const loopMs = 1000 / rateHz;
  const events = [];
  let t = startMs;
  const end = stopMs ?? windowMs - 60;
  while (t < end) {
    const dropped = dropAt !== null && t >= dropAt;
    const n = dropped ? nFibers - 1 : nFibers;
    for (let i = 0; i < n; i++) events.push({ t: t + delays[i], fiber: i, amp: 1 });
    // dropping a fibre shortens the circuit → the discharge frequency jumps
    t += dropped ? loopMs * (1 - 0.6 / nFibers) : loopMs;
  }
  return { events, delays };
}

// Endplate noise (MEPPs, 20–40 Hz irregular) and endplate spikes (irregular, up to 50 Hz,
// sputtering) (p.233).
export function sputterTrain(meanHz, windowMs, seed) {
  const rng = makeRng(hashSeed('sputter', seed));
  const out = [];
  let t = rng.exponential(1000 / meanHz);
  while (t < windowMs) {
    // bursts and pauses: irregular "sputtering"
    out.push({ t, amp: 0.7 + 0.6 * rng.next() });
    t += rng.next() < 0.25 ? rng.exponential(120) : rng.exponential(1000 / meanHz);
  }
  return out;
}
