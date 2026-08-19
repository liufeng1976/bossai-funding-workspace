# BossAI Funding Implementation Provenance

## Clean-room declaration

BossAI Funding is being implemented independently from the BossAI product specification and permitted sources listed below.

The OpenBcon repository at `D:\BossAI-Projects\OpenBcon` has not been used as an implementation source for this project. It must not be inspected or compared during BossAI Funding development.

## 2026-08-15 — Phase 0 / Phase 1 foundation

### Permitted sources used

1. CEO-provided BossAI Funding specification in the task that created this repository.
2. BossAI Company Constitution `2026.08.14.1` at `C:\Users\42059\Projects\Atlas\COMPANY_CONSTITUTION.md`.
3. Company-wide BossAI `AGENTS.md` directives.
4. General financing-domain concepts including grant/debt/equity capital structures, fundraising pipeline states, runway, and repayment capacity.
5. Official Node.js runtime capabilities available in Node 24, including native HTTP and SQLite modules.

### Independent design decisions

- Owner-first CEO Capital Command Center rather than a module-centric administrator dashboard.
- Integer-cent monetary storage.
- Funding-specific `funding_action` as a bounded application entity, not a generic Agent/task platform primitive.
- Deterministic explainable capital strategy before any model-based analysis.
- Explicit Today's Focus scoring based on deadline, stage, value, priority, and track.
- Native HTTP + SQLite architecture to keep Phase 1 runtime small and commercially license-friendly.

### Explicitly not used

- OpenBcon source code or Git history.
- OpenBcon database schema or migrations.
- OpenBcon UI, CSS, components, copy, prompts, APIs, tests, assets, README, or implementation details.
- Any third-party proprietary code or protected UI assets.

## 2026-08-15 — Owner continuity and local security

### Permitted sources used

1. Existing BossAI Funding project requirements and Phase 1–4 independently created domain contracts.
2. BossAI Company Constitution `2026.08.14.1`.
3. Installed Node.js 24 runtime behavior, verified locally for the built-in `node:sqlite.backup` API and read-only SQLite reopen behavior.
4. General software continuity practices: integrity verification, pre-restore recovery point, transactional restore, controlled file paths, and fail-closed local network exposure.

### Independent design decisions

- `funding_activity` is financing business history only and does not act as a second company-wide Audit authority.
- Backup files are created only in the product-controlled local backup directory.
- Every new backup is reopened read-only and verified before it is presented as a recovery point.
- Recovery requires an explicit `RESTORE` confirmation, validates product/schema/table identity, creates a pre-restore backup, and restores only a fixed BossAI Funding table whitelist inside a transaction.
- Remote bind and non-loopback Host requests are blocked until production authentication and tenant isolation are implemented.
- No new third-party runtime dependency was introduced.

### Explicitly not used

- OpenBcon source code, schema, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Any OpenBcon implementation detail as a reference for backup, restore, history, or security behavior.

## 2026-08-15 — First official funding-source integration

### Permitted source used

Grants.gov official public API documentation and terms were reviewed only to establish the public integration contract. The implementation uses the documented public `search2` and `fetchOpportunity` REST endpoints and follows the Grants.gov API attribution requirement.

Official references are recorded in `DATA_SOURCES.md`. No Grants.gov source code, proprietary implementation, protected UI assets, or non-public material was used.

### Independent design decisions

- External source search runs only after an explicit owner action; there is no startup/background harvesting.
- Search is capped at 10 results per owner action.
- Source facts and owner decisions are separated: official refresh can update source facts but cannot reset `saved`, `pursuing`, or `dismissed` owner decisions.
- Every imported record gets a separate `funding_source_record` with provider key, source kind, external ID/number, canonical detail URL, API endpoint, terms URL, fetched-at time, and attribution.
- Manual opportunities also receive a manual provenance record so all opportunities have a traceable source class.
- Missing award amount, geography, stage, matching-fund amount, or other official fields remain missing rather than being inferred.
- Grants.gov eligibility fields are treated as source summaries; official notices/application instructions remain the controlling source for an actual application decision.
- Source outages return a recoverable `SOURCE_UNAVAILABLE` state without deleting or rewriting saved funding opportunities.

### New third-party runtime impact

None. The integration uses Node's built-in `fetch` implementation and adds no npm runtime dependency.

### Explicitly not used

- OpenBcon source code, schema, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Unlicensed commercial grant datasets.
- Silent web scraping of Grants.gov pages.

## 2026-08-15 — Production identity boundary and owner handoff

### Permitted sources used

1. Existing BossAI company architecture rule that BossAI Funding must not create a second commercial-account or platform authority.
2. General multi-tenant application security principles: authenticated external principal, explicit tenant scope, deny-by-default remote exposure, and cross-tenant negative testing before production enablement.
3. Existing independently implemented BossAI Funding owner data, dashboard projections, source provenance and recovery contracts.

### Independent design decisions

- Added `IDENTITY_TENANT_CONTRACT.md` as a consumption-only identity contract.
- BossAI Funding does not issue passwords, registrations, subscriptions or commercial identities.
- Future production identity must supply externally verified `subject`, `tenantId`, `roles`, `issuer`, and `authenticatedAt` claims.
- Every local database receives a stable generated `workspace_id` for continuity/export provenance and future tenant-binding migration; it is explicitly not treated as tenant isolation.
- Remote access remains blocked because the current business tables are not tenant-scoped.
- High-frequency form validation now carries a field identifier so the browser can show the exact correction while retaining entered values.
- Added deterministic Owner/Board Capital Summary export from persisted facts without model narration.
- Continuity schema version advanced to `2` because external-source provenance and workspace identity are now part of the required recovery set.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Any third-party authentication SDK or proprietary identity implementation.

## 2026-08-15 — Owner journey readiness and acceptance preparation

### Permitted sources used

1. Existing BossAI Funding product journey and acceptance requirements.
2. Existing independently implemented financing domain projections and continuity state.
3. General usability acceptance practice: unassisted task completion, objective evidence, no developer workarounds, and separation of automated acceptance from human experience acceptance.
4. General multi-tenant migration practice for explicit row/workspace scope and cross-tenant negative testing.

### Independent design decisions

- Added deterministic `OwnerJourneyProgress` with five first-run stages: Capital plan, Find money, Choose what to pursue, Move the financing, Protect the work.
- Each stage exposes completion, reason, next step and product destination from persisted state.
- Added `OWNER_ACCEPTANCE.md`; it explicitly requires a real target-device session and does not allow automated tests to set `realUserValidated=true`.
- Added `TENANT_SCOPING_MIGRATION.md` with the required business-table scope matrix, export/backup/restore rules and cross-tenant negative tests.
- Remote access remains blocked; the tenant document is preparation, not an enablement change.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party UX or multi-tenant source code.

## 2026-08-15 — Local tenant-scoped persistence foundation

### Permitted sources used

1. Existing `IDENTITY_TENANT_CONTRACT.md` and `TENANT_SCOPING_MIGRATION.md` created independently for BossAI Funding.
2. Existing BossAI Funding SQLite/domain/repository contracts.
3. General database isolation practices: immutable server-controlled workspace scope, row-level ownership checks, workspace-aware uniqueness, scoped export/backup/restore, deny-by-default identifiers, and cross-tenant negative testing.
4. SQLite schema/transaction behavior already provided by the Node 24 built-in `node:sqlite` runtime.

### Independent design decisions

- Added `funding_workspace` as the canonical local workspace-to-tenant binding table.
- Added/backfilled `workspace_id` across all 23 financing-domain business tables.
- Rebuilt `company_profile`, `funding_goal`, and `capital_strategy` as workspace-local singletons with composite `(workspace_id, id)` primary keys.
- Rebuilt `funding_source_record` with workspace-aware official-source uniqueness so the same provider external ID can exist independently in different workspaces.
- Bound Core, Equity, Opportunity, Execution and Funding Source repositories to the server-controlled workspace; browser headers cannot select a workspace.
- Added linked-record workspace ownership checks before mutations and deliberately return non-enumerating `STALE_REFERENCE` conflicts.
- Scoped Funding Activity, JSON export, SQLite backup and restore to the active workspace.
- Backup copies are pruned to the active workspace before verification; restore replaces only that workspace and preserves other workspaces.
- Added cross-workspace negative tests covering reads, updates, linked references, external-source identity, forged tenant headers, export, backup and restore.
- Continuity schema advanced to `3` because `funding_workspace` and row workspace scope are now required recovery facts.
- Current hardening is intentionally reported as partial at the SQLite constraint layer: 4/23 business tables enforce `workspace_id NOT NULL`; remaining table rebuilds and real external identity verification are still required before remote eligibility.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- A third-party multi-tenant framework, authentication SDK, or proprietary identity implementation.

## 2026-08-15 — Database-complete local workspace hardening

### Permitted sources used

1. Existing BossAI Funding tenant-scoping design and v0.9 repository/continuity implementation.
2. SQLite table rebuild, trigger, transaction, and `foreign_key_check` behavior exposed through Node 24 `node:sqlite`.
3. General defense-in-depth database practice: required scope columns, immutable row scope, same-scope reference guards, migration preservation checks, and bypass testing below the application layer.

