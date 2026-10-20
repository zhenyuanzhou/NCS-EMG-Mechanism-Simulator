// Late responses (textbook Ch 4, p.41–49).
// F response: a supramaximal stimulus sends an antidromic volley up every motor axon; at the
// anterior horn a small, different subset of neurons "backfires" each time (1–5% of fibres,
// p.42) after a ≈1 ms turnaround; the returning orthodromic impulses produce a small, variable
// late potential. No synapse → not a reflex.
// H reflex: a submaximal long pulse preferentially excites Ia afferents (lower threshold);
// their volley crosses one synapse and excites motor neurons (small first); the reflex
// volley reaches the muscle late. As intensity rises, motor axons are stimulated directly
// (M wave) and their antidromic volleys COLLIDE with the reflex volleys in the same axons,
// so H falls; at supramaximal intensity H disappears and F responses remain (p.47–48).

import { PV } from '../core/params.js';
import { makeRng, hashSeed } from '../core/rng.js';
import { POS, conduct } from './nerve.js';

export function fBackfires(nerve, prep, lesion, day, stimPos, nStim, seed) {
  const rng = makeRng(hashSeed('F', seed, stimPos));
  const res = [];
  for (let k = 0; k < nStim; k++) {
    const units = [];
    nerve.motor.forEach((ax, i) => {
      const up = conduct(ax, prep.motor[i], stimPos, POS.CORD, lesion, day);
      if (!up.ok) return;
      if (rng.next() >= PV.fBackfireFraction) return;
      const down = conduct(ax, prep.motor[i], POS.CORD, POS.MOTOR_POINT, lesion, day);
      if (!down.ok) return;
      units.push({ id: i, t: up.t + PV.ahcTurnaroundMs + down.t, up: up.t, down: down.t });
    });
    res.push(units);
  }
  return res;
}

// Ia afferent population (illustrative): fast, low electrical threshold for a 1 ms pulse.
export function iaAfferents(seed, n = 80) {
  const rng = makeRng(hashSeed('Ia', seed));
  return Array.from({ length: n }, () => ({ cv: PV.iaCV + rng.normal(0, 3), thr: rng.uniform(4, 14) }));
}

// For one intensity: which motor axons are stimulated directly (M), which motor neurons are
// excited reflexly, and which reflex volleys survive (not collided).
export const H_MAX_FRACTION = 0.45; // max fraction of motor neurons reflexly excited (illustrative)
export function hReflexAt(nerve, prep, lesion, day, stimPos, intensity, ia, poolRank) {
  const direct = nerve.motor.map((ax) => Number.isFinite(intensity) && intensity >= ax.stimThreshold);
  if (!Number.isFinite(intensity)) direct.fill(true);
  const iaOn = ia.filter((a) => intensity >= a.thr);
  const drive = iaOn.length / ia.length;
  // Ia volley arrival at the cord: earliest of the recruited afferents
  const iaT = iaOn.length ? Math.min(...iaOn.map((a) => (POS.CORD - stimPos) / a.cv)) : Infinity;
  const nRefl = Math.round(H_MAX_FRACTION * drive * nerve.motor.length);
  // size principle: smallest motor neurons first
  const order = nerve.motor.map((_, i) => i).sort((a, b) => poolRank[a] - poolRank[b]);
  const reflex = new Set(order.slice(0, nRefl));
  const units = [];
  const collided = [];
  for (const i of reflex) {
    if (direct[i]) {
      collided.push(i); // antidromic volley meets the reflex volley in the same axon
      continue;
    }
    const down = conduct(nerve.motor[i], prep.motor[i], POS.CORD, POS.MOTOR_POINT, lesion, day);
    if (!down.ok) continue;
    units.push({ id: i, t: iaT + PV.hSynapseMs + down.t });
  }
  return { direct, reflex, units, collided, iaT, drive };
}
