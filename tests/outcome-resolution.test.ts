import test from "node:test";
import assert from "node:assert/strict";
import { projectCapitalBlockers } from "../src/domain/blockers.ts";
import { summarizeEquityPipeline } from "../src/domain/equity.ts";
import { chooseTodayFocus } from "../src/domain/focus.ts";
import { projectFundingOutcomeResolution } from "../src/domain/resolution.ts";
import type {
  CompanyProfile,
  DueDiligenceRequest,
  FinancingMeeting,
  FundingApplication,
  FundingGoal,
  FundingOutcome,
  FundingOpportunity,
  Investor,
  InvestorFollowUp,
  TermSheet,
} from "../src/domain/types.ts";

const now = new Date("2026-08-16T12:00:00.000Z");
const stamp = now.toISOString();

const profile: CompanyProfile = {
  id: 1, name: "Northstar Robotics", industry: "Industrial automation", stage: "growth", geography: "California, USA",
  foundedYear: 2022, annualRevenueCents: 180_000_000, mrrCents: 15_000_000, arrCents: 180_000_000, growthRatePct: 62,
  grossMarginPct: 58, cashBalanceCents: 45_000_000, monthlyBurnCents: 12_000_000, runwayMonths: 3.75, teamSize: 18,
  product: "Automation hardware and software", businessModel: "Hardware plus subscription", fundingHistory: "Founder funded",
  existingDebtCents: 5_000_000, capTableSummary: "Founders", useOfFunds: "Inventory and growth", targetFundingCents: 100_000_000,
  targetFundingDate: "2027-02-01", updatedAt: stamp,
};

const goal: FundingGoal = {
  id: 1, targetAmountCents: 100_000_000, needByDate: "2027-02-01", purpose: "Inventory and certification", acceptsDilution: true,
  maxMonthlyDebtServiceCents: 1_500_000, growthPlan: "Expand manufacturing customers", updatedAt: stamp,
};

function application(id: number, opportunityId: number | null, title: string, deadline = "2026-08-15"): FundingApplication {
  return {
    id, opportunityId, track: "grant", title, requestedAmountCents: 30_000_000, approvedAmountCents: 0, status: "under-review",
    deadline, submittedDate: "2026-08-01", decisionDate: null, owner: "Owner", nextAction: `Advance ${title}`,
    rejectionReason: "", notes: "", createdAt: stamp, updatedAt: stamp,
  };
}

function opportunity(id: number, title: string): FundingOpportunity {
  return {
    id, type: "grant", title, provider: "Agency", sourceUrl: "https://example.invalid", description: "Program", geography: "USA",
    sectors: "manufacturing", stages: "growth", amountMinCents: 0, amountMaxCents: 30_000_000, deadline: "2026-08-20",
    decision: "pursuing", grantProgramType: "Grant", grantEligibility: "Eligible", matchFundingRequiredCents: 0, loanTermMonths: null,
    annualInterestRatePct: null, loanFeesCents: 0, minimumDscr: null, collateralRequired: false, personalGuaranteeRequired: false,
    investorId: null, fundId: null, investorType: "", createdAt: stamp, updatedAt: stamp,
  };
}

function investor(id: number, name: string, stage: Investor["stage"] = "term-sheet"): Investor {
  return {
    id, name, fundId: null, roundId: null, stage, priority: "high", relationship: "warm", warmIntroSource: "Customer CEO",
    chequeMinCents: 25_000_000, chequeMaxCents: 75_000_000, geography: "USA", sectors: "industrial automation", stages: "growth",
    portfolio: "", lastContactDate: "2026-08-15", nextFollowUpDate: "2026-08-18", nextAction: `Advance ${name}`,
    owner: "Owner", notes: "", rejectionReason: "", createdAt: stamp, updatedAt: stamp,
  };
}

function termSheet(id: number, investorId: number, status: TermSheet["status"] = "reviewing"): TermSheet {
  return {
    id, investorId, roundId: null, investmentAmountCents: 50_000_000, preMoneyValuationCents: 450_000_000, equityPct: null,
    liquidationPreference: "1x non-participating", boardSeat: "Observer", proRata: "Standard", vesting: "", optionPool: "10% pre-money",
    exclusivity: "30-day no-shop", closingConditions: "Diligence and definitive documents", targetCloseDate: null, status, notes: "",
    createdAt: stamp, updatedAt: stamp,
  };
}

