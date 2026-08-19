import { projectFundingOutcomeResolution } from "./resolution.ts";
import type {
  EquityPipelineStage,
  EquityPipelineSummary,
  FinancingMeeting,
  FundingOutcome,
  Investor,
  InvestorFollowUp,
} from "./types.ts";

export const equityPipelineStages: readonly EquityPipelineStage[] = [
  "target",
  "research",
  "ready-to-contact",
  "contacted",
  "replied",
  "meeting",
  "partner-meeting",
  "due-diligence",
  "term-sheet",
  "negotiation",
  "committed",
  "closed",
  "passed",
  "no-response",
  "not-a-fit",
];

const terminalStages = new Set<EquityPipelineStage>(["closed", "passed", "no-response", "not-a-fit"]);

export function isActiveEquityStage(stage: EquityPipelineStage): boolean {
  return !terminalStages.has(stage);
}

export function summarizeEquityPipeline(
  investors: Investor[],
  followUps: InvestorFollowUp[],
  meetings: FinancingMeeting[],
  outcomes: FundingOutcome[] = [],
): EquityPipelineSummary {
  const { resolvedInvestorIds } = projectFundingOutcomeResolution([], outcomes);
  const currentInvestors = investors.filter((investor) => !resolvedInvestorIds.has(investor.id));
  const stageCounts = Object.fromEntries(equityPipelineStages.map((stage) => [stage, 0])) as Record<EquityPipelineStage, number>;
  for (const investor of currentInvestors) stageCounts[investor.stage] += 1;

  const activeInvestors = currentInvestors.filter((investor) => isActiveEquityStage(investor.stage));
  const pendingFollowUps = followUps.filter((followUp) => followUp.status === "pending" && !resolvedInvestorIds.has(followUp.investorId));
  const scheduledMeetings = meetings
    .filter((meeting) => meeting.status === "scheduled" && !resolvedInvestorIds.has(meeting.investorId))
    .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt));

  return {
    activeInvestorCount: activeInvestors.length,
    committedInvestorCount: stageCounts.committed,
    closedInvestorCount: stageCounts.closed,
    resolvedInvestorCount: resolvedInvestorIds.size,
    totalPotentialCents: activeInvestors.reduce((sum, investor) => sum + Math.max(0, investor.chequeMaxCents), 0),
    pendingFollowUpCount: pendingFollowUps.length,
    nextMeetingAt: scheduledMeetings[0]?.meetingAt ?? null,
    stageCounts,
  };
}

export function equityStageLabel(stage: EquityPipelineStage): string {
  return stage
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
