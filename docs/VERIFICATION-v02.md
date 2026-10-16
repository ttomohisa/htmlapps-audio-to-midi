# v0.2 verification record

Dependent on PR #1. The v0.1 conversion evidence remains in VERIFICATION.md.

## Local automated checks

Timeline geometry, waveform energy, exact pitch/timing, playback state/resource lifecycle and stale resume tests are added. Browser scenarios cover both file variants, synchronized playheads, selection/zoom without MIDI changes, original/synth switching, replacement, BFCache pause, narrow views and a real OfflineAudioContext render. Exact execution evidence will be recorded after CI; added browser tests are not yet claimed as passed.

## Remaining manual gates

Physical Windows/Android/iOS playback, audible speaker/headphone comparison, touch scrolling and real-instrument accuracy remain unverified. Automated Web Audio scheduling/rendering is not a physical-device listening test. No microphone or editing is included.
