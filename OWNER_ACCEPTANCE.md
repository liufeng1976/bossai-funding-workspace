# BossAI Funding Owner Acceptance

This is the required manual target-device acceptance record for BossAI Funding.

> Recovery note — 2026-08-19: the previously untracked `OWNER_ACCEPTANCE.md` was accidentally overwritten while preparing the v0.47 locale-completeness section. Because the file was untracked, Git could not restore the exact prior bytes. This document is a consolidated reconstruction from the authoritative v0.38–v0.47 Atlas acceptance/evidence records plus the preserved v0.44/v0.45 checklist content. It is intentionally not represented as a byte-for-byte restoration.

Automated tests, builds, browser automation, screenshots and machine-readiness gates are prerequisites only. They do not set `realUserValidated=true` and do not by themselves raise Completion Level above 2.

## Acceptance truth and authority

The target user is an owner/founder. The product should let that owner understand the current financing state, decide what matters next, act, recover from failure and continue without internal developer guidance.

Critical financing state must remain server/SQLite authority. Locale preference is non-critical UI state only. BossAI Funding must not become a second Agent Platform, scheduler, approval engine, memory system, identity authority, provider router or AI gateway.

Production remote access remains out of scope until approved external identity verification and production security review are complete.

---

## v0.38 — Real Web Browser Acceptance

Purpose: prove the built local Web product works in the real system browser rather than relying only on unit/integration contracts.

Manual target-device checks:

```text
[ ] Open the built local product in the normal system browser.
[ ] Desktop entry fits the intended layout without horizontal overflow.
[ ] 390px mobile-width entry remains usable without horizontal overflow.
[ ] Company Profile native required-field validation behaves normally.
[ ] Company Profile save persists after reload.
[ ] Funding Goal save persists after reload.
[ ] Owner navigation can open Find money.
[ ] The owner can explain what the product is for from the real entry page.
```

Machine evidence is documented in `Atlas/V0_38_REAL_WEB_BROWSER_ACCEPTANCE.md`.

---

## v0.39 — Owner Workspace Progressive Disclosure

Purpose: keep professional financing capability available without forcing the owner through one extremely long first view.

```text
[ ] Initial entry shows the owner summary while professional workspaces remain discoverable but collapsed.
[ ] Capital strategy is discoverable without being expanded by default.
[ ] Capital plan is discoverable without being expanded by default.
[ ] Find money is discoverable without being expanded by default.
[ ] Move actions is discoverable without being expanded by default.
[ ] Investors is discoverable without being expanded by default.
[ ] Execute and close is discoverable without being expanded by default.
[ ] History and safety is discoverable without being expanded by default.
[ ] Opening one professional workspace does not leave unrelated professional workspaces expanded.
[ ] Exact-item navigation still opens the containing workspace.
```

Machine evidence is documented in `Atlas/V0_39_OWNER_WORKSPACE_PROGRESSIVE_DISCLOSURE.md`.

---

## v0.40 — Owner First-View Decision Density

Purpose: make the first real viewport answer the owner’s highest-value financing questions.

```text
[ ] The owner can identify Today's Focus without opening a professional workspace.
[ ] The owner can identify the Capital Gap without opening a professional workspace.
[ ] The highest financing blocker is visible in the owner snapshot.
[ ] Capital timing state is visible in the owner snapshot.
[ ] All three capital tracks are visible in the owner snapshot.
[ ] Snapshot actions open the existing detailed evidence rather than duplicating financing authority.
[ ] Desktop first view remains bounded and readable.
[ ] Mobile owner snapshot is reachable within the intended first two viewports.
```

Machine evidence is documented in `Atlas/V0_40_OWNER_FIRST_VIEW_DECISION_DENSITY.md`.

---

## v0.41 — Owner Return & Recovery Path

Purpose: ensure the owner can leave deep professional work and return to the capital overview in one understandable action.

```text
[ ] Enter a professional workspace and scroll deep into it.
[ ] The return control remains reachable.
[ ] The return control names the current workspace context.
[ ] One action returns to the capital overview.
[ ] Returning clears the deep-work hash without deleting business data.
[ ] Focus returns to Today's Focus.
[ ] Mobile deep-work return remains usable without horizontal overflow.
```

