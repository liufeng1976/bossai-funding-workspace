# BossAI Funding — Current State

Last updated: 2026-08-17
Constitution: `2026.08.14.1`
Product: BossAI Funding
Repository: `D:\BossAI-Projects\bossai-funding-workspace`
Version: `0.33.0`
Branch: `main`

## Classification

- Product type: Owner-facing financing decision and execution workspace
- Primary user: Enterprise owner / founder
- AI classification in Phase 1: AI Feature only; no AI Employee has been created
- Agent Platform: No; BossAI OS remains the only Agent Platform
- Current completion level: 2 — Functional MVP
- `productionReady=false`
- `actuallyLaunched=false`
- `realUserValidated=false`

## Clean-room status

BossAI Funding is an independent implementation. The OpenBcon repository is forbidden as an implementation source and was not used for this implementation batch.

Project clean-room evidence exists in:

- `CLEAN_ROOM_POLICY.md`
- `IMPLEMENTATION_PROVENANCE.md`
- `THIRD_PARTY_LICENSES.md`

## Batch preflight

### Highest commercial goal

Help an enterprise owner move from a quantified capital need to an executable capital plan and visible next action, with financing state persisted as business truth.

### Largest user gap addressed

Before this batch the new repository had no product. The owner could not create a funding profile, state a capital target, choose a capital mix, create financing work, or see what to do today.

### User-visible result

The real default entry is now a CEO Capital Command Center that answers:

- how much capital is still needed;
- how much is received, committed and in motion;
- what is happening in Grant, Debt and Equity;
- the single highest-priority action today and why;
- what capital mix is suggested by explicit planning rules.

## Implemented Phase 0

- independent Git repository initialized on `main`;
- project `AGENTS.md`;
- clean-room policy and provenance records;
- product requirements and architecture;
- third-party license inventory;
- TypeScript strict configuration;
- npm lockfile;
- automated lint gate;
- GitHub Actions CI workflow;
- domain, API and journey tests.

## Implemented Phase 1

### Persisted business truth

SQLite stores:

- `company_profile`;
- `funding_goal`;
- `fundraising_round`;
- `funding_action`;
- `capital_strategy`.

Critical financing state is not stored in browser localStorage.

### Company Funding Profile

Persists company, industry, stage, geography, founded year, revenue, MRR/ARR, growth, gross margin, cash, burn, runway, team size, product, business model, funding history, existing debt, cap-table summary, use of funds, target amount and target timing.

### Funding Goal

Persists target amount, need-by date, purpose, dilution preference, maximum monthly debt service and growth plan.

### Fundraising Round

Persists round name/type, target/minimum/committed/received amount, pre/post-money valuation, target close date, status and use of funds.

### Capital Strategy

Deterministic and explainable planning rules allocate the stated need across Grant, Debt and Equity. The result records reasons, primary risks, assumptions, warnings and any unfunded residual. It is explicitly planning support rather than legal, lending, tax or investment advice.

### Three capital tracks

Grant, Debt and Equity share one owner dashboard but retain track-specific state through persisted financing actions.

### Today's Focus

Priority is enforced in the domain layer. Near-deadline incomplete financing work has a dominant ranking tier and cannot be overtaken by lower-priority value weighting. High-value response/meeting/diligence stages are considered next, followed by saved/ready opportunities, equity follow-up, discovery and setup fallback.

The dashboard never becomes empty merely because there is no application.

## Real-entry journey exercised

Automated real HTTP acceptance exercises the same server endpoints used by the browser UI:

`open / → create company → set funding goal → create round → calculate strategy → create Grant action → create Debt action → create Equity action → return to bootstrap/dashboard → verify track counts, capital amounts and Today's Focus → close SQLite → reopen SQLite → verify persisted facts`.

## Acceptance status

### Technical Acceptance — PASS for Phase 1 MVP scope

Latest gate results:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 5/5 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- real HTTP journey test — PASS
- SQLite close/reopen persistence check — PASS
- built artifact startup smoke — PASS (`/api/health`, `/`, `/app.js`)

### Business Acceptance — PARTIAL / Phase 1 scope only

PASS within current scope:

- owner can establish financing facts and target;
- owner can create a fundraising round;
- owner receives an explainable Grant/Debt/Equity mix;
- owner can create real financing actions on all three tracks;
- dashboard reprojects capital status and Today's Focus from persisted data.

Not yet business-complete:

- Investor/Fund/Contact CRM and full equity pipeline;
- external Grant/Loan/Investor opportunity ingestion;
- explainable opportunity matching and readiness;
- applications, documents, data room, due diligence and term-sheet comparison;
- funding outcome and post-funding tracking.

### Real User Experience Acceptance — NOT YET PASSED

The default HTTP entry and browser UI are implemented and covered by automated entry checks, but this batch does not claim a human visual/usability acceptance pass on the target browser/device. Completion remains Level 2.

## Current risks / limitations

- local single-user MVP; no production authentication or tenant isolation;
- no production encryption-at-rest/hardened deployment claim;
- no external funding data connectors yet;
- strategy uses explicit planning proxies and must not be presented as professional financial/legal advice;
- no BossAI OS digital employee integration in this phase.

## Implemented Phase 2 — Equity Pipeline

Persisted first-class financing entities now include:

- `Fund`;
- `Investor`;
- `Contact`;
- `InvestmentThesis`;
- `FinancingMeeting`;
- `InvestorFollowUp`.

The fixed investor pipeline supports Target, Research, Ready to Contact, Contacted, Replied, Meeting, Partner Meeting, Due Diligence, Term Sheet, Negotiation, Committed and Closed, plus Passed, No Response and Not a Fit.

Owner-facing execution now supports:

- investor priority and relationship strength;
- warm introduction source;
- cheque range, sector/stage/geography fit and portfolio notes;
- last contact, next follow-up, next action and rejection reason;
- dated follow-ups with channel, result and completion state;
- financing meetings with objective, outcome and next action;
- in-place pipeline stage progression;
- Fund, Contact and Investment Thesis records;
- Equity track projection into the CEO Capital Command Center;
- investor Meeting/Follow-up projection into Today's Focus.

Meeting and follow-up records are deliberately financing-domain objects, not a second generic Task, Scheduler, CRM platform or Approval engine.

Latest Phase 2 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 6/6 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- Phase 1 owner journey regression — PASS
- Phase 2 real HTTP equity journey — PASS
- Phase 2 SQLite close/reopen persistence — PASS

## Implemented Phase 3 — Funding Opportunity + Matching + Readiness

The funding workspace now persists first-class `FundingOpportunity` records for Grant, Loan and Investor opportunities. Common facts remain unified while type-specific terms remain explicit.

Implemented opportunity facts include:

- provider/source, URL and description;
- geography, sector and company-stage constraints;
- minimum/maximum available capital and deadline;
- saved/pursuing/dismissed owner decision;
- Grant program type, eligibility and matching-fund requirement;
- Loan term, rate, fees, minimum DSCR, collateral and personal-guarantee flags;
- optional linked Investor/Fund and investor type.

Matching is deterministic, explainable and auditable. Each persisted `OpportunityMatch` contains:

- fit classification;
- auxiliary score;
- every evaluated rule;
- match/partial/missing/mismatch/ineligible result per rule;
- plain-language explanation;
- corrective action;
- blockers;
- missing facts;
- recommended next step;
- evaluation timestamp.

The score is not treated as the decision authority. Owner UI exposes the underlying rules and corrective actions.

Funding Readiness now evaluates identity, revenue, cash/runway, economics, product/business model, ownership/funding history, use of funds and stated funding target. It returns completion percentage, concrete missing facts and the first corrective action.

Company profile and funding-goal changes automatically invalidate and recalculate saved opportunity matches against the new facts. Strong saved opportunities can feed Today's Focus, but near-deadline active financing work, investor follow-ups and meetings retain the fixed higher-priority hierarchy where applicable.

Latest Phase 3 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 11/11 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- explainable Grant matching — PASS
- Loan repayment/DSCR mismatch exposure — PASS
- Funding Readiness rules — PASS
- opportunity versus investor-focus priority — PASS
- Phase 3 real HTTP journey — PASS
- Phase 3 SQLite close/reopen persistence — PASS

## Implemented Phase 4 — Funding Execution

The owner execution loop now persists and exposes:

- `FundingApplication` linked to an opportunity when applicable, with track, requested/approved amounts, submission/review state, deadlines, owner, next action and rejection reason;
- versioned `FundingDocument` records with document type, status, completion percentage and links to round/investor/application;
- `DataRoom` with automatic creation of the eight standard folders: Corporate, Financial, Legal, Product, Customers, Team, IP and Fundraising;
- `DataRoomDocument` readiness/expiry tracking;
- `DueDiligenceRequest` linked to Investor, optional Round and optional Document, with owner, deadline, request, response notes and fixed status progression;
- persisted `TermSheet` records with economic and governance terms;
- `FundingOutcome` with Won/Lost/Withdrawn/Closed and explicit approved, committed and received capital.

Data Room readiness is category-coverage based. A single ready file can no longer produce a false 100% readiness result while other diligence categories are empty.

Term Sheet comparison now:

- compares recorded investment amount, valuation and estimated ownership when calculable;
- summarizes governance terms;
- flags selected recorded conditions that warrant extra attention;
- always returns `lawyerReviewRequired=true`;
- always states that the comparison is not legal advice and cannot determine the legally best term sheet.

Standalone successful Grant/Debt outcomes feed received and committed capital back into the CEO Capital Command Center. Outcomes attached to a Fundraising Round are not added a second time, preventing double counting.

Application and Due Diligence deadlines are now candidates for Today's Focus and preserve the fixed near-deadline priority hierarchy.

The default owner UI now exposes the six-stage journey navigation:

```text
Capital plan → Find money → Move actions → Investors → Execute & close → History & safety
```

Latest Phase 4 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 14/14 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- Phase 1 journey regression — PASS
- Phase 2 equity real HTTP journey — PASS
- Phase 3 opportunity real HTTP journey — PASS
- Phase 4 execution real HTTP journey — PASS
- Data Room false-100%-readiness prevention — PASS
- Term Sheet mandatory lawyer-review contract — PASS
- Phase 4 SQLite close/reopen persistence — PASS
- built-server smoke: `/api/health`, `/`, `/api/bootstrap` — PASS

## Implemented Owner Continuity & Local Security — v0.5.0

The owner now has a persisted cross-entity Funding Activity History. It records financing business changes across setup, strategy, opportunities, investor work, applications, documents, Data Room, diligence, term sheets, outcomes and continuity operations. This is deliberately a product-level financing history and not a second BossAI OS/company-wide Audit authority.

Continuity now includes:

- complete JSON funding-data export from the current SQLite source of truth;
- native local SQLite backup using Node 24 `node:sqlite.backup`;
- product/schema metadata for recovery compatibility;
- immediate read-only reopen and `PRAGMA integrity_check` verification for every newly created backup;
- controlled backup directory and validated backup file names;
- restore that first validates product, schema, integrity and required table set;
- automatic verified `pre-restore` backup before destructive recovery;
- transactional whitelist restore of BossAI Funding business tables;
- rollback on failed restore;
- restore event recorded back into Funding Activity History.

The local security boundary is now fail-closed rather than merely conventional:

- server startup rejects `0.0.0.0`, LAN addresses and other non-loopback bind hosts;
- request Host validation accepts only `localhost`, `127.0.0.1` and `::1`;
- responses use CSP, no-referrer policy, same-origin opener policy, `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff`;
- `/api/health` declares `accessMode=local-loopback`;
- remote/SaaS exposure remains blocked until real production authentication and tenant isolation exist.

Latest v0.5.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 18/18 tests at v0.5.0 baseline
- `npm run build` — PASS
- `git diff --check` — PASS
- backup → mutate → JSON export → rejected invalid restore confirmation → verified restore → automatic pre-restore backup → SQLite reopen journey — PASS
- local bind host policy — PASS
- request Host policy — PASS
- browser security-header contract — PASS
- Phase 1–4 journey regressions — PASS

## Implemented Source Provenance & Handoff — v0.6.0

BossAI Funding now has an explicit external-source boundary and the first approved official public adapter: Grants.gov.

Implemented source controls:

- `DATA_SOURCES.md` records admission rules, official endpoints, terms and required attribution;
- `funding_source_record` persists source kind, provider key, external ID/number, canonical URL, API endpoint, terms URL, fetched-at time and attribution;
- all manually entered opportunities also receive a `manual` provenance record;
- Grants.gov search runs only after explicit owner submission and is capped at 10 results per action;
- only posted/forecasted opportunities are requested by the adapter;
- detail data is retrieved through the official `fetchOpportunity` endpoint;
- missing official amounts, geography, stage or matching-fund amounts remain missing instead of being invented;
- source-provided eligibility is treated as a summary that still requires review of the official notice;
- refreshing an official opportunity preserves the owner's existing `saved`, `pursuing` or `dismissed` decision;
- source outages return a recoverable `SOURCE_UNAVAILABLE` response without deleting saved opportunities;
- Grants.gov required attribution is visible in the owner UI.

Owner handoff now includes `GET /api/reports/capital-pipeline.csv`, producing a CSV of funding opportunities, investors, applications and outcomes with relevant source URLs, amounts, status, dates and next actions.

The owner-entry resilience work is also active:

- server constraint failures are classified into recovery-oriented error codes;
- stale foreign-key references return HTTP 409 `STALE_REFERENCE`;
- browser save state changes to `Not saved — input kept` rather than clearing the form;
- the same financing draft can be corrected and retried without rebuilding it.

Latest v0.6.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 23/23 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- Grants.gov adapter mapping/provenance — PASS
- official source refresh preserving owner decision — PASS
- source API declared failure handling — PASS
- stale-reference retry journey — PASS
- capital-pipeline CSV escaping/amount/provenance — PASS
- live official Grants.gov `search2` smoke — PASS
- live official Grants.gov `fetchOpportunity` smoke — PASS
- built-product `/api/sources/grants-gov/search` real official import — PASS
- built-product source provenance projection — PASS
- required Grants.gov attribution visible in built default UI — PASS
- built-product Capital Pipeline CSV with official source link — PASS
- verified local backup after real source import — PASS

## Implemented Production Identity Boundary + Field Recovery + Board Handoff — v0.7.0

BossAI Funding now has an explicit production identity/tenant integration contract without creating a second BossAI account or commercial authority.

Implemented identity boundary:

- `IDENTITY_TENANT_CONTRACT.md` defines a consumption-only external identity contract;
- future approved identity must provide verified `subject`, `tenantId`, `roles`, `issuer`, and `authenticatedAt` claims;
- BossAI Funding does not issue passwords, registrations, subscriptions, customer accounts or commercial identities;
- every local database receives a stable generated `workspace_id` used for continuity/export provenance and future tenant-binding migration;
- `workspace_id` is explicitly not treated as tenant isolation;
- `GET /api/security/identity-boundary` reports the actual current boundary;
- current status remains `identityMode=local-owner`, `authenticationAuthority=external-required`, `tenantIsolation=not-implemented`, `remoteAccess=blocked`;
- supplying an external principal cannot unlock remote access while tenant-scoped persistence is absent.

Continuity schema is now `2` because `funding_source_record` and stable workspace identity are required recovery facts. Backup/export/restore tests verify the workspace ID survives backup, restore and SQLite reopen.

Owner save/retry UX now supports field-level correction for high-frequency forms:

- validation failures return `VALIDATION_ERROR` plus the exact server field;
- Company Profile, Funding Goal, Application, Opportunity, Investor and Grants.gov search forms map server fields to visible controls;
- the invalid field is focused and marked inline;
- current entered values remain in place for immediate correction/retry;
- stale linked records retain the separate `STALE_REFERENCE` recovery path.

Owner/board handoff now includes:

- `GET /api/reports/owner-board-summary.md`;
- deterministic capital position, Today's Focus, Grant/Debt/Equity state, execution counts, top evaluated opportunities and source provenance;
- no model narration;
- explicit legal/source decision disclaimers.

Debt/Investor source admission was reviewed but deliberately not expanded with false mappings:

- the SBA public lender directory identifies lenders but does not provide authoritative owner-specific loan offer amount/rate/term/fees/DSCR/collateral/guarantee facts, so lender rows are not converted into Loan Opportunities;
- SEC EDGAR public APIs provide filing/XBRL data rather than current investor thesis/cheque/stage/willingness-to-invest facts, so filings are not converted into Investor Opportunities;
- these non-admission decisions are recorded in `DATA_SOURCES.md`.

Latest v0.7.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 27/27 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- production identity contract and remote-lock gate — PASS
- incomplete external identity claims — PASS
- field-specific validation response — PASS
- stale-reference retry regression — PASS
- workspace ID backup/export/restore/reopen continuity — PASS
- Owner/Board Capital Summary domain export — PASS
- built `/api/security/identity-boundary` — PASS
- built schema v2 bootstrap projection — PASS
- built field-level validation API response — PASS
- built Owner/Board Summary download — PASS
- built default UI identity boundary + board export entry — PASS
- all Phase 1–4, continuity, source and reporting regressions — PASS

## Implemented First-Run Owner Journey + Acceptance Preparation — v0.8.0

BossAI Funding now projects a deterministic first-run owner journey directly from persisted business state:

```text
Capital plan
→ Find money
→ Choose what to pursue
→ Move the financing
→ Protect the work
```

`OwnerJourneyProgress` includes:

- 5 fixed owner steps;
- completed-step count and completion percentage;
- the first incomplete/current step;
- plain-language reason for each step's status;
- one concrete next action;
- direct destination back into the correct product section.

The default Capital Command Center now displays this progress immediately below the capital/focus hero. A new owner can see what remains without reading architecture or implementation documentation.

Manual Real User Experience acceptance preparation is now explicit:

- `OWNER_ACCEPTANCE.md` defines fresh file-backed target-device setup;
- test journey covers Capital Plan → official Grants.gov search → owner decision → invalid-field retry → application/action → Data Room/DD/Term Sheet/Outcome where applicable → handoff exports → backup/restore/restart;
- comprehension questions require the owner to identify gap, active track, next action, blocker, received-vs-committed capital, and recovery entry without developer interpretation;
- automated tests are explicitly insufficient to set `realUserValidated=true`.

Tenant-scoping preparation is documented in `TENANT_SCOPING_MIGRATION.md`:

- proposed externally supplied `FundingTenantScope`;
- `funding_workspace` binding model;
- required workspace scope for every critical financing table;
- cross-workspace foreign-key ownership rules;
- tenant-scoped export/backup/restore requirements;
- staged SQLite migration sequence;
- mandatory cross-tenant negative-test matrix;
- remote enablement gate remains closed.

Latest v0.8.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 29/29 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- empty owner journey starts at Capital Plan with a concrete next action — PASS
- fully prepared owner journey reaches 5/5 only when plan/source decision/execution/recovery facts exist — PASS
- built `/api/bootstrap` OwnerJourney projection — PASS
- built default UI `YOUR FUNDING PATH` entry — PASS
- built default first-step state `0 of 5 steps complete` — PASS
- built identity boundary remains `remoteAccess=blocked` — PASS
- built Owner/Board Summary export regression — PASS
- all Phase 1–4, continuity, source, reporting, identity and recovery regressions — PASS

## Implemented Local Tenant-Scoped Persistence Foundation — v0.9.0

The local server path now has a real workspace isolation layer instead of only a future tenant design document.

Schema and binding:

- continuity schema advanced to `3`;
- `funding_workspace` is the canonical workspace/tenant binding table;
- all 23 financing-domain business tables have a `workspace_id` column and active-workspace backfill;
- current local binding uses `local-workspace:<workspaceId>` and is not represented as a production tenant identity;
- workspace-aware indexes exist across the scoped tables;
- `company_profile`, `funding_goal`, `capital_strategy`, and `funding_source_record` now enforce `workspace_id NOT NULL` at the SQLite table layer;
- those three owner singletons use `(workspace_id, id)` composite identity, allowing independent workspace-local `id=1` rows;
- `funding_source_record` uniqueness is workspace-aware, so identical official external IDs do not collide across tenants.

Repository isolation:

- Core Funding, Equity, Opportunity, Execution, and Funding Source repositories bind to the server-controlled active workspace after migration;
- browser-supplied tenant/workspace headers are not used to select repository scope;
- lists and updates on the local server path are workspace-filtered;
- linked numeric IDs are checked for active-workspace ownership before Investor, Application, Document, Meeting, Follow-up, Data Room, DD, Term Sheet, Outcome, Match and Source mutations;
- an unavailable/cross-workspace linked ID returns the same non-enumerating `409 STALE_REFERENCE` contract rather than revealing whether another workspace owns the ID.

Continuity isolation:

- Funding Activity History is workspace-scoped;
- JSON export now records `workspaceId`, `tenantId`, `schemaVersion`, and exports only active-workspace business rows;
- local SQLite backup first copies the database, then removes every other workspace business row/binding before verification;
- backup validation checks product, schema, workspace and tenant binding;
- restore requires the same workspace/tenant identity and replaces only the active workspace;
- restoring Workspace A is verified not to overwrite Workspace B data changed after A's backup.

Cross-workspace negative acceptance now verifies in one SQLite database:

- A cannot read B Company Profile;
- A cannot enumerate or update B Investor;
- A cannot enumerate B Opportunity;
- A cannot create Application → B Opportunity;
- A cannot create DD / Term Sheet / Outcome → B Investor;
- the same official provider external ID can exist independently in A and B;
- forged `x-bossai-tenant-id` / `x-bossai-workspace-id` browser headers do not switch scope;
- A export contains no B business rows;
- A backup contains no B business rows or B workspace binding;
- A restore preserves B post-backup changes.

`GET /api/security/tenant-scope` now reports hardening quantitatively. Current expected truth is:

```text
scoped business tables = 23 / 23
repository scoping = true
cross-workspace negative tests = pass
workspace_id NOT NULL tables = 4 / 23
nullable workspace_id tables = 19 / 23
external identity verification = false
remoteAccessEligible = false
```

