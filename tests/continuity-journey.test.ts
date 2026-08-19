import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { ContinuityRepository } from "../src/server/continuity.ts";
import { FundingRepository } from "../src/server/database.ts";
import type { BootstrapState, FundingExportSnapshot, FundingOutcome } from "../src/domain/types.ts";

async function json<T>(baseUrl: string, path: string, method = "GET", body?: unknown): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`${baseUrl}${path}`, init);
  const payload = (await response.json()) as T & { error?: string };
  assert.equal(response.ok, true, payload.error ?? `${method} ${path} failed`);
  return payload;
}

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

test("continuity flow creates a recovery point, exports data, restores safely and survives reopen", async () => {
  const temp = mkdtempSync(join(tmpdir(), "bossai-funding-continuity-"));
  const databasePath = join(temp, "funding.sqlite");
  const repo = new FundingRepository(databasePath);
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));

  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.equal(health.headers.get("x-frame-options"), "DENY");
    assert.match(health.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);

    await json<BootstrapState>(baseUrl, "/api/company-profile", "PUT", companyPayload("Recovery Baseline Co"));
    const beforeBackup = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(beforeBackup.continuity.backupAvailable, true);
    assert.equal(beforeBackup.continuity.accessMode, "local-loopback");
    assert.equal(beforeBackup.continuity.schemaVersion, 10);
    const workspaceId = beforeBackup.identityBoundary.workspaceId;
    assert.match(workspaceId, /^[0-9a-f-]{36}$/i);
    assert.equal(beforeBackup.identityBoundary.remoteAccess, "blocked");
    const identityResponse = await json<BootstrapState["identityBoundary"]>(baseUrl, "/api/security/identity-boundary");
    assert.equal(identityResponse.workspaceId, workspaceId);
    assert.equal(identityResponse.authenticationAuthority, "external-required");
    assert.equal(identityResponse.tenantScopedPersistenceReady, true);
    assert.equal(identityResponse.productionAuthenticationReady, false);
    assert.equal(identityResponse.productionAuthorizationReady, false);
    assert.ok(beforeBackup.activities.some((activity) => activity.title === "Company funding profile updated"));
    const legacyOutcome = await json<{ outcome: FundingOutcome; state: BootstrapState }>(baseUrl, "/api/outcomes", "POST", {
      track: "grant", applicationId: null, investorId: null, roundId: null, status: "won",
      approvedAmountCents: 10_000_000, committedAmountCents: 10_000_000, receivedAmountCents: 5_000_000, receivedDate: "2026-08-16",
      commitmentEvidence: "Award notice #legacy", receiptEvidence: "Bank receipt #legacy", conditions: "Reporting", lossReason: "", feedback: "", retryDate: null,
    });
    const legacyOutcomeId = legacyOutcome.outcome.id;
    assert.ok(legacyOutcomeId);
    await json<BootstrapState>(baseUrl, "/api/receipt-expectations", "POST", {
      outcomeId: legacyOutcomeId, amountCents: 5_000_000, expectedDate: "2026-08-28",
      basisNote: "Schema-9 signed payout schedule", owner: "Founder", note: "Must not auto-match on restore", status: "expected", cancellationReason: "",
    });

    const backupResponse = await json<{ backup: { fileName: string }; state: BootstrapState }>(baseUrl, "/api/continuity/backup", "POST", {});
    const manualBackup = backupResponse.backup.fileName;
    assert.match(manualBackup, /-manual\.sqlite$/);
    assert.equal(backupResponse.state.backups.length, 1);

    // Simulate the immediately previous schema-9 recovery format: Arrival Expectations exist, but explicit expectation-to-receipt allocation links do not.
    const legacyBackupDb = new DatabaseSync(join(temp, "backups", manualBackup));
    try {
      legacyBackupDb.prepare("UPDATE app_metadata SET value='9' WHERE key='schema_version'").run();
      legacyBackupDb.exec("DROP TABLE funding_receipt_expectation_allocation");
    } finally {
      legacyBackupDb.close();
    }

    await json<BootstrapState>(baseUrl, "/api/company-profile", "PUT", companyPayload("Post Backup Mutation Co"));
    const mutated = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(mutated.companyProfile?.name, "Post Backup Mutation Co");

    const exported = await fetch(`${baseUrl}/api/continuity/export`);
    assert.equal(exported.status, 200);
    assert.match(exported.headers.get("content-disposition") ?? "", /bossai-funding-export-/);
    const snapshot = (await exported.json()) as FundingExportSnapshot;
    assert.equal(snapshot.product, "BossAI Funding");
    assert.equal(snapshot.schemaVersion, 10);
    assert.equal(snapshot.tables.company_profile?.[0]?.name, "Post Backup Mutation Co");
    assert.equal(snapshot.tables.app_metadata?.find((row) => row.key === "workspace_id")?.value, workspaceId);
    assert.ok((snapshot.tables.funding_activity?.length ?? 0) >= 3);

    const rejectedRestore = await fetch(`${baseUrl}/api/continuity/restore`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: manualBackup, confirmation: "yes" }),
    });
    assert.equal(rejectedRestore.status, 400);

    const restoreResponse = await json<{ state: BootstrapState }>(baseUrl, "/api/continuity/restore", "POST", {
      fileName: manualBackup,
      confirmation: "RESTORE",
    });
    assert.equal(restoreResponse.state.companyProfile?.name, "Recovery Baseline Co");
    assert.equal(restoreResponse.state.identityBoundary.workspaceId, workspaceId);
    assert.ok(restoreResponse.state.backups.some((backup) => backup.kind === "pre-restore"));
    assert.ok(restoreResponse.state.activities.some((activity) => activity.title === "Funding workspace restored"));
    assert.equal(restoreResponse.state.outcomes[0]?.receivedAmountCents, 5_000_000);
    assert.equal(restoreResponse.state.outcomes[0]?.commitmentEvidence, "Award notice #legacy");
    assert.equal(restoreResponse.state.outcomes[0]?.receiptEvidence, "Bank receipt #legacy");
    assert.equal(restoreResponse.state.receiptTranches.length, 1);
    assert.equal(restoreResponse.state.receiptTranches[0]?.amountCents, 5_000_000);
    assert.equal(restoreResponse.state.receiptTranches[0]?.receivedDate, "2026-08-16");
    assert.equal(restoreResponse.state.receiptTranches[0]?.receiptEvidence, "Bank receipt #legacy");
    assert.equal(restoreResponse.state.receiptExpectations.length, 1);
    assert.equal(restoreResponse.state.receiptExpectations[0]?.amountCents, 5_000_000);
    assert.equal(restoreResponse.state.receiptExpectations[0]?.basisNote, "Schema-9 signed payout schedule");
    assert.equal(restoreResponse.state.receiptExpectationAllocations.length, 0);
    assert.equal(restoreResponse.state.receiptTranches.length, 1);
    assert.equal(restoreResponse.state.receiptTranches[0]?.amountCents, 5_000_000);
    assert.equal(restoreResponse.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-over-${restoreResponse.state.outcomes[0]?.id}`), false);

    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();

    const reopened = new FundingRepository(databasePath);
    try {
      const continuity = new ContinuityRepository(reopened.db, reopened.databasePath);
      assert.equal(reopened.getCompanyProfile()?.name, "Recovery Baseline Co");
      assert.ok(continuity.listBackups().length >= 2);
      assert.ok(continuity.listActivities().some((activity) => activity.action === "restore"));
      assert.equal(continuity.getWorkspaceId(), workspaceId);
    } finally {
      reopened.close();
    }
  } finally {
    if (server.listening) await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    try { repo.close(); } catch { /* already closed */ }
    rmSync(temp, { recursive: true, force: true });
  }
});
