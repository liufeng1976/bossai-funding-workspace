import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import type { BootstrapState, ClosingCondition, Investor, TermSheet } from "../src/domain/types.ts";

async function json<T>(baseUrl: string, path: string, method = "GET", body?: unknown): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`${baseUrl}${path}`, init);
  const payload = (await response.json()) as T & { error?: string };
  assert.equal(response.ok, true, payload.error ?? `${method} ${path} failed`);
  return payload;
}

function datePlus(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test("real HTTP closing-condition register drives focus, evidence validation, timing and Outcome resolution", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const investorResponse = await json<{ investor: Investor; state: BootstrapState }>(baseUrl, "/api/investors", "POST", {
      name: "Atlas Ventures", fundId: null, roundId: null, stage: "term-sheet", priority: "high", relationship: "warm", warmIntroSource: "Founder",
      chequeMinCents: 20_000_000, chequeMaxCents: 50_000_000, geography: "USA", sectors: "industrial", stages: "growth", portfolio: "",
      lastContactDate: null, nextFollowUpDate: null, nextAction: "Advance closing", owner: "Owner", notes: "", rejectionReason: "",
    });
    const investor = investorResponse.investor;

    const termResponse = await json<{ termSheet: TermSheet; state: BootstrapState }>(baseUrl, "/api/term-sheets", "POST", {
      investorId: investor.id, roundId: null, investmentAmountCents: 50_000_000, preMoneyValuationCents: 450_000_000, equityPct: null,
      liquidationPreference: "1x non-participating", boardSeat: "Observer", proRata: "Standard", vesting: "", optionPool: "10%", exclusivity: "30 days",
      closingConditions: "Execute definitive documents", targetCloseDate: datePlus(10), status: "accepted", notes: "",
    });

    const created = await json<{ closingCondition: ClosingCondition; state: BootstrapState }>(baseUrl, "/api/closing-conditions", "POST", {
      termSheetId: termResponse.termSheet.id, title: "Execute definitive documents", owner: "Founder", dueDate: datePlus(2), status: "in-progress", evidenceNote: "",
    });
    assert.equal(created.state.closingConditions.length, 1);
    assert.equal(created.state.dashboard.todayFocus.entityType, "closing-condition");
    assert.equal(created.state.dashboard.todayFocus.entityId, created.closingCondition.id);
    assert.equal(created.state.dashboard.todayFocus.workOwner, "Founder");
    assert.equal(created.state.dashboard.timingPlan.milestones.some((item) => item.kind === "closing-condition" && item.entityId === created.closingCondition.id), true);

    const invalidClear = await fetch(`${baseUrl}/api/closing-conditions/${created.closingCondition.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...created.closingCondition, status: "satisfied", evidenceNote: "" }),
    });
    assert.equal(invalidClear.status, 400);
    const invalidBody = await invalidClear.json() as { code?: string; field?: string };
    assert.equal(invalidBody.code, "VALIDATION_ERROR");
    assert.equal(invalidBody.field, "evidenceNote");
    const afterInvalid = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(afterInvalid.closingConditions[0]?.status, "in-progress");

    const cleared = await json<{ closingCondition: ClosingCondition; state: BootstrapState }>(baseUrl, `/api/closing-conditions/${created.closingCondition.id}`, "PATCH", {
      ...created.closingCondition, status: "satisfied", evidenceNote: "Definitive agreements executed by both sides.",
    });
    assert.equal(cleared.closingCondition.status, "satisfied");
    assert.equal(cleared.state.dashboard.todayFocus.entityType, "term-sheet");
    assert.equal(cleared.state.dashboard.capitalBlockers.some((item) => item.entityType === "closing-condition"), false);

    const reopened = await json<{ closingCondition: ClosingCondition; state: BootstrapState }>(baseUrl, `/api/closing-conditions/${created.closingCondition.id}`, "PATCH", {
      ...cleared.closingCondition, status: "open", evidenceNote: "Evidence later invalidated; re-opened for correction.", dueDate: datePlus(-1),
    });
    assert.equal(reopened.state.dashboard.todayFocus.entityType, "closing-condition");
    assert.equal(reopened.state.dashboard.todayFocus.urgency, "urgent");
    assert.equal(reopened.state.dashboard.capitalBlockers.some((item) => item.entityType === "closing-condition" && item.severity === "critical"), true);

    const outcome = await json<{ state: BootstrapState }>(baseUrl, "/api/outcomes", "POST", {
      track: "equity", applicationId: null, investorId: investor.id, roundId: null, status: "closed", approvedAmountCents: 50_000_000,
      committedAmountCents: 50_000_000, receivedAmountCents: 50_000_000, receivedDate: new Date().toISOString().slice(0, 10),
      commitmentEvidence: "Signed closing documents", receiptEvidence: "Bank receipt", conditions: "All closing conditions complete", lossReason: "", feedback: "", retryDate: null,
    });
    assert.equal(outcome.state.closingConditions.length, 1, "closing condition history must remain persisted");
    assert.notEqual(outcome.state.dashboard.todayFocus.entityType, "closing-condition");
    assert.equal(outcome.state.dashboard.capitalBlockers.some((item) => item.entityType === "closing-condition"), false);
    assert.equal(outcome.state.dashboard.timingPlan.milestones.some((item) => item.entityType === "closing-condition"), false);
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
    repo.close();
  }
});
