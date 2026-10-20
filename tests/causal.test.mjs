// Causal validation of the simulator (run: node --test tests/)
// Each test changes one mechanism and checks the DIRECTION of the consequence the
// textbook describes. Numerical tolerances are deliberately loose: the model is a teaching
// model, so we test causal behaviour, not clinical reference values.

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeNCS, ncsDefaults } from '../src/ui/modules/ncs.js';
import { computeEMG, emgDefaults } from '../src/ui/modules/emg.js';
import { fiberFieldSeries } from '../src/synthesis/volume.js';
import { shapeInfo } from '../src/ui/modules/basics.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
function ncs(patch = {}) {
  const p = ncsDefaults();
  for (const [k, v] of Object.entries(patch)) {
    const parts = k.split('.');
    let o = p;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = v;
  }
  return computeNCS(p);
}
function emg(patch = {}) {
  const p = emgDefaults();
  for (const [k, v] of Object.entries(patch)) {
    const parts = k.split('.');
    let o = p;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = v;
  }
  return computeEMG(p);
}
const row = (r, key) => r.rows.find((x) => x.key === key);

// ---------------------------------------------------------------------------------------
test('normal motor NCS resembles textbook normal behaviour (p.24–32)', () => {
  const r = ncs();
  const w = row(r, 'wrist').mAb;
  const e = row(r, 'elbow').mAb;
  assert.ok(w.present && e.present);
  assert.ok(w.duration > 4 && w.duration < 7, `CMAP negative duration ${w.duration} ms (textbook 5–6 ms)`);
  const ampDrop = (100 * (w.amp - e.amp)) / w.amp;
  const areaDrop = (100 * (w.area - e.area)) / w.area;
  const durInc = (100 * (e.duration - w.duration)) / w.duration;
  assert.ok(ampDrop < 20 && areaDrop < 20, `normal wrist→elbow drop ${ampDrop.toFixed(1)}%/${areaDrop.toFixed(1)}% (textbook ≤20%)`);
  assert.ok(durInc < 16, `normal duration increase ${durInc.toFixed(1)}% (textbook ≤15%)`);
  const cv = r.segs[0].cvAb;
  assert.ok(cv > 49 && cv < 66, `forearm CV ${cv}`);
});

test('normal SNAP: proximal stimulation lowers amplitude and area far more than for CMAP (p.30–32)', () => {
  const s = ncs({ study: 'sensory' });
  const m = ncs();
  const sDrop = 1 - row(s, 'elbow').mAb.amp / row(s, 'wrist').mAb.amp;
  const mDrop = 1 - row(m, 'elbow').mAb.amp / row(m, 'wrist').mAb.amp;
  assert.ok(sDrop > 0.5, `SNAP drop ${sDrop}`);
  assert.ok(sDrop > 2 * mDrop, `SNAP drop ${sDrop} vs CMAP drop ${mDrop}`);
  assert.ok(row(s, 'elbow').mAb.area < 0.6 * row(s, 'wrist').mAb.area, 'phase cancellation lowers SNAP area');
});

// (1) Slower conduction delays arrival -----------------------------------------------------
test('V1: slower conduction delays arrival (and lowers segmental CV) without changing distal latency', () => {
  const a = ncs();
  const b = ncs({ 'demyel.on': true, 'demyel.slowing': 0.5, 'demyel.dispersion': 0, 'demyel.block': 0 });
  assert.ok(row(b, 'elbow').mAb.onset > row(a, 'elbow').mAb.onset + 0.4, 'elbow latency increases');
  assert.ok(Math.abs(row(b, 'wrist').mAb.onset - row(a, 'wrist').mAb.onset) < 0.05, 'wrist (distal to lesion) unchanged');
  assert.ok(b.segs[0].cvAb < a.segs[0].cvAb * 0.9, 'forearm CV falls (focal slowing is diluted over the 230 mm segment)');
  // diffuse slowing delays everything
  const c = ncs({ 'demyel.on': true, 'demyel.site': 'diffuse', 'demyel.diffuseSlowing': 0.4 });
  assert.ok(row(c, 'wrist').mAb.onset > row(a, 'wrist').mAb.onset + 0.5, 'distal latency prolongs with diffuse slowing');
});

