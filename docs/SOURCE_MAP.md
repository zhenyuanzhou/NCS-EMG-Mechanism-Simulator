# Source map

Primary reference: **Preston DC, Shapiro BE. Electromyography and Neuromuscular Disorders:
Clinical–Electrophysiologic–Ultrasound Correlations, 4th ed. Elsevier; 2020.**
Local file: `D:\常用书籍\Electromyography and Neuromuscular Disorders 4th.pdf` (779 PDF pages).
**Page numbers below are printed page numbers. PDF page = printed page + 11** (verified on every
body page). Detailed extracts are in `docs/SOURCE_NOTES.md`.

| Feature in the app | Textbook location (printed p.) | Used for |
|---|---|---|
| Volume conduction, triphasic/biphasic/positive morphologies, negative-up convention, far-field artefact | Ch 2, p.20–21 (Fig 2.19–2.21) | Recording basics; CMAP montage; fibrillation morphology |
| Saltatory conduction, myelinated CV 35–75 m/s, nodes | p.16–17 (Fig 2.12–2.15) | Micro view; CV ranges |
| Motor unit, NMJ overview | p.18–19 | Hierarchy, NMJ |
| CMAP measurements (latency, amplitude, duration, area) and gains | Ch 3, p.23–24 (Fig 3.1–3.2) | Measurement conventions, display gain |
| Motor CV = distance/(PL − DL) and why | p.25 (Fig 3.3) | NCS CV computation and explanation |
| SNAP measurements, onset vs peak latency, single-site sensory CV | p.26–27 (Fig 3.5–3.7) | SNAP measurement rule |
| Lesions proximal to the DRG → normal SNAP | p.28–29 (Fig 3.10) | Preganglionic lesion; localization |
| Normal temporal dispersion & phase cancellation, sensory vs motor | p.30–32 (Fig 3.11–3.12) | Summation demo; proximal SNAP |
| Supramaximal stimulation, stimulator position | p.32–33 (Fig 3.14–3.15) | Technical factors (submaximal stimulation) |
| Axonal loss pattern, 75% LLN / 130% ULN limits, selective loss of fastest fibres | p.34–36 (Fig 3.16–3.18) | Axonal loss controls and interpretation |
| Hyperacute axonal loss, Wallerian degeneration timing, pseudo-conduction block | p.34–35, p.260–263 (Fig 16.1, 16.3) | Time-since-injury control |
| Demyelinating range (<35 m/s arm) | p.35 | Interpretation flag |
| Conduction block location vs stimulation sites; 20%/15% normal limits; >50% area criterion (computer simulation) | p.36–38 (Fig 3.19–3.21) | Block controls; interpretation flags; caveats |
| Myopathy and NMJ disorders on NCS | p.38–39 | NCS interpretation |
| Demyelination distribution patterns | p.261–266 (Fig 16.2) | Explanations |
| Nodal/paranodal dysfunction (“nodopathies”), MMNCB | p.503 | Nodal-failure caveat |
| Concentric needle, recording field, settings (50/200 µV/div, 10 ms/div), insertional/spontaneous activity definitions | Ch 12, p.135–137 (Fig 12.1–12.4) | Needle model, display gains |
| Spontaneous activity table, morphology, firing patterns; endplate noise/spikes; CRD; myotonic; fasciculation; doublets; myokymia (Box 14.1) | Ch 14, p.231–240 (Table 14.1, Fig 14.4–14.26) | Spontaneous activity lab (generators, firing processes, caveats) |
| Fibrillations/PSWs, PSW crushed-zone mechanism (two explanations), onset timing by nerve length, grading, tiny chronic fibs | p.234–236 (Fig 14.9–14.14) | Denervation model, PSW model, time course, localization timing |
| MUAP size principle, territory 5–10 mm, mosaic, duration/amplitude/phases, satellites, stability | Ch 15, p.245–251 (Fig 15.1–15.11) | Muscle model, MUAP measurements |
| Force: rate coding and recruitment, 5:1 rule, activation vs recruitment, early recruitment | p.251–254 (Fig 15.13–15.16) | Recruitment model; interpretation |
| MUAP patterns by pathophysiology (acute/chronic neurogenic, nascent units, myopathy, NMJ, CNS) | p.255–258 (Table 15.2, Fig 15.17–15.18) | Interpretation; time course |
| Time-related changes in axonal loss | p.260–264 (Table 16.1) | Time course |
| Myopathy EMG (normal EMG does not exclude; steroid myopathy) | p.266–267, p.677–683 | Myopathy caveat |
| Temperature effects and pitfalls | Ch 8, p.78–79 (Box 8.2) | Temperature model; Technical factors module |
| Filters, sweep/sensitivity effects on latency | p.83, p.97 (Fig 8.33–8.34) | Technical factors (filters, read onset latency) |
| F response (backfiring, persistence, chronodispersion, F estimate), H reflex (Ia, collision, H/M) | Ch 4, p.41–49 (Table 4.1, Fig 4.3–4.11); p.265 | Late responses module |
| RNS quantal model (m = p·n), mobilization, Ca accumulation, exercise facilitation/exhaustion, pseudofacilitation, decrement/increment criteria, technique | Ch 6, p.57–65 (Fig 6.2–6.11); p.268 | NMJ module (RNS) |
| SFEMG jitter, MCD, blocking, filter settings, specificity | Ch 37, p.658–662; p.681; p.250 | NMJ module (SFEMG) |
| Radiculopathy: SNAP preserved (>99%; superficial peroneal exception), myotomal pattern, paraspinals (~50%), limits of single-level localization | Ch 32, p.561–566 (Table 32.6, read from page image) | Localization; root–muscle map (meso view) |
| Brachial plexopathy SNAP–trunk/cord table; ≥50% side-to-side SNAP criterion | Ch 33, p.583–584 (Table 33.2, read from page image) | Localization SNAP mapping and red SNAP flag |
| ALS EMG distribution (several regions), normal SNAPs | Ch 30, p.528–534 | Localization (MND) |
| Polyneuropathy distal-to-proximal gradient, sural SNAP | p.492–495 | Localization (length-dependent) |
| Time course of axonal lesions (hyperacute → chronic), nascent units | p.255–257, p.260–266 (Table 16.1) | Time-course module and early-vs-late lesson |

## Outside the textbook
* Rosenfalck P. Intra- and extracellular potential fields of active nerve and muscle fibres.
  *Acta Physiol Scand Suppl.* 1969;321:1–168 – intracellular action-potential profile used in
  the line-source model.
* Muscle-fibre conduction velocity (4 m/s) – the textbook mentions muscle-fibre CV only
  qualitatively (p.717); the value is an illustrative physiological magnitude.

## Figures
All illustrations in the app are original schematics drawn by code; no figure from the
textbook is reproduced.
