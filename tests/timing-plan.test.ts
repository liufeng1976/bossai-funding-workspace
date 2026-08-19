import test from "node:test";
import assert from "node:assert/strict";
import { projectCapitalTimingPlan } from "../src/domain/timing.ts";
import type {
  CompanyProfile,
  DueDiligenceRequest,
  FinancingMeeting,
  FundingAction,
  FundingApplication,
  FundingGoal,
  FundingOutcome,
  FundraisingRound,
  Investor,
  InvestorFollowUp,
  TermSheet,
} from "../src/domain/types.ts";

const now = new Date("2026-08-16T09:40:00.000Z");
const stamp = "2026-08-16T08:00:00.000Z";

function profile(runwayMonths = 3, targetFundingDate: string | null = null): CompanyProfile {
  return {
    id: 1, name: "Northstar Robotics", industry: "Industrial automation", stage: "growth", geography: "USA", foundedYear: 2022,
    annualRevenueCents: 180_000_000, mrrCents: 15_000_000, arrCents: 180_000_000, growthRatePct: 60, grossMarginPct: 58,
    cashBalanceCents: 45_000_000, monthlyBurnCents: 12_000_000, runwayMonths, teamSize: 18, product: "Automation",
    businessModel: "Recurring software and hardware", fundingHistory: "Founder funded", existingDebtCents: 0, capTableSummary: "Founders 100%",
    useOfFunds: "Inventory and growth", targetFundingCents: 100_000_000, targetFundingDate, updatedAt: stamp,
  };
}

function goal(needByDate: string | null): FundingGoal {
  return { id: 1, targetAmountCents: 100_000_000, needByDate, purpose: "Inventory", acceptsDilution: true, maxMonthlyDebtServiceCents: 1_000_000, growthPlan: "Growth", updatedAt: stamp };
}

function base(overrides: Record<string, unknown> = {}) {
  return {
    profile: profile(), goal: goal("2026-12-15"), rounds: [] as FundraisingRound[], actions: [] as FundingAction[], opportunities: [], investors: [] as Investor[],
    followUps: [] as InvestorFollowUp[], meetings: [] as FinancingMeeting[], applications: [] as FundingApplication[], dueDiligenceRequests: [] as DueDiligenceRequest[],
    termSheets: [] as TermSheet[], outcomes: [] as FundingOutcome[], cashCovered: false, now, ...overrides,
  };
}

function application(id: number, deadline: string | null): FundingApplication {
  return { id, opportunityId: null, track: "grant", title: `Grant ${id}`, requestedAmountCents: 20_000_000, approvedAmountCents: 0, status: "under-review", deadline, submittedDate: "2026-08-10", decisionDate: null, owner: "Owner", nextAction: "Check decision", rejectionReason: "", notes: "", createdAt: stamp, updatedAt: stamp };
}

function investor(id: number, nextFollowUpDate: string | null): Investor {
  return { id, name: `Investor ${id}`, fundId: null, roundId: null, stage: "term-sheet", priority: "high", relationship: "warm", warmIntroSource: "Founder", chequeMinCents: 10_000_000, chequeMaxCents: 50_000_000, geography: "USA", sectors: "industrial", stages: "growth", portfolio: "", lastContactDate: "2026-08-15", nextFollowUpDate, nextAction: "Advance closing", owner: "Owner", notes: "", rejectionReason: "", createdAt: stamp, updatedAt: stamp };
}

function termSheet(id: number, investorId: number): TermSheet {
  return { id, investorId, roundId: null, investmentAmountCents: 40_000_000, preMoneyValuationCents: 400_000_000, equityPct: null, liquidationPreference: "1x", boardSeat: "Observer", proRata: "Standard", vesting: "", optionPool: "10%", exclusivity: "30 days", closingConditions: "Diligence", targetCloseDate: null, status: "accepted", notes: "", createdAt: stamp, updatedAt: stamp };
}

test("missing need-by date fails visibly instead of inventing timing health", () => {
  const plan = projectCapitalTimingPlan(base({ goal: goal(null), profile: profile(3, null) }));
  assert.equal(plan.status, "no-target-date");
  assert.equal(plan.needByDate, null);
  assert.equal(plan.daysUntilNeed, null);
  assert.match(plan.explanation, /No capital need-by date/i);
});

test("saved runway estimate ending before need-by date is surfaced as a timing warning", () => {
  const plan = projectCapitalTimingPlan(base({ profile: profile(1), goal: goal("2026-10-15") }));
  assert.equal(plan.status, "runway-before-need");
  assert.ok(plan.runwayEstimateDate);
  assert.ok(plan.runwayEstimateDate! < "2026-10-15");
  assert.match(plan.disclaimer, /does not forecast cash flows/i);
});

