import type { DatabaseSync } from "node:sqlite";
import type { FundingSourceRecord, FundingSourceRecordInput } from "../domain/types.ts";
import { assertOwnedReference, detectWorkspaceId } from "./repository-scope.ts";

interface SourceRow {
  id: number;
  opportunity_id: number;
  provider_key: string;
  source_kind: FundingSourceRecordInput["sourceKind"];
  external_id: string;
  external_number: string;
  canonical_url: string;
  api_endpoint: string;
  terms_url: string;
  fetched_at: string;
  attribution: string;
  created_at: string;
  updated_at: string;
}

function asSource(row: SourceRow): FundingSourceRecord {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    providerKey: row.provider_key,
    sourceKind: row.source_kind,
    externalId: row.external_id,
    externalNumber: row.external_number,
    canonicalUrl: row.canonical_url,
    apiEndpoint: row.api_endpoint,
    termsUrl: row.terms_url,
    fetchedAt: row.fetched_at,
    attribution: row.attribution,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class FundingSourceRepository {
  private readonly db: DatabaseSync;
  private workspaceId: string | null;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.initializeSchema();
    this.workspaceId = detectWorkspaceId(db);
  }

  bindWorkspace(workspaceId: string): void {
    this.workspaceId = workspaceId;
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS funding_source_record (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opportunity_id INTEGER NOT NULL UNIQUE REFERENCES funding_opportunity(id) ON DELETE CASCADE,
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
        UNIQUE(provider_key, external_id)
      );
      CREATE INDEX IF NOT EXISTS idx_funding_source_provider_external ON funding_source_record(provider_key, external_id);
    `);
  }

  listSources(): FundingSourceRecord[] {
    const rows = this.workspaceId
      ? this.db.prepare("SELECT * FROM funding_source_record WHERE workspace_id=? ORDER BY fetched_at DESC").all(this.workspaceId)
      : this.db.prepare("SELECT * FROM funding_source_record ORDER BY fetched_at DESC").all();
    return (rows as unknown as SourceRow[]).map(asSource);
  }

  findByExternalId(providerKey: string, externalId: string): FundingSourceRecord | null {
    const row = this.workspaceId
      ? this.db.prepare("SELECT * FROM funding_source_record WHERE workspace_id=? AND provider_key=? AND external_id=?").get(this.workspaceId, providerKey, externalId) as SourceRow | undefined
      : this.db.prepare("SELECT * FROM funding_source_record WHERE provider_key=? AND external_id=?").get(providerKey, externalId) as SourceRow | undefined;
    return row ? asSource(row) : null;
  }

  saveSource(input: FundingSourceRecordInput): FundingSourceRecord {
    const now = new Date().toISOString();
    assertOwnedReference(this.db, "funding_opportunity", "id", input.opportunityId, this.workspaceId, "Opportunity");
    if (this.workspaceId) {
      this.db.prepare(`
        INSERT INTO funding_source_record(
          workspace_id,opportunity_id,provider_key,source_kind,external_id,external_number,canonical_url,api_endpoint,terms_url,
          fetched_at,attribution,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(workspace_id, provider_key, external_id) DO UPDATE SET
          opportunity_id=excluded.opportunity_id,
          source_kind=excluded.source_kind,
          external_number=excluded.external_number,
          canonical_url=excluded.canonical_url,
          api_endpoint=excluded.api_endpoint,
          terms_url=excluded.terms_url,
          fetched_at=excluded.fetched_at,
          attribution=excluded.attribution,
          updated_at=excluded.updated_at
      `).run(this.workspaceId,input.opportunityId,input.providerKey,input.sourceKind,input.externalId,input.externalNumber,input.canonicalUrl,input.apiEndpoint,input.termsUrl,input.fetchedAt,input.attribution,now,now);
      const row = this.db.prepare("SELECT * FROM funding_source_record WHERE workspace_id=? AND provider_key=? AND external_id=?").get(this.workspaceId,input.providerKey,input.externalId) as unknown as SourceRow;
      return asSource(row);
    }
    this.db.prepare(`
      INSERT INTO funding_source_record(opportunity_id,provider_key,source_kind,external_id,external_number,canonical_url,api_endpoint,terms_url,fetched_at,attribution,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(provider_key, external_id) DO UPDATE SET opportunity_id=excluded.opportunity_id,source_kind=excluded.source_kind,external_number=excluded.external_number,canonical_url=excluded.canonical_url,api_endpoint=excluded.api_endpoint,terms_url=excluded.terms_url,fetched_at=excluded.fetched_at,attribution=excluded.attribution,updated_at=excluded.updated_at
    `).run(input.opportunityId,input.providerKey,input.sourceKind,input.externalId,input.externalNumber,input.canonicalUrl,input.apiEndpoint,input.termsUrl,input.fetchedAt,input.attribution,now,now);
    const row = this.db.prepare("SELECT * FROM funding_source_record WHERE provider_key=? AND external_id=?").get(input.providerKey,input.externalId) as unknown as SourceRow;
    return asSource(row);
  }
}
