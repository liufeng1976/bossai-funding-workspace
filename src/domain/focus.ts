import { isActiveClosingCondition } from "./closing-conditions.ts";
import { projectFundingReceiptSchedule } from "./arrival-schedule.ts";
import { projectFundingOutcomeEvidence } from "./outcome-evidence.ts";
import { projectReceiptExpectationFulfillment } from "./receipt-expectation-reconciliation.ts";
import { projectFundingOutcomeResolution } from "./resolution.ts";
import { projectOpportunityDeadlineViability } from "./opportunity-viability.ts";
import type {
  CapitalStrategyFreshness,
  ClosingCondition,
  CompanyProfile,
  DueDiligenceRequest,
  FinancingMeeting,
  FundingAction,
  FundingApplication,
  FundingGoal,
  FundingOpportunity,
  FundingOutcome,
  FundingReceiptTranche,
  FundingReceiptExpectation,
  FundingReceiptExpectationAllocation,
  Investor,
  InvestorFollowUp,
  OpportunityMatch,
  TermSheet,
  TodayFocus,
} from "./types.ts";

const terminalStages = new Set(["received", "rejected", "passed", "not-a-fit", "closed"]);
const highValueStages = new Set([
  "contacted",
  "replied",
  "meeting",
  "partner-meeting",
  "due-diligence",
  "term-sheet",
  "negotiation",
  "committed",
  "approved",
]);
const highValueInvestorStages = new Set([
  "replied",
  "meeting",
  "partner-meeting",
  "due-diligence",
  "term-sheet",
  "negotiation",
  "committed",
]);

function daysTo(deadline: string | null, now: Date): number | null {
  if (!deadline) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? new Date(`${deadline}T23:59:59Z`) : new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((date.getTime() - now.getTime()) / 86_400_000);
}

function priorityWeight(priority: FundingAction["priority"] | Investor["priority"]): number {
  if (priority === "critical") return 30;
  if (priority === "high") return 20;
  if (priority === "medium") return 10;
  return 0;
}

function deadlineTier(deadline: string | null, now: Date): number {
  const days = daysTo(deadline, now);
  if (days === null) return 0;
  if (days < 0) return 1_000;
  if (days <= 3) return 800;
  if (days <= 7) return 600;
  if (days <= 14) return 400;
  return 0;
}

function actionScore(action: FundingAction, now: Date): number {
  if (terminalStages.has(action.stage)) return Number.NEGATIVE_INFINITY;
  let score = priorityWeight(action.priority) + deadlineTier(action.deadline, now);
  if (highValueStages.has(action.stage)) score += 60;
  if (action.stage === "saved" || action.stage === "ready") score += 35;
  if (action.track === "equity" && (action.stage === "contacted" || action.stage === "no-response")) score += 30;
  if (action.stage === "discover") score += 10;
  score += Math.min(25, Math.floor(action.amountCents / 10_000_000));
  return score;
}

function urgencyForDate(deadline: string | null, now: Date): TodayFocus["urgency"] {
  const days = daysTo(deadline, now);
  if (days !== null && days <= 3) return "urgent";
  if (days !== null && days <= 10) return "soon";
  return "normal";
}

interface FocusCandidate {
  score: number;
  focus: TodayFocus;
}

