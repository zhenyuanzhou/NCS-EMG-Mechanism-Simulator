# Model assumptions

The simulator is a **transparent, simplified generative model**. It is built to make causal
mechanisms visible, not to reproduce laboratory reference values. Every number that drives it
is listed (with provenance) in `src/core/params.js` and in the app under *Model & sources*.

## 1. What is explicitly modelled

### Volume conduction (`src/synthesis/volume.js`)
* Each fibre action potential has a fixed spatial profile (Rosenfalck 1969 intracellular
  profile, 96·z³·e^(−z)). Membrane current ∝ the second spatial derivative of membrane
  potential; the extracellular potential is the sum of these currents weighted by 1/distance
  (line-source model), integrated exactly over each spatial cell.
* Consequences that **emerge** rather than being drawn: triphasic (+ − +) potentials when an
  impulse approaches/passes/leaves, initial negativity when it starts under the electrode,
  mainly positive potentials when it never arrives (Fig 2.19–2.20), amplitude falling with
  distance, and phase cancellation in compound potentials.
* Other velocities are obtained by exact time-scaling of tabulated single-fibre potentials.

### Nerve (`src/physiology/nerve.js`)
* 120 motor and 600 sensory axons, each with its own conduction velocity (motor 36–62 m/s,
  bell-shaped, faster in larger units – size principle; sensory 34–64 m/s, broader).
* Conduction time is integrated segment by segment along a median-like limb (wrist, elbow,
  axilla, plexus, DRG, cord). Lesions act on individual axons:
  * **transection** – impulse cannot cross; distal stump degenerates after a per-axon
    Wallerian delay (motor 3–5 d, sensory 6–10 d); before that the distal stump still conducts
    (→ pseudo-conduction block);
  * **segmental demyelination** – per-axon velocity factor inside the lesion segment
    (mean slowing and between-axon variation are independent controls);
  * **conduction failure (block)** – a chosen fraction of axons stops at the segment
    (independent control); *nodal* mode gives failure without slowing;
  * **diffuse uniform slowing** (inherited-like);
  * **preganglionic root lesion** – sensory peripheral processes stay attached to the DRG and
    never degenerate.
* Temperature: CV scaled 2 m/s per °C (proportionally), DL change ≈0.2 ms/°C split between
  nerve and terminal/NMJ delay; cooling prolongs/enlarges fibre potentials.

### Muscle and motor units (`src/physiology/muscle.js`, `lesions.js`)
* ≈23,000 fibres in a 20 × 12 mm cross-section; 120 motor units with 5–10 mm territories,
  fibres of different units intermingled (mosaic). Each fibre has position, diameter,
  conduction-velocity factor, endplate position, terminal delay, NMJ gain.
* **Neurogenic:** lost units → their fibres denervated; fibrillation onset after a
  length-dependent delay (straight line through the textbook L5–S1 anchor points); orphaned
  fibres adopted by nearby surviving units (collateral sprouting) with immature sprouts
  (long delay, jitter, blocking = satellites/unstable MUAPs) maturing over months; chronic
  denervated fibres atrophy (tiny fibrillations).
* **Myopathic:** random fibre loss inside units, fibre-size variability (→ velocity and
  amplitude scatter), optional membrane irritability (independent switch).
* The **same pool** produces the surface CMAP and the needle MUAPs, so reinnervation also
  partly restores CMAP amplitude (amplitude counts fibres, not axons).

### Activation (`src/physiology/recruitment.js`)
* Neural drive, firing rate, recruited units and force are separate quantities:
  units recruited by threshold (size principle); onset 5 Hz, rate rising with drive to 45 Hz;
  force = Σ(unit fibre force × twitch-summation curve). Thresholds/gain calibrated so that
  ≈one new discernible unit appears per ≈5 Hz (textbook 5:1 rule).
* *Matched force* solves the drive needed for a target force; *matched drive* applies the
  same central command. Central weakness caps the achievable drive.
* Firing is semirhythmic (ISI CV 0.12) with reproducible seeds.

### Synthesis and measurement
* CMAP = Σ over units reached by the stimulus of that unit's bipolar (belly–tendon) surface
  potential, shifted by nerve + terminal delay. SNAP = Σ over sensory axons of travelling
  potentials at G1 minus G2. MUAP = Σ fibres of one unit near a concentric needle tip (tip
  potential minus a partial reference along the shaft).
* Measurements follow the textbook conventions (p.24–27, p.247–249) and are computed from the
  generated (noise-free) signal; displayed traces add a small stimulus artefact and noise.