Therefore this release does **not** claim production multi-tenant readiness. The remaining 19 business tables still need SQLite table rebuilds for equivalent `workspace_id NOT NULL` hard constraints, and the production external identity verifier/authorization policy is not implemented.

Latest v0.9.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 31/31 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- 23-table workspace migration/backfill — PASS
- local server repository scoping — PASS
- linked-record workspace ownership checks — PASS
- cross-workspace read/update/reference negative tests — PASS
- forged browser tenant/workspace header isolation — PASS
- workspace-scoped source external ID uniqueness — PASS
- workspace-scoped JSON export — PASS
- workspace-pruned verified SQLite backup — PASS
- workspace-only restore preserving another workspace — PASS
- built `/api/security/tenant-scope`: `23/23` scoped, `4/23` NOT NULL, `19/23` nullable, repository scoping PASS, remote eligibility false — PASS
- built forged tenant/workspace headers do not alter server-selected workspace — PASS
- built JSON export: `schemaVersion=3`, active `workspaceId`, matching `tenantId`, one active workspace binding — PASS
- built `/api/security/identity-boundary` remains `remoteAccess=blocked` — PASS

## Implemented Database-Complete Local Tenant Hardening — v0.10.0

The local tenant-scoping layer is now hardened below the Repository layer as well as inside it.

Database schema truth:

```text
scoped business tables = 23 / 23
workspace_id NOT NULL = 23 / 23
workspace insert/update guards = 23 / 23
workspace reference guards = complete
foreign_key_check violations = 0
continuity schema = 4
```

The remaining 19 nullable tables from v0.9 are rebuilt automatically from SQLite's current live table definitions. The migration preserves original IDs, columns, business CHECK constraints, numeric relationship FKs and explicit indexes, while changing workspace scope to:

```text
workspace_id TEXT NOT NULL
REFERENCES funding_workspace(workspace_id)
ON DELETE CASCADE
```

Migration safety:

- scoped rows are backfilled before hardening;
- workspace/reference triggers are temporarily removed before table rebuilds so no trigger can reference a table during its short replacement window;
- SQLite FK enforcement is disabled only around the controlled rebuild transaction;
- FK enforcement is immediately restored;
- `PRAGMA foreign_key_check` must return zero violations;
- workspace indexes and all guards are then reinstalled.

Database defense in depth now rejects direct-SQL bypasses even without Repository code:

- insert with missing workspace → rejected;
- insert with unknown workspace → rejected;
- changing an existing row from Workspace A to Workspace B → rejected;
- Workspace A Investor referencing Workspace B Fund → rejected;
- Workspace A Application referencing Workspace B Opportunity → rejected.

The migration is not tested only on empty/fresh databases. `tenant-migration.test.ts` constructs a populated legacy database with representative records covering Company Profile, Goal, Round, Action, Strategy, Fund, Investor, Contact, Thesis, Meeting, Follow-up, Opportunity, Match, Source, Application, Document, Data Room/Folders/Documents, DD, Term Sheet, Outcome and Activity, then hardens the schema and verifies:

- original IDs survive;
- relationships remain valid;
- source/match state survives;
- financing execution state survives;
- all 23 workspace columns become NOT NULL;
- AUTOINCREMENT continues above prior IDs.

Identity truth is now deliberately more precise:

```text
identityMode = local-owner
tenantIsolation = local-workspace-scoped
tenantScopedPersistenceReady = true
productionAuthenticationReady = false
productionAuthorizationReady = false
remoteAccess = blocked
```

This means the **local persistence isolation layer is technically ready**, but the product is still not authorized for remote/SaaS exposure. A real approved external identity verifier, issuer trust, role authorization tests, production security review and human owner acceptance remain outside the current evidence.

Latest v0.10.0 acceptance:

- tenant migration with populated legacy data — PASS
- 23/23 workspace NOT NULL migration — PASS
- 23/23 workspace insert/update database guards — PASS
- all declared same-workspace reference guards — PASS
- direct-SQL missing/unknown workspace bypass — rejected
- direct-SQL workspace-transfer bypass — rejected
- direct-SQL cross-workspace Fund/Opportunity references — rejected
- cross-workspace Repository/HTTP/export/backup/restore suite — PASS
- all Phase 1–4 / source / owner journey regressions — PASS
- `npm run verify` — PASS, 32/32 tests
- built tenant scope: `database-hardened-local`, 23/23 NOT NULL, 23/23 scope guards, 29/29 reference guards, FK violations 0 — PASS
- built identity boundary: `local-workspace-scoped`, tenant persistence ready, production authentication/authorization not ready, remote blocked — PASS
- built JSON export: `schemaVersion=4`, active workspace/tenant binding only — PASS
- built forged tenant/workspace headers cannot change active scope — PASS

## Implemented Authorization Policy Contract — v0.11.0

BossAI Funding now has a typed, deny-by-default authorization contract without becoming an authentication/account authority.

Recognized product roles:

```text
owner
editor
viewer
```

Current operation matrix:

```text
owner  → read, mutate, export-summary, export-data, backup, restore
editor → read, mutate, export-summary
viewer → read
unknown role → deny
wrong tenant → deny before role evaluation
```

High-impact data operations are deliberately separated from ordinary reads/mutations. Full data export, backup and restore are owner-only.

API route classification is implemented for the future verified-principal middleware:

```text
public
read
mutate
export-summary
export-data
backup
restore
```

Examples:

- health/security status endpoints → public;
- bootstrap / backup list → read;
- Owner/Board Summary → export-summary;
- full JSON export / Capital Pipeline CSV → export-data;
- recovery-point creation → backup;
- recovery restore → restore;
- other POST/PUT/PATCH/DELETE business APIs → mutate.

`GET /api/security/authorization-policy` exposes the contract and must continue to report:

```text
enforcementMode = contract-only
upstreamVerificationRequired = true
denyByDefault = true
routeClassificationReady = true
productionAuthorizationReady = false
```

This is intentional. BossAI Funding still has no approved issuer/signature/audience/key-distribution contract, so the policy is **not** wired to raw browser claims or an invented JWT verifier. Local loopback mode remains unchanged.

Latest v0.11.0 acceptance:

- deny-by-default policy projection — PASS
- owner all-operation matrix — PASS
- editor high-impact restrictions — PASS
- viewer read-only restriction — PASS
- tenant mismatch deny — PASS
- unknown role deny — PASS
- multi-role priority — PASS
- API route operation classification — PASS
- `npm run verify` — PASS, 38/38 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- built authorization endpoint: `contract-only`, upstream verifier required, deny-by-default, route classification ready, production authorization false — PASS
- built tenant endpoint: `database-hardened-local`, 23/23 NOT NULL, 23/23 scope guards, 29/29 reference guards, FK violations 0, remote eligibility false — PASS
- built identity endpoint: local workspace scoped persistence ready; production authentication/authorization false; remote blocked — PASS

## Implemented Identity Verification Boundary + Authorization Enforcement — v0.12.0

BossAI Funding now has a real enforcement implementation without inventing an identity provider.

Identity verification boundary:

- added provider-neutral `IdentityVerifier` and `VerifiedExternalPrincipal` contracts;
- verifier evidence must state signature, issuer, audience and temporal validity were verified, with revocation checking when the configured integration requires it;
- BossAI Funding independently enforces issuer allowlist, required audience, authentication age, expiry/clock skew and revocation policy;
- no built-in JWT provider, login service, password store, user-registration authority or token issuer was added;
- `GET /api/security/identity-verifier` reports adapter-contract readiness while explicitly reporting that no production cryptographic provider is configured.

Authorization enforcement:

```text
default runtime = local-owner
optional protected runtime = verified-external
```

`verified-external` server construction requires both an injected `IdentityVerifier` and an `IdentityVerificationPolicy`. Protected API requests execute:

```text
Host / loopback boundary
→ IdentityVerifier
→ verification evidence policy
→ tenant + role authorization
→ security decision event
→ financing route
→ workspace-scoped Repository
```

Real HTTP acceptance proves:

```text
unverified principal        → 401; mutation not executed
wrong tenant owner          → 403
viewer mutation             → 403
editor full-data export     → 403
correct tenant owner        → 200; mutation executed
```

Browser `x-bossai-tenant-id`, workspace or role claims remain non-authoritative.

Security decision evidence:

- added tenant-scoped `security_decision_event`;
- records subject, tenant, issuer, effective role, identity state, operation, method/path, allow/deny, reason, adapter and timestamp;
- this is BossAI Funding access-control evidence only, not a second company-wide Audit system;
- owner-restorable financing snapshots deliberately exclude security events;
- native SQLite backups prune other-workspace security events and retain the active workspace events.

Restore hardening discovered and fixed a real edge case: deleting/reinserting `funding_workspace` would cascade-delete security decisions. Restore now validates identity and updates the existing binding in place, so financing recovery cannot erase authorization evidence. Tenant-isolation acceptance verifies this behavior.

Latest v0.12.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 44/44 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- IdentityVerifier contract status — PASS
- approved issuer/audience verification policy — PASS
- stale authentication / expiry / revocation-required rejection — PASS
- verified-external missing verifier/policy startup rejection — PASS
- unverified HTTP request denied before mutation — PASS
- wrong-tenant authorization denial — PASS
- viewer mutation denial — PASS
- editor full-data export denial — PASS
- owner mutation allow — PASS
- allow/deny security decision persistence — PASS
- security-event backup tenant pruning — PASS
- Restore preserves security decision history — PASS
- built authorization endpoint: `local-owner`, enforcement implementation ready, production authorization false — PASS
- built identity-verifier endpoint: adapter contract ready, provider not configured, production authentication false — PASS
- built tenant endpoint: 23/23 NOT NULL, 23/23 workspace guards, 29/29 reference guards, remote eligibility false — PASS
- built identity boundary: tenant persistence ready, production authentication/authorization false, remote blocked — PASS

## Implemented Route Security Manifest + Security Review Readiness — v0.13.0

BossAI Funding now treats API authorization classification itself as a fail-closed security boundary.

Route Security Manifest:

