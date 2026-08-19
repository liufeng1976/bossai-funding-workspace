import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
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

test("real HTTP dashboard explains why capital has not arrived and links a later term-sheet blocker", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
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
      product: "Automation software and hardware.",
      businessModel: "Recurring software plus hardware.",
      fundingHistory: "Founder funded.",
      existingDebtCents: 0,
      capTableSummary: "Founders 100%.",
      useOfFunds: "Inventory and growth.",
      targetFundingCents: 100_000_000,
      targetFundingDate: datePlus(150),
    });

    const goalState = await json<BootstrapState>(baseUrl, "/api/funding-goal", "PUT", {
      targetAmountCents: 100_000_000,
      needByDate: datePlus(150),
      purpose: "Inventory and growth.",
      acceptsDilution: true,
      maxMonthlyDebtServiceCents: 1_500_000,
      growthPlan: "Expand manufacturing customers.",
    });

    assert.equal(goalState.dashboard.capitalBlockers[0]?.key, "no-capital-source");
    assert.equal(goalState.dashboard.capitalBlockers[0]?.destination, "opportunities");
    assert.match(goalState.dashboard.capitalBlockers[0]?.reason ?? "", /no Grant, Debt or Equity source/i);

    const investorResponse = await json<{ investor: Investor; state: BootstrapState }>(baseUrl, "/api/investors", "POST", {
      name: "Atlas Ventures",
      fundId: null,
      roundId: null,
      stage: "term-sheet",
      priority: "high",
      relationship: "warm",
      warmIntroSource: "Customer CEO",
      chequeMinCents: 25_000_000,
      chequeMaxCents: 75_000_000,
      geography: "USA",
      sectors: "industrial automation",
      stages: "growth",
      portfolio: "",
      lastContactDate: datePlus(-1),
      nextFollowUpDate: null,
      nextAction: "Review term sheet",
      owner: "Owner",
      notes: "",
      rejectionReason: "",
    });

    const termResponse = await json<{ termSheet: TermSheet; state: BootstrapState }>(baseUrl, "/api/term-sheets", "POST", {
      investorId: investorResponse.investor.id,
      roundId: null,
      investmentAmountCents: 50_000_000,
      preMoneyValuationCents: 450_000_000,
      equityPct: null,
      liquidationPreference: "1x non-participating",
      boardSeat: "Observer",
      proRata: "Standard pro-rata",
      vesting: "",
      optionPool: "10% pre-money",
      exclusivity: "30-day no-shop",
      closingConditions: "Diligence and definitive documents",
      status: "reviewing",
      notes: "",
    });

    const termBlocker = termResponse.state.dashboard.capitalBlockers.find((item) => item.key === `active-term-sheet-${termResponse.termSheet.id}`);
    assert.ok(termBlocker);
    assert.equal(termBlocker.entityType, "term-sheet");
    assert.equal(termBlocker.entityId, termResponse.termSheet.id);
    assert.equal(termBlocker.destination, "execution");
    assert.match(termBlocker.nextStep, /counsel/i);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});
