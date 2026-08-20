# BossAI Funding v0.51 Release Hardening Preflight

Date: 2026-08-20
Branch: `codex/v0.51-release-hardening-20260820`

## Highest commercial goal

Make the public BossAI Funding repository independently usable and commercially governable while preserving a clear paid proprietary path controlled by BossAI Headquarters Commerce.

## Largest current user gap

The source is public and the engineering installer works, but public contribution intake is still fail-closed, the Windows installer still lacks an official Funding icon and publicly trusted Authenticode signature, and the proprietary path still lacks a real production paid-account E2E.

## User problem being solved

A public user should be able to understand, build and use the Community product; a commercial customer should have a clear BossAI account/entitlement path; contributors should not create relicensing ambiguity; and official Windows distribution should have a trustworthy product identity.

## User-visible changes

- public contribution policy becomes operational without weakening dual-license rights;
- official BossAI Funding desktop icon/Windows metadata replaces the default Electron identity if a suitable product asset can be created and validated;
- source-release packaging and release notes become explicit;
- commercial authorization remains tied to `bossai-funding.commercial` and Headquarters Commerce;
- public release status clearly separates source release, unsigned engineering desktop, and signed official desktop.

## Scope

- contributor-rights workflow and GitHub merge gate;
- release automation and source release;
- desktop identity assets/metadata;
- commercial production-readiness verification and Headquarters contract checks;
- Windows signing capability discovery/integration;
- CI, security, release and provenance evidence.

## Out of scope

- creating a second license/payment/account authority;
- inventing production credentials, a public CA certificate, or a paid Headquarters account;
- weakening AGPL or contributor-rights requirements;
- remote Funding business execution;
- OpenBcon implementation access.

## Real-entry acceptance

- GitHub PR path must enforce `verify` plus contributor-rights status;
- public repository must remain buildable and pass Source CI/Windows Desktop CI;
- packaged Community and commercial secure-session desktop smoke must remain green;
- Windows installer lifecycle must pass after desktop metadata changes;
- public release artifacts must match documented hashes and signing truth.

## Claimed completion level

No Completion Level increase is claimed by this batch. Technical release hardening only; production proprietary GA still requires real Headquarters paid-account E2E and publicly trusted Windows signing.