import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { backup, DatabaseSync, type SQLInputValue } from "node:sqlite";
import type {
  BackupRecord,
  ContinuityStatus,
  FundingActivity,
  FundingActivityInput,
  FundingExportSnapshot,
} from "../domain/types.ts";
import { TENANT_SCOPED_BUSINESS_TABLES } from "./tenant-scope.ts";

const PRODUCT_NAME = "BossAI Funding" as const;
const SCHEMA_VERSION = 10;
const COMPATIBLE_BACKUP_SCHEMA_VERSIONS = new Set([4, 5, 6, 7, 8, 9, 10]);

const INSERT_ORDER = [
  "app_metadata",
  "funding_workspace",
  "company_profile",
  "funding_goal",
  "fundraising_round",
  "fund",
  "investor",
  "contact",
  "investment_thesis",
  "financing_meeting",
  "investor_follow_up",
  "funding_opportunity",
  "funding_source_record",
  "opportunity_match",
  "funding_application",
  "funding_document",
  "data_room",
  "data_room_folder",
  "data_room_document",
  "due_diligence_request",
  "term_sheet",
  "term_sheet_closing_condition",
  "funding_outcome",
  "funding_receipt_tranche",
  "funding_receipt_expectation",
  "funding_receipt_expectation_allocation",
  "funding_action",
  "capital_strategy",
  "funding_activity",
] as const;

const DELETE_ORDER = [...INSERT_ORDER].reverse();
const TENANT_TABLE_SET = new Set<string>(TENANT_SCOPED_BUSINESS_TABLES);
const BACKUP_NAME = /^bossai-funding-\d{8}T\d{9}Z-(manual|pre-restore)\.sqlite$/;

interface ActivityRow {
  id: number;
  category: FundingActivity["category"];
  action: string;
  title: string;
  summary: string;
  entity_type: string;
  entity_id: number | null;
  track: FundingActivity["track"];
  amount_cents: number | null;
  occurred_at: string;
}

function timestampTag(date = new Date()): string {
  return date.toISOString().replace(/[-:.]/g, "");
}

function activityFromRow(row: ActivityRow): FundingActivity {
  return {
    id: row.id,
    category: row.category,
    action: row.action,
    title: row.title,
    summary: row.summary,
    entityType: row.entity_type,
    entityId: row.entity_id,
    track: row.track,
    amountCents: row.amount_cents,
    occurredAt: row.occurred_at,
  };
}

function backupKind(fileName: string): BackupRecord["kind"] {
  return fileName.endsWith("-pre-restore.sqlite") ? "pre-restore" : "manual";
}

function asSqlValue(value: unknown): SQLInputValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "bigint") return value;
  if (ArrayBuffer.isView(value)) return value as NodeJS.ArrayBufferView;
  throw new Error("Recovery snapshot contains an unsupported SQLite value.");
}

export class ContinuityRepository {
  readonly backupDir: string | null;
  private readonly db: DatabaseSync;
  private readonly databasePath: string;

  constructor(db: DatabaseSync, databasePath: string) {
    this.db = db;
    this.databasePath = databasePath;
    this.backupDir = databasePath === ":memory:" ? null : join(dirname(databasePath), "backups");
    this.initializeSchema();
  }

