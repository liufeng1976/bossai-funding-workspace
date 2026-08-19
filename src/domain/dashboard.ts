import { projectCapitalBlockers } from "./blockers.ts";
import { projectCapitalCoveragePlan } from "./closing.ts";
import { chooseTodayFocus } from "./focus.ts";
import { projectCapitalPipelineTruth } from "./pipeline.ts";
import { projectCapitalTimingPlan } from "./timing.ts";
import type {
  CapitalStrategyFreshness,
  ClosingCondition,
  CompanyProfile,
  DashboardProjection,
  DueDiligenceRequest,
  FundingAction,
  FundingApplication,
  FundingGoal,
  FundingOutcome,
  FundingReceiptTranche,
  FundingReceiptExpectation,
  FundingReceiptExpectationAllocation,
  FundingOpportunity,
  FundraisingRound,
  Investor,
  InvestorFollowUp,
  FinancingMeeting,
  OpportunityMatch,
  TermSheet,
} from "./types.ts";

export function projectDashboard(
  profile: CompanyProfile | null,
  goal: FundingGoal | null,
  rounds: FundraisingRound[],
  actions: FundingAction[],
  now = new Date(),
  investors: Investor[] = [],
  followUps: InvestorFollowUp[] = [],
  meetings: FinancingMeeting[] = [],
  opportunities: FundingOpportunity[] = [],
  opportunityMatches: OpportunityMatch[] = [],
  applications: FundingApplication[] = [],
  dueDiligenceRequests: DueDiligenceRequest[] = [],
  termSheets: TermSheet[] = [],
  outcomes: FundingOutcome[] = [],
  closingConditions: ClosingCondition[] = [],
  receiptTranches: FundingReceiptTranche[] = [],
  receiptExpectations: FundingReceiptExpectation[] = [],
  receiptExpectationAllocations: FundingReceiptExpectationAllocation[] = [],
  strategyFreshness: CapitalStrategyFreshness | null = null,
): DashboardProjection {
  const targetAmountCents = Math.max(
    0,
    goal?.targetAmountCents ?? profile?.targetFundingCents ?? rounds[0]?.targetAmountCents ?? 0,
  );

  const standaloneOutcomes = outcomes.filter((outcome) => outcome.roundId === null && (outcome.status === "won" || outcome.status === "closed"));
  const receivedAmountCents = rounds.reduce((sum, round) => sum + Math.max(0, round.receivedAmountCents), 0)
    + standaloneOutcomes.reduce((sum, outcome) => sum + Math.max(0, outcome.receivedAmountCents), 0);
  const committedAmountCents = rounds.reduce(
    (sum, round) => sum + Math.max(0, round.committedAmountCents - round.receivedAmountCents),
    0,
  ) + standaloneOutcomes.reduce(
    (sum, outcome) => sum + Math.max(0, outcome.committedAmountCents - outcome.receivedAmountCents),
    0,
  );
  const pipelineTruth = projectCapitalPipelineTruth({
    actions,
    opportunities,
    investors,
    followUps,
    applications,
    termSheets,
    outcomes,
    now,
  });
  const activePipelineCents = pipelineTruth.totalInMotionCents;
  const remainingGapCents = Math.max(0, targetAmountCents - receivedAmountCents - committedAmountCents);
  const coveragePlan = projectCapitalCoveragePlan({
    targetAmountCents,
    receivedAmountCents,
    committedAmountCents,
    inMotionItems: pipelineTruth.items,
    closingConditions,
  });
  const timingPlan = projectCapitalTimingPlan({
    profile,
    goal,
    rounds,
    actions,
    opportunities,
    investors,
    followUps,
    meetings,
    applications,
    dueDiligenceRequests,
    termSheets,
    closingConditions,
    outcomes,
    receiptExpectations,
    receiptExpectationAllocations,
    receiptTranches,
    cashCovered: coveragePlan.status === "cash-covered",
    now,
  });
  const capitalBlockers = projectCapitalBlockers({
    profile,
    goal,
    remainingGapCents,
    committedNotReceivedCents: committedAmountCents,
    actions,
    opportunities,
    investors,
    followUps,
    meetings,
    applications,
    dueDiligenceRequests,
    termSheets,
    closingConditions,
    outcomes,
    receiptTranches,
    receiptExpectations,
    receiptExpectationAllocations,
    now,
  });

  return {
    targetAmountCents,
    receivedAmountCents,
    committedAmountCents,
    activePipelineCents,
    remainingGapCents,
    tracks: pipelineTruth.tracks,
    todayFocus: chooseTodayFocus(profile, goal, actions, now, investors, followUps, meetings, opportunities, opportunityMatches, applications, dueDiligenceRequests, termSheets, outcomes, closingConditions, receiptTranches, receiptExpectations, receiptExpectationAllocations, strategyFreshness),
    capitalBlockers,
    coveragePlan,
    timingPlan,
  };
}
