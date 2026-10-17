# Changelog

## 1.0.0 — release preparation (not yet released)

- Prepare the owner-approved Windows/Android Chrome release scope; retain other browsers, DAW playback and assistive technology as unverified. Final owner checks and exact-head CI remain required.

- Add direct app links to both READMEs and clarify quiet-noise limitations and the Fewer-preset tradeoff in bilingual detection help. No inference or preset changes.

## Unreleased — acceptance evidence

- Reconcile final v0.9 automated audit and development-version publication evidence while retaining manual release gates.
- Add opt-in synthetic noise/near-silence characterization; ordinary CI, model settings and product behavior remain unchanged.


## 0.9.0-rc.1 — 2026-10-16

- Audit bilingual state/help copy, correct both-variant decompression requirements, and synchronize Japanese usage with MIDI/CSV and full Undo/Redo.
- Improve progress naming, invalid detection-field focus and visible keyboard focus; reduce repeated playback-status announcements.
- Add bounded release audits and offline Firefox/WebKit engine coverage beside full Chromium tests.
- Record acceptance evidence and unresolved physical-device, audible DAW and assistive-technology gates; release qualification remains incomplete.


## 0.8.0 — 2026-10-16

- Add an explicit MIDI/CSV selector with one editable filename and format-specific extension.
- Export current edited notes as stable UTF-8 CSV with exact seconds, MIDI pitch and fixed velocity 96.
- Normalize repeated/mixed output extensions and preserve safe Japanese filenames.
- Verify MIDI event/readback behavior for consecutive notes, overlaps, sub-tick notes and the full pitch range.
- Explain same-pitch overlap ambiguity, fixed timing tempo and instrument differences; pitch bends remain absent.

## 0.7.0 — 2026-10-16

- Bound inference input tensors to one window while preserving pinned model alignment.
- Reuse idle model workers across successful runs and audio replacement; send bootstrap data once and reject stale job IDs.
- Cancel active analysis when hidden; retain the previous complete editor on interrupted reanalysis.
- Render timeline content only near the viewport, preserving source-time geometry and keyboard selection.
- Add performance, window-boundary and 100-cycle lifecycle/resource regression evidence. Keep 60-second limit pending physical-device gates.

## 0.6.0 — development milestone (2026-10-16)

- Preview and apply selected-note split and eligible adjacent same-pitch merge.
- Review short-note removal and optional seconds-grid start/end correction before applying; grid correction defaults OFF and does not estimate tempo.
- Apply each cleanup as one Undo/Redo operation; reject stale previews and skip invalid grid results.
- Preserve the supplied icon, local processing and existing inference/recording/export limits.

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
