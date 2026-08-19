import test from "node:test";
import assert from "node:assert/strict";
import {
  FUNDING_API_SECURITY_MANIFEST,
  type FundingApiSecurityRoute,
} from "../src/server/api-security-manifest.ts";
import {
  assertFundingApiSecurityManifestInvariant,
  assertStartupSecurityInvariants,
  assertTenantRuntimeSecurityInvariant,
} from "../src/server/startup-security-invariants.ts";
import type { TenantSchemaPreparationStatus } from "../src/server/tenant-scope.ts";

function tenantStatus(overrides: Partial<TenantSchemaPreparationStatus> = {}): TenantSchemaPreparationStatus {
  return {
    workspaceId: "workspace-test",
    localTenantId: "local-workspace:workspace-test",
    stage: "database-hardened-local",
    expectedTableCount: 24,
    preparedTableCount: 24,
    missingTables: [],
    strictWorkspaceTableCount: 24,
    nullableWorkspaceTableCount: 0,
    nullableWorkspaceTables: [],
    databaseWorkspaceConstraintsComplete: true,
    databaseWorkspaceGuardTableCount: 24,
    databaseWorkspaceGuardsComplete: true,
    referenceGuardCount: 30,
    expectedReferenceGuardCount: 30,
    databaseReferenceGuardsComplete: true,
    rowsWithoutWorkspace: 0,
    rowsOutsideWorkspace: 0,
    foreignKeyViolationCount: 0,
    schemaPreparationComplete: true,
    repositoriesTenantScoped: true,
    externalIdentityVerification: false,
    crossTenantNegativeTestsPassed: true,
    remoteAccessEligible: false,
    ...overrides,
  };
}

test("startup security invariants accept the canonical manifest and hardened tenant status", () => {
  assert.doesNotThrow(() => assertFundingApiSecurityManifestInvariant());
  assert.doesNotThrow(() => assertTenantRuntimeSecurityInvariant(tenantStatus()));
  const status = assertStartupSecurityInvariants(tenantStatus());
  assert.equal(status.routeManifestReady, true);
  assert.equal(status.publicRouteCount, 1);
  assert.equal(status.publicRouteKey, "health");
  assert.equal(status.tenantTableCount, 24);
  assert.equal(status.workspaceGuardTableCount, 24);
  assert.equal(status.referenceGuardCount, 30);
  assert.equal(status.foreignKeyViolationCount, 0);
});

test("startup blocks duplicate route keys and signatures", () => {
  const duplicateKey: FundingApiSecurityRoute[] = [
    ...FUNDING_API_SECURITY_MANIFEST,
    { key: "health", method: "GET", pattern: /^\/api\/other-health$/, patternLabel: "/api/other-health", authorizationClass: "read" },
  ];
  assert.throws(() => assertFundingApiSecurityManifestInvariant(duplicateKey), /duplicate Route Security Manifest keys/i);

  const duplicateSignature: FundingApiSecurityRoute[] = [
    ...FUNDING_API_SECURITY_MANIFEST,
    { key: "other-health", method: "GET", pattern: /^\/api\/health$/, patternLabel: "/api/health", authorizationClass: "read" },
  ];
  assert.throws(() => assertFundingApiSecurityManifestInvariant(duplicateSignature), /duplicate Route Security Manifest signatures/i);
});

test("startup blocks any second anonymous API surface", () => {
  const secondPublic: FundingApiSecurityRoute[] = [
    ...FUNDING_API_SECURITY_MANIFEST,
    { key: "public-debug", method: "GET", pattern: /^\/api\/debug$/, patternLabel: "/api/debug", authorizationClass: "public" },
  ];
  assert.throws(() => assertFundingApiSecurityManifestInvariant(secondPublic), /only anonymous API route/i);
});

test("startup blocks route-pattern overlap for a registered route sample", () => {
  const overlapping: FundingApiSecurityRoute[] = [
    ...FUNDING_API_SECURITY_MANIFEST,
    { key: "catch-all-company", method: "PUT", pattern: /^\/api\/.*$/, patternLabel: "/api/catch-all", authorizationClass: "mutate" },
  ];
  assert.throws(() => assertFundingApiSecurityManifestInvariant(overlapping), /not uniquely classified/i);
});

test("startup blocks tenant schema, guard, reference and foreign-key regressions", () => {
  assert.throws(
    () => assertTenantRuntimeSecurityInvariant(tenantStatus({ strictWorkspaceTableCount: 22, nullableWorkspaceTableCount: 1 })),
    /tenant runtime security invariant failed/i,
  );
  assert.throws(
    () => assertTenantRuntimeSecurityInvariant(tenantStatus({ databaseWorkspaceGuardTableCount: 22, databaseWorkspaceGuardsComplete: false })),
    /databaseWorkspaceGuardTableCount=22\/24/i,
  );
  assert.throws(
    () => assertTenantRuntimeSecurityInvariant(tenantStatus({ referenceGuardCount: 28, databaseReferenceGuardsComplete: false })),
    /referenceGuardCount=28\/30/i,
  );
  assert.throws(
    () => assertTenantRuntimeSecurityInvariant(tenantStatus({ foreignKeyViolationCount: 1 })),
    /foreignKeyViolationCount=1/i,
  );
});
