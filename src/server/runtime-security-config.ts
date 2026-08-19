import type { FundingAuthorizationEnforcementMode } from "./authorization-policy.ts";

export interface StandaloneSecurityRuntimeConfig {
  authorizationEnforcement: FundingAuthorizationEnforcementMode;
  source: "default" | "environment";
}

export function resolveStandaloneSecurityRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): StandaloneSecurityRuntimeConfig {
  const raw = environment.BOSSAI_FUNDING_AUTHORIZATION_MODE?.trim();
  if (!raw || raw === "local-owner") {
    return {
      authorizationEnforcement: "local-owner",
      source: raw ? "environment" : "default",
    };
  }

  if (raw === "verified-external") {
    throw new Error(
      "BOSSAI_FUNDING_AUTHORIZATION_MODE=verified-external cannot be enabled by environment configuration alone. " +
      "The standalone runtime has no approved cryptographic IdentityVerifier adapter configured; inject the approved verifier and verification policy through the server composition boundary.",
    );
  }

  throw new Error(
    `Unsupported BOSSAI_FUNDING_AUTHORIZATION_MODE=${raw}. Allowed standalone value: local-owner.`,
  );
}
