import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import type { BootstrapState, FundingOutcome, FundingReceiptExpectation } from "../src/domain/types.ts";

async function json<T>(baseUrl: string, path: string, method = "GET", body?: unknown): Promise<T> {
  const response = body === undefined
    ? await fetch(`${baseUrl}${path}`, { method })
    : await fetch(`${baseUrl}${path}`, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
  assert.equal(response.ok, true, `${method} ${path} -> ${response.status}: ${await response.clone().text()}`);
  return await response.json() as T;
}

function outcomePayload(): Record<string, unknown> {
  return {
    track: "equity",
    applicationId: null,
    investorId: null,
    roundId: null,
    status: "closed",
    approvedAmountCents: 50_000_000,
    committedAmountCents: 50_000_000,
    receivedAmountCents: 20_000_000,
    receivedDate: "2026-08-17",
    commitmentEvidence: "Signed closing #C-500",
    receiptEvidence: "Bank transaction #R-200",
    conditions: "",
    lossReason: "",
    feedback: "Partial funding received",
    retryDate: null,
  };
}

test("explicit arrival schedule reconciles committed-but-unreceived capital without becoming received cash", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const created = await json<{ outcome: FundingOutcome; state: BootstrapState }>(baseUrl, "/api/outcomes", "POST", outcomePayload());
    const outcomeId = created.outcome.id;
    assert.equal(created.outcome.receivedAmountCents, 20_000_000);
    assert.equal(created.state.receiptTranches.length, 1);
    assert.ok(created.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-gap-${outcomeId}`));

    const expectationCreated = await json<{ receiptExpectation: FundingReceiptExpectation; state: BootstrapState }>(baseUrl, "/api/receipt-expectations", "POST", {
      outcomeId,
      amountCents: 30_000_000,
      expectedDate: "2026-08-20",
      basisNote: "Signed closing schedule says wire on 2026-08-20",
      owner: "Founder",
      note: "Confirm payer readiness one day before",
      status: "expected",
      cancellationReason: "",
    });
    const expectationId = expectationCreated.receiptExpectation.id;
    assert.equal(expectationCreated.state.outcomes[0]?.receivedAmountCents, 20_000_000);
    assert.equal(expectationCreated.state.dashboard.receivedAmountCents, 20_000_000);
    assert.equal(expectationCreated.state.dashboard.committedAmountCents, 30_000_000);
    assert.equal(expectationCreated.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-gap-${outcomeId}`), false);
    assert.ok(expectationCreated.state.dashboard.timingPlan.milestones.some((item) => item.kind === "expected-receipt" && item.entityId === expectationId));
    assert.equal(expectationCreated.state.dashboard.todayFocus.entityType, "receipt-expectation");
    assert.equal(expectationCreated.state.dashboard.todayFocus.entityId, expectationId);

    const overage = await fetch(`${baseUrl}/api/receipt-expectations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        outcomeId,
        amountCents: 1,
        expectedDate: "2026-08-21",
        basisNote: "Should not fit",
        owner: "Founder",
        note: "",
        status: "expected",
        cancellationReason: "",
      }),
    });
    assert.equal(overage.status, 400);
    const afterOverage = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(afterOverage.receiptExpectations.filter((item) => item.status === "expected").length, 1);
    assert.equal(afterOverage.outcomes[0]?.receivedAmountCents, 20_000_000);

    const actualReceipt = await json<{ state: BootstrapState }>(baseUrl, "/api/receipt-tranches", "POST", {
      outcomeId,
      amountCents: 10_000_000,
      receivedDate: "2026-08-18",
      receiptEvidence: "Bank transaction #R-100",
      note: "Second actual receipt",
      status: "received",
      voidReason: "",
    });
    assert.equal(actualReceipt.state.outcomes[0]?.receivedAmountCents, 30_000_000);
    assert.ok(actualReceipt.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-over-${outcomeId}` && item.severity === "critical"));
    assert.equal(actualReceipt.state.dashboard.todayFocus.entityType, "funding-outcome");
    assert.match(actualReceipt.state.dashboard.todayFocus.title, /arrival schedule/i);

    const corrected = await json<{ state: BootstrapState }>(baseUrl, `/api/receipt-expectations/${expectationId}`, "PATCH", {
      ...actualReceipt.state.receiptExpectations.find((item) => item.id === expectationId),
      amountCents: 20_000_000,
    });
    assert.equal(corrected.state.outcomes[0]?.receivedAmountCents, 30_000_000);
    assert.equal(corrected.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-over-${outcomeId}`), false);

    const overdue = await json<{ state: BootstrapState }>(baseUrl, `/api/receipt-expectations/${expectationId}`, "PATCH", {
      ...corrected.state.receiptExpectations.find((item) => item.id === expectationId),
      expectedDate: "2026-08-16",
    });
    assert.equal(overdue.state.dashboard.todayFocus.entityType, "receipt-expectation");
    assert.equal(overdue.state.dashboard.todayFocus.entityId, expectationId);
    assert.equal(overdue.state.dashboard.todayFocus.urgency, "urgent");
    assert.ok(overdue.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-expectation-overdue-${expectationId}` && item.severity === "critical"));
    assert.ok(overdue.state.dashboard.timingPlan.milestones.some((item) => item.kind === "expected-receipt" && item.entityId === expectationId && item.status === "overdue"));

    const cancelled = await json<{ state: BootstrapState }>(baseUrl, `/api/receipt-expectations/${expectationId}`, "PATCH", {
      ...overdue.state.receiptExpectations.find((item) => item.id === expectationId),
      status: "cancelled",
      cancellationReason: "Payer replaced the wire schedule; no new explicit date yet",
    });
    assert.equal(cancelled.state.receiptExpectations.find((item) => item.id === expectationId)?.status, "cancelled");
    assert.equal(cancelled.state.dashboard.timingPlan.milestones.some((item) => item.kind === "expected-receipt" && item.entityId === expectationId), false);
    assert.ok(cancelled.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-gap-${outcomeId}`));
    assert.equal(cancelled.state.outcomes[0]?.receivedAmountCents, 30_000_000);
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
    repo.close();
  }
});

test("security and continuity projections include the arrival-schedule persistence boundary", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const state = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(state.continuity.schemaVersion, 10);
    assert.deepEqual(state.receiptExpectations, []);
    assert.deepEqual(state.receiptExpectationAllocations, []);

    const review = await json<{
      tenantPersistence: { scopedTables: number; requiredTables: number };
      startupSecurityInvariants: { referenceGuardCount: number };
      workspaceRevision: { trackedBusinessTableCount: number; expectedTriggerCount: number; installedTriggerCount: number };
      apiSecurityManifest: { routeCount: number; publicRouteCount: number };
    }>(baseUrl, "/api/security/review-readiness");
    assert.equal(review.tenantPersistence.scopedTables, 27);
    assert.equal(review.tenantPersistence.requiredTables, 27);
    assert.equal(review.startupSecurityInvariants.referenceGuardCount, 34);
    assert.equal(review.workspaceRevision.trackedBusinessTableCount, 27);
    assert.equal(review.workspaceRevision.expectedTriggerCount, 81);
    assert.equal(review.workspaceRevision.installedTriggerCount, 81);
    assert.equal(review.apiSecurityManifest.routeCount, 53);
    assert.equal(review.apiSecurityManifest.publicRouteCount, 1);
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
    repo.close();
  }
});