Machine evidence is documented in `Atlas/V0_41_OWNER_RETURN_RECOVERY_PATH.md`.

---

## v0.42 — Workspace Context & Draft Continuity

Purpose: make location and unsaved work understandable and preserve drafts through unrelated renders.

```text
[ ] Opening a professional workspace gives an explicit current-workspace context.
[ ] The matching owner navigation item is visibly current.
[ ] Editing a server-backed form marks the workspace as containing an unsaved draft.
[ ] Collapsing and reopening the workspace keeps the unsaved values.
[ ] Refresh latest — keep draft retains the unsaved values.
[ ] Returning to the capital overview tells the owner the draft was kept.
[ ] Saving work in another professional workspace does not silently erase the first workspace draft.
[ ] Successfully persisted values are not falsely restored as dirty values.
[ ] Draft continuity remains presentation-only and does not create a second persistence authority.
```

Machine evidence is documented in `Atlas/V0_42_WORKSPACE_CONTEXT_DRAFT_CONTINUITY.md`.

---

## v0.43 — First-Run Single Next Move

Purpose: align the empty-workspace journey to one clear sequence rather than exposing every professional capability at once.

Expected sequence:

`Company Profile → Funding Goal → Capital Strategy → Find Money → later execution`

```text
[ ] Empty Today’s Focus leads to the exact Company Profile form.
[ ] Native invalid submission is blocked without mutation.
[ ] First Company Profile save advances to the exact Funding Goal form.
[ ] Today’s Focus then reflects the Funding Goal step.
[ ] First Funding Goal save advances to Capital Strategy.
[ ] The first strategy action is Calculate strategy.
[ ] Calculating strategy succeeds from the saved company/goal facts.
[ ] Today’s Focus becomes Find the first funding target.
[ ] Find-money action opens the Find money workspace.
[ ] A later real urgent financing item can outrank the onboarding fallback.
```

Machine evidence is documented in `Atlas/V0_43_FIRST_RUN_SINGLE_NEXT_MOVE.md`.

---

## v0.44 — First-Run Failure Recovery

Purpose: keep the owner on the exact failed step and preserve entered work.

