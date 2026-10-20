// Muscle and motor-unit pool.
//
// One muscle (APB-like) is modelled as a cross-section of individual muscle fibres.
// Every fibre belongs to exactly one motor unit (or is denervated / lost). Fibres of
// different units are intermingled (the "mosaic" pattern, textbook p.245, Fig 15.2).
// The same pool feeds the surface CMAP (NCS) and the needle MUAPs (EMG), so a lesion
// changes both views consistently.

import { makeRng, hashSeed } from '../core/rng.js';
import { PV } from '../core/params.js';

export const MUSCLE_W = 20; // mm (cross-section width)
export let CV_SD = 0.08; // fibre CV scatter within a unit (illustrative, calibrated)
export let ZEP_SD = 0.5; // endplate scatter within a unit (mm, illustrative, calibrated)
export let TERM_SD = 0.2; // terminal-branch/NMJ delay scatter (ms, illustrative, calibrated)
export function _setScatter(cv, z, t) { CV_SD = cv; ZEP_SD = z; TERM_SD = t; }
export const MUSCLE_H = 12; // mm (depth below the fascia)

// Fibre states
export const F_INNERVATED = 0;
export const F_DENERVATED = 1; // orphaned after axon loss
export const F_LOST = 2; // fibre destroyed (myopathy) – contributes nothing
export const F_REINNERVATED = 3; // adopted by a sprout of another unit

export function buildMusclePool(seed = 1, nUnits = PV.nMotorAxons) {
  const rng = makeRng(hashSeed('muscle', seed));
  // ----- motor units: size principle (small, low-threshold units first) -----
  const units = [];
  for (let i = 0; i < nUnits; i++) {
    const rank = i / (nUnits - 1); // 0 = smallest/lowest threshold
    const sizeW = 0.55 + 1.15 * Math.pow(rank, 1.3) * rng.uniform(0.85, 1.15);
    const terrDiam = PV.muTerritoryMinMm + (PV.muTerritoryMaxMm - PV.muTerritoryMinMm) * Math.min(1, 0.15 + 0.85 * rank * rng.uniform(0.8, 1.1));
    const radius = terrDiam / 2;
    const cx = rng.uniform(radius * 0.55, MUSCLE_W - radius * 0.55);
    const cy = rng.uniform(radius * 0.45, MUSCLE_H - radius * 0.45);
    units.push({
      id: i,
      zEpCenter: rng.normal(0, 5), // each unit's endplate band lies at a slightly different level (illustrative)
      rank,
      sizeW,
      cx,
      cy,
      radius,
      baseRadius: radius,
      threshold: rank, // recruitment threshold in neural-drive units (calibrated in recruitment.js)
      alive: true,
      fibers: [],
    });
  }
  // ----- fibres on a jittered hexagonal grid -----
  const sp = PV.fiberSpacingMm;
  const fibers = [];
  const rowH = sp * 0.866;
  let row = 0;
  for (let y = sp / 2; y < MUSCLE_H; y += rowH, row++) {
    for (let x = (row % 2 ? sp / 2 : 0) + sp / 4; x < MUSCLE_W; x += sp) {
      const fx = x + rng.uniform(-0.25, 0.25) * sp;
      const fy = y + rng.uniform(-0.25, 0.25) * sp;
      // candidate units whose territory covers this fibre
      let total = 0;
      const cand = [];
      for (const u of units) {
        const dx = fx - u.cx;
        const dy = fy - u.cy;
        const d2 = dx * dx + dy * dy;
        if (d2 <= u.radius * u.radius) {
          // density ∝ size / territory area, slightly higher towards the territory centre
          const w = (u.sizeW / (u.radius * u.radius)) * (1.2 - 0.4 * (d2 / (u.radius * u.radius)));
          cand.push([u, w]);
          total += w;
        }
      }
      if (!cand.length) continue;
      let pick = rng.uniform(0, total);
      let owner = cand[0][0];
      for (const [u, w] of cand) {
        pick -= w;
        if (pick <= 0) {
          owner = u;
          break;
        }
      }
      const f = {
        id: fibers.length,
        x: fx,
        y: fy,
        unit: owner.id,
        origUnit: owner.id,
        state: F_INNERVATED,
        diam: Math.max(0.6, rng.normal(1, 0.09)), // relative diameter
        cvFactor: Math.max(0.7, rng.normal(1, CV_SD)), // fibre-to-fibre CV scatter (illustrative)
        zEp: owner.zEpCenter + rng.normal(0, ZEP_SD), // endplate axial position (mm): compact band within a unit
        termDelay: Math.abs(rng.normal(0, TERM_SD)), // terminal-branch + NMJ delay scatter (ms)
        sproutDelay: 0, // extra delay through an immature sprout (ms)
        sproutJitter: 0, // extra transmission variability (ms)
        sproutBlock: 0, // probability of transmission failure in immature NMJ
        reinnervDay: null,
        denervDay: null,
        fibrillating: false,
        nmjGain: Math.max(0.55, rng.normal(1, 0.12)), // EPP gain (safety-factor scatter)
        irritable: false,
      };
      fibers.push(f);
      owner.fibers.push(f.id);
    }
  }
  return { seed, units, fibers, version: 0 };
}

// Deep-enough copy so lesions can be applied without touching the cached normal pool.
export function clonePool(pool) {
  return {
    seed: pool.seed,
    version: pool.version + 1,
    units: pool.units.map((u) => ({ ...u, fibers: u.fibers.slice() })),
    fibers: pool.fibers.map((f) => ({ ...f })),
  };
}

// Number of functioning fibres and summed relative force capacity of a unit.
export function unitStats(pool, u) {
  let n = 0;
  let force = 0;
  for (const fid of u.fibers) {
    const f = pool.fibers[fid];
    if (f.state === F_LOST) continue;
    if (f.state === F_DENERVATED) continue;
    n += 1;
    force += f.diam * f.diam;
  }
  return { nFibers: n, force };
}

// Spatial index for fast "fibres near the needle" queries.
export function buildGrid(pool, cell = 1) {
  const nx = Math.ceil(MUSCLE_W / cell);
  const ny = Math.ceil(MUSCLE_H / cell);
  const cells = Array.from({ length: nx * ny }, () => []);
  for (const f of pool.fibers) {
    const i = Math.min(nx - 1, Math.floor(f.x / cell));
    const j = Math.min(ny - 1, Math.floor(f.y / cell));
    cells[j * nx + i].push(f.id);
  }
  return { cell, nx, ny, cells };
}

export function fibersNear(pool, grid, x, y, radius) {
  const out = [];
  const { cell, nx, ny, cells } = grid;
  const i0 = Math.max(0, Math.floor((x - radius) / cell));
  const i1 = Math.min(nx - 1, Math.floor((x + radius) / cell));
  const j0 = Math.max(0, Math.floor((y - radius) / cell));
  const j1 = Math.min(ny - 1, Math.floor((y + radius) / cell));
  const r2 = radius * radius;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      for (const id of cells[j * nx + i]) {
        const f = pool.fibers[id];
        const dx = f.x - x;
        const dy = f.y - y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2) out.push([f, Math.sqrt(d2)]);
      }
    }
  }
  return out;
}
