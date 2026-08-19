import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import type { BootstrapState, CapitalStrategy } from "../src/domain/types.ts";

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

function company(product = "Automation hardware and workflow software for manufacturers.", stage = "growth") {
  return {
    name: "Northstar Robotics", industry: "Industrial automation", stage, geography: "USA", foundedYear: 2022,
    annualRevenueCents: 180_000_000, mrrCents: 15_000_000, arrCents: 180_000_000, growthRatePct: 60, grossMarginPct: 58,
    cashBalanceCents: 45_000_000, monthlyBurnCents: 12_000_000, runwayMonths: 6, teamSize: 18, product,
    businessModel: "Recurring software and hardware", fundingHistory: "Founder funded", existingDebtCents: 0,
    capTableSummary: "Founders 100%", useOfFunds: "Inventory and growth", targetFundingCents: 100_000_000, targetFundingDate: datePlus(150),
  };
}

function fundingGoal(targetAmountCents = 100_000_000, acceptsDilution = true, maxMonthlyDebtServiceCents = 1_500_000) {
  return { targetAmountCents, needByDate: datePlus(150), purpose: "Inventory and growth", acceptsDilution, maxMonthlyDebtServiceCents, growthPlan: "Growth" };
}

test("real HTTP keeps an existing capital strategy synchronized after owner inputs change", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await json<BootstrapState>(baseUrl, "/api/company-profile", "PUT", company());
    const goalState = await json<BootstrapState>(baseUrl, "/api/funding-goal", "PUT", fundingGoal());
    assert.equal(goalState.strategy, null);
    assert.equal(goalState.strategyFreshness.state, "not-created");

    const calculated = await json<{ strategy: CapitalStrategy; state: BootstrapState }>(baseUrl, "/api/capital-strategy/recalculate", "POST", {});
    assert.equal(calculated.state.strategyFreshness.state, "current");
    assert.equal(calculated.strategy.totalNeedCents, 100_000_000);
    assert.equal(calculated.strategy.allocations.find((item) => item.track === "grant")?.amountCents, 20_000_000);

    const goalChanged = await json<BootstrapState>(baseUrl, "/api/funding-goal", "PUT", fundingGoal(150_000_000, false, 500_000));
    assert.equal(goalChanged.strategyFreshness.state, "current");
    assert.equal(goalChanged.strategy?.totalNeedCents, 150_000_000);
    assert.equal(goalChanged.strategy?.allocations.find((item) => item.track === "equity")?.amountCents, 0);
    assert.ok((goalChanged.strategy?.unfundedResidualCents ?? 0) > 0);
    assert.equal(goalChanged.activities.some((item) => item.title === "Capital strategy synchronized after funding goal changed"), true);

    const companyChanged = await json<BootstrapState>(baseUrl, "/api/company-profile", "PUT", company("Widget", "mature"));
    assert.equal(companyChanged.strategyFreshness.state, "current");
    assert.equal(companyChanged.strategy?.allocations.find((item) => item.track === "grant")?.amountCents, 15_000_000, "10% grant share should follow the current $1.5M target after innovation signal is removed");
    assert.equal(companyChanged.activities.some((item) => item.title === "Capital strategy synchronized after company facts changed"), true);
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
    repo.close();
  }
});

test("bootstrap marks a semantically corrupted stored strategy stale without mutating it", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await json<BootstrapState>(baseUrl, "/api/company-profile", "PUT", company());
    await json<BootstrapState>(baseUrl, "/api/funding-goal", "PUT", fundingGoal());
    const calculated = await json<{ strategy: CapitalStrategy }>(baseUrl, "/api/capital-strategy/recalculate", "POST", {});
    const corrupted = repo.saveCapitalStrategy({
      ...calculated.strategy,
      totalNeedCents: 1,
      allocations: calculated.strategy.allocations.map((item) => ({ ...item, amountCents: item.track === "grant" ? 1 : 0, sharePct: item.track === "grant" ? 100 : 0 })),
      unfundedResidualCents: 0,
    });
    assert.equal(corrupted.totalNeedCents, 1);

    const state = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(state.strategyFreshness.state, "recalculate");
    assert.equal(state.strategy?.totalNeedCents, 1, "freshness projection must not silently rewrite stale data on read");
    assert.match(state.strategyFreshness.reason, /Recalculate before using/i);
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
    repo.close();
  }
});
