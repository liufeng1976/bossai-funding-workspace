# BossAI Funding v0.51 Contributor Rights Live Proof

Date: 2026-08-20

Purpose: provide a minimal, non-product pull request whose only job is to prove the new contributor-rights workflow operates from protected `main` before that status is made mandatory in branch protection.

Expected evidence:

1. `pull_request_target` executes the trusted workflow from the base commit;
2. the PR author/attestation is evaluated without checking out PR code;
3. GitHub receives `contributor-rights=success` on the PR head SHA;
4. normal `verify` also passes;
5. after live success, `contributor-rights` is added to required `main` status checks;
6. this same PR is then merged only while both required checks are satisfied.

No product code, runtime authority, financing data, credential, license truth, or commercial state changes in this proof PR.

## First live proof result

PR: `#7`

Initial head: `3d3d5fa4404f2fb7e94daefd0c71ea28c6e078aa`

GitHub evidence:

- `Contributor Rights` workflow run `32344905425`: PASS;
- workflow event: `pull_request_target`;
- `attest` job: PASS;
- independent PR-head commit status `contributor-rights`: SUCCESS;
- status description: trusted BossAI contributor `liufeng1976`;
- Source CI `verify` also runs independently as the normal PR code check.

After this live success, `main` branch protection was updated from required context `verify` to strict required contexts:

```text
verify
contributor-rights
```

The proof PR is intentionally updated after that protection change so its new head must satisfy both required contexts again before merge.