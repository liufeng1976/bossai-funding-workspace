# BossAI Funding v0.42 — Workspace Context & Draft Continuity

Date: 2026-08-19
Version: 0.42.0

## Preflight

- Highest commercial goal: let an enterprise owner move through financing work without losing orientation or unsaved decision inputs.
- Largest current user gap after v0.41: deep professional work had a safe return path, but the fixed return control did not state the current workspace, the journey navigation did not mark the current step, and an unsaved server-backed draft could be overwritten by a later render caused by saving another workspace.
- User problem solved: the owner can see where they are, see when the current workspace has an unsaved draft, return safely, and continue an earlier draft after completing a save elsewhere.
- User-visible change: current workspace is named in the fixed return control; matching owner navigation uses `aria-current=step`; unsaved draft state is shown live; returning with a draft gives an explicit kept-draft notice.
- Scope: presentation context, transient in-memory draft-baseline tracking, cross-render restoration of dirty server-rendered controls, real Chrome acceptance, regression contracts, owner acceptance checklist.
- Out of scope: new financing facts, new persistence, autosave, browser persistent draft storage, new API routes, new account/identity authority, background synchronization, generic task/workflow runtime, Agent runtime, remote enablement.
- Real-entry acceptance: edit Capital plan without saving, verify live Unsaved draft context, return to overview, save a real Financing Action in another workspace, then confirm the earlier Capital plan draft survives that server response/re-render; repeat deep return on 390×844 mobile.
- Claimed Completion Level remains 2. Automated browser evidence is not unassisted target-user validation.

## Implementation

### Current workspace context

`syncOwnerReturnControl()` now resolves the currently open progressive workspace and makes it explicit in the fixed control:

- `Capital plan · Back to capital overview`
- `Execute and close · Back to capital overview`
- equivalent labels for the remaining workspaces.

Where an open workspace corresponds to an owner-journey navigation button, that button receives a restrained current state and `aria-current="step"`. Closing all workspaces removes that current state.

### Live unsaved-draft state

The fixed workspace context derives draft state from the current DOM controls compared with the most recently rendered server baseline. Input/change events inside a progressive workspace refresh this context immediately. The owner therefore sees `Unsaved draft` before leaving, not only after returning.

This state is presentation-only. No financing fact and no draft-continuity fact is written to browser persistent storage.

### Cross-workspace render continuity

v0.41 preserved a draft while simply collapsing/returning, but another successful financing mutation could call `render(nextState)` and overwrite server-backed controls in a different workspace.

v0.42 records a baseline of rendered controls and, before a server-state render, identifies dirty controls that the render can replace. After the new authoritative state is rendered:

1. the new rendered state becomes the fresh baseline;
2. a dirty value is considered accepted/clean if the server-rendered value now equals that draft;
3. if the server-rendered value differs, the unsaved draft is restored over that control for continued owner editing;
4. successful form resets update the baseline on the next animation frame so intentionally cleared new-entry forms are not falsely marked dirty.

The preservation boundary is limited to server-rendered controls such as Company Profile / Funding Goal fields and dynamic record controls. Static new-entry forms are not treated as a second persistence system.

### Return message

Returning to the owner overview while the current workspace has unsaved changes shows an explicit transient notice such as:

`Capital plan draft kept. Reopen Capital plan to continue.`

The return action still performs no financing mutation and does not call the server.

## Real Chrome evidence

Desktop 1440×860:

- Capital plan current-workspace context visible: PASS
- Capital plan owner-nav `aria-current=step`: PASS
- live `Unsaved draft` context: PASS
- deep one-step return: PASS
- kept-draft notice: PASS
- draft unchanged immediately after return: PASS
- real Financing Action save in another workspace: PASS
- prior Capital plan draft still present after that server response/re-render: PASS
- focus restored to Today’s Focus: PASS
- no horizontal overflow: PASS

Mobile 390×844:

- deep Execute & close context remains inside viewport: PASS
- context names Execute and close: PASS
- matching owner-nav state is current: PASS
- one-step return / hash clear / hero restore / focus restore: PASS
- no horizontal overflow: PASS

Existing v0.40 first-view geometry remains unchanged:

- desktop shell: 2,313.453125 px
- desktop owner snapshot bottom: 777.453125 px < 860 px
- mobile shell: 4,374.109375 px
- mobile owner snapshot bottom: 1,630.109375 px < 1,688 px

## Regression evidence before documentation sealing

- package version: 0.42.0
- focused v0.39/v0.41/v0.42 contracts: 13/13 PASS
- full regression suite: 243/243 PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run verify`: PASS
- `npm run test:ui-browser`: PASS
- `npm run test:chrome-repair`: PASS
- `git diff --check`: PASS before this documentation write

The reconciliation repair chain remains intact, including stale revision rejection, preserved/revalidated repair drafts, owner-entered void reason, and final reconciliation issues = 0.

## Product / security boundary

No financing schema, database table, API route, tenant boundary, identity authority, Agent runtime, scheduler, approval authority, audit authority, memory authority, provider router, or AI gateway was added or changed by v0.42.

Remote access remains blocked. No approved production identity provider is configured. Production Security Review remains not attested.

## Completion truth

- Technical Acceptance: PASS for the local v0.42 scope only after the documentation-sealed final rerun remains green.
- Business Acceptance: PARTIAL.
- Real User Experience Acceptance: NOT YET PASSED. `OWNER_ACCEPTANCE.md` v0.42 still requires an unassisted target-device owner/tester session.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release or signing action is authorized by this batch.