test("near-term funding need is distinguished from a longer dated plan", () => {
  const near = projectCapitalTimingPlan(base({ profile: profile(12), goal: goal("2026-09-05") }));
  const later = projectCapitalTimingPlan(base({ profile: profile(12), goal: goal("2026-12-15") }));
  assert.equal(near.status, "near-term");
  assert.equal(later.status, "dated");
});

test("milestone counts distinguish overdue and next-14-day financing dates", () => {
  const actions: FundingAction[] = [{ id: 1, track: "grant", title: "Overdue package", amountCents: 10_000_000, stage: "prepare", priority: "high", deadline: "2026-08-14", nextStep: "Submit", owner: "Owner", result: "", createdAt: stamp, updatedAt: stamp }];
  const applications = [application(1, "2026-08-25")];
  const plan = projectCapitalTimingPlan(base({ actions, applications }));
  assert.equal(plan.overdueMilestoneCount, 1);
  assert.equal(plan.dueNext14DaysCount, 1);
  assert.equal(plan.milestones.some((item) => item.key === "funding-action-1" && item.status === "overdue"), true);
  assert.equal(plan.milestones.some((item) => item.key === "funding-application-1" && item.status === "due-soon"), true);
});

test("active high-value work without dates is surfaced instead of silently drifting", () => {
  const target = investor(1, null);
  const applications = [application(1, null)];
  const terms = [termSheet(1, target.id)];
  const rounds: FundraisingRound[] = [{ id: 1, roundName: "Growth round", roundType: "Equity", targetAmountCents: 100_000_000, minimumAmountCents: 50_000_000, committedAmountCents: 0, receivedAmountCents: 0, preMoneyValuationCents: null, postMoneyValuationCents: null, targetCloseDate: null, status: "active", useOfFunds: "Growth", createdAt: stamp, updatedAt: stamp }];
  const plan = projectCapitalTimingPlan(base({ investors: [target], termSheets: terms, applications, rounds }));
  assert.equal(plan.undatedActiveItemCount, 3);
  assert.equal(plan.undatedItems.some((item) => item.key === "funding-application-1"), true);
  assert.equal(plan.undatedItems.some((item) => item.key === "term-sheet-1"), true);
  assert.equal(plan.undatedItems.some((item) => item.key === "round-1"), true);
});

test("Funding Outcome removes resolved application and investor timing work while preserving unrelated dates", () => {
  const resolvedInvestor = investor(1, "2026-08-20");
  const liveInvestor = investor(2, "2026-08-21");
  const applications = [application(1, "2026-08-22"), application(2, "2026-08-23")];
  const outcomes: FundingOutcome[] = [
    { id: 1, track: "grant", applicationId: 1, investorId: null, roundId: null, status: "won", approvedAmountCents: 20_000_000, committedAmountCents: 20_000_000, receivedAmountCents: 10_000_000, receivedDate: "2026-08-16", commitmentEvidence: "Award notice", receiptEvidence: "Bank receipt", conditions: "", lossReason: "", feedback: "", retryDate: null, createdAt: stamp, updatedAt: stamp },
    { id: 2, track: "equity", applicationId: null, investorId: 1, roundId: null, status: "closed", approvedAmountCents: 40_000_000, committedAmountCents: 40_000_000, receivedAmountCents: 40_000_000, receivedDate: "2026-08-16", commitmentEvidence: "Signed closing", receiptEvidence: "Bank receipt", conditions: "", lossReason: "", feedback: "", retryDate: null, createdAt: stamp, updatedAt: stamp },
  ];
  const plan = projectCapitalTimingPlan(base({ applications, investors: [resolvedInvestor, liveInvestor], outcomes }));
  assert.equal(plan.milestones.some((item) => item.key === "funding-application-1"), false);
  assert.equal(plan.milestones.some((item) => item.key === "investor-next-1"), false);
  assert.equal(plan.milestones.some((item) => item.key === "funding-application-2"), true);
  assert.equal(plan.milestones.some((item) => item.key === "investor-next-2"), true);
});

test("cash-covered target is not presented as unresolved timing risk", () => {
  const plan = projectCapitalTimingPlan(base({ cashCovered: true, goal: goal("2026-08-10") }));
  assert.equal(plan.status, "cash-covered");
  assert.match(plan.explanation, /covered by cash received/i);
});
