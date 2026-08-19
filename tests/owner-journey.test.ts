import test from "node:test";
import assert from "node:assert/strict";
import { projectOwnerJourney } from "../src/domain/owner-journey.ts";
import type {
  CapitalStrategy,
  CompanyProfile,
  ContinuityStatus,
  FundingApplication,
  FundingGoal,
  FundingOpportunity,
} from "../src/domain/types.ts";

const noBackup: ContinuityStatus = {
  schemaVersion: 7,
  accessMode: "local-loopback",
  exportAvailable: true,
  backupAvailable: true,
  restoreAvailable: true,
  latestBackup: null,
  backupCount: 0,
};

test("owner journey starts with the capital plan and gives one concrete next step", () => {
  const progress = projectOwnerJourney({
    profile: null,
    goal: null,
    strategy: null,
    strategyFreshness: { state: "not-created", reason: "No strategy yet.", generatedAt: null, currentNeedCents: 0, autoSyncEligible: false },
    opportunities: [],
    opportunityViability: [],
    investors: [],
    actions: [],
    applications: [],
    followUps: [],
    meetings: [],
    dueDiligenceRequests: [],
    termSheets: [],
    continuity: noBackup,
  });

  assert.equal(progress.completionPct, 0);
  assert.equal(progress.completedSteps, 0);
  assert.equal(progress.currentStepKey, "capital-plan");
  assert.match(progress.steps[0]?.nextStep ?? "", /complete company facts/i);
});

test("owner journey reaches 100 only when plan, target, decision, execution and recovery point exist", () => {
  const progress = projectOwnerJourney({
    profile: { name: "Northstar", id: 1 } as CompanyProfile,
    goal: { id: 1, targetAmountCents: 100_000_000 } as FundingGoal,
    strategy: { id: 1, allocations: [{ track: "grant" }] } as CapitalStrategy,
    strategyFreshness: { state: "current", reason: "Current.", generatedAt: "2026-08-15T12:00:00Z", currentNeedCents: 100_000_000, autoSyncEligible: true },
    opportunities: [{ id: 1, decision: "pursuing" } as FundingOpportunity],
    opportunityViability: [{ opportunityId: 1, deadlineState: "open", deadline: "2026-12-31", daysToDeadline: 100, deadlineViable: true, reason: "Open.", recovery: "Keep current." }],
    investors: [],
    actions: [],
    applications: [{ id: 1, status: "draft" } as FundingApplication],
    followUps: [],
    meetings: [],
    dueDiligenceRequests: [],
    termSheets: [],
    continuity: { ...noBackup, backupCount: 1, latestBackup: { fileName: "backup.sqlite", sizeBytes: 1, createdAt: "2026-08-15T12:00:00Z", kind: "manual" } },
  });

  assert.equal(progress.completionPct, 100);
  assert.equal(progress.completedSteps, 5);
  assert.equal(progress.currentStepKey, null);
  assert.ok(progress.steps.every((step) => step.complete));
});

test("owner journey reopens the capital-plan step when the stored strategy is stale", () => {
  const progress = projectOwnerJourney({
    profile: { name: "Northstar", id: 1 } as CompanyProfile,
    goal: { id: 1, targetAmountCents: 100_000_000 } as FundingGoal,
    strategy: { id: 1, allocations: [{ track: "grant" }] } as CapitalStrategy,
    strategyFreshness: { state: "recalculate", reason: "Facts changed.", generatedAt: "2026-08-15T12:00:00Z", currentNeedCents: 100_000_000, autoSyncEligible: true },
    opportunities: [{ id: 1, decision: "pursuing" } as FundingOpportunity],
    opportunityViability: [{ opportunityId: 1, deadlineState: "open", deadline: "2026-12-31", daysToDeadline: 100, deadlineViable: true, reason: "Open.", recovery: "Keep current." }],
    investors: [],
    actions: [],
    applications: [{ id: 1, status: "draft" } as FundingApplication],
    followUps: [],
    meetings: [],
    dueDiligenceRequests: [],
    termSheets: [],
    continuity: { ...noBackup, backupCount: 1, latestBackup: { fileName: "backup.sqlite", sizeBytes: 1, createdAt: "2026-08-15T12:00:00Z", kind: "manual" } },
  });

  assert.equal(progress.currentStepKey, "capital-plan");
  assert.equal(progress.steps[0]?.complete, false);
  assert.match(progress.steps[0]?.nextStep ?? "", /recalculate/i);
});
