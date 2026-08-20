# BossAI Funding v0.51 Public Source Release Evidence

Date: 2026-08-20

## Released source identity

Release tag: `v0.51.0`

Annotated tag object: `4a627ac8867b9a43829948a0b530356a1d57f044`

Release commit: `4a2d9f5121e282bba91a1d0aa23b9c9090d7e90f`

Package version: `0.51.0`

License: `AGPL-3.0-or-later`

## Final exact-main pre-tag evidence

Before tag creation:

- main working tree: clean;
- Source CI push run `32345384094`: PASS;
- historical sensitive credential/private-key filenames: 0;
- common private-key / AWS / GitHub / OpenAI secret-pattern path hits: 0;
- OpenBcon implementation-path provenance: 0;
- GNU AGPL text: official exact match;
- `main` branch protection: strict required `verify` + `contributor-rights`, admins enforced, linear history, no force-push, no branch deletion, conversation resolution required;
- GitHub Secret Scanning and Push Protection: enabled;
- Private Vulnerability Reporting: enabled.

Historical raw `bossai_session_...`-shaped occurrences were classified separately as known synthetic commercial smoke fixtures from earlier commits, not production credentials. The current source no longer contains that raw fixture literal.

## Tag-driven release workflow

GitHub Actions Source Release run:

`32345532712`

Result: PASS.

The workflow independently reran:

- `npm ci`;
- `npm run verify`;
- `npm run test:desktop-contract`;
- source release tag/package/license identity gate;
- source-only GitHub Release publication.

## GitHub Release truth

Release title:

`BossAI Funding v0.51.0 — Source Release`

Release URL:

`https://github.com/liufeng1976/bossai-funding-workspace/releases/tag/v0.51.0`

State:

- draft: false;
- prerelease: false;
- tag: `v0.51.0`;
- explicit AGPL source-only note present;
- release assets array: empty.

Therefore no unsigned Windows engineering installer was uploaded or represented as a publicly trusted official binary. GitHub-provided source archives remain the normal tag/source delivery mechanism.

## Desktop release separation

The locally generated v0.51 engineering installer remains:

`BossAI-Funding-Setup-0.51.0-x64.exe`

SHA-256:

`3CD9B0BF4F873F81CEBF70872C644A5036A632A27D19C89C0306B17B67A1578C`

Authenticode remains `NotSigned` for both installer and packaged app EXE. It is engineering evidence only and is intentionally absent from the official source Release.

The repository contains a fail-closed signed-Windows release workflow, but no public-trust signing credential is currently available. The local certificate store contains only self-signed BossAI development/preview certificates, and the GitHub repository has no configured Windows signing secret names.

## Headquarters Commerce integration truth

A real Headquarters Commerce HTTP contract was tested on a clean isolated worktree using the actual `createCommerceServer`, not a mock. The contract proved:

- a normal plan does not invent `bossai-funding.commercial`;
- an explicitly configured active Plan/Membership may grant `bossai-funding.commercial`;
- canonical `bossai.commercial-entitlement.v1` returns that paid capability;
- Headquarters remains non-business-execution and non-Provider-routing authority.

Headquarters contract test: PASS.

Headquarters native repository tests excluding its three pre-existing sibling-repository relative-path contracts: 117/117 PASS.

Headquarters PR #1 is Draft because its existing GitHub CI checks out only the Headquarters repository while three existing tests require BossAI Desktop, Kaipai and CRM sibling repositories. Remote evidence after the existing 0.21 verification-identity repair: Container build PASS; Ubuntu/Windows Verify each 117 PASS / 3 sibling-path FAIL.

## Production proprietary blockers

These are external and are not fabricated as complete:

1. Headquarters production account/entitlement routes are not deployed at the documented `cloud.destinykit.com` entry. On 2026-08-20: `/health=200`, while `/ready`, `/api/v1/auth/session`, `/api/v1/commerce/entitlement=404`.
2. No local `BOSSAI_HQ_*` production runtime variables were present.
3. No public-trust Windows code-signing certificate/repository signing secrets are available.

Accordingly:

- Community public source release: COMPLETE;
- Community desktop engineering acceptance: COMPLETE;
- Proprietary entitlement technical integration: COMPLETE locally and with real HQ server contract;
- official signed Windows binary release: BLOCKED on public-trust signing credential;
- real proprietary production paid-account E2E: BLOCKED on Headquarters production deployment/configuration.