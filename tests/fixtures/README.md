# Synthetic fixtures

`c4.mp3` is generated entirely from the `makeWav()` synthetic sine fixture in `../fixtures.cjs`, encoded with FFmpeg/libmp3lame at 96 kbps and no copied metadata. It contains no human recording or personal data. Reference: MIDI 60, 0.25–2.25 seconds within a 2.5-second clip; MP3 decoding/padding can slightly alter timing.

Regenerate by writing `makeWav()` to a temporary WAV, then:

```
ffmpeg -i input.wav -codec:a libmp3lame -b:a 96k -map_metadata -1 tests/fixtures/c4.mp3
```

Generated fixture is distributed under the repository's MIT license.

`npm run test:noise` generates seed-1729 noise, Float32 near-silence noise/C4 and silence/C4 controls directly from synthetic fixtures. See [characterization methodology and observations](../../docs/NOISE_CHARACTERIZATION.md). It is opt-in and does not read microphone or user files.
