# BossAI Funding Architecture

## Architectural intent

BossAI Funding is an independent owner-facing financing business application. It owns financing-domain facts and execution state for this product, but it is not an Agent Platform and does not own company-wide Agent runtime, generic task/scheduler authority, approval, memory, provider routing, AI gateway, points, billing, license, or commercial-account authority.

Persistent financing digital employees, if introduced later, must execute through BossAI OS / Hermes as independent `bossai.agent-plugin.v1` plugins. Bounded matching, analysis, summarization, and document assistance remain AI Features and must use the approved BossAI AI Execution Gateway when model execution is added.

## Current topology — Phase 1 through Local Tenant-Scoped Persistence

```text
Owner Browser
  ↓ HTTP / JSON
BossAI Funding Server
  ├── API routing and validation
  ├── Funding domain layer
  │   ├── Capital Strategy
  │   ├── Today's Focus
  │   ├── Dashboard Projection
  │   ├── Equity Pipeline Summary
  │   ├── Explainable Opportunity Matching
  │   ├── Funding Source Provenance
  │   ├── Funding Readiness
  │   ├── Data Room Readiness
  │   ├── Term Sheet Comparison
  │   └── Funding Activity History
  ├── Continuity layer
  │   ├── JSON funding export
  │   ├── verified local SQLite backup
  │   └── pre-restore backup + validated recovery
  ├── owner-initiated source adapters
  │   └── Grants.gov official public API
  ├── identity / tenant integration boundary
  │   ├── stable local workspace_id + funding_workspace binding
  │   ├── workspace-scoped repositories and linked-record ownership checks
  │   ├── workspace-scoped export / backup / restore
  │   ├── external principal contract (verification not implemented)
  │   └── remote enablement gate (blocked)
  ├── local security boundary
  │   ├── loopback bind enforcement
  │   ├── Host validation
  │   └── browser security headers
  └── SQLite — financing source of truth
        ├── company_profile
        ├── funding_goal
        ├── fundraising_round
        ├── funding_action
        ├── capital_strategy
        ├── fund / investor / contact / investment_thesis
        ├── financing_meeting / investor_follow_up
        ├── funding_opportunity / opportunity_match
        ├── funding_source_record
        ├── funding_application
        ├── funding_document
        ├── data_room / data_room_folder / data_room_document
        ├── due_diligence_request
        ├── term_sheet / funding_outcome
        ├── funding_activity
        └── app_metadata
```

## Runtime

- Node.js 24+
- TypeScript with strict compiler settings
- Native `node:sqlite`
- No third-party application runtime package
- Development dependencies only: TypeScript, Node type declarations, and their type dependency
- Server-rendered static shell plus typed browser TypeScript compiled during build

## Money and persistence rules

- SQLite is the source of truth for critical financing state.
- Monetary values are persisted as integer cents.
- Critical financing state must not be stored only in browser `localStorage`.
- Schema initialization is idempotent and foreign keys are enabled.
- Continuity schema version is `10`; every database carries a stable generated `workspace_id` plus a `funding_workspace` binding. Schema 5 added nullable Term Sheet `target_close_date`; schema 6 added the financing-specific `term_sheet_closing_condition` register; schema 7 added Funding Outcome evidence references; schema 8 added the financing-specific `funding_receipt_tranche` register for partial cash receipts; schema 9 added the financing-specific `funding_receipt_expectation` register for explicit committed-capital arrival checkpoints; schema 10 adds explicit owner-confirmed allocation links between Arrival Expectations and actual Receipt Tranches. Current builds accept schema 4/5/6/7/8/9/10 recovery points. A pre-schema-8 Outcome with received capital is migrated into one equal receipt tranche using the exact saved amount, received date, and receipt evidence reference; no bank evidence is invented. A pre-schema-9 recovery point restores with an empty arrival schedule. A schema-9 recovery point restores with an empty allocation register: BossAI Funding never synthesizes a receipt-to-expectation match from amount or date. All 27 financing business tables enforce `workspace_id NOT NULL` at the SQLite schema layer and retain workspace insert/update/reference guards as defense in depth.
- Browser storage, if introduced later, is limited to non-critical UI preference or temporary draft state.

## Domain boundaries

### Company Funding Profile

Unified owner-controlled financing fact source used by strategy, readiness, Grant/Loan/Investor matching, document preparation, and future bounded AI Features.

### Funding Goal

Represents how much capital is needed, why it is needed, when it is needed, dilution preference, repayment capacity, and growth plan.

### Fundraising Round

Represents a formal equity financing campaign with target, minimum, committed, received, valuation, target close date, status, and use of funds.

### Funding Action

A financing-specific execution record across Grant, Debt, or Equity. It is not a generic company task state machine.

### Equity Pipeline

`Fund`, `Investor`, `Contact`, and `InvestmentThesis` are first-class financing-domain entities. `FinancingMeeting` and `InvestorFollowUp` record financing execution only; they do not create a second CRM platform or generic scheduling authority.

The fixed investor pipeline supports:

```text
Target → Research → Ready to Contact → Contacted → Replied → Meeting
→ Partner Meeting → Due Diligence → Term Sheet → Negotiation → Committed → Closed
```

with terminal alternatives `Passed`, `No Response`, and `Not a Fit`.

### Funding Opportunity

One persisted `FundingOpportunity` represents a Grant, Loan, or Investor opportunity. Common discovery/matching facts are shared, while type-specific terms remain explicit.

Matching is deterministic and evidence-first. A persisted `OpportunityMatch` contains every evaluated rule, its result, explanation, corrective action, blockers, missing facts, a fit classification, and an auxiliary 0–100 score. The score is not the decision authority and must never hide the underlying rules.

### Funding Source Provenance

Every Funding Opportunity has a source classification and provenance record. `funding_source_record` stores provider key, source kind (`manual`, `official-public`, or `licensed`), external identifier/number, canonical source URL, API endpoint when applicable, terms URL, retrieval timestamp, and attribution.

The first external adapter is the official public Grants.gov API. It is owner-initiated only: there is no background crawling or startup ingestion. The adapter uses the documented `search2` endpoint to find posted/forecasted opportunities and `fetchOpportunity` for detail, caps each owner search at 10 results, maps source data into the existing Grant opportunity model, and leaves absent source facts absent. External execution is bounded: each request has a 12-second timeout, the complete owner search has a 20-second budget, and detail hydration uses at most four concurrent requests while preserving search order. A budget/source failure uses the existing source-unavailable recovery path and does not trigger automatic retry storms or overwrite prior owner decisions. The owner UI keeps source availability transient: a failure shows an inline recovery state, confirms saved opportunity decisions are unchanged, preserves the query, and offers manual `Try again`; raw upstream exception text is not shown as the owner-facing API error.

### Opportunity deadline viability / source-fact authority

`projectOpportunityDeadlineViability` is a current-time projection over every Funding Opportunity deadline. It uses four states:

