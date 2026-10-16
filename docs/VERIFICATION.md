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
- Run the bounded network-blocked audit against Firefox and WebKit engines as well as the existing full Chromium suite; engine runs do not certify branded Safari, Edge or physical devices.
- Update bilingual usage, real screenshots and evidence mapping. Full model/license/CSP/asset-integrity and build gates remain mandatory.

Final-head CI counts and artifact links belong in the PR body. New checks are not PASS until that head succeeds.

## Cross-engine findings during the audit

- Head 54a1617 passed 246 unit tests, actual-model smoke, 40 offline Chromium tests and 12 HTTPS tests. Firefox completed edited-note CSV/MIDI output but failed the zero-console-error gate on the pinned runtime's optional long-integer WebAssembly optimization; CPU inference itself completed. CSP is not relaxed to permit that optimization.
- Native dialog keyboard navigation differs between engines. The audit must reject focus on background controls and verify keyboard return/close, without assuming a fixed forward-Tab cycle through browser chrome.
- WebKit's protocol-offline emulation rejected initial local-file navigation and then internal blob reads after navigation. The WebKit audit blocks every HTTP(S) request before loading local HTML and records any attempted request as a failure. An isolated synthetic input-file read probe records offline-off/on/off behavior separately from the app's strict console-error gate. WebKit uses protocol-offline mode only if the isolated offline read succeeds; otherwise the report explicitly records route-blocked-only coverage, not protocol-offline coverage. Chromium/Firefox additionally enable protocol-offline mode after document loading. Initial deployed HTML is the only allowed HTTP navigation. Physical offline Safari/iOS remains unverified.
- WebKit suppressed the native file input's custom outline despite keyboard focus. A file-input-only solid focus shadow now provides an independently checked indicator. Firefox's fractional scroll restoration is checked within one CSS pixel, together with the restored content position.
- Runtime/test corrections require fresh exact-head CI; prior failures remain evidence, not passes. Engine CI is still distinct from physical Safari/Edge/device acceptance.

## Release blockers

Physical Windows/macOS/Android/iOS behavior, actual Safari/Edge, real microphone permission/device-loss behavior, audible playback/DAW listening, assistive-technology reading, low-memory limits and real BFCache/sleep remain unverified. Real voice/instrument accuracy fixtures are not supplied. CI viewport/virtual microphone/engine evidence does not replace those gates. Do not mark this milestone complete or publish v1.0 based solely on automated checks; retain Draft until the required manual gates are satisfied or the user explicitly decides a documented support scope.

Longer-than-60-second input and pitch bends remain absent, not advertised as supported. No production/settings/dependency/model change is included.
