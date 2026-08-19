import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import {
  SECURITY_DECISION_RETENTION,
  SecurityDecisionRepository,
} from "../src/server/security-decision-database.ts";

test("security decision retention prunes oldest events per workspace without touching another tenant", () => {
  const fundingRepo = new FundingRepository(":memory:");
  const server = createFundingServer(fundingRepo, resolve(process.cwd(), "public"));
  const workspaceA = fundingRepo.getWorkspaceBinding();
  assert.ok(workspaceA);
  const now = new Date().toISOString();
  const workspaceB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  fundingRepo.db.prepare(`
    INSERT INTO funding_workspace(workspace_id,tenant_id,identity_issuer,created_at,bound_at,status)
    VALUES (?,?,?,?,?,'active')
  `).run(workspaceB, `tenant-b:${workspaceB}`, "test-issuer", now, now);

  const securityA = new SecurityDecisionRepository(fundingRepo.db, workspaceA);
  const securityB = new SecurityDecisionRepository(fundingRepo.db, workspaceB);
  securityB.record({
    subject: "owner-b",
    tenantId: `tenant-b:${workspaceB}`,
    issuer: "test-issuer",
    effectiveRole: "owner",
    identityState: "verified-external",
    operation: "read",
    method: "GET",
    pathname: "/api/bootstrap",
    decision: "allow",
    reason: "Tenant B evidence must survive Tenant A pruning.",
    adapterKey: "test-adapter",
  });

  const insert = fundingRepo.db.prepare(`
    INSERT INTO security_decision_event(
      workspace_id,subject,tenant_id,issuer,effective_role,identity_state,operation,method,pathname,decision,reason,adapter_key,created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  fundingRepo.db.exec("BEGIN IMMEDIATE");
  try {
    for (let index = 0; index <= SECURITY_DECISION_RETENTION.maxEventsPerWorkspace; index += 1) {
      insert.run(
        workspaceA,
        "owner-a",
        `local-workspace:${workspaceA}`,
        "local-owner",
        "owner",
        "local-owner",
        "read",
        "GET",
        `/api/test/${index}`,
        "allow",
        `seed-${index}`,
        null,
        now,
      );
    }
    fundingRepo.db.exec("COMMIT");
  } catch (error) {
    fundingRepo.db.exec("ROLLBACK");
    throw error;
  }

  const reopenedSecurityA = new SecurityDecisionRepository(fundingRepo.db, workspaceA);
  assert.equal(reopenedSecurityA.retentionStatus().currentEventCount, SECURITY_DECISION_RETENTION.maxEventsPerWorkspace);
  const oldestAfterStartupPrune = fundingRepo.db.prepare(`
    SELECT reason FROM security_decision_event
    WHERE workspace_id=?
    ORDER BY id ASC LIMIT 1
  `).get(workspaceA) as { reason?: string } | undefined;
  assert.equal(oldestAfterStartupPrune?.reason, "seed-1");

  reopenedSecurityA.record({
    subject: "owner-a",
    tenantId: `local-workspace:${workspaceA}`,
    issuer: "local-owner",
    effectiveRole: "owner",
    identityState: "local-owner",
    operation: "mutate",
    method: "PUT",
    pathname: "/api/company-profile",
    decision: "allow",
    reason: "Newest event retained after pruning.",
    adapterKey: null,
  });

  const statusA = reopenedSecurityA.retentionStatus();
  assert.equal(statusA.currentEventCount, SECURITY_DECISION_RETENTION.maxEventsPerWorkspace);
  assert.equal(statusA.withinRetentionLimit, true);
  assert.equal(statusA.pruningMode, "oldest-first-per-workspace");
  const oldestSeed = fundingRepo.db.prepare(`
    SELECT reason FROM security_decision_event
    WHERE workspace_id=?
    ORDER BY id ASC LIMIT 1
  `).get(workspaceA) as { reason?: string } | undefined;
  assert.equal(oldestSeed?.reason, "seed-2");
  assert.equal(securityB.retentionStatus().currentEventCount, 1);
  assert.equal(securityB.list(1)[0]?.reason, "Tenant B evidence must survive Tenant A pruning.");

  if (server.listening) server.close();
  fundingRepo.close();
});

test("security decision text fields are bounded before local persistence", () => {
  const fundingRepo = new FundingRepository(":memory:");
  const server = createFundingServer(fundingRepo, resolve(process.cwd(), "public"));
  const workspaceId = fundingRepo.getWorkspaceBinding();
  assert.ok(workspaceId);
  const security = new SecurityDecisionRepository(fundingRepo.db, workspaceId);

  const event = security.record({
    subject: "s".repeat(SECURITY_DECISION_RETENTION.maxSubjectChars + 50),
    tenantId: "t".repeat(SECURITY_DECISION_RETENTION.maxTenantIdChars + 50),
    issuer: "i".repeat(SECURITY_DECISION_RETENTION.maxIssuerChars + 50),
    effectiveRole: "owner",
    identityState: "verified-external",
    operation: "mutate",
    method: "VERYLONGMETHOD".repeat(5),
    pathname: "/" + "p".repeat(SECURITY_DECISION_RETENTION.maxPathnameChars + 100),
    decision: "deny",
    reason: "r".repeat(SECURITY_DECISION_RETENTION.maxReasonChars + 100),
    adapterKey: "a".repeat(SECURITY_DECISION_RETENTION.maxAdapterKeyChars + 100),
  });

  assert.equal(event.subject?.length, SECURITY_DECISION_RETENTION.maxSubjectChars);
  assert.equal(event.tenantId?.length, SECURITY_DECISION_RETENTION.maxTenantIdChars);
  assert.equal(event.issuer?.length, SECURITY_DECISION_RETENTION.maxIssuerChars);
  assert.equal(event.method.length, SECURITY_DECISION_RETENTION.maxMethodChars);
  assert.equal(event.pathname.length, SECURITY_DECISION_RETENTION.maxPathnameChars);
  assert.equal(event.reason.length, SECURITY_DECISION_RETENTION.maxReasonChars);
  assert.equal(event.adapterKey?.length, SECURITY_DECISION_RETENTION.maxAdapterKeyChars);

  if (server.listening) server.close();
  fundingRepo.close();
});