function outcomeEvidenceCandidate(outcome: FundingOutcome, receiptTranches?: FundingReceiptTranche[]): FocusCandidate | null {
  const evidence = projectFundingOutcomeEvidence(outcome, receiptTranches);
  if (evidence.complete) return null;
  const reconciliationMissing = evidence.missing.includes("reconciliation");
  const receiptMissing = evidence.missing.includes("receipt");
  const missingLabel = evidence.missing.join(" and ");
  return {
    score: reconciliationMissing || receiptMissing ? 1_250 : 980,
    focus: {
      title: reconciliationMissing ? "Reconcile the recorded receipt tranches" : receiptMissing ? "Add evidence for recorded received capital" : "Add evidence for recorded committed capital",
      reason: reconciliationMissing
        ? `This ${outcome.track} Funding Outcome shows ${outcome.receivedAmountCents} received cents but its active receipt tranches total ${evidence.receiptTrancheAmountCents} cents.`
        : `This ${outcome.track} Funding Outcome changes owner-visible capital totals but is missing ${missingLabel} evidence.`,
      nextStep: reconciliationMissing
        ? "Open this Funding Outcome and correct the specific receipt tranche so the tranche register equals the recorded received total."
        : receiptMissing
          ? "Open this Funding Outcome and complete the missing receipt-tranche evidence supporting the received cash."
          : "Open this Funding Outcome and record the commitment evidence reference supporting the committed amount.",
      urgency: reconciliationMissing || receiptMissing ? "urgent" : "soon",
      track: outcome.track,
      actionId: null,
      entityType: "funding-outcome",
      entityId: outcome.id,
      workStatus: outcome.status,
      workOwner: null,
      workDueAt: null,
      destination: "execution",
    },
  };
}

function receiptExpectationCandidate(
  expectation: FundingReceiptExpectation,
  outcome: FundingOutcome,
  now: Date,
  allocations: FundingReceiptExpectationAllocation[],
  tranches: FundingReceiptTranche[],
): FocusCandidate | null {
  const fulfillment = projectReceiptExpectationFulfillment(expectation, allocations, tranches);
  if (expectation.status !== "expected" && fulfillment.reconciliationIssues.length === 0) return null;
  if (fulfillment.status === "fulfilled") return null;
  if (fulfillment.status === "invalid-receipt" || fulfillment.status === "overallocated") {
    const allocationRefs = fulfillment.reconciliationAllocationIds.length > 0
      ? fulfillment.reconciliationAllocationIds.map((id) => `Allocation #${id}`).join(", ")
      : "the active Allocation";
    const repairIssue = fulfillment.reconciliationIssues[0] ?? null;
    const repairAmount = repairIssue?.requiredReductionCents ?? Math.max(0, fulfillment.allocatedAmountCents - fulfillment.expectedAmountCents);
    return {
      score: 1_510,
      focus: {
        title: "Reconcile the expected receipt against actual cash",
        reason: repairIssue
          ? `${repairIssue.reason} At least ${repairAmount} cents must be corrected across ${allocationRefs} to satisfy this recorded constraint; BossAI Funding does not choose which owner-confirmed relationship to remove.`
          : `${allocationRefs} no longer reconciles to the current financing facts.`,
        nextStep: `Open Arrival Expectation #${expectation.id} and reduce, correct, or void at least ${repairAmount} cents across ${allocationRefs}. Do not change actual cash merely to make the schedule look balanced.`,
        urgency: "urgent",
        track: outcome.track,
        actionId: null,
        entityType: "receipt-expectation",
        entityId: expectation.id,
        workStatus: fulfillment.status,
        workOwner: expectation.owner,
        workDueAt: expectation.expectedDate,
        destination: "execution",
      },
    };
  }
  if (fulfillment.remainingAmountCents <= 0) return null;
  const outstanding = Math.max(0, outcome.committedAmountCents - outcome.receivedAmountCents);
  const days = daysTo(expectation.expectedDate, now);
  if (days === null) return null;
  const overdue = days < 0;
  const dueSoon = days <= 7;
  if (!overdue && !dueSoon) return null;
  return {
    score: overdue ? 1_450 : 920,
    focus: {
      title: overdue ? "Expected committed capital has not fully arrived" : "A committed-capital receipt is due soon",
      reason: overdue
        ? `${fulfillment.remainingAmountCents} cents of this explicit ${expectation.amountCents}-cent expectation remains unfulfilled after recorded receipt allocations, and the expected date ${expectation.expectedDate} has passed.`
        : `${fulfillment.remainingAmountCents} cents remains on this explicit expectation for ${expectation.expectedDate}. ${fulfillment.allocatedAmountCents} cents is already linked to actual receipt tranches.`,
      nextStep: overdue
        ? "Confirm the payer/wire status, record actual cash as a Receipt Tranche, and explicitly allocate that receipt only when you can confirm it fulfills this expectation."
        : "Confirm the recorded arrival checkpoint. Record actual cash first, then explicitly allocate the receipt to this expectation if the relationship is known.",
      urgency: overdue ? "urgent" : days <= 3 ? "urgent" : "soon",
      track: outcome.track,
      actionId: null,
      entityType: "receipt-expectation",
      entityId: expectation.id,
      workStatus: fulfillment.status,
      workOwner: expectation.owner,
      workDueAt: expectation.expectedDate,
      destination: "execution",
    },
  };
}

