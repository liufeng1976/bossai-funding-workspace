# BossAI Funding v0.40 — Owner First-View Decision Density

Date: 2026-08-19
Product: BossAI Funding
Version: `0.40.0`

## Batch preflight

- Highest commercial goal: make the default BossAI Funding entry behave like the owner's daily financing decision workspace rather than requiring the owner to scroll through evidence before understanding the situation.
- Largest current user gap: v0.39 materially reduced total page height, but the real Chrome gate still proved only that blockers, timing and Three Capital Tracks existed somewhere in the rendered page. It did not prove that the owner could see those judgments near the entry without long scrolling.
- User problem solved: Today’s Focus, Capital Gap, highest blocker, critical timing state and all three capital tracks are now projected together at the top of the normal owner entry from the same existing dashboard facts.
- User-visible change: a compact owner snapshot follows the existing Focus/Gap hero. Detailed coverage, timing, blocker, owner-journey and track evidence is preserved in one collapsible Decision details workspace.
- Scope: presentation hierarchy, same-fact owner snapshot, decision-detail disclosure, responsive density, geometry-based real Chrome acceptance, summary-to-detail navigation, regression contracts.
- Out of scope: new financing facts, new domain logic, new database/API routes, new task/runtime/scheduler/approval/audit/memory authority, new browser persistence, production identity, remote access, Agent runtime.
- Claimed completion level remains 2. Automated system-Chrome evidence does not count as an unassisted real owner acceptance session.

## Implemented

1. Added a bounded browser projection `renderOwnerFirstView(data: Dashboard)` using only existing `Dashboard.capitalBlockers`, `Dashboard.timingPlan` and `Dashboard.tracks`.
2. The snapshot does not call an API, mutate financing state, persist browser state or create a second financing authority.
3. Highest blocker snapshot exposes blocker count, title and recorded reason. The detailed blocker list and exact financing navigation remain the evidence authority.
4. Capital timing snapshot exposes need-by state, overdue count, next-14-day count and active-undated count without presenting timing as a cash-flow/closing forecast.
5. Three Capital Tracks snapshot exposes Grant, Debt and Equity recorded in-motion amount and active-item count from the same track summaries already used by the detailed cards.
6. Added `Decision details` progressive disclosure containing the existing Capital Coverage & Closing Plan, detailed Capital Timing, Capital Blockers, Owner Funding Path and detailed Three Capital Tracks. No existing financing capability was removed.
7. The original seven professional workspaces remain separately marked as `data-professional-module` and remain one-step discoverable. Decision details is an owner evidence workspace, not an eighth professional financing subsystem.
8. Review blocker evidence, Review timing and Review capital tracks navigate to `#blockers`, `#timing` and `#tracks`; the existing progressive-navigation layer opens the same Decision details workspace before scrolling.
9. Existing hash recovery, exact-item focus, stale-workspace draft preservation and v0.36/v0.37 reconciliation repair behavior remain unchanged.
10. `OWNER_ACCEPTANCE.md` now includes a v0.40 target-device checklist. Machine acceptance does not set `realUserValidated=true`.

## Real Chrome geometry evidence

Same built local Web runtime, system Google Chrome, Chrome DevTools Protocol and real screenshot capture as the v0.38/v0.39 acceptance chain.

### Desktop — 1440 × 860

```text
Hero top:                  223.08 px
Hero bottom:               591.45 px
Owner snapshot top:        605.45 px
Owner snapshot bottom:     777.45 px
Viewport bottom:           860.00 px
```

Today’s Focus, Capital Gap, highest blocker, critical timing and all three capital tracks therefore fit inside the first real desktop viewport.

Initial shell height:

```text
v0.38: 21,203.5625 px
v0.39:  4,460.46875 px
v0.40:  2,313.453125 px

v0.38 → v0.40 reduction: 89.1%
v0.39 → v0.40 reduction: 48.1%
```

### Narrow/mobile — 390 × 844

```text
Hero top:                  379.72 px
Hero bottom:             1,202.25 px
Owner snapshot top:      1,210.25 px
Owner snapshot bottom:   1,630.11 px
Two viewport threshold:  1,688.00 px
```

The complete blocker/timing/three-track snapshot is reachable within two real mobile viewport heights without opening a professional form/register.

Initial shell height:

```text
v0.38: 35,048.75 px
v0.39:  9,807.6875 px
v0.40:  4,374.109375 px

v0.38 → v0.40 reduction: 87.5%
v0.39 → v0.40 reduction: 55.4%
```

These are regression bounds, not a claim that minimum height is itself the product goal.

## Real browser interaction evidence

The built-product Chrome gate proves:

- desktop first-view geometry fits the complete owner decision snapshot within 1440×860;
- mobile reaches the complete snapshot within 2 × 844 px;
- no horizontal overflow at desktop or mobile;
- blocker/timing/track summary buttons all open the existing Decision details workspace and write the correct hashes;
- the seven professional workspaces remain discoverable and initially collapsed;
- Company Profile native required validation still blocks invalid mutation;
- real Company Profile and Funding Goal saves still pass;
- unsaved draft survives collapse + latest-state Refresh + reopen;
- Today’s Focus exact financing entity still opens its containing professional workspace;
- `#opportunities` reload restores Find money and saved company/goal/dilution truth;
- exact `#funding-action-1` reload restores Move actions and the exact financing item.

## Reconciliation compatibility

`npm run test:chrome-repair` remains PASS after v0.40. The owner still enters Execute and close through the normal owner navigation before inspecting reconciliation controls. Preview-only drafting, stale revision rejection, actual cash authority, preserved/revalidated draft, latest supported amount, owner-entered void reason and final reconciliation issues = 0 all remain intact.

## Machine acceptance before documentation sealing

- package version: `0.40.0`
- focused v0.39/v0.40 owner-UI contracts: PASS
- full regression suite: 235/235 PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run verify`: PASS
- built-product `npm run test:ui-browser`: PASS
- built-product `npm run test:chrome-repair`: PASS
- `git diff --check`: PASS before documentation sealing

A final documentation-sealed rerun is required after this record and the current-state append are written.

## Persistence and security boundary

No financing persistence, tenant boundary, API topology or security authority changed.

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

- Technical Acceptance: PASS for current local v0.40 scope only after the final documentation-sealed rerun remains green.
- Business Acceptance: PARTIAL.
- Real User Experience Acceptance: NOT YET PASSED.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release, signing or formal installer action is authorized by this v0.40 batch.
