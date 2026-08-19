import test from "node:test";
import assert from "node:assert/strict";
import { buildCapitalPipelineCsv, buildOwnerBoardSummaryMarkdown } from "../src/domain/reporting.ts";
import type {
  BootstrapState,
  FundingApplication,
  FundingOpportunity,
  FundingOutcome,
  FundingSourceRecord,
  Investor,
  OpportunityMatch,
} from "../src/domain/types.ts";

test("capital pipeline CSV exports owner-facing funding state with safe CSV escaping and provenance", () => {
  const opportunity = {
    id: 1,
    type: "grant",
    title: "Growth, Manufacturing Grant",
    provider: "Federal Agency",
    sourceUrl: "https://example.invalid/manual",
    amountMaxCents: 25_000_000,
    amountMinCents: 5_000_000,
    deadline: "2026-10-31",
    decision: "saved",
  } as FundingOpportunity;
  const source = {
    opportunityId: 1,
    canonicalUrl: "https://www.grants.gov/search-results-detail/363178",
  } as FundingSourceRecord;
  const match = { opportunityId: 1, nextStep: "Confirm eligibility, then assign the application." } as OpportunityMatch;
  const investor = {
    id: 2,
    name: "North, Capital",
    stage: "committed",
    chequeMaxCents: 50_000_000,
    nextFollowUpDate: "2026-08-20",
    nextAction: "Confirm closing checklist.",
  } as Investor;
  const application = {
    id: 3,
    track: "grant",
    title: "Federal application",
    status: "submitted",
    requestedAmountCents: 20_000_000,
    approvedAmountCents: 0,
    deadline: "2026-09-15",
    decisionDate: null,
    nextAction: "Wait for reviewer questions.",
  } as FundingApplication;
  const outcome = {
    id: 4,
    track: "grant",
    status: "won",
    approvedAmountCents: 20_000_000,
    committedAmountCents: 20_000_000,
    receivedAmountCents: 10_000_000,
    receivedDate: "2026-12-01",
    retryDate: null,
    lossReason: "",
    feedback: "",
    conditions: "Milestone reporting",
  } as FundingOutcome;

  const csv = buildCapitalPipelineCsv({
    opportunities: [opportunity],
    sources: [source],
    matches: [match],
    investors: [investor],
    applications: [application],
    outcomes: [outcome],
  });

  assert.match(csv, /^Category,Track,Item,Provider,Status,/);
  assert.match(csv, /"Growth, Manufacturing Grant"/);
  assert.match(csv, /"North, Capital"/);
  assert.match(csv, /250000\.00/);
  assert.match(csv, /100000\.00/);
  assert.match(csv, /https:\/\/www\.grants\.gov\/search-results-detail\/363178/);
  assert.match(csv, /Confirm eligibility, then assign the application\./);
  assert.equal(csv.endsWith("\r\n"), true);
});

