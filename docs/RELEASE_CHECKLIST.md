# Audio to MIDI 1.0 release decision

Status: **DRAFT / NOT RELEASED**. Scope approved by the owner on 2026-10-17; final results are not yet supplied. Base: PR11 merge `4c6677ad994cbf30f64f4f21a96338cbc94ad385`. The version number in the candidate is a release target, not a declaration that these gates passed.

## Bounded support scope

Windows and Android Chrome are the release targets. Supported browser features remain Web Audio, Workers and DecompressionStream; recording additionally requires MediaRecorder and a locally decodable format. File input stays 0.5–60 seconds / 50 MiB; recording stays capped at 59 seconds. No noise-removal or perfect-transcription guarantee, five-minute input or pitch bends.

Other operating systems/browsers, DAW/player listening, assistive-technology use, low-memory behavior, full codec/device matrices, physical microphone loss, sleep/BFCache and 100 physical UI cancellation cycles remain unverified. Existing automated checks are retained. This approved scope supersedes the broad all-platform pre-release requirement in the original plan for this release only; historical results are not rewritten as passes.

## Already available evidence

- Owner reported Android and Windows Chrome recording/stop, audible original/synth playback/stop, semitone edit/revert, and renamed MIDI download: four core flows OK. Device/OS/Chrome versions were not supplied. DAW import/listening was explicitly left unverified because the owner has no DAW.
- PR11 exact-head CI: 248 unit/contract, real-model smoke, 40 offline Chromium, 12 HTTPS, 4 Firefox and 4 WebKit audits passed. These are the baseline, not a substitute for this candidate's CI.
- Model/runtime pins, asset hashes, licenses, CSP/local-processing, independent MIDI round-trip and CSV invariants were verified. New source changes here are support copy and release metadata only.
- Synthetic noise limitations are recorded separately. No new model characterization is required for this release-only change.

## Final owner checks (all still PENDING)

| ID | Environment / action | Expected result | Status |
|---|---|---|---|
| R1 | Windows Chrome: save normal and self-extract HTML; disconnect; open each, choose an audio file, analyze, save MIDI | Both saved HTML variants finish without a network connection; .mid exists | PENDING |
| R2 | Android Chrome: leave for another app while analysis is active, then return and explicitly retry | No automatic restart/playback; cancellation/recovery is understandable; explicit retry completes | PENDING |
| R3 | Either target: deny microphone access, then select an audio file, analyze and save MIDI | Recording limitation is explained; file conversion remains available | PENDING |
| R4 | Windows Chrome: edit a note, request reanalysis then cancel discard confirmation; repeat with another input | Existing audio/edited notes remain after each cancelled replacement | PENDING |

Record owner report/date and any available device/OS/Chrome versions. Unknown versions stay unknown. If analysis finished before leaving in R2, report that case as inconclusive rather than passing; try a slightly longer clip once. Existing successful core-flow reports need not be repeated. These checks can use PR11's published app because release preparation does not change the tested processing behavior; candidate CI still validates the final generated files.

## Blocking correctness and privacy requirements

Do not release with a known audio/note transmission, corrupted or stale export, unintended microphone/speaker activity, silent edit loss, or inability to recover through the target core workflow. Scope approval does not waive these failures. An unresolved failure in R1–R4 blocks readiness and requires diagnosis; do not hide it as an unsupported configuration.

## Assistant-owned final steps

- Synchronize scope, README/help, version metadata, changelog and generated HTML.
- Run preflight/build, unit/contract and exact-head existing CI; review the final diff. No extra repeated characterization campaign.
- Keep the release PR Draft until R1–R4 results and final CI are recorded. The owner alone merges.
- After merge, verify automatic Pages deployment and served/artifact byte equality. Do not manually deploy or merge.
