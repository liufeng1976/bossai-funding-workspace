import { calculateCapitalStrategy } from "./strategy.ts";
import type { CapitalStrategy, CapitalStrategyFreshness, CompanyProfile, FundingGoal } from "./types.ts";

function comparable(strategy: CapitalStrategy): unknown {
  return {
    totalNeedCents: strategy.totalNeedCents,
    allocations: strategy.allocations,
    unfundedResidualCents: strategy.unfundedResidualCents,
    assumptions: strategy.assumptions,
    warnings: strategy.warnings,
  };
}

export function capitalStrategyMatchesCurrentFacts(
  profile: CompanyProfile | null,
  goal: FundingGoal | null,
  strategy: CapitalStrategy | null,
  now = new Date(),
): boolean {
  if (!strategy || !goal) return false;
  const current = calculateCapitalStrategy(profile, goal, now);
  return JSON.stringify(comparable(strategy)) === JSON.stringify(comparable(current));
}

export function projectCapitalStrategyFreshness(
  profile: CompanyProfile | null,
  goal: FundingGoal | null,
  strategy: CapitalStrategy | null,
  now = new Date(),
): CapitalStrategyFreshness {
  if (!strategy) {
    return {
      state: "not-created",
      reason: goal
        ? "No capital strategy has been calculated yet."
        : "Set the funding goal before calculating a capital strategy.",
      generatedAt: null,
      currentNeedCents: Math.max(0, goal?.targetAmountCents ?? profile?.targetFundingCents ?? 0),
      autoSyncEligible: false,
    };
  }

  if (!goal) {
    return {
      state: "no-goal",
      reason: "A stored capital strategy exists, but the current funding goal is missing. Do not use the stored allocation as a current decision input.",
      generatedAt: strategy.generatedAt,
      currentNeedCents: Math.max(0, profile?.targetFundingCents ?? 0),
      autoSyncEligible: false,
    };
  }

  const matches = capitalStrategyMatchesCurrentFacts(profile, goal, strategy, now);
  return {
    state: matches ? "current" : "recalculate",
    reason: matches
      ? "Capital strategy matches the current saved company facts, funding goal, constraints and timing rules."
      : "Capital strategy no longer matches the current saved company facts, funding goal, constraints or timing rules. Recalculate before using the allocation as a decision input.",
    generatedAt: strategy.generatedAt,
    currentNeedCents: Math.max(0, goal.targetAmountCents || profile?.targetFundingCents || 0),
    autoSyncEligible: true,
  };
}
