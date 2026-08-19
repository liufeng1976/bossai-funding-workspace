import test from "node:test";
import assert from "node:assert/strict";
import { calculateCapitalStrategy } from "../src/domain/strategy.ts";
import { capitalStrategyMatchesCurrentFacts, projectCapitalStrategyFreshness } from "../src/domain/strategy-freshness.ts";
import type { CompanyProfile, FundingGoal } from "../src/domain/types.ts";

const initialNow = new Date("2026-08-16T09:40:00.000Z");

function profile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    id: 1, name: "Northstar Robotics", industry: "Industrial automation", stage: "growth", geography: "USA", foundedYear: 2022,
    annualRevenueCents: 180_000_000, mrrCents: 15_000_000, arrCents: 180_000_000, growthRatePct: 60, grossMarginPct: 58,
    cashBalanceCents: 45_000_000, monthlyBurnCents: 12_000_000, runwayMonths: 3, teamSize: 18,
    product: "Automation hardware and workflow software for manufacturers.", businessModel: "Recurring software and hardware",
    fundingHistory: "Founder funded", existingDebtCents: 0, capTableSummary: "Founders 100%", useOfFunds: "Inventory and growth",
    targetFundingCents: 100_000_000, targetFundingDate: "2026-12-31", updatedAt: initialNow.toISOString(), ...overrides,
  };
}

function goal(overrides: Partial<FundingGoal> = {}): FundingGoal {
  return {
    id: 1, targetAmountCents: 100_000_000, needByDate: "2026-12-31", purpose: "Inventory", acceptsDilution: true,
    maxMonthlyDebtServiceCents: 1_500_000, growthPlan: "Growth", updatedAt: initialNow.toISOString(), ...overrides,
  };
}

test("strategy freshness is not-created before the first calculation", () => {
  const freshness = projectCapitalStrategyFreshness(profile(), goal(), null, initialNow);
  assert.equal(freshness.state, "not-created");
  assert.equal(freshness.generatedAt, null);
  assert.equal(freshness.currentNeedCents, 100_000_000);
});

test("freshly calculated strategy matches the current saved facts", () => {
  const currentProfile = profile();
  const currentGoal = goal();
  const strategy = calculateCapitalStrategy(currentProfile, currentGoal, initialNow);
  const freshness = projectCapitalStrategyFreshness(currentProfile, currentGoal, strategy, initialNow);
  assert.equal(freshness.state, "current");
  assert.equal(capitalStrategyMatchesCurrentFacts(currentProfile, currentGoal, strategy, initialNow), true);
});

test("changing funding amount or dilution constraint makes an old strategy stale", () => {
  const currentProfile = profile();
  const originalGoal = goal();
  const strategy = calculateCapitalStrategy(currentProfile, originalGoal, initialNow);
  const changedGoal = goal({ targetAmountCents: 150_000_000, acceptsDilution: false, maxMonthlyDebtServiceCents: 500_000 });
  const freshness = projectCapitalStrategyFreshness(currentProfile, changedGoal, strategy, initialNow);
  assert.equal(freshness.state, "recalculate");
  assert.equal(freshness.currentNeedCents, 150_000_000);
  assert.match(freshness.reason, /no longer matches/i);
});

test("changing company facts that drive grant allocation makes an old strategy stale", () => {
  const originalProfile = profile();
  const currentGoal = goal();
  const strategy = calculateCapitalStrategy(originalProfile, currentGoal, initialNow);
  const changedProfile = profile({ stage: "mature", product: "Widget" });
  const freshness = projectCapitalStrategyFreshness(changedProfile, currentGoal, strategy, initialNow);
  assert.equal(freshness.state, "recalculate");
  assert.equal(strategy.allocations.find((item) => item.track === "grant")?.amountCents, 20_000_000);
  assert.equal(calculateCapitalStrategy(changedProfile, currentGoal, initialNow).allocations.find((item) => item.track === "grant")?.amountCents, 10_000_000);
});

test("passage of time across the under-60-day rule can make a stored strategy stale without any data mutation", () => {
  const currentProfile = profile({ targetFundingDate: "2026-11-15" });
  const currentGoal = goal({ needByDate: "2026-11-15" });
  const strategy = calculateCapitalStrategy(currentProfile, currentGoal, initialNow);
  const later = new Date("2026-10-01T09:40:00.000Z");
  assert.equal(strategy.allocations.find((item) => item.track === "grant")?.amountCents, 20_000_000);
  const freshness = projectCapitalStrategyFreshness(currentProfile, currentGoal, strategy, later);
  assert.equal(freshness.state, "recalculate");
  assert.equal(calculateCapitalStrategy(currentProfile, currentGoal, later).allocations.find((item) => item.track === "grant")?.amountCents, 5_000_000);
});

test("stored strategy with no current funding goal is explicitly unusable", () => {
  const strategy = calculateCapitalStrategy(profile(), goal(), initialNow);
  const freshness = projectCapitalStrategyFreshness(profile(), null, strategy, initialNow);
  assert.equal(freshness.state, "no-goal");
  assert.equal(freshness.autoSyncEligible, false);
  assert.match(freshness.reason, /do not use/i);
});
