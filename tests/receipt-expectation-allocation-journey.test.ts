import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import { projectReceiptExpectationFulfillment } from "../src/domain/receipt-expectation-reconciliation.ts";
import type { BootstrapState, FundingOutcome, FundingReceiptExpectation, FundingReceiptExpectationAllocation, FundingReceiptTranche } from "../src/domain/types.ts";

async function json<T>(baseUrl: string, path: string, method = "GET", body?: unknown): Promise<T> {
  const response = body === undefined
    ? await fetch(`${baseUrl}${path}`, { method })
    : await fetch(`${baseUrl}${path}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal(response.ok, true, `${method} ${path} -> ${response.status}: ${await response.clone().text()}`);
  return await response.json() as T;
}

function outcomePayload(): Record<string, unknown> {
  return {
    track: "equity", applicationId: null, investorId: null, roundId: null, status: "closed",
    approvedAmountCents: 50_000_000, committedAmountCents: 50_000_000, receivedAmountCents: 20_000_000,
    receivedDate: "2026-08-17", commitmentEvidence: "Signed closing #C-500", receiptEvidence: "Bank transaction #R-200",
    conditions: "", lossReason: "", feedback: "Partial funding received", retryDate: null,
  };
}

test("real HTTP explicitly reconciles arrival expectations to actual receipt tranches without auto-matching", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const created = await json<{ outcome: FundingOutcome; state: BootstrapState }>(baseUrl, "/api/outcomes", "POST", outcomePayload());
    const outcomeId = created.outcome.id;
    const expectationCreated = await json<{ receiptExpectation: FundingReceiptExpectation; state: BootstrapState }>(baseUrl, "/api/receipt-expectations", "POST", {
      outcomeId, amountCents: 30_000_000, expectedDate: "2026-08-20", basisNote: "Signed closing schedule", owner: "Founder", note: "", status: "expected", cancellationReason: "",
    });
    const expectationId = expectationCreated.receiptExpectation.id;

    const secondReceipt = await json<{ receiptTranche: FundingReceiptTranche; state: BootstrapState }>(baseUrl, "/api/receipt-tranches", "POST", {
      outcomeId, amountCents: 10_000_000, receivedDate: "2026-08-18", receiptEvidence: "Bank transaction #R-100", note: "Second actual receipt", status: "received", voidReason: "",
    });
    const secondTrancheId = secondReceipt.receiptTranche.id;
    assert.equal(secondReceipt.state.outcomes.find((item) => item.id === outcomeId)?.receivedAmountCents, 30_000_000);
    assert.deepEqual(secondReceipt.state.receiptExpectationAllocations, []);
    assert.ok(secondReceipt.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-over-${outcomeId}`));

    const allocated = await json<{ receiptExpectationAllocation: FundingReceiptExpectationAllocation; state: BootstrapState }>(baseUrl, "/api/receipt-expectation-allocations", "POST", {
      expectationId, trancheId: secondTrancheId, amountCents: 10_000_000, note: "Payer confirmed this wire is the first part of the scheduled amount", status: "active", voidReason: "",
    });
    const allocationId = allocated.receiptExpectationAllocation.id;
    assert.equal(allocated.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-over-${outcomeId}`), false);
    const expectationCard = allocated.state.receiptExpectations.find((item) => item.id === expectationId);
    assert.ok(expectationCard);
    assert.ok(allocated.state.dashboard.timingPlan.milestones.some((item) => item.kind === "expected-receipt" && item.entityId === expectationId && /20000000 cents remaining/.test(item.title)));

    const overExpectation = await fetch(`${baseUrl}/api/receipt-expectation-allocations`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ expectationId, trancheId: secondTrancheId, amountCents: 1, note: "Would exceed tranche", status: "active", voidReason: "" }),
    });
    assert.equal(overExpectation.status, 400);

    const finalReceipt = await json<{ receiptTranche: FundingReceiptTranche; state: BootstrapState }>(baseUrl, "/api/receipt-tranches", "POST", {
      outcomeId, amountCents: 20_000_000, receivedDate: "2026-08-20", receiptEvidence: "Bank transaction #R-200-final", note: "Final actual receipt", status: "received", voidReason: "",
    });
    const finalTrancheId = finalReceipt.receiptTranche.id;
    assert.equal(finalReceipt.state.outcomes.find((item) => item.id === outcomeId)?.receivedAmountCents, 50_000_000);
    assert.ok(finalReceipt.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-over-${outcomeId}`));

    const fulfilled = await json<{ receiptExpectationAllocation: FundingReceiptExpectationAllocation; state: BootstrapState }>(baseUrl, "/api/receipt-expectation-allocations", "POST", {
      expectationId, trancheId: finalTrancheId, amountCents: 20_000_000, note: "Payer confirmed this is the final scheduled wire", status: "active", voidReason: "",
    });
    const finalAllocationId = fulfilled.receiptExpectationAllocation.id;
    assert.equal(fulfilled.state.dashboard.capitalBlockers.some((item) => item.entityType === "receipt-expectation" && item.entityId === expectationId), false);
    assert.equal(fulfilled.state.dashboard.timingPlan.milestones.some((item) => item.kind === "expected-receipt" && item.entityId === expectationId), false);

    const voidLink = await json<{ state: BootstrapState }>(baseUrl, `/api/receipt-expectation-allocations/${finalAllocationId}`, "PATCH", {
      ...fulfilled.state.receiptExpectationAllocations.find((item) => item.id === finalAllocationId), status: "voided", voidReason: "Relationship recorded against wrong settlement memo",
    });
    assert.equal(voidLink.state.receiptExpectationAllocations.find((item) => item.id === finalAllocationId)?.status, "voided");
    assert.ok(voidLink.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-over-${outcomeId}`));

    const reinstated = await json<{ state: BootstrapState }>(baseUrl, `/api/receipt-expectation-allocations/${finalAllocationId}`, "PATCH", {
      ...voidLink.state.receiptExpectationAllocations.find((item) => item.id === finalAllocationId), status: "active", voidReason: "",
    });
    assert.equal(reinstated.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-over-${outcomeId}`), false);

    const correctedActual = await json<{ state: BootstrapState }>(baseUrl, `/api/receipt-tranches/${finalTrancheId}`, "PATCH", {
      ...reinstated.state.receiptTranches.find((item) => item.id === finalTrancheId), amountCents: 15_000_000,
    });
    assert.equal(correctedActual.state.outcomes.find((item) => item.id === outcomeId)?.receivedAmountCents, 45_000_000, "actual cash correction must remain authoritative");
    assert.equal(correctedActual.state.receiptExpectationAllocations.find((item) => item.id === finalAllocationId)?.status, "active", "cash correction must not rewrite allocation history");
    assert.equal(correctedActual.state.dashboard.todayFocus.entityType, "receipt-expectation");
    assert.equal(correctedActual.state.dashboard.todayFocus.entityId, expectationId);
    assert.match(correctedActual.state.dashboard.todayFocus.nextStep, new RegExp(`Allocation #${finalAllocationId}`));
    assert.match(correctedActual.state.dashboard.todayFocus.nextStep, /5000000 cents/);
    const repairIssue = correctedActual.state.receiptAllocationReconciliationIssues.find((item) => item.kind === "tranche-overallocated" && item.trancheId === finalTrancheId);
    assert.ok(repairIssue);
    assert.equal(repairIssue.recordedAllocatedAmountCents, 20_000_000);
    assert.equal(repairIssue.supportedAmountCents, 15_000_000);
    assert.equal(repairIssue.requiredReductionCents, 5_000_000);
    assert.deepEqual(repairIssue.allocationIds, [finalAllocationId]);
    assert.ok(correctedActual.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-allocation-error-${expectationId}` && item.severity === "critical" && item.nextStep.includes(`5000000 cents`) && item.nextStep.includes(`Allocation #${finalAllocationId}`)));
    const repairSummary = await fetch(`${baseUrl}/api/reports/owner-board-summary.md`);
    assert.equal(repairSummary.status, 200);
    const repairSummaryText = await repairSummary.text();
    assert.match(repairSummaryText, /Minimum correction: \*\*\$50,000\*\*/);
    assert.match(repairSummaryText, new RegExp(`Allocation\\(s\\) ${finalAllocationId}`));

    const invalidAllocationMustNotReleaseSchedule = await fetch(`${baseUrl}/api/receipt-expectations`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        outcomeId, amountCents: 1, expectedDate: "2026-08-31", basisNote: "Must not fit while prior invalid Allocation is unresolved",
        owner: "Founder", note: "", status: "expected", cancellationReason: "",
      }),
    });
    assert.equal(invalidAllocationMustNotReleaseSchedule.status, 400, "an invalid Allocation must not falsely release future schedule capacity");
    const afterRejectedExtraSchedule = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(afterRejectedExtraSchedule.workspaceRevision, correctedActual.state.workspaceRevision, "failed extra schedule must not advance revision");
    assert.equal(afterRejectedExtraSchedule.receiptExpectations.filter((item) => item.outcomeId === outcomeId && item.status === "expected").length, 1);

    const repairedAllocation = await json<{ state: BootstrapState }>(baseUrl, `/api/receipt-expectation-allocations/${finalAllocationId}`, "PATCH", {
      ...correctedActual.state.receiptExpectationAllocations.find((item) => item.id === finalAllocationId), amountCents: 15_000_000,
    });
    assert.equal(repairedAllocation.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-allocation-error-${expectationId}`), false, "correcting the invalid Allocation must clear reconciliation error");
    assert.equal(repairedAllocation.state.receiptAllocationReconciliationIssues.some((item) => item.allocationIds.includes(finalAllocationId)), false, "repair projection must clear after the Allocation is corrected to supported cash");

    const voidActual = await json<{ state: BootstrapState }>(baseUrl, `/api/receipt-tranches/${finalTrancheId}`, "PATCH", {
      ...repairedAllocation.state.receiptTranches.find((item) => item.id === finalTrancheId), status: "voided", voidReason: "Bank reversed the transfer",
    });
    assert.equal(voidActual.state.outcomes.find((item) => item.id === outcomeId)?.receivedAmountCents, 30_000_000);
    assert.equal(voidActual.state.dashboard.todayFocus.entityType, "receipt-expectation");
    assert.equal(voidActual.state.dashboard.todayFocus.entityId, expectationId);
    assert.ok(voidActual.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-allocation-error-${expectationId}` && item.severity === "critical"));

    const allocationHistory = voidActual.state.receiptExpectationAllocations.find((item) => item.id === finalAllocationId);
    assert.equal(allocationHistory?.status, "active");
    assert.equal(voidActual.state.receiptTranches.find((item) => item.id === finalTrancheId)?.status, "voided");
    assert.equal(voidActual.state.receiptExpectationAllocations.some((item) => item.id === allocationId), true);

    const repairedAfterVoid = await json<{ state: BootstrapState }>(baseUrl, `/api/receipt-expectation-allocations/${finalAllocationId}`, "PATCH", {
      ...allocationHistory, status: "voided", voidReason: "Underlying bank receipt was reversed",
    });
    assert.equal(repairedAfterVoid.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-allocation-error-${expectationId}`), false, "voiding the invalid Allocation must clear reconciliation error");
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
    repo.close();
  }
});

test("expectation corrections fail closed below active allocations and require explicit void before cancellation", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const created = await json<{ outcome: FundingOutcome }>(baseUrl, "/api/outcomes", "POST", {
      ...outcomePayload(), approvedAmountCents: 40_000_000, committedAmountCents: 40_000_000,
      receivedAmountCents: 0, receivedDate: null, receiptEvidence: "",
    });
    const outcomeId = created.outcome.id;
    const expectationCreated = await json<{ receiptExpectation: FundingReceiptExpectation }>(baseUrl, "/api/receipt-expectations", "POST", {
      outcomeId, amountCents: 30_000_000, expectedDate: "2026-08-25", basisNote: "Signed settlement schedule", owner: "Founder", note: "", status: "expected", cancellationReason: "",
    });
    const receiptCreated = await json<{ receiptTranche: FundingReceiptTranche }>(baseUrl, "/api/receipt-tranches", "POST", {
      outcomeId, amountCents: 10_000_000, receivedDate: "2026-08-18", receiptEvidence: "Bank receipt #A-100", note: "", status: "received", voidReason: "",
    });
    const allocationCreated = await json<{ receiptExpectationAllocation: FundingReceiptExpectationAllocation }>(baseUrl, "/api/receipt-expectation-allocations", "POST", {
      expectationId: expectationCreated.receiptExpectation.id, trancheId: receiptCreated.receiptTranche.id, amountCents: 10_000_000,
      note: "Owner confirmed first settlement tranche", status: "active", voidReason: "",
    });
    const expectationId = expectationCreated.receiptExpectation.id;
    const allocationId = allocationCreated.receiptExpectationAllocation.id;

    const newlyAvailableSchedule = await json<{ receiptExpectation: FundingReceiptExpectation; state: BootstrapState }>(baseUrl, "/api/receipt-expectations", "POST", {
      outcomeId, amountCents: 10_000_000, expectedDate: "2026-08-30", basisNote: "Second explicit settlement checkpoint", owner: "Founder", note: "", status: "expected", cancellationReason: "",
    });
    assert.equal(newlyAvailableSchedule.receiptExpectation.amountCents, 10_000_000, "explicitly allocated cash must release future schedule capacity");

    const beforeRejectedShrink = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    const rejectedShrink = await fetch(`${baseUrl}/api/receipt-expectations/${expectationId}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...beforeRejectedShrink.receiptExpectations.find((item) => item.id === expectationId), amountCents: 5_000_000 }),
    });
    assert.equal(rejectedShrink.status, 400);
    const rejectedShrinkBody = await rejectedShrink.json() as { error: string };
    assert.match(rejectedShrinkBody.error, /Expected total cannot be lower than actual cash already explicitly allocated/i);
    const afterRejectedShrink = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(afterRejectedShrink.workspaceRevision, beforeRejectedShrink.workspaceRevision, "failed shrink must not advance revision");
    assert.equal(afterRejectedShrink.receiptExpectations.find((item) => item.id === expectationId)?.amountCents, 30_000_000, "failed shrink must not change state");

    const shrunkToAllocated = await json<{ state: BootstrapState }>(baseUrl, `/api/receipt-expectations/${expectationId}`, "PATCH", {
      ...afterRejectedShrink.receiptExpectations.find((item) => item.id === expectationId), amountCents: 10_000_000,
    });
    const fulfilled = projectReceiptExpectationFulfillment(
      shrunkToAllocated.state.receiptExpectations.find((item) => item.id === expectationId)!,
      shrunkToAllocated.state.receiptExpectationAllocations,
      shrunkToAllocated.state.receiptTranches,
    );
    assert.equal(fulfilled.status, "fulfilled");
    assert.equal(fulfilled.remainingAmountCents, 0);

    const beforeRejectedCancel = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    const rejectedCancel = await fetch(`${baseUrl}/api/receipt-expectations/${expectationId}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...beforeRejectedCancel.receiptExpectations.find((item) => item.id === expectationId),
        status: "cancelled", cancellationReason: "Schedule withdrawn",
      }),
    });
    assert.equal(rejectedCancel.status, 400);
    const rejectedCancelBody = await rejectedCancel.json() as { error: string };
    assert.match(rejectedCancelBody.error, /active Allocations cannot be cancelled/i);
    const afterRejectedCancel = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(afterRejectedCancel.workspaceRevision, beforeRejectedCancel.workspaceRevision, "failed cancellation must not advance revision");
    assert.equal(afterRejectedCancel.receiptExpectations.find((item) => item.id === expectationId)?.status, "expected");

    const voided = await json<{ state: BootstrapState }>(baseUrl, `/api/receipt-expectation-allocations/${allocationId}`, "PATCH", {
      ...afterRejectedCancel.receiptExpectationAllocations.find((item) => item.id === allocationId),
      status: "voided", voidReason: "Owner corrected the explicit fulfillment relationship",
    });
    const cancelled = await json<{ state: BootstrapState }>(baseUrl, `/api/receipt-expectations/${expectationId}`, "PATCH", {
      ...voided.state.receiptExpectations.find((item) => item.id === expectationId),
      status: "cancelled", cancellationReason: "Payer schedule was withdrawn after allocation correction",
    });
    assert.equal(cancelled.state.receiptExpectations.find((item) => item.id === expectationId)?.status, "cancelled");
    assert.equal(cancelled.state.receiptExpectationAllocations.find((item) => item.id === allocationId)?.status, "voided");
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
    repo.close();
  }
});

test("allocation corrections revalidate remaining expectation and tranche capacity and cannot move relationships", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  async function createScenario(trancheAmountCents: number): Promise<{ expectation: FundingReceiptExpectation; allocation: FundingReceiptExpectationAllocation }> {
    const created = await json<{ outcome: FundingOutcome }>(baseUrl, "/api/outcomes", "POST", {
      ...outcomePayload(), approvedAmountCents: 60_000_000, committedAmountCents: 60_000_000,
      receivedAmountCents: 0, receivedDate: null, receiptEvidence: "",
    });
    const expectation = await json<{ receiptExpectation: FundingReceiptExpectation }>(baseUrl, "/api/receipt-expectations", "POST", {
      outcomeId: created.outcome.id, amountCents: 30_000_000, expectedDate: "2026-08-28", basisNote: "Signed payment schedule", owner: "Founder", note: "", status: "expected", cancellationReason: "",
    });
    const tranche = await json<{ receiptTranche: FundingReceiptTranche }>(baseUrl, "/api/receipt-tranches", "POST", {
      outcomeId: created.outcome.id, amountCents: trancheAmountCents, receivedDate: "2026-08-18", receiptEvidence: `Bank receipt ${trancheAmountCents}`, note: "", status: "received", voidReason: "",
    });
    const allocation = await json<{ receiptExpectationAllocation: FundingReceiptExpectationAllocation }>(baseUrl, "/api/receipt-expectation-allocations", "POST", {
      expectationId: expectation.receiptExpectation.id, trancheId: tranche.receiptTranche.id, amountCents: 10_000_000,
      note: "Owner-confirmed link", status: "active", voidReason: "",
    });
    return { expectation: expectation.receiptExpectation, allocation: allocation.receiptExpectationAllocation };
  }

  try {
    const expectationCapacity = await createScenario(50_000_000);
    const overExpectation = await fetch(`${baseUrl}/api/receipt-expectation-allocations/${expectationCapacity.allocation.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...expectationCapacity.allocation, amountCents: 31_000_000 }),
    });
    assert.equal(overExpectation.status, 400);
    assert.match((await overExpectation.json() as { error: string }).error, /remaining expectation capacity/i);

    const trancheCapacity = await createScenario(20_000_000);
    const overTranche = await fetch(`${baseUrl}/api/receipt-expectation-allocations/${trancheCapacity.allocation.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...trancheCapacity.allocation, amountCents: 21_000_000 }),
    });
    assert.equal(overTranche.status, 400);
    assert.match((await overTranche.json() as { error: string }).error, /remaining Receipt Tranche capacity/i);

    const movedRelationship = await fetch(`${baseUrl}/api/receipt-expectation-allocations/${trancheCapacity.allocation.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...trancheCapacity.allocation, expectationId: expectationCapacity.expectation.id }),
    });
    assert.equal(movedRelationship.status, 400);
    assert.match((await movedRelationship.json() as { error: string }).error, /relationship cannot be moved/i);

    const finalState = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(finalState.receiptExpectationAllocations.find((item) => item.id === expectationCapacity.allocation.id)?.amountCents, 10_000_000);
    assert.equal(finalState.receiptExpectationAllocations.find((item) => item.id === trancheCapacity.allocation.id)?.amountCents, 10_000_000);
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
    repo.close();
  }
});
