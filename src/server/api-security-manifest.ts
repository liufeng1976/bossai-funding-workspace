import type { FundingRouteAuthorizationClass } from "./authorization-policy.ts";

export interface FundingApiSecurityRoute {
  key: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  pattern: RegExp;
  patternLabel: string;
  authorizationClass: FundingRouteAuthorizationClass;
}

export interface FundingApiSecurityManifestProjection {
  routeCount: number;
  publicRouteCount: number;
  protectedRouteCount: number;
  routes: Array<{
    key: string;
    method: FundingApiSecurityRoute["method"];
    pattern: string;
    authorizationClass: FundingRouteAuthorizationClass;
  }>;
}

export const FUNDING_API_SECURITY_MANIFEST: readonly FundingApiSecurityRoute[] = [
  { key: "health", method: "GET", pattern: /^\/api\/health$/, patternLabel: "/api/health", authorizationClass: "public" },
  { key: "identity-boundary", method: "GET", pattern: /^\/api\/security\/identity-boundary$/, patternLabel: "/api/security/identity-boundary", authorizationClass: "read" },
  { key: "authorization-policy", method: "GET", pattern: /^\/api\/security\/authorization-policy$/, patternLabel: "/api/security/authorization-policy", authorizationClass: "read" },
  { key: "identity-verifier", method: "GET", pattern: /^\/api\/security\/identity-verifier$/, patternLabel: "/api/security/identity-verifier", authorizationClass: "read" },
  { key: "tenant-scope", method: "GET", pattern: /^\/api\/security\/tenant-scope$/, patternLabel: "/api/security/tenant-scope", authorizationClass: "read" },
  { key: "security-review-readiness", method: "GET", pattern: /^\/api\/security\/review-readiness$/, patternLabel: "/api/security/review-readiness", authorizationClass: "read" },
  { key: "continuity-backups-list", method: "GET", pattern: /^\/api\/continuity\/backups$/, patternLabel: "/api/continuity/backups", authorizationClass: "read" },
  { key: "continuity-export", method: "GET", pattern: /^\/api\/continuity\/export$/, patternLabel: "/api/continuity/export", authorizationClass: "export-data" },
  { key: "capital-pipeline-export", method: "GET", pattern: /^\/api\/reports\/capital-pipeline\.csv$/, patternLabel: "/api/reports/capital-pipeline.csv", authorizationClass: "export-data" },
  { key: "owner-board-summary-export", method: "GET", pattern: /^\/api\/reports\/owner-board-summary\.md$/, patternLabel: "/api/reports/owner-board-summary.md", authorizationClass: "export-summary" },
  { key: "continuity-backup-create", method: "POST", pattern: /^\/api\/continuity\/backup$/, patternLabel: "/api/continuity/backup", authorizationClass: "backup" },
  { key: "continuity-restore", method: "POST", pattern: /^\/api\/continuity\/restore$/, patternLabel: "/api/continuity/restore", authorizationClass: "restore" },
  { key: "bootstrap", method: "GET", pattern: /^\/api\/bootstrap$/, patternLabel: "/api/bootstrap", authorizationClass: "read" },
  { key: "company-profile-update", method: "PUT", pattern: /^\/api\/company-profile$/, patternLabel: "/api/company-profile", authorizationClass: "mutate" },
  { key: "funding-goal-update", method: "PUT", pattern: /^\/api\/funding-goal$/, patternLabel: "/api/funding-goal", authorizationClass: "mutate" },
  { key: "round-create", method: "POST", pattern: /^\/api\/rounds$/, patternLabel: "/api/rounds", authorizationClass: "mutate" },
  { key: "action-create", method: "POST", pattern: /^\/api\/actions$/, patternLabel: "/api/actions", authorizationClass: "mutate" },
  { key: "action-update", method: "PATCH", pattern: /^\/api\/actions\/\d+$/, patternLabel: "/api/actions/:id", authorizationClass: "mutate" },
  { key: "capital-strategy-recalculate", method: "POST", pattern: /^\/api\/capital-strategy\/recalculate$/, patternLabel: "/api/capital-strategy/recalculate", authorizationClass: "mutate" },
  { key: "fund-create", method: "POST", pattern: /^\/api\/funds$/, patternLabel: "/api/funds", authorizationClass: "mutate" },
  { key: "investor-create", method: "POST", pattern: /^\/api\/investors$/, patternLabel: "/api/investors", authorizationClass: "mutate" },
  { key: "investor-update", method: "PATCH", pattern: /^\/api\/investors\/\d+$/, patternLabel: "/api/investors/:id", authorizationClass: "mutate" },
  { key: "contact-create", method: "POST", pattern: /^\/api\/contacts$/, patternLabel: "/api/contacts", authorizationClass: "mutate" },
  { key: "investment-thesis-create", method: "POST", pattern: /^\/api\/investment-theses$/, patternLabel: "/api/investment-theses", authorizationClass: "mutate" },
  { key: "meeting-create", method: "POST", pattern: /^\/api\/meetings$/, patternLabel: "/api/meetings", authorizationClass: "mutate" },
  { key: "meeting-update", method: "PATCH", pattern: /^\/api\/meetings\/\d+$/, patternLabel: "/api/meetings/:id", authorizationClass: "mutate" },
  { key: "follow-up-create", method: "POST", pattern: /^\/api\/follow-ups$/, patternLabel: "/api/follow-ups", authorizationClass: "mutate" },
  { key: "follow-up-update", method: "PATCH", pattern: /^\/api\/follow-ups\/\d+$/, patternLabel: "/api/follow-ups/:id", authorizationClass: "mutate" },
  { key: "grants-gov-search", method: "POST", pattern: /^\/api\/sources\/grants-gov\/search$/, patternLabel: "/api/sources/grants-gov/search", authorizationClass: "mutate" },
  { key: "opportunity-create", method: "POST", pattern: /^\/api\/opportunities$/, patternLabel: "/api/opportunities", authorizationClass: "mutate" },
  { key: "opportunity-update", method: "PATCH", pattern: /^\/api\/opportunities\/\d+$/, patternLabel: "/api/opportunities/:id", authorizationClass: "mutate" },
  { key: "opportunity-recalculate", method: "POST", pattern: /^\/api\/opportunities\/recalculate$/, patternLabel: "/api/opportunities/recalculate", authorizationClass: "mutate" },
  { key: "application-create", method: "POST", pattern: /^\/api\/applications$/, patternLabel: "/api/applications", authorizationClass: "mutate" },
  { key: "application-update", method: "PATCH", pattern: /^\/api\/applications\/\d+$/, patternLabel: "/api/applications/:id", authorizationClass: "mutate" },
  { key: "document-create", method: "POST", pattern: /^\/api\/documents$/, patternLabel: "/api/documents", authorizationClass: "mutate" },
  { key: "document-update", method: "PATCH", pattern: /^\/api\/documents\/\d+$/, patternLabel: "/api/documents/:id", authorizationClass: "mutate" },
  { key: "data-room-create", method: "POST", pattern: /^\/api\/data-rooms$/, patternLabel: "/api/data-rooms", authorizationClass: "mutate" },
  { key: "data-room-document-create", method: "POST", pattern: /^\/api\/data-room-documents$/, patternLabel: "/api/data-room-documents", authorizationClass: "mutate" },
  { key: "data-room-document-update", method: "PATCH", pattern: /^\/api\/data-room-documents\/\d+$/, patternLabel: "/api/data-room-documents/:id", authorizationClass: "mutate" },
  { key: "due-diligence-create", method: "POST", pattern: /^\/api\/due-diligence$/, patternLabel: "/api/due-diligence", authorizationClass: "mutate" },
  { key: "due-diligence-update", method: "PATCH", pattern: /^\/api\/due-diligence\/\d+$/, patternLabel: "/api/due-diligence/:id", authorizationClass: "mutate" },
  { key: "term-sheet-create", method: "POST", pattern: /^\/api\/term-sheets$/, patternLabel: "/api/term-sheets", authorizationClass: "mutate" },
  { key: "term-sheet-update", method: "PATCH", pattern: /^\/api\/term-sheets\/\d+$/, patternLabel: "/api/term-sheets/:id", authorizationClass: "mutate" },
  { key: "closing-condition-create", method: "POST", pattern: /^\/api\/closing-conditions$/, patternLabel: "/api/closing-conditions", authorizationClass: "mutate" },
  { key: "closing-condition-update", method: "PATCH", pattern: /^\/api\/closing-conditions\/\d+$/, patternLabel: "/api/closing-conditions/:id", authorizationClass: "mutate" },
  { key: "receipt-tranche-create", method: "POST", pattern: /^\/api\/receipt-tranches$/, patternLabel: "/api/receipt-tranches", authorizationClass: "mutate" },
  { key: "receipt-tranche-update", method: "PATCH", pattern: /^\/api\/receipt-tranches\/\d+$/, patternLabel: "/api/receipt-tranches/:id", authorizationClass: "mutate" },
  { key: "receipt-expectation-create", method: "POST", pattern: /^\/api\/receipt-expectations$/, patternLabel: "/api/receipt-expectations", authorizationClass: "mutate" },
  { key: "receipt-expectation-update", method: "PATCH", pattern: /^\/api\/receipt-expectations\/\d+$/, patternLabel: "/api/receipt-expectations/:id", authorizationClass: "mutate" },
  { key: "receipt-expectation-allocation-create", method: "POST", pattern: /^\/api\/receipt-expectation-allocations$/, patternLabel: "/api/receipt-expectation-allocations", authorizationClass: "mutate" },
  { key: "receipt-expectation-allocation-update", method: "PATCH", pattern: /^\/api\/receipt-expectation-allocations\/\d+$/, patternLabel: "/api/receipt-expectation-allocations/:id", authorizationClass: "mutate" },
  { key: "outcome-create", method: "POST", pattern: /^\/api\/outcomes$/, patternLabel: "/api/outcomes", authorizationClass: "mutate" },
  { key: "outcome-update", method: "PATCH", pattern: /^\/api\/outcomes\/\d+$/, patternLabel: "/api/outcomes/:id", authorizationClass: "mutate" },
] as const;

export function matchFundingApiSecurityRoute(method: string, pathname: string): FundingApiSecurityRoute | null {
  const normalizedMethod = method.toUpperCase();
  return FUNDING_API_SECURITY_MANIFEST.find((route) => route.method === normalizedMethod && route.pattern.test(pathname)) ?? null;
}

export function fundingApiSecurityManifestStatus(): FundingApiSecurityManifestProjection {
  const publicRouteCount = FUNDING_API_SECURITY_MANIFEST.filter((route) => route.authorizationClass === "public").length;
  return {
    routeCount: FUNDING_API_SECURITY_MANIFEST.length,
    publicRouteCount,
    protectedRouteCount: FUNDING_API_SECURITY_MANIFEST.length - publicRouteCount,
    routes: FUNDING_API_SECURITY_MANIFEST.map((route) => ({
      key: route.key,
      method: route.method,
      pattern: route.patternLabel,
      authorizationClass: route.authorizationClass,
    })),
  };
}
