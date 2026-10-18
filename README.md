# Audio to MIDI

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-audio-to-midi/)

[日本語版 README](README.ja.md)

A privacy-focused, single-HTML app that turns short recordings into editable notes and MIDI using Spotify Basic Pitch, without uploading your audio.

## 🚀 Live demo

### [Open Audio to MIDI on GitHub Pages](https://ttomohisa.github.io/htmlapps-audio-to-midi/)

GitHub Pages delivers the initial HTML. After it loads, recording, note detection, editing, playback and export run locally on your device. The model is included; no account or installation is required.

[![Audio to MIDI showing a synthetic melody and detected notes](assets/screenshot.png)](https://ttomohisa.github.io/htmlapps-audio-to-midi/)

## Features

- **Start with a file or your microphone** — Load a short recording, or record a melody with a level meter and listen before analyzing.
- **Find notes on your device** — Detect pitches and timing with the embedded Basic Pitch model, progress feedback and cancellation.
- **Listen and correct** — Compare the original audio with synthesized notes, then edit pitches and timing in the piano roll.
- **Clean up with control** — Add, delete, split or merge notes; preview short-note removal and optional seconds-grid correction. Undo/Redo keeps up to 100 operations.
- **Choose the output you need** — Save MIDI for a music app or a CSV note table with exact start/end times, using your own filename.
- **Private, single-HTML operation** — Embedded model, runtime and licenses; Japanese/English UI and Input / Notes / Export tabs on smartphones.

## Quick start

### Use the web demo

[Open the demo](https://ttomohisa.github.io/htmlapps-audio-to-midi/) in Chrome on Windows or Android.

### Use the download file

1. Download [audio-to-midi.html](https://github.com/ttomohisa/htmlapps-audio-to-midi/blob/main/audio-to-midi.html) using GitHub's download button.
2. Open the saved HTML in Chrome. You can choose a local audio file, analyze it and save the result without an internet connection.

Both the normal HTML and the compact [self-extracting version](https://ttomohisa.github.io/htmlapps-audio-to-midi/index.self-extract.html) embed the required assets. To save the latter, use **Save link as** rather than saving the page after it has opened. Both variants require DecompressionStream support. If local-file microphone access is unavailable, use the HTTPS demo for recording.

### Build it yourself

Clone or download this repository, then run `build-standalone.bat` on Windows. The first build downloads pinned dependencies and checks their hashes. It produces `dist/index.html`, the identical root `audio-to-midi.html`, and `dist/index.self-extract.html`. Copy either generated HTML for offline use.

## Usage

1. Choose one audio file, or press **Record**, allow microphone access and record a short melody. Press **Stop recording** and listen before analyzing.
2. Press **Analyze audio**. Keep the page visible while it processes.
3. Compare **Original audio** and **Synthesized notes** using play, pause, stop and seek.
4. Zoom or scroll the piano roll, select a note and correct its pitch or timing. Add missing notes or remove unwanted ones.
5. Choose **MIDI** or **Note table (CSV)**, edit the filename and download.
6. Open the MIDI in your music app to review the transcription. MIDI contains notes, not the original recording.

### Detection settings

Start with **Standard**. If there are unwanted notes, try **Fewer notes** and analyze again; this may also miss weak or short musical notes. **More notes** increases sensitivity. Advanced settings expose thresholds, minimum note length and pitch range. Changes apply on the next analysis.

Even very quiet noise can produce notes. These settings are not a noise-removal guarantee; compare with the original recording.

### Editing notes

Select a note to change its pitch or start/end time with nearby buttons or direct fields. C4 is MIDI 60; timing buttons step by 0.05 seconds. Add places a C4 note at the playback position.

Split a selected note or merge eligible same-pitch neighbors within 0.05 seconds. Cleanup previews short-note removal and optional seconds-grid correction before applying; each batch is one Undo step. Grid correction starts off and does not infer tempo.

Outside text fields, **Ctrl/⌘+Z** undoes and **Ctrl/⌘+Shift+Z** redoes. Edited notes are used for playback and both exports. Reanalysis or input replacement asks before discarding edits; failed or cancelled reanalysis keeps the previous result and history.

### Recording and interruptions

Recording is capped at 59 seconds and requires microphone permission, MediaRecorder and a locally decodable recording format. File conversion remains available if recording is unavailable. Stop releases the microphone; the app does not monitor it through your speakers.

Hiding the page pauses playback, stops recording and cancels active analysis. Return and explicitly analyze again to restart. A completed previous result is retained. Save needed audio and exports before closing or reloading; session data is not restored.

## Publish with GitHub Pages

The [Pages workflow](.github/workflows/deploy-pages.yml) builds and verifies both HTML variants on pushes to `main`, then publishes `dist` when GitHub Pages is enabled. Repository setup uses **Settings → Pages → Source → GitHub Actions**.

## Development and build layout

Read [AGENTS.md](AGENTS.md) and [APP_SPEC.md](APP_SPEC.md) before changing the app.

```text
src/                         # Template, UI, pure contracts and worker inference
app.config.json              # App identity and version (1.0.0)
dependencies.json            # Pinned runtimes and embedded assets
dependencies.lock.json       # Verified package hashes
scripts/                     # PowerShell build and verification
tests/                       # Contract, model and browser checks
dist/                        # Generated standalone HTML and manifests
```

Run the PowerShell preflight before repository validation:

```powershell
./scripts/check-powershell-syntax.ps1
./scripts/check-repository.ps1
```

For tests with Node 24:

```sh
npm ci --ignore-scripts
npm test
npm run test:model
npx playwright install chromium
npm run test:browser
```

Model tests use the standard build's verified package cache. Optional `npm run test:performance` and `npm run test:noise` are separate characterization runs, not required for routine documentation edits. Change development sources and rebuild; never hand-edit generated HTML. Use `scripts/update-dependency.ps1` for intentional dependency updates and retain lock/hash verification.

## Privacy and runtime network protection

- Audio, notes and model inference stay in the browser; no uploads, analytics or runtime model downloads.
- A restrictive Content Security Policy includes `connect-src 'none'`.
- Model, runtime, worker and licenses are embedded in the HTML.
- Only the language choice is persisted. Audio, edits and recordings live in the current page session.

The hosted demo makes an initial HTML request. To work with the network disconnected, open a downloaded HTML locally. Reloading or closing loses session data; mobile browsers may omit an exit warning.

## Limitations

- Version **1.0.0** targets Windows and Android Chrome with Web Audio, Workers and DecompressionStream. Other OS/browser combinations, DAW playback and screen readers remain unverified. See the [release decision and verification limits](docs/RELEASE_CHECKLIST.md).
- One file at a time, **0.5–60 seconds**, up to **50 MiB**. WAV/MP3 are accepted; M4A/AAC/OGG/FLAC/WebM also depend on browser decoding.
- Transcription is approximate. Mixed instruments, noise and harmonics can create incorrect notes. The simple synth does not reproduce the original instrument.
- MIDI uses fixed 120 BPM to preserve seconds, channel 1, piano program 0 and velocity 96. Tempo, dynamics and pitch bends are not estimated.
- Same-pitch overlapping MIDI notes may be interpreted differently by music apps. CSV preserves each exact start/end interval; neither export includes audio.
- Whole-file decoding can use much more memory than the compressed file size. Use shorter clips on constrained devices. [Performance measurements](docs/ACCEPTANCE_RESULTS.md#performance-evidence) and [synthetic noise results](docs/NOISE_CHARACTERIZATION.md) are not device-speed or general noise-rejection guarantees.

## Dependencies

| Library | Version | License | Purpose |
| --- | ---: | --- | --- |
| Spotify Basic Pitch | 1.0.1 | Apache-2.0 | Embedded model and note postprocessing |
| TensorFlow.js | 3.21.0 | Apache-2.0 | On-device CPU inference |
| Tonejs MIDI | 2.0.28 | MIT | MIDI export |

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Full runtime licenses are also available in the app's help.

## License

Copyright © 2026 ttomohisa

Licensed under the [MIT License](LICENSE).
