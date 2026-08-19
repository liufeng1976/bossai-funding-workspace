# BossAI Funding v0.39 — Owner Workspace Progressive Disclosure

Date: 2026-08-19
Product: BossAI Funding
Version: `0.39.0`

## Batch preflight

- Highest commercial goal: make BossAI Funding feel like the owner's daily capital decision workspace rather than a long financing administration backend.
- Largest current owner-value gap: v0.38 real Chrome measurement showed an initial rendered page height of about 21,203.56 px on desktop and 35,048.75 px on narrow/mobile because professional forms, registers, history and closing/reconciliation controls were all expanded at once.
- User problem solved: the owner can read the primary capital truth first and enter any professional workspace in one step, while all financing capabilities and persisted facts remain intact.
- Scope: UI progressive disclosure, owner navigation integration, resumable hash navigation, exact-item reveal, draft-preserving refresh compatibility, real Chrome page-height evidence, regression contracts.
- Out of scope: new financing capabilities, new persistence, new API routes, financing-fact storage in browser preferences, generic task/runtime/scheduler/approval/audit/memory authority, Agent runtime, production identity provider, remote enablement.
- Claimed completion level remains 2. Automated Chrome evidence does not count as unassisted real-owner acceptance.

## Implemented owner workspace disclosure

1. The owner entry continues to expose Today’s Focus, Capital Gap, Why capital hasn’t arrived, Capital Timing and Three Capital Tracks without requiring the owner to open a professional module.
2. Seven professional workspaces remain discoverable by visible headings but start collapsed: Capital strategy, Capital plan, Find money, Move actions, Investors, Execute and close, History and safety.
3. No financing form, register, history list or execution capability was deleted. Existing Company Profile, Funding Goal, Opportunity, Equity, Application, Data Room, Due Diligence, Term Sheet, Closing Condition, Funding Outcome, Receipt Tranche, Arrival Expectation and Expectation/Receipt Allocation controls remain in the DOM and use the existing server APIs.
4. Owner navigation opens the selected professional workspace and closes the previously open professional workspace. This is UI disclosure only; it does not create a second navigation/task/runtime state authority.
5. URL hash navigation opens the containing workspace before scrolling. `#opportunities` reload restores Find money; exact item hashes such as `#funding-action-1` restore the containing professional workspace and the exact financing item.
6. Today’s Focus exact-item navigation now opens the containing collapsed module before highlighting and centering the financing entity.
7. Receipt Tranche and Expectation/Receipt Allocation exact anchors are included in the same financing-item reveal path used by existing outcome/expectation/action/investor/application/diligence/term-sheet/closing-condition anchors.
8. Disclosure state is transient presentation state. No financing fact and no module-open state was added to browser local/session persistence.
9. Existing stale-workspace refresh continues to capture and restore controls. Real Chrome proves an unsaved Company Profile draft survives module collapse, latest-state Refresh, and reopening.
10. The existing v0.36/v0.37 reconciliation repair Chrome gate now enters Execute and close through the owner navigation before asserting visible repair guidance, so progressive disclosure cannot invalidate the real repair acceptance path.

## Measured initial page-height reduction

Measured against the same built local Web product, same system Chrome/CDP harness and the v0.38 baseline:

```text
Desktop 1440 × 860
v0.38 initial shell height: 21,203.5625 px
v0.39 initial shell height:  4,460.46875 px
reduction:                  79.0%

Mobile / narrow 390 × 844
v0.38 initial shell height: 35,048.75 px
v0.39 initial shell height:  9,807.6875 px
reduction:                  72.0%
```

The gate requires the initial height to remain below 50% of the v0.38 baseline on both desktop and mobile. This is a regression contract, not a claim that shorter is always better.

## Real Chrome interaction evidence

System Chrome through CDP passed all of the following on the built product:

- desktop and mobile screenshots captured from the actual local Web runtime;
- no horizontal overflow;
- Today’s Focus / Capital Gap / blockers / Three Capital Tracks remain exposed;
- all seven professional module headings remain discoverable while initially collapsed;
- owner nav opens Capital plan in one step and keeps unrelated professional modules collapsed;
- native required-field validation still blocks incomplete Company Profile mutation;
- real Company Profile save passes;
- real Funding Goal save passes;
- an unsaved Company Profile draft remains intact through collapse + latest-state Refresh + reopen;
- a critical near-deadline Funding Action becomes exact Today’s Focus;
- its containing Move actions module can be collapsed, then Today’s Focus opens it and navigates to the exact item;
- owner nav opens Find money and records `#opportunities`;
- `#opportunities` reload reopens only the Find money module and persists saved company/goal/dilution facts;
- exact `#funding-action-1` reload reopens only Move actions and restores the exact item into view.

## Reconciliation repair regression evidence

The built-product system-Chrome repair smoke remains PASS after progressive disclosure:

- $100,000 Allocation with $50,000 current Receipt support surfaces `RECONCILIATION REQUIRED` after Execute and close is opened through owner navigation;
- Draft supported amount produces $50,000 preview only and does not persist;
- newer actual cash correction to $40,000 makes the old Save stale and preserves authoritative cash truth;
- Refresh keeps the $50,000 draft and shows the exact $10,000 over-support warning;
- redraft to current $40,000 support passes loaded-facts preview and saves explicitly;
- voided underlying Receipt produces Draft void with no invented reason;
- missing owner void reason fails closed;
- explicit owner void reason saves;
- final reconciliation issues = 0.

Actual Receipt cash remains authoritative throughout.

## Machine contracts and acceptance

- package version: `0.39.0`
- progressive-disclosure contract: 5/5 PASS
- formal full regression suite before documentation sealing: 232/232 PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run verify`: PASS
- built-product `npm run test:ui-browser`: PASS
- built-product `npm run test:chrome-repair`: PASS
- `git diff --check`: PASS before documentation sealing

A final documentation-sealed rerun is still required after this record is appended to current state; the session report must use that latest rerun.

## Persistence and security boundary

No financing persistence model, API topology or production-security authority was changed by v0.39.

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

## Completion truth

- Technical Acceptance: PASS for the current local v0.39 scope only after the final documentation-sealed machine and Chrome reruns remain green.
- Business Acceptance: PARTIAL.
- Real User Experience Acceptance: NOT YET PASSED. Automated system-Chrome evidence is not an unassisted owner/tester session.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release, signing or formal installer action is authorized by this v0.39 batch.
