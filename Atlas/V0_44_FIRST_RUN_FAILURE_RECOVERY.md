# BossAI Funding v0.44 — First-Run Failure Recovery

Date: 2026-08-19
Workspace: `D:\BossAI-Projects\bossai-funding-workspace`
Branch: `main`
Baseline HEAD: `babaea72f3bba45619ee40670857ccd7824b7c9a`
Version: `0.44.0`

## Scope

v0.44 is an owner-UX and recovery-only release. It does not add a financing-domain capability, persistence model, API route, identity authority, runtime, scheduler, approval engine, audit authority, memory authority, provider router, AI gateway, or billing authority.

The purpose is to make the v0.43 first-run path recoverable when a Save fails. The owner must remain on the exact step, retain entered values, understand what was not saved, and know the next safe action.

The clean-room boundary remains unchanged. `D:\BossAI-Projects\OpenBcon` was not read, searched, compared, opened, copied or used.

## Problem closed

v0.43 established one empty-workspace next-move sequence:

`Company Profile → Funding Goal → Capital Strategy → Find Money`

The remaining weakness was failure recovery. `showFormRequestError` already preserved browser controls and could mark an exact field, while stale workspace failures exposed the top-level `Refresh latest — keep draft` action. However, the owner still depended heavily on a transient toast, and stale refresh did not explicitly restore the owner to the same exact first-run form with a persistent continuation message.

That creates a real-user ambiguity: a failed Save should not require the owner to infer whether data was lost, which step remains active, or what to do after Refresh.

## Implementation

### Persistent form recovery state

`public/app.ts` now provides `showFormRecovery(...)` and a page-memory-only `pendingRecoveryTargetId`.

For a normal server-side form rejection, the form now retains a persistent owner-facing message:

- `Not saved — your entries are still here`
- tells the owner to fix the highlighted issue
- tells the owner to choose the same Save action again

The rejected field remains inline with `aria-invalid=true` and the existing exact server recovery/error text.

The failure handler explicitly navigates back to the exact form ID, so a rejected first-run Funding Goal remains at `#goal-form` with the containing Capital plan workspace open.

### Stale workspace recovery

For `STALE_WORKSPACE_STATE` / `WORKSPACE_REVISION_REQUIRED`, the form now says:

- `Changed elsewhere — your draft is still here`
- `Choose Refresh latest — keep draft, then continue this same step.`

`refreshWorkspacePreservingDrafts()` now records the pending recovery target before loading latest server state. After the authoritative bootstrap state is rendered and unsaved controls are restored, the function:

1. restores the exact unsaved browser draft,
2. keeps the pending exact form target,
3. displays `Latest state loaded — your draft is still here`,
4. tells the owner to continue the same step and save again,
5. navigates back to the exact form without turning the browser draft into financing authority.

The server/workspace revision remains authoritative; the browser draft is only a retained unsaved input.

### Visual treatment

`public/styles.css` adds `.form-recovery` using the existing restrained light owner-facing system:

- light warning surface,
- border-first treatment,
- no glow/HUD/AI gradient,
- readable compact title + continuation copy.

## Real Chrome acceptance

The system-Chrome acceptance was extended to exercise two real failure classes in the built local Web product.

### Server validation failure

The acceptance harness temporarily disables native validation only for one test submission so server-side validation is actually exercised. Production form behavior remains unchanged.

The test submits a Funding Goal with a missing required purpose and proves:

- server rejects it,
- `#goal-form` remains the exact active target,
- Capital plan remains open,
- target amount is still present,
- the purpose control is `aria-invalid=true`,
- inline field error identifies the missing purpose,
- persistent recovery text states the Save did not happen and values remain,
- after correction the same retained form saves successfully and advances to Capital Strategy.

### Stale workspace failure

The acceptance harness reads the authoritative bootstrap revision, performs a separate same-origin company-profile mutation using that current revision to simulate another tab/session changing the workspace, then submits the still-open Funding Goal from the stale UI state.

It proves:

- separate mutation advances revision,
- current Funding Goal Save fails stale,
- persistent stale recovery text appears,
- `Refresh latest — keep draft` is exposed,
- Refresh succeeds,
- exact `#goal-form` is reopened,
- the unsaved Funding Goal purpose is byte-for-byte retained at the UI value level,
- persistent post-refresh continuation guidance appears,
- retry succeeds and continues to Capital Strategy.

## Contracts

`tests/ui-browser-acceptance-contract.test.ts` now protects:

- `pendingRecoveryTargetId`,
- persistent `showFormRecovery`,
- normal failure language,
- stale failure language,
- exact form navigation,
- post-refresh same-step guidance,
- `.form-recovery` visual contract,
- real Chrome acceptance keys for validation and stale recovery.

Existing server recovery tests remain intact and continue proving validation field identity and stale-reference retry semantics.

## Acceptance result before documentation seal

- targeted recovery/focus/Chrome contracts: 11/11 PASS
- typecheck: PASS
- full test suite: 247/247 PASS
- build: PASS
- system Chrome UI acceptance: PASS
- reconciliation Chrome smoke: PASS
- `git diff --check`: PASS

The real Chrome acceptance still preserves v0.40 first-view geometry, v0.42 cross-workspace draft continuity, v0.43 single-next-move ordering, exact-item navigation, hash reload, desktop/mobile no-overflow, and the full reconciliation repair chain.

## Authority and completion truth

v0.44 does not change production readiness truth:

- Technical Acceptance: PASS for local v0.44 scope after final seal rerun
- Business Acceptance: PARTIAL
- Real User Experience Acceptance: NOT YET PASSED
- Production Security Review: NOT ATTESTED
- Completion Level: 2
- `productionReady=false`
- `actuallyLaunched=false`
- `realUserValidated=false`
- `remoteAccess=blocked`

Machine Chrome evidence is preparation for a real unassisted owner session. It is not human validation and must not be used to set `realUserValidated=true`.

No commit, push, deploy, release or sign is authorized or performed by this batch.