```text
undated
open
due-soon
deadline-passed
```

A `deadline-passed` Opportunity remains persisted and may remain `saved` / `pursuing` as a recovery relationship, but it is **not** counted as current `In motion` capital until a current cycle/extension is recorded. This prevents an expired source from inflating Capital Pipeline Truth or Coverage. An already-created active Application is different: once a real Application exists, that Application remains the more-specific pipeline evidence even if the source Opportunity's original application deadline has passed.

Past-deadline pursuing Opportunities are urgent recovery Focus candidates and critical Capital Blockers with explicit extension/new-cycle/refresh/dismiss recovery language. They do not satisfy current `Find money` / `Choose what to pursue` Owner Journey readiness by themselves. Capital Timing still shows the past deadline as an overdue milestone so the missed date remains operationally visible.

The browser suppresses historical match-score authority on a past-deadline Opportunity, labels the record `DEADLINE PASSED`, and states that its amount is excluded from `In motion`. A manual-source Opportunity can correct its deadline through the record UI. An `official-public` or `licensed` source cannot overwrite source-managed Opportunity facts through the normal Opportunity PATCH route; only owner-controlled decision/internal link fields remain mutable there. Official/licensed facts must change through the corresponding source refresh/import path. Rejected source-fact edits return `409 SOURCE_FACTS_READ_ONLY` without advancing workspace revision.

Owner / Board Summary excludes past-deadline pursuits from current Top Opportunities and lists them separately as recovery items.

Source refresh and owner decision are separate authorities. A refresh may update title, provider, dates, amounts, eligibility summary or other official source facts, but it must preserve an existing owner `saved`, `pursuing`, or `dismissed` decision.

Manual opportunities receive a manual provenance record. Future external adapters require an official-public or licensed source contract recorded in `DATA_SOURCES.md` before admission.

### Funding Readiness

Funding Readiness evaluates whether the current Company Funding Profile has enough factual coverage to support matching and execution. Missing facts are surfaced with a concrete correction rather than being silently guessed.

### Funding Application

Represents an actual financing application or submission lifecycle. It can link to a Funding Opportunity and records requested/approved amount, deadline, owner, next action, submission/decision dates, status, and rejection reason.

It is a financing-domain workflow record, not a generic Task platform.

### Document Workspace

`FundingDocument` is a versioned financing material record for Pitch Deck, Executive Summary, Business Plan, Financial Model, Use of Funds, Funding Memo, Grant Narrative, Loan Package, Investor Update, Due Diligence material, or other financing documents.

A document has explicit version, status, completion percentage, last modification timestamp, and optional links to a fundraising round, investor, or application.

### Data Room

`DataRoom` is a financing diligence workspace. Creating a room automatically establishes the eight standard categories:

```text
Corporate
Financial
Legal
Product
Customers
Team
IP
Fundraising
```

`DataRoomDocument` records missing/preparing/ready/shared/expired state and optional expiry dates. Data Room completion is category-coverage based, so a single ready document cannot incorrectly produce 100% readiness while other categories are empty.

### Due Diligence

`DueDiligenceRequest` links an Investor, optional Fundraising Round, optional Funding Document, owner, deadline, request, response notes, and fixed status:

```text
Requested → Preparing → Ready → Shared → Accepted
                                ↘ Needs Revision
```

Diligence deadlines participate in Today's Focus.

### Term Sheet

`TermSheet` persists investment amount, pre-money valuation, equity percentage when known, liquidation preference, board terms, pro-rata, vesting, option pool, exclusivity, closing conditions, status, and notes.

The comparison service organizes economic and governance differences, estimates ownership when sufficient inputs exist, and surfaces caution flags. It always returns:

```text
lawyerReviewRequired = true
```

and an explicit statement that the comparison is not legal advice and cannot determine the legally best term sheet.

### Term Sheet closing date discipline

`TermSheet.targetCloseDate` is the owner-recorded target for completing closing, not a predicted wire/receipt date. It is nullable so migrated historical Term Sheets do not acquire invented timing facts.

Active `received`, `reviewing`, `negotiating`, and `accepted` Term Sheets project this date into Today's Focus and Capital Timing. A past target close date raises the Term Sheet blocker to critical and keeps the exact Term Sheet actionable until a Funding Outcome resolves the Investor path. If no target close date or dated investor move exists, the existing Timing projection continues to flag the Term Sheet as undated.

The Term Sheet card exposes owner correction of target close date and status through the existing PATCH route. Funding Outcome remains authoritative after resolution; resolved historical Term Sheets keep the recorded target close date but no longer drive current Focus, blockers, or timing milestones.

Continuity schema 5 was the first financing recovery-shape change since schema 4. Schema 6 adds the structured closing-condition table while keeping schema 4 and 5 recovery points readable by the current build.

### Closing Condition Register

`ClosingCondition` is a **Term-Sheet-specific financing record**, not a generic task/workflow object. Each condition belongs to exactly one Term Sheet and records only the closing facts needed to prevent a financing close from drifting:

```text
title
owner
due date
open / in-progress / satisfied / waived
evidence note
```

`open` and `in-progress` remain active closing work. `satisfied` and `waived` are cleared only when an evidence note is recorded; the server rejects a cleared state without evidence. Active conditions participate in Today's Focus, Capital Blockers, Capital Timing and exact-item navigation. Overdue conditions outrank their parent Term Sheet as the concrete closing blocker. Undated active conditions are surfaced as missing-date work rather than silently treated as healthy.

Clearing every condition does **not** prove legal closing, commitment, or cash receipt. Qualified counsel remains required for material legal terms, and `FundingOutcome` remains the final financing-state authority. Once a Funding Outcome resolves the Investor path, closing-condition history remains persisted but stops driving current Focus, blockers, timing and Board Summary counts.

The persistence table is `term_sheet_closing_condition`. It is tenant-scoped, guarded by a same-workspace `term_sheet_id` reference, included in continuity export/backup/restore, and covered by workspace revision triggers. Schema 6 introduced this register. The current schema 10 build also contains the receipt-tranche, committed-capital arrival, and explicit expectation-to-receipt allocation registers described below; the current hardening boundary is 27 tenant-scoped business tables, 34 declared same-workspace reference guards and 81 revision triggers.

### Funding Outcome

`FundingOutcome` closes the financing loop with `Won`, `Lost`, `Withdrawn`, or `Closed` status and explicit approved, committed, and received amounts.

Funding Outcome evidence is part of the financing truth boundary. Any new or corrected Outcome with `committedAmountCents > 0` must carry a non-empty `commitmentEvidence` reference. Any Outcome with `receivedAmountCents > 0` must additionally carry a received date and a non-empty `receiptEvidence` reference. These fields store a concise reference or evidence note (for example an award notice, signed closing reference, bank transaction reference, or settlement reference); they are not an attachment store and do not replace the underlying legal, banking, award, or settlement record.