```text
[ ] A server-rejected Funding Goal remains on the exact Funding Goal step instead of returning to the overview or another workspace.
[ ] The rejected form keeps every value already entered by the owner.
[ ] The exact rejected field is marked inline and receives a readable explanation.
[ ] A persistent recovery message says the change was not saved, the entries remain, and tells the owner to correct the issue and choose Save funding goal again.
[ ] The owner can correct the same retained form and continue without re-entering unrelated fields.
[ ] When another browser/tab changes the workspace first, the stale Funding Goal remains visible with an explicit Changed elsewhere — your draft is still here message.
[ ] Refresh latest — keep draft is visible for the stale state.
[ ] After Refresh latest — keep draft, the owner returns to the same `#goal-form` step rather than the capital overview.
[ ] The unsaved Funding Goal values are identical before and after Refresh.
[ ] The refreshed form says Latest state loaded — your draft is still here and tells the owner to continue this same step and save again.
[ ] Retrying after refresh succeeds and continues to Capital Strategy.
[ ] The recovery state is presentation-only and does not become a second financing persistence authority.
[ ] Existing stale receipt-reconciliation repair, exact-item navigation, cross-workspace draft continuity and mobile bounds remain intact.
```

Machine evidence is documented in `Atlas/V0_44_FIRST_RUN_FAILURE_RECOVERY.md`.

---

## v0.45 — Owner Acceptance Readiness Gate

Purpose: final machine prerequisite before an actual unassisted owner session.

```text
[ ] On a real target desktop, start from an empty workspace and complete Company Profile → Funding Goal → Capital Strategy → Find Money without developer guidance.
[ ] On a real target mobile-width experience, repeat the same first-run sequence without losing the current step or encountering horizontal overflow.
[ ] Intentionally make one Funding Goal validation mistake; confirm the rejected field, retained values, persistent recovery guidance and direct retry are understandable without explanation.
[ ] Trigger or reproduce a stale-workspace conflict; confirm Refresh latest — keep draft preserves the draft and returns to the same exact step.
[ ] Open a long professional workspace, scroll deep, return to the capital overview, and confirm the owner understands where they were and that any unsaved draft is still present.
[ ] Create one real financing action and confirm Today’s Focus opens that exact record rather than only the containing section.
[ ] Reload an exact-item hash and confirm the containing professional workspace reopens with the item visible.
[ ] Complete one receipt reconciliation repair and confirm no cash truth is rewritten automatically.
[ ] Confirm the owner can state, without prompting, what the current capital gap is, why capital has not arrived, what is due next, and what action they should take now.
[ ] Record misunderstandings, hesitations and dead ends before accepting the session; machine PASS must not be used as a substitute.
```

Machine prerequisite: `npm run verify:owner-readiness` plus `git diff --check`.

Machine evidence is documented in `Atlas/V0_45_OWNER_ACCEPTANCE_READINESS_GATE.md`.

---

## v0.46 — Internationalization Owner-Language Retest

Real-user evidence:

- First human acceptance attempt failed because the owner-facing product opened primarily in English.
- v0.46 introduced internationalization, browser-language selection and a user language preference.
- The next real-owner retest also failed because Simplified Chinese still contained substantial English in deeper professional workspaces.

Therefore:

```text
v0.46 Real User Experience Acceptance: FAIL
realUserValidated=false
Completion Level: 2
```

The failure must remain part of product history; machine locale smoke evidence must not overwrite it.

Machine evidence is documented in `Atlas/V0_46_INTERNATIONALIZATION_OWNER_LANGUAGE.md`.

---

## v0.47 — Locale Completeness & English-Leak Retest

v0.47 adds a full-DOM English-leak gate after the v0.46 human failure exposed that first-run locale smoke was insufficient.

Official production locale choices at this stage:

- 简体中文 (`zh-CN`)
- 繁體中文 (`zh-TW`)
- English (`en`)
- Español (`es`)

Japanese and Korean are intentionally not selectable until their deep professional workspaces meet the same completeness gate. A Japanese/Korean browser must fall back to English rather than presenting an incomplete mixed-language interface.

### Locale-completeness manual checks

```text
[ ] Open a fresh local workspace in Simplified Chinese without developer guidance.
[ ] The owner can identify the current capital gap, Today's Focus, blocker/timing snapshot and the six journey areas without unexplained English UI copy.
[ ] Open Capital plan and inspect Company Profile, Funding Goal and Fundraising Round; labels, help text, statuses, placeholders and buttons are understandable in Chinese.
[ ] Open Capital Strategy and Decision details; coverage, timing, blockers, journey and three-track evidence remain understandable in Chinese.
[ ] Open Find money; official-source search, manual opportunity fields, readiness, eligibility, loan and investor fields do not fall back to unexplained English.
[ ] Open Move actions; action fields, stage and priority labels are understandable in Chinese.
[ ] Open Investors; investor target, fund, contact, thesis, follow-up and meeting controls are understandable in Chinese.
[ ] Open Execute and close; Application, documents, Data Room, diligence, Term Sheet, closing conditions, Funding Outcome, Receipt Tranche, arrival expectations and reconciliation controls are understandable in Chinese.
[ ] Open History & safety; backup, restore, export, access and identity-boundary text is understandable in Chinese.
[ ] Proper nouns and standard financing/technical abbreviations may remain canonical only when translation would reduce accuracy (for example BossAI Funding, Grants.gov, MRR, ARR, SAFE, CSV and UUID identifiers).
[ ] Switching between 简体中文 / 繁體中文 / English / Español does not lose financing data or unsaved drafts.
[ ] Reloading preserves the selected locale without storing financing truth in browser persistence.
[ ] A Japanese/Korean browser falls back to English instead of presenting a partial mixed-language interface.
[ ] Any remaining mixed-language copy is recorded as a UX defect before continuing the financing journey.
```

### Core journey retest after locale check

```text
[ ] Company Profile → Funding Goal → Capital Strategy → Find Money can be completed without internal guidance.
[ ] A validation error keeps the exact step and preserves entered values.
[ ] A stale-workspace conflict can be recovered with Refresh latest — keep draft without losing the draft or current step.
[ ] A concrete financing action becomes Today's Focus and opens the exact record.
[ ] The owner can return from a deep professional workspace to the capital overview without losing unsaved work.
[ ] The owner can explain, without prompting, how much capital is still needed, why capital has not arrived, what is due next and what action should happen now.
```

Machine prerequisite includes:

- full lint/typecheck/tests/build;
- desktop/responsive system-Chrome acceptance;
- fresh-database 390×844 owner journey;
- production-locale Chrome switching and reload persistence;
- full-DOM English-leak audit for every officially selectable non-English locale;
- receipt-reconciliation Chrome smoke;
- `git diff --check`.

Machine evidence is documented in `Atlas/V0_47_LOCALE_COMPLETENESS_AND_LEAK_GATE.md`.

### v0.47 real-owner result

On 2026-08-20 the owner explicitly confirmed **“已验证”** after the v0.47 mixed-language correction and retest cycle.

```text
v0.47 Technical Acceptance: PASS
v0.47 Machine Owner Readiness: PASS
v0.47 Real User Experience Acceptance: PASS
```

This closes the v0.47 local Web owner-validation defect chain. It does not automatically validate the new v0.48 installed desktop product form.

---

## v0.48 — Windows Desktop Installed-Product Acceptance

v0.48 changes the distribution form and fresh-locale default, so the installed desktop build needs its own real-owner confirmation even though the financing business implementation remains the same.

Machine evidence already proves:

```text
[PASS] Development Electron starts the canonical local Funding server.
[PASS] Packaged win-unpacked EXE starts successfully.
[PASS] Fresh desktop profile defaults to English.
[PASS] Second desktop instance is rejected while the primary instance remains healthy.
[PASS] Company Profile survives installed-app restart.
[PASS] Uninstall removes the application but preserves the isolated financing database.
[PASS] Reinstall reopens the same preserved Company Profile.
[PASS] Final uninstall preserves the financing database.
[PASS] NSIS installer generated and SHA-256 recorded.
[BLOCKED] Official icon is not yet supplied; engineering build uses the default Electron icon.
[BLOCKED] Windows Authenticode signing is not configured; app and installer report NotSigned.
```

Real-owner target-device checklist:

```text
[ ] Run the actual BossAI Funding Windows installer on the target machine.
[ ] Confirm the install language/product name/path/shortcut choices are understandable.
[ ] Launch from the installed shortcut without a terminal or developer tool.
[ ] Confirm the first product surface is English by default and language can be changed intentionally.
[ ] Complete a normal owner financing action and confirm the desktop shell does not expose developer/runtime concepts.
[ ] Close and reopen from the installed shortcut; confirm the saved financing state remains.
[ ] Attempt to launch a second instance; confirm the existing app is reused rather than creating a second independent workspace.
[ ] Uninstall the app and confirm the owner understands that financing data is preserved.
[ ] Reinstall and confirm the prior financing state returns.
[ ] Record any SmartScreen/signing/icon/trust friction before claiming an official release.
```

Until this installed-product session is completed, v0.48 remains machine-ready but not real-user-validated.

---

## v0.48 — Human Desktop Installation Evidence

Owner-reported real Windows evidence on 2026-08-20:

```text
[x] Installer completed successfully.
[x] Installed BossAI Funding opened normally.
[x] Uninstall completed successfully.
[ ] Human separately confirmed restart persistence.
[ ] Human separately confirmed uninstall → reinstall data recovery.
```

Machine evidence already proves single-instance enforcement, restart persistence, uninstall-data preservation, and reinstall-data recovery in an isolated lifecycle harness. Those machine checks remain distinct from the owner's direct observations above.

Result for this specific human scope:

```text
Desktop install/open/uninstall UX: PASS
Extended desktop lifecycle human attestation: NOT YET COMPLETE
```

---

## Final acceptance result

Complete this only from an actual unassisted target-device session.

```text
Technical Acceptance: [PASS / FAIL]
Business Acceptance: [PASS / FAIL]
Real User Experience Acceptance: [PASS / FAIL]

Critical blockers:
Major friction:
Minor friction:
Observed misunderstandings:
Required fixes before retest:
Evidence locations:
Tester sign-off:
Date:
```

Do not set `realUserValidated=true`, `productionReady=true`, `actuallyLaunched=true`, or raise Completion Level based on this document or machine evidence alone.
