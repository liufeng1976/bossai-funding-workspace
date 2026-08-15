import type { CapitalStrategy, CompanyProfile, FundingGoal, StrategyAllocation } from "./types.ts";

function clampMoney(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value);
}

function daysUntil(date: string | null, now: Date): number | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.ceil((parsed.getTime() - now.getTime()) / 86_400_000);
}

function allocation(
  track: StrategyAllocation["track"],
  amountCents: number,
  totalNeedCents: number,
  reason: string,
  primaryRisk: string,
  order: number,
): StrategyAllocation {
  return {
    track,
    amountCents: clampMoney(amountCents),
    sharePct: totalNeedCents > 0 ? Math.round((amountCents / totalNeedCents) * 10_000) / 100 : 0,
    reason,
    primaryRisk,
    order,
  };
}

export function calculateCapitalStrategy(
  profile: CompanyProfile | null,
  goal: FundingGoal,
  now = new Date(),
): CapitalStrategy {
  const totalNeedCents = clampMoney(goal.targetAmountCents || profile?.targetFundingCents || 0);
  const timingDays = daysUntil(goal.needByDate ?? profile?.targetFundingDate ?? null, now);
  const assumptions: string[] = [];
  const warnings: string[] = [];

  if (totalNeedCents === 0) {
    warnings.push("Set a funding target before using the capital mix as a decision input.");
  }

  const innovationSignal = Boolean(
    profile &&
      (profile.stage === "early-revenue" || profile.stage === "growth" || profile.product.trim().length > 20),
  );

  let grantShare = innovationSignal ? 0.2 : 0.1;
  if (timingDays !== null && timingDays < 60) {
    grantShare = Math.min(grantShare, 0.05);
    warnings.push("The need-by date is close; non-dilutive programs may not move quickly enough to carry the plan.");
  }

  const grantAmount = clampMoney(totalNeedCents * grantShare);
  assumptions.push(
    innovationSignal
      ? "A meaningful non-dilutive allocation is reserved because the company profile suggests grant or policy-funding eligibility may be worth testing."
      : "A smaller non-dilutive allocation is reserved until eligibility is validated against real programs.",
  );

  const debtCapacityProxy = clampMoney(goal.maxMonthlyDebtServiceCents * 24);
  const debtShareCap = goal.acceptsDilution ? 0.3 : 0.55;
  const debtAmount = Math.min(
    clampMoney(totalNeedCents * debtShareCap),
    debtCapacityProxy,
    Math.max(0, totalNeedCents - grantAmount),
  );

  if (goal.maxMonthlyDebtServiceCents <= 0) {
    warnings.push("No monthly debt-service capacity is recorded, so the strategy does not rely on debt.");
  } else {
    assumptions.push(
      "Debt capacity uses a conservative planning proxy based on the owner's stated maximum monthly debt-service capacity; lender underwriting may produce a different result.",
    );
  }

  const remainingAfterGrantDebt = Math.max(0, totalNeedCents - grantAmount - debtAmount);
  const equityAmount = goal.acceptsDilution ? remainingAfterGrantDebt : 0;
  const unfundedResidualCents = goal.acceptsDilution ? 0 : remainingAfterGrantDebt;

  if (!goal.acceptsDilution && unfundedResidualCents > 0) {
    warnings.push(
      "The current non-dilution constraint leaves part of the capital need unfunded. Increase repayment capacity, extend timing, reduce the target, or reconsider equity.",
    );
  }

  const allocations = [
    allocation(
      "grant",
      grantAmount,
      totalNeedCents,
      "Pursue non-dilutive capital first where eligibility and timing are credible, because it preserves ownership and can reduce the amount that must be borrowed or raised.",
      "Program eligibility, restricted use of funds, reimbursement structures, and slow award cycles can make this capital uncertain or late.",
      1,
    ),
    allocation(
      "debt",
      debtAmount,
      totalNeedCents,
      "Use debt only inside the repayment capacity explicitly recorded by the owner so financing does not quietly create a cash-flow problem.",
      "Interest, fees, covenants, collateral, guarantees, and lender underwriting can materially change the true cost and availability.",
      2,
    ),
    allocation(
      "equity",
      equityAmount,
      totalNeedCents,
      goal.acceptsDilution
        ? "Use equity for the residual growth capital that is not realistically covered by grants or prudent debt capacity."
        : "Equity is currently excluded because the owner does not accept dilution.",
      "Equity changes ownership and governance. Valuation, control provisions, liquidation terms, and legal documents require specialist review.",
      3,
    ),
  ];

  return {
    id: null,
    totalNeedCents,
    allocations,
    unfundedResidualCents,
    assumptions,
    warnings,
    generatedAt: now.toISOString(),
  };
}
