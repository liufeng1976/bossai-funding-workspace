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

## Update rule

Add a dated entry whenever a new external implementation source, dependency, public specification, or material architectural influence is introduced.
