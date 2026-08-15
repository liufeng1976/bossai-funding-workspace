import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import type { BootstrapState } from "../src/domain/types.ts";

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

test("real HTTP entry persists the Phase 1 owner funding journey", async () => {
  const temp = mkdtempSync(join(tmpdir(), "bossai-funding-"));
  const databasePath = join(temp, "funding.sqlite");
  const repo = new FundingRepository(databasePath);
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));

  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 200);
    const html = await home.text();
    assert.match(html, /Capital Command Center/);
    assert.match(html, /TODAY'S FOCUS/);

    const initial = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(initial.companyProfile, null);
    assert.match(initial.dashboard.todayFocus.title, /company funding profile/i);

    await json<BootstrapState>(baseUrl, "/api/company-profile", "PUT", {
      name: "Northstar Robotics",
      industry: "Industrial automation",
      stage: "growth",
      geography: "California, USA",
      foundedYear: 2022,
      annualRevenueCents: 180_000_000,
      mrrCents: 15_000_000,
      arrCents: 180_000_000,
      growthRatePct: 62,
      grossMarginPct: 58,
      cashBalanceCents: 45_000_000,
      monthlyBurnCents: 12_000_000,
      runwayMonths: 3.75,
      teamSize: 18,
      product: "Automation hardware and workflow software for mid-market manufacturers.",
      businessModel: "Hardware plus recurring software subscription.",
      fundingHistory: "Founder funded and one seed note.",
      existingDebtCents: 5_000_000,
      capTableSummary: "Founders 82%, seed note 18% as-converted estimate.",
      useOfFunds: "Inventory, sales hires and certification.",
      targetFundingCents: 100_000_000,
      targetFundingDate: datePlus(150),
    });

    const goalState = await json<BootstrapState>(baseUrl, "/api/funding-goal", "PUT", {
      targetAmountCents: 100_000_000,
      needByDate: datePlus(150),
      purpose: "Inventory, sales capacity and certification.",
      acceptsDilution: true,
      maxMonthlyDebtServiceCents: 1_500_000,
      growthPlan: "Expand into two manufacturing regions.",
    });
    assert.equal(goalState.dashboard.targetAmountCents, 100_000_000);
    assert.match(goalState.dashboard.todayFocus.title, /first financing action/i);

    const roundResponse = await json<{ state: BootstrapState }>(baseUrl, "/api/rounds", "POST", {
      roundName: "Seed Round",
      roundType: "Seed Preferred",
      targetAmountCents: 100_000_000,
      minimumAmountCents: 50_000_000,
      committedAmountCents: 25_000_000,
      receivedAmountCents: 10_000_000,
      preMoneyValuationCents: 400_000_000,
      postMoneyValuationCents: 500_000_000,
      targetCloseDate: datePlus(120),
      status: "active",
      useOfFunds: "Inventory and commercial growth.",
    });
    assert.equal(roundResponse.state.dashboard.receivedAmountCents, 10_000_000);
    assert.equal(roundResponse.state.dashboard.committedAmountCents, 15_000_000);

    const strategyResponse = await json<{ state: BootstrapState }>(baseUrl, "/api/capital-strategy/recalculate", "POST", {});
    assert.equal(strategyResponse.state.strategy?.allocations.length, 3);
    assert.equal(strategyResponse.state.strategy?.totalNeedCents, 100_000_000);

    for (const action of [
      {
        track: "grant",
        title: "Submit manufacturing innovation grant",
        amountCents: 20_000_000,
        stage: "prepare",
        priority: "critical",
        deadline: datePlus(2),
        nextStep: "Upload the budget and sign the application.",
        owner: "Owner",
        result: "",
      },
      {
        track: "debt",
        title: "Complete bank working-capital package",
        amountCents: 30_000_000,
        stage: "prepare",
        priority: "high",
        deadline: datePlus(10),
        nextStep: "Attach the latest statements and debt schedule.",
        owner: "Owner",
        result: "",
      },
      {
        track: "equity",
        title: "Follow up with Atlas Ventures",
        amountCents: 50_000_000,
        stage: "contacted",
        priority: "high",
        deadline: datePlus(7),
        nextStep: "Send the requested cohort metrics and confirm partner meeting availability.",
        owner: "Owner",
        result: "",
      },
    ]) {
      await json<{ state: BootstrapState }>(baseUrl, "/api/actions", "POST", action);
    }

    const finalState = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(finalState.actions.length, 3);
    assert.deepEqual(finalState.dashboard.tracks.map((track) => track.activeCount), [1, 1, 1]);
    assert.equal(finalState.dashboard.activePipelineCents, 100_000_000);
    assert.match(finalState.dashboard.todayFocus.title, /manufacturing innovation grant/i);
    assert.equal(finalState.dashboard.remainingGapCents, 75_000_000);

    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();

    const reopened = new FundingRepository(databasePath);
    try {
      assert.equal(reopened.getCompanyProfile()?.name, "Northstar Robotics");
      assert.equal(reopened.getFundingGoal()?.targetAmountCents, 100_000_000);
      assert.equal(reopened.listRounds().length, 1);
      assert.equal(reopened.listActions().length, 3);
      assert.equal(reopened.getCapitalStrategy()?.allocations.length, 3);
    } finally {
      reopened.close();
    }
  } finally {
    if (server.listening) await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    try { repo.close(); } catch { /* already closed */ }
    rmSync(temp, { recursive: true, force: true });
  }
});