### Independent design decisions

- Rebuilt the remaining 19 scoped business tables from SQLite's own current `CREATE TABLE` definitions, preserving all existing business columns, IDs, CHECK constraints, original relationship FKs and explicit indexes while replacing nullable `workspace_id TEXT` with `workspace_id TEXT NOT NULL REFERENCES funding_workspace(workspace_id) ON DELETE CASCADE`.
- Migration temporarily disables SQLite FK enforcement only for the controlled table-rebuild transaction, immediately re-enables it, and then requires `PRAGMA foreign_key_check` to return no violations.
- Removed the previous local auto-scope behavior; all production-path writes must now supply workspace scope explicitly.
- Added database `BEFORE INSERT` and `BEFORE UPDATE OF workspace_id` guards for every financing business table to reject empty, unknown, or transferred workspace identity.
- Added database reference guards for every scoped relationship used by Investor, Opportunity, Application, Document, Data Room, Due Diligence, Term Sheet, Outcome and source/match flows.
- Added direct-SQL bypass tests that do not use Repository protection.
- Added a populated legacy migration test that writes representative records into every scoped business table before migration, then verifies IDs, relationships, source provenance, match state, Data Room state, DD, Term Sheet, Outcome, Activity and AUTOINCREMENT progression after hardening.
- Continuity schema advanced to `4` because all scoped rows now require database-level workspace identity.
- Identity status now distinguishes `local-workspace-scoped` persistence from the still-missing production authentication/authorization layer.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party tenancy frameworks or authentication implementations.

## 2026-08-15 — Authorization policy contract

### Permitted sources used

1. Existing BossAI Funding production identity/tenant boundary and database-hardened local tenant isolation.
2. General least-privilege authorization practice: deny by default, tenant match before role evaluation, explicit high-impact operations, and separation of authentication from authorization.
3. Existing BossAI Funding API routes and owner-facing product responsibilities.

### Independent design decisions

- Added `AUTHORIZATION_POLICY.md` and a typed authorization policy module without introducing an authentication provider.
- Recognized product roles are limited to `owner`, `editor`, and `viewer`; unknown roles receive no authority.
- Owner can read/mutate/export summaries/export full data/backup/restore; editor can read/mutate/export summaries; viewer is read-only.
- Tenant mismatch denies access before role permissions are considered.
- Full data export, backup and restore are explicitly owner-only high-impact operations.
- Added API route classification into public/read/mutate/export-summary/export-data/backup/restore so future verified-principal middleware has a complete policy input.
- The policy projection explicitly remains `enforcementMode=contract-only`, `upstreamVerificationRequired=true`, and `productionAuthorizationReady=false`.
- No browser header, raw claims object, unverified token, or claimed issuer is treated as authenticated identity.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party authentication/authorization SDKs or copied RBAC implementations.

## 2026-08-15 — Identity verifier contract, authorization enforcement, and security decision evidence

### Permitted sources used

1. Existing BossAI Funding v0.11 authorization policy and v0.10 tenant-isolation architecture.
2. General security architecture practice: authentication/authorization separation, issuer/audience/time validation, fail-closed verification, deny-before-business-route enforcement, and preservation of security evidence across business-data recovery.
3. Node 24 built-in HTTP and SQLite facilities already used by BossAI Funding.

### Independent design decisions

- Added a provider-neutral `IdentityVerifier` interface instead of inventing a JWT provider, login service, password store, or issuer.
- A verified principal must carry explicit adapter evidence for signature, issuer, audience, temporal validity, and revocation checking where required.
- BossAI Funding independently validates configured issuer allowlist, required audience, authentication age, expiry/clock skew, and revocation requirement before authorization.
- Added `verified-external` HTTP enforcement mode. It cannot be constructed without both an injected verifier and verification policy.
- Default local-owner runtime remains unchanged and loopback-only.
- Protected API requests are authorized before the business route executes; unverified identity produces 401, while tenant/role denial produces 403 without leaking another workspace's data.
- Added tenant-scoped `security_decision_event` storage for local authorization evidence only; it is explicitly not a second company-wide Audit system.
- Security decision events are excluded from owner-restorable financing snapshots. SQLite backup pruning removes other workspaces' security events while retaining the active workspace evidence.
- Fixed Restore so it updates the already validated workspace binding in place instead of deleting/reinserting it; this prevents `ON DELETE CASCADE` from erasing security decision history.
- Added real HTTP acceptance for unverified, wrong-tenant, viewer, editor, and owner cases plus verifier policy tests for issuer, audience, stale authentication, expiry, and revocation evidence.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party authentication providers, JWT SDKs, copied RBAC middleware, or external account systems.

## 2026-08-15 — Route Security Manifest and security-review readiness

### Permitted sources used

1. Existing independently authored BossAI Funding HTTP routes, tenant isolation, identity-verifier contract, authorization policy, and security-decision evidence.
2. General fail-closed application-security practice: explicit route classification, least disclosure, startup configuration validation, preservation of security evidence, and separation of implementation readiness from production security approval.
3. Existing BossAI governance requiring production truth and explicit acceptance gates.

### Independent design decisions

- Added `src/server/api-security-manifest.ts` as the single authorization classification source for every supported BossAI Funding API route.
- Removed implicit method-based authorization fallback. An unknown `/api/*` route has no authorization class and cannot execute.
- Added `unclassified-api` security-decision evidence and a lossless migration from the v0.12 security-event operation constraint.
- Local-owner unclassified API requests return `404 UNCLASSIFIED_API_ROUTE`; verified-external unclassified API requests return `403 API_SECURITY_CLASSIFICATION_REQUIRED` before verifier invocation.
- Reduced the anonymous API surface to `GET /api/health`; `/api/security/*` status endpoints now require `read` authority in verified-external mode.
- Added `src/server/runtime-security-config.ts`; standalone `verified-external` configuration without an injected approved verifier is a startup error rather than a silent local-owner fallback.
- Added `GET /api/security/review-readiness` and `SECURITY_REVIEW_READINESS.md` to expose implemented local controls while keeping `status=not-approved` and remote access blocked.
- Added source-scan and runtime tests proving fixed server API routes are registered, manifest entries classify uniquely, unknown APIs have no fallback class, standalone security configuration fails closed, and v0.12 security evidence survives the operation-schema upgrade.
- Continuity schema remains `4` because financing export/restore schema did not change; the security-event table self-migrates independently and old financing recovery points are not invalidated solely by the new security-decision enum.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party identity, authorization, route-policy, or security-review frameworks.

## 2026-08-15 — Local browser request integrity

### Permitted sources used

1. Existing independently implemented BossAI Funding loopback HTTP server, Route Security Manifest, security-decision evidence, and local-owner UX.
2. General web security principles: same-origin mutation checks, browser Fetch Metadata, non-simple JSON mutation content types, strict response isolation headers, and fail-closed handling before business mutation.
3. Existing BossAI security/release truth requirements.

### Independent design decisions

- Added `evaluateBrowserRequestIntegrity` inside the existing BossAI Funding security boundary rather than introducing a third-party middleware/runtime.
- All state-changing `/api/*` methods require `application/json`, blocking browser simple-request `text/plain` / form mutation paths.
- Explicit cross-site Fetch Metadata is rejected; `no-cors` and navigation mutation modes are rejected.
- When a browser sends `Origin`, it must exactly match the current loopback Host; native/CLI clients may omit Origin but must still use JSON for mutation.
- Browser-integrity checks run after Route Security Manifest classification but before external identity verification and before local-owner bypass, so both local-owner and verified-external modes are protected.
- Denials are recorded in `security_decision_event`; verified-external cross-site requests are rejected before the IdentityVerifier is invoked.
- Added `Cross-Origin-Resource-Policy: same-origin`, `Origin-Agent-Cluster: ?1`, and restrictive `Permissions-Policy` response headers.
- Added unit and real HTTP regressions for same-origin JSON allow, cross-site reject, Origin mismatch, simple-request content-type reject, native JSON allow, no financing mutation on denial, and no verifier call before cross-site rejection.
- Extended `/api/security/review-readiness` with machine-readable browser request-integrity status.
- Continuity schema remains `4`; no financing export/restore schema changed.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party CSRF/CORS/security middleware implementations.

## 2026-08-15 — Operational integrity and source resilience

### Permitted sources used

1. Existing independently implemented BossAI Funding Route Security Manifest, tenant hardening, browser request-integrity boundary, Grants.gov adapter, and current-worktree workspace-revision concurrency protection.
2. Node 24 built-in `node:http`, `AbortSignal`, and `node:sqlite` behavior already used by the project.
3. Existing official Grants.gov API contract already admitted in `DATA_SOURCES.md`; no new external funding source was introduced.
4. General fail-closed and bounded-resource engineering practice: startup invariants, HTTP resource ceilings, total external-operation budgets, limited concurrency, and stale-write prevention.

### Independent design decisions