function receiptScheduleCandidate(
  outcome: FundingOutcome,
  expectations: FundingReceiptExpectation[],
  now: Date,
  allocations: FundingReceiptExpectationAllocation[],
  tranches: FundingReceiptTranche[],
): FocusCandidate | null {
  if (outcome.status === "lost" || outcome.status === "withdrawn") return null;
  const schedule = projectFundingReceiptSchedule(outcome, expectations, now, allocations, tranches);
  if (schedule.status === "no-outstanding-commitment" || schedule.status === "balanced") return null;
  if (schedule.status === "allocation-error") {
    return {
      score: 1_500,
      focus: {
        title: "Reconcile expectation-to-receipt allocations",
        reason: "At least one explicit expectation allocation no longer fits the current receipt facts: the actual tranche may be voided or reduced below its active allocation total, or the expectation itself is over-allocated.",
        nextStep: "Open the affected expected receipt and correct or void the identified Allocation. Actual Receipt Tranches remain the cash authority and must not be rewritten merely to satisfy the plan.",
        urgency: "urgent",
        track: outcome.track,
        actionId: null,
        entityType: "funding-outcome",
        entityId: outcome.id,
        workStatus: outcome.status,
        workOwner: null,
        workDueAt: schedule.nextExpectedDate,
        destination: "execution",
      },
    };
  }
  if (schedule.status === "over-scheduled") {
    return {
      score: 1_350,
      focus: {
        title: "Reconcile the committed-capital arrival schedule",
        reason: `Active arrival expectations exceed the remaining unreceived commitment by ${schedule.overScheduledAmountCents} cents. Actual receipts changed the financing state, so the old schedule must be corrected rather than treated as current.`,
        nextStep: "Open this Funding Outcome and reduce or cancel the specific arrival expectation(s) that no longer describe the outstanding committed capital.",
        urgency: "urgent",
        track: outcome.track,
        actionId: null,
        entityType: "funding-outcome",
        entityId: outcome.id,
        workStatus: outcome.status,
        workOwner: null,
        workDueAt: schedule.nextExpectedDate,
        destination: "execution",
      },
    };
  }
  return {
    score: schedule.status === "unscheduled" ? 25 : 20,
    focus: {
      title: schedule.status === "unscheduled" ? "Record when committed capital is expected to arrive" : "Finish scheduling the outstanding committed capital",
      reason: schedule.status === "unscheduled"
        ? `${schedule.outstandingAmountCents} cents is committed but no explicit wire/settlement arrival date is recorded.`
        : `${schedule.unscheduledAmountCents} cents of the remaining commitment has no explicit arrival date even though ${schedule.activeExpectedAmountCents} cents is already scheduled.`,
      nextStep: "Record only an explicit payer-provided or closing-supported expected receipt amount/date and the person responsible for following it. Do not estimate a date from workflow stage alone.",
      urgency: "soon",
      track: outcome.track,
      actionId: null,
      entityType: "funding-outcome",
      entityId: outcome.id,
      workStatus: outcome.status,
      workOwner: null,
      workDueAt: schedule.nextExpectedDate,
      destination: "execution",
    },
  };
}

