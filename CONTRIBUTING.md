# Contributing to BossAI Funding

Thank you for considering a contribution.

## Before you contribute

BossAI Funding is dual-licensed under AGPL-3.0-or-later and separate commercial terms. Preserving that model requires BossAI to have sufficient rights to relicense accepted contributions.

**Until the contributor-license process in `CLA.md` is legally approved and operational, external code/documentation pull requests may be reviewed but must not be merged.** Issues, bug reports, reproducible test cases, product feedback and security reports remain welcome.

Do not submit code copied or derived from repositories whose license or provenance is incompatible with this project. In particular, follow the clean-room boundary in `AGENTS.md` and `CLEAN_ROOM_POLICY.md`.

## Development setup

```bash
npm install
npm run verify
npm run verify:owner-readiness
npm run verify:desktop
```

For desktop distribution work:

```bash
npm run desktop:pack
npm run desktop:packaged-smoke
npm run desktop:installer
```

## Pull requests

A pull request should:

- explain the user problem and user-visible result;
- stay inside BossAI Funding's financing-product boundary;
- include tests for new or changed behavior;
- preserve local-loopback and tenant/security fail-closed rules;
- avoid creating a second Agent Runtime, approval engine, identity authority, AI gateway, billing ledger, license ledger, or generic task platform;
- pass lint, typecheck, tests and relevant real-entry gates;
- disclose new dependencies and their licenses;
- state whether any UI text needs localization.

## License of contributions

Do not assume that a normal GitHub pull request alone grants BossAI commercial relicensing rights. Contribution acceptance is subject to the contributor-rights process in `CLA.md`.

## Security issues

Do not open a public issue for a vulnerability. Follow `SECURITY.md`.
