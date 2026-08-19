import type { FundingAuthorizationEnforcementMode } from "./authorization-policy.ts";
import { fundingApiSecurityManifestStatus } from "./api-security-manifest.ts";
import { fundingHttpResourceLimitStatus, type FundingHttpResourceLimitProjection } from "./http-resource-limits.ts";
import type { SecurityDecisionRetentionStatus } from "./security-decision-database.ts";
import type { StartupSecurityInvariantStatus } from "./startup-security-invariants.ts";
import type { TenantSchemaPreparationStatus } from "./tenant-scope.ts";
import type { WorkspaceRevisionReadiness } from "./workspace-revision.ts";

export interface SecurityReviewReadinessProjection {
  status: "not-approved";
  remoteAccessDecision: "blocked";
  authorizationEnforcementMode: FundingAuthorizationEnforcementMode;
  tenantPersistence: {
    ready: boolean;
    scopedTables: number;
    requiredTables: number;
    workspaceGuardsComplete: boolean;
    referenceGuardsComplete: boolean;
    foreignKeyViolationCount: number;
  };
  apiSecurityManifest: {
    ready: true;
    routeCount: number;
    publicRouteCount: number;
    protectedRouteCount: number;
    unclassifiedApiFailClosed: true;
  };
  identityVerification: {
    adapterContractReady: true;
    adapterConfigured: boolean;
    approvedCryptographicProviderConfigured: boolean;
  };
  authorization: {
    policyReady: true;
    enforcementImplementationReady: true;
    verifiedExternalModeConfigured: boolean;
  };
  browserRequestIntegrity: {
    ready: true;
    sameOriginMutationRequired: true;
    jsonMutationRequired: true;
    crossSiteFetchMetadataBlocked: true;
    nativeJsonClientsWithoutOriginAllowed: true;
  };
  workspaceRevision: WorkspaceRevisionReadiness;
  startupSecurityInvariants: StartupSecurityInvariantStatus;
  httpResourceLimits: FundingHttpResourceLimitProjection;
  securityDecisionEvidence: {
    ready: true;
    restorePreservesEvidence: true;
    tenantPrunedBackup: true;
    retention: SecurityDecisionRetentionStatus;
  };
  securityReviewAttested: false;
  blockers: string[];
}

export function projectSecurityReviewReadiness(input: {
  tenantStatus: TenantSchemaPreparationStatus;
  authorizationEnforcement: FundingAuthorizationEnforcementMode;
  identityAdapterConfigured: boolean;
  startupSecurityInvariants: StartupSecurityInvariantStatus;
  workspaceRevision: WorkspaceRevisionReadiness;
  securityDecisionRetention: SecurityDecisionRetentionStatus;
}): SecurityReviewReadinessProjection {
  const manifest = fundingApiSecurityManifestStatus();
  const tenantReady =
    input.tenantStatus.schemaPreparationComplete &&
    input.tenantStatus.databaseWorkspaceConstraintsComplete &&
    input.tenantStatus.databaseWorkspaceGuardsComplete &&
    input.tenantStatus.databaseReferenceGuardsComplete &&
    input.tenantStatus.foreignKeyViolationCount === 0;
  const verifiedExternalModeConfigured = input.authorizationEnforcement === "verified-external" && input.identityAdapterConfigured;
  const blockers: string[] = [];
  if (!tenantReady) blockers.push("TENANT_PERSISTENCE_SECURITY_GATE_NOT_READY");
  if (!input.workspaceRevision.ready) blockers.push("WORKSPACE_REVISION_GUARD_NOT_READY");
  if (!input.identityAdapterConfigured) blockers.push("APPROVED_CRYPTOGRAPHIC_IDENTITY_ADAPTER_NOT_CONFIGURED");
  if (!verifiedExternalModeConfigured) blockers.push("VERIFIED_EXTERNAL_RUNTIME_NOT_CONFIGURED");
  blockers.push("PRODUCTION_SECURITY_REVIEW_NOT_ATTESTED");
  blockers.push("REMOTE_BINDING_REMAINS_BLOCKED");

  return {
    status: "not-approved",
    remoteAccessDecision: "blocked",
    authorizationEnforcementMode: input.authorizationEnforcement,
    tenantPersistence: {
      ready: tenantReady,
      scopedTables: input.tenantStatus.preparedTableCount,
      requiredTables: input.tenantStatus.expectedTableCount,
      workspaceGuardsComplete: input.tenantStatus.databaseWorkspaceGuardsComplete,
      referenceGuardsComplete: input.tenantStatus.databaseReferenceGuardsComplete,
      foreignKeyViolationCount: input.tenantStatus.foreignKeyViolationCount,
    },
    apiSecurityManifest: {
      ready: true,
      routeCount: manifest.routeCount,
      publicRouteCount: manifest.publicRouteCount,
      protectedRouteCount: manifest.protectedRouteCount,
      unclassifiedApiFailClosed: true,
    },
    identityVerification: {
      adapterContractReady: true,
      adapterConfigured: input.identityAdapterConfigured,
      approvedCryptographicProviderConfigured: input.identityAdapterConfigured,
    },
    authorization: {
      policyReady: true,
      enforcementImplementationReady: true,
      verifiedExternalModeConfigured,
    },
    browserRequestIntegrity: {
      ready: true,
      sameOriginMutationRequired: true,
      jsonMutationRequired: true,
      crossSiteFetchMetadataBlocked: true,
      nativeJsonClientsWithoutOriginAllowed: true,
    },
    workspaceRevision: input.workspaceRevision,
    startupSecurityInvariants: input.startupSecurityInvariants,
    httpResourceLimits: fundingHttpResourceLimitStatus(),
    securityDecisionEvidence: {
      ready: true,
      restorePreservesEvidence: true,
      tenantPrunedBackup: true,
      retention: input.securityDecisionRetention,
    },
    securityReviewAttested: false,
    blockers,
  };
}