function fundingActionCandidate(action: FundingAction, now: Date): FocusCandidate | null {
  const score = actionScore(action, now);
  if (!Number.isFinite(score)) return null;
  const days = daysTo(action.deadline, now);
  const reason =
    days === null
      ? highValueStages.has(action.stage)
        ? "This action is already in a high-value financing stage."
        : "This is the highest-value active financing action."
      : days < 0
        ? `This action is overdue by ${Math.abs(days)} day(s).`
        : days <= 3
          ? `This action is due in ${days} day(s).`
          : highValueStages.has(action.stage)
            ? "This action is already in a high-value financing stage."
            : "This action is the strongest current combination of timing, priority and potential value.";

  return {
    score,
    focus: {
      title: action.title,
      reason,
      nextStep: action.nextStep || "Define the next concrete move and owner before leaving this item.",
      urgency: urgencyForDate(action.deadline, now),
      track: action.track,
      actionId: action.id,
      entityType: "funding-action",
      entityId: action.id,
      workStatus: action.stage,
      workOwner: action.owner.trim() || null,
      workDueAt: action.deadline,
      destination: "actions",
    },
  };
}

function followUpCandidate(followUp: InvestorFollowUp, investor: Investor | undefined, now: Date): FocusCandidate | null {
  if (followUp.status !== "pending") return null;
  const dueTier = deadlineTier(followUp.dueDate, now);
  const stageBoost = investor && highValueInvestorStages.has(investor.stage) ? 70 : 25;
  const score = dueTier + stageBoost + (investor ? priorityWeight(investor.priority) : 0);
  const days = daysTo(followUp.dueDate, now);
  const investorName = investor?.name ?? "Investor";
  const reason =
    days !== null && days < 0
      ? `Follow-up with ${investorName} is overdue by ${Math.abs(days)} day(s).`
      : days !== null && days <= 3
        ? `Follow-up with ${investorName} is due in ${days} day(s).`
        : investor && highValueInvestorStages.has(investor.stage)
          ? `${investorName} is already in a high-value equity stage.`
          : `A dated investor follow-up is waiting for the owner.`;

  return {
    score,
    focus: {
      title: `Follow up with ${investorName}`,
      reason,
      nextStep: followUp.action,
      urgency: urgencyForDate(followUp.dueDate, now),
      track: "equity",
      actionId: null,
      entityType: "investor-follow-up",
      entityId: followUp.id,
      workStatus: followUp.status,
      workOwner: followUp.owner.trim() || null,
      workDueAt: followUp.dueDate,
      destination: "equity",
    },
  };
}

function meetingCandidate(meeting: FinancingMeeting, investor: Investor | undefined, now: Date): FocusCandidate | null {
  if (meeting.status !== "scheduled") return null;
  const days = daysTo(meeting.meetingAt, now);
  if (days !== null && days < -1) return null;
  const score = deadlineTier(meeting.meetingAt, now) + 90 + (investor ? priorityWeight(investor.priority) : 0);
  const investorName = investor?.name ?? "Investor";
  return {
    score,
    focus: {
      title: `Prepare for ${investorName} meeting`,
      reason: days !== null && days <= 3 ? `The financing meeting is within ${Math.max(0, days)} day(s).` : "A scheduled investor meeting is a high-value financing step.",
      nextStep: meeting.objective || meeting.nextAction || "Confirm the meeting objective, attendees and desired decision.",
      urgency: urgencyForDate(meeting.meetingAt, now),
      track: "equity",
      actionId: null,
      entityType: "financing-meeting",
      entityId: meeting.id,
      workStatus: meeting.status,
      workOwner: null,
      workDueAt: meeting.meetingAt,
      destination: "equity",
    },
  };
}