Legacy Outcomes are handled conservatively. Schema 7 adds the two evidence columns with empty defaults, so old committed/received amounts remain intact rather than being silently deleted or rewritten. The product does not invent evidence for them. An old Outcome with missing required evidence becomes an exact `funding-outcome` Today's Focus candidate and Capital Blocker, and the Outcome card exposes direct correction controls. Received-capital evidence gaps are urgent/critical; commitment-only evidence gaps remain high priority. Once the references are supplied, that remediation work disappears without changing the recorded amount merely to satisfy the evidence check.

A Funding Outcome remains the current financing-state authority for its linked path even while an evidence or receipt-reconciliation gap is being repaired. Historical Application/Investor/Term Sheet cards therefore remain resolved by that Outcome, but they also expose when the Outcome's supporting evidence is incomplete. Owner / Board Summary publishes the same evidence-completeness truth.

### Receipt tranche reconciliation

`FundingReceiptTranche` is a financing-specific receipt fact for partial settlement of a Funding Outcome. Each active tranche records an exact amount, received date, receipt-evidence reference, and optional note. A tranche may be `voided` only with a reason; voiding preserves the historical row but removes its amount from received capital. This register is not a general accounting ledger, accounts-receivable system, or bank feed.

Once a receipt register exists, `FundingOutcome.receivedAmountCents` is a derived aggregate: it must equal the sum of active `received` tranches. The Outcome's received date becomes the latest active tranche date. Direct correction of the Outcome received aggregate is rejected; the owner must correct the specific tranche. Active tranche totals may never exceed committed capital. A lost/withdrawn Outcome cannot receive or retain an active cash tranche.

Creating a Funding Outcome with an initial received amount creates the first tranche transactionally from that exact amount/date/evidence. Schema 7 recovery points with an existing received aggregate migrate to schema 8 by creating one equal tranche using the saved amount/date/evidence. Missing old evidence remains missing; BossAI Funding never synthesizes a bank reference merely to complete migration.

### Committed capital arrival schedule

`FundingReceiptExpectation` records only an explicit arrival checkpoint for capital that is already committed but not yet received. Each active expectation has an amount, expected receipt date, basis/source note, responsible owner, and optional follow-up note. The expected date must come from a payer confirmation, signed closing schedule, award notice, or equivalent recorded financing evidence. It is not derived from stage, probability, historical duration, or model output and is never presented as a guarantee.

The schedule is deterministic against each Funding Outcome: `outstanding = committed - received`. Active expectations may be `unscheduled`, `partial`, `balanced`, or `over-scheduled`. A new or corrected active expectation cannot cause the schedule to exceed the current outstanding commitment. Actual Receipt Tranches remain authoritative: if real cash arrives later and makes an old schedule over-scheduled, the cash receipt succeeds and the stale arrival plan becomes exact urgent reconciliation work. BossAI Funding does not auto-match an expected item to a real tranche and does not silently mark an expectation fulfilled.

An expectation may be `cancelled` only with a reason. Cancelled rows remain historical but no longer contribute to the active schedule, Timing milestone, or expected amount. Overdue active expectations become exact `receipt-expectation` Today's Focus / Capital Blocker items. A commitment with no explicit arrival date remains a timing blind spot; a balanced future schedule explains the cash gap but does not count as received capital. Only an actual Receipt Tranche changes `receivedAmountCents`.

### Explicit expectation-to-receipt reconciliation

`FundingReceiptExpectationAllocation` records only an owner-confirmed relationship between an actual Receipt Tranche and an Arrival Expectation. BossAI Funding never infers this link from matching amount, date, payer name, stage, or model output. The relationship supports partial and many-to-many settlement: a single expectation may be fulfilled by several actual tranches, and one tranche may be explicitly divided across multiple expectations when the owner knows that allocation.

An active allocation must link an `expected` expectation and a `received` tranche from the same Funding Outcome. The active allocated total cannot exceed either the expectation amount or the actual tranche amount. Only valid active allocations reduce the remaining amount of a specific expectation. An allocation may be voided only with a reason and remains historical; the relationship IDs are immutable so a wrong link is voided and replaced rather than silently moved.

Actual cash remains authoritative. Correcting or voiding a Receipt Tranche is never blocked merely because an allocation points to it. If that change invalidates an existing allocation, the actual receipt update succeeds and the linked expectation becomes an exact allocation-reconciliation Focus/Blocker. This prevents a planning relationship from overriding banking truth.

Successful standalone Grant or Debt outcomes contribute to the CEO Capital Command Center. Outcomes linked to a Fundraising Round are not added a second time, preventing double counting.

Failure outcomes retain loss reason, feedback, and retry date for financing review.

Continuity schema 10 accepts schema 4/5/6/7/8/9/10 recovery points. `funding_receipt_tranche`, `funding_receipt_expectation`, and `funding_receipt_expectation_allocation` are tenant-scoped. The allocation table has same-workspace guards to both its expectation and tranche references. A schema-8 backup restores an empty expectation register; a schema-9 backup preserves expectations and actual tranches but restores an empty allocation register rather than inventing matches. The current boundary is 27 business tables, 34 declared same-workspace reference guards, 81 revision triggers and 53 registered API routes, with `GET /api/health` remaining the only public route.

## Capital Strategy

Capital Strategy is deterministic and explainable before any model-based narration:

1. establish total capital need and timing;
2. reserve a plausible non-dilutive share when lead time and company facts support it;
3. cap debt by owner-stated repayment capacity and conservative limits;
4. allocate residual need to equity;
5. when dilution is rejected, reallocate only within the stated repayment/timing constraints;
6. expose any remaining unfunded residual rather than hiding it;
7. explain allocation rationale and risk.

Future model narration may explain persisted strategy output but must not replace the numeric truth with a black-box recommendation.

### Capital Strategy freshness

A persisted allocation is not automatically treated as current forever. `projectCapitalStrategyFreshness` recomputes the deterministic strategy in memory from the current Company Profile, Funding Goal, constraints, and current time, then compares the semantic output (need, allocations, residual, assumptions, warnings) with the stored strategy.

Freshness states are:

```text
not-created
no-goal
current
recalculate
```

Company Profile and Funding Goal mutations already refresh Opportunity Matches. If a Capital Strategy exists, those same owner mutations now also synchronize the persisted strategy when its semantic output changes. The synchronization records a Funding Activity event. If no strategy has ever been calculated, profile/goal editing does not silently create one; the owner still explicitly starts the strategy workflow once.

Bootstrap performs a read-only freshness projection even after automatic synchronization. This catches old databases, abnormal/direct persistence changes, and time-sensitive strategy rules such as the existing under-60-day grant-allocation rule. A read that detects stale strategy does **not** silently overwrite it. The UI marks the stored allocations `RECALCULATE`, visually downgrades them as historical/out-of-date output, and requires recalculation before they are used as a current decision input.