- added `src/server/api-security-manifest.ts` as the single classification source for supported `/api/*` routes;
- each route is explicitly classified as `public`, `read`, `mutate`, `export-summary`, `export-data`, `backup`, or `restore`;
- removed the previous implicit method fallback (`GET => read`, mutation methods => mutate`); an unknown API receives no authorization class;
- manifest tests verify unique route signatures and that every fixed HTTP route implemented in `app.ts` has a registered classification;
- every manifest route is round-tripped through the runtime classifier.

Unclassified API fail-closed behavior:

```text
local-owner
→ 404 UNCLASSIFIED_API_ROUTE
→ local-owner / unclassified-api deny evidence

verified-external
→ 403 API_SECURITY_CLASSIFICATION_REQUIRED
→ deny occurs before IdentityVerifier invocation
```

A future developer therefore cannot add a reachable business API without first assigning its security class.

Disclosure reduction:

- only `GET /api/health` remains anonymous in verified-external mode;
- identity-boundary, authorization-policy, identity-verifier, tenant-scope, and review-readiness endpoints are now `read` operations;
- unverified access to security status is rejected with `401`;
- a verified viewer can read security status without receiving mutation authority.

Standalone configuration hardening:

- added `src/server/runtime-security-config.ts`;
- default and explicit `local-owner` are accepted;
- `BOSSAI_FUNDING_AUTHORIZATION_MODE=verified-external` is rejected in the standalone executable unless an approved verifier is actually composed through the server boundary;
- unknown authorization modes are rejected instead of silently falling back.

Security evidence migration:

- `security_decision_event.operation` now admits `unclassified-api`;
- existing v0.12 security-decision rows are migrated losslessly;
- migration acceptance verifies original event ID/content survive and the next event continues the sequence;
- financing Continuity schema intentionally remains `4` because financing export/restore structure did not change, so old financing recovery points are not invalidated merely by the security-event enum extension.

Security review handoff:

- added `SECURITY_REVIEW_READINESS.md`;
- added `GET /api/security/review-readiness`;
- the endpoint projects tenant hardening, Route Security Manifest counts, verifier configuration, authorization implementation, and security-evidence status;
- it must continue to report `status=not-approved`, `remoteAccessDecision=blocked`, and `securityReviewAttested=false` until an actual production security review occurs.

Latest v0.13.0 acceptance before final full gate:

- Route Security Manifest uniqueness/classification — PASS
- fixed HTTP API route manifest coverage — PASS
- no implicit unknown-route authorization fallback — PASS
- local-owner unclassified API fail-closed + evidence — PASS
- verified-external unclassified API denied before verifier — PASS
- standalone local-owner default/explicit config — PASS
- standalone external mode without adapter — fail-closed PASS
- standalone unknown security mode — fail-closed PASS
- v0.12 security-event migration preservation — PASS
- security review readiness remains not-approved/blocked — PASS
- security status requires verified `read` authority in verified-external mode — PASS
- health remains the only anonymous manifest route — PASS

## Implemented Local Browser Request Integrity — v0.14.0

The loopback `local-owner` runtime is now protected against browser-origin mutation attempts even though it intentionally has no local login flow.

Mutation boundary:

```text
Route Security Manifest
→ browser request-integrity check
→ IdentityVerifier (verified-external only)
→ authorization
→ financing route
```

For all state-changing `/api/*` methods (`POST`, `PUT`, `PATCH`, `DELETE`):

- `application/json` is required;
- explicit browser `Sec-Fetch-Site` values other than `same-origin` / `none` are rejected;
- `no-cors` and navigation mutation modes are rejected;
- when `Origin` exists it must exactly match the current loopback Host;
- native/CLI clients may omit Origin while retaining the JSON requirement;
- denials happen before financing Repository mutation;
- verified-external cross-site denials occur before the `IdentityVerifier` is called;
- local-owner and verified-external denials are recorded in `security_decision_event` with the correct identity state.

Response hardening now also includes:

```text
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
```

Real HTTP acceptance proves:

```text
cross-site local-owner PUT          → 403; Company Profile unchanged
same-origin text/plain PUT          → 415; Company Profile unchanged
same-origin application/json PUT    → 200; Company Profile updated
cross-site verified-external PUT    → 403 before verifier call
native JSON mutation without Origin → allowed
```

`GET /api/security/review-readiness` now exposes `browserRequestIntegrity.ready=true` together with same-origin/JSON/fetch-metadata/native-client invariants while still reporting `status=not-approved` and remote access blocked.

The loopback bind rejection message was updated to the current real blockers: approved production identity verification, authorization, production security review, and explicit remote-bind approval. Local workspace tenant persistence is no longer incorrectly described as absent.

Continuity schema remains `4`; this release changes request security, not financing backup/export/restore data shape.

Latest v0.14.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 58/58 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- browser-integrity unit matrix — PASS
- cross-site Fetch Metadata reject — PASS
- Origin mismatch reject — PASS
- text/plain/simple-request mutation reject — PASS
- same-origin JSON mutation allow — PASS
- native JSON client without Origin allow — PASS
- local-owner denied mutation leaves financing state unchanged — PASS
- verified-external cross-site denial occurs before verifier — PASS
- security decision identity state on browser denials — PASS
- new response isolation headers — PASS
- all existing financing journeys after browser-integrity enforcement — PASS
- built cross-site Company Profile mutation: `403 CROSS_SITE_REQUEST_BLOCKED`, persisted profile remains null — PASS
- built same-origin `text/plain` Company Profile mutation: `415 JSON_CONTENT_TYPE_REQUIRED` — PASS
- built same-origin JSON Company Profile mutation: `200`, persisted profile updated — PASS
- built review readiness: browser request integrity ready; production review not attested; remote blocked — PASS
- built headers: CSP, CORP same-origin, Origin-Agent-Cluster, restrictive Permissions-Policy, frame deny — PASS

## Implemented Operational Integrity & Source Resilience — v0.15.0

This batch turns several security/resilience assumptions into runtime-enforced product invariants and integrates the current workspace-revision concurrency layer into the same machine-readable readiness surface.

Startup security invariants:

- Route Security Manifest validation now runs before tenant schema preparation;
- duplicate route keys/signatures block startup;
- `GET /api/health` must remain the only anonymous API route;
- registered route samples must classify uniquely;
- tenant startup requires 23/23 prepared and NOT NULL workspace-scoped business tables;
- 23/23 workspace guards and 29/29 declared same-workspace reference guards are required;
- rows without workspace scope and SQLite foreign-key violations must remain zero;
- local `remoteAccessEligible` must remain false.

HTTP resource bounds are now explicit runtime configuration:

```text
max header size       16 KiB
max header count      100
headers timeout       10 s
request timeout       30 s
keep-alive timeout     5 s
max requests/socket   100
max JSON body          1,000,000 bytes
```

Real protocol acceptance proves an oversized raw header is rejected by Node with `431`, while oversized financing JSON is rejected with `413 REQUEST_TOO_LARGE` before persistence.

Workspace stale-write protection is now part of the same accepted baseline:

- all 23 financing business tables are tracked;
- 69 database revision triggers cover INSERT/UPDATE/DELETE;
- browser writes require `x-bossai-workspace-revision`;
- missing revision → `428 WORKSPACE_REVISION_REQUIRED`;
- old revision → `409 STALE_WORKSPACE_STATE`;
- two simultaneous browser saves using one revision serialize so exactly one succeeds;
- database-level changes advance revision independently of a particular HTTP handler;
- Restore advances revision so pre-restore tabs cannot overwrite recovered state;
- verified-external identity/tenant authorization runs before revision details are disclosed;
- if any revision trigger is missing, financing writes fail closed with `503 WORKSPACE_REVISION_GUARD_UNAVAILABLE`.

The browser can refresh current workspace state while retaining unsaved drafts. Native/CLI JSON clients without browser-origin signals remain compatible with the local integration boundary.

Grants.gov owner-search execution is now bounded end-to-end:

```text
per official request timeout = 12 s
whole owner search budget     = 20 s
max detail concurrency        = 4
max search rows               = 10
```

Detail hydration no longer serially multiplies the per-request timeout. Results preserve official search ordering. When the source fails or the overall budget expires, remaining detail work is aborted and the existing `SOURCE_UNAVAILABLE` recovery path is used; there is no automatic retry storm and previously saved owner decisions are not overwritten.

Latest v0.15.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 75/75 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- startup Route Manifest duplicate/public/overlap failure injection — PASS
- startup tenant table/guard/reference/FK regression failure injection — PASS
- HTTP Server resource configuration — PASS
- oversized raw HTTP header → `431` — PASS
- oversized financing JSON → `413`, no persistence — PASS
- Grants.gov bounded-concurrency hydration, stable ordering — PASS
- Grants.gov total execution budget abort — PASS
- official source refresh still preserves owner decision and source provenance — PASS
- browser stale workspace revision rejection — PASS
- missing browser workspace revision rejection — PASS
- concurrent same-revision mutation serialization — PASS
- Restore invalidates stale pre-restore browser state — PASS
- verified-external auth/tenant decision precedes revision disclosure — PASS
- missing database revision trigger blocks financing writes — PASS
- database-driven revision advancement — PASS
- built review readiness: 45 routes / 1 public, 23 tenant tables, 23 workspace guards, 29 reference guards, 0 FK violations, 69/69 revision triggers — PASS
- built HTTP resource projection: 16 KiB headers, 100 headers, 10 s headers, 30 s request, 5 s keep-alive, 100 requests/socket, 1,000,000-byte JSON — PASS
- built Grants.gov execution limits: 12 s request / 20 s overall / 4 detail concurrency — PASS
- built missing-trigger write: `503 WORKSPACE_REVISION_GUARD_UNAVAILABLE`, Company Profile remains null — PASS
- built security review remains `status=not-approved`, `remoteAccessDecision=blocked` — PASS

Continuity schema remains `4`; this batch changes runtime/request/source/concurrency integrity and does not change the financing export/restore data contract.

## Implemented Security Evidence Lifecycle — v0.16.0

BossAI Funding local authorization evidence now has an explicit bounded lifecycle instead of unlimited SQLite growth.

Retention contract:

```text
maximum security decision events/workspace = 5,000
pruning order                              = oldest first, same workspace only
subject                                    = 256 chars max
tenant ID                                  = 256 chars max
issuer                                     = 512 chars max
HTTP method                                = 16 chars max
pathname                                   = 2,048 chars max
reason                                     = 2,048 chars max
adapter key                                = 128 chars max
```

The retention ceiling is enforced both when `SecurityDecisionRepository` is constructed and after every new decision. Therefore a historical database already over the limit is normalized immediately on startup/repository reconstruction rather than waiting for another security event.

Tenant/evidence rules remain intact:

- pruning Workspace A cannot delete Workspace B evidence;
- financing Restore still cannot erase security decision history;
- native SQLite backup still keeps active-workspace evidence and prunes other workspace evidence;
- v0.12 security-event schema migration compatibility remains green;
- long-term enterprise/compliance audit remains outside BossAI Funding and must use the approved BossAI-wide audit/logging authority.

`GET /api/security/review-readiness` now exposes:

```text
securityDecisionEvidence.retention.ready
securityDecisionEvidence.retention.currentEventCount
securityDecisionEvidence.retention.maxEventsPerWorkspace
securityDecisionEvidence.retention.withinRetentionLimit
securityDecisionEvidence.retention.pruningMode
securityDecisionEvidence.retention.ownerRestorePreservesEvidence
```

Latest v0.16.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 77/77 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- startup pruning of an over-limit active workspace — PASS
- ongoing oldest-first per-workspace retention — PASS
- another workspace survives active-workspace pruning — PASS
- security decision text-field bounds — PASS
- v0.12 security decision migration regression — PASS
- tenant-isolated backup/restore regression — PASS
- Security Review retention projection — PASS
- built dist overflow: 5,001 active-workspace events → 5,000 after repository reconstruction — PASS
- built dist other workspace remains at 1 event — PASS
- built review projection: `currentEventCount=5000`, `maxEventsPerWorkspace=5000`, `withinRetentionLimit=true`, `pruningMode=oldest-first-per-workspace` — PASS

Continuity schema remains `4`; security-decision retention is outside the owner-restorable financing snapshot contract.

## Implemented Owner-Visible Official-Source Recovery — v0.17.0

Grants.gov source failure is now a recoverable owner workflow instead of a generic dead-end toast.

Owner-visible behavior:

- while an owner-triggered official search is running, the source card shows `Checking Grants.gov…` and the submit button is temporarily disabled to reduce accidental duplicate requests;
- on success, the card shows imported/refreshed/skipped counts and explicitly states that saved pursuit decisions were preserved;
- on `SOURCE_UNAVAILABLE`, the card shows `Grants.gov is temporarily unavailable` and tells the owner that saved opportunities and pursuit decisions were not changed;
- the keyword/results controls remain intact so the owner does not have to reconstruct the search;
- a visible `Try again` button manually resubmits the same owner-initiated query;
- there is no automatic/background retry loop;
- the owner can continue working with already-saved financing opportunities while the external source is unavailable.

The HTTP failure contract is also safer and more useful:

```text
status   = 502
code     = SOURCE_UNAVAILABLE
error    = stable owner-facing source/budget message
recovery = keep working with saved opportunities and retry later
```

Raw network/socket/upstream exception details are no longer returned as the owner-facing API error.

Business-state preservation is machine-tested:

- save an official Grant opportunity decision;
- simulate upstream source outage;
- failed refresh returns `502 SOURCE_UNAVAILABLE`;
- saved opportunity/decision remains unchanged;
- failed source refresh does not advance financing `workspaceRevision`;
- restore source availability;
- later successful refresh updates official source facts while preserving the owner's saved decision.

`OWNER_ACCEPTANCE.md` now includes a real target-device network-outage drill: after saving an opportunity, the tester disconnects the network, verifies the inline recovery state without developer guidance, reconnects, and uses `Try again`. This strengthens the future human acceptance gate but does **not** count as completed human evidence.

Latest v0.17.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 77/77 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- bounded Grants.gov adapter regressions — PASS
- official-source outage HTTP journey — PASS
- failed refresh preserves saved owner decision — PASS
- failed refresh leaves workspace revision unchanged — PASS
- successful post-outage refresh preserves decision while updating source facts — PASS
- raw upstream exception is absent from owner-facing API response — PASS
- built UI contains inline Grants.gov status region — PASS
- built UI contains visible `Try again` recovery action — PASS
- built UI contains recoverable unavailable message and manual resubmit path — PASS
- built source failure: `502 SOURCE_UNAVAILABLE` with stable recovery language — PASS
- built source failure raw transport detail leakage — NOT PRESENT
- built failed source refresh financing revision unchanged — PASS

No new persistence table was added for source availability because external availability is transient operational state, not financing business truth.

## Implemented Exact Today's Focus Navigation + Resume — v0.18.0

Today's Focus now identifies the exact financing record that generated the owner priority instead of only naming a broad product section.

Concrete focus candidates expose:

```text
entityType + entityId
```

for:

- Funding Action;
- Funding Opportunity;
- Investor;
- Investor Follow-up;
- Financing Meeting;
- Funding Application;
- Due Diligence Request.

Setup/general guidance deliberately returns `entityType=null` and `entityId=null`; the fields are always present and no fabricated target is created.

Owner-visible navigation behavior:

- when a concrete entity exists, the top action label is `Open this item`;
- the UI resolves the stable entity anchor before falling back to the section destination;
- the exact financing card scrolls into view and receives a temporary visible highlight;
- setup/general focus keeps the broader `Do this now` section behavior;
- navigation updates a non-business URL hash;
- after reload, bootstrap renders financing state first and then restores a valid hashed target;
- if the hashed financing item no longer exists, the stale hash is cleared instead of pretending the old item remains actionable;
- Owner Journey cards and section navigation reuse the same resumable navigation path.

Stable focus anchor families:

```text
funding-action-<id>
opportunity-<id>
investor-<id>
investor-follow-up-<id>
financing-meeting-<id>
funding-application-<id>
due-diligence-<id>
```

The URL hash is UI/navigation state only. No financing business table, browser business database, or new persistence authority was introduced.

`OWNER_ACCEPTANCE.md` now requires a real owner/tester to prove exact-item navigation, reload resume, and stale-target clearing without developer guidance. Automated coverage remains prerequisite evidence only.

Latest v0.18.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 80/80 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- Funding Action focus entity reference — PASS
- Funding Opportunity focus entity reference — PASS
- Investor Follow-up focus entity reference — PASS
- Financing Meeting focus entity reference — PASS
- Funding Application focus entity reference — PASS
- Due Diligence focus entity reference — PASS
- setup focus returns explicit `entityType=null` / `entityId=null` — PASS
- exact-item UI anchor contract across all seven entity families — PASS
- focus button exact target before section fallback — PASS
- resumable URL hash contract — PASS
- stale hash clearing contract — PASS
- built UI contains `Open this item`, anchor generation and resume code — PASS
- built HTTP action focus returned `entityType=funding-action`, matching `entityId=1` and anchor `funding-action-1` — PASS

Continuity schema remains `4`; this batch changes owner navigation projection/UI only and does not change financing backup/export/restore structure.

## Implemented Owner Next-Action Context + Term Sheet Focus — v0.19.0

Today's Focus now answers not only **what** the owner should work on and **where** it lives, but also the immediate execution context for a concrete financing record:

```text
Status
Owner
When
```

The projection fields are:

```text
workStatus
workOwner
workDueAt
```

They come only from the selected persisted financing record. Missing facts remain `null`; the browser renders them as `Not recorded` instead of guessing an owner, date, or status.

Mapped context:

- Funding Action → stage / owner / deadline;
- Funding Opportunity → owner decision / no inferred owner / deadline;
- Investor → pipeline stage / owner / next follow-up date;
- Investor Follow-up → pending/completed state / owner / due date;
- Financing Meeting → meeting state / no inferred owner / meeting time;
- Funding Application → application state / owner / deadline;
- Due Diligence → diligence state / owner / deadline;
- Term Sheet → term-sheet state / no inferred owner / no invented date.

Active Term Sheets are now real high-value Today's Focus candidates:

```text
received
reviewing
negotiating
```

`accepted` Term Sheets remain a live closing focus because accepted terms are not proof that capital has closed or been received. Only `rejected` / `expired` exit Term Sheet focus. A live Term Sheet receives an exact `term-sheet-<id>` anchor and preserves the mandatory lawyer-review/closing next-step boundary.

The owner UI now shows the Status / Owner / When strip only for concrete focus records. Exact Funding Action, Investor, Investor Follow-up, Funding Application and Due Diligence cards also surface their recorded owner so the landing record agrees with the top command context.

No second task/workflow authority was introduced. These fields are deterministic projections over existing financing facts; no new business table, scheduler, generic task engine, or browser business database was added.

During the full gate, one initial parallel test run reported a process-level failure for the official-source journey while that test passed independently and on rerun. Rather than ignore the signal, Grants.gov operation lifecycle was tightened so its operation controller aborts in `finally` after both success and failure. A dedicated regression proves completed search/detail signals are closed after a successful owner query.

Latest v0.19.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 83/83 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- Funding Action Status / Owner / When projection — PASS
- Opportunity decision/deadline projection with no fabricated owner — PASS
- Follow-up Status / Owner / due-date projection — PASS
- Meeting status/time projection with no fabricated owner — PASS
- Application Status / Owner / deadline projection — PASS
- Due Diligence Status / Owner / deadline projection — PASS
- active Term Sheet becomes exact high-value focus when no nearer deadline outranks it — PASS
- Term Sheet focus retains lawyer-review next step — PASS
- exact `term-sheet-<id>` UI anchor contract — PASS
- focus context UI renders `Not recorded` for missing facts — PASS
- successful Grants.gov query closes search/detail operation signals — PASS
- official-source outage/recovery journey after lifecycle tightening — PASS
- built dist Term Sheet focus: `entityType=term-sheet`, `workStatus=reviewing`, `workOwner=null`, `workDueAt=null`, `destination=execution` — PASS
- built UI contains Status / Owner / When context and recorded-owner labels — PASS

Continuity schema remains `4`; v0.19 changes deterministic dashboard/execution projection and UI context only.

## Implemented Capital Blockers / Why Capital Hasn't Arrived — v0.20.0

The CEO Capital Command Center now answers the fourth core owner question directly:

```text
Why has the capital not arrived yet?
```

`src/domain/blockers.ts` projects up to five deterministic blockers from recorded financing facts. It is not a persisted task list and does not create another workflow authority.

Severity order:

```text
critical
> high
> normal
```

Current blocker classes:

- missing company facts or funding target;
- overdue Funding Action;
- overdue Funding Application;
- overdue Investor Follow-up;
- overdue Due Diligence request;
- active received/reviewing/negotiating/accepted Term Sheet whose close is not recorded;
- committed capital that has not yet been received;
- funding target with no Grant/Debt/Equity source being worked;
- discovered source without an explicit pursue decision;
- chosen financing target without a concrete execution record;
- submitted/under-review application waiting on an external decision;
- high-value investor relationship with no dated next move.

Each blocker exposes:

```text
severity
reason
nextStep
track
entityType + entityId (when exact)
destination
```

Exact blockers reuse the existing resumable item navigation. General blockers fall back to the correct owner section. Once the recorded funding target is fully covered, the blocker projection returns an empty list instead of manufacturing additional work.

The owner UI now includes:

```text
WHY CAPITAL HASN'T ARRIVED
What is actually blocking the money
```

The list is owner-actionable: selecting a blocker opens the exact financing item when one exists. A zero-blocker state is explicit rather than blank.

`OWNER_ACCEPTANCE.md` now requires an unassisted owner to answer why capital has not arrived, confirm the explanation matches recorded facts, and open the highest blocker without developer interpretation. This expands the future human acceptance gate but does not count as completed real-user evidence.

Latest v0.20.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 93/93 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- empty financing pipeline → `no-capital-source` blocker — PASS
- selected Opportunity without execution → exact `decision-without-execution` blocker — PASS
- overdue Application outranks active Term Sheet and is `critical` — PASS
- active Term Sheet explains unclosed Equity capital and points to exact Term Sheet — PASS
- committed-but-unreceived capital blocker — PASS
- fully covered target produces no invented blocker — PASS
- real HTTP Company + Goal with no sources returns `no-capital-source` — PASS
- real HTTP reviewing Term Sheet returns `active-term-sheet-<id>` exact blocker — PASS
- blocker UI section/zero state contract — PASS
- blocker navigation exact entity before section fallback — PASS
- built dist empty-pipeline blocker: `no-capital-source`, destination `opportunities` — PASS
- built dist Term Sheet blocker: `active-term-sheet-1`, `entityType=term-sheet`, `entityId=1`, destination `execution` — PASS
- built UI contains `WHY CAPITAL HASN'T ARRIVED`, blocker count/list, and exact-item navigation — PASS

No new persistence table, scheduler, generic task engine, workflow authority, AI runtime, or browser business database was introduced. Continuity schema remains `4`.

## Implemented Capital Pipeline Truth / De-duplicated In-Motion Capital — v0.21.0

The dashboard `In motion` number and all three capital-track potential amounts now come from one deterministic counting projection:

```text
src/domain/pipeline.ts
projectCapitalPipelineTruth(...)
```

The objective is to prevent a single financing path from appearing multiple times merely because it has advanced through several recorded stages.

Known counting rules:

- Grant/Debt Application replaces its linked Opportunity;
- approved Application amount replaces requested amount when a real approved amount is recorded;
- Funding Action is a fallback for a track only when no more-specific Application/Opportunity evidence exists;
- active Term Sheet replaces the same Investor's cheque-range estimate;
- other Investors without a Term Sheet remain independent pipeline evidence;
- multiple active Term Sheets for one Investor use only the latest record;
- multiple Equity Applications resolving through Opportunities to one Investor collapse to the most recent application evidence;
- pursuing Investor Opportunity linked to an already-counted Investor is not added again;
- pending Investor risk/next step uses the earliest pending follow-up date;
- funded/rejected/withdrawn Applications and rejected/expired Term Sheets do not count as in-motion capital.

Each capital track now exposes:

```text
evidenceKinds
pipelineExplanation
```

The dashboard displays the basis directly on the Grant/Debt/Equity cards and states:

```text
In motion uses the most-specific recorded pipeline evidence.
Linked stages are not stacked twice.
```

The Owner/Board Summary uses the same numbers and includes both `Pipeline basis` and `Counting method`, so exported governance material does not silently use a different capital definition.

Term Sheet closing semantics were also corrected while aligning this truth layer: `accepted` terms are still in-motion/closing work. Accepted terms do **not** prove committed or received capital. `accepted` can remain Today's Focus and a Capital Blocker until real closing/outcome evidence exists; only `rejected` / `expired` leave the Term Sheet execution path automatically.

Latest v0.21.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 103/103 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- Phase 1 Funding Action fallback retains $1,000,000 in-motion capital — PASS
- linked Grant Application suppresses its Opportunity and same-track Funding Action fallback — PASS
- approved Application amount replaces requested amount — PASS
- Term Sheet replaces only its own Investor while other Investors remain counted — PASS
- multiple active Term Sheets for one Investor count only the latest — PASS
- multiple Equity Applications resolving to one Investor do not double count — PASS
- earliest pending Investor follow-up drives risk/next step — PASS
- Investor-stage HTTP track exposes `investor` evidence — PASS
- Term Sheet HTTP track exposes `term-sheet` evidence and no Investor stacking — PASS
- Grant Application + Equity Term Sheet HTTP total uses the unified pipeline truth — PASS
- active/accepted Term Sheet remains a closing focus/blocker rather than implying funds received — PASS
- dashboard track cards expose evidence basis/counting explanation — PASS
- Owner/Board Summary exposes capital blocker + pipeline basis/counting method — PASS
- built dist mixed pipeline: Grant $250,000 from Application only; Equity $1,300,000 from $500,000 accepted Term Sheet + independent $800,000 Investor; total In motion $1,550,000 — PASS
- built dist accepted Term Sheet blocker explicitly says closed/received capital is not recorded — PASS
- built UI contains the no-double-count pipeline note and evidence basis — PASS

The method is deliberately conservative where the schema has no link. BossAI Funding does not assume an unlinked Funding Action is additional money merely to increase the pipeline number. No probability weighting or invented close likelihood was added.

No financing persistence schema changed; Continuity schema remains `4`.

## Implemented Capital Coverage & Deterministic Closing Plan — v0.22.0

The CEO Capital Command Center now distinguishes how much of the funding target is actually covered at three different truth levels instead of compressing everything into one pipeline number.

New deterministic projection:

```text
src/domain/closing.ts
projectCapitalCoveragePlan(...)
```

Coverage truth:

```text
Cash received
Received + committed
Recorded reach including current de-duplicated In motion
Still uncovered after current pipeline
Cash still to arrive against target
```

Coverage states:

```text
no-target
cash-covered
secured
pipeline-covered
pipeline-shortfall
```

The distinctions are intentional:

- `cash-covered` requires actual recorded cash received to cover the target;
- `secured` means received + committed covers the target, while committed capital may still need to become cash;
- `pipeline-covered` means the recorded de-duplicated pipeline is large enough on paper to cover the remaining target, but BossAI Funding does not assume it closes;
- `pipeline-shortfall` exposes a residual amount even if every current In motion item closed at its recorded amount.

The dashboard now includes `CAPITAL COVERAGE & CLOSING PLAN` and `CLOSEST TO CASH`.

`Closest to cash` is not a success-probability model. It orders recorded work only by deterministic financing stage and recency:

- recorded committed-but-not-received capital first;
- accepted / negotiating / reviewing / received Term Sheet stages;
- approved / under-review / submitted / preparing Applications;
- later-to-earlier Investor pipeline stages;
- pursued Opportunities and generic Funding Action fallback afterward.

Every concrete closing item includes:

```text
recorded amount
recorded stage
why this stage is nearer to closing
remaining deterministic workflow / closing steps
existing entityType + entityId navigation
```

Missing exact record linkage is not fabricated. Aggregate committed capital may combine multiple persisted sources, so it falls back to `Execute & close` rather than inventing an entity target.

The mandatory owner disclaimer is:

```text
In-motion capital is not a probability-weighted forecast, commitment, or guarantee.
```

### Outcome-to-pipeline migration hardening

v0.22 also closes an additional double-counting edge discovered while building coverage:

- a Funding Outcome removes its linked Application from In motion;
- a Funding Outcome linked to an Investor removes that Investor / Term Sheet path from In motion;
- a linked Opportunity behind a resolved Application is also suppressed;
- once any Outcome exists on a capital track and no specific active pipeline evidence remains, generic unlinked Funding Actions are not reused as amount fallback. A new specific Opportunity/Application/Investor/Term record is required before new pipeline capital is counted.

This conservative rule is necessary because Funding Action currently has no business foreign key proving it is a distinct source from an already-resolved financing path.

Machine invariant now proves a financing path can move from pipeline to received/committed without changing total recorded reach or being counted twice:

```text
Before Funding Outcome:
Received                 $0
Committed                $0
In motion                $800,000
Recorded reach           80%

After linked Grant Outcome:
Received                 $100,000
Committed-not-received   $200,000
In motion                $500,000
Recorded reach           80%
```

The old $300,000 Grant Application leaves In motion after its Outcome is recorded.

### Owner / board handoff

Owner / Board Summary now exports the same dashboard truth:

- cash received coverage;
- received + committed coverage;
- recorded reach including In motion;
- cash still to arrive;
- uncovered amount after current pipeline;
- coverage state and explanation;
- explicit non-probability disclaimer;
- up to three Closest to cash items and remaining closing steps.

`OWNER_ACCEPTANCE.md` now requires a real unassisted owner to distinguish the three coverage levels, explain the residual gap, understand that Closest to cash is not success probability, open the exact closing item, and confirm Funding Outcome removes the resolved path from In motion.

Latest v0.22.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 117/117 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- cash received / received+committed / recorded-reach separation — PASS
- `cash-covered` versus `secured` semantics — PASS
- pipeline-covered state does not claim guaranteed close — PASS
- pipeline-shortfall exposes residual amount — PASS
- recorded commitment ranks ahead of unresolved pipeline closing items — PASS
- accepted Term Sheet ranks ahead of approved Application by deterministic stage only — PASS
- missing funding target returns zero coverage percentages without fabrication — PASS
- exact Closest-to-cash navigation contract — PASS
- Funding Outcome removes linked Application/Investor pipeline evidence — PASS
- resolved track suppresses generic Funding Action fallback unless new specific evidence exists — PASS
- pipeline → received/committed migration preserves recorded reach without double counting — PASS
- real Phase 4 HTTP: $1,000,000 target + $800,000 de-duplicated pipeline = 80% recorded reach / $200,000 uncovered — PASS
- built dist before Outcome: `In motion=$800,000`, `recordedPct=80`, `uncovered=$200,000` — PASS
- built dist after linked Grant Outcome: `received=$100,000`, `committed=$200,000`, `In motion=$500,000`, `recordedPct=80`, `uncovered=$200,000` — PASS
- built dist Closest to cash after Outcome starts with `recorded-commitment`, then exact Term Sheet — PASS
- built Owner/Board Summary contains coverage section, Closest to cash, and probability disclaimer — PASS
- built UI contains `CAPITAL COVERAGE & CLOSING PLAN`, `CLOSEST TO CASH`, recorded-reach metric, disclaimer, and exact closing navigation — PASS

No persistence table, migration, Agent runtime, scheduler, workflow engine, probability model, or new runtime dependency was added. Continuity schema remains `4`.

## Implemented Funding Outcome Resolution Consistency — v0.23.0

Funding Outcome is now the shared current-state authority for explicitly linked financing paths across the CEO Capital Command Center, rather than only affecting received/committed accounting.

New shared projection:

```text
src/domain/resolution.ts
projectFundingOutcomeResolution(...)
```

It deterministically derives:

```text
resolved Application IDs
resolved Opportunity IDs through Application → Opportunity
resolved Investor IDs
latest Outcome per Application
latest Outcome per Investor
```

The same resolution truth now drives:

- de-duplicated In motion pipeline;
- Today's Focus;
- WHY CAPITAL HASN'T ARRIVED blockers;
- Equity Pipeline Summary;
- Owner / Board Summary.

### Current versus historical execution

When an Outcome is linked to an Application, that Application and its linked Opportunity stop competing as current Focus / blockers / pipeline evidence.

When an Outcome is linked to an Investor, that Investor's current execution path is resolved:

- Investor no longer counts as active pipeline capital;
- pending follow-ups no longer count as current pending work;
- scheduled meetings no longer drive current next-meeting state;
- open DD no longer drives current Focus/blocker state;
- active Term Sheets no longer drive current Focus/blocker state;
- unrelated Investor/Term Sheet paths remain fully active.

The source records are deliberately retained. Application, Investor, Meeting, DD, and Term Sheet history remains visible for evidence and comparison; the product does not silently delete or rewrite prior financing stages.

Core historical cards now show:

```text
Resolved by Funding Outcome · <status>
<received> received · <committed total> committed total
Funding Outcome is the current financing state.
This record remains as historical execution evidence.
```

Historical Application/Investor next-step text is labeled `Historical next`, and resolved execution cards stop showing their old current-work mutation controls.

Equity Pipeline Summary now separates:

```text
Active investors
Resolved outcomes
```

Resolved Investor paths are excluded from active potential, pending follow-up count, next meeting and current stage counts.

### Outcome correction / recovery

The existing `PATCH /api/outcomes/:id` route is now exposed in the default owner UI. The owner can correct:

- status;
- linked Application;
- linked Investor;
- linked Round;
- committed total;
- received amount;
- received date.

Clearing an incorrect Outcome link immediately reprojects the still-open historical record back into active pipeline / Focus / blocker state without database repair or recreating the record.

Outcome accounting correction now fails closed when:

- received exceeds committed total;
- committed exceeds a recorded non-zero approved amount;
- positive received capital has no received date;
- lost/withdrawn financing retains committed or received money.

Rejected correction leaves the prior persisted Outcome and all derived state unchanged.

### Owner / Board consistency

Owner / Board Summary now uses the same resolution projection for:

- active Applications;
- active Investors;
- open DD;
- top current Opportunities;
- resolved Application links;
- resolved Investor links.

This prevents the dashboard from saying a deal is resolved while the handoff document still counts it as active.

`OWNER_ACCEPTANCE.md` now requires a real unassisted owner to recognize resolved historical cards, verify resolved work leaves current Focus/blockers/Equity summary, correct or unlink an Outcome from the UI, observe automatic reactivation of the still-open record, and verify invalid money corrections are rejected without state drift.

Latest v0.23.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 132/132 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- shared Outcome resolution projection + latest correction selection — PASS
- resolved Application + linked Opportunity suppressed from current Focus/blocker/pipeline — PASS
- resolved Investor suppresses Investor/Follow-up/Meeting/DD/Term current execution — PASS
- unrelated unresolved Investor/Term Sheet remains eligible under normal priority rules — PASS
- Equity summary excludes resolved Investor from active/potential/pending/meeting/stage counts and reports resolved count — PASS
- historical Application/Investor/Term Sheet records remain persisted — PASS
- browser resolved-history label and Outcome authority message — PASS
- resolved current-work controls replaced with historical Outcome context — PASS
- Outcome correction UI exposes status + Application/Investor/Round links + committed/received/date — PASS
- invalid Outcome correction returns `400 VALIDATION_ERROR` and preserves existing state — PASS
- Outcome unlink correction reactivates still-open Application/Investor without database repair — PASS
- Owner/Board Summary uses current/resolved Outcome projection — PASS
- built dist before Investor Outcome: `active=1`, `resolved=0`, exact Term Sheet Focus/blocker present — PASS
- built dist after closed Investor Outcome: `active=0`, `resolved=1`, `potential=0`, Term Sheet preserved, no Term Sheet Focus/blocker — PASS
- built dist invalid `closed → lost` correction with money: `400`, field `committedAmountCents`, prior closed state retained — PASS
- built dist unlink correction: `active=1`, `resolved=0`, Investor potential restored, Term Sheet blocker restored — PASS
- built Board Summary after unlink: `Active investors: 1`, `Resolved investor links: 0` — PASS
- built UI contains `Resolved by Funding Outcome`, `current financing state`, Outcome link correction controls and `Save correction` — PASS

No persistence schema, migration, new account authority, Agent runtime, workflow engine, or third-party runtime dependency was added. Continuity schema remains `4`.

## Implemented Capital Timing & Deadline Discipline — v0.24.0

The owner dashboard now adds one deterministic time projection:

```text
src/domain/timing.ts
projectCapitalTimingPlan(...)
```

It answers when capital is needed, what the saved runway input implies as a calendar estimate, what financing work is overdue or near-term, and which active high-value items still have no date. It does **not** predict a financing close date or fundraising success probability.

### Timing facts

The projection uses only existing recorded facts:

- Funding Goal `needByDate`, with Company Profile target-funding date as fallback;
- saved Company Profile `runwayMonths` and profile update timestamp;
- Funding Action deadlines;
- pursued Opportunity deadlines;
- pending Investor Follow-ups and Investor next-follow-up dates;
- scheduled Financing Meetings;
- active Funding Application deadlines;
- open Due Diligence deadlines;
- active Fundraising Round target-close dates.

The runway calendar estimate is labeled with the profile save time and carries an explicit disclaimer: converting saved `runwayMonths` into a date is not a live cash-flow model and does not forecast financing close dates or funding success.

Timing states are:

```text
no-target-date
cash-covered
past-need-date
runway-before-need
near-term
dated
```

A missing need-by date is not treated as healthy. `runway-before-need` means the saved runway estimate date falls before the recorded need-by date and therefore requires the owner to recheck cash/runway inputs and financing timing. `near-term` means the need-by date is within 30 days; it is not a promise that any financing will close by then.

### Deadline discipline

The dashboard now exposes:

```text
Need by
Runway estimate + profile-save timestamp
Overdue milestones
Due next 14 days
Active items missing a date
```

It also displays up to eight next/overdue milestones and up to eight undated active items. Exact financing records reuse the existing `entityType + entityId` navigation and open the concrete Action / Opportunity / Investor / Follow-up / Meeting / Application / DD / Term Sheet record where applicable.

Undated active work can include:

- active Funding Actions without a deadline;
- pursued Opportunities without a deadline;
- active Applications without a deadline/decision checkpoint;
- open DD without a deadline;
- active Term Sheets with no dated Investor follow-up/closing move;
- high-value Investor relationships without a dated next move;
- active Fundraising Rounds without a target close date.

### Outcome consistency

The timing projection uses the shared Funding Outcome Resolution truth. Once an Outcome resolves a linked Application or Investor, old resolved Application/Opportunity/Investor/Follow-up/Meeting/DD/Term-Sheet work leaves the **current** timing plan while historical records remain persisted elsewhere.

### Owner / Board handoff

Owner / Board Summary now includes the same:

- timing status;
- need-by date;
- runway estimate date and source timestamp;
- overdue count;
- next-14-days count;
- undated-item count;
- next dated milestones;
- active items missing a date;
- no-forecast disclaimer.

`OWNER_ACCEPTANCE.md` now requires a real unassisted owner to identify these time facts, understand the runway estimate boundary, open exact milestone/undated records, and verify Outcome-resolved work leaves the active time plan.

Latest v0.24.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 143/143 tests
- `npm run build` — PASS
- missing need-by date → `no-target-date` rather than healthy default — PASS
- saved runway estimate before need-by date → `runway-before-need` — PASS
- near-term versus longer dated need state — PASS
- overdue milestone count and next-14-days count — PASS
- active Application / Term Sheet / Round missing-date projection — PASS
- Outcome-resolved Application/Investor timing work removed while unrelated work remains — PASS
- cash-covered target does not present unresolved timing risk — PASS
- exact milestone and undated-item navigation contract — PASS
- Owner / Board Summary timing parity — PASS
- real HTTP: one-month runway + 60-day need-by → `runway-before-need` — PASS
- real HTTP: seven-day Application appears in due-next-14-days — PASS
- real HTTP: accepted Term Sheet with no dated Investor move appears under missing-date — PASS
- real HTTP Outcome removes resolved Application milestone and Term Sheet undated item — PASS
- built dist before Outcome: `status=runway-before-need`, `due14=1`, exact Term Sheet undated item — PASS
- built dist after Outcomes: old Application milestone and Term Sheet undated item absent — PASS
- built Owner/Board Summary contains Capital timing and Runway estimate sections — PASS
- built UI contains `CAPITAL TIMING & DEADLINE DISCIPLINE`, metrics, milestones, missing-date list and no-forecast disclaimer — PASS

No persistence schema, scheduler, generic workflow engine, forecasting model, Agent runtime, or new runtime dependency was added. Continuity schema remains `4`.

## Implemented Capital Strategy Input Synchronization / Decision Freshness — v0.25.0

Capital Strategy is no longer considered current merely because a stored strategy record exists.

New deterministic freshness projection:

```text
src/domain/strategy-freshness.ts
projectCapitalStrategyFreshness(...)
```

Freshness states:

```text
not-created
no-goal
current
recalculate
```

The projection recalculates the deterministic strategy in memory from current Company Profile, Funding Goal, constraints and current time, then compares semantic strategy output only:

- total need;
- allocations;
- unfunded residual;
- assumptions;
- warnings.

Record identity and generated timestamp are intentionally excluded from semantic equality.

### Automatic synchronization

Opportunity Matches already had an existing refresh path after Company Profile, Funding Goal, Opportunity, and Grants.gov source changes. This batch did not create a duplicate stale-match system.

When a Capital Strategy already exists:

- Company Profile update refreshes Opportunity Matches and synchronizes the stored Capital Strategy if semantic strategy output changed;
- Funding Goal update does the same;
- each actual strategy synchronization leaves a separate Funding Activity record.

No first strategy is silently created. The owner still explicitly starts Capital Strategy with the existing Recalculate action.

### Read-only stale detection

Bootstrap independently projects freshness on every read. This catches:

- old databases;
- abnormal/directly modified strategy records;
- rule changes caused by current time, including crossing the existing `<60 days` need-by threshold.

A read detecting `recalculate` does not mutate the stored strategy. The browser marks the allocations `OUT OF DATE`, reduces their visual authority, and states that they must be recalculated before use as a current decision input.

### Owner Journey / handoff consistency

`Capital plan` is complete only when:

```text
Company Profile exists
Funding Goal exists
Strategy exists
strategyFreshness = current
```

A stale strategy reopens `Capital plan` in `YOUR FUNDING PATH`.

Owner / Board Summary now exports:

- strategy freshness state;
- generated timestamp;
- current funding need;
- automatic synchronization eligibility;
- freshness reason.

`OWNER_ACCEPTANCE.md` now requires a real owner to identify strategy freshness, observe automatic synchronization after current facts change, and recognize that stale historical allocations are not current decisions.

Latest v0.25.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 155/155 tests
- `npm run build` — PASS
- no strategy → `not-created` — PASS
- freshly calculated strategy → `current` — PASS
- changed target / dilution / debt constraint → stale detection — PASS
- Company Profile innovation-signal change → stale detection — PASS
- passage of time across `<60 day` strategy rule → stale detection without data mutation — PASS
- stored strategy without current Funding Goal → `no-goal` — PASS
- real HTTP Funding Goal update auto-synchronizes existing strategy and records activity — PASS
- real HTTP Company Profile update auto-synchronizes existing strategy and records activity — PASS
- Owner Journey reopens Capital plan when strategy is stale — PASS
- browser freshness state / generated time / current need contract — PASS
- browser stale allocations visibly downgraded with `OUT OF DATE` warning — PASS
- manual Recalculate remains available — PASS
- Owner / Board Summary freshness parity — PASS
- built dist first strategy state: `not-created` — PASS
- built dist manual calculation: `current`, $1,000,000 need, $200,000 Grant allocation — PASS
- built dist goal synchronization: `current`, $1,500,000 need, Equity excluded under changed owner constraint, sync event present — PASS
- built dist Company Profile synchronization: Grant allocation changed to $150,000, sync event present — PASS
- built dist direct stale strategy read: `recalculate`, current need remains $1,500,000, stored erroneous total remains `$0.01`, proving GET did not rewrite — PASS
- built dist stale strategy reopens Owner Journey `capital-plan` — PASS
- built Board Summary contains `Capital strategy freshness` / `recalculate` — PASS
- built UI contains freshness panel and stale visual treatment — PASS

No persistence schema, AI/Agent runtime, generic decision engine, cache framework, or new runtime dependency was added. Continuity schema remains `4`.

## Implemented Opportunity Deadline Viability / Source-Fact Authority — v0.26.0

Funding Opportunities now have a current-time deadline viability projection independent from stored match history:

```text
src/domain/opportunity-viability.ts
projectOpportunityDeadlineViability(...)
```

States:

```text
undated
open
due-soon
deadline-passed
```

### Capital truth

A `deadline-passed` Opportunity remains persisted and may remain `saved` / `pursuing` as a recovery relationship, but the Opportunity amount is excluded from current `In motion` and Coverage unless a more-specific active Application already exists.

This distinction is deliberate:

- expired Opportunity with no Application → not current pipeline capital;
- active Application linked to an expired Opportunity → Application remains current pipeline evidence because the financing path already advanced beyond opportunity discovery.

Past-deadline pursuing Opportunities become urgent recovery Focus candidates and critical Capital Blockers with explicit extension/new-cycle/source-refresh/dismiss guidance. The old misleading `due in 0 days` representation is no longer used for an already-passed opportunity.

An expired-only Opportunity no longer satisfies current Owner Journey `Find money` / `Choose what to pursue`, while Capital Timing continues to show the missed date as an overdue milestone.

### Owner UI

Past-deadline Opportunity cards:

- show `DEADLINE PASSED`;
- suppress historical match score/fit as current authority;
- state that the amount is excluded from `In motion`;
- show a recovery instruction;
- disable `Pursue` until current source timing exists.

Manual-source Opportunities expose `Correct manual-source deadline`. Saving a corrected future deadline recalculates the Opportunity and restores current viability/pipeline counting.

Official-public source cards do not expose manual source-fact correction. They instruct the owner to inspect/refresh the official source instead.

### Source-fact authority

The normal Opportunity PATCH route now enforces authoritative source boundaries.

For `official-public` / future `licensed` source records, source-managed facts are read-only through that route. Protected fields include source/type/title/provider/description/geography/sectors/stages/amounts/deadline and type-specific financing terms.

Owner-controlled fields remain mutable:

- `decision` (`new/saved/pursuing/dismissed`);
- internal Investor/Fund linkage.

Attempting to edit protected source facts returns:

```text
HTTP 409
SOURCE_FACTS_READ_ONLY
field=<changed source field>
```

The rejection does not update the Opportunity and does not advance workspace revision. Official/licensed source facts must be changed by their admitted source refresh/import path.

`DATA_SOURCES.md` now records this contract.

### Reporting

Owner / Board Summary excludes past-deadline pursuits from current Top Opportunities and separately reports the count and recovery details for past-deadline pursued Opportunities.

`OWNER_ACCEPTANCE.md` now requires a real owner to verify expired opportunities leave current pipeline coverage, understand recovery, correct a manual-source deadline, and observe that official source facts cannot be manually overwritten.

Latest v0.26.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 165/165 tests
- `npm run build` — PASS
- opportunity deadline states undated/open/due-soon/deadline-passed — PASS
- expired pursued Opportunity without Application → `In motion=0` — PASS
- linked active Application survives source-deadline passage as more-specific pipeline evidence — PASS
- expired pursuing Opportunity → urgent recovery Today’s Focus — PASS
- expired pursuing Opportunity → critical Capital Blocker — PASS
- expired-only Opportunity does not satisfy current Find money / Decide steps — PASS
- manual-source deadline correction restores viability and pipeline amount — PASS
- expired card suppresses historical fit authority and displays excluded-from-In-motion state — PASS
- expired Pursue button disabled until timing is current — PASS
- official source fact PATCH → `409 SOURCE_FACTS_READ_ONLY` — PASS
- rejected official fact edit does not advance workspace revision — PASS
- owner decision update on official Opportunity remains allowed — PASS
- Owner / Board Summary deadline-recovery parity — PASS
- full Grants.gov import/outage/refresh source journey remains PASS — PASS
- built dist manual expired Opportunity: `deadline-passed`, `In motion=0`, `recordedPct=0`, exact recovery Focus/Blocker — PASS
- built dist manual corrected deadline: `open`, `In motion=$400,000`, current Find money restored — PASS
- built dist official expired Grant: `sourceKind=official-public`, `deadline=2026-08-01`, `deadline-passed`, `In motion=0` — PASS
- built dist direct official deadline edit: `409 SOURCE_FACTS_READ_ONLY`, `field=deadline`, revision/deadline unchanged — PASS
- built dist official owner decision update: HTTP 200 — PASS
- built UI contains excluded-from-In-motion, manual correction, official-source recovery, and expired-card treatment — PASS

No persistence schema, scraper, scheduler, generic workflow engine, AI/Agent runtime, or new runtime dependency was added. Continuity schema remains `4`.

## Implemented Term Sheet Closing Date Discipline — v0.27.0

The owner can now record the missing time fact between an active/accepted Term Sheet and actual Funding Outcome: a **target close date**.

### Persisted closing timing

`TermSheet` now includes:

```text
targetCloseDate: string | null
```

SQLite `term_sheet` adds nullable:

```text
target_close_date TEXT
```

The field is deliberately nullable. Historical Term Sheets migrated from v0.26 or earlier keep `targetCloseDate=null`; BossAI Funding does not infer a date from status, investor activity, or a round.

The existing Term Sheet create and PATCH routes validate and persist the date. The normal owner UI now exposes it on both the create form and each unresolved Term Sheet card, together with status correction.

Owner-facing copy explicitly states that the date is a management closing target, **not a predicted wire date or guaranteed receipt date**.

### Today’s Focus / blockers / timing

Active `received`, `reviewing`, `negotiating`, and `accepted` Term Sheets now use `targetCloseDate` as real execution timing:

- Today’s Focus `workDueAt` carries the target close date;
- deadline tiers can raise a near closing Term Sheet above lower-priority undated work;
- a passed target close date produces urgent Focus recovery language;
- the matching Term Sheet Capital Blocker becomes `critical` when the target close date passes without a Funding Outcome;
- Capital Timing projects a concrete `term-sheet-close` milestone;
- a Term Sheet with a target close date no longer appears as `Active items missing a date` merely because there is no separate investor follow-up.

Funding Outcome resolution remains authoritative. Once an Outcome resolves that Investor path, the historical Term Sheet and its close date remain persisted, while its current Focus/blocker/timing milestone disappears.

### Continuity schema 5

This is a real financing recovery-shape change, so Continuity schema advances:

```text
4 -> 5
```

Schema 5 adds only the nullable Term Sheet close-date field.

Current builds accept recovery points from:

```text
schema 4
schema 5
```

A schema 4 backup does not contain `target_close_date`; restoring it into v0.27 leaves the restored Term Sheet date `null`. New databases and old live databases both receive the column through an idempotent in-place migration.

Latest v0.27.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 170/170 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- legacy `term_sheet` schema migrates in place without deleting old rows — PASS
- migrated historical Term Sheet returns `targetCloseDate=null` — PASS
- Continuity reports schema `5` — PASS
- schema 4 recovery point accepted by current restore path — PASS
- schema 4 backup without `target_close_date` restores successfully into schema 5 — PASS
- real HTTP create Term Sheet with future close date persists exact date — PASS
- future close date projects exact `term-sheet-close` timing milestone — PASS
- Today’s Focus exposes exact Term Sheet `workDueAt` — PASS
- passed close date → Today’s Focus urgent — PASS
- passed close date → Term Sheet blocker critical — PASS
- passed close date → timing milestone overdue — PASS
- Funding Outcome removes resolved Term Sheet from current blocker/timing state while preserving historical record — PASS
- owner create form contains Target close date — PASS
- unresolved Term Sheet card exposes close-date + status correction — PASS
- UI explicitly says close date is not a predicted funding receipt date — PASS
- built dist future target close: `schema=5`, Focus `term-sheet`, urgency `soon`, exact milestone present — PASS
- built dist overdue target close: urgency `urgent`, blocker `critical`, overdue milestone present — PASS
- built UI contains `targetCloseDate`, `data-save-term-close`, and non-forecast disclaimer — PASS

No new table, Agent runtime, workflow engine, scheduler, closing-probability model, or third-party runtime dependency was added. The only persistence-shape change is nullable `term_sheet.target_close_date` plus Continuity schema 5 compatibility handling.

## Implemented Structured Closing Condition Register — v0.28.0

v0.28 closes the owner gap between “we have a target closing date” and “what exact conditions still prevent this financing from closing?”. The implementation is deliberately financing-specific and does not create a generic task/workflow authority.

### Structured closing facts

New persisted entity/table:

```text
ClosingCondition
term_sheet_closing_condition
```

Each record belongs to exactly one Term Sheet and stores:

```text
title
owner
dueDate
status = open | in-progress | satisfied | waived
evidenceNote
```

Only `open` and `in-progress` count as active closing work. `satisfied` and `waived` require a non-empty evidence note; an evidence-less clear attempt returns `400 VALIDATION_ERROR`, `field=evidenceNote`, and leaves the prior condition unchanged.

The Closing Condition Register is explicitly not a general task list. No scheduler, generic task table, workflow engine, approval authority, reminder service, Agent runtime or second execution platform was introduced.

### Owner-visible closing discipline

Active Closing Conditions now participate in the same deterministic owner projections as the rest of the financing truth:

- Today’s Focus can target the exact `closing-condition-<id>` record;
- Focus exposes the recorded owner and due date rather than inventing either;
- an overdue Closing Condition can outrank its parent accepted Term Sheet and becomes `urgent`;
- WHY CAPITAL HASN'T ARRIVED points to the exact condition and raises it to `critical` when overdue;
- dated conditions appear as `closing-condition` milestones in Capital Timing;
- active conditions without a due date appear in the missing-date list;
- owner UI allows correction of status, owner, due date and evidence;
- cleared conditions remain historical evidence instead of being deleted.

Clearing all recorded conditions does not prove legal closing, committed capital or cash receipt. Qualified counsel remains required for material legal terms and Funding Outcome remains the final financing-state authority.

Funding Outcome resolution keeps the Closing Condition history/evidence but removes resolved conditions from current Today’s Focus, Capital Blockers, Capital Timing and active Owner / Board Summary counts.

### Board / handoff parity

Owner / Board Summary now contains a `Closing condition register` section with:

```text
active conditions
overdue conditions
active conditions missing a due date
cleared conditions on current Term Sheets
current unresolved condition details
```

The summary repeats the same final-authority warning as the owner UI: clearing the register alone is not closing or cash receipt.

### Persistence / tenant / concurrency hardening

`term_sheet_closing_condition` is a new tenant-scoped financing business table with a guarded same-workspace Term Sheet reference.

Current machine truth is now:

```text
Continuity schema             6
tenant-scoped business tables 24
workspace guard tables        24
same-workspace reference guards 30
workspace revision triggers   72
Route Security Manifest       47 total / 1 public / 46 protected
```

Continuity schema advances `5 -> 6` because the financing recovery shape now includes the structured Closing Condition Register. Current builds accept schema 4, 5 and 6 recovery points. A schema 5 backup without `term_sheet_closing_condition` restores into schema 6 with an empty register; existing Term Sheet and other financing facts remain intact.

New routes are explicitly classified as protected mutations:

```text
POST  /api/closing-conditions
PATCH /api/closing-conditions/:id
```

Cross-workspace tests prove one tenant cannot create/list a Closing Condition against another workspace's Term Sheet, forged browser tenant/workspace headers cannot select another condition set, export/backup remain workspace-scoped, and the new table participates in database-driven workspace revision advancement.

Latest v0.28.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 179/179 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- evidence-less `satisfied/waived` condition rejected fail-closed — PASS
- overdue Closing Condition becomes exact urgent Today’s Focus — PASS
- overdue Closing Condition becomes exact critical Capital Blocker — PASS
- dated/undated Closing Conditions project correctly into Capital Timing — PASS
- valid evidence clears a condition and returns current focus to remaining Term Sheet closing work — PASS
- Funding Outcome preserves condition history but removes current condition Focus/Blocker/Timing — PASS
- Closing Condition Board Summary parity — PASS
- 24/24 tenant tables and workspace guards — PASS
- 30/30 declared same-workspace reference guards — PASS
- 72/72 workspace revision triggers — PASS
- Route Manifest 47 total / 1 public — PASS
- schema 5 recovery point without the new table restores under Continuity schema 6 — PASS
- built dist baseline: schema=6, tables=24, refs=30, triggers=72, routes=47, publicRoutes=1 — PASS
- built dist overdue condition: Focus `closing-condition`, urgency `urgent`, owner/due preserved, blocker `critical`, timing `overdue` — PASS
- built dist evidence-less clear: HTTP 400, `VALIDATION_ERROR`, `field=evidenceNote` — PASS
- built dist valid clear: condition `satisfied`, no current condition blocker, Term Sheet becomes current closing focus — PASS
- built dist Funding Outcome: condition history remains, current condition Focus/Blocker/Timing all false — PASS
- built UI contains `closing-condition-form`, `closing-condition-list`, exact save controls, financing-specific non-task copy and Funding Outcome final-authority warning — PASS

No OpenBcon material was read or used. No new third-party runtime dependency was added.

## Implemented Closing Readiness Truth — v0.29.0

v0.29 removes the last parallel generic checklist from `Closest to cash` for Term Sheet deals. Capital Coverage amounts and deterministic stage ordering remain unchanged; only the source of the displayed remaining closing steps is corrected.

### One closing truth, not two checklists

When a `Closest to cash` item is a Term Sheet, `projectCapitalCoveragePlan` now consumes the same structured Closing Condition Register already used by Today’s Focus, Capital Blockers and Capital Timing.

Three states are explicit:

1. **Active structured conditions exist** — the closing plan lists each actual active condition in due-date order and includes its recorded owner and due date. Counsel/evidence safeguards remain after those exact conditions.
2. **All recorded conditions are cleared** — the plan explicitly says the register is cleared but Funding Outcome has not resolved the financing path. It asks for remaining definitive-document/signature/settlement evidence and does not infer closing.
3. **No structured register exists** — the first remaining step is to record the material closing conditions with owner and due date; generic template guidance is not presented as if it were the actual deal state.

This does not change the meaning of `Closest to cash`: Term Sheet/Application/Investor ordering is still deterministic workflow-stage ordering, not predicted success probability.

### Owner / Board parity

The existing owner UI and Owner / Board Summary already render `CapitalCoveragePlan.closestToCash`, so both now receive the same exact condition-based remaining steps without a second rendering-specific model.

`OWNER_ACCEPTANCE.md` now requires an unassisted owner to verify:

- active conditions shown in Closest to cash match the real Register and preserve owner/due facts;
- a fully cleared register is not presented as closing or cash receipt;
- a Term Sheet with no structured register asks for the register to be created rather than showing generic steps as actual facts.

Latest v0.29.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 182/182 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- active structured Term Sheet conditions replace generic Closest-to-cash template steps — PASS
- exact conditions ordered by due date with owner/date facts — PASS
- all-cleared register still requires actual closing evidence / Funding Outcome — PASS
- no-register Term Sheet explicitly requires structured conditions — PASS
- coverage amount and workflow-stage ordering remain unchanged — PASS
- full tenant/security/source/Outcome/Continuity suite remains green — PASS
- built dist no-register Term Sheet: amount `$500,000`, first step `Record the material closing conditions...` — PASS
- built dist active register: same `$500,000`, exact `Execute definitive documents · owner Founder · due 2026-08-20` — PASS
- built dist cleared register: same `$500,000`, explicit `Funding Outcome has not yet resolved this financing path` and non-closing warning — PASS
- built dist unchanged boundary: schema 6 / 24 tenant tables / 30 reference guards / 72 revision triggers / 47 routes — PASS

No persistence schema, API route, scheduler, generic workflow engine, Agent runtime, probability model or third-party runtime dependency was added. Continuity remains schema 6.

## Implemented Funding Outcome Evidence Discipline — v0.30.0

v0.30 closes a funding-truth gap at the point where money changes the CEO Capital Command Center. A Funding Outcome may no longer newly record committed or received capital from amount/date fields alone.

### Evidence discipline

`funding_outcome` now persists two concise evidence-reference fields:

```text
commitment_evidence
receipt_evidence
```

Rules are fail-closed on new or corrected Outcomes:

- `committedAmountCents > 0` requires a non-empty commitment-evidence reference;
- `receivedAmountCents > 0` requires the received date plus a non-empty receipt-evidence reference;
- existing amount-consistency rules remain: received <= committed; committed <= approved when an approved amount exists; lost/withdrawn financing cannot retain committed/received capital.

The reference is intentionally not an evidence vault. It may identify an award notice, signed agreement, closing memo, bank transaction, statement or settlement record, while the underlying legal/banking evidence remains in the appropriate controlled system.

### Legacy evidence gaps are preserved and surfaced

Continuity schema advances `6 -> 7`. The migration adds the two Outcome evidence columns with empty defaults. Historical approved/committed/received amounts are preserved exactly; BossAI Funding does not invent evidence or silently zero old money.

A legacy Outcome that changes capital totals but lacks required evidence becomes exact owner remediation:

- `funding-outcome-<id>` is a stable exact/resumable anchor;
- missing receipt evidence becomes urgent Today's Focus + critical Capital Blocker;
- commitment-only evidence gaps become soon/high-priority remediation;
- Outcome and linked historical record cards visibly state evidence incompleteness;
- Owner / Board Summary publishes the count and missing evidence types;
- supplying the references through the normal Outcome correction UI removes the evidence Focus/Blocker without changing the amount merely to make the check pass.

Funding Outcome remains the current financing-state authority while legacy evidence is repaired. This is intentionally different from declaring the historical amount false: the system preserves the recorded state but refuses to present it as fully evidenced.

### Continuity / security boundary

Current Continuity schema:

```text
7
```

Accepted recovery points:

```text
schema 4
schema 5
schema 6
schema 7
```

A schema 6 backup has no Outcome evidence columns. Restore preserves the old amount and initializes commitment/receipt evidence as blank, which immediately surfaces remediation when required.

No new business table or API route was introduced, so the current hardening counts remain:

```text
24 tenant-scoped business tables
30 declared same-workspace reference guards
72 workspace revision triggers
47 registered API routes
1 public API route
```

Latest v0.30.0 acceptance:

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 193/193 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- missing commitment evidence on new committed Outcome → HTTP 400 `VALIDATION_ERROR`, `field=commitmentEvidence` — PASS
- missing receipt evidence on new received Outcome → HTTP 400 `VALIDATION_ERROR`, `field=receiptEvidence` — PASS
- valid commitment + receipt references persist and produce no evidence blocker — PASS
- legacy `funding_outcome` table migrates evidence columns in place without changing recorded money — PASS
- schema 6 recovery point restores under schema 7 with old amounts preserved and blank evidence references — PASS
- legacy received-capital gap → exact `funding-outcome` urgent Today’s Focus + critical blocker — PASS
- legacy commitment-only gap → high-priority evidence remediation without being mislabeled as received cash — PASS
- Outcome correction UI repairs both evidence references and removes remediation Focus/Blocker — PASS
- resolved historical Application/Investor/Term Sheet cards expose incomplete Outcome evidence instead of hiding it — PASS
- Owner / Board Summary evidence parity — PASS
- built dist baseline: schema=7, tables=24, refs=30, triggers=72, routes=47, publicRoutes=1 — PASS
- built dist invalid commitment evidence write: HTTP 400, revision unchanged, zero Outcomes persisted — PASS
- built dist valid Outcome: commitment/receipt references preserved, no Outcome evidence blocker — PASS
- built dist simulated legacy gap: Focus `funding-outcome`, id `1`, urgency `urgent`, blocker `critical`, committed/received amounts preserved — PASS
- built dist repaired legacy gap: exact evidence references persisted, Focus/Blocker cleared, committed/received amounts unchanged — PASS
- built UI contains `EVIDENCE MISSING`, commitment/receipt correction controls, and `funding-outcome-<id>` exact anchor — PASS

No OpenBcon material was read or used. No third-party runtime dependency, evidence-vault framework, generic audit authority, scheduler, task engine or Agent runtime was added.

## Implemented Receipt Tranche Reconciliation — v0.31.0

v0.31 closes the remaining partial-receipt gap between a Funding Outcome's committed capital and the actual sequence of cash receipts. Received capital is no longer forced into one ambiguous amount/date/evidence tuple when financing settles in multiple wires or disbursements.

### Financing-specific receipt register

New persisted entity:

```text
FundingReceiptTranche
```

Persistence:

```text
funding_receipt_tranche
```

Each tranche records:

```text
Funding Outcome
amount
received date
receipt evidence reference
note
received / voided status
void reason
```

The register is financing-specific. It is not a general accounting ledger, bank feed, accounts-receivable system, payment processor, or second workflow engine.

### Aggregate reconciliation truth

For the current schema-8 runtime:

```text
Funding Outcome received amount
=
sum(active received tranches)
```

Rules:

- creating an Outcome with an initial received amount transactionally creates the first equal tranche;
- subsequent receipts use the Receipt Tranche Register;
- latest active tranche date becomes the Outcome received date;
- active tranche sum may not exceed committed capital;
- direct edit of the Outcome received aggregate is rejected once tranches exist;
- voiding a tranche requires a reason, preserves the row/history, and removes its amount from current received capital;
- reinstating a valid tranche deterministically restores its amount to the aggregate;
- lost/withdrawn financing cannot receive or retain active cash tranches;
- tranche evidence is the current receipt-evidence authority when a tranche register exists.

### Continuity schema 8

Continuity advances:

```text
7 -> 8
```

Accepted recovery points:

```text
schema 4
schema 5
schema 6
schema 7
schema 8
```

A schema-7 recovery point does not contain `funding_receipt_tranche`. If an old Funding Outcome already records received capital, restore creates one equal tranche using the exact saved amount, received date, and receipt-evidence reference. Missing old evidence remains missing. No banking or settlement evidence is invented.

### Tenant / security boundary

The new table is workspace-scoped and has a same-workspace `outcome_id` reference guard.

Current machine truth:

```text
25 tenant-scoped business tables
25 workspace guards
31 declared same-workspace reference guards
75 workspace revision triggers
49 registered API routes
1 public API route
```

Cross-workspace tests prove a workspace cannot create a receipt tranche against another workspace's Funding Outcome; export and backup contain only the active workspace's receipt rows.

### Latest v0.31.0 acceptance

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 200/200 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- initial `$200,000` receipt on `$500,000` committed Outcome creates exactly one `$200,000` tranche — PASS
- second `$300,000` tranche reconciles Outcome received total to `$500,000` and latest receipt date to `2026-08-20` — PASS
- tranche that would exceed committed capital → HTTP 400, aggregate/history unchanged — PASS
- direct Outcome aggregate receipt edit while tranches exist → HTTP 400 `VALIDATION_ERROR` — PASS
- voiding `$300,000` tranche preserves two-row history while current received total returns to `$200,000` — PASS
- reinstating the tranche restores received total to `$500,000` — PASS
- void without reason rejected — PASS
- schema-7 recovery point restores under schema 8 and creates one equal tranche from the old aggregate — PASS
- cross-tenant tranche creation rejected — PASS
- Owner / Board Summary publishes tranche counts, totals and reconciliation status — PASS
- Funding Outcome UI makes Received aggregate read-only/tranche-managed — PASS
- built dist baseline: schema=8, tables=25, refs=31, triggers=75, routes=49, publicRoutes=1 — PASS
- built dist initial receipt: `$200,000`, one exact tranche — PASS
- built dist second receipt: `$500,000` aggregate, two tranches, no Outcome evidence/reconciliation blocker — PASS
- built dist overage: HTTP 400, `$500,000` and two tranches unchanged — PASS
- built dist direct aggregate edit: HTTP 400 with Receipt Tranche Register correction message — PASS
- built dist void: `$200,000` aggregate, one active/two historical tranches — PASS
- built dist reinstate: `$500,000`, latest date `2026-08-20`, two active tranches, reconciled — PASS

No OpenBcon material was read or used. No third-party accounting/reconciliation runtime dependency, payment processor, scheduler, generic workflow engine, Agent runtime, or second financial ledger was introduced.

## Current completion truth

- Technical Acceptance: PASS for the current local Phase 1–4 plus continuity/security/source-provenance/handoff/identity-boundary/owner-journey, database-hardened tenant persistence, verifier adapter contract, authorization enforcement implementation, Route Security Manifest, fail-closed standalone security configuration, local browser request integrity, workspace stale-write/revision protection, startup security invariants, bounded HTTP resource use, bounded Grants.gov execution/lifecycle cleanup, bounded tenant-scoped security-decision evidence lifecycle, owner-visible official-source failure recovery, exact Today's Focus item targeting/resumable navigation, owner Status/Owner/When execution context, accepted-Term-Sheet closing semantics, deterministic Capital Blockers / Why Capital Hasn't Arrived projection, unified de-duplicated Capital Pipeline Truth, deterministic Capital Coverage & Closing Plan, shared Funding Outcome resolution/correction consistency, Outcome-to-pipeline de-duplication, deterministic Capital Timing & Deadline Discipline, Capital Strategy input synchronization / Decision Freshness, Opportunity Deadline Viability / source-fact authority, Term Sheet Closing Date Discipline / Continuity schema 5, Structured Closing Condition Register / Continuity schema 6, Closing Readiness Truth / condition-synchronized Closest to cash, Funding Outcome Evidence Discipline / Continuity schema 7, Receipt Tranche Reconciliation / Continuity schema 8, Committed Capital Arrival Schedule / Continuity schema 9, Explicit Expectation-to-Receipt Reconciliation / Continuity schema 10, and security-decision evidence scope.
- Business Acceptance: PARTIAL. The financing journey includes one real official Grant source and practical external handoff, but Debt/Investor source integrations and production identity/operations are not complete.
- Real User Experience Acceptance: NOT YET PASSED. Automated real-entry checks exist, but no claim is made that an unassisted new owner has completed the full journey on the target device.
- Production Security Review: NOT ATTESTED.
- Completion Level: `2` (functional MVP).
- `productionReady=false`
- `actuallyLaunched=false`
- `realUserValidated=false`
- `remoteAccess=blocked`

## Next executable batch — Approved Identity Adapter + Human Owner Acceptance

1. Do **not** invent the remaining production authentication provider. Obtain/identify the approved upstream identity mechanism: issuer, credential/session format, signature/key distribution and rotation, audience, tenant claim, role claim, lifetime/not-before/clock-skew behavior, replay/session expectations, and revocation/suspension behavior.
2. Implement only that approved adapter behind the existing `IdentityVerifier` boundary; do not create a BossAI Funding account/password/token authority.
3. Add provider-specific real-artifact negative tests for invalid signature/key, unknown/rotated key, wrong issuer, wrong audience, expired/not-yet-valid credential, revoked/suspended identity, and tenant/role claim provenance.
4. Run the production security review using `SECURITY_REVIEW_READINESS.md` against the real adapter + current Route Security Manifest + authorization enforcement + tenant persistence before any remote bind decision.
5. Keep remote binding blocked until the approved cryptographic verifier, provider-specific negative tests, security review, and explicit remote-bind approval all pass.
6. Run `OWNER_ACCEPTANCE.md` on the actual target Windows/browser device with an unassisted owner/tester; automated acceptance cannot set `realUserValidated=true`.
7. Keep Debt/Investor source integrations blocked unless an official/licensed source supplies the real opportunity facts required by the domain model.
8. Keep `productionReady=false`, `actuallyLaunched=false`, `realUserValidated=false`, and Completion Level `2` until production identity/security and human acceptance are genuinely evidenced.


## Implemented Committed Capital Arrival Schedule — v0.32.0

v0.32 closes the timing gap between **committed capital** and **actual Receipt Tranches**. BossAI Funding can now record when an already-committed amount is explicitly expected to arrive without pretending that the date is a probability forecast, guaranteed wire date, or actual cash receipt.

### Explicit arrival facts only

New persisted entity/table:

```text
FundingReceiptExpectation
funding_receipt_expectation
```

Each active expectation records the Funding Outcome, expected amount, explicit expected receipt date, expectation basis/source note, responsible owner, optional note, status, and cancellation reason.

The date may only be entered from an actual payer confirmation, signed closing schedule, award notice, or equivalent financing fact known to the owner. BossAI Funding does not infer it from stage, historical cycle time, model output, investor behavior, or success probability.

### Arrival reconciliation truth

For every Funding Outcome:

```text
outstanding committed capital = committed - actually received
```

Active arrival expectations project as `unscheduled`, `partial`, `balanced`, `over-scheduled`, or `no-outstanding-commitment`.

Rules:

- new/edited active expectations cannot exceed current outstanding commitment;
- adding an expectation never changes Received cash;
- actual Receipt Tranches remain authoritative and always update the financing state when valid;
- if later actual cash makes an old expectation over-scheduled, the receipt succeeds and the stale schedule becomes urgent reconciliation work;
- BossAI Funding does not auto-match a real tranche to an expectation and does not silently mark the expected item fulfilled;
- cancellation requires a reason and preserves the historical expectation row;
- only active expectations contribute to the arrival schedule;
- only actual Receipt Tranches contribute to Received.

### Owner execution truth

Today’s Focus / WHY CAPITAL HASN'T ARRIVED / Capital Timing share the same schedule facts:

- overdue explicit expectation → exact `receipt-expectation-<id>` urgent Focus + critical blocker + overdue `expected-receipt` timing milestone;
- over-scheduled plan after actual cash changes → exact Funding Outcome urgent reconciliation;
- committed capital with no explicit date → timing/blocker gap, but deliberately low Focus competition so it does not displace another live Application/Term Sheet merely because a date is missing;
- balanced future schedule → explains why committed capital has not arrived, but explicitly remains a management checkpoint rather than a guarantee.

Owner / Board Summary publishes outstanding amount, explicitly scheduled amount, unscheduled amount, over-scheduled amount, overdue expectation count, and next explicit date.

### Continuity / security boundary

Continuity advances `8 -> 9`. Current builds accept schema 4/5/6/7/8/9 recovery points. A schema-8 recovery point contains no arrival expectations; restore leaves the register empty and does not invent a payer/wire/settlement date.

Current machine truth:

```text
26 tenant-scoped business tables
26 workspace guards
32 declared same-workspace reference guards
78 workspace revision triggers
51 registered API routes
1 public API route
```

`funding_receipt_expectation.outcome_id` is same-workspace guarded. Cross-tenant tests prove one workspace cannot schedule expected receipts against another workspace's Funding Outcome; export/backup remain workspace-scoped.

### Latest v0.32.0 acceptance

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 208/208 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- no arrival schedule on `$300,000` outstanding commitment → explicit `receipt-schedule-gap` blocker — PASS
- explicit `$300,000` future expectation balances `$300,000` outstanding while Received remains `$200,000` — PASS
- expectation exceeding outstanding commitment by one cent → HTTP 400, state unchanged — PASS
- later actual `$100,000` Receipt Tranche succeeds even though the old `$300,000` expectation becomes over-scheduled — PASS
- stale over-scheduled arrival plan → critical blocker + urgent Funding Outcome focus — PASS
- correcting expectation to `$200,000` removes the over-scheduled blocker without changing actual Received — PASS
- moving explicit date to `2026-08-16` → exact receipt-expectation urgent Focus + critical blocker + overdue timing milestone — PASS
- cancelling the expectation with a reason preserves one historical row, removes its timing milestone, restores the unscheduled gap, and leaves actual Received unchanged — PASS
- schema-8 restore → empty expectation register, no synthetic date — PASS
- cross-tenant expectation creation rejected — PASS
- built dist baseline: schema=9, tables=26, refs=32, triggers=78, routes=51, publicRoutes=1 — PASS
- built dist balanced expectation: Received stays `$200,000`, exact receipt-expectation Focus/milestone present — PASS
- built dist actual cash wins: Receipt Tranche accepted, Received becomes `$300,000`, stale schedule flagged critical — PASS
- built UI contains `receipt-expectation-form`, `Committed capital arrival schedule`, exact edit/cancel controls, and explicit `not a forecast or guarantee` copy — PASS

No OpenBcon material was read or used. No forecasting model, treasury engine, accounting ledger, bank feed, scheduler, generic task/workflow engine, Agent runtime, or third-party runtime dependency was added.


## Implemented Explicit Expectation→Receipt Reconciliation — v0.33.0

v0.33 closes the remaining relationship gap between an explicit committed-capital Arrival Expectation and the actual Receipt Tranches that later settle that expectation. BossAI Funding still keeps plan facts and banking facts separate; it now lets the owner explicitly state the relationship when it is known.

### No automatic receipt matching

New persisted entity/table:

```text
FundingReceiptExpectationAllocation
funding_receipt_expectation_allocation
```

BossAI Funding never creates this relationship from equal/similar amounts, dates, payer/provider names, financing stage, historical duration, or model output. The owner must explicitly choose the Arrival Expectation, actual Receipt Tranche, and amount being allocated.

The relationship supports partial and many-to-many settlement. A `$300,000` expectation may be explicitly fulfilled by `$100,000 + $200,000` actual tranches, while a single actual tranche may be divided across multiple expectations only when that allocation is explicitly known.

### Reconciliation truth

Only valid active allocations reduce the remaining amount of a specific Arrival Expectation.

Rules:

- expectation and tranche must belong to the same Funding Outcome and active workspace;
- allocation amount must be positive;
- active allocation totals may not exceed the expectation amount;
- active allocation totals may not exceed the actual Receipt Tranche amount;
- fulfilled expectations no longer appear as future expected-receipt timing;
- an unallocated actual Receipt Tranche never silently fulfills an expectation;
- a relationship cannot be moved to different records; void the wrong link with a reason and record a new explicit link;
- voided allocations remain historical and stop reducing the expectation;
- actual Receipt Tranche truth always wins: correcting or voiding actual cash succeeds even when an allocation points to it, and the affected expectation becomes exact allocation-reconciliation work.

Today’s Focus, WHY CAPITAL HASN'T ARRIVED, Capital Timing, Funding Outcome cards, Arrival Expectation cards, and Owner / Board Summary consume this same allocation truth. An invalid active allocation becomes an exact `receipt-expectation-<id>` urgent/critical remediation instead of changing cash merely to satisfy the plan.

### Continuity / security boundary

Continuity advances `9 -> 10`. Current builds accept schema 4/5/6/7/8/9/10 recovery points. A schema-9 recovery point may contain both Arrival Expectations and actual Receipt Tranches; schema-10 restore preserves both but creates zero automatic allocation links.

Current machine truth:

```text
27 tenant-scoped business tables
27 workspace guards
34 declared same-workspace reference guards
81 workspace revision triggers
53 registered API routes
1 public API route
```

The allocation table is guarded to both `funding_receipt_expectation` and `funding_receipt_tranche`. Cross-workspace tests prove one workspace cannot construct an allocation using another workspace's expectation or tranche; export and backup remain workspace-scoped.

### Latest v0.33.0 acceptance

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 216/216 tests
- `npm run build` — PASS
- `git diff --check` — PASS
- unallocated actual `$100,000` receipt after a `$300,000` expectation → zero allocation links; stale schedule remains over-scheduled rather than auto-matching — PASS
- explicit `$100,000` allocation → expectation becomes partial with `$200,000` remaining; schedule rebalances while Received stays unchanged by the link — PASS
- further `$200,000` actual receipt before allocation → actual Received reaches `$500,000`; old expectation remains over-scheduled until explicit linkage — PASS
- explicit final `$200,000` allocation → expectation fulfilled; future expected-receipt milestone and expectation blocker disappear — PASS
- allocation that exceeds available tranche/expectation amount → HTTP 400 — PASS
- void allocation with reason → link history retained, expectation reopens, actual Received unchanged — PASS
- reinstate allocation → deterministic fulfilled state restored — PASS
- void actual linked Receipt Tranche → cash correction succeeds first; Received falls from `$500,000` to `$300,000`; active allocation becomes invalid and exact receipt-expectation urgent/critical remediation — PASS
- schema-9 restore preserves the saved Receipt Tranche and Arrival Expectation but restores zero allocation links — PASS
- cross-tenant allocation using either foreign expectation or foreign tranche rejected — PASS
- built dist baseline: schema=10, tables=27, refs=34, triggers=81, routes=53, publicRoutes=1 — PASS
- built dist no-auto-match: Received `$300,000`, allocations `0`, over-scheduled schedule visible — PASS
- built dist partial explicit allocation: one active link, `$200,000` remaining milestone, Received `$300,000` — PASS
- built dist fulfilled allocation: two active links, Received `$500,000`, no future expectation milestone/blocker — PASS
- built dist allocation void/reinstate preserves history and toggles only plan reconciliation — PASS
- built dist actual cash reversal: tranche `voided`, allocation remains historical/active until corrected, exact expectation Focus is `urgent`, critical allocation blocker present — PASS

No OpenBcon material was read or used. No automatic bank matching, payment reconciliation engine, accounting ledger, scheduler, generic workflow/task engine, Agent runtime, or third-party runtime dependency was introduced.



## Implemented Allocation Integrity under Corrections — v0.34.0

v0.34 hardens the existing Arrival Expectation → explicit Allocation → actual Receipt Tranche chain when either the plan or the real cash record is corrected. It does not create a new financing truth authority and does not change the clean-room or BossAI OS boundary.

### v0.34 batch preflight

- Highest commercial goal: help the owner move committed financing toward actual banked cash without letting plan corrections distort already recorded fulfillment facts.
- Largest current user gap: after v0.33, an owner could correct expectation/cash records in ways that made an existing explicit Allocation inconsistent unless every projection and mutation path enforced the same integrity rules.
- User problem solved: the owner can now correct plan-side amounts/status safely, correct actual cash authoritatively, and immediately see the exact reconciliation work when the two no longer fit.
- User-visible change: Arrival Expectation cards separately show Expected total, Explicitly allocated actual cash, and Remaining expectation; integrity failures show RECONCILIATION REQUIRED and point to the affected Allocation.
- Scope: expectation shrink/cancel integrity, remaining-schedule projection, Allocation PATCH capacity validation, actual-cash correction authority, Focus/Blocker/Timing/Board/UI parity, regression evidence.
- Out of scope: probability forecasts, automatic receipt↔expectation matching, bank feeds, generic accounting ledger, new Agent runtime/task engine, Debt/Investor fabricated sources, production identity provider, remote enablement.
- Real-entry acceptance: start the built local product, create an expectation + actual receipt + explicit Allocation, exercise shrink/cancel/allocation-capacity/cash-correction paths, and verify the owner-facing reconciliation state plus Owner / Board Summary.
- Claimed completion level: 2. Engineering closure does not raise Real User Experience Acceptance.

### v0.34 integrity rules now enforced

1. Arrival Expectation amount cannot be reduced below total active explicit Allocation amount. Rejection is HTTP fail-closed and does not mutate financing state or workspace revision.
2. Arrival Expectation with active Allocations cannot be cancelled; the owner must explicitly correct or void those Allocations first. No automatic voiding occurs.
3. Future arrival schedule and persistence capacity checks use remaining expectation amount rather than original recorded amount after valid explicit fulfillment. Valid fulfillment releases future schedule capacity; reconciliation-invalid Allocations do not masquerade as fulfilled cash to create schedule room.
4. Allocation PATCH excludes the current Allocation from both capacity calculations, then revalidates remaining expectation capacity, remaining Receipt Tranche capacity, and the immutable same-outcome relationship.
5. Actual Receipt Tranche correction, void, or reinstatement remains authoritative. Cash correction is not rejected merely to preserve a plan-side Allocation.
6. If corrected actual cash makes an active Allocation invalid or causes total active allocations to exceed the corrected tranche amount, Allocation history is retained, its fulfillment stops reducing the future schedule, and the schedule becomes allocation-error.
7. Today's Focus targets the affected Arrival Expectation and exact Allocation ID(s); Capital Blocker is critical until repaired.
8. Correcting or voiding the invalid Allocation clears the reconciliation error without rewriting the corrected actual-cash record.
9. Owner UI shows Expected total / Explicitly allocated actual cash / Remaining expectation and labels integrity failures RECONCILIATION REQUIRED.
10. Owner / Board Summary separately reports original/recorded expectation amount, explicitly allocated actual cash, remaining scheduled amount, and reconciliation-required Allocation IDs.

### v0.34 persistence and security boundary

No recovery shape changed, so Continuity schema remains 10.

```text
Tenant business tables       27
Workspace guards             27
Reference guards             34
Workspace revision triggers  81
API routes                   53
Public routes                 1
Public API                    GET /api/health
```

Remote access remains blocked. No approved production identity provider is configured. Production Security Review remains not attested.

### v0.34 machine acceptance

- package version: 0.34.0
- targeted Allocation/Arrival/Focus/Blocker/Timing/UI/Reporting suite: 35/35 PASS
- full test suite: 219/219 PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS
- first full `npm run verify`: PASS
- built `dist` loopback HTTP business smoke: PASS
- built `dist` health: HTTP 200
- built `dist` Expectation shrink below active Allocation: HTTP 400, state/revision unchanged
- built `dist` real Receipt Tranche amount correction below active Allocation: HTTP 200, cash aggregate corrected, Allocation history retained, exact Focus + critical Blocker surfaced
- built `dist` invariants: schema 10 / 27 tables / 27 workspace guards / 34 refs / 81 triggers / 53 routes / 1 public
- built `dist` security posture: remoteAccessDecision=blocked / securityReviewAttested=false

Documentation-sealed `git diff --check && npm run verify` completed PASS with lint PASS, typecheck PASS, 219/219 tests PASS, and build PASS. The final session report must use the latest rerun performed after this record was sealed.

## Current completion truth — v0.34.0

- Technical Acceptance: PASS for the current local v0.34 scope and all retained prior financing/security/continuity functionality covered by the full machine suite.
- Business Acceptance: PARTIAL. The financing workflow is materially implemented, but production identity/security and real target-user acceptance are not complete.
- Real User Experience Acceptance: NOT YET PASSED. `OWNER_ACCEPTANCE.md` must be completed on the actual target device by an unassisted owner/tester.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release, signing, or formal installer action is authorized by this v0.34 batch.



## Implemented Allocation Reconciliation Repair Guidance — v0.35.0

v0.35 continues directly from v0.34. It does not change product direction or create a new financing authority. It turns an already-detected Allocation reconciliation failure into deterministic, owner-actionable repair guidance while preserving actual cash as the authority and preserving every owner-confirmed Allocation until the owner explicitly changes it.

### v0.35 batch preflight

- Highest commercial goal: help the owner get committed capital to real cash while making financing corrections understandable and safely repairable.
- Largest current user gap: v0.34 could identify the broken Allocation and fail closed correctly, but the owner still had to infer how much had to be repaired and what capacity remained on each side.
- User problem solved: the product now states the exact repair constraint, minimum correction amount, affected Allocation IDs, and current maximum supported amount for each Allocation link without deciding which relationship the owner should remove.
- User-visible change: Receipt, Arrival Expectation, and Allocation cards expose the same server-projected repair facts; Today's Focus, Capital Blocker, and Owner / Board Summary repeat the same minimum repair requirement.
- Scope: deterministic reconciliation repair projection, Bootstrap projection, exact repair amount, per-link supported capacity, Focus/Blocker/Board/UI parity, legacy cancelled-expectation integrity detection, regression evidence.
- Out of scope: automatic matching, automatic Allocation repair, bank feed, accounting ledger, generic reconciliation engine, generic task engine, new Agent runtime, production identity provider, remote enablement.
- Real-entry acceptance: correct actual cash downward after an explicit Allocation exists, verify the exact repair amount and Allocation IDs in the owner UI / Focus / Blocker / Board Summary, then repair the Allocation and confirm every warning clears without changing the corrected cash fact.
- Claimed completion level: 2. Automated success does not raise Real User Experience Acceptance.

### v0.35 repair guidance now implemented

1. Added deterministic `FundingReceiptAllocationReconciliationIssue` projection with issue kind, affected expectation IDs, Receipt Tranche ID when applicable, Allocation IDs, recorded allocated amount, supported amount, required reduction amount, and exact reason.
2. Existing Bootstrap now returns `receiptAllocationReconciliationIssues`, so the browser consumes the same server-side repair truth rather than maintaining a second reconciliation algorithm.
3. For a corrected Receipt Tranche, required reduction is the exact excess of active explicit Allocations over current received cash.
4. When several Allocation links share one Receipt, the projection lists every affected Allocation ID and the aggregate minimum reduction but does not choose which owner-confirmed link to reduce or void.
5. Allocation cards show Current maximum supported amount for this link after excluding the current link from both expectation-side and Receipt-side capacity calculations.
6. Receipt cards show explicit allocated total and remaining current cash capacity. Receipt, Expectation, and Allocation cards show the same RECONCILIATION REQUIRED repair constraint.
7. Today's Focus and critical Capital Blocker state the same minimum repair amount and affected Allocation IDs.
8. Owner / Board Summary records every open repair constraint and explicitly states that BossAI Funding will not choose which owner-confirmed Allocation relationship to remove.
9. Legacy or abnormal cancelled Arrival Expectation + active Allocation states are no longer treated as clean history; they remain exact Focus / critical Blocker work until repaired.
10. Correcting or voiding enough Allocation amount clears the repair projection without rewriting the authoritative Receipt Tranche.

### v0.35 persistence and security boundary

No recovery shape changed, so Continuity schema remains 10.

```text
Tenant business tables       27
Workspace guards             27
Reference guards             34
Workspace revision triggers  81
API routes                   53
Public routes                 1
Public API                    GET /api/health
```

Remote access remains blocked. No approved production identity provider is configured. Production Security Review remains not attested.

### v0.35 machine acceptance before documentation sealing

- package version: 0.35.0
- focused repair-domain test file: 10/10 PASS
- selected v0.35 Allocation/Arrival/Focus/Blocker/UI/Reporting suite: 26/26 PASS before the final legacy-focus regression was added
- full test suite after all v0.35 regressions: 223/223 PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS
- first full `npm run verify`: PASS
- built `dist` loopback HTTP repair smoke: PASS
- built `dist` health: HTTP 200
- built `dist` example: active Allocation 10,000,000 cents / corrected Receipt 5,000,000 cents -> `tranche-overallocated`, recorded 10,000,000, supported 5,000,000, required reduction exactly 5,000,000, Allocation #1 retained
- built `dist` Focus / critical Blocker: both state at least 5,000,000 cents must be corrected across Allocation #1 and do not request rewriting actual cash
- built `dist` invariants: schema 10 / 27 tables / 27 workspace guards / 34 refs / 81 triggers / 53 routes / 1 public
- built `dist` security posture: remoteAccessDecision=blocked / securityReviewAttested=false

The final session report must use the documentation-sealed rerun performed after this record is written.

## Current completion truth — v0.35.0

- Technical Acceptance: PASS for the current local v0.35 scope and all retained prior financing/security/continuity behavior covered by the machine suite.
- Business Acceptance: PARTIAL. The local financing workflow is materially implemented, but production identity/security and target-user acceptance remain incomplete.
- Real User Experience Acceptance: NOT YET PASSED. The new v0.35 repair-guidance checklist in `OWNER_ACCEPTANCE.md` must be completed on the actual target Windows/browser device by an unassisted owner/tester.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release, signing, or formal installer action is authorized by this v0.35 batch.


## Implemented Owner-Controlled Reconciliation Repair Drafting — v0.36.0

v0.36 continues directly from v0.35 and does not change the financing truth authority. It reduces owner repair-entry friction after `RECONCILIATION REQUIRED` while preserving explicit owner review, workspace-revision protection, actual-cash authority, and the existing Allocation PATCH as the only persistence path.

### v0.36 batch preflight

- Highest commercial goal: let the owner repair a broken expectation↔receipt relationship with less arithmetic/retyping while preventing silent or stale corrections.
- Largest current user gap: v0.35 could state the exact repair amount and current maximum supported amount, but the owner still had to manually transcribe that number into the Allocation correction form.
- User problem solved: the owner can draft the currently supported amount or draft a void in-place, review the form, and persist only through the existing guarded Save action.
- User-visible change: invalid Allocation cards now expose `Draft supported amount` and `Draft void`, clearly label them as non-persistent drafts, and warn when a preserved stale draft is above the latest loaded supported amount.
- Scope: UI-only repair drafting, preserved-draft revalidation after stale refresh, revision/concurrency regression, repeatable system-Chrome built-product acceptance.
- Out of scope: auto-save, automatic Allocation reduction, automatic void reason, automatic relationship choice, bank matching, accounting, new persistence, new API route, generic workflow/task authority, Agent runtime, production identity, remote enablement.
- Real-entry acceptance: create a reconciliation failure, draft the supported amount, prove it does not persist, change actual cash elsewhere, prove stale Save fails, refresh while keeping the draft, review the new excess warning, redraft to the latest support and save; then exercise Draft void and required real void reason.
- Claimed completion level remains 2. Browser automation is machine evidence and does not count as unassisted real-owner acceptance.

### v0.36 owner-controlled drafting now implemented

1. Added browser helper `currentMaximumSupportedReceiptAllocation` over the currently loaded Bootstrap facts. It excludes the current active Allocation from both expectation-side and Receipt-side capacity totals before calculating the current maximum supported amount for that link.
2. `Draft supported amount` changes only the visible Allocation amount input. It performs no HTTP request and therefore cannot mutate SQLite before the owner chooses `Save link`.
3. `Draft void` changes only the visible status selector to `voided` and focuses the void-reason field. It leaves the reason blank; BossAI Funding does not invent the owner's business reason.
4. Existing `Save link` remains the only persistence action. Server validation still rechecks workspace revision, immutable relationship identity, expectation capacity, Receipt Tranche capacity, status rules, and required void reason.
5. Stale-workspace Refresh preserves the owner's unsaved controls. After the latest Bootstrap state is rendered, the retained Allocation draft is compared with the latest loaded supported amount.
6. If the preserved active draft is now too high, the UI states the exact amount above support and the current maximum supported amount. This is a convenience warning only; Save remains server-authoritative.
7. A stale repair draft cannot overwrite newer cash truth. Real HTTP regression proves a draft based on Receipt 5,000,000 cents is rejected with `409 STALE_WORKSPACE_STATE` after another client corrects the Receipt to 4,000,000 cents; the Allocation remains 10,000,000 and the Receipt remains 4,000,000 until a refreshed valid repair is saved.
8. Added `scripts/chrome-repair-smoke.cjs` and package command `npm run test:chrome-repair`. It uses the locally installed system Chrome through CDP and adds no npm browser runtime dependency.
9. Real built-product Chrome acceptance passed: a $100,000 Allocation / $50,000 supported cash state drafted $50,000 locally without persistence; actual cash then changed to $40,000; stale Save showed `Changed elsewhere — refresh needed`; Refresh preserved $50,000 and warned it was $10,000 above the latest $40,000 support; the latest draft saved at $40,000 and cleared reconciliation.
10. The same Chrome acceptance then voided the underlying Receipt, proved `Draft void` produced `status=voided` with an empty reason but left persisted Allocation active, proved empty-reason Save failed closed, and proved an explicit owner reason allowed the final void and cleared reconciliation.

### v0.36 persistence and security boundary

No recovery shape or API security topology changed.

```text
Tenant business tables       27
Workspace guards             27
Reference guards             34
Workspace revision triggers  81
API routes                   53
Public routes                 1
Public API                    GET /api/health
Continuity schema             10
```

Remote access remains blocked. No approved production identity provider is configured. Production Security Review remains not attested. System Chrome is an optional local acceptance runtime only and is not a shipped BossAI Funding dependency.

### v0.36 machine acceptance before documentation sealing

- package version: 0.36.0
- focused Allocation/UI/revision regressions: PASS
- full regression suite: 225/225 PASS on the stable formal rerun
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS
- formal `npm run verify`: PASS on stable rerun
- repeatable built-product system-Chrome repair smoke: PASS
- Chrome smoke proves no persistence before Save, stale revision rejection, preserved-draft warning after Refresh, refreshed supported repair, no invented void reason, empty-reason fail-closed, and explicit owner void repair.
- One earlier formal run reported a file-level worker failure for historical `strategy-freshness-journey.test.ts` without a failing assertion; the isolated strategy suite immediately passed 11/11 and the next full formal verify passed 225/225. The transient run is retained as execution history but is not the final acceptance result.

The final session report must use the documentation-sealed rerun and final built-product smoke performed after this record is written.

## Current completion truth — v0.36.0

- Technical Acceptance: PASS for the current local v0.36 scope only after the final documentation-sealed machine rerun remains green.
- Business Acceptance: PARTIAL. Financing execution is materially implemented, but production identity/security and real target-user acceptance remain incomplete.
- Real User Experience Acceptance: NOT YET PASSED. `OWNER_ACCEPTANCE.md` v0.36 must be completed by an unassisted owner/tester on the actual target Windows/browser environment.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release, signing, or formal installer action is authorized by this v0.36 batch.


## Implemented Reconciliation Repair Impact Preview — v0.37.0

v0.37 continues directly from v0.36. It does not change financing truth authority or persistence. It lets the owner see the currently knowable effect of an unsaved reconciliation repair before choosing Save, while preserving the rule that the server may still reject stale or invalid input.

### v0.37 batch preflight

- Highest commercial goal: reduce owner uncertainty before a consequential financing correction is persisted.
- Largest current user gap: v0.36 could safely draft a supported amount or void, but the owner still had to infer how that draft would change the Allocation, Arrival Expectation, and Receipt capacity before Save.
- User problem solved: an unsaved changed repair draft now shows its projected impact over the currently loaded financing facts and obvious Save prerequisites without claiming final server acceptance.
- User-visible change: invalid Allocation cards show `Unsaved repair impact preview` only after the draft differs from persisted state.
- Scope: browser-only impact preview, loaded-facts capacity check, Save-prerequisite hints, stale-refresh preview revalidation, extended system-Chrome acceptance.
- Out of scope: server dry-run route, auto-save, automatic repair, automatic relationship choice, bank matching, accounting, new persistence, new API route, generic workflow/task authority, Agent runtime, production identity, remote enablement.
- Real-entry acceptance: draft the supported amount, inspect exact Allocation / Expectation / Receipt effects, make the draft stale through another cash correction, Refresh and confirm the preview changes to non-fit, then redraft and inspect the updated values; exercise Draft void and the void-reason prerequisite.
- Claimed completion level remains 2. Automated Chrome evidence is not unassisted real-owner acceptance.

### v0.37 owner-visible impact preview now implemented

1. The impact preview is hidden while the Allocation form still matches persisted amount/status and appears only after an unsaved repair draft changes those values.
2. It shows the persisted active Allocation amount → drafted active amount.
3. It shows projected Arrival Expectation active allocated amount and remaining expectation using the currently loaded other active links unchanged.
4. It shows projected Receipt Tranche active allocated amount and remaining current cash capacity. A voided Receipt projects zero current cash capacity.
5. `Loaded-facts capacity check` says whether the draft fits the currently loaded relationship/status/capacity facts only. It does not claim final reconciliation success.
6. `Save prerequisites` warns about a missing owner void reason, non-positive active amount, or loaded-facts capacity mismatch. Otherwise it says `Ready to submit for server validation`.
7. The preview explicitly states `Preview only — nothing is saved`, actual Receipt cash is unchanged by the draft, and newer facts may reject Save.
8. Existing `Save link` remains the only persistence path and still revalidates workspace revision, immutable relationship identity, status rules, expectation capacity, Receipt Tranche capacity, and required void reason.
9. Stale Refresh preserves the owner draft and immediately reprojects it against the newly loaded facts. The system-Chrome gate proved a preserved $50,000 draft switched from fit to non-fit after Receipt support changed to $40,000.
10. The same Chrome gate proved exact $100,000→$50,000 and $100,000→$40,000 Allocation previews, exact Expectation remaining balances, exact Receipt current cash capacity, $40,000→$0 Draft void impact, missing-reason warning, and readiness transition after a real owner reason was entered.

### v0.37 persistence and security boundary

No recovery shape or API topology changed.

```text
Tenant business tables       27
Workspace guards             27
Reference guards             34
Workspace revision triggers  81
API routes                   53
Public routes                 1
Public API                    GET /api/health
Continuity schema             10
```

Remote access remains blocked. No approved production identity provider is configured. Production Security Review remains not attested. The impact preview performs no request and cannot mutate financing truth or bypass authorization/revision checks.

### v0.37 machine acceptance before documentation sealing

- package version: 0.37.0
- focused Allocation UI / workspace-revision regressions: 12/12 PASS
- first formal full regression suite: 226/226 PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS
- first formal `npm run verify`: PASS
- built-product `npm run test:chrome-repair`: PASS
- Chrome preview evidence: $100,000→$50,000 active; Expectation $50,000 allocated / $50,000 remaining; Receipt $50,000 allocated / $0 current cash capacity; loaded-facts fit; Ready to submit.
- stale Refresh evidence: preserved $50,000 draft against $40,000 current support; explicit $10,000 excess warning; preview switches to loaded-facts non-fit.
- refreshed repair evidence: $100,000→$40,000 active; Expectation $40,000 allocated / $60,000 remaining; loaded-facts fit; Ready to submit.
- Draft void evidence after underlying Receipt void: $40,000→$0 active; Expectation $0 allocated / $100,000 remaining; Receipt $0 current cash capacity; owner void reason required, then Ready after explicit reason.

The final session report must use the documentation-sealed rerun and final Chrome/security smoke performed after this record is written.

## Current completion truth — v0.37.0

- Technical Acceptance: PASS for the current local v0.37 scope only after the final documentation-sealed machine rerun remains green.
- Business Acceptance: PARTIAL. Financing execution is materially implemented, but production identity/security and real target-user acceptance remain incomplete.
- Real User Experience Acceptance: NOT YET PASSED. `OWNER_ACCEPTANCE.md` v0.37 must be completed by an unassisted owner/tester on the actual target Windows/browser environment.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release, signing, or formal installer action is authorized by this v0.37 batch.



## Implemented Owner Workspace Progressive Disclosure — v0.39.0

v0.39 continues from the real Web browser acceptance baseline recorded in `Atlas/V0_38_REAL_WEB_BROWSER_ACCEPTANCE.md`. It does not add financing capabilities or change financing truth authority. It reduces initial owner cognitive/scroll burden by keeping the primary capital judgments visible while collapsing seven professional workspaces until the owner enters them.

### Owner-visible result

- Today’s Focus, Capital Gap, Capital Timing, Why capital hasn’t arrived, and Three Capital Tracks remain directly exposed.
- Capital strategy, Capital plan, Find money, Move actions, Investors, Execute and close, and History and safety remain visible as module headings but start collapsed.
- Owner navigation opens the selected module in one step and closes the previously opened professional module.
- Hash reload reopens the requested module; exact financing hashes reopen the containing module and target item.
- Today’s Focus exact-item navigation opens a collapsed target workspace before highlight/scroll.
- Existing financing forms, registers, Data Room, Due Diligence, Term Sheet, Closing Register, Funding Outcome, Receipt/Expectation/Allocation and reconciliation controls remain implemented; none were deleted.
- Progressive disclosure is transient presentation state only. No financing truth or module-open preference was added to browser storage.
- Existing stale-refresh draft capture/restore remains authoritative for unsaved form controls; real Chrome proves a draft survives collapse + Refresh + reopen.

### Measured real Chrome page height

```text
Desktop 1440 × 860
v0.38: 21,203.5625 px
v0.39:  4,460.46875 px
reduction: 79.0%

Mobile / narrow 390 × 844
v0.38: 35,048.75 px
v0.39:  9,807.6875 px
reduction: 72.0%
```

Both desktop and mobile real Chrome acceptance retain no horizontal overflow and keep the primary owner decisions visible. The machine gate requires initial height below 50% of the v0.38 baseline rather than optimizing for minimum height without regard to usability.

### Navigation / recovery acceptance

Real built-product Chrome acceptance proves:

- owner nav → Capital plan opens only Capital plan;
- owner nav → Find money opens only Find money and writes `#opportunities`;
- `#opportunities` reload restores that workspace and persisted company/goal/dilution facts;
- a near-deadline Financing Action becomes exact Today’s Focus;
- after its Move actions workspace is collapsed, Today’s Focus reopens it and targets the exact action;
- exact `#funding-action-1` reload restores the containing workspace and item;
- an unsaved Company Profile draft survives collapse, latest-state Refresh and reopen.

### Reconciliation compatibility

The v0.36/v0.37 system-Chrome repair chain remains PASS after the repair gate was aligned to enter Execute and close through owner navigation before checking visible reconciliation guidance. The chain still proves preview-only drafting, stale revision rejection, authoritative cash correction, preserved/revalidated draft, latest supported repair, owner-entered void reason, and final reconciliation issues = 0.

### v0.39 machine acceptance before documentation-sealed rerun

- package version: 0.39.0
- progressive-disclosure contract: 5/5 PASS
- full regression suite: 232/232 PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run verify`: PASS
- built-product `npm run test:ui-browser`: PASS
- built-product `npm run test:chrome-repair`: PASS
- `git diff --check`: PASS before this documentation append

Detailed evidence: `Atlas/V0_39_OWNER_WORKSPACE_PROGRESSIVE_DISCLOSURE.md`.

### v0.39 persistence and security boundary

No financing persistence, tenancy, route or production-identity authority changed:

```text
Continuity schema             10
Tenant business tables        27
Workspace guards              27
Reference guards              34
Workspace revision triggers   81
API routes                    53
Public routes                  1
Public API                    GET /api/health
```

Remote access remains blocked. No approved production identity provider is configured. Production Security Review remains not attested.

## Current completion truth — v0.39.0

- Technical Acceptance: PASS for current local v0.39 scope only after the final documentation-sealed rerun remains green.
- Business Acceptance: PARTIAL.
- Real User Experience Acceptance: NOT YET PASSED.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release or signing action is authorized by this v0.39 batch.



## Implemented Owner First-View Decision Density — v0.40.0

v0.40 continues directly from v0.39 Owner Workspace Progressive Disclosure and does not add financing capabilities or change financing truth authority. It closes the remaining acceptance gap between “the owner judgments exist somewhere in the page” and “the owner can actually see them near entry.”

### Owner-visible result

- Today’s Focus and Capital Gap remain the primary hero.
- A compact owner snapshot immediately below them projects the highest recorded blocker, capital timing state, and all three capital tracks from the existing dashboard facts.
- Desktop real Chrome places the complete owner snapshot inside the first 1440×860 viewport.
- Narrow/mobile real Chrome places the complete owner snapshot within two 390×844 viewport heights.
- Full coverage, timing, blocker, owner-journey and track evidence remains available inside the new `Decision details` progressive workspace.
- The original seven professional workspaces remain separate and one-step discoverable; Decision details is evidence disclosure, not a new financing subsystem.
- Blocker, timing and track summary actions reopen the existing detailed evidence and use hash navigation; no duplicate financing record is created.
- No new browser persistence, API route, database table, task/runtime/scheduler/approval/audit/memory authority or Agent runtime was introduced.

### Real Chrome geometry

```text
Desktop 1440 × 860
v0.39 initial shell height: 4,460.46875 px
v0.40 initial shell height: 2,313.453125 px
v0.39 → v0.40 reduction: 48.1%
owner snapshot bottom: 777.453125 px < 860 px viewport

Mobile / narrow 390 × 844
v0.39 initial shell height: 9,807.6875 px
v0.40 initial shell height: 4,374.109375 px
v0.39 → v0.40 reduction: 55.4%
owner snapshot bottom: 1,630.109375 px < 1,688 px two-viewport threshold
```

Against v0.38 the current initial shell reduction is 89.1% desktop and 87.5% mobile. These remain cognitive/scroll-burden regression measures, not a minimum-height product objective.

### Navigation and recovery acceptance

Real built-product Chrome proves:

- blocker summary → `#blockers` and existing Decision details;
- timing summary → `#timing` and existing Decision details;
- track summary → `#tracks` and existing Decision details;
- owner nav still opens only the requested professional workspace;
- Company Profile native validation and real save remain intact;
- Funding Goal real save remains intact;
- unsaved draft survives collapse + latest-state Refresh + reopen;
- Today’s Focus exact-item reveal remains intact;
- `#opportunities` reload and exact financing-item reload remain intact;
- desktop/mobile horizontal overflow remains absent.

The v0.36/v0.37 reconciliation Chrome repair chain also remains PASS after v0.40.

### v0.40 machine acceptance before documentation-sealed rerun

- package version: 0.40.0
- full regression suite: 235/235 PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run verify`: PASS
- built-product `npm run test:ui-browser`: PASS
- built-product `npm run test:chrome-repair`: PASS
- `git diff --check`: PASS before this documentation append

Detailed evidence: `Atlas/V0_40_OWNER_FIRST_VIEW_DECISION_DENSITY.md`.

### Current completion truth — v0.40.0

- Technical Acceptance: PASS for current local v0.40 scope only after the final documentation-sealed rerun remains green.
- Business Acceptance: PARTIAL.
- Real User Experience Acceptance: NOT YET PASSED. The v0.40 checklist in `OWNER_ACCEPTANCE.md` requires an unassisted target-device owner/tester session.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release or signing action is authorized by this v0.40 batch.



## Implemented Owner Return & Recovery Path — v0.41.0

v0.41 continues directly from v0.40 Owner First-View Decision Density. It does not add financing capability or change financing truth authority. It closes the next owner-journey gap: after entering long professional financing work, the owner must be able to get back to the capital overview without hunting for the page top or losing an unsaved draft.

### Owner-visible result

- `Back to capital overview` appears while Decision details or any professional progressive workspace is open.
- The control remains fixed inside the viewport, including narrow/mobile.
- Returning closes progressive disclosure only; it does not call a mutation API, does not re-render financing state and does not save/discard a draft.
- Return clears the section/entity hash and brings Today’s Focus + Capital Gap back into view.
- Keyboard focus is restored to the visible Today’s Focus action after return.
- A normal first load with no hash stays at the real product header; v0.41 explicitly avoids auto-jumping the initial entry down to the hero.
- Hash-change recovery to an empty hash can return to overview, while valid section and exact-item hashes still restore their workspace/item.
- Existing stale-refresh draft preservation, exact Today’s Focus navigation, owner first-view geometry and reconciliation repair behavior remain intact.

### Real built-product Chrome acceptance

Desktop 1440 × 860:

- entered Capital plan;
- preserved a real unsaved Company Profile draft;
- scrolled deep into expanded content;
- fixed return control remained visible;
- one click closed all progressive modules, cleared the hash and restored the hero;
- unsaved draft remained unchanged;
- focus restored to `#focus-action`;
- no horizontal overflow.

Mobile / narrow 390 × 844:

- entered Execute and close;
- scrolled deep into the expanded workspace;
- return control remained fully bounded inside the viewport;
- one click closed all progressive modules, cleared the hash and restored the owner hero;
- return control hid after recovery;
- focus restored to Today’s Focus;
- no horizontal overflow.

v0.40 owner first-view geometry remains unchanged:

```text
Desktop initial shell:         2,313.453125 px
Desktop owner snapshot bottom:   777.453125 px < 860 px
Mobile initial shell:          4,374.109375 px
Mobile owner snapshot bottom:  1,630.109375 px < 1,688 px
```

### v0.41 machine acceptance before documentation-sealed rerun

- package version: 0.41.0
- owner return focused contracts: PASS
- full regression suite: 239/239 PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run verify`: PASS
- built-product `npm run test:ui-browser`: PASS
- built-product `npm run test:chrome-repair`: PASS
- `git diff --check`: PASS before this documentation append

Detailed evidence: `Atlas/V0_41_OWNER_RETURN_RECOVERY_PATH.md`.

### Current completion truth — v0.41.0

- Technical Acceptance: PASS for current local v0.41 scope only after the final documentation-sealed rerun remains green.
- Business Acceptance: PARTIAL.
- Real User Experience Acceptance: NOT YET PASSED. The v0.41 checklist in `OWNER_ACCEPTANCE.md` requires an unassisted target-device owner/tester session.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release or signing action is authorized by this v0.41 batch.



## Implemented Workspace Context & Draft Continuity — v0.42.0

v0.42 continues directly from v0.41 Owner Return & Recovery Path. It does not add financing capabilities or change financing truth authority. It closes two remaining deep-work usability gaps: the owner can now see which professional workspace is current, and unsaved server-backed drafts survive a later successful save/re-render in another workspace.

### Owner-visible result

- The fixed deep-work return control names the current workspace, e.g. `Capital plan · Back to capital overview` or `Execute and close · Back to capital overview`.
- The matching owner-journey navigation button receives a restrained current state plus `aria-current=step` when applicable.
- Editing a workspace field changes the fixed context to include `Unsaved draft` before the owner leaves.
- Returning with unsaved work gives an explicit transient notice such as `Capital plan draft kept. Reopen Capital plan to continue.`
- The return action still performs no financing mutation and uses no persistent browser storage for financing truth.
- Server-rendered control baselines distinguish rendered financing state from transient owner edits.
- When a later server-state render is caused by work elsewhere, dirty server-backed controls are restored if the new authoritative render did not accept/match those values.
- If a successful save causes the server-rendered value to equal the submitted draft, that value becomes clean instead of remaining falsely marked unsaved.
- Successful form resets update their baseline on the next animation frame so intentionally cleared new-entry forms are not falsely marked dirty.

### Real Chrome acceptance

Desktop 1440×860 proves:

- Capital plan context label visible;
- Capital plan `aria-current=step` visible;
- live `Unsaved draft` state visible;
- one-step return from deep work;
- explicit kept-draft notice;
- returned draft unchanged;
- a real Financing Action save succeeds in another workspace;
- the earlier unsaved Capital plan draft remains present after that server response/re-render;
- Today’s Focus receives keyboard focus after return;
- no horizontal overflow.

Mobile 390×844 proves:

- deep Execute & close context remains inside the viewport;
- the fixed control names Execute and close;
- matching owner-navigation state is current;
- one-step return, hash clear, hero restore and Today’s Focus focus restoration remain intact;
- no horizontal overflow.

v0.40 first-view geometry remains unchanged:

```text
Desktop shell                 2,313.453125 px
Desktop snapshot bottom         777.453125 px < 860 px
Mobile shell                  4,374.109375 px
Mobile snapshot bottom        1,630.109375 px < 1,688 px
```

### v0.42 machine acceptance before documentation-sealed rerun

- package version: 0.42.0
- focused v0.39/v0.41/v0.42 contracts: 13/13 PASS
- full regression suite: 243/243 PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run verify`: PASS
- built-product `npm run test:ui-browser`: PASS
- built-product `npm run test:chrome-repair`: PASS
- `git diff --check`: PASS before documentation sealing

Detailed evidence: `Atlas/V0_42_WORKSPACE_CONTEXT_DRAFT_CONTINUITY.md`.

### Current completion truth — v0.42.0

- Technical Acceptance: PASS for current local v0.42 scope only after the final documentation-sealed rerun remains green.
- Business Acceptance: PARTIAL.
- Real User Experience Acceptance: NOT YET PASSED. The v0.42 checklist in `OWNER_ACCEPTANCE.md` requires an unassisted target-device owner/tester session.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release or signing action is authorized by this v0.42 batch.



## Implemented First-Run Single Next Move — v0.43.0

v0.43 continues from v0.42 Workspace Context & Draft Continuity and does not add a financing capability. It removes a first-run contradiction between Today’s Focus and Owner Journey and makes the empty-workspace setup path sequential and exact.

### Owner-visible result

When no higher-priority concrete financing entity is already actionable, the fresh-workspace path is now:

```text
Company Profile
→ Funding Goal
→ Capital Strategy
→ Find Money
→ later execution work
```

- Empty-workspace Today’s Focus opens the exact Company Profile form rather than only the top of Capital plan.
- The first successful Company Profile save advances to the exact Funding Goal form.
- The first successful Funding Goal save advances to Capital Strategy when the strategy is not current.
- A never-created strategy uses the owner-facing action `Calculate strategy`; existing strategy uses `Recalculate strategy`.
- After the first strategy calculation, when there is no opportunity or investor target, Today’s Focus becomes `Find the first funding target` and opens the existing Find money workspace.
- Existing urgent/dated concrete financing entities preserve their established Today’s Focus priority.
- No financing source is pursued and no application, investor contact, network action or fabricated fact is created by this guidance.

### Truth alignment

The dashboard Today’s Focus now receives the same `CapitalStrategyFreshness` projection already consumed by Owner Journey. The fallback ordering therefore cannot skip an incomplete Capital Strategy during a fresh setup path.

No new financing entity, database table, API route, browser-persistent financing truth, Agent runtime, scheduler, task engine, approval engine, audit authority, memory authority, identity authority, provider router or AI gateway was introduced.

### Real Chrome acceptance

The built local Web product proves:

```text
Today’s Focus → exact #company-form               PASS
incomplete first submit blocked                   PASS
Company Profile save → exact #goal-form           PASS
Funding Goal save → #strategy                     PASS
first button = Calculate strategy                 PASS
strategy calculate                                PASS
Today’s Focus = Find first funding target         PASS
Focus → #opportunities                            PASS
v0.42 cross-workspace draft continuity            PASS
exact-item Today’s Focus                          PASS
hash restoration                                  PASS
no horizontal overflow                            PASS
```

v0.40 geometry remains unchanged:

```text
Desktop shell                     2,313.453125 px
Desktop snapshot bottom             777.453125 px < 860
Mobile shell                      4,374.109375 px
Mobile snapshot bottom            1,630.109375 px < 1,688
```

### v0.43 machine acceptance before documentation-sealed rerun

- package version: 0.43.0
- full regression suite: 246/246 PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- built-product `npm run test:ui-browser`: PASS
- built-product `npm run test:chrome-repair`: PASS
- `git diff --check`: PASS

Detailed evidence: `Atlas/V0_43_FIRST_RUN_SINGLE_NEXT_MOVE.md`.

### Current completion truth — v0.43.0

- Technical Acceptance: PASS for current local v0.43 scope only after the final documentation-sealed rerun remains green.
- Business Acceptance: PARTIAL.
- Real User Experience Acceptance: NOT YET PASSED; the v0.43 checklist in `OWNER_ACCEPTANCE.md` still requires an unassisted target-device owner/tester session.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release or signing action is authorized or performed by this v0.43 batch.



## 2026-08-19 — v0.44 First-Run Failure Recovery

Version advanced from `0.43.0` to `0.44.0`.

This batch remains UX/recovery-only. No financing-domain capability, schema, API route, runtime authority or remote-access authority was added.

### Problem closed

v0.43 established the single empty-workspace path:

`Company Profile → Funding Goal → Capital Strategy → Find Money`

v0.44 closes the remaining failure-path ambiguity. A failed first-run Save now keeps the owner on the exact step, retains the draft, gives persistent recovery guidance, and makes stale refresh return to the same exact form.

### Product behavior

- Normal server rejection shows persistent `Not saved — your entries are still here` guidance inside the rejected form.
- Exact rejected field remains inline with `aria-invalid=true` and the server-provided error/recovery text.
- Failure handler keeps the rejected form as the active navigation/hash target.
- Stale workspace rejection shows `Changed elsewhere — your draft is still here` and points to `Refresh latest — keep draft`.
- Refresh retains unsaved controls, loads authoritative latest server state, returns to the same pending recovery form, and displays `Latest state loaded — your draft is still here` plus same-step retry guidance.
- Browser recovery state is page-memory/presentation state only; it is not financing persistence authority.

### Real browser evidence

Built local product was exercised in system Google Chrome.

Server-validation recovery:
- Funding Goal deliberately reached server validation with missing purpose.
- persistent recovery guidance visible: PASS
- exact purpose field inline error: PASS
- `#goal-form` remained active: PASS
- entered target amount retained: PASS
- correction + retry succeeded: PASS
- advanced to Capital Strategy after successful retry: PASS

Stale-workspace recovery:
- separate same-origin mutation advanced workspace revision: PASS
- stale Funding Goal Save rejected: PASS
- stale persistent recovery guidance visible: PASS
- Refresh latest — keep draft exposed: PASS
- refresh completed: PASS
- exact `#goal-form` restored: PASS
- unsaved draft preserved across refresh: PASS
- post-refresh continuation guidance visible: PASS
- retry succeeded and continued: PASS

### Regression status before final documentation-seal rerun

- targeted recovery/focus/Chrome contracts: 11/11 PASS
- full suite: 247/247 PASS
- lint: PASS
- typecheck: PASS
- build: PASS
- system Chrome UI acceptance: PASS
- reconciliation Chrome smoke: PASS
- `git diff --check`: PASS

Retained evidence:
- desktop 1440×860 first-view geometry remains within v0.40 contract
- mobile 390×844 first-view geometry remains within two-view contract
- no horizontal overflow
- v0.42 cross-workspace draft continuity still PASS
- v0.43 sequential first-run single-next-move still PASS
- exact-item Today’s Focus / hash reload still PASS
- reconciliation stale/refresh/repair/void chain still PASS

Detailed v0.44 evidence: `Atlas/V0_44_FIRST_RUN_FAILURE_RECOVERY.md`.

### Completion truth

- Technical Acceptance: PASS for the current local v0.44 scope after final seal rerun
- Business Acceptance: PARTIAL
- Real User Experience Acceptance: NOT YET PASSED
- Production Security Review: NOT ATTESTED
- Completion Level: 2
- `productionReady=false`
- `actuallyLaunched=false`
- `realUserValidated=false`
- `remoteAccess=blocked`

Automated Chrome evidence does not count as an unassisted owner validation session.

No reset, clean, destructive checkout, untracked deletion, commit, push, deploy, release or sign was performed. OpenBcon was not accessed.


## 2026-08-19 — v0.45 Owner Acceptance Readiness Gate

Version advanced to `0.45.0` for the final machine-readiness closure before unassisted owner acceptance.

No financing-domain capability was added. No API route, database schema, persistence authority or BossAI OS boundary changed.

Added an independent fresh-database system-Chrome owner-readiness mode at 390×844 via `scripts/ui-browser-acceptance.cjs --mobile-owner-readiness` and package command `npm run test:owner-mobile`.

The mobile gate exercises the actual empty-workspace sequence and recovery path:

`Company Profile → Funding Goal → validation recovery → stale-workspace recovery → Capital Strategy → Find Money`.

It proves exact-step navigation, native validation protection, persistent server-error recovery, stale revision rejection, Refresh latest — keep draft, exact-step return after refresh, retained draft values, successful retry, strategy calculation, Find Money progression and no horizontal overflow.

The first mobile-gate attempt exposed a harness timing weakness: fixed 80–160 ms waits could inspect geometry before long-distance smooth scrolling or async recovery rendering completed. The product requirement was not weakened. The harness was hardened to wait for actual target visibility and rendered recovery state. The independent 390×844 run then passed.

New unified prerequisite command:

`npm run verify:owner-readiness`

It runs full lint/typecheck/tests/build, the existing desktop/responsive Chrome acceptance, the independent mobile owner-readiness Chrome run and reconciliation Chrome smoke. `git diff --check` remains the final source-integrity check.

Current acceptance truth remains strict:

- Technical Acceptance: PASS for local v0.45 scope after final green gate;
- Machine Owner Readiness: PASS after final green gate;
- Business Acceptance: PARTIAL;
- Real User Experience Acceptance: NOT YET PASSED;
- Production Security Review: NOT ATTESTED;
- Completion Level: 2;
- `realUserValidated=false`;
- `productionReady=false`;
- `actuallyLaunched=false`;
- `remoteAccess=blocked`.

The next valid product-validation step is an actual unassisted owner/tester session against `OWNER_ACCEPTANCE.md`. Machine evidence alone cannot raise Completion Level or set `realUserValidated=true`.



## 2026-08-19 — v0.46 Internationalization & Owner-Language Retest

The first real owner acceptance attempt exposed an immediate language mismatch: the owner opened v0.45 and asked whether the product was entirely English. Treat that as real-user evidence. The v0.45 human acceptance attempt did not pass and `realUserValidated` remains false.

v0.46 introduces a presentation-layer internationalization foundation rather than a separate Chinese product fork.

Supported owner UI locales:

- Simplified Chinese (`zh-CN`)
- Traditional Chinese (`zh-TW`)
- English (`en`)
- Japanese (`ja`)
- Korean (`ko`)
- Spanish (`es`)

System/browser language is detected on first use and a visible language selector allows manual override. Only the locale code is remembered as a SameSite=Lax cookie. No financing fact, amount, decision, owner, status, source or other business state was moved into browser persistence.

Localized owner surfaces include the primary shell/navigation, Today’s Focus first-run states, owner snapshot labels, Company Profile, Funding Goal, Capital Strategy, Find Money, workspace return context, key stages, validation/stale recovery guidance and locale-aware date/USD display.

Added `npm run test:locales` using real system Chrome at 390×844. The gate switches through all six locales and verifies language selection, `html lang`, main title, Capital Plan nav, first Today’s Focus, Company name, Funding Goal, Capital Strategy, Find Money, Growth stage, reload persistence and horizontal bounds.

The locale gate exposed and fixed one real cross-language defect: Traditional Chinese `Company name` remained Simplified Chinese after sequential switching. The i18n source-text mapping was stabilized and the missing Traditional Chinese label added.

The initial locale preference used localStorage and correctly failed the project’s existing critical-state lint. The lint was not weakened. Locale persistence was moved to a cookie containing only the UI locale code.

`npm run verify:owner-readiness` now includes the six-locale Chrome gate in addition to the existing full verification, desktop/responsive Chrome, independent mobile owner journey and reconciliation Chrome smoke.

The reconciliation smoke explicitly selects English before its exact English repair-copy/currency assertions so that financing reconciliation testing is deterministic and independent from locale formatting. Locale behavior has its own dedicated Chrome gate.

Current acceptance truth after final v0.46 closure must remain strict:

- Technical Acceptance: PASS only after final green v0.46 owner-readiness gate;
- Machine Owner Readiness: PASS only after final green v0.46 owner-readiness gate;
- Business Acceptance: PARTIAL;
- Real User Experience Acceptance: v0.45 failed on language mismatch; v0.46 RETEST REQUIRED;
- Production Security Review: NOT ATTESTED;
- Completion Level: 2;
- `realUserValidated=false`;
- `productionReady=false`;
- `actuallyLaunched=false`;
- `remoteAccess=blocked`.

The next valid product-validation step after machine closure is to restart an actual unassisted owner session in the owner’s selected language. Automated locale PASS is not human acceptance.



## 2026-08-19 — v0.47 Locale Completeness & English-Leak Gate

Version advanced to `0.47.0` after a real unassisted v0.46 owner retest exposed a major UX defect: Simplified Chinese still mixed substantial English throughout deeper professional financing workspaces.

The earlier v0.46 locale Chrome smoke was too shallow. A new real-system-Chrome full-DOM audit was added at `npm run test:locale-leaks`. It compares the canonical English page against every officially selectable non-English locale across body text plus placeholder / aria-label / title / data-module-label attributes and fails closed on unchanged translatable English phrases.

Initial audit evidence quantified the v0.46 defect:

- canonical English phrases scanned: approximately 614;
- unchanged translatable English phrases in `zh-CN`: 438.

v0.47 added complete presentation-layer phrase overlays and dynamic translation handling for owner decision detail, coverage/closing, timing, blockers, owner journey, three capital tracks, fundraising round, opportunities, financing actions, investors/funds/contacts/thesis/follow-ups/meetings, applications, documents, data room, diligence, term sheets, closing conditions, Funding Outcome, receipt tranches, committed-capital arrival expectations, expectation-to-receipt reconciliation and continuity/recovery.

Dynamic render output now passes through the same translation layer, and common dynamic count/state/`Next:` patterns are localized instead of relying only on static first-run literals.

Production locale truth is now evidence-based rather than aspirational:

- `zh-CN` — 简体中文 — full-DOM unchanged translatable English leak count: 0;
- `zh-TW` — 繁體中文 — leak count: 0;
- `en` — English canonical source;
- `es` — Español — leak count: 0.

Japanese and Korean deep professional modules still contained hundreds of English fallback phrases during audit, so they are intentionally no longer exposed as production locale choices. Japanese/Korean browser preference falls back to English until complete locale packs pass the same zero-leak gate. This avoids presenting a falsely complete mixed-language product.

Locale preference remains non-critical UI state only and is stored as a same-site cookie containing only the locale code. No financing fact, draft, cash truth, identity, approval or business state is stored there.

`npm run verify:owner-readiness` now includes `test:locale-leaks` in addition to full verify, desktop/responsive Chrome, fresh-database mobile owner journey, production-locale Chrome and receipt-reconciliation Chrome.

`OWNER_ACCEPTANCE.md` was accidentally overwritten while preparing this v0.47 section. Because it was an untracked file, Git could not restore the exact prior bytes. It has been transparently reconstructed as a consolidated v0.38–v0.47 manual-acceptance document from the authoritative Atlas evidence plus preserved v0.44/v0.45 checklist content; it is explicitly not represented as a byte-for-byte recovery.

Acceptance truth remains strict pending the final v0.47 machine gate and a new human retest:

- v0.46 Real User Experience Acceptance: FAIL — mixed English in Chinese UI;
- v0.47 Real User Experience Acceptance: RETEST REQUIRED;
- Business Acceptance: PARTIAL;
- Completion Level: 2;
- `realUserValidated=false`;
- `productionReady=false`;
- `actuallyLaunched=false`;
- `remoteAccess=blocked`.


Final v0.47 machine closure is green: `git diff --check && npm run verify:owner-readiness && git diff --check` passed with 251/251 tests, lint/typecheck/build, desktop/responsive Chrome, independent fresh-database mobile journey, four-production-locale switching/reload, full-DOM zero-English-leak checks for zh-CN/zh-TW/es, and receipt-reconciliation Chrome all PASS. Technical Acceptance and Machine Owner Readiness are PASS for local v0.47 scope. Real User Experience Acceptance remains RETEST REQUIRED and `realUserValidated=false` until the owner repeats the unassisted session.



## 2026-08-20 — v0.48 Desktop Distribution + Open-Source / Commercial Licensing Preparation

CEO decisions now reflected in the working tree:

- v0.47 owner validation is explicitly confirmed by the owner as completed;
- fresh BossAI Funding installations default to English;
- the project is being prepared for public open-source release only after the desktop-installable product form is evidence-backed;
- open-source license target is `AGPL-3.0-or-later`;
- proprietary permissions outside AGPL require a separate BossAI commercial license;
- AGPL-compliant commercial activity is not falsely prohibited;
- Community AGPL distribution does not require proprietary entitlement;
- official proprietary commercial distribution must consume entitlement from the approved external BossAI commercial authority rather than creating a Funding license/payment/entitlement ledger.

v0.48 version metadata is `0.48.0`. `package.json.private=true` is retained intentionally to prevent accidental npm publication; this is unrelated to GitHub repository visibility and does not prevent an AGPL public source repository.

Desktop is implemented as a distribution shell over the canonical Funding server and SQLite state, not a second product implementation. Electron starts the existing compiled server on an OS-assigned random `127.0.0.1` port, stores SQLite under Electron per-user `userData/data/bossai-funding.sqlite`, uses a single-instance lock, keeps renderer Node integration disabled, uses context isolation/sandbox, and sends external links to the system browser.

Windows engineering packaging is implemented with Electron 43.4.1 and electron-builder 26.15.3 targeting assisted per-user x64 NSIS installation. Uninstall policy preserves owner data.

Machine evidence at this checkpoint:

- AGPL LICENSE vs GitHub standard license text: exact match / zero diff;
- focused desktop/open-source/i18n contracts: PASS;
- full test suite: 260/260 PASS;
- lint/typecheck/build: PASS;
- full owner-readiness Chrome suite: PASS;
- zh-CN / zh-TW / es full-DOM unchanged-English leak count: 0;
- development Electron smoke: PASS;
- packaged win-unpacked EXE smoke: PASS;
- real isolated NSIS lifecycle: install / first launch / single-instance rejection / save / restart persistence / uninstall data preservation / reinstall data restoration / final uninstall preservation — PASS;
- bundled Electron/Chromium license artifacts present;
- current installer SHA-256: `F22714F06F1369CF49E7A19C14FEED2DAD4F4B432B4609A88BFD54C2386C8178`;
- app EXE Authenticode: `NotSigned`;
- installer Authenticode: `NotSigned`;
- Git-history sensitive filenames: 0;
- high-risk token/private-key pattern commit hits: 0;
- OpenBcon implementation provenance hits: 0 after excluding the protective lint rule;
- repository history at scan: 2 commits, one known commit author.

The GitHub repository remains Private. Public transition is not yet authorized by this checkpoint and remains blocked on approved icon/Windows metadata, code signing for official binary release, qualified legal review of dual licensing and CLA, contributor-signing workflow, final pre-public history scan, GitHub public security-reporting controls, branch protection after CI check contexts exist, external commercial-entitlement adapter for the proprietary edition, and real owner target-device validation of the installed desktop product.

Current completion truth for v0.48:

- Technical Acceptance: PASS for the implemented local desktop/source-preparation scope;
- Machine Owner Readiness: PASS;
- v0.47 Real User Experience Acceptance: PASS (owner-confirmed);
- v0.48 Installed Desktop Real User Experience Acceptance: NOT YET PASSED;
- Business Acceptance: PARTIAL for the new desktop/commercial distribution scope;
- `productionReady=false`;
- `actuallyLaunched=false`;
- public repository visibility: not yet changed;
- official desktop release: blocked / unsigned;
- Completion Level for the current v0.48 desktop distribution remains 2 until target-device installed-product validation is completed.



## 2026-08-20 — v0.48 Human Desktop Installation Evidence

Owner-reported real-device evidence for the current Windows desktop installer:

- installation completed successfully;
- the installed BossAI Funding application opened and behaved normally;
- uninstall completed successfully.

This is valid human evidence for the basic desktop install/open/uninstall path.

It does **not** convert machine-only lifecycle checks into human claims. Restart persistence, single-instance enforcement, uninstall-data preservation, and reinstall-data recovery remain machine-verified unless separately confirmed by the owner.

Current acceptance truth:

- v0.47 owner-facing core experience: human validated by owner;
- v0.48 basic desktop installation/open/uninstall: human PASS;
- v0.48 extended desktop lifecycle persistence/reinstall: machine PASS, human not separately attested;
- code signing: NOT SIGNED;
- official application icon: NOT YET PROVIDED;
- legal review of AGPL/commercial-license/CLA structure: NOT YET ATTESTED;
- GitHub visibility: PRIVATE;
- public release: NOT YET AUTHORIZED.



## 2026-08-20 — v0.48 GitHub remote governance closure

The v0.48 desktop/open-source batch has been committed and pushed to the private canonical GitHub repository. Remote source and Windows workflows were then exercised on GitHub-hosted runners rather than relying only on local evidence.

Remote evidence:

- `Source CI / verify` on `main` — PASS;
- `Windows Desktop / desktop` on `windows-latest` — PASS after cross-platform line-ending hardening;
- Windows runner completed desktop contract verification, Electron smoke, packaging, and packaged smoke successfully;
- unsigned artifact upload is best-effort because the GitHub Actions artifact-storage quota is currently full; this no longer converts a successful product/build gate into a false failure;
- GitHub Actions were updated to current v7 major actions to remove Node 20 action-runtime deprecation warnings;
- dependency vulnerability alerts enabled and verified;
- automated security fixes enabled;
- Discussions enabled; Issues enabled;
- repository topics/description updated for the open-source product identity;
- two automatic npm major-version Dependabot PRs (TypeScript 5→7 and @types/node 24→26) were closed because the v0.48 runtime baseline is Node 24 / TypeScript 5 and major migrations require an explicit product batch; Dependabot now ignores npm semver-major updates while continuing normal maintenance.

GitHub branch protection could not be enabled while the repository remains Private under the current account plan. The API returned: `Upgrade to GitHub Pro or make this repository public to enable this feature.` The `verify` check name is now evidence-backed and must be required immediately after visibility becomes Public, before external changes are accepted.

The repository remains Private. No public release, signed release, GA claim, or production commercial entitlement claim is made by this closure.



## 2026-08-20 — v0.49 Commercial Entitlement Consumer

BossAI Funding now consumes the existing BossAI Headquarters Commerce `bossai.commercial-entitlement.v1` contract for an explicitly configured proprietary commercial distribution while preserving the Community AGPL path as the default no-entitlement/no-Headquarters path.

Authority remains external: Funding does not issue or persist customer identity, membership, license, subscription, payment, entitlement, commercial ledger or billing balance. It sends only bearer authentication plus product/install/version identifiers to `GET /api/v1/commerce/entitlement`; financing records and local SQLite business state are not sent for license validation.

Commercial startup is fail-closed before `FundingRepository` construction. It requires exact schema/product/version/installation binding, Headquarters authority identity, no Headquarters business/provider/customer-content/remote-action authority expansion, active license, active membership and `AUTHORIZED` access reason. HTTPS is required except explicit loopback development endpoints.

Community mode remains default and never calls Headquarters Commerce. Electron commercial mode may persist only a generated non-secret installation ID if one is not externally supplied. The current bearer path is runtime-injected engineering integration and is not the final production credential UX.

Final local v0.49 evidence:

- full tests 266/266 PASS;
- owner-readiness Chrome suite PASS;
- Community Electron smoke PASS;
- Commercial Electron success/denial smoke PASS;
- Community packaged EXE smoke PASS;
- Commercial packaged EXE success/denial smoke PASS;
- NSIS install/restart/uninstall/reinstall lifecycle PASS;
- installer `out/desktop/BossAI-Funding-Setup-0.49.0-x64.exe` SHA-256 `93120CBDC9E0F455470EA11474669A1AADCD5946B055CB05C3D4690EBD75CF3E`;
- installer and packaged app EXE Authenticode `NotSigned`.

Official proprietary release remains blocked on desktop account/session acquisition, secure OS credential handling, real production Headquarters paid-license acceptance, legal/commercial approval, official icon and trusted Windows code signing. Public source visibility remains a separate gated decision.


GitHub-hosted v0.49 closure is also green. Commit `597cab19135437cbbb8c85a1358c9eb209fe1a18` passed Source CI run `32336912053` and Windows Desktop run `32336929853`. The Windows runner completed Community/commercial development Electron verification, packaging, Community packaged smoke and commercial packaged entitlement success/denial smoke. Artifact upload remains a non-blocking warning because the GitHub Actions artifact quota is full. v0.49 Technical Acceptance is PASS for the implemented entitlement-consumer scope; official proprietary commercial release remains blocked by desktop account/session acquisition, secure OS credential handling, real production Headquarters paid-license acceptance, legal approval, official icon and publicly trusted Windows signing.



## 2026-08-20 — v0.50 Secure Commercial Session

BossAI Funding proprietary desktop mode now uses the existing Headquarters Commerce account/login/MFA contracts and OS-encrypted session persistence instead of requiring an operator-injected bearer token on every launch. Community remains the default AGPL distribution and performs no Headquarters account or entitlement call.

A commercial authorization hardening issue was identified in the Headquarters contract: account login may ensure an active product-license row exists, so `licenseActive=true` alone cannot prove that proprietary BossAI Funding rights were purchased. Funding therefore now requires the authoritative Headquarters membership feature `bossai-funding.commercial` in addition to active license, active membership and `AUTHORIZED` entitlement status.

Commercial desktop sequence is now: BossAI account login → optional MFA → `bossai_session_...` → Electron `safeStorage` encryption → encrypted `commercial-session.bin` → entitlement revalidation → only then Funding SQLite/Repository startup. Passwords, MFA proof, raw sessions, membership, license, payment and entitlement truth never enter Funding SQLite. The sign-in renderer is isolated and has no direct filesystem/shell/network/business authority. English is its default language with Simplified Chinese, Traditional Chinese and Spanish also available.

A stale encrypted session is removed when Headquarters returns HTTP 401; every launch still revalidates current entitlement. The environment bearer path remains an engineering override only.

Final local v0.50 evidence:

- full tests 273/273 PASS;
- all owner-readiness Chrome gates PASS;
- Community Electron smoke PASS;
- commercial environment-token success/denial smoke PASS;
- commercial safeStorage first-login/reuse/401-removal smoke PASS;
- Community packaged EXE smoke PASS;
- commercial environment-token packaged smoke PASS;
- commercial safeStorage packaged smoke PASS;
- NSIS install/restart/uninstall/reinstall lifecycle PASS;
- installer `out/desktop/BossAI-Funding-Setup-0.50.0-x64.exe` SHA-256 `835A950EFCEAF1B9267DDC166815903EE31267FBB6783D4BFEBAD70D63A7A42B`;
- installer and packaged app EXE Authenticode `NotSigned`.

Official proprietary release remains blocked on a real production Headquarters plan/account granting `bossai-funding.commercial`, paid-account E2E acceptance, legal approval, official icon, and publicly trusted Windows signing. Public source visibility remains a separate gated decision and has not been executed.


GitHub-hosted v0.50 closure is green. Commit `0304763d5aeec93ea382b01be8096693b7c53c14` passed Source CI run `32338882960` and Windows Desktop run `32338910817`. The Windows runner passed Community, commercial environment-token, and commercial safeStorage session development paths, then passed Community packaged, commercial packaged, and commercial safeStorage packaged smoke. v0.50 Technical Acceptance is PASS for the implemented secure-commercial-session scope. The repository remains Private; signed/public release readiness remains blocked by the separately recorded legal, paid-production-entitlement, official-branding, public-trust-signing, and Public-visibility security gates.


## 2026-08-20 · CEO legal-review waiver for source publication

The CEO explicitly instructed BossAI Funding to skip outside/legal-counsel approval as a source-publication gate.

Recorded truth:

- outside-counsel review of the AGPL/commercial dual-license structure is waived for source publication;
- outside-counsel review of the contributor-rights draft is waived for source publication;
- no repository text may claim lawyer approval;
- AGPL-3.0-or-later remains the canonical open-source license;
- the contributor-rights workflow remains inactive/fail-closed until BossAI approves final contributor terms and an operational signing/check workflow exists;
- external PRs may be reviewed but must not be merged while that workflow is inactive;
- source publication remains separate from publicly trusted Windows signing, official Funding release branding/icon, and production proprietary-commercial paid-account acceptance.

Decision record: `Atlas/CEO_LEGAL_REVIEW_WAIVER_2026-08-20.md`.
