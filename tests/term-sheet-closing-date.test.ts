import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import { ExecutionRepository } from "../src/server/execution-database.ts";
import type { BootstrapState, Investor, TermSheet } from "../src/domain/types.ts";

function datePlus(days: number): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

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

test("legacy term_sheet schema is migrated in place and preserves old records with a null target close date", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE term_sheet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      investor_id INTEGER NOT NULL,
      round_id INTEGER,
      investment_amount_cents INTEGER NOT NULL,
      pre_money_valuation_cents INTEGER,
      equity_pct REAL,
      liquidation_preference TEXT NOT NULL,
      board_seat TEXT NOT NULL,
      pro_rata TEXT NOT NULL,
      vesting TEXT NOT NULL,
      option_pool TEXT NOT NULL,
      exclusivity TEXT NOT NULL,
      closing_conditions TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO term_sheet (
      investor_id,round_id,investment_amount_cents,pre_money_valuation_cents,equity_pct,
      liquidation_preference,board_seat,pro_rata,vesting,option_pool,exclusivity,closing_conditions,status,notes,created_at,updated_at
    ) VALUES (1,NULL,50000000,450000000,NULL,'1x','Observer','Standard','','10%','30 days','Diligence','reviewing','','2026-08-01T00:00:00Z','2026-08-01T00:00:00Z');
  `);

  try {
    const repository = new ExecutionRepository(db);
    const columns = db.prepare("PRAGMA table_info(term_sheet)").all() as unknown as Array<{ name: string }>;
    assert.equal(columns.some((column) => column.name === "target_close_date"), true);
    const term = repository.listTermSheets()[0];
    assert.ok(term);
    assert.equal(term.investmentAmountCents, 50_000_000);
    assert.equal(term.targetCloseDate, null);
  } finally {
    db.close();
  }
});

test("real HTTP term sheet target close date drives focus, blockers and timing, then exits after Funding Outcome", async () => {
  const temp = mkdtempSync(join(tmpdir(), "bossai-funding-term-close-"));
  const databasePath = join(temp, "funding.sqlite");
  const repo = new FundingRepository(databasePath);
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    await json<BootstrapState>(baseUrl, "/api/company-profile", "PUT", {
      name: "Northstar Robotics", industry: "industrial automation", stage: "growth", geography: "California, USA", foundedYear: 2022,
      annualRevenueCents: 180_000_000, mrrCents: 15_000_000, arrCents: 180_000_000, growthRatePct: 62, grossMarginPct: 58,
      cashBalanceCents: 45_000_000, monthlyBurnCents: 12_000_000, runwayMonths: 4, teamSize: 18,
      product: "Automation hardware and workflow software", businessModel: "Hardware plus recurring software subscription",
      fundingHistory: "Founder funded and one seed note", existingDebtCents: 5_000_000,
      capTableSummary: "Founders 82%, seed note 18% as-converted estimate", useOfFunds: "Inventory and sales capacity",
      targetFundingCents: 100_000_000, targetFundingDate: datePlus(120),
    });
    await json<BootstrapState>(baseUrl, "/api/funding-goal", "PUT", {
      targetAmountCents: 100_000_000, needByDate: datePlus(120), purpose: "Inventory and sales capacity",
      acceptsDilution: true, maxMonthlyDebtServiceCents: 1_500_000, growthPlan: "Expand production capacity",
    });

    const investorResponse = await json<{ investor: Investor; state: BootstrapState }>(baseUrl, "/api/investors", "POST", {
      name: "Atlas Ventures", fundId: null, roundId: null, stage: "term-sheet", priority: "high", relationship: "warm", warmIntroSource: "Founder",
      chequeMinCents: 40_000_000, chequeMaxCents: 50_000_000, geography: "USA", sectors: "industrial", stages: "growth", portfolio: "",
      lastContactDate: datePlus(-2), nextFollowUpDate: null, nextAction: "Close financing", owner: "Owner", notes: "", rejectionReason: "",
    });
    const targetCloseDate = datePlus(5);
    const termResponse = await json<{ termSheet: TermSheet; state: BootstrapState }>(baseUrl, "/api/term-sheets", "POST", {
      investorId: investorResponse.investor.id, roundId: null, investmentAmountCents: 50_000_000, preMoneyValuationCents: 450_000_000, equityPct: null,
      liquidationPreference: "1x non-participating", boardSeat: "Observer", proRata: "Standard", vesting: "", optionPool: "10%", exclusivity: "30 days",
      closingConditions: "Final legal review and wire instructions", targetCloseDate, status: "accepted", notes: "",
    });

    assert.equal(termResponse.termSheet.targetCloseDate, targetCloseDate);
    assert.equal(termResponse.state.dashboard.todayFocus.entityType, "term-sheet");
    assert.equal(termResponse.state.dashboard.todayFocus.workDueAt, targetCloseDate);
    assert.equal(termResponse.state.dashboard.timingPlan.milestones.some((item) => item.kind === "term-sheet-close" && item.entityId === termResponse.termSheet.id), true);
    assert.equal(termResponse.state.dashboard.timingPlan.undatedItems.some((item) => item.entityType === "term-sheet" && item.entityId === termResponse.termSheet.id), false);

    const overdueDate = datePlus(-1);
    const overdue = await json<{ termSheet: TermSheet; state: BootstrapState }>(baseUrl, `/api/term-sheets/${termResponse.termSheet.id}`, "PATCH", {
      ...termResponse.termSheet,
      targetCloseDate: overdueDate,
    });
    assert.equal(overdue.state.dashboard.todayFocus.entityType, "term-sheet");
    assert.equal(overdue.state.dashboard.todayFocus.urgency, "urgent");
    assert.match(overdue.state.dashboard.todayFocus.reason, /passed its recorded target close date/i);
    const blocker = overdue.state.dashboard.capitalBlockers.find((item) => item.entityType === "term-sheet" && item.entityId === termResponse.termSheet.id);
    assert.equal(blocker?.severity, "critical");
    assert.match(blocker?.reason ?? "", /target close date/i);
    assert.equal(overdue.state.dashboard.timingPlan.milestones.some((item) => item.kind === "term-sheet-close" && item.status === "overdue"), true);

    const outcome = await json<{ state: BootstrapState }>(baseUrl, "/api/outcomes", "POST", {
      track: "equity", applicationId: null, investorId: investorResponse.investor.id, roundId: null, status: "closed",
      approvedAmountCents: 50_000_000, committedAmountCents: 50_000_000, receivedAmountCents: 50_000_000, receivedDate: datePlus(0),
      commitmentEvidence: "Signed closing documents", receiptEvidence: "Bank receipt", conditions: "Closed", lossReason: "", feedback: "", retryDate: null,
    });
    assert.equal(outcome.state.dashboard.timingPlan.milestones.some((item) => item.entityType === "term-sheet" && item.entityId === termResponse.termSheet.id), false);
    assert.equal(outcome.state.dashboard.capitalBlockers.some((item) => item.entityType === "term-sheet" && item.entityId === termResponse.termSheet.id), false);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
    rmSync(temp, { recursive: true, force: true });
  }
});
