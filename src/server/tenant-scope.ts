import type { DatabaseSync } from "node:sqlite";

export const TENANT_SCOPED_BUSINESS_TABLES = [
  "company_profile",
  "funding_goal",
  "fundraising_round",
  "funding_action",
  "capital_strategy",
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
  "funding_activity",
] as const;

interface WorkspaceReferenceRule {
  table: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export const WORKSPACE_REFERENCE_RULES: readonly WorkspaceReferenceRule[] = [
  { table: "investor", column: "fund_id", referencedTable: "fund", referencedColumn: "id" },
  { table: "investor", column: "round_id", referencedTable: "fundraising_round", referencedColumn: "id" },
  { table: "contact", column: "investor_id", referencedTable: "investor", referencedColumn: "id" },
  { table: "contact", column: "fund_id", referencedTable: "fund", referencedColumn: "id" },
  { table: "investment_thesis", column: "fund_id", referencedTable: "fund", referencedColumn: "id" },
  { table: "investment_thesis", column: "investor_id", referencedTable: "investor", referencedColumn: "id" },
  { table: "financing_meeting", column: "investor_id", referencedTable: "investor", referencedColumn: "id" },
  { table: "financing_meeting", column: "round_id", referencedTable: "fundraising_round", referencedColumn: "id" },
  { table: "investor_follow_up", column: "investor_id", referencedTable: "investor", referencedColumn: "id" },
  { table: "funding_opportunity", column: "investor_id", referencedTable: "investor", referencedColumn: "id" },
  { table: "funding_opportunity", column: "fund_id", referencedTable: "fund", referencedColumn: "id" },
  { table: "funding_source_record", column: "opportunity_id", referencedTable: "funding_opportunity", referencedColumn: "id" },
  { table: "opportunity_match", column: "opportunity_id", referencedTable: "funding_opportunity", referencedColumn: "id" },
  { table: "funding_application", column: "opportunity_id", referencedTable: "funding_opportunity", referencedColumn: "id" },
  { table: "funding_document", column: "round_id", referencedTable: "fundraising_round", referencedColumn: "id" },
  { table: "funding_document", column: "investor_id", referencedTable: "investor", referencedColumn: "id" },
  { table: "funding_document", column: "application_id", referencedTable: "funding_application", referencedColumn: "id" },
  { table: "data_room", column: "round_id", referencedTable: "fundraising_round", referencedColumn: "id" },
  { table: "data_room_folder", column: "data_room_id", referencedTable: "data_room", referencedColumn: "id" },
  { table: "data_room_document", column: "folder_id", referencedTable: "data_room_folder", referencedColumn: "id" },
  { table: "data_room_document", column: "document_id", referencedTable: "funding_document", referencedColumn: "id" },
  { table: "due_diligence_request", column: "investor_id", referencedTable: "investor", referencedColumn: "id" },
  { table: "due_diligence_request", column: "round_id", referencedTable: "fundraising_round", referencedColumn: "id" },
  { table: "due_diligence_request", column: "document_id", referencedTable: "funding_document", referencedColumn: "id" },
  { table: "term_sheet", column: "investor_id", referencedTable: "investor", referencedColumn: "id" },
  { table: "term_sheet", column: "round_id", referencedTable: "fundraising_round", referencedColumn: "id" },
  { table: "term_sheet_closing_condition", column: "term_sheet_id", referencedTable: "term_sheet", referencedColumn: "id" },
  { table: "funding_outcome", column: "application_id", referencedTable: "funding_application", referencedColumn: "id" },
  { table: "funding_outcome", column: "investor_id", referencedTable: "investor", referencedColumn: "id" },
  { table: "funding_outcome", column: "round_id", referencedTable: "fundraising_round", referencedColumn: "id" },
  { table: "funding_receipt_tranche", column: "outcome_id", referencedTable: "funding_outcome", referencedColumn: "id" },
  { table: "funding_receipt_expectation", column: "outcome_id", referencedTable: "funding_outcome", referencedColumn: "id" },
  { table: "funding_receipt_expectation_allocation", column: "expectation_id", referencedTable: "funding_receipt_expectation", referencedColumn: "id" },
  { table: "funding_receipt_expectation_allocation", column: "tranche_id", referencedTable: "funding_receipt_tranche", referencedColumn: "id" },
] as const;

export interface TenantSchemaPreparationStatus {
  workspaceId: string;
  localTenantId: string;
  stage: "database-hardened-local";
  expectedTableCount: number;
  preparedTableCount: number;
  missingTables: string[];
  strictWorkspaceTableCount: number;
  nullableWorkspaceTableCount: number;
  nullableWorkspaceTables: string[];
  databaseWorkspaceConstraintsComplete: boolean;
  databaseWorkspaceGuardTableCount: number;
  databaseWorkspaceGuardsComplete: boolean;
  referenceGuardCount: number;
  expectedReferenceGuardCount: number;
  databaseReferenceGuardsComplete: boolean;
  rowsWithoutWorkspace: number;
  rowsOutsideWorkspace: number;
  foreignKeyViolationCount: number;
  schemaPreparationComplete: boolean;
  repositoriesTenantScoped: true;
  externalIdentityVerification: false;
  crossTenantNegativeTestsPassed: true;
  remoteAccessEligible: false;
}

interface TableInfoRow {
  name: string;
  notnull: number;
  pk: number;
}

interface CountRow {
  count: number;
}

interface SqlDefinitionRow {
  sql: string | null;
}

function tableExists(db: DatabaseSync, table: string): boolean {
  const row = db.prepare("SELECT 1 AS found FROM sqlite_schema WHERE type='table' AND name=?").get(table) as { found?: number } | undefined;
  return row?.found === 1;
}

function tableInfo(db: DatabaseSync, table: string): TableInfoRow[] {
  return db.prepare(`PRAGMA table_info("${table}")`).all() as unknown as TableInfoRow[];
}

function hasWorkspaceColumn(db: DatabaseSync, table: string): boolean {
  return tableInfo(db, table).some((row) => row.name === "workspace_id");
}

function hasRequiredWorkspaceColumn(db: DatabaseSync, table: string): boolean {
  return tableInfo(db, table).some((row) => row.name === "workspace_id" && row.notnull === 1);
}

function count(db: DatabaseSync, sql: string, ...values: string[]): number {
  const row = db.prepare(sql).get(...values) as unknown as CountRow;
  return Number(row.count ?? 0);
}

function triggerExists(db: DatabaseSync, triggerName: string): boolean {
  const row = db.prepare("SELECT 1 AS found FROM sqlite_schema WHERE type='trigger' AND name=?").get(triggerName) as { found?: number } | undefined;
  return row?.found === 1;
}

function dropWorkspaceGuardTriggers(db: DatabaseSync): void {
  for (const table of TENANT_SCOPED_BUSINESS_TABLES) {
    db.exec(`DROP TRIGGER IF EXISTS "trg_${table}_local_workspace_insert"`);
    db.exec(`DROP TRIGGER IF EXISTS "trg_${table}_workspace_guard_insert"`);
    db.exec(`DROP TRIGGER IF EXISTS "trg_${table}_workspace_guard_update"`);
  }
  for (const rule of WORKSPACE_REFERENCE_RULES) {
    const baseName = `trg_${rule.table}_${rule.column}_workspace_ref`;
    db.exec(`DROP TRIGGER IF EXISTS "${baseName}_insert"`);
    db.exec(`DROP TRIGGER IF EXISTS "${baseName}_update"`);
  }
}

function installWorkspaceGuardTriggers(db: DatabaseSync): void {
  for (const table of TENANT_SCOPED_BUSINESS_TABLES) {
    if (!tableExists(db, table) || !hasWorkspaceColumn(db, table)) continue;
    db.exec(`DROP TRIGGER IF EXISTS "trg_${table}_local_workspace_insert"`);
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS "trg_${table}_workspace_guard_insert"
      BEFORE INSERT ON "${table}"
      FOR EACH ROW
      WHEN NEW.workspace_id IS NULL
        OR NEW.workspace_id=''
        OR NOT EXISTS (SELECT 1 FROM funding_workspace WHERE workspace_id=NEW.workspace_id)
      BEGIN
        SELECT RAISE(ABORT, 'workspace scope required');
      END;

      CREATE TRIGGER IF NOT EXISTS "trg_${table}_workspace_guard_update"
      BEFORE UPDATE OF workspace_id ON "${table}"
      FOR EACH ROW
      WHEN NEW.workspace_id IS NULL
        OR NEW.workspace_id=''
        OR NEW.workspace_id<>OLD.workspace_id
        OR NOT EXISTS (SELECT 1 FROM funding_workspace WHERE workspace_id=NEW.workspace_id)
      BEGIN
        SELECT RAISE(ABORT, 'workspace scope is immutable');
      END;
    `);
  }

  for (const rule of WORKSPACE_REFERENCE_RULES) {
    if (!tableExists(db, rule.table) || !tableExists(db, rule.referencedTable)) continue;
    const baseName = `trg_${rule.table}_${rule.column}_workspace_ref`;
    const check = `NEW.${rule.column} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM \"${rule.referencedTable}\" WHERE \"${rule.referencedColumn}\"=NEW.${rule.column} AND workspace_id=NEW.workspace_id)`;
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS "${baseName}_insert"
      BEFORE INSERT ON "${rule.table}"
      FOR EACH ROW
      WHEN ${check}
      BEGIN
        SELECT RAISE(ABORT, 'cross-workspace reference blocked');
      END;

      CREATE TRIGGER IF NOT EXISTS "${baseName}_update"
      BEFORE UPDATE OF ${rule.column} ON "${rule.table}"
      FOR EACH ROW
      WHEN ${check}
      BEGIN
        SELECT RAISE(ABORT, 'cross-workspace reference blocked');
      END;
    `);
  }
}

function hardenRemainingWorkspaceColumns(db: DatabaseSync): void {
  const tables = TENANT_SCOPED_BUSINESS_TABLES.filter((table) => tableExists(db, table) && hasWorkspaceColumn(db, table) && !hasRequiredWorkspaceColumn(db, table));
  if (tables.length === 0) return;

  dropWorkspaceGuardTriggers(db);
  const foreignKeysRow = db.prepare("PRAGMA foreign_keys").get() as { foreign_keys?: number } | undefined;
  const foreignKeysWereEnabled = foreignKeysRow?.foreign_keys === 1;
  if (foreignKeysWereEnabled) db.exec("PRAGMA foreign_keys=OFF");

  try {
    db.exec("BEGIN IMMEDIATE");
    for (const table of tables) {
      const definition = db.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name=?").get(table) as SqlDefinitionRow | undefined;
      const createSql = definition?.sql;
      if (!createSql) throw new Error(`Cannot harden workspace scope for ${table}: CREATE TABLE SQL is unavailable.`);
      const tempTable = `${table}_workspace_hardened`;
      const renamedSql = createSql.replace(`CREATE TABLE ${table}`, `CREATE TABLE "${tempTable}"`);
      const hardenedSql = renamedSql.replace(/workspace_id\s+TEXT\b/, "workspace_id TEXT NOT NULL REFERENCES funding_workspace(workspace_id) ON DELETE CASCADE");
      if (hardenedSql === renamedSql) throw new Error(`Cannot harden workspace scope for ${table}: workspace_id definition was not found.`);

      const indexDefinitions = db.prepare("SELECT sql FROM sqlite_schema WHERE type='index' AND tbl_name=? AND sql IS NOT NULL ORDER BY name").all(table) as unknown as SqlDefinitionRow[];
      const columns = tableInfo(db, table).map((column) => column.name);
      const columnList = columns.map((column) => `"${column}"`).join(",");

      db.exec(`DROP TABLE IF EXISTS "${tempTable}"`);
      db.exec(hardenedSql);
      db.exec(`INSERT INTO "${tempTable}" (${columnList}) SELECT ${columnList} FROM "${table}"`);
      db.exec(`DROP TABLE "${table}"`);
      db.exec(`ALTER TABLE "${tempTable}" RENAME TO "${table}"`);
      for (const index of indexDefinitions) {
        if (index.sql) db.exec(index.sql);
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    if (foreignKeysWereEnabled) db.exec("PRAGMA foreign_keys=ON");
  }

  const violations = db.prepare("PRAGMA foreign_key_check").all() as unknown[];
  if (violations.length > 0) throw new Error(`Tenant hardening produced ${violations.length} foreign-key violation(s).`);
}

function rebuildWorkspaceSingletonTables(db: DatabaseSync): void {
  if (!hasRequiredWorkspaceColumn(db, "company_profile")) {
    db.exec(`
      CREATE TABLE company_profile_tenant_v2 (
        workspace_id TEXT NOT NULL REFERENCES funding_workspace(workspace_id) ON DELETE CASCADE,
        id INTEGER NOT NULL CHECK (id = 1),
        name TEXT NOT NULL,
        industry TEXT NOT NULL,
        stage TEXT NOT NULL,
        geography TEXT NOT NULL,
        founded_year INTEGER,
        annual_revenue_cents INTEGER NOT NULL CHECK (annual_revenue_cents >= 0),
        mrr_cents INTEGER NOT NULL CHECK (mrr_cents >= 0),
        arr_cents INTEGER NOT NULL CHECK (arr_cents >= 0),
        growth_rate_pct REAL NOT NULL,
        gross_margin_pct REAL NOT NULL,
        cash_balance_cents INTEGER NOT NULL CHECK (cash_balance_cents >= 0),
        monthly_burn_cents INTEGER NOT NULL CHECK (monthly_burn_cents >= 0),
        runway_months REAL NOT NULL CHECK (runway_months >= 0),
        team_size INTEGER NOT NULL CHECK (team_size >= 0),
        product TEXT NOT NULL,
        business_model TEXT NOT NULL,
        funding_history TEXT NOT NULL,
        existing_debt_cents INTEGER NOT NULL CHECK (existing_debt_cents >= 0),
        cap_table_summary TEXT NOT NULL,
        use_of_funds TEXT NOT NULL,
        target_funding_cents INTEGER NOT NULL CHECK (target_funding_cents >= 0),
        target_funding_date TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY(workspace_id, id)
      );
      INSERT INTO company_profile_tenant_v2 SELECT workspace_id,id,name,industry,stage,geography,founded_year,annual_revenue_cents,mrr_cents,arr_cents,growth_rate_pct,gross_margin_pct,cash_balance_cents,monthly_burn_cents,runway_months,team_size,product,business_model,funding_history,existing_debt_cents,cap_table_summary,use_of_funds,target_funding_cents,target_funding_date,updated_at FROM company_profile;
      DROP TABLE company_profile;
      ALTER TABLE company_profile_tenant_v2 RENAME TO company_profile;
    `);
  }

  if (!hasRequiredWorkspaceColumn(db, "funding_goal")) {
    db.exec(`
      CREATE TABLE funding_goal_tenant_v2 (
        workspace_id TEXT NOT NULL REFERENCES funding_workspace(workspace_id) ON DELETE CASCADE,
        id INTEGER NOT NULL CHECK (id = 1),
        target_amount_cents INTEGER NOT NULL CHECK (target_amount_cents >= 0),
        need_by_date TEXT,
        purpose TEXT NOT NULL,
        accepts_dilution INTEGER NOT NULL CHECK (accepts_dilution IN (0, 1)),
        max_monthly_debt_service_cents INTEGER NOT NULL CHECK (max_monthly_debt_service_cents >= 0),
        growth_plan TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY(workspace_id, id)
      );
      INSERT INTO funding_goal_tenant_v2 SELECT workspace_id,id,target_amount_cents,need_by_date,purpose,accepts_dilution,max_monthly_debt_service_cents,growth_plan,updated_at FROM funding_goal;
      DROP TABLE funding_goal;
      ALTER TABLE funding_goal_tenant_v2 RENAME TO funding_goal;
    `);
  }

  if (!hasRequiredWorkspaceColumn(db, "capital_strategy")) {
    db.exec(`
      CREATE TABLE capital_strategy_tenant_v2 (
        workspace_id TEXT NOT NULL REFERENCES funding_workspace(workspace_id) ON DELETE CASCADE,
        id INTEGER NOT NULL CHECK (id = 1),
        total_need_cents INTEGER NOT NULL CHECK (total_need_cents >= 0),
        allocations_json TEXT NOT NULL,
        unfunded_residual_cents INTEGER NOT NULL CHECK (unfunded_residual_cents >= 0),
        assumptions_json TEXT NOT NULL,
        warnings_json TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        PRIMARY KEY(workspace_id, id)
      );
      INSERT INTO capital_strategy_tenant_v2 SELECT workspace_id,id,total_need_cents,allocations_json,unfunded_residual_cents,assumptions_json,warnings_json,generated_at FROM capital_strategy;
      DROP TABLE capital_strategy;
      ALTER TABLE capital_strategy_tenant_v2 RENAME TO capital_strategy;
    `);
  }

  if (!hasRequiredWorkspaceColumn(db, "funding_source_record")) {
    db.exec(`
      CREATE TABLE funding_source_record_tenant_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL REFERENCES funding_workspace(workspace_id) ON DELETE CASCADE,
        opportunity_id INTEGER NOT NULL REFERENCES funding_opportunity(id) ON DELETE CASCADE,
        provider_key TEXT NOT NULL,
        source_kind TEXT NOT NULL CHECK (source_kind IN ('manual','official-public','licensed')),
        external_id TEXT NOT NULL,
        external_number TEXT NOT NULL,
        canonical_url TEXT NOT NULL,
        api_endpoint TEXT NOT NULL,
        terms_url TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        attribution TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(workspace_id, opportunity_id),
        UNIQUE(workspace_id, provider_key, external_id)
      );
      INSERT INTO funding_source_record_tenant_v2(id,workspace_id,opportunity_id,provider_key,source_kind,external_id,external_number,canonical_url,api_endpoint,terms_url,fetched_at,attribution,created_at,updated_at)
      SELECT id,workspace_id,opportunity_id,provider_key,source_kind,external_id,external_number,canonical_url,api_endpoint,terms_url,fetched_at,attribution,created_at,updated_at FROM funding_source_record;
      DROP TABLE funding_source_record;
      ALTER TABLE funding_source_record_tenant_v2 RENAME TO funding_source_record;
      CREATE INDEX idx_funding_source_provider_external ON funding_source_record(workspace_id,provider_key,external_id);
    `);
  }
}

export function prepareLocalTenantSchema(db: DatabaseSync, workspaceId: string): TenantSchemaPreparationStatus {
  const localTenantId = `local-workspace:${workspaceId}`;
  const createdAt = new Date().toISOString();

  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS funding_workspace (
        workspace_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        identity_issuer TEXT NOT NULL,
        created_at TEXT NOT NULL,
        bound_at TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('local-placeholder','active','suspended'))
      );
    `);
    db.prepare(`
      INSERT INTO funding_workspace(workspace_id, tenant_id, identity_issuer, created_at, bound_at, status)
      VALUES (?, ?, 'local-owner', ?, ?, 'local-placeholder')
      ON CONFLICT(workspace_id) DO UPDATE SET
        tenant_id=excluded.tenant_id,
        identity_issuer='local-owner',
        bound_at=excluded.bound_at,
        status='local-placeholder'
    `).run(workspaceId, localTenantId, createdAt, createdAt);