function investorCandidate(investor: Investor, now: Date): FocusCandidate | null {
  if (["closed", "passed", "no-response", "not-a-fit"].includes(investor.stage)) return null;
  const dueTier = deadlineTier(investor.nextFollowUpDate, now);
  const stageBoost = highValueInvestorStages.has(investor.stage) ? 65 : investor.stage === "ready-to-contact" ? 35 : 15;
  const score = dueTier + stageBoost + priorityWeight(investor.priority);
  if (score <= 15 && !investor.nextAction) return null;
  return {
    score,
    focus: {
      title: investor.name,
      reason: dueTier > 0
        ? "This investor has a dated next follow-up that is becoming urgent."
        : highValueInvestorStages.has(investor.stage)
          ? `This investor is already at ${investor.stage.replaceAll("-", " ")}.`
          : "This is the strongest current investor next action.",
      nextStep: investor.nextAction || "Define the next contact step and a dated follow-up.",
      urgency: urgencyForDate(investor.nextFollowUpDate, now),
      track: "equity",
      actionId: null,
      entityType: "investor",
      entityId: investor.id,
      workStatus: investor.stage,
      workOwner: investor.owner.trim() || null,
      workDueAt: investor.nextFollowUpDate,
      destination: "equity",
    },
  };
}

function applicationCandidate(application: FundingApplication, now: Date): FocusCandidate | null {
  if (["funded", "rejected", "withdrawn"].includes(application.status)) return null;
  const dueTier = deadlineTier(application.deadline, now);
  const stageBoost = application.status === "under-review" || application.status === "submitted" ? 80 : 45;
  const score = dueTier + stageBoost + Math.min(25, Math.floor(application.requestedAmountCents / 10_000_000));
  const days = daysTo(application.deadline, now);
  return {
    score,
    focus: {
      title: application.title,
      reason: days !== null && days < 0
        ? `This financing application is overdue by ${Math.abs(days)} day(s).`
        : days !== null && days <= 3
          ? `This financing application is due in ${days} day(s).`
          : application.status === "under-review"
            ? "This application is already under review and needs an explicit next move."
            : "This application is active and should not stall before submission or decision.",
      nextStep: application.nextAction,
      urgency: urgencyForDate(application.deadline, now),
      track: application.track,
      actionId: null,
      entityType: "funding-application",
      entityId: application.id,
      workStatus: application.status,
      workOwner: application.owner.trim() || null,
      workDueAt: application.deadline,
      destination: "execution",
    },
  };
}

function diligenceCandidate(request: DueDiligenceRequest, investor: Investor | undefined, now: Date): FocusCandidate | null {
  if (request.status === "accepted") return null;
  const dueTier = deadlineTier(request.deadline, now);
  const stageBoost = request.status === "needs-revision" ? 95 : request.status === "requested" || request.status === "preparing" ? 75 : 55;
  const score = dueTier + stageBoost;
  const days = daysTo(request.deadline, now);
  const investorName = investor?.name ?? "Investor";
  return {
    score,
    focus: {
      title: `${investorName} due diligence request`,
      reason: days !== null && days <= 3
        ? `A diligence item for ${investorName} is due in ${Math.max(0, days)} day(s).`
        : request.status === "needs-revision"
          ? `${investorName} requested a revision before accepting this diligence item.`
          : "An active diligence request is blocking the financing process from moving forward.",
      nextStep: request.request,
      urgency: urgencyForDate(request.deadline, now),
      track: "equity",
      actionId: null,
      entityType: "due-diligence",
      entityId: request.id,
      workStatus: request.status,
      workOwner: request.owner.trim() || null,
      workDueAt: request.deadline,
      destination: "execution",
    },
  };
}

