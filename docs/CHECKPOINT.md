# Progress checkpoint

_Last updated: Phase 3 delivered — all phases complete (41/41 tests pass)._

## Completed
* Reference access and page mapping (printed = PDF − 11); source notes (`docs/SOURCE_NOTES.md`).
* Core: seeded RNG, parameter provenance registry, line-source volume-conductor engine.
* Physiology: nerve (720 axons), muscle (≈23k fibres / 120 units), lesions (axonal,
  demyelination, block, nodal failure, root/plexus, myopathy, irritability, reinnervation),
  recruitment (drive / rate / units / force; matched force vs drive; central cap).
* Synthesis & measurement: CMAP, SNAP, MUAP, voluntary and rest signals, textbook measurement
  conventions, filters.
* UI: three synchronized panels, transport (physiological vs playback time), Guided / Explore /
  Compare modes, zh/en, model & sources table, “Why did this change?”.
* Modules: Recording basics, NCS, Needle EMG. Three NCS lessons.
* Phase 2 modules: Spontaneous activity lab (fibrillation, PSW, endplate noise/spikes,
  myotonic, CRD, fasciculation/doublet/myokymic; macro/meso/micro; loudspeaker audio with mute,
  no frequency scaling), Time course (disease clock separate from the ms clock; NCS / rest / MUAP
  at 17 time points), Localization (C7/C8 radiculopathy, lower-trunk plexopathy, median wrist,
  ulnar elbow, length-dependent polyneuropathy, MND, myopathy; DRG; root–muscle map from
  Table 32.6; SNAP–plexus map from Table 33.2; each nerve/muscle simulated separately).
* All 7 guided lessons (axonal loss, dispersion, block bypass, chronic MUAP, myopathy early
  recruitment, radiculopathy normal SNAP, early vs late study).
* Phase 3 modules: NMJ (RNS 3 Hz / 50 Hz / brief exercise / postexercise exhaustion from the
  textbook m = p·n model per safety-factor class; SFEMG jitter/MCD/blocking), Late responses
  (F wave: antidromic backfiring, persistence, chronodispersion, F estimate; H reflex: Ia
  threshold, recruitment curve, collision), Technical factors (temperature, submaximal
  stimulation, G1 position, filters, display sensitivity vs read onset latency). Compare mode is
  disabled (greyed) in modules without comparison presets.
* Demo video of the real app: `tools/demo.mjs` (Playwright recording, ≈3 min) → `demo.mp4`.
* Tests: 41 causal tests pass (`node --test tests/*.test.mjs`): 14 Phase 1 + 16 Phase 2 + 11 Phase 3.
* Build: `node tools/build.mjs` → `dist/index.html` (single file, opens by double-click).

## Remaining (optional extensions)
* More lessons for Phase 3 modules (RNS, F/H, technical factors).
* Comparison presets for late responses and technical factors.
* Lower-limb geometry (tibial H reflex, sural) as its own model nerve.

## Launch
Double-click `dist/index.html`, or `node tools/serve.mjs` → http://localhost:8080/ (bundled) or /src/index.html (source modules).
Rebuild after editing `src/`: `node tools/build.mjs`.

## Known issues
See `docs/KNOWN_ISSUES.md`.