Owner Journey treats `Capital plan` as complete only when the strategy freshness state is `current`. Owner / Board Summary publishes the same freshness state, generated time, current need, and reason so exports cannot silently present an out-of-date allocation as current.

Opportunity Match does not need a parallel input-change stale-state mechanism because the existing server already recomputes all Opportunity Matches after Company Profile or Funding Goal changes and recomputes the affected match after Opportunity/source refresh. Time passage can still invalidate deadline assumptions without any write; the independent current-time Opportunity Deadline Viability projection supersedes stale deadline authority in pipeline, focus, blocker, journey, UI and reporting paths without mutating stored match history on read.

## Today's Focus

Today's Focus is a deterministic owner-priority projection. Candidate sources now include:

- financing applications;
- due diligence requests;
- dated Funding Actions;
- investor follow-ups;
- financing meetings;
- active term sheets under review/negotiation;
- active investor next actions;
- saved/pursuing Funding Opportunities;
- company/goal setup fallbacks.

Deadline tiers are authoritative: overdue and near-deadline unfinished financing work cannot be displaced by a lower-urgency item merely because it has a larger amount or stage score.

The UI receives the reason, destination section, and—when Today's Focus is backed by a concrete financing record—a stable `entityType` + `entityId` reference. Concrete focus records also project `workStatus`, `workOwner`, and `workDueAt` from persisted financing facts. Missing facts remain `null` and are shown as `Not recorded`; the projection does not infer an owner for meetings, opportunities, or term sheets. The owner action resolves that exact rendered record first, visibly highlights it, and falls back to the broader section only for setup/general guidance. Navigation writes a non-business URL hash so reload can resume the same financing item after bootstrap; stale hashes are cleared if the item no longer exists. No resume location is persisted as financing business state.

## Capital Pipeline Truth — what counts as in motion

`projectCapitalPipelineTruth` is the single dashboard counting method for `In motion` capital and Grant/Debt/Equity potential amounts. It prefers the most-specific recorded financing evidence and suppresses known linked duplicates rather than adding every layer together.

Known de-duplication rules:

- Grant/Debt Application replaces its linked Opportunity;
- when a Grant/Debt track has Application/Opportunity evidence, unlinked generic Funding Actions are not stacked on top and are used only as a fallback when no more-specific evidence exists;
- active Term Sheet replaces the same Investor's cheque-range estimate;
- other Investors without a Term Sheet remain counted independently;
- multiple active Term Sheets for one Investor use only the latest record;
- multiple Equity Applications resolving to the same linked Investor collapse to the most recent application evidence;
- pursuing Investor Opportunities linked to an already-counted Investor are not added again;
- known approved Application amount replaces requested amount when approval is recorded;
- terminal funded/rejected/withdrawn applications and rejected/expired Term Sheets do not count as in-motion capital;
- once a Funding Outcome resolves a linked Application or Investor, that resolved path is removed from `In motion` so received/committed capital is not counted again beside its old pipeline record;
- after any Outcome exists on a capital track, generic unlinked Funding Actions on that track are not used as amount fallback unless a more-specific new Opportunity/Application/Investor/Term record exists. This conservative rule avoids claiming that an unlinked generic action is definitely a separate source.

Every track exposes `evidenceKinds` plus `pipelineExplanation` in the owner UI and Owner/Board Summary. The de-duplicated evidence records are also projected internally for Capital Coverage / Closing Plan. This is deliberately conservative where the model lacks a link: BossAI Funding does not guess that an unlinked Funding Action represents a different financing source merely to make the pipeline number larger.

## Capital Coverage & Closing Plan

`projectCapitalCoveragePlan` converts the same de-duplicated pipeline evidence into owner-visible coverage and closing facts without producing a fundraising success probability.

The dashboard separates four amounts/ratios:

- **Cash received coverage** — only money recorded as received;
- **Received + committed coverage** — received plus recorded committed-but-not-received capital;
- **Recorded reach including In motion** — received + committed + the current de-duplicated pipeline, capped at 100% only for the displayed percentage;
- **Still uncovered after current pipeline** — the target amount remaining even if every current In motion item closed at its recorded amount.

Coverage states are distinct:

```text
no-target
cash-covered
secured
pipeline-covered
pipeline-shortfall
```

`cash-covered` requires cash received to cover the target. `secured` means received + committed covers the target while some cash may still need to arrive. `pipeline-covered` means the recorded pipeline is large enough on paper to cover the remaining target, but the product explicitly does not assume that pipeline closes.

`Closest to cash` is a deterministic stage-ordering aid, not a predictive score. Recorded committed-but-not-received capital ranks first, then specific financing evidence such as accepted/negotiating/reviewing Term Sheets, approved/under-review/submitted Applications, and later/earlier Investor stages. The list exposes at most three items. Exact records reuse the existing entity anchors; aggregate recorded commitment falls back to the Execute & close section because the accounting projection may aggregate multiple sources.

For a Term Sheet, remaining closing steps are no longer maintained as a second generic checklist when structured Closing Conditions exist. `projectCapitalCoveragePlan` reads the same register used by Focus/Blocker/Timing:

- active conditions are listed in due-date order with their recorded owner and due date;
- the plan retains counsel/evidence requirements after listing those exact conditions;
- if every recorded condition is cleared but no Funding Outcome exists, the plan explicitly says the cleared register does not itself prove closing and requires the remaining definitive-document/settlement evidence;
- if no structured register exists, the first remaining step is to record the material closing conditions rather than pretending a generic template is the actual deal state.

This keeps `Closest to cash` aligned with the authoritative recorded closing facts while preserving stage ordering as a workflow-ordering aid rather than turning condition status into a success probability.

The mandatory disclaimer states that In motion is not a probability-weighted forecast, commitment, or guarantee. No model-generated success probability, likelihood percentage, or synthetic confidence score is produced.

## Funding Outcome Resolution

A persisted `FundingOutcome` is the current financing-state authority for the Application and/or Investor explicitly linked to that Outcome. Historical execution records are preserved, but they must not continue competing as current work after the financing path has a recorded Outcome.

`src/domain/resolution.ts` provides the shared deterministic projection used by pipeline truth, Today's Focus, Capital Blockers, Equity Pipeline Summary, and Owner/Board Summary. It derives:

```text
resolvedApplicationIds
resolvedOpportunityIds (through resolved Application → Opportunity)
resolvedInvestorIds
latest Outcome by Application
latest Outcome by Investor
```

Resolution semantics:

