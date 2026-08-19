import test from "node:test";
import assert from "node:assert/strict";
import { projectOpportunityDeadlineViability } from "../src/domain/opportunity-viability.ts";
import { projectCapitalPipelineTruth } from "../src/domain/pipeline.ts";
import { chooseTodayFocus } from "../src/domain/focus.ts";
import { projectCapitalBlockers } from "../src/domain/blockers.ts";
import { projectOwnerJourney } from "../src/domain/owner-journey.ts";
import type {
  CapitalStrategy,
  CompanyProfile,
  ContinuityStatus,
  FundingApplication,
  FundingGoal,
  FundingOpportunity,
  OpportunityMatch,
} from "../src/domain/types.ts";

const now = new Date("2026-08-16T12:00:00.000Z");
const stamp = now.toISOString();

function opportunity(deadline: string | null, decision: FundingOpportunity["decision"] = "pursuing"): FundingOpportunity {
  return {
    id: 1, type: "grant", title: "Manufacturing grant", provider: "Agency", sourceUrl: "https://example.invalid/grant",
    description: "Grant opportunity", geography: "USA", sectors: "manufacturing", stages: "growth", amountMinCents: 10_000_000,
    amountMaxCents: 30_000_000, deadline, decision, grantProgramType: "innovation", grantEligibility: "Eligible manufacturers",
    matchFundingRequiredCents: 0, loanTermMonths: null, annualInterestRatePct: null, loanFeesCents: 0, minimumDscr: null,
    collateralRequired: false, personalGuaranteeRequired: false, investorId: null, fundId: null, investorType: "",
    createdAt: stamp, updatedAt: stamp,
  };
}

function profile(): CompanyProfile {
  return {
    id: 1, name: "Northstar", industry: "Manufacturing", stage: "growth", geography: "USA", foundedYear: 2022,
    annualRevenueCents: 100_000_000, mrrCents: 8_000_000, arrCents: 96_000_000, growthRatePct: 40, grossMarginPct: 55,
    cashBalanceCents: 20_000_000, monthlyBurnCents: 5_000_000, runwayMonths: 4, teamSize: 12,
    product: "Manufacturing automation software and hardware", businessModel: "Recurring", fundingHistory: "Founder funded", existingDebtCents: 0,
    capTableSummary: "Founders", useOfFunds: "Growth", targetFundingCents: 100_000_000, targetFundingDate: "2026-12-01", updatedAt: stamp,
  };
}

function goal(): FundingGoal {
  return { id: 1, targetAmountCents: 100_000_000, needByDate: "2026-12-01", purpose: "Growth", acceptsDilution: true, maxMonthlyDebtServiceCents: 1_000_000, growthPlan: "Expand", updatedAt: stamp };
}

const noBackup: ContinuityStatus = { schemaVersion: 7, accessMode: "local-loopback", exportAvailable: true, backupAvailable: true, restoreAvailable: true, latestBackup: null, backupCount: 0 };

test("opportunity deadline viability distinguishes undated, due-soon, open and passed states", () => {
  assert.equal(projectOpportunityDeadlineViability(opportunity(null), now).deadlineState, "undated");
  assert.equal(projectOpportunityDeadlineViability(opportunity("2026-08-20"), now).deadlineState, "due-soon");
  assert.equal(projectOpportunityDeadlineViability(opportunity("2026-10-01"), now).deadlineState, "open");
  const passed = projectOpportunityDeadlineViability(opportunity("2026-08-10"), now);
  assert.equal(passed.deadlineState, "deadline-passed");
  assert.equal(passed.deadlineViable, false);
  assert.match(passed.reason, /not counted as current In motion/i);
});

test("past-deadline pursued opportunity without an application is excluded from In motion", () => {
  const expired = opportunity("2026-08-10");
  const truth = projectCapitalPipelineTruth({ actions: [], opportunities: [expired], investors: [], followUps: [], applications: [], termSheets: [], outcomes: [], now });
  assert.equal(truth.totalInMotionCents, 0);
  assert.equal(truth.tracks.find((item) => item.track === "grant")?.activeCount, 0);
});

test("active application remains pipeline evidence after the linked opportunity deadline passes", () => {
  const expired = opportunity("2026-08-10");
  const application: FundingApplication = {
    id: 4, opportunityId: expired.id, track: "grant", title: "Submitted manufacturing grant", requestedAmountCents: 25_000_000,
    approvedAmountCents: 0, status: "under-review", deadline: "2026-08-10", submittedDate: "2026-08-08", decisionDate: null,
    owner: "Owner", nextAction: "Wait for award decision", rejectionReason: "", notes: "", createdAt: stamp, updatedAt: stamp,
  };
  const truth = projectCapitalPipelineTruth({ actions: [], opportunities: [expired], investors: [], followUps: [], applications: [application], termSheets: [], outcomes: [], now });
  assert.equal(truth.totalInMotionCents, 25_000_000);
  assert.deepEqual(truth.tracks.find((item) => item.track === "grant")?.evidenceKinds, ["application"]);
});

test("past-deadline pursuing opportunity becomes an urgent recovery focus even if its stored match is historically strong", () => {
  const expired = opportunity("2026-08-10");
  const historicalMatch: OpportunityMatch = {
    opportunityId: expired.id, fit: "strong", score: 90, rules: [], blockers: [], missingFacts: [], nextStep: "Submit the grant.", evaluatedAt: "2026-08-01T12:00:00.000Z",
  };
  const focus = chooseTodayFocus(profile(), goal(), [], now, [], [], [], [expired], [historicalMatch], [], [], [], []);
  assert.equal(focus.entityType, "opportunity");
  assert.equal(focus.entityId, expired.id);
  assert.equal(focus.urgency, "urgent");
  assert.match(focus.reason, /deadline passed/i);
  assert.doesNotMatch(focus.reason, /due in 0/i);
  assert.match(focus.nextStep, /extension|new cycle|refresh/i);
});

test("past-deadline pursuing opportunity becomes a critical blocker and does not satisfy current source viability", () => {
  const expired = opportunity("2026-08-10");
  const blockers = projectCapitalBlockers({
    profile: profile(), goal: goal(), remainingGapCents: 100_000_000, committedNotReceivedCents: 0, actions: [], opportunities: [expired],
    investors: [], followUps: [], meetings: [], applications: [], dueDiligenceRequests: [], termSheets: [], outcomes: [], now,
  });
  assert.equal(blockers[0]?.key, "opportunity-deadline-passed-1");
  assert.equal(blockers[0]?.severity, "critical");
  assert.equal(blockers.some((item) => item.key === "no-capital-source"), true);
});

test("expired-only opportunity does not complete Find money / Choose what to pursue in the current owner journey", () => {
  const expired = opportunity("2026-08-10");
  const viability = projectOpportunityDeadlineViability(expired, now);
  const progress = projectOwnerJourney({
    profile: profile(), goal: goal(), strategy: { id: 1, allocations: [{ track: "grant" }] } as CapitalStrategy,
    strategyFreshness: { state: "current", reason: "Current", generatedAt: stamp, currentNeedCents: 100_000_000, autoSyncEligible: true },
    opportunities: [expired], opportunityViability: [viability], investors: [], actions: [], applications: [], followUps: [], meetings: [], dueDiligenceRequests: [], termSheets: [], continuity: noBackup,
  });
  assert.equal(progress.steps.find((step) => step.key === "find-money")?.complete, false);
  assert.equal(progress.steps.find((step) => step.key === "decide")?.complete, false);
});
