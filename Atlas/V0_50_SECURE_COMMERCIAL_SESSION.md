# BossAI Funding v0.50 — Secure Commercial Session

Date: 2026-08-20

## Goal

Complete the proprietary desktop account/session boundary without changing Community AGPL rights or creating a second BossAI commercial authority.

Community remains the default distribution and performs no Headquarters account or entitlement call. Proprietary commercial mode must prove a paid BossAI Funding capability from Headquarters Commerce before local Funding persistence starts.

## Commercial authorization hardening

An active product license alone is insufficient because Headquarters account login may ensure a product-license record exists. v0.50 therefore requires the authoritative membership feature:

```text
bossai-funding.commercial
```

Commercial startup requires all of:

```text
licenseActive = true
membershipStatus = active
accessReason = AUTHORIZED
features includes bossai-funding.commercial
```

The product/version/installation and Headquarters authority checks from v0.49 remain mandatory.

## Secure desktop account flow

When commercial mode has no valid stored session:

```text
BossAI Funding desktop
→ isolated BossAI commercial sign-in window
→ Headquarters /api/v1/auth/login
→ optional /api/v1/auth/mfa/login/confirm
→ bossai_session_...
→ Electron safeStorage encryption
→ encrypted commercial-session.bin
→ Headquarters /api/v1/commerce/entitlement
→ FundingRepository only after authorization
```

The sign-in renderer supports English, Simplified Chinese, Traditional Chinese and Spanish. English is the default. It has no Node, filesystem, shell, child-process, direct network, or browser-persistence authority; only narrow login/MFA IPC methods are exposed through an isolated preload.

Passwords and MFA proofs are never persisted. The raw session token is not written to Funding SQLite or logs. If OS encryption is unavailable, secure-session persistence fails closed rather than falling back to plaintext.

Every launch revalidates entitlement. Headquarters HTTP 401 removes the stale encrypted session and requires a fresh account sign-in.

`BOSSAI_FUNDING_HEADQUARTERS_BEARER_TOKEN` remains an engineering integration override only and is never persisted by Funding.

## Machine evidence

Final v0.50 local evidence:

```text
lint/typecheck/build                           PASS
full automated tests                           273/273 PASS
desktop/responsive Chrome                      PASS
390×844 owner journey                          PASS
production locale switching                    PASS
full-DOM non-English leak audit                PASS
receipt reconciliation Chrome                  PASS
Community Electron smoke                       PASS
commercial env-token Electron smoke            PASS
commercial safeStorage session smoke           PASS
Community packaged EXE smoke                   PASS
commercial env-token packaged EXE smoke        PASS
commercial safeStorage packaged EXE smoke      PASS
NSIS install/restart/uninstall/reinstall        PASS
```

Secure-session smoke proves:

1. first commercial login creates one Headquarters account session;
2. the raw session token is encrypted before disk persistence;
3. the encrypted file does not contain the plaintext token;
4. second launch succeeds without account credentials by decrypting the OS-protected session;
5. entitlement is still revalidated on every launch;
6. a simulated Headquarters 401 removes the encrypted session and fails closed;
7. raw session material is absent from stdout/stderr;
8. the packaged EXE repeats the same boundary.

## Installer

```text
out/desktop/BossAI-Funding-Setup-0.50.0-x64.exe
SHA-256: 835A950EFCEAF1B9267DDC166815903EE31267FBB6783D4BFEBAD70D63A7A42B
```

Authenticode:

```text
installer: NotSigned
packaged app EXE: NotSigned
```

This remains an engineering/internal installer, not an official signed public release.

## Remaining blockers

v0.50 does not claim official proprietary commercial release readiness. Remaining blockers:

- a real production Headquarters Commerce plan/account granting `bossai-funding.commercial`;
- real paid-account end-to-end acceptance against the approved production Headquarters endpoint;
- production account registration/recovery delivery operated by Headquarters/official BossAI account surfaces;
- legal approval of commercial agreement, dual-license and contributor-rights structure;
- official BossAI Funding icon/Windows branding;
- publicly trusted Windows code signing;
- final source-history secret/provenance scan immediately before Public visibility;
- Public visibility security sequencing: branch protection/required `verify` and vulnerability-reporting confirmation;
- explicit release/publication approval.

Technical Acceptance for the implemented local v0.50 secure-commercial-session scope: PASS.
Official proprietary commercial release: NOT PASS.
Public source publication: NOT YET EXECUTED.
