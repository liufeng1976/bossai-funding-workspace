import test from "node:test";
import assert from "node:assert/strict";
import {
  GRANTS_GOV_ATTRIBUTION,
  GRANTS_GOV_EXECUTION_LIMITS,
  GRANTS_GOV_FETCH_ENDPOINT,
  GRANTS_GOV_PROVIDER_KEY,
  GRANTS_GOV_SEARCH_ENDPOINT,
  searchGrantsGov,
} from "../src/integrations/grants-gov.ts";

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
}

test("Grants.gov adapter maps official search/detail data into a provenance-rich grant candidate", async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push(url);
    if (url === GRANTS_GOV_SEARCH_ENDPOINT) {
      const body = JSON.parse(String(init?.body)) as { keyword: string; rows: number; oppStatuses: string };
      assert.equal(body.keyword, "robotics");
      assert.equal(body.rows, 5);
      assert.equal(body.oppStatuses, "forecasted|posted");
      return jsonResponse({
        errorcode: 0,
        msg: "Webservice Succeeds",
        data: {
          oppHits: [{
            id: "362970",
            number: "TEST-ROBOTICS-001",
            title: "Robotics Manufacturing Grant",
            agencyName: "Department of Example",
            closeDate: "09/30/2026",
            oppStatus: "posted",
          }],
        },
      });
    }
    assert.equal(url, GRANTS_GOV_FETCH_ENDPOINT);
    return jsonResponse({
      errorcode: 0,
      msg: "Webservice Succeeds",
      data: {
        id: 362970,
        opportunityNumber: "TEST-ROBOTICS-001",
        opportunityTitle: "Robotics Manufacturing Grant",
        synopsis: {
          agencyName: "Department of Example",
          synopsisDesc: "<p>Support &amp; scale advanced manufacturing.</p>",
          costSharing: true,
          awardCeiling: "$250,000",
          awardFloor: "75,000",
          applicantTypes: [{ id: "SB", description: "Small businesses" }],
          fundingInstruments: [{ id: "G", description: "Grant" }],
          fundingActivityCategories: [{ id: "ST", description: "Science and Technology" }],
        },
      },
    });
  };

  const candidates = await searchGrantsGov({ keyword: "robotics", rows: 5 }, fetchImpl);
  assert.equal(calls.length, 2);
  assert.equal(candidates.length, 1);
  const candidate = candidates[0];
  assert.ok(candidate);
  assert.equal(candidate.externalId, "362970");
  assert.equal(candidate.opportunity.type, "grant");
  assert.equal(candidate.opportunity.amountMinCents, 7_500_000);
  assert.equal(candidate.opportunity.amountMaxCents, 25_000_000);
  assert.equal(candidate.opportunity.deadline, "2026-09-30");
  assert.equal(candidate.opportunity.description, "Support & scale advanced manufacturing.");
  assert.match(candidate.opportunity.grantEligibility, /Cost sharing or matching is indicated/);
  assert.equal(candidate.opportunity.matchFundingRequiredCents, 0, "unknown matching amount must not be invented");
  assert.equal(candidate.source.providerKey, GRANTS_GOV_PROVIDER_KEY);
  assert.equal(candidate.source.sourceKind, "official-public");
  assert.equal(candidate.source.externalNumber, "TEST-ROBOTICS-001");
  assert.equal(candidate.source.canonicalUrl, "https://www.grants.gov/search-results-detail/362970");
  assert.equal(candidate.source.attribution, GRANTS_GOV_ATTRIBUTION);
});

test("Grants.gov operation signals are closed after a successful owner search", async () => {
  const signals: AbortSignal[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    if (init?.signal) signals.push(init.signal);
    const url = input instanceof Request ? input.url : input.toString();
    if (url === GRANTS_GOV_SEARCH_ENDPOINT) {
      return jsonResponse({ errorcode: 0, data: { oppHits: [{ id: "42", title: "Signal cleanup grant" }] } });
    }
    return jsonResponse({
      errorcode: 0,
      data: { id: 42, opportunityTitle: "Signal cleanup grant", synopsis: { agencyName: "Agency" } },
    });
  };

  const candidates = await searchGrantsGov(
    { keyword: "cleanup", rows: 1 },
    fetchImpl,
    { requestTimeoutMs: 1_000, overallTimeoutMs: 2_000 },
  );
  assert.equal(candidates.length, 1);
  assert.equal(signals.length, 2);
  assert.ok(signals.every((signal) => signal.aborted), "search/detail signals should be aborted after the completed operation is closed");
});

test("Grants.gov adapter rejects API-declared failures", async () => {
  const fetchImpl: typeof fetch = async () => jsonResponse({ errorcode: 10, msg: "Temporary source failure" });
  await assert.rejects(() => searchGrantsGov({ keyword: "energy" }, fetchImpl), /Temporary source failure/);
});

test("Grants.gov detail hydration respects configured concurrency and preserves search order", async () => {
  let activeDetails = 0;
  let maxActiveDetails = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url === GRANTS_GOV_SEARCH_ENDPOINT) {
      return jsonResponse({
        errorcode: 0,
        data: {
          oppHits: Array.from({ length: 6 }, (_, index) => ({ id: String(index + 1), title: `Opportunity ${index + 1}` })),
        },
      });
    }
    const body = JSON.parse(String(init?.body)) as { opportunityId: number };
    activeDetails += 1;
    maxActiveDetails = Math.max(maxActiveDetails, activeDetails);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 15));
    activeDetails -= 1;
    return jsonResponse({
      errorcode: 0,
      data: {
        id: body.opportunityId,
        opportunityTitle: `Opportunity ${body.opportunityId}`,
        synopsis: { agencyName: "Agency" },
      },
    });
  };

  const candidates = await searchGrantsGov(
    { keyword: "manufacturing", rows: 6 },
    fetchImpl,
    { detailConcurrency: 2, requestTimeoutMs: 500, overallTimeoutMs: 2_000 },
  );
  assert.equal(maxActiveDetails, 2);
  assert.deepEqual(candidates.map((candidate) => candidate.externalId), ["1", "2", "3", "4", "5", "6"]);
  assert.equal(GRANTS_GOV_EXECUTION_LIMITS.detailConcurrency, 4);
});

test("Grants.gov overall search budget aborts remaining detail work instead of multiplying waits", async () => {
  let abortedDetails = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url === GRANTS_GOV_SEARCH_ENDPOINT) {
      return jsonResponse({ errorcode: 0, data: { oppHits: [{ id: "1" }, { id: "2" }, { id: "3" }] } });
    }
    return await new Promise<Response>((resolveRequest, rejectRequest) => {
      const timer = setTimeout(() => resolveRequest(jsonResponse({
        errorcode: 0,
        data: { opportunityTitle: "Slow opportunity", synopsis: { agencyName: "Agency" } },
      })), 80);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        abortedDetails += 1;
        rejectRequest(init.signal?.reason ?? new Error("aborted"));
      }, { once: true });
    });
  };

  const startedAt = Date.now();
  await assert.rejects(
    () => searchGrantsGov(
      { keyword: "slow", rows: 3 },
      fetchImpl,
      { detailConcurrency: 1, requestTimeoutMs: 100, overallTimeoutMs: 130 },
    ),
    /Grants.gov source is unavailable/i,
  );
  assert.ok(Date.now() - startedAt < 260);
  assert.ok(abortedDetails >= 1);
});
