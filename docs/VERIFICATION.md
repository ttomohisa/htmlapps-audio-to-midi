# v0.5 verification record

Development milestone, 2026-10-16. Previous record: [v0.4](VERIFICATION-v04.md).

## Local verification

- Standard PowerShell syntax/encoding, complete repository build, CSP/integrity, readable/root equality and self-extract byte restoration passed.
- Pure settings tests use the pinned official Basic Pitch postprocessor: the same synthetic frame fixture gives fewer/standard/more counts1/2/3; silence stays zero. Tests cover bounds, inclusive MIDI filtering, immutable presets and exact standard compatibility across corrected time boundaries.
- History tests cover all edit kinds, atomic fields,100-operation cap, branching Redo invalidation, no-op/errors, saved fingerprints, detached objects and800 mixed state transitions.
- Actual CPU C4/silence model smoke passed with intermediate tensors released.
- Supplied SVG inspected and copied unchanged. Builds embed identical source bytes in favicon/header and self-extract favicon.
- Local Chromium could not launch because the cloud shell disallows its process-singleton socket; browser evidence will come from ordinary CI and HTTPS preview.

## Browser verification

- Source head7aa0d48: [HTTPS preview run38935040327](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38935040327) passed all4 browser cases. Includes actual configured pitch-range reanalysis, history/shortcuts, rejected invalid settings, failed/cancelled reanalysis preserving notes/history, exact favicon bytes, edited MIDI readback and native virtual microphone. No runtime HTTP requests or page errors.
- [Initial offline run38935040418](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38935040418) passed184 unit tests, real-model smoke and23 browser cases. Its one failure was an outdated BFCache assertion expecting results to be discarded during interrupted reanalysis. v0.5 intentionally retains them; the assertion now requires exact prior notes and a working MIDI download. This final test/evidence commit requires green exact-head checks before Ready.
- Actual English desktop and Japanese mobile settings/editor screenshots were inspected. README screenshot now shows v0.5 and the supplied icon; synthetic C4 recording only. Independent source review completed, including a corrected selection fallback after undoing additions/redoing deletions.
- Exact final run links and completion status are in the PR description/checks, avoiding documentation-only CI loops.

## Remaining manual gates

Physical Windows/Android/iOS microphone permission prompts, audible listening, touch, Safari/Firefox codecs and real BFCache are unverified. Session data is not persisted; mobile unload warning is best effort. MIDI download initiation does not prove disk persistence.
