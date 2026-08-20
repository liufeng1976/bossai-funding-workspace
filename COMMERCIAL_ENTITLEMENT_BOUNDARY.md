# BossAI Funding Commercial Entitlement Boundary

BossAI Funding uses two distinct legal/distribution paths and must not confuse them.

## Community / AGPL distribution

The Community build runs under `AGPL-3.0-or-later` and **must not require a proprietary BossAI commercial entitlement merely to exercise rights granted by the AGPL**.

The Community build may be used commercially when the user complies with the AGPL. BossAI Funding must not add a local license-key gate that contradicts or narrows those AGPL rights.

The implemented runtime default is:

```text
BOSSAI_FUNDING_DISTRIBUTION=community
```

Community mode does not call Headquarters Commerce and does not require any BossAI commercial token.

## Official proprietary commercial distribution

An official proprietary/commercial BossAI Funding distribution may exercise permissions granted by a separate BossAI commercial agreement. That distribution consumes entitlement from the approved external BossAI commercial authority:

```text
BossAI Headquarters Commerce
GET /api/v1/commerce/entitlement
schemaVersion = bossai.commercial-entitlement.v1
```

BossAI Funding does not become that authority.

The implemented consumer sends only:

```text
Authorization: Bearer <BossAI headquarters account session or customer key>
x-bossai-product-id: bossai-funding
x-bossai-installation-id: <non-secret installation identifier>
x-bossai-product-version: <current Funding version>
```

It sends no financing records, prompts, files, customer business content, Provider credentials, payment data, or local SQLite state.

## Implemented fail-closed checks

When:

```text
BOSSAI_FUNDING_DISTRIBUTION=commercial
```

startup requires all of the following before the local Funding server is created:

1. a configured Headquarters Commerce base URL;
2. HTTPS transport, except an explicit loopback HTTP endpoint for development/testing;
3. an externally supplied Headquarters bearer credential;
4. a stable installation identifier;
5. HTTP success from `/api/v1/commerce/entitlement`;
6. `schemaVersion = bossai.commercial-entitlement.v1`;
7. `product.id = bossai-funding` and matching product version;
8. matching installation/device ID;
9. `headquartersCommerce.authority = bossai-headquarters-commerce`;
10. Headquarters explicitly states that it does not control business execution, Provider routing, customer business content, or remote business actions;
11. `entitlement.licenseActive = true`;
12. `entitlement.membershipStatus = active`;
13. `entitlement.accessReason = AUTHORIZED`.

Missing, malformed, unavailable, denied, wrong-product, wrong-device, wrong-authority, or expanded-authority responses fail closed.

No Funding code mints or infers a replacement entitlement.

## Persistence and secret boundary

BossAI Funding does **not** persist the commercial bearer credential, entitlement response, membership, license, billing balance, subscription, or payment truth in Funding SQLite.

Electron commercial mode may persist only a generated non-secret installation identifier in its normal `userData` directory when an installation ID is not externally supplied.

The bearer credential is currently an injected runtime credential for engineering integration. It is never printed by the entitlement consumer and is not written to disk by that consumer.

## Authority that remains external

Funding must not create a second source of truth for:

- customer identity;
- account ownership;
- subscription;
- payment;
- license issuance;
- entitlement issuance;
- commercial ledger;
- billing balance.

Headquarters Commerce remains the only authority for those states.

## Current implementation status

Implemented:

- Community AGPL distribution with no proprietary entitlement dependency;
- `bossai.commercial-entitlement.v1` online consumer;
- exact product / installation / version binding;
- fail-closed commercial startup policy;
- Headquarters authority-boundary validation;
- token-minimizing error handling;
- Community and commercial unit/contract coverage;
- CLI and Electron startup integration.

Still required before an official proprietary commercial desktop release:

- approved customer account/session acquisition inside the official desktop experience;
- secure operating-system credential handling/brokerage instead of operator-injected environment credentials;
- real end-to-end acceptance against the approved production Headquarters Commerce endpoint and a real paid BossAI Funding license;
- commercial agreement/legal approval;
- signed official Windows distribution.

No offline commercial entitlement cache is implemented. Commercial mode is intentionally online fail-closed until an approved signed/offline policy exists.

## Release separation

These remain separate gates:

- Public AGPL source release: governed by `LICENSE` and open-source readiness.
- Official Community desktop binary: must comply with AGPL object-code/source obligations and release-supply-chain requirements.
- Official proprietary/commercial desktop binary: additionally requires the approved commercial agreement, real Headquarters account/session integration, entitlement evidence, and signed distribution.

See `COMMERCIAL_LICENSE.md`, `OPEN_SOURCE_READINESS.md`, and Headquarters Commerce governance.