- Added `src/server/startup-security-invariants.ts` and made Route Security Manifest validation run before tenant preparation. Startup blocks duplicate keys/signatures, a second anonymous route, ambiguous route samples, incomplete tenant table/guard/reference coverage, rows without workspace scope, foreign-key violations, or accidental local remote eligibility.
- Added `src/server/http-resource-limits.ts` as the single runtime configuration for 16 KiB headers, 100 headers, 10-second header timeout, 30-second request timeout, 5-second keep-alive timeout, 100 requests/socket, and 1,000,000-byte JSON bodies.
- Added real protocol tests proving oversized raw headers are rejected with HTTP 431 and oversized JSON is rejected with 413 before financing persistence.
- Extended `/api/security/review-readiness` with startup-invariant and HTTP-resource-limit projections while preserving `status=not-approved` and `remoteAccessDecision=blocked`.
- Revalidated and hardened the parallel/current-worktree workspace revision protection together with this batch: 23 tracked financing tables, 69 canonical revision triggers, stale browser write rejection, missing revision rejection, serialized same-revision concurrent saves, and database-driven revision advancement all pass in the same full suite.
- Revision triggers are rebuilt at server construction and re-counted before every state-changing request; any runtime loss fails closed with `503 WORKSPACE_REVISION_GUARD_UNAVAILABLE` instead of degrading concurrency protection.
- Verified-external authentication and tenant/role authorization now precede revision precondition disclosure, preventing unauthenticated or wrong-tenant requests from probing current revision state.
- Restore advances the live revision rather than importing old backup concurrency metadata, so pre-restore browser tabs become stale; owner JSON export excludes revision metadata and native SQLite backup tenant-prunes revision rows with workspace bindings.
- Added browser recovery UI that reloads the latest workspace state while restoring unsaved input/select/textarea drafts instead of requiring a destructive full-page refresh.
- Changed Grants.gov detail hydration from serial amplification to a bounded owner operation: 12-second per-request timeout, 20-second total search budget, at most four concurrent detail requests, stable result ordering, and abort of remaining detail work after failure/budget expiry.
- Source failure continues through the existing `SOURCE_UNAVAILABLE` path; no automatic retry storm or partial overwrite of previously saved owner decisions was introduced.
- No new application runtime dependency was added and Continuity schema remains `4` because financing recovery data structure did not change.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party HTTP rate-limit middleware, concurrency libraries, CSRF middleware, or external source orchestration frameworks.

## 2026-08-15 — Security evidence lifecycle

### Permitted sources used

1. Existing independently implemented BossAI Funding `security_decision_event`, tenant-scoped backup/restore handling, authorization enforcement, and Security Review Readiness projection.
2. Existing BossAI architecture rule that BossAI Funding must not become a second company-wide Audit authority.
3. General bounded-local-diagnostics practice: per-tenant retention ceilings, oldest-first pruning, bounded text fields, and explicit machine-readable retention status.

### Independent design decisions

- Added a fixed 5,000-event maximum per BossAI Funding workspace for local security decision evidence.
- Retention runs when `SecurityDecisionRepository` is constructed and after each new event, so existing over-limit databases are normalized without waiting for a future security incident.
- Pruning is oldest-first and always includes `workspace_id`, preventing one tenant's retention maintenance from removing another tenant's evidence.
- Bounded subject, tenant, issuer, method, pathname, reason, and adapter-key lengths before persistence to keep a single abnormal identity/request from disproportionately expanding local SQLite.
- Extended `/api/security/review-readiness` with current active-workspace event count, 5,000-event limit, within-limit flag, oldest-first pruning mode, and Restore-preserves-evidence truth.
- Added tests for startup pruning, ongoing retention, cross-workspace preservation, field-size bounds, schema migration compatibility, tenant-isolated backup/restore, and Security Review projection.
- This remains local product access-control evidence only. No long-term compliance audit authority or second BossAI Audit system was introduced.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party logging, SIEM, audit-retention, or observability frameworks.

## 2026-08-15 — Owner-visible official-source recovery

### Permitted sources used

1. Existing independently implemented BossAI Funding Grants.gov adapter, source provenance model, browser form/recovery patterns, and owner acceptance document.
2. Existing Grants.gov source contract already admitted in `DATA_SOURCES.md`; no new source or source terms were introduced.
3. General product failure-recovery practice: preserve user work, explain what changed/not changed, provide a visible retry path, and avoid exposing low-level transport errors as owner-facing product language.

### Independent design decisions

- Added an inline Grants.gov source-status region with checking, success, and recoverable unavailable states.
- Source failure explicitly tells the owner that saved opportunities and pursuit decisions were not changed and that existing financing work can continue.
- Added a visible manual `Try again` action that resubmits the existing owner-entered query; no background or automatic retry loop was added.
- The search submit control is disabled only while the current owner-initiated request is active, reducing accidental duplicate submissions.
- Replaced raw Grants.gov network/transport exception text in the HTTP error contract with stable owner language while preserving `SOURCE_UNAVAILABLE` and the existing recovery semantics.
- Extended the source-ingestion HTTP journey to simulate an upstream outage after an opportunity is saved, prove the failed refresh does not advance workspace revision or alter the saved decision, then prove the later successful refresh still updates source facts while preserving the decision.
- Extended `OWNER_ACCEPTANCE.md` with an unassisted target-device network-outage/retry drill. This adds acceptance coverage but does not claim that the human test has been performed.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party retry, notification, source-health, or frontend state libraries.

## 2026-08-16 — Owner focus targeting and resumable navigation

### Permitted sources used

1. Existing independently implemented BossAI Funding Today's Focus projection, Owner Journey UI, financing entity lists, and target-device acceptance contract.
2. Existing project rule that browser state may carry non-critical UI/navigation preferences while financing truth remains server/SQLite owned.
3. General product navigation practice: deep-link the exact work item, visibly confirm the landing target, resume after reload, and fail safely when a stale target no longer exists.

### Independent design decisions

- Extended `TodayFocus` with stable `entityType` + `entityId` fields. Concrete Funding Action, Opportunity, Investor, Investor Follow-up, Financing Meeting, Funding Application, and Due Diligence focus states carry the exact record reference; setup/general states explicitly return `null` / `null` rather than omitting fields or fabricating a target.
- Added stable rendered anchors for every focusable financing entity and changed the top owner action from section-only scrolling to exact-record targeting when available.
- Concrete focus navigation visibly highlights the selected item and labels the button `Open this item`; setup/general focus keeps `Do this now` and section-level navigation.
- Navigation stores only a URL hash, not financing business state or a new browser business database. Bootstrap rendering restores a valid hash target after reload; a stale target hash is cleared if that record no longer exists.
- Owner Journey and existing section-navigation controls now share the same resumable navigation function.
- Added domain/HTTP assertions for concrete focus entity references and a UI navigation contract test covering exact targeting, all seven stable anchor families, hash resume, and stale-hash clearing.
- Extended `OWNER_ACCEPTANCE.md` with an unassisted exact-item navigation and reload-resume exercise. Automated coverage still does not satisfy human acceptance.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party router, client-state, deep-link, animation, or navigation libraries.

## 2026-08-16 — Owner next-action context and Term Sheet focus

### Permitted sources used

1. Existing independently implemented BossAI Funding Today's Focus scoring, execution entities, Term Sheet comparison, exact-item navigation, and owner acceptance workflow.
2. Existing persisted financing facts only: stage/status, recorded owner, deadline/meeting/follow-up time, and Term Sheet status.
3. General owner-workflow principle: a priority item should answer what state it is in, who owns it, when it matters, and where to act without inventing missing facts.

### Independent design decisions

- Added `workStatus`, `workOwner`, and `workDueAt` to the deterministic `TodayFocus` projection. Values come only from the selected persisted financing record; missing facts remain `null` and render as `Not recorded`.
- Added active Term Sheets (`received`, `reviewing`, `negotiating`, `accepted`) as high-value Equity focus candidates. `accepted` remains an execution/closing state because accepted terms are not proof that capital has closed or been received; only `rejected` / `expired` exit Term Sheet focus.
- Term Sheet focus retains the mandatory lawyer-review boundary and uses an exact `term-sheet-<id>` navigation anchor.
- Added the top Focus execution context row: Status / Owner / When. Setup/general states hide this concrete-item context rather than inventing values.
- Surfaced recorded owners on Funding Action, Investor, Investor Follow-up, Funding Application, and Due Diligence cards so the exact landing item agrees with the dashboard context.
- Meetings, Opportunities, and Term Sheets intentionally do not infer an owner where the current domain record has none.
- Added domain, journey, and UI contract tests for action/opportunity/follow-up/meeting/application/diligence context, Term Sheet focus eligibility, Term Sheet exact anchor, and missing-fact behavior.
- During the full gate, an intermittent source-test worker exit prompted a lifecycle hardening pass: Grants.gov now aborts its operation controller in `finally` after both success and failure, and a regression test proves completed search/detail signals are closed instead of leaving timeout-signal lifecycles behind.
- Extended `OWNER_ACCEPTANCE.md` so a real owner must verify Status / Owner / When and exact active-Term-Sheet focus behavior without developer guidance.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party workflow, task, CRM, router, or state-management frameworks.

