# BossAI Funding — Tenant-Scoping Migration Plan

## Status

Stage 1 schema preparation, Stage 2 local repository/continuity scoping, and database workspace hardening are implemented and tested in `v0.10.0`. Remote access remains blocked. This document does not authorize deployment or claim production identity readiness.

Current hardening truth:

```text
business tables with workspace scope: 23 / 23
workspace_id NOT NULL: 23 / 23
workspace insert/update guards: 23 / 23
workspace reference guards: complete
repositories scoped on the local server path: yes
cross-workspace negative tests: pass
workspace-scoped export / backup / restore: pass
legacy populated-row migration: pass
external identity verification: not implemented
production authorization policy: not implemented
remote access eligible: no
```

## Goal

Prepare BossAI Funding to consume an externally authenticated tenant identity while guaranteeing that one tenant cannot read, mutate, export, back up, restore, or reference another tenant's financing data.

BossAI Funding must not become the identity or commercial-account issuer.

## Current source of truth

Current local persistence has a stable `workspace_id`, a `funding_workspace` binding row, and database-required `workspace_id NOT NULL` on all 23 financing-domain tables. Server repositories, source ingestion, activity history, export, backup and restore are scoped to the active workspace. SQLite insert/update guards reject empty, unknown, or transferred workspace scope, and reference guards reject cross-workspace relationship writes even when Repository code is bypassed.

Therefore:

```text
external identity claims alone != tenant isolation
```

Remote access must stay disabled until the migration and negative tests below are complete.

## Proposed scope primitive

Introduce an application-level immutable scope passed into every repository call:

```ts
FundingTenantScope {
  tenantId: string
  workspaceId: string
  subject: string
  roles: string[]
  issuer: string
}
```

The scope comes from an approved upstream identity integration after cryptographic verification outside BossAI Funding's own account authority.

## Persistence strategy

Create a canonical workspace binding table:

```text
funding_workspace
- workspace_id
- tenant_id
- identity_issuer
- created_at
- bound_at
- status
```

Then tenant-scope every critical business row with `workspace_id NOT NULL` and enforce foreign-key ownership.

### Directly scoped root/business tables

The migration must cover:

```text
company_profile
funding_goal
fundraising_round
funding_action
capital_strategy
fund
investor
contact
investment_thesis
financing_meeting
investor_follow_up
funding_opportunity
funding_source_record
opportunity_match
funding_application
funding_document
data_room
data_room_folder
data_room_document
due_diligence_request
term_sheet
funding_outcome
funding_activity
```

`app_metadata` remains database-level metadata and must not substitute for row-level tenant checks.

## Repository rule

After migration, repository entry points must require a `FundingTenantScope`. No critical read or write may have an unscoped overload in production mode.

Required pattern:

```text
request
→ externally verified principal
→ FundingTenantScope
→ repository query includes workspace_id
→ result ownership checked
→ mutation / response
```

A record ID alone must never authorize access.

## Foreign-key and stale-reference rule

All linked IDs must belong to the same `workspace_id` as the parent mutation. Examples:

- Application → Opportunity
- Investor → Fund / Round
- Contact → Investor / Fund
- Meeting → Investor / Round
- Document → Round / Investor / Application
- DataRoomDocument → Folder / Document
- DueDiligenceRequest → Investor / Round / Document
- TermSheet → Investor / Round
- Outcome → Application / Investor / Round
- SourceRecord → Opportunity

Cross-workspace references must fail even if the numeric ID exists.

## Export / backup / restore rule

### Export

Every production export must include only the active tenant/workspace and record:

```text
tenantId
workspaceId
exportedAt
schemaVersion
```

### Backup

For SaaS/remote deployment, backup policy must be reviewed separately. A tenant-triggered recovery point must not include other tenants.

### Restore

Restore must verify:

1. product identity;
2. schema compatibility;
3. workspace identity;
4. tenant binding;
5. requested target tenant;
6. all restored rows belong to that workspace.

A restore from tenant A into tenant B must fail closed.

## Migration sequence

### Stage 1 — schema preparation — COMPLETE FOR LOCAL PERSISTENCE

Completed:

1. created `funding_workspace`;
2. bound the current local `workspace_id` to a local-only migration placeholder, not a production tenant;
3. added `workspace_id` to all 23 financing business tables;
4. backfilled current rows and verified no active-workspace row is missing scope;
5. verified SQLite foreign-key integrity;
6. added workspace indexes;
7. rebuilt `company_profile`, `funding_goal`, `capital_strategy`, and `funding_source_record` with `workspace_id NOT NULL` and workspace-aware uniqueness.

Additional defense-in-depth after Stage 1:

- relationship FKs remain their original numeric FKs, while workspace equality is enforced by database reference guards plus Repository ownership checks;
- a future database-engine change may replace those guards with composite workspace-aware foreign keys where it materially improves maintainability without migration risk.

### Stage 2 — repository scoping — IMPLEMENTED FOR LOCAL SERVER PATH

Completed:

1. Core / Equity / Opportunity / Execution / Funding Source repositories bind to the server-controlled active workspace;
2. production-path reads and updates filter by `workspace_id`;
3. linked numeric IDs are checked for active-workspace ownership before mutations;
4. source refresh keeps provider external IDs workspace-local;
5. Funding Activity History is workspace-scoped;
6. JSON export records `tenantId` and `workspaceId` and contains only the active workspace;
7. SQLite backup is pruned to the active workspace and then integrity/identity verified;
8. restore validates tenant/workspace identity and replaces only the active workspace while preserving other workspace rows;
9. forged browser tenant/workspace headers do not select repository scope.

This is now a database-hardened local tenant-scoping implementation. It is not an externally authenticated production tenant boundary until Stage 3 is complete.

### Stage 3 — external identity integration

1. integrate an approved identity verifier/gateway;
2. map verified `tenantId` to `funding_workspace`;
3. enforce role policy;
4. reject unknown issuer, tenant, workspace, stale authentication or missing claims;
5. retain loopback/local-owner mode separately where commercially required.

### Stage 4 — security acceptance

Remote access can be considered only after all tests below pass.

## Mandatory negative tests

At minimum:

```text
PASS — Tenant A cannot read Tenant B company profile through the scoped repository/server path.
PASS — Tenant A cannot enumerate Tenant B opportunities or investors.
PASS — Tenant A cannot PATCH Tenant B investor by numeric ID.
PASS — Tenant A cannot link an Application to Tenant B Opportunity.
PASS — Tenant A cannot link DD/TermSheet/Outcome to Tenant B Investor.
PASS — Tenant A export contains zero Tenant B business rows.
PASS — Tenant A backup contains zero Tenant B business rows/workspace binding.
PASS — Tenant A restore does not overwrite Tenant B post-backup changes.
PASS — the same official external ID can exist independently in A/B without source collision.
PASS — forged tenant/workspace browser headers do not switch repository scope.
PASS — incomplete external identity claims are rejected by the identity contract parser.
REMAINING — production verifier must reject unknown/untrusted issuer cryptographically.
REMAINING — production authorization policy tests must execute against the approved external identity integration.
```

## Remote enablement gate

Do not change the current loopback-only network policy until:

```text
schemaTenantScoped = true
repositoriesTenantScoped = true
crossTenantNegativeTests = PASS
externalIdentityVerification = PASS
authorizationPolicyTests = PASS
tenantExportBackupRestoreTests = PASS
securityReview = PASS
```

Only then may a separate production decision consider remote binding.
