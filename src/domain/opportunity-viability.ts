import type { FundingOpportunity, OpportunityDeadlineViability } from "./types.ts";

const DAY_MS = 86_400_000;

function utcDayStart(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function daysToDeadline(deadline: string, now: Date): number | null {
  const parsed = new Date(`${deadline}T23:59:59.999Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor((utcDayStart(parsed) - utcDayStart(now)) / DAY_MS);
}

export function projectOpportunityDeadlineViability(
  opportunity: FundingOpportunity,
  now = new Date(),
): OpportunityDeadlineViability {
  if (!opportunity.deadline) {
    return {
      opportunityId: opportunity.id,
      deadlineState: "undated",
      deadline: null,
      daysToDeadline: null,
      deadlineViable: true,
      reason: "No deadline is recorded. The opportunity remains visible, but the owner should confirm the source timing before relying on it.",
      recovery: "Confirm the current source deadline or whether the opportunity is rolling before committing execution resources.",
    };
  }

  const days = daysToDeadline(opportunity.deadline, now);
  if (days === null) {
    return {
      opportunityId: opportunity.id,
      deadlineState: "undated",
      deadline: opportunity.deadline,
      daysToDeadline: null,
      deadlineViable: true,
      reason: "The recorded deadline cannot be interpreted as a calendar date.",
      recovery: "Correct or refresh the source deadline before relying on this opportunity for timing decisions.",
    };
  }

  if (days < 0) {
    return {
      opportunityId: opportunity.id,
      deadlineState: "deadline-passed",
      deadline: opportunity.deadline,
      daysToDeadline: days,
      deadlineViable: false,
      reason: `The recorded opportunity deadline passed ${Math.abs(days)} day(s) ago. This opportunity is not counted as current In motion capital unless a current cycle or extension is recorded.`,
      recovery: "Confirm an extension/new cycle from the source, refresh official source facts, correct a manual-source deadline if appropriate, or dismiss the opportunity.",
    };
  }

  if (days <= 14) {
    return {
      opportunityId: opportunity.id,
      deadlineState: "due-soon",
      deadline: opportunity.deadline,
      daysToDeadline: days,
      deadlineViable: true,
      reason: `The recorded opportunity deadline is in ${days} day(s).`,
      recovery: "Confirm eligibility and move the concrete application/contact work before the recorded deadline.",
    };
  }

  return {
    opportunityId: opportunity.id,
    deadlineState: "open",
    deadline: opportunity.deadline,
    daysToDeadline: days,
    deadlineViable: true,
    reason: `The recorded opportunity deadline is ${days} day(s) away.`,
    recovery: "Keep the source terms and execution deadline current as the opportunity advances.",
  };
}

export function projectOpportunityDeadlineViabilities(
  opportunities: FundingOpportunity[],
  now = new Date(),
): OpportunityDeadlineViability[] {
  return opportunities.map((opportunity) => projectOpportunityDeadlineViability(opportunity, now));
}
