# v0.7 verification record

Development milestone, 2026-10-16. Previous record: [v0.6](VERIFICATION-v06.md).

## Required gates

- Exact window samples/alignment, tensor disposal on success/error/cancellation, boundary-note equivalence and actual pinned-model 10/30/60-second measurements.
- 100 short real-model analysis/cancellation cycles, plus browser worker lifecycle stress and real-model recovery/reuse. Memory measurements distinguish tensor bytes from process memory and do not claim browser/device peak memory.
- Viewport geometry, long crossing notes, dense timelines, scrolling/zoom/keyboard reveal and immutable note data.
- Existing settings, cleanup, editor/MIDI readback, recording, playback, modal and offline normal/self-extract regressions.
- PowerShell syntax/build/integrity, independent review, exact-head CI and HTTPS preview before Ready. Final counts/run links and benchmark measurements belong in the PR evidence, avoiding evidence-only rebuilds.

## Limits and manual gates

Input remains 60 seconds / 50 MiB; recording 59 seconds. Whole compressed files are decoded by decodeAudioData; duration is validated only after decode. A 50 MiB compressed file may need substantially more decoded memory. Physical Windows/Android/iOS timings, peak memory, low-memory behavior, permissions, audible listening, touch, Safari/Firefox codecs and actual BFCache are unverified. Cloud CPU and automated Chromium results are not physical-device acceptance. The five-minute expansion gate is not passed and remains disabled.