- a resolved Application and its linked Opportunity leave current Today’s Focus / blocker / In motion projections;
- a resolved Investor removes that Investor, its pending follow-ups, scheduled meetings, due-diligence requests, and Term Sheets from current Today’s Focus / blockers / active Equity summary;
- unrelated financing paths remain active and can still outrank each other under the normal priority rules;
- raw Application, Investor, Meeting, DD, and Term Sheet records are not deleted or silently rewritten. They remain historical financing evidence;
- the browser marks core resolved records with `Resolved by Funding Outcome` and shows received/committed Outcome facts; historical next-step text is explicitly labeled historical rather than current;
- Equity Pipeline Summary exposes resolved Outcome-linked Investors separately from active Investors;
- Owner/Board Summary uses the same resolution projection, so its Active Application / Investor / DD counts and top current opportunities agree with the dashboard.

Funding Outcome itself remains correctable through the existing `PATCH /api/outcomes/:id` mutation. The owner UI exposes status, committed amount, commitment evidence, and Application/Investor/Round linkage correction. Received cash is tranche-managed in schema 8: the Outcome card shows the received aggregate read-only, while amount/date/receipt-evidence corrections are made on the specific Receipt Tranche. Clearing an incorrect Outcome link still reactivates the open financing record automatically through projection; no database repair or record recreation is required.

Outcome correction is fail-closed on accounting contradictions:

- received capital cannot exceed committed total;
- when an approved amount is recorded, committed capital cannot exceed it;
- positive received capital requires an actual received date;
- lost/withdrawn financing cannot retain committed or received money.

A rejected correction leaves the prior persisted Outcome and all derived dashboard state unchanged.

## Capital Timing & Deadline Discipline

`projectCapitalTimingPlan` is the deterministic owner-time projection for funding execution. It does not predict a financing close date or success probability. It only compares dates already recorded by the owner/product.

The timing plan uses:

- Funding Goal `needByDate`, falling back to the Company Profile target-funding date when the goal has no date;
- the saved Company Profile `runwayMonths` plus the profile update time to produce a clearly labeled runway calendar estimate;
- Funding Action deadlines;
- pursued Opportunity deadlines;
- pending Investor Follow-up dates and Investor next-follow-up dates;
- scheduled Financing Meetings;
- active Application deadlines;
- open Due Diligence deadlines;
- active Fundraising Round target-close dates.

The runway calendar value is an estimate derived from a saved input, not a live cash-flow model. The dashboard preserves the profile save time beside the estimate and explicitly states that it does not forecast cash flows, financing close dates, or funding success.

Timing states are:

```text
no-target-date
cash-covered
past-need-date
runway-before-need
near-term
dated
```

`no-target-date` is intentionally not treated as healthy. `cash-covered` means cash received already covers the recorded funding target; remaining dates are still shown as operational milestones. `runway-before-need` means the calendar estimate derived from the saved runway input falls before the recorded need-by date and therefore requires the owner to recheck cash/runway inputs and financing timing. `near-term` means the need-by date is within 30 days; it does not imply that any financing will close by then.

The projection separately exposes:

- overdue milestone count;
- milestones due in the next 14 days;
- active high-value financing items with no date;
- up to eight next/overdue dated milestones;
- up to eight active undated items.

Outcome Resolution applies before timing projection. Once a Funding Outcome resolves a linked Application or Investor, its old Application/Opportunity/Investor/Follow-up/Meeting/Due-Diligence/Term-Sheet work no longer appears as current timing work. Historical records remain persisted and visible elsewhere.

Exact dated or undated items reuse the existing `entityType` + `entityId` anchors. Non-entity timing facts such as the overall funding need or round target-close date fall back to the relevant owner section.

## Capital Blockers — Why capital has not arrived

`projectCapitalBlockers` is a deterministic financing-domain projection over the same persisted owner facts used by the dashboard. It does not create a second task engine or infer hidden causes.

It can surface, in severity order:

- missing company/goal facts;
- overdue financing actions, applications, investor follow-ups, or diligence requests;
- active Term Sheets whose closing has not been recorded;
- committed capital that has not yet been received;
- a funding target with no capital source in motion;
- discovered sources with no pursue decision;
- selected targets with no concrete execution record;
- submitted/under-review applications waiting on an external decision;
- high-value investor relationships with no dated next move.

Each blocker contains a reason, concrete next step, and—when backed by a specific record—the existing `entityType` + `entityId` reference so the owner can open the exact financing item. Only the five highest blockers are shown. Once the recorded target is fully covered, the projection returns no blocker rather than manufacturing more work.

## Owner UI

The default entry is the CEO Capital Command Center, not a SaaS admin console. It answers:

- How much capital is still missing?
- How much is received, committed, or moving?
- Which Grant, Debt, or Equity track is moving?
- What is the single highest-value action today?
- Why has the capital not arrived yet?
- Which opportunities are actually worth pursuing, and why?
- Which investor should be followed up?
- Which application, material, diligence request, or term sheet is blocking funding?
- What capital has actually arrived?

A six-stage owner navigation keeps the journey visible:

```text
Capital plan → Find money → Move actions → Investors → Execute & close → History & safety
```

A separate deterministic `OwnerJourneyProgress` projection answers whether the first-run owner has actually established the core path:

```text
Capital plan → Find money → Choose what to pursue → Move the financing → Protect the work
```

Each step exposes completion truth, why it is incomplete, the next action, and the exact product destination. This projection is intended to reduce first-run ambiguity; it is not a replacement for human target-device acceptance.

## HTTP API groups

Core:

- `GET /api/health`
- `GET /api/bootstrap`
- `PUT /api/company-profile`
- `PUT /api/funding-goal`
- `POST /api/rounds`
- `POST /api/capital-strategy/recalculate`
- `POST/PATCH /api/actions`

Equity:

- `POST /api/funds`
- `POST/PATCH /api/investors`
- `POST /api/contacts`
- `POST /api/investment-theses`
- `POST/PATCH /api/meetings`
- `POST/PATCH /api/follow-ups`

Opportunity:

- `POST/PATCH /api/opportunities`
- `POST /api/opportunities/recalculate`
- `POST /api/sources/grants-gov/search` — explicit owner-triggered official Grant search/import

Execution:

- `POST/PATCH /api/applications`
- `POST/PATCH /api/documents`
- `POST /api/data-rooms`
- `POST/PATCH /api/data-room-documents`
- `POST/PATCH /api/due-diligence`
- `POST/PATCH /api/term-sheets`
- `POST/PATCH /api/outcomes`

Every mutation returns an updated owner state so the dashboard and Today's Focus can immediately reflect persisted changes.

Continuity / handoff:

- `GET /api/continuity/export`
- `GET /api/continuity/backups`
- `POST /api/continuity/backup`
- `POST /api/continuity/restore`
- `GET /api/reports/capital-pipeline.csv`
- `GET /api/reports/owner-board-summary.md`
- `GET /api/security/identity-boundary`
- `GET /api/security/tenant-scope`
- `GET /api/security/authorization-policy`

### Funding Activity History

