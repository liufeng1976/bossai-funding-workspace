import test from "node:test";
import assert from "node:assert/strict";
import { projectCapitalBlockers } from "../src/domain/blockers.ts";
import type {
  CompanyProfile,
  FundingApplication,
  FundingGoal,
  FundingOpportunity,
  Investor,
  TermSheet,
} from "../src/domain/types.ts";

const now = new Date("2026-08-16T12:00:00.000Z");

const profile: CompanyProfile = {
  id: 1,
  name: "Northstar Robotics",
  industry: "Industrial automation",
  stage: "growth",
  geography: "California, USA",
  foundedYear: 2022,
  annualRevenueCents: 180_000_000,
  mrrCents: 15_000_000,
  arrCents: 180_000_000,
  growthRatePct: 62,
  grossMarginPct: 58,
  cashBalanceCents: 45_000_000,
  monthlyBurnCents: 12_000_000,
  runwayMonths: 3.75,
  teamSize: 18,
  product: "Automation software and hardware.",
  businessModel: "Recurring software plus hardware.",
  fundingHistory: "Founder funded.",
  existingDebtCents: 0,
  capTableSummary: "Founders 100%.",
  useOfFunds: "Inventory and growth.",
  targetFundingCents: 100_000_000,
  targetFundingDate: "2027-02-01",
  updatedAt: now.toISOString(),
};

const goal: FundingGoal = {
  id: 1,
  targetAmountCents: 100_000_000,
  needByDate: "2027-02-01",
  purpose: "Inventory and growth.",
  acceptsDilution: true,
  maxMonthlyDebtServiceCents: 1_500_000,
  growthPlan: "Expand manufacturing customers.",
  updatedAt: now.toISOString(),
};

const opportunity: FundingOpportunity = {
  id: 7,
  type: "grant",
  title: "Manufacturing Innovation Grant",
  provider: "Public Agency",
  sourceUrl: "https://example.invalid/grant",
  description: "Grant for manufacturing innovation.",
  geography: "California",
  sectors: "manufacturing",
  stages: "growth",
  amountMinCents: 10_000_000,
  amountMaxCents: 30_000_000,
  deadline: "2026-10-01",
  decision: "saved",
  grantProgramType: "Grant",
  grantEligibility: "Small businesses",
  matchFundingRequiredCents: 0,
  loanTermMonths: null,
  annualInterestRatePct: null,
  loanFeesCents: 0,
  minimumDscr: null,
  collateralRequired: false,
  personalGuaranteeRequired: false,
  investorId: null,
  fundId: null,
  investorType: "",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

const investor: Investor = {
  id: 9,
  name: "Atlas Ventures",
  fundId: null,
  roundId: null,
  stage: "term-sheet",
  priority: "high",
  relationship: "warm",
  warmIntroSource: "Customer CEO",
  chequeMinCents: 25_000_000,
  chequeMaxCents: 75_000_000,
  geography: "USA",
  sectors: "industrial automation",
  stages: "growth",
  portfolio: "",
  lastContactDate: "2026-08-15",
  nextFollowUpDate: null,
  nextAction: "Review term sheet",
  owner: "Owner",
  notes: "",
  rejectionReason: "",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

const termSheet: TermSheet = {
  id: 17,
  investorId: investor.id,
  roundId: null,
  investmentAmountCents: 50_000_000,
  preMoneyValuationCents: 450_000_000,
  equityPct: null,
  liquidationPreference: "1x non-participating",
  boardSeat: "Observer",
  proRata: "Standard pro-rata",
  vesting: "",
  optionPool: "10% pre-money",
  exclusivity: "30-day no-shop",
  closingConditions: "Diligence and definitive documents",
  targetCloseDate: null,
  status: "reviewing",
  notes: "",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

function baseInput() {
  return {
    profile,
    goal,
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
    now,
  };
}

test("capital blockers explain an empty financing pipeline instead of returning a blank dashboard", () => {
  const blockers = projectCapitalBlockers(baseInput());
  assert.equal(blockers[0]?.key, "no-capital-source");
  assert.equal(blockers[0]?.severity, "high");
  assert.equal(blockers[0]?.destination, "opportunities");
});

test("a selected opportunity without execution is an exact blocker", () => {
  const blockers = projectCapitalBlockers({ ...baseInput(), opportunities: [opportunity] });
  const blocker = blockers.find((item) => item.key === "decision-without-execution");
  assert.ok(blocker);
  assert.equal(blocker.entityType, "opportunity");
  assert.equal(blocker.entityId, opportunity.id);
  assert.equal(blocker.destination, "opportunities");
});

test("an overdue financing application outranks an active term sheet blocker", () => {
  const application: FundingApplication = {
    id: 20,
    opportunityId: opportunity.id,
    track: "grant",
    title: "Manufacturing Innovation Grant Application",
    requestedAmountCents: 30_000_000,
    approvedAmountCents: 0,
    status: "preparing",
    deadline: "2026-08-15",
    submittedDate: null,
    decisionDate: null,
    owner: "Owner",
    nextAction: "Call the program officer and confirm late-submission recovery.",
    rejectionReason: "",
    notes: "",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const blockers = projectCapitalBlockers({
    ...baseInput(),
    opportunities: [opportunity],
    investors: [investor],
    applications: [application],
    termSheets: [termSheet],
  });
  assert.equal(blockers[0]?.key, `overdue-application-${application.id}`);
  assert.equal(blockers[0]?.severity, "critical");
  assert.equal(blockers[0]?.entityType, "funding-application");
  assert.ok(blockers.some((item) => item.key === `active-term-sheet-${termSheet.id}`));
});

test("active term sheet explains why equity capital is not closed without inventing receipt", () => {
  const blockers = projectCapitalBlockers({ ...baseInput(), investors: [investor], termSheets: [termSheet] });
  const blocker = blockers.find((item) => item.key === `active-term-sheet-${termSheet.id}`);
  assert.ok(blocker);
  assert.equal(blocker.severity, "high");
  assert.equal(blocker.entityType, "term-sheet");
  assert.equal(blocker.entityId, termSheet.id);
  assert.match(blocker.reason, /not been recorded/i);
  assert.match(blocker.nextStep, /counsel/i);
});

test("accepted term sheet remains a closing blocker until capital is actually recorded", () => {
  const blockers = projectCapitalBlockers({ ...baseInput(), investors: [investor], termSheets: [{ ...termSheet, status: "accepted" }] });
  const blocker = blockers.find((item) => item.key === `active-term-sheet-${termSheet.id}`);
  assert.ok(blocker);
  assert.match(blocker.reason, /term sheet is accepted/i);
  assert.match(blocker.nextStep, /closing conditions/i);
  assert.match(blocker.nextStep, /committed or received capital/i);
});

test("committed but not received capital is surfaced as a closing blocker", () => {
  const blockers = projectCapitalBlockers({ ...baseInput(), committedNotReceivedCents: 25_000_000 });
  assert.ok(blockers.some((item) => item.key === "committed-not-received"));
});

test("no blocker is invented after the recorded funding target is fully covered", () => {
  const blockers = projectCapitalBlockers({ ...baseInput(), remainingGapCents: 0 });
  assert.deepEqual(blockers, []);
});
