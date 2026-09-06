# BossAI Funding

BossAI Funding is an owner-facing capital decision and execution workspace that helps a founder or business owner move from **how much money is needed** to **money actually received**.

The product is local-first. Critical financing state is stored in SQLite, and the desktop edition runs the same local Funding server inside a Windows desktop shell rather than creating a separate business implementation.

> **License classification:** Source Available / Community Source, not OSI Open Source. The current post-`v0.51.0` source line is free for personal, educational, evaluation, research, and other non-commercial use under BossAI Community Source License 1.0. Commercial use requires BossAI authorization. Historical `v0.51.0` and earlier revisions keep their existing AGPL rights; see `LICENSE_HISTORY.md`.

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

### Current Community Source line

The post-`v0.51.0` repository source line is licensed under **BossAI Community Source License 1.0**. See `LICENSE`.

Permitted Community use includes personal, educational, evaluation, research, and other non-commercial use subject to the license. Commercial use requires a separate BossAI commercial license or approved entitlement. This is **source available, not OSI Open Source**.

### Historical AGPL line

The `v0.51.0` release and repository revisions at or before commit `6600da2899d83eddcfc43efbc2d81805d662d77a` were published under **AGPL-3.0-or-later**. Rights already granted for those historical revisions remain governed by their historical AGPL terms and are not revoked. See `LICENSE_HISTORY.md`.

### Commercial authorization

Commercial use of a current Community Source revision—including company production use, paid client delivery, consulting, SaaS, proprietary embedding, OEM/white-label, resale, or other profit-making use—requires BossAI commercial authorization. See `COMMERCIAL_LICENSE.md`.

The project itself does not create a second commercial account, payment, subscription, license, or entitlement ledger. Commercial authorization is owned by the approved external BossAI commercial authority. See `COMMERCIAL_ENTITLEMENT_BOUNDARY.md`.

### Distribution modes

Community mode is the default technical runtime mode:

```text
BOSSAI_FUNDING_DISTRIBUTION=community
```

It does not contact BossAI Headquarters Commerce and does not require a proprietary BossAI token merely to start the local Community runtime. **This offline technical behavior does not grant commercial-use rights.** Commercial use remains subject to the current source license.

The proprietary commercial integration mode is explicit and fail-closed:

```text
BOSSAI_FUNDING_DISTRIBUTION=commercial
BOSSAI_FUNDING_HEADQUARTERS_BASE_URL=https://<approved-headquarters-host>
BOSSAI_FUNDING_INSTALLATION_ID=<optional-stable-installation-id>
```

On desktop, if no valid commercial session exists, BossAI Funding opens a dedicated BossAI commercial-account sign-in window and supports Headquarters MFA. The resulting `bossai_session_...` value is encrypted with Electron `safeStorage` (Windows DPAPI on the supported Windows target) before it is written to the desktop user-data directory. Passwords, MFA proofs, raw sessions, entitlement truth, and financing records are not written to Funding SQLite.

Every desktop launch in proprietary commercial mode revalidates the session through Headquarters `GET /api/v1/commerce/entitlement` (`bossai.commercial-entitlement.v1`) before Funding persistence starts. Proprietary access requires the exact `bossai-funding` product/install/version binding plus an active membership entitlement whose feature allowlist contains:

```text
bossai-funding.commercial
```

This extra paid-capability gate is required because an active product-license record alone is not treated as proof that the customer purchased proprietary BossAI Funding rights. Financing records and local SQLite business state are never sent to Headquarters for license validation.

`BOSSAI_FUNDING_HEADQUARTERS_BEARER_TOKEN` remains an **engineering integration override only**. Do not bake a bearer token into the installer, source tree, `.env`, command history, CI artifact, or release asset. An official proprietary release still requires real production Headquarters paid-account acceptance and publicly trusted Windows code signing. Outside-counsel review is not a release gate for this project under the recorded CEO waiver.

## Contributing

Read `CONTRIBUTING.md` before opening a pull request. The versioned `CLA.md` contributor-rights agreement is active under CEO approval. External pull requests require the exact active CLA checkbox and must pass both protected `verify` and `contributor-rights` gates before merge.

## Source and project links

- Repository: https://github.com/liufeng1976/bossai-funding-workspace
- Source releases: https://github.com/liufeng1976/bossai-funding-workspace/releases
- Issues: https://github.com/liufeng1976/bossai-funding-workspace/issues
- BossAI: https://bossaios.com

## Current release status

The repository source line is now `0.52.0` under BossAI Community Source License 1.0. The existing `v0.51.0` public source release remains the historical AGPL release until a later Community Source release is explicitly published. Tag-bound source releases and official signed Windows releases are separate gates. The desktop icon is generated deterministically from repository source; unsigned engineering installers remain non-production evidence and are intentionally absent from the official source Release. Passing tests or producing an installer is not by itself a production/GA claim.
