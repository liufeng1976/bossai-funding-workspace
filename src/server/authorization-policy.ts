import type { ExternalIdentityClaimsContract } from "./identity-boundary.ts";
import { matchFundingApiSecurityRoute } from "./api-security-manifest.ts";

export type FundingAuthorizationRole = "owner" | "editor" | "viewer";
export type FundingAuthorizationOperation =
  | "read"
  | "mutate"
  | "export-summary"
  | "export-data"
  | "backup"
  | "restore";

export interface FundingAuthorizationDecision {
  allowed: boolean;
  operation: FundingAuthorizationOperation;
  effectiveRole: FundingAuthorizationRole | null;
  reason: string;
}

export type FundingRouteAuthorizationClass = FundingAuthorizationOperation | "public";

export type FundingAuthorizationEnforcementMode = "local-owner" | "verified-external";

export interface FundingAuthorizationPolicyProjection {
  enforcementMode: FundingAuthorizationEnforcementMode;
  enforcementImplementationReady: true;
  productionAuthorizationReady: false;
  upstreamVerificationRequired: true;
  denyByDefault: true;
  roles: Record<FundingAuthorizationRole, FundingAuthorizationOperation[]>;
  routeClassificationReady: true;
  notes: string[];
}

const ROLE_PRIORITY: readonly FundingAuthorizationRole[] = ["owner", "editor", "viewer"];

const POLICY: Record<FundingAuthorizationRole, readonly FundingAuthorizationOperation[]> = {
  owner: ["read", "mutate", "export-summary", "export-data", "backup", "restore"],
  editor: ["read", "mutate", "export-summary"],
  viewer: ["read"],
};

function recognizedRoles(roles: readonly string[]): FundingAuthorizationRole[] {
  const normalized = new Set(roles.map((role) => role.trim().toLowerCase()));
  return ROLE_PRIORITY.filter((role) => normalized.has(role));
}

export function authorizationPolicyStatus(enforcementMode: FundingAuthorizationEnforcementMode = "local-owner"): FundingAuthorizationPolicyProjection {
  return {
    enforcementMode,
    enforcementImplementationReady: true,
    productionAuthorizationReady: false,
    upstreamVerificationRequired: true,
    denyByDefault: true,
    roles: {
      owner: [...POLICY.owner],
      editor: [...POLICY.editor],
      viewer: [...POLICY.viewer],
    },
    routeClassificationReady: true,
    notes: [
      "BossAI Funding does not authenticate users or issue roles.",
      "This policy consumes a principal only through the injected IdentityVerifier boundary after cryptographic verification evidence passes policy checks.",
      "The default loopback runtime remains local-owner; verified-external enforcement is available for an approved upstream adapter but does not enable remote access by itself.",
      "Full data export, backup and restore are owner-only high-impact operations.",
    ],
  };
}

export function classifyFundingApiOperation(method: string, pathname: string): FundingRouteAuthorizationClass | null {
  return matchFundingApiSecurityRoute(method, pathname)?.authorizationClass ?? null;
}

export function evaluateFundingAuthorization(
  principal: ExternalIdentityClaimsContract,
  operation: FundingAuthorizationOperation,
  activeTenantId: string,
): FundingAuthorizationDecision {
  if (principal.tenantId !== activeTenantId) {
    return {
      allowed: false,
      operation,
      effectiveRole: null,
      reason: "The authenticated tenant does not match the active BossAI Funding tenant.",
    };
  }

  const roles = recognizedRoles(principal.roles);
  const effectiveRole = roles[0] ?? null;
  if (!effectiveRole) {
    return {
      allowed: false,
      operation,
      effectiveRole: null,
      reason: "No recognized BossAI Funding role is present; access is denied by default.",
    };
  }

  if (!POLICY[effectiveRole].includes(operation)) {
    return {
      allowed: false,
      operation,
      effectiveRole,
      reason: `${effectiveRole} is not permitted to perform ${operation}.`,
    };
  }

  return {
    allowed: true,
    operation,
    effectiveRole,
    reason: `${effectiveRole} is permitted to perform ${operation} for the authenticated tenant.`,
  };
}
