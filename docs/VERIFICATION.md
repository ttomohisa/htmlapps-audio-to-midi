# v0.1 verification record

This is a development milestone, not a claim that every v0.1 device gate is complete.

## Verified locally, 2026-10-16

- Node 24.19.0: 18 pure/contract tests, including independent `midi-file` 1.2.4 readback of SMF type 1, channel 1, 120 BPM, velocity 96, timing, chords, retriggers, filename safety and stale generations.
- PowerShell 7.6.7 syntax/encoding preflight, full repository build, normal HTML static verifier, self-extract byte restoration and root HTML equality: PASS.
- Actual Basic Pitch 1.0.1 + TF.js 3.21.0 CPU, loaded through in-memory IOHandler: synthetic C4 starts at 0.2554195 s and ends at 2.2652295 s for reference 0.250–2.250 s; pitch 60. Silence returns 0 notes.
- 2.5 s C4 + 1 s silence took 4.862 s total in this cloud Node process. This is not a device SLA.
- Model baseline/final tensors: 245/245; model disposal returns tensor count to 0. This is a short smoke measurement, not the v0.7 100-cycle stress gate.
- Initial size: about 1.08 MiB readable; 1.04 MiB self-extract; about 2.16 MiB raw embedded assets / 0.74 MiB stored.

## Browser and CI

Automated acceptance tests are in `tests/browser/app.spec.cjs`; their results will be recorded after the exact PR commit runs. Browser tests exercise the actual model, both offline file variants and downloaded MIDI bytes. Until then these tests are NOT RUN. The BFCache regression dispatches persisted lifecycle events; it does not prove real browser back/forward-cache eligibility.

## Explicitly not yet verified

- Windows/Edge physical device, Android Chrome and iOS Safari physical devices
- Firefox and Safari browser engines
- MP3 and additional codecs on each target device
- Real humming, guitar and piano recordings; complex-song accuracy
- 10/30/60 s performance matrix, 100-cycle stress and background/sleep behavior
- DAW playback compatibility

The supplied 92-case matrix is the long-term acceptance contract. v0.2–v1.0 features remain unimplemented. v0.1 device DoD remains open until physical-device gates are recorded.

## Implementation details

All source channels are averaged equally, then browser OfflineAudioContext performs native resampling to 22,050 Hz. Input length is checked after decode and before inference. Cancelling terminates the CPU Worker; replacing accepted input increments a generation and removes old output. Oversized/unsupported files are rejected before discarding the previous session.

Worker windowing follows official 1.0.1 constants: 43,844 samples/window, hop 36,164, 3,840 zero samples prepended, 15 output frames removed at each side, floor(input samples × 86 / 22050) result rows. Full frames/onsets are joined before official post-processing; contours and pitch bends are unused. Defaults: onset 0.5, frame 0.3, minimum 5 frames, inferred onsets, melodia trick and energy tolerance 11. Official frame-to-time correction is retained unchanged.

## Browser integration correction

The first real Chromium run exposed TF.js 3.21 legacy regenerator using a Function-constructor fallback under strict CSP. The shared worker bootstrap now predeclares its runtime binding. A VM integration check disables string code generation while loading the exact pinned bundles. CSP remains unchanged, with no unsafe-eval. Chromium re-verification is pending.
