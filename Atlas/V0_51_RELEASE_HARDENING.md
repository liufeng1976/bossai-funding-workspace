# BossAI Funding v0.51 Release Hardening

Date: 2026-08-20
Candidate branch: `codex/v0.51-release-hardening-20260820`
Version: `0.51.0`

## Implemented

- Active CLA `2026-08-20.1` under explicit CEO approval; no outside-lawyer approval claim.
- Trusted-base `pull_request_target` contributor-rights verifier publishes `contributor-rights` status against PR head SHA without checking out fork code.
- Exact external contributor attestation enforced; trusted BossAI account and Dependabot are narrowly allowlisted in machine policy.
- Deterministic BossAI Funding Windows icon generator, seven ICO sizes plus 512px preview.
- Electron Builder uses the generated icon for app/installer/uninstaller/header; default Electron icon fallback is gone.
- Windows metadata includes BossAI Funding product/file description, BossAI trademark, ASCII copyright, `asInvoker` requested execution level, version 0.51.0.
- Tag-bound AGPL Source Release workflow.
- Fail-closed signed Windows release workflow requiring public-trust signing secrets, Authenticode `Valid`, expected signer subject, full owner/desktop gates and installer lifecycle before upload.

## Local acceptance evidence

- `npm run verify`: PASS; 280/280 tests.
- `npm run verify:owner-readiness`: PASS.
- desktop/responsive system Chrome: PASS.
- 390x844 first-run owner readiness: PASS.
- English / Simplified Chinese / Traditional Chinese / Spanish locale switching: PASS.
- non-English full-DOM English leak audit: 0 leaks.
- receipt-reconciliation Chrome smoke: PASS.
- `npm run verify:desktop`: PASS.
- Community Electron: PASS.
- commercial environment-entitlement Electron: PASS.
- commercial Windows-safeStorage session Electron: PASS.
- `npm run verify:desktop-package`: PASS for Community, commercial entitlement, and commercial secure-session packaged EXE.
- `npm run verify:desktop-installer`: PASS for install -> launch -> single-instance -> save -> restart -> uninstall -> data retained -> reinstall -> data restored -> final uninstall.
- local source-release gate for `v0.51.0`: PASS.
- `git diff --check`: PASS before final documentation update; rerun required before commit.

## Desktop identity evidence

Generated ICO:

`ca679813f9054a43fd34ca18a60d341a2eb81f642675c030ff71817de7835571`

Generated 512px preview:

`78c9e64284cbc9816c4efc21b1d1941e7f75bd3bf6fea31a736ed16753661077`

v0.51.0 engineering installer:

`out/desktop/BossAI-Funding-Setup-0.51.0-x64.exe`

SHA-256:

`3CD9B0BF4F873F81CEBF70872C644A5036A632A27D19C89C0306B17B67A1578C`

Windows VersionInfo:

- ProductName: BossAI Funding
- FileDescription: BossAI Funding
- LegalCopyright: Copyright (c) 2026 BossAI
- LegalTrademarks: BossAI
- ProductVersion: 0.51.0.0
- FileVersion: 0.51.0

Authenticode truth:

- installer: `NotSigned`
- app EXE: `NotSigned`

## External blockers that are not to be faked

### Public-trust Windows signing

Current user certificate store contains only self-signed BossAI Development / Internal Preview code-signing certificates. GitHub repository currently exposes no configured signing-secret names. These cannot be represented as public-trust production signing.

### Real proprietary paid-account E2E

Engineering and packaged entitlement/session paths are green, but production proprietary GA still requires a real deployed Headquarters Commerce account/plan whose feature allowlist contains `bossai-funding.commercial`, followed by real paid-account E2E.

## Remote steps after protected PR merge

1. verify Source CI and Windows Desktop CI on PR;
2. merge without bypassing `main` protection;
3. validate live Contributor Rights workflow on a PR;
4. add `contributor-rights` to required `main` protection contexts;
5. create signed tag `v0.51.0` only after exact-main source/provenance scan;
6. verify Source Release workflow publishes source-only GitHub Release;
7. do not upload unsigned Windows installer to the official release;
8. run signed Windows release only after public-trust signing secrets are configured.

## Final protected-PR candidate hygiene

After replacing the credential-shaped commercial smoke fixture with a runtime-composed non-secret test value:

- commercial entitlement Electron smoke: PASS;
- high-risk source-path scan for private-key headers / AWS-style keys / GitHub tokens / OpenAI-style keys / raw BossAI session-token literals: 0 matches;
- implementation-path OpenBcon matches: 0 after excluding the explicit protective `scripts/lint.mjs` rule itself;
- GNU AGPL official text: exact match;
- `git diff --check`: PASS (Windows line-ending warnings only, no whitespace errors).

No suspected secret value was printed or retained as release evidence.