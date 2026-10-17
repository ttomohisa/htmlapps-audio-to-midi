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
- WebKit suppressed the native file input's custom outline/shadow despite keyboard focus. A solid focus-within outline on its enclosing file drop zone provides an independently checked indicator outside the native control renderer. Firefox's fractional scroll restoration is checked within one CSS pixel, together with the restored content position. SVG note visibility uses explicit rectangle intersection with its scroll container and viewport, avoiding WebKit's zero IntersectionObserver ratio for visibly painted SVG notes.
- Runtime/test corrections require fresh exact-head CI; prior failures remain evidence, not passes. Engine CI is still distinct from physical Safari/Edge/device acceptance.

## Release blockers

The full physical Windows/macOS/Android/iOS matrix, actual Safari/Edge, detailed microphone refusal/device-loss behavior, DAW listening, assistive-technology reading, low-memory limits and real BFCache/sleep remain unverified. A later limited owner-reported Android/Windows Chrome recording/playback/edit/export smoke is recorded below. Real voice/instrument accuracy fixtures are not supplied. CI viewport/virtual microphone/engine evidence does not replace those gates. Do not mark this milestone complete or publish v1.0 based solely on automated checks; retain Draft until the required manual gates are satisfied or the user explicitly decides a documented support scope.

Longer-than-60-second input and pitch bends remain absent, not advertised as supported. No production/settings/dependency/model change is included.

## Final PR9 and development-version publication (2026-10-17)

Final head `411c3d935d06c1488e7965ba88ee579a351e9cff` passed [build/engine run 38957816212](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38957816212): 247 unit/contract tests, actual-model smoke, 40 Chromium, 4 Firefox and 4 WebKit route-blocked audits; [HTTPS run 38957816079](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38957816079) passed 12 tests. These supersede the intermediate failures above for that exact head. The PR records final bilingual screenshots, independent review and matching cross-engine CSV/MIDI exports.

The owner explicitly accepted development-version integration with manual gaps still unverified, then merged PR9 as `76660bf40b1f5b0ae71fa5348bde7a558dce40c8`. [Automatic Pages run 39004911835](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/39004911835) passed build and deploy. The served HTML matched artifact `12090253623` / `dist/index.html` byte-for-byte: 1,298,537 bytes, SHA-256 `6e0f4b6c4f6f37f30797c26386089dcbcd658c02d9e54bb8152f68c2cd959d7a`. This supersedes the earlier Draft status, not the unresolved physical-device, microphone, DAW, accessibility and final-release gates.

## Synthetic noise measurement

[Noise/near-silence characterization](NOISE_CHARACTERIZATION.md) records fifteen Node CPU cases and their source hashes. It is an opt-in milestone command, not routine CI. Noise can produce notes even at very low amplitude; no zero-noise-output guarantee, product threshold change or manual-gate completion is implied.

## Owner-reported physical-device smoke

On 2026-10-17 the owner reported Android and Windows, Chrome, with all four requested core flows OK: recording/stop and microphone indicator release; analyze and audible original/synth play/stop; semitone edit/revert and usable mobile controls; renamed MIDI download present in storage. This is an owner report, not an independently observed run. Device models, OS/Chrome versions and per-device served hashes are unavailable. The owner explicitly reported not owning a DAW and requested that DAW import/listening remain unverified. See M09-OWNER in the acceptance ledger; the remaining detailed/manual gates are retained.

## Bilingual usage-guidance follow-up (ATM-085)

Based on main `305f2e5f2818791def3cb49671eb21afcc0eb1b9`, both READMEs now link directly to the published app and point to the existing synthetic-noise observations. Effective English/Japanese detection help explains that quiet noise can produce notes and that Fewer may also miss weak or short musical notes. This is a copy-only clarification: model, inference, preset values, dependencies and support scope are unchanged. It does not complete physical-device, DAW or assistive-technology acceptance or qualify v1.0.

Local checks on 2026-10-17 (Linux, Node 24.19.0, PowerShell 7.6.7): preflight and repository/build validation passed; all 248 unit/contract tests passed. The existing effective-translation test was extended (observed failing before the copy change, then passing). Independent review verified every effective translation against the generated readable HTML, root/readable byte equality, and unchanged embedded asset bytes. Readable SHA-256: `b2a57b05f32b625c6c76fad65d831786462519e0577b68059d49cc68a9c265b2`.

The existing short-screen browser checks were attempted but did not reach the app: the pinned Playwright executable was absent, and system Chromium 154.0.8037.57 could not start under the environment's socket restrictions. Therefore rendered-layout checks remain unverified for this copy change; a successful browser/CI run is required before merge readiness. No new model-characterization run was needed or performed.
