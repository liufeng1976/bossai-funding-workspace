import test from "node:test";
import assert from "node:assert/strict";
import { projectCapitalBlockers } from "../src/domain/blockers.ts";
import { chooseTodayFocus } from "../src/domain/focus.ts";
import { projectCapitalTimingPlan } from "../src/domain/timing.ts";
import { parseClosingCondition, RequestValidationError } from "../src/server/validation.ts";
import type { ClosingCondition, FundingOutcome, Investor, TermSheet } from "../src/domain/types.ts";

const now = new Date("2026-08-16T12:00:00.000Z");
const stamp = now.toISOString();

function investor(): Investor {
  return {
    id: 1, name: "Atlas Ventures", fundId: null, roundId: null, stage: "term-sheet", priority: "high", relationship: "warm",
    warmIntroSource: "Founder", chequeMinCents: 20_000_000, chequeMaxCents: 50_000_000, geography: "USA", sectors: "industrial",
    stages: "growth", portfolio: "", lastContactDate: "2026-08-12", nextFollowUpDate: null, nextAction: "Advance closing", owner: "Owner",
    notes: "", rejectionReason: "", createdAt: stamp, updatedAt: stamp,
  };
}

function termSheet(): TermSheet {
  return {
    id: 10, investorId: 1, roundId: null, investmentAmountCents: 50_000_000, preMoneyValuationCents: 450_000_000, equityPct: null,
    liquidationPreference: "1x non-participating", boardSeat: "Observer", proRata: "Standard", vesting: "", optionPool: "10%",
    exclusivity: "30 days", closingConditions: "Execute definitive documents", targetCloseDate: "2026-08-25", status: "accepted", notes: "",
    createdAt: stamp, updatedAt: stamp,
  };
}

function condition(overrides: Partial<ClosingCondition> = {}): ClosingCondition {
  return {
    id: 100, termSheetId: 10, title: "Execute definitive documents", owner: "Founder", dueDate: "2026-08-15", status: "in-progress",
    evidenceNote: "", createdAt: stamp, updatedAt: stamp, ...overrides,
  };
}

function outcome(): FundingOutcome {
  return {
    id: 1, track: "equity", applicationId: null, investorId: 1, roundId: null, status: "closed", approvedAmountCents: 50_000_000,
    committedAmountCents: 50_000_000, receivedAmountCents: 50_000_000, receivedDate: "2026-08-16", commitmentEvidence: "Signed closing documents", receiptEvidence: "Bank receipt reference", conditions: "Closed",
    lossReason: "", feedback: "", retryDate: null, createdAt: stamp, updatedAt: stamp,
  };
}

test("overdue closing condition outranks its accepted term sheet in Today's Focus", () => {
  const focus = chooseTodayFocus(null, null, [], now, [investor()], [], [], [], [], [], [], [termSheet()], [], [condition()]);
  assert.equal(focus.entityType, "closing-condition");
  assert.equal(focus.entityId, 100);
  assert.equal(focus.workOwner, "Founder");
  assert.equal(focus.workDueAt, "2026-08-15");
  assert.equal(focus.urgency, "urgent");
  assert.match(focus.reason, /overdue/i);
});

test("closing condition becomes an exact critical capital blocker when overdue", () => {
  const blockers = projectCapitalBlockers({
    profile: null, goal: null, remainingGapCents: 100_000_000, committedNotReceivedCents: 0, actions: [], opportunities: [],
    investors: [investor()], followUps: [], meetings: [], applications: [], dueDiligenceRequests: [], termSheets: [termSheet()],
    closingConditions: [condition()], outcomes: [], now,
  });
  const blocker = blockers.find((item) => item.entityType === "closing-condition" && item.entityId === 100);
  assert.ok(blocker);
  assert.equal(blocker.severity, "critical");
  assert.match(blocker.nextStep, /evidence note/i);
});

test("closing conditions appear as dated or undated timing work", () => {
  const dated = projectCapitalTimingPlan({
    profile: null, goal: null, rounds: [], actions: [], opportunities: [], investors: [investor()], followUps: [], meetings: [], applications: [],
    dueDiligenceRequests: [], termSheets: [termSheet()], closingConditions: [condition()], outcomes: [], cashCovered: false, now,
  });
  assert.equal(dated.milestones.some((item) => item.kind === "closing-condition" && item.entityId === 100 && item.status === "overdue"), true);

  const undated = projectCapitalTimingPlan({
    profile: null, goal: null, rounds: [], actions: [], opportunities: [], investors: [investor()], followUps: [], meetings: [], applications: [],
    dueDiligenceRequests: [], termSheets: [termSheet()], closingConditions: [condition({ dueDate: null })], outcomes: [], cashCovered: false, now,
  });
  assert.equal(undated.undatedItems.some((item) => item.entityType === "closing-condition" && item.entityId === 100), true);
});

test("satisfied or waived closing condition requires evidence", () => {
  assert.throws(
    () => parseClosingCondition({ termSheetId: 10, title: "Execute documents", owner: "Owner", dueDate: null, status: "satisfied", evidenceNote: "" }),
    (error) => error instanceof RequestValidationError && error.field === "evidenceNote",
  );
  const parsed = parseClosingCondition({ termSheetId: 10, title: "Execute documents", owner: "Owner", dueDate: null, status: "satisfied", evidenceNote: "Signed SPA stored in counsel folder." });
  assert.equal(parsed.status, "satisfied");
  assert.match(parsed.evidenceNote, /Signed SPA/);
});

test("Funding Outcome resolves closing-condition focus, blocker and timing without deleting history", () => {
  const focus = chooseTodayFocus(null, null, [], now, [investor()], [], [], [], [], [], [], [termSheet()], [outcome()], [condition()]);
  assert.notEqual(focus.entityType, "closing-condition");

  const blockers = projectCapitalBlockers({
    profile: null, goal: null, remainingGapCents: 100_000_000, committedNotReceivedCents: 0, actions: [], opportunities: [],
    investors: [investor()], followUps: [], meetings: [], applications: [], dueDiligenceRequests: [], termSheets: [termSheet()],
    closingConditions: [condition()], outcomes: [outcome()], now,
  });
  assert.equal(blockers.some((item) => item.entityType === "closing-condition"), false);

  const timing = projectCapitalTimingPlan({
    profile: null, goal: null, rounds: [], actions: [], opportunities: [], investors: [investor()], followUps: [], meetings: [], applications: [],
    dueDiligenceRequests: [], termSheets: [termSheet()], closingConditions: [condition()], outcomes: [outcome()], cashCovered: false, now,
  });
  assert.equal(timing.milestones.some((item) => item.entityType === "closing-condition"), false);
});
