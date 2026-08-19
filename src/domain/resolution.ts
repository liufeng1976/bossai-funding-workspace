import type { FundingApplication, FundingOutcome } from "./types.ts";

export interface FundingOutcomeResolution {
  resolvedApplicationIds: Set<number>;
  resolvedInvestorIds: Set<number>;
  resolvedOpportunityIds: Set<number>;
  outcomeByApplicationId: Map<number, FundingOutcome>;
  outcomeByInvestorId: Map<number, FundingOutcome>;
}

function isLaterOutcome(candidate: FundingOutcome, current: FundingOutcome | undefined): boolean {
  if (!current) return true;
  if (candidate.updatedAt !== current.updatedAt) return candidate.updatedAt > current.updatedAt;
  return candidate.id > current.id;
}

export function projectFundingOutcomeResolution(
  applications: readonly FundingApplication[],
  outcomes: readonly FundingOutcome[],
): FundingOutcomeResolution {
  const resolvedApplicationIds = new Set<number>();
  const resolvedInvestorIds = new Set<number>();
  const resolvedOpportunityIds = new Set<number>();
  const outcomeByApplicationId = new Map<number, FundingOutcome>();
  const outcomeByInvestorId = new Map<number, FundingOutcome>();
  const applicationById = new Map(applications.map((application) => [application.id, application]));

  for (const outcome of outcomes) {
    if (outcome.applicationId) {
      resolvedApplicationIds.add(outcome.applicationId);
      const current = outcomeByApplicationId.get(outcome.applicationId);
      if (isLaterOutcome(outcome, current)) outcomeByApplicationId.set(outcome.applicationId, outcome);
      const opportunityId = applicationById.get(outcome.applicationId)?.opportunityId;
      if (opportunityId) resolvedOpportunityIds.add(opportunityId);
    }
    if (outcome.investorId) {
      resolvedInvestorIds.add(outcome.investorId);
      const current = outcomeByInvestorId.get(outcome.investorId);
      if (isLaterOutcome(outcome, current)) outcomeByInvestorId.set(outcome.investorId, outcome);
    }
  }

  return {
    resolvedApplicationIds,
    resolvedInvestorIds,
    resolvedOpportunityIds,
    outcomeByApplicationId,
    outcomeByInvestorId,
  };
}
