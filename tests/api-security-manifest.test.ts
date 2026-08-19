import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FUNDING_API_SECURITY_MANIFEST,
  fundingApiSecurityManifestStatus,
  matchFundingApiSecurityRoute,
} from "../src/server/api-security-manifest.ts";
import { classifyFundingApiOperation } from "../src/server/authorization-policy.ts";

function samplePath(patternLabel: string): string {
  return patternLabel.replace(":id", "42");
}

test("Route Security Manifest has unique routes and every entry resolves to exactly its declared authorization class", () => {
  const keys = new Set<string>();
  const methodPatterns = new Set<string>();
  for (const route of FUNDING_API_SECURITY_MANIFEST) {
    assert.equal(keys.has(route.key), false, `duplicate route key: ${route.key}`);
    keys.add(route.key);
    const signature = `${route.method} ${route.patternLabel}`;
    assert.equal(methodPatterns.has(signature), false, `duplicate route signature: ${signature}`);
    methodPatterns.add(signature);

    const pathname = samplePath(route.patternLabel);
    assert.equal(matchFundingApiSecurityRoute(route.method, pathname)?.key, route.key, signature);
    assert.equal(classifyFundingApiOperation(route.method, pathname), route.authorizationClass, signature);
  }

  const status = fundingApiSecurityManifestStatus();
  assert.equal(status.routeCount, FUNDING_API_SECURITY_MANIFEST.length);
  assert.ok(status.routeCount > 40);
  assert.equal(status.publicRouteCount, 1);
  assert.equal(status.routes.filter((route) => route.authorizationClass === "public").map((route) => `${route.method} ${route.pattern}`).join("\n"), "GET /api/health");
  assert.ok(status.protectedRouteCount > status.publicRouteCount);
});

test("every fixed API route implemented by the HTTP server is registered in the Route Security Manifest", () => {
  const source = readFileSync(resolve(process.cwd(), "src/server/app.ts"), "utf8");
  const fixedRoutes = [...source.matchAll(/if \(method === "(GET|POST|PUT|PATCH|DELETE)" && url\.pathname === "(\/api\/[^\"]+)"\)/g)]
    .map((match) => ({ method: match[1] as "GET" | "POST" | "PUT" | "PATCH" | "DELETE", pathname: match[2] as string }));

  assert.ok(fixedRoutes.length > 30, "expected the server fixed-route scan to find the current API surface");
  for (const route of fixedRoutes) {
    assert.notEqual(
      classifyFundingApiOperation(route.method, route.pathname),
      null,
      `unclassified server route: ${route.method} ${route.pathname}`,
    );
  }
});

test("unknown API routes have no implicit fallback authorization class", () => {
  assert.equal(classifyFundingApiOperation("GET", "/api/future-unregistered-route"), null);
  assert.equal(classifyFundingApiOperation("POST", "/api/future-unregistered-route"), null);
  assert.equal(classifyFundingApiOperation("GET", "/not-an-api-route"), null);
});
