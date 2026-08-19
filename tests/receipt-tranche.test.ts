import test from "node:test";
import assert from "node:assert/strict";
import { projectFundingOutcomeEvidence } from "../src/domain/outcome-evidence.ts";
import { parseReceiptTranche } from "../src/server/validation.ts";
import type { FundingOutcome, FundingReceiptTranche } from "../src/domain/types.ts";

const stamp = "2026-08-17T00:00:00.000Z";

function outcome(overrides: Partial<FundingOutcome> = {}): FundingOutcome {
  return {
    id: 1,
    track: "equity",
    applicationId: null,
    investorId: 1,
    roundId: null,
    status: "closed",
    approvedAmountCents: 50_000_000,
    committedAmountCents: 50_000_000,
    receivedAmountCents: 20_000_000,
    receivedDate: "2026-08-17",
    commitmentEvidence: "Signed financing agreement #A1",
    receiptEvidence: "Bank transaction #T1",
    conditions: "",
    lossReason: "",
    feedback: "",
    retryDate: null,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function tranche(id: number, amountCents: number, overrides: Partial<FundingReceiptTranche> = {}): FundingReceiptTranche {
  return {
    id,
    outcomeId: 1,
    amountCents,
    receivedDate: id === 1 ? "2026-08-17" : "2026-08-20",
    receiptEvidence: `Bank transaction #T${id}`,
    note: "",
    status: "received",
    voidReason: "",
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

test("current receipt register requires active tranches to reconcile exactly to Outcome received capital", () => {
  const missingRegister = projectFundingOutcomeEvidence(outcome(), []);
  assert.equal(missingRegister.receiptTrancheReconciled, false);
  assert.deepEqual(missingRegister.missing, ["receipt", "reconciliation"]);

  const partial = projectFundingOutcomeEvidence(outcome(), [tranche(1, 10_000_000)]);
  assert.equal(partial.receiptTrancheAmountCents, 10_000_000);
  assert.equal(partial.receiptTrancheReconciled, false);
  assert.equal(partial.missing.includes("reconciliation"), true);

  const exact = projectFundingOutcomeEvidence(outcome(), [tranche(1, 20_000_000)]);
  assert.equal(exact.receiptTrancheCount, 1);
  assert.equal(exact.receiptTrancheAmountCents, 20_000_000);
  assert.equal(exact.receiptTrancheReconciled, true);
  assert.equal(exact.complete, true);
});

test("voided receipt tranche remains history but does not contribute to received reconciliation", () => {
  const state = projectFundingOutcomeEvidence(
    outcome({ receivedAmountCents: 20_000_000 }),
    [tranche(1, 20_000_000), tranche(2, 30_000_000, { status: "voided", voidReason: "Duplicate bank import" })],
  );
  assert.equal(state.receiptTrancheCount, 1);
  assert.equal(state.receiptTrancheAmountCents, 20_000_000);
  assert.equal(state.receiptTrancheReconciled, true);
});

test("receipt tranche validation requires positive amount, date, evidence, and a reason when voided", () => {
  const valid = parseReceiptTranche({ outcomeId: 1, amountCents: 20_000_000, receivedDate: "2026-08-17", receiptEvidence: "Bank transaction #T1", note: "First wire", status: "received", voidReason: "" });
  assert.equal(valid.amountCents, 20_000_000);

  assert.throws(() => parseReceiptTranche({ ...valid, amountCents: 0 }), /greater than zero/i);
  assert.throws(() => parseReceiptTranche({ ...valid, receiptEvidence: "" }), /receiptEvidence is required/i);
  assert.throws(() => parseReceiptTranche({ ...valid, status: "voided", voidReason: "" }), /Record why this receipt tranche is voided/i);
});
