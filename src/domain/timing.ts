import { isActiveClosingCondition } from "./closing-conditions.ts";
import { projectFundingReceiptSchedule } from "./arrival-schedule.ts";
import { projectReceiptExpectationFulfillment } from "./receipt-expectation-reconciliation.ts";
import { projectFundingOutcomeResolution } from "./resolution.ts";
import type {
  CapitalTimingMilestone,
  CapitalTimingPlan,
  ClosingCondition,
  CompanyProfile,
  DueDiligenceRequest,
  FinancingMeeting,
  FundingAction,
  FundingApplication,
  FundingGoal,
  FundingOpportunity,
  FundingOutcome,
  FundingReceiptExpectation,
  FundingReceiptExpectationAllocation,
  FundingReceiptTranche,
  FundraisingRound,
  Investor,
  InvestorFollowUp,
  TermSheet,
  UndatedCapitalItem,
} from "./types.ts";

interface CapitalTimingInput {
  profile: CompanyProfile | null;
  goal: FundingGoal | null;
  rounds: FundraisingRound[];
  actions: FundingAction[];
  opportunities: FundingOpportunity[];
  investors: Investor[];
  followUps: InvestorFollowUp[];
  meetings: FinancingMeeting[];
  applications: FundingApplication[];
  dueDiligenceRequests: DueDiligenceRequest[];
  termSheets: TermSheet[];
  closingConditions?: ClosingCondition[];
  outcomes: FundingOutcome[];
  receiptExpectations?: FundingReceiptExpectation[];
  receiptExpectationAllocations?: FundingReceiptExpectationAllocation[];
  receiptTranches?: FundingReceiptTranche[];
  cashCovered: boolean;
  now?: Date;
}

