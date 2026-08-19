import type { IncomingHttpHeaders } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import type { FundingAuthorizationOperation } from "./authorization-policy.ts";
import { TENANT_SCOPED_BUSINESS_TABLES } from "./tenant-scope.ts";

export const WORKSPACE_REVISION_HEADER = "x-bossai-workspace-revision" as const;

export interface WorkspaceRevisionState {
  workspaceId: string;
  revision: number;
  updatedAt: string;
}

export interface WorkspaceRevisionReadiness {
  ready: boolean;
  currentRevision: number;
  trackedBusinessTableCount: number;
  expectedTriggerCount: number;
  installedTriggerCount: number;
  databaseDriven: true;
  browserPreconditionRequired: true;
  nativeClientCompatible: true;
  mutationSerializationReady: true;
}

export class WorkspaceRevisionError extends Error {
  readonly code: "WORKSPACE_REVISION_REQUIRED" | "STALE_WORKSPACE_STATE";
  readonly status: 428 | 409;
  readonly currentRevision: number;

  constructor(
    code: WorkspaceRevisionError["code"],
    status: WorkspaceRevisionError["status"],
    currentRevision: number,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceRevisionError";
    this.code = code;
    this.status = status;
    this.currentRevision = currentRevision;
  }
}

function sqlIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function triggerName(table: string, action: "insert" | "update" | "delete"): string {
  return `bossai_revision_${table}_${action}`;
}

export function ensureWorkspaceRevisionSchema(db: DatabaseSync, workspaceId: string): WorkspaceRevisionState {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspace_state_revision (
      workspace_id TEXT PRIMARY KEY REFERENCES funding_workspace(workspace_id) ON DELETE CASCADE,
      revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
      updated_at TEXT NOT NULL
    );
  `);

  db.prepare(`
    INSERT OR IGNORE INTO workspace_state_revision(workspace_id, revision, updated_at)
    VALUES (?, 0, ?)
  `).run(workspaceId, new Date().toISOString());

  for (const table of TENANT_SCOPED_BUSINESS_TABLES) {
    const quotedTable = sqlIdentifier(table);
    const insertTrigger = sqlIdentifier(triggerName(table, "insert"));
    const updateTrigger = sqlIdentifier(triggerName(table, "update"));
    const deleteTrigger = sqlIdentifier(triggerName(table, "delete"));
    db.exec(`
      DROP TRIGGER IF EXISTS ${insertTrigger};
      DROP TRIGGER IF EXISTS ${updateTrigger};
      DROP TRIGGER IF EXISTS ${deleteTrigger};

      CREATE TRIGGER ${insertTrigger}
      AFTER INSERT ON ${quotedTable}
      BEGIN
        UPDATE workspace_state_revision
        SET revision = revision + 1,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE workspace_id = NEW.workspace_id;
      END;

      CREATE TRIGGER ${updateTrigger}
      AFTER UPDATE ON ${quotedTable}
      BEGIN
        UPDATE workspace_state_revision
        SET revision = revision + 1,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE workspace_id = NEW.workspace_id;
      END;

      CREATE TRIGGER ${deleteTrigger}
      AFTER DELETE ON ${quotedTable}
      BEGIN
        UPDATE workspace_state_revision
        SET revision = revision + 1,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE workspace_id = OLD.workspace_id;
      END;
    `);
  }

  const readiness = inspectWorkspaceRevisionReadiness(db, workspaceId);
  if (!readiness.ready) {
    throw new Error(
      `BossAI Funding workspace revision startup blocked: ${readiness.installedTriggerCount}/${readiness.expectedTriggerCount} revision triggers are installed.`,
    );
  }
  return getWorkspaceRevision(db, workspaceId);
}

export function inspectWorkspaceRevisionReadiness(db: DatabaseSync, workspaceId: string): WorkspaceRevisionReadiness {
  const revision = getWorkspaceRevision(db, workspaceId);
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM sqlite_schema
    WHERE type='trigger' AND name LIKE 'bossai_revision_%'
  `).get() as { count?: number } | undefined;
  const installedTriggerCount = Number(row?.count ?? 0);
  const expectedTriggerCount = TENANT_SCOPED_BUSINESS_TABLES.length * 3;
  return {
    ready: installedTriggerCount === expectedTriggerCount,
    currentRevision: revision.revision,
    trackedBusinessTableCount: TENANT_SCOPED_BUSINESS_TABLES.length,
    expectedTriggerCount,
    installedTriggerCount,
    databaseDriven: true,
    browserPreconditionRequired: true,
    nativeClientCompatible: true,
    mutationSerializationReady: true,
  };
}

export function getWorkspaceRevision(db: DatabaseSync, workspaceId: string): WorkspaceRevisionState {
  const row = db.prepare(`
    SELECT workspace_id, revision, updated_at
    FROM workspace_state_revision
    WHERE workspace_id=?
  `).get(workspaceId) as { workspace_id?: string; revision?: number; updated_at?: string } | undefined;
  if (!row?.workspace_id || !Number.isInteger(row.revision) || !row.updated_at) {
    throw new Error("BossAI Funding workspace revision state is missing.");
  }
  return {
    workspaceId: row.workspace_id,
    revision: row.revision as number,
    updatedAt: row.updated_at,
  };
}

function headerValue(headers: IncomingHttpHeaders, name: string): string | null {
  const raw = headers[name];
  if (Array.isArray(raw)) return raw[0]?.trim() || null;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function isBrowserRequest(headers: IncomingHttpHeaders): boolean {
  return Boolean(
    headerValue(headers, "origin") ||
    headerValue(headers, "sec-fetch-site")
  );
}

export function operationRequiresWorkspaceRevision(operation: FundingAuthorizationOperation): boolean {
  return operation === "mutate" || operation === "backup" || operation === "restore";
}

export function createWorkspaceMutationCoordinator(): {
  acquire(): Promise<() => void>;
} {
  let tail = Promise.resolve();
  return {
    async acquire(): Promise<() => void> {
      let releaseSlot: (() => void) | null = null;
      const slot = new Promise<void>((resolve) => {
        releaseSlot = resolve;
      });
      const previous = tail;
      tail = previous.then(() => slot);
      await previous;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        releaseSlot?.();
      };
    },
  };
}

export function assertWorkspaceRevisionPrecondition(
  headers: IncomingHttpHeaders,
  operation: FundingAuthorizationOperation,
  currentRevision: number,
): void {
  if (!operationRequiresWorkspaceRevision(operation)) return;

  const supplied = headerValue(headers, WORKSPACE_REVISION_HEADER);
  if (!supplied && !isBrowserRequest(headers)) return;
  if (!supplied) {
    throw new WorkspaceRevisionError(
      "WORKSPACE_REVISION_REQUIRED",
      428,
      currentRevision,
      "This browser page did not provide the current BossAI Funding workspace revision.",
    );
  }
  if (!/^\d+$/.test(supplied) || Number(supplied) !== currentRevision) {
    throw new WorkspaceRevisionError(
      "STALE_WORKSPACE_STATE",
      409,
      currentRevision,
      "This BossAI Funding page is older than the current financing workspace state.",
    );
  }
}
