import test from "node:test";
import assert from "node:assert/strict";
import { projectCapitalCoveragePlan } from "../src/domain/closing.ts";
import type { CapitalPipelineItem, ClosingCondition } from "../src/domain/types.ts";

const stamp = "2026-08-16T12:00:00.000Z";

function item(overrides: Partial<CapitalPipelineItem> = {}): CapitalPipelineItem {
  return {
    key: "application:1",
    track: "grant",
    kind: "application",
    amountCents: 30_000_000,
    label: "Manufacturing grant application · under-review",
    status: "under-review",
    risk: "External review is active.",
    nextStep: "Respond to reviewer questions.",
    entityType: "funding-application",
    entityId: 1,
    destination: "execution",
    updatedAt: stamp,
    ...overrides,
  };
}

test("coverage separates cash received, committed capital, and unguaranteed in-motion reach", () => {
  const plan = projectCapitalCoveragePlan({
    targetAmountCents: 100_000_000,
    receivedAmountCents: 20_000_000,
    committedAmountCents: 15_000_000,
    inMotionItems: [item({ amountCents: 80_000_000 })],
  });
  assert.equal(plan.receivedCoveragePct, 20);
  assert.equal(plan.securedCoveragePct, 35);
  assert.equal(plan.recordedCoveragePct, 100);
  assert.equal(plan.cashStillToArriveCents, 80_000_000);
  assert.equal(plan.uncoveredAfterPipelineCents, 0);
  assert.equal(plan.status, "pipeline-covered");
  assert.match(plan.explanation, /not assumed to close/i);
  assert.match(plan.disclaimer, /not a probability-weighted forecast/i);
});

test("coverage exposes the remaining shortfall even if every current in-motion item closed", () => {
  const plan = projectCapitalCoveragePlan({
    targetAmountCents: 100_000_000,
    receivedAmountCents: 10_000_000,
    committedAmountCents: 10_000_000,
    inMotionItems: [item({ amountCents: 30_000_000 })],
  });
  assert.equal(plan.status, "pipeline-shortfall");
  assert.equal(plan.recordedCoveragePct, 50);
  assert.equal(plan.uncoveredAfterPipelineCents, 50_000_000);
  assert.match(plan.explanation, /still leave part of the target uncovered/i);
});

test("recorded commitment ranks ahead of in-motion items because it is already committed but not received", () => {
  const plan = projectCapitalCoveragePlan({
    targetAmountCents: 100_000_000,
    receivedAmountCents: 10_000_000,
    committedAmountCents: 20_000_000,
    inMotionItems: [
      item({
        key: "term-sheet:7",
        track: "equity",
        kind: "term-sheet",
        amountCents: 50_000_000,
        label: "Atlas Ventures term sheet · accepted",
        status: "accepted",
        entityType: "term-sheet",
        entityId: 7,
      }),
      item(),
    ],
  });
  assert.equal(plan.closestToCash[0]?.evidenceKind, "recorded-commitment");
  assert.equal(plan.closestToCash[1]?.evidenceKind, "term-sheet");
  assert.equal(plan.closestToCash[1]?.entityId, 7);
  assert.match(plan.closestToCash[1]?.remainingSteps.join(" ") ?? "", /closing conditions/i);
});

test("accepted term sheet is closer to cash than an approved application without claiming higher success probability", () => {
  const plan = projectCapitalCoveragePlan({
    targetAmountCents: 100_000_000,
    receivedAmountCents: 0,
    committedAmountCents: 0,
    inMotionItems: [
      item({ key: "application:2", amountCents: 40_000_000, status: "approved", entityId: 2 }),
      item({
        key: "term-sheet:3",
        track: "equity",
        kind: "term-sheet",
        amountCents: 50_000_000,
        label: "Atlas Ventures term sheet · accepted",
        status: "accepted",
        entityType: "term-sheet",
        entityId: 3,
      }),
    ],
  });
  assert.equal(plan.closestToCash[0]?.evidenceKind, "term-sheet");
  assert.match(plan.closestToCash[0]?.whyClose ?? "", /not predicted success probability/i);
  assert.equal(plan.closestToCash[1]?.evidenceKind, "application");
});

