// A "subject" bundles one nerve, one muscle and their normal reference values.
// scenario() applies a parameter set (lesion, time since onset, myopathy, temperature …)
// to a copy, so every module can show the abnormal state next to the identical normal one.

import { buildMusclePool, clonePool, buildGrid, F_LOST } from './muscle.js';
import { buildNerve, prepareLesion, conduct, POS, LESION_SITES } from './nerve.js';
import { applyNeurogenic, applyMyopathy, applyIrritabilityOnly } from './lesions.js';
import { maxForceOf } from './recruitment.js';
import { synthCMAP, synthSNAP } from '../synthesis/ncs.js';
import { measureCompound } from '../synthesis/measure.js';
import { PV } from '../core/params.js';

export const NORMAL_CMAP_MV = 9; // display calibration of the normal median CMAP (illustrative)
export const NORMAL_SNAP_UV = 35; // display calibration of the normal antidromic SNAP (illustrative)

const subjects = new Map();

export function getSubject(seed = 1) {
  if (subjects.has(seed)) return subjects.get(seed);
  const pool = buildMusclePool(seed);
  pool.tag = 'normal';
  const nerve = buildNerve(seed, pool);
  const grid = buildGrid(pool);
  const normalPrep = prepareLesion(nerve, {}, seed);
  const c = synthCMAP({ nerve, prep: normalPrep, pool, stimPos: POS.WRIST });
  const s = synthSNAP({ nerve, prep: normalPrep, stimPos: POS.WRIST });
  const cm = measureCompound(c.trace);
  const sm = measureCompound(s.trace, { kind: 'snap' });
  const subj = {
    seed,
    pool,
    nerve,
    grid,
    normalPrep,
    cmapScale: NORMAL_CMAP_MV / cm.amp,
    snapScale: NORMAL_SNAP_UV / 1000 / sm.amp, // traces in mV
    refMaxForce: maxForceOf(pool),
  };
  subjects.set(seed, subj);
  return subj;
}

export const DEFAULT_PARAMS = {
  seed: 1,
  day: 365,
  tempC: PV.refTempC,
  axonal: { on: false, site: 'forearm', frac: 0.5, population: 'both', selection: 'random' },
  demyel: { on: false, site: 'forearm', slowing: 0.5, dispersion: 0.3, block: 0, mechanism: 'demyelination', diffuseSlowing: 0 },
  mnd: { on: false, frac: 0.5 },
  reinnervation: 0.7,
  myopathy: { on: false, fiberLoss: 0.4, sizeVar: 0.5, irritability: false },
  irritabilityOnly: false,
  regeneration: { on: false, mmPerDay: 1 },
  centralCap: 1, // fraction of normal maximal drive that can be delivered (1 = normal)
  lesionToMuscleMm: null, // optional override of the lesion-to-muscle length (localization module)
};

export function lesionFromParams(p) {
  const lesion = { tempC: p.tempC };
  if (p.axonal && p.axonal.on) {
    const pop = p.axonal.population || 'both';
    const f = p.axonal.frac ?? 0.5;
    lesion.axonal = {
      ...p.axonal,
      fracMotor: p.axonal.fracMotor ?? (pop === 'sensory' ? 0 : f),
      fracSensory: p.axonal.fracSensory ?? (pop === 'motor' ? 0 : f),
    };
  }
  if (p.demyel && p.demyel.on) lesion.demyel = { ...p.demyel };
  return lesion;
}

const scenarioCache = new Map();

