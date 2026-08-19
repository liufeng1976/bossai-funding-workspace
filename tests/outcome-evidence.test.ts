import test from "node:test";
import assert from "node:assert/strict";
import { projectCapitalBlockers } from "../src/domain/blockers.ts";
import { chooseTodayFocus } from "../src/domain/focus.ts";
import { projectFundingOutcomeEvidence } from "../src/domain/outcome-evidence.ts";
import type { FundingOutcome } from "../src/domain/types.ts";

const stamp = "2026-08-16T12:00:00.000Z";
const now = new Date(stamp);

function outcome(overrides: Partial<FundingOutcome> = {}): FundingOutcome {
  return {
    id: 1,
    track: "grant",
    applicationId: null,
    investorId: null,
    roundId: null,
    status: "won",
    approvedAmountCents: 30_000_000,
    committedAmountCents: 30_000_000,
    receivedAmountCents: 10_000_000,
    receivedDate: "2026-08-16",
    commitmentEvidence: "",
    receiptEvidence: "",
    conditions: "Quarterly reporting",
    lossReason: "",
    feedback: "Awarded",
    retryDate: null,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

test("Funding Outcome evidence projection distinguishes commitment and receipt support", () => {
  const missing = projectFundingOutcomeEvidence(outcome());
  assert.equal(missing.complete, false);
  assert.deepEqual(missing.missing, ["commitment", "receipt"]);

  const commitmentOnly = projectFundingOutcomeEvidence(outcome({ commitmentEvidence: "Award notice #A1" }));
  assert.deepEqual(commitmentOnly.missing, ["receipt"]);

  const complete = projectFundingOutcomeEvidence(outcome({ commitmentEvidence: "Award notice #A1", receiptEvidence: "Bank transaction #TX1" }));
  assert.equal(complete.complete, true);
  assert.deepEqual(complete.missing, []);
});

test("legacy received capital without evidence becomes exact urgent Today Focus", () => {
  const focus = chooseTodayFocus(null, null, [], now, [], [], [], [], [], [], [], [], [outcome()], []);
  assert.equal(focus.entityType, "funding-outcome");
  assert.equal(focus.entityId, 1);
  assert.equal(focus.urgency, "urgent");
  assert.match(focus.title, /received capital/i);
  assert.match(focus.reason, /missing commitment and receipt evidence/i);
});

test("legacy received capital without evidence becomes a critical capital blocker", () => {
  const blockers = projectCapitalBlockers({
    profile: null,
    goal: null,
    remainingGapCents: 100_000_000,
    committedNotReceivedCents: 0,
    actions: [],
    opportunities: [],
    investors: [],
    followUps: [],
    meetings: [],
    applications: [],
    dueDiligenceRequests: [],
    termSheets: [],
    closingConditions: [],
    outcomes: [outcome()],
    now,
  });
  const blocker = blockers.find((item) => item.entityType === "funding-outcome" && item.entityId === 1);
  assert.equal(blocker?.severity, "critical");
  assert.match(blocker?.title ?? "", /receipt evidence/i);
});

test("commitment-only legacy evidence gap remains high priority but is not mislabeled as received cash", () => {
  const recorded = outcome({ receivedAmountCents: 0, receivedDate: null, commitmentEvidence: "", receiptEvidence: "" });
  const focus = chooseTodayFocus(null, null, [], now, [], [], [], [], [], [], [], [], [recorded], []);
  assert.equal(focus.entityType, "funding-outcome");
  assert.equal(focus.urgency, "soon");
  assert.match(focus.title, /committed capital/i);

  const blockers = projectCapitalBlockers({
    profile: null, goal: null, remainingGapCents: 100_000_000, committedNotReceivedCents: 30_000_000,
    actions: [], opportunities: [], investors: [], followUps: [], meetings: [], applications: [], dueDiligenceRequests: [], termSheets: [], closingConditions: [], outcomes: [recorded], now,
  });
  const blocker = blockers.find((item) => item.entityType === "funding-outcome");
  assert.equal(blocker?.severity, "high");
  assert.match(blocker?.title ?? "", /commitment evidence/i);
});
