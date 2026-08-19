import type { IncomingHttpHeaders } from "node:http";
import type { ExternalIdentityClaimsContract } from "./identity-boundary.ts";

export interface IdentityVerificationRequest {
  method: string;
  pathname: string;
  headers: IncomingHttpHeaders;
}

export interface ExternalIdentityVerificationEvidence {
  adapterKey: string;
  issuer: string;
  audience: string;
  verifiedAt: string;
  expiresAt: string | null;
  tokenId: string | null;
  signatureVerified: true;
  issuerVerified: true;
  audienceVerified: true;
  temporalValidityVerified: true;
  revocationChecked: boolean;
}

export interface VerifiedExternalPrincipal extends ExternalIdentityClaimsContract {
  verification: ExternalIdentityVerificationEvidence;
}

export interface IdentityVerifier {
  readonly adapterKey: string;
  verify(request: IdentityVerificationRequest): Promise<VerifiedExternalPrincipal>;
}

export interface IdentityVerificationPolicy {
  allowedIssuers: readonly string[];
  requiredAudience: string;
  maxAuthenticationAgeSeconds: number;
  clockSkewSeconds: number;
  requireRevocationCheck: boolean;
}

export class IdentityVerificationError extends Error {
  readonly code:
    | "IDENTITY_REQUIRED"
    | "IDENTITY_UNTRUSTED"
    | "IDENTITY_ISSUER_REJECTED"
    | "IDENTITY_AUDIENCE_REJECTED"
    | "IDENTITY_EXPIRED"
    | "IDENTITY_AUTHENTICATION_STALE"
    | "IDENTITY_REVOCATION_UNVERIFIED";

  constructor(code: IdentityVerificationError["code"], message: string) {
    super(message);
    this.name = "IdentityVerificationError";
    this.code = code;
  }
}

function epoch(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function assertVerifiedPrincipal(
  principal: VerifiedExternalPrincipal,
  policy: IdentityVerificationPolicy,
  now = new Date(),
): VerifiedExternalPrincipal {
  const verification = principal.verification;
  if (
    verification.signatureVerified !== true ||
    verification.issuerVerified !== true ||
    verification.audienceVerified !== true ||
    verification.temporalValidityVerified !== true
  ) {
    throw new IdentityVerificationError("IDENTITY_UNTRUSTED", "The external identity adapter did not provide complete cryptographic verification evidence.");
  }

  if (verification.issuer !== principal.issuer || !policy.allowedIssuers.includes(principal.issuer)) {
    throw new IdentityVerificationError("IDENTITY_ISSUER_REJECTED", "The verified identity issuer is not approved for BossAI Funding.");
  }
  if (verification.audience !== policy.requiredAudience) {
    throw new IdentityVerificationError("IDENTITY_AUDIENCE_REJECTED", "The verified identity audience does not match BossAI Funding.");
  }

  const nowMs = now.getTime();
  const skewMs = Math.max(0, policy.clockSkewSeconds) * 1_000;
  const authenticatedAt = epoch(principal.authenticatedAt);
  if (authenticatedAt === null || authenticatedAt > nowMs + skewMs) {
    throw new IdentityVerificationError("IDENTITY_UNTRUSTED", "The verified identity authentication time is invalid.");
  }
  if (nowMs - authenticatedAt > Math.max(0, policy.maxAuthenticationAgeSeconds) * 1_000 + skewMs) {
    throw new IdentityVerificationError("IDENTITY_AUTHENTICATION_STALE", "The verified identity authentication is too old for this funding operation.");
  }

  const expiresAt = epoch(verification.expiresAt);
  if (verification.expiresAt && expiresAt === null) {
    throw new IdentityVerificationError("IDENTITY_UNTRUSTED", "The verified identity expiry is invalid.");
  }
  if (expiresAt !== null && nowMs > expiresAt + skewMs) {
    throw new IdentityVerificationError("IDENTITY_EXPIRED", "The verified external identity has expired.");
  }
  if (policy.requireRevocationCheck && verification.revocationChecked !== true) {
    throw new IdentityVerificationError("IDENTITY_REVOCATION_UNVERIFIED", "The approved identity integration requires a revocation check before access.");
  }

  return principal;
}

export function identityVerifierContractStatus(): {
  adapterContractReady: true;
  cryptographicProviderConfigured: false;
  productionAuthenticationReady: false;
  requiredEvidence: string[];
} {
  return {
    adapterContractReady: true,
    cryptographicProviderConfigured: false,
    productionAuthenticationReady: false,
    requiredEvidence: [
      "signatureVerified",
      "issuerVerified",
      "audienceVerified",
      "temporalValidityVerified",
      "revocationChecked when required by the approved integration",
    ],
  };
}
