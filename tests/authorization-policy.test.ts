import test from "node:test";
import assert from "node:assert/strict";
import { authorizationPolicyStatus, classifyFundingApiOperation, evaluateFundingAuthorization, type FundingAuthorizationOperation } from "../src/server/authorization-policy.ts";
import type { ExternalIdentityClaimsContract } from "../src/server/identity-boundary.ts";

function principal(roles: string[], tenantId = "tenant-a"): ExternalIdentityClaimsContract {
  return {
    subject: "user-1",
    tenantId,
    roles,
    issuer: "https://identity.example.invalid",
    authenticatedAt: "2026-08-15T12:00:00.000Z",
  };
}

test("authorization policy is deny-by-default with a local-owner default and verified-external enforcement implementation", () => {
  const status = authorizationPolicyStatus();
  assert.equal(status.enforcementMode, "local-owner");
  assert.equal(status.enforcementImplementationReady, true);
  assert.equal(status.productionAuthorizationReady, false);
  assert.equal(status.upstreamVerificationRequired, true);
  assert.equal(status.denyByDefault, true);
  assert.deepEqual(status.roles.owner, ["read", "mutate", "export-summary", "export-data", "backup", "restore"]);
  assert.deepEqual(status.roles.editor, ["read", "mutate", "export-summary"]);
  assert.deepEqual(status.roles.viewer, ["read"]);
});

test("owner can perform all financing operations for the authenticated tenant", () => {
  const operations: FundingAuthorizationOperation[] = ["read", "mutate", "export-summary", "export-data", "backup", "restore"];
  for (const operation of operations) {
    const decision = evaluateFundingAuthorization(principal(["owner"]), operation, "tenant-a");
    assert.equal(decision.allowed, true, operation);
    assert.equal(decision.effectiveRole, "owner");
  }
});

test("editor and viewer are restricted from high-impact data operations", () => {
  assert.equal(evaluateFundingAuthorization(principal(["editor"]), "mutate", "tenant-a").allowed, true);
  assert.equal(evaluateFundingAuthorization(principal(["editor"]), "export-summary", "tenant-a").allowed, true);
  assert.equal(evaluateFundingAuthorization(principal(["editor"]), "export-data", "tenant-a").allowed, false);
  assert.equal(evaluateFundingAuthorization(principal(["editor"]), "backup", "tenant-a").allowed, false);
  assert.equal(evaluateFundingAuthorization(principal(["viewer"]), "read", "tenant-a").allowed, true);
  assert.equal(evaluateFundingAuthorization(principal(["viewer"]), "mutate", "tenant-a").allowed, false);
  assert.equal(evaluateFundingAuthorization(principal(["viewer"]), "export-summary", "tenant-a").allowed, false);
});

test("tenant mismatch and unrecognized roles fail closed", () => {
  const wrongTenant = evaluateFundingAuthorization(principal(["owner"], "tenant-b"), "read", "tenant-a");
  assert.equal(wrongTenant.allowed, false);
  assert.equal(wrongTenant.effectiveRole, null);
  assert.match(wrongTenant.reason, /does not match/i);

  const unknownRole = evaluateFundingAuthorization(principal(["super-admin"]), "read", "tenant-a");
  assert.equal(unknownRole.allowed, false);
  assert.equal(unknownRole.effectiveRole, null);
  assert.match(unknownRole.reason, /denied by default/i);
});

test("highest recognized role determines effective authorization", () => {
  const multiRole = evaluateFundingAuthorization(principal(["viewer", "editor"]), "mutate", "tenant-a");
  assert.equal(multiRole.allowed, true);
  assert.equal(multiRole.effectiveRole, "editor");
});

test("API route classification covers public, read, mutation and high-impact data operations", () => {
  assert.equal(classifyFundingApiOperation("GET", "/api/health"), "public");
  assert.equal(classifyFundingApiOperation("GET", "/api/security/tenant-scope"), "read");
  assert.equal(classifyFundingApiOperation("GET", "/api/security/identity-verifier"), "read");
  assert.equal(classifyFundingApiOperation("GET", "/api/bootstrap"), "read");
  assert.equal(classifyFundingApiOperation("GET", "/api/continuity/backups"), "read");
  assert.equal(classifyFundingApiOperation("GET", "/api/reports/owner-board-summary.md"), "export-summary");
  assert.equal(classifyFundingApiOperation("GET", "/api/reports/capital-pipeline.csv"), "export-data");
  assert.equal(classifyFundingApiOperation("GET", "/api/continuity/export"), "export-data");
  assert.equal(classifyFundingApiOperation("POST", "/api/continuity/backup"), "backup");
  assert.equal(classifyFundingApiOperation("POST", "/api/continuity/restore"), "restore");
  assert.equal(classifyFundingApiOperation("PUT", "/api/company-profile"), "mutate");
  assert.equal(classifyFundingApiOperation("POST", "/api/sources/grants-gov/search"), "mutate");
  assert.equal(classifyFundingApiOperation("PATCH", "/api/investors/42"), "mutate");
  assert.equal(classifyFundingApiOperation("GET", "/styles.css"), null);
});
