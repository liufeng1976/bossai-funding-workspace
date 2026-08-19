import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import type { BootstrapState, FundingApplication, FundingOutcome, Investor, TermSheet } from "../src/domain/types.ts";

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

async function establishTarget(baseUrl: string): Promise<void> {
  await json<BootstrapState>(baseUrl, "/api/company-profile", "PUT", {
    name: "Northstar Robotics", industry: "Industrial automation", stage: "growth", geography: "California, USA", foundedYear: 2022,
    annualRevenueCents: 180_000_000, mrrCents: 15_000_000, arrCents: 180_000_000, growthRatePct: 62, grossMarginPct: 58,
    cashBalanceCents: 45_000_000, monthlyBurnCents: 12_000_000, runwayMonths: 3.75, teamSize: 18,
    product: "Automation hardware and software", businessModel: "Hardware plus subscription", fundingHistory: "Founder funded",
    existingDebtCents: 0, capTableSummary: "Founders", useOfFunds: "Inventory and growth", targetFundingCents: 100_000_000,
    targetFundingDate: datePlus(150),
  });
  await json<BootstrapState>(baseUrl, "/api/funding-goal", "PUT", {
    targetAmountCents: 100_000_000, needByDate: datePlus(150), purpose: "Inventory and certification", acceptsDilution: true,
    maxMonthlyDebtServiceCents: 1_500_000, growthPlan: "Expand manufacturing customers",
  });
}

