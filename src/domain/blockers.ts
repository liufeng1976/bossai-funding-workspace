import { activeClosingConditionsForTermSheet, closingConditionsForTermSheet, isClosingConditionOverdue } from "./closing-conditions.ts";
import { projectFundingReceiptSchedule } from "./arrival-schedule.ts";
import { projectOpportunityDeadlineViability } from "./opportunity-viability.ts";
import { projectFundingOutcomeEvidence } from "./outcome-evidence.ts";
import { projectReceiptAllocationReconciliationIssues, projectReceiptExpectationFulfillment } from "./receipt-expectation-reconciliation.ts";
import { projectFundingOutcomeResolution } from "./resolution.ts";
import type {
  CapitalBlocker,
  CapitalBlockerSeverity,
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
  FundingTrack,
  Investor,
  InvestorFollowUp,
  TermSheet,
} from "./types.ts";

interface CapitalBlockerInput {
  profile: CompanyProfile | null;
  goal: FundingGoal | null;
  remainingGapCents: number;
  committedNotReceivedCents: number;
  actions: FundingAction[];
  opportunities: FundingOpportunity[];
  investors: Investor[];
  followUps: InvestorFollowUp[];
  meetings: FinancingMeeting[];
  applications: FundingApplication[];
  dueDiligenceRequests: DueDiligenceRequest[];
  termSheets: TermSheet[];
  closingConditions?: ClosingCondition[];
  outcomes?: FundingOutcome[];
  receiptTranches?: FundingReceiptTranche[];
  receiptExpectations?: FundingReceiptExpectation[];
  receiptExpectationAllocations?: FundingReceiptExpectationAllocation[];
  now?: Date;
}

