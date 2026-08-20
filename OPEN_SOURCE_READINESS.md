# BossAI Funding Open-Source Readiness

Target: publish BossAI Funding as a usable open-source product **after** the Windows desktop distribution, licensing, security, provenance and contribution boundaries are evidence-backed.

## Licensing

- [x] Canonical open-source license selected: AGPL-3.0-or-later.
- [x] `LICENSE` matches the standard GNU AGPL v3 text.
- [x] Separate commercial-license notice exists.
- [x] README explains that AGPL itself permits commercial use when its terms are followed.
- [x] Trademark rights are separated from copyright license.
- [x] Third-party software licenses are documented.
- [x] CEO explicitly waived qualified outside/legal-counsel review for source publication on 2026-08-20; no lawyer approval is claimed. See `Atlas/CEO_LEGAL_REVIEW_WAIVER_2026-08-20.md`.
- [x] CEO explicitly waived qualified outside/legal-counsel review of the contributor-rights documents for source publication; the CLA remains fail-closed and is not represented as lawyer-approved.
- [ ] v0.51 contributor-rights workflow, active CLA v2026-08-20.1 and exact PR attestation are implemented on the protected-PR candidate branch; mark operational only after merge to `main`, live status evidence, and branch-protection addition of required `contributor-rights`.

## Repository hygiene

- [x] README, SECURITY, CONTRIBUTING, Code of Conduct, NOTICE, CLA draft, trademark policy and changelog exist.
- [x] Issue and pull-request templates exist.
- [x] CI and Windows desktop workflows exist.
- [x] Dependabot configuration exists.
- [x] Final pre-public scan completed on 2026-08-20 across the 10 existing commits plus the candidate waiver/publication working tree: 0 sensitive credential/private-key filenames, 0 high-risk token/private-key pattern paths, and no OpenBcon implementation-path provenance. OpenBcon text matches are limited to explicit clean-room/provenance governance documents.
- [x] GitHub dependency vulnerability alerts enabled and verified; automated security fixes enabled.
- [x] GitHub Discussions enabled; Issues remain enabled.
- [x] Remote `Source CI / verify` passes on `main`.
- [x] Remote `Windows Desktop / desktop` passes on `windows-latest` for v0.50: Community, commercial environment-token, and commercial OS-encrypted-session development paths plus all three packaged paths PASS. v0.51 remote Windows evidence is pending protected-PR CI. Unsigned artifact upload is best-effort because the account artifact-storage quota is currently full.
- [x] GitHub Private Vulnerability Reporting enabled and verified after Public visibility.
- [x] `main` branch protection enabled after Public visibility: strict required status check `verify`, linear history required, force-push disabled, branch deletion disabled, and conversation resolution required.

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
- [x] v0.51.0 NSIS engineering installer generated after final local gates. SHA-256: `3CD9B0BF4F873F81CEBF70872C644A5036A632A27D19C89C0306B17B67A1578C`.
- [x] Real isolated lifecycle PASS: install → first launch → single-instance rejection → save → restart → data persists → uninstall → data preserved → reinstall → data restored → final uninstall preserves data.
- [x] Packaged distribution contains Electron and Chromium bundled license files (`LICENSE.electron.txt`, `LICENSES.chromium.html`).
- [x] BossAI Funding Windows identity is deterministic and source-generated: 7-size ICO, `ProductName=BossAI Funding`, `FileDescription=BossAI Funding`, `LegalCopyright=Copyright (c) 2026 BossAI`, `LegalTrademarks=BossAI`, `requestedExecutionLevel=asInvoker`. Electron Builder no longer reports the default Electron icon fallback.
- [x] Fail-closed signed Windows release workflow exists and requires `Authenticode=Valid`, an approved signer-subject contract, full owner/desktop gates, and installer lifecycle before upload.
- [ ] Public-trust Windows code-signing credential is still external: local certificate store contains only self-signed BossAI development/preview certificates and GitHub currently has no `WINDOWS_CSC_LINK`, `WINDOWS_CSC_KEY_PASSWORD`, or `WINDOWS_SIGNING_EXPECTED_SUBJECT` secrets. Current v0.51 app EXE and installer both report `NotSigned`.

## Product / language

- [x] Fresh install default locale is English.
- [x] Explicit locale selection remains persistent UI preference only.
- [x] English / Simplified Chinese / Traditional Chinese / Spanish are production-complete locales.
- [x] Full v0.51 owner-readiness re-run: 280/280 tests PASS; desktop/responsive Chrome, 390×844 owner path, four production locales, zero-leak audit and receipt-reconciliation Chrome PASS.
- [x] Human owner installs the v0.48 desktop build, confirms it opens and runs normally, and uninstalls successfully on the target machine (2026-08-20). Machine-only evidence remains separately scoped for restart/reinstall data persistence.

## Commercial authority

- [x] Community AGPL build does not require proprietary entitlement and performs no Headquarters entitlement call.
- [x] Funding does not create a second account/payment/license/entitlement ledger.
- [x] Online `bossai.commercial-entitlement.v1` consumer is implemented for explicit commercial mode with product/install/version binding and fail-closed Headquarters authority checks.
- [x] Proprietary mode additionally requires Headquarters paid capability `bossai-funding.commercial`; active product license alone is insufficient.
- [x] BossAI commercial-account password login and Headquarters MFA client implemented without Funding business-data access.
- [x] Commercial desktop session is encrypted with Electron `safeStorage`; passwords/MFA proofs/raw sessions do not enter Funding SQLite.
- [x] Real development Electron secure-session smoke PASS: first login encrypted, second launch reused secure session, entitlement revalidated each launch, 401 removed stale session, raw session not logged.
- [x] Packaged commercial secure-session smoke PASS with the same encrypted-session and stale-session boundary.
- [ ] Official proprietary commercial desktop still needs a real production Headquarters plan/account granting `bossai-funding.commercial`, production paid-account E2E acceptance, and publicly trusted Windows signing. Outside-counsel review and desktop icon are no longer blockers.

## Publication gate

- [x] GitHub repository visibility changed from Private to **Public** on 2026-08-20 after the final candidate history/worktree scan and a successful `Source CI / verify` run on commit `7fd588e`.
- [x] GitHub recognizes the repository license as GNU Affero General Public License v3.0 / AGPL-3.0.
- [x] Secret Scanning enabled.
- [x] Secret Scanning Push Protection enabled.
- [ ] GitHub extended non-provider secret patterns and validity checks remain disabled by the current account/platform capability; this is not represented as enabled.
- [x] Tag-bound AGPL Source Release workflow implemented with package/tag identity verification and an explicit no-signed-Windows-binary claim.
- [ ] First tag-driven Source Release (`v0.51.0`) is pending protected-PR merge and tag creation.

The public-source publication decision is separate from a production/GA claim. The CEO legal-review waiver is recorded and must never be described as lawyer approval. An unsigned installer may be used as engineering evidence but must not be represented as an official production release.
