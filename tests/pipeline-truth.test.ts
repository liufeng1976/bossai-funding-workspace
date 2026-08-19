import test from "node:test";
import assert from "node:assert/strict";
import { projectCapitalCoveragePlan } from "../src/domain/closing.ts";
import { projectCapitalPipelineTruth } from "../src/domain/pipeline.ts";
import type {
  FundingAction,
  FundingApplication,
  FundingOpportunity,
  FundingOutcome,
  Investor,
  InvestorFollowUp,
  TermSheet,
} from "../src/domain/types.ts";

const stamp = "2026-08-16T12:00:00.000Z";

function action(id: number, track: "grant" | "debt" | "equity", amountCents: number): FundingAction {
  return {
    id,
    track,
    title: `${track} action ${id}`,
    amountCents,
    stage: "prepare",
    priority: "high",
    deadline: "2026-09-01",
    nextStep: "Advance the financing package.",
    owner: "Owner",
    result: "",
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function opportunity(id: number, type: "grant" | "loan" | "investor", amountMaxCents: number, investorId: number | null = null): FundingOpportunity {
  return {
    id,
    type,
    title: `${type} opportunity ${id}`,
    provider: "Provider",
    sourceUrl: "https://example.invalid/source",
    description: "Recorded opportunity.",
    geography: "USA",
    sectors: "industrial automation",
    stages: "growth",
    amountMinCents: 0,
    amountMaxCents,
    deadline: "2026-10-01",
    decision: "pursuing",
    grantProgramType: "",
    grantEligibility: "",
    matchFundingRequiredCents: 0,
    loanTermMonths: null,
    annualInterestRatePct: null,
    loanFeesCents: 0,
    minimumDscr: null,
    collateralRequired: false,
    personalGuaranteeRequired: false,
    investorId,
    fundId: null,
    investorType: "",
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function application(id: number, track: "grant" | "debt" | "equity", opportunityId: number | null, requested: number, approved = 0, updatedAt = stamp): FundingApplication {
  return {
    id,
    opportunityId,
    track,
    title: `${track} application ${id}`,
    requestedAmountCents: requested,
    approvedAmountCents: approved,
    status: approved > 0 ? "approved" : "preparing",
    deadline: "2026-09-15",
    submittedDate: null,
    decisionDate: null,
    owner: "Owner",
    nextAction: "Advance application.",
    rejectionReason: "",
    notes: "",
    createdAt: stamp,
    updatedAt,
  };
}

function investor(id: number, chequeMaxCents: number): Investor {
  return {
    id,
    name: `Investor ${id}`,
    fundId: null,
    roundId: null,
    stage: "meeting",
    priority: "high",
    relationship: "warm",
    warmIntroSource: "Customer CEO",
    chequeMinCents: 10_000_000,
    chequeMaxCents,
    geography: "USA",
    sectors: "industrial automation",
    stages: "growth",
    portfolio: "",
    lastContactDate: "2026-08-15",
    nextFollowUpDate: null,
    nextAction: "Prepare the next investor step.",
    owner: "Owner",
    notes: "",
    rejectionReason: "",
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function termSheet(id: number, investorId: number, amountCents: number, updatedAt = stamp): TermSheet {
  return {
    id,
    investorId,
    roundId: null,
    investmentAmountCents: amountCents,
    preMoneyValuationCents: 400_000_000,
    equityPct: null,
    liquidationPreference: "1x non-participating",
    boardSeat: "Observer",
    proRata: "Standard",
    vesting: "",
    optionPool: "10% pre-money",
    exclusivity: "30-day no-shop",
    closingConditions: "Diligence",
    targetCloseDate: null,
    status: "reviewing",
    notes: "",
    createdAt: stamp,
    updatedAt,
  };
}

function followUp(id: number, investorId: number, dueDate: string): InvestorFollowUp {
  return {
    id,
    investorId,
    dueDate,
    status: "pending",
    channel: "email",
    action: `Follow up by ${dueDate}`,
    result: "",
    owner: "Owner",
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function outcome(id: number, track: "grant" | "debt" | "equity", applicationId: number | null, investorId: number | null): FundingOutcome {
  return {
    id,
    track,
    applicationId,
    investorId,
    roundId: null,
    status: "won",
    approvedAmountCents: 30_000_000,
    committedAmountCents: 30_000_000,
    receivedAmountCents: 10_000_000,
    receivedDate: "2026-08-16",
    commitmentEvidence: "Award notice",
    receiptEvidence: "Bank receipt",
    conditions: "",
    lossReason: "",
    feedback: "Awarded",
    retryDate: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function emptyInput() {
  return { actions: [], opportunities: [], investors: [], followUps: [], applications: [], termSheets: [], outcomes: [], now: new Date("2026-08-16T12:00:00.000Z") };
}

test("Funding Actions remain the fallback pipeline when no more-specific evidence exists", () => {
  const truth = projectCapitalPipelineTruth({
    ...emptyInput(),
    actions: [action(1, "grant", 20_000_000), action(2, "debt", 30_000_000), action(3, "equity", 50_000_000)],
  });
  assert.equal(truth.totalInMotionCents, 100_000_000);
  assert.deepEqual(truth.tracks.map((track) => track.evidenceKinds), [["funding-action"], ["funding-action"], ["funding-action"]]);
});

test("linked application replaces its opportunity and track actions instead of stacking all three layers", () => {
  const grant = opportunity(10, "grant", 30_000_000);
  const truth = projectCapitalPipelineTruth({
    ...emptyInput(),
    actions: [action(1, "grant", 20_000_000)],
    opportunities: [grant],
    applications: [application(20, "grant", grant.id, 25_000_000)],
  });
  const track = truth.tracks.find((item) => item.track === "grant");
  assert.equal(track?.potentialAmountCents, 25_000_000);
  assert.equal(track?.activeCount, 1);
  assert.deepEqual(track?.evidenceKinds, ["application"]);
});

test("approved application amount replaces the requested amount when approval is known", () => {
  const grant = opportunity(10, "grant", 30_000_000);
  const truth = projectCapitalPipelineTruth({
    ...emptyInput(),
    opportunities: [grant],
    applications: [application(20, "grant", grant.id, 30_000_000, 18_000_000)],
  });
  assert.equal(truth.tracks.find((item) => item.track === "grant")?.potentialAmountCents, 18_000_000);
});

test("term sheet replaces only its own investor while other active investors remain in equity pipeline", () => {
  const first = investor(1, 75_000_000);
  const second = investor(2, 80_000_000);
  const truth = projectCapitalPipelineTruth({
    ...emptyInput(),
    investors: [first, second],
    termSheets: [termSheet(11, first.id, 50_000_000)],
  });
  const equity = truth.tracks.find((item) => item.track === "equity");
  assert.equal(equity?.potentialAmountCents, 130_000_000);
  assert.equal(equity?.activeCount, 2);
  assert.deepEqual(new Set(equity?.evidenceKinds), new Set(["term-sheet", "investor"]));
});

test("multiple active term sheets for one investor use only the latest record", () => {
  const target = investor(1, 75_000_000);
  const truth = projectCapitalPipelineTruth({
    ...emptyInput(),
    investors: [target],
    termSheets: [
      termSheet(10, target.id, 40_000_000, "2026-08-15T12:00:00.000Z"),
      termSheet(11, target.id, 55_000_000, "2026-08-16T12:00:00.000Z"),
    ],
  });
  const equity = truth.tracks.find((item) => item.track === "equity");
  assert.equal(equity?.potentialAmountCents, 55_000_000);
  assert.equal(equity?.activeCount, 1);
});

test("multiple equity applications resolving to one linked investor do not double count that investor", () => {
  const target = investor(1, 75_000_000);
  const firstOpp = opportunity(31, "investor", 60_000_000, target.id);
  const secondOpp = opportunity(32, "investor", 65_000_000, target.id);
  const truth = projectCapitalPipelineTruth({
    ...emptyInput(),
    investors: [target],
    opportunities: [firstOpp, secondOpp],
    applications: [
      application(41, "equity", firstOpp.id, 50_000_000, 0, "2026-08-15T12:00:00.000Z"),
      application(42, "equity", secondOpp.id, 60_000_000, 0, "2026-08-16T12:00:00.000Z"),
    ],
  });
  const equity = truth.tracks.find((item) => item.track === "equity");
  assert.equal(equity?.potentialAmountCents, 60_000_000);
  assert.equal(equity?.activeCount, 1);
  assert.deepEqual(equity?.evidenceKinds, ["application"]);
});

test("resolved Funding Outcome removes the linked application and investor path from in-motion capital", () => {
  const grantOpportunity = opportunity(10, "grant", 30_000_000);
  const grantApplication = application(20, "grant", grantOpportunity.id, 30_000_000);
  const equityInvestor = investor(30, 75_000_000);
  const truth = projectCapitalPipelineTruth({
    ...emptyInput(),
    opportunities: [grantOpportunity],
    applications: [grantApplication],
    investors: [equityInvestor],
    termSheets: [termSheet(40, equityInvestor.id, 50_000_000)],
    outcomes: [
      outcome(1, "grant", grantApplication.id, null),
      outcome(2, "equity", null, equityInvestor.id),
    ],
  });
  assert.equal(truth.totalInMotionCents, 0);
  assert.equal(truth.items.length, 0);
  assert.equal(truth.tracks.find((item) => item.track === "grant")?.potentialAmountCents, 0);
  assert.equal(truth.tracks.find((item) => item.track === "equity")?.potentialAmountCents, 0);
});

test("moving a resolved application from pipeline into received/committed preserves recorded reach without double counting", () => {
  const grantOpportunity = opportunity(10, "grant", 30_000_000);
  const grantApplication = application(20, "grant", grantOpportunity.id, 30_000_000);
  const equityInvestor = investor(30, 75_000_000);
  const acceptedTerm = { ...termSheet(40, equityInvestor.id, 50_000_000), status: "accepted" as const };
  const beforeTruth = projectCapitalPipelineTruth({
    ...emptyInput(),
    opportunities: [grantOpportunity],
    applications: [grantApplication],
    investors: [equityInvestor],
    termSheets: [acceptedTerm],
  });
  const beforeCoverage = projectCapitalCoveragePlan({
    targetAmountCents: 100_000_000,
    receivedAmountCents: 0,
    committedAmountCents: 0,
    inMotionItems: beforeTruth.items,
  });

  const resolved = outcome(1, "grant", grantApplication.id, null);
  const afterTruth = projectCapitalPipelineTruth({
    ...emptyInput(),
    opportunities: [grantOpportunity],
    applications: [grantApplication],
    investors: [equityInvestor],
    termSheets: [acceptedTerm],
    outcomes: [resolved],
  });
  const afterCoverage = projectCapitalCoveragePlan({
    targetAmountCents: 100_000_000,
    receivedAmountCents: 10_000_000,
    committedAmountCents: 20_000_000,
    inMotionItems: afterTruth.items,
  });

  assert.equal(beforeTruth.totalInMotionCents, 80_000_000);
  assert.equal(afterTruth.totalInMotionCents, 50_000_000);
  assert.equal(beforeCoverage.recordedCoverageCents, 80_000_000);
  assert.equal(afterCoverage.recordedCoverageCents, 80_000_000);
  assert.equal(beforeCoverage.recordedCoveragePct, 80);
  assert.equal(afterCoverage.recordedCoveragePct, 80);
});

test("a resolved outcome disables generic Funding Action fallback on that track until specific new pipeline evidence exists", () => {
  const truth = projectCapitalPipelineTruth({
    ...emptyInput(),
    actions: [action(1, "grant", 20_000_000)],
    outcomes: [outcome(1, "grant", null, null)],
  });
  assert.equal(truth.tracks.find((item) => item.track === "grant")?.potentialAmountCents, 0);
  assert.equal(truth.items.length, 0);
});

test("pipeline truth exposes exact de-duplicated evidence records for closing-plan projection", () => {
  const grantOpportunity = opportunity(10, "grant", 30_000_000);
  const grantApplication = application(20, "grant", grantOpportunity.id, 25_000_000);
  const truth = projectCapitalPipelineTruth({
    ...emptyInput(),
    opportunities: [grantOpportunity],
    applications: [grantApplication],
  });
  assert.deepEqual(truth.items, [{
    key: "application:20",
    track: "grant",
    kind: "application",
    amountCents: 25_000_000,
    updatedAt: stamp,
    label: "grant application 20 · preparing",
    status: "preparing",
    risk: "grant application 20 is working toward 2026-09-15.",
    nextStep: "Advance application.",
    entityType: "funding-application",
    entityId: 20,
    destination: "execution",
  }]);
});

test("earliest pending investor follow-up drives the equity risk and next step", () => {
  const target = investor(1, 75_000_000);
  const truth = projectCapitalPipelineTruth({
    ...emptyInput(),
    investors: [target],
    followUps: [followUp(1, target.id, "2026-08-20"), followUp(2, target.id, "2026-08-18")],
  });
  const equity = truth.tracks.find((item) => item.track === "equity");
  assert.match(equity?.risk ?? "", /2026-08-18/);
  assert.match(equity?.nextStep ?? "", /2026-08-18/);
});
