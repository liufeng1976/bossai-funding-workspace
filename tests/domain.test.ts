import test from "node:test";
import assert from "node:assert/strict";
import { calculateCapitalStrategy } from "../src/domain/strategy.ts";
import { chooseTodayFocus } from "../src/domain/focus.ts";
import { projectDashboard } from "../src/domain/dashboard.ts";
import type { CompanyProfile, FundingAction, FundingGoal, FundraisingRound } from "../src/domain/types.ts";

const now = new Date("2026-08-15T12:00:00.000Z");

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
  product: "Automation hardware and workflow software for mid-market manufacturers.",
  businessModel: "Hardware sale plus recurring software subscription.",
  fundingHistory: "Founder funded and one seed note.",
  existingDebtCents: 5_000_000,
  capTableSummary: "Founders 82%, seed note 18% as-converted estimate.",
  useOfFunds: "Inventory, sales hires and product certification.",
  targetFundingCents: 100_000_000,
  targetFundingDate: "2027-02-01",
  updatedAt: now.toISOString(),
};

const goal: FundingGoal = {
  id: 1,
  targetAmountCents: 100_000_000,
  needByDate: "2027-02-01",
  purpose: "Fund inventory, sales capacity and certification.",
  acceptsDilution: true,
  maxMonthlyDebtServiceCents: 1_500_000,
  growthPlan: "Expand into two manufacturing regions.",
  updatedAt: now.toISOString(),
};

test("capital strategy produces an explainable three-track mix that reconciles to the need", () => {
  const strategy = calculateCapitalStrategy(profile, goal, now);
  assert.equal(strategy.allocations.length, 3);
  assert.equal(strategy.allocations.reduce((sum, item) => sum + item.amountCents, 0), goal.targetAmountCents);
  assert.equal(strategy.unfundedResidualCents, 0);
  assert.ok(strategy.allocations.every((item) => item.reason.length > 20));
  assert.ok(strategy.allocations.every((item) => item.primaryRisk.length > 20));
  assert.equal(strategy.allocations.find((item) => item.track === "grant")?.amountCents, 20_000_000);
});

test("no-dilution constraint exposes an unfunded residual instead of hiding it", () => {
  const constrained: FundingGoal = { ...goal, acceptsDilution: false, maxMonthlyDebtServiceCents: 500_000 };
  const strategy = calculateCapitalStrategy(profile, constrained, now);
  assert.equal(strategy.allocations.find((item) => item.track === "equity")?.amountCents, 0);
  assert.ok(strategy.unfundedResidualCents > 0);
  assert.ok(strategy.warnings.some((warning) => warning.includes("unfunded")));
});

test("Today's Focus prioritizes a near-deadline financing action", () => {
  const actions: FundingAction[] = [
    {
      id: 1,
      track: "equity",
      title: "Follow up with Atlas Ventures",
      amountCents: 50_000_000,
      stage: "contacted",
      priority: "high",
      deadline: "2026-08-25",
      nextStep: "Send the requested cohort metrics.",
      owner: "Owner",
      result: "",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 2,
      track: "grant",
      title: "Submit manufacturing innovation grant",
      amountCents: 20_000_000,
      stage: "prepare",
      priority: "high",
      deadline: "2026-08-17",
      nextStep: "Upload the budget and sign the application.",
      owner: "Owner",
      result: "",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];

  const focus = chooseTodayFocus(profile, goal, actions, now);
  assert.equal(focus.actionId, 2);
  assert.equal(focus.urgency, "urgent");
  assert.match(focus.reason, /due in/);
});

test("dashboard keeps committed and received capital separate and computes remaining gap", () => {
  const rounds: FundraisingRound[] = [
    {
      id: 1,
      roundName: "Seed Round",
      roundType: "Seed",
      targetAmountCents: 100_000_000,
      minimumAmountCents: 50_000_000,
      committedAmountCents: 40_000_000,
      receivedAmountCents: 15_000_000,
      preMoneyValuationCents: 400_000_000,
      postMoneyValuationCents: 500_000_000,
      targetCloseDate: "2026-12-01",
      status: "active",
      useOfFunds: "Inventory and growth.",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];

  const dashboard = projectDashboard(profile, goal, rounds, [], now);
  assert.equal(dashboard.receivedAmountCents, 15_000_000);
  assert.equal(dashboard.committedAmountCents, 25_000_000);
  assert.equal(dashboard.remainingGapCents, 60_000_000);
  assert.equal(dashboard.tracks.length, 3);
});