## 2026-08-16 — Capital blockers / why money has not arrived

### Permitted sources used

1. Existing independently implemented BossAI Funding company/goal, actions, opportunities, investor pipeline, applications, diligence, Term Sheets, outcomes, dashboard projections, and exact-item navigation.
2. Existing product requirement that the owner dashboard answer why capital has not arrived, without inventing facts or building a generic task authority.
3. General financing execution logic: overdue work, unresolved closing terms, committed-but-unreceived capital, missing pursuit decisions, missing execution steps, and external decision waits are observable reasons capital can remain unreceived.

### Independent design decisions

- Added `src/domain/blockers.ts` with a deterministic `projectCapitalBlockers` projection. It reads existing financing facts and returns at most five severity-ranked blockers; it does not persist blockers or create a generic workflow/task system.
- Critical blockers cover overdue actions, applications, investor follow-ups, and diligence. High blockers cover active Term Sheets (including accepted terms not yet closed), committed-but-unreceived capital, absent capital sources, no pursue decision, and a chosen target without execution. Normal blockers cover submitted/under-review applications and high-value investor relationships without a dated next move.
- A blocker carries reason, next step, track, destination, and existing `entityType` / `entityId` when it maps to a specific financing record. The browser reuses the v0.18 exact-item navigation path rather than creating another router.
- Once the recorded target is fully covered, the projection returns an empty blocker set and does not manufacture additional work.
- Added the owner-facing `WHY CAPITAL HASN'T ARRIVED` section with exact-record navigation and a clear zero-blocker state.
- Added domain, real HTTP, and UI contract tests for empty pipeline, selected target without execution, overdue application priority, active Term Sheet blocking close, committed-but-unreceived capital, fully covered target, and exact blocker navigation.
- Extended `OWNER_ACCEPTANCE.md` so an unassisted owner must explain why capital has not arrived and open the highest blocker without developer interpretation.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party workflow, task, CRM, blocker, scoring, or state-management frameworks.

## 2026-08-16 — Capital pipeline truth / de-duplicated in-motion capital

### Permitted sources used

1. Existing independently implemented BossAI Funding Funding Actions, Opportunities, Applications, Investors, Follow-ups, Term Sheets, outcomes, dashboard tracks, and Owner/Board Summary.
2. Existing product requirement that owner capital numbers remain explainable and must not double count linked financing stages.
3. General accounting/data-model principle: use the most-specific known evidence for a linked financing path and do not fabricate relationships between records that are not linked.

### Independent design decisions

- Added `src/domain/pipeline.ts` as the single deterministic projection for dashboard `In motion` and per-track potential capital.
- Grant/Debt Applications replace their linked Opportunities; generic Funding Actions are a fallback only when the track has no more-specific Application/Opportunity evidence.
- Equity Term Sheets replace only their own Investor cheque estimate while other active Investors remain counted. Latest active Term Sheet wins per Investor.
- Equity Applications linked through an Investor Opportunity de-duplicate by Investor identity; pursuing Investor Opportunities already represented by an Investor are suppressed.
- Approved Application amount replaces requested amount when approval is known. Terminal funded/rejected/withdrawn Applications and rejected/expired Term Sheets do not count as pipeline.
- Pending Investor follow-up risk now uses the earliest recorded due date.
- Added `evidenceKinds` and `pipelineExplanation` to every track and exposed the basis in the dashboard and Owner/Board Summary.
- Added an explicit dashboard note that linked stages are not stacked twice.
- Added unit, real HTTP, UI, and reporting regressions for Funding Action fallback, linked Application/Opportunity suppression, approved amount use, Term Sheet/Investor de-duplication, multiple Term Sheets, multiple Equity Applications to one Investor, earliest follow-up, and visible counting-method disclosure.
- The method is deliberately conservative when no business link exists; it does not assume an unlinked Funding Action is additional capital merely to increase the pipeline number.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party CRM, portfolio, probability-weighting, fundraising pipeline, or workflow libraries.

## 2026-08-16 — Capital coverage and deterministic closing plan

### Permitted sources used

1. Existing independently implemented BossAI Funding target/received/committed accounting, de-duplicated pipeline truth, Funding Outcomes, Term Sheets, Applications, Investors, and exact-item navigation.
2. Existing product rule that pipeline amounts must not be presented as guaranteed capital or hidden behind a black-box score.
3. General financing execution principle: distinguish cash received from committed capital and from unresolved pipeline; order closing work by recorded workflow stage rather than invented success probability.

### Independent design decisions

- Added `src/domain/closing.ts` with deterministic `projectCapitalCoveragePlan`.
- Coverage is split into cash received, received + committed, recorded reach including current de-duplicated In motion, and the remaining amount still uncovered even if every current In motion item closed at its recorded amount.
- Coverage states distinguish `cash-covered` from `secured`: cash-covered requires actual received cash to meet the target, while secured may still contain committed-but-not-received capital.
- `pipeline-covered` means recorded amounts could cover the target on paper; it explicitly does not imply that the pipeline will close. `pipeline-shortfall` exposes the residual gap after all current recorded pipeline amounts.
- Added deterministic `Closest to cash` ordering. Recorded committed-but-not-received capital ranks first; specific Term Sheet, Application, Investor, Opportunity, or Funding Action evidence is then ordered only by recorded workflow stage and recency. No predicted probability or model score is used.
- Each closing candidate includes exact financing navigation when a concrete record exists plus explicit remaining workflow/closing steps. Aggregate committed capital falls back to Execute & close because it may combine multiple persisted sources.
- Extended pipeline truth to expose its exact de-duplicated evidence records for the closing projection rather than recalculating the pipeline independently.
- Fixed an additional double-counting edge: a Funding Outcome now removes its linked Application/Investor path from In motion. If a capital track has any recorded Outcome and no specific active pipeline evidence, unlinked generic Funding Actions are not reused as amount fallback; a new specific financing record is required before new pipeline capital is counted.
- Added the owner-facing `CAPITAL COVERAGE & CLOSING PLAN` and `CLOSEST TO CASH` sections with an explicit disclaimer that In motion is not a probability-weighted forecast, commitment, or guarantee.
- Owner / Board Summary now exports the same coverage percentages, uncovered amount, disclaimer, and closing candidates as the dashboard.
- Extended `OWNER_ACCEPTANCE.md` so a real owner must distinguish received/committed/pipeline coverage, explain the uncovered gap, understand that stage ordering is not success probability, open the exact closing item, and verify resolved Outcome paths leave In motion.
- Added domain, pipeline, HTTP, UI, and reporting regressions for coverage states, commitment-vs-cash separation, deterministic closing order, exact navigation, Outcome-linked pipeline removal, and conservative generic-action fallback suppression.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party probability models, fundraising scoring frameworks, portfolio libraries, workflow engines, or closing automation systems.

## 2026-08-16 — Funding Outcome resolution consistency and correction

### Permitted sources used

1. Existing independently implemented BossAI Funding Funding Outcome, Application, Investor, Term Sheet, DD, Meeting, Follow-up, dashboard, pipeline, blocker, report, and PATCH mutation contracts.
2. Existing product rule that one financing fact must not remain simultaneously active and resolved in different owner-facing projections.
3. General accounting/workflow consistency principle: final financing outcome controls current-state interpretation while prior stage records remain historical evidence; invalid money relationships must fail closed.

### Independent design decisions

- Added `src/domain/resolution.ts` as the shared Outcome-link resolution projection rather than duplicating resolved-ID logic independently across product surfaces.
- A linked Funding Outcome resolves its Application, the Application's linked Opportunity, and/or its Investor for current-state projections. The latest Outcome per linked Application/Investor is selected deterministically by `updatedAt` then id.
- Wired the same resolution truth into de-duplicated pipeline capital, Today's Focus, Capital Blockers, Equity Pipeline Summary, and Owner/Board Summary.
- Resolved Investor relationships no longer inflate active Investor count, potential Equity capital, pending follow-up count, next scheduled meeting, or current stage counts. `resolvedInvestorCount` is exposed separately.
- Preserved historical Application, Investor, Meeting, DD, and Term Sheet records instead of silently deleting or rewriting them. Browser cards show `Resolved by Funding Outcome`, current Outcome status, received amount, committed total, and an explicit statement that the old record remains historical execution evidence.
- Historical Application/Investor/DD/Meeting controls stop presenting resolved records as current next-work controls; current Financing Outcome becomes the correction surface.
- Connected the already implemented `PATCH /api/outcomes/:id` route to owner UI so status, Application/Investor/Round links, committed amount, received amount, and received date can be corrected. Clearing a bad link causes the still-open record to re-enter current pipeline/focus/blocker projections automatically.
- Tightened Outcome validation: received cannot exceed committed total; committed cannot exceed a non-zero approved amount; positive received capital requires a received date; lost/withdrawn Outcomes cannot retain committed or received capital.
- Failed Outcome corrections retain the prior persisted Outcome and therefore cannot partially alter Capital Coverage, pipeline, Focus, or blockers.
- Owner/Board Summary now uses the same resolution projection for active Applications, active Investors, open DD, and top current Opportunities and reports resolved Application/Investor link counts.
- Extended target-device acceptance to prove resolved-history labeling, current-state suppression, Outcome correction/unlink recovery, invalid correction fail-closed behavior, and dashboard/report consistency.
- Added pure domain, UI-contract, real HTTP correction/relink, accounting-validation, and reporting regressions.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party CRM resolution engines, accounting workflow systems, event-sourcing frameworks, state-machine libraries, or financial reconciliation packages.