// Build the abnormal state for a parameter set. Returns { subj, pool, prep, lesion, day, unitLoss }.
export function scenario(p) {
  const subj = getSubject(p.seed || 1);
  const key = JSON.stringify(p);
  if (scenarioCache.has(key)) return scenarioCache.get(key);
  const lesion = lesionFromParams(p);
  const prep = prepareLesion(subj.nerve, lesion, p.seed || 1);
  const day = p.day ?? 365;
  let pool = subj.pool;
  const unitLoss = new Map();
  let lesionToMuscle = 400;
  if (lesion.axonal) {
    const site = LESION_SITES[lesion.axonal.site];
    lesionToMuscle = site.a - POS.MOTOR_POINT;
    subj.nerve.motor.forEach((ax, i) => {
      if (prep.motor[i].transected) unitLoss.set(i, ax.degenDay);
    });
  }
  if (p.mnd && p.mnd.on) {
    // anterior-horn-cell loss: whole motor units disappear (lesion at the cell body)
    lesionToMuscle = POS.CORD - POS.MOTOR_POINT;
    const n = Math.round(p.mnd.frac * subj.nerve.motor.length);
    const order = subj.nerve.motor.map((a, i) => i).sort((a, b) => ((a * 7919) % 113) - ((b * 7919) % 113));
    order.slice(0, n).forEach((i) => unitLoss.set(i, 0));
  }
  if (p.lesionToMuscleMm) lesionToMuscle = p.lesionToMuscleMm;
  // complete lesions: optional axonal regeneration from the injury site (≤1 mm/day, p.255)
  let regenerated = null;
  if (lesion.axonal && p.regeneration && p.regeneration.on) {
    regenerated = new Map();
    const rate = p.regeneration.mmPerDay || 1;
    const arrive = (lesionToMuscle) / rate + 10; // + latent period before sprouting (illustrative)
    for (const uid of unitLoss.keys()) {
      // not every regrowing axon reaches a muscle fibre (misdirection, failure; illustrative 65%)
      if ((uid * 2654435761) % 100 >= 65) continue;
      const jitter = ((uid * 7919) % 30) - 15;
      regenerated.set(uid, arrive + jitter);
      if (day >= arrive + jitter) {
        // regrown axon conducts again, slowly (thin, poorly myelinated regenerating fibre)
        const since = day - arrive - jitter;
        prep.motor[uid].transected = false;
        prep.motor[uid].cvScale = Math.min(0.85, 0.3 + 0.55 * (1 - Math.exp(-since / 200)));
      }
    }
  }
  const needCopy = unitLoss.size || (p.myopathy && p.myopathy.on) || p.irritabilityOnly || lesion.demyel || lesion.axonal;
  if (needCopy) {
    pool = clonePool(subj.pool);
    pool.tag = key;
    if (unitLoss.size) {
      applyNeurogenic(pool, unitLoss, { day, reinnervation: p.reinnervation ?? 0.7, lesionToMuscleMm: lesionToMuscle, seed: p.seed || 1, regenerated });
    }
    if (p.myopathy && p.myopathy.on) {
      applyMyopathy(pool, { fiberLoss: p.myopathy.fiberLoss, sizeVar: p.myopathy.sizeVar, irritability: p.myopathy.irritability, seed: p.seed || 1 });
    }
    if (p.irritabilityOnly) applyIrritabilityOnly(pool, p.seed || 1);
  }
  // voluntary availability: can a voluntary impulse from the cord reach the muscle?
  const voluntary = subj.nerve.motor.map((ax, i) => {
    if (unitLoss.has(i) && p.mnd && p.mnd.on) return false;
    const c = conduct(ax, prep.motor[i], POS.CORD, POS.MOTOR_POINT, lesion, day);
    return c.ok;
  });
  if (pool !== subj.pool) pool.units.forEach((u, i) => (u.voluntary = voluntary[i]));
  const res = { subj, pool, prep, lesion, day, unitLoss, voluntary, params: p };
  scenarioCache.set(key, res);
  if (scenarioCache.size > 30) scenarioCache.delete(scenarioCache.keys().next().value);
  return res;
}

export function normalScenario(seed = 1, tempC = PV.refTempC) {
  return scenario({ ...DEFAULT_PARAMS, seed, tempC });
}

export function countFibers(pool) {
  let alive = 0;
  for (const f of pool.fibers) if (f.state !== F_LOST) alive++;
  return alive;
}
