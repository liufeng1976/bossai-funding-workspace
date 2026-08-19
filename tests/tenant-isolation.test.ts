import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { ContinuityRepository } from "../src/server/continuity.ts";
import { FundingRepository } from "../src/server/database.ts";
import { EquityRepository } from "../src/server/equity-database.ts";
import { ExecutionRepository } from "../src/server/execution-database.ts";
import { OpportunityRepository } from "../src/server/opportunity-database.ts";
import { FundingSourceRepository } from "../src/server/source-database.ts";
import { SecurityDecisionRepository } from "../src/server/security-decision-database.ts";
import { ensureWorkspaceRevisionSchema } from "../src/server/workspace-revision.ts";
import type { CompanyProfileInput, FundingOpportunityInput, InvestorInput } from "../src/domain/types.ts";

function profile(name: string): CompanyProfileInput {
  return {
    name,
    industry: "Software",
    stage: "growth",
    geography: "United States",
    foundedYear: 2022,
    annualRevenueCents: 120_000_000,
    mrrCents: 10_000_000,
    arrCents: 120_000_000,
    growthRatePct: 50,
    grossMarginPct: 70,
    cashBalanceCents: 30_000_000,
    monthlyBurnCents: 6_000_000,
    runwayMonths: 5,
    teamSize: 15,
    product: "Funding operations software",
    businessModel: "Subscription",
    fundingHistory: "Founder funded",
    existingDebtCents: 0,
    capTableSummary: "Founder controlled",
    useOfFunds: "Growth",
    targetFundingCents: 80_000_000,
    targetFundingDate: "2027-02-01",
  };
}

function investor(name: string): InvestorInput {
  return {
    name,
    fundId: null,
    roundId: null,
    stage: "target",
    priority: "high",
    relationship: "cold",
    warmIntroSource: "",
    chequeMinCents: 10_000_000,
    chequeMaxCents: 30_000_000,
    geography: "United States",
    sectors: "Software",
    stages: "growth",
    portfolio: "",
    lastContactDate: null,
    nextFollowUpDate: "2026-09-01",
    nextAction: "Research partner fit",
    owner: "Owner",
    notes: "",
    rejectionReason: "",
  };
}

