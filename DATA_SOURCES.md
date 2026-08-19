# BossAI Funding Data Sources

BossAI Funding does not silently treat external funding data as product-owned truth. Every supported external source must have an explicit source contract, provenance record, retrieval time, and owner-visible attribution.

## Grants.gov — official public API

Status: enabled for owner-initiated Grant searches.

Source owner: U.S. Department of Health and Human Services Grants.gov system.

Official documentation:

- API resources: `https://www.grants.gov/api`
- API guide: `https://www.grants.gov/api/api-guide`
- Search endpoint documentation: `https://www.grants.gov/api/common/search2`
- Opportunity detail documentation: `https://www.grants.gov/api/common/fetchopportunity`
- API terms: `https://www.grants.gov/api/terms-conditions`

Production API endpoints used:

- `POST https://api.grants.gov/v1/api/search2`
- `POST https://api.grants.gov/v1/api/fetchOpportunity`

Current integration rules:

1. Search runs only after an owner explicitly submits the Grants.gov search form.
2. The integration requests at most 10 results per owner action.
3. Imported data is stored as `FundingOpportunity` plus a separate `funding_source_record` provenance record.
4. Provenance stores provider key, source kind, official external ID/number, canonical Grants.gov detail URL, API endpoint, terms URL, retrieval time, and required attribution.
5. Refreshing official source data preserves the owner's existing `saved`, `pursuing`, or `dismissed` decision.
6. Missing award amounts, geography restrictions, stage restrictions, matching-fund amounts, or other source facts remain missing. The adapter must not invent them.
7. API eligibility is treated as source-provided summary data. The owner must verify the official notice and application instructions before acting on eligibility.
8. A source outage must not remove or rewrite previously saved opportunities.
9. External calls are bounded: each Grants.gov request has a 12-second timeout and one owner search has a 20-second total execution budget.
10. Opportunity-detail hydration uses at most 4 concurrent requests and preserves the official search order in the returned candidates.
11. If any required official-source request fails or the total budget expires, the owner action fails through the existing `SOURCE_UNAVAILABLE` recovery path; BossAI Funding does not start an automatic retry storm or partially overwrite previously saved owner decisions.
12. The owner UI treats source availability as transient operational state, not financing truth: it shows an inline unavailable message, confirms saved opportunities/decisions were unchanged, keeps the search keyword, lets the owner continue working, and exposes a manual `Try again` action. Raw upstream/network exception text is not returned as the owner-facing API error.
13. Current-time deadline viability is projected independently of the stored match. If the recorded deadline passes before a new Application exists, the Opportunity remains visible but is excluded from current `In motion` / coverage until a current cycle or extension is recorded.
14. Source-managed facts on `official-public` (and future `licensed`) Opportunities are read-only through the normal Opportunity PATCH route. The owner may change the pursue/save/dismiss decision and internal links, but title/provider/source URL/description/geography/sectors/stages/amounts/deadline and type-specific source terms must be updated through the admitted source refresh path.
15. A rejected direct edit of source-managed facts returns `SOURCE_FACTS_READ_ONLY` and must not advance workspace revision or alter stored official facts.

Required attribution displayed in the product:

> This product uses the Grants.gov API but is not endorsed or certified by the U.S. Department of Health and Human Services.

## Evaluated sources not currently admitted

### SBA lender directory / Lender Match — not mapped to Loan Opportunity

Official references reviewed:

- SBA Lender Match: `https://www.sba.gov/funding-programs/loans/lender-match-connects-you-lenders`
- SBA.gov Content API lender search documentation: `https://developer.sba.gov/markdown_apis/sbagov-content.html`

The public lender directory can identify SBA lenders, but the documented public directory fields do not provide an owner-specific loan offer with authoritative amount, rate, term, fees, DSCR requirement, collateral requirement, personal guarantee requirement, or approval status. BossAI Funding therefore does not convert lender-directory rows into `Loan` Funding Opportunities. Doing so would create financing terms that the source did not provide.

A future Debt adapter may be admitted if BossAI has an approved official/licensed source that exposes the actual product/offer facts required by the Debt model, or if the product adds a clearly separate lender-directory entity without implying that a lender listing is a loan offer.

### SEC EDGAR public APIs — not mapped to Investor Opportunity

Official reference reviewed:

- SEC EDGAR data APIs: `https://www.sec.gov/search-filings/edgar-application-programming-interfaces`

EDGAR public APIs provide filer submission history and XBRL financial facts. They do not constitute an authoritative source for an investor's current investment thesis, cheque range, target stage, geography, relationship status, or willingness to invest in the owner company. BossAI Funding therefore does not transform EDGAR filings into Investor Opportunities.

A future Investor adapter requires an official public or licensed source whose contract and data actually support investor discovery/matching facts.

## Future source admission rule

A new external funding source may be added only when its use is one of:

- official public data with terms that permit the intended use;
- a licensed/commercial data source under a BossAI-approved agreement;
- owner-entered/manual data with an explicit source reference.

Do not add silent web scraping, unlicensed proprietary datasets, opaque broker feeds, or sources whose terms are incompatible with BossAI commercial distribution.
