# Verification record

## v0.1

This is a development milestone, not a claim that every v0.1 device gate is complete.

## Verified locally, 2026-10-16

- Node 24.19.0: 23 pure/contract tests, including independent `midi-file` 1.2.4 readback of SMF type 1, channel 1, 120 BPM, velocity 96, timing, chords, retriggers, filename safety and stale generations.
- PowerShell 7.6.7 syntax/encoding preflight, full repository build, normal HTML static verifier, self-extract byte restoration and root HTML equality: PASS.
- Actual Basic Pitch 1.0.1 + TF.js 3.21.0 CPU, loaded through in-memory IOHandler: synthetic C4 starts at 0.2554195 s and ends at 2.2652295 s for reference 0.250–2.250 s; pitch 60. Silence returns 0 notes.
- 2.5 s C4 + 1 s silence took 4.862 s total in this cloud Node process. A later CI Node run took 13.697 s, illustrating environment variability. These are not device SLAs.
- Model baseline/final tensors: 245/245; model disposal returns tensor count to 0. This is a short smoke measurement, not the v0.7 100-cycle stress gate.
- Initial size: about 1.08 MiB readable; 1.04 MiB self-extract; about 2.16 MiB raw embedded assets / 0.74 MiB stored.

## Browser and CI

Verified code commit: `76ae2e3c576f59f8bce6ceb0f44db625b53fdb2c`, 2026-10-16.

- [Windows CI build and offline browser run](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38864341235): PowerShell syntax/build/integrity checks, 23 contracts, real CPU model smoke, and **11 Chromium browser cases passed**. The preview-only case is intentionally skipped in this job and runs below.
- Both `file://` HTML variants work with the browser context offline from initial load. Synthetic C4 is analyzed by the real Worker/model, downloaded with an edited Japanese filename, parsed independently, and compared with displayed note timing. No HTTP requests or page errors were observed.
- Browser coverage: silence/no-notes; corrupt audio; decoded duration limits/retry; oversized input preserving existing result; cancel; replacement/stale completion; repeated clicks; reset dialog cancellation; MP3/drop; 48 kHz stereo; three-note C4/D4/E4 melody; bilingual 320 px layout/help/keyboard; reload clears the session.
- The BFCache regression dispatches persisted lifecycle events. It does **not** prove actual browser back/forward-cache eligibility or physical-device restoration.
- [Ordinary Cloudflare preview run](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38864341238): **1 Chromium HTTPS test passed**. Downloaded HTML SHA-256 matched that job's built HTML before interaction. After initial navigation the context was switched offline; real C4 inference, MIDI download/readback and JA/EN narrow layouts passed without subsequent HTTP requests or page errors. Active download-toast language switching also passed.
- Preview MIDI readback: SMF 1, 2 tracks, 480 PPQ, 500,000 microseconds/beat, channel 1, program 0, C4 (60), velocity 96, onset tick 245 / offset tick 2175 (0.255208 / 2.265625 s).
- User preview refinements verified in Chromium: descriptive JA/EN header subtitle, canonical white framed workspaces, and Help/reset background scroll lock. At 1360 px and 320 px / 480 px height, wheel input leaves background geometry unchanged while Help content scrolls; close button, Escape, backdrop and native close restore the exact scroll position and allow scrolling again. Reset cancellation also restores scrolling. Pure regressions cover prior inline styles, nested/repeated ownership, delayed close events and showModal failure cleanup. Physical touch-device behavior remains unverified.
- CI screenshots are actual rendered results. At the v0.1 checkpoint, `assets/screenshot.png` was the 1360 × 900 HTTPS result captured at commit `76ae2e3`; the current screenshot is documented under v0.3 below. No mockup or personal recording is used.
- Exact 0.5 s boundary fixture uses the browser's native decode rate. A different source rate can round decoded duration below 0.5 s; the product keeps the specified strict **decoded-duration** limit, rather than relaxing it for the test.

The hosted Windows Server runner is automated browser evidence, not a physical Windows/phone device claim. The shared cloud Chrome displayed the HTTPS UI, but its file-chooser operation failed with a browser tooling timeout; it is not counted as a successful conversion.

## Explicitly not yet verified

- Windows/Edge physical device, Android Chrome and iOS Safari physical devices
- Firefox and Safari browser engines
- MP3 and additional codecs on each target device
- Real humming, guitar and piano recordings; complex-song accuracy
- 10/30/60 s performance matrix, 100-cycle stress and background/sleep behavior
- DAW playback compatibility

The supplied 92-case matrix is the long-term acceptance contract. At this v0.1 checkpoint, v0.2–v1.0 features were not yet implemented; v0.2 is now merged and the v0.3 evidence follows below. Physical-device DoD remains open until its gates are recorded.

## Implementation details

All source channels are averaged equally, then browser OfflineAudioContext performs native resampling to 22,050 Hz. Input length is checked after decode and before inference. Cancelling terminates the CPU Worker; replacing accepted input increments a generation and removes old output. Oversized/unsupported files are rejected before discarding the previous session.