function opportunity(title: string, decision: FundingOpportunityInput["decision"]): FundingOpportunityInput {
  return {
    type: "grant",
    title,
    provider: "Official source",
    sourceUrl: "https://example.invalid/opportunity",
    description: "Official opportunity facts",
    geography: "",
    sectors: "Software",
    stages: "",
    amountMinCents: 0,
    amountMaxCents: 25_000_000,
    deadline: "2026-12-31",
    decision,
    grantProgramType: "Grant",
    grantEligibility: "Verify official notice",
    matchFundingRequiredCents: 0,
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

test("workspace-scoped repositories, export, backup and restore isolate tenant A from tenant B", async () => {
  const temp = mkdtempSync(join(tmpdir(), "bossai-funding-tenant-isolation-"));
  const databasePath = join(temp, "funding.sqlite");
  const repo = new FundingRepository(databasePath);
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const workspaceA = repo.getWorkspaceBinding();
  assert.ok(workspaceA);
  const tenantA = `local-workspace:${workspaceA}`;
  const workspaceB = "22222222-2222-4222-8222-222222222222";
  const tenantB = `tenant-b:${workspaceB}`;
  const now = new Date().toISOString();
  repo.db.prepare("INSERT INTO funding_workspace(workspace_id,tenant_id,identity_issuer,created_at,bound_at,status) VALUES (?,?,?,?,?,'active')")
    .run(workspaceB, tenantB, "test-issuer", now, now);
  ensureWorkspaceRevisionSchema(repo.db, workspaceB);

  const equityA = new EquityRepository(repo.db); equityA.bindWorkspace(workspaceA);
  const equityB = new EquityRepository(repo.db); equityB.bindWorkspace(workspaceB);
  const opportunityA = new OpportunityRepository(repo.db); opportunityA.bindWorkspace(workspaceA);
  const opportunityB = new OpportunityRepository(repo.db); opportunityB.bindWorkspace(workspaceB);
  const executionA = new ExecutionRepository(repo.db); executionA.bindWorkspace(workspaceA);
  const executionB = new ExecutionRepository(repo.db); executionB.bindWorkspace(workspaceB);
  const sourceA = new FundingSourceRepository(repo.db); sourceA.bindWorkspace(workspaceA);
  const sourceB = new FundingSourceRepository(repo.db); sourceB.bindWorkspace(workspaceB);
  const securityA = new SecurityDecisionRepository(repo.db, workspaceA);
  const securityB = new SecurityDecisionRepository(repo.db, workspaceB);
  const continuity = new ContinuityRepository(repo.db, databasePath);

  try {
    repo.bindWorkspace(workspaceA);
    repo.saveCompanyProfile(profile("Workspace A Co"));
    repo.bindWorkspace(workspaceB);
    repo.saveCompanyProfile(profile("Workspace B Co"));
    repo.bindWorkspace(workspaceA);
    assert.equal(repo.getCompanyProfile()?.name, "Workspace A Co");

    const fundB = equityB.createFund({ name: "Tenant B Fund", fundType: "venture", website: "", geography: "United States", portfolio: "", notes: "" });
    const investorB = equityB.createInvestor({ ...investor("Tenant B Capital"), fundId: fundB.id });
    assert.equal(equityA.listInvestors().length, 0);
    assert.throws(() => repo.db.prepare("INSERT INTO investor(workspace_id,name,fund_id,round_id,stage,priority,relationship,warm_intro_source,cheque_min_cents,cheque_max_cents,geography,sectors,stages,portfolio,last_contact_date,next_follow_up_date,next_action,owner,notes,rejection_reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(workspaceA,"Raw cross-workspace investor",fundB.id,null,"target","high","cold","",0,1,"United States","Software","growth","",null,null,"Blocked","Owner","","",now,now), /cross-workspace reference blocked/i);
    assert.equal(equityA.updateInvestor(investorB.id, { ...investor("Attempted overwrite"), name: "Attempted overwrite" }), null);
    assert.equal(equityB.listInvestors()[0]?.name, "Tenant B Capital");

    const oppB = opportunityB.createOpportunity(opportunity("Tenant B Grant", "dismissed"));
    const oppA = opportunityA.createOpportunity(opportunity("Tenant A Grant", "saved"));
    assert.deepEqual(opportunityA.listOpportunities().map((item) => item.id), [oppA.id]);
    assert.throws(() => repo.db.prepare("INSERT INTO funding_application(workspace_id,opportunity_id,track,title,requested_amount_cents,approved_amount_cents,status,deadline,submitted_date,decision_date,owner,next_action,rejection_reason,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(workspaceA,oppB.id,"grant","Raw cross-tenant application",0,0,"draft",null,null,null,"Owner","Blocked","","",now,now), /cross-workspace reference blocked/i);
    assert.throws(() => executionA.createApplication({
      opportunityId: oppB.id,
      track: "grant",
      title: "Cross-tenant application",
      requestedAmountCents: 10_000_000,
      approvedAmountCents: 0,
      status: "draft",
      deadline: null,
      submittedDate: null,
      decisionDate: null,
      owner: "Owner",
      nextAction: "Should never persist",
      rejectionReason: "",
      notes: "",
    }), /does not belong to the active funding workspace/i);
    assert.equal(executionA.listApplications().length, 0);
    assert.throws(() => executionA.createDueDiligenceRequest({ investorId: investorB.id, roundId: null, documentId: null, owner: "Owner", deadline: null, status: "requested", request: "Cross-tenant DD", responseNotes: "" }), /does not belong to the active funding workspace/i);
    assert.throws(() => executionA.createTermSheet({ investorId: investorB.id, roundId: null, investmentAmountCents: 10_000_000, preMoneyValuationCents: null, equityPct: null, liquidationPreference: "1x", boardSeat: "", proRata: "", vesting: "", optionPool: "", exclusivity: "", closingConditions: "", status: "received", notes: "" }), /does not belong to the active funding workspace/i);
    const investorA = equityA.createInvestor(investor("Tenant A Capital"));
    const termA = executionA.createTermSheet({ investorId: investorA.id, roundId: null, investmentAmountCents: 10_000_000, preMoneyValuationCents: null, equityPct: null, liquidationPreference: "1x", boardSeat: "", proRata: "", vesting: "", optionPool: "", exclusivity: "", closingConditions: "Execute documents", targetCloseDate: null, status: "accepted", notes: "" });
    const termB = executionB.createTermSheet({ investorId: investorB.id, roundId: null, investmentAmountCents: 10_000_000, preMoneyValuationCents: null, equityPct: null, liquidationPreference: "1x", boardSeat: "", proRata: "", vesting: "", optionPool: "", exclusivity: "", closingConditions: "Execute documents", targetCloseDate: null, status: "accepted", notes: "" });
    const conditionA = executionA.createClosingCondition({ termSheetId: termA.id, title: "Tenant A closing condition", owner: "Owner", dueDate: null, status: "open", evidenceNote: "" });
    executionB.createClosingCondition({ termSheetId: termB.id, title: "Tenant B closing condition", owner: "Owner", dueDate: null, status: "open", evidenceNote: "" });
    assert.deepEqual(executionA.listClosingConditions().map((item) => item.id), [conditionA.id]);
    assert.throws(() => executionA.createClosingCondition({ termSheetId: termB.id, title: "Cross-tenant condition", owner: "Owner", dueDate: null, status: "open", evidenceNote: "" }), /does not belong to the active funding workspace/i);
    assert.throws(() => executionA.createOutcome({ track: "equity", applicationId: null, investorId: investorB.id, roundId: null, status: "won", approvedAmountCents: 0, committedAmountCents: 0, receivedAmountCents: 0, receivedDate: null, conditions: "", lossReason: "", feedback: "", retryDate: null }), /does not belong to the active funding workspace/i);
    const outcomeA = executionA.createOutcome({ track: "equity", applicationId: null, investorId: investorA.id, roundId: null, status: "closed", approvedAmountCents: 10_000_000, committedAmountCents: 10_000_000, receivedAmountCents: 0, receivedDate: null, commitmentEvidence: "Tenant A signed closing", receiptEvidence: "", conditions: "", lossReason: "", feedback: "", retryDate: null });
    const outcomeB = executionB.createOutcome({ track: "equity", applicationId: null, investorId: investorB.id, roundId: null, status: "closed", approvedAmountCents: 10_000_000, committedAmountCents: 10_000_000, receivedAmountCents: 0, receivedDate: null, commitmentEvidence: "Tenant B signed closing", receiptEvidence: "", conditions: "", lossReason: "", feedback: "", retryDate: null });
    const trancheA = executionA.createReceiptTranche({ outcomeId: outcomeA.id, amountCents: 1_000_000, receivedDate: "2026-08-17", receiptEvidence: "Tenant A bank receipt", note: "", status: "received", voidReason: "" });
    executionB.createReceiptTranche({ outcomeId: outcomeB.id, amountCents: 1_000_000, receivedDate: "2026-08-17", receiptEvidence: "Tenant B bank receipt", note: "", status: "received", voidReason: "" });
    assert.deepEqual(executionA.listReceiptTranches().map((item) => item.id), [trancheA.id]);
    assert.throws(() => executionA.createReceiptTranche({ outcomeId: outcomeB.id, amountCents: 1_000_000, receivedDate: "2026-08-18", receiptEvidence: "Cross-tenant receipt", note: "", status: "received", voidReason: "" }), /does not belong to the active funding workspace/i);
    const expectationA = executionA.createReceiptExpectation({ outcomeId: outcomeA.id, amountCents: 9_000_000, expectedDate: "2026-08-25", basisNote: "Tenant A payer confirmation", owner: "Owner A", note: "", status: "expected", cancellationReason: "" });
    executionB.createReceiptExpectation({ outcomeId: outcomeB.id, amountCents: 9_000_000, expectedDate: "2026-08-26", basisNote: "Tenant B payer confirmation", owner: "Owner B", note: "", status: "expected", cancellationReason: "" });
    assert.deepEqual(executionA.listReceiptExpectations().map((item) => item.id), [expectationA.id]);
    assert.throws(() => executionA.createReceiptExpectation({ outcomeId: outcomeB.id, amountCents: 1_000_000, expectedDate: "2026-08-27", basisNote: "Cross-tenant schedule", owner: "Owner A", note: "", status: "expected", cancellationReason: "" }), /does not belong to the active funding workspace/i);
    const allocationA = executionA.createReceiptExpectationAllocation({ expectationId: expectationA.id, trancheId: trancheA.id, amountCents: 1_000_000, note: "Tenant A explicit allocation", status: "active", voidReason: "" });
    const trancheB = executionB.listReceiptTranches()[0]!;
    const expectationB = executionB.listReceiptExpectations()[0]!;
    executionB.createReceiptExpectationAllocation({ expectationId: expectationB.id, trancheId: trancheB.id, amountCents: 1_000_000, note: "Tenant B explicit allocation", status: "active", voidReason: "" });
    assert.deepEqual(executionA.listReceiptExpectationAllocations().map((item) => item.id), [allocationA.id]);
    assert.throws(() => executionA.createReceiptExpectationAllocation({ expectationId: expectationA.id, trancheId: trancheB.id, amountCents: 1, note: "Cross-tenant tranche", status: "active", voidReason: "" }), /does not belong to the active funding workspace/i);
    assert.throws(() => executionA.createReceiptExpectationAllocation({ expectationId: expectationB.id, trancheId: trancheA.id, amountCents: 1, note: "Cross-tenant expectation", status: "active", voidReason: "" }), /does not belong to the active funding workspace/i);

    const forged = await fetch(`${baseUrl}/api/bootstrap`, { headers: { "x-bossai-tenant-id": tenantB, "x-bossai-workspace-id": workspaceB } });
    assert.equal(forged.status, 200);
    const forgedState = await forged.json() as { companyProfile?: { name?: string }; investors?: Array<{ name: string }>; opportunities?: Array<{ title: string }>; closingConditions?: Array<{ title: string }>; receiptExpectations?: Array<{ basisNote: string }>; receiptExpectationAllocations?: Array<{ note: string }> };
    assert.equal(forgedState.companyProfile?.name, "Workspace A Co");
    assert.equal(forgedState.investors?.some((item) => item.name === "Tenant B Capital"), false);
    assert.equal(forgedState.opportunities?.some((item) => item.title === "Tenant B Grant"), false);
    assert.equal(forgedState.closingConditions?.some((item) => item.title === "Tenant B closing condition"), false);
    assert.equal(forgedState.receiptExpectations?.some((item) => item.basisNote === "Tenant B payer confirmation"), false);
    assert.equal(forgedState.receiptExpectationAllocations?.some((item) => item.note === "Tenant B explicit allocation"), false);

    const sharedExternalId = "same-official-id";
    sourceB.saveSource({ opportunityId: oppB.id, providerKey: "official-test", sourceKind: "official-public", externalId: sharedExternalId, externalNumber: "B-1", canonicalUrl: "https://example.invalid/b", apiEndpoint: "https://example.invalid/api", termsUrl: "https://example.invalid/terms", fetchedAt: now, attribution: "Official test attribution" });
    sourceA.saveSource({ opportunityId: oppA.id, providerKey: "official-test", sourceKind: "official-public", externalId: sharedExternalId, externalNumber: "A-1", canonicalUrl: "https://example.invalid/a", apiEndpoint: "https://example.invalid/api", termsUrl: "https://example.invalid/terms", fetchedAt: now, attribution: "Official test attribution" });
    assert.equal(sourceA.findByExternalId("official-test", sharedExternalId)?.opportunityId, oppA.id);
    assert.equal(sourceB.findByExternalId("official-test", sharedExternalId)?.opportunityId, oppB.id);

    securityA.record({ subject: "owner-a", tenantId: tenantA, issuer: "test-issuer", effectiveRole: "owner", identityState: "verified-external", operation: "read", method: "GET", pathname: "/api/bootstrap", decision: "allow", reason: "Tenant A security evidence", adapterKey: "test-adapter" });
    securityB.record({ subject: "owner-b", tenantId: tenantB, issuer: "test-issuer", effectiveRole: "owner", identityState: "verified-external", operation: "read", method: "GET", pathname: "/api/bootstrap", decision: "allow", reason: "Tenant B security evidence", adapterKey: "test-adapter" });

    const exported = continuity.exportSnapshot();
    assert.equal(exported.workspaceId, workspaceA);
    assert.equal(exported.tenantId, tenantA);
    assert.deepEqual(exported.tables.company_profile?.map((row) => row.name), ["Workspace A Co"]);
    assert.deepEqual(exported.tables.funding_opportunity?.map((row) => row.title), ["Tenant A Grant"]);
    assert.deepEqual(exported.tables.term_sheet_closing_condition?.map((row) => row.title), ["Tenant A closing condition"]);
    assert.deepEqual(exported.tables.funding_receipt_tranche?.map((row) => row.receipt_evidence), ["Tenant A bank receipt"]);
    assert.deepEqual(exported.tables.funding_receipt_expectation?.map((row) => row.basis_note), ["Tenant A payer confirmation"]);
    assert.deepEqual(exported.tables.funding_receipt_expectation_allocation?.map((row) => row.note), ["Tenant A explicit allocation"]);
    assert.equal(exported.tables.funding_workspace?.length, 1);
    assert.equal(exported.tables.funding_workspace?.[0]?.workspace_id, workspaceA);
    assert.equal(Object.prototype.hasOwnProperty.call(exported.tables, "workspace_state_revision"), false);

    const backup = await continuity.createBackup("manual");
    const backupDb = new DatabaseSync(join(temp, "backups", backup.fileName), { readOnly: true });
    try {
      const backupCompanies = backupDb.prepare("SELECT name,workspace_id FROM company_profile ORDER BY name").all() as unknown as Array<{ name: string; workspace_id: string }>;
      const backupWorkspaces = backupDb.prepare("SELECT workspace_id FROM funding_workspace").all() as unknown as Array<{ workspace_id: string }>;
      const backupSecurity = backupDb.prepare("SELECT workspace_id,subject FROM security_decision_event ORDER BY id").all() as unknown as Array<{ workspace_id: string; subject: string }>;
      const backupRevisions = backupDb.prepare("SELECT workspace_id,revision FROM workspace_state_revision ORDER BY workspace_id").all() as unknown as Array<{ workspace_id: string; revision: number }>;
      assert.equal(backupCompanies.length, 1);
      assert.equal(backupCompanies[0]?.name, "Workspace A Co");
      assert.equal(backupCompanies[0]?.workspace_id, workspaceA);
      assert.equal(backupWorkspaces.length, 1);
      assert.equal(backupWorkspaces[0]?.workspace_id, workspaceA);
      assert.equal(backupSecurity.length, 1);
      assert.equal(backupSecurity[0]?.workspace_id, workspaceA);
      assert.equal(backupSecurity[0]?.subject, "owner-a");
      assert.equal(backupRevisions.length, 1);
      assert.equal(backupRevisions[0]?.workspace_id, workspaceA);
      assert.ok((backupRevisions[0]?.revision ?? -1) >= 0);
    } finally {
      backupDb.close();
    }

    securityA.record({ subject: "owner-a", tenantId: tenantA, issuer: "test-issuer", effectiveRole: "owner", identityState: "verified-external", operation: "mutate", method: "PUT", pathname: "/api/company-profile", decision: "allow", reason: "Security evidence created after backup", adapterKey: "test-adapter" });
    repo.bindWorkspace(workspaceA);
    repo.saveCompanyProfile(profile("Workspace A Mutated"));
    repo.bindWorkspace(workspaceB);
    repo.saveCompanyProfile(profile("Workspace B Must Survive Restore"));
    repo.bindWorkspace(workspaceA);
    await continuity.restoreBackup(backup.fileName);
    assert.equal(repo.getCompanyProfile()?.name, "Workspace A Co");
    assert.equal(securityA.list().length, 2, "owner restore must not erase operational security decision history");
    repo.bindWorkspace(workspaceB);
    assert.equal(repo.getCompanyProfile()?.name, "Workspace B Must Survive Restore");
    repo.bindWorkspace(workspaceA);
  } finally {
    if (server.listening) await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
    rmSync(temp, { recursive: true, force: true });
  }
});
