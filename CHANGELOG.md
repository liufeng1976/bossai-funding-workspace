# Changelog

All notable BossAI Funding changes are recorded here at release-summary level. Detailed evidence remains in `Atlas/`.

## [0.51.0] - 2026-08-20

### Added

- Active versioned contributor-rights/CLA gate with trusted-base GitHub status enforcement.
- Deterministic BossAI Funding multi-resolution Windows icon generator and product metadata.
- Tag-bound AGPL source-release workflow that cannot imply a signed Windows binary.
- Fail-closed signed-Windows release workflow requiring valid Authenticode and approved publisher identity.

### Changed

- External pull requests can now be merged only after `verify` and `contributor-rights` pass.
- Windows packaging no longer falls back to the default Electron icon.
- Source publication, Community desktop engineering builds and signed proprietary/official Windows distribution are explicitly separate release tracks.

### Release status

- Public source repository remains AGPL-3.0-or-later with separate commercial licensing.
- Public source release is eligible after protected-PR merge and tag validation.
- Official signed Windows binary release still requires a publicly trusted signing credential configured in repository secrets.
- Proprietary production GA still requires a real Headquarters paid account with `bossai-funding.commercial` and production E2E acceptance.

## [0.50.0] - 2026-08-20

### Added

- BossAI commercial-account password login and Headquarters MFA confirmation for proprietary desktop distribution.
- Four-language isolated commercial sign-in window with no renderer network/filesystem authority.
- Electron `safeStorage` encrypted commercial-session persistence, entitlement revalidation on every launch, and stale-session removal on Headquarters 401.
- Paid capability gate requiring Headquarters membership feature `bossai-funding.commercial` in addition to active license/membership authorization.
- Development and packaged secure-session smoke tests proving first login encryption, second-launch session reuse, token non-disclosure, and fail-closed stale-session handling.

### Commercial boundary

- Community remains the default and does not contact Headquarters or load proprietary account/session state.
- Funding SQLite stores no password, MFA proof, account session, membership, license, payment, subscription or entitlement authority.
- Active product license alone no longer suffices to unlock proprietary Funding; Headquarters must explicitly grant `bossai-funding.commercial`.

### Release status

- Official proprietary release still requires a real production Headquarters plan/account granting the paid feature, end-to-end paid-account acceptance, legal approval, official icon and publicly trusted Windows signing.

## [0.49.0] - 2026-08-20

### Added

- Read-only `bossai.commercial-entitlement.v1` consumer for explicit proprietary commercial distribution mode.
- Fail-closed Headquarters Commerce product/version/installation/license/membership authority checks before Funding persistence starts.
- Commercial entitlement contract tests that prove Community AGPL mode never calls Headquarters Commerce and that denied/mismatched responses cannot unlock the proprietary path.

### Commercial boundary

- Community remains the default distribution and has no proprietary entitlement dependency.
- Funding stores no commercial bearer token, membership, license, payment, subscription or entitlement authority in SQLite.
- Official proprietary desktop release still requires approved account-session acquisition, secure OS credential handling, real production Headquarters acceptance, commercial agreement approval and signed Windows distribution.

## [0.48.0] - 2026-08-20

### Added

- Windows desktop distribution layer using the existing local Funding server and SQLite authority.
- Electron/NSIS packaging configuration, desktop smoke tests and packaged-build smoke test.
- AGPL-3.0-or-later open-source license plus separate commercial-licensing path.
- Contributor, security, conduct, trademark and contributor-rights governance for public-source readiness.

### Changed

- Fresh installations default to English; explicit user locale selection remains persistent.
- Package metadata now identifies the open-source license and canonical GitHub repository.

### Release status

- Source-publication readiness and official signed desktop release remain separate gates.
- Windows code signing and legal review of dual-license / CLA terms are required before the official production release claim.

## [0.47.0] - 2026-08-19

- Owner-language completeness gate and full-DOM English-leak audit.
- Production-complete locales: English, Simplified Chinese, Traditional Chinese and Spanish.
- 251/251 machine test baseline plus desktop-width/mobile Chrome owner-readiness evidence.

## [0.38.0 - 0.46.0]

- Owner progressive disclosure, first-view decision density, return/recovery path, draft continuity, first-run next move, failure recovery, browser owner-readiness and internationalization foundation.

## [0.1.0 - 0.37.0]

- Funding profile/goal/strategy, opportunities, equity pipeline, execution, closing, outcome/receipt truth, arrival expectations, explicit reconciliation, security/tenant boundaries and local continuity.
