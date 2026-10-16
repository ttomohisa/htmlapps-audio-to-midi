# Changelog

## 0.2.0 — development milestone (2026-10-16)

- Add a read-only piano roll and waveform with seconds/pitch axes, zoom, scrolling and note selection.
- Add original/synth comparison with shared-clock play, pause, stop and seek; stop old audio on input replacement/reset and pause when hidden.
- Preserve original decoded channels/rate separately from model PCM and keep MIDI output unchanged by view/transport actions.
- Preserve the approved subtitle, framed workspaces and modal background scroll lock.
- Recording, note editing and physical-device acceptance remain outside this milestone.

## 0.1.0 — development milestone (2026-10-16)

- Updated the descriptive header subtitle, restored canonical framed workspaces, and locked background scrolling while Help or Reset confirmation is open.

- Implement local short-audio decoding, mono/resampling, embedded Basic Pitch inference and standard MIDI export.
- Add generation-safe cancellation/input changes, no-note and error recovery, editable output names and bilingual responsive UI.
- Preserve offline single-HTML builds, restrictive CSP and model/runtime license disclosures.
- Add independent MIDI round trips, actual-model smoke and offline browser acceptance tests.
- Physical Windows/Android/iOS acceptance remains unverified. Piano roll, recording, playback and editing are later milestones.

Template baseline: htmlapps-template 1.3.0, commit cb908779682fa315ccd0f1eb58549f6c208f36f0.
