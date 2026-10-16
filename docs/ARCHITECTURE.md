# Architecture

## Overview

The repository separates editable source from the release artifact:

```text
app.config.json              Product metadata
APP_SPEC.md                  Product behavior and acceptance contract
dependencies.json            Exact npm packages, assets, and update policy
dependencies.lock.json       Committed tarball SHA-256 lock
components/                   Reusable source snippets copied/adapted into apps
src/index.template.html      Editable application source
build-standalone.ps1         Dependency lock verification, embed, and build
scripts/check-dependency-updates.ps1  Update discovery/reporting
scripts/update-dependency.ps1          Reviewed upgrade helper
scripts/verify-standalone.ps1 Static release checks
<repo-name-without-htmlapps->.html  Generated repository-root copy of the readable artifact
dist/index.html              Generated readable release artifact
dist/index.self-extract.html Generated gzip self-extracting artifact
dist/build-size-report.json    Generated size and embedded-asset storage report
```

`dist/index.html`, `dist/index.self-extract.html`, and the repository-root readable copy are generated and must not be edited manually. The root copy is named from `app.config.json` `repository.name`, with a leading `htmlapps-` removed, and must remain byte-for-byte identical to `dist/index.html`.


## Reusable component layer

`components/` contains reusable source snippets for common UI and connection patterns. These files are not loaded at runtime and are not a separate bundle layer. An app copies or adapts the needed CSS, HTML, and JavaScript into `src/index.template.html`, preserving the one-file runtime model. Most components are dependency-free; dependency-aware components use the same pinned embedded-asset pipeline as the rest of the app.

The starter includes the canonical confirmation and toast APIs in the default source, while `components/` also carries the mobile bottom bar/page-tabs pattern, compact popover, preset/custom setting field, async source-state guard, and a fully serverless WebRTC QR-pairing component. Reversible operations should normally use Toast + Undo; irreversible/high-risk operations use `AppConfirm`. The WebRTC component is dependency-aware and uses the normal pinned embedded-asset pipeline rather than a runtime CDN. See `docs/COMPONENTS.md` and `docs/WEBRTC_QR_PAIRING.md`.

## Build pipeline

1. Read `app.config.json`, `dependencies.json`, and `dependencies.lock.json`.
2. Require one matching lock entry for every configured dependency.
3. Resolve each exact npm version through the npm registry when it is not already cached.
4. Verify the tarball SHA-256 against the committed lock before embedding anything.
5. Cache and extract each tarball.
6. Validate the package's own version.
7. Read only the explicitly listed asset files.
8. Calculate SHA-256 hashes for every original embedded asset.
9. Optionally gzip each declared asset (`gzip` / `auto`), then Base64-encode the stored bytes exactly once.
10. Embed the asset bundle JSON directly, avoiding a second Base64 wrapper around the whole bundle.
11. Replace the three source placeholders exactly once.
12. Write and verify `dist/index.html`, then copy it byte-for-byte to the repository root using `repository.name` with a leading `htmlapps-` removed.
13. Gzip that HTML, embed it into a small ASCII-only native `DecompressionStream` loader, inherit the readable HTML favicon, and write `dist/index.self-extract.html`.
14. Verify that the loader stays ASCII-only and embedded-only, the favicon matches the readable HTML, and the gzip payload restores byte-for-byte.
15. Write manifests, `build-size-report.json`, and `dist/.nojekyll`; emit warning-only size-budget messages when configured thresholds are exceeded.
16. Reject the declared unresolved build placeholders and common external runtime resource references.

## Dependency maintenance lifecycle

The runtime build stays deterministic while release discovery remains separate from source changes:

1. `scripts/check-dependency-updates.ps1` reads update policies and queries npm for newer versions.
2. `.github/workflows/dependency-updates.yml` runs weekly and creates/refreshes one open maintenance Issue when updates exist.
3. No dependency source file is changed by the scheduled workflow.
4. A human reviews release notes and chooses whether to run `scripts/update-dependency.ps1`.
5. The update helper refreshes the selected lock entry, verifies declared asset paths, runs the standalone build, and rolls config/lock files back if the process fails.

The update checker is a repository-maintenance network operation. It does not run inside the distributed browser app and does not weaken the app's runtime `connect-src 'none'` boundary.

## Build placeholders

The source template contains exactly one of each data placeholder:

- `__APP_CONFIG_JSON__`
- `__BUILD_MANIFEST_JSON__`
- `__EMBEDDED_ASSET_BUNDLE_JSON__`

`__APP_ICON_DATA_URI__` intentionally appears exactly twice: once for the browser favicon and once for the upper-left application brand icon. The builder reads `assets/favicon.svg` once and substitutes the same Base64 data URI into both locations; the standalone verifier rejects mismatched icon payloads.

Do not rename or duplicate these placeholders without changing the builder and verifier. Other runtime identifiers that happen to use a `__NAME__` convention are allowed and must not be rejected as build placeholders.

## Embedded asset API

The generated page exposes `window.StandaloneAssets`:

