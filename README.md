# BossAI Funding

BossAI Funding is an owner-facing capital decision and execution workspace that helps a founder or business owner move from **how much money is needed** to **money actually received**.

The product is local-first. Critical financing state is stored in SQLite, and the desktop edition runs the same local Funding server inside a Windows desktop shell rather than creating a separate business implementation.

## What it covers

- company funding profile and funding target;
- explainable Grant / Debt / Equity capital strategy;
- funding opportunities and official-source provenance;
- investor pipeline and follow-up;
- applications, financing materials, data room, diligence and term sheets;
- closing conditions, funding outcomes and actual receipt tranches;
- committed-capital arrival expectations and explicit receipt reconciliation;
- owner-first focus, blockers, timing and capital-gap views;
- local backup, export and recovery.

BossAI Funding is **not** an Agent Platform. Persistent AI employees, task runtime, approvals, memory, model routing and AI gateway authority belong to BossAI OS.

## Desktop edition

A Windows desktop distribution is built from this same repository.

```bash
npm run desktop:run
npm run desktop:smoke
npm run desktop:pack
npm run desktop:installer
npm run desktop:packaged-smoke
```

The desktop shell:

- binds the Funding server to loopback only;
- chooses a random local port;
- stores the SQLite database under the Electron user-data directory;
- prevents a second app instance;
- keeps renderer Node integration disabled;
- opens external links outside the application;
- leaves business state owned by the existing Funding server and SQLite layer.

The official Windows installer is produced with Electron Builder / NSIS. Unsigned development installers are not production releases; a public official release still requires the approved code-signing path.

## Language

A fresh installation defaults to **English**. Users can switch and persist one of the production-complete locales:

- English
- 简体中文
- 繁體中文
- Español

Language preference is presentation state only and never becomes financing authority.

## Development

Requirements:

- Node.js 24+
- npm
- Windows + Google Chrome for the full owner-readiness browser gates

```bash
npm install
npm run verify
npm run verify:owner-readiness
npm run verify:desktop
```

## Security boundary

The default runtime is local-owner / loopback only. Remote access remains blocked until approved external identity verification, authorization enforcement, tenant isolation and production security review are complete.

See `SECURITY.md`, `SECURITY_REVIEW_READINESS.md`, `IDENTITY_TENANT_CONTRACT.md`, and `AUTHORIZATION_POLICY.md`.

## Licensing

BossAI Funding uses a dual-license model.

### Open source

The repository is licensed under **GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`)**. See `LICENSE`.

The AGPL permits commercial activity when its terms are followed.

### Commercial license

If you need permissions outside the AGPL—for example proprietary/closed-source embedding, proprietary OEM redistribution, or negotiated enterprise rights—you need a separate commercial license from BossAI. See `COMMERCIAL_LICENSE.md`.

The project itself does not create a second commercial account, payment, subscription, license, or entitlement ledger. The Community AGPL build does not require a proprietary entitlement; an official proprietary commercial build consumes entitlement from the approved external BossAI commercial authority. See `COMMERCIAL_ENTITLEMENT_BOUNDARY.md`.

### Distribution modes

Community mode is the default:

```text
BOSSAI_FUNDING_DISTRIBUTION=community
```

It does not contact BossAI Headquarters Commerce and does not require a proprietary BossAI token.

The proprietary commercial integration mode is explicit and fail-closed:

```text
BOSSAI_FUNDING_DISTRIBUTION=commercial
BOSSAI_FUNDING_HEADQUARTERS_BASE_URL=https://<approved-headquarters-host>
BOSSAI_FUNDING_INSTALLATION_ID=<optional-stable-installation-id>
```

On desktop, if no valid commercial session exists, BossAI Funding opens a dedicated BossAI commercial-account sign-in window and supports Headquarters MFA. The resulting `bossai_session_...` value is encrypted with Electron `safeStorage` (Windows DPAPI on the supported Windows target) before it is written to the desktop user-data directory. Passwords, MFA proofs, raw sessions, entitlement truth, and financing records are not written to Funding SQLite.

Every desktop launch revalidates the session through Headquarters `GET /api/v1/commerce/entitlement` (`bossai.commercial-entitlement.v1`) before Funding persistence starts. Proprietary access requires the exact `bossai-funding` product/install/version binding plus an active membership entitlement whose feature allowlist contains:

```text
bossai-funding.commercial
```

This extra paid-capability gate is required because an active product-license record alone is not treated as proof that the customer purchased proprietary BossAI Funding rights. Financing records and local SQLite business state are never sent to Headquarters for license validation.

`BOSSAI_FUNDING_HEADQUARTERS_BEARER_TOKEN` remains an **engineering integration override only**. Do not bake a bearer token into the installer, source tree, `.env`, command history, CI artifact, or release asset. An official proprietary release still requires real production Headquarters paid-account acceptance and publicly trusted Windows code signing. Outside-counsel review is not a release gate for this project under the recorded CEO waiver.

## Contributing

Read `CONTRIBUTING.md` before opening a pull request. The versioned `CLA.md` contributor-rights agreement is active under CEO approval. External pull requests require the exact CLA checkbox and must pass both protected `verify` and `contributor-rights` gates before merge.

## Source and project links

- Repository: https://github.com/liufeng1976/bossai-funding-workspace
- Issues: https://github.com/liufeng1976/bossai-funding-workspace/issues

## Current release status

The repository is public under AGPL-3.0-or-later. Tag-bound source releases and official signed Windows releases are separate gates. The desktop icon is generated deterministically from repository source; unsigned engineering installers remain non-production evidence. Passing tests or producing an installer is not by itself a production/GA claim.
