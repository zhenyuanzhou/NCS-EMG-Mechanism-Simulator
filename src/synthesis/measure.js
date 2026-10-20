// Measurements taken directly from generated signals (so the numbers always agree with
// the trace). Conventions follow the textbook:
//   CMAP/SNAP (p.24, p.26, Fig 3.2, 3.5): onset latency to the first deflection from
//   baseline (SNAP: to the initial positive peak if triphasic); amplitude baseline → negative
//   peak; duration = negative-peak duration (onset → first baseline crossing); area =
//   negative-peak area.
//   MUAP (p.247–249, Fig 15.5): duration from first departure to final return to baseline;
//   amplitude peak-to-peak; phases = baseline crossings + 1; major spike rise time.
// Signals are physical (negative = negative); the display flips them (negative up).

import { DT } from './volume.js';

export function measureCompound(sig, { kind = 'cmap', tStartMs = 0.6, noiseFloor = 0, onsetThr = null } = {}) {
  const n = sig.length;
  const i0 = Math.max(1, Math.round(tStartMs / DT));
  // negative peak (largest negative value)
  let iNeg = -1;
  let vNeg = 0;
  for (let i = i0; i < n; i++) {
    if (sig[i] < vNeg) {
      vNeg = sig[i];
      iNeg = i;
    }
  }
  if (iNeg < 0 || -vNeg <= Math.max(noiseFloor * 4, 1e-6)) {
    return { present: false, onset: null, amp: 0, negPeakLat: null, duration: null, area: 0, p2p: 0 };
  }
  const amp = -vNeg;
  const thr = Math.max(0.02 * amp, noiseFloor * 3);
  // start of the negative lobe (zero crossing before the negative peak)
  let iNegStart = iNeg;
  while (iNegStart > i0 && sig[iNegStart - 1] < 0) iNegStart--;
  // is there a positive lobe immediately before it?
  let iPos = -1;
  let vPos = 0;
  let k = iNegStart - 1;
  while (k > i0 && sig[k] >= -thr * 0.25) {
    if (sig[k] > vPos) {
      vPos = sig[k];
      iPos = k;
    }
    if (sig[k] <= thr * 0.25 && vPos > thr) break; // reached the start of the positive lobe
    k--;
  }
  const hasInitPos = iPos >= 0 && vPos > Math.max(thr, 0.05 * amp);
  // onset = first departure from baseline of the whole response
  let iOn;
  // onset: walk back until the trace is within the detection threshold (a reader's visual
  // threshold when onsetThr is given: depends on display sensitivity, p.97)
  const oThr = onsetThr ?? thr;
  if (hasInitPos) {
    iOn = iPos;
    while (iOn > i0 && Math.abs(sig[iOn - 1]) > oThr) iOn--;
  } else {
    iOn = iNeg;
    while (iOn > i0 && Math.abs(sig[iOn - 1]) > oThr) iOn--;
    iNegStart = Math.min(iNegStart, iOn);
  }
  let onsetIdx = iOn;
  let onsetRule = hasInitPos ? 'first deflection (initial positivity present)' : 'first negative deflection';
  if (hasInitPos && kind === 'snap') {
    onsetIdx = iPos;
    onsetRule = 'initial positive peak (triphasic SNAP)';
  }
  // first baseline crossing after the negative peak
  let iCross = iNeg;
  while (iCross < n - 1 && sig[iCross] < 0) iCross++;
  // negative-peak area (above baseline in display convention)
  let area = 0;
  for (let i = iNegStart; i < iCross; i++) if (sig[i] < 0) area += -sig[i] * DT;
  let vMax = 0;
  for (let i = iNeg; i < Math.min(n, iNeg + Math.round(15 / DT)); i++) vMax = Math.max(vMax, sig[i]);
  return {
    present: true,
    onset: onsetIdx * DT,
    onsetRule,
    initialPositive: hasInitPos ? vPos : 0,
    amp,
    negPeakLat: iNeg * DT,
    duration: (iCross - iNegStart) * DT,
    area,
    p2p: amp + vMax,
    negStart: iNegStart * DT,
    negEnd: iCross * DT,
  };
}

export function measureMUAP(sig, { thrAbs = 0.015 } = {}) {
  // thrAbs in mV (15 µV) – an illustrative algorithmic window, not a clinical criterion
  const n = sig.length;
  let vMax = -Infinity;
  let vMin = Infinity;
  let iMax = 0;
  let iMin = 0;
  for (let i = 0; i < n; i++) {
    if (sig[i] > vMax) {
      vMax = sig[i];
      iMax = i;
    }
    if (sig[i] < vMin) {
      vMin = sig[i];
      iMin = i;
    }
  }
  const p2p = vMax - vMin;
  if (p2p < 0.02) return { present: false, p2p, duration: 0, phases: 0, turns: 0, riseTime: null };
  const thr = Math.max(thrAbs, 0.02 * p2p);
  let a = 0;
  while (a < n && Math.abs(sig[a]) < thr) a++;
  let b = n - 1;
  while (b > a && Math.abs(sig[b]) < thr) b--;
  // phases: lobes between baseline crossings whose peak exceeds the window threshold;
  // phases = significant baseline crossings + 1 (Fig 15.5)
  const lobes = [];
  let cur = null;
  for (let i = a; i <= b; i++) {
    const sg = sig[i] >= 0 ? 1 : -1;
    if (!cur || sg !== cur.sign) {
      cur = { sign: sg, peak: 0 };
      lobes.push(cur);
    }
    cur.peak = Math.max(cur.peak, Math.abs(sig[i]));
  }
  const sigLobes = [];
  for (const l of lobes) {
    if (l.peak < thr) continue;
    if (sigLobes.length && sigLobes[sigLobes.length - 1].sign === l.sign) continue;
    sigLobes.push(l);
  }
  const crossings = Math.max(0, sigLobes.length - 1);
  // turns (serrations): direction changes with ≥ 20 µV excursion
  let turns = 0;
  let dir = 0;
  let ext = sig[a];
  for (let i = a + 1; i <= b; i++) {
    const v = sig[i];
    if (dir >= 0) {
      if (v > ext) ext = v;
      else if (ext - v > 0.02) {
        if (dir === 1) turns++;
        dir = -1;
        ext = v;
      } else if (dir === 0 && v < ext) {
        // undecided start
      }
      if (dir === 0 && v - sig[a] > 0.02) dir = 1;
    } else {
      if (v < ext) ext = v;
      else if (v - ext > 0.02) {
        turns++;
        dir = 1;
        ext = v;
      }
    }
  }
  // major spike: largest positive-to-negative deflection (positive peak before the negative peak)
  let iPosBefore = iMin;
  let vp = -Infinity;
  for (let i = Math.max(0, iMin - Math.round(3 / DT)); i < iMin; i++) {
    if (sig[i] > vp) {
      vp = sig[i];
      iPosBefore = i;
    }
  }
  return {
    present: true,
    p2p,
    amp: p2p,
    duration: (b - a) * DT,
    start: a * DT,
    end: b * DT,
    phases: crossings + 1,
    turns,
    riseTime: (iMin - iPosBefore) * DT,
    negPeak: iMin * DT,
  };
}

export function rms(sig) {
  let s = 0;
  for (const v of sig) s += v * v;
  return Math.sqrt(s / sig.length);
}

export function percentDrop(distal, proximal) {
  if (!distal) return null;
  return (100 * (distal - proximal)) / distal;
}