### Spontaneous activity (`src/physiology/spontaneous.js`, `src/ui/modules/spont.js`)
* Each type is one **generator** with a firing-time process; the waveform comes from the same
  line-source needle model:
  * fibrillation – one denervated fibre, AP starting at the endplate and passing the tip;
    perfectly regular train with very slow drift (p.234); atrophy after 150 d of denervation
    shrinks diameter (amplitude ∝ d², velocity ∝ d; illustrative timing);
  * positive sharp wave – the same fibre with an inexcitable, passively (electrotonically)
    depolarised “crushed zone” under the tip (length constant 1 mm, zone 1 mm; illustrative);
    the recording surface over that zone sees a current source → monophasic positive wave
    (first explanation on p.235; the alternative “origin at the needle” view is quoted);
  * endplate noise – schematic monophasic negative MEPPs (Poisson, ≈30 Hz; amplitude
    illustrative); endplate spike – AP starting under the tip (both directions), irregular
    sputtering train (bursts and pauses);
  * myotonic – single-fibre potential repeating with a sine-squared rate envelope between 20 Hz
    and the chosen peak; amplitude falls as rate rises (schematic);
  * CRD – a loop of adjacent fibres with fixed ephaptic delays (0.35–1.1 ms, illustrative):
    identical complexes, zero within-complex jitter, abrupt start/stop; dropping a fibre
    shortens the loop (quantal jump);
  * fasciculation – one whole MUAP (normal or chronically reinnervated unit from the model
    muscle), irregular gamma-distributed intervals; doublet/triplet spacing 12 ms and myokymic
    30 Hz within / ≈1 Hz between bursts are illustrative values inside textbook ranges.
* Spontaneous single-fibre potentials are scaled by an illustrative calibration factor
  (0.35) so they fall in the textbook fibrillation range (10–100 µV, p.234).
* **Audio**: the same 20 kHz synthesized signal is played at its own sample rate (no time or
  pitch scaling); only volume is normalised. Muted by default.

### Time course (`src/ui/modules/course.js`)
* The disease clock (days → years) is separate from the waveform clock (ms). Each of 17 time
  points is recomputed with the full model (new muscle state per point). Partial lesion:
  collateral reinnervation; complete lesion: optional regrowth from the injury at ≤1 mm/day
  (p.255) + 10-day latency, 65% success (illustrative), slowly conducting regenerated axons;
  denervated fibres stop fibrillating 1–2 years after denervation (fibrosis; illustrative);
  demyelinating block recovers with a 30-day time constant (illustrative).

### Localization (`src/physiology/localize.js`, `src/ui/modules/localize.js`)
* Root–muscle map = Table 32.6 (p.564) marker muscles (“marker” weight 1, “less often” 0.4 —
  the 0.4 is illustrative). SNAP–plexus map = Table 33.2 (p.584): upper trunk C5–C6, middle C7,
  lower C8–T1.
* A lesion sets, for each sampled nerve and muscle, the fraction of motor/sensory axons
  interrupted and whether the sensory lesion is pre- or postganglionic. Each one is then
  simulated separately by the full model (same subject, same seed): CMAP/SNAP waveforms are
  synthesized; muscle findings are read from the simulated muscle (fibrillating fraction,
  fibres per surviving unit, immature sprouts, units available).
* Lesion-to-muscle path lengths (illustrative) set fibrillation onset with the model formula
  10.6 + 0.028·L days, so paraspinals fibrillate before hand muscles.
* Length-dependent polyneuropathy: effect rises smoothly from 400 mm to 1000 mm axon length
  (illustrative), motor ×0.7 relative to sensory (illustrative). MND: patchy (hash-based)
  anterior-horn-cell loss in every muscle, sensory intact. Myopathy: proximal > distal fibre
  loss, optional irritability; no time course.
* Fibrillation grade (0–4+) and the “large/small MUAP, recruitment ↓, early recruitment”
  labels are illustrative cut-offs on model quantities, not clinical criteria.

### Neuromuscular junction (`src/physiology/nmj.js`, `src/ui/modules/nmj.js`)
* Textbook teaching model (p.57–60): m = p·n with n = 1000, p = 0.2, 0.2 mV per quantum,
  threshold 15 mV, Ca²⁺ clearance ≈100 ms, mobilization after 1–2 s.
* Fibres are grouped into 24 safety-factor classes by their EPP gain (the same gain scatter as
  the muscle model); each class has its own surface CMAP template. At each stimulus the fraction
  of each class reaching threshold is computed with a binomial (normal-approximated) quantal
  fluctuation; CMAP = Σ class template × fraction firing.
* Postsynaptic disease lowers a receptor factor; presynaptic disease lowers p; immature endplates
  (reinnervation) lower the receptor factor. Mapping from severity is illustrative.
* Illustrative kinetics: refill τ 0.87 s at rest, 0.45 s after mobilization, faster with residual
  Ca²⁺; Ca increment 0.32 per impulse; p ≤ 0.45; post-exercise facilitation decaying with τ 8 s;
  exhaustion peaking at 3 min; pseudofacilitation by time-compression (area preserved).
* SFEMG: two fibres of one unit; transmission time = time for an exponentially rising EPP
  (τ 0.25 ms, illustrative) to reach threshold; EPP fluctuates with quantal content → jitter;
  EPP below threshold → blocking. MCD from 100 discharges; low-frequency filter 500 Hz.