const DAY_MS = 86_400_000;
const AVG_MONTH_DAYS = 365.25 / 12;
const terminalActionStages = new Set(["received", "rejected", "passed", "not-a-fit", "closed"]);
const terminalApplicationStatuses = new Set(["funded", "rejected", "withdrawn"]);
const terminalInvestorStages = new Set(["closed", "passed", "no-response", "not-a-fit"]);
const activeTermSheetStatuses = new Set(["received", "reviewing", "negotiating", "accepted"]);
const dateDisciplinedInvestorStages = new Set([
  "ready-to-contact",
  "contacted",
  "replied",
  "meeting",
  "partner-meeting",
  "due-diligence",
  "term-sheet",
  "negotiation",
  "committed",
]);

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function utcDayStart(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function calendarDaysAway(value: string, now: Date): number | null {
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.round((utcDayStart(parsed) - utcDayStart(now)) / DAY_MS);
}

function isPast(value: string, now: Date): boolean {
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < now.getTime();
}

function milestoneStatus(value: string, now: Date): CapitalTimingMilestone["status"] {
  if (isPast(value, now)) return "overdue";
  const days = calendarDaysAway(value, now) ?? Number.POSITIVE_INFINITY;
  return days <= 14 ? "due-soon" : "upcoming";
}

function runwayEstimate(profile: CompanyProfile | null): { date: string | null; asOf: string | null } {
  if (!profile || !Number.isFinite(profile.runwayMonths) || profile.runwayMonths <= 0) return { date: null, asOf: profile?.updatedAt ?? null };
  const asOf = new Date(profile.updatedAt);
  if (Number.isNaN(asOf.getTime())) return { date: null, asOf: profile.updatedAt };
  const estimate = new Date(asOf.getTime() + profile.runwayMonths * AVG_MONTH_DAYS * DAY_MS);
  return { date: dateOnly(estimate), asOf: profile.updatedAt };
}

function opportunityTrack(opportunity: FundingOpportunity): "grant" | "debt" | "equity" {
  return opportunity.type === "grant" ? "grant" : opportunity.type === "loan" ? "debt" : "equity";
}

function addMilestone(
  milestones: CapitalTimingMilestone[],
  now: Date,
  input: Omit<CapitalTimingMilestone, "daysAway" | "status">,
): void {
  const daysAway = calendarDaysAway(input.date, now);
  if (daysAway === null) return;
  milestones.push({ ...input, daysAway, status: milestoneStatus(input.date, now) });
}

export function projectCapitalTimingPlan(input: CapitalTimingInput): CapitalTimingPlan {
  const now = input.now ?? new Date();
  const resolution = projectFundingOutcomeResolution(input.applications, input.outcomes);
  const needByDate = input.goal?.needByDate ?? input.profile?.targetFundingDate ?? null;
  const daysUntilNeed = needByDate ? calendarDaysAway(needByDate, now) : null;
  const runway = runwayEstimate(input.profile);
  const daysUntilRunwayEstimate = runway.date ? calendarDaysAway(runway.date, now) : null;

  const activeApplications = input.applications.filter((item) => !terminalApplicationStatuses.has(item.status) && !resolution.resolvedApplicationIds.has(item.id));
  const activeInvestors = input.investors.filter((item) => !terminalInvestorStages.has(item.stage) && !resolution.resolvedInvestorIds.has(item.id));
  const activeOpportunities = input.opportunities.filter((item) => item.decision === "pursuing" && !resolution.resolvedOpportunityIds.has(item.id) && !(item.investorId && resolution.resolvedInvestorIds.has(item.investorId)));
  const activeTermSheets = input.termSheets.filter((item) => activeTermSheetStatuses.has(item.status) && !resolution.resolvedInvestorIds.has(item.investorId));
  const activeTermSheetIds = new Set(activeTermSheets.map((item) => item.id));
  const activeClosingConditions = (input.closingConditions ?? []).filter((condition) => isActiveClosingCondition(condition) && activeTermSheetIds.has(condition.termSheetId));
  const pendingFollowUps = input.followUps.filter((item) => item.status === "pending" && !resolution.resolvedInvestorIds.has(item.investorId));
  const scheduledMeetings = input.meetings.filter((item) => item.status === "scheduled" && !resolution.resolvedInvestorIds.has(item.investorId));
  const openDiligence = input.dueDiligenceRequests.filter((item) => item.status !== "accepted" && !resolution.resolvedInvestorIds.has(item.investorId));
  const activeActions = input.actions.filter((item) => !terminalActionStages.has(item.stage));
  const receiptExpectations = input.receiptExpectations ?? [];
  const receiptExpectationAllocations = input.receiptExpectationAllocations ?? [];
  const receiptTranches = input.receiptTranches ?? [];
  const outcomeById = new Map(input.outcomes.map((outcome) => [outcome.id, outcome]));
  const activeReceiptExpectations = receiptExpectations
    .filter((item) => item.status === "expected")
    .map((expectation) => ({
      expectation,
      outcome: outcomeById.get(expectation.outcomeId),
      fulfillment: projectReceiptExpectationFulfillment(expectation, receiptExpectationAllocations, receiptTranches),
    }))
    .filter((item) => Boolean(item.outcome && item.outcome.status !== "lost" && item.outcome.status !== "withdrawn" && item.fulfillment.remainingAmountCents > 0));

  const milestones: CapitalTimingMilestone[] = [];
  if (needByDate) {
    addMilestone(milestones, now, {
      key: "funding-need-date",
      kind: "funding-need",
      date: needByDate,
      title: "Capital need-by date",
      track: null,
      entityType: null,
      entityId: null,
      destination: "setup",
    });
  }

  for (const action of activeActions.filter((item) => item.deadline)) {
    addMilestone(milestones, now, {
      key: `funding-action-${action.id}`,
      kind: "funding-action",
      date: action.deadline!,
      title: action.title,
      track: action.track,
      entityType: "funding-action",
      entityId: action.id,
      destination: "actions",
    });
  }

  for (const opportunity of activeOpportunities.filter((item) => item.deadline)) {
    addMilestone(milestones, now, {
      key: `opportunity-${opportunity.id}`,
      kind: "opportunity-deadline",
      date: opportunity.deadline!,
      title: opportunity.title,
      track: opportunityTrack(opportunity),
      entityType: "opportunity",
      entityId: opportunity.id,
      destination: "opportunities",
    });
  }

  for (const followUp of pendingFollowUps) {
    addMilestone(milestones, now, {
      key: `investor-follow-up-${followUp.id}`,
      kind: "investor-follow-up",
      date: followUp.dueDate,
      title: followUp.action,
      track: "equity",
      entityType: "investor-follow-up",
      entityId: followUp.id,
      destination: "equity",
    });
  }

  const investorsWithPendingFollowUp = new Set(pendingFollowUps.map((item) => item.investorId));
  for (const investor of activeInvestors.filter((item) => item.nextFollowUpDate && !investorsWithPendingFollowUp.has(item.id))) {
    addMilestone(milestones, now, {
      key: `investor-next-${investor.id}`,
      kind: "investor-follow-up",
      date: investor.nextFollowUpDate!,
      title: `${investor.name} next investor move`,
      track: "equity",
      entityType: "investor",
      entityId: investor.id,
      destination: "equity",
    });
  }

  for (const meeting of scheduledMeetings) {
    addMilestone(milestones, now, {
      key: `financing-meeting-${meeting.id}`,
      kind: "financing-meeting",
      date: meeting.meetingAt,
      title: `${meeting.meetingType.replaceAll("-", " ")} meeting`,
      track: "equity",
      entityType: "financing-meeting",
      entityId: meeting.id,
      destination: "equity",
    });
  }

  for (const application of activeApplications.filter((item) => item.deadline)) {
    addMilestone(milestones, now, {
      key: `funding-application-${application.id}`,
      kind: "funding-application",
      date: application.deadline!,
      title: application.title,
      track: application.track,
      entityType: "funding-application",
      entityId: application.id,
      destination: "execution",
    });
  }

  for (const request of openDiligence.filter((item) => item.deadline)) {
    addMilestone(milestones, now, {
      key: `due-diligence-${request.id}`,
      kind: "due-diligence",
      date: request.deadline!,
      title: request.request,
      track: "equity",
      entityType: "due-diligence",
      entityId: request.id,
      destination: "execution",
    });
  }

  for (const condition of activeClosingConditions.filter((item) => item.dueDate)) {
    addMilestone(milestones, now, {
      key: `closing-condition-${condition.id}`,
      kind: "closing-condition",
      date: condition.dueDate!,
      title: condition.title,
      track: "equity",
      entityType: "closing-condition",
      entityId: condition.id,
      destination: "execution",
    });
  }

  for (const termSheet of activeTermSheets.filter((item) => item.targetCloseDate)) {
    const investor = activeInvestors.find((item) => item.id === termSheet.investorId);
    addMilestone(milestones, now, {
      key: `term-sheet-close-${termSheet.id}`,
      kind: "term-sheet-close",
      date: termSheet.targetCloseDate!,
      title: `${investor?.name ?? "Investor"} term sheet target close`,
      track: "equity",
      entityType: "term-sheet",
      entityId: termSheet.id,
      destination: "execution",
    });
  }

  for (const item of activeReceiptExpectations) {
    const outcome = item.outcome!;
    addMilestone(milestones, now, {
      key: `expected-receipt-${item.expectation.id}`,
      kind: "expected-receipt",
      date: item.expectation.expectedDate,
      title: `${outcome.track} committed-capital expected receipt · ${item.fulfillment.remainingAmountCents} cents remaining`,
      track: outcome.track,
      entityType: "receipt-expectation",
      entityId: item.expectation.id,
      destination: "execution",
    });
  }

  for (const round of input.rounds.filter((item) => item.status !== "closed" && item.targetCloseDate)) {    addMilestone(milestones, now, {
      key: `round-close-${round.id}`,
      kind: "round-close",
      date: round.targetCloseDate!,
      title: `${round.roundName} target close`,
      track: null,
      entityType: null,
      entityId: null,
      destination: "execution",
    });
  }

  milestones.sort((left, right) => left.date.localeCompare(right.date) || left.key.localeCompare(right.key));

  const undatedItems: UndatedCapitalItem[] = [];
  for (const action of activeActions.filter((item) => !item.deadline)) {
    undatedItems.push({ key: `funding-action-${action.id}`, title: action.title, reason: "Active Funding Action has no deadline.", track: action.track, entityType: "funding-action", entityId: action.id, destination: "actions" });
  }
  for (const opportunity of activeOpportunities.filter((item) => !item.deadline)) {
    undatedItems.push({ key: `opportunity-${opportunity.id}`, title: opportunity.title, reason: "Pursued opportunity has no recorded deadline.", track: opportunityTrack(opportunity), entityType: "opportunity", entityId: opportunity.id, destination: "opportunities" });
  }
  for (const application of activeApplications.filter((item) => !item.deadline)) {
    undatedItems.push({ key: `funding-application-${application.id}`, title: application.title, reason: "Active application has no recorded deadline or decision checkpoint.", track: application.track, entityType: "funding-application", entityId: application.id, destination: "execution" });
  }
  for (const request of openDiligence.filter((item) => !item.deadline)) {
    undatedItems.push({ key: `due-diligence-${request.id}`, title: request.request, reason: "Open due diligence request has no deadline.", track: "equity", entityType: "due-diligence", entityId: request.id, destination: "execution" });
  }
  for (const condition of activeClosingConditions.filter((item) => !item.dueDate)) {
    undatedItems.push({ key: `closing-condition-${condition.id}`, title: condition.title, reason: "Open closing condition has no due date.", track: "equity", entityType: "closing-condition", entityId: condition.id, destination: "execution" });
  }

  const activeTermSheetInvestorIds = new Set(activeTermSheets.map((item) => item.investorId));
  for (const termSheet of activeTermSheets) {
    const investor = activeInvestors.find((item) => item.id === termSheet.investorId);
    const hasDatedMove = Boolean(termSheet.targetCloseDate || investor?.nextFollowUpDate || investorsWithPendingFollowUp.has(termSheet.investorId));
    if (hasDatedMove) continue;
    undatedItems.push({
      key: `term-sheet-${termSheet.id}`,
      title: `${investor?.name ?? "Investor"} term sheet`,
      reason: "Active Term Sheet has no dated investor follow-up or closing move recorded.",
      track: "equity",
      entityType: "term-sheet",
      entityId: termSheet.id,
      destination: "execution",
    });
  }

  for (const investor of activeInvestors.filter((item) => dateDisciplinedInvestorStages.has(item.stage) && !item.nextFollowUpDate && !investorsWithPendingFollowUp.has(item.id) && !activeTermSheetInvestorIds.has(item.id))) {
    undatedItems.push({ key: `investor-${investor.id}`, title: investor.name, reason: `Investor is at ${investor.stage.replaceAll("-", " ")} with no dated next move.`, track: "equity", entityType: "investor", entityId: investor.id, destination: "equity" });
  }

  for (const outcome of input.outcomes) {
    if (outcome.status === "lost" || outcome.status === "withdrawn") continue;
    const schedule = projectFundingReceiptSchedule(outcome, receiptExpectations, now, receiptExpectationAllocations, receiptTranches);
    if (schedule.status !== "unscheduled" && schedule.status !== "partial") continue;
    undatedItems.push({
      key: `receipt-schedule-${outcome.id}`,
      title: `${outcome.track} committed capital arrival`,
      reason: schedule.status === "unscheduled"
        ? `${schedule.outstandingAmountCents} cents is committed and unreceived with no explicit expected receipt date.`
        : `${schedule.unscheduledAmountCents} cents of the outstanding commitment has no explicit expected receipt date.`,
      track: outcome.track,
      entityType: "funding-outcome",
      entityId: outcome.id,
      destination: "execution",
    });
  }

  for (const round of input.rounds.filter((item) => item.status !== "closed" && !item.targetCloseDate)) {    undatedItems.push({ key: `round-${round.id}`, title: round.roundName, reason: "Active fundraising round has no target close date.", track: null, entityType: null, entityId: null, destination: "execution" });
  }

  const overdueMilestoneCount = milestones.filter((item) => item.status === "overdue").length;
  const dueNext14DaysCount = milestones.filter((item) => item.status === "due-soon" && item.daysAway >= 0).length;

  let status: CapitalTimingPlan["status"];
  let explanation: string;
  if (input.cashCovered) {
    status = "cash-covered";
    explanation = "The recorded funding target is covered by cash received. Remaining dates are still shown as operational financing milestones.";
  } else if (!needByDate) {
    status = "no-target-date";
    explanation = "No capital need-by date is recorded, so the owner cannot compare financing work against a funding deadline.";
  } else if (daysUntilNeed !== null && daysUntilNeed < 0) {
    status = "past-need-date";
    explanation = "The recorded capital need-by date has passed while the funding target is not covered by received cash.";
  } else if (runway.date && runway.date < needByDate) {
    status = "runway-before-need";
    explanation = `The saved runway estimate reaches ${runway.date} before the recorded capital need-by date ${needByDate}. Recheck the company cash/runway inputs and financing timing.`;
  } else if (daysUntilNeed !== null && daysUntilNeed <= 30) {
    status = "near-term";
    explanation = `The recorded capital need-by date is ${daysUntilNeed} day${daysUntilNeed === 1 ? "" : "s"} away. Keep every active financing path attached to a dated next move.`;
  } else {
    status = "dated";
    explanation = "A capital need-by date is recorded. Use the milestone list and undated-item count to keep execution time-bound.";
  }

  return {
    status,
    needByDate,
    daysUntilNeed,
    runwayEstimateDate: runway.date,
    runwayEstimateAsOf: runway.asOf,
    daysUntilRunwayEstimate,
    overdueMilestoneCount,
    dueNext14DaysCount,
    undatedActiveItemCount: undatedItems.length,
    explanation,
    disclaimer: "Runway date converts the saved runwayMonths value from the company-profile update time into a calendar estimate and does not forecast cash flows. Expected-receipt milestones come only from explicitly recorded wire/settlement expectations and are not guarantees, probability forecasts, or actual receipt dates. Actual cash is recorded only through Receipt Tranches; an expectation is reduced only by an explicit owner-recorded allocation to an actual tranche, never by automatic matching.",
    milestones: milestones.slice(0, 8),
    undatedItems: undatedItems.slice(0, 8),
  };
}
