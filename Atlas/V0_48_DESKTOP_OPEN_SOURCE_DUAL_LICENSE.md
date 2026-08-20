# BossAI Funding v0.48 — Desktop Distribution + Open-Source / Commercial Dual License

Date: 2026-08-20

## CEO decision

After v0.47 owner validation, BossAI Funding will be prepared as a Windows desktop-installable product before the repository is made public.

The source licensing target is:

- open-source: GNU AGPL v3 or later (`AGPL-3.0-or-later`);
- proprietary/commercial permissions outside AGPL: separate BossAI commercial license.

A commercial license does not falsely prohibit commercial activity that is already permitted under the AGPL. It is the alternative permission path for proprietary/closed-source/OEM and negotiated enterprise use outside AGPL obligations.

## Product decision

Desktop is a distribution layer, not a second BossAI Funding implementation.

The Electron desktop shell must reuse:

- the existing Funding HTTP server;
- the existing SQLite financing authority;
- the existing authorization/security boundary;
- the existing HTML/CSS/TypeScript owner experience.

It must not create a parallel financing database, task system, identity authority, approval engine, Agent Runtime, AI gateway, billing ledger or license ledger.

## Desktop architecture

`desktop/main.cjs`:

1. obtains a single-instance lock;
2. uses Electron's per-user `userData` directory;
3. stores the canonical SQLite database under `userData/data/bossai-funding.sqlite`;
4. starts the existing Funding server on `127.0.0.1` with port `0` (OS-assigned random port);
5. opens that loopback URL in a BrowserWindow;
6. runs the renderer with `nodeIntegration=false`, `contextIsolation=true`, `sandbox=true`;
7. sends external links to the system browser;
8. closes the local server/database during app shutdown.

Smoke tests use an explicit temporary userData override so engineering validation cannot write into a real owner's desktop profile.

## Windows distribution

Packaging target:

- Electron 43.4.1;
- electron-builder 26.15.3;
- Windows x64;
- NSIS assisted installer;
- per-user installation;
- install location can be changed;
- desktop/start-menu shortcut;
- uninstall does not delete user financing data.

Installer production release remains blocked until code signing is approved and verified.

## Default locale

Fresh installs default to English. A previously explicit user locale selection remains persistent as a UI preference. Browser/system language no longer silently overrides the product's English default.

## Open-source governance

Added / required:

- standard AGPL license text;
- `COMMERCIAL_LICENSE.md`;
- README;
- NOTICE;
- SECURITY;
- CONTRIBUTING;
- Code of Conduct;
- trademark policy;
- changelog;
- CLA draft and fail-closed contribution policy;
- issue / PR templates;
- source CI;
- Windows desktop CI;
- Dependabot;
- open-source readiness checklist.

External code/documentation PRs must not be merged until the contributor-rights agreement has legal approval and a verifiable signing workflow.

## Commercial authority boundary

The Community AGPL build does not require a proprietary entitlement to run.

BossAI Funding does not create or own an account/subscription/payment/license/entitlement authority. Any official proprietary commercial edition must consume the approved BossAI commercial authority/entitlement contract rather than creating a local ledger.

## Release truth

The repository stays Private during preparation. Public source visibility is a later explicit action after legal review, secret/provenance scanning, security-reporting setup and installability evidence.

An unsigned installer is engineering evidence only, not an official production release.



## Machine evidence — desktop and open-source preparation

The v0.48 implementation was validated on the real Windows workspace.

### Open-source / licensing contracts

- `LICENSE` was compared against `gh api licenses/agpl-3.0 --jq .body`: exact match / zero diff.
- package license metadata: `AGPL-3.0-or-later`.
- npm publication remains intentionally blocked with `private: true`; this does not restrict GitHub source visibility and prevents accidental `npm publish` for an application repository.
- AGPL commercial-use truth and separate commercial-license path are contract-tested.
- Community build proprietary-entitlement prohibition and external-commercial-authority boundary are contract-tested.
- CLA remains fail-closed: legal review required and external code/documentation PRs must not be merged until the contributor-rights workflow is approved and active.