test("term-sheet closing plan uses structured active conditions instead of generic template steps", () => {
  const closingConditions: ClosingCondition[] = [
    { id: 2, termSheetId: 3, title: "Confirm wire instructions", owner: "CFO", dueDate: "2026-08-20", status: "open", evidenceNote: "", createdAt: stamp, updatedAt: stamp },
    { id: 1, termSheetId: 3, title: "Execute definitive documents", owner: "Founder", dueDate: "2026-08-18", status: "in-progress", evidenceNote: "", createdAt: stamp, updatedAt: stamp },
  ];
  const plan = projectCapitalCoveragePlan({
    targetAmountCents: 100_000_000,
    receivedAmountCents: 0,
    committedAmountCents: 0,
    inMotionItems: [item({ key: "term-sheet:3", track: "equity", kind: "term-sheet", amountCents: 50_000_000, label: "Atlas Ventures term sheet · accepted", status: "accepted", entityType: "term-sheet", entityId: 3 })],
    closingConditions,
  });
  const closest = plan.closestToCash[0];
  assert.match(closest?.whyClose ?? "", /2 structured closing condition/i);
  assert.match(closest?.remainingSteps[0] ?? "", /Execute definitive documents.*Founder.*2026-08-18/i);
  assert.match(closest?.remainingSteps[1] ?? "", /Confirm wire instructions.*CFO.*2026-08-20/i);
  assert.match(closest?.remainingSteps.join(" ") ?? "", /counsel/i);
  assert.match(closest?.remainingSteps.join(" ") ?? "", /closing evidence/i);
});

test("cleared closing register does not make Closest to cash claim the Term Sheet has closed", () => {
  const closingConditions: ClosingCondition[] = [
    { id: 1, termSheetId: 3, title: "Execute definitive documents", owner: "Founder", dueDate: "2026-08-18", status: "satisfied", evidenceNote: "Signed documents stored.", createdAt: stamp, updatedAt: stamp },
    { id: 2, termSheetId: 3, title: "Confirm wire instructions", owner: "CFO", dueDate: "2026-08-20", status: "waived", evidenceNote: "Investor confirmed no separate instruction condition.", createdAt: stamp, updatedAt: stamp },
  ];
  const plan = projectCapitalCoveragePlan({
    targetAmountCents: 100_000_000,
    receivedAmountCents: 0,
    committedAmountCents: 0,
    inMotionItems: [item({ key: "term-sheet:3", track: "equity", kind: "term-sheet", amountCents: 50_000_000, label: "Atlas Ventures term sheet · accepted", status: "accepted", entityType: "term-sheet", entityId: 3 })],
    closingConditions,
  });
  const closest = plan.closestToCash[0];
  assert.match(closest?.whyClose ?? "", /All 2 recorded structured closing condition/i);
  assert.match(closest?.remainingSteps.join(" ") ?? "", /does not.*closing|Do not infer closing/i);
  assert.match(closest?.remainingSteps.join(" ") ?? "", /Funding Outcome/i);
});

test("term sheet without a structured register explicitly asks the owner to create one", () => {
  const plan = projectCapitalCoveragePlan({
    targetAmountCents: 100_000_000,
    receivedAmountCents: 0,
    committedAmountCents: 0,
    inMotionItems: [item({ key: "term-sheet:3", track: "equity", kind: "term-sheet", amountCents: 50_000_000, label: "Atlas Ventures term sheet · accepted", status: "accepted", entityType: "term-sheet", entityId: 3 })],
    closingConditions: [],
  });
  const closest = plan.closestToCash[0];
  assert.match(closest?.whyClose ?? "", /No structured Closing Condition Register/i);
  assert.match(closest?.remainingSteps[0] ?? "", /Record the material closing conditions/i);
});

test("received plus committed can secure the target without pretending the cash has already arrived", () => {
  const plan = projectCapitalCoveragePlan({
    targetAmountCents: 100_000_000,
    receivedAmountCents: 40_000_000,
    committedAmountCents: 60_000_000,
    inMotionItems: [item({ amountCents: 30_000_000 })],
  });
  assert.equal(plan.status, "secured");
  assert.equal(plan.receivedCoveragePct, 40);
  assert.equal(plan.securedCoveragePct, 100);
  assert.equal(plan.cashStillToArriveCents, 60_000_000);
  assert.equal(plan.closestToCash[0]?.evidenceKind, "recorded-commitment");
  assert.match(plan.explanation, /committed capital still has to become cash received/i);
});

test("cash received covering the target produces no artificial closing candidate", () => {
  const plan = projectCapitalCoveragePlan({
    targetAmountCents: 100_000_000,
    receivedAmountCents: 100_000_000,
    committedAmountCents: 25_000_000,
    inMotionItems: [item({ amountCents: 80_000_000 })],
  });
  assert.equal(plan.status, "cash-covered");
  assert.equal(plan.receivedCoveragePct, 100);
  assert.equal(plan.cashStillToArriveCents, 0);
  assert.deepEqual(plan.closestToCash, []);
});

test("missing target does not fabricate coverage percentages", () => {
  const plan = projectCapitalCoveragePlan({
    targetAmountCents: 0,
    receivedAmountCents: 20_000_000,
    committedAmountCents: 10_000_000,
    inMotionItems: [item()],
  });
  assert.equal(plan.status, "no-target");
  assert.equal(plan.receivedCoveragePct, 0);
  assert.equal(plan.securedCoveragePct, 0);
  assert.equal(plan.recordedCoveragePct, 0);
  assert.match(plan.explanation, /Set the funding target/i);
});