// (2) Increased dispersion broadens the response and may reduce its peak -------------------
test('V2: increased dispersion broadens the compound response and reduces its peak', () => {
  const a = ncs({ 'demyel.on': true, 'demyel.slowing': 0.5, 'demyel.dispersion': 0.0 });
  const b = ncs({ 'demyel.on': true, 'demyel.slowing': 0.5, 'demyel.dispersion': 1.2 });
  const ea = row(a, 'elbow').mAb;
  const eb = row(b, 'elbow').mAb;
  assert.ok(eb.duration > ea.duration * 1.15, `duration ${ea.duration} → ${eb.duration}`);
  assert.ok(eb.amp < ea.amp * 0.85, `peak ${ea.amp} → ${eb.amp}`);
  // no axon is lost or blocked: the distal response is identical
  assert.ok(Math.abs(row(b, 'wrist').mAb.amp - row(a, 'wrist').mAb.amp) < 1e-6);
  // all axons still arrive
  const nA = row(b, 'elbow').ab.arrivals.filter((x) => x.ok).length;
  assert.equal(nA, 120);
});

// (3) Focal block: stimulation across vs distal to the lesion -------------------------------
test('V3: a focal block affects stimulation across the lesion but not distal to it', () => {
  const n = ncs();
  const b = ncs({ 'demyel.on': true, 'demyel.slowing': 0.2, 'demyel.dispersion': 0.1, 'demyel.block': 0.6 });
  const wristRatio = row(b, 'wrist').mAb.area / row(n, 'wrist').mAb.area;
  const elbowRatio = row(b, 'elbow').mAb.area / row(n, 'elbow').mAb.area;
  assert.ok(wristRatio > 0.98, `distal area ratio ${wristRatio}`);
  assert.ok(elbowRatio < 0.55, `proximal area ratio ${elbowRatio}`);
  const areaDrop = 1 - row(b, 'elbow').mAb.area / row(b, 'wrist').mAb.area;
  assert.ok(areaDrop > 0.5, 'meets the >50% area-drop criterion (p.38)');
  // block placed proximal to all stimulation sites: NCS stay normal (Fig 3.20 bottom)
  const p = ncs({ 'demyel.on': true, 'demyel.site': 'plexus', 'demyel.block': 0.6 });
  for (const k of ['wrist', 'elbow', 'axilla']) assert.ok(Math.abs(row(p, k).mAb.amp - row(n, k).mAb.amp) < 1e-6);
});

test('hyperacute axonal injury gives pseudo-conduction block that resolves into axonal pattern (p.35)', () => {
  const d2 = ncs({ 'axonal.on': true, 'axonal.frac': 0.6, 'axonal.population': 'motor', day: 2 });
  const d14 = ncs({ 'axonal.on': true, 'axonal.frac': 0.6, 'axonal.population': 'motor', day: 14 });
  const n = ncs();
  assert.ok(row(d2, 'wrist').mAb.amp > 0.98 * row(n, 'wrist').mAb.amp, 'day 2: distal normal');
  assert.ok(row(d2, 'elbow').mAb.amp < 0.6 * row(n, 'elbow').mAb.amp, 'day 2: drop across lesion');
  assert.ok(row(d14, 'wrist').mAb.amp < 0.6 * row(n, 'wrist').mAb.amp, 'day 14: distal low too');
  const r14 = row(d14, 'elbow').mAb.amp / row(d14, 'wrist').mAb.amp;
  assert.ok(r14 > 0.75, 'day 14: no proximal drop any more');
});

