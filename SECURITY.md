# Security Policy

## Supported version

Security fixes target the latest version on the default branch.

## Reporting a vulnerability

Do not publish sensitive vulnerability details in a public issue. Use the repository owner's private security reporting channel when available.

Include:

- Affected commit or version.
- Reproduction steps.
- Expected and actual behavior.
- Security impact.
- A minimal test file when file parsing is involved.

## Trust model

Audio to MIDI is a static, local-first application. Audio and note data never leave the device. The restrictive CSP retains connect-src 'none'; all model/runtime/worker assets are embedded and integrity-checked at build time. Only the language setting is persisted. Downloads require an explicit user action.

## Input files and resource limits

Accept one audio file up to 50 MiB. The browser decoder validates audio; the decoded duration must be 0.5–60 seconds before resampling/inference. A compressed file can still require substantial decode memory before its duration is known. Device/browser memory limits remain a risk and are not represented as fully mitigated by the file-size cap.

Each accepted source change invalidates old async work. Cancel terminates the CPU worker; decode promises are guarded by a generation token. Source PCM and notes are kept only in session memory. Blob URLs, decoders, workers and temporary tensors are released at their lifecycle boundaries. Filesystem paths and audio contents are never logged.

The HTML is executable code. Obtain it from the repository's trusted release/preview and check generated hashes when needed.

## Dependencies

Exact npm package versions and tarball SHA-256 values are committed. Build scripts reject mismatch; do not hand-edit lock hashes to bypass verification. Review upstream license/security changes before upgrades. Browser tests must verify model inference with runtime networking blocked, not just inspect CSP text.

## Microphone recording (v0.3)

Only an explicit Record gesture requests audio-only microphone access. There is no request on page load, no camera access, no live speaker monitoring, and no audio transmission. The meter uses an analysis-only Web Audio graph. Stop, discard, capture error, hidden/pagehide and disposal release microphone tracks/graph/timers; a late permission result is stopped when its generation is stale.

Native recording is capped at 59 seconds and 50 MiB, then must pass the same actual complete-Blob decoder and 0.5–60-second limit as file input. MIME support probes alone do not establish valid audio. Unsupported/denied recording leaves file conversion available. Original recording downloads require an explicit action and a sanitized filename; recordings are never persisted automatically.

A best-effort unload warning cannot guarantee recovery on mobile. Reloading or closing the page loses audio and notes. Physical microphone behavior and browser-specific recording codec coverage remain unverified until measured.
