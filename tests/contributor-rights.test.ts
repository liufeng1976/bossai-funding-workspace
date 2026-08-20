import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateContributorRights, type ContributorRightsPolicy } from "../scripts/verify-contributor-rights.ts";

const root = process.cwd();
const policy = JSON.parse(readFileSync(resolve(root, ".github", "contributor-rights-policy.json"), "utf8")) as ContributorRightsPolicy;
const cla = readFileSync(resolve(root, "CLA.md"), "utf8");
const contributing = readFileSync(resolve(root, "CONTRIBUTING.md"), "utf8");
const template = readFileSync(resolve(root, ".github", "pull_request_template.md"), "utf8");
const workflow = readFileSync(resolve(root, ".github", "workflows", "contributor-rights.yml"), "utf8");
const verifier = readFileSync(resolve(root, "scripts", "verify-contributor-rights.ts"), "utf8");

function attestedBody(): string {
  return `## Contribution rights\n\n- [x] ${policy.requiredAttestation}\n`;
}

test("trusted BossAI contributor and approved dependency bot pass without external CLA checkbox", () => {
  assert.equal(evaluateContributorRights({ actor: "liufeng1976", body: "", policy }).ok, true);
  assert.equal(evaluateContributorRights({ actor: "dependabot[bot]", body: "", policy }).ok, true);
});

test("external contributor must accept the exact versioned CLA attestation", () => {
  assert.equal(evaluateContributorRights({ actor: "outside-contributor", body: attestedBody(), policy }).ok, true);
  assert.equal(evaluateContributorRights({ actor: "outside-contributor", body: attestedBody().replace("- [x]", "- [ ]"), policy }).ok, false);
  assert.equal(evaluateContributorRights({ actor: "outside-contributor", body: attestedBody().replace("authorized", "allowed"), policy }).ok, false);
  assert.equal(evaluateContributorRights({ actor: "", body: attestedBody(), policy }).ok, false);
});

test("CLA, PR template and machine policy share the same active version and exact attestation", () => {
  assert.equal(policy.schemaVersion, "bossai.contributor-rights-policy.v1");
  assert.equal(policy.claVersion, "2026-08-20.1");
  assert.match(cla, /Status: \*\*ACTIVE BY BOSSAI CEO APPROVAL — NO LAWYER APPROVAL CLAIMED\.\*\*/u);
  assert.ok(cla.includes("Version: `" + policy.claVersion + "`"));
  assert.ok(cla.includes(policy.requiredAttestation));
  assert.ok(template.includes(`- [ ] ${policy.requiredAttestation}`));
  assert.match(contributing, /protected `contributor-rights` status pass/u);
});

test("contributor-rights workflow evaluates trusted base policy and never checks out untrusted PR code", () => {
  assert.match(workflow, /pull_request_target:/u);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/u);
  assert.match(workflow, /persist-credentials: false/u);
  assert.doesNotMatch(workflow, /pull_request\.head\.sha/u);
  assert.match(workflow, /statuses: write/u);
  assert.match(verifier, /context: "contributor-rights"/u);
  assert.match(verifier, /pull\.head\.sha/u);
  assert.doesNotMatch(verifier, /exec|spawn|checkout|git clone/u);
});
