import type { FundingOpportunityInput, FundingSourceRecordInput } from "../domain/types.ts";

export const GRANTS_GOV_PROVIDER_KEY = "grants-gov";
export const GRANTS_GOV_SEARCH_ENDPOINT = "https://api.grants.gov/v1/api/search2";
export const GRANTS_GOV_FETCH_ENDPOINT = "https://api.grants.gov/v1/api/fetchOpportunity";
export const GRANTS_GOV_TERMS_URL = "https://www.grants.gov/api/terms-conditions";
export const GRANTS_GOV_ATTRIBUTION = "This product uses the Grants.gov API but is not endorsed or certified by the U.S. Department of Health and Human Services.";

interface SearchHit {
  id?: string | number;
  number?: string;
  title?: string;
  agencyCode?: string;
  agencyName?: string;
  openDate?: string;
  closeDate?: string;
  oppStatus?: string;
}

interface SearchResponse {
  errorcode?: number;
  msg?: string;
  data?: {
    oppHits?: SearchHit[];
  };
}

interface DescriptionItem {
  id?: string | number;
  description?: string;
}

interface OpportunitySynopsis {
  agencyName?: string;
  synopsisDesc?: string;
  costSharing?: boolean;
  awardCeiling?: string | number;
  awardFloor?: string | number;
  applicantTypes?: DescriptionItem[];
  fundingInstruments?: DescriptionItem[];
  fundingActivityCategories?: DescriptionItem[];
}

interface OpportunityDetailResponse {
  errorcode?: number;
  msg?: string;
  data?: {
    id?: string | number;
    opportunityNumber?: string;
    opportunityTitle?: string;
    synopsis?: OpportunitySynopsis;
    agencyDetails?: {
      agencyName?: string;
    };
  };
}

export interface GrantsGovSearchInput {
  keyword: string;
  rows?: number;
}

export interface GrantsGovExecutionOptions {
  requestTimeoutMs?: number;
  overallTimeoutMs?: number;
  detailConcurrency?: number;
}

export const GRANTS_GOV_EXECUTION_LIMITS = Object.freeze({
  requestTimeoutMs: 12_000,
  overallTimeoutMs: 20_000,
  detailConcurrency: 4,
});

export interface GrantsGovCandidate {
  externalId: string;
  opportunity: FundingOpportunityInput;
  source: Omit<FundingSourceRecordInput, "opportunityId">;
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function descriptions(items: DescriptionItem[] | undefined): string {
  return (items ?? [])
    .map((item) => cleanText(item.description))
    .filter(Boolean)
    .join("; ");
}

function parseCurrencyToCents(value: string | number | undefined): number {
  if (value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric * 100);
}

function mmddyyyyToIso(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

async function postJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  body: Record<string, unknown>,
  requestTimeoutMs: number,
  operationSignal: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.any([operationSignal, AbortSignal.timeout(requestTimeoutMs)]),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "network request failed";
    throw new Error(`Grants.gov source is unavailable: ${detail}.`);
  }
  if (!response.ok) throw new Error(`Grants.gov request failed with HTTP ${response.status}.`);
  return await response.json() as T;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index] as T);
    }
  }
  const workerCount = Math.min(items.length, Math.max(1, concurrency));
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

function assertApiSuccess(response: { errorcode?: number; msg?: string }, operation: string): void {
  if (response.errorcode !== 0) {
    throw new Error(`Grants.gov ${operation} failed: ${cleanText(response.msg) || "unknown API error"}.`);
  }
}

