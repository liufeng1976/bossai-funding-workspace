import test from "node:test";
import assert from "node:assert/strict";
import { projectFundingReceiptSchedule } from "../src/domain/arrival-schedule.ts";
import type { FundingOutcome, FundingReceiptExpectation } from "../src/domain/types.ts";

const stamp = "2026-08-17T00:00:00.000Z";
const now = new Date("2026-08-17T12:00:00.000Z");

function outcome(overrides: Partial<FundingOutcome> = {}): FundingOutcome {
  return {
    id: 1,
    track: "equity",
    applicationId: null,
    investorId: null,
    roundId: null,
    status: "closed",
    approvedAmountCents: 50_000_000,
    committedAmountCents: 50_000_000,
    receivedAmountCents: 20_000_000,
    receivedDate: "2026-08-17",
    commitmentEvidence: "Signed closing #C-1",
    receiptEvidence: "Bank receipt #R-1",
    conditions: "",
    lossReason: "",
    feedback: "",
    retryDate: null,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function expectation(id: number, amountCents: number, expectedDate: string, status: FundingReceiptExpectation["status"] = "expected"): FundingReceiptExpectation {
  return {
    id,
    outcomeId: 1,
    amountCents,
    expectedDate,
    basisNote: "Payer-confirmed wire date",
    owner: "Founder",
    note: "",
    status,
    cancellationReason: status === "cancelled" ? "Schedule replaced" : "",
    createdAt: stamp,
    updatedAt: stamp,
  };
}

test("arrival schedule distinguishes unscheduled, partial, balanced and over-scheduled committed capital", () => {
  assert.equal(projectFundingReceiptSchedule(outcome(), [], now).status, "unscheduled");

  const partial = projectFundingReceiptSchedule(outcome(), [expectation(1, 10_000_000, "2026-08-20")], now);
  assert.equal(partial.status, "partial");
  assert.equal(partial.outstandingAmountCents, 30_000_000);
  assert.equal(partial.activeExpectedAmountCents, 10_000_000);
  assert.equal(partial.unscheduledAmountCents, 20_000_000);

  const balanced = projectFundingReceiptSchedule(outcome(), [expectation(1, 10_000_000, "2026-08-19"), expectation(2, 20_000_000, "2026-08-20")], now);
  assert.equal(balanced.status, "balanced");
  assert.equal(balanced.unscheduledAmountCents, 0);
  assert.equal(balanced.overScheduledAmountCents, 0);
  assert.equal(balanced.nextExpectedDate, "2026-08-19");

  const over = projectFundingReceiptSchedule(outcome({ receivedAmountCents: 30_000_000 }), [expectation(1, 30_000_000, "2026-08-20")], now);
  assert.equal(over.status, "over-scheduled");
  assert.equal(over.outstandingAmountCents, 20_000_000);
  assert.equal(over.overScheduledAmountCents, 10_000_000);
});

test("cancelled expectations remain historical but do not contribute to the active schedule", () => {
  const result = projectFundingReceiptSchedule(outcome(), [
    expectation(1, 30_000_000, "2026-08-20", "cancelled"),
    expectation(2, 30_000_000, "2026-08-22"),
  ], now);
  assert.equal(result.status, "balanced");
  assert.equal(result.activeExpectationCount, 1);
  assert.equal(result.activeExpectedAmountCents, 30_000_000);
});

test("overdue count is based only on active explicit receipt expectations", () => {
  const result = projectFundingReceiptSchedule(outcome(), [
    expectation(1, 10_000_000, "2026-08-16"),
    expectation(2, 20_000_000, "2026-08-15", "cancelled"),
    expectation(3, 20_000_000, "2026-08-20"),
  ], now);
  assert.equal(result.status, "balanced");
  assert.equal(result.overdueExpectationCount, 1);
});