function termSheetCandidate(termSheet: TermSheet, investor: Investor | undefined, now: Date): FocusCandidate | null {
  if (["rejected", "expired"].includes(termSheet.status)) return null;
  const investorName = investor?.name ?? "Investor";
  const stageScore = termSheet.status === "accepted" ? 140 : termSheet.status === "negotiating" ? 130 : termSheet.status === "reviewing" ? 120 : 110;
  const score = stageScore + deadlineTier(termSheet.targetCloseDate, now);
  const nextStep = termSheet.status === "accepted"
    ? "Complete the remaining closing conditions with counsel, execute definitive documents, and record committed or received capital when it is real."
    : termSheet.status === "negotiating"
      ? "List the open economics and governance points, confirm decision boundaries, and obtain lawyer review before agreeing."
      : "Compare the economics and governance terms, flag open issues, and obtain lawyer review before accepting anything.";
  return {
    score,
    focus: {
      title: `${investorName} term sheet`,
      reason: termSheet.targetCloseDate && (daysTo(termSheet.targetCloseDate, now) ?? 0) < 0
        ? `The ${termSheet.status.replaceAll("-", " ")} term sheet passed its recorded target close date and needs immediate closing recovery.`
        : `An active ${termSheet.status.replaceAll("-", " ")} term sheet is a high-value closing decision that should not stall.`,
      nextStep,
      urgency: urgencyForDate(termSheet.targetCloseDate, now),
      track: "equity",
      actionId: null,
      entityType: "term-sheet",
      entityId: termSheet.id,
      workStatus: termSheet.status,
      workOwner: null,
      workDueAt: termSheet.targetCloseDate,
      destination: "execution",
    },
  };
}

function closingConditionCandidate(
  condition: ClosingCondition,
  termSheet: TermSheet | undefined,
  investor: Investor | undefined,
  now: Date,
): FocusCandidate | null {
  if (!isActiveClosingCondition(condition) || !termSheet || ["rejected", "expired"].includes(termSheet.status)) return null;
  const days = daysTo(condition.dueDate, now);
  const dueScore = deadlineTier(condition.dueDate, now);
  const stageBoost = termSheet.status === "accepted" ? 50 : termSheet.status === "negotiating" ? 35 : 20;
  const score = dueScore + stageBoost + (condition.status === "in-progress" ? 180 : 160);
  const investorName = investor?.name ?? "Investor";
  const reason = days !== null && days < 0
    ? `A closing condition for ${investorName} is ${Math.abs(days)} day(s) overdue and can block the recorded target close.`
    : days !== null && days <= 3
      ? `A closing condition for ${investorName} is due in ${Math.max(0, days)} day(s).`
      : `This ${condition.status.replaceAll("-", " ")} closing condition is a concrete blocker between the term sheet and closing.`;
  const nextStep = condition.dueDate
    ? `Complete or formally waive this condition, then record the evidence note before marking it cleared.`
    : `Set a due date, complete or formally waive this condition, and record the evidence note before marking it cleared.`;
  return {
    score,
    focus: {
      title: condition.title,
      reason,
      nextStep,
      urgency: urgencyForDate(condition.dueDate, now),
      track: "equity",
      actionId: null,
      entityType: "closing-condition",
      entityId: condition.id,
      workStatus: condition.status,
      workOwner: condition.owner.trim() || null,
      workDueAt: condition.dueDate,
      destination: "execution",
    },
  };
}

