import type { DatabaseSync } from "node:sqlite";

export function detectWorkspaceId(db: DatabaseSync): string | null {
  const metadataExists = db.prepare("SELECT 1 AS found FROM sqlite_schema WHERE type='table' AND name='app_metadata'").get() as { found?: number } | undefined;
  if (metadataExists?.found !== 1) return null;
  const row = db.prepare("SELECT value FROM app_metadata WHERE key='workspace_id'").get() as { value?: string } | undefined;
  const workspaceId = row?.value?.trim() ?? "";
  return workspaceId || null;
}

export function recordBelongsToWorkspace(
  db: DatabaseSync,
  table: string,
  idColumn: string,
  id: number,
  workspaceId: string,
): boolean {
  const row = db.prepare(`SELECT 1 AS found FROM "${table}" WHERE "${idColumn}"=? AND workspace_id=?`).get(id, workspaceId) as { found?: number } | undefined;
  return row?.found === 1;
}

export function assertOwnedReference(
  db: DatabaseSync,
  table: string,
  idColumn: string,
  id: number | null,
  workspaceId: string | null,
  label: string,
): void {
  if (id === null || workspaceId === null) return;
  if (!recordBelongsToWorkspace(db, table, idColumn, id, workspaceId)) {
    throw new Error(`${label} does not belong to the active funding workspace.`);
  }
}
