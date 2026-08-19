import test from "node:test";
import assert from "node:assert/strict";
import { calculateDataRoomReadiness, compareTermSheets, standardDataRoomCategories } from "../src/domain/execution.ts";
import type { DataRoom, DataRoomDocument, DataRoomFolder, Investor, TermSheet } from "../src/domain/types.ts";

const now = new Date("2026-08-15T12:00:00Z");

function investor(id: number, name: string): Investor {
  return {
    id, name, fundId: null, roundId: null, stage: "term-sheet", priority: "high", relationship: "warm", warmIntroSource: "",
    chequeMinCents: 10_000_000, chequeMaxCents: 100_000_000, geography: "USA", sectors: "B2B software", stages: "seed",
    portfolio: "", lastContactDate: null, nextFollowUpDate: null, nextAction: "Review terms", owner: "Owner", notes: "",
    rejectionReason: "", createdAt: now.toISOString(), updatedAt: now.toISOString(),
  };
}

function term(id: number, investorId: number, overrides: Partial<TermSheet> = {}): TermSheet {
  return {
    id, investorId, roundId: null, investmentAmountCents: 50_000_000, preMoneyValuationCents: 450_000_000, equityPct: null,
    liquidationPreference: "1x non-participating", boardSeat: "Observer only", proRata: "Standard pro-rata", vesting: "",
    optionPool: "10% pre-money refresh", exclusivity: "30-day no-shop", closingConditions: "Standard diligence", targetCloseDate: null,
    status: "reviewing", notes: "", createdAt: now.toISOString(), updatedAt: now.toISOString(), ...overrides,
  };
}

test("data room readiness does not report 100% when most standard diligence categories are empty", () => {
  const room: DataRoom = { id: 1, name: "Seed Data Room", roundId: null, createdAt: now.toISOString(), updatedAt: now.toISOString() };
  const folders: DataRoomFolder[] = standardDataRoomCategories.map((category, index) => ({ id: index + 1, dataRoomId: 1, category, createdAt: now.toISOString() }));
  const documents: DataRoomDocument[] = [{ id: 1, folderId: 2, documentId: null, title: "2025 Financials", status: "ready", expiresAt: null, notes: "", createdAt: now.toISOString(), updatedAt: now.toISOString() }];
  const result = calculateDataRoomReadiness(room, folders, documents, now);
  assert.equal(result.completionPct, 13);
  assert.equal(result.readyDocuments, 1);
  assert.ok(result.categoryStatus.find((item) => item.category === "Corporate")?.missing === 1);
  assert.match(result.nextStep, /Corporate/i);
});

test("term sheet comparison estimates dilution but always requires lawyer review", () => {
  const comparison = compareTermSheets([
    term(1, 1),
    term(2, 2, { investmentAmountCents: 60_000_000, preMoneyValuationCents: 300_000_000, liquidationPreference: "2x participating", boardSeat: "Investor board control" }),
  ], [investor(1, "Northstar Ventures"), investor(2, "Harbor Capital")]);
  assert.equal(comparison.items.length, 2);
  assert.equal(comparison.lawyerReviewRequired, true);
  assert.match(comparison.disclaimer, /not legal advice/i);
  assert.ok((comparison.items[1]?.cautionFlags.length ?? 0) >= 2);
  assert.equal(comparison.items[0]?.estimatedOwnershipPct, 10);
});
