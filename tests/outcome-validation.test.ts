import test from "node:test";
import assert from "node:assert/strict";
import { parseOutcome } from "../src/server/validation.ts";

function validOutcome(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    track: "grant",
    applicationId: 1,
    investorId: null,
    roundId: null,
    status: "won",
    approvedAmountCents: 30_000_000,
    committedAmountCents: 30_000_000,
    receivedAmountCents: 10_000_000,
    receivedDate: "2026-08-16",
    commitmentEvidence: "Award notice #A-2026-15",
    receiptEvidence: "Bank transaction #TX-1001",
    conditions: "Quarterly reporting",
    lossReason: "",
    feedback: "Awarded",
    retryDate: null,
    ...overrides,
  };
}

test("Funding Outcome rejects received capital above committed total", () => {
  assert.throws(
    () => parseOutcome(validOutcome({ committedAmountCents: 10_000_000, receivedAmountCents: 20_000_000 })),
    /Received capital cannot exceed the recorded committed total/i,
  );
});

test("Funding Outcome rejects committed capital above a recorded approved amount", () => {
  assert.throws(
    () => parseOutcome(validOutcome({ approvedAmountCents: 20_000_000, committedAmountCents: 30_000_000 })),
    /Committed capital cannot exceed the recorded approved amount/i,
  );
});

test("Funding Outcome requires commitment evidence before committed capital changes the financing state", () => {
  assert.throws(
    () => parseOutcome(validOutcome({ commitmentEvidence: "" })),
    /commitment evidence reference/i,
  );
});

test("Funding Outcome requires a received date when cash is recorded as received", () => {
  assert.throws(
    () => parseOutcome(validOutcome({ receivedDate: null })),
    /Record the date when received capital actually arrived/i,
  );
});

test("Funding Outcome requires receipt evidence before cash is treated as received", () => {
  assert.throws(
    () => parseOutcome(validOutcome({ receiptEvidence: "" })),
    /receipt evidence reference/i,
  );
});

test("lost or withdrawn Outcome cannot retain committed or received capital", () => {
  assert.throws(
    () => parseOutcome(validOutcome({ status: "lost" })),
    /Lost or withdrawn financing cannot retain committed or received capital/i,
  );
  assert.throws(
    () => parseOutcome(validOutcome({ status: "withdrawn" })),
    /Lost or withdrawn financing cannot retain committed or received capital/i,
  );
});

test("lost Outcome can preserve approved-history context when committed and received are zero", () => {
  const parsed = parseOutcome(validOutcome({
    status: "lost",
    committedAmountCents: 0,
    receivedAmountCents: 0,
    receivedDate: null,
    lossReason: "Award conditions were not accepted.",
  }));
  assert.equal(parsed.status, "lost");
  assert.equal(parsed.approvedAmountCents, 30_000_000);
  assert.equal(parsed.committedAmountCents, 0);
  assert.equal(parsed.receivedAmountCents, 0);
});
