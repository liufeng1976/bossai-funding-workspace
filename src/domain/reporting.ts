import { isActiveClosingCondition, isClosingConditionOverdue } from "./closing-conditions.ts";
import { projectFundingReceiptSchedules } from "./arrival-schedule.ts";
import { projectFundingOutcomeEvidenceStatuses } from "./outcome-evidence.ts";
import { projectReceiptAllocationReconciliationIssues, projectReceiptExpectationFulfillments } from "./receipt-expectation-reconciliation.ts";
import { projectFundingOutcomeResolution } from "./resolution.ts";
import type {
  BootstrapState,
  FundingApplication,
  FundingOpportunity,
  FundingOutcome,
  FundingSourceRecord,
  Investor,
  OpportunityMatch,
} from "./types.ts";

const CSV_HEADERS = [
  "Category",
  "Track",
  "Item",
  "Provider",
  "Status",
  "Potential USD",
  "Committed USD",
  "Received USD",
  "Date",
  "Next Action",
  "Source",
] as const;

function csvCell(value: string | number): string {
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function usd(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2);
}

function markdownMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.max(0, cents) / 100);
}

export function buildOwnerBoardSummaryMarkdown(state: BootstrapState, generatedAt = new Date()): string {
  const companyName = state.companyProfile?.name || "Company not yet named";
  const resolution = projectFundingOutcomeResolution(state.applications, state.outcomes);
  const activeApplications = state.applications.filter((item) => !["funded", "rejected", "withdrawn"].includes(item.status) && !resolution.resolvedApplicationIds.has(item.id));
  const openDiligence = state.dueDiligenceRequests.filter((item) => item.status !== "accepted" && !resolution.resolvedInvestorIds.has(item.investorId));
  const activeInvestors = state.investors.filter((item) => !["closed", "passed", "no-response", "not-a-fit"].includes(item.stage) && !resolution.resolvedInvestorIds.has(item.id));
  const viabilityByOpportunityId = new Map(state.opportunityViability.map((item) => [item.opportunityId, item]));
  const pastDeadlinePursuits = state.opportunities.filter((item) => item.decision === "pursuing" && viabilityByOpportunityId.get(item.id)?.deadlineViable === false);
  const strongOpportunities = state.opportunities
    .map((opportunity) => ({ opportunity, match: state.opportunityMatches.find((match) => match.opportunityId === opportunity.id) }))
    .filter((item) => item.opportunity.decision !== "dismissed"
      && viabilityByOpportunityId.get(item.opportunity.id)?.deadlineViable !== false
      && !resolution.resolvedOpportunityIds.has(item.opportunity.id)
      && !(item.opportunity.investorId && resolution.resolvedInvestorIds.has(item.opportunity.investorId)))
    .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))
    .slice(0, 5);
  const wonOutcomes = state.outcomes.filter((item) => item.status === "won");
  const receivedFromOutcomes = wonOutcomes.reduce((sum, item) => sum + item.receivedAmountCents, 0);
  const dataRoomAverage = state.dataRoomReadiness.length
    ? Math.round(state.dataRoomReadiness.reduce((sum, item) => sum + item.completionPct, 0) / state.dataRoomReadiness.length)
    : 0;
  const termSheetById = new Map(state.termSheets.map((item) => [item.id, item]));
  const currentClosingConditions = state.closingConditions.filter((condition) => {
    const termSheet = termSheetById.get(condition.termSheetId);
    return Boolean(termSheet && !["rejected", "expired"].includes(termSheet.status) && !resolution.resolvedInvestorIds.has(termSheet.investorId));
  });
  const activeClosingConditions = currentClosingConditions.filter(isActiveClosingCondition);
  const overdueClosingConditions = activeClosingConditions.filter((condition) => isClosingConditionOverdue(condition, generatedAt));
  const undatedClosingConditions = activeClosingConditions.filter((condition) => !condition.dueDate);
  const clearedClosingConditions = currentClosingConditions.filter((condition) => !isActiveClosingCondition(condition));
  const receiptTranches = state.receiptTranches ?? [];
  const activeReceiptTranches = receiptTranches.filter((tranche) => tranche.status === "received");
  const voidedReceiptTranches = receiptTranches.filter((tranche) => tranche.status === "voided");
  const activeReceiptTrancheTotalCents = activeReceiptTranches.reduce((sum, tranche) => sum + tranche.amountCents, 0);
  const outcomeEvidence = projectFundingOutcomeEvidenceStatuses(state.outcomes, receiptTranches);
  const outcomeEvidenceMissing = outcomeEvidence.filter((item) => !item.complete);
  const receiptExpectations = state.receiptExpectations ?? [];
  const receiptExpectationAllocations = state.receiptExpectationAllocations ?? [];
  const receiptFulfillments = projectReceiptExpectationFulfillments(receiptExpectations, receiptExpectationAllocations, receiptTranches);
  const receiptAllocationIssues = projectReceiptAllocationReconciliationIssues(receiptExpectations, receiptExpectationAllocations, receiptTranches);
  const receiptSchedules = projectFundingReceiptSchedules(state.outcomes, receiptExpectations, generatedAt, receiptExpectationAllocations, receiptTranches);
  const arrivalSchedulesWithOutstanding = receiptSchedules.filter((item) => item.outstandingAmountCents > 0 || item.status === "over-scheduled" || item.status === "allocation-error");
  const overdueArrivalExpectationCount = receiptSchedules.reduce((sum, item) => sum + item.overdueExpectationCount, 0);
  const activeExpectationAllocations = receiptExpectationAllocations.filter((item) => item.status === "active");
  const voidedExpectationAllocations = receiptExpectationAllocations.filter((item) => item.status === "voided");
  const fulfilledExpectationCount = receiptFulfillments.filter((item) => item.status === "fulfilled").length;
  const allocationErrorCount = receiptFulfillments.filter((item) => item.status === "invalid-receipt" || item.status === "overallocated").length;
  const receiptFulfillmentByExpectationId = new Map(receiptFulfillments.map((item) => [item.expectationId, item]));
  const activeReceiptExpectationRows = receiptExpectations
    .filter((item) => item.status === "expected")
    .map((expectation) => ({ expectation, fulfillment: receiptFulfillmentByExpectationId.get(expectation.id) }))
    .filter((item): item is { expectation: typeof item.expectation; fulfillment: NonNullable<typeof item.fulfillment> } => Boolean(item.fulfillment));

  const lines: string[] = [
    "# BossAI Funding — Owner / Board Capital Summary",
    "",
    `**Company:** ${companyName}`,
    `**Generated:** ${generatedAt.toISOString()}`,
    "",
    "## Capital position",
    "",
    `- Target: **${markdownMoney(state.dashboard.targetAmountCents)}**`,
    `- Received: **${markdownMoney(state.dashboard.receivedAmountCents)}**`,
    `- Committed but not yet received: **${markdownMoney(state.dashboard.committedAmountCents)}**`,
    `- Active pipeline: **${markdownMoney(state.dashboard.activePipelineCents)}**`,
    `- Remaining gap: **${markdownMoney(state.dashboard.remainingGapCents)}**`,
    "",
    "## Funding Outcome evidence",
    "",
    `- Outcomes recorded: **${state.outcomes.length}**`,
    `- Outcomes missing required commitment/receipt evidence: **${outcomeEvidenceMissing.length}**`,
    ...(outcomeEvidenceMissing.length > 0
      ? outcomeEvidenceMissing.map((item) => `- Outcome #${item.outcomeId}: missing ${item.missing.join(" + ")} evidence.`)
      : ["- Every Outcome that records committed or received capital has the required evidence reference(s)."]),
    "",
    "Evidence references support the recorded financing state; they are not a substitute for the underlying legal, banking, or settlement records.",
    "",
    "## Receipt tranche reconciliation",
    "",
    `- Active receipt tranches: **${activeReceiptTranches.length}**`,
    `- Voided receipt tranches retained as history: **${voidedReceiptTranches.length}**`,
    `- Active tranche total: **${markdownMoney(activeReceiptTrancheTotalCents)}**`,
    ...(state.outcomes.filter((outcome) => outcome.receivedAmountCents > 0).length > 0
      ? state.outcomes.filter((outcome) => outcome.receivedAmountCents > 0).map((outcome) => {
          const evidence = outcomeEvidence.find((item) => item.outcomeId === outcome.id);
          return `- Outcome #${outcome.id}: received **${markdownMoney(outcome.receivedAmountCents)}** · active tranches **${markdownMoney(evidence?.receiptTrancheAmountCents ?? 0)}** · ${evidence?.receiptTrancheReconciled === false ? "RECONCILIATION REQUIRED" : "reconciled"}.`;
        })
      : ["- No received-capital tranche has been recorded yet."]),
    "",
    "Receipt tranches are financing receipt evidence, not a general accounting ledger. The Funding Outcome received total must reconcile to active tranches.",
    "",
    "## Committed capital arrival schedule",
    "",
    `- Active arrival expectations: **${receiptExpectations.filter((item) => item.status === "expected").length}**`,
    `- Cancelled expectations retained as history: **${receiptExpectations.filter((item) => item.status === "cancelled").length}**`,
    `- Overdue explicit arrival expectations: **${overdueArrivalExpectationCount}**`,
    `- Explicit active expectation→receipt allocations: **${activeExpectationAllocations.length}**`,
    `- Voided allocation links retained as history: **${voidedExpectationAllocations.length}**`,
    `- Expectations fully fulfilled by explicitly allocated receipts: **${fulfilledExpectationCount}**`,
    `- Allocation reconciliation errors: **${allocationErrorCount}**`,
    `- Explicit reconciliation repair constraints: **${receiptAllocationIssues.length}**`,
    ...(activeReceiptExpectationRows.length > 0
      ? activeReceiptExpectationRows.map(({ expectation, fulfillment }) => {
          const explicitAllocatedActualCents = fulfillment.allocatedAmountCents + fulfillment.invalidAllocatedAmountCents;
          const reconciliationRequired = fulfillment.status === "invalid-receipt" || fulfillment.status === "overallocated";
          return `- Expectation #${expectation.id}: original / recorded expectation amount **${markdownMoney(expectation.amountCents)}** · explicitly allocated actual cash **${markdownMoney(explicitAllocatedActualCents)}** · remaining scheduled amount **${markdownMoney(fulfillment.remainingAmountCents)}**${reconciliationRequired ? ` · **RECONCILIATION REQUIRED** · Allocation(s) ${fulfillment.reconciliationAllocationIds.join(", ") || "unknown"}` : ""}.`;
        })
      : ["- No active committed-capital arrival expectation is recorded."]),
    ...(arrivalSchedulesWithOutstanding.length > 0
      ? arrivalSchedulesWithOutstanding.map((schedule) => `- Outcome #${schedule.outcomeId}: outstanding **${markdownMoney(schedule.outstandingAmountCents)}** · remaining scheduled **${markdownMoney(schedule.activeExpectedAmountCents)}** · unscheduled **${markdownMoney(schedule.unscheduledAmountCents)}** · over-scheduled **${markdownMoney(schedule.overScheduledAmountCents)}** · ${schedule.status}${schedule.nextExpectedDate ? ` · next explicit date ${schedule.nextExpectedDate}` : ""}.`)
      : ["- No committed-but-unreceived Funding Outcome currently needs an arrival schedule."]),
    ...(receiptAllocationIssues.length > 0
      ? receiptAllocationIssues.map((issue) => `- **RECONCILIATION REQUIRED** · ${issue.reason} Minimum correction: **${markdownMoney(issue.requiredReductionCents)}** across Allocation(s) ${issue.allocationIds.join(", ") || "unknown"}. Recorded allocated: **${markdownMoney(issue.recordedAllocatedAmountCents)}** · supported by current fact: **${markdownMoney(issue.supportedAmountCents)}**.`)
      : ["- No explicit Allocation repair constraint is currently open."]),
    "",
    "Arrival expectations come only from explicit payer/closing/award evidence recorded by the owner. They are management checkpoints, not funding forecasts or guarantees. Actual cash exists only as Receipt Tranches. BossAI Funding never auto-matches a receipt to an expectation: an expectation is reduced only by an explicit owner-recorded allocation to the actual tranche that fulfilled it. When a repair constraint exists, BossAI Funding states the minimum amount that must be corrected but never chooses which owner-confirmed Allocation relationship to remove.",
    "",
    "## Capital coverage and closing plan",
    "",
    `- Cash received coverage: **${state.dashboard.coveragePlan.receivedCoveragePct}%**`,
    `- Received + committed coverage: **${state.dashboard.coveragePlan.securedCoveragePct}%**`,
    `- Recorded reach including current In motion: **${state.dashboard.coveragePlan.recordedCoveragePct}%**`,
    `- Cash still to arrive against target: **${markdownMoney(state.dashboard.coveragePlan.cashStillToArriveCents)}**`,
    `- Still uncovered after current pipeline: **${markdownMoney(state.dashboard.coveragePlan.uncoveredAfterPipelineCents)}**`,
    `- Coverage status: ${state.dashboard.coveragePlan.status}`,
    "",
    state.dashboard.coveragePlan.explanation,
    "",
    state.dashboard.coveragePlan.disclaimer,
    "",
    "### Closest to cash",
    "",
    ...(state.dashboard.coveragePlan.closestToCash.length > 0
      ? state.dashboard.coveragePlan.closestToCash.flatMap((item, index) => [
          `${index + 1}. **${item.title}** — ${markdownMoney(item.amountCents)} · ${item.evidenceKind} · ${item.status}`,
          `   - Why this is close: ${item.whyClose}`,
          ...item.remainingSteps.map((step) => `   - ${step}`),
        ])
      : ["No closing candidate is available from the current recorded financing evidence."]),
    "",
    "## Capital timing and deadline discipline",
    "",
    `- Timing status: **${state.dashboard.timingPlan.status}**`,
    `- Capital need-by date: **${state.dashboard.timingPlan.needByDate ?? "not recorded"}**`,
    `- Saved runway estimate date: **${state.dashboard.timingPlan.runwayEstimateDate ?? "not recorded"}**`,
    `- Runway estimate source time: **${state.dashboard.timingPlan.runwayEstimateAsOf ?? "not recorded"}**`,
    `- Overdue milestones: **${state.dashboard.timingPlan.overdueMilestoneCount}**`,
    `- Due in next 14 days: **${state.dashboard.timingPlan.dueNext14DaysCount}**`,
    `- Active items missing a date: **${state.dashboard.timingPlan.undatedActiveItemCount}**`,
    "",
    state.dashboard.timingPlan.explanation,
    "",
    state.dashboard.timingPlan.disclaimer,
    "",
    "### Next dated milestones",
    "",
    ...(state.dashboard.timingPlan.milestones.length > 0
      ? state.dashboard.timingPlan.milestones.map((item) => `- **${item.date} · ${item.title}** — ${item.status}, ${item.daysAway < 0 ? `${Math.abs(item.daysAway)} day(s) overdue` : `${item.daysAway} day(s) away`}.`)
      : ["No dated financing milestone is recorded yet."]),
    "",
    "### Active items missing a date",
    "",
    ...(state.dashboard.timingPlan.undatedItems.length > 0
      ? state.dashboard.timingPlan.undatedItems.map((item) => `- **${item.title}** — ${item.reason}`)
      : ["Every active high-value financing item currently has a recorded date or dated next move."]),
    "",
    "## Closing condition register",
    "",
    `- Active closing conditions: **${activeClosingConditions.length}**`,
    `- Overdue closing conditions: **${overdueClosingConditions.length}**`,
    `- Active conditions missing a due date: **${undatedClosingConditions.length}**`,
    `- Cleared conditions on current term sheets: **${clearedClosingConditions.length}**`,
    "",
    ...(activeClosingConditions.length > 0
      ? [...activeClosingConditions]
          .sort((left, right) => (left.dueDate ?? "9999-12-31").localeCompare(right.dueDate ?? "9999-12-31") || left.id - right.id)
          .map((condition) => {
            const termSheet = termSheetById.get(condition.termSheetId);
            const investor = termSheet ? state.investors.find((item) => item.id === termSheet.investorId) : null;
            const overdue = isClosingConditionOverdue(condition, generatedAt);
            return `- **${overdue ? "OVERDUE · " : ""}${condition.title}** — ${investor?.name ?? "Investor"}; ${condition.status}; owner ${condition.owner || "not recorded"}; due ${condition.dueDate ?? "not recorded"}.`;
          })
      : ["No active structured closing condition is recorded on the current unresolved term sheets."]),
    "",
    "Clearing the register does not itself prove legal closing or cash receipt. Funding Outcome remains the final financing state.",
    "",
    "## Capital strategy freshness",
    "",
    `- Strategy state: **${state.strategyFreshness.state}**`,
    `- Generated: **${state.strategyFreshness.generatedAt ?? "not calculated"}**`,
    `- Current funding need: **${markdownMoney(state.strategyFreshness.currentNeedCents)}**`,
    `- Automatic synchronization eligible: **${state.strategyFreshness.autoSyncEligible ? "yes" : "no"}**`,
    "",
    state.strategyFreshness.reason,
    "",
    "## Today's focus",
    "",
    `**${state.dashboard.todayFocus.title}**`,
    "",
    `${state.dashboard.todayFocus.reason}`,
    "",
    `Next action: ${state.dashboard.todayFocus.nextStep}`,
    "",
    "## Why capital has not arrived",
    "",
  ];

  if (state.dashboard.capitalBlockers.length === 0) {
    lines.push("No active capital blocker is visible from the recorded financing facts.", "");
  } else {
    for (const blocker of state.dashboard.capitalBlockers) {
      lines.push(`- **${blocker.severity.toUpperCase()} · ${blocker.title}** — ${blocker.reason} Next: ${blocker.nextStep}`);
    }
    lines.push("");
  }

  lines.push("## Capital tracks", "");

  for (const track of state.dashboard.tracks) {
    lines.push(`### ${track.track === "grant" ? "Grant" : track.track === "debt" ? "Debt" : "Equity"}`);
    lines.push(`- Potential in motion: ${markdownMoney(track.potentialAmountCents)}`);
    lines.push(`- Active items: ${track.activeCount}`);
    lines.push(`- Pipeline basis: ${track.evidenceKinds.length ? track.evidenceKinds.join(" + ") : "none"}`);
    lines.push(`- Counting method: ${track.pipelineExplanation}`);
    lines.push(`- Risk: ${track.risk}`);
    lines.push(`- Next: ${track.nextStep}`);
    lines.push("");
  }

  lines.push("## Execution snapshot", "");
  lines.push(`- Active applications: ${activeApplications.length}`);
  lines.push(`- Active investors: ${activeInvestors.length}`);
  lines.push(`- Resolved application links: ${resolution.resolvedApplicationIds.size}`);
  lines.push(`- Resolved investor links: ${resolution.resolvedInvestorIds.size}`);
  lines.push(`- Open due diligence requests: ${openDiligence.length}`);
  lines.push(`- Data room average readiness: ${dataRoomAverage}%`);
  lines.push(`- Won funding outcomes recorded: ${wonOutcomes.length}`);
  lines.push(`- Received capital recorded in Won outcomes: ${markdownMoney(receivedFromOutcomes)}`);
  lines.push("");

  lines.push("## Opportunity deadline viability", "");
  lines.push(`- Past-deadline pursued opportunities excluded from current pipeline: ${pastDeadlinePursuits.length}`);
  if (pastDeadlinePursuits.length > 0) {
    for (const opportunity of pastDeadlinePursuits) {
      const viability = viabilityByOpportunityId.get(opportunity.id);
      lines.push(`- **${opportunity.title}** — ${viability?.reason ?? "Recorded deadline passed."} Recovery: ${viability?.recovery ?? "Confirm a current cycle or dismiss the opportunity."}`);
    }
  }
  lines.push("");

  lines.push("## Top opportunities", "");
  if (strongOpportunities.length === 0) {
    lines.push("No active opportunity has been evaluated yet.", "");
  } else {
    for (const { opportunity, match } of strongOpportunities) {
      const source = state.fundingSources.find((item) => item.opportunityId === opportunity.id);
      const sourceLabel = source ? `${source.sourceKind} · ${source.providerKey}` : "manual / source not recorded";
      lines.push(`- **${opportunity.title}** — ${match?.fit ?? "not evaluated"} fit (${match?.score ?? 0}/100), ${markdownMoney(opportunity.amountMaxCents)} max, decision: ${opportunity.decision}. Source: ${sourceLabel}.`);
    }
    lines.push("");
  }

  lines.push("## Decision notes", "");
  lines.push("- Matching scores are auxiliary; the recorded rule explanations and official source terms remain authoritative for the decision.");
  lines.push("- Term sheet comparisons are not legal advice and material legal terms require qualified counsel review.");
  lines.push("- This summary is generated from the current BossAI Funding database facts; it does not replace source documents or professional advice.");
  lines.push("");
  return lines.join("\n");
}

