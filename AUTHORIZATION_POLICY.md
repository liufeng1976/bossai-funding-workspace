# BossAI Funding — Authorization Policy

## Current status

Implemented through v0.13.0 as a deny-by-default product authorization policy **plus a tested enforcement implementation**.

It is still not production authentication and it does not enable remote network access. The standalone runtime remains `local-owner`. `verified-external` may execute only when an approved `IdentityVerifier` and verification policy are injected through the server composition boundary.

Current truth:

```text
authorizationPolicyReady = true
authorizationEnforcementImplementationReady = true
routeSecurityManifestReady = true
productionAuthenticationReady = false
productionAuthorizationReady = false
remoteAccess = blocked
```

`productionAuthorizationReady` remains false because no approved real cryptographic identity provider is configured and no production security review has been attested.

## Roles

| Role | Purpose |
|---|---|
| `owner` | Enterprise owner/founder with full financing authority in the authenticated tenant |
| `editor` | Financing operator who can work records but cannot perform full-data/recovery operations |
| `viewer` | Read-only financing access |

Unknown roles receive no authority.

## Operations

```text
read
mutate
export-summary
export-data
backup
restore
```

| Operation | Owner | Editor | Viewer |
|---|---:|---:|---:|
| Read financing state | Allow | Allow | Allow |
| Mutate financing state | Allow | Allow | Deny |
| Export Owner/Board Summary | Allow | Allow | Deny |
| Export full funding data / capital pipeline | Allow | Deny | Deny |
| Create recovery backup | Allow | Deny | Deny |
| Restore recovery point | Allow | Deny | Deny |

Tenant mismatch always denies before role authority is considered.

## Route Security Manifest

`src/server/api-security-manifest.ts` is the unique API authorization classification source.

Every supported `/api/*` route is explicitly assigned one class:

```text
public
read
mutate
export-summary
export-data
backup
restore
```

There is no implicit `GET => read` or `POST => mutate` fallback.

### Public surface

Only:

```text
GET /api/health
```

is anonymous in `verified-external` mode.

Security/status endpoints such as:

```text
/api/security/identity-boundary
/api/security/authorization-policy
/api/security/identity-verifier
/api/security/tenant-scope
/api/security/review-readiness
```

are classified as `read` and require a verified viewer/editor/owner in `verified-external` mode. This prevents workspace/security state from becoming an anonymous remote disclosure surface if remote access is considered later.

### Unclassified route rule

An unregistered `/api/*` route never reaches the business handler.

```text
local-owner       -> 404 UNCLASSIFIED_API_ROUTE + security decision event
verified-external -> 403 API_SECURITY_CLASSIFICATION_REQUIRED before IdentityVerifier call
```

This makes missing security classification a development failure rather than a permissive runtime fallback.

## Browser request-integrity boundary

State-changing `/api/*` calls are not allowed to rely on local-owner mode alone. Before identity verification or financing mutation, the server requires JSON mutation payloads and rejects explicit cross-site / `no-cors` / navigation mutation metadata. When `Origin` exists it must match the current loopback Host. Native clients may omit Origin but still require `application/json`.

Cross-site or simple-request denials are security decisions. In verified-external mode they happen before the `IdentityVerifier` is called.

## Verified-external execution order

```text
Request
→ Route Security Manifest
→ browser request-integrity boundary
→ IdentityVerifier
→ verification evidence policy
→ tenant match
→ role/operation authorization
→ security decision event
→ workspace-scoped Repository
→ business response
```

Unverified identity returns `401`. Verified but unauthorized identity returns `403`. Cross-site/origin failures return `403`; non-JSON mutation payloads return `415`. Financing mutation does not execute before these decisions.

## Standalone fail-closed configuration

The normal standalone executable supports only `local-owner` until an approved verifier is composed into the runtime.

```text
BOSSAI_FUNDING_AUTHORIZATION_MODE=local-owner
```

is accepted.

```text
BOSSAI_FUNDING_AUTHORIZATION_MODE=verified-external
```

without an injected approved verifier is a startup error. Unknown values are also startup errors. The product cannot silently fall back to local-owner when an operator believes external enforcement is active.

## Security decision evidence

Authorization decisions are recorded in tenant-scoped `security_decision_event` with subject/tenant/issuer/role, identity state, operation, method/path, allow/deny result, reason, adapter key, and timestamp.

`unclassified-api` is a dedicated security operation for route-classification failures.

Security decision evidence:

- is not an enterprise-wide Audit replacement;
- survives owner financing Restore;
- is retained only for the active workspace in native SQLite backup;
- is pruned for other workspaces;
- upgrades from the v0.12 operation constraint without losing existing evidence.

## Production prerequisite

The policy must never treat a browser header, raw JSON object, unsigned token, unverified JWT, or claimed issuer as authenticated identity.

Production readiness still requires the approved upstream identity mechanism to define and prove:

- issuer trust;
- signature/key verification and key rotation;
- intended audience;
- expiry/not-before/authentication-age/clock-skew policy;
- tenant and role claim provenance;
- replay/session expectations where applicable;
- revocation/suspension behavior;
- provider-specific negative tests;
- production security review.

See `IDENTITY_TENANT_CONTRACT.md` and `SECURITY_REVIEW_READINESS.md`.
