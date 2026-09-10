# BossAI Funding Public-Source Readiness

This file keeps the historical publication evidence for BossAI Funding while recording the current license model.

The repository was originally published under AGPL-3.0-or-later through `v0.51.0`. The current post-`v0.51.0` source line is **BossAI Community Source License 1.0**: source available, non-commercial use permitted under `LICENSE`, and commercial use requires BossAI authorization. Historical AGPL rights are preserved in `LICENSE_HISTORY.md`.

## Current licensing

- [x] Current license: BossAI Community Source License 1.0.
- [x] `package.json` uses `LicenseRef-BossAI-Community-Source-1.0`.
- [x] Current repository wording says **Source Available / Community Source, not OSI Open Source**.
- [x] Personal, educational, evaluation, research, and other non-commercial use is permitted subject to `LICENSE`.
- [x] Current commercial use requires BossAI commercial authorization.
- [x] Historical `v0.51.0` and revisions at or before `6600da2899d83eddcfc43efbc2d81805d662d77a` retain their existing AGPL rights.
- [x] `LICENSE_HISTORY.md` records the historical/current boundary without attempting to revoke prior grants.
- [x] Trademark rights remain separate from copyright/source-license rights.
- [x] Third-party software licenses remain separately documented.
- [x] Community runtime mode remains local/offline and does not contact Headquarters merely to start; this technical behavior does not grant commercial-use rights.
- [x] Proprietary commercial mode continues to require Headquarters entitlement and fail closed.

## Contributor rights

- [x] CLA v2026-08-20.1 historically granted BossAI sufficient sublicensing and relicensing rights for accepted contributions.
- [x] Active CLA for new contributions is v2026-09-06.1.
- [x] Active CLA expressly covers Community Source/source-available, open-source, commercial, and proprietary relicensing paths.
- [x] Exact PR attestation and `.github/contributor-rights-policy.json` use the same active CLA version.
- [x] Trusted-base `pull_request_target` evaluation remains fail-closed for external contributors.
- [x] Required protected checks remain `verify` and `contributor-rights`; branch protection must not be bypassed for external contributions.
- [x] The CEO legal-review waiver remains historical governance evidence and is not represented as lawyer approval. See `Atlas/CEO_LEGAL_REVIEW_WAIVER_2026-08-20.md`.

## Repository hygiene

- [x] README, SECURITY, CONTRIBUTING, Code of Conduct, NOTICE, CLA, trademark policy, changelog, license history, and third-party license records exist.
- [x] Issue and pull-request templates exist.
- [x] CI and Windows desktop workflows exist.
- [x] Dependabot configuration exists.
- [x] Historical final exact-main pre-tag scan completed on 2026-08-20 at `4a2d9f5121e282bba91a1d0aa23b9c9090d7e90f`: no sensitive credential/private-key filenames, no common private-key/AWS/GitHub/OpenAI secret-pattern paths, and no OpenBcon implementation-path provenance were reported.
- [x] GitHub dependency vulnerability alerts and automated security fixes were enabled and verified for the public repository.
- [x] GitHub Discussions and Issues were enabled.
- [x] GitHub Private Vulnerability Reporting was enabled after Public visibility.
- [x] Historical branch protection evidence records strict required checks, linear history, force-push disabled, branch deletion disabled, and conversation resolution required.

## Desktop product form

- [x] Desktop shell reuses the canonical Funding server and SQLite state.
- [x] Single-instance contract.
- [x] Loopback random-port contract.
- [x] Renderer Node integration disabled; context isolation and sandbox enabled.
- [x] Persistent per-user SQLite location.
- [x] Windows x64 NSIS packaging configuration.
- [x] User data is not deleted on uninstall by installer policy.
- [x] Development and packaged smoke paths exist.
- [x] Historical `v0.51.0` NSIS engineering installer evidence was generated and tested but was not published as a trusted production binary.
- [x] Packaged distribution contains the applicable Electron/Chromium license files.
- [x] BossAI Funding Windows identity is deterministic and source-generated.
- [x] Signed Windows release workflow fails closed unless trusted Authenticode and publisher identity gates pass.
- [ ] Public-trust Windows code signing remains an external release prerequisite for an official signed Windows release unless a later recorded release decision proves it satisfied.

## Product / language

- [x] Fresh install default locale is English.
- [x] Explicit locale selection remains presentation state only.
- [x] English / Simplified Chinese / Traditional Chinese / Spanish are production-complete locales in the recorded v0.51 evidence.
- [x] Historical owner-readiness evidence includes desktop/responsive Chrome, 390×844 owner path, locale and receipt-reconciliation checks.

## Commercial authority

- [x] Community Source local mode does not require proprietary entitlement merely to run eligible non-commercial use and performs no Headquarters entitlement call.
- [x] Absence of a local entitlement check is explicitly **not** commercial-use authorization.
- [x] Funding does not create a second account/payment/license/entitlement ledger.
- [x] Online `bossai.commercial-entitlement.v1` consumer remains implemented for explicit proprietary commercial mode with product/install/version binding and fail-closed Headquarters authority checks.
- [x] Proprietary mode additionally requires Headquarters paid capability `bossai-funding.commercial`; active product license alone is insufficient.
- [x] BossAI commercial-account login and Headquarters MFA client remain outside Funding business-data authority.
- [x] Commercial desktop session uses Electron `safeStorage`; passwords/MFA proofs/raw sessions do not enter Funding SQLite.
- [ ] Official proprietary commercial desktop still requires the production account/plan entitlement evidence and signed-distribution gates recorded by current release governance.

## Historical AGPL publication evidence

The following are historical facts and are intentionally preserved rather than rewritten as current policy:

- [x] Repository visibility changed from Private to Public on 2026-08-20 after the recorded source scan and Source CI evidence.
- [x] GitHub recognized the historical repository license as GNU Affero General Public License v3.0 / AGPL-3.0.
- [x] Secret Scanning and Secret Scanning Push Protection were enabled.
- [x] The historical tag-bound AGPL Source Release workflow produced `v0.51.0` from the recorded exact main revision.
- [x] Historical `v0.51.0` Release was source-only and did not publish an unsigned Windows installer as an official binary.

## Current release gate

- [x] Current package/source line is `0.52.0` with `LicenseRef-BossAI-Community-Source-1.0` metadata.
- [x] Source-release verifier requires the package/tag identity and current Community Source license metadata.
- [x] Source-release workflow labels future source releases as **Community Source Release** and states commercial use requires BossAI authorization.
- [x] Future Community Source releases must preserve the historical AGPL notice rather than implying old rights were revoked.
- [x] Public-source publication remains separate from production/GA approval.
- [x] Unsigned installer evidence must not be represented as an official production release.

The filename `OPEN_SOURCE_READINESS.md` is retained for repository-history continuity. Its current contents intentionally use **Public Source / Community Source** terminology because the current BossAI Funding line is not OSI open source.