`funding_activity` records owner-visible financing business changes such as strategy recalculation, investor movement, application updates, diligence, term sheets, outcomes, backup, and recovery. It is deliberately scoped to the BossAI Funding business journey and is **not** a second company-wide Audit authority.

### Continuity and recovery

The local file-backed build can export a workspace-scoped JSON funding snapshot and create native SQLite backups using Node's built-in `node:sqlite.backup` API. A backup copy is pruned to the active workspace, reopened read-only, checked with SQLite `integrity_check`, verified against product/schema/workspace/tenant metadata, and only then exposed as a recovery point.

Restore is fail-safe within the current schema version:

1. validate the requested backup file name against the controlled backup directory;
2. reopen the backup read-only;
3. verify SQLite integrity, product identity, schema version, and required business tables;
4. require the backup `workspaceId` and `tenantId` to match the active workspace binding;
5. create and verify an automatic `pre-restore` backup of the current workspace;
6. replace only active-workspace rows from the explicit BossAI Funding business-table whitelist in a transaction;
7. preserve every other workspace row and binding;
8. record the restore in the active workspace Funding Activity History.

A failed restore transaction rolls back instead of leaving a partially restored financing database. Cross-workspace tests verify restoring Workspace A does not overwrite Workspace B changes.

### Production identity / tenant integration boundary

`IDENTITY_TENANT_CONTRACT.md` defines a consumption-only identity boundary. BossAI Funding does not issue passwords, customer accounts, commercial licenses, or subscriptions. A future approved upstream identity authority must authenticate the human and provide a verified principal with `subject`, `tenantId`, `roles`, `issuer`, and `authenticatedAt`.

The current runtime exposes an identity-boundary status projection but does not accept browser-supplied identity as authorization. The local server path binds Core, Equity, Opportunity, Execution, Source, Activity and Continuity operations to the server-controlled active `workspace_id`. Numeric linked IDs are checked for active-workspace ownership before mutation; unavailable/cross-workspace IDs use the same non-enumerating `STALE_REFERENCE` response.

Cross-workspace negative tests now cover Profile, Investor, Opportunity, Application, DD, Term Sheet, Closing Condition, Funding Outcome, Receipt Tranche, Receipt Expectation, explicit Expectation→Receipt Allocation, external-source identity, forged tenant/workspace headers, JSON export, SQLite backup and restore preservation. `GET /api/security/tenant-scope` exposes the current hardening truth: all 27 business tables require workspace scope and database workspace/reference guards are installed.

Local tenant-scoped persistence is now database-hardened: all 27 business tables require workspace scope, Repository/continuity paths are scoped, and direct-SQL workspace/reference bypasses are rejected. Remote enablement nevertheless remains blocked because no approved real external identity provider/verifier has been configured and no production security review has passed. The gate cannot be raised merely because local persistence and injected-verifier authorization tests pass.

### Identity verifier and authorization enforcement boundary

`src/server/identity-verifier.ts` defines a provider-neutral `IdentityVerifier` contract. BossAI Funding does not parse a raw browser claim into authority. An approved adapter must return a `VerifiedExternalPrincipal` plus explicit evidence that signature/key, issuer, audience, and temporal validity checks were performed, with revocation checking when required by the configured policy. BossAI Funding then checks issuer allowlist, required audience, authentication age, expiry/clock skew, and revocation requirements before product authorization.

`AUTHORIZATION_POLICY.md` defines the deny-by-default product matrix. Recognized roles are `owner`, `editor`, and `viewer`; unknown roles have no authority. API work is classified into `read`, `mutate`, `export-summary`, `export-data`, `backup`, and `restore`. Full data export, backup, and restore are owner-only; editors can read/mutate/export summaries; viewers are read-only.

`src/server/api-security-manifest.ts` is now the single route-classification source. There is no method-based permissive fallback. Every supported `/api/*` route must be registered explicitly before execution. An unregistered API fails closed and records `unclassified-api` security evidence. In verified-external mode this rejection occurs before the identity verifier is called, so a valid owner identity cannot rescue an unclassified handler.

Only `GET /api/health` is anonymous in verified-external mode. Identity, authorization, tenant-scope, verifier, and security-review status endpoints are `read` routes and therefore require a verified viewer/editor/owner. Local-owner loopback access remains unchanged.

The default runtime is `local-owner`. A `verified-external` runtime can be constructed only when both an `IdentityVerifier` and an `IdentityVerificationPolicy` are injected. In that mode every protected API request is checked before the financing route executes. Automated HTTP acceptance covers unverified identity, wrong tenant, viewer mutation, editor full-data export, protected security-status reads, unclassified API denial, and allowed owner mutation.

The standalone executable parses `BOSSAI_FUNDING_AUTHORIZATION_MODE` fail-closed. `local-owner` is supported; `verified-external` without an injected approved adapter is a startup error, and unknown values do not silently fall back.

`GET /api/security/authorization-policy` exposes the active enforcement mode and continues to report `productionAuthorizationReady=false`. `GET /api/security/identity-verifier` exposes the adapter-contract readiness while explicitly reporting that no production cryptographic provider is configured. `GET /api/security/review-readiness` projects implemented local controls and remaining production blockers and must continue to report `status=not-approved` and `remoteAccessDecision=blocked` until a real security review is attested.

### Local browser request integrity

Local-owner mode is not treated as permission for arbitrary web origins to mutate localhost. After Route Security Manifest classification and before external identity verification, every state-changing `/api/*` request passes a browser-integrity boundary:

- `POST` / `PUT` / `PATCH` / `DELETE` require `application/json`;
- cross-site Fetch Metadata is rejected;
- `no-cors` and navigation mutation modes are rejected;
- when `Origin` exists, it must match the current loopback `Host` exactly;
- native/CLI clients may omit `Origin` but still require JSON for mutation;
- denied requests create security-decision evidence and cannot reach financing Repository mutations.

This protects the unauthenticated local-owner runtime from browser simple-request/localhost mutation attempts while preserving same-origin BossAI Funding UI calls and controlled native automation. Security responses also include same-origin resource policy, origin-agent clustering, and restrictive permissions policy.

### Workspace revision and stale-write protection

BossAI Funding maintains a database-backed workspace revision for owner-facing concurrency safety. All 27 financing business tables are covered by INSERT/UPDATE/DELETE revision triggers, so the revision advances from database-level business changes rather than relying on individual HTTP handlers.

Browser mutations (`mutate`, `backup`, `restore`) submit `x-bossai-workspace-revision`. Missing browser revision fails with `428 WORKSPACE_REVISION_REQUIRED`; an old revision fails with `409 STALE_WORKSPACE_STATE`. The browser can refresh current state while preserving unsaved control drafts. A mutation coordinator serializes concurrent state-changing browser requests so two tabs submitting the same revision cannot both commit. Native/CLI JSON clients without browser-origin signals remain compatible with the local integration boundary.

