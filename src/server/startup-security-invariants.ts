import {
  FUNDING_API_SECURITY_MANIFEST,
  type FundingApiSecurityRoute,
} from "./api-security-manifest.ts";
import type { TenantSchemaPreparationStatus } from "./tenant-scope.ts";

export interface StartupSecurityInvariantStatus {
  routeManifestReady: true;
  routeCount: number;
  publicRouteCount: 1;
  publicRouteKey: "health";
  tenantSchemaReady: true;
  tenantTableCount: number;
  workspaceGuardTableCount: number;
  referenceGuardCount: number;
  foreignKeyViolationCount: 0;
}

function samplePath(route: FundingApiSecurityRoute): string {
  return route.patternLabel.replace(/:id\b/g, "1");
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function assertFundingApiSecurityManifestInvariant(
  manifest: readonly FundingApiSecurityRoute[] = FUNDING_API_SECURITY_MANIFEST,
): void {
  if (manifest.length === 0) {
    throw new Error("BossAI Funding startup blocked: the Route Security Manifest is empty.");
  }

  const duplicateKeys = duplicateValues(manifest.map((route) => route.key));
  if (duplicateKeys.length > 0) {
    throw new Error(`BossAI Funding startup blocked: duplicate Route Security Manifest keys: ${duplicateKeys.join(", ")}.`);
  }

  const duplicateSignatures = duplicateValues(manifest.map((route) => `${route.method} ${route.patternLabel}`));
  if (duplicateSignatures.length > 0) {
    throw new Error(`BossAI Funding startup blocked: duplicate Route Security Manifest signatures: ${duplicateSignatures.join(", ")}.`);
  }

  const publicRoutes = manifest.filter((route) => route.authorizationClass === "public");
  if (
    publicRoutes.length !== 1 ||
    publicRoutes[0]?.key !== "health" ||
    publicRoutes[0]?.method !== "GET" ||
    publicRoutes[0]?.patternLabel !== "/api/health"
  ) {
    throw new Error("BossAI Funding startup blocked: GET /api/health must be the only anonymous API route.");
  }

  for (const route of manifest) {
    const path = samplePath(route);
    const matches = manifest.filter((candidate) => candidate.method === route.method && candidate.pattern.test(path));
    if (matches.length !== 1 || matches[0]?.key !== route.key) {
      const keys = matches.map((candidate) => candidate.key).join(", ") || "none";
      throw new Error(
        `BossAI Funding startup blocked: Route Security Manifest route ${route.key} is not uniquely classified by sample path ${route.method} ${path}; matches: ${keys}.`,
      );
    }
  }
}

export function assertTenantRuntimeSecurityInvariant(status: TenantSchemaPreparationStatus): void {
  const failures: string[] = [];
  if (!status.schemaPreparationComplete) failures.push("schemaPreparationComplete=false");
  if (status.preparedTableCount !== status.expectedTableCount) failures.push(`preparedTableCount=${status.preparedTableCount}/${status.expectedTableCount}`);
  if (status.strictWorkspaceTableCount !== status.expectedTableCount) failures.push(`strictWorkspaceTableCount=${status.strictWorkspaceTableCount}/${status.expectedTableCount}`);
  if (status.nullableWorkspaceTableCount !== 0) failures.push(`nullableWorkspaceTableCount=${status.nullableWorkspaceTableCount}`);
  if (!status.databaseWorkspaceConstraintsComplete) failures.push("databaseWorkspaceConstraintsComplete=false");
  if (status.databaseWorkspaceGuardTableCount !== status.expectedTableCount) failures.push(`databaseWorkspaceGuardTableCount=${status.databaseWorkspaceGuardTableCount}/${status.expectedTableCount}`);
  if (!status.databaseWorkspaceGuardsComplete) failures.push("databaseWorkspaceGuardsComplete=false");
  if (status.referenceGuardCount !== status.expectedReferenceGuardCount) failures.push(`referenceGuardCount=${status.referenceGuardCount}/${status.expectedReferenceGuardCount}`);
  if (!status.databaseReferenceGuardsComplete) failures.push("databaseReferenceGuardsComplete=false");
  if (status.rowsWithoutWorkspace !== 0) failures.push(`rowsWithoutWorkspace=${status.rowsWithoutWorkspace}`);
  if (status.foreignKeyViolationCount !== 0) failures.push(`foreignKeyViolationCount=${status.foreignKeyViolationCount}`);
  if (!status.repositoriesTenantScoped) failures.push("repositoriesTenantScoped=false");
  if (status.remoteAccessEligible !== false) failures.push("remoteAccessEligible must remain false before production approval");

  if (failures.length > 0) {
    throw new Error(`BossAI Funding startup blocked: tenant runtime security invariant failed (${failures.join("; ")}).`);
  }
}

export function assertStartupSecurityInvariants(status: TenantSchemaPreparationStatus): StartupSecurityInvariantStatus {
  assertFundingApiSecurityManifestInvariant();
  assertTenantRuntimeSecurityInvariant(status);
  const publicRouteCount = FUNDING_API_SECURITY_MANIFEST.filter((route) => route.authorizationClass === "public").length;
  return {
    routeManifestReady: true,
    routeCount: FUNDING_API_SECURITY_MANIFEST.length,
    publicRouteCount: publicRouteCount as 1,
    publicRouteKey: "health",
    tenantSchemaReady: true,
    tenantTableCount: status.preparedTableCount,
    workspaceGuardTableCount: status.databaseWorkspaceGuardTableCount,
    referenceGuardCount: status.referenceGuardCount,
    foreignKeyViolationCount: 0,
  };
}