function outcome(id: number, applicationId: number | null, investorId: number | null, updatedAt = stamp): FundingOutcome {
  return {
    id, track: investorId ? "equity" : "grant", applicationId, investorId, roundId: null, status: "won", approvedAmountCents: 30_000_000,
    committedAmountCents: 30_000_000, receivedAmountCents: 10_000_000, receivedDate: "2026-08-16", commitmentEvidence: "Award notice", receiptEvidence: "Bank receipt", conditions: "",
    lossReason: "", feedback: "Awarded", retryDate: null, createdAt: stamp, updatedAt,
  };
}

test("outcome resolution maps linked application, opportunity and investor and keeps the latest correction as current", () => {
  const app = application(10, 20, "Grant application");
  const older = outcome(1, app.id, 30, "2026-08-15T12:00:00.000Z");
  const newer = { ...outcome(2, app.id, 30, "2026-08-16T12:00:00.000Z"), status: "closed" as const };
  const resolution = projectFundingOutcomeResolution([app], [older, newer]);
  assert.deepEqual([...resolution.resolvedApplicationIds], [10]);
  assert.deepEqual([...resolution.resolvedOpportunityIds], [20]);
  assert.deepEqual([...resolution.resolvedInvestorIds], [30]);
  assert.equal(resolution.outcomeByApplicationId.get(10)?.id, 2);
  assert.equal(resolution.outcomeByInvestorId.get(30)?.id, 2);
});

test("resolved application and its linked opportunity cannot remain Today's Focus while an unresolved application still can", () => {
  const resolvedOpportunity = opportunity(20, "Resolved grant");
  const unresolvedOpportunity = opportunity(21, "Open grant");
  const resolvedApp = application(10, resolvedOpportunity.id, "Resolved application", "2026-08-14");
  const openApp = application(11, unresolvedOpportunity.id, "Open application", "2026-08-17");
  const focus = chooseTodayFocus(
    profile, goal, [], now, [], [], [], [resolvedOpportunity, unresolvedOpportunity], [], [resolvedApp, openApp], [], [], [outcome(1, resolvedApp.id, null)],
  );
  assert.equal(focus.entityType, "funding-application");
  assert.equal(focus.entityId, openApp.id);
  assert.match(focus.title, /Open application/);
});

test("resolved investor path stops competing for focus while another investor term sheet remains actionable", () => {
  const resolvedInvestor = investor(30, "Resolved Capital");
  const liveInvestor = { ...investor(31, "Live Capital"), nextFollowUpDate: null, nextAction: "" };
  const resolvedTerm = termSheet(40, resolvedInvestor.id, "accepted");
  const liveTerm = termSheet(41, liveInvestor.id, "reviewing");
  const followUp: InvestorFollowUp = {
    id: 50, investorId: resolvedInvestor.id, dueDate: "2026-08-15", status: "pending", channel: "email", action: "Old follow-up",
    result: "", owner: "Owner", createdAt: stamp, updatedAt: stamp,
  };
  const meeting: FinancingMeeting = {
    id: 60, investorId: resolvedInvestor.id, roundId: null, meetingAt: "2026-08-16T14:00:00.000Z", meetingType: "terms", status: "scheduled",
    attendees: "CEO", objective: "Old meeting", outcome: "", nextAction: "", createdAt: stamp, updatedAt: stamp,
  };
  const diligence: DueDiligenceRequest = {
    id: 70, investorId: resolvedInvestor.id, roundId: null, documentId: null, owner: "Owner", deadline: "2026-08-15", status: "requested",
    request: "Old diligence", responseNotes: "", createdAt: stamp, updatedAt: stamp,
  };
  const focus = chooseTodayFocus(
    profile, goal, [], now, [resolvedInvestor, liveInvestor], [followUp], [meeting], [], [], [], [diligence], [resolvedTerm, liveTerm], [outcome(1, null, resolvedInvestor.id)],
  );
  assert.equal(focus.entityType, "term-sheet");
  assert.equal(focus.entityId, liveTerm.id);
  assert.match(focus.title, /Live Capital/);
});

