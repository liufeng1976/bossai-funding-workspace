# BossAI Funding Open-Source Readiness

Target: publish BossAI Funding as a usable open-source product **after** the Windows desktop distribution, licensing, security, provenance and contribution boundaries are evidence-backed.

## Licensing

- [x] Canonical open-source license selected: AGPL-3.0-or-later.
- [x] `LICENSE` matches the standard GNU AGPL v3 text.
- [x] Separate commercial-license notice exists.
- [x] README explains that AGPL itself permits commercial use when its terms are followed.
- [x] Trademark rights are separated from copyright license.
- [x] Third-party software licenses are documented.
- [ ] Qualified legal counsel approves the dual-license structure.
- [ ] Qualified legal counsel approves the contributor agreement.
- [ ] Contributor-signing workflow is operational before external PR merging.

## Repository hygiene

- [x] README, SECURITY, CONTRIBUTING, Code of Conduct, NOTICE, CLA draft, trademark policy and changelog exist.
- [x] Issue and pull-request templates exist.
- [x] CI and Windows desktop workflows exist.
- [x] Dependabot configuration exists.
- [ ] Re-run the full Git-history secret/provenance scan immediately before the final visibility change. The earlier clean scan predates later desktop/GitHub-governance commits and is retained only as historical evidence.
- [x] GitHub dependency vulnerability alerts enabled and verified; automated security fixes enabled.
- [x] GitHub Discussions enabled; Issues remain enabled.
- [x] Remote `Source CI / verify` passes on `main`.
- [x] Remote `Windows Desktop / desktop` passes on `windows-latest` for v0.48: desktop contract, Electron smoke, packaging and packaged smoke all PASS. v0.49 adds commercial dev/packaged smoke and must re-pass remotely after commit. Unsigned artifact upload is best-effort because the account artifact-storage quota is currently full.
- [ ] Private vulnerability reporting: the private-repository endpoint currently returns 404; configure/verify immediately when preparing the Public visibility change.
- [ ] Branch protection / required `verify`: GitHub API returned 403 (`Upgrade to GitHub Pro or make this repository public to enable this feature`) while the repository is Private. Enable immediately after Public visibility, before accepting external changes.

## Desktop product form

- [x] Desktop shell reuses the canonical Funding server and SQLite state.
- [x] Single-instance contract.
- [x] Loopback random-port contract.
- [x] Renderer Node integration disabled; context isolation and sandbox enabled.
- [x] Persistent per-user SQLite location.
- [x] Windows x64 NSIS packaging configuration.
- [x] User data is not deleted on uninstall by installer policy.
- [x] Development Electron smoke PASS with isolated temporary userData, default English and no horizontal overflow.
- [x] Packaged `win-unpacked` smoke PASS with packaged runtime and isolated temporary userData.
- [x] v0.49.0 NSIS installer generated. Current SHA-256: `93120CBDC9E0F455470EA11474669A1AADCD5946B055CB05C3D4690EBD75CF3E`.
- [x] Real isolated lifecycle PASS: install → first launch → single-instance rejection → save → restart → data persists → uninstall → data preserved → reinstall → data restored → final uninstall preserves data.
- [x] Packaged distribution contains Electron and Chromium bundled license files (`LICENSE.electron.txt`, `LICENSES.chromium.html`).
- [ ] Official icon and Windows metadata reviewed. Current engineering installer still uses the default Electron icon.
- [ ] Windows code-signing certificate/path approved and signed build verified. Current app EXE and installer both report `NotSigned`.

## Product / language

- [x] Fresh install default locale is English.
- [x] Explicit locale selection remains persistent UI preference only.
- [x] English / Simplified Chinese / Traditional Chinese / Spanish are production-complete locales.
- [x] Full v0.49 owner-readiness re-run: 266/266 tests PASS; desktop/responsive Chrome, 390×844 owner path, four production locales, zero-leak audit and receipt-reconciliation Chrome PASS.
- [x] Human owner installs the v0.48 desktop build, confirms it opens and runs normally, and uninstalls successfully on the target machine (2026-08-20). Machine-only evidence remains separately scoped for restart/reinstall data persistence.

## Commercial authority

- [x] Community AGPL build does not require proprietary entitlement and performs no Headquarters entitlement call.
- [x] Funding does not create a second account/payment/license/entitlement ledger.
- [x] Online `bossai.commercial-entitlement.v1` consumer is implemented for explicit commercial mode with product/install/version binding and fail-closed Headquarters authority checks.
- [x] Real Electron commercial integration smoke PASS against an isolated Headquarters mock: authorized response starts Funding; suspended license fails before SQLite creation; request body is empty; bearer material is neither logged nor persisted.
- [x] Packaged commercial EXE smoke PASS with the same success/denial boundary.
- [ ] Official proprietary commercial desktop still needs approved account-session acquisition, secure OS credential handling, real production Headquarters entitlement acceptance, commercial agreement approval, and signed Windows release.

## Publication gate

Do not change GitHub visibility from Private to Public until all blocking items above that affect legal rights, source hygiene, user-installability and security reporting are resolved or explicitly waived by the CEO with recorded evidence.

A source-publication decision is separate from a production/GA claim. An unsigned installer may be used as engineering evidence but must not be represented as an official production release.