## 2026-08-16 — Capital timing and deadline discipline

### Permitted sources used

1. Existing independently implemented BossAI Funding Company Profile, Funding Goal, Actions, Opportunities, Investors, Follow-ups, Meetings, Applications, Due Diligence, Fundraising Rounds, Funding Outcomes, Outcome Resolution, and exact-item navigation.
2. Existing product requirement that the owner know when capital is needed and which execution work can drift because no date is recorded.
3. General financing-operations principle: distinguish recorded deadlines from forecasts, keep high-value financing work attached to dated next moves, and surface stale/undated execution explicitly.

### Independent design decisions

- Added `src/domain/timing.ts` with deterministic `projectCapitalTimingPlan`.
- The funding need date comes from the Funding Goal, with the Company Profile target-funding date as fallback. Absence of a need-by date is a visible `no-target-date` state rather than a healthy default.
- The runway calendar estimate converts the saved `runwayMonths` value from the Company Profile update timestamp into a date using average calendar-month length. The profile save time is preserved beside the estimate and the UI/report explicitly state that it is not a cash-flow, financing-close, or success forecast.
- Added explicit timing states: `no-target-date`, `cash-covered`, `past-need-date`, `runway-before-need`, `near-term`, and `dated`.
- Added deterministic milestone projection for Funding Action deadlines, pursued Opportunity deadlines, Investor follow-ups/next-follow-up dates, scheduled Meetings, active Application deadlines, open Due Diligence deadlines, active Round target-close dates, and the funding need date itself.
- Added separate overdue count, next-14-days count, and active-undated-item count. Active undated Applications, pursued Opportunities, Actions, high-value Investor relationships, active Term Sheets without a dated investor move, open Diligence, and active Rounds without a target-close date are surfaced rather than silently drifting.
- Reused Outcome Resolution so resolved Application/Opportunity/Investor execution is removed from the current timing plan without deleting historical evidence.
- Added the owner-facing `CAPITAL TIMING & DEADLINE DISCIPLINE` section with exact-record navigation, plus the same timing facts in Owner / Board Summary.
- Extended `OWNER_ACCEPTANCE.md` so an unassisted owner must identify the need-by date, runway estimate source/date, overdue and near-term milestone counts, undated work, and verify that Outcome-resolved work leaves the active timing plan.
- Added domain, real HTTP, UI contract, reporting, and Outcome-resolution timing regressions.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party cash-flow forecasting, fundraising prediction, calendar, workflow, probability, or scheduling engines.

## 2026-08-16 — Capital Strategy input synchronization / decision freshness

### Permitted sources used

1. Existing independently implemented BossAI Funding Capital Strategy rules, Company Profile, Funding Goal, Opportunity Match refresh behavior, Owner Journey, Funding Activity history, and Owner / Board Summary.
2. Existing product rule that owner-facing financing decisions must remain explainable and may not silently rely on stale facts.
3. General decision-support principle: persisted recommendations should disclose whether they still match the current inputs, and reads should not silently mutate stale decision artifacts.

### Independent design decisions

- Added `src/domain/strategy-freshness.ts` with semantic strategy comparison that excludes record identity/generated timestamp and compares current need, allocations, unfunded residual, assumptions, and warnings against a freshly calculated deterministic strategy.
- Added explicit freshness states: `not-created`, `no-goal`, `current`, and `recalculate`.
- Confirmed the existing Opportunity Match path already recalculates on Company Profile, Funding Goal, Opportunity, and Grants.gov source refresh; no redundant stale-match subsystem was added.
- When a Capital Strategy already exists, Company Profile or Funding Goal changes now synchronize the strategy only when semantic output changes. The owner mutation records a separate Funding Activity event describing that strategy synchronization.
- Automatic synchronization does not create a first strategy implicitly. The owner still explicitly starts the Capital Strategy workflow with the existing Recalculate action.
- Bootstrap performs a read-only freshness projection so old databases, abnormal/direct persistence changes, or passage of time across the existing under-60-day rule can surface `RECALCULATE` without silently rewriting stored strategy data.
- The owner UI shows strategy state, generation time, current funding need, and freshness reason. Stale allocations remain visible only as downgraded historical output with an explicit `OUT OF DATE` warning.
- Owner Journey now treats Capital plan as complete only when the stored strategy matches current facts (`strategyFreshness=current`).
- Owner / Board Summary exports the same freshness state/reason so handoff material cannot silently present a stale allocation as current.
- Added domain, real HTTP, UI, Owner Journey, reporting, automatic synchronization, direct-stale-data, and time-threshold regressions.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party recommendation freshness, caching, workflow, probability, or decision-engine libraries.

## 2026-08-16 — Opportunity deadline viability / source-fact authority

### Permitted sources used

1. Existing independently implemented BossAI Funding Funding Opportunity, Opportunity Match deadline rule, source provenance, Capital Pipeline Truth, Coverage, Today's Focus, Capital Blockers, Capital Timing, Owner Journey, and Grants.gov refresh path.
2. Existing product rule that capital numbers must not include financing paths that current recorded facts show are no longer actionable.
3. General source-governance principle: owner decisions may be separate from authoritative source facts, and authoritative external facts should be refreshed from their source rather than silently overwritten locally.

### Independent design decisions

- Added `src/domain/opportunity-viability.ts` with current-time states `undated`, `open`, `due-soon`, and `deadline-passed`.
- A past-deadline saved/pursuing Opportunity remains persisted for history/recovery but is excluded from current `In motion` / Coverage when no more-specific active Application already exists.
- An active Application remains valid pipeline evidence after its source Opportunity's application deadline because the financing path has already advanced to a more-specific execution record.
- Past-deadline pursuing Opportunities become urgent recovery Focus candidates and critical Capital Blockers with explicit extension/new-cycle/source-refresh/dismiss recovery language; the old misleading `due in 0 days` behavior is removed.
- Past-deadline Opportunities do not satisfy current Owner Journey `Find money` / `Choose what to pursue` readiness by themselves, while Capital Timing continues to surface the missed deadline as an overdue milestone.
- Bootstrap now exposes Opportunity deadline viability independently from persisted match history. The browser suppresses stale match-score authority on deadline-passed records and states that the amount is excluded from `In motion`.
- Manual-source expired Opportunities expose a deadline-correction control. Official/licensed source-managed facts cannot be edited through normal Opportunity PATCH; only owner decision and internal links remain mutable there. Source fact changes must arrive through the corresponding admitted source refresh/import path.
- Rejected source-managed edits return `409 SOURCE_FACTS_READ_ONLY`, identify the changed field, do not mutate the Opportunity, and do not advance workspace revision.
- Owner / Board Summary excludes past-deadline pursuits from current Top Opportunities and lists them separately as deadline-recovery items.
- Extended `OWNER_ACCEPTANCE.md` and `DATA_SOURCES.md` with deadline-viability and source-authority expectations.
- Added domain, pipeline, Focus, Blocker, Owner Journey, real HTTP, browser contract, reporting, manual recovery, and official-source read-only regressions.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party opportunity-expiry, CRM, workflow, source-governance, scraping, or decision engines.

## 2026-08-16 — Term Sheet closing date discipline / Continuity schema 5

### Permitted sources used

1. Existing independently implemented BossAI Funding Term Sheet, Funding Outcome, Today's Focus, Capital Blockers, Capital Timing, Continuity backup/restore, exact-item navigation, and target-device acceptance contracts.
2. Existing product rule that accepted terms are not the same thing as closed or received capital.
3. General financing-operations principle: a target closing date is a management deadline and must not be presented as a predicted wire or guaranteed receipt date.

### Independent design decisions

- Added nullable `TermSheet.targetCloseDate` / SQLite `term_sheet.target_close_date` as a real financing fact. Historical rows migrate in place with `null`; no date is invented.
- Active Term Sheets with a target close date now project an exact `term-sheet-close` timing milestone and expose the date in Today's Focus `workDueAt`.
- A passed target close date adds deadline priority to Today's Focus and upgrades the Term Sheet Capital Blocker to critical until Funding Outcome resolves the Investor path.
- Term Sheet cards expose owner correction of target close date and status through the existing PATCH route, with explicit language that the date is a management target rather than a predicted receipt date.
- Funding Outcome resolution continues to preserve the historical Term Sheet but removes its close milestone and blocker from current work.
- Continuity schema advanced from 4 to 5 because financing export/restore shape now includes `target_close_date`. Current builds accept schema 4 and 5 recovery points; a schema 4 snapshot restores missing close dates as `null` into the schema 5 database.
- Added a legacy in-place SQLite migration regression, schema 4 recovery compatibility regression, real HTTP close-date lifecycle test, and browser UI contract tests.
- Extended `OWNER_ACCEPTANCE.md` so a real owner must record/correct a target close date, identify an overdue target close, and understand that it is not a promised funding date.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party closing prediction, deal probability, calendar workflow, CRM, migration, or financing automation engines.