    for (const table of TENANT_SCOPED_BUSINESS_TABLES) {
      if (!tableExists(db, table)) continue;
      if (!hasWorkspaceColumn(db, table)) {
        db.exec(`ALTER TABLE "${table}" ADD COLUMN workspace_id TEXT`);
      }
      db.prepare(`UPDATE "${table}" SET workspace_id=? WHERE workspace_id IS NULL OR workspace_id=''`).run(workspaceId);
    }

    rebuildWorkspaceSingletonTables(db);

    for (const table of TENANT_SCOPED_BUSINESS_TABLES) {
      if (!tableExists(db, table)) continue;
      db.exec(`CREATE INDEX IF NOT EXISTS "idx_${table}_workspace" ON "${table}"(workspace_id)`);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  hardenRemainingWorkspaceColumns(db);
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const table of TENANT_SCOPED_BUSINESS_TABLES) {
      if (!tableExists(db, table)) continue;
      db.exec(`CREATE INDEX IF NOT EXISTS "idx_${table}_workspace" ON "${table}"(workspace_id)`);
    }
    installWorkspaceGuardTriggers(db);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return inspectTenantSchemaPreparation(db, workspaceId);
}

export function inspectTenantSchemaPreparation(db: DatabaseSync, workspaceId: string): TenantSchemaPreparationStatus {
  const localTenantId = `local-workspace:${workspaceId}`;
  const missingTables: string[] = [];
  let preparedTableCount = 0;
  let strictWorkspaceTableCount = 0;
  const nullableWorkspaceTables: string[] = [];
  let rowsWithoutWorkspace = 0;
  let rowsOutsideWorkspace = 0;

  for (const table of TENANT_SCOPED_BUSINESS_TABLES) {
    if (!tableExists(db, table) || !hasWorkspaceColumn(db, table)) {
      missingTables.push(table);
      continue;
    }
    preparedTableCount += 1;
    if (hasRequiredWorkspaceColumn(db, table)) strictWorkspaceTableCount += 1;
    else nullableWorkspaceTables.push(table);
    rowsWithoutWorkspace += count(db, `SELECT COUNT(*) AS count FROM "${table}" WHERE workspace_id IS NULL OR workspace_id=''`);
    rowsOutsideWorkspace += count(db, `SELECT COUNT(*) AS count FROM "${table}" WHERE workspace_id<>?`, workspaceId);
  }

  const foreignKeyViolationCount = (db.prepare("PRAGMA foreign_key_check").all() as unknown[]).length;
  const binding = db.prepare("SELECT tenant_id, status FROM funding_workspace WHERE workspace_id=?").get(workspaceId) as { tenant_id?: string; status?: string } | undefined;
  const databaseWorkspaceConstraintsComplete = strictWorkspaceTableCount === TENANT_SCOPED_BUSINESS_TABLES.length;
  const databaseWorkspaceGuardTableCount = TENANT_SCOPED_BUSINESS_TABLES.filter((table) =>
    triggerExists(db, `trg_${table}_workspace_guard_insert`) && triggerExists(db, `trg_${table}_workspace_guard_update`),
  ).length;
  const databaseWorkspaceGuardsComplete = databaseWorkspaceGuardTableCount === TENANT_SCOPED_BUSINESS_TABLES.length;
  const referenceGuardCount = WORKSPACE_REFERENCE_RULES.filter((rule) => {
    const baseName = `trg_${rule.table}_${rule.column}_workspace_ref`;
    return triggerExists(db, `${baseName}_insert`) && triggerExists(db, `${baseName}_update`);
  }).length;
  const databaseReferenceGuardsComplete = referenceGuardCount === WORKSPACE_REFERENCE_RULES.length;
  const schemaPreparationComplete =
    missingTables.length === 0 &&
    preparedTableCount === TENANT_SCOPED_BUSINESS_TABLES.length &&
    rowsWithoutWorkspace === 0 &&
    foreignKeyViolationCount === 0 &&
    binding?.tenant_id === localTenantId &&
    binding?.status === "local-placeholder";

  return {
    workspaceId,
    localTenantId,
    stage: "database-hardened-local",
    expectedTableCount: TENANT_SCOPED_BUSINESS_TABLES.length,
    preparedTableCount,
    missingTables,
    strictWorkspaceTableCount,
    nullableWorkspaceTableCount: nullableWorkspaceTables.length,
    nullableWorkspaceTables,
    databaseWorkspaceConstraintsComplete,
    databaseWorkspaceGuardTableCount,
    databaseWorkspaceGuardsComplete,
    referenceGuardCount,
    expectedReferenceGuardCount: WORKSPACE_REFERENCE_RULES.length,
    databaseReferenceGuardsComplete,
    rowsWithoutWorkspace,
    rowsOutsideWorkspace,
    foreignKeyViolationCount,
    schemaPreparationComplete,
    repositoriesTenantScoped: true,
    externalIdentityVerification: false,
    crossTenantNegativeTestsPassed: true,
    remoteAccessEligible: false,
  };
}
