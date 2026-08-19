# BossAI Funding — Security Review Readiness

## Status

```text
Version target: 0.33.0
Security review: NOT ATTESTED
Remote access: BLOCKED
Production authentication: NOT READY
Production authorization: NOT READY
Local tenant-scoped persistence: READY
```

This document is a review handoff, not a production approval.

## Implemented security boundary

### Tenant persistence

- all 27 financing business tables require `workspace_id NOT NULL`;
- all 24 tables have workspace insert/update guards;
- all declared same-workspace references have database guards;
- Repository reads/writes are bound to the server-selected active workspace;
- cross-workspace Profile, Investor, Opportunity, Application, DD, Term Sheet, Closing Condition, Outcome, source, export, backup and restore negative tests pass;
- browser tenant/workspace headers do not select scope.

### Route Security Manifest

Every supported BossAI Funding API route must be registered in `src/server/api-security-manifest.ts` with one class:

```text
public
read
mutate
export-summary
export-data
backup
restore
```

The authorization layer uses the manifest as its only route-classification source. There is no implicit `GET => read` or `POST => mutate` fallback.

An unregistered `/api/*` route fails closed:

- local-owner runtime: `404 UNCLASSIFIED_API_ROUTE` and a security decision event;
- verified-external runtime: `403 API_SECURITY_CLASSIFICATION_REQUIRED` before the identity verifier is called.

This means a future API cannot become reachable merely because a developer adds a handler and forgets authorization classification.

### Local browser request integrity

State-changing `/api/*` requests (`POST`, `PUT`, `PATCH`, `DELETE`) are protected even in local-owner mode:

- mutation payloads must use `application/json`;
- browser `Sec-Fetch-Site` values other than `same-origin` / `none` are rejected;
- browser `no-cors` and navigation-mode API mutations are rejected;
- when an `Origin` header exists it must match the current loopback `Host` exactly;
- native/CLI clients may omit `Origin`, but still must use JSON for mutations;
- cross-site/simple-request denials are written to `security_decision_event` before financing state changes;
- in verified-external mode these browser-integrity denials occur before `IdentityVerifier` execution.

This closes the localhost simple-request path where a malicious web page could otherwise attempt to submit JSON text with a simple content type to an unauthenticated loopback write endpoint.

Responses also set `Cross-Origin-Resource-Policy: same-origin`, `Origin-Agent-Cluster: ?1`, and a restrictive `Permissions-Policy` in addition to the existing CSP/frame/referrer/nosniff protections.

### Startup security invariants

Server construction now treats key local security assumptions as executable startup gates rather than test-only expectations:

- Route Security Manifest keys/signatures must be unique;
- `GET /api/health` must remain the only anonymous API surface;
- every registered route sample must resolve to exactly one security classification;
- all 27 financing business tables must be workspace-scoped and `NOT NULL`;
- all 27 workspace guards and all 34 declared same-workspace reference guards must be present;
- `PRAGMA foreign_key_check` must report zero violations;
- remote eligibility must remain false at this local stage.

The Route Security Manifest is checked before tenant migration work begins. Tenant hardening is then prepared and re-inspected before the HTTP server is returned. A failed invariant blocks startup.

### Workspace stale-write protection

The active workspace has a database-backed revision counter. All 27 financing business tables are covered by INSERT/UPDATE/DELETE revision triggers (81 triggers total).

Browser mutations must submit the latest `x-bossai-workspace-revision`. An old page receives `409 STALE_WORKSPACE_STATE`; a browser mutation without a revision receives `428 WORKSPACE_REVISION_REQUIRED`. The response tells the browser to refresh while keeping unsaved form input.

State-changing browser requests are serialized through the in-process mutation coordinator so two concurrent saves using the same revision cannot both succeed. Database-level changes advance the revision independently of a specific HTTP handler. Native/CLI JSON clients without browser-origin signals remain compatible with the local product boundary.

The 81 canonical revision triggers are rebuilt and counted at server construction. Every state-changing request rechecks revision readiness; if any trigger is missing the write fails closed with `503 WORKSPACE_REVISION_GUARD_UNAVAILABLE` instead of silently losing stale-write protection. In `verified-external` mode, identity verification and tenant/role authorization occur before revision precondition details are returned, so an unauthenticated or wrong-tenant request cannot probe the current revision.

Financing Restore does not restore an old revision value. The current database triggers advance revision while the snapshot is applied, so every browser tab opened before Restore becomes stale. Owner JSON export deliberately excludes `workspace_state_revision`; native SQLite backup retains only the active workspace revision after tenant pruning.

### HTTP resource bounds

The Node HTTP server explicitly limits request resource usage:

```text
max header size       16 KiB
max header count      100
headers timeout       10 s
request timeout       30 s
keep-alive timeout     5 s
max requests/socket   100
max JSON body          1,000,000 bytes
```

