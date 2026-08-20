# BossAI Funding Commercial Entitlement Boundary

BossAI Funding has two distinct distribution paths and must not confuse them.

## Community / AGPL distribution

The Community build runs under `AGPL-3.0-or-later` and **must not require a proprietary BossAI commercial entitlement merely to exercise rights granted by the AGPL**.

The Community build may be used commercially when the user complies with the AGPL. BossAI Funding must not add a local license-key gate that contradicts or narrows those AGPL rights.

Default:

```text
BOSSAI_FUNDING_DISTRIBUTION=community
```

Community mode:

- does not call Headquarters Commerce;
- does not require BossAI commercial account login;
- does not load or persist a proprietary session;
- uses the same local Funding server and SQLite business authority.

## Official proprietary commercial distribution

An official proprietary/commercial BossAI Funding distribution exercises permissions granted by a separate BossAI commercial agreement. Commercial identity and entitlement come only from:

```text
BossAI Headquarters Commerce
GET /api/v1/commerce/entitlement
schemaVersion = bossai.commercial-entitlement.v1
```

BossAI Funding consumes the decision only. It does not become an account, membership, payment, license, entitlement, billing, or commercial-ledger authority.

### Commercial paid-capability gate

An active product-license row by itself is not sufficient to unlock proprietary BossAI Funding.

Commercial Funding additionally requires the Headquarters membership paid-capability allowlist to contain:

```text
bossai-funding.commercial
```

Funding therefore requires all of:

```text
licenseActive = true
membershipStatus = active
accessReason = AUTHORIZED
features includes bossai-funding.commercial
```

This prevents an ordinary active BossAI account or automatically provisioned product-license record from silently becoming a proprietary BossAI Funding commercial grant.

## Desktop commercial account session

For the Windows desktop product, `commercial` mode no longer requires an operator to inject a Bearer token on every launch.

Required commercial deployment input:

```text
BOSSAI_FUNDING_DISTRIBUTION=commercial
BOSSAI_FUNDING_HEADQUARTERS_BASE_URL=https://<approved-headquarters-host>
```

Electron uses a stable non-secret installation ID. If `BOSSAI_FUNDING_INSTALLATION_ID` is not provided, the desktop generates one and stores only that identifier in userData.

If no valid commercial session is available:

```text
commercial desktop
→ BossAI commercial sign-in window
→ POST /api/v1/auth/login
→ optional POST /api/v1/auth/mfa/login/confirm
→ bossai_session_...
→ Electron safeStorage encryption
→ encrypted commercial-session.bin in userData
→ GET /api/v1/commerce/entitlement
→ Funding SQLite starts only after authorization
```

The sign-in window supports English, Simplified Chinese, Traditional Chinese, and Spanish. English is the default.

The renderer receives only narrow login/MFA IPC methods through an isolated preload. It has no Node, filesystem, shell, child-process, arbitrary IPC, or network API.

## Secure storage boundary

On the Windows desktop:

- `safeStorage.isEncryptionAvailable()` must be true before a session can be persisted;
- `safeStorage.encryptString()` encrypts the BossAI account session using the OS-backed Electron secure-storage provider (Windows DPAPI on the supported target);
- only the encrypted bytes are written to `commercial-session.bin`;
- the session token is never written to Funding SQLite;
- the password is never persisted;
- MFA challenge/proof values are never persisted;
- the raw session token is not printed to application logs;
- entitlement is revalidated on every app launch;
- HTTP 401 invalidates and removes the stored encrypted session before a new login is allowed;
- if secure OS encryption is unavailable, commercial session persistence fails closed rather than falling back to plaintext.

A stored session is not itself a commercial grant. Every launch still requires current Headquarters entitlement.

## Engineering Bearer override

`BOSSAI_FUNDING_HEADQUARTERS_BEARER_TOKEN` remains supported only as an engineering/integration override. When explicitly supplied, Funding verifies that token against the same Headquarters entitlement contract and does not persist it.

Do not bake this environment credential into source, installer configuration, `.env`, command history, CI artifacts, or official release assets.

## Entitlement request minimization

Funding sends only:

```text
Authorization: Bearer <BossAI account session or customer key>
x-bossai-product-id: bossai-funding
x-bossai-installation-id: <non-secret installation identifier>
x-bossai-product-version: <current Funding version>
```

It sends no financing records, prompts, files, customer business content, Provider credentials, payment data, or local SQLite state.

## Fail-closed checks

Commercial startup requires all of:

1. a configured Headquarters Commerce base URL;
2. HTTPS transport, except explicit loopback HTTP for isolated development/testing;
3. a current account session/customer key;
4. a stable installation identifier;
5. HTTP success from `/api/v1/commerce/entitlement`;
6. `schemaVersion = bossai.commercial-entitlement.v1`;
7. exact `product.id = bossai-funding` and matching product version;
8. exact installation/device ID;
9. `headquartersCommerce.authority = bossai-headquarters-commerce`;
10. Headquarters declares no business execution, Provider routing, customer-content, or remote-business-action authority;
11. active product license;
12. active membership;
13. `accessReason = AUTHORIZED`;
14. paid-capability feature `bossai-funding.commercial`.

Missing, malformed, unavailable, denied, wrong-product, wrong-device, wrong-authority, inactive or feature-missing responses fail closed before `FundingRepository` is constructed.

## Authority that remains external

Funding must not create a second source of truth for:

- customer identity;
- account ownership;
- subscription;
- membership plan;
- payment;
- license issuance;
- paid feature issuance;
- entitlement issuance;
- commercial ledger;
- billing balance.

Headquarters Commerce remains the sole authority for those states.

## Current implementation status

Implemented:

- Community AGPL distribution with no proprietary entitlement dependency;
- online `bossai.commercial-entitlement.v1` consumer;
- exact product / installation / version binding;
- `bossai-funding.commercial` membership-feature gate;
- fail-closed Headquarters authority checks;
- BossAI account password login client;
- TOTP/recovery-code MFA login confirmation;
- isolated four-language commercial login renderer;
- Electron `safeStorage` encrypted session persistence;
- stale-session removal on Headquarters 401;
- entitlement revalidation on every launch;
- CLI and Electron entitlement integration;
- development and packaged Electron evidence for environment-token and safe-session paths.

Still required before an official proprietary commercial release:

- an approved production Headquarters Commerce endpoint with a real plan/membership that grants `bossai-funding.commercial`;
- real paid-account end-to-end acceptance against that production endpoint;
- production account registration/recovery delivery operated by Headquarters/official BossAI account surfaces;
- approved commercial agreement/legal review;
- official Funding icon;
- publicly trusted Windows code signing;
- explicit final release approval.

No offline commercial entitlement cache is implemented. Commercial mode intentionally remains online fail-closed until an approved signed/offline-grace policy exists.

## Release separation

These remain separate gates:

- Public AGPL source release: governed by `LICENSE` and open-source readiness.
- Official Community desktop binary: must comply with AGPL object-code/source obligations and release-supply-chain requirements.
- Official proprietary/commercial desktop binary: additionally requires the approved commercial agreement, real production Headquarters account/paid-feature evidence, and signed distribution.

See `COMMERCIAL_LICENSE.md`, `OPEN_SOURCE_READINESS.md`, and Headquarters Commerce governance.
