import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import { ExecutionRepository } from "../src/server/execution-database.ts";
import type { BootstrapState, FundingOutcome } from "../src/domain/types.ts";

async function request(baseUrl: string, path: string, method: string, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validOutcome(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    track: "grant",
    applicationId: null,
    investorId: null,
    roundId: null,
    status: "won",
    approvedAmountCents: 30_000_000,
    committedAmountCents: 30_000_000,
    receivedAmountCents: 10_000_000,
    receivedDate: "2026-08-16",
    commitmentEvidence: "Award notice #A-15",
    receiptEvidence: "Bank transaction #TX-15",
    conditions: "Quarterly reporting",
    lossReason: "",
    feedback: "Awarded",
    retryDate: null,
    ...overrides,
  };
}

test("legacy funding_outcome schema migrates evidence columns without inventing references", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE funding_outcome (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track TEXT NOT NULL,
      application_id INTEGER,
      investor_id INTEGER,
      round_id INTEGER,
      status TEXT NOT NULL,
      approved_amount_cents INTEGER NOT NULL,
      committed_amount_cents INTEGER NOT NULL,
      received_amount_cents INTEGER NOT NULL,
      received_date TEXT,
      conditions TEXT NOT NULL,
      loss_reason TEXT NOT NULL,
      feedback TEXT NOT NULL,
      retry_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO funding_outcome (
      track,application_id,investor_id,round_id,status,approved_amount_cents,committed_amount_cents,received_amount_cents,
      received_date,conditions,loss_reason,feedback,retry_date,created_at,updated_at
    ) VALUES ('grant',NULL,NULL,NULL,'won',30000000,30000000,10000000,'2026-08-16','Reporting','','Awarded',NULL,'2026-08-16T00:00:00Z','2026-08-16T00:00:00Z');
  `);

  try {
    const repository = new ExecutionRepository(db);
    const columns = db.prepare("PRAGMA table_info(funding_outcome)").all() as unknown as Array<{ name: string }>;
    assert.equal(columns.some((column) => column.name === "commitment_evidence"), true);
    assert.equal(columns.some((column) => column.name === "receipt_evidence"), true);
    const migrated = repository.listOutcomes()[0];
    assert.ok(migrated);
    assert.equal(migrated.committedAmountCents, 30_000_000);
    assert.equal(migrated.receivedAmountCents, 10_000_000);
    assert.equal(migrated.commitmentEvidence, "");
    assert.equal(migrated.receiptEvidence, "");
  } finally {
    db.close();
  }
});

test("real HTTP requires outcome evidence and lets a legacy evidence gap be repaired exactly", async () => {
  const temp = mkdtempSync(join(tmpdir(), "bossai-funding-outcome-evidence-"));
  const databasePath = join(temp, "funding.sqlite");
  const repo = new FundingRepository(databasePath);
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const noCommitmentEvidence = await request(baseUrl, "/api/outcomes", "POST", validOutcome({ commitmentEvidence: "" }));
    assert.equal(noCommitmentEvidence.status, 400);
    const commitmentError = await noCommitmentEvidence.json() as { code: string; field: string };
    assert.equal(commitmentError.code, "VALIDATION_ERROR");
    assert.equal(commitmentError.field, "commitmentEvidence");

    const noReceiptEvidence = await request(baseUrl, "/api/outcomes", "POST", validOutcome({ receiptEvidence: "" }));
    assert.equal(noReceiptEvidence.status, 400);
    const receiptError = await noReceiptEvidence.json() as { field: string };
    assert.equal(receiptError.field, "receiptEvidence");

    const createdResponse = await request(baseUrl, "/api/outcomes", "POST", validOutcome());
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json() as { outcome: FundingOutcome; state: BootstrapState };
    assert.equal(created.outcome.commitmentEvidence, "Award notice #A-15");
    assert.equal(created.outcome.receiptEvidence, "Bank transaction #TX-15");
    assert.equal(created.state.dashboard.capitalBlockers.some((item) => item.key.startsWith("funding-outcome-evidence-")), false);
    assert.equal(created.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-gap-${created.outcome.id}`), true);

    repo.db.prepare("UPDATE funding_outcome SET commitment_evidence='' WHERE id=?").run(created.outcome.id);
    repo.db.prepare("UPDATE funding_receipt_tranche SET receipt_evidence='' WHERE outcome_id=?").run(created.outcome.id);
    const legacyState = await fetch(`${baseUrl}/api/bootstrap`).then((response) => response.json()) as BootstrapState;
    assert.equal(legacyState.dashboard.todayFocus.entityType, "funding-outcome");
    assert.equal(legacyState.dashboard.todayFocus.entityId, created.outcome.id);
    assert.equal(legacyState.dashboard.todayFocus.urgency, "urgent");
    assert.equal(legacyState.dashboard.capitalBlockers.some((item) => item.entityType === "funding-outcome" && item.entityId === created.outcome.id && item.severity === "critical"), true);

    const outcomeRepairResponse = await request(baseUrl, `/api/outcomes/${created.outcome.id}`, "PATCH", {
      ...legacyState.outcomes.find((item) => item.id === created.outcome.id),
      commitmentEvidence: "Signed award acceptance #A-15",
    });
    assert.equal(outcomeRepairResponse.status, 200);
    const afterCommitmentRepair = await outcomeRepairResponse.json() as { outcome: FundingOutcome; state: BootstrapState };
    const tranche = afterCommitmentRepair.state.receiptTranches.find((item) => item.outcomeId === created.outcome.id);
    assert.ok(tranche);

    const receiptRepairResponse = await request(baseUrl, `/api/receipt-tranches/${tranche.id}`, "PATCH", {
      ...tranche,
      receiptEvidence: "Bank statement line #TX-15",
    });
    assert.equal(receiptRepairResponse.status, 200);
    const repaired = await receiptRepairResponse.json() as { outcome: FundingOutcome; state: BootstrapState };
    assert.equal(repaired.outcome.commitmentEvidence, "Signed award acceptance #A-15");
    assert.equal(repaired.state.receiptTranches.find((item) => item.id === tranche.id)?.receiptEvidence, "Bank statement line #TX-15");
    assert.equal(repaired.state.dashboard.capitalBlockers.some((item) => item.key.startsWith("funding-outcome-evidence-")), false);
    assert.equal(repaired.state.dashboard.capitalBlockers.some((item) => item.key === `receipt-schedule-gap-${created.outcome.id}`), true);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
    rmSync(temp, { recursive: true, force: true });
  }
});