test('axonal loss lowers amplitude at all sites with preserved CV; preganglionic lesion spares SNAP', () => {
  const n = ncs();
  const a = ncs({ 'axonal.on': true, 'axonal.frac': 0.5 });
  const ratio = row(a, 'wrist').mAb.amp / row(n, 'wrist').mAb.amp;
  assert.ok(ratio > 0.35 && ratio < 0.65, `amplitude ratio ${ratio}`);
  assert.ok(a.segs[0].cvAb > 0.9 * n.segs[0].cvAb, 'CV preserved');
  const sRoot = ncs({ study: 'sensory', 'axonal.on': true, 'axonal.frac': 0.9, 'axonal.site': 'rootPre' });
  const sNorm = ncs({ study: 'sensory' });
  assert.ok(Math.abs(row(sRoot, 'wrist').mAb.amp - row(sNorm, 'wrist').mAb.amp) < 1e-9, 'SNAP normal in preganglionic lesion');
  const sPlex = ncs({ study: 'sensory', 'axonal.on': true, 'axonal.frac': 0.9, 'axonal.site': 'plexus' });
  assert.ok(row(sPlex, 'wrist').mAb.amp < 0.3 * row(sNorm, 'wrist').mAb.amp, 'SNAP low in postganglionic lesion');
});

// (4) Collateral reinnervation -------------------------------------------------------------
test('V4: collateral reinnervation enlarges surviving units without restoring unit count', () => {
  const base = { 'axonal.on': true, 'axonal.frac': 0.6, day: 365, activity: 'mild', effortMode: 'force', targetForce: 15 };
  const none = emg({ ...base, reinnervation: 0 });
  const full = emg({ ...base, reinnervation: 0.9 });
  const n = emg({ activity: 'mild', effortMode: 'force', targetForce: 15 });
  assert.ok(full.sA.dur > none.sA.dur * 1.15, `duration ${none.sA.dur} → ${full.sA.dur}`);
  assert.ok(full.sA.amp > none.sA.amp * 1.1, `amplitude ${none.sA.amp} → ${full.sA.amp}`);
  assert.equal(full.aliveUnits, none.aliveUnits, 'number of units unchanged by reinnervation');
  assert.ok(full.aliveUnits < 0.5 * n.aliveUnits, 'unit count remains reduced');
  // reduced recruitment: fewer units at a higher rate for the same force
  assert.ok(full.stA.nActive < n.stA.nActive, 'fewer units recruited than normal for same force');
  assert.ok(full.rateA >= n.rateA, 'surviving units fire at least as fast');
  // CMAP partly recovers because amplitude counts muscle fibres, not axons
  const c0 = ncs({ 'axonal.on': true, 'axonal.frac': 0.6, 'axonal.population': 'motor', day: 365, reinnervation: 0 });
  const c1 = ncs({ 'axonal.on': true, 'axonal.frac': 0.6, 'axonal.population': 'motor', day: 365, reinnervation: 0.9 });
  assert.ok(row(c1, 'wrist').mAb.amp > row(c0, 'wrist').mAb.amp * 1.2, 'CMAP recovers with reinnervation');
});

test('acute neurogenic: reduced recruitment with normal MUAP morphology; early reinnervation unstable', () => {
  const acute = emg({ 'axonal.on': true, 'axonal.frac': 0.6, day: 7, activity: 'mild' });
  const n = emg({ activity: 'mild' });
  assert.ok(Math.abs(acute.sA.dur - n.sA.dur) < 0.3, 'MUAP duration unchanged acutely');
  assert.ok(acute.stA.nActive < n.stA.nActive, 'fewer units for same force');
  assert.equal(acute.fibrillating, 0, 'no fibrillations at day 7 for a forearm lesion');
  const later = emg({ 'axonal.on': true, 'axonal.frac': 0.6, day: 28, activity: 'rest', display: 'record' });
  assert.ok(later.fibrillating > 0, 'fibrillations by 4 weeks');
});