```js
StandaloneAssets.list();
StandaloneAssets.has('library-id', 'asset-key');
StandaloneAssets.bytes('library-id', 'asset-key'); // uncompressed only
await StandaloneAssets.bytesAsync('library-id', 'asset-key'); // compressed or uncompressed
StandaloneAssets.text('library-id', 'asset-key'); // uncompressed only
await StandaloneAssets.textAsync('library-id', 'asset-key');
StandaloneAssets.blobUrl('library-id', 'asset-key'); // uncompressed only
await StandaloneAssets.blobUrlAsync('library-id', 'asset-key');
await StandaloneAssets.loadClassicScript('library-id', 'main', 'ExpectedGlobal');
const module = await StandaloneAssets.importModule('library-id', 'main');
```

Blob URLs are revoked after script/module loading and on page exit. Gzip assets are expanded with native `DecompressionStream` and cached in memory after first use.

### Important limitation

`importModule` does not rewrite relative imports inside a module. Choose a self-contained browser bundle, list every required file and implement a package-specific loader, or bundle the library before embedding.

## Runtime security boundary

The default Content Security Policy blocks ordinary fetch/XHR/WebSocket-style runtime connections with `connect-src 'none'`. It also blocks frames, objects, forms, and external base URLs. Inline CSS and JavaScript are allowed because the release is intentionally one HTML document. Embedded scripts and workers may be loaded through `blob:` URLs. An application that intentionally uses peer-to-peer WebRTC DataChannels may still keep this CSP and the fully serverless `iceServers: []` design; its privacy copy must distinguish “no server/cloud transfer” from “no data leaves this device.”

Static scanning is a guardrail, not a proof. Browser developer tools should still be used to verify that the generated app makes no unexpected request.

## Large applications

Keep source in one HTML while it remains understandable. When an app grows substantially, development files may be split under `src/` and assembled by the build script. Preserve these properties:

- Two generated one-file release variants.
- Pinned and auditable dependencies.
- No runtime external resource.
- Clear state ownership.
- A build that fails on missing input.

## Audio to MIDI v0.1 runtime

Development source is split into `audio-core.js` (pure validation, mono mix, note model and MIDI), `inference-worker.js` (CPU inference with bounded tensor scopes), `app-ui.js` (generation-owned input/result state), and `ui-components.js` (adapted canonical confirmation/toast). The standard PowerShell builder concatenates these and serializes worker source and full notices; release remains one HTML.

The worker bootstrap concatenates only declared, hash-verified TF.js and Tonejs bundles plus the unchanged Basic Pitch CommonJS post-processing module. A small static module wrapper resolves its single Tonejs import; no eval/Function constructor, dynamic import, runtime fetch or bundler service is used. Model topology and weight bytes are passed directly to an in-memory TensorFlow IOHandler. The CPU backend is selected explicitly.

## v0.2 review and playback

`timeline-core.js` provides immutable source-seconds geometry and combined-channel waveform bins. `review-ui.js` owns only view/selection state and renders SVG axes, notes and synchronized playheads inside dedicated scroll regions. `playback-engine.js` owns Web Audio nodes, its monotonic resume generation and a short-lookahead synth scheduler. It retains the decoded original AudioBuffer without mono/resampling changes. Pause/stop/end/source replacement close the playback graph and release timers; hidden/pagehide never auto-resumes audio. The source UI retains separate model PCM, original playback buffer and normalized notes.

## v0.3 capture and mobile pages

- `recording-engine.js`: browser-native MediaRecorder/getUserMedia state machine with injectable clocks/devices for deterministic tests. Statuses are idle, requesting, recording, stopping, recorded, error and disposed; native final dataavailable precedes completed-Blob acceptance. Microphone graphs never connect to an output destination.
- `recording-ui.js`: session Blob ownership, explicit record/stop/listen/discard, save name/extension, async confirmation and stale decode guards. Completed recordings enter `selectFiles(..., {recorded:true})`; no separate inference path.
- `mobile-nav.js`: canonical mobile-bottom-bar adaptation, adding an async pre-navigation guard for recording. Existing desktop workspaces remain visible; phones switch one input/review/export page at a time.
- Stop on hidden and pagehide is a privacy boundary. Persisted pagehide keeps coherent session data, but real BFCache eligibility remains a separate browser gate.
- New native recording APIs add no package/license dependency. CSP and embedded model assets are unchanged.

## v0.4 editable notes

`editing-core.js` owns an immutable original detection snapshot, detached validated current notes, unique manual IDs, deletion restoration and an export-content saved fingerprint. `app-ui.js` owns the active editor and async loss-confirmation guards. `review-ui.js` only emits edit intents and maintains selection, view and input drafts. Successful edits replace the single `state.notes` reference consumed by piano rendering, Web Audio scheduling and MIDI encoding. A session/revision check rejects stale confirmation decisions and toast callbacks. No new dependencies, network or persistence boundary is introduced.

## v0.5 settings and transactional reanalysis

`detection-settings.js` defines frozen presets and validates detached settings snapshots shared by window and worker. Inference uses the pinned official postprocessor with explicit parameters and inclusive pitch/duration filtering. UI setting drafts apply only on Analyze. The old editor remains owned by the session while a candidate analysis runs; failure/cancel restores its phase, and only successful completion installs a new detection/editor. Generation checks reject stale worker responses.

`editing-core.js` records compact before/after commands (up to100), preserving IDs, exact seconds and provenance. Undo/Redo mutate the same working list and saved-content fingerprint; UI and exports continue sharing `state.notes`. A new edit invalidates Redo. Toast Undo is revision-guarded so it cannot undo an unrelated later edit.