function opportunityCandidate(
  opportunity: FundingOpportunity,
  match: OpportunityMatch | undefined,
  now: Date,
): FocusCandidate | null {
  if (opportunity.decision === "dismissed") return null;
  const viability = projectOpportunityDeadlineViability(opportunity, now);
  if (viability.deadlineState === "deadline-passed") {
    if (opportunity.decision !== "pursuing" && opportunity.decision !== "saved") return null;
    const track = opportunity.type === "grant" ? "grant" : opportunity.type === "loan" ? "debt" : "equity";
    return {
      score: opportunity.decision === "pursuing" ? 1_150 : 950,
      focus: {
        title: opportunity.title,
        reason: viability.reason,
        nextStep: viability.recovery,
        urgency: "urgent",
        track,
        actionId: null,
        entityType: "opportunity",
        entityId: opportunity.id,
        workStatus: `${opportunity.decision} · deadline passed`,
        workOwner: null,
        workDueAt: opportunity.deadline,
        destination: "opportunities",
      },
    };
  }
  if (match?.fit === "ineligible") return null;
  const dueTier = deadlineTier(opportunity.deadline, now);
  const fitBoost = match?.fit === "strong" ? 55 : match?.fit === "possible" ? 30 : 5;
  const decisionBoost = opportunity.decision === "pursuing" ? 20 : opportunity.decision === "saved" ? 10 : 0;
  const score = dueTier + fitBoost + decisionBoost;
  if (score <= 10) return null;
  const track = opportunity.type === "grant" ? "grant" : opportunity.type === "loan" ? "debt" : "equity";
  const days = daysTo(opportunity.deadline, now);
  const reason = days !== null && days <= 3
    ? `This ${opportunity.type} opportunity is due in ${Math.max(0, days)} day(s).`
    : match?.fit === "strong"
      ? "This saved opportunity has strong explainable fit against the current company funding profile."
      : "This opportunity is worth resolving before lower-priority discovery work.";
  return {
    score,
    focus: {
      title: opportunity.title,
      reason,
      nextStep: match?.nextStep || "Review the match evidence and decide whether to save or pursue this opportunity.",
      urgency: urgencyForDate(opportunity.deadline, now),
      track,
      actionId: null,
      entityType: "opportunity",
      entityId: opportunity.id,
      workStatus: opportunity.decision,
      workOwner: null,
      workDueAt: opportunity.deadline,
      destination: "opportunities",
    },
  };
}