## 2026-08-16 — Structured Closing Condition Register / Continuity schema 6

### Permitted sources used

1. Existing independently implemented BossAI Funding Term Sheet, target-close discipline, Funding Outcome resolution, Today's Focus, Capital Blockers, Capital Timing, tenant scoping, workspace revision, Continuity, Board Summary, and target-device acceptance contracts.
2. Existing product rule that Term Sheet acceptance and even cleared preparation work do not themselves prove legal closing, committed capital, or cash received.
3. General financing-closing practice: material conditions should have an explicit owner, deadline, completion/waiver state and retained evidence instead of remaining only as an unstructured paragraph.

### Independent design decisions

- Added `ClosingCondition` as a Term-Sheet-specific financing entity with `title`, `owner`, nullable `dueDate`, fixed `open | in-progress | satisfied | waived` status and `evidenceNote`.
- Deliberately did **not** create a generic task table, scheduler, workflow engine, approval engine, reminder service or Agent runtime. The API surface is limited to `/api/closing-conditions` and every record must reference a Term Sheet.
- Added `src/domain/closing-conditions.ts` as the shared rule source: open/in-progress conditions remain active; satisfied/waived conditions are cleared. Server validation requires an evidence note before satisfied/waived can persist.
- Active closing conditions participate in exact-item Today's Focus, Capital Blockers and Capital Timing. An overdue condition can outrank its parent Term Sheet; an active undated condition is surfaced as missing-date closing work.
- The owner UI exposes a financing-specific Closing Condition Register plus direct correction of status, owner, due date and evidence. It explicitly states that clearing the register does not prove legal closing or cash receipt and that Funding Outcome remains final financing authority.
- Funding Outcome resolution preserves Closing Condition history/evidence but removes resolved conditions from current Focus, blockers, timing and Board Summary active counts.
- Owner / Board Summary now reports active, overdue, undated and cleared conditions and lists the current unresolved closing blockers.
- Added `term_sheet_closing_condition` as the 24th tenant-scoped financing table with a same-workspace Term Sheet reference guard. Current database-hardening counts are 24 scoped tables, 24 workspace guards, 30 declared same-workspace reference guards and 72 database revision triggers.
- Continuity schema advanced from 5 to 6 because the financing recovery shape now includes the structured condition register. Current builds accept schema 4, 5 and 6 recovery points; pre-schema-6 backups restore with an empty Closing Condition Register.
- Added pure-domain, real HTTP, UI-contract, Board Summary, tenant-isolation, Continuity compatibility, startup invariant and security-review regressions. The full suite reached 179/179 before final version/document sealing.
- Extended `OWNER_ACCEPTANCE.md` so an unassisted owner must create, date, own, clear/reopen and navigate a concrete Closing Condition; evidence-less clearing must fail; Funding Outcome must preserve history while ending current condition work.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party task managers, workflow engines, CRM closing modules, legal workflow products, Agent runtimes, scheduling systems, or closing-probability models.

## 2026-08-16 — Closing Readiness Truth / Closest-to-Cash condition synchronization

### Permitted sources used

1. Existing independently implemented BossAI Funding de-duplicated Capital Pipeline Truth, Capital Coverage / Closest to cash, structured Closing Condition Register, Term Sheet, Funding Outcome and Board Summary contracts.
2. Existing product rule that workflow stage is not a success probability and that recorded financing facts must not be duplicated into inconsistent parallel checklists.
3. General closing-operations principle: once material closing conditions are recorded explicitly, downstream execution summaries should reflect those exact conditions rather than substituting generic advice.

### Independent design decisions

- Extended `projectCapitalCoveragePlan` to accept the existing structured Closing Condition records without changing coverage amounts, stage ordering, pipeline de-duplication or any persistence schema.
- For a Term Sheet with active structured conditions, `Closest to cash` now lists the actual conditions in due-date order and includes each recorded owner and due date.
- After listing exact conditions, the plan retains the existing counsel and closing-evidence safeguards; structured condition data does not replace legal review or justify recording committed/received capital early.
- If all recorded conditions are cleared but no Funding Outcome resolves the deal, the closing plan explicitly says that a cleared register does not prove closing and points to remaining definitive-document/signature/settlement evidence plus Funding Outcome.
- If no structured register exists, the first concrete step is to record material closing conditions rather than presenting generic template steps as if they were actual deal facts.
- The same enriched `remainingSteps` flow automatically reaches the owner UI and Owner / Board Summary because both already render the Capital Coverage projection; no second rendering-specific closing model was introduced.
- Added regressions for active-register truth, all-cleared-but-not-closed truth, and missing-register recovery. The full suite reached 182/182 before final version/document sealing.
- Continuity remains schema 6; tenant/security/route/revision counts remain 24 tables / 30 references / 47 routes / 72 revision triggers because this batch adds no persistence or API surface.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party task managers, deal-closing frameworks, fundraising scoring systems, probability models, workflow engines, or Agent runtimes.

## 2026-08-16 — Funding Outcome Evidence Discipline / Continuity schema 7

### Permitted sources used

1. Existing independently implemented BossAI Funding Funding Outcome, Capital Coverage, Outcome Resolution, Today’s Focus, Capital Blocker, Owner / Board Summary, Continuity, and exact-item navigation contracts.
2. Existing BossAI Funding rule that committed capital and received cash are distinct financing facts and may only be recorded when the underlying financing state actually exists.
3. General financing-operations principle that a monetary closing state should retain a reference to the supporting commitment/award/settlement/banking evidence rather than being represented only by an amount and date.

### Independent design decisions

- Added `funding_outcome.commitment_evidence` and `funding_outcome.receipt_evidence` as concise evidence-reference fields. They are not an attachment/document vault and do not replace legal, banking, award, or settlement records.
- New or corrected Outcomes with committed capital greater than zero require commitment evidence. Received capital greater than zero additionally requires an actual received date and receipt evidence.
- Existing amount-consistency guards remain in force: received cannot exceed committed; committed cannot exceed a known approved amount; lost/withdrawn financing cannot retain committed/received money.
- Added `src/domain/outcome-evidence.ts` as a deterministic projection of evidence completeness. No model, probability score, or generic verification engine is used.
- Legacy Outcomes are migrated in place with empty evidence fields. Their approved/committed/received values are preserved and no synthetic evidence is invented.
- A legacy committed/received Outcome with missing evidence becomes exact `funding-outcome` owner work in Today’s Focus and Capital Blockers. Receipt-evidence gaps are urgent/critical; commitment-only gaps remain high-priority remediation.
- Funding Outcome remains the current financing-state authority for its linked path while a legacy evidence gap is repaired. Resolved historical records remain resolved, but their Outcome resolution notice exposes incomplete evidence instead of implying the final state is fully supported.
- Added owner-visible create/correction fields, `EVIDENCE MISSING` state, exact resumable `funding-outcome-<id>` navigation, and Owner / Board Summary evidence parity.
- Continuity schema advanced from 6 to 7 because the financing recovery shape now includes the two Outcome evidence columns. Current builds accept schema 4, 5, 6 and 7 recovery points. A schema 6 backup restores old amounts unchanged with blank evidence references, which then surface as remediation work.
- No new business table or API route was added, so the current hardening boundary remains 24 tenant-scoped business tables, 30 declared same-workspace reference guards, 72 database workspace-revision triggers and 47 registered API routes.
- Added validation, domain, migration, real HTTP, UI, report, Continuity and exact-navigation regressions. The full suite reached 193/193 before final version/document sealing.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party accounting, evidence-vault, deal-room, closing-workflow, audit, Agent, or generic task engines.

## 2026-08-17 — Receipt Tranche Reconciliation / Continuity schema 8

### Permitted sources used

1. Existing independently implemented BossAI Funding Funding Outcome, Outcome evidence, Capital Coverage, tenant scoping, Continuity, Owner / Board Summary, and workspace-revision contracts.
2. Existing product rule that committed capital and actually received cash are distinct facts and that received cash must be supported by real receipt evidence.
3. General financing-operations principle that partial settlements should be preserved as dated receipt facts and reconciled to the aggregate funding outcome rather than collapsed into an unverifiable single total.

### Independent design decisions

