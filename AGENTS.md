# BossAI Funding Project Directive

This repository is the independent commercial implementation of BossAI Funding.

## Authority

Obey, in order:

1. `C:\Users\42059\Projects\Atlas\COMPANY_CONSTITUTION.md`
2. `C:\Users\42059\.codex\AGENTS.md`
3. `D:\BossAI-Projects\AGENTS.md`
4. this file and project Atlas records

## Clean-room boundary

The directory below is forbidden as an implementation source and MUST NOT be opened, searched, diffed, indexed, copied, adapted, translated, ported, imported, or inspected while working on this repository:

`D:\BossAI-Projects\OpenBcon`

Do not use any OpenBcon source, tests, schema, migrations, prompts, documentation, text, assets, UI components, styles, API shapes, or Git history.

Allowed inputs are the BossAI Funding product specification, BossAI-owned requirements, general funding-domain knowledge, official public documentation, independently designed UX, and license-compatible third-party dependencies.

## Product boundary

BossAI Funding is an owner-facing financing decision and execution workspace. It is not an Agent Platform and must not create a second Agent Runtime, scheduler, approval engine, memory system, provider router, AI gateway, points ledger, billing authority, or generic task authority.

Bounded matching, analysis, summaries, and document generation are AI Features. A future financing AI Employee must execute through BossAI OS and an independent `bossai.agent-plugin.v1` plugin.

## Product truth

The default user is an enterprise owner/founder. The primary entry must answer:

- How much capital is still needed?
- Which capital sources are worth pursuing?
- What is the single most important action today?
- Why has capital not arrived yet?

Do not optimize for consultant, CRM administrator, or platform administrator workflows.

## Engineering rules

- TypeScript first and strong domain types.
- SQLite is the Phase 1 source of truth for critical financing state.
- Server APIs own critical mutations; browser storage may hold only non-critical UI preferences or drafts.
- Domain logic must be testable independently of HTTP and UI.
- Matching and strategy rules must be explainable and auditable.
- Legal-sensitive output must never be presented as legal advice.
- Prefer MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, or ISC dependencies.
- Do not introduce AGPL, GPL, SSPL, or other strong-copyleft dependencies without explicit CEO approval.

## Identity and tenant boundary

BossAI Funding must not become a second account, subscription, license, or identity authority. Follow `IDENTITY_TENANT_CONTRACT.md`, `TENANT_SCOPING_MIGRATION.md`, `AUTHORIZATION_POLICY.md`, and `SECURITY_REVIEW_READINESS.md`. Every `/api/*` route must be registered in the Route Security Manifest; unclassified APIs fail closed. State-changing APIs must preserve the same-origin/JSON browser request-integrity boundary and may not add a permissive form/text mutation bypass. Remote access remains fail-closed until an approved external identity authority cryptographically verifies principals, the BossAI Funding authorization policy is enforced on that verified principal, required security review passes, and tenant-scoped persistence/negative tests remain green.

## External funding-source safety

Before adding or changing an external funding-data integration, read `DATA_SOURCES.md` and record the source contract there. Only owner-entered/manual data, official public data with compatible terms, or BossAI-approved licensed data may be ingested. Preserve source identifiers, retrieval time, attribution and terms references. Do not add silent scraping or let source refresh overwrite an owner's financing decision.

## Git safety

Do not run `git reset`, `git clean`, destructive checkout, or delete unrelated untracked work. Do not push, deploy, release, or sign without explicit authorization.

## Completion discipline

Every report must distinguish Technical Acceptance, Business Acceptance, and Real User Experience Acceptance. Passing tests/build/lint is not product completion. `OWNER_ACCEPTANCE.md` is the required manual target-device evidence template before `realUserValidated=true` or a Completion Level increase.
