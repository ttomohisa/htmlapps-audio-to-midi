# v0.6 verification record

Development milestone, 2026-10-16. Previous record: [v0.5](VERIFICATION-v05.md).

## Gates

- Pure editing tests cover split/merge eligibility, immutable/detached previews, stale/foreign/tampered plan rejection, short-note and grid validation, atomic Undo/Redo, source bounds and saved fingerprints.
- Browser acceptance covers explicit previews/Cancel/Apply, split and merge extents, short-note removal, opt-in grid with skipped invalid results, stale parameter previews, edited MIDI independent readback, JA/EN and320/360/390px controls.
- Existing settings, reanalysis retention, recording, playback, modal, invalid-input and offline normal/self-extract tests remain required.
- Standard PowerShell build/integrity, real-model smoke, independent review and final exact-head CI/HTTPS preview must pass before Ready. Exact run links/counts will be recorded in the PR description/checks to avoid evidence-only CI cycles.

## Remaining manual gates

Physical Windows/Android/iOS permissions, audible listening, touch, Safari/Firefox codecs and real BFCache are unverified. Session data is not persisted; native unload warning is best effort. No long-audio/model/performance claim is added in this milestone.
