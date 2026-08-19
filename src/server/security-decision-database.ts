import type { DatabaseSync } from "node:sqlite";
import type { FundingAuthorizationOperation, FundingAuthorizationRole } from "./authorization-policy.ts";

export type SecurityDecision = "allow" | "deny";
export type SecurityIdentityState = "verified-external" | "unverified" | "local-owner";
export type SecurityDecisionOperation = FundingAuthorizationOperation | "unclassified-api";

export interface SecurityDecisionEventInput {
  workspaceId: string;
  subject: string | null;
  tenantId: string | null;
  issuer: string | null;
  effectiveRole: FundingAuthorizationRole | null;
  identityState: SecurityIdentityState;
  operation: SecurityDecisionOperation;
  method: string;
  pathname: string;
  decision: SecurityDecision;
  reason: string;
  adapterKey: string | null;
}

export interface SecurityDecisionEvent extends SecurityDecisionEventInput {
  id: number;
  createdAt: string;
}

interface SecurityDecisionRow {
  id: number;
  workspace_id: string;
  subject: string | null;
  tenant_id: string | null;
  issuer: string | null;
  effective_role: FundingAuthorizationRole | null;
  identity_state: SecurityIdentityState;
  operation: SecurityDecisionOperation;
  method: string;
  pathname: string;
  decision: SecurityDecision;
  reason: string;
  adapter_key: string | null;
  created_at: string;
}

export const SECURITY_SCOPED_TABLES = ["security_decision_event"] as const;

export const SECURITY_DECISION_RETENTION = Object.freeze({
  maxEventsPerWorkspace: 5_000,
  maxSubjectChars: 256,
  maxTenantIdChars: 256,
  maxIssuerChars: 512,
  maxMethodChars: 16,
  maxPathnameChars: 2_048,
  maxReasonChars: 2_048,
  maxAdapterKeyChars: 128,
});

export interface SecurityDecisionRetentionStatus {
  ready: true;
  workspaceId: string;
  currentEventCount: number;
  maxEventsPerWorkspace: number;
  withinRetentionLimit: boolean;
  pruningMode: "oldest-first-per-workspace";
  ownerRestorePreservesEvidence: true;
}

function bounded(value: string | null, maxChars: number): string | null {
  if (value === null) return null;
  return value.length <= maxChars ? value : value.slice(0, maxChars);
}

