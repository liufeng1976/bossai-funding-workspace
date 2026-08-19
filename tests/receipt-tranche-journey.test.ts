import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import type { BootstrapState, FundingOutcome, FundingReceiptTranche } from "../src/domain/types.ts";

async function request(baseUrl: string, path: string, method: string, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function json<T>(baseUrl: string, path: string, method: string, body: unknown): Promise<T> {
  const response = await request(baseUrl, path, method, body);
  const payload = await response.json() as T & { error?: string };
  assert.equal(response.ok, true, payload.error ?? `${method} ${path} failed`);
  return payload;
}

test("partial receipts reconcile Funding Outcome aggregate across add, reject, void and reinstate", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const created = await json<{ outcome: FundingOutcome; state: BootstrapState }>(baseUrl, "/api/outcomes", "POST", {
      track: "equity",
      applicationId: null,
      investorId: null,
      roundId: null,
      status: "closed",
      approvedAmountCents: 50_000_000,
      committedAmountCents: 50_000_000,
      receivedAmountCents: 20_000_000,
      receivedDate: "2026-08-17",
      commitmentEvidence: "Signed financing agreement #A-31",
      receiptEvidence: "Bank transaction #T-20",
      conditions: "",
      lossReason: "",
      feedback: "",
      retryDate: null,
    });
    assert.equal(created.outcome.receivedAmountCents, 20_000_000);
    assert.equal(created.state.receiptTranches.length, 1);
    assert.equal(created.state.receiptTranches[0]?.amountCents, 20_000_000);
    assert.equal(created.state.receiptTranches[0]?.receiptEvidence, "Bank transaction #T-20");

    const second = await json<{ receiptTranche: FundingReceiptTranche; outcome: FundingOutcome; state: BootstrapState }>(baseUrl, "/api/receipt-tranches", "POST", {
      outcomeId: created.outcome.id,
      amountCents: 30_000_000,
      receivedDate: "2026-08-20",
      receiptEvidence: "Bank transaction #T-30",
      note: "Second wire",
      status: "received",
      voidReason: "",
    });
    assert.equal(second.state.receiptTranches.length, 2);
    assert.equal(second.outcome.receivedAmountCents, 50_000_000);
    assert.equal(second.outcome.receivedDate, "2026-08-20");
    assert.equal(second.state.dashboard.receivedAmountCents, 50_000_000);
    assert.equal(second.state.dashboard.capitalBlockers.some((item) => item.entityType === "funding-outcome"), false);

    const beforeOverage = second.state.workspaceRevision;
    const overage = await request(baseUrl, "/api/receipt-tranches", "POST", {
      outcomeId: created.outcome.id,
      amountCents: 1,
      receivedDate: "2026-08-21",
      receiptEvidence: "Should not persist",
      note: "",
      status: "received",
      voidReason: "",
    });
    assert.equal(overage.status, 400);
    const afterOverage = await fetch(`${baseUrl}/api/bootstrap`).then((response) => response.json()) as BootstrapState;
    assert.equal(afterOverage.workspaceRevision, beforeOverage);
    assert.equal(afterOverage.receiptTranches.length, 2);
    assert.equal(afterOverage.outcomes[0]?.receivedAmountCents, 50_000_000);

    const directAggregateEdit = await request(baseUrl, `/api/outcomes/${created.outcome.id}`, "PATCH", {
      ...afterOverage.outcomes[0],
      receivedAmountCents: 40_000_000,
      receivedDate: "2026-08-19",
      receiptEvidence: "Direct aggregate edit",
    });
    assert.equal(directAggregateEdit.status, 400);
    const afterDirectEdit = await fetch(`${baseUrl}/api/bootstrap`).then((response) => response.json()) as BootstrapState;
    assert.equal(afterDirectEdit.outcomes[0]?.receivedAmountCents, 50_000_000);
    assert.equal(afterDirectEdit.receiptTranches.length, 2);

    const noVoidReason = await request(baseUrl, `/api/receipt-tranches/${second.receiptTranche.id}`, "PATCH", {
      ...second.receiptTranche,
      status: "voided",
      voidReason: "",
    });
    assert.equal(noVoidReason.status, 400);

    const voided = await json<{ receiptTranche: FundingReceiptTranche; outcome: FundingOutcome; state: BootstrapState }>(baseUrl, `/api/receipt-tranches/${second.receiptTranche.id}`, "PATCH", {
      ...second.receiptTranche,
      status: "voided",
      voidReason: "Bank confirmed duplicate settlement record",
    });
    assert.equal(voided.receiptTranche.status, "voided");
    assert.equal(voided.outcome.receivedAmountCents, 20_000_000);
    assert.equal(voided.outcome.receivedDate, "2026-08-17");
    assert.equal(voided.state.receiptTranches.length, 2, "voided tranche remains historical evidence");
    assert.equal(voided.state.dashboard.receivedAmountCents, 20_000_000);

    const reinstated = await json<{ receiptTranche: FundingReceiptTranche; outcome: FundingOutcome; state: BootstrapState }>(baseUrl, `/api/receipt-tranches/${second.receiptTranche.id}`, "PATCH", {
      ...voided.receiptTranche,
      status: "received",
    });
    assert.equal(reinstated.outcome.receivedAmountCents, 50_000_000);
    assert.equal(reinstated.outcome.receivedDate, "2026-08-20");
    assert.equal(reinstated.state.receiptTranches.filter((item) => item.status === "received").length, 2);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});
