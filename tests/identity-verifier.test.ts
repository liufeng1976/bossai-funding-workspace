import test from "node:test";
import assert from "node:assert/strict";
import {
  assertVerifiedPrincipal,
  IdentityVerificationError,
  identityVerifierContractStatus,
  type IdentityVerificationPolicy,
  type VerifiedExternalPrincipal,
} from "../src/server/identity-verifier.ts";

const policy: IdentityVerificationPolicy = {
  allowedIssuers: ["https://identity.example.test"],
  requiredAudience: "bossai-funding",
  maxAuthenticationAgeSeconds: 3_600,
  clockSkewSeconds: 30,
  requireRevocationCheck: true,
};

function principal(overrides: Partial<VerifiedExternalPrincipal> = {}): VerifiedExternalPrincipal {
  return {
    subject: "owner-1",
    tenantId: "tenant-a",
    roles: ["owner"],
    issuer: "https://identity.example.test",
    authenticatedAt: "2026-08-15T13:30:00.000Z",
    verification: {
      adapterKey: "approved-test-adapter",
      issuer: "https://identity.example.test",
      audience: "bossai-funding",
      verifiedAt: "2026-08-15T13:31:00.000Z",
      expiresAt: "2026-08-15T14:30:00.000Z",
      tokenId: "token-1",
      signatureVerified: true,
      issuerVerified: true,
      audienceVerified: true,
      temporalValidityVerified: true,
      revocationChecked: true,
    },
    ...overrides,
  };
}

const now = new Date("2026-08-15T13:36:00.000Z");

test("identity verifier contract is ready without claiming a configured cryptographic provider", () => {
  const status = identityVerifierContractStatus();
  assert.equal(status.adapterContractReady, true);
  assert.equal(status.cryptographicProviderConfigured, false);
  assert.equal(status.productionAuthenticationReady, false);
  assert.ok(status.requiredEvidence.includes("signatureVerified"));
});

test("verified principal passes only with approved issuer, audience, time and revocation evidence", () => {
  const verified = assertVerifiedPrincipal(principal(), policy, now);
  assert.equal(verified.subject, "owner-1");
  assert.equal(verified.verification.adapterKey, "approved-test-adapter");
});

test("identity verification rejects unapproved issuer and audience", () => {
  assert.throws(
    () => assertVerifiedPrincipal(principal({ issuer: "https://evil.example.test" }), policy, now),
    (error) => error instanceof IdentityVerificationError && error.code === "IDENTITY_ISSUER_REJECTED",
  );
  const wrongAudience = principal();
  wrongAudience.verification.audience = "another-product";
  assert.throws(
    () => assertVerifiedPrincipal(wrongAudience, policy, now),
    (error) => error instanceof IdentityVerificationError && error.code === "IDENTITY_AUDIENCE_REJECTED",
  );
});

test("identity verification rejects stale, expired and revocation-unverified principals", () => {
  assert.throws(
    () => assertVerifiedPrincipal(principal({ authenticatedAt: "2026-08-15T11:00:00.000Z" }), policy, now),
    (error) => error instanceof IdentityVerificationError && error.code === "IDENTITY_AUTHENTICATION_STALE",
  );

  const expired = principal();
  expired.verification.expiresAt = "2026-08-15T13:00:00.000Z";
  assert.throws(
    () => assertVerifiedPrincipal(expired, policy, now),
    (error) => error instanceof IdentityVerificationError && error.code === "IDENTITY_EXPIRED",
  );

  const noRevocation = principal();
  noRevocation.verification.revocationChecked = false;
  assert.throws(
    () => assertVerifiedPrincipal(noRevocation, policy, now),
    (error) => error instanceof IdentityVerificationError && error.code === "IDENTITY_REVOCATION_UNVERIFIED",
  );
});