- Added financing-specific `FundingReceiptTranche` persistence. It is not a general accounting ledger, bank feed, accounts-receivable system, payment processor, or second workflow engine.
- Each active tranche stores Outcome link, amount, received date, receipt-evidence reference, note, status and optional void reason. `voided` preserves history but no longer contributes to received capital.
- `FundingOutcome.receivedAmountCents` is now tranche-reconciled. Active tranche sum must equal the Outcome received aggregate; latest active tranche date becomes the Outcome received date. Direct aggregate receipt correction is rejected once tranches exist.
- Creating an Outcome with an initial receipt creates the first tranche transactionally. Additional receipts use `POST /api/receipt-tranches`; corrections/voids use `PATCH /api/receipt-tranches/:id`.
- Active tranche sum cannot exceed committed capital. Lost/withdrawn Outcomes cannot receive or retain active receipt tranches. Voiding requires a reason.
- Schema 7 recovery points containing a pre-tranche received aggregate migrate to schema 8 by creating one equal tranche using the saved amount/date/evidence exactly. Missing evidence remains missing; no bank reference is synthesized.
- Added tranche-aware evidence/reconciliation projection to Today’s Focus, Capital Blockers, resolved-record notices, and Owner / Board Summary.
- Added the 25th tenant-scoped financing table and same-workspace `outcome_id` reference guard. Current hardening counts are 25 scoped tables, 31 declared reference guards, 75 revision triggers and 49 registered API routes with one public health route.
- Added domain, real HTTP, UI, tenant-isolation, schema-7 restore compatibility, over-receipt rejection, direct aggregate tamper rejection, void/reinstate, reporting, and reconciliation regressions. The full suite reached 200/200 before final version/document sealing.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party accounting ledgers, bank aggregation systems, payment processors, reconciliation engines, workflow engines, or Agent runtimes.

## 2026-08-17 — Committed Capital Arrival Schedule / Continuity schema 9

### Permitted sources used

1. Existing independently implemented BossAI Funding Funding Outcome, Receipt Tranche, Capital Timing, Today’s Focus, Capital Blockers, Continuity, tenant scoping and Owner / Board Summary contracts.
2. Existing product rule that committed capital is not received cash and that only an actual Receipt Tranche changes the received aggregate.
3. General financing-operations principle that a payer-confirmed or closing-supported expected settlement date can be tracked as a management checkpoint without being represented as a probability forecast or guaranteed cash date.

### Independent design decisions

- Added financing-specific `FundingReceiptExpectation` persistence for committed-but-unreceived capital. It is not a cash-flow forecasting model, accounts-receivable ledger, scheduler, task engine, bank feed, or Agent runtime.
- Every active expectation requires a Funding Outcome, amount, explicit expected receipt date, basis/source note, responsible owner and status. The date must be entered from an actual payer/closing/award fact; BossAI Funding does not infer one from stage or history.
- Arrival schedule truth is deterministic: outstanding = committed - received. Active expected amounts project as unscheduled, partial, balanced or over-scheduled. A new/edited expectation cannot exceed current outstanding commitment.
- Actual Receipt Tranches remain authoritative. If real cash later arrives and makes an older expectation over-scheduled, the receipt succeeds and the stale plan becomes exact urgent reconciliation work. The product does not auto-match or auto-fulfill an expectation from a tranche.
- Expectations may be cancelled only with a reason. Cancellation retains the historical record while removing it from active scheduled amount and timing milestones.
- Overdue expectations become exact `receipt-expectation` Today’s Focus / Capital Blocker items. Unscheduled/partial commitments remain visible as timing/blocker gaps but intentionally have low Focus competition so they do not outrank another live Application or Term Sheet merely because no date has been recorded.
- Capital Timing includes `expected-receipt` milestones only from explicit active expectations and explicitly says these dates are not forecasts, guarantees, or actual receipt dates. Actual cash remains tranche-only.
- Continuity advances from schema 8 to schema 9. Schema-8 recovery points restore with an empty arrival schedule; no synthetic wire/settlement date is created.
- Added the 26th tenant-scoped financing table and second Outcome-linked receipt reference guard. Current hardening counts become 26 scoped tables, 32 declared same-workspace reference guards, 78 revision triggers and 51 registered API routes with one public health route.
- Added domain, HTTP journey, UI, tenant-isolation, schema-8 restore compatibility, schedule-overage rejection, actual-cash-over-plan acceptance, overdue exact navigation, cancellation-history and report-parity regressions. The full suite reached 208/208 before final version/document sealing.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party forecasting, treasury, accounting, bank aggregation, scheduling, workflow, reconciliation, audit, task or Agent engines.

## 2026-08-18 — Explicit Expectation→Receipt Reconciliation / Continuity schema 10

### Permitted sources used

1. Existing independently implemented BossAI Funding Funding Outcome, Receipt Tranche, Committed Capital Arrival Schedule, tenant scoping, Continuity, Today’s Focus, Capital Timing, Capital Blockers, and Owner / Board Summary contracts.
2. General financing-operations principle that a planned disbursement and an actual banked receipt are separate facts, and their relationship should be recorded explicitly when known rather than inferred from similar amount/date values.

### Independent design decisions

- Added financing-specific `FundingReceiptExpectationAllocation` persistence linking an Arrival Expectation to an actual Receipt Tranche by an explicitly owner-recorded allocated amount. It is not a bank-matching engine, payment processor, accounting ledger, workflow engine, or reconciliation service outside financing receipts.
- No automatic matching exists. Amount, date, provider, payer, stage, or model output never creates an allocation link.
- Allocations support partial and many-to-many settlement. Active allocation totals cannot exceed either the expectation amount or the actual tranche amount, and both records must belong to the same Funding Outcome and active workspace.
- Only valid active allocations reduce a specific expectation's remaining amount. A fully allocated expectation exits future expected-receipt timing; an unallocated actual receipt does not silently fulfill it.
- Allocation relationships are immutable in identity. A wrong relationship is voided with a reason and replaced rather than silently moved. Voided links remain historical.
- Actual Receipt Tranche truth remains authoritative. A tranche can still be corrected or voided even if an allocation points to it; the affected allocation then becomes explicit reconciliation work rather than blocking the banking correction.
- Continuity advances from schema 9 to schema 10. Schema-9 recovery points preserve Arrival Expectations and Receipt Tranches but restore an empty allocation register; no historical match is guessed.
- Added the 27th tenant-scoped financing table with same-workspace references to both expectation and tranche. Current hardening counts become 27 scoped tables, 34 declared same-workspace reference guards, 81 revision triggers and 53 registered API routes with one public health route.
- Added domain, real HTTP, UI, cross-tenant, restore-compatibility, partial fulfillment, over-allocation rejection, void/reinstate, actual-cash-priority, Focus/Blocker/Timing, and reporting regressions. The full suite reached 216/216 before final version/document sealing.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, schema, migrations, UI, documentation, tests, assets, prompts, APIs, or Git history.
- Third-party bank matching, payment reconciliation, accounting, workflow, Agent runtime, or generic task frameworks.

## 2026-08-18 — Allocation Integrity under Corrections — v0.34.0

### Permitted sources used

1. Existing independently implemented BossAI Funding Arrival Expectation, explicit Expectation→Receipt Allocation, Receipt Tranche, Today’s Focus, Capital Blockers, Capital Timing, Owner / Board Summary, tenant persistence, Continuity, and workspace-revision contracts.
2. General financing-operations principle that corrections to planned receipt schedules must not erase already recorded fulfillment relationships, while corrections to actual cash must remain authoritative and may force explicit reconciliation work.

### Independent design decisions

- Kept Continuity schema 10. No table, migration, API route, Agent runtime, scheduler, generic task engine, accounting ledger, bank feed, provider router, or identity authority was added.
- Arrival Expectation amount corrections fail closed below the total of active explicit Allocations. The rejected mutation leaves both financing state and workspace revision unchanged.
- Arrival Expectation cancellation fails closed while active Allocations exist. BossAI Funding never auto-voids an owner-confirmed Allocation relationship.
- The committed-capital arrival schedule now consistently uses remaining expectation amount rather than the original recorded amount after valid explicit Allocation fulfillment.
- Persistence capacity validation uses that same remaining projection: valid explicit fulfillment releases future schedule capacity, while a reconciliation-invalid Allocation does not masquerade as fulfilled cash merely to make additional schedule room.
- Allocation PATCH validation excludes the edited Allocation from both expectation and Receipt Tranche capacity calculations, then revalidates same-outcome ownership and both remaining capacities.
- Receipt Tranche corrections/void/reinstatement remain authoritative. If corrected actual cash no longer supports an active Allocation, the Allocation remains historical and the domain projection becomes reconciliation-required instead of blocking or rewriting the cash correction.
- Active Allocations whose aggregate exceeds a corrected Receipt Tranche amount are treated as invalid fulfillment. They no longer reduce the future schedule until explicitly corrected or voided.
- Today’s Focus and Capital Blockers identify the affected Arrival Expectation and exact Allocation IDs; the blocker remains critical until reconciliation is repaired.
- The owner UI separates Expected total, Explicitly allocated actual cash, and Remaining expectation, and labels integrity failures `RECONCILIATION REQUIRED`.
- Owner / Board Summary separately reports recorded expectation amount, explicitly allocated actual cash, remaining scheduled amount, and reconciliation-required Allocation IDs.
- The v0.34 targeted Allocation/Arrival/Focus/Blocker/Timing/UI/Reporting regression suite reached 35/35 PASS; full regression verification reached 219/219 PASS. Lint, typecheck, build, diff-check, and built-dist HTTP runtime invariants also passed.
- Current hardening counts remain 27 tenant-scoped business tables, 27 workspace guards, 34 declared same-workspace reference guards, 81 revision triggers, 53 registered API routes, and one public route.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, README, documentation, tests, schema, migrations, prompts, assets, API shapes, implementation mapping, or Git history.
- Third-party bank matching, forecasting, accounting, treasury, workflow, generic task, Agent runtime, audit, provider-routing, or identity systems.

