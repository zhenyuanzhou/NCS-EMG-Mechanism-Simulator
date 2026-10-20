// Applying pathology to the motor-unit pool.
//   • Neurogenic: motor axons lost → their muscle fibres become denervated (after Wallerian
//     degeneration) → fibrillation potentials appear after a length-dependent delay →
//     surviving units adopt orphaned fibres by collateral sprouting (reinnervation) →
//     immature sprouts give satellite potentials and unstable MUAPs, mature ones give
//     long-duration, high-amplitude, polyphasic MUAPs (textbook p.248–249, 255–256).
//   • Myopathic: individual muscle fibres are lost or shrink inside surviving motor units
//     (textbook p.256–257). Membrane irritability is a separate switch.

import { makeRng, hashSeed } from '../core/rng.js';
import { PV } from '../core/params.js';
import { F_DENERVATED, F_LOST, F_REINNERVATED, F_INNERVATED } from './muscle.js';

// Length-dependent onset of denervation potentials (derived, see params: fibOnsetModel).
export function fibOnsetDays(lengthMm) {
  return 10.6 + 0.028 * Math.max(0, lengthMm);
}

// Fibrillation amplitude factor with chronic atrophy (textbook p.234: tiny <10 µV after 6–12 months).
export function atrophyFactor(daysDenervated) {
  if (daysDenervated < 150) return 1;
  return Math.max(0.12, 1 - 0.88 * Math.min(1, (daysDenervated - 150) / 300));
}

