import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import { OpportunityRepository } from "../src/server/opportunity-database.ts";
import type { BootstrapState, FundingOpportunity, OpportunityMatch } from "../src/domain/types.ts";

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

function grantPayload(): Record<string, unknown> {
  return {
    type: "grant",
    title: "California Industrial Innovation Grant",
    provider: "State innovation office",
    sourceUrl: "https://example.invalid/grant",
    description: "Commercialization support for California industrial technology companies.",
    geography: "California, USA",
    sectors: "industrial automation, software",
    stages: "growth, seed",
    amountMinCents: 10_000_000,
    amountMaxCents: 40_000_000,
    deadline: datePlus(30),
    decision: "new",
    grantProgramType: "Innovation",
    grantEligibility: "California operating company with commercial technology product.",
    matchFundingRequiredCents: 10_000_000,
    loanTermMonths: null,
    annualInterestRatePct: null,
    loanFeesCents: 0,
    minimumDscr: null,
    collateralRequired: false,
    personalGuaranteeRequired: false,
    investorId: null,
    fundId: null,
    investorType: "",
  };
}

test("Phase 3 opportunity engine persists explainable matches, decisions and readiness", async () => {
  const temp = mkdtempSync(join(tmpdir(), "bossai-funding-opportunity-"));
  const databasePath = join(temp, "funding.sqlite");
  const repo = new FundingRepository(databasePath);
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await json<BootstrapState>(baseUrl, "/api/company-profile", "PUT", {
      name: "Northstar Robotics", industry: "industrial automation", stage: "growth", geography: "California, USA", foundedYear: 2022,
      annualRevenueCents: 180_000_000, mrrCents: 15_000_000, arrCents: 180_000_000, growthRatePct: 62, grossMarginPct: 58,
      cashBalanceCents: 45_000_000, monthlyBurnCents: 12_000_000, runwayMonths: 3.75, teamSize: 18,
      product: "Automation hardware and workflow software", businessModel: "Hardware plus recurring software subscription",
      fundingHistory: "Founder funded and one seed note", existingDebtCents: 5_000_000,
      capTableSummary: "Founders 82%, seed note 18% as-converted estimate", useOfFunds: "Inventory, sales hires and certification",
      targetFundingCents: 100_000_000, targetFundingDate: datePlus(150),
    });
    const goalState = await json<BootstrapState>(baseUrl, "/api/funding-goal", "PUT", {
      targetAmountCents: 100_000_000, needByDate: datePlus(150), purpose: "Inventory, sales capacity and certification",
      acceptsDilution: true, maxMonthlyDebtServiceCents: 1_500_000, growthPlan: "Expand into two manufacturing regions",
    });
    assert.equal(goalState.fundingReadiness.status, "ready");

    const created = await json<{ opportunity: FundingOpportunity; match: OpportunityMatch; state: BootstrapState }>(baseUrl, "/api/opportunities", "POST", grantPayload());
    assert.equal(created.state.opportunities.length, 1);
    assert.equal(created.match.fit, "strong");
    assert.ok(created.match.rules.length >= 6);
    assert.equal(created.match.rules.some((rule) => rule.key === "geography" && rule.outcome === "match"), true);

    const saved = await json<{ state: BootstrapState }>(baseUrl, `/api/opportunities/${created.opportunity.id}`, "PATCH", {
      ...created.opportunity,
      decision: "saved",
    });
    assert.equal(saved.state.opportunities[0]?.decision, "saved");
    assert.equal(saved.state.dashboard.todayFocus.destination, "opportunities");
    assert.equal(saved.state.dashboard.todayFocus.entityType, "opportunity");
    assert.equal(saved.state.dashboard.todayFocus.entityId, saved.state.opportunities[0]?.id);
    assert.equal(saved.state.dashboard.todayFocus.workStatus, "saved");
    assert.equal(saved.state.dashboard.todayFocus.workOwner, null);
    assert.equal(saved.state.dashboard.todayFocus.workDueAt, saved.state.opportunities[0]?.deadline ?? null);
    assert.match(saved.state.dashboard.todayFocus.title, /California Industrial Innovation Grant/i);

    const loan = await json<{ opportunity: FundingOpportunity; match: OpportunityMatch; state: BootstrapState }>(baseUrl, "/api/opportunities", "POST", {
      type: "loan",
      title: "High-cost bridge loan",
      provider: "Regional lender",
      sourceUrl: "https://example.invalid/loan",
      description: "Short-term working capital",
      geography: "USA",
      sectors: "industrial automation",
      stages: "growth",
      amountMinCents: 60_000_000,
      amountMaxCents: 100_000_000,
      deadline: datePlus(45),
      decision: "new",
      grantProgramType: "",
      grantEligibility: "",
      matchFundingRequiredCents: 0,
      loanTermMonths: 12,
      annualInterestRatePct: 18,
      loanFeesCents: 5_000_000,
      minimumDscr: 1.5,
      collateralRequired: true,
      personalGuaranteeRequired: true,
      investorId: null,
      fundId: null,
      investorType: "",
    });
    assert.equal(loan.match.rules.some((rule) => rule.key === "debt-service" && rule.outcome === "mismatch"), true);
    assert.ok(loan.match.blockers.length >= 1);

    const recalculated = await json<{ state: BootstrapState }>(baseUrl, "/api/opportunities/recalculate", "POST", {});
    assert.equal(recalculated.state.opportunityMatches.length, 2);
    assert.equal(recalculated.state.opportunityMatches.every((match) => match.rules.length > 0), true);

    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();

    const reopened = new FundingRepository(databasePath);
    try {
      const opportunityRepo = new OpportunityRepository(reopened.db);
      assert.equal(opportunityRepo.listOpportunities().length, 2);
      assert.equal(opportunityRepo.listOpportunities().find((item) => item.id === created.opportunity.id)?.decision, "saved");
      assert.equal(opportunityRepo.listMatches().length, 2);
      assert.ok((opportunityRepo.getMatch(created.opportunity.id)?.rules.length ?? 0) >= 6);
    } finally {
      reopened.close();
    }
  } finally {
    if (server.listening) await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    try { repo.close(); } catch { /* already closed */ }
    rmSync(temp, { recursive: true, force: true });
  }
});