test("capital blockers suppress resolved application and investor execution while preserving unresolved blockers", () => {
  const resolvedInvestor = investor(30, "Resolved Capital");
  const liveInvestor = investor(31, "Live Capital", "due-diligence");
  const resolvedApp = application(10, 20, "Resolved overdue application", "2026-08-14");
  const liveApp = application(11, 21, "Live overdue application", "2026-08-14");
  const blockers = projectCapitalBlockers({
    profile, goal, remainingGapCents: 70_000_000, committedNotReceivedCents: 0, actions: [],
    opportunities: [opportunity(20, "Resolved grant"), opportunity(21, "Live grant")], investors: [resolvedInvestor, liveInvestor],
    followUps: [{ id: 50, investorId: resolvedInvestor.id, dueDate: "2026-08-14", status: "pending", channel: "email", action: "Old follow-up", result: "", owner: "Owner", createdAt: stamp, updatedAt: stamp }],
    meetings: [], applications: [resolvedApp, liveApp],
    dueDiligenceRequests: [{ id: 70, investorId: resolvedInvestor.id, roundId: null, documentId: null, owner: "Owner", deadline: "2026-08-14", status: "requested", request: "Old diligence", responseNotes: "", createdAt: stamp, updatedAt: stamp }],
    termSheets: [termSheet(40, resolvedInvestor.id, "accepted")], outcomes: [outcome(1, resolvedApp.id, resolvedInvestor.id)], now,
  });
  assert.equal(blockers.some((item) => item.entityType === "funding-application" && item.entityId === resolvedApp.id), false);
  assert.equal(blockers.some((item) => item.entityType === "investor-follow-up" && item.entityId === 50), false);
  assert.equal(blockers.some((item) => item.entityType === "due-diligence" && item.entityId === 70), false);
  assert.equal(blockers.some((item) => item.entityType === "term-sheet" && item.entityId === 40), false);
  assert.equal(blockers.some((item) => item.entityType === "funding-application" && item.entityId === liveApp.id), true);
});

test("equity summary treats outcome-linked investors as resolved rather than active pipeline", () => {
  const resolvedInvestor = investor(30, "Resolved Capital", "meeting");
  const liveInvestor = investor(31, "Live Capital", "meeting");
  const followUps: InvestorFollowUp[] = [
    { id: 50, investorId: resolvedInvestor.id, dueDate: "2026-08-17", status: "pending", channel: "email", action: "Resolved follow-up", result: "", owner: "Owner", createdAt: stamp, updatedAt: stamp },
    { id: 51, investorId: liveInvestor.id, dueDate: "2026-08-18", status: "pending", channel: "email", action: "Live follow-up", result: "", owner: "Owner", createdAt: stamp, updatedAt: stamp },
  ];
  const meetings: FinancingMeeting[] = [
    { id: 60, investorId: resolvedInvestor.id, roundId: null, meetingAt: "2026-08-17T12:00:00.000Z", meetingType: "pitch", status: "scheduled", attendees: "CEO", objective: "Resolved meeting", outcome: "", nextAction: "", createdAt: stamp, updatedAt: stamp },
    { id: 61, investorId: liveInvestor.id, roundId: null, meetingAt: "2026-08-18T12:00:00.000Z", meetingType: "pitch", status: "scheduled", attendees: "CEO", objective: "Live meeting", outcome: "", nextAction: "", createdAt: stamp, updatedAt: stamp },
  ];
  const summary = summarizeEquityPipeline([resolvedInvestor, liveInvestor], followUps, meetings, [outcome(1, null, resolvedInvestor.id)]);
  assert.equal(summary.activeInvestorCount, 1);
  assert.equal(summary.resolvedInvestorCount, 1);
  assert.equal(summary.totalPotentialCents, liveInvestor.chequeMaxCents);
  assert.equal(summary.pendingFollowUpCount, 1);
  assert.equal(summary.nextMeetingAt, "2026-08-18T12:00:00.000Z");
  assert.equal(summary.stageCounts.meeting, 1);
});