Worker windowing follows official 1.0.1 constants: 43,844 samples/window, hop 36,164, 3,840 zero samples prepended, 15 output frames removed at each side, floor(input samples × 86 / 22050) result rows. Full frames/onsets are joined before official post-processing; contours and pitch bends are unused. Defaults: onset 0.5, frame 0.3, minimum 5 frames, inferred onsets, melodia trick and energy tolerance 11. Official frame-to-time correction is retained unchanged.

## Browser integration correction

The first real Chromium run exposed TF.js 3.21 legacy regenerator using a Function-constructor fallback under strict CSP. The shared worker bootstrap now predeclares its runtime binding. A VM integration check disables string code generation while loading the exact pinned bundles. CSP remains unchanged, with no unsafe-eval. Both offline variants and the HTTPS preview subsequently passed actual Chromium inference and export with the unchanged restrictive CSP.

## v0.3 recording milestone (2026-10-16)

- Local Node suite: 108/108 PASS, including 40 recording lifecycle tests and recording UI stale-Blob/confirmation tests.
- PowerShell syntax/encoding, repository build, standalone CSP/integrity and self-extract/root restoration: PASS. Current readable HTML is about 1.15 MiB and compact HTML 1.06 MiB; model assets are unchanged.
- Added CI tests use Chromium's native virtual microphone with a generated C4 WAV, native MediaRecorder encoding, actual complete-Blob decoding, explicit playback/inference, original-audio download/redecode, and independent MIDI readback. The initial implementation passed these tests at the runs linked below; no physical microphone claim is made.
- Denied/missing/unsupported APIs and a delayed permission grant use controlled test injections. BFCache lifecycle tests remain synthetic persisted event dispatch, distinct from actual back/forward caching.
- Commit `5c103cb`: [Windows build/offline run](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38895723598) passed 107 contracts, real model smoke and 19 browser cases (2 preview-only cases skipped); [ordinary HTTPS run](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38895723611) passed both file and native virtual-microphone flows. The hidden-page pitch-reveal regression is verified on the follow-up commit below.
- Physical Windows/Android/iOS microphone permissions, device-loss behavior, audible listening/touch and Safari/Firefox recording codecs remain NOT RUN.

### First native recording run

The first v0.3 CI run passed 14 existing offline browser cases and the HTTPS file-conversion test. Native recording/decode/playback, the C4 frequency check, and MIDI-to-display readback passed, but a test incorrectly required the steady C4 recording to become a single note. The preserved 2.34-second take produced adjacent C4 notes at 0.012–1.649 and 1.649–2.312 seconds. The test now verifies C4 time coverage (including endpoints/gaps) separately from the number of model-inferred retriggers; exact MIDI/display comparison remains unchanged.

The recorded take also showed level attenuation under browser speech processing. Capture now requests ideal echo cancellation, noise suppression and automatic gain control disabled for musical input. Browsers may ignore unsupported ideal constraints; actual-device audio quality remains a manual gate.

### Visual QA follow-up

Actual JA/EN screenshots exposed a mobile hidden-page issue not covered by the first green run: notes analyzed on Input did not scroll into view when Notes opened. The review view now defers layout/pitch centering until its viewport is measurable, including a return to the same desktop width, and preserves scroll during ordinary tab round trips. Browser regressions check selected C4 visibility after tab navigation and desktop restoration.

### Verified v0.3 implementation

Code commit `5ac576895b79df8baebb0be2e2c2be43a642a556`:

- [Windows standard build and offline browser CI](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38896757387): 108/108 contracts, actual model smoke and 19/19 browser cases passed; the 2 HTTPS-only cases are intentionally skipped in that job.
- [Ordinary HTTPS preview](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38896757374): 2/2 passed. Delivered HTML matched the workflow build. Both file and native virtual-microphone flows completed after going offline, with no runtime HTTP requests or page errors.
- Native MediaRecorder produced a 2.520-second synthetic C4 recording; independent decode measured 262 Hz over the middle second. MIDI readback contained pitch 60, start 0.022917 s, end 2.485417 s; displayed note times matched within 2 ms. The downloaded original recording reloaded successfully through the regular file path.
- Both standalone variants recorded/decoded/analyzed/exported offline in Chromium. Controlled denial, missing microphone, unsupported MIME and insecure-context paths retained file fallback. Reset/discard cancellation, hidden stop, pending-permission input replacement and late-track release passed.
- Input / Notes / Export tabs at 320/360/390 px, selected-note visibility after hidden analysis and desktop restoration, ordinary tab-roundtrip scroll preservation, and the existing bilingual help/reset scroll-lock regressions passed.
- Independent source reviews found and resolved pending-permission replacement and hidden-page pitch-reveal issues. Focused rechecks passed.
- Actual 1360×900 JA/EN and narrow screenshots were inspected. `assets/screenshot.png` is the English native-recording result from this HTTPS run. It uses only synthetic audio. Physical-device gates above remain NOT RUN.
