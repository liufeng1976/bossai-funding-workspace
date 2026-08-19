# BossAI Funding v0.46 — Internationalization & Owner Language

Date: 2026-08-19

## Trigger

The first real owner acceptance session exposed an immediate comprehension blocker: the product opened in English and the owner asked whether the entire product was English. The v0.45 human acceptance attempt therefore did not pass.

## Product decision

Do not create a one-off Chinese fork. BossAI Funding now uses a presentation-layer internationalization architecture so additional languages can be added without changing financing-domain logic, APIs, persistence or business authority.

Supported locales in v0.46:

- `zh-CN` — Simplified Chinese
- `zh-TW` — Traditional Chinese
- `en` — English
- `ja` — Japanese
- `ko` — Korean
- `es` — Spanish

## Implementation boundary

Internationalization remains a UI concern. Financing facts, amounts, decisions, owners, dates, source provenance and business records remain server/SQLite authority.

The browser/system language is detected on first use. A visible language selector allows owner override. Only the locale code is remembered through a SameSite=Lax cookie as a non-financing UI preference. No financing state is stored in browser persistence.

The owner path now localizes the product shell and critical first-run surfaces including:

- Capital Command Center / main navigation
- Today’s Focus and first-run fallback states
- Capital Gap and owner snapshot labels
- Company Profile
- Funding Goal
- Capital Strategy
- Find Money
- key stage labels
- workspace open/close/return context
- validation/stale recovery guidance
- locale-aware date and USD presentation

## Machine evidence

`npm run test:locales` runs real system Chrome at 390×844 against a fresh local database and switches through all six locales. It verifies for every locale:

- `html lang`
- selected locale
- main title
- Capital Plan navigation
- first Today’s Focus
- Company name field label
- Funding Goal heading
- Capital Strategy heading
- Find Money heading
- Growth stage option
- persisted locale after real reload
- no horizontal overflow

The locale gate caught and fixed a real Traditional Chinese gap where `Company name` remained Simplified Chinese during sequential language switching.

The project’s existing lint forbids critical product code from relying on browser local storage. The initial locale preference implementation therefore failed lint even though UI preferences are non-critical. The gate was not weakened. Locale persistence was changed to a cookie containing only the locale code.

The existing reconciliation Chrome smoke was made deterministic by explicitly selecting English before testing exact English repair-copy/currency assertions. Locale behavior is tested separately by `test:locales`.

`npm run verify:owner-readiness` now includes:

1. lint
2. typecheck
3. all unit/integration/contract tests
4. production build
5. desktop/responsive system-Chrome acceptance
6. independent 390×844 owner first-run acceptance
7. six-locale system-Chrome acceptance
8. reconciliation system-Chrome smoke

## Acceptance truth

v0.46 can restore machine readiness after the final gate, but it does not erase the failed v0.45 human session and does not itself prove human acceptance.

Required next step after machine closure: restart a genuine unassisted owner session in the owner’s selected language.

Until that succeeds:

- Technical Acceptance: pending final v0.46 closure gate
- Machine Owner Readiness: pending final v0.46 closure gate
- Business Acceptance: PARTIAL
- Real User Experience Acceptance: FAIL from v0.45 language mismatch; RETEST REQUIRED
- Completion Level: 2
- `realUserValidated=false`
- `productionReady=false`
- `actuallyLaunched=false`
- `remoteAccess=blocked`

No reset, clean, destructive checkout, untracked deletion, commit, push, deploy, release or sign was performed. OpenBcon was not accessed.
