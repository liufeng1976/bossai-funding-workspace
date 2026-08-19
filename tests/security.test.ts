import test from "node:test";
import assert from "node:assert/strict";
import {
  assertExternalIdentityClaims,
  assertRemoteEnablementAllowed,
  identityBoundaryStatus,
} from "../src/server/identity-boundary.ts";
import {
  assertLoopbackBindHost,
  evaluateBrowserRequestIntegrity,
  isAllowedRequestHost,
  isLoopbackBindHost,
  securityHeaders,
} from "../src/server/security.ts";

test("local build accepts only loopback bind hosts", () => {
  assert.equal(isLoopbackBindHost("127.0.0.1"), true);
  assert.equal(isLoopbackBindHost("localhost"), true);
  assert.equal(isLoopbackBindHost("::1"), true);
  assert.equal(isLoopbackBindHost("[::1]"), true);
  assert.equal(isLoopbackBindHost("0.0.0.0"), false);
  assert.equal(isLoopbackBindHost("192.168.1.25"), false);
  assert.throws(() => assertLoopbackBindHost("0.0.0.0"), /identity verification, authorization, security review/i);
});

test("request Host validation rejects non-loopback destinations", () => {
  assert.equal(isAllowedRequestHost("127.0.0.1:4317"), true);
  assert.equal(isAllowedRequestHost("localhost:4317"), true);
  assert.equal(isAllowedRequestHost("[::1]:4317"), true);
  assert.equal(isAllowedRequestHost("funding.example.com"), false);
  assert.equal(isAllowedRequestHost(undefined), false);
});

test("security headers prevent framing and narrow browser capabilities", () => {
  const headers = securityHeaders("application/json; charset=utf-8");
  assert.equal(headers["x-frame-options"], "DENY");
  assert.equal(headers["x-content-type-options"], "nosniff");
  assert.match(headers["content-security-policy"] ?? "", /frame-ancestors 'none'/);
  assert.equal(headers["cross-origin-resource-policy"], "same-origin");
  assert.equal(headers["origin-agent-cluster"], "?1");
  assert.match(headers["permissions-policy"] ?? "", /camera=\(\)/);
  assert.equal(headers["referrer-policy"], "no-referrer");
});

test("browser mutation integrity requires same-origin JSON while preserving native client access", () => {
  const sameOrigin = evaluateBrowserRequestIntegrity("PUT", "/api/company-profile", {
    host: "127.0.0.1:4317",
    origin: "http://127.0.0.1:4317",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    "content-type": "application/json; charset=utf-8",
  });
  assert.equal(sameOrigin.allowed, true);

  const crossSite = evaluateBrowserRequestIntegrity("POST", "/api/actions", {
    host: "127.0.0.1:4317",
    origin: "https://evil.example",
    "sec-fetch-site": "cross-site",
    "sec-fetch-mode": "cors",
    "content-type": "application/json",
  });
  assert.equal(crossSite.allowed, false);
  assert.equal(crossSite.status, 403);
  assert.equal(crossSite.code, "CROSS_SITE_REQUEST_BLOCKED");

  const wrongOrigin = evaluateBrowserRequestIntegrity("PATCH", "/api/investors/42", {
    host: "127.0.0.1:4317",
    origin: "http://localhost:4317",
    "content-type": "application/json",
  });
  assert.equal(wrongOrigin.allowed, false);
  assert.equal(wrongOrigin.code, "ORIGIN_MISMATCH");

  const simpleRequestPayload = evaluateBrowserRequestIntegrity("POST", "/api/actions", {
    host: "127.0.0.1:4317",
    "content-type": "text/plain",
  });
  assert.equal(simpleRequestPayload.allowed, false);
  assert.equal(simpleRequestPayload.status, 415);
  assert.equal(simpleRequestPayload.code, "JSON_CONTENT_TYPE_REQUIRED");

  const nativeClient = evaluateBrowserRequestIntegrity("POST", "/api/actions", {
    host: "127.0.0.1:4317",
    "content-type": "application/json",
  });
  assert.equal(nativeClient.allowed, true);

  const readRequest = evaluateBrowserRequestIntegrity("GET", "/api/bootstrap", {
    host: "127.0.0.1:4317",
    origin: "https://evil.example",
    "sec-fetch-site": "cross-site",
  });
  assert.equal(readRequest.allowed, true);
});

test("production identity contract consumes an external principal but does not unlock remote access", () => {
  const principal = assertExternalIdentityClaims({
    subject: "user-42",
    tenantId: "tenant-acme",
    roles: ["owner"],
    issuer: "https://identity.example.test",
    authenticatedAt: "2026-08-15T12:00:00Z",
  });
  assert.equal(principal.tenantId, "tenant-acme");
  const boundary = identityBoundaryStatus("workspace-123");
  assert.equal(boundary.authenticationAuthority, "external-required");
  assert.equal(boundary.tenantIsolation, "local-workspace-scoped");
  assert.equal(boundary.remoteAccess, "blocked");
  assert.equal(boundary.productionAuthenticationReady, false);
  assert.equal(boundary.tenantScopedPersistenceReady, true);
  assert.equal(boundary.productionAuthorizationReady, false);
  assert.throws(() => assertRemoteEnablementAllowed(boundary), /remote BossAI Funding access is blocked/i);
});

test("external identity contract rejects incomplete principal claims", () => {
  assert.throws(() => assertExternalIdentityClaims({ subject: "user-42", tenantId: "", roles: ["owner"], issuer: "issuer", authenticatedAt: "2026-08-15T12:00:00Z" }), /tenantId is required/i);
  assert.throws(() => assertExternalIdentityClaims({ subject: "user-42", tenantId: "tenant", roles: [], issuer: "issuer", authenticatedAt: "2026-08-15T12:00:00Z" }), /roles are required/i);
});
