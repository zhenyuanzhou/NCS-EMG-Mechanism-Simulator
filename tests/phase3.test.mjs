// Phase 3 causal checks: NMJ (RNS, SFEMG), late responses, technical confounders.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeNMJ, nmjDefaults } from '../src/ui/modules/nmj.js';
import { computeLate, lateDefaults } from '../src/ui/modules/late.js';
import { computeTech, techDefaults } from '../src/ui/modules/tech.js';

const nmj = (o) => computeNMJ({ ...nmjDefaults(), ...o });
const late = (o) => computeLate({ ...lateDefaults(), ...o });
const tech = (o) => computeTech({ ...techDefaults(), ...o });

test('RNS normal: no decrement at 3 Hz; rapid RNS at most pseudofacilitation ≤40% (p.61–65)', () => {
  assert.ok(nmj({ disease: 'normal', protocol: 'slow' }).trains[0].dec < 5);
  const r = nmj({ disease: 'normal', protocol: 'rapid' }).trains[0];
  assert.ok(r.inc <= 40, `inc ${r.inc}`);
});

test('MG (postsynaptic): normal baseline CMAP, slow-RNS decrement >10% with U-shape (p.59, 64)', () => {
  const r = nmj({ disease: 'mg', severity: 0.7, protocol: 'slow' });
  const t = r.trains[0];
  assert.ok(t.amps[0] > 0.9 * r.ref, 'baseline normal');
  assert.ok(t.dec > 10, `decrement ${t.dec}`);
  const iMin = t.amps.slice(0, 6).indexOf(Math.min(...t.amps.slice(0, 6)));
  assert.ok(iMin >= 2 && iMin <= 5, `min at ${iMin + 1}`);
  assert.ok(t.amps[9] > t.amps[iMin], 'recovery after mobilization');
});

test('LEMS (presynaptic): low baseline, increment >100% after rapid RNS and after brief exercise (p.60, 65)', () => {
  const s = nmj({ disease: 'lems', severity: 0.8, protocol: 'slow' });
  assert.ok(s.trains[0].amps[0] < 0.5 * s.ref);
  assert.ok(nmj({ disease: 'lems', severity: 0.8, protocol: 'rapid' }).trains[0].inc > 100);
  assert.ok(nmj({ disease: 'lems', severity: 0.8, protocol: 'exercise' }).exInc > 100);
});

test('postexercise exhaustion: decrement worse 2–4 min after exercise than at baseline (p.60)', () => {
  const r = nmj({ disease: 'mg', severity: 0.6, protocol: 'exhaust' });
  const base = r.trains[0].dec;
  const late3 = r.trains.find((x) => x.min === 3).dec;
  const imm = r.trains.find((x) => x.min === 0).dec;
  assert.ok(late3 > base && imm <= base, `base ${base} 0min ${imm} 3min ${late3}`);
});

test('SFEMG: jitter rises in MG, LEMS and reinnervation (not specific); blocking appears at high jitter (p.658–662, 681)', () => {
  const n = nmj({ study: 'sfemg', disease: 'normal' }).sf;
  for (const d of ['mg', 'lems', 'reinn']) assert.ok(nmj({ study: 'sfemg', disease: d, severity: 0.7 }).sf.mcd > 2 * n.mcd, d);
  assert.equal(n.blockPct, 0);
  const sev = nmj({ study: 'sfemg', disease: 'mg', severity: 0.75 }).sf;
  assert.ok(sev.blockPct > 0 && sev.mcd > 80, `MCD ${sev.mcd} block ${sev.blockPct}`);
});

test('F wave: small (1–5% of CMAP), variable; proximal stimulation lengthens M and shortens F (p.41–43)', () => {
  const w = late({ stim: 'wrist' });
  const e = late({ stim: 'elbow' });
  const pct = (100 * w.ab.fAmpMean) / w.ab.mM.amp;
  assert.ok(pct >= 0.5 && pct <= 6, `F/M ${pct}`);
  assert.ok(w.ab.chrono > 0, 'latency varies');
  assert.ok(e.ab.mM.onset > w.ab.mM.onset && e.ab.minLat < w.ab.minLat);
});

test('proximal demyelination: distal NCS normal but F prolonged beyond the F estimate (p.46, 265)', () => {
  const n = late({ lesion: 'none' });
  const p = late({ lesion: 'proxDemyel', severity: 0.8 });
  assert.ok(Math.abs(p.ab.mM.onset - n.ab.mM.onset) < 0.1 && Math.abs(p.ab.mM.amp - n.ab.mM.amp) / n.ab.mM.amp < 0.05);
  assert.ok(p.ab.minLat > n.ab.minLat + 2 && p.ab.minLat > p.est.est + 1);
});

test('H reflex: H without M at low intensity, falls by collision as M grows, absent at supramaximal (p.47–48)', () => {
  const lo = late({ response: 'h', intensity: 8 });
  assert.ok(lo.cur.hAmp > 0.2 && lo.cur.mAmp < 0.1 * lo.mMax);
  const peak = Math.max(...lo.curve.map((p) => p.hAmp));
  const hi = late({ response: 'h', intensity: 34 });
  assert.ok(hi.cur.hAmp < 0.6 * peak && hi.cur.mAmp > lo.cur.mAmp);
  assert.ok(lo.supra.hAmp < 0.01);
  assert.ok(lo.hMax / lo.mMax <= 0.5, 'H/M ≤ 50%');
});

test('cooling: slower CV, longer latency, larger/longer SNAP (p.78–79)', () => {
  const a = tech({ study: 'motor' });
  const b = tech({ study: 'motor', tempC: 26 });
  assert.ok(b.cv < a.cv - 8 && b.cur.m.onset > a.cur.m.onset);
  const s = tech({ study: 'sensory' });
  const t = tech({ study: 'sensory', tempC: 26 });
  assert.ok(t.cur.m.amp > s.cur.m.amp && t.cur.m.duration > s.cur.m.duration);
});

test('submaximal stimulation lowers amplitude; G1 off the motor point gives initial positivity (p.21, 32)', () => {
  const a = tech({});
  assert.ok(tech({ intensity: 24 }).cur.m.amp < 0.9 * a.cur.m.amp);
  const off = tech({ offset: 20 }).cur.m;
  assert.ok(off.initialPositive > 0 && off.amp < a.cur.m.amp);
});

test('filters and display sensitivity change the measurement, not the physiology (p.83, 97)', () => {
  const a = tech({}).cur.m;
  assert.ok(tech({ filter: 'lowHFF' }).cur.m.negPeakLat > a.negPeakLat);
  assert.ok(tech({ filter: 'highLFF' }).cur.m.duration < a.duration);
  const hiSens = tech({ gainIdx: 0 }).cur.m;
  const loSens = tech({ gainIdx: 4 }).cur.m;
  assert.ok(hiSens.onset < loSens.onset && hiSens.negPeakLat === loSens.negPeakLat);
});