export function buildCapitalPipelineCsv(input: {
  opportunities: FundingOpportunity[];
  sources: FundingSourceRecord[];
  matches: OpportunityMatch[];
  investors: Investor[];
  applications: FundingApplication[];
  outcomes: FundingOutcome[];
}): string {
  const rows: Array<Array<string | number>> = [Array.from(CSV_HEADERS)];

  for (const opportunity of input.opportunities) {
    const source = input.sources.find((item) => item.opportunityId === opportunity.id);
    const match = input.matches.find((item) => item.opportunityId === opportunity.id);
    rows.push([
      "Opportunity",
      opportunity.type === "loan" ? "Debt" : opportunity.type === "grant" ? "Grant" : "Equity",
      opportunity.title,
      opportunity.provider,
      opportunity.decision,
      usd(opportunity.amountMaxCents),
      "0.00",
      "0.00",
      opportunity.deadline ?? "",
      match?.nextStep ?? "",
      source?.canonicalUrl || opportunity.sourceUrl,
    ]);
  }

  for (const investor of input.investors) {
    rows.push([
      "Investor",
      "Equity",
      investor.name,
      "",
      investor.stage,
      usd(investor.chequeMaxCents),
      "0.00",
      "0.00",
      investor.nextFollowUpDate ?? "",
      investor.nextAction,
      "",
    ]);
  }

  for (const application of input.applications) {
    rows.push([
      "Application",
      application.track === "debt" ? "Debt" : application.track === "grant" ? "Grant" : "Equity",
      application.title,
      "",
      application.status,
      usd(application.requestedAmountCents),
      "0.00",
      "0.00",
      application.deadline ?? application.decisionDate ?? "",
      application.nextAction,
      "",
    ]);
  }

  for (const outcome of input.outcomes) {
    rows.push([
      "Outcome",
      outcome.track === "debt" ? "Debt" : outcome.track === "grant" ? "Grant" : "Equity",
      `${outcome.track.toUpperCase()} funding outcome`,
      "",
      outcome.status,
      usd(outcome.approvedAmountCents),
      usd(outcome.committedAmountCents),
      usd(outcome.receivedAmountCents),
      outcome.receivedDate ?? outcome.retryDate ?? "",
      outcome.status === "lost" ? outcome.lossReason || outcome.feedback : outcome.conditions,
      "",
    ]);
  }

  return `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