test("real HTTP Funding Outcome resolves linked execution and correction can relink it without database repair", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await establishTarget(baseUrl);

    const applicationResponse = await json<{ application: FundingApplication; state: BootstrapState }>(baseUrl, "/api/applications", "POST", {
      opportunityId: null, track: "grant", title: "Grant application awaiting decision", requestedAmountCents: 30_000_000,
      approvedAmountCents: 0, status: "under-review", deadline: datePlus(20), submittedDate: datePlus(-5), decisionDate: null,
      owner: "Owner", nextAction: "Check the award decision window.", rejectionReason: "", notes: "",
    });
    assert.equal(applicationResponse.state.dashboard.todayFocus.entityId, applicationResponse.application.id);
    assert.equal(applicationResponse.state.dashboard.activePipelineCents, 30_000_000);

    const grantOutcomeResponse = await json<{ outcome: FundingOutcome; state: BootstrapState }>(baseUrl, "/api/outcomes", "POST", {
      track: "grant", applicationId: applicationResponse.application.id, investorId: null, roundId: null, status: "won",
      approvedAmountCents: 30_000_000, committedAmountCents: 30_000_000, receivedAmountCents: 10_000_000, receivedDate: datePlus(0),
      commitmentEvidence: "Award notice", receiptEvidence: "Bank receipt", conditions: "Quarterly reporting", lossReason: "", feedback: "Awarded", retryDate: null,
    });
    assert.equal(grantOutcomeResponse.state.dashboard.activePipelineCents, 0);
    assert.equal(
      grantOutcomeResponse.state.dashboard.todayFocus.entityType === "funding-application"
        && grantOutcomeResponse.state.dashboard.todayFocus.entityId === applicationResponse.application.id,
      false,
    );
    assert.equal(grantOutcomeResponse.state.dashboard.capitalBlockers.some((item) => item.entityType === "funding-application" && item.entityId === applicationResponse.application.id), false);
    assert.equal(grantOutcomeResponse.state.applications.length, 1, "historical application record must remain available");

    const invalidCorrectionResponse = await fetch(`${baseUrl}/api/outcomes/${grantOutcomeResponse.outcome.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...grantOutcomeResponse.outcome, status: "lost" }),
    });
    const invalidCorrection = await invalidCorrectionResponse.json() as { code?: string; field?: string; error?: string };
    assert.equal(invalidCorrectionResponse.status, 400);
    assert.equal(invalidCorrection.code, "VALIDATION_ERROR");
    assert.equal(invalidCorrection.field, "committedAmountCents");
    const unchangedAfterInvalidCorrection = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(unchangedAfterInvalidCorrection.outcomes[0]?.status, "won");
    assert.equal(unchangedAfterInvalidCorrection.dashboard.activePipelineCents, 0);

    const grantCorrection = await json<{ outcome: FundingOutcome; state: BootstrapState }>(baseUrl, `/api/outcomes/${grantOutcomeResponse.outcome.id}`, "PATCH", {
      ...grantOutcomeResponse.outcome,
      applicationId: null,
    });
    assert.equal(grantCorrection.outcome.applicationId, null);
    assert.equal(grantCorrection.state.dashboard.activePipelineCents, 30_000_000, "unlinking the Outcome should restore the still-active application to In motion");
    assert.equal(grantCorrection.state.dashboard.todayFocus.entityType, "funding-application");
    assert.equal(grantCorrection.state.dashboard.todayFocus.entityId, applicationResponse.application.id);
    assert.equal(grantCorrection.state.dashboard.capitalBlockers.some((item) => item.entityType === "funding-application" && item.entityId === applicationResponse.application.id), true);

    const investorResponse = await json<{ investor: Investor; state: BootstrapState }>(baseUrl, "/api/investors", "POST", {
      name: "Atlas Ventures", fundId: null, roundId: null, stage: "term-sheet", priority: "high", relationship: "warm", warmIntroSource: "Customer CEO",
      chequeMinCents: 25_000_000, chequeMaxCents: 75_000_000, geography: "USA", sectors: "industrial automation", stages: "growth",
      portfolio: "", lastContactDate: datePlus(-1), nextFollowUpDate: null, nextAction: "Review definitive terms", owner: "Owner", notes: "", rejectionReason: "",
    });
    const termResponse = await json<{ termSheet: TermSheet; state: BootstrapState }>(baseUrl, "/api/term-sheets", "POST", {
      investorId: investorResponse.investor.id, roundId: null, investmentAmountCents: 50_000_000, preMoneyValuationCents: 450_000_000,
      equityPct: null, liquidationPreference: "1x non-participating", boardSeat: "Observer", proRata: "Standard", vesting: "",
      optionPool: "10% pre-money", exclusivity: "30-day no-shop", closingConditions: "Diligence and definitive documents", status: "accepted", notes: "",
    });
    assert.equal(termResponse.state.equityPipeline.activeInvestorCount, 1);
    assert.equal(termResponse.state.equityPipeline.resolvedInvestorCount, 0);

    const investorOutcomeResponse = await json<{ outcome: FundingOutcome; state: BootstrapState }>(baseUrl, "/api/outcomes", "POST", {
      track: "equity", applicationId: null, investorId: investorResponse.investor.id, roundId: null, status: "closed",
      approvedAmountCents: 50_000_000, committedAmountCents: 50_000_000, receivedAmountCents: 50_000_000, receivedDate: datePlus(0),
      commitmentEvidence: "Signed closing documents", receiptEvidence: "Bank receipt", conditions: "Closed", lossReason: "", feedback: "Funds received", retryDate: null,
    });
    assert.equal(investorOutcomeResponse.state.equityPipeline.activeInvestorCount, 0);
    assert.equal(investorOutcomeResponse.state.equityPipeline.resolvedInvestorCount, 1);
    assert.equal(investorOutcomeResponse.state.equityPipeline.totalPotentialCents, 0);
    assert.equal(investorOutcomeResponse.state.dashboard.capitalBlockers.some((item) => item.entityType === "term-sheet" && item.entityId === termResponse.termSheet.id), false);
    assert.equal(
      investorOutcomeResponse.state.dashboard.todayFocus.entityType === "term-sheet"
        && investorOutcomeResponse.state.dashboard.todayFocus.entityId === termResponse.termSheet.id,
      false,
    );
    assert.equal(investorOutcomeResponse.state.termSheets.length, 1, "historical term sheet must remain available for comparison/evidence");
    const resolvedReport = await fetch(`${baseUrl}/api/reports/owner-board-summary.md`).then((response) => response.text());
    assert.match(resolvedReport, /Active investors: 0/);
    assert.match(resolvedReport, /Resolved investor links: 1/);

    const investorCorrection = await json<{ outcome: FundingOutcome; state: BootstrapState }>(baseUrl, `/api/outcomes/${investorOutcomeResponse.outcome.id}`, "PATCH", {
      ...investorOutcomeResponse.outcome,
      investorId: null,
    });
    assert.equal(investorCorrection.outcome.investorId, null);
    assert.equal(investorCorrection.state.equityPipeline.activeInvestorCount, 1);
    assert.equal(investorCorrection.state.equityPipeline.resolvedInvestorCount, 0);
    assert.equal(investorCorrection.state.equityPipeline.totalPotentialCents, investorResponse.investor.chequeMaxCents);
    assert.equal(investorCorrection.state.dashboard.capitalBlockers.some((item) => item.entityType === "term-sheet" && item.entityId === termResponse.termSheet.id), true);
    const correctedReport = await fetch(`${baseUrl}/api/reports/owner-board-summary.md`).then((response) => response.text());
    assert.match(correctedReport, /Active investors: 1/);
    assert.match(correctedReport, /Resolved investor links: 0/);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});
