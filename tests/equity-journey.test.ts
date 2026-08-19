import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import { EquityRepository } from "../src/server/equity-database.ts";
import type { BootstrapState, Fund, Investor, InvestorFollowUp } from "../src/domain/types.ts";

function datePlus(days: number): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dateTimePlus(days: number): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  value.setUTCHours(17, 0, 0, 0);
  return value.toISOString();
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

test("Phase 2 equity pipeline persists investor CRM and projects execution into Today's Focus", async () => {
  const temp = mkdtempSync(join(tmpdir(), "bossai-funding-equity-"));
  const databasePath = join(temp, "funding.sqlite");
  const repo = new FundingRepository(databasePath);
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));

  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await json<BootstrapState>(baseUrl, "/api/company-profile", "PUT", {
      name: "Harbor Systems", industry: "B2B software", stage: "seed", geography: "USA", foundedYear: 2024,
      annualRevenueCents: 60_000_000, mrrCents: 5_000_000, arrCents: 60_000_000, growthRatePct: 80, grossMarginPct: 78,
      cashBalanceCents: 25_000_000, monthlyBurnCents: 8_000_000, runwayMonths: 3.1, teamSize: 11,
      product: "Operations software", businessModel: "Subscription", fundingHistory: "Bootstrapped", existingDebtCents: 0,
      capTableSummary: "Founders 100%", useOfFunds: "Sales and product", targetFundingCents: 200_000_000, targetFundingDate: datePlus(150),
    });
    await json<BootstrapState>(baseUrl, "/api/funding-goal", "PUT", {
      targetAmountCents: 200_000_000, needByDate: datePlus(150), purpose: "Sales and product expansion",
      acceptsDilution: true, maxMonthlyDebtServiceCents: 500_000, growthPlan: "Triple enterprise distribution",
    });

    const fundResponse = await json<{ fund: Fund; state: BootstrapState }>(baseUrl, "/api/funds", "POST", {
      name: "Northstar Ventures", fundType: "VC", website: "https://example.invalid", geography: "North America",
      portfolio: "B2B software and infrastructure", notes: "Seed-focused fund",
    });
    assert.equal(fundResponse.state.funds.length, 1);

    const investorResponse = await json<{ investor: Investor; state: BootstrapState }>(baseUrl, "/api/investors", "POST", {
      name: "Maya Chen", fundId: fundResponse.fund.id, roundId: null, stage: "ready-to-contact", priority: "high",
      relationship: "warm", warmIntroSource: "Existing customer CEO", chequeMinCents: 25_000_000, chequeMaxCents: 75_000_000,
      geography: "North America", sectors: "B2B SaaS, workflow", stages: "Seed, Series A", portfolio: "Relevant vertical SaaS investments",
      lastContactDate: null, nextFollowUpDate: datePlus(6), nextAction: "Ask the customer CEO for the introduction.",
      owner: "Owner", notes: "Strong sector fit", rejectionReason: "",
    });
    const investorId = investorResponse.investor.id;
    assert.equal(investorResponse.state.equityPipeline.activeInvestorCount, 1);
    assert.equal(investorResponse.state.equityPipeline.totalPotentialCents, 75_000_000);
    const equityTrack = investorResponse.state.dashboard.tracks.find((track) => track.track === "equity");
    assert.equal(equityTrack?.activeCount, 1);
    assert.equal(equityTrack?.potentialAmountCents, 75_000_000);
    assert.deepEqual(equityTrack?.evidenceKinds, ["investor"]);

    await json(baseUrl, "/api/contacts", "POST", {
      investorId, fundId: fundResponse.fund.id, name: "Maya Chen", title: "Partner", email: "maya@example.invalid",
      phone: "", linkedinUrl: "", notes: "Warm introduction available",
    });
    await json(baseUrl, "/api/investment-theses", "POST", {
      fundId: fundResponse.fund.id, investorId: null, sectors: "B2B SaaS, AI infrastructure", stages: "Seed, Series A",
      geography: "North America", chequeMinCents: 25_000_000, chequeMaxCents: 100_000_000,
      thesis: "Backs founder-led B2B software companies with early enterprise proof.",
    });

    const followUpResponse = await json<{ followUp: InvestorFollowUp; state: BootstrapState }>(baseUrl, "/api/follow-ups", "POST", {
      investorId, dueDate: datePlus(2), status: "pending", channel: "intro",
      action: "Ask the customer CEO to send the warm introduction email.", result: "", owner: "Owner",
    });
    assert.equal(followUpResponse.state.equityPipeline.pendingFollowUpCount, 1);
    assert.match(followUpResponse.state.dashboard.todayFocus.title, /follow up with Maya Chen/i);
    assert.equal(followUpResponse.state.dashboard.todayFocus.destination, "equity");
    assert.equal(followUpResponse.state.dashboard.todayFocus.entityType, "investor-follow-up");
    assert.equal(followUpResponse.state.dashboard.todayFocus.entityId, followUpResponse.followUp.id);
    assert.equal(followUpResponse.state.dashboard.todayFocus.workStatus, "pending");
    assert.equal(followUpResponse.state.dashboard.todayFocus.workOwner, "Owner");
    assert.equal(followUpResponse.state.dashboard.todayFocus.workDueAt, followUpResponse.followUp.dueDate);

    const meetingResponse = await json<{ state: BootstrapState }>(baseUrl, "/api/meetings", "POST", {
      investorId, roundId: null, meetingAt: dateTimePlus(1), meetingType: "pitch", status: "scheduled",
      attendees: "CEO, Maya Chen", objective: "Secure a partner meeting", outcome: "", nextAction: "",
    });
    assert.equal(meetingResponse.state.meetings.length, 1);
    assert.match(meetingResponse.state.dashboard.todayFocus.title, /prepare for Maya Chen meeting/i);
    assert.equal(meetingResponse.state.dashboard.todayFocus.entityType, "financing-meeting");
    assert.equal(meetingResponse.state.dashboard.todayFocus.entityId, meetingResponse.state.meetings[0]?.id);
    assert.equal(meetingResponse.state.dashboard.todayFocus.workStatus, "scheduled");
    assert.equal(meetingResponse.state.dashboard.todayFocus.workOwner, null);
    assert.equal(meetingResponse.state.dashboard.todayFocus.workDueAt, meetingResponse.state.meetings[0]?.meetingAt ?? null);

    const updatedInvestor = { ...investorResponse.investor, stage: "meeting", lastContactDate: datePlus(0), nextFollowUpDate: datePlus(3), nextAction: "Send the requested retention cohort before the meeting." };
    const updateResponse = await json<{ investor: Investor; state: BootstrapState }>(baseUrl, `/api/investors/${investorId}`, "PATCH", updatedInvestor);
    assert.equal(updateResponse.investor.stage, "meeting");
    assert.equal(updateResponse.state.equityPipeline.stageCounts.meeting, 1);

    const completeResponse = await json<{ state: BootstrapState }>(baseUrl, `/api/follow-ups/${followUpResponse.followUp.id}`, "PATCH", {
      ...followUpResponse.followUp, status: "completed", result: "Warm intro sent",
    });
    assert.equal(completeResponse.state.equityPipeline.pendingFollowUpCount, 0);
    assert.match(completeResponse.state.dashboard.todayFocus.title, /prepare for Maya Chen meeting/i);

    const finalState = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(finalState.investors.length, 1);
    assert.equal(finalState.contacts.length, 1);
    assert.equal(finalState.investmentTheses.length, 1);
    assert.equal(finalState.followUps.length, 1);
    assert.equal(finalState.meetings.length, 1);

    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();

    const reopened = new FundingRepository(databasePath);
    try {
      const equityRepo = new EquityRepository(reopened.db);
      assert.equal(equityRepo.listFunds()[0]?.name, "Northstar Ventures");
      assert.equal(equityRepo.listInvestors()[0]?.stage, "meeting");
      assert.equal(equityRepo.listContacts().length, 1);
      assert.equal(equityRepo.listInvestmentTheses().length, 1);
      assert.equal(equityRepo.listMeetings().length, 1);
      assert.equal(equityRepo.listFollowUps()[0]?.status, "completed");
    } finally {
      reopened.close();
    }
  } finally {
    if (server.listening) await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    try { repo.close(); } catch { /* already closed */ }
    rmSync(temp, { recursive: true, force: true });
  }
});
