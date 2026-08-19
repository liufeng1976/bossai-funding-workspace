# BossAI Funding — Production Identity & Tenant Contract

## Purpose

BossAI Funding does not own a second customer-account, password, subscription, license, token-issuer, or identity authority.

The production product may consume an authenticated principal only from an approved BossAI identity authority or approved enterprise identity provider. BossAI Funding then applies its financing-specific tenant and authorization rules.

## Current implementation truth

```text
identityMode = local-owner
remoteAccess = blocked
tenantIsolation = local-workspace-scoped
tenantScopedPersistence = implemented
authorizationEnforcementImplementation = implemented
identityVerifierAdapterContract = implemented
approvedCryptographicIdentityProvider = not-configured
productionAuthentication = not-ready
productionAuthorization = not-ready
securityReview = not-attested
```

The current standalone product is loopback-only. All 23 financing business tables are workspace-scoped, database-required, and protected by workspace/reference guards. Export/backup/restore are workspace-scoped. Browser tenant/workspace/role headers do not select authority.

## External authority responsibilities

An approved upstream identity authority must authenticate the human user and provide a cryptographically verified principal with at least:

```text
subject          stable human/user identifier
tenantId         stable customer/enterprise tenant identifier
roles            BossAI Funding role claims or approved mapped roles
issuer           approved identity issuer
authenticatedAt  authentication time
```

The adapter must also provide verification evidence for the approved integration, including:

```text
signatureVerified
issuerVerified
audienceVerified
temporalValidityVerified
revocationChecked   when required
token/session id    where applicable
expiry              where applicable
```

A parsed token is not a verified principal.

## BossAI Funding responsibilities

BossAI Funding must:

1. consume only a principal produced by the injected `IdentityVerifier` boundary;
2. validate the returned verification evidence against the configured issuer/audience/time/revocation policy;
3. require `verifiedPrincipal.tenantId == activeFundingTenantId`;
4. apply the deny-by-default `owner` / `editor` / `viewer` financing authorization policy;
5. classify every API route through the Route Security Manifest before business execution;
6. deny any unclassified `/api/*` route;
7. enforce same-origin browser request integrity and JSON-only mutation payloads before identity verification or financing mutation;
8. record financing access-control decisions in `security_decision_event`;
9. keep all critical financing Repository access workspace-scoped;
10. keep export, backup, and restore tenant/workspace scoped;
11. preserve security decision evidence across financing Restore;
12. keep BossAI OS as the only Agent Platform if financing AI Employees are introduced.

## Stable local workspace identity

Every local database has an `app_metadata.workspace_id` and a corresponding `funding_workspace` binding.

The workspace ID is a persistence scope, not authentication by itself. It becomes authoritative only in combination with server-controlled repository binding and, in a future verified-external deployment, the verified tenant binding.

## Route/status disclosure rule

In `verified-external` mode only `GET /api/health` is anonymous.

All `/api/security/*` status endpoints require authenticated `read` authority. This includes tenant-scope, identity-verifier, authorization-policy, identity-boundary, and security-review readiness projections.

The local-owner loopback product can still read these endpoints without a remote identity provider.

## Standalone configuration rule

The standalone executable does not manufacture an identity adapter from environment claims.

```text
BOSSAI_FUNDING_AUTHORIZATION_MODE=local-owner
```

is supported.

Attempting:

```text
BOSSAI_FUNDING_AUTHORIZATION_MODE=verified-external
```

without composing an approved `IdentityVerifier` is a startup error. Unknown modes are also rejected. Silent fallback is forbidden.

## Remote enablement gate

Remote network binding remains forbidden until all of the following are evidenced:

```text
tenantScopedPersistence = true                         # PASS locally
tenantScopedBackupRestore = true                       # PASS locally
databaseWorkspaceGuards = true                        # PASS
routeSecurityManifest = true                           # PASS
authorizationPolicy = true                             # PASS
authorizationEnforcementImplementation = true          # PASS with injected test verifier
securityDecisionEvidence = true                        # PASS locally
approvedExternalIdentityIntegration = true             # REMAINING
providerSpecificCryptographicNegativeTests = PASS      # REMAINING
productionSecurityReview = PASS                        # REMAINING
explicitRemoteBindApproval = true                      # REMAINING
```

Passing local/injected-adapter tests does not satisfy the remaining production gates.

## Explicit non-goals

BossAI Funding must not create its own:

- password database;
- user registration authority;
- authentication token issuer;
- subscription account authority;
- commercial-license authority;
- generic organization directory;
- second BossAI identity service;
- second company-wide Audit system.

See `AUTHORIZATION_POLICY.md` and `SECURITY_REVIEW_READINESS.md`.