// (5) Myopathy: more recruitment for comparable force ---------------------------------------
test('V5: myopathic units require more recruitment for a comparable submaximal force', () => {
  const n = emg({ activity: 'mild', effortMode: 'force', targetForce: 20 });
  const m = emg({ activity: 'mild', effortMode: 'force', targetForce: 20, 'myopathy.on': true, 'myopathy.fiberLoss': 0.5 });
  assert.ok(m.stA.nActive > n.stA.nActive, `units ${n.stA.nActive} → ${m.stA.nActive}`);
  assert.ok(m.sA.dur < n.sA.dur && m.sA.amp < n.sA.amp, 'short, small MUAPs');
  assert.ok(m.sA.poly > n.sA.poly, 'more polyphasic');
  // matched drive: same units and rates, less force
  const nd = emg({ activity: 'mild', effortMode: 'drive', drive: 30 });
  const md = emg({ activity: 'mild', effortMode: 'drive', drive: 30, 'myopathy.on': true, 'myopathy.fiberLoss': 0.5 });
  assert.equal(md.stA.nActive, nd.stA.nActive, 'same units at the same drive');
  assert.ok(md.stA.forcePct < 0.75 * nd.stA.forcePct, 'less force at the same drive');
});

test('reduced central activation: sparse pattern without unit loss', () => {
  const c = emg({ activity: 'max', centralCap: 0.3 });
  const n = emg({ activity: 'max' });
  assert.ok(c.rateA < 0.75 * n.rateA, 'low firing rates');
  assert.equal(c.aliveUnits, n.aliveUnits, 'no unit loss');
  const ratio = c.rateA / Math.max(1, c.firingA.length);
  assert.ok(ratio < 7.5, `rate:units ratio stays near normal (${ratio})`);
});

// (6) Electrode movement changes morphology, not pathology ----------------------------------
test('V6: moving the electrode changes sampled morphology without changing the pathology', () => {
  const p1 = emg({ 'myopathy.on': true, 'myopathy.fiberLoss': 0.4 });
  const p2 = emg({ 'myopathy.on': true, 'myopathy.fiberLoss': 0.4, 'needle.x': 10.6, 'needle.y': 6.4 });
  assert.equal(p1.lost, p2.lost, 'same pathology');
  assert.equal(p1.sc.pool.version, p2.sc.pool.version);
  const u = [...p1.muaps.keys()].filter((k) => p2.muaps.has(k)).sort((a, b) => p1.qA.get(b).p2p - p1.qA.get(a).p2p)[0];
  assert.ok(u !== undefined);
  const a1 = p1.qA.get(u).p2p;
  const a2 = p2.qA.get(u).p2p;
  assert.ok(Math.abs(a1 - a2) / Math.max(a1, a2) > 0.1, 'amplitude of the same unit changes with needle position');
  // surface electrode: initial positivity appears off the motor point (Fig 2.20)
  const [on] = fiberFieldSeries({ v: 4, s: 0.7, halfLen: 30, endTaper: 10, T: 16, electrodes: [{ r: 0.5, z0: 0 }] });
  const [off] = fiberFieldSeries({ v: 4, s: 0.7, halfLen: 30, endTaper: 10, T: 16, electrodes: [{ r: 0.5, z0: 14 }] });
  const [beyond] = fiberFieldSeries({ v: 4, s: 0.7, halfLen: 30, endTaper: 10, T: 16, electrodes: [{ r: 0.5, z0: 44 }] });
  assert.equal(shapeInfo(on).first, '−', 'over the endplate: initially negative');
  assert.equal(shapeInfo(off).first, '+', 'approaching: initially positive');
  assert.equal(shapeInfo(off).lobes, '+ − +', 'approaching: triphasic');
  assert.ok(shapeInfo(beyond).pos > 2 * shapeInfo(beyond).neg, 'never reached: mainly positive');
});

test('measurements agree with the plotted signal (amplitude = −min of trace)', () => {
  const r = ncs();
  const w = row(r, 'wrist');
  let mn = 0;
  for (let i = 15; i < w.ab.trace.length; i++) mn = Math.min(mn, w.ab.trace[i]);
  assert.ok(Math.abs(-mn - w.mAb.amp) < 1e-9);
});

test('reproducibility: identical parameters give identical traces', () => {
  const a = emg({ activity: 'mild', display: 'record' });
  const b = emg({ activity: 'mild', display: 'record' });
  assert.deepEqual(Array.from(a.rec.slice(0, 2000)), Array.from(b.rec.slice(0, 2000)));
});
