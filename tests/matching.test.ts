import test from "node:test";
import assert from "node:assert/strict";
import { calculateFundingReadiness, evaluateOpportunity } from "../src/domain/matching.ts";
import { chooseTodayFocus } from "../src/domain/focus.ts";
import type { CompanyProfile, FundingGoal, FundingOpportunity, Investor, OpportunityMatch } from "../src/domain/types.ts";

function datePlus(days: number): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const profile: CompanyProfile = {
  id: 1,
  name: "Harbor Systems",
  industry: "B2B software",
  stage: "seed",
  geography: "California, USA",
  foundedYear: 2024,
  annualRevenueCents: 120_000_000,
  mrrCents: 10_000_000,
  arrCents: 120_000_000,
  growthRatePct: 75,
  grossMarginPct: 80,
  cashBalanceCents: 80_000_000,
  monthlyBurnCents: 4_000_000,
  runwayMonths: 20,
  teamSize: 14,
  product: "Workflow software for industrial operations",
  businessModel: "B2B SaaS subscription",
  fundingHistory: "Bootstrapped",
  existingDebtCents: 0,
  capTableSummary: "Founders 100%",
  useOfFunds: "Product, sales and working capital",
  targetFundingCents: 100_000_000,
  targetFundingDate: datePlus(180),
  updatedAt: new Date().toISOString(),
};

const goal: FundingGoal = {
  id: 1,
  targetAmountCents: 100_000_000,
  needByDate: datePlus(180),
  purpose: "Product and commercial expansion",
  acceptsDilution: true,
  maxMonthlyDebtServiceCents: 2_000_000,
  growthPlan: "Expand enterprise sales",
  updatedAt: new Date().toISOString(),
};

function opportunity(overrides: Partial<FundingOpportunity> = {}): FundingOpportunity {
  return {
    id: 1,
    type: "grant",
    title: "California Industrial Software Innovation Grant",
    provider: "State program",
    sourceUrl: "https://example.invalid/grant",
    description: "Supports software commercialization in California.",
    geography: "USA, California",
    sectors: "B2B software, industrial software",
    stages: "seed, growth",
    amountMinCents: 10_000_000,
    amountMaxCents: 30_000_000,
    deadline: datePlus(45),
    decision: "saved",
    grantProgramType: "Innovation",
    grantEligibility: "California operating company with commercial software product.",
    matchFundingRequiredCents: 20_000_000,
    loanTermMonths: null,
    annualInterestRatePct: null,
    loanFeesCents: 0,
    minimumDscr: null,
    collateralRequired: false,
    personalGuaranteeRequired: false,
    investorId: null,
    fundId: null,
    investorType: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("grant matching is explainable and can produce strong fit without hiding partial checks", () => {
  const result = evaluateOpportunity(profile, goal, opportunity());
  assert.equal(result.fit, "strong");
  assert.ok(result.score >= 70);
  assert.equal(result.rules.some((item) => item.key === "geography" && item.outcome === "match"), true);
  assert.equal(result.rules.some((item) => item.key === "sector" && item.outcome === "match"), true);
  assert.equal(result.rules.some((item) => item.key === "grant-eligibility" && item.outcome === "partial"), true);
  assert.ok(result.rules.every((item) => item.explanation.length > 0));
});

test("loan matching exposes repayment and DSCR mismatches rather than returning only a score", () => {
  const loan = opportunity({
    id: 2,
    type: "loan",
    title: "Short-term working capital loan",
    amountMinCents: 80_000_000,
    amountMaxCents: 100_000_000,
    grantProgramType: "",
    grantEligibility: "",
    matchFundingRequiredCents: 0,
    loanTermMonths: 12,
    annualInterestRatePct: 18,
    loanFeesCents: 5_000_000,
    minimumDscr: 2,
    collateralRequired: true,
    personalGuaranteeRequired: true,
  });
  const result = evaluateOpportunity(profile, goal, loan);
  const debtRule = result.rules.find((item) => item.key === "debt-service");
  assert.equal(debtRule?.outcome, "mismatch");
  assert.match(debtRule?.correctiveAction ?? "", /smaller principal|longer term|lower rate/i);
  assert.ok(result.blockers.length >= 1);
  assert.notEqual(result.fit, "strong");
});

test("funding readiness reports concrete missing facts and reaches ready only with the full Phase 1 profile", () => {
  const ready = calculateFundingReadiness(profile, goal);
  assert.equal(ready.status, "ready");
  assert.equal(ready.completionPct, 100);
  const incomplete = calculateFundingReadiness({ ...profile, capTableSummary: "", fundingHistory: "", cashBalanceCents: 0 }, goal);
  assert.equal(incomplete.status, "needs-work");
  assert.ok(incomplete.completionPct < 100);
  assert.ok(incomplete.missingFacts.includes("Ownership and financing history"));
});

test("a strong saved opportunity outranks an undated early investor target in Today's Focus", () => {
  const saved = opportunity();
  const match: OpportunityMatch = evaluateOpportunity(profile, goal, saved);
  const investor: Investor = {
    id: 9,
    name: "Early Target",
    fundId: null,
    roundId: null,
    stage: "research",
    priority: "medium",
    relationship: "cold",
    warmIntroSource: "",
    chequeMinCents: 10_000_000,
    chequeMaxCents: 20_000_000,
    geography: "USA",
    sectors: "B2B software",
    stages: "seed",
    portfolio: "",
    lastContactDate: null,
    nextFollowUpDate: null,
    nextAction: "Research the partner and portfolio.",
    owner: "Owner",
    notes: "",
    rejectionReason: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const focus = chooseTodayFocus(profile, goal, [], new Date(), [investor], [], [], [saved], [match]);
  assert.equal(focus.title, saved.title);
  assert.equal(focus.destination, "opportunities");
});
