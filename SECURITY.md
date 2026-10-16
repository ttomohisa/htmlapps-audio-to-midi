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
