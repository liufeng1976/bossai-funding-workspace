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
- [x] Full current Git-history secret/provenance scan completed: 2 commits, one known author, 0 sensitive filenames, 0 high-risk token/private-key pattern hits, 0 OpenBcon implementation provenance hits after excluding the protective lint rule.
- [ ] Re-run the Git-history secret/provenance scan immediately before the final visibility change if additional commits are added.
- [ ] GitHub private vulnerability reporting enabled. Current private-repository API returns 404; configure/verify at public-release preparation.
- [ ] Branch protection / required checks enabled after the new CI workflows are committed and have produced named checks.

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
- [x] NSIS installer generated. Current SHA-256: `F22714F06F1369CF49E7A19C14FEED2DAD4F4B432B4609A88BFD54C2386C8178`.
- [x] Real isolated lifecycle PASS: install → first launch → single-instance rejection → save → restart → data persists → uninstall → data preserved → reinstall → data restored → final uninstall preserves data.
- [x] Packaged distribution contains Electron and Chromium bundled license files (`LICENSE.electron.txt`, `LICENSES.chromium.html`).
- [ ] Official icon and Windows metadata reviewed. Current engineering installer still uses the default Electron icon.
- [ ] Windows code-signing certificate/path approved and signed build verified. Current app EXE and installer both report `NotSigned`.

## Product / language

- [x] Fresh install default locale is English.
- [x] Explicit locale selection remains persistent UI preference only.
- [x] English / Simplified Chinese / Traditional Chinese / Spanish are production-complete locales.
- [x] Full owner-readiness re-run after desktop/default-language changes: 260/260 tests PASS; desktop/responsive Chrome, 390×844 owner path, four production locales, zero-leak audit and receipt-reconciliation Chrome PASS.
- [x] Human owner installs the v0.48 desktop build, confirms it opens and runs normally, and uninstalls successfully on the target machine (2026-08-20). Machine-only evidence remains separately scoped for restart/reinstall data persistence.

## Commercial authority

- [x] Community AGPL build does not require proprietary entitlement.
- [x] Funding does not create a second account/payment/license/entitlement ledger.
- [ ] Official proprietary commercial distribution consumes the approved BossAI commercial entitlement contract before commercial release.

## Publication gate

Do not change GitHub visibility from Private to Public until all blocking items above that affect legal rights, source hygiene, user-installability and security reporting are resolved or explicitly waived by the CEO with recorded evidence.

A source-publication decision is separate from a production/GA claim. An unsigned installer may be used as engineering evidence but must not be represented as an official production release.