### Git-history hygiene

Current repository history at scan time:

- commits: 2;
- commit authors: one known author (`刘风`);
- sensitive history filenames: 0;
- known high-risk token/private-key pattern commit hits: 0;
- forbidden OpenBcon implementation provenance hits: 0 after excluding the explicit protective rule in `scripts/lint.mjs`.

The protective lint rule itself intentionally contains the forbidden repository name so future implementation-code references fail closed.

This scan must be rerun immediately before the final visibility change if new commits are added.

### Development Electron smoke

PASS:

- existing Funding server starts inside Electron;
- OS-assigned random loopback port;
- isolated temporary userData database;
- title: `Capital Command Center`;
- fresh locale: `en`;
- Company Profile form present;
- no horizontal overflow;
- no write into the owner's real desktop data directory.

### Packaged executable smoke

`out/desktop/win-unpacked/BossAI Funding.exe` PASS:

- `packaged=true`;
- random `127.0.0.1` port;
- isolated temporary SQLite database;
- fresh locale English;
- owner form present;
- no horizontal overflow.

Packaged third-party notices include:

- `LICENSE.electron.txt`;
- `LICENSES.chromium.html`.

### NSIS installer lifecycle

Current installer:

`out/desktop/BossAI-Funding-Setup-0.48.0-x64.exe`

SHA-256:

`F22714F06F1369CF49E7A19C14FEED2DAD4F4B432B4609A88BFD54C2386C8178`

Real isolated lifecycle PASS:

1. silent install to an isolated installation directory;
2. installed EXE launches without a terminal;
3. fresh profile defaults to English;
4. a second app process is rejected by the single-instance lock while the primary runtime stays healthy;
5. Company Profile is written to the installed app's isolated SQLite database;
6. application stops and restarts;
7. Company Profile survives restart;
8. uninstall removes the application executable;
9. uninstall preserves the financing database;
10. reinstall succeeds;
11. the prior Company Profile is restored from the preserved database;
12. final uninstall again preserves financing data.

### Full product regression

After the desktop/default-English/open-source changes:

- full tests: 260/260 PASS;
- lint: PASS;
- typecheck: PASS;
- build: PASS;
- desktop/responsive system-Chrome acceptance: PASS;
- independent fresh-database 390×844 owner journey: PASS;
- locale switching/reload: PASS;
- full-DOM unchanged-English leak audit: zh-CN 0, zh-TW 0, es 0;
- receipt-reconciliation Chrome: PASS;
- development Electron desktop smoke: PASS;
- `git diff --check`: PASS.

## Remaining blockers before official release / public transition

The engineering installer is intentionally not represented as an official production release.

Remaining blockers:

1. **Windows icon** — builder currently uses the default Electron icon; an approved BossAI Funding brand icon is not present in this repository.
2. **Windows code signing** — `BossAI Funding.exe` and the NSIS installer both report Authenticode `NotSigned`.
3. **Dual-license legal review** — AGPL/commercial structure and CLA require qualified counsel approval before public contribution merging or commercial-license execution.
4. **Contributor signing workflow** — must be operational before external code/documentation PR merge.
5. **Commercial entitlement adapter** — proprietary edition must consume the approved external BossAI commercial authority; no approved verifier contract is implemented yet, and Funding must not invent a local ledger.
6. **GitHub public security controls** — current private-repository API returns 404 for Private Vulnerability Reporting/vulnerability-alert status; configure and verify during public-release preparation.
7. **Branch protection** — required checks can be bound after the new CI workflows are committed/pushed and have produced their check contexts.
8. **Human installed-product acceptance** — v0.47 local Web owner acceptance is confirmed PASS, but v0.48 desktop install/restart/uninstall/reinstall still needs owner target-device confirmation.

Repository visibility therefore remains Private at this checkpoint.
