import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import type { BootstrapState, CompanyProfileInput } from "../src/domain/types.ts";
import { getWorkspaceRevision } from "../src/server/workspace-revision.ts";
import { IdentityVerificationError, type IdentityVerifier, type VerifiedExternalPrincipal } from "../src/server/identity-verifier.ts";

function companyPayload(name: string): CompanyProfileInput {
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

function browserHeaders(baseUrl: string, revision?: number): Record<string, string> {
  return {
    "content-type": "application/json",
    origin: baseUrl,
    "sec-fetch-site": "same-origin",
    ...(revision === undefined ? {} : { "x-bossai-workspace-revision": String(revision) }),
  };
}

test("browser workspace revision prevents an old tab from overwriting newer financing state", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const initialResponse = await fetch(`${baseUrl}/api/bootstrap`);
    assert.equal(initialResponse.status, 200);
    const tabA = await initialResponse.json() as BootstrapState;
    const tabBRevision = tabA.workspaceRevision;

    const firstSave = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: browserHeaders(baseUrl, tabA.workspaceRevision),
      body: JSON.stringify(companyPayload("Tab A Company")),
    });
    assert.equal(firstSave.status, 200);
    const afterFirstSave = await firstSave.json() as BootstrapState;
    assert.ok(afterFirstSave.workspaceRevision > tabA.workspaceRevision);
    assert.equal(afterFirstSave.companyProfile?.name, "Tab A Company");

    const staleSave = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: browserHeaders(baseUrl, tabBRevision),
      body: JSON.stringify(companyPayload("Stale Tab B Company")),
    });
    assert.equal(staleSave.status, 409);
    const stale = await staleSave.json() as { code: string; currentWorkspaceRevision: number; recovery: string };
    assert.equal(stale.code, "STALE_WORKSPACE_STATE");
    assert.equal(stale.currentWorkspaceRevision, afterFirstSave.workspaceRevision);
    assert.match(stale.recovery, /keep the current form values/i);
    assert.equal(repo.getCompanyProfile()?.name, "Tab A Company");

    const refreshed = await (await fetch(`${baseUrl}/api/bootstrap`)).json() as BootstrapState;
    assert.equal(refreshed.workspaceRevision, afterFirstSave.workspaceRevision);
    const retry = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: browserHeaders(baseUrl, refreshed.workspaceRevision),
      body: JSON.stringify(companyPayload("Refreshed Tab B Company")),
    });
    assert.equal(retry.status, 200);
    const afterRetry = await retry.json() as BootstrapState;
    assert.equal(afterRetry.companyProfile?.name, "Refreshed Tab B Company");
    assert.ok(afterRetry.workspaceRevision > refreshed.workspaceRevision);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("stale owner repair draft cannot overwrite newer receipt truth", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const nativeHeaders = { "content-type": "application/json" };

  try {
    const outcomeResponse = await fetch(`${baseUrl}/api/outcomes`, {
      method: "POST", headers: nativeHeaders,
      body: JSON.stringify({
        track: "equity", applicationId: null, investorId: null, roundId: null, status: "closed",
        approvedAmountCents: 20_000_000, committedAmountCents: 20_000_000, receivedAmountCents: 0,
        receivedDate: null, commitmentEvidence: "Signed closing #R-20", receiptEvidence: "", conditions: "", lossReason: "", feedback: "", retryDate: null,
      }),
    });
    assert.equal(outcomeResponse.ok, true);
    const outcomeId = (await outcomeResponse.json() as { outcome: { id: number } }).outcome.id;

    const expectationResponse = await fetch(`${baseUrl}/api/receipt-expectations`, {
      method: "POST", headers: nativeHeaders,
      body: JSON.stringify({ outcomeId, amountCents: 10_000_000, expectedDate: "2026-08-25", basisNote: "Signed settlement schedule", owner: "Founder", note: "", status: "expected", cancellationReason: "" }),
    });
    assert.equal(expectationResponse.ok, true);
    const expectationId = (await expectationResponse.json() as { receiptExpectation: { id: number } }).receiptExpectation.id;

    const trancheResponse = await fetch(`${baseUrl}/api/receipt-tranches`, {
      method: "POST", headers: nativeHeaders,
      body: JSON.stringify({ outcomeId, amountCents: 10_000_000, receivedDate: "2026-08-18", receiptEvidence: "Bank receipt #R-10", note: "", status: "received", voidReason: "" }),
    });
    assert.equal(trancheResponse.ok, true);
    const trancheId = (await trancheResponse.json() as { receiptTranche: { id: number } }).receiptTranche.id;

    const allocationResponse = await fetch(`${baseUrl}/api/receipt-expectation-allocations`, {
      method: "POST", headers: nativeHeaders,
      body: JSON.stringify({ expectationId, trancheId, amountCents: 10_000_000, note: "Owner-confirmed settlement link", status: "active", voidReason: "" }),
    });
    assert.equal(allocationResponse.ok, true);
    const allocationId = (await allocationResponse.json() as { receiptExpectationAllocation: { id: number } }).receiptExpectationAllocation.id;

    const firstCashCorrection = await fetch(`${baseUrl}/api/receipt-tranches/${trancheId}`, {
      method: "PATCH", headers: nativeHeaders,
      body: JSON.stringify({ outcomeId, amountCents: 5_000_000, receivedDate: "2026-08-18", receiptEvidence: "Bank receipt corrected to #R-5", note: "Bank correction", status: "received", voidReason: "" }),
    });
    assert.equal(firstCashCorrection.status, 200);
    const repairState = (await firstCashCorrection.json() as { state: BootstrapState }).state;
    assert.equal(repairState.receiptAllocationReconciliationIssues.find((item) => item.trancheId === trancheId)?.requiredReductionCents, 5_000_000);

    const newerCashCorrection = await fetch(`${baseUrl}/api/receipt-tranches/${trancheId}`, {
      method: "PATCH", headers: nativeHeaders,
      body: JSON.stringify({ outcomeId, amountCents: 4_000_000, receivedDate: "2026-08-18", receiptEvidence: "Bank receipt corrected again to #R-4", note: "Second bank correction", status: "received", voidReason: "" }),
    });
    assert.equal(newerCashCorrection.status, 200);
    const newerState = (await newerCashCorrection.json() as { state: BootstrapState }).state;
    assert.ok(newerState.workspaceRevision > repairState.workspaceRevision);
    assert.equal(newerState.receiptAllocationReconciliationIssues.find((item) => item.trancheId === trancheId)?.requiredReductionCents, 6_000_000);

    const staleDraftSave = await fetch(`${baseUrl}/api/receipt-expectation-allocations/${allocationId}`, {
      method: "PATCH", headers: browserHeaders(baseUrl, repairState.workspaceRevision),
      body: JSON.stringify({
        ...repairState.receiptExpectationAllocations.find((item) => item.id === allocationId),
        amountCents: 5_000_000,
      }),
    });
    assert.equal(staleDraftSave.status, 409);
    const stale = await staleDraftSave.json() as { code: string; currentWorkspaceRevision: number };
    assert.equal(stale.code, "STALE_WORKSPACE_STATE");
    assert.equal(stale.currentWorkspaceRevision, newerState.workspaceRevision);

    const afterRejectedDraft = await (await fetch(`${baseUrl}/api/bootstrap`)).json() as BootstrapState;
    assert.equal(afterRejectedDraft.receiptExpectationAllocations.find((item) => item.id === allocationId)?.amountCents, 10_000_000);
    assert.equal(afterRejectedDraft.receiptTranches.find((item) => item.id === trancheId)?.amountCents, 4_000_000);

    const refreshedSave = await fetch(`${baseUrl}/api/receipt-expectation-allocations/${allocationId}`, {
      method: "PATCH", headers: browserHeaders(baseUrl, afterRejectedDraft.workspaceRevision),
      body: JSON.stringify({
        ...afterRejectedDraft.receiptExpectationAllocations.find((item) => item.id === allocationId),
        amountCents: 4_000_000,
      }),
    });
    assert.equal(refreshedSave.status, 200);
    const repaired = (await refreshedSave.json() as { state: BootstrapState }).state;
    assert.equal(repaired.receiptExpectationAllocations.find((item) => item.id === allocationId)?.amountCents, 4_000_000);
    assert.equal(repaired.receiptAllocationReconciliationIssues.some((item) => item.allocationIds.includes(allocationId)), false);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("browser mutation requires a revision while native JSON clients remain compatible", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const missingRevision = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: browserHeaders(baseUrl),
      body: JSON.stringify(companyPayload("Missing Revision")),
    });
    assert.equal(missingRevision.status, 428);
    const missing = await missingRevision.json() as { code: string };
    assert.equal(missing.code, "WORKSPACE_REVISION_REQUIRED");
    assert.equal(repo.getCompanyProfile(), null);

    const native = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(companyPayload("Native Client Company")),
    });
    assert.equal(native.status, 200);
    const state = await native.json() as BootstrapState;
    assert.equal(state.companyProfile?.name, "Native Client Company");
    assert.ok(state.workspaceRevision > 0);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("simultaneous browser saves with one revision serialize so exactly one succeeds", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const initial = await (await fetch(`${baseUrl}/api/bootstrap`)).json() as BootstrapState;
    const save = (name: string) => fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: browserHeaders(baseUrl, initial.workspaceRevision),
      body: JSON.stringify(companyPayload(name)),
    });
    const [left, right] = await Promise.all([save("Concurrent Left"), save("Concurrent Right")]);
    assert.deepEqual([left.status, right.status].sort((a, b) => a - b), [200, 409]);

    const final = await (await fetch(`${baseUrl}/api/bootstrap`)).json() as BootstrapState;
    assert.ok(final.companyProfile?.name === "Concurrent Left" || final.companyProfile?.name === "Concurrent Right");
    assert.ok(final.workspaceRevision > initial.workspaceRevision);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("restore advances workspace revision so pre-restore browser tabs cannot overwrite recovered data", async () => {
  const temp = mkdtempSync(join(tmpdir(), "bossai-funding-revision-restore-"));
  const repo = new FundingRepository(join(temp, "funding.sqlite"));
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const initial = await (await fetch(`${baseUrl}/api/bootstrap`)).json() as BootstrapState;
    const originalSave = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: browserHeaders(baseUrl, initial.workspaceRevision),
      body: JSON.stringify(companyPayload("Recovery Point Company")),
    });
    const original = await originalSave.json() as BootstrapState;

    const backupResponse = await fetch(`${baseUrl}/api/continuity/backup`, {
      method: "POST",
      headers: browserHeaders(baseUrl, original.workspaceRevision),
      body: "{}",
    });
    assert.equal(backupResponse.status, 201);
    const backupPayload = await backupResponse.json() as { backup: { fileName: string }; state: BootstrapState };

    const changedResponse = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: browserHeaders(baseUrl, backupPayload.state.workspaceRevision),
      body: JSON.stringify(companyPayload("Changed After Backup")),
    });
    const changed = await changedResponse.json() as BootstrapState;
    assert.equal(changed.companyProfile?.name, "Changed After Backup");
    const revisionBeforeRestore = changed.workspaceRevision;

    const restoreResponse = await fetch(`${baseUrl}/api/continuity/restore`, {
      method: "POST",
      headers: browserHeaders(baseUrl, revisionBeforeRestore),
      body: JSON.stringify({ fileName: backupPayload.backup.fileName, confirmation: "RESTORE" }),
    });
    assert.equal(restoreResponse.status, 200);
    const restoredPayload = await restoreResponse.json() as { state: BootstrapState };
    assert.equal(restoredPayload.state.companyProfile?.name, "Recovery Point Company");
    assert.notEqual(restoredPayload.state.workspaceRevision, revisionBeforeRestore);

    const staleAfterRestore = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: browserHeaders(baseUrl, revisionBeforeRestore),
      body: JSON.stringify(companyPayload("Should Not Overwrite Restore")),
    });
    assert.equal(staleAfterRestore.status, 409);
    assert.equal((await staleAfterRestore.json() as { code: string }).code, "STALE_WORKSPACE_STATE");
    assert.equal(repo.getCompanyProfile()?.name, "Recovery Point Company");
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
    rmSync(temp, { recursive: true, force: true });
  }
});

