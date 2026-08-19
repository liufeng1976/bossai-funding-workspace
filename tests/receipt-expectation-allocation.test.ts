import test from "node:test";
import assert from "node:assert/strict";
import { projectFundingReceiptSchedule } from "../src/domain/arrival-schedule.ts";
import { projectCapitalBlockers } from "../src/domain/blockers.ts";
import { chooseTodayFocus } from "../src/domain/focus.ts";
import { projectReceiptAllocationReconciliationIssues, projectReceiptExpectationFulfillment } from "../src/domain/receipt-expectation-reconciliation.ts";
import type { FundingOutcome, FundingReceiptExpectation, FundingReceiptExpectationAllocation, FundingReceiptTranche } from "../src/domain/types.ts";

const stamp = "2026-08-18T00:00:00.000Z";
const now = new Date("2026-08-18T12:00:00.000Z");

function outcome(receivedAmountCents = 20_000_000): FundingOutcome {
  return {
    id: 1, track: "equity", applicationId: null, investorId: null, roundId: null, status: "closed",
    approvedAmountCents: 50_000_000, committedAmountCents: 50_000_000, receivedAmountCents,
    receivedDate: receivedAmountCents > 0 ? "2026-08-18" : null, commitmentEvidence: "Signed closing memo", receiptEvidence: receivedAmountCents > 0 ? "Receipt register" : "",
    conditions: "", lossReason: "", feedback: "", retryDate: null, createdAt: stamp, updatedAt: stamp,
  };
}
function expectation(): FundingReceiptExpectation {
  return { id: 10, outcomeId: 1, amountCents: 30_000_000, expectedDate: "2026-08-20", basisNote: "Signed wire schedule", owner: "Founder", note: "", status: "expected", cancellationReason: "", createdAt: stamp, updatedAt: stamp };
}
function tranche(id: number, amountCents: number, status: FundingReceiptTranche["status"] = "received"): FundingReceiptTranche {
  return { id, outcomeId: 1, amountCents, receivedDate: "2026-08-18", receiptEvidence: `Bank receipt ${id}`, note: "", status, voidReason: status === "voided" ? "Bank reversed" : "", createdAt: stamp, updatedAt: stamp };
}
function allocation(id: number, trancheId: number, amountCents: number, status: FundingReceiptExpectationAllocation["status"] = "active"): FundingReceiptExpectationAllocation {
  return { id, expectationId: 10, trancheId, amountCents, note: "Owner-confirmed fulfillment", status, voidReason: status === "voided" ? "Wrong relationship" : "", createdAt: stamp, updatedAt: stamp };
}

test("explicit allocations reduce only the linked expectation remainder", () => {
  const expected = expectation();
  const first = tranche(1, 10_000_000);
  const second = tranche(2, 20_000_000);
  const partial = projectReceiptExpectationFulfillment(expected, [allocation(1, first.id, 10_000_000)], [first, second]);
  assert.equal(partial.status, "partial");
  assert.equal(partial.allocatedAmountCents, 10_000_000);
  assert.equal(partial.remainingAmountCents, 20_000_000);

  const complete = projectReceiptExpectationFulfillment(expected, [allocation(1, first.id, 10_000_000), allocation(2, second.id, 20_000_000)], [first, second]);
  assert.equal(complete.status, "fulfilled");
  assert.equal(complete.remainingAmountCents, 0);
});

test("unallocated actual cash never silently fulfills an expectation", () => {
  const expected = expectation();
  const actual = tranche(1, 10_000_000);
  const fulfillment = projectReceiptExpectationFulfillment(expected, [], [actual]);
  assert.equal(fulfillment.status, "unfulfilled");
  assert.equal(fulfillment.allocatedAmountCents, 0);
  assert.equal(fulfillment.remainingAmountCents, 30_000_000);

  const schedule = projectFundingReceiptSchedule(outcome(30_000_000), [expected], now, [], [actual]);
  assert.equal(schedule.status, "over-scheduled");
  assert.equal(schedule.activeExpectedAmountCents, 30_000_000);
  assert.equal(schedule.outstandingAmountCents, 20_000_000);
});

test("explicit partial allocation reconciles the remaining schedule against outstanding commitment", () => {
  const expected = expectation();
  const actual = tranche(1, 10_000_000);
  const schedule = projectFundingReceiptSchedule(outcome(30_000_000), [expected], now, [allocation(1, actual.id, 10_000_000)], [actual]);
  assert.equal(schedule.status, "balanced");
  assert.equal(schedule.activeExpectedAmountCents, 20_000_000);
  assert.equal(schedule.outstandingAmountCents, 20_000_000);
});

test("voided or invalid actual receipt does not remain valid fulfillment", () => {
  const expected = expectation();
  const reversed = tranche(1, 10_000_000, "voided");
  const link = allocation(1, reversed.id, 10_000_000);
  const fulfillment = projectReceiptExpectationFulfillment(expected, [link], [reversed]);
  assert.equal(fulfillment.status, "invalid-receipt");
  assert.equal(fulfillment.invalidAllocatedAmountCents, 10_000_000);
  const schedule = projectFundingReceiptSchedule(outcome(20_000_000), [expected], now, [link], [reversed]);
  assert.equal(schedule.status, "allocation-error");
});

