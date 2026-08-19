# BossAI Funding v0.41 — Owner Return & Recovery Path

Date: 2026-08-19
Product: BossAI Funding
Version: `0.41.0`

## Batch preflight

- Highest commercial goal: make BossAI Funding usable as an owner workspace even after the owner enters long professional financing work.
- Largest current user gap: v0.40 made the capital situation understandable near entry, but once a long workspace such as Execute and close, Find money or Capital plan was expanded—especially on mobile—the owner could be far from the top navigation with no reliable one-step path back to the owner overview.
- User problem solved: the owner can leave deep professional work and return to Today’s Focus / Capital Gap in one step without losing an unsaved draft or mutating financing truth.
- User-visible change: `Back to capital overview` appears while any progressive workspace is open and remains fixed inside the viewport.
- Scope: presentation-only return control, disclosure close, hash cleanup, overview scroll/focus restoration, first-load/hash-return distinction, desktop/mobile real-Chrome regression evidence.
- Out of scope: new financing capability, new persistence, new API route, database change, generic navigation/runtime/task/scheduler/approval/audit/memory authority, Agent runtime, production identity, remote access.
- Claimed Completion Level remains 2. Automated Chrome evidence does not constitute an unassisted owner session.

## Implemented owner return path

1. A single `Back to capital overview` control lives outside financing forms and registers.
2. The control is hidden when no progressive workspace is open and becomes visible when Decision details or any professional workspace opens.
3. It is fixed within the viewport; narrow/mobile constrains it inside the 390px viewport.
4. Returning closes only progressive disclosure state. It does not call `render()`, does not call an API, does not save, and does not delete draft controls.
5. Return clears the section/entity hash and scrolls the owner back to the existing hero containing Today’s Focus and Capital Gap.
6. Keyboard focus is restored to the visible Today’s Focus action after return so focus is not stranded on a hidden button.
7. An unsaved Company Profile draft survives deep scroll → return → overview → later workspace navigation because the return path does not reconstruct form state.
8. Initial no-hash boot is deliberately different from an explicit return: it closes disclosure but does not auto-scroll past the product header.
9. Hash-change navigation to an empty hash may recover the overview, while normal bootstrap with no hash preserves the natural top-of-page entry.
10. Existing valid section hashes and exact financing-item hashes continue to restore their containing workspaces.

## Real Chrome evidence

Built local Web product through system-installed Google Chrome + CDP:

### Desktop 1440 × 860

- open Capital plan;
- keep an unsaved Company Profile product-field draft;
- scroll deep into the expanded module;
- `Back to capital overview` remains visible;
- click return;
- all progressive modules close;
- URL hash clears;
- hero returns to the viewport;
- unsaved draft remains unchanged;
- focus lands on `#focus-action`;
- no horizontal overflow.

### Narrow/mobile 390 × 844

- open Execute and close;
- scroll to deep module content;
- fixed return control remains fully bounded in the viewport;
- click return;
- all progressive modules close;
- URL hash clears;
- owner hero returns to view;
- return control hides after recovery;
- focus returns to Today’s Focus;
- no horizontal overflow.

The v0.40 first-view geometry remains unchanged:

```text
Desktop initial shell height: 2,313.453125 px
Desktop owner snapshot bottom:   777.453125 px < 860 px

Mobile initial shell height:   4,374.109375 px
Mobile owner snapshot bottom:  1,630.109375 px < 1,688 px
```

## Durable regression mechanisms

- `tests/owner-return-path-contract.test.ts` protects the presentation-only return boundary, no-render/no-request behavior, startup/hash semantic split, fixed/bounded control and real-Chrome acceptance hooks.
- `tests/progressive-disclosure-contract.test.ts` was upgraded so hash-change recovery explicitly uses the v0.41 return-aware navigation contract.
- `tests/focus-navigation-contract.test.ts` still requires bootstrap hash restoration and exact navigation, updated for the new `resumeWorkspaceLocation(returnToOverviewWhenEmpty = false)` signature.
- `scripts/ui-browser-acceptance.cjs` now exercises desktop and mobile deep-work return, unsaved-draft preservation and focus restoration in the real built product.
- Existing `scripts/chrome-repair-smoke.cjs` remains the reconciliation repair regression gate.

## Machine acceptance before documentation sealing

- package version: `0.41.0`
- owner return focused contracts: PASS
- formal full regression suite: 239/239 PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run verify`: PASS
- built-product `npm run test:ui-browser`: PASS
- built-product `npm run test:chrome-repair`: PASS
- `git diff --check`: PASS before documentation sealing

A documentation-sealed rerun is required after this record and `Atlas/CURRENT_STATE.md` are written; the final session result must use that latest rerun.

## Persistence, security and architecture boundary

v0.41 changes only browser presentation/navigation behavior. Financing facts remain server/SQLite truth. No new tenant, authorization, API, external-source, billing, account, Agent or runtime authority is introduced.

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

- Technical Acceptance: PASS for current local v0.41 scope only after the documentation-sealed rerun remains green.
- Business Acceptance: PARTIAL.
- Real User Experience Acceptance: NOT YET PASSED. `OWNER_ACCEPTANCE.md` v0.41 requires an unassisted target-device owner/tester session.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release, signing or formal installer action is authorized by this v0.41 batch.
