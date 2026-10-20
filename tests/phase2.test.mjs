// Phase 2 causal checks: spontaneous-activity generators, localization patterns, time course.
// Directions and qualitative patterns only (teaching model), each traced to the textbook.

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSpont, spontDefaults } from '../src/ui/modules/spont.js';
import { computeLocalize, locDefaults } from '../src/ui/modules/localize.js';
import { computeNCS, ncsDefaults } from '../src/ui/modules/ncs.js';
import { pswWaveform } from '../src/synthesis/emg.js';
import { fibOnsetDays } from '../src/physiology/lesions.js';

const sp = (o) => computeSpont({ ...spontDefaults(), ...o }).meas;
const loc = (o) => computeLocalize({ ...locDefaults(), ...o });
const nerve = (r, id) => r.nerves.find((n) => n.id === id);
const muscle = (r, id) => r.muscles.find((m) => m.id === id);
const abnormal = (m) => m.grade > 0 || m.muap !== 'normal' || m.recruit !== 'normal';

test('fibrillation: brief spike, initial positive, very regular (p.234)', () => {
  const m = sp({ type: 'fib' });
  assert.equal(m.initial, 1);
  assert.ok(m.isiCV < 5, `ISI CV ${m.isiCV}`);
  assert.ok(m.duration >= 1 && m.duration <= 5, `duration ${m.duration}`);
  assert.ok(m.p2p >= 10 && m.p2p <= 150, `amplitude ${m.p2p} µV`);
});

test('chronic denervation: tiny fibrillations (<10–20 µV) after >6–12 months (p.234)', () => {
  const a = sp({ type: 'fib', months: 1 });
  const b = sp({ type: 'fib', months: 15 });
  assert.ok(b.p2p < a.p2p / 4, `${a.p2p} → ${b.p2p}`);
});

test('several regular generators look irregular when pooled', () => {
  const m = sp({ type: 'fib', nSources: 3 });
  assert.ok(m.isiCV < 5 && m.pooledCV > 25, `single ${m.isiCV} pooled ${m.pooledCV}`);
});

test('PSW: monophasic positive wave when the AP stops at the needle-deformed zone (p.234–235)', () => {
  const w = pswWaveform(0.1, 8);
  let mx = 0;
  let mn = 0;
  for (const v of w) {
    mx = Math.max(mx, v);
    mn = Math.min(mn, v);
  }
  assert.ok(mx > 3 * Math.abs(mn), `max ${mx} min ${mn}`);
  assert.equal(sp({ type: 'psw' }).initial, 1);
});

test('endplate spike: initial negative and irregular, unlike fibrillation (p.233)', () => {
  const m = sp({ type: 'endplate', epKind: 'spikes' });
  assert.equal(m.initial, -1);
  assert.ok(m.isiCV > 30, `CV ${m.isiCV}`);
});

test('myotonic discharge: same single-fibre morphology, waxing–waning rate 20–150 Hz (p.238)', () => {
  const m = sp({ type: 'myotonic' });
  assert.equal(m.initial, 1);
  assert.ok(m.fMin >= 19 && m.fMax <= 151 && m.fMax / m.fMin > 3, `${m.fMin}–${m.fMax}`);
});

test('CRD: perfectly regular, no jitter; a dropped fibre changes the rate abruptly (p.236–238)', () => {
  const a = sp({ type: 'crd' });
  assert.ok(a.isiCV < 0.5 && a.jitter < 0.5, `CV ${a.isiCV} jitter ${a.jitter}`);
  const b = sp({ type: 'crd', crdDrop: true });
  assert.ok(b.fMax > a.fMax * 1.05, `${a.fMax} → ${b.fMax}`);
});

test('fasciculation: MUAP morphology, slower than any voluntary unit (<4–5 Hz, p.232, 238)', () => {
  const m = sp({ type: 'fasc' });
  assert.ok(m.rate < 4, `rate ${m.rate}`);
  assert.ok(m.duration > 4, `duration ${m.duration}`);
  const r = sp({ type: 'fasc', fascUnit: 'reinnervated' });
  assert.ok(r.p2p > m.p2p && r.duration > m.duration, 'reinnervated unit is larger and longer');
});

test('radiculopathy (preganglionic): SNAPs preserved while C8 muscles are denervated (p.28–29, 561)', () => {
  const r = loc({ lesion: 'c8', sev: 0.6, day: 35 });
  for (const n of r.nerves.filter((x) => x.kind === 'sensory')) assert.ok(n.pct > 95, `${n.id} ${n.pct}`);
  assert.ok(nerve(r, 'ulnMot').pct < 90);
  for (const id of ['apb', 'fdi', 'adm', 'eip', 'fpl', 'paraspinal']) assert.ok(abnormal(muscle(r, id)), id);
  for (const id of ['deltoid', 'biceps']) assert.ok(!abnormal(muscle(r, id)), id);
});

test('lower-trunk plexopathy: ulnar and MABC SNAPs fall, median index SNAP and paraspinals normal (p.563, 584)', () => {
  const r = loc({ lesion: 'lowerTrunk', sev: 0.6, day: 35 });
  assert.ok(nerve(r, 'ulnSen').pct < 50 && nerve(r, 'mabc').pct < 50);
  assert.ok(nerve(r, 'medSen').pct > 95);
  assert.ok(!abnormal(muscle(r, 'paraspinal')));
});

test('ulnar neuropathy at the elbow: MABC, APB and EIP spared (separates it from C8/lower trunk)', () => {
  const r = loc({ lesion: 'ulnarElbow', sev: 0.6, day: 35 });
  assert.ok(nerve(r, 'mabc').pct > 95 && nerve(r, 'ulnSen').pct < 50);
  for (const id of ['apb', 'eip', 'fpl']) assert.ok(!abnormal(muscle(r, id)), id);
  assert.ok(abnormal(muscle(r, 'fdi')));
});

test('length-dependent polyneuropathy: distal before proximal, legs before hands', () => {
  const r = loc({ lesion: 'lengthDep', sev: 0.6, day: 60 });
  assert.ok(nerve(r, 'sural').pct < nerve(r, 'medSen').pct);
  assert.ok(!abnormal(muscle(r, 'deltoid')) && abnormal(muscle(r, 'apb')));
});

test('motor neuron disease: pure motor, SNAPs normal (p.528–534)', () => {
  const r = loc({ lesion: 'mnd', sev: 0.6, day: 60 });
  for (const n of r.nerves.filter((x) => x.kind === 'sensory')) assert.ok(n.pct > 95, n.id);
  assert.ok(r.muscles.every(abnormal));
});

test('myopathy: normal NCS; proximal MUAPs small with early recruitment (p.256–257, 677)', () => {
  const r = loc({ lesion: 'myopathy', sev: 0.7, day: 60, inflam: false });
  for (const n of r.nerves.filter((x) => x.kind === 'sensory')) assert.ok(n.pct > 95, n.id);
  const d = muscle(r, 'deltoid');
  assert.equal(d.muap, 'myopathic');
  assert.equal(d.recruit, 'early');
});

test('fibrillations appear in order of lesion-to-muscle length (p.236)', () => {
  assert.ok(fibOnsetDays(40) < fibOnsetDays(760));
  const early = loc({ lesion: 'c8', sev: 0.6, day: 14 });
  assert.ok(muscle(early, 'paraspinal').grade > 0, 'paraspinal fibs by day 14');
  assert.equal(muscle(early, 'apb').grade, 0, 'APB not yet');
  const late = loc({ lesion: 'c8', sev: 0.6, day: 35 });
  assert.ok(muscle(late, 'apb').grade > 0, 'APB by day 35');
});

test('hyperacute axonal lesion: distal CMAP normal, across-lesion reduced (pseudo-block, p.34–35)', () => {
  const p = { ...ncsDefaults(), study: 'motor', day: 1 };
  p.axonal = { ...p.axonal, on: true, frac: 0.6, population: 'motor' };
  const r = computeNCS(p);
  const w = r.rows.find((x) => x.key === 'wrist');
  const e = r.rows.find((x) => x.key === 'elbow');
  assert.ok(w.mAb.amp > 0.9 * w.mNm.amp, 'distal normal');
  assert.ok(e.mAb.amp < 0.6 * e.mNm.amp, 'across lesion reduced');
});
