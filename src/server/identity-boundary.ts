import type { IdentityBoundaryProjection } from "../domain/types.ts";

export interface ExternalIdentityClaimsContract {
  subject: string;
  tenantId: string;
  roles: string[];
  issuer: string;
  authenticatedAt: string;
}

export function identityBoundaryStatus(workspaceId: string): IdentityBoundaryProjection {
  return {
    identityMode: "local-owner",
    authenticationAuthority: "external-required",
    tenantIsolation: "local-workspace-scoped",
    remoteAccess: "blocked",
    workspaceId,
    requiredExternalClaims: ["subject", "tenantId", "roles", "issuer", "authenticatedAt"],
    productionAuthenticationReady: false,
    tenantScopedPersistenceReady: true,
    productionAuthorizationReady: false,
  };
}

export function assertExternalIdentityClaims(value: unknown): ExternalIdentityClaimsContract {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("External identity principal must be an object.");
  const source = value as Record<string, unknown>;
  const subject = typeof source.subject === "string" ? source.subject.trim() : "";
  const tenantId = typeof source.tenantId === "string" ? source.tenantId.trim() : "";
  const issuer = typeof source.issuer === "string" ? source.issuer.trim() : "";
  const authenticatedAt = typeof source.authenticatedAt === "string" ? source.authenticatedAt.trim() : "";
  const roles = Array.isArray(source.roles) && source.roles.every((role) => typeof role === "string")
    ? source.roles.map((role) => role.trim()).filter(Boolean)
    : [];

  if (!subject) throw new Error("External identity subject is required.");
  if (!tenantId) throw new Error("External identity tenantId is required.");
  if (!issuer) throw new Error("External identity issuer is required.");
  if (roles.length === 0) throw new Error("External identity roles are required.");
  if (!authenticatedAt || Number.isNaN(new Date(authenticatedAt).getTime())) {
    throw new Error("External identity authenticatedAt must be a valid date/time.");
  }

  return { subject, tenantId, issuer, roles, authenticatedAt: new Date(authenticatedAt).toISOString() };
}

export function assertRemoteEnablementAllowed(status: IdentityBoundaryProjection): never {
  throw new Error(
    `Remote BossAI Funding access is blocked for workspace ${status.workspaceId}: local tenant-scoped persistence is implemented, but production authentication verification and authorization policy are not ready.`,
  );
}
