import test from "node:test";
import assert from "node:assert/strict";
import { ContinuityRepository } from "../src/server/continuity.ts";
import { FundingRepository } from "../src/server/database.ts";
import { EquityRepository } from "../src/server/equity-database.ts";
import { ExecutionRepository } from "../src/server/execution-database.ts";
import { OpportunityRepository } from "../src/server/opportunity-database.ts";
import { FundingSourceRepository } from "../src/server/source-database.ts";
import { TENANT_SCOPED_BUSINESS_TABLES, prepareLocalTenantSchema } from "../src/server/tenant-scope.ts";
import type { FundingOpportunityInput, InvestorInput } from "../src/domain/types.ts";

const at = "2026-08-15T12:00:00.000Z";

function investorInput(fundId: number, roundId: number): InvestorInput {
  return {
    name: "Migration Capital",
    fundId,
    roundId,
    stage: "meeting",
    priority: "high",
    relationship: "warm",
    warmIntroSource: "Founder network",
    chequeMinCents: 10_000_000,
    chequeMaxCents: 30_000_000,
    geography: "United States",
    sectors: "Software",
    stages: "growth",
    portfolio: "Industrial software",
    lastContactDate: "2026-08-10",
    nextFollowUpDate: "2026-08-20",
    nextAction: "Send metrics",
    owner: "Owner",
    notes: "Pre-migration investor row",
    rejectionReason: "",
  };
}

function opportunityInput(investorId: number, fundId: number): FundingOpportunityInput {
  return {
    type: "investor",
    title: "Migration investor opportunity",
    provider: "Migration Capital",
    sourceUrl: "https://example.invalid/migration",
    description: "Pre-migration source row",
    geography: "United States",
    sectors: "Software",
    stages: "growth",
    amountMinCents: 10_000_000,
    amountMaxCents: 30_000_000,
    deadline: "2026-12-31",
    decision: "saved",
    grantProgramType: "",
    grantEligibility: "",
    matchFundingRequiredCents: 0,
    loanTermMonths: null,
    annualInterestRatePct: null,
    loanFeesCents: 0,
    minimumDscr: null,
    collateralRequired: false,
    personalGuaranteeRequired: false,
    investorId,
    fundId,
    investorType: "venture",
  };
}