test("corrected actual cash below active allocation capacity becomes reconciliation-required without rewriting the allocation", () => {
  const expected = expectation();
  const correctedActual = tranche(1, 5_000_000);
  const link = allocation(1, correctedActual.id, 10_000_000);
  const fulfillment = projectReceiptExpectationFulfillment(expected, [link], [correctedActual]);
  assert.equal(fulfillment.status, "invalid-receipt");
  assert.equal(fulfillment.allocatedAmountCents, 0);
  assert.equal(fulfillment.invalidAllocatedAmountCents, 10_000_000);
  assert.equal(fulfillment.remainingAmountCents, 30_000_000);
  assert.deepEqual(fulfillment.reconciliationAllocationIds, [1]);

  const schedule = projectFundingReceiptSchedule(outcome(5_000_000), [expected], now, [link], [correctedActual]);
  assert.equal(schedule.status, "allocation-error");
  assert.equal(schedule.activeExpectedAmountCents, 30_000_000);
});

test("repair guidance states the exact minimum correction after actual cash is reduced", () => {
  const expected = expectation();
  const correctedActual = tranche(1, 5_000_000);
  const link = allocation(1, correctedActual.id, 10_000_000);
  const issues = projectReceiptAllocationReconciliationIssues([expected], [link], [correctedActual]);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.kind, "tranche-overallocated");
  assert.equal(issues[0]?.recordedAllocatedAmountCents, 10_000_000);
  assert.equal(issues[0]?.supportedAmountCents, 5_000_000);
  assert.equal(issues[0]?.requiredReductionCents, 5_000_000);
  assert.deepEqual(issues[0]?.allocationIds, [1]);
});

test("shared receipt over-allocation reports one minimum repair constraint without choosing an allocation", () => {
  const firstExpectation = expectation();
  const secondExpectation: FundingReceiptExpectation = { ...expectation(), id: 11, amountCents: 20_000_000 };
  const actual = tranche(1, 7_000_000);
  const firstLink = allocation(1, actual.id, 6_000_000);
  const secondLink: FundingReceiptExpectationAllocation = { ...allocation(2, actual.id, 4_000_000), expectationId: 11 };
  const issues = projectReceiptAllocationReconciliationIssues([firstExpectation, secondExpectation], [firstLink, secondLink], [actual]);
  const trancheIssue = issues.find((issue) => issue.kind === "tranche-overallocated");
  assert.ok(trancheIssue);
  assert.equal(trancheIssue.recordedAllocatedAmountCents, 10_000_000);
  assert.equal(trancheIssue.supportedAmountCents, 7_000_000);
  assert.equal(trancheIssue.requiredReductionCents, 3_000_000);
  assert.deepEqual(trancheIssue.allocationIds, [1, 2]);
  assert.deepEqual(trancheIssue.expectationIds, [10, 11]);
});

test("cancelled expectation with legacy active allocation is reconciliation-required instead of silently clean", () => {
  const cancelled: FundingReceiptExpectation = { ...expectation(), status: "cancelled", cancellationReason: "Legacy cancellation" };
  const actual = tranche(1, 10_000_000);
  const link = allocation(1, actual.id, 10_000_000);
  const fulfillment = projectReceiptExpectationFulfillment(cancelled, [link], [actual]);
  assert.equal(fulfillment.status, "invalid-receipt");
  assert.equal(fulfillment.reconciliationIssues[0]?.kind, "cancelled-expectation");
  assert.equal(fulfillment.reconciliationIssues[0]?.requiredReductionCents, 10_000_000);
});

test("legacy cancelled expectation with active Allocation remains exact Focus and critical Blocker", () => {
  const cancelled: FundingReceiptExpectation = { ...expectation(), status: "cancelled", cancellationReason: "Legacy cancellation" };
  const actual = tranche(1, 10_000_000);
  const link = allocation(1, actual.id, 10_000_000);
  const currentOutcome = outcome(10_000_000);
  const focus = chooseTodayFocus(null, null, [], now, [], [], [], [], [], [], [], [], [currentOutcome], [], [actual], [cancelled], [link]);
  assert.equal(focus.entityType, "receipt-expectation");
  assert.equal(focus.entityId, cancelled.id);
  assert.match(focus.nextStep, /10000000 cents/);
  assert.match(focus.nextStep, /Allocation #1/);

  const blockers = projectCapitalBlockers({
    profile: null,
    goal: null,
    remainingGapCents: 1,
    committedNotReceivedCents: Math.max(0, currentOutcome.committedAmountCents - currentOutcome.receivedAmountCents),
    actions: [], opportunities: [], investors: [], followUps: [], meetings: [], applications: [], dueDiligenceRequests: [], termSheets: [], closingConditions: [],
    outcomes: [currentOutcome], receiptTranches: [actual], receiptExpectations: [cancelled], receiptExpectationAllocations: [link], now,
  });
  const blocker = blockers.find((item) => item.key === `receipt-allocation-error-${cancelled.id}`);
  assert.ok(blocker);
  assert.equal(blocker.severity, "critical");
  assert.match(blocker.nextStep, /10000000 cents/);
  assert.match(blocker.nextStep, /Allocation #1/);
});

test("voided allocation remains history but stops reducing the expectation", () => {
  const expected = expectation();
  const actual = tranche(1, 10_000_000);
  const fulfillment = projectReceiptExpectationFulfillment(expected, [allocation(1, actual.id, 10_000_000, "voided")], [actual]);
  assert.equal(fulfillment.status, "unfulfilled");
  assert.equal(fulfillment.remainingAmountCents, 30_000_000);
});
