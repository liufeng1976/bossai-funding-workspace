# BossAI Funding v0.38 — Real Web Browser Acceptance Alignment

## Batch preflight

- Highest commercial goal: make completion evidence reflect the actual owner experience and actual product runtime.
- Largest current user/product gap: the existing UI acceptance script required Electron even though BossAI Funding is currently served as a local Web product and Electron is not a project dependency.
- User problem solved: desktop/mobile UI and owner journey are now validated against the same built Web runtime the owner actually uses locally.
- User-visible change: no financing behavior change; acceptance fidelity is strengthened so release evidence cannot come from the wrong runtime.
- Scope: replace Electron-only acceptance harness with system Chrome + CDP, preserve desktop/mobile visual assertions, preserve real form-save/navigation/reload checks, add a regression contract preventing Electron reintroduction, add repeatable `npm run test:ui-browser`.
- Out of scope: changing the product into Electron, adding Electron/Playwright/Puppeteer, remote access, production identity, financing-domain mutations, new APIs, new persistence, generic workflow/task authority, Agent runtime.
- Real-entry acceptance: run the final built local product in system Chrome at 1440×860 and 390×844, capture rendered screenshots, exercise Company Funding Profile + Funding Goal saves and hash navigation/reload, and prove state persists through the isolated local server.
- Claimed completion level remains 2. System-Chrome automation is machine evidence and does not substitute for an unassisted owner/tester session.

## Implemented

1. `scripts/ui-browser-acceptance.cjs` no longer imports `electron` or creates `BrowserWindow`.
2. The gate launches `dist/src/server/main.js` with an isolated SQLite database and the installed Google Chrome in headless mode with a dedicated DevTools port/profile.
3. Chrome DevTools Protocol drives runtime evaluation, responsive viewport sizing and PNG screenshot capture. No npm browser automation dependency was added.
4. Desktop acceptance validates 1440×860, a real rendered screenshot, typography, body/canvas contrast, white panel token, restrained blue accent, two-column capital hero, sticky owner navigation, visible Today's Focus / Capital Gap / blockers / three capital tracks, and no horizontal overflow.
5. Narrow/mobile-responsive acceptance validates 390×844, a distinct screenshot, stacked topbar, non-sticky two-column owner navigation, one-column hero/tracks/forms, retained Focus/Capital Gap, and no horizontal overflow.
6. Real browser interaction acceptance proves incomplete Company Profile native required validation blocks mutation, valid Company Profile saves through the browser, Funding Goal saves through the browser, owner navigation sets `#opportunities`, reload returns to that section, the local server reconnects, and saved company/goal/dilution facts persist through SQLite/server reload.
7. Added package command `npm run test:ui-browser`.
8. Added `tests/ui-browser-acceptance-contract.test.ts` so full regression fails if the UI acceptance script returns to Electron/BrowserWindow or loses system-Chrome/CDP/screenshot/viewport contracts.
9. System Chrome remains an optional machine acceptance runtime. BossAI Funding does not ship Chrome and does not add Electron, Playwright, Puppeteer or another browser runtime dependency.

## Machine evidence

- package version: `0.38.0`
- UI acceptance runtime contract: PASS
- built-product `npm run test:ui-browser`: PASS
- desktop screenshot: 1440×860, no horizontal overflow, expected visual tokens/owner decision sections PASS
- narrow/mobile screenshot: 390×844, responsive geometry and no horizontal overflow PASS
- browser interaction: native validation / Company Profile save / Funding Goal save / `#opportunities` navigation / reload persistence PASS
- first full `npm run verify` after v0.38 changes: 227/227 tests PASS; lint PASS; typecheck PASS; build PASS

## Persistence and security boundary

No financing runtime or security topology changed.

```text
Continuity schema             10
Tenant business tables       27
Workspace guards             27
Reference guards             34
Workspace revision triggers  81
API routes                   53
Public routes                 1
Public API                    GET /api/health
```

Remote access remains blocked. No approved production identity provider is configured. Production Security Review remains not attested.

## Completion truth

- Technical Acceptance: PASS for the current local v0.38 acceptance-alignment scope after final machine rerun remains green.
- Business Acceptance: PARTIAL.
- Real User Experience Acceptance: NOT YET PASSED. Browser automation validates the actual runtime but does not replace an unassisted owner/tester on the actual target environment.
- Production Security Review: NOT ATTESTED.
- Completion Level: 2.
- `productionReady=false`.
- `actuallyLaunched=false`.
- `realUserValidated=false`.
- `remoteAccess=blocked`.

No commit, push, deploy, release, signing, or formal installer action is authorized by this v0.38 batch.
