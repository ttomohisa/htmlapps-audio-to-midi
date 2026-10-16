# v0.4 verification record

Development milestone, 2026-10-16. Earlier records: [v0.3](VERIFICATION-v03.md), [v0.2](VERIFICATION-v02.md).

## Verified implementation

Source head `8c78a183a861920429c1e4ca31c68f5cf6d2ba4c`:

- [Windows standard CI](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38931673059): PowerShell syntax/encoding and repository build; restrictive CSP/integrity; readable/root equality; self-extract restoration; **156 Node tests**, actual Basic Pitch C4/silence smoke and **22 offline Chromium cases** passed. Three preview-only tests are intentionally skipped there.
- [Ordinary HTTPS preview](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38931673054): **3 browser cases passed**. The served HTML matched the workflow build before offline conversion. File, native virtual-microphone and manual editing flows then passed without runtime HTTP requests or page errors.
- The editing tests change a detected pitch by one semitone, move its start by 0.05 s, apply direct Db4 and precise times, reject invalid/empty/out-of-clip fields atomically, add an overlapping manual note, delete and restore it, and independently parse downloaded MIDI against the current displayed notes and edited filename.
- Zero-note deletion disables export while keeping Undo available. Cancelling reanalysis, file replacement, microphone replacement and reset preserves unsaved edited notes. Language switching preserves typed input. Controls are measured at 320/360/390 px and have at least 44 px height.
- Pure editing tests cover immutable original detection, non-reused manual IDs, origin retention, finite bounds, duplicate/overlapping notes, fixed velocity, saved-content fingerprints, 100-deletion history, independent MIDI decoding and a deterministic 400-operation invariant sequence.
- Existing recording, input, waveform/transport, hidden-page cleanup, modal scroll lock, stale generations and direct-file normal/self-extract regressions remain passing.
- Actual English/Japanese deployed screenshots were inspected. `assets/screenshot.png` is a synthetic C4 recording in v0.4; no user audio is used.
- Local PowerShell 7.6.7 build and Node tests passed. Local shell Chromium could not launch, so browser claims above come from the linked Windows CI and deployed HTTPS jobs.

## Final polish verification

A subsequent documentation/presentation update refreshes the actual screenshot, adds the keyboard Enter editing check, and restores the build script's existing CRLF convention. Its exact-head CI must pass before review-ready status; see the PR checks for the final head. No model, dependency or runtime-network change is included.

## Remaining gates

Physical Windows/Android/iOS microphone permissions, audible listening, touch behavior, Safari/Firefox codecs and actual BFCache navigation have **not been run**. Headless Chromium and synthetic lifecycle events do not establish those device behaviors. Full edit Undo/Redo remains v0.5; v0.4 restores deletions only. Downloads initiate browser saving and do not prove a file reached disk. Closing/reloading still loses session audio/notes and mobile unload warnings are best effort.