export function ensureSecurityDecisionSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_decision_event (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT NOT NULL REFERENCES funding_workspace(workspace_id) ON DELETE CASCADE,
      subject TEXT,
      tenant_id TEXT,
      issuer TEXT,
      effective_role TEXT CHECK (effective_role IS NULL OR effective_role IN ('owner','editor','viewer')),
      identity_state TEXT NOT NULL CHECK (identity_state IN ('verified-external','unverified','local-owner')),
      operation TEXT NOT NULL CHECK (operation IN ('read','mutate','export-summary','export-data','backup','restore','unclassified-api')),
      method TEXT NOT NULL,
      pathname TEXT NOT NULL,
      decision TEXT NOT NULL CHECK (decision IN ('allow','deny')),
      reason TEXT NOT NULL,
      adapter_key TEXT,
      created_at TEXT NOT NULL
    );
  `);

  const tableSql = db.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name='security_decision_event'")
    .get() as { sql?: string } | undefined;
  if (tableSql?.sql && !tableSql.sql.includes("unclassified-api")) {
    db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE security_decision_event_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL REFERENCES funding_workspace(workspace_id) ON DELETE CASCADE,
        subject TEXT,
        tenant_id TEXT,
        issuer TEXT,
        effective_role TEXT CHECK (effective_role IS NULL OR effective_role IN ('owner','editor','viewer')),
        identity_state TEXT NOT NULL CHECK (identity_state IN ('verified-external','unverified','local-owner')),
        operation TEXT NOT NULL CHECK (operation IN ('read','mutate','export-summary','export-data','backup','restore','unclassified-api')),
        method TEXT NOT NULL,
        pathname TEXT NOT NULL,
        decision TEXT NOT NULL CHECK (decision IN ('allow','deny')),
        reason TEXT NOT NULL,
        adapter_key TEXT,
        created_at TEXT NOT NULL
      );
      INSERT INTO security_decision_event_v2(
        id,workspace_id,subject,tenant_id,issuer,effective_role,identity_state,operation,method,pathname,decision,reason,adapter_key,created_at
      )
      SELECT id,workspace_id,subject,tenant_id,issuer,effective_role,identity_state,operation,method,pathname,decision,reason,adapter_key,created_at
      FROM security_decision_event;
      DROP TABLE security_decision_event;
      ALTER TABLE security_decision_event_v2 RENAME TO security_decision_event;
      COMMIT;
    `);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_security_decision_workspace_created
      ON security_decision_event(workspace_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_security_decision_workspace_decision
      ON security_decision_event(workspace_id, decision, created_at DESC);
  `);
}

function fromRow(row: SecurityDecisionRow): SecurityDecisionEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    subject: row.subject,
    tenantId: row.tenant_id,
    issuer: row.issuer,
    effectiveRole: row.effective_role,
    identityState: row.identity_state,
    operation: row.operation,
    method: row.method,
    pathname: row.pathname,
    decision: row.decision,
    reason: row.reason,
    adapterKey: row.adapter_key,
    createdAt: row.created_at,
  };
}

export class SecurityDecisionRepository {
  private readonly db: DatabaseSync;
  private readonly workspaceId: string;

  constructor(db: DatabaseSync, workspaceId: string) {
    this.db = db;
    this.workspaceId = workspaceId;
    ensureSecurityDecisionSchema(db);
    this.pruneRetention();
  }

  private pruneRetention(): void {
    this.db.prepare(`
      DELETE FROM security_decision_event
      WHERE workspace_id=?
        AND id NOT IN (
          SELECT id FROM security_decision_event
          WHERE workspace_id=?
          ORDER BY id DESC
          LIMIT ?
        )
    `).run(this.workspaceId, this.workspaceId, SECURITY_DECISION_RETENTION.maxEventsPerWorkspace);
  }

  record(input: Omit<SecurityDecisionEventInput, "workspaceId">): SecurityDecisionEvent {
    const createdAt = new Date().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = this.db.prepare(`
        INSERT INTO security_decision_event(
          workspace_id,subject,tenant_id,issuer,effective_role,identity_state,operation,method,pathname,decision,reason,adapter_key,created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        this.workspaceId,
        bounded(input.subject, SECURITY_DECISION_RETENTION.maxSubjectChars),
        bounded(input.tenantId, SECURITY_DECISION_RETENTION.maxTenantIdChars),
        bounded(input.issuer, SECURITY_DECISION_RETENTION.maxIssuerChars),
        input.effectiveRole,
        input.identityState,
        input.operation,
        bounded(input.method.toUpperCase(), SECURITY_DECISION_RETENTION.maxMethodChars),
        bounded(input.pathname, SECURITY_DECISION_RETENTION.maxPathnameChars),
        input.decision,
        bounded(input.reason, SECURITY_DECISION_RETENTION.maxReasonChars),
        bounded(input.adapterKey, SECURITY_DECISION_RETENTION.maxAdapterKeyChars),
        createdAt,
      );
      const row = this.db.prepare("SELECT * FROM security_decision_event WHERE id=? AND workspace_id=?")
        .get(result.lastInsertRowid, this.workspaceId) as unknown as SecurityDecisionRow;
      this.pruneRetention();
      this.db.exec("COMMIT");
      return fromRow(row);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  list(limit = 100): SecurityDecisionEvent[] {
    const safeLimit = Math.max(1, Math.min(500, Math.round(limit)));
    return (this.db.prepare(`
      SELECT * FROM security_decision_event
      WHERE workspace_id=?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).all(this.workspaceId, safeLimit) as unknown as SecurityDecisionRow[]).map(fromRow);
  }

  retentionStatus(): SecurityDecisionRetentionStatus {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM security_decision_event WHERE workspace_id=?")
      .get(this.workspaceId) as { count?: number } | undefined;
    const currentEventCount = Number(row?.count ?? 0);
    return {
      ready: true,
      workspaceId: this.workspaceId,
      currentEventCount,
      maxEventsPerWorkspace: SECURITY_DECISION_RETENTION.maxEventsPerWorkspace,
      withinRetentionLimit: currentEventCount <= SECURITY_DECISION_RETENTION.maxEventsPerWorkspace,
      pruningMode: "oldest-first-per-workspace",
      ownerRestorePreservesEvidence: true,
    };
  }
}
