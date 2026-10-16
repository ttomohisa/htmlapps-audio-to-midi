# v0.5 verification record

Development milestone, 2026-10-16. Previous record: [v0.4](VERIFICATION-v04.md).

## Local verification

- Standard PowerShell syntax/encoding, complete repository build, CSP/integrity, readable/root equality and self-extract byte restoration passed.
- Pure settings tests use the pinned official Basic Pitch postprocessor: the same synthetic frame fixture gives fewer/standard/more counts1/2/3; silence stays zero. Tests cover bounds, inclusive MIDI filtering, immutable presets and exact standard compatibility across corrected time boundaries.
- History tests cover all edit kinds, atomic fields,100-operation cap, branching Redo invalidation, no-op/errors, saved fingerprints, detached objects and800 mixed state transitions.
- Actual CPU C4/silence model smoke passed with intermediate tensors released.
- Supplied SVG inspected and copied unchanged. Builds embed identical source bytes in favicon/header and self-extract favicon.
- Local Chromium could not launch because the cloud shell disallows its process-singleton socket; browser evidence will come from ordinary CI and HTTPS preview.

## Browser gates

Pending exact-head CI: offline normal/self-extract and HTTPS settings/history, successful conversion, validation, cancel/failure preserving prior notes/history, keyboard, narrow JA/EN layouts, icon bytes, edited MIDI readback, and file/native virtual-microphone regressions. The PR remains Draft until these checks and independent review complete.

## Remaining manual gates

Physical Windows/Android/iOS microphone permission prompts, audible listening, touch, Safari/Firefox codecs and real BFCache are unverified. Session data is not persisted; mobile unload warning is best effort. MIDI download initiation does not prove disk persistence.
