import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import type { BootstrapState, FundingApplication, Investor, TermSheet } from "../src/domain/types.ts";

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

test("real HTTP timing plan tracks runway, dated execution, undated term work and Outcome resolution", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await json<BootstrapState>(baseUrl, "/api/company-profile", "PUT", {
      name: "Northstar Robotics", industry: "Industrial automation", stage: "growth", geography: "USA", foundedYear: 2022,
      annualRevenueCents: 180_000_000, mrrCents: 15_000_000, arrCents: 180_000_000, growthRatePct: 60, grossMarginPct: 58,
      cashBalanceCents: 45_000_000, monthlyBurnCents: 12_000_000, runwayMonths: 1, teamSize: 18, product: "Automation",
      businessModel: "Recurring software and hardware", fundingHistory: "Founder funded", existingDebtCents: 0, capTableSummary: "Founders 100%",
      useOfFunds: "Inventory and growth", targetFundingCents: 100_000_000, targetFundingDate: datePlus(60),
    });
    const goalState = await json<BootstrapState>(baseUrl, "/api/funding-goal", "PUT", {
      targetAmountCents: 100_000_000, needByDate: datePlus(60), purpose: "Inventory", acceptsDilution: true,
      maxMonthlyDebtServiceCents: 1_000_000, growthPlan: "Growth",
    });
    assert.equal(goalState.dashboard.timingPlan.status, "runway-before-need");
    assert.ok(goalState.dashboard.timingPlan.runwayEstimateDate);

    const applicationResponse = await json<{ application: FundingApplication; state: BootstrapState }>(baseUrl, "/api/applications", "POST", {
      opportunityId: null, track: "grant", title: "Grant package", requestedAmountCents: 25_000_000, approvedAmountCents: 0,
      status: "under-review", deadline: datePlus(7), submittedDate: datePlus(-2), decisionDate: null, owner: "Owner",
      nextAction: "Check award decision", rejectionReason: "", notes: "",
    });
    assert.equal(applicationResponse.state.dashboard.timingPlan.dueNext14DaysCount >= 1, true);
    assert.equal(applicationResponse.state.dashboard.timingPlan.milestones.some((item) => item.entityType === "funding-application" && item.entityId === applicationResponse.application.id), true);

    const investorResponse = await json<{ investor: Investor }>(baseUrl, "/api/investors", "POST", {
      name: "Atlas Ventures", fundId: null, roundId: null, stage: "term-sheet", priority: "high", relationship: "warm", warmIntroSource: "Founder",
      chequeMinCents: 20_000_000, chequeMaxCents: 50_000_000, geography: "USA", sectors: "industrial", stages: "growth", portfolio: "",
      lastContactDate: datePlus(-1), nextFollowUpDate: null, nextAction: "Complete closing", owner: "Owner", notes: "", rejectionReason: "",
    });
    const termResponse = await json<{ termSheet: TermSheet; state: BootstrapState }>(baseUrl, "/api/term-sheets", "POST", {
      investorId: investorResponse.investor.id, roundId: null, investmentAmountCents: 40_000_000, preMoneyValuationCents: 400_000_000,
      equityPct: null, liquidationPreference: "1x", boardSeat: "Observer", proRata: "Standard", vesting: "", optionPool: "10%",
      exclusivity: "30 days", closingConditions: "Diligence", status: "accepted", notes: "",
    });
    assert.equal(termResponse.state.dashboard.timingPlan.undatedItems.some((item) => item.entityType === "term-sheet" && item.entityId === termResponse.termSheet.id), true);

    const resolvedApplication = await json<{ state: BootstrapState }>(baseUrl, "/api/outcomes", "POST", {
      track: "grant", applicationId: applicationResponse.application.id, investorId: null, roundId: null, status: "won",
      approvedAmountCents: 25_000_000, committedAmountCents: 25_000_000, receivedAmountCents: 10_000_000, receivedDate: datePlus(0),
      commitmentEvidence: "Award notice", receiptEvidence: "Bank receipt", conditions: "Reporting", lossReason: "", feedback: "Awarded", retryDate: null,
    });
    assert.equal(resolvedApplication.state.dashboard.timingPlan.milestones.some((item) => item.entityType === "funding-application" && item.entityId === applicationResponse.application.id), false);

    const resolvedInvestor = await json<{ state: BootstrapState }>(baseUrl, "/api/outcomes", "POST", {
      track: "equity", applicationId: null, investorId: investorResponse.investor.id, roundId: null, status: "closed",
      approvedAmountCents: 40_000_000, committedAmountCents: 40_000_000, receivedAmountCents: 40_000_000, receivedDate: datePlus(0),
      commitmentEvidence: "Signed closing documents", receiptEvidence: "Bank receipt", conditions: "Closed", lossReason: "", feedback: "Received", retryDate: null,
    });
    assert.equal(resolvedInvestor.state.dashboard.timingPlan.undatedItems.some((item) => item.entityType === "term-sheet" && item.entityId === termResponse.termSheet.id), false);
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
    repo.close();
  }
});
