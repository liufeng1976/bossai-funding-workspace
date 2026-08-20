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
BOSSAI_FUNDING_HEADQUARTERS_BEARER_TOKEN=<account-session-or-customer-key>
BOSSAI_FUNDING_INSTALLATION_ID=<optional-stable-installation-id>
```

It consumes only the Headquarters `GET /api/v1/commerce/entitlement` contract (`bossai.commercial-entitlement.v1`) and verifies that the entitlement is for `bossai-funding`, the current product version and the current installation before Funding persistence starts. Financing records and local SQLite business state are not sent to Headquarters for license validation.

The environment-provided bearer credential is an **engineering integration path**, not the final production credential UX. An official proprietary desktop release still requires approved account/session acquisition and secure operating-system credential handling; do not bake a bearer token into the installer, source tree, `.env`, command history, or release artifact.

## Contributing

Read `CONTRIBUTING.md` before opening a pull request. Because BossAI Funding is dual-licensed, contributions cannot be merged until the required contributor-rights agreement is complete. See `CLA.md`.

## Source and project links

- Repository: https://github.com/liufeng1976/bossai-funding-workspace
- Issues: https://github.com/liufeng1976/bossai-funding-workspace/issues

## Current release status

The repository may be prepared for public release before it is actually made public. A public source release and an official signed desktop release are separate gates. Passing tests or producing an installer is not by itself a production-release claim.
