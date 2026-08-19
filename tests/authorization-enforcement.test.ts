import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import { IdentityVerificationError, type IdentityVerifier, type VerifiedExternalPrincipal } from "../src/server/identity-verifier.ts";

function companyPayload(name: string): Record<string, unknown> {
  return {
    name,
    industry: "Industrial software",
    stage: "growth",
    geography: "California, USA",
    foundedYear: 2022,
    annualRevenueCents: 180_000_000,
    mrrCents: 15_000_000,
    arrCents: 180_000_000,
    growthRatePct: 62,
    grossMarginPct: 58,
    cashBalanceCents: 45_000_000,
    monthlyBurnCents: 12_000_000,
    runwayMonths: 3.75,
    teamSize: 18,
    product: "Automation software for manufacturers.",
    businessModel: "Recurring software subscription.",
    fundingHistory: "Founder funded and one seed note.",
    existingDebtCents: 5_000_000,
    capTableSummary: "Founders 82%, seed note 18% as-converted estimate.",
    useOfFunds: "Inventory, sales hires and certification.",
    targetFundingCents: 100_000_000,
    targetFundingDate: "2027-01-15",
  };
}

function verifiedPrincipal(tenantId: string, roles: string[]): VerifiedExternalPrincipal {
  const now = Date.now();
  return {
    subject: "external-user-1",
    tenantId,
    roles,
    issuer: "https://identity.example.test",
    authenticatedAt: new Date(now - 30_000).toISOString(),
    verification: {
      adapterKey: "approved-test-adapter",
      issuer: "https://identity.example.test",
      audience: "bossai-funding",
      verifiedAt: new Date(now - 5_000).toISOString(),
      expiresAt: new Date(now + 3_600_000).toISOString(),
      tokenId: "token-1",
      signatureVerified: true,
      issuerVerified: true,
      audienceVerified: true,
      temporalValidityVerified: true,
      revocationChecked: true,
    },
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

test("verified-external enforcement blocks unverified, wrong-tenant and under-privileged requests before business mutation", async () => {
  const repo = new FundingRepository(":memory:");
  let currentPrincipal: VerifiedExternalPrincipal | null = null;
  const verifier: IdentityVerifier = {
    adapterKey: "approved-test-adapter",
    async verify() {
      if (!currentPrincipal) throw new IdentityVerificationError("IDENTITY_REQUIRED", "No approved external principal was supplied by the test adapter.");
      return currentPrincipal;
    },
  };

  const server = createFundingServer(repo, resolve(process.cwd(), "public"), {
    authorizationEnforcement: "verified-external",
    identityVerifier: verifier,
    identityVerificationPolicy: {
      allowedIssuers: ["https://identity.example.test"],
      requiredAudience: "bossai-funding",
      maxAuthenticationAgeSeconds: 3_600,
      clockSkewSeconds: 30,
      requireRevocationCheck: true,
    },
  });
  const workspace = repo.db.prepare("SELECT workspace_id,tenant_id FROM funding_workspace LIMIT 1").get() as { workspace_id: string; tenant_id: string };
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);

    const unverified = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: { "content-type": "application/json", "x-bossai-tenant-id": workspace.tenant_id, "x-bossai-role": "owner" },
      body: JSON.stringify(companyPayload("Blocked Unverified Co")),
    });
    assert.equal(unverified.status, 401);
    assert.equal(repo.getCompanyProfile(), null);

    currentPrincipal = verifiedPrincipal("tenant-b", ["owner"]);
    const wrongTenant = await fetch(`${baseUrl}/api/bootstrap`);
    assert.equal(wrongTenant.status, 403);

    currentPrincipal = verifiedPrincipal(workspace.tenant_id, ["viewer"]);
    const viewerMutation = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(companyPayload("Blocked Viewer Co")),
    });
    assert.equal(viewerMutation.status, 403);
    assert.equal(repo.getCompanyProfile(), null);

    currentPrincipal = verifiedPrincipal(workspace.tenant_id, ["editor"]);
    const editorExport = await fetch(`${baseUrl}/api/continuity/export`);
    assert.equal(editorExport.status, 403);

    currentPrincipal = verifiedPrincipal(workspace.tenant_id, ["owner"]);
    const ownerMutation = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(companyPayload("Authorized Owner Co")),
    });
    assert.equal(ownerMutation.status, 200);
    assert.equal(repo.getCompanyProfile()?.name, "Authorized Owner Co");

    const events = repo.db.prepare("SELECT decision,identity_state,operation,tenant_id,effective_role FROM security_decision_event ORDER BY id").all() as unknown as Array<Record<string, unknown>>;
    assert.equal(events.length, 5);
    assert.deepEqual(events.map((event) => event.decision), ["deny", "deny", "deny", "deny", "allow"]);
    assert.equal(events[0]?.identity_state, "unverified");
    assert.equal(events[1]?.tenant_id, "tenant-b");
    assert.equal(events[2]?.effective_role, "viewer");
    assert.equal(events[3]?.effective_role, "editor");
    assert.equal(events[4]?.effective_role, "owner");
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("verified-external security status endpoints require authenticated read access while health remains public", async () => {
  const repo = new FundingRepository(":memory:");
  let currentPrincipal: VerifiedExternalPrincipal | null = null;
  const verifier: IdentityVerifier = {
    adapterKey: "approved-test-adapter",
    async verify() {
      if (!currentPrincipal) throw new IdentityVerificationError("IDENTITY_REQUIRED", "No verified principal.");
      return currentPrincipal;
    },
  };
  const server = createFundingServer(repo, resolve(process.cwd(), "public"), {
    authorizationEnforcement: "verified-external",
    identityVerifier: verifier,
    identityVerificationPolicy: {
      allowedIssuers: ["https://identity.example.test"],
      requiredAudience: "bossai-funding",
      maxAuthenticationAgeSeconds: 3_600,
      clockSkewSeconds: 30,
      requireRevocationCheck: true,
    },
  });
  const workspace = repo.db.prepare("SELECT tenant_id FROM funding_workspace LIMIT 1").get() as { tenant_id: string };
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/security/tenant-scope`)).status, 401);

    currentPrincipal = verifiedPrincipal(workspace.tenant_id, ["viewer"]);
    const policy = await fetch(`${baseUrl}/api/security/authorization-policy`);
    assert.equal(policy.status, 200);
    assert.equal((await readJson(policy)).enforcementMode, "verified-external");
    const review = await fetch(`${baseUrl}/api/security/review-readiness`);
    assert.equal(review.status, 200);
    const reviewBody = await readJson(review);
    assert.equal(reviewBody.status, "not-approved");
    assert.equal(reviewBody.remoteAccessDecision, "blocked");
    assert.equal((reviewBody.identityVerification as Record<string, unknown>).adapterConfigured, true);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("local-owner browser integrity blocks cross-site and simple-request mutations before financing state changes", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const bootstrapResponse = await fetch(`${baseUrl}/api/bootstrap`);
    assert.equal(bootstrapResponse.status, 200);
    const bootstrapState = await readJson(bootstrapResponse);
    const workspaceRevision = Number(bootstrapState.workspaceRevision);
    assert.ok(Number.isInteger(workspaceRevision));

    const crossSite = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      },
      body: JSON.stringify(companyPayload("Cross Site Co")),
    });
    assert.equal(crossSite.status, 403);
    assert.equal((await readJson(crossSite)).code, "CROSS_SITE_REQUEST_BLOCKED");
    assert.equal(repo.getCompanyProfile(), null);

    const simplePayload = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: {
        "content-type": "text/plain",
        origin: baseUrl,
        "sec-fetch-site": "same-origin",
      },
      body: JSON.stringify(companyPayload("Simple Request Co")),
    });
    assert.equal(simplePayload.status, 415);
    assert.equal((await readJson(simplePayload)).code, "JSON_CONTENT_TYPE_REQUIRED");
    assert.equal(repo.getCompanyProfile(), null);

    const allowed = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: baseUrl,
        "sec-fetch-site": "same-origin",
        "x-bossai-workspace-revision": String(workspaceRevision),
      },
      body: JSON.stringify(companyPayload("Same Origin Co")),
    });
    assert.equal(allowed.status, 200);
    assert.equal(repo.getCompanyProfile()?.name, "Same Origin Co");

    const denials = repo.db.prepare("SELECT operation,identity_state,decision FROM security_decision_event WHERE decision='deny' ORDER BY id").all() as unknown as Array<Record<string, unknown>>;
    assert.equal(denials.length, 2);
    assert.deepEqual(denials.map((event) => event.operation), ["mutate", "mutate"]);
    assert.deepEqual(denials.map((event) => event.identity_state), ["local-owner", "local-owner"]);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("verified-external browser integrity rejects cross-site mutation before calling IdentityVerifier", async () => {
  const repo = new FundingRepository(":memory:");
  let verifyCalls = 0;
  const verifier: IdentityVerifier = {
    adapterKey: "approved-test-adapter",
    async verify() {
      verifyCalls += 1;
      return verifiedPrincipal("unused", ["owner"]);
    },
  };
  const server = createFundingServer(repo, resolve(process.cwd(), "public"), {
    authorizationEnforcement: "verified-external",
    identityVerifier: verifier,
    identityVerificationPolicy: {
      allowedIssuers: ["https://identity.example.test"],
      requiredAudience: "bossai-funding",
      maxAuthenticationAgeSeconds: 3_600,
      clockSkewSeconds: 30,
      requireRevocationCheck: true,
    },
  });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      },
      body: JSON.stringify(companyPayload("Blocked Before Verify Co")),
    });
    assert.equal(response.status, 403);
    assert.equal((await readJson(response)).code, "CROSS_SITE_REQUEST_BLOCKED");
    assert.equal(verifyCalls, 0);
    assert.equal(repo.getCompanyProfile(), null);
    const event = repo.db.prepare("SELECT identity_state,operation,decision FROM security_decision_event ORDER BY id DESC LIMIT 1").get() as Record<string, unknown>;
    assert.equal(event.identity_state, "unverified");
    assert.equal(event.operation, "mutate");
    assert.equal(event.decision, "deny");
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("unclassified API routes fail closed in local-owner mode and leave security evidence", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/future-unregistered-route`);
    assert.equal(response.status, 404);
    const body = await readJson(response);
    assert.equal(body.code, "UNCLASSIFIED_API_ROUTE");
    const event = repo.db.prepare("SELECT operation,identity_state,decision FROM security_decision_event ORDER BY id DESC LIMIT 1").get() as Record<string, unknown>;
    assert.equal(event.operation, "unclassified-api");
    assert.equal(event.identity_state, "local-owner");
    assert.equal(event.decision, "deny");
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("unclassified API routes fail before verified-external identity verification", async () => {
  const repo = new FundingRepository(":memory:");
  let verifyCalls = 0;
  const verifier: IdentityVerifier = {
    adapterKey: "approved-test-adapter",
    async verify() {
      verifyCalls += 1;
      return verifiedPrincipal("unused", ["owner"]);
    },
  };
  const server = createFundingServer(repo, resolve(process.cwd(), "public"), {
    authorizationEnforcement: "verified-external",
    identityVerifier: verifier,
    identityVerificationPolicy: {
      allowedIssuers: ["https://identity.example.test"],
      requiredAudience: "bossai-funding",
      maxAuthenticationAgeSeconds: 3_600,
      clockSkewSeconds: 30,
      requireRevocationCheck: true,
    },
  });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/future-unregistered-route`);
    assert.equal(response.status, 403);
    const body = await readJson(response);
    assert.equal(body.code, "API_SECURITY_CLASSIFICATION_REQUIRED");
    assert.equal(verifyCalls, 0);
    const event = repo.db.prepare("SELECT operation,identity_state,decision FROM security_decision_event ORDER BY id DESC LIMIT 1").get() as Record<string, unknown>;
    assert.equal(event.operation, "unclassified-api");
    assert.equal(event.identity_state, "unverified");
    assert.equal(event.decision, "deny");
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("verified-external mode cannot start without both verifier and verification policy", () => {
  const repo = new FundingRepository(":memory:");
  try {
    assert.throws(
      () => createFundingServer(repo, resolve(process.cwd(), "public"), { authorizationEnforcement: "verified-external" }),
      /requires an injected IdentityVerifier and identity verification policy/i,
    );
  } finally {
    repo.close();
  }
});
