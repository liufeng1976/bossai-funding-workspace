import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import { TENANT_SCOPED_BUSINESS_TABLES, WORKSPACE_REFERENCE_RULES, inspectTenantSchemaPreparation } from "../src/server/tenant-scope.ts";

test("tenant schema preparation scopes all financing tables and keeps remote enablement blocked", async () => {
  const repo = new FundingRepository(":memory:");
  repo.saveCompanyProfile({
    name: "Tenant Migration Co",
    industry: "Software",
    stage: "growth",
    geography: "United States",
    foundedYear: 2022,
    annualRevenueCents: 100_000_000,
    mrrCents: 8_000_000,
    arrCents: 96_000_000,
    growthRatePct: 45,
    grossMarginPct: 70,
    cashBalanceCents: 20_000_000,
    monthlyBurnCents: 5_000_000,
    runwayMonths: 4,
    teamSize: 12,
    product: "Funding workflow software",
    businessModel: "Subscription",
    fundingHistory: "Founder funded",
    existingDebtCents: 0,
    capTableSummary: "Founder controlled",
    useOfFunds: "Growth",
    targetFundingCents: 50_000_000,
    targetFundingDate: "2027-01-31",
  });

  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const response = await fetch(`${baseUrl}/api/security/tenant-scope`);
    assert.equal(response.status, 200);
    const status = await response.json() as ReturnType<typeof inspectTenantSchemaPreparation>;
    assert.equal(status.expectedTableCount, TENANT_SCOPED_BUSINESS_TABLES.length);
    assert.equal(status.preparedTableCount, TENANT_SCOPED_BUSINESS_TABLES.length);
    assert.equal(status.schemaPreparationComplete, true);
    assert.equal(status.strictWorkspaceTableCount, TENANT_SCOPED_BUSINESS_TABLES.length);
    assert.equal(status.nullableWorkspaceTableCount, 0);
    assert.equal(status.databaseWorkspaceConstraintsComplete, true);
    assert.equal(status.databaseWorkspaceGuardTableCount, TENANT_SCOPED_BUSINESS_TABLES.length);
    assert.equal(status.databaseWorkspaceGuardsComplete, true);
    assert.equal(status.referenceGuardCount, WORKSPACE_REFERENCE_RULES.length);
    assert.equal(status.expectedReferenceGuardCount, WORKSPACE_REFERENCE_RULES.length);
    assert.equal(status.databaseReferenceGuardsComplete, true);
    assert.deepEqual(status.nullableWorkspaceTables, []);
    assert.equal(status.rowsWithoutWorkspace, 0);
    assert.equal(status.rowsOutsideWorkspace, 0);
    assert.equal(status.foreignKeyViolationCount, 0);
    assert.equal(status.repositoriesTenantScoped, true);
    assert.equal(status.crossTenantNegativeTestsPassed, true);
    assert.equal(status.remoteAccessEligible, false);

    const profileRow = repo.db.prepare("SELECT workspace_id FROM company_profile WHERE id=1").get() as { workspace_id?: string } | undefined;
    assert.equal(profileRow?.workspace_id, status.workspaceId);

    const actionResponse = await fetch(`${baseUrl}/api/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        track: "grant",
        title: "Scoped action",
        amountCents: 5_000_000,
        stage: "prepare",
        priority: "high",
        deadline: "2026-09-30",
        nextStep: "Prepare application",
        owner: "Owner",
        result: "",
      }),
    });
    assert.equal(actionResponse.status, 201);
    const actionRow = repo.db.prepare("SELECT workspace_id FROM funding_action ORDER BY id DESC LIMIT 1").get() as { workspace_id?: string } | undefined;
    assert.equal(actionRow?.workspace_id, status.workspaceId);

    const afterInsert = inspectTenantSchemaPreparation(repo.db, status.workspaceId);
    assert.equal(afterInsert.schemaPreparationComplete, true);
    assert.equal(afterInsert.rowsWithoutWorkspace, 0);

    assert.throws(() => repo.db.prepare("INSERT INTO funding_action(track,title,amount_cents,stage,priority,deadline,next_step,owner,result,created_at,updated_at) VALUES ('grant','Unscoped bypass',0,'prepare','low',NULL,'Nope','Owner','','2026-08-15T00:00:00.000Z','2026-08-15T00:00:00.000Z')").run(), /workspace scope required/i);
    assert.throws(() => repo.db.prepare("INSERT INTO funding_action(workspace_id,track,title,amount_cents,stage,priority,deadline,next_step,owner,result,created_at,updated_at) VALUES ('unknown-workspace','grant','Unknown bypass',0,'prepare','low',NULL,'Nope','Owner','','2026-08-15T00:00:00.000Z','2026-08-15T00:00:00.000Z')").run(), /workspace scope required/i);

    const workspaceB = "33333333-3333-4333-8333-333333333333";
    repo.db.prepare("INSERT INTO funding_workspace(workspace_id,tenant_id,identity_issuer,created_at,bound_at,status) VALUES (?,?,?,?,?,'active')").run(workspaceB,`tenant-b:${workspaceB}`,"test-issuer","2026-08-15T00:00:00.000Z","2026-08-15T00:00:00.000Z");
    assert.throws(() => repo.db.prepare("UPDATE funding_action SET workspace_id=? WHERE id=(SELECT id FROM funding_action ORDER BY id DESC LIMIT 1)").run(workspaceB), /workspace scope is immutable/i);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});