The revision readiness projection verifies 27 tracked business tables and 81 installed database triggers and is included in `/api/security/review-readiness`. Canonical triggers are rebuilt at server construction and every state-changing request rechecks that all 81 remain installed; an incomplete revision guard returns `503 WORKSPACE_REVISION_GUARD_UNAVAILABLE` before financing persistence.

In `verified-external` mode, authentication and tenant/role authorization precede revision disclosure. Restore keeps the current revision authority rather than importing the backup's old concurrency state; applying restored business rows advances revision, making all pre-restore browser tabs stale. Owner JSON export excludes revision metadata, while native SQLite backup retains only the active workspace revision after tenant pruning.

### Startup security invariants

The Route Security Manifest is validated before startup performs tenant schema preparation. Server construction then re-validates the hardened tenant state before returning an HTTP server. Startup fails if manifest keys/signatures collide, `/api/health` is not the only anonymous route, route samples are ambiguously classified, any scoped table remains nullable/missing, workspace/reference guards are incomplete, rows lack workspace scope, foreign-key violations exist, or local remote eligibility is accidentally raised.

These are runtime gates, not only test assertions. The current startup projection reports one public route, 27 hardened business tables, 27 workspace guards, 34 reference guards, and zero foreign-key violations.

### HTTP resource bounds

`src/server/http-resource-limits.ts` centralizes bounded local HTTP resource use. The current server explicitly configures 16 KiB maximum headers, 100 headers, a 10-second header timeout, a 30-second request timeout, a 5-second keep-alive timeout, 100 requests per socket, and a 1,000,000-byte JSON body ceiling. Oversized headers are rejected by the Node parser with `431`; oversized financing JSON fails with `413 REQUEST_TOO_LARGE` before persistence.

These controls reduce local process-exhaustion risk but do not constitute production public rate limiting or abuse-control approval.

### Security decision evidence

`security_decision_event` records BossAI Funding authorization decisions only: subject, tenant, issuer, effective role, identity state, operation, route, allow/deny result, reason, adapter key, and timestamp. This is local product security evidence, **not** a second BossAI company-wide Audit authority.

Security decision history is excluded from owner-restorable financing snapshots so Restore cannot erase access-control evidence. Native SQLite backups retain only active-workspace security events and prune other workspace events. Restore keeps the already validated `funding_workspace` binding in place and updates its metadata rather than deleting/reinserting it, preventing the security-event foreign key from cascading the history away.

Local security evidence is intentionally bounded rather than acting as an unlimited audit log. Each workspace retains at most the newest 5,000 decision events; startup/repository construction immediately prunes an older over-limit workspace, and each subsequent record maintains the cap. Subject/tenant/issuer/method/path/reason/adapter text is also bounded before persistence. Retention pruning is workspace-local and is surfaced in `/api/security/review-readiness`. Enterprise/compliance retention remains outside BossAI Funding and belongs to the approved BossAI-wide audit/logging authority.

### Field-level save recovery

Request validation errors now retain an explicit financing field identifier. High-frequency owner forms map server field names back to the visible control, mark that field invalid, show the correction next to it, preserve all entered values, and permit immediate retry. Stale foreign-key references remain a separate `STALE_REFERENCE` conflict so the owner can select the current linked record without rebuilding the draft.

### Owner / board summary handoff

`GET /api/reports/owner-board-summary.md` creates a deterministic summary from persisted financing facts: capital position, Today's Focus, three-track status, execution counts, top evaluated opportunities, source provenance and decision disclaimers. It does not use model narration and does not replace source notices, legal review or professional advice.

### Target-device owner acceptance

`OWNER_ACCEPTANCE.md` defines the manual, unassisted target-device journey for Capital Plan → official source search → owner decision → execution → handoff → recovery. Automated tests are prerequisites only; they cannot set `realUserValidated=true` or raise Completion Level without actual completed human evidence.

## Allocation Integrity under Corrections — v0.34

v0.34 keeps the Continuity schema at 10 and adds no persistence table or API route. It hardens the existing `FundingReceiptExpectation` / `FundingReceiptExpectationAllocation` / `FundingReceiptTranche` truth chain under corrections.

- An Arrival Expectation cannot be reduced below its active explicit Allocation total. The write fails closed before persistence, so the financing state and workspace revision do not change.
- An Arrival Expectation with active Allocations cannot be cancelled. The owner must explicitly correct or void those Allocation records first; BossAI Funding never auto-voids an owner-confirmed relationship.
- The active committed-capital arrival schedule uses the **remaining expectation amount**, not the original recorded amount: recorded expectation amount minus valid explicit receipt allocations. Fully fulfilled expectations therefore contribute zero future scheduled amount.
- Persistence capacity validation uses the same remaining-amount projection. Valid explicit fulfillment releases future schedule capacity for a new/corrected expectation; a reconciliation-invalid Allocation does not silently release that capacity or count as fulfilled cash.
- Allocation correction revalidates both sides while excluding the Allocation being edited from the capacity calculation. The corrected amount must fit the remaining expectation capacity and the remaining unallocated Receipt Tranche capacity, and the relationship cannot be moved to another expectation/tranche.
- Actual cash remains authoritative. A Receipt Tranche correction, void, or reinstatement is not rejected merely because an existing Allocation would become inconsistent. Instead, the Allocation history remains present and the domain projection becomes `allocation-error`; Today's Focus and Capital Blockers point to the affected Arrival Expectation / Allocation for repair.
- A Receipt Tranche whose active Allocation total now exceeds its corrected cash amount is treated as reconciliation-invalid. Invalid Allocation amounts no longer reduce the future schedule until the owner corrects or voids them.
- The owner UI shows **Expected total**, **Explicitly allocated actual cash**, and **Remaining expectation** separately. Allocation-integrity failures are labeled **RECONCILIATION REQUIRED** rather than being presented as a normal future schedule.
- The Owner / Board Summary reports the original/recorded expectation amount, explicitly allocated actual cash, remaining scheduled amount, and the exact Allocation IDs requiring reconciliation.

The current machine boundary remains Continuity schema 10, 27 tenant-scoped business tables, 27 workspace guards, 34 declared same-workspace reference guards, 81 revision triggers, 53 registered API routes, and one public route (`GET /api/health`).

## Allocation Reconciliation Repair Guidance — v0.35

v0.35 keeps the v0.34 integrity rules but closes the owner-repair gap after a reconciliation failure. It adds no persistence table, migration, route, background worker, accounting engine, or automatic matching behavior.

