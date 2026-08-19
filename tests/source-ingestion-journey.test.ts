import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import { GRANTS_GOV_FETCH_ENDPOINT, GRANTS_GOV_SEARCH_ENDPOINT } from "../src/integrations/grants-gov.ts";
import type { BootstrapState } from "../src/domain/types.ts";

function response(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
}

async function json<T>(baseUrl: string, path: string, method = "GET", body?: unknown, workspaceRevision?: number): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = {
      "content-type": "application/json",
      ...(workspaceRevision === undefined ? {} : { "x-bossai-workspace-revision": String(workspaceRevision) }),
    };
    init.body = JSON.stringify(body);
  }
  const result = await fetch(`${baseUrl}${path}`, init);
  const payload = (await result.json()) as T & { error?: string };
  assert.equal(result.ok, true, payload.error ?? `${method} ${path} failed`);
  return payload;
}

test("official source import persists provenance, survives outage and refreshes facts without overwriting the owner's decision", async () => {
  let version = 1;
  let sourceUnavailable = false;
  const fetchImpl: typeof fetch = async (input) => {
    if (sourceUnavailable) throw new Error("simulated upstream outage");
    const url = input instanceof Request ? input.url : input.toString();
    if (url === GRANTS_GOV_SEARCH_ENDPOINT) {
      return response({ errorcode: 0, msg: "ok", data: { oppHits: [{ id: "363178", number: "OFFICIAL-001", title: "Official Growth Grant", agencyName: "Federal Agency", closeDate: "10/31/2026", oppStatus: "posted" }] } });
    }
    assert.equal(url, GRANTS_GOV_FETCH_ENDPOINT);
    return response({
      errorcode: 0,
      msg: "ok",
      data: {
        id: 363178,
        opportunityNumber: "OFFICIAL-001",
        opportunityTitle: version === 1 ? "Official Growth Grant" : "Official Growth Grant — Updated",
        synopsis: {
          agencyName: "Federal Agency",
          synopsisDesc: "Official public grant data.",
          costSharing: false,
          awardCeiling: version === 1 ? "500000" : "750000",
          awardFloor: "100000",
          applicantTypes: [{ description: "Small businesses" }],
          fundingInstruments: [{ description: "Grant" }],
          fundingActivityCategories: [{ description: "Business and Commerce" }],
        },
      },
    });
  };

  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"), { fetchImpl });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const initial = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    const first = await json<{ summary: { imported: number; updated: number }; state: BootstrapState }>(baseUrl, "/api/sources/grants-gov/search", "POST", { keyword: "growth", rows: 5 }, initial.workspaceRevision);
    assert.equal(first.summary.imported, 1);
    assert.equal(first.summary.updated, 0);
    assert.equal(first.state.opportunities.length, 1);
    assert.equal(first.state.fundingSources.length, 1);
    const imported = first.state.opportunities[0];
    assert.ok(imported);
    assert.equal(imported.amountMaxCents, 50_000_000);
    assert.equal(first.state.fundingSources[0]?.externalId, "363178");
    assert.equal(first.state.fundingSources[0]?.sourceKind, "official-public");

    const forbiddenSourceEdit = await fetch(`${baseUrl}/api/opportunities/${imported.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-bossai-workspace-revision": String(first.state.workspaceRevision) },
      body: JSON.stringify({ ...imported, deadline: "2030-01-01" }),
    });
    assert.equal(forbiddenSourceEdit.status, 409);
    const forbiddenBody = await forbiddenSourceEdit.json() as { code?: string; field?: string; recovery?: string };
    assert.equal(forbiddenBody.code, "SOURCE_FACTS_READ_ONLY");
    assert.equal(forbiddenBody.field, "deadline");
    assert.match(forbiddenBody.recovery ?? "", /refresh the official\/licensed source/i);
    const afterForbiddenEdit = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(afterForbiddenEdit.workspaceRevision, first.state.workspaceRevision, "rejected official source edit must not advance financing state");
    assert.equal(afterForbiddenEdit.opportunities[0]?.deadline, imported.deadline);

    const saved = await json<{ state: BootstrapState }>(baseUrl, `/api/opportunities/${imported.id}`, "PATCH", { ...imported, decision: "saved" }, first.state.workspaceRevision);
    assert.equal(saved.state.opportunities[0]?.decision, "saved");

    sourceUnavailable = true;
    const failedRefresh = await fetch(`${baseUrl}/api/sources/grants-gov/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-bossai-workspace-revision": String(saved.state.workspaceRevision),
      },
      body: JSON.stringify({ keyword: "growth", rows: 5 }),
    });
    assert.equal(failedRefresh.status, 502);
    const failedBody = await failedRefresh.json() as { code?: string; error?: string; recovery?: string };
    assert.equal(failedBody.code, "SOURCE_UNAVAILABLE");
    assert.match(failedBody.error ?? "", /could not be reached|source-check budget/i);
    assert.doesNotMatch(failedBody.error ?? "", /simulated upstream outage/i);
    assert.match(failedBody.recovery ?? "", /opportunities already saved|saved opportunities/i);
    const afterOutage = await json<BootstrapState>(baseUrl, "/api/bootstrap");
    assert.equal(afterOutage.workspaceRevision, saved.state.workspaceRevision, "failed source refresh must not advance financing state");
    assert.equal(afterOutage.opportunities[0]?.decision, "saved");
    assert.equal(afterOutage.opportunities[0]?.title, "Official Growth Grant");

    sourceUnavailable = false;
    version = 2;
    const refreshed = await json<{ summary: { imported: number; updated: number }; state: BootstrapState }>(baseUrl, "/api/sources/grants-gov/search", "POST", { keyword: "growth", rows: 5 }, afterOutage.workspaceRevision);
    assert.equal(refreshed.summary.imported, 0);
    assert.equal(refreshed.summary.updated, 1);
    assert.equal(refreshed.state.opportunities.length, 1);
    assert.equal(refreshed.state.opportunities[0]?.decision, "saved", "official refresh must preserve the owner's decision");
    assert.equal(refreshed.state.opportunities[0]?.title, "Official Growth Grant — Updated");
    assert.equal(refreshed.state.opportunities[0]?.amountMaxCents, 75_000_000);
    assert.equal(refreshed.state.fundingSources.length, 1);
    assert.ok(refreshed.state.activities.some((activity) => activity.action === "import" && activity.track === "grant"));
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});