Oversized raw headers are rejected by the Node HTTP parser with `431`; oversized financing JSON returns `413 REQUEST_TOO_LARGE` before business persistence.

These limits reduce local process exhaustion risk but are not a claim of production rate-limiting or public abuse-control readiness.

### External identity adapter boundary

`IdentityVerifier` is an injection contract only. It does not issue credentials and it does not implement a provider.

A verified principal is accepted only after policy checks confirm evidence for:

- signature / key verification;
- approved issuer;
- intended audience;
- temporal validity;
- maximum authentication age;
- clock skew;
- revocation check when the approved integration requires one.

No approved cryptographic provider is currently configured in the standalone product.

### Authorization enforcement

The server supports a tested `verified-external` enforcement mode behind injected verifier + policy composition.

Policy remains deny-by-default:

```text
owner  -> read, mutate, export-summary, export-data, backup, restore
editor -> read, mutate, export-summary
viewer -> read
unknown role -> deny
wrong tenant -> deny
```

The standalone executable defaults to `local-owner`. Setting:

```text
BOSSAI_FUNDING_AUTHORIZATION_MODE=verified-external
```

without an approved injected verifier is a startup error. It cannot silently fall back to local-owner.

### Security decision evidence

`security_decision_event` records BossAI Funding access-control decisions only. It is not a second BossAI enterprise Audit authority.

Recorded fields include subject, tenant, issuer, role, identity state, operation, HTTP method/path, allow/deny decision, reason, adapter key and timestamp.

Security decisions:

- are tenant-scoped;
- survive financing Restore;
- are retained in active-workspace native SQLite backup;
- are pruned for other workspaces;
- migrate from the v0.12 operation constraint without losing compatible evidence;
- record attempts against unclassified API routes.

Local evidence retention is explicit and bounded:

```text
maximum events/workspace = 5,000
pruning order            = oldest first within that workspace
subject                  = 256 chars max
tenant ID                 = 256 chars max
issuer                    = 512 chars max
HTTP method               = 16 chars max
pathname                  = 2,048 chars max
reason                    = 2,048 chars max
adapter key               = 128 chars max
```

The limit is enforced both at repository construction/startup and after each new decision, so an older database already above the cap is normalized immediately. Pruning one workspace cannot delete another workspace's evidence. `/api/security/review-readiness` reports the active workspace event count, maximum, pruning mode, and whether the limit is satisfied.

This bounded local retention is intentional. Long-term enterprise/compliance audit retention must be provided by the approved BossAI-wide audit/logging authority rather than turning BossAI Funding SQLite into an unbounded second audit system.

## v0.34 allocation-correction integrity and security posture

v0.34 changes validation and financing projections only. It does not add a new persistence surface, route, remote exposure path, identity provider, security authority, or generic audit/task system.

- Continuity remains schema 10.
- Tenant-scoped financing business tables remain 27; workspace guards remain 27; declared same-workspace reference guards remain 34.
- Workspace revision triggers remain 81 and continue to cover INSERT/UPDATE/DELETE on all 27 financing business tables.
- Route Security Manifest remains 53 routes with exactly one public route, `GET /api/health`.
- Failed Arrival Expectation shrink/cancellation corrections are rejected before persistence and therefore do not advance the workspace revision.
- Arrival-schedule write capacity is validated from remaining expectation amount, not gross recorded amount. Reconciliation-invalid Allocations are not treated as fulfilled cash simply to release additional schedule capacity.
- Receipt Tranche corrections remain authoritative and are not blocked by stale plan-side Allocation relationships. The resulting reconciliation error is a financing-domain integrity state, not a weakening of authorization, tenant isolation, or revision protection.
- Remote access remains blocked; approved production identity provider remains unconfigured; Production Security Review remains not attested.

A built-dist smoke on the local loopback runtime confirmed schema 10, 27 tenant tables, 27 workspace guards, 34 reference guards, 81 revision triggers, 53 routes, one public route, `remoteAccessDecision=blocked`, and `securityReviewAttested=false`. The same built runtime rejected an Expectation shrink below active Allocation amount with HTTP 400 and no revision change, then accepted a real Receipt Tranche amount correction with HTTP 200 while preserving the Allocation and surfacing exact critical reconciliation work.

## v0.35 repair-guidance projection and security posture

v0.35 adds a read projection to the existing Bootstrap response; it does not add a route, persistence authority, security log, identity system, remote exposure path, or mutation bypass.

- `FundingReceiptAllocationReconciliationIssue` is derived from already-authorized financing state and contains only references/amounts the authenticated local workspace can already read.
- The projection is tenant-scoped indirectly through the existing tenant-scoped repositories that supply expectations, tranches, and allocations. It does not query another workspace and does not alter reference guards.
- Repair guidance is non-mutating. It can state the minimum amount that must be corrected, but it cannot auto-void, auto-reassign, or auto-reduce an Allocation and cannot rewrite actual cash.
- Actual Receipt Tranche mutation authority remains unchanged and protected by the existing request-integrity, authorization, workspace-revision, tenant, and database constraints.
- Continuity schema remains 10; tables remain 27; workspace guards remain 27; reference guards remain 34; revision triggers remain 81; Route Security Manifest remains 53 routes / 1 public.
- The final built-dist v0.35 smoke projected exactly 5,000,000 cents required correction for a 10,000,000-cent active Allocation after the authoritative Receipt was corrected to 5,000,000 cents, while keeping `remoteAccessDecision=blocked` and `securityReviewAttested=false`.