- The server projects `FundingReceiptAllocationReconciliationIssue` records into the existing Bootstrap state. UI, Today's Focus, Capital Blockers, and Owner / Board Summary therefore consume one deterministic reconciliation authority instead of duplicating repair logic in the browser.
- Each repair constraint identifies its kind, affected Arrival Expectation(s), Receipt Tranche when applicable, exact Allocation IDs, recorded allocated amount, amount supported by the current financing fact, and the minimum amount that must be corrected.
- When a Receipt Tranche is corrected below its active Allocation total, the minimum required reduction is the exact excess: `active allocations - current received cash`. The product does not mark any particular Allocation as the one to remove when several owner-confirmed links share that Receipt.
- Allocation cards show the **current maximum supported amount for this link**, calculated from both remaining expectation capacity and remaining actual-receipt capacity after excluding the Allocation itself. This is guidance only; no repair is applied automatically.
- Receipt Tranche cards show total explicit Allocations, current unallocated cash capacity, and any open repair constraint. Arrival Expectation cards show the same repair constraint alongside Expected total / Explicitly allocated actual cash / Remaining expectation.
- Today's Focus and critical Capital Blockers state the minimum correction amount and affected Allocation IDs. Actual cash remains authoritative; repair guidance never asks the owner to rewrite a true bank receipt merely to satisfy a plan.
- The Owner / Board Summary records every open repair constraint and explicitly states that BossAI Funding does not choose which owner-confirmed relationship to remove.
- Legacy or abnormal `cancelled expectation + active Allocation` states are not treated as clean history. They remain reconciliation-required Focus / critical Blocker work until the active Allocation relationship is explicitly corrected or voided.

The v0.35 Bootstrap payload shape gains a deterministic projection only; recovery shape does not change. Continuity therefore remains schema 10 and the security boundary remains 27 tenant-scoped business tables, 27 workspace guards, 34 reference guards, 81 revision triggers, 53 API routes, and one public route.

## Owner-Controlled Reconciliation Repair Drafting — v0.36

v0.36 reduces the owner's repair-entry friction without weakening the v0.35 truth boundary. It adds no persistence table, migration, API route, automatic reconciliation decision, background process, Agent runtime, or generic workflow authority.

- An invalid active Allocation can expose **Draft supported amount**. This fills only the visible Allocation amount control with the current server-state-supported maximum for that link. It does not send a request or change persisted financing facts.
- An invalid active Allocation can expose **Draft void**. This changes only the visible status control to `voided` and moves focus to the void-reason field. BossAI Funding does not synthesize a reason and does not persist the void until the owner supplies the real reason and chooses **Save link**.
- Every repair panel explicitly states that drafting is non-persistent. The existing Allocation PATCH remains the only write path and revalidates workspace revision, expectation capacity, Receipt Tranche capacity, relationship immutability, and required void reason.
- `currentMaximumSupportedReceiptAllocation` is a browser convenience projection over the currently loaded authoritative Bootstrap facts. It excludes the current active Allocation from both capacity sides before calculating the maximum that one link can safely retain. The server remains authoritative at save time.
- Existing stale-workspace recovery now preserves the unsaved repair draft across Refresh. After the latest Bootstrap state is rendered, the retained draft is compared with the newly loaded supported capacity. If it is now too high, the UI states the exact excess and the current supported amount instead of silently accepting or discarding the owner's work.
- A stale repair draft cannot overwrite newer actual-cash facts. The normal `x-bossai-workspace-revision` precondition continues to return `409 STALE_WORKSPACE_STATE`; the owner must refresh and review before retrying.
- The repeatable `scripts/chrome-repair-smoke.cjs` gate drives the built local product through system Chrome using the Chrome DevTools Protocol with no added npm browser dependency. It validates supported-amount drafting, no persistence before Save, stale-revision rejection, draft preservation/revalidation after Refresh, successful refreshed repair, draft-void behavior, required real void reason, and final reconciliation clearing.

Recovery shape and security topology do not change in v0.36. Continuity remains schema 10; the hardening boundary remains 27 tenant-scoped business tables, 27 workspace guards, 34 reference guards, 81 revision triggers, 53 API routes, and one public route (`GET /api/health`).

## Reconciliation Repair Impact Preview — v0.37

v0.37 adds an owner-visible preview over an unsaved v0.36 repair draft. It remains a browser convenience over the currently loaded Bootstrap facts and does not become a financing truth authority, persistence path, or validation bypass.

- The preview appears only after the Allocation amount/status draft differs from persisted state. No draft means no impact preview.
- It shows the currently persisted active amount versus the drafted active amount for this Allocation.
- It projects the Arrival Expectation's active allocated amount and remaining expectation after the drafted link change, using the other currently loaded active links unchanged.
- It projects the Receipt Tranche's active allocated amount and remaining current cash capacity after the drafted link change. A voided Receipt exposes zero current cash capacity; the preview does not resurrect voided cash.
- `Loaded-facts capacity check` states only whether the draft fits the relationship/status/capacity facts currently loaded in the browser. It deliberately does not say the financing state is finally repaired.
- `Save prerequisites` surfaces obvious local blockers before the owner tries Save: missing owner void reason, non-positive active amount, or a draft that no longer fits the loaded financing facts. Otherwise it says the draft is ready to submit for server validation.
- The preview explicitly states `Preview only — nothing is saved`, that actual Receipt cash is unchanged by the draft, and that newer facts may still cause the server to reject the eventual save.
- Existing workspace-revision, relationship immutability, status, expectation-capacity, Receipt-capacity, and void-reason checks remain the only persistence authority.
- The system-Chrome gate now verifies exact preview values across supported-amount draft, stale Refresh, refreshed supported draft, and Draft void, including transition from `Owner void reason still required before Save` to `Ready to submit for server validation` after the owner enters a reason.

Recovery shape and security topology do not change in v0.37. Continuity remains schema 10; the hardening boundary remains 27 tenant-scoped business tables, 27 workspace guards, 34 reference guards, 81 revision triggers, 53 API routes, and one public route (`GET /api/health`).

## Security and release posture

The current product is a local functional MVP, not a production-ready SaaS or public release. It has database-hardened local workspace isolation and a tested authorization enforcement implementation, but it does not yet claim production authentication, production remote tenant authorization, encryption-at-rest approval, production secrets management, rate-limit/abuse-control readiness, public deployment, security-review approval, or real-user validation.

Until external authentication verification, verified-principal authorization enforcement, and production security review exist, the server fails closed to local loopback only:

- startup rejects non-loopback bind hosts;
- request `Host` headers must resolve to `localhost`, `127.0.0.1`, or `::1`;
- responses use CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, same-origin opener policy, and no-referrer policy.

This is an explicit exposure boundary, not a substitute for future production authentication or tenant isolation. Those remain release blockers for remote or SaaS deployment.

## BossAI OS boundary

BossAI Funding contains no Agent runtime, generic scheduler, generic approval engine, provider router, memory authority, points ledger, or billing authority.

If a future financing digital employee gains persistent triggers, tools, memory, approvals, audit, task recovery, and autonomous execution, it must be an independent `bossai.agent-plugin.v1` executed through BossAI OS / Hermes. BossAI Funding remains the owner-facing financing product and financing-domain source of truth.