const terminalActionStages = new Set(["received", "rejected", "passed", "not-a-fit", "closed"]);
const terminalInvestorStages = new Set(["closed", "passed", "no-response", "not-a-fit"]);
const selectedInvestorStages = new Set([
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
const highValueInvestorStages = new Set(["replied", "meeting", "partner-meeting", "due-diligence", "term-sheet", "negotiation", "committed"]);
const activeTermSheetStatuses = new Set(["received", "reviewing", "negotiating", "accepted"]);

function isOverdue(value: string | null, now: Date): boolean {
  if (!value) return false;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59Z`) : new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < now.getTime();
}

function severityRank(severity: CapitalBlockerSeverity): number {
  if (severity === "critical") return 3;
  if (severity === "high") return 2;
  return 1;
}

function opportunityTrack(opportunity: FundingOpportunity): FundingTrack {
  return opportunity.type === "grant" ? "grant" : opportunity.type === "loan" ? "debt" : "equity";
}

export function projectCapitalBlockers(input: CapitalBlockerInput): CapitalBlocker[] {
  if (input.remainingGapCents <= 0 && input.goal?.targetAmountCents) return [];

  const now = input.now ?? new Date();
  const { resolvedApplicationIds, resolvedInvestorIds, resolvedOpportunityIds } = projectFundingOutcomeResolution(input.applications, input.outcomes ?? []);
  const unresolvedOpportunities = input.opportunities.filter((opportunity) => !resolvedOpportunityIds.has(opportunity.id) && !(opportunity.investorId && resolvedInvestorIds.has(opportunity.investorId)));
  const viableOpportunities = unresolvedOpportunities.filter((opportunity) => opportunity.decision !== "dismissed" && projectOpportunityDeadlineViability(opportunity, now).deadlineViable);
  const blockers: CapitalBlocker[] = [];
  const seenEntities = new Set<string>();
  const add = (blocker: CapitalBlocker): void => {
    const entityKey = blocker.entityType && blocker.entityId ? `${blocker.entityType}:${blocker.entityId}` : null;
    if (entityKey && seenEntities.has(entityKey)) return;
    blockers.push(blocker);
    if (entityKey) seenEntities.add(entityKey);
  };

  for (const outcome of input.outcomes ?? []) {
    const evidence = projectFundingOutcomeEvidence(outcome, input.receiptTranches);
    if (evidence.complete) continue;
    const reconciliationMissing = evidence.missing.includes("reconciliation");
    const receiptMissing = evidence.missing.includes("receipt");
    add({
      key: `funding-outcome-evidence-${outcome.id}`,
      severity: reconciliationMissing || receiptMissing ? "critical" : "high",
      title: reconciliationMissing ? "Receipt tranches do not reconcile to the Funding Outcome" : receiptMissing ? "Recorded received capital is missing receipt evidence" : "Recorded committed capital is missing commitment evidence",
      reason: reconciliationMissing
        ? `This ${outcome.track} Funding Outcome records ${outcome.receivedAmountCents} received cents while its active receipt tranches total ${evidence.receiptTrancheAmountCents} cents. The mismatch must be corrected before the receipt register is reliable.`
        : `This ${outcome.track} Funding Outcome changes capital totals but is missing ${evidence.missing.join(" and ")} evidence. The recorded amount is preserved as historical input, but its supporting reference must be completed.`,
      nextStep: reconciliationMissing
        ? "Open the Funding Outcome and correct the specific receipt tranche until the tranche total equals the received total."
        : receiptMissing
          ? "Open the Funding Outcome and complete the missing receipt-tranche evidence supporting the recorded cash state."
          : "Open the Funding Outcome and add the commitment evidence reference supporting the recorded committed amount.",
      track: outcome.track,
      entityType: "funding-outcome",
      entityId: outcome.id,
      destination: "execution",
    });
  }

  if (!input.profile) {
    add({
      key: "company-facts-missing",
      severity: "critical",
      title: "The financing plan is missing company facts",
      reason: "Capital cannot be matched or prepared reliably until the company, cash, revenue, runway and use-of-funds facts exist.",
      nextStep: "Complete the company funding profile before evaluating capital sources.",
      track: null,
      entityType: null,
      entityId: null,
      destination: "setup",
    });
  }

  if (!input.goal || input.goal.targetAmountCents <= 0) {
    add({
      key: "funding-target-missing",
      severity: "critical",
      title: "The amount and timing of the funding need are not defined",
      reason: "Without a target amount and funding objective, the workspace cannot tell whether any financing path can close the gap.",
      nextStep: "Set the funding amount, need-by date, use of funds and financing constraints.",
      track: null,
      entityType: null,
      entityId: null,
      destination: "setup",
    });
  }

  for (const opportunity of unresolvedOpportunities.filter((item) => item.decision === "pursuing" && projectOpportunityDeadlineViability(item, now).deadlineState === "deadline-passed")) {
    const viability = projectOpportunityDeadlineViability(opportunity, now);
    add({
      key: `opportunity-deadline-passed-${opportunity.id}`,
      severity: "critical",
      title: `${opportunity.title} passed its recorded deadline`,
      reason: viability.reason,
      nextStep: viability.recovery,
      track: opportunityTrack(opportunity),
      entityType: "opportunity",
      entityId: opportunity.id,
      destination: "opportunities",
    });
  }

  const activeActions = input.actions.filter((item) => !terminalActionStages.has(item.stage));
  for (const action of activeActions.filter((item) => isOverdue(item.deadline, now))) {
    add({
      key: `overdue-action-${action.id}`,
      severity: "critical",
      title: `${action.title} is overdue`,
      reason: "An unfinished financing action passed its recorded deadline, so the capital process is stalled until it is completed, rescheduled or closed.",
      nextStep: action.nextStep || "Record the next concrete move, owner and new deadline.",
      track: action.track,
      entityType: "funding-action",
      entityId: action.id,
      destination: "actions",
    });
  }

  const activeApplications = input.applications.filter((item) => !["funded", "rejected", "withdrawn"].includes(item.status) && !resolvedApplicationIds.has(item.id));
  for (const application of activeApplications.filter((item) => isOverdue(item.deadline, now))) {
    add({
      key: `overdue-application-${application.id}`,
      severity: "critical",
      title: `${application.title} is past its deadline`,
      reason: "The recorded application deadline has passed while the financing application is still active.",
      nextStep: application.nextAction || "Confirm whether the application can still proceed and record the recovery action.",
      track: application.track,
      entityType: "funding-application",
      entityId: application.id,
      destination: "execution",
    });
  }

  for (const followUp of input.followUps.filter((item) => item.status === "pending" && !resolvedInvestorIds.has(item.investorId) && isOverdue(item.dueDate, now))) {
    add({
      key: `overdue-follow-up-${followUp.id}`,
      severity: "critical",
      title: "An investor follow-up is overdue",
      reason: "A promised investor next move is already past due, increasing the risk that a live financing relationship goes cold.",
      nextStep: followUp.action,
      track: "equity",
      entityType: "investor-follow-up",
      entityId: followUp.id,
      destination: "equity",
    });
  }

  for (const request of input.dueDiligenceRequests.filter((item) => item.status !== "accepted" && !resolvedInvestorIds.has(item.investorId) && isOverdue(item.deadline, now))) {
    add({
      key: `overdue-diligence-${request.id}`,
      severity: "critical",
      title: "A due diligence request is overdue",
      reason: "An investor diligence request is still open after its recorded deadline and can block closing progress.",
      nextStep: request.request,
      track: "equity",
      entityType: "due-diligence",
      entityId: request.id,
      destination: "execution",
    });
  }

  const termSheetInvestorIds = new Set<number>();
  for (const termSheet of input.termSheets.filter((item) => activeTermSheetStatuses.has(item.status) && !resolvedInvestorIds.has(item.investorId))) {
    termSheetInvestorIds.add(termSheet.investorId);
    const investor = input.investors.find((item) => item.id === termSheet.investorId);
    const registeredConditions = closingConditionsForTermSheet(input.closingConditions ?? [], termSheet.id);
    const activeConditions = activeClosingConditionsForTermSheet(input.closingConditions ?? [], termSheet.id)
      .sort((left, right) => (left.dueDate ?? "9999-12-31").localeCompare(right.dueDate ?? "9999-12-31") || left.id - right.id);
    const blockingCondition = activeConditions[0];
    if (blockingCondition) {
      const overdue = isClosingConditionOverdue(blockingCondition, now);
      add({
        key: `closing-condition-${blockingCondition.id}`,
        severity: overdue ? "critical" : "high",
        title: overdue
          ? `${blockingCondition.title} is overdue`
          : `${blockingCondition.title} is blocking ${investor?.name ?? "Investor"} closing`,
        reason: overdue
          ? `This closing condition passed its recorded due date ${blockingCondition.dueDate} and the financing path is not resolved by a Funding Outcome.`
          : blockingCondition.dueDate
            ? `This ${blockingCondition.status.replaceAll("-", " ")} closing condition is due ${blockingCondition.dueDate} before the term sheet can be treated as closed.`
            : `This ${blockingCondition.status.replaceAll("-", " ")} closing condition has no due date and can silently delay the target close.`,
        nextStep: blockingCondition.dueDate
          ? "Complete or formally waive the condition and record the evidence note before marking it cleared."
          : "Set a due date, then complete or formally waive the condition and record the evidence note before marking it cleared.",
        track: "equity",
        entityType: "closing-condition",
        entityId: blockingCondition.id,
        destination: "execution",
      });
      continue;
    }
    const closeDateOverdue = isOverdue(termSheet.targetCloseDate, now);
    add({
      key: `active-term-sheet-${termSheet.id}`,
      severity: closeDateOverdue ? "critical" : "high",
      title: closeDateOverdue
        ? `${investor?.name ?? "Investor"} target close date has passed`
        : `${investor?.name ?? "Investor"} terms are not closed yet`,
      reason: closeDateOverdue
        ? `The term sheet is ${termSheet.status.replaceAll("-", " ")} and its recorded target close date ${termSheet.targetCloseDate} has passed without a Funding Outcome.`
        : registeredConditions.length > 0
          ? `All recorded closing conditions are cleared, but the term sheet is still ${termSheet.status.replaceAll("-", " ")} and closed/received capital has not been recorded.`
          : `The term sheet is ${termSheet.status.replaceAll("-", " ")}, but closed/received capital has not been recorded and no structured closing-condition register exists yet.`,
      nextStep: registeredConditions.length > 0
        ? "Complete the remaining legal/closing steps and record committed or received capital only when the closing evidence exists."
        : "Record the material closing conditions with owner and due date, resolve them with counsel as appropriate, and record committed or received capital only when the closing evidence exists.",
      track: "equity",
      entityType: "term-sheet",
      entityId: termSheet.id,
      destination: "execution",
    });
  }

  const receiptExpectations = input.receiptExpectations ?? [];
  const receiptExpectationAllocations = input.receiptExpectationAllocations ?? [];
  const receiptTranches = input.receiptTranches ?? [];
  const receiptAllocationIssues = projectReceiptAllocationReconciliationIssues(receiptExpectations, receiptExpectationAllocations, receiptTranches);
  const outcomeOutstandingTotal = (input.outcomes ?? []).reduce((sum, outcome) => sum + Math.max(0, outcome.committedAmountCents - outcome.receivedAmountCents), 0);
  for (const outcome of input.outcomes ?? []) {
    if (outcome.status === "lost" || outcome.status === "withdrawn") continue;
    const schedule = projectFundingReceiptSchedule(outcome, receiptExpectations, now, receiptExpectationAllocations, receiptTranches);
    const outcomeExpectationIds = new Set(receiptExpectations.filter((item) => item.outcomeId === outcome.id).map((item) => item.id));
    const outcomeAllocationIssues = receiptAllocationIssues.filter((issue) => issue.expectationIds.some((id) => outcomeExpectationIds.has(id)));
    if (schedule.outstandingAmountCents <= 0 && schedule.status !== "over-scheduled" && schedule.status !== "allocation-error" && outcomeAllocationIssues.length === 0) continue;
    const active = receiptExpectations
      .filter((item) => item.outcomeId === outcome.id && (item.status === "expected" || receiptAllocationIssues.some((issue) => issue.expectationIds.includes(item.id))))
      .map((expectation) => ({ expectation, fulfillment: projectReceiptExpectationFulfillment(expectation, receiptExpectationAllocations, receiptTranches) }))
      .sort((left, right) => left.expectation.expectedDate.localeCompare(right.expectation.expectedDate) || left.expectation.id - right.expectation.id);
    const invalid = active.find((item) => item.fulfillment.status === "invalid-receipt" || item.fulfillment.status === "overallocated");
    if (invalid) {
      const allocationRefs = invalid.fulfillment.reconciliationAllocationIds.length > 0
        ? invalid.fulfillment.reconciliationAllocationIds.map((id) => `Allocation #${id}`).join(", ")
        : "the active Allocation";
      const repairIssue = invalid.fulfillment.reconciliationIssues[0] ?? null;
      const repairAmount = repairIssue?.requiredReductionCents ?? Math.max(0, invalid.fulfillment.allocatedAmountCents - invalid.fulfillment.expectedAmountCents);
      add({
        key: `receipt-allocation-error-${invalid.expectation.id}`,
        severity: "critical",
        title: "An expected receipt no longer reconciles to its allocated cash",
        reason: repairIssue
          ? `${repairIssue.reason} At least ${repairAmount} cents must be corrected across ${allocationRefs}; BossAI Funding will not choose which explicit relationship to remove.`
          : `${allocationRefs} no longer fits the current financing facts.`,
        nextStep: `Open Arrival Expectation #${invalid.expectation.id} and reduce, correct, or void at least ${repairAmount} cents across ${allocationRefs}. Do not change actual cash merely to satisfy the schedule.`,
        track: outcome.track,
        entityType: "receipt-expectation",
        entityId: invalid.expectation.id,
        destination: "execution",
      });
      continue;
    }
    const overdue = active.find((item) => item.fulfillment.remainingAmountCents > 0 && isOverdue(item.expectation.expectedDate, now));
    if (overdue) {
      add({
        key: `receipt-expectation-overdue-${overdue.expectation.id}`,
        severity: "critical",
        title: "An explicitly expected committed-capital receipt is overdue",
        reason: `${overdue.fulfillment.remainingAmountCents} cents remains unfulfilled from the ${overdue.expectation.amountCents}-cent expectation dated ${overdue.expectation.expectedDate}. ${overdue.fulfillment.allocatedAmountCents} cents is already explicitly linked to actual receipt tranches.`,
        nextStep: "Confirm the payer/wire status, record actual cash first, then explicitly allocate a Receipt Tranche to this expectation only when that relationship is known.",
        track: outcome.track,
        entityType: "receipt-expectation",
        entityId: overdue.expectation.id,
        destination: "execution",
      });
      continue;
    }
    if (schedule.status === "over-scheduled") {
      add({
        key: `receipt-schedule-over-${outcome.id}`,
        severity: "critical",
        title: "The committed-capital arrival schedule no longer reconciles",
        reason: `Remaining active arrival expectations exceed the remaining unreceived commitment by ${schedule.overScheduledAmountCents} cents. Actual cash receipt is authoritative; only explicitly allocated receipts reduce a specific expectation.`,
        nextStep: "Explicitly allocate known receipts to the expectation they fulfilled, or correct/cancel the stale expectation if the payer schedule changed.",
        track: outcome.track,
        entityType: "funding-outcome",
        entityId: outcome.id,
        destination: "execution",
      });
      continue;
    }
    if (schedule.status === "unscheduled" || schedule.status === "partial") {
      add({
        key: `receipt-schedule-gap-${outcome.id}`,
        severity: "high",
        title: schedule.status === "unscheduled" ? "Committed capital has no recorded arrival date" : "Part of the committed capital has no arrival date",
        reason: schedule.status === "unscheduled"
          ? `${schedule.outstandingAmountCents} cents is committed but no remaining explicit payer-provided or closing-supported receipt amount/date is recorded.`
          : `${schedule.unscheduledAmountCents} cents of the remaining commitment is not covered by a remaining explicit arrival expectation.`,
        nextStep: "Record only an explicit expected receipt amount/date, the source/basis for that expectation, and the person responsible for following the transfer.",
        track: outcome.track,
        entityType: "funding-outcome",
        entityId: outcome.id,
        destination: "execution",
      });
      continue;
    }
    const waiting = active.find((item) => item.fulfillment.remainingAmountCents > 0);
    if (schedule.status === "balanced" && waiting) {
      add({
        key: `receipt-schedule-waiting-${waiting.expectation.id}`,
        severity: "normal",
        title: "Committed capital is scheduled but has not fully arrived yet",
        reason: `${waiting.fulfillment.remainingAmountCents} cents remains on the explicit ${waiting.expectation.expectedDate} arrival expectation after ${waiting.fulfillment.allocatedAmountCents} cents of actual cash was explicitly allocated to it. This is not a guarantee of future receipt.`,
        nextStep: "Keep the recorded arrival checkpoint current. Record actual cash first, then explicitly allocate it to this expectation only when the relationship is known.",
        track: outcome.track,
        entityType: "receipt-expectation",
        entityId: waiting.expectation.id,
        destination: "execution",
      });
    }
  }

  if (input.committedNotReceivedCents > outcomeOutstandingTotal) {
    add({
      key: "committed-not-received",
      severity: "high",
      title: "Committed capital outside Funding Outcomes has not fully arrived",
      reason: "Some committed capital is still represented by the existing round-level aggregate rather than a Funding Outcome arrival schedule, so it does not yet reduce cash risk the same way banked funds do.",
      nextStep: "Confirm the underlying closing evidence and move the financing into a Funding Outcome before relying on an explicit receipt schedule.",
      track: null,
      entityType: null,
      entityId: null,
      destination: "execution",
    });
  }

  const activeInvestors = input.investors.filter((item) => !terminalInvestorStages.has(item.stage) && !resolvedInvestorIds.has(item.id));
  const hasSource = viableOpportunities.length > 0 || activeInvestors.length > 0 || activeActions.length > 0;
  if (input.profile && input.goal?.targetAmountCents && !hasSource) {
    add({
      key: "no-capital-source",
      severity: "high",
      title: "No capital source is being worked",
      reason: "The funding target exists, but there is no Grant, Debt or Equity source in the pipeline to close it.",
      nextStep: "Search an approved source or add the first credible Grant, Debt or Equity target.",
      track: null,
      entityType: null,
      entityId: null,
      destination: "opportunities",
    });
  }

  const selectedOpportunity = viableOpportunities.find((item) => item.decision === "pursuing" || item.decision === "saved");
  const selectedInvestor = activeInvestors.find((item) => selectedInvestorStages.has(item.stage));
  const hasDecision = Boolean(selectedOpportunity || selectedInvestor || activeActions.length > 0);
  if (hasSource && !hasDecision) {
    const firstOpportunity = viableOpportunities[0];
    add({
      key: "no-pursuit-decision",
      severity: "high",
      title: "Capital sources exist, but none has been chosen to pursue",
      reason: "Discovery alone does not move money. The owner still needs an explicit pursue/deprioritize decision.",
      nextStep: "Review fit evidence and choose the strongest financing target to pursue now.",
      track: firstOpportunity ? opportunityTrack(firstOpportunity) : "equity",
      entityType: firstOpportunity ? "opportunity" : selectedInvestor ? "investor" : null,
      entityId: firstOpportunity?.id ?? selectedInvestor?.id ?? null,
      destination: firstOpportunity ? "opportunities" : "equity",
    });
  }

  const hasExecution = activeActions.length > 0
    || activeApplications.length > 0
    || input.followUps.some((item) => item.status === "pending" && !resolvedInvestorIds.has(item.investorId))
    || input.meetings.some((item) => item.status === "scheduled" && !resolvedInvestorIds.has(item.investorId))
    || input.dueDiligenceRequests.some((item) => item.status !== "accepted" && !resolvedInvestorIds.has(item.investorId))
    || input.termSheets.some((item) => activeTermSheetStatuses.has(item.status) && !resolvedInvestorIds.has(item.investorId));
  if (hasDecision && !hasExecution) {
    add({
      key: "decision-without-execution",
      severity: "high",
      title: "A financing target was chosen, but no execution step is moving it",
      reason: "The owner has a target or investor relationship, but no application, action, follow-up, meeting, diligence request or active term sheet is recorded.",
      nextStep: "Create the first concrete financing action with an owner and dated next move.",
      track: selectedOpportunity ? opportunityTrack(selectedOpportunity) : "equity",
      entityType: selectedOpportunity ? "opportunity" : selectedInvestor ? "investor" : null,
      entityId: selectedOpportunity?.id ?? selectedInvestor?.id ?? null,
      destination: selectedOpportunity ? "opportunities" : "equity",
    });
  }

  for (const application of activeApplications.filter((item) => ["submitted", "under-review"].includes(item.status))) {
    add({
      key: `waiting-application-${application.id}`,
      severity: "normal",
      title: `${application.title} is waiting on an external decision`,
      reason: `The application is ${application.status.replaceAll("-", " ")} and funding cannot arrive until the external decision or requested next step occurs.`,
      nextStep: application.nextAction || "Record the next follow-up or expected decision checkpoint.",
      track: application.track,
      entityType: "funding-application",
      entityId: application.id,
      destination: "execution",
    });
  }

  for (const investor of activeInvestors.filter((item) => highValueInvestorStages.has(item.stage) && !item.nextFollowUpDate && !termSheetInvestorIds.has(item.id))) {
    add({
      key: `investor-undated-${investor.id}`,
      severity: "normal",
      title: `${investor.name} has no dated next move`,
      reason: `The investor is already at ${investor.stage.replaceAll("-", " ")}, but no next follow-up date is recorded.`,
      nextStep: investor.nextAction || "Record the next investor action and follow-up date.",
      track: "equity",
      entityType: "investor",
      entityId: investor.id,
      destination: "equity",
    });
  }

  return blockers
    .map((blocker, index) => ({ blocker, index }))
    .sort((left, right) => severityRank(right.blocker.severity) - severityRank(left.blocker.severity) || left.index - right.index)
    .map(({ blocker }) => blocker)
    .slice(0, 5);
}