## v0.36 owner-controlled repair drafting and security posture

v0.36 adds browser-only drafting controls and a repeatable local Chrome acceptance gate. It does not add a privileged route, mutation endpoint, persistence table, identity path, remote bind, generic task authority, or new shipped runtime dependency.

- `Draft supported amount` and `Draft void` mutate only current DOM controls. They do not call the API and cannot change persisted financing truth before the owner chooses `Save link`.
- `Draft void` deliberately does not create a void reason. Existing server validation still requires the owner to provide a real reason before a void can persist.
- Saving a repair continues to use the normal browser mutation header `x-bossai-workspace-revision`; no drafting exception exists. A second client changing the Receipt makes the old draft stale and the old Save fails with `409 STALE_WORKSPACE_STATE` before business mutation.
- Refresh after stale-state rejection preserves the owner's unsaved control values, but the UI then compares those retained values with the latest loaded supported amount and visibly flags an over-capacity draft. This convenience check does not replace server validation.
- The real built-product Chrome gate proved that a stale $50,000 repair draft could not overwrite a later $40,000 actual-cash fact, then proved the refreshed/reviewed $40,000 repair could be saved. It also proved draft-void does not persist, empty-reason void fails closed, and explicit owner reason is required for the final void.
- System Chrome is used only as an optional acceptance runtime through CDP. BossAI Funding does not ship or depend on Chrome, Electron, Playwright, Puppeteer, or another browser automation package.
- Continuity remains schema 10; tables 27; workspace guards 27; reference guards 34; revision triggers 81; Route Security Manifest 53 routes with exactly one public route. Remote access remains blocked and Production Security Review remains not attested.

## v0.37 repair-impact preview and security posture

v0.37 adds no server route or write capability. The impact preview is browser-only and reads the same already-authorized Bootstrap state plus unsaved form controls.

- Preview calculation cannot mutate financing truth, advance workspace revision, alter tenant scope, change Receipt cash, or bypass API authorization because it performs no request.
- The preview explicitly identifies itself as unsaved and states that actual Receipt cash is unchanged by the draft.
- Its `Loaded-facts capacity check` is deliberately non-authoritative. It cannot override a newer workspace revision or server-side relationship/status/capacity validation.
- `Save prerequisites` only surfaces obvious client-side omissions such as an empty owner void reason or a draft that no longer fits loaded capacity. Existing server validation remains mandatory even when the preview says the draft is ready to submit.
- Stale-state recovery still depends on `409 STALE_WORKSPACE_STATE` and Refresh; preserving the unsaved preview/draft does not carry an authorization exception into the eventual Save.
- The system-Chrome gate proves a stale $50,000 draft changes from loaded-facts fit to non-fit after a newer $40,000 Receipt correction, then proves only the refreshed $40,000 draft can reach successful persistence.
- Continuity remains schema 10; tables 27; workspace guards 27; reference guards 34; revision triggers 81; Route Security Manifest 53 routes with exactly one public route. Remote access remains blocked and Production Security Review remains not attested.

## Machine-readable review endpoint

```text
GET /api/security/review-readiness
```

The endpoint reports implemented local controls and remaining blockers, including Route Security Manifest counts, startup security invariants, workspace revision readiness, browser request integrity, and HTTP resource limits. It must continue to return:

```text
status = not-approved
remoteAccessDecision = blocked
securityReviewAttested = false
```

until a separate production security review is actually performed.

## Required external evidence before remote access can be considered

1. Approved identity provider / BossAI identity authority name and owner.
2. Credential or session format.
3. Issuer value and trust source.
4. Signature/key discovery, pinning or verification mechanism.
5. Key rotation / unknown-key behavior.
6. Audience value.
7. Tenant claim source and mapping.
8. Role claim source and mapping.
9. Expiry / not-before / authentication-age / clock-skew policy.
10. Revocation, account suspension or session invalidation behavior.
11. Provider-specific negative tests using real verification artifacts.
12. Security review covering verifier + authorization + tenant persistence together.
13. Explicit remote-bind approval.

## Explicit non-claims

This repository does not currently claim:

- a configured production identity provider;
- public or LAN remote access approval;
- penetration-test completion;
- production secrets management;
- encryption-at-rest approval;
- rate-limit / abuse-control production readiness;
- production security review approval;
- real-user acceptance.

`productionReady`, `actuallyLaunched`, and `realUserValidated` remain false.
