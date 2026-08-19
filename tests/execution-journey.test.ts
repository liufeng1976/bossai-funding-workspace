import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import { EquityRepository } from "../src/server/equity-database.ts";
import { ExecutionRepository } from "../src/server/execution-database.ts";
import type { BootstrapState, DataRoom, FundingApplication, FundingDocument, Investor, TermSheet } from "../src/domain/types.ts";

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

test("Phase 4 execution persists application, materials, data room, diligence, term sheets and received capital", async () => {
  const temp = mkdtempSync(join(tmpdir(), "bossai-funding-execution-"));
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
      fundingHistory: "Founder funded", existingDebtCents: 5_000_000, capTableSummary: "Founders 100%", useOfFunds: "Inventory and certification",
      targetFundingCents: 100_000_000, targetFundingDate: datePlus(150),
    });
    await json<BootstrapState>(baseUrl, "/api/funding-goal", "PUT", {
      targetAmountCents: 100_000_000, needByDate: datePlus(150), purpose: "Inventory and certification", acceptsDilution: true,
      maxMonthlyDebtServiceCents: 1_500_000, growthPlan: "Expand manufacturing customers",
    });

    const investorResponse = await json<{ investor: Investor; state: BootstrapState }>(baseUrl, "/api/investors", "POST", {
      name: "Maya Chen", fundId: null, roundId: null, stage: "due-diligence", priority: "high", relationship: "warm", warmIntroSource: "Customer CEO",
      chequeMinCents: 25_000_000, chequeMaxCents: 75_000_000, geography: "USA", sectors: "industrial automation", stages: "growth",
      portfolio: "", lastContactDate: datePlus(-1), nextFollowUpDate: datePlus(7), nextAction: "Complete diligence package", owner: "Owner", notes: "", rejectionReason: "",
    });
    const investorId = investorResponse.investor.id;

    const applicationResponse = await json<{ application: FundingApplication; state: BootstrapState }>(baseUrl, "/api/applications", "POST", {
      opportunityId: null, track: "grant", title: "California Innovation Grant Application", requestedAmountCents: 30_000_000,
      approvedAmountCents: 0, status: "preparing", deadline: datePlus(2), submittedDate: null, decisionDate: null,
      owner: "Owner", nextAction: "Finalize budget narrative and submit.", rejectionReason: "", notes: "",
    });
    assert.match(applicationResponse.state.dashboard.todayFocus.title, /California Innovation Grant Application/i);
    assert.equal(applicationResponse.state.dashboard.todayFocus.destination, "execution");
    assert.equal(applicationResponse.state.dashboard.todayFocus.entityType, "funding-application");
    assert.equal(applicationResponse.state.dashboard.todayFocus.entityId, applicationResponse.application.id);
    assert.equal(applicationResponse.state.dashboard.todayFocus.workStatus, "preparing");
    assert.equal(applicationResponse.state.dashboard.todayFocus.workOwner, "Owner");
    assert.equal(applicationResponse.state.dashboard.todayFocus.workDueAt, applicationResponse.application.deadline);

    const documentResponse = await json<{ document: FundingDocument; state: BootstrapState }>(baseUrl, "/api/documents", "POST", {
      documentType: "financial-model", title: "Three-year Financial Model", version: "v1", status: "ready", roundId: null,
      investorId, applicationId: applicationResponse.application.id, completionPct: 100, notes: "Board-approved operating case",
    });

    const roomResponse = await json<{ dataRoom: DataRoom; state: BootstrapState }>(baseUrl, "/api/data-rooms", "POST", {
      name: "2026 Financing Data Room", roundId: null,
    });
    assert.equal(roomResponse.state.dataRoomFolders.filter((folder) => folder.dataRoomId === roomResponse.dataRoom.id).length, 8);
    const financialFolder = roomResponse.state.dataRoomFolders.find((folder) => folder.dataRoomId === roomResponse.dataRoom.id && folder.category === "Financial");
    assert.ok(financialFolder);

    const dataRoomItemResponse = await json<{ state: BootstrapState }>(baseUrl, "/api/data-room-documents", "POST", {
      folderId: financialFolder.id, documentId: documentResponse.document.id, title: "Three-year Financial Model", status: "ready", expiresAt: null, notes: "",
    });
    const roomReadiness = dataRoomItemResponse.state.dataRoomReadiness.find((item) => item.dataRoomId === roomResponse.dataRoom.id);
    assert.equal(roomReadiness?.completionPct, 13);
    assert.match(roomReadiness?.nextStep ?? "", /Corporate/i);

    const diligenceResponse = await json<{ state: BootstrapState }>(baseUrl, "/api/due-diligence", "POST", {
      investorId, roundId: null, documentId: documentResponse.document.id, owner: "Owner", deadline: datePlus(1), status: "requested",
      request: "Share customer concentration and updated financial model.", responseNotes: "",
    });
    assert.match(diligenceResponse.state.dashboard.todayFocus.title, /Maya Chen due diligence request/i);
    assert.equal(diligenceResponse.state.dashboard.todayFocus.entityType, "due-diligence");
    assert.equal(diligenceResponse.state.dashboard.todayFocus.entityId, diligenceResponse.state.dueDiligenceRequests.at(-1)?.id);
    assert.equal(diligenceResponse.state.dashboard.todayFocus.workStatus, "requested");
    assert.equal(diligenceResponse.state.dashboard.todayFocus.workOwner, "Owner");
    assert.equal(diligenceResponse.state.dashboard.todayFocus.workDueAt, diligenceResponse.state.dueDiligenceRequests.at(-1)?.deadline ?? null);

    const termOne = await json<{ termSheet: TermSheet; state: BootstrapState }>(baseUrl, "/api/term-sheets", "POST", {
      investorId, roundId: null, investmentAmountCents: 50_000_000, preMoneyValuationCents: 450_000_000, equityPct: null,
      liquidationPreference: "1x non-participating", boardSeat: "Observer", proRata: "Standard pro-rata", vesting: "", optionPool: "10% pre-money",
      exclusivity: "30-day no-shop", closingConditions: "Diligence and definitive documents", status: "reviewing", notes: "",
    });
    assert.equal(termOne.state.termSheetComparison.lawyerReviewRequired, true);
    assert.match(termOne.state.termSheetComparison.disclaimer, /not legal advice/i);
    const grantPipeline = termOne.state.dashboard.tracks.find((track) => track.track === "grant");
    const equityPipeline = termOne.state.dashboard.tracks.find((track) => track.track === "equity");
    assert.equal(grantPipeline?.potentialAmountCents, 30_000_000);
    assert.deepEqual(grantPipeline?.evidenceKinds, ["application"]);
    assert.equal(equityPipeline?.potentialAmountCents, 50_000_000, "term sheet must replace, not stack on, the same investor cheque range");
    assert.deepEqual(equityPipeline?.evidenceKinds, ["term-sheet"]);
    assert.equal(termOne.state.dashboard.activePipelineCents, 80_000_000);
    assert.equal(termOne.state.dashboard.coveragePlan.status, "pipeline-shortfall");
    assert.equal(termOne.state.dashboard.coveragePlan.receivedCoveragePct, 0);
    assert.equal(termOne.state.dashboard.coveragePlan.securedCoveragePct, 0);
    assert.equal(termOne.state.dashboard.coveragePlan.recordedCoveragePct, 80);
    assert.equal(termOne.state.dashboard.coveragePlan.uncoveredAfterPipelineCents, 20_000_000);
    assert.equal(termOne.state.dashboard.coveragePlan.closestToCash[0]?.entityType, "term-sheet");
    assert.equal(termOne.state.dashboard.coveragePlan.closestToCash[0]?.entityId, termOne.termSheet.id);

    const secondInvestor = await json<{ investor: Investor }>(baseUrl, "/api/investors", "POST", {
      name: "Alex Rivera", fundId: null, roundId: null, stage: "term-sheet", priority: "high", relationship: "warm", warmIntroSource: "Founder",
      chequeMinCents: 30_000_000, chequeMaxCents: 80_000_000, geography: "USA", sectors: "industrial automation", stages: "growth",
      portfolio: "", lastContactDate: datePlus(-1), nextFollowUpDate: datePlus(5), nextAction: "Compare term sheet", owner: "Owner", notes: "", rejectionReason: "",
    });
    const twoTerms = await json<{ state: BootstrapState }>(baseUrl, "/api/term-sheets", "POST", {
      investorId: secondInvestor.investor.id, roundId: null, investmentAmountCents: 60_000_000, preMoneyValuationCents: 300_000_000, equityPct: null,
      liquidationPreference: "2x participating", boardSeat: "Investor board control", proRata: "Super pro-rata", vesting: "Founder re-vesting",
      optionPool: "15% pre-money", exclusivity: "60-day no-shop", closingConditions: "Diligence and investor consent", status: "reviewing", notes: "",
    });
    assert.equal(twoTerms.state.termSheetComparison.items.length, 2);
    assert.ok((twoTerms.state.termSheetComparison.items.find((item) => item.investorName === "Alex Rivera")?.cautionFlags.length ?? 0) >= 2);

    const outcomeResponse = await json<{ state: BootstrapState }>(baseUrl, "/api/outcomes", "POST", {
      track: "grant", applicationId: applicationResponse.application.id, investorId: null, roundId: null, status: "won",
      approvedAmountCents: 30_000_000, committedAmountCents: 30_000_000, receivedAmountCents: 10_000_000, receivedDate: datePlus(0),
      commitmentEvidence: "Award notice", receiptEvidence: "Bank receipt", conditions: "Quarterly reporting", lossReason: "", feedback: "Awarded", retryDate: null,
    });
    assert.equal(outcomeResponse.state.dashboard.receivedAmountCents, 10_000_000);
    assert.equal(outcomeResponse.state.dashboard.committedAmountCents, 20_000_000);
    assert.equal(outcomeResponse.state.dashboard.remainingGapCents, 70_000_000);
    assert.equal(outcomeResponse.state.dashboard.activePipelineCents, 110_000_000, "resolved grant application must leave In motion after its Funding Outcome is recorded");
    assert.equal(outcomeResponse.state.dashboard.coveragePlan.receivedCoveragePct, 10);
    assert.equal(outcomeResponse.state.dashboard.coveragePlan.securedCoveragePct, 30);
    assert.equal(outcomeResponse.state.dashboard.coveragePlan.recordedCoveragePct, 100);
    assert.equal(outcomeResponse.state.dashboard.coveragePlan.uncoveredAfterPipelineCents, 0);
    assert.equal(outcomeResponse.state.dashboard.coveragePlan.closestToCash[0]?.evidenceKind, "recorded-commitment");

    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();

    const reopened = new FundingRepository(databasePath);
    try {
      const executionRepo = new ExecutionRepository(reopened.db);
      const equityRepo = new EquityRepository(reopened.db);
      assert.equal(executionRepo.listApplications().length, 1);
      assert.equal(executionRepo.listDocuments().length, 1);
      assert.equal(executionRepo.listDataRooms().length, 1);
      assert.equal(executionRepo.listDataRoomFolders().length, 8);
      assert.equal(executionRepo.listDataRoomDocuments().length, 1);
      assert.equal(executionRepo.listDueDiligenceRequests().length, 1);
      assert.equal(executionRepo.listTermSheets().length, 2);
      assert.equal(executionRepo.listOutcomes()[0]?.receivedAmountCents, 10_000_000);
      assert.equal(equityRepo.listInvestors().length, 2);
    } finally {
      reopened.close();
    }
  } finally {
    if (server.listening) await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    try { repo.close(); } catch { /* already closed */ }
    rmSync(temp, { recursive: true, force: true });
  }
});
