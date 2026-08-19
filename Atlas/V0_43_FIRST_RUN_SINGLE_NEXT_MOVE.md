# BossAI Funding v0.43 — First-Run Single Next Move

Date: 2026-08-19
Workspace: `D:\BossAI-Projects\bossai-funding-workspace`
Version: `0.43.0`

## Purpose

v0.43 is an owner-journey/readiness refinement. It does not add a financing product capability, financing source, Agent runtime, scheduler, approval engine, audit authority, memory authority, identity authority, provider router or AI gateway.

The batch closes a first-run contradiction found after v0.42: after an owner saved a Funding Goal without having created a Capital Strategy, the detailed Owner Journey still said Capital plan was incomplete while Today’s Focus could fall through to `Create the first financing action`. A fresh owner could therefore receive two incompatible next moves.

The v0.43 rule is that, when no higher-priority concrete financing entity is already actionable, the empty-workspace setup path presents one sequential next move:

```text
Company Profile
→ Funding Goal
→ Capital Strategy
→ Find Money
→ later execution work
```

Existing urgent/dated concrete financing entities retain their established Today’s Focus priority. This batch does not suppress real execution urgency merely to display onboarding guidance.

## Implementation

### 1. Capital Strategy freshness is part of Today’s Focus fallback truth

`src/domain/dashboard.ts` now accepts the already-authoritative `CapitalStrategyFreshness` projection as an optional final input and passes it to `chooseTodayFocus`.

`src/server/app.ts` supplies the same `strategyFreshness` object already used by Owner Journey. This prevents the two owner projections from reasoning from different planning states.

`src/domain/focus.ts` now uses the freshness only in the no-higher-priority fallback path:

- missing Company Profile → `Create the company funding profile`;
- missing/zero Funding Goal → `Set the funding target`;
- non-current Capital Strategy → `Create the capital strategy` or `Refresh the capital strategy`;
- current strategy with zero Funding Opportunity and zero Investor target → `Find the first funding target`;
- only after those prerequisites does the generic fallback remain `Create the first financing action`.

`TodayFocus.destination` now admits the existing `strategy` workspace so this planning step can be navigated directly. No new persistence or financing entity was introduced.

### 2. Today’s Focus lands on the exact first-run form

`public/app.ts` adds `focusDestinationTarget` as a presentation-only resolver:

- setup focus + no Company Profile → `#company-form`;
- setup focus + Company Profile but no Funding Goal → `#goal-form`;
- otherwise retain the projected Today’s Focus destination.

Exact financing entity anchors continue to outrank this fallback and retain the existing highlight/reopen behavior.

### 3. Successful first saves advance to the next exact planning surface

For first-time creation only:

- successful Company Profile Save → `#goal-form` and `Company funding profile saved. Next: set the funding goal.`;
- successful Funding Goal Save while strategy is not current → `#strategy` and `Funding goal saved. Next: calculate the capital strategy.`.

Normal later edits do not force this first-run auto-advance.

The first strategy button now reads `Calculate strategy` while freshness is `not-created`, and reverts to `Recalculate strategy` after a strategy exists.

The first successful strategy calculation reports `Capital strategy ready. Next: find a funding target.`. The strategy result stays available for owner review; the owner can use Today’s Focus to enter the existing Find money workspace.

## Real Chrome acceptance

The built local Web product was exercised in system Google Chrome with the existing isolated test database flow.

The real browser proved:

```text
empty Today’s Focus → exact #company-form                      PASS
invalid Company Profile submit blocked                        PASS
first Company Profile Save → exact #goal-form                 PASS
Today’s Focus updates to Funding Goal                         PASS
first Funding Goal Save → #strategy                           PASS
first strategy button = Calculate strategy                    PASS
first strategy calculation succeeds                           PASS
Today’s Focus → Find the first funding target                 PASS
Find-money Focus action → #opportunities                      PASS
v0.42 cross-workspace draft continuity                        PASS
exact financing-item Today’s Focus                            PASS
hash reload / progressive disclosure                          PASS
no desktop/mobile horizontal overflow                         PASS
```

The existing v0.40 geometry remained unchanged:

```text
Desktop shell:                  2,313.453125 px
Desktop owner snapshot bottom:    777.453125 px < 860 px
Mobile shell:                   4,374.109375 px
Mobile owner snapshot bottom:   1,630.109375 px < 1,688 px
```

## Regression acceptance before documentation sealing

```text
package version                 0.43.0
npm run lint                    PASS
npm run typecheck               PASS
full tests                      246 / 246 PASS
npm run build                   PASS
npm run test:ui-browser         PASS
npm run test:chrome-repair      PASS
git diff --check               PASS
```

The reconciliation Chrome chain remains complete, including stale revision rejection, draft preservation/revalidation, supported-amount repair, owner-controlled void reason and final reconciliation issues = 0.

## Contracts updated

- `tests/journey.test.ts` now asserts that a saved goal with no current strategy yields a Capital Strategy Today’s Focus, and a completed first strategy with no targets yields Find Money.
- `tests/focus-navigation-contract.test.ts` protects exact setup-form routing, the strategy/find-money ordering, first-save transitions and the real Chrome first-run signals.
- `scripts/ui-browser-acceptance.cjs` now performs the sequential clean-workspace first-run path before continuing the existing L5 regression flow.
- `OWNER_ACCEPTANCE.md` includes an unassisted v0.43 target-device checklist.

## Authority and safety boundary

Unchanged:

- BossAI OS remains the only Agent Platform / Runtime / Scheduler / Approval / Audit / Memory / Provider / AI Gateway authority.
- BossAI Funding remains a financing decision and execution workspace, not an Agent Platform.
- No OpenBcon source, docs, tests, schema, prompt, asset, API shape or Git history was read or used.
- No new browser-persistent financing truth was introduced.
- Remote access remains blocked.
- No approved production identity provider is configured.
- Production Security Review remains not attested.
- No commit, push, deploy, release or signing action is authorized or performed by this batch.

## Completion truth

- Technical Acceptance: PASS for the local v0.43 scope after the final documentation-sealed rerun remains green.
- Business Acceptance: PARTIAL.
- Real User Experience Acceptance: NOT YET PASSED.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

Automated first-run Chrome evidence improves readiness for an unassisted owner session; it does not substitute for that session and does not justify Completion Level 3.