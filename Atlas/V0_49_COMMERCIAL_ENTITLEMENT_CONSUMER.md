# BossAI Funding v0.49 — Commercial Entitlement Consumer

Date: 2026-08-20

## Goal

Add the narrow proprietary-commercial entitlement consumer required by BossAI Funding without creating any second account, subscription, payment, license, entitlement or commercial-ledger authority.

The highest-value user/product constraint is unchanged: Community users must retain the complete local Funding product under AGPL without a proprietary gate, while an official proprietary BossAI distribution must fail closed unless Headquarters Commerce authorizes the exact product/version/installation.

## Authority boundary

Authoritative commercial source:

```text
BossAI Headquarters Commerce
GET /api/v1/commerce/entitlement
schemaVersion = bossai.commercial-entitlement.v1
```

BossAI Funding consumes the decision only. It does not issue, persist, modify, infer or repair commercial entitlement truth.

BossAI Funding sends no financing business content to Headquarters Commerce for entitlement validation.

## Distribution modes

### Community

Default:

```text
BOSSAI_FUNDING_DISTRIBUTION=community
```

Behavior:

- no Headquarters Commerce network call;
- no proprietary token required;
- AGPL rights remain usable, including commercial use when AGPL terms are followed;
- local Funding server and SQLite behavior remain unchanged.

### Commercial

Explicit:

```text
BOSSAI_FUNDING_DISTRIBUTION=commercial
```

Required runtime inputs:

```text
BOSSAI_FUNDING_HEADQUARTERS_BASE_URL
BOSSAI_FUNDING_HEADQUARTERS_BEARER_TOKEN
installation ID (explicit or Electron-generated non-secret stable identifier)
product version
```

The consumer sends only the canonical Headquarters request headers:

```text
Authorization: Bearer <account session or customer key>
x-bossai-product-id: bossai-funding
x-bossai-installation-id: <installation id>
x-bossai-product-version: <Funding version>
```

## Fail-closed checks

Commercial startup requires:

1. valid config;
2. HTTPS except explicit loopback development endpoint;
3. HTTP success;
4. `bossai.commercial-entitlement.v1`;
5. exact `bossai-funding` product ID;
6. exact product version;
7. exact installation/device binding;
8. `headquartersCommerce.authority = bossai-headquarters-commerce`;
9. Headquarters declares no business-execution/provider/customer-content/remote-action authority;
10. active product license;
11. active membership;
12. `accessReason = AUTHORIZED`.

The check completes before `FundingRepository` is constructed in both standalone and Electron startup paths.

## Persistence / secret boundary

Funding SQLite stores none of:

- bearer token;
- membership;
- product-license state;
- entitlement response;
- subscription;
- payment;
- commercial ledger or billing balance.

Electron may persist only a non-secret installation identifier in userData for explicit commercial mode when no installation ID is externally supplied.

The current bearer credential path is engineering integration only. It is injected at runtime and is not a final production desktop account/session UX.

## Tests added

`tests/commercial-entitlement.test.ts` proves:

- Community does not call Headquarters;
- canonical commercial request headers;
- fail-closed missing/invalid config;
- HTTPS requirement with loopback exception;
- inactive-license denial;
- product mismatch denial;
- installation mismatch denial;
- Headquarters authority expansion denial;
- transport/HTTP errors do not expose bearer material.

Desktop/open-source contracts additionally prove entitlement validation runs before Funding persistence and that the consumer has no Funding database dependency.

## Out of scope / blockers that remain

v0.49 does not claim an official proprietary commercial desktop release.

Still required:

- approved customer login/session acquisition in the official desktop;
- secure OS credential storage/brokerage instead of environment injection;
- real production Headquarters Commerce acceptance using a real BossAI Funding paid license;
- approved commercial agreement and legal review;
- official Funding icon;
- publicly trusted Windows code-signing path;
- signed official release.

No offline entitlement cache is implemented. Commercial mode intentionally remains online fail-closed until an approved signed/offline-grace policy exists.

## Acceptance

Specialized implementation evidence before full closure:

```text
typecheck: PASS
commercial entitlement + desktop/open-source contracts: 14/14 PASS
```

Full v0.49 owner-readiness, Electron, NSIS lifecycle, installer hash/signature and GitHub-hosted CI evidence must be appended before this version is considered machine-closed.



## Final local machine closure

Final local evidence after the commercial consumer was integrated into standalone and Electron startup:

```text
lint/typecheck/build                         PASS
full automated tests                         266/266 PASS
desktop/responsive Chrome                    PASS
390×844 owner journey                        PASS
production locale switching                  PASS
full-DOM non-English leak audit              PASS
receipt reconciliation Chrome                PASS
Community Electron smoke                     PASS
Commercial Electron smoke                    PASS
Community packaged EXE smoke                 PASS
Commercial packaged EXE smoke                PASS
NSIS install/restart/uninstall/reinstall      PASS
```

Commercial Electron evidence proves both branches:

- authorized mock Headquarters `bossai.commercial-entitlement.v1` → Funding starts in `commercial` distribution mode;
- suspended-license response → process fails closed before Funding SQLite is created;
- entitlement request body is empty;
- bearer credential is not present in stdout/stderr or temporary userData;
- packaged EXE repeats the same success/denial boundary.

Final v0.49 engineering installer:

```text
out/desktop/BossAI-Funding-Setup-0.49.0-x64.exe
SHA-256: 93120CBDC9E0F455470EA11474669A1AADCD5946B055CB05C3D4690EBD75CF3E
```

Authenticode:

```text
installer: NotSigned
packaged app EXE: NotSigned
```

The installer remains engineering/internal evidence only. It is not an official public release.

## Remaining commercial/publication blockers

The online consumer does not complete the official proprietary product path. Remaining blockers are:

- approved desktop customer account/session acquisition;
- secure operating-system credential brokerage/storage instead of operator-injected environment bearer credentials;
- real production Headquarters Commerce acceptance using an actual paid `bossai-funding` license;
- legal approval of commercial agreement / dual-license / CLA structure;
- official Funding icon;
- publicly trusted Windows code signing;
- final source-history scan immediately before visibility change;
- Public visibility security sequencing (private vulnerability reporting and branch protection/required `verify`).

Machine Technical Acceptance for the v0.49 local integration scope is PASS. Official proprietary commercial release readiness is NOT PASS. Public source release remains gated separately.
