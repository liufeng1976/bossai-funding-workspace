import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import type { BootstrapState, FundingOpportunity } from "../src/domain/types.ts";

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
  const text = await response.text();
  assert.equal(response.ok, true, `${method} ${path} failed: ${text}`);
  return (text.startsWith("{") ? JSON.parse(text) : text) as T;
}

function expiredGrant() {
  return {
    type: "grant", title: "Expired industrial grant", provider: "State innovation office", sourceUrl: "https://example.invalid/expired-grant",
    description: "Commercialization grant", geography: "California, USA", sectors: "industrial automation", stages: "growth",
    amountMinCents: 10_000_000, amountMaxCents: 40_000_000, deadline: datePlus(-2), decision: "pursuing",
    grantProgramType: "Innovation", grantEligibility: "California operating company", matchFundingRequiredCents: 0,
    loanTermMonths: null, annualInterestRatePct: null, loanFeesCents: 0, minimumDscr: null, collateralRequired: false,
    personalGuaranteeRequired: false, investorId: null, fundId: null, investorType: "",
  };
}

test("real HTTP excludes a past-deadline pursuit from current capital and restores it after manual deadline correction", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await json<BootstrapState>(baseUrl, "/api/company-profile", "PUT", {
      name: "Northstar Robotics", industry: "industrial automation", stage: "growth", geography: "California, USA", foundedYear: 2022,
      annualRevenueCents: 180_000_000, mrrCents: 15_000_000, arrCents: 180_000_000, growthRatePct: 62, grossMarginPct: 58,
      cashBalanceCents: 45_000_000, monthlyBurnCents: 12_000_000, runwayMonths: 4, teamSize: 18,
      product: "Automation hardware and workflow software", businessModel: "Hardware plus recurring software",
      fundingHistory: "Founder funded", existingDebtCents: 0, capTableSummary: "Founders", useOfFunds: "Growth",
      targetFundingCents: 100_000_000, targetFundingDate: datePlus(150),
    });
    await json<BootstrapState>(baseUrl, "/api/funding-goal", "PUT", {
      targetAmountCents: 100_000_000, needByDate: datePlus(150), purpose: "Growth", acceptsDilution: true,
      maxMonthlyDebtServiceCents: 1_500_000, growthPlan: "Expand",
    });

    const created = await json<{ opportunity: FundingOpportunity; state: BootstrapState }>(baseUrl, "/api/opportunities", "POST", expiredGrant());
    const viability = created.state.opportunityViability.find((item) => item.opportunityId === created.opportunity.id);
    assert.equal(viability?.deadlineState, "deadline-passed");
    assert.equal(viability?.deadlineViable, false);
    assert.equal(created.state.dashboard.activePipelineCents, 0);
    assert.equal(created.state.dashboard.coveragePlan.recordedCoveragePct, 0);
    assert.equal(created.state.dashboard.todayFocus.entityType, "opportunity");
    assert.equal(created.state.dashboard.todayFocus.entityId, created.opportunity.id);
    assert.match(created.state.dashboard.todayFocus.reason, /deadline passed/i);
    assert.equal(created.state.dashboard.capitalBlockers[0]?.key, `opportunity-deadline-passed-${created.opportunity.id}`);
    assert.equal(created.state.ownerJourney.steps.find((step) => step.key === "find-money")?.complete, false);
    assert.equal(created.state.fundingSources.find((source) => source.opportunityId === created.opportunity.id)?.sourceKind, "manual");

    const reportBefore = await json<string>(baseUrl, "/api/reports/owner-board-summary.md");
    assert.match(reportBefore, /Past-deadline pursued opportunities excluded from current pipeline: 1/);
    assert.match(reportBefore, /Expired industrial grant/);

    const corrected = await json<{ opportunity: FundingOpportunity; state: BootstrapState }>(baseUrl, `/api/opportunities/${created.opportunity.id}`, "PATCH", {
      ...created.opportunity,
      deadline: datePlus(30),
    });
    const correctedViability = corrected.state.opportunityViability.find((item) => item.opportunityId === created.opportunity.id);
    assert.equal(correctedViability?.deadlineState, "open");
    assert.equal(correctedViability?.deadlineViable, true);
    assert.equal(corrected.state.dashboard.activePipelineCents, 40_000_000);
    assert.equal(corrected.state.dashboard.capitalBlockers.some((item) => item.key === `opportunity-deadline-passed-${created.opportunity.id}`), false);
    assert.equal(corrected.state.ownerJourney.steps.find((step) => step.key === "find-money")?.complete, true);
    assert.equal(corrected.state.ownerJourney.steps.find((step) => step.key === "decide")?.complete, true);
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
    repo.close();
  }
});
