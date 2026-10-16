# Changelog

## 0.5.0 — development milestone (2026-10-16)

- Add fixed Fewer/Standard/More detection presets and validated advanced onset/frame thresholds, minimum note duration and MIDI pitch range. Settings apply only on explicit analysis.
- Preserve the prior result and edit history on failed or cancelled reanalysis; confirm unsaved edits before replacement. Warn on unusually high note counts.
- Add bounded 100-operation Undo/Redo for all edits, buttons and keyboard shortcuts; preserve native input-field undo.
- Use the exact user-supplied SVG as canonical app icon and favicon.
- Physical-device acceptance remains unverified.

## 0.4.0 — development milestone (2026-10-16)

- Add single-note pitch and timing correction, direct note-name/MIDI and second entry, manual additions and deletions.
- Keep touch-sized editing controls beside the selected note; update piano roll, synth and MIDI from the same current note list.
- Restore deletions using canonical Toast + Undo and a persistent undo-deletion control.
- Preserve detection provenance and protect unsaved edits before reanalysis, source replacement or reset.
- Full edit Undo/Redo remains v0.5. Physical-device acceptance remains unverified.

## 0.3.0 — development milestone (2026-10-16)

- Add explicit, local-only microphone capture with native format checks, a level meter, Stop / Listen / Discard, and an editable original-recording filename/download.
- Decode complete recordings through the same guarded file-input path; analysis remains an explicit action.
- Release microphone tracks on stop, cancellation, errors and page lifecycle changes; confirm unsaved replacement/reset and active-recording mobile navigation.
- Add canonical Input / Notes / Export smartphone tabs with safe areas, disabled-state gating and preserved modal scroll locking.
- Limit recording to 59 seconds (below the 60-second decoded cap) and 50 MiB; add WebM file reloading and keep file conversion available on unsupported/denied microphone paths.
- No new runtime dependencies. Physical microphone/listening/touch and non-Chromium device gates remain unverified.

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