test("owner/board summary exports capital truth, focus, execution counts and source provenance without model narration", () => {
  const state = {
    companyProfile: { name: "Northstar Robotics" },
    strategyFreshness: {
      state: "current",
      reason: "Capital strategy matches the current saved company facts, funding goal, constraints and timing rules.",
      generatedAt: "2026-08-15T11:00:00.000Z",
      currentNeedCents: 100_000_000,
      autoSyncEligible: true,
    },
    dashboard: {
      targetAmountCents: 100_000_000,
      receivedAmountCents: 20_000_000,
      committedAmountCents: 15_000_000,
      activePipelineCents: 80_000_000,
      remainingGapCents: 65_000_000,
      todayFocus: { title: "Submit grant package", reason: "Deadline is near.", nextStep: "Upload the signed budget." },
      capitalBlockers: [{ severity: "critical", title: "Grant package is overdue", reason: "The recorded deadline passed.", nextStep: "Confirm late-submission recovery." }],
      coveragePlan: {
        status: "pipeline-covered",
        targetAmountCents: 100_000_000,
        receivedAmountCents: 20_000_000,
        receivedCoveragePct: 20,
        cashStillToArriveCents: 80_000_000,
        committedAmountCents: 15_000_000,
        securedAmountCents: 35_000_000,
        securedCoveragePct: 35,
        inMotionAmountCents: 80_000_000,
        recordedCoverageCents: 115_000_000,
        recordedCoveragePct: 100,
        uncoveredAfterPipelineCents: 0,
        explanation: "Current recorded pipeline can cover the target on recorded amounts, but it is not assumed to close.",
        disclaimer: "In-motion capital is not a probability-weighted forecast, commitment, or guarantee.",
        closestToCash: [{
          key: "closing:term-sheet:1", track: "equity", amountCents: 30_000_000, evidenceKind: "term-sheet", status: "reviewing",
          title: "Atlas Ventures term sheet · reviewing", whyClose: "Term sheet is ordered by recorded stage, not probability.",
          remainingSteps: ["Resolve terms with counsel.", "Complete closing conditions."], entityType: "term-sheet", entityId: 1, destination: "execution",
        }],
      },
      timingPlan: {
        status: "runway-before-need",
        needByDate: "2026-10-15",
        daysUntilNeed: 61,
        runwayEstimateDate: "2026-09-16",
        runwayEstimateAsOf: "2026-08-16T08:00:00.000Z",
        daysUntilRunwayEstimate: 32,
        overdueMilestoneCount: 1,
        dueNext14DaysCount: 2,
        undatedActiveItemCount: 1,
        explanation: "The saved runway estimate reaches the runway date before the recorded capital need-by date.",
        disclaimer: "Runway date is based on saved company inputs and does not forecast cash flows or financing close dates.",
        milestones: [{ key: "funding-application-1", kind: "funding-application", date: "2026-08-20", daysAway: 5, title: "Submit grant package", track: "grant", status: "due-soon", entityType: "funding-application", entityId: 1, destination: "execution" }],
        undatedItems: [{ key: "term-sheet-1", title: "Atlas Ventures term sheet", reason: "Active Term Sheet has no dated next move.", track: "equity", entityType: "term-sheet", entityId: 1, destination: "execution" }],
      },
      tracks: [
        { track: "grant", potentialAmountCents: 20_000_000, activeCount: 1, risk: "Deadline is near.", nextStep: "Submit the package.", evidenceKinds: ["application"], pipelineExplanation: "Application replaces its linked opportunity." },
        { track: "debt", potentialAmountCents: 30_000_000, activeCount: 1, risk: "Confirm debt service.", nextStep: "Send statements.", evidenceKinds: ["funding-action"], pipelineExplanation: "Funding Action fallback." },
        { track: "equity", potentialAmountCents: 30_000_000, activeCount: 2, risk: "Two follow-ups pending.", nextStep: "Confirm partner meeting.", evidenceKinds: ["investor"], pipelineExplanation: "Investor evidence without a more specific term sheet." },
      ],
    },
    applications: [{ status: "submitted" }],
    dueDiligenceRequests: [{ status: "requested" }],
    investors: [{ id: 1, name: "Atlas Ventures", stage: "meeting" }],
    termSheets: [{ id: 1, investorId: 1, status: "reviewing" }],
    closingConditions: [{ id: 1, termSheetId: 1, title: "Execute definitive documents", owner: "Founder", dueDate: "2026-08-14", status: "in-progress", evidenceNote: "" }],
    opportunities: [{ id: 1, title: "Official Manufacturing Grant", decision: "saved", amountMaxCents: 20_000_000 }],
    opportunityMatches: [{ opportunityId: 1, fit: "strong", score: 88 }],
    opportunityViability: [{ opportunityId: 1, deadlineState: "open", deadline: "2026-10-01", daysToDeadline: 47, deadlineViable: true, reason: "Open.", recovery: "Keep current." }],
    fundingSources: [{ opportunityId: 1, sourceKind: "official-public", providerKey: "grants-gov" }],
    outcomes: [{ id: 1, track: "equity", status: "won", committedAmountCents: 10_000_000, receivedAmountCents: 10_000_000, commitmentEvidence: "", receiptEvidence: "" }],
    receiptTranches: [{ id: 1, outcomeId: 1, amountCents: 5_000_000, receivedDate: "2026-08-15", receiptEvidence: "", note: "", status: "received", voidReason: "" }],
    receiptExpectations: [{ id: 1, outcomeId: 1, amountCents: 30_000_000, expectedDate: "2026-08-20", basisNote: "Signed settlement schedule", owner: "Founder", note: "", status: "expected", cancellationReason: "" }],
    receiptExpectationAllocations: [{ id: 1, expectationId: 1, trancheId: 1, amountCents: 10_000_000, note: "Owner-confirmed allocation before bank correction", status: "active", voidReason: "" }],
    dataRoomReadiness: [{ completionPct: 75 }],
  } as unknown as BootstrapState;

  const summary = buildOwnerBoardSummaryMarkdown(state, new Date("2026-08-15T12:00:00Z"));
  assert.match(summary, /Northstar Robotics/);
  assert.match(summary, /Remaining gap: \*\*\$650,000\*\*/);
  assert.match(summary, /Submit grant package/);
  assert.match(summary, /Capital coverage and closing plan/);
  assert.match(summary, /Cash received coverage: \*\*20%\*\*/);
  assert.match(summary, /Received \+ committed coverage: \*\*35%\*\*/);
  assert.match(summary, /Recorded reach including current In motion: \*\*100%\*\*/);
  assert.match(summary, /Closest to cash/);
  assert.match(summary, /Atlas Ventures term sheet/);
  assert.match(summary, /not a probability-weighted forecast/i);
  assert.match(summary, /Funding Outcome evidence/);
  assert.match(summary, /Outcomes missing required commitment\/receipt evidence: \*\*1\*\*/);
  assert.match(summary, /Outcome #.*missing commitment \+ receipt \+ reconciliation evidence/i);
  assert.match(summary, /Receipt tranche reconciliation/);
  assert.match(summary, /Active receipt tranches: \*\*1\*\*/);
  assert.match(summary, /original \/ recorded expectation amount \*\*\$300,000\*\*/);
  assert.match(summary, /explicitly allocated actual cash \*\*\$100,000\*\*/);
  assert.match(summary, /remaining scheduled amount \*\*\$300,000\*\*/);
  assert.match(summary, /RECONCILIATION REQUIRED.*Allocation\(s\) 1/);
  assert.match(summary, /not a general accounting ledger/i);
  assert.match(summary, /Closing condition register/);
  assert.match(summary, /Overdue closing conditions: \*\*1\*\*/);
  assert.match(summary, /OVERDUE · Execute definitive documents/);
  assert.match(summary, /Funding Outcome remains the final financing state/i);
  assert.match(summary, /Capital timing and deadline discipline/);
  assert.match(summary, /Timing status: \*\*runway-before-need\*\*/);
  assert.match(summary, /Overdue milestones: \*\*1\*\*/);
  assert.match(summary, /Active items missing a date: \*\*1\*\*/);
  assert.match(summary, /Submit grant package/);
  assert.match(summary, /Atlas Ventures term sheet/);
  assert.match(summary, /does not forecast cash flows/i);
  assert.match(summary, /Capital strategy freshness/);
  assert.match(summary, /Strategy state: \*\*current\*\*/);
  assert.match(summary, /Current funding need: \*\*\$1,000,000\*\*/);
  assert.match(summary, /matches the current saved company facts/i);
  assert.match(summary, /Why capital has not arrived/);
  assert.match(summary, /CRITICAL · Grant package is overdue/);
  assert.match(summary, /Pipeline basis: application/);
  assert.match(summary, /Counting method: Application replaces its linked opportunity/);
  assert.match(summary, /Active applications: 1/);
  assert.match(summary, /Data room average readiness: 75%/);
  assert.match(summary, /Official Manufacturing Grant/);
  assert.match(summary, /official-public · grants-gov/);
  assert.match(summary, /not legal advice/i);
});