// unitLoss: Map unitId -> day the unit's axon degenerates (relative to injury, days)
// opts: { day, reinnervation (0..1), lesionToMuscleMm, seed }
export function applyNeurogenic(pool, unitLoss, opts) {
  const { day, reinnervation = 0.7, lesionToMuscleMm = 400, seed = 1, regenerated = null } = opts;
  const rng = makeRng(hashSeed('reinnerv', seed));
  const fibOnset = fibOnsetDays(lesionToMuscleMm);
  // 1) lost units → fibres denervated
  for (const [uid, degenDay] of unitLoss) {
    const u = pool.units[uid];
    if (day < degenDay) continue; // distal axon and endplates still intact
    u.alive = false;
    for (const fid of u.fibers) {
      const f = pool.fibers[fid];
      if (f.state === F_LOST) continue;
      f.state = F_DENERVATED;
      f.denervDay = degenDay;
    }
  }
  // 2) collateral reinnervation by nearby surviving units
  const alive = pool.units.filter((u) => u.alive);
  const capacity = new Map(alive.map((u) => [u.id, u.fibers.length * 4.5])); // illustrative upper bound
  const adopted = new Map(alive.map((u) => [u.id, []]));
  const denerv = pool.fibers.filter((f) => f.state === F_DENERVATED);
  for (const f of denerv) {
    const fr = makeRng(hashSeed('fib', seed, f.id));
    const willReinnervate = fr.next() < reinnervation;
    const adoptDay = f.denervDay + PV.sproutStartDays + fr.exponential(35);
    // fibrillation status if not (yet) reinnervated
    // textbook anchors are the FIRST appearance: individual fibres start at or after it
    const onsetJit = fibOnset + fr.exponential(2.5);
    // fibres never reinnervated eventually degenerate and fall silent (fibrosis; illustrative 1–2 y)
    const silentAfter = 365 + 365 * fr.next();
    if (!willReinnervate || day < adoptDay) {
      f.fibrillating = day >= onsetJit && day - f.denervDay < silentAfter;
      f.fibAmp = atrophyFactor(day - f.denervDay);
      f.fibRate = fr.uniform(PV.fibRateHz[0], PV.fibRateHz[1]);
      f.fibPhase = fr.next();
      continue;
    }
    // find nearest surviving unit that still has capacity
    let best = null;
    let bestD = Infinity;
    for (const u of alive) {
      const d = Math.hypot(f.x - u.cx, f.y - u.cy);
      if (d > u.baseRadius + 1.8) continue;
      if (adopted.get(u.id).length >= capacity.get(u.id)) continue;
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    if (!best) {
      f.fibrillating = day >= onsetJit && day - f.denervDay < silentAfter;
      f.fibAmp = atrophyFactor(day - f.denervDay);
      f.fibRate = fr.uniform(PV.fibRateHz[0], PV.fibRateHz[1]);
      f.fibPhase = fr.next();
      continue;
    }
    adopted.get(best.id).push(f.id);
    const maturity = 1 - Math.exp(-(day - adoptDay) / PV.sproutMatureDays);
    f.state = F_REINNERVATED;
    f.unit = best.id;
    f.reinnervDay = adoptDay;
    f.maturity = maturity;
    // immature sprouts: thin, slowly conducting, unreliable NMJs → late, unstable satellites
    const initialDelay = fr.uniform(3.5, 9);
    f.sproutDelay = 0.4 + (initialDelay - 0.4) * (1 - maturity);
    f.sproutJitter = 0.03 + 0.45 * (1 - maturity);
    f.sproutBlock = 0.4 * (1 - maturity);
    f.fibrillating = false;
  }
  // Axonal regrowth from the injury site (complete lesions, ≤1 mm/day, p.255): regenerated
  // axons re-innervate SOME of their original, still-denervated fibres → small, polyphasic,
  // unstable "nascent" units (p.257, Fig 15.18).
  if (regenerated) {
    for (const [uid, arriveDay] of regenerated) {
      if (day < arriveDay) continue;
      const u = pool.units[uid];
      u.alive = true;
      u.regenerated = true;
      const since = day - arriveDay;
      const frac = Math.min(0.75, 0.75 * (1 - Math.exp(-since / 90)));
      const kept = [];
      for (const fid of u.fibers) {
        const f = pool.fibers[fid];
        if (f.state !== F_DENERVATED) continue;
        const fr = makeRng(hashSeed('regen', seed, fid));
        if (fr.next() < frac) {
          const maturity = 1 - Math.exp(-since / PV.sproutMatureDays);
          f.state = F_INNERVATED;
          f.unit = uid;
          f.maturity = maturity;
          f.sproutDelay = 0.3 + 2.5 * (1 - maturity) * fr.next();
          f.sproutJitter = 0.03 + 0.4 * (1 - maturity);
          f.sproutBlock = 0.35 * (1 - maturity);
          f.fibrillating = false;
          kept.push(fid);
        }
      }
    }
  }
  for (const u of alive) {
    const add = adopted.get(u.id);
    if (!add.length) continue;
    u.fibers = u.fibers.concat(add);
    let r = u.baseRadius;
    for (const fid of add) {
      const f = pool.fibers[fid];
      r = Math.max(r, Math.hypot(f.x - u.cx, f.y - u.cy));
    }
    u.radius = r;
  }
  pool.version += 1;
  return pool;
}

// Myopathy: fibre loss inside surviving units, fibre-size variability, optional irritability.
export function applyMyopathy(pool, { fiberLoss = 0.4, sizeVar = 0.5, irritability = false, seed = 1 }) {
  const rng = makeRng(hashSeed('myopathy', seed));
  for (const f of pool.fibers) {
    if (f.state !== F_INNERVATED && f.state !== F_REINNERVATED) continue;
    if (rng.next() < fiberLoss) {
      f.state = F_LOST;
      continue;
    }
    // atrophic and hypertrophic fibres → variable amplitude and conduction velocity
    const k = Math.exp(rng.normal(-0.08 * sizeVar, 0.32 * sizeVar));
    f.diam = Math.max(0.35, f.diam * k);
    if (irritability && rng.next() < 0.02 + 0.05 * fiberLoss) {
      f.irritable = true;
      f.fibrillating = true;
      f.fibAmp = 1;
      f.fibRate = rng.uniform(PV.fibRateHz[0], PV.fibRateHz[1]);
      f.fibPhase = rng.next();
    }
  }
  pool.version += 1;
  return pool;
}

// Irritability without fibre loss (e.g. to separate the two controls).
export function applyIrritabilityOnly(pool, seed = 1, fraction = 0.03) {
  const rng = makeRng(hashSeed('irrit', seed));
  for (const f of pool.fibers) {
    if (f.state === F_LOST) continue;
    if (rng.next() < fraction) {
      f.irritable = true;
      f.fibrillating = true;
      f.fibAmp = 1;
      f.fibRate = rng.uniform(PV.fibRateHz[0], PV.fibRateHz[1]);
      f.fibPhase = rng.next();
    }
  }
  pool.version += 1;
  return pool;
}