export function chooseTodayFocus(
  profile: CompanyProfile | null,
  goal: FundingGoal | null,
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
  receiptTranches?: FundingReceiptTranche[],
  receiptExpectations: FundingReceiptExpectation[] = [],
  receiptExpectationAllocations: FundingReceiptExpectationAllocation[] = [],
  strategyFreshness: CapitalStrategyFreshness | null = null,
): TodayFocus {
  const receiptTrancheList = receiptTranches ?? [];
  const resolution = projectFundingOutcomeResolution(applications, outcomes);
  const investorById = new Map(investors.map((investor) => [investor.id, investor]));
  const termSheetById = new Map(termSheets.map((termSheet) => [termSheet.id, termSheet]));
  const matchByOpportunityId = new Map(opportunityMatches.map((match) => [match.opportunityId, match]));
  const candidates: FocusCandidate[] = [];

  for (const outcome of outcomes) {
    const candidate = outcomeEvidenceCandidate(outcome, receiptTranches);
    if (candidate) candidates.push(candidate);
    const scheduleCandidate = receiptScheduleCandidate(outcome, receiptExpectations, now, receiptExpectationAllocations, receiptTrancheList);
    if (scheduleCandidate) candidates.push(scheduleCandidate);
  }
  const outcomeById = new Map(outcomes.map((outcome) => [outcome.id, outcome]));
  for (const expectation of receiptExpectations) {
    const outcome = outcomeById.get(expectation.outcomeId);
    if (!outcome) continue;
    const candidate = receiptExpectationCandidate(expectation, outcome, now, receiptExpectationAllocations, receiptTrancheList);
    if (candidate) candidates.push(candidate);
  }
  for (const application of applications) {
    if (resolution.resolvedApplicationIds.has(application.id)) continue;
    const candidate = applicationCandidate(application, now);
    if (candidate) candidates.push(candidate);
  }
  for (const request of dueDiligenceRequests) {
    if (resolution.resolvedInvestorIds.has(request.investorId)) continue;
    const candidate = diligenceCandidate(request, investorById.get(request.investorId), now);
    if (candidate) candidates.push(candidate);
  }
  for (const condition of closingConditions) {
    const termSheet = termSheetById.get(condition.termSheetId);
    if (!termSheet || resolution.resolvedInvestorIds.has(termSheet.investorId)) continue;
    const candidate = closingConditionCandidate(condition, termSheet, investorById.get(termSheet.investorId), now);
    if (candidate) candidates.push(candidate);
  }
  for (const termSheet of termSheets) {
    if (resolution.resolvedInvestorIds.has(termSheet.investorId)) continue;
    const candidate = termSheetCandidate(termSheet, investorById.get(termSheet.investorId), now);
    if (candidate) candidates.push(candidate);
  }
  for (const action of actions) {
    const candidate = fundingActionCandidate(action, now);
    if (candidate) candidates.push(candidate);
  }
  for (const opportunity of opportunities) {
    if (resolution.resolvedOpportunityIds.has(opportunity.id) || (opportunity.investorId && resolution.resolvedInvestorIds.has(opportunity.investorId))) continue;
    const candidate = opportunityCandidate(opportunity, matchByOpportunityId.get(opportunity.id), now);
    if (candidate) candidates.push(candidate);
  }
  for (const followUp of followUps) {
    if (resolution.resolvedInvestorIds.has(followUp.investorId)) continue;
    const candidate = followUpCandidate(followUp, investorById.get(followUp.investorId), now);
    if (candidate) candidates.push(candidate);
  }
  for (const meeting of meetings) {
    if (resolution.resolvedInvestorIds.has(meeting.investorId)) continue;
    const candidate = meetingCandidate(meeting, investorById.get(meeting.investorId), now);
    if (candidate) candidates.push(candidate);
  }
  for (const investor of investors) {
    if (resolution.resolvedInvestorIds.has(investor.id)) continue;
    const candidate = investorCandidate(investor, now);
    if (candidate) candidates.push(candidate);
  }

  candidates.sort((a, b) => b.score - a.score);
  if (candidates[0]) return candidates[0].focus;

  if (!profile) {
    return {
      title: "Create the company funding profile",
      reason: "The capital plan has no reliable company facts yet.",
      nextStep: "Add the company, cash position, revenue, runway, financing history and intended use of funds.",
      urgency: "setup",
      track: null,
      actionId: null,
      entityType: null,
      entityId: null,
      workStatus: null,
      workOwner: null,
      workDueAt: null,
      destination: "setup",
    };
  }

  if (!goal || goal.targetAmountCents <= 0) {
    return {
      title: "Set the funding target",
      reason: "The workspace cannot measure the capital gap until the owner states how much is needed and when.",
      nextStep: "Enter the target amount, need-by date, use of funds, dilution preference and repayment capacity.",
      urgency: "setup",
      track: null,
      actionId: null,
      entityType: null,
      entityId: null,
      workStatus: null,
      workOwner: null,
      workDueAt: null,
      destination: "setup",
    };
  }

  if (strategyFreshness && strategyFreshness.state !== "current") {
    return {
      title: strategyFreshness.state === "recalculate" ? "Refresh the capital strategy" : "Create the capital strategy",
      reason: strategyFreshness.reason,
      nextStep: strategyFreshness.state === "recalculate"
        ? "Recalculate Grant, Debt and Equity allocation from the current saved financing facts before choosing new work."
        : "Calculate the Grant, Debt and Equity mix from the saved company profile and funding goal.",
      urgency: "setup",
      track: null,
      actionId: null,
      entityType: null,
      entityId: null,
      workStatus: null,
      workOwner: null,
      workDueAt: null,
      destination: "strategy",
    };
  }

  if (opportunities.length === 0 && investors.length === 0) {
    return {
      title: "Find the first funding target",
      reason: "The capital plan is ready, but there is no Grant, Debt or Equity target to evaluate yet.",
      nextStep: "Search an approved source or add one evidence-backed funding opportunity or investor target.",
      urgency: "normal",
      track: null,
      actionId: null,
      entityType: null,
      entityId: null,
      workStatus: null,
      workOwner: null,
      workDueAt: null,
      destination: "opportunities",
    };
  }

  return {
    title: "Create the first financing action",
    reason: "The funding target exists, but there is no active Grant, Debt or Equity action moving it forward.",
    nextStep: "Choose the most credible capital track and create one concrete action with an owner and next step.",
    urgency: "normal",
    track: null,
    actionId: null,
    entityType: null,
    entityId: null,
    workStatus: null,
    workOwner: null,
    workDueAt: null,
    destination: "actions",
  };
}
