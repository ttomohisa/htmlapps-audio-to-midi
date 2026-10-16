# v0.9 release-candidate audit

Version 0.9.0-rc.1, 2026-10-16. This is audit preparation, not completed v0.9/v1.0 release qualification. See [acceptance results](ACCEPTANCE_RESULTS.md) for individual automated evidence and remaining manual gates. Previous record: [v0.8](VERIFICATION-v08.md).

## Publication baseline verified

PR8 head d7e0c5a105cb32fee94aa4c6a8d51f36cb4c519c passed 243 unit tests, actual-model smoke, 36 offline Chromium tests and 10 HTTPS tests. Merge ae195fa273a235dc52303460553b947cdff9ce54 was automatically published by [Pages run 38947534682](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38947534682).

The served HTML exactly matched that run's validated standalone artifact: SHA-256 `f5cbe08cbb5853d98d5aa6c13626687b74930db70655663be531ec6fe1ff11bf`. Build timestamp/compression headers may differ from the source checkout's generated copy; publication comparison used the actual deployment run artifact.

## Audit changes and required checks

- Correct bilingual compressed-HTML requirements, selected-settings progress wording and CSV-neutral review guidance.
- Name the progress indicator, identify/focus invalid detection settings and strengthen visible focus contrast.
- Avoid repeatedly announcing unchanged playback status.
- Add short-screen bilingual help-tail/focus/reduced-motion and recoverable-state/export browser audits.
- Run the bounded offline audit against Firefox and WebKit engines as well as the existing full Chromium suite; engine runs do not certify branded Safari, Edge or physical devices.
- Update bilingual usage, real screenshots and evidence mapping. Full model/license/CSP/asset-integrity and build gates remain mandatory.

Final-head CI counts and artifact links belong in the PR body. New checks are not PASS until that head succeeds.

## Release blockers

Physical Windows/macOS/Android/iOS behavior, actual Safari/Edge, real microphone permission/device-loss behavior, audible playback/DAW listening, assistive-technology reading, low-memory limits and real BFCache/sleep remain unverified. Real voice/instrument accuracy fixtures are not supplied. CI viewport/virtual microphone/engine evidence does not replace those gates. Do not mark this milestone complete or publish v1.0 based solely on automated checks; retain Draft until the required manual gates are satisfied or the user explicitly decides a documented support scope.

Longer-than-60-second input and pitch bends remain absent, not advertised as supported. No production/settings/dependency/model change is included.
