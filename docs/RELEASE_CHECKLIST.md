# Audio to MIDI 1.0 release decision

Status: **OWNER ACCEPTANCE RECORDED / PUBLICATION PENDING**. Scope approved on 2026-10-17; on 2026-10-18 the owner reported “Audio to MIDIはOKです。次に進んで。次はv1.0.0かな？” (Audio to MIDI is OK; proceed to the next step, v1.0.0). This is general owner confirmation and approval to proceed, not four individually reported test passes. Base: PR11 merge `4c6677ad994cbf30f64f4f21a96338cbc94ad385`. Final-head CI and owner merge are still required for publication. No new failure was reported. The known correctness/privacy blockers below remain unchanged.

## Bounded support scope

Windows and Android Chrome are the release targets. Supported browser features remain Web Audio, Workers and DecompressionStream; recording additionally requires MediaRecorder and a locally decodable format. File input stays 0.5–60 seconds / 50 MiB; recording stays capped at 59 seconds. No noise-removal or perfect-transcription guarantee, five-minute input or pitch bends.

Other operating systems/browsers, DAW/player listening, assistive-technology use, low-memory behavior, full codec/device matrices, physical microphone loss, sleep/BFCache and 100 physical UI cancellation cycles remain unverified. Existing automated checks are retained. This approved scope supersedes the broad all-platform pre-release requirement in the original plan for this release only; historical results are not rewritten as passes.

## Already available evidence

- Owner reported Android and Windows Chrome recording/stop, audible original/synth playback/stop, semitone edit/revert, and renamed MIDI download: four core flows OK. Device/OS/Chrome versions were not supplied. DAW import/listening was explicitly left unverified because the owner has no DAW.
- PR11 exact-head CI: 248 unit/contract, real-model smoke, 40 offline Chromium, 12 HTTPS, 4 Firefox and 4 WebKit audits passed. These are the baseline, not a substitute for this candidate's CI.
- Model/runtime pins, asset hashes, licenses, CSP/local-processing, independent MIDI round-trip and CSV invariants were verified. New source changes here are support copy and release metadata only.
- Synthetic noise limitations are recorded separately. No new model characterization is required for this release-only change.

## Final owner-check detail (not individually reported)

| ID | Environment / action | Expected result | Status |
|---|---|---|---|
| R1 | Windows Chrome: save normal and self-extract HTML; disconnect; open each, choose an audio file, analyze, save MIDI | Both saved HTML variants finish without a network connection; .mid exists | Individual result not supplied |
| R2 | Android Chrome: leave for another app while analysis is active, then return and explicitly retry | No automatic restart/playback; cancellation/recovery is understandable; explicit retry completes | Individual result not supplied |
| R3 | Either target: deny microphone access, then select an audio file, analyze and save MIDI | Recording limitation is explained; file conversion remains available | Individual result not supplied |
| R4 | Windows Chrome: edit a note, request reanalysis then cancel discard confirmation; repeat with another input | Existing audio/edited notes remain after each cancelled replacement | Individual result not supplied |

The 2026-10-18 general OK is recorded once as owner acceptance, rather than inferred separately for each row. Device model, OS/Chrome versions, exact HTML variant and whether R2 was still analyzing when backgrounded were not supplied. These details remain unknown. The owner approved proceeding within the bounded scope; these rows are not physical-device certification. The earlier explicit core-flow report remains separate. The checks could use PR11's published app because release preparation does not change processing behavior; candidate CI validates the generated files.

## Candidate verification

PR12 implementation head `2fb7baee58d44950e315d0ad90d640e37a0c2658`: [standalone CI](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/39011366243) and [HTTPS preview CI](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/39011366377) passed: 248 unit/contract tests, real-model smoke, 40 offline Chromium, 12 HTTPS, 4 Firefox and 4 WebKit checks. Direct cloud-Chrome inspection confirmed the effective Japanese/English release-scope help. Generated readable SHA-256: `2d179076ecdb7e612ca0ed179e04c2ade7bc5e8bfdcd89d46f2434cbc9b0d3c4`.

The 2026-10-18 follow-up changes documentation only; app, generated HTML, model and dependencies are unchanged. The PR description records final-head CI after this documentation commit. Automated evidence does not fill the missing individual owner-test details.

## Blocking correctness and privacy requirements

Do not release with a known audio/note transmission, corrupted or stale export, unintended microphone/speaker activity, silent edit loss, or inability to recover through the target core workflow. Scope approval does not waive these failures. An unresolved failure in R1–R4 blocks readiness and requires diagnosis; do not hide it as an unsupported configuration.

## Assistant-owned final steps

- Synchronize scope, README/help, version metadata, changelog and generated HTML.
- Run preflight/build, unit/contract and exact-head existing CI; review the final diff. No extra repeated characterization campaign.
- Keep the release PR Draft until this owner-acceptance record is reviewed and final-head CI passes, then mark ready for the owner's merge. Do not relabel unreported R1–R4 details as PASS. The owner alone merges.
- After merge, verify automatic Pages deployment and served/artifact byte equality. Do not manually deploy or merge.
