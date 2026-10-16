# v0.8 verification record

Development milestone, 2026-10-16. Previous record: [v0.7](VERIFICATION-v07.md).

## Required gates

- Independent SMF parser: header/tempo/channel/program, consecutive equal pitches, chords, overlap, short/sub-tick notes, pitches 0/127 and dense event sequences. Nested same-pitch ambiguity is explicitly tested and documented, not claimed to preserve per-note identity.
- CSV: exact header, deterministic non-mutating order, full source seconds, numeric-only fields, UTF-8/CRLF, malformed input rejection and no source metadata.
- Filename: Japanese, unsafe characters, empty/reserved names, mixed/repeated extensions and format switching.
- Browser: edited/deleted/restored notes, exact CSV values versus MIDI readback, saved fingerprint, replacement/cancel/no-notes guards, keyboard, JA/EN,320/360/390px and output screenshots.
- All existing unit, actual-model smoke, offline readable/self-extract, PowerShell/build/integrity and HTTPS preview gates remain required. Exact counts/run links are recorded in the PR rather than evidence-only source commits.

## Remaining gates

Actual DAW/player listening, physical Windows/Android/iOS behavior, low-memory limits, permission prompts, touch, Safari/Firefox codecs and real BFCache remain unverified. Pitch bends are absent/OFF. MIDI same-pitch overlaps may pair differently between readers; CSV preserves exact intervals. No 5-minute input expansion or physical-device performance claim is made.
