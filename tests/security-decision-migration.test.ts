import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { SecurityDecisionRepository } from "../src/server/security-decision-database.ts";

test("security decision schema upgrade preserves v0.12 evidence and admits unclassified-api denials", () => {
  const db = new DatabaseSync(":memory:");
  const workspaceId = "11111111-1111-4111-8111-111111111111";
  const now = "2026-08-15T12:00:00.000Z";
  try {
    db.exec(`
      PRAGMA foreign_keys=ON;
      CREATE TABLE funding_workspace (
        workspace_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        identity_issuer TEXT NOT NULL,
        created_at TEXT NOT NULL,
        bound_at TEXT NOT NULL,
        status TEXT NOT NULL
      );
      CREATE TABLE security_decision_event (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL REFERENCES funding_workspace(workspace_id) ON DELETE CASCADE,
        subject TEXT,
        tenant_id TEXT,
        issuer TEXT,
        effective_role TEXT CHECK (effective_role IS NULL OR effective_role IN ('owner','editor','viewer')),
        identity_state TEXT NOT NULL CHECK (identity_state IN ('verified-external','unverified','local-owner')),
        operation TEXT NOT NULL CHECK (operation IN ('read','mutate','export-summary','export-data','backup','restore')),
        method TEXT NOT NULL,
        pathname TEXT NOT NULL,
        decision TEXT NOT NULL CHECK (decision IN ('allow','deny')),
        reason TEXT NOT NULL,
        adapter_key TEXT,
        created_at TEXT NOT NULL
      );
    `);
    db.prepare("INSERT INTO funding_workspace(workspace_id,tenant_id,identity_issuer,created_at,bound_at,status) VALUES (?,?,?,?,?,'active')")
      .run(workspaceId, "tenant-a", "approved-issuer", now, now);
    db.prepare(`
      INSERT INTO security_decision_event(
        workspace_id,subject,tenant_id,issuer,effective_role,identity_state,operation,method,pathname,decision,reason,adapter_key,created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(workspaceId, "user-1", "tenant-a", "approved-issuer", "viewer", "verified-external", "read", "GET", "/api/bootstrap", "allow", "legacy evidence", "adapter-a", now);

    const repository = new SecurityDecisionRepository(db, workspaceId);
    const migrated = repository.list();
    assert.equal(migrated.length, 1);
    assert.equal(migrated[0]?.id, 1);
    assert.equal(migrated[0]?.reason, "legacy evidence");
    assert.equal(migrated[0]?.operation, "read");

    const denied = repository.record({
      subject: null,
      tenantId: "tenant-a",
      issuer: "local-owner",
      effectiveRole: "owner",
      identityState: "local-owner",
      operation: "unclassified-api",
      method: "GET",
      pathname: "/api/future-route",
      decision: "deny",
      reason: "route not registered",
      adapterKey: null,
    });
    assert.equal(denied.id, 2);
    assert.equal(denied.operation, "unclassified-api");

    const table = db.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name='security_decision_event'").get() as { sql?: string };
    assert.match(table.sql ?? "", /unclassified-api/);
    assert.equal((db.prepare("PRAGMA foreign_key_check").all() as unknown[]).length, 0);
  } finally {
    db.close();
  }
});
