# BossAI Funding Architecture

## Architectural intent

BossAI Funding is an independent owner-facing business application. It owns financing-domain data and workflow state for this product, but it does not own company-wide Agent runtime, model routing, approval, memory, points, billing, or generic task authority.

## Phase 1 topology

```text
Browser
  ↓ HTTP / JSON
BossAI Funding Server
  ├── API routing
  ├── Funding domain services
  │   ├── Capital strategy rules
  │   ├── Today's Focus prioritization
  │   └── Dashboard projections
  └── SQLite repository
        ├── company_profile
        ├── funding_goal
        ├── fundraising_round
        ├── funding_action
        └── capital_strategy
```

## Runtime

- Node.js 24+
- TypeScript source
- Native `node:sqlite` database
- No application runtime dependency is required for Phase 1 beyond Node itself.
- TypeScript compiler and Node type declarations are development-only dependencies.

## Domain boundaries

### Company Funding Profile

Unified financing fact source used by strategy, matching, readiness, and future document generation.

### Funding Goal

Represents the owner's overall capital need and timing.

### Fundraising Round

Represents a formal equity or mixed financing campaign with target, commitment, receipt, valuation, close date, and use of funds.

### Funding Action

Phase 1 execution primitive scoped to BossAI Funding only. It is not a company-wide task authority. It records a financing-specific next step across Grant, Debt, or Equity.

### Capital Strategy

A deterministic, explainable recommendation. Rules are auditable inputs/outputs and intentionally separated from future AI narrative features.

### Dashboard Projection

Read model derived from persisted facts. It computes target, received, committed, active pipeline, remaining gap, track summaries, and Today's Focus.

## Capital strategy rule design

Phase 1 uses deterministic rules before any model-based analysis:

1. Establish requested capital and time horizon.
2. Reserve a non-dilutive share when the company has sufficient lead time and a plausible innovation/policy-funding profile.
3. Cap debt by explicit owner repayment capacity and by a conservative fraction of capital need.
4. Allocate the residual need to equity.
5. If dilution is rejected, shift equity capacity toward debt/non-dilutive within repayment and timing constraints and expose any unfunded residual as a strategy risk.
6. Explain every allocation and its trade-offs.

Future AI narration may summarize or explain these rules through the BossAI AI Execution Gateway, but it may not replace the persisted numeric truth or invent a black-box score.

## Today's Focus algorithm

The domain service ranks persisted actions using explicit factors:

1. overdue / near deadline incomplete action
2. high-value stage waiting on response, meeting, diligence, terms, or close
3. high-priority saved/ready action
4. equity follow-up
5. discovery action
6. profile/goal setup fallback

The returned focus includes reason, urgency, track, action ID when applicable, and a concrete next step.

## HTTP API

Phase 1 endpoints:

- `GET /api/bootstrap` — complete dashboard and editable facts
- `PUT /api/company-profile`
- `PUT /api/funding-goal`
- `POST /api/rounds`
- `POST /api/capital-strategy/recalculate`
- `POST /api/actions`
- `PATCH /api/actions/:id`
- `GET /api/health`

The browser UI consumes the same endpoints tested by integration and journey tests.

## Persistence and schema

SQLite is the source of truth for critical financing state. Schema initialization is idempotent. Foreign keys are enabled. Monetary values are stored as integer cents to avoid floating-point accounting errors.

Browser localStorage may be introduced later only for non-critical UI preferences or drafts.

## Security posture for Phase 1

This is a local functional MVP, not production-ready SaaS. Phase 1 deliberately does not claim authentication, tenant isolation, encryption-at-rest, production secrets management, rate limiting, or hardened deployment.

Production exposure is blocked until those controls are designed and accepted.

## BossAI OS boundary

Phase 1 contains no Agent runtime. Future persistent financing digital employees must be implemented as an independent `bossai.agent-plugin.v1` and executed through BossAI OS / Hermes. Bounded analysis or document generation remains an AI Feature and must use the approved BossAI AI Execution Gateway when added.
