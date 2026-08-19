import test from "node:test";
import assert from "node:assert/strict";
import { resolveStandaloneSecurityRuntimeConfig } from "../src/server/runtime-security-config.ts";

test("standalone runtime defaults to local-owner and accepts explicit local-owner", () => {
  assert.deepEqual(resolveStandaloneSecurityRuntimeConfig({}), {
    authorizationEnforcement: "local-owner",
    source: "default",
  });
  assert.deepEqual(resolveStandaloneSecurityRuntimeConfig({ BOSSAI_FUNDING_AUTHORIZATION_MODE: "local-owner" }), {
    authorizationEnforcement: "local-owner",
    source: "environment",
  });
});

test("standalone runtime refuses verified-external without an injected approved IdentityVerifier", () => {
  assert.throws(
    () => resolveStandaloneSecurityRuntimeConfig({ BOSSAI_FUNDING_AUTHORIZATION_MODE: "verified-external" }),
    /cannot be enabled by environment configuration alone/i,
  );
});

test("standalone runtime rejects unknown authorization modes instead of silently falling back", () => {
  assert.throws(
    () => resolveStandaloneSecurityRuntimeConfig({ BOSSAI_FUNDING_AUTHORIZATION_MODE: "disabled" }),
    /unsupported BOSSAI_FUNDING_AUTHORIZATION_MODE/i,
  );
});
