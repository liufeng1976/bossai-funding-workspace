# BossAI Funding v0.47 — Locale Completeness & English-Leak Gate

Date: 2026-08-19

## Trigger

The v0.46 unassisted owner retest failed immediately on a real user-visible issue: the Simplified Chinese interface still mixed a large amount of English into deeper professional workspaces.

This is real-user evidence. The earlier locale smoke gate was too shallow because it proved only selected first-run surfaces, not the complete owner DOM.

## Scope

v0.47 changes presentation/i18n only. It does not add or modify financing-domain authority, APIs, SQLite schema, workspace revision semantics, security authority, identity, BossAI OS boundaries, matching logic, funding truth, receipt truth, approval or scheduling.

## Durable prevention mechanism

Added a real-system-Chrome locale leak audit:

`npm run test:locale-leaks`

The audit establishes English as the canonical baseline, switches each officially selectable non-English locale, compares all body text plus placeholders / aria-label / title / data-module-label attributes, and fails when a translatable English phrase is unchanged.

Allowed exceptions are limited to explicit brands, stable technical abbreviations, proper names and UUID-style identifiers.

The gate is part of:

`npm run verify:owner-readiness`

## Evidence-driven translation closure

Initial v0.46 Simplified Chinese leak audit:

- canonical English phrases scanned: ~614
- unchanged translatable English phrases in zh-CN: 438

v0.47 added a complete Simplified Chinese exact-phrase overlay covering owner decision detail, coverage/closing, timing, blockers, journey, three capital tracks, fundraising round, opportunity details, financing actions, equity pipeline, meetings/follow-ups, execution, documents, data room, diligence, term sheets, closing conditions, Funding Outcome, receipt tranches, arrival expectations, reconciliation and continuity/recovery.

Dynamic count/state patterns and `Next:` guidance are localized rather than being limited to empty-state literals.

Dynamic DOM created after render is now passed through the same presentation-layer translation pass.

Final supported non-English leak target:

- zh-CN: 0
- zh-TW: 0
- es: 0

## Official production locales

Only locales that satisfy the full-page leak gate are selectable:

- `zh-CN` — 简体中文
- `zh-TW` — 繁體中文
- `en` — English canonical source
- `es` — Español

Japanese and Korean had deep-module English fallback in the v0.46 implementation. They are intentionally not exposed as production locale choices until their full phrase packs meet the same zero-leak acceptance gate. A Japanese/Korean browser therefore falls back to English rather than presenting a falsely complete mixed-language UI.

## Persistence boundary

Locale preference remains a non-critical UI preference only. It is stored as a same-site cookie containing only the locale code. No financing fact, draft, account identity, approval, business state or cash truth is placed in browser persistence.

## Acceptance truth

This machine closure does not erase the real-user failure that triggered it.

- v0.46 Real User Experience Acceptance: FAIL — mixed English in Chinese UI.
- v0.47 Technical Acceptance: pending final full gate at document creation time.
- v0.47 Machine Locale Completeness: pending final full gate at document creation time.
- v0.47 Real User Experience Acceptance: RETEST REQUIRED.
- `realUserValidated=false`.
- Completion Level remains 2 until an actual owner/tester repeats the unassisted target-device session and confirms the language issue is resolved together with the core financing journey.



## Final machine closure

Final sealed command:

`git diff --check && npm run verify:owner-readiness && git diff --check`

Result:

- lint: PASS;
- typecheck: PASS;
- full test suite: 251/251 PASS;
- build: PASS;
- desktop/responsive real system-Chrome acceptance: PASS;
- independent fresh-database 390×844 owner journey: PASS;
- production locale switching/reload acceptance: PASS;
- full-DOM unchanged translatable English leak audit: PASS;
  - zh-CN: 0 leaks;
  - zh-TW: 0 leaks;
  - es: 0 leaks;
- receipt-reconciliation Chrome smoke: PASS;
- `git diff --check`: PASS before and after the unified gate.

Technical Acceptance for the local v0.47 scope is therefore PASS. Machine Owner Readiness is PASS. Real User Experience Acceptance remains RETEST REQUIRED because the human owner must re-open the product and confirm that the mixed-language defect that caused the v0.46 failure is actually resolved in real use.
