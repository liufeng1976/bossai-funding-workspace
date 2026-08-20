# BossAI Funding Commercial Entitlement Boundary

BossAI Funding uses two distinct legal/distribution paths and must not confuse them.

## Community / AGPL distribution

The Community build runs under `AGPL-3.0-or-later` and **must not require a proprietary BossAI commercial entitlement merely to exercise rights granted by the AGPL**.

The Community build may be used commercially when the user complies with the AGPL. BossAI Funding must not add a local license-key gate that contradicts or narrows those AGPL rights.

## Official proprietary commercial distribution

An official proprietary/commercial BossAI Funding distribution may exercise permissions granted by a separate BossAI commercial agreement. That distribution must consume entitlement from the approved external BossAI commercial authority before commercial release.

BossAI Funding must not become that authority.

The Funding application may eventually consume a narrow entitlement decision such as:

```text
subject
product = bossai-funding
edition
entitlement status
feature grants
issuedAt
expiresAt
issuer / verification evidence
```

It must not create a second source of truth for:

- customer identity;
- account ownership;
- subscription;
- payment;
- license issuance;
- entitlement issuance;
- commercial ledger;
- billing balance.

## Fail-closed rule for proprietary distribution

When an official proprietary build is configured to require a commercial entitlement:

1. entitlement must come from the approved external BossAI commercial authority;
2. the entitlement must be cryptographically/verifiably bound to the expected product/subject/issuer contract;
3. unverifiable, expired, wrong-product or wrong-subject entitlement must fail closed;
4. an unavailable authority must not cause the app to mint or infer a local commercial entitlement;
5. any offline allowance must be based on an approved signed entitlement/cache policy, not an editable local boolean;
6. financing business data must not be sent to the commercial authority merely to validate a license.

## Current implementation status

The Community AGPL build is implemented and has no proprietary entitlement dependency.

The proprietary commercial-entitlement adapter is **not yet implemented**, because no approved external entitlement verification contract/endpoints/keys are defined in this repository. This is a commercial-release blocker, not a reason to invent a local license system.

## Release separation

These are separate gates:

- Public AGPL source release: governed by `LICENSE` and open-source readiness.
- Official Community desktop binary: must comply with AGPL object-code/source obligations and release-supply-chain requirements.
- Official proprietary/commercial desktop binary: additionally requires an executed commercial licensing path and approved external entitlement verification.

See `COMMERCIAL_LICENSE.md`, `OPEN_SOURCE_READINESS.md`, and the company-wide commercial authority governance before implementing the proprietary entitlement adapter.
