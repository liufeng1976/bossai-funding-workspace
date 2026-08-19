import type {
  CapitalStrategy,
  CapitalStrategyFreshness,
  CompanyProfile,
  ContinuityStatus,
  DueDiligenceRequest,
  FinancingMeeting,
  FundingAction,
  FundingApplication,
  FundingGoal,
  FundingOpportunity,
  Investor,
  OpportunityDeadlineViability,
  InvestorFollowUp,
  OwnerJourneyProgress,
  OwnerJourneyStep,
  TermSheet,
} from "./types.ts";

export function projectOwnerJourney(input: {
  profile: CompanyProfile | null;
  goal: FundingGoal | null;
  strategy: CapitalStrategy | null;
  strategyFreshness: CapitalStrategyFreshness;
  opportunities: FundingOpportunity[];
  opportunityViability: OpportunityDeadlineViability[];
  investors: Investor[];
  actions: FundingAction[];
  applications: FundingApplication[];
  followUps: InvestorFollowUp[];
  meetings: FinancingMeeting[];
  dueDiligenceRequests: DueDiligenceRequest[];
  termSheets: TermSheet[];
  continuity: ContinuityStatus;
}): OwnerJourneyProgress {
  const capitalPlanReady = Boolean(
    input.profile
      && input.goal
      && input.goal.targetAmountCents > 0
      && input.strategy
      && input.strategy.allocations.length > 0
      && input.strategyFreshness.state === "current",
  );
  const viabilityByOpportunityId = new Map(input.opportunityViability.map((item) => [item.opportunityId, item]));
  const currentOpportunities = input.opportunities.filter((item) => item.decision !== "dismissed" && viabilityByOpportunityId.get(item.id)?.deadlineViable !== false);
  const findMoneyReady = currentOpportunities.length > 0 || input.investors.length > 0;
  const decisionReady = currentOpportunities.some((item) => item.decision === "saved" || item.decision === "pursuing")
    || input.investors.some((item) => !["target", "research"].includes(item.stage));
  const executionReady = input.actions.length > 0
    || input.applications.length > 0
    || input.followUps.length > 0
    || input.meetings.length > 0
    || input.dueDiligenceRequests.length > 0
    || input.termSheets.length > 0;
  const protectionReady = input.continuity.backupAvailable && input.continuity.backupCount > 0;

  const steps: OwnerJourneyStep[] = [
    {
      key: "capital-plan",
      label: "Capital plan",
      complete: capitalPlanReady,
      reason: capitalPlanReady
        ? "Company facts, funding goal and a capital strategy matching the current saved facts are in place."
        : input.strategyFreshness.state === "recalculate"
          ? "The stored capital strategy no longer matches the current financing facts or timing rules."
          : input.strategyFreshness.state === "no-goal"
            ? "A stored capital strategy exists, but there is no current funding goal to support it."
            : "The funding target is not yet backed by a complete company profile and current capital strategy.",
      nextStep: capitalPlanReady
        ? "Review the plan when financing facts change."
        : input.strategyFreshness.state === "recalculate"
          ? "Recalculate the capital strategy before using the allocation as a current decision input."
          : "Complete company facts, set the target and calculate the capital strategy.",
      destination: "setup",
    },
    {
      key: "find-money",
      label: "Find money",
      complete: findMoneyReady,
      reason: findMoneyReady
        ? "At least one funding opportunity or investor target is recorded."
        : "There is no Grant, Debt or Equity target to evaluate yet.",
      nextStep: findMoneyReady ? "Evaluate the strongest source against current facts." : "Search an approved source or add a financing opportunity manually.",
      destination: "opportunities",
    },
    {
      key: "decide",
      label: "Choose what to pursue",
      complete: decisionReady,
      reason: decisionReady
        ? "A financing opportunity has been saved/pursued or an investor relationship has moved beyond research."
        : "Targets exist, but the owner has not yet made a clear pursue/deprioritize decision.",
      nextStep: decisionReady ? "Confirm the concrete next action and deadline." : "Review match evidence and save or pursue the best-fit opportunity.",
      destination: "opportunities",
    },
    {
      key: "execute",
      label: "Move the financing",
      complete: executionReady,
      reason: executionReady
        ? "At least one financing action, application, follow-up, meeting, diligence request or term sheet is moving."
        : "A decision exists, but no concrete execution record is moving it toward funding.",
      nextStep: executionReady ? "Keep the next action, owner and deadline current." : "Create the first application, financing action or investor follow-up.",
      destination: input.applications.length > 0 || input.dueDiligenceRequests.length > 0 || input.termSheets.length > 0
        ? "execution"
        : input.investors.length > 0
          ? "equity"
          : "actions",
    },
    {
      key: "protect",
      label: "Protect the work",
      complete: protectionReady,
      reason: protectionReady
        ? "A verified local recovery point exists."
        : input.continuity.backupAvailable
          ? "The financing database has no verified recovery point yet."
          : "This database mode cannot create a file-backed recovery point.",
      nextStep: protectionReady
        ? "Create a fresh backup before major financing or recovery changes."
        : input.continuity.backupAvailable
          ? "Create a verified local backup now."
          : "Use the normal file-backed local database before real financing work.",
      destination: "continuity",
    },
  ];

  const completedSteps = steps.filter((step) => step.complete).length;
  const currentStep = steps.find((step) => !step.complete) ?? null;
  return {
    completionPct: Math.round((completedSteps / steps.length) * 100),
    completedSteps,
    totalSteps: steps.length,
    currentStepKey: currentStep?.key ?? null,
    steps,
  };
}