### Late responses (`src/physiology/late.js`, `src/ui/modules/late.js`)
* F: every excitable motor axon conducts antidromically to the cord; each backfires with
  probability 3% (textbook 1–5% of fibres) after a 1 ms turnaround and returns; F = Σ templates
  of the backfired units. F estimate = (2D/CV)×10 + 1 + DL computed from the model's own
  wrist/elbow CMAPs.
* H: 80 Ia afferents (68 m/s, thresholds 4–14 mA, illustrative) excited by a 1 ms pulse; drive
  recruits motor neurons by size up to 45% (illustrative); 1 ms central delay (illustrative);
  reflex volleys in axons also stimulated directly are lost by collision.

### Technical factors (`src/ui/modules/tech.js`)
* Temperature acts through conduction velocity (2 m/s/°C), distal-latency change (0.2 ms/°C) and
  wider/larger fibre potentials; intensity excites axons whose (illustrative) threshold it
  exceeds; moving G1 changes electrode–endplate geometry; filters are 2nd-order digital
  high/low-pass at 20 kHz; onset latency is read at a 0.05-division visible deflection.

## 2. Schematic approximations (deliberately simplified)
* Fibre termination is modelled as an action potential that decrements towards the fibre
  end (balanced currents). Real fibre-end far-field potentials are therefore not reproduced
  for surface recordings; needle tables use physical ends (cancelled by the concentric
  reference).
* The concentric needle reference is a weighted set of points along the shaft (calibrated).
* Muscle anisotropy is a single radial distance scaling factor (2) for surface recordings.
* Motor-unit endplate bands differ in axial position between units (spread 5 mm) but are
  compact within a unit (0.5 mm) – chosen so needle MUAPs are mostly triphasic while the CMAP
  has a ≈5 ms negative phase.
* Reinnervation kinetics (sprouting from ≈25 d, maturation constant ≈120 d, capacity ≤4.5×
  original size) are illustrative.
* Absolute amplitudes are calibrated: normal CMAP ≈9 mV, SNAP ≈35 µV (display calibration).
* The node-level micro view is synchronised but not to scale.

## 3. Outside the current scope
* Full biophysical membrane (Hodgkin–Huxley) or cable models.
* Anomalous innervation (Martin-Gruber) beyond textbook mention, co-stimulation of adjacent
  nerves, needle impedance/noise physics, tissue heterogeneity, fat thickness effects.
* Disease-specific clinical criteria beyond those quoted from the textbook.

## 4. Calibration results (seed 1; see `tests/causal.test.mjs`, `tests/phase2.test.mjs`)
| Quantity | Model | Textbook |
|---|---|---|
| Median CMAP negative duration | 5.0 ms | 5–6 ms (p.27) |
| Wrist→elbow normal amp / area drop, duration increase | −11% / −1% / +13% | ≤20% / ≤20% / ≤15% (p.37) |
| Forearm motor CV | ≈60 m/s | fastest fibres ≈65 m/s (p.34) |
| Distal SNAP negative duration | ≈0.8 ms | ≈1.3 ms (p.27, p.31) – **known deviation** |
| Proximal SNAP amplitude / area | −80% / −76% | “much lower” (p.30) |
| Normal needle MUAP (survey mean) | ≈5 ms, ≈0.45 mV, 7% polyphasic | 5–15 ms, 0.1–2 mV, ≤5–10% polyphasic (p.247–248) – duration at the low end |
| Rate : discernible units | ≈4–5 : 1 | ≈5 : 1 (p.253) |
| Fibrillation (0.3 mm, 1 month) | ≈90 µV, ≈2.7 ms, initial positive, ISI CV ≈2% | 10–100 µV, 1–5 ms, initial positive, very regular (p.234) |
| Fibrillation after 15 months | <20 µV | <10 µV after >6–12 months (p.234) |
| Endplate spike | initial negative, ISI CV ≈60% | initial negative, irregular (p.233) |
| Myotonic rate | 20 → 120 → 20 Hz | 20–150 Hz, waxing/waning (p.238) |
| CRD | interval CV 0%, jitter 0 µs | perfectly regular, abnormally low jitter (p.237–238) |
| Fasciculation | ≈0.5–1.2 Hz, irregular, MUAP shape | <1–2 Hz, irregular (p.238) |
| 3 Hz RNS, normal / MG (severity 0.7) | 0% / ≈30%, lowest at #4–5 then recovery | no decrement / >10%, lowest 4th, U-shape (p.59, 64) |
| LEMS (0.8): baseline, 50 Hz increment | ≈15% of normal, ≈+450% | low CMAP, often >100% (p.65) |
| SFEMG MCD normal / MG 0.7 | ≈29 / ≈235 µs, blocking 3% | blocking usually when MCD >80–100 µs (p.660) |
| F/M amplitude, persistence | ≈2–3%, 100% | 1–5%, 80–100% (p.41–43) |
| H max / M max | ≈19% | ≤50% (p.41) |
| Cooling 33→26 °C (motor CV) | 60 → 44 m/s | 1.5–2.5 m/s per °C (p.78) |