test("tenant hardening preserves populated legacy rows, relationships and ID sequences", () => {
  const repo = new FundingRepository(":memory:");
  const equity = new EquityRepository(repo.db);
  const opportunityRepo = new OpportunityRepository(repo.db);
  const execution = new ExecutionRepository(repo.db);
  const sourceRepo = new FundingSourceRepository(repo.db);

  repo.saveCompanyProfile({
    name: "Legacy Funding Co", industry: "Software", stage: "growth", geography: "United States", foundedYear: 2021,
    annualRevenueCents: 120_000_000, mrrCents: 10_000_000, arrCents: 120_000_000, growthRatePct: 50, grossMarginPct: 70,
    cashBalanceCents: 30_000_000, monthlyBurnCents: 5_000_000, runwayMonths: 6, teamSize: 15,
    product: "Legacy funding workflow", businessModel: "Subscription", fundingHistory: "Founder funded", existingDebtCents: 0,
    capTableSummary: "Founders 100%", useOfFunds: "Growth", targetFundingCents: 80_000_000, targetFundingDate: "2027-01-31",
  });
  repo.saveFundingGoal({ targetAmountCents: 80_000_000, needByDate: "2027-01-31", purpose: "Growth", acceptsDilution: true, maxMonthlyDebtServiceCents: 2_000_000, growthPlan: "Expand sales" });
  const round = repo.createRound({ roundName: "Seed II", roundType: "Seed", targetAmountCents: 50_000_000, minimumAmountCents: 25_000_000, committedAmountCents: 0, receivedAmountCents: 0, preMoneyValuationCents: 300_000_000, postMoneyValuationCents: null, targetCloseDate: "2026-12-15", status: "active", useOfFunds: "Growth" });
  const action = repo.createAction({ track: "equity", title: "Legacy action", amountCents: 20_000_000, stage: "meeting", priority: "high", deadline: "2026-09-01", nextStep: "Pitch", owner: "Owner", result: "" });
  repo.saveCapitalStrategy({ id: null, totalNeedCents: 80_000_000, allocations: [{ track: "equity", amountCents: 80_000_000, sharePct: 100, reason: "Growth", primaryRisk: "Dilution", order: 1 }], unfundedResidualCents: 0, assumptions: ["Legacy assumption"], warnings: [], generatedAt: at });

  const fund = equity.createFund({ name: "Legacy Fund", fundType: "venture", website: "", geography: "United States", portfolio: "Software", notes: "" });
  const investor = equity.createInvestor(investorInput(fund.id, round.id));
  const contact = equity.createContact({ investorId: investor.id, fundId: fund.id, name: "Legacy Partner", title: "Partner", email: "partner@example.invalid", phone: "", linkedinUrl: "", notes: "" });
  const thesis = equity.createInvestmentThesis({ fundId: fund.id, investorId: investor.id, sectors: "Software", stages: "growth", geography: "United States", chequeMinCents: 10_000_000, chequeMaxCents: 30_000_000, thesis: "B2B software" });
  const meeting = equity.createMeeting({ investorId: investor.id, roundId: round.id, meetingAt: "2026-08-22T17:00:00.000Z", meetingType: "pitch", status: "scheduled", attendees: "Owner, Partner", objective: "Pitch", outcome: "", nextAction: "Prepare metrics" });
  const followUp = equity.createFollowUp({ investorId: investor.id, dueDate: "2026-08-23", status: "pending", channel: "email", action: "Send metrics", result: "", owner: "Owner" });

  const opportunity = opportunityRepo.createOpportunity(opportunityInput(investor.id, fund.id));
  opportunityRepo.saveMatch({ opportunityId: opportunity.id, fit: "strong", score: 88, rules: [], blockers: [], missingFacts: [], nextStep: "Pursue", evaluatedAt: at });
  sourceRepo.saveSource({ opportunityId: opportunity.id, providerKey: "legacy-source", sourceKind: "manual", externalId: "legacy-1", externalNumber: "L-1", canonicalUrl: "https://example.invalid/legacy", apiEndpoint: "", termsUrl: "", fetchedAt: at, attribution: "Owner supplied" });

  const application = execution.createApplication({ opportunityId: opportunity.id, track: "equity", title: "Legacy application", requestedAmountCents: 20_000_000, approvedAmountCents: 0, status: "preparing", deadline: "2026-09-15", submittedDate: null, decisionDate: null, owner: "Owner", nextAction: "Finish deck", rejectionReason: "", notes: "" });
  const document = execution.createDocument({ documentType: "pitch-deck", title: "Legacy deck", version: "v1", status: "ready", roundId: round.id, investorId: investor.id, applicationId: application.id, completionPct: 100, notes: "" });
  const room = execution.createDataRoom({ name: "Legacy Data Room", roundId: round.id });
  const folder = execution.listDataRoomFolders().find((item) => item.dataRoomId === room.id);
  assert.ok(folder);
  const roomDocument = execution.createDataRoomDocument({ folderId: folder.id, documentId: document.id, title: "Legacy room item", status: "ready", expiresAt: null, notes: "" });
  const dd = execution.createDueDiligenceRequest({ investorId: investor.id, roundId: round.id, documentId: document.id, owner: "Owner", deadline: "2026-09-10", status: "requested", request: "Provide metrics", responseNotes: "" });
  const term = execution.createTermSheet({ investorId: investor.id, roundId: round.id, investmentAmountCents: 20_000_000, preMoneyValuationCents: 300_000_000, equityPct: null, liquidationPreference: "1x non-participating", boardSeat: "observer", proRata: "yes", vesting: "", optionPool: "", exclusivity: "", closingConditions: "", status: "received", notes: "" });
  const outcome = execution.createOutcome({ track: "equity", applicationId: application.id, investorId: investor.id, roundId: round.id, status: "closed", approvedAmountCents: 20_000_000, committedAmountCents: 20_000_000, receivedAmountCents: 0, receivedDate: null, commitmentEvidence: "Signed closing documents", receiptEvidence: "", conditions: "Closing documents", lossReason: "", feedback: "", retryDate: null });

  const continuity = new ContinuityRepository(repo.db, ":memory:");
  repo.db.prepare("INSERT INTO funding_activity(category,action,title,summary,entity_type,entity_id,track,amount_cents,occurred_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .run("equity","legacy","Legacy event","Pre-migration activity","investor",investor.id,"equity",20_000_000,at);
  const workspaceId = continuity.getWorkspaceId();
  const status = prepareLocalTenantSchema(repo.db, workspaceId);

  repo.bindWorkspace(workspaceId);
  equity.bindWorkspace(workspaceId);
  opportunityRepo.bindWorkspace(workspaceId);
  execution.bindWorkspace(workspaceId);
  sourceRepo.bindWorkspace(workspaceId);

  assert.equal(status.strictWorkspaceTableCount, TENANT_SCOPED_BUSINESS_TABLES.length);
  assert.equal(status.databaseWorkspaceConstraintsComplete, true);
  assert.equal(status.databaseWorkspaceGuardsComplete, true);
  assert.equal(status.databaseReferenceGuardsComplete, true);
  assert.equal(status.foreignKeyViolationCount, 0);

  assert.equal(repo.getCompanyProfile()?.name, "Legacy Funding Co");
  assert.equal(repo.getFundingGoal()?.purpose, "Growth");
  assert.equal(repo.listRounds()[0]?.id, round.id);
  assert.equal(repo.listActions()[0]?.id, action.id);
  assert.equal(repo.getCapitalStrategy()?.totalNeedCents, 80_000_000);
  assert.equal(equity.listFunds()[0]?.id, fund.id);
  assert.equal(equity.listInvestors()[0]?.id, investor.id);
  assert.equal(equity.listContacts()[0]?.id, contact.id);
  assert.equal(equity.listInvestmentTheses()[0]?.id, thesis.id);
  assert.equal(equity.listMeetings()[0]?.id, meeting.id);
  assert.equal(equity.listFollowUps()[0]?.id, followUp.id);
  assert.equal(opportunityRepo.listOpportunities()[0]?.id, opportunity.id);
  assert.equal(opportunityRepo.getMatch(opportunity.id)?.score, 88);
  assert.equal(sourceRepo.findByExternalId("legacy-source", "legacy-1")?.opportunityId, opportunity.id);
  assert.equal(execution.listApplications()[0]?.id, application.id);
  assert.equal(execution.listDocuments()[0]?.id, document.id);
  assert.equal(execution.listDataRooms()[0]?.id, room.id);
  assert.ok(execution.listDataRoomFolders().some((item) => item.dataRoomId === room.id));
  assert.equal(execution.listDataRoomDocuments()[0]?.id, roomDocument.id);
  assert.equal(execution.listDueDiligenceRequests()[0]?.id, dd.id);
  assert.equal(execution.listTermSheets()[0]?.id, term.id);
  assert.equal(execution.listOutcomes()[0]?.id, outcome.id);
  assert.equal(continuity.listActivities()[0]?.title, "Legacy event");

  const nextFund = equity.createFund({ name: "Post-migration Fund", fundType: "venture", website: "", geography: "United States", portfolio: "", notes: "" });
  const nextAction = repo.createAction({ track: "grant", title: "Post-migration action", amountCents: 1_000_000, stage: "prepare", priority: "medium", deadline: null, nextStep: "Prepare", owner: "Owner", result: "" });
  assert.ok(nextFund.id > fund.id);
  assert.ok(nextAction.id > action.id);

  for (const table of TENANT_SCOPED_BUSINESS_TABLES) {
    const column = repo.db.prepare(`PRAGMA table_info("${table}")`).all() as unknown as Array<{ name: string; notnull: number }>;
    assert.equal(column.find((item) => item.name === "workspace_id")?.notnull, 1, `${table}.workspace_id should be NOT NULL after migration`);
  }

  repo.close();
});
