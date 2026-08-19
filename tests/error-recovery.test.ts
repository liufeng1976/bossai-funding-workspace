import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import type { BootstrapState } from "../src/domain/types.ts";

const applicationPayload = {
  opportunityId: 999_999,
  track: "grant",
  title: "State innovation application",
  requestedAmountCents: 20_000_000,
  approvedAmountCents: 0,
  status: "draft",
  deadline: null,
  submittedDate: null,
  decisionDate: null,
  owner: "Owner",
  nextAction: "Complete the budget attachment.",
  rejectionReason: "",
  notes: "Keep this draft if the linked opportunity changes.",
};

test("field validation identifies the exact financing field and promises input-preserving retry", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/funding-goal`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetAmountCents: 100_000_000,
        needByDate: null,
        purpose: "",
        acceptsDilution: true,
        maxMonthlyDebtServiceCents: 2_000_000,
        growthPlan: "Expand sales capacity.",
      }),
    });
    assert.equal(response.status, 400);
    const failure = (await response.json()) as { code: string; field: string | null; error: string; recovery: string };
    assert.equal(failure.code, "VALIDATION_ERROR");
    assert.equal(failure.field, "purpose");
    assert.match(failure.error, /purpose is required/i);
    assert.match(failure.recovery, /browser keeps the current form contents/i);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("stale financing references return a recoverable conflict and allow retry without changing the business payload", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const failed = await fetch(`${baseUrl}/api/applications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(applicationPayload),
    });
    assert.equal(failed.status, 409);
    const failure = (await failed.json()) as { code: string; error: string; recovery: string };
    assert.equal(failure.code, "STALE_REFERENCE");
    assert.match(failure.error, /linked financing record/i);
    assert.match(failure.recovery, /form values have not been cleared/i);

    const afterFailure = await fetch(`${baseUrl}/api/bootstrap`);
    const failureState = (await afterFailure.json()) as BootstrapState;
    assert.equal(failureState.applications.length, 0);

    const retry = await fetch(`${baseUrl}/api/applications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...applicationPayload, opportunityId: null }),
    });
    assert.equal(retry.status, 201);
    const retryPayload = (await retry.json()) as { state: BootstrapState };
    assert.equal(retryPayload.state.applications.length, 1);
    assert.equal(retryPayload.state.applications[0]?.title, applicationPayload.title);
    assert.equal(retryPayload.state.applications[0]?.nextAction, applicationPayload.nextAction);
    assert.ok(retryPayload.state.activities.some((activity) => activity.title.includes(applicationPayload.title)));
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});