export async function searchGrantsGov(
  input: GrantsGovSearchInput,
  fetchImpl: typeof fetch = fetch,
  options: GrantsGovExecutionOptions = {},
): Promise<GrantsGovCandidate[]> {
  const keyword = input.keyword.trim();
  if (!keyword) throw new Error("Enter a Grants.gov search keyword.");
  const rows = Math.min(10, Math.max(1, Math.round(input.rows ?? 5)));
  const requestTimeoutMs = Math.max(1, Math.round(options.requestTimeoutMs ?? GRANTS_GOV_EXECUTION_LIMITS.requestTimeoutMs));
  const overallTimeoutMs = Math.max(requestTimeoutMs, Math.round(options.overallTimeoutMs ?? GRANTS_GOV_EXECUTION_LIMITS.overallTimeoutMs));
  const detailConcurrency = Math.min(10, Math.max(1, Math.round(options.detailConcurrency ?? GRANTS_GOV_EXECUTION_LIMITS.detailConcurrency)));
  const operationController = new AbortController();
  const operationSignal = AbortSignal.any([operationController.signal, AbortSignal.timeout(overallTimeoutMs)]);

  try {
    const search = await postJson<SearchResponse>(fetchImpl, GRANTS_GOV_SEARCH_ENDPOINT, {
      rows,
      keyword,
      oppStatuses: "forecasted|posted",
    }, requestTimeoutMs, operationSignal);
    assertApiSuccess(search, "search");

    const hits = (search.data?.oppHits ?? []).slice(0, rows);
    const fetchedAt = new Date().toISOString();
    const candidates = await mapWithConcurrency(hits, detailConcurrency, async (hit): Promise<GrantsGovCandidate | null> => {
      const externalId = String(hit.id ?? "").trim();
      const opportunityId = Number(externalId);
      if (!externalId || !Number.isSafeInteger(opportunityId) || opportunityId <= 0) return null;
      const detail = await postJson<OpportunityDetailResponse>(fetchImpl, GRANTS_GOV_FETCH_ENDPOINT, {
        opportunityId,
      }, requestTimeoutMs, operationSignal);
      assertApiSuccess(detail, `opportunity ${externalId}`);

      const detailData = detail.data ?? {};
      const synopsis = detailData.synopsis;
      const externalNumber = cleanText(detailData.opportunityNumber) || cleanText(hit.number);
      const title = cleanText(detailData.opportunityTitle) || cleanText(hit.title) || `Grants.gov opportunity ${externalId}`;
      const agencyName = cleanText(synopsis?.agencyName) || cleanText(detailData.agencyDetails?.agencyName) || cleanText(hit.agencyName) || cleanText(hit.agencyCode) || "Grants.gov";
      const floor = parseCurrencyToCents(synopsis?.awardFloor);
      const ceiling = Math.max(floor, parseCurrencyToCents(synopsis?.awardCeiling));
      const programType = descriptions(synopsis?.fundingInstruments) || "Grant opportunity";
      const applicantEligibility = descriptions(synopsis?.applicantTypes);
      const eligibility = synopsis?.costSharing
        ? `${applicantEligibility}${applicantEligibility ? "; " : ""}Cost sharing or matching is indicated by the official source; verify the amount and rules in the notice.`
        : applicantEligibility;
      const categories = descriptions(synopsis?.fundingActivityCategories);
      const canonicalUrl = `https://www.grants.gov/search-results-detail/${encodeURIComponent(externalId)}`;

      return {
        externalId,
        opportunity: {
          type: "grant",
          title,
          provider: agencyName,
          sourceUrl: canonicalUrl,
          description: cleanText(synopsis?.synopsisDesc),
          geography: "",
          sectors: categories,
          stages: "",
          amountMinCents: floor,
          amountMaxCents: ceiling,
          deadline: mmddyyyyToIso(hit.closeDate),
          decision: "new",
          grantProgramType: programType,
          grantEligibility: eligibility,
          matchFundingRequiredCents: 0,
          loanTermMonths: null,
          annualInterestRatePct: null,
          loanFeesCents: 0,
          minimumDscr: null,
          collateralRequired: false,
          personalGuaranteeRequired: false,
          investorId: null,
          fundId: null,
          investorType: "",
        },
        source: {
          providerKey: GRANTS_GOV_PROVIDER_KEY,
          sourceKind: "official-public",
          externalId,
          externalNumber,
          canonicalUrl,
          apiEndpoint: GRANTS_GOV_FETCH_ENDPOINT,
          termsUrl: GRANTS_GOV_TERMS_URL,
          fetchedAt,
          attribution: GRANTS_GOV_ATTRIBUTION,
        },
      };
    });

    return candidates.filter((candidate): candidate is GrantsGovCandidate => candidate !== null);
  } finally {
    operationController.abort();
  }
}
