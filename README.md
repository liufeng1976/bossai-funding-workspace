# BossAI Funding

BossAI Funding is an owner-facing financing decision and execution workspace for planning capital needs, evaluating funding sources, moving applications and investor relationships, tracking closing conditions, reconciling committed/received capital, and preserving an auditable financing history.

> Current source line: **v0.52.x / BossAI Community Source License 1.0** — source available, not OSI Open Source. Personal, educational, evaluation, research, and other non-commercial use is permitted under `LICENSE`; commercial use of current revisions requires BossAI authorization. Historical `v0.51.0` and earlier AGPL rights remain preserved in `LICENSE_HISTORY.md`.

## What it helps an owner answer

- How much capital is still needed?
- Which Grant / Debt / Equity sources are worth pursuing?
- What is the single most important financing action today?
- Why has capital not arrived yet?
- Which committed receipts are scheduled, overdue, over-scheduled, or still unallocated to actual cash?

## Core product areas

- Capital strategy and funding goal
- Grant / Debt / Equity opportunity evaluation
- Investor CRM and follow-up
- Applications, materials and data room
- Due diligence and term-sheet tracking
- Closing-condition register
- Funding Outcome as final financing authority
- Explicit arrival expectations and receipt-tranche reconciliation
- Owner/board summary and CSV export
- Local backup / restore and audit-oriented continuity

## Receipt truth and arrival schedules

BossAI Funding keeps three facts separate:

1. **Committed capital** — supported by commitment evidence.
2. **Expected receipt** — an explicit payer/closing-supported amount and date; it is not cash and is not a guarantee.
3. **Actual receipt** — banked cash recorded as a Receipt Tranche with evidence.

Actual cash never silently fulfills an Arrival Expectation. Only an explicit owner-confirmed Allocation links a Receipt Tranche to the expectation it fulfilled. If actual cash arrives while the old future schedule is still fully recorded, BossAI Funding surfaces a critical over-scheduled reconciliation blocker instead of double-counting future cash.

## Community and commercial distribution

The default `community` runtime remains local/offline and does not contact BossAI Headquarters Commerce merely to run eligible Community use. That technical behavior does **not** grant commercial-use rights.

Commercial use of the current Community Source line requires a BossAI commercial license or approved commercial entitlement. Explicit proprietary/commercial distribution continues to consume the canonical Headquarters entitlement contract and fails closed when authorization is absent or cannot be verified.

See:

- `LICENSE`
- `LICENSE_HISTORY.md`
- `COMMERCIAL_LICENSE.md`
- `COMMERCIAL_ENTITLEMENT_BOUNDARY.md`

## Run from source

Requirements:

- Node.js 24+
- npm

```bash
npm ci
npm run verify
npm start
```

The default local runtime binds to loopback and uses SQLite for financing state.

## Windows desktop

BossAI Funding includes an Electron/NSIS Windows desktop path that reuses the same Funding server and SQLite authority. The renderer is isolated, business data is stored under the app user-data directory, and uninstall policy preserves user data.

A public-source release does **not** imply a publicly trusted signed Windows installer. Official signed distribution remains separately gated by Authenticode/publisher identity and release approval.

## Security and authority boundaries

BossAI Funding must not become a second authority for:

- identity or account ownership;
- subscription / membership;
- payment / billing;
- license or entitlement issuance;
- Agent Runtime, generic task/scheduler, memory, AI Gateway or Provider Router.

Commercial identity and entitlement remain external BossAI authority concerns. Financing-domain persistence remains owned by BossAI Funding.

## Contributions

External contributions are governed by `CONTRIBUTING.md`, `CLA.md`, and the protected `contributor-rights` status. The active CLA is versioned for the current Community Source + separate commercial/proprietary distribution model.

## Historical license line

`v0.51.0` and repository revisions at or before commit `6600da2899d83eddcfc43efbc2d81805d662d77a` were published under `AGPL-3.0-or-later`. Rights already granted for those historical copies remain governed by that AGPL grant and are not revoked by the current license change.

## Status

The public repository is source-available and independently implemented. Community/source publication is separate from production/GA, signed Windows distribution, or commercial customer-readiness claims.
