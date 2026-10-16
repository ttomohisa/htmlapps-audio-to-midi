# Audio to MIDI

Convert a short recording into MIDI using Spotify Basic Pitch, entirely on your device.

## Features

- One audio file, 0.5–60 seconds and up to 50 MiB
- WAV/MP3, plus M4A/AAC/OGG/FLAC when your browser can decode them
- On-device CPU inference, progress and immediate cancellation
- Detected note count, pitch range and timing details
- Editable filename and standard MIDI type 1 export
- Japanese/English, responsive light interface

## How to use

1. Open the generated `audio-to-midi.html` or `dist/index.html`.
2. Choose a short recording of a melody or one instrument.
3. Press **Analyze audio**. Processing speed depends on your device.
4. Check the summary, edit the filename and **Download MIDI**.
5. Open the MIDI in a music app to review the transcription.

## Privacy

Audio, notes and model inference stay in your browser. There are no runtime downloads, analytics or uploads. Only your language choice is saved. Reloading or closing the page loses the audio and notes.

## Browser support and limits

This is the **v0.1 development milestone**. Chrome/Edge/Firefox/Safari with Web Audio, Workers and DecompressionStream are target browsers. Real Windows, Android and iOS device acceptance is not yet complete; see [verification](docs/VERIFICATION.md).

Transcription is approximate. Mixed songs, noise and harmonics can create wrong notes. MIDI is note data, not audio. Output uses 120 BPM only to preserve seconds, channel 1, piano program 0 and fixed velocity 96. No tempo/loudness estimation or pitch bends.

Piano roll, playback, microphone recording and editing are future milestones. Nothing in v0.1 can correct a bad note; review it in your music app.

## Offline single HTML

The normal build produces `dist/index.html`, a byte-identical root `audio-to-midi.html`, and `dist/index.self-extract.html`. Model, runtime, worker and licenses are embedded. No server is needed after download. Both variants currently require DecompressionStream because assets are compressed.

## Development

Read [AGENTS.md](AGENTS.md) and [APP_SPEC.md](APP_SPEC.md). The supplied [development plan](docs/DEVELOPMENT_PLAN.md) and [acceptance matrix](docs/ACCEPTANCE_MATRIX.md) cover v0.1–v1.0.

Windows: run `build-standalone.bat`. Or use PowerShell:

```
./scripts/check-powershell-syntax.ps1
./scripts/check-repository.ps1
```

Node 24 test workflow:

```
npm ci --ignore-scripts
npm test
npm run test:model
npx playwright install chromium
npm run test:browser
```

Model tests require the standard build's verified package cache. Development sources are split into pure contracts, worker inference and UI; the PowerShell builder assembles them into one HTML. Never hand-edit generated files.

## License

App: MIT. Basic Pitch/model and TensorFlow.js: Apache-2.0. Tonejs MIDI: MIT. See [third-party notices](THIRD_PARTY_NOTICES.md); full runtime licenses are available in the app's help.