  private initializeSchema(): void {
    const now = new Date().toISOString();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS funding_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        action TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        track TEXT CHECK (track IS NULL OR track IN ('grant','debt','equity')),
        amount_cents INTEGER CHECK (amount_cents IS NULL OR amount_cents >= 0),
        occurred_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_funding_activity_occurred_at ON funding_activity(occurred_at DESC);
    `);
    const upsert = this.db.prepare(`
      INSERT INTO app_metadata(key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
    `);
    upsert.run("product", PRODUCT_NAME, now);
    upsert.run("schema_version", String(SCHEMA_VERSION), now);
    this.db.prepare("INSERT OR IGNORE INTO app_metadata(key, value, updated_at) VALUES (?, ?, ?)")
      .run("workspace_id", randomUUID(), now);
  }

  private workspaceIdFrom(database: DatabaseSync = this.db): string {
    const row = database.prepare("SELECT value FROM app_metadata WHERE key='workspace_id'").get() as { value?: string } | undefined;
    const workspaceId = row?.value?.trim();
    if (!workspaceId) throw new Error("BossAI Funding workspace identity is missing.");
    return workspaceId;
  }

  private workspaceIdentity(database: DatabaseSync = this.db): { workspaceId: string; tenantId: string } {
    const workspaceId = this.workspaceIdFrom(database);
    const binding = database.prepare("SELECT tenant_id FROM funding_workspace WHERE workspace_id=?").get(workspaceId) as { tenant_id?: string } | undefined;
    const tenantId = binding?.tenant_id?.trim();
    if (!tenantId) throw new Error("BossAI Funding tenant binding is missing for the active workspace.");
    return { workspaceId, tenantId };
  }

  getWorkspaceId(): string {
    return this.workspaceIdFrom();
  }

  getWorkspaceIdentity(): { workspaceId: string; tenantId: string } {
    return this.workspaceIdentity();
  }

  recordActivity(input: FundingActivityInput): FundingActivity {
    const occurredAt = new Date().toISOString();
    const workspaceId = this.getWorkspaceId();
    const result = this.db.prepare(`
      INSERT INTO funding_activity(
        workspace_id, category, action, title, summary, entity_type, entity_id, track, amount_cents, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      workspaceId,
      input.category,
      input.action,
      input.title,
      input.summary,
      input.entityType,
      input.entityId,
      input.track,
      input.amountCents,
      occurredAt,
    );
    const row = this.db.prepare("SELECT * FROM funding_activity WHERE id=? AND workspace_id=?").get(result.lastInsertRowid, workspaceId) as unknown as ActivityRow;
    return activityFromRow(row);
  }

  listActivities(limit = 60): FundingActivity[] {
    const safeLimit = Math.min(200, Math.max(1, Math.round(limit)));
    const workspaceId = this.getWorkspaceId();
    return (this.db.prepare("SELECT * FROM funding_activity WHERE workspace_id=? ORDER BY occurred_at DESC, id DESC LIMIT ?").all(workspaceId, safeLimit) as unknown as ActivityRow[])
      .map(activityFromRow);
  }

  getStatus(): ContinuityStatus {
    const backups = this.listBackups();
    const fileBacked = this.backupDir !== null;
    return {
      schemaVersion: SCHEMA_VERSION,
      accessMode: "local-loopback",
      exportAvailable: true,
      backupAvailable: fileBacked,
      restoreAvailable: fileBacked,
      latestBackup: backups[0] ?? null,
      backupCount: backups.length,
    };
  }

  listBackups(): BackupRecord[] {
    if (!this.backupDir || !existsSync(this.backupDir)) return [];
    return readdirSync(this.backupDir)
      .filter((fileName) => BACKUP_NAME.test(fileName))
      .map((fileName) => {
        const stat = statSync(join(this.backupDir as string, fileName));
        return {
          fileName,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
          kind: backupKind(fileName),
        } satisfies BackupRecord;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  exportSnapshot(source: DatabaseSync = this.db, allowCompatibleMissingTables = false): FundingExportSnapshot {
    const { workspaceId, tenantId } = this.workspaceIdentity(source);
    const tables: FundingExportSnapshot["tables"] = {};
    for (const table of INSERT_ORDER) {
      const exists = source.prepare("SELECT 1 AS found FROM sqlite_schema WHERE type='table' AND name=?").get(table) as { found?: number } | undefined;
      if (!exists?.found) {
        if (allowCompatibleMissingTables && (table === "term_sheet_closing_condition" || table === "funding_receipt_tranche" || table === "funding_receipt_expectation" || table === "funding_receipt_expectation_allocation")) {
          tables[table] = [];
          continue;
        }
        throw new Error(`Funding snapshot is missing required table: ${table}.`);
      }
      let rows: Array<Record<string, unknown>>;
      if (table === "app_metadata") {
        rows = source.prepare(`SELECT * FROM "${table}"`).all() as unknown as Array<Record<string, unknown>>;
      } else if (table === "funding_workspace" || TENANT_TABLE_SET.has(table)) {
        rows = source.prepare(`SELECT * FROM "${table}" WHERE workspace_id=?`).all(workspaceId) as unknown as Array<Record<string, unknown>>;
      } else {
        rows = [];
      }
      tables[table] = rows.map((row) => ({ ...row }));
    }
    return {
      product: PRODUCT_NAME,
      schemaVersion: SCHEMA_VERSION,
      workspaceId,
      tenantId,
      exportedAt: new Date().toISOString(),
      tables,
    };
  }

  private pruneBackupToWorkspace(database: DatabaseSync, workspaceId: string): void {
    database.exec("PRAGMA foreign_keys=ON; BEGIN IMMEDIATE");
    try {
      for (const table of DELETE_ORDER) {
        if (TENANT_TABLE_SET.has(table)) {
          database.prepare(`DELETE FROM "${table}" WHERE workspace_id<>? OR workspace_id IS NULL`).run(workspaceId);
        }
      }
      const securityTable = database.prepare("SELECT 1 AS found FROM sqlite_schema WHERE type='table' AND name='security_decision_event'").get() as { found?: number } | undefined;
      if (securityTable?.found === 1) {
        database.prepare("DELETE FROM security_decision_event WHERE workspace_id<>? OR workspace_id IS NULL").run(workspaceId);
      }
      database.prepare("DELETE FROM funding_workspace WHERE workspace_id<>?").run(workspaceId);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  async createBackup(kind: BackupRecord["kind"] = "manual"): Promise<BackupRecord> {
    if (!this.backupDir) throw new Error("SQLite file backup is unavailable for an in-memory database.");
    mkdirSync(this.backupDir, { recursive: true });
    const fileName = `bossai-funding-${timestampTag()}-${kind}.sqlite`;
    const target = join(this.backupDir, fileName);
    await backup(this.db, target);
    try {
      const workspaceId = this.getWorkspaceId();
      const scopedBackupDb = new DatabaseSync(target);
      try {
        this.pruneBackupToWorkspace(scopedBackupDb, workspaceId);
      } finally {
        scopedBackupDb.close();
      }
      const verificationDb = new DatabaseSync(target, { readOnly: true });
      try {
        this.validateBackup(verificationDb);
      } finally {
        verificationDb.close();
      }
    } catch (error) {
      rmSync(target, { force: true });
      throw error;
    }
    const stat = statSync(target);
    return {
      fileName,
      sizeBytes: stat.size,
      createdAt: stat.mtime.toISOString(),
      kind,
    };
  }

  private resolveBackup(fileName: string): string {
    if (!this.backupDir) throw new Error("SQLite restore is unavailable for an in-memory database.");
    if (basename(fileName) !== fileName || !BACKUP_NAME.test(fileName)) throw new Error("Invalid backup file name.");
    const target = join(this.backupDir, fileName);
    if (!existsSync(target)) throw new Error("Backup file not found.");
    return target;
  }

  private validateBackup(database: DatabaseSync): FundingExportSnapshot {
    const integrity = database.prepare("PRAGMA integrity_check").get() as Record<string, unknown> | undefined;
    const integrityValue = integrity ? Object.values(integrity)[0] : null;
    if (integrityValue !== "ok") throw new Error("Backup failed SQLite integrity verification.");

    const metadataRows = database.prepare("SELECT key, value FROM app_metadata").all() as unknown as Array<{ key: string; value: string }>;
    const metadata = new Map(metadataRows.map((row) => [row.key, row.value]));
    if (metadata.get("product") !== PRODUCT_NAME) throw new Error("Backup belongs to a different product.");
    const backupSchemaVersion = Number(metadata.get("schema_version"));
    if (!COMPATIBLE_BACKUP_SCHEMA_VERSIONS.has(backupSchemaVersion)) throw new Error("Backup schema version is not compatible with this build.");
    const activeIdentity = this.workspaceIdentity(this.db);
    const backupIdentity = this.workspaceIdentity(database);
    if (backupIdentity.workspaceId !== activeIdentity.workspaceId || backupIdentity.tenantId !== activeIdentity.tenantId) {
      throw new Error("Backup workspace or tenant binding does not match the active funding workspace.");
    }

    for (const table of INSERT_ORDER) {
      if (backupSchemaVersion < 6 && table === "term_sheet_closing_condition") continue;
      if (backupSchemaVersion < 8 && table === "funding_receipt_tranche") continue;
      if (backupSchemaVersion < 9 && table === "funding_receipt_expectation") continue;
      if (backupSchemaVersion < 10 && table === "funding_receipt_expectation_allocation") continue;
      const found = database.prepare("SELECT 1 AS found FROM sqlite_schema WHERE type='table' AND name=?").get(table) as { found?: number } | undefined;
      if (!found?.found) throw new Error(`Backup is missing required table: ${table}.`);
    }
    const snapshot = this.exportSnapshot(database, backupSchemaVersion < 10);
    return { ...snapshot, schemaVersion: backupSchemaVersion };
  }

  private applySnapshot(snapshot: FundingExportSnapshot): void {
    const activeIdentity = this.workspaceIdentity();
    if (snapshot.workspaceId !== activeIdentity.workspaceId || snapshot.tenantId !== activeIdentity.tenantId) {
      throw new Error("Restore snapshot does not belong to the active funding workspace.");
    }
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const table of DELETE_ORDER) {
        if (TENANT_TABLE_SET.has(table)) {
          this.db.prepare(`DELETE FROM "${table}" WHERE workspace_id=?`).run(activeIdentity.workspaceId);
        }
      }
      for (const table of INSERT_ORDER) {
        if (table === "app_metadata") continue;
        const rows = snapshot.tables[table] ?? [];
        if (table === "funding_workspace") {
          const binding = rows[0];
          if (!binding || binding.workspace_id !== activeIdentity.workspaceId || binding.tenant_id !== activeIdentity.tenantId) {
            throw new Error("Restore snapshot workspace binding changed after validation.");
          }
          this.db.prepare(`
            UPDATE funding_workspace
            SET tenant_id=?, identity_issuer=?, created_at=?, bound_at=?, status=?
            WHERE workspace_id=?
          `).run(
            asSqlValue(binding.tenant_id),
            asSqlValue(binding.identity_issuer),
            asSqlValue(binding.created_at),
            asSqlValue(binding.bound_at),
            asSqlValue(binding.status),
            activeIdentity.workspaceId,
          );
          continue;
        }
        for (const row of rows) {
          const columns = Object.keys(row);
          if (columns.length === 0) continue;
          const quotedColumns = columns.map((column) => `"${column.replace(/"/g, "\"\"")}"`).join(", ");
          const placeholders = columns.map(() => "?").join(", ");
          const values = columns.map((column) => asSqlValue(row[column]));
          this.db.prepare(`INSERT INTO "${table}" (${quotedColumns}) VALUES (${placeholders})`).run(...values);
        }
      }
      if (snapshot.schemaVersion < 8) {
        this.db.prepare(`
          INSERT INTO funding_receipt_tranche(
            workspace_id,outcome_id,amount_cents,received_date,receipt_evidence,note,status,void_reason,created_at,updated_at
          )
          SELECT workspace_id,id,received_amount_cents,COALESCE(received_date,''),COALESCE(receipt_evidence,''),
                 'Migrated from the pre-tranche Funding Outcome aggregate.','received','',created_at,updated_at
          FROM funding_outcome
          WHERE workspace_id=? AND received_amount_cents>0
            AND NOT EXISTS (
              SELECT 1 FROM funding_receipt_tranche t
              WHERE t.workspace_id=funding_outcome.workspace_id AND t.outcome_id=funding_outcome.id
            )
        `).run(activeIdentity.workspaceId);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async restoreBackup(fileName: string): Promise<{ restoredFrom: BackupRecord; preRestoreBackup: BackupRecord }> {
    const target = this.resolveBackup(fileName);
    const backupDb = new DatabaseSync(target, { readOnly: true });
    let snapshot: FundingExportSnapshot;
    try {
      snapshot = this.validateBackup(backupDb);
    } finally {
      backupDb.close();
    }

    const preRestoreBackup = await this.createBackup("pre-restore");
    this.applySnapshot(snapshot);
    this.initializeSchema();
    this.recordActivity({
      category: "continuity",
      action: "restore",
      title: "Funding workspace restored",
      summary: `Restored local financing data from ${fileName}. A pre-restore backup was created first.`,
      entityType: "backup",
      entityId: null,
      track: null,
      amountCents: null,
    });

    const restoredFrom = this.listBackups().find((backupItem) => backupItem.fileName === fileName);
    if (!restoredFrom) throw new Error("Restored backup record could not be resolved after recovery.");
    return { restoredFrom, preRestoreBackup };
  }
}
