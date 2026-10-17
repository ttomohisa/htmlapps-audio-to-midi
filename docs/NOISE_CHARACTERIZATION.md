# Synthetic noise and near-silence characterization

Date: 2026-10-17 UTC. This closes the missing **Node model measurement**, not the browser/manual portions of ATM-010/011 or release acceptance. No product, model, threshold, input limit or dependency changed.

## Purpose and reproducibility

Run `npm run test:noise` after the standard verified build. This opt-in milestone command is not added to ordinary `npm test` or CI, so normal pushes do not repeat fifteen model inferences. It reads the pinned build cache and writes `test-results/noise-characterization.json` incrementally. `completed: true` is set only after all cases and disposal checks pass; an interrupted or failed report is not a successful run.

[Recorded report](evidence/noise-characterization-20261017.json) includes the exact base commit, source/script/model/postprocessor hashes, input PCM hashes, preset parameters, environment, timings, all normalized output notes and tensor counts. Its `gitHead` is the source baseline `76660bf40b1f5b0ae71fa5348bde7a558dce40c8`; the new script was run in the working tree and is identified by its SHA-256, not falsely attributed to that old commit. Environment: Linux x64 6.18.44, Node 24.19.0, AMD EPYC 9V74, TF.js 3.21.0 CPU, Basic Pitch 1.0.1. This is not browser or physical-device measurement.

All inputs are newly generated synthetic 2.5-second, 22,050 Hz mono PCM. They contain no human recording or personal data and use the repository's MIT-licensed `makeWav` generator. Noise uses the existing F-09 generator: uniform LCG seed 1729, multiplier 1664525, increment 1013904223, amplitude parameter 0.3, quantized through PCM16. C4 uses the existing F-01 0.25–2.25-second sine with 15 ms attack/release and amplitude parameter 0.6. Near-silence inputs scale that PCM by 1e-4 as Float32, **without another PCM16 quantization**. This isolates small-amplitude model behavior; it is not a recording from a real microphone's noise floor. PCM hashes record native endianness explicitly.

## Criteria and observations

Pass criteria were established before running: every case completes; normalized notes satisfy the app's finite pitch/time/duration contract; intermediate tensors return to the loaded-model baseline; exact digital silence has zero notes; the C4 positive control detects MIDI 60 at each preset. **No zero-note threshold was imposed on noise or quiet tones.** The measurements characterize false detections, not an accuracy guarantee or an attempt to tune the model until a test passes.

| Synthetic input | RMS dBFS | Fewer | Standard | More |
|---|---:|---:|---:|---:|
| Exact digital zero | −∞ | 0 | 0 | 0 |
| Seed-1729 noise | −15.23 | 0 | 3 | 243 |
| Same noise ×1e-4 | −95.23 | 0 | 8 | 58 |
| C4 ×1e-4 | −88.46 | 1 | 1 | 2 |
| C4 positive control | −8.46 | 1 | 1 | 4 |

Counts are normalized app note counts, not percentage accuracy. Raw and normalized counts matched in this run. Noise has no intentional pitched events, so its detections are false positives relative to that fixture definition. Quiet C4 contains an intentional note and is not a silence fixture; detection there must not be mislabeled a false positive merely because the amplitude is small. Extra control notes at More also illustrate the sensitivity tradeoff. Exact counts are descriptive results for these hashes, not permanent cross-platform golden outputs.

All 15 inference cases completed, each returned to **245 tensors**, and model disposal left **0 tensors**. This is TF.js tensor accounting, not proof of zero browser/process memory leakage. Input level alone is not a safe silence classifier: quieter noise still produced notes at Standard/More. No amplitude gate or automatic deletion has been added, as either could erase real quiet notes. A single seed and one frequency do not characterize all environmental noise, near-silence or music.

## Remaining acceptance

- ATM-011 remains **BLOCKED** overall: seeded noise has been measured, but browser display/recovery and physical-device human interpretation are not newly verified by this Node script.
- Exact digital silence success does not establish that a real room, quiet recording or near-silent microphone input yields zero notes.
- M09-OWNER in the acceptance ledger records a limited Android/Windows Chrome owner-reported recording/playback/edit/export smoke. Quantified real voice/instrument accuracy, detailed microphone refusal/device-loss behavior, DAW compatibility, assistive technology and the full physical-device matrix remain unverified.
- The published 0.9.0-rc.1 is a development version; these measurements do not qualify v0.9/v1.0 for final release.