## 2026-08-18 — Allocation Reconciliation Repair Guidance — v0.35.0

### Permitted sources used

1. Existing independently implemented BossAI Funding v0.34 Allocation Integrity, Receipt Tranche, Arrival Expectation, explicit Allocation, Bootstrap, Today’s Focus, Capital Blockers, Owner / Board Summary, and owner-facing correction UI contracts.
2. General reconciliation principle that a system may state the exact constraint violation and minimum correction needed without deciding which independently recorded business relationship the owner should remove.

### Independent design decisions

- Kept Continuity schema 10. No table, migration, route, generic reconciliation engine, bank feed, accounting ledger, task engine, Agent runtime, provider router, identity authority, or background worker was added.
- Added a deterministic `FundingReceiptAllocationReconciliationIssue` projection with issue kind, affected expectation/tranche references, exact Allocation IDs, recorded allocated amount, supported amount, required reduction amount, and reason.
- Existing Bootstrap now carries that projection so browser UI consumes the same server-side reconciliation truth used by domain logic instead of maintaining a second browser-side repair algorithm.
- Corrected Receipt Tranche capacity is handled conservatively: when several active Allocations share a Receipt and exceed current cash, the projection reports the exact aggregate excess and all involved Allocation IDs but does not select which owner-confirmed relationship to void or reduce.
- Allocation UI now shows the current maximum supported amount for the individual link after excluding that Allocation from both expectation-side and Receipt-side capacity calculations.
- Receipt cards expose explicit allocated total and remaining current cash capacity; Receipt, Expectation, and Allocation cards all expose the same repair constraint and minimum correction amount.
- Today’s Focus, Capital Blockers, and Owner / Board Summary carry the same minimum repair amount and affected Allocation IDs.
- Legacy/abnormal cancelled Arrival Expectations with active Allocations remain reconciliation-required rather than disappearing from Focus / Blockers as clean cancelled history.
- v0.35 adds four full-suite regression tests relative to v0.34; the full suite reached 223/223 PASS. `npm run verify`, `git diff --check`, and built-dist loopback repair smoke passed before documentation sealing.
- Built-dist repair smoke proved an active 10,000,000-cent Allocation against a Receipt corrected to 5,000,000 cents projects exactly 5,000,000 cents required reduction, preserves actual cash authority, and drives matching Focus / critical Blocker guidance.
- Current hardening counts remain 27 tenant-scoped business tables, 27 workspace guards, 34 declared same-workspace reference guards, 81 revision triggers, 53 registered API routes, and one public route.

### New third-party runtime impact

None.

### Explicitly not used

- OpenBcon source code, README, documentation, tests, schema, migrations, prompts, assets, API shapes, implementation mapping, or Git history.
- Third-party bank matching, payment reconciliation, accounting, treasury, workflow, generic task, Agent runtime, audit, provider-routing, or identity systems.

## 2026-08-18 — Owner-Controlled Reconciliation Repair Drafting — v0.36.0

### Permitted sources used

1. Existing independently implemented BossAI Funding v0.35 reconciliation repair projection, Allocation correction controls, stale-workspace draft-preservation behavior, and workspace-revision enforcement.
2. The locally installed official Google Chrome executable solely as a real browser runtime for repeatable acceptance through the Chrome DevTools Protocol. No Chrome source code, browser extension, third-party UI library, or copied implementation material was used.
3. General safe-editing principle: a product may prepare a user-reviewable draft from current facts, but a high-impact business correction must remain explicit, server-revalidated, and non-persistent until the owner confirms Save.

### Independent design decisions

- Kept Continuity schema 10 and the existing 53-route API surface. No database table, migration, new write endpoint, background worker, reconciliation authority, Agent runtime, generic task engine, or second audit/memory/provider system was added.
- Added `currentMaximumSupportedReceiptAllocation` only as a browser convenience over the currently loaded Bootstrap facts. The existing server-side Allocation PATCH remains authoritative.
- Added `Draft supported amount`, which changes only the visible amount input to the currently supported maximum and performs no network mutation.
- Added `Draft void`, which changes only the visible status selector and focuses the void-reason field. It deliberately leaves the reason blank so BossAI Funding cannot invent the owner's business explanation.
- Preserved the existing explicit `Save link` boundary. Save continues to enforce workspace revision, same-outcome relationship, expectation capacity, Receipt Tranche capacity, and void-reason validation.
- Extended stale-workspace recovery so Refresh keeps the unsaved repair draft, then recomputes a visible warning against the latest loaded financing facts. A draft above the latest supported maximum displays the exact excess and current maximum rather than being silently discarded or trusted.
- Added real HTTP regression proving an old repair draft receives `409 STALE_WORKSPACE_STATE` after actual cash changes in another client, leaves Allocation and cash facts unchanged, and succeeds only after refresh/review with the new supported amount.
- Added UI contract coverage proving both draft controls are non-persistent and the refreshed-draft warning remains explicit.
- Added `scripts/chrome-repair-smoke.cjs`, a zero-new-npm-dependency built-product browser gate using system Chrome + CDP. The real browser smoke passed the complete path: reconciliation visible; $100,000 link drafts to $50,000 without persistence; actual cash changes to $40,000; stale Save is rejected; Refresh preserves $50,000 and warns it is $10,000 over the new $40,000 support; latest draft saves at $40,000; draft void invents no reason; empty-reason Save fails closed; explicit owner reason saves and clears reconciliation.
- Full regression increased from 223 to 225 tests. A first formal full run showed one historical `strategy-freshness-journey.test.ts` file-level worker failure without a specific assertion; its isolated strategy suite immediately passed 11/11, and the subsequent full formal verify passed 225/225 with lint, typecheck, build, and diff-check all PASS. The transient run is not counted as final product evidence.
- Hardening counts remain 27 tenant-scoped business tables, 27 workspace guards, 34 same-workspace reference guards, 81 revision triggers, 53 registered API routes, and exactly one public route.

### New third-party runtime impact

None. Google Chrome is an optional local acceptance runtime, not a BossAI Funding runtime dependency or shipped product dependency.

### Explicitly not used

- OpenBcon source code, README, documentation, tests, schema, migrations, prompts, assets, API shapes, implementation mapping, or Git history.
- Third-party reconciliation, accounting, bank matching, workflow/task, state-management, browser automation, Agent runtime, audit, identity, or provider-routing packages.

## 2026-08-18 — Reconciliation Repair Impact Preview — v0.37.0

### Permitted sources used

1. Existing independently implemented BossAI Funding v0.36 owner-controlled repair drafting, Bootstrap financing facts, workspace-revision recovery, and system-Chrome repair gate.
2. General user-interface principle that a consequential edit should show its currently knowable effect before persistence while making clear that the authoritative server may still reject stale or invalid input.

### Independent design decisions

- Kept Continuity schema 10. No table, migration, API route, dry-run mutation endpoint, reconciliation engine, bank integration, workflow/task authority, Agent runtime, provider router, or identity authority was added.
- Added a browser-only unsaved impact preview for changed Allocation repair drafts. It is derived only from the currently loaded tenant-scoped Bootstrap state and current form values.
- Previewed values are limited to the drafted Allocation active amount, Arrival Expectation active allocated/remaining amount, Receipt Tranche active allocated/current cash capacity, and a loaded-facts capacity check.
- The preview does not claim final reconciliation success. It explicitly states that nothing is saved, actual Receipt cash is unchanged by the draft, and the server will revalidate current workspace revision, relationship, status and capacities at Save.
- Added local Save-prerequisite hints for missing owner void reason, non-positive active amount and loaded-facts capacity mismatch. These hints do not replace server validation.
- Extended the existing system-Chrome built-product gate to validate exact $100,000→$50,000 and $100,000→$40,000 active-Allocation previews, expectation/receipt balances, stale-draft non-fit state, $40,000→$0 Draft void preview, and void-reason readiness transition.
- Added one full-suite UI contract regression relative to v0.36; the first v0.37 formal full suite reached 226/226 PASS. Lint, typecheck, build and diff-check also passed before documentation sealing.
- Current hardening counts remain 27 tenant-scoped business tables, 27 workspace guards, 34 declared same-workspace reference guards, 81 revision triggers, 53 registered API routes, and one public route.

### New third-party runtime impact

None. The existing optional local system-Chrome acceptance runtime remains unchanged and is not a shipped BossAI Funding dependency.

### Explicitly not used

- OpenBcon source code, README, documentation, tests, schema, migrations, prompts, assets, API shapes, implementation mapping, or Git history.
- Third-party bank matching, payment reconciliation, accounting, treasury, workflow, generic task, Agent runtime, browser automation npm runtime, audit, provider-routing, or identity systems.

## Update rule

Add a dated entry whenever a new external implementation source, dependency, public specification, or material architectural influence is introduced.