test("verified-external identity and tenant authorization run before revision details are disclosed", async () => {
  const repo = new FundingRepository(":memory:");
  let principal: VerifiedExternalPrincipal | null = null;
  const verifier: IdentityVerifier = {
    adapterKey: "revision-test-adapter",
    async verify() {
      if (!principal) throw new IdentityVerificationError("IDENTITY_REQUIRED", "No verified principal.");
      return principal;
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
  const binding = repo.db.prepare("SELECT tenant_id FROM funding_workspace LIMIT 1").get() as { tenant_id: string };
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const externalPrincipal = (tenantId: string): VerifiedExternalPrincipal => {
    const now = Date.now();
    return {
      subject: "owner-1",
      tenantId,
      roles: ["owner"],
      issuer: "https://identity.example.test",
      authenticatedAt: new Date(now - 5_000).toISOString(),
      verification: {
        adapterKey: "revision-test-adapter",
        issuer: "https://identity.example.test",
        audience: "bossai-funding",
        verifiedAt: new Date(now - 1_000).toISOString(),
        expiresAt: new Date(now + 3_600_000).toISOString(),
        tokenId: "revision-token",
        signatureVerified: true,
        issuerVerified: true,
        audienceVerified: true,
        temporalValidityVerified: true,
        revocationChecked: true,
      },
    };
  };

  try {
    const unauthenticated = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: browserHeaders(baseUrl),
      body: JSON.stringify(companyPayload("Unauthenticated")),
    });
    assert.equal(unauthenticated.status, 401);
    const unauthenticatedBody = await unauthenticated.json() as Record<string, unknown>;
    assert.equal("currentWorkspaceRevision" in unauthenticatedBody, false);

    principal = externalPrincipal("wrong-tenant");
    const wrongTenant = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: browserHeaders(baseUrl),
      body: JSON.stringify(companyPayload("Wrong Tenant")),
    });
    assert.equal(wrongTenant.status, 403);
    const wrongTenantBody = await wrongTenant.json() as Record<string, unknown>;
    assert.equal("currentWorkspaceRevision" in wrongTenantBody, false);

    principal = externalPrincipal(binding.tenant_id);
    const authorizedMissingRevision = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: browserHeaders(baseUrl),
      body: JSON.stringify(companyPayload("Authorized Missing Revision")),
    });
    assert.equal(authorizedMissingRevision.status, 428);
    const revisionBody = await authorizedMissingRevision.json() as { code: string; currentWorkspaceRevision: number };
    assert.equal(revisionBody.code, "WORKSPACE_REVISION_REQUIRED");
    assert.ok(Number.isInteger(revisionBody.currentWorkspaceRevision));
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("runtime blocks financing writes if any database revision trigger is missing", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const initial = await (await fetch(`${baseUrl}/api/bootstrap`)).json() as BootstrapState;
    repo.db.exec("DROP TRIGGER bossai_revision_company_profile_insert");
    const blocked = await fetch(`${baseUrl}/api/company-profile`, {
      method: "PUT",
      headers: browserHeaders(baseUrl, initial.workspaceRevision),
      body: JSON.stringify(companyPayload("Must Stay Blocked")),
    });
    assert.equal(blocked.status, 503);
    const failure = await blocked.json() as { code: string };
    assert.equal(failure.code, "WORKSPACE_REVISION_GUARD_UNAVAILABLE");
    assert.equal(repo.getCompanyProfile(), null);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("database-level business changes advance workspace revision without relying on an HTTP handler", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  const workspaceId = repo.getWorkspaceBinding();
  assert.ok(workspaceId);
  try {
    const before = getWorkspaceRevision(repo.db, workspaceId).revision;
    repo.saveCompanyProfile(companyPayload("Trigger Company"));
    const afterInsert = getWorkspaceRevision(repo.db, workspaceId).revision;
    assert.ok(afterInsert > before);

    repo.db.prepare("UPDATE company_profile SET name=? WHERE workspace_id=?").run("Direct SQL Update", workspaceId);
    const afterDirectUpdate = getWorkspaceRevision(repo.db, workspaceId).revision;
    assert.ok(afterDirectUpdate > afterInsert);
  } finally {
    if (server.listening) await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});
