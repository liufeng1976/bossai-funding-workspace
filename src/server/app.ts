import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { projectDashboard } from "../domain/dashboard.ts";
import { summarizeEquityPipeline } from "../domain/equity.ts";
import { calculateDataRoomReadiness, compareTermSheets } from "../domain/execution.ts";
import { searchGrantsGov, GRANTS_GOV_PROVIDER_KEY } from "../integrations/grants-gov.ts";
import { calculateFundingReadiness, evaluateOpportunity } from "../domain/matching.ts";
import { projectOpportunityDeadlineViabilities } from "../domain/opportunity-viability.ts";
import { projectOwnerJourney } from "../domain/owner-journey.ts";
import { projectReceiptAllocationReconciliationIssues } from "../domain/receipt-expectation-reconciliation.ts";
import { buildCapitalPipelineCsv, buildOwnerBoardSummaryMarkdown } from "../domain/reporting.ts";
import { calculateCapitalStrategy } from "../domain/strategy.ts";
import { projectCapitalStrategyFreshness } from "../domain/strategy-freshness.ts";
import type { BootstrapState, FundingActivityInput, FundingOpportunity, FundingOpportunityInput } from "../domain/types.ts";
import {
  authorizationPolicyStatus,
  classifyFundingApiOperation,
  evaluateFundingAuthorization,
  type FundingAuthorizationEnforcementMode,
  type FundingAuthorizationOperation,
} from "./authorization-policy.ts";
import { ContinuityRepository } from "./continuity.ts";
import { FundingRepository } from "./database.ts";
import { identityBoundaryStatus } from "./identity-boundary.ts";
import {
  assertVerifiedPrincipal,
  identityVerifierContractStatus,
  IdentityVerificationError,
  type IdentityVerificationPolicy,
  type IdentityVerifier,
  type VerifiedExternalPrincipal,
} from "./identity-verifier.ts";
import { EquityRepository } from "./equity-database.ts";
import { ExecutionRepository } from "./execution-database.ts";
import { createFundingHttpServer, FUNDING_HTTP_RESOURCE_LIMITS } from "./http-resource-limits.ts";
import { OpportunityRepository } from "./opportunity-database.ts";
import { evaluateBrowserRequestIntegrity, requestHostAllowed, securityHeaders } from "./security.ts";
import { projectSecurityReviewReadiness } from "./security-review.ts";
import { SecurityDecisionRepository, type SecurityDecisionOperation } from "./security-decision-database.ts";
import { FundingSourceRepository } from "./source-database.ts";
import { assertFundingApiSecurityManifestInvariant, assertStartupSecurityInvariants } from "./startup-security-invariants.ts";
import { inspectTenantSchemaPreparation, prepareLocalTenantSchema } from "./tenant-scope.ts";
import {
  assertWorkspaceRevisionPrecondition,
  createWorkspaceMutationCoordinator,
  ensureWorkspaceRevisionSchema,
  getWorkspaceRevision,
  inspectWorkspaceRevisionReadiness,
  operationRequiresWorkspaceRevision,
  WorkspaceRevisionError,
} from "./workspace-revision.ts";
import {
  RequestValidationError,
  parseAction,
  parseApplication,
  parseClosingCondition,
  parseCompanyProfile,
  parseContact,
  parseDataRoom,
  parseDataRoomDocument,
  parseDocument,
  parseDueDiligenceRequest,
  parseFollowUp,
  parseFund,
  parseFundingGoal,
  parseGrantsGovSearch,
  parseInvestmentThesis,
  parseInvestor,
  parseMeeting,
  parseOpportunity,
  parseOutcome,
  parseReceiptTranche,
  parseReceiptExpectation,
  parseReceiptExpectationAllocation,
  parseRestoreRequest,
  parseRound,
  parseTermSheet,
} from "./validation.ts";

function bootstrap(
  repo: FundingRepository,
  equityRepo: EquityRepository,
  opportunityRepo: OpportunityRepository,
  executionRepo: ExecutionRepository,
  continuityRepo: ContinuityRepository,
  sourceRepo: FundingSourceRepository,
): BootstrapState {
  const companyProfile = repo.getCompanyProfile();
  const fundingGoal = repo.getFundingGoal();
  const rounds = repo.listRounds();
  const actions = repo.listActions();
  const strategy = repo.getCapitalStrategy();
  const now = new Date();
  const strategyFreshness = projectCapitalStrategyFreshness(companyProfile, fundingGoal, strategy, now);
  const funds = equityRepo.listFunds();
  const investors = equityRepo.listInvestors();
  const contacts = equityRepo.listContacts();
  const investmentTheses = equityRepo.listInvestmentTheses();
  const meetings = equityRepo.listMeetings();
  const followUps = equityRepo.listFollowUps();
  const opportunities = opportunityRepo.listOpportunities();
  const opportunityMatches = opportunityRepo.listMatches();
  const opportunityViability = projectOpportunityDeadlineViabilities(opportunities, now);
  const fundingReadiness = calculateFundingReadiness(companyProfile, fundingGoal);
  const applications = executionRepo.listApplications();
  const documents = executionRepo.listDocuments();
  const dataRooms = executionRepo.listDataRooms();
  const dataRoomFolders = executionRepo.listDataRoomFolders();
  const dataRoomDocuments = executionRepo.listDataRoomDocuments();
  const dueDiligenceRequests = executionRepo.listDueDiligenceRequests();
  const termSheets = executionRepo.listTermSheets();
  const closingConditions = executionRepo.listClosingConditions();
  const outcomes = executionRepo.listOutcomes();
  const receiptTranches = executionRepo.listReceiptTranches();
  const receiptExpectations = executionRepo.listReceiptExpectations();
  const receiptExpectationAllocations = executionRepo.listReceiptExpectationAllocations();
  const receiptAllocationReconciliationIssues = projectReceiptAllocationReconciliationIssues(receiptExpectations, receiptExpectationAllocations, receiptTranches);
  const dataRoomReadiness = dataRooms.map((room) => calculateDataRoomReadiness(room, dataRoomFolders, dataRoomDocuments));
  const termSheetComparison = compareTermSheets(termSheets, investors);
  const continuity = continuityRepo.getStatus();
  const ownerJourney = projectOwnerJourney({
    profile: companyProfile,
    goal: fundingGoal,
    strategy,
    strategyFreshness,
    opportunities,
    opportunityViability,
    investors,
    actions,
    applications,
    followUps,
    meetings,
    dueDiligenceRequests,
    termSheets,
    continuity,
  });
  return {
    workspaceRevision: getWorkspaceRevision(repo.db, continuityRepo.getWorkspaceId()).revision,
    companyProfile,
    fundingGoal,
    rounds,
    actions,
    strategy,
    strategyFreshness,
    funds,
    investors,
    contacts,
    investmentTheses,
    meetings,
    followUps,
    equityPipeline: summarizeEquityPipeline(investors, followUps, meetings, outcomes),
    opportunities,
    opportunityMatches,
    opportunityViability,
    fundingSources: sourceRepo.listSources(),
    fundingReadiness,
    applications,
    documents,
    dataRooms,
    dataRoomFolders,
    dataRoomDocuments,
    dataRoomReadiness,
    dueDiligenceRequests,
    termSheets,
    closingConditions,
    termSheetComparison,
    outcomes,
    receiptTranches,
    receiptExpectations,
    receiptExpectationAllocations,
    receiptAllocationReconciliationIssues,
    activities: continuityRepo.listActivities(),
    backups: continuityRepo.listBackups(),
    continuity,
    identityBoundary: identityBoundaryStatus(continuityRepo.getWorkspaceId()),
    ownerJourney,
    dashboard: projectDashboard(companyProfile, fundingGoal, rounds, actions, now, investors, followUps, meetings, opportunities, opportunityMatches, applications, dueDiligenceRequests, termSheets, outcomes, closingConditions, receiptTranches, receiptExpectations, receiptExpectationAllocations, strategyFreshness),
  };
}

const SOURCE_MANAGED_OPPORTUNITY_FIELDS: Array<keyof FundingOpportunityInput> = [
  "type", "title", "provider", "sourceUrl", "description", "geography", "sectors", "stages", "amountMinCents", "amountMaxCents", "deadline",
  "grantProgramType", "grantEligibility", "matchFundingRequiredCents", "loanTermMonths", "annualInterestRatePct", "loanFeesCents", "minimumDscr",
  "collateralRequired", "personalGuaranteeRequired", "investorType",
];

function changedSourceManagedOpportunityField(existing: FundingOpportunity, proposed: FundingOpportunityInput): keyof FundingOpportunityInput | null {
  return SOURCE_MANAGED_OPPORTUNITY_FIELDS.find((field) => !Object.is(existing[field], proposed[field])) ?? null;
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    ...securityHeaders("application/json; charset=utf-8"),
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendDownload(res: ServerResponse, fileName: string, body: string, contentType = "application/json; charset=utf-8"): void {
  res.writeHead(200, {
    ...securityHeaders(contentType),
    "content-disposition": `attachment; filename="${fileName}"`,
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > FUNDING_HTTP_RESOURCE_LIMITS.maxJsonBodyBytes) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new Error("Request body must contain valid JSON.");
  }
}

function classifyServerError(error: unknown): { status: number; code: string; message: string; recovery: string; field?: string | null } {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  if (error instanceof RequestValidationError) {
    return { status: 400, code: "VALIDATION_ERROR", message, recovery: "Correct this field and retry. The browser keeps the current form contents.", field: error.field };
  }
  if (message === "Request body is too large.") {
    return { status: 413, code: "REQUEST_TOO_LARGE", message, recovery: "Reduce the payload and retry; existing form input remains in the browser." };
  }
  if (message.includes("does not belong to the active funding workspace")) {
    return {
      status: 409,
      code: "STALE_REFERENCE",
      message: "A linked financing record is unavailable in the active funding workspace.",
      recovery: "Select a current linked record and retry. The product does not reveal whether the unavailable ID exists in another workspace, and your entered form values have not been cleared.",
    };
  }
  if (message.includes("FOREIGN KEY constraint failed")) {
    return {
      status: 409,
      code: "STALE_REFERENCE",
      message: "A linked financing record no longer matches the current workspace state.",
      recovery: "Select the current Investor, Opportunity, Round, Application, Document, or Data Room item and retry. Your entered form values have not been cleared.",
    };
  }
  if (message.startsWith("Grants.gov ")) {
    return {
      status: 502,
      code: "SOURCE_UNAVAILABLE",
      message: "Grants.gov could not be reached or completed within the current source-check budget.",
      recovery: "Keep working with the opportunities already saved here and try the official search again later. No existing owner decision was changed.",
    };
  }
  if (message.includes("UNIQUE constraint failed")) {
    return { status: 409, code: "CONFLICT", message: "This financing record conflicts with an existing record.", recovery: "Review the current record and retry without losing the entered form values." };
  }
  if (message.includes("SQLITE_CONSTRAINT")) {
    return { status: 400, code: "DATA_CONSTRAINT", message: "The financing data violates a required business constraint.", recovery: "Correct the values and retry; the current form input remains available." };
  }
  return { status: 400, code: "VALIDATION_ERROR", message, recovery: "Correct the entered values and retry. The browser keeps the current form contents." };
}

function staticContentType(path: string): string {
  const extension = extname(path);
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function serveStatic(publicDir: string, urlPath: string, res: ServerResponse): boolean {
  const requested = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
  const safe = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safe);
  if (!existsSync(filePath)) return false;
  const body = readFileSync(filePath);
  res.writeHead(200, {
    ...securityHeaders(staticContentType(filePath)),
    "content-length": body.byteLength,
    "cache-control": urlPath === "/" ? "no-store" : "public, max-age=60",
  });
  res.end(body);
  return true;
}

export interface FundingServerOptions {
  fetchImpl?: typeof fetch;
  authorizationEnforcement?: FundingAuthorizationEnforcementMode;
  identityVerifier?: IdentityVerifier;
  identityVerificationPolicy?: IdentityVerificationPolicy;
}

export function createFundingServer(repo: FundingRepository, publicDir: string, options: FundingServerOptions = {}): Server {
  assertFundingApiSecurityManifestInvariant();
  const equityRepo = new EquityRepository(repo.db);
  const opportunityRepo = new OpportunityRepository(repo.db);
  const executionRepo = new ExecutionRepository(repo.db);
  const continuityRepo = new ContinuityRepository(repo.db, repo.databasePath);
  const sourceRepo = new FundingSourceRepository(repo.db);
  const workspaceId = continuityRepo.getWorkspaceId();
  const tenantStartupStatus = prepareLocalTenantSchema(repo.db, workspaceId);
  const startupSecurityInvariants = assertStartupSecurityInvariants(tenantStartupStatus);
  ensureWorkspaceRevisionSchema(repo.db, workspaceId);
  const mutationCoordinator = createWorkspaceMutationCoordinator();
  const workspaceIdentity = continuityRepo.getWorkspaceIdentity();
  const securityDecisionRepo = new SecurityDecisionRepository(repo.db, workspaceId);
  const authorizationEnforcement = options.authorizationEnforcement ?? "local-owner";
  if (authorizationEnforcement === "verified-external" && (!options.identityVerifier || !options.identityVerificationPolicy)) {
    throw new Error("Verified-external authorization requires an injected IdentityVerifier and identity verification policy.");
  }
  repo.bindWorkspace(workspaceId);
  equityRepo.bindWorkspace(workspaceId);
  opportunityRepo.bindWorkspace(workspaceId);
  executionRepo.bindWorkspace(workspaceId);
  sourceRepo.bindWorkspace(workspaceId);
  const fetchImpl = options.fetchImpl ?? fetch;
  const identityVerifier = options.identityVerifier;
  const identityVerificationPolicy = options.identityVerificationPolicy;
  const state = (): BootstrapState => bootstrap(repo, equityRepo, opportunityRepo, executionRepo, continuityRepo, sourceRepo);
  const recordActivity = (activity: FundingActivityInput): void => {
    continuityRepo.recordActivity(activity);
  };
  const refreshOpportunityMatches = (): void => {
    const profile = repo.getCompanyProfile();
    const goal = repo.getFundingGoal();
    for (const opportunity of opportunityRepo.listOpportunities()) {
      opportunityRepo.saveMatch(evaluateOpportunity(profile, goal, opportunity));
    }
  };
  const synchronizeCapitalStrategyIfPresent = (): ReturnType<FundingRepository["saveCapitalStrategy"]> | null => {
    const strategy = repo.getCapitalStrategy();
    const goal = repo.getFundingGoal();
    if (!strategy || !goal) return null;
    const profile = repo.getCompanyProfile();
    const freshness = projectCapitalStrategyFreshness(profile, goal, strategy);
    if (freshness.state === "current") return null;
    return repo.saveCapitalStrategy(calculateCapitalStrategy(profile, goal));
  };
  const recordSecurityDecision = (
    operation: SecurityDecisionOperation,
    method: string,
    pathname: string,
    decision: "allow" | "deny",
    reason: string,
    principal: VerifiedExternalPrincipal | null,
  ): void => {
    const localOwnerDecision = principal === null && authorizationEnforcement === "local-owner";
    securityDecisionRepo.record({
      subject: principal?.subject ?? null,
      tenantId: principal?.tenantId ?? (localOwnerDecision ? workspaceIdentity.tenantId : null),
      issuer: principal?.issuer ?? (localOwnerDecision ? "local-owner" : null),
      effectiveRole: principal && operation !== "unclassified-api"
        ? evaluateFundingAuthorization(principal, operation, workspaceIdentity.tenantId).effectiveRole
        : localOwnerDecision && operation !== "unclassified-api" ? "owner" : null,
      identityState: principal ? "verified-external" : localOwnerDecision ? "local-owner" : "unverified",
      operation,
      method,
      pathname,
      decision,
      reason,
      adapterKey: principal?.verification.adapterKey ?? identityVerifier?.adapterKey ?? null,
    });
  };
  const enforceAuthorization = async (
    req: IncomingMessage,
    res: ServerResponse,
    method: string,
    pathname: string,
  ): Promise<boolean> => {
    const routeClass = classifyFundingApiOperation(method, pathname);
    if (routeClass === null) {
      if (pathname.startsWith("/api/")) {
        if (authorizationEnforcement === "verified-external") {
          recordSecurityDecision(
            "unclassified-api",
            method,
            pathname,
            "deny",
            "The API route is not registered in the BossAI Funding Route Security Manifest.",
            null,
          );
          sendJson(res, 403, {
            error: "This BossAI Funding API route is not registered for verified-external access.",
            code: "API_SECURITY_CLASSIFICATION_REQUIRED",
            recovery: "Register the route and its authorization class in the Route Security Manifest before enabling verified-external access.",
          });
        } else {
          securityDecisionRepo.record({
            subject: null,
            tenantId: workspaceIdentity.tenantId,
            issuer: "local-owner",
            effectiveRole: "owner",
            identityState: "local-owner",
            operation: "unclassified-api",
            method,
            pathname,
            decision: "deny",
            reason: "The API route is not registered in the BossAI Funding Route Security Manifest.",
            adapterKey: null,
          });
          sendJson(res, 404, { error: "Not found.", code: "UNCLASSIFIED_API_ROUTE" });
        }
        return false;
      }
      return true;
    }
    if (routeClass === "public") return true;

    const operation: FundingAuthorizationOperation = routeClass;
    const requestIntegrity = evaluateBrowserRequestIntegrity(method, pathname, req.headers);
    if (!requestIntegrity.allowed) {
      recordSecurityDecision(operation, method, pathname, "deny", requestIntegrity.reason, null);
      sendJson(res, requestIntegrity.status, {
        error: "This BossAI Funding browser request was blocked by the local request-integrity boundary.",
        code: requestIntegrity.code,
        recovery: "Use the BossAI Funding application from the same loopback origin and send API mutations as application/json.",
      });
      return false;
    }

    const enforceWorkspaceRevision = (principal: VerifiedExternalPrincipal | null): boolean => {
      const revisionReadiness = inspectWorkspaceRevisionReadiness(repo.db, workspaceId);
      if (!revisionReadiness.ready) {
        const reason = `Workspace revision guard is incomplete (${revisionReadiness.installedTriggerCount}/${revisionReadiness.expectedTriggerCount} triggers).`;
        recordSecurityDecision(operation, method, pathname, "deny", reason, principal);
        sendJson(res, 503, {
          error: "BossAI Funding blocked this write because stale-write protection is not fully installed.",
          code: "WORKSPACE_REVISION_GUARD_UNAVAILABLE",
          recovery: "Do not retry the financing write until the local workspace revision guard is repaired and the application is restarted.",
        });
        return false;
      }
      try {
        assertWorkspaceRevisionPrecondition(
          req.headers,
          operation,
          revisionReadiness.currentRevision,
        );
        return true;
      } catch (error) {
        if (error instanceof WorkspaceRevisionError) {
          recordSecurityDecision(operation, method, pathname, "deny", error.message, principal);
          sendJson(res, error.status, {
            error: error.message,
            code: error.code,
            currentWorkspaceRevision: error.currentRevision,
            recovery: "Refresh the latest BossAI Funding workspace state before retrying. Keep the current form values; do not re-enter the financing draft from scratch.",
          });
          return false;
        }
        throw error;
      }
    };

    if (authorizationEnforcement === "local-owner") return enforceWorkspaceRevision(null);
    let principal: VerifiedExternalPrincipal;
    try {
      principal = assertVerifiedPrincipal(
        await (identityVerifier as IdentityVerifier).verify({ method, pathname, headers: req.headers }),
        identityVerificationPolicy as IdentityVerificationPolicy,
      );
    } catch (error) {
      const reason = error instanceof IdentityVerificationError
        ? error.message
        : "The external identity could not be verified by the approved BossAI Funding adapter boundary.";
      recordSecurityDecision(operation, method, pathname, "deny", reason, null);
      sendJson(res, 401, {
        error: "A verified external identity is required for this BossAI Funding operation.",
        code: error instanceof IdentityVerificationError ? error.code : "IDENTITY_REQUIRED",
        recovery: "Authenticate through the approved upstream identity integration and retry. Browser-supplied tenant or role headers are not accepted as authorization.",
      });
      return false;
    }

    const authorization = evaluateFundingAuthorization(principal, operation, workspaceIdentity.tenantId);
    if (!authorization.allowed) {
      recordSecurityDecision(operation, method, pathname, "deny", authorization.reason, principal);
      sendJson(res, 403, {
        error: "This verified identity is not permitted to perform the requested BossAI Funding operation.",
        code: "AUTHORIZATION_DENIED",
        recovery: "Use the correct tenant and an approved BossAI Funding role. The response does not reveal data from another workspace.",
      });
      return false;
    }
    if (!enforceWorkspaceRevision(principal)) return false;
    recordSecurityDecision(operation, method, pathname, "allow", authorization.reason, principal);
    return true;
  };

  return createFundingHttpServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", "http://localhost");

      if (!requestHostAllowed(req.headers)) {
        sendJson(res, 421, { error: "BossAI Funding accepts local loopback requests only in the current build." });
        return;
      }

      const routeClass = classifyFundingApiOperation(method, url.pathname);
      if (routeClass && routeClass !== "public" && operationRequiresWorkspaceRevision(routeClass)) {
        const releaseMutation = await mutationCoordinator.acquire();
        let released = false;
        const releaseOnce = (): void => {
          if (released) return;
          released = true;
          releaseMutation();
        };
        res.once("finish", releaseOnce);
        res.once("close", releaseOnce);
      }

      if (!(await enforceAuthorization(req, res, method, url.pathname))) return;

      if (method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true, product: "BossAI Funding", database: "sqlite", accessMode: "local-loopback" });
        return;
      }

      if (method === "GET" && url.pathname === "/api/security/identity-boundary") {
        sendJson(res, 200, identityBoundaryStatus(workspaceId));
        return;
      }

      if (method === "GET" && url.pathname === "/api/security/authorization-policy") {
        sendJson(res, 200, authorizationPolicyStatus(authorizationEnforcement));
        return;
      }

      if (method === "GET" && url.pathname === "/api/security/identity-verifier") {
        sendJson(res, 200, {
          ...identityVerifierContractStatus(),
          runtimeEnforcementMode: authorizationEnforcement,
          adapterConfigured: Boolean(identityVerifier),
          adapterKey: identityVerifier?.adapterKey ?? null,
        });
        return;
      }

      if (method === "GET" && url.pathname === "/api/security/tenant-scope") {
        sendJson(res, 200, inspectTenantSchemaPreparation(repo.db, workspaceId));
        return;
      }

      if (method === "GET" && url.pathname === "/api/security/review-readiness") {
        sendJson(res, 200, projectSecurityReviewReadiness({
          tenantStatus: inspectTenantSchemaPreparation(repo.db, workspaceId),
          authorizationEnforcement,
          identityAdapterConfigured: Boolean(identityVerifier && identityVerificationPolicy),
          startupSecurityInvariants,
          workspaceRevision: inspectWorkspaceRevisionReadiness(repo.db, workspaceId),
          securityDecisionRetention: securityDecisionRepo.retentionStatus(),
        }));
        return;
      }

      if (method === "GET" && url.pathname === "/api/continuity/backups") {
        sendJson(res, 200, { backups: continuityRepo.listBackups(), continuity: continuityRepo.getStatus() });
        return;
      }

      if (method === "GET" && url.pathname === "/api/continuity/export") {
        const snapshot = continuityRepo.exportSnapshot();
        const fileName = `bossai-funding-export-${snapshot.exportedAt.slice(0, 10)}.json`;
        sendDownload(res, fileName, JSON.stringify(snapshot, null, 2));
        return;
      }

      if (method === "GET" && url.pathname === "/api/reports/capital-pipeline.csv") {
        const csv = buildCapitalPipelineCsv({
          opportunities: opportunityRepo.listOpportunities(),
          sources: sourceRepo.listSources(),
          matches: opportunityRepo.listMatches(),
          investors: equityRepo.listInvestors(),
          applications: executionRepo.listApplications(),
          outcomes: executionRepo.listOutcomes(),
        });
        sendDownload(res, `bossai-funding-capital-pipeline-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv; charset=utf-8");
        return;
      }

      if (method === "GET" && url.pathname === "/api/reports/owner-board-summary.md") {
        const summary = buildOwnerBoardSummaryMarkdown(state());
        sendDownload(res, `bossai-funding-owner-board-summary-${new Date().toISOString().slice(0, 10)}.md`, summary, "text/markdown; charset=utf-8");
        return;
      }

      if (method === "POST" && url.pathname === "/api/continuity/backup") {
        const backupRecord = await continuityRepo.createBackup("manual");
        recordActivity({
          category: "continuity",
          action: "backup",
          title: "Local funding backup created",
          summary: `Saved ${backupRecord.fileName} before further financing work.`,
          entityType: "backup",
          entityId: null,
          track: null,
          amountCents: null,
        });
        sendJson(res, 201, { backup: backupRecord, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/continuity/restore") {
        const request = parseRestoreRequest(await readJson(req));
        const recovery = await continuityRepo.restoreBackup(request.fileName);
        sendJson(res, 200, { recovery, state: state() });
        return;
      }

      if (method === "GET" && url.pathname === "/api/bootstrap") {
        sendJson(res, 200, state());
        return;
      }

      if (method === "PUT" && url.pathname === "/api/company-profile") {
        const profile = repo.saveCompanyProfile(parseCompanyProfile(await readJson(req)));
        refreshOpportunityMatches();
        const synchronizedStrategy = synchronizeCapitalStrategyIfPresent();
        recordActivity({ category: "setup", action: "update", title: "Company funding profile updated", summary: `${profile.name} financing facts were refreshed.`, entityType: "company-profile", entityId: profile.id, track: null, amountCents: profile.targetFundingCents });
        if (synchronizedStrategy) {
          recordActivity({ category: "strategy", action: "recalculate", title: "Capital strategy synchronized after company facts changed", summary: `${synchronizedStrategy.allocations.length} capital tracks recalculated from the current company facts and funding goal.`, entityType: "capital-strategy", entityId: synchronizedStrategy.id, track: null, amountCents: synchronizedStrategy.totalNeedCents });
        }
        sendJson(res, 200, state());
        return;
      }

      if (method === "PUT" && url.pathname === "/api/funding-goal") {
        const goal = repo.saveFundingGoal(parseFundingGoal(await readJson(req)));
        refreshOpportunityMatches();
        const synchronizedStrategy = synchronizeCapitalStrategyIfPresent();
        recordActivity({ category: "setup", action: "update", title: "Funding goal updated", summary: goal.purpose, entityType: "funding-goal", entityId: goal.id, track: null, amountCents: goal.targetAmountCents });
        if (synchronizedStrategy) {
          recordActivity({ category: "strategy", action: "recalculate", title: "Capital strategy synchronized after funding goal changed", summary: `${synchronizedStrategy.allocations.length} capital tracks recalculated from the current company facts and funding goal.`, entityType: "capital-strategy", entityId: synchronizedStrategy.id, track: null, amountCents: synchronizedStrategy.totalNeedCents });
        }
        sendJson(res, 200, state());
        return;
      }

      if (method === "POST" && url.pathname === "/api/rounds") {
        const round = repo.createRound(parseRound(await readJson(req)));
        recordActivity({ category: "equity", action: "create", title: `Fundraising round created: ${round.roundName}`, summary: `${round.roundType} round opened with status ${round.status}.`, entityType: "fundraising-round", entityId: round.id, track: "equity", amountCents: round.targetAmountCents });
        sendJson(res, 201, { round, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/actions") {
        const action = repo.createAction(parseAction(await readJson(req)));
        recordActivity({ category: "application", action: "create", title: action.title, summary: action.nextStep, entityType: "funding-action", entityId: action.id, track: action.track, amountCents: action.amountCents });
        sendJson(res, 201, { action, state: state() });
        return;
      }

      const actionMatch = url.pathname.match(/^\/api\/actions\/(\d+)$/);
      if (method === "PATCH" && actionMatch) {
        const id = Number(actionMatch[1]);
        const action = repo.updateAction(id, parseAction(await readJson(req)));
        if (!action) {
          sendJson(res, 404, { error: "Funding action not found." });
          return;
        }
        recordActivity({ category: "application", action: "update", title: action.title, summary: `Stage ${action.stage}. Next: ${action.nextStep}`, entityType: "funding-action", entityId: action.id, track: action.track, amountCents: action.amountCents });
        sendJson(res, 200, { action, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/capital-strategy/recalculate") {
        const goal = repo.getFundingGoal();
        if (!goal) {
          sendJson(res, 409, { error: "Set the funding goal before calculating the capital strategy." });
          return;
        }
        const strategy = repo.saveCapitalStrategy(calculateCapitalStrategy(repo.getCompanyProfile(), goal));
        recordActivity({ category: "strategy", action: "recalculate", title: "Capital strategy recalculated", summary: `${strategy.allocations.length} capital tracks evaluated with ${strategy.unfundedResidualCents > 0 ? "an unfunded residual" : "no unfunded residual"}.`, entityType: "capital-strategy", entityId: strategy.id, track: null, amountCents: strategy.totalNeedCents });
        sendJson(res, 200, { strategy, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/funds") {
        const fund = equityRepo.createFund(parseFund(await readJson(req)));
        recordActivity({ category: "equity", action: "create", title: `Fund added: ${fund.name}`, summary: `${fund.fundType} · ${fund.geography}`, entityType: "fund", entityId: fund.id, track: "equity", amountCents: null });
        sendJson(res, 201, { fund, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/investors") {
        const investor = equityRepo.createInvestor(parseInvestor(await readJson(req)));
        recordActivity({ category: "equity", action: "create", title: `Investor added: ${investor.name}`, summary: `Pipeline stage ${investor.stage}. Next: ${investor.nextAction || "define next action"}.`, entityType: "investor", entityId: investor.id, track: "equity", amountCents: investor.chequeMaxCents });
        sendJson(res, 201, { investor, state: state() });
        return;
      }

      const investorMatch = url.pathname.match(/^\/api\/investors\/(\d+)$/);
      if (method === "PATCH" && investorMatch) {
        const investor = equityRepo.updateInvestor(Number(investorMatch[1]), parseInvestor(await readJson(req)));
        if (!investor) {
          sendJson(res, 404, { error: "Investor not found." });
          return;
        }
        recordActivity({ category: "equity", action: "update", title: `Investor updated: ${investor.name}`, summary: `Pipeline stage ${investor.stage}. Next: ${investor.nextAction || "define next action"}.`, entityType: "investor", entityId: investor.id, track: "equity", amountCents: investor.chequeMaxCents });
        sendJson(res, 200, { investor, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/contacts") {
        const contact = equityRepo.createContact(parseContact(await readJson(req)));
        recordActivity({ category: "equity", action: "create", title: `Investor contact added: ${contact.name}`, summary: `${contact.title || "Contact"} added to the investor relationship.`, entityType: "contact", entityId: contact.id, track: "equity", amountCents: null });
        sendJson(res, 201, { contact, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/investment-theses") {
        const thesis = equityRepo.createInvestmentThesis(parseInvestmentThesis(await readJson(req)));
        recordActivity({ category: "equity", action: "create", title: "Investment thesis recorded", summary: `${thesis.sectors} · ${thesis.stages}`, entityType: "investment-thesis", entityId: thesis.id, track: "equity", amountCents: thesis.chequeMaxCents });
        sendJson(res, 201, { thesis, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/meetings") {
        const meeting = equityRepo.createMeeting(parseMeeting(await readJson(req)));
        recordActivity({ category: "equity", action: "schedule", title: "Investor meeting scheduled", summary: `${meeting.meetingType} · ${meeting.objective}`, entityType: "meeting", entityId: meeting.id, track: "equity", amountCents: null });
        sendJson(res, 201, { meeting, state: state() });
        return;
      }

      const meetingMatch = url.pathname.match(/^\/api\/meetings\/(\d+)$/);
      if (method === "PATCH" && meetingMatch) {
        const meeting = equityRepo.updateMeeting(Number(meetingMatch[1]), parseMeeting(await readJson(req)));
        if (!meeting) {
          sendJson(res, 404, { error: "Financing meeting not found." });
          return;
        }
        recordActivity({ category: "equity", action: "update", title: `Investor meeting ${meeting.status}`, summary: meeting.outcome || meeting.nextAction || meeting.objective, entityType: "meeting", entityId: meeting.id, track: "equity", amountCents: null });
        sendJson(res, 200, { meeting, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/follow-ups") {
        const followUp = equityRepo.createFollowUp(parseFollowUp(await readJson(req)));
        recordActivity({ category: "equity", action: "schedule", title: "Investor follow-up scheduled", summary: `${followUp.channel} · ${followUp.action}`, entityType: "follow-up", entityId: followUp.id, track: "equity", amountCents: null });
        sendJson(res, 201, { followUp, state: state() });
        return;
      }

      const followUpMatch = url.pathname.match(/^\/api\/follow-ups\/(\d+)$/);
      if (method === "PATCH" && followUpMatch) {
        const followUp = equityRepo.updateFollowUp(Number(followUpMatch[1]), parseFollowUp(await readJson(req)));
        if (!followUp) {
          sendJson(res, 404, { error: "Investor follow-up not found." });
          return;
        }
        recordActivity({ category: "equity", action: "update", title: `Investor follow-up ${followUp.status}`, summary: followUp.result || followUp.action, entityType: "follow-up", entityId: followUp.id, track: "equity", amountCents: null });
        sendJson(res, 200, { followUp, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/sources/grants-gov/search") {
        const searchInput = parseGrantsGovSearch(await readJson(req));
        const candidates = await searchGrantsGov(searchInput, fetchImpl);
        let imported = 0;
        let updated = 0;
        let skipped = 0;
        const fetchedAt = new Date().toISOString();

        for (const candidate of candidates) {
          const existingSource = sourceRepo.findByExternalId(GRANTS_GOV_PROVIDER_KEY, candidate.externalId);
          if (existingSource) {
            const existingOpportunity = opportunityRepo.listOpportunities().find((item) => item.id === existingSource.opportunityId);
            if (!existingOpportunity) {
              skipped += 1;
              continue;
            }
            const opportunity = opportunityRepo.updateOpportunity(existingOpportunity.id, {
              ...candidate.opportunity,
              decision: existingOpportunity.decision,
            });
            if (!opportunity) {
              skipped += 1;
              continue;
            }
            sourceRepo.saveSource({ ...candidate.source, opportunityId: opportunity.id });
            opportunityRepo.saveMatch(evaluateOpportunity(repo.getCompanyProfile(), repo.getFundingGoal(), opportunity));
            updated += 1;
          } else {
            const opportunity = opportunityRepo.createOpportunity(candidate.opportunity);
            sourceRepo.saveSource({ ...candidate.source, opportunityId: opportunity.id });
            opportunityRepo.saveMatch(evaluateOpportunity(repo.getCompanyProfile(), repo.getFundingGoal(), opportunity));
            imported += 1;
          }
        }

        recordActivity({
          category: "opportunity",
          action: "import",
          title: "Grants.gov opportunities refreshed",
          summary: `${imported} imported, ${updated} refreshed, ${skipped} skipped for keyword “${searchInput.keyword}”.`,
          entityType: "funding-source",
          entityId: null,
          track: "grant",
          amountCents: null,
        });
        sendJson(res, 200, {
          summary: { providerKey: GRANTS_GOV_PROVIDER_KEY, keyword: searchInput.keyword, imported, updated, skipped, fetchedAt },
          state: state(),
        });
        return;
      }

      if (method === "POST" && url.pathname === "/api/opportunities") {
        const opportunity = opportunityRepo.createOpportunity(parseOpportunity(await readJson(req)));
        sourceRepo.saveSource({
          opportunityId: opportunity.id,
          providerKey: "manual",
          sourceKind: "manual",
          externalId: `opportunity-${opportunity.id}`,
          externalNumber: "",
          canonicalUrl: opportunity.sourceUrl,
          apiEndpoint: "",
          termsUrl: "",
          fetchedAt: new Date().toISOString(),
          attribution: "Owner-entered funding source reference.",
        });
        const match = opportunityRepo.saveMatch(evaluateOpportunity(repo.getCompanyProfile(), repo.getFundingGoal(), opportunity));
        const track = opportunity.type === "loan" ? "debt" : opportunity.type === "grant" ? "grant" : "equity";
        recordActivity({ category: "opportunity", action: "create", title: `Opportunity added: ${opportunity.title}`, summary: `${match.fit} fit · ${match.nextStep}`, entityType: "opportunity", entityId: opportunity.id, track, amountCents: opportunity.amountMaxCents });
        sendJson(res, 201, { opportunity, match, state: state() });
        return;
      }

      const opportunityMatch = url.pathname.match(/^\/api\/opportunities\/(\d+)$/);
      if (method === "PATCH" && opportunityMatch) {
        const id = Number(opportunityMatch[1]);
        const existingOpportunity = opportunityRepo.listOpportunities().find((item) => item.id === id);
        if (!existingOpportunity) {
          sendJson(res, 404, { error: "Funding opportunity not found." });
          return;
        }
        const proposed = parseOpportunity(await readJson(req));
        const existingSource = sourceRepo.listSources().find((source) => source.opportunityId === id);
        if (existingSource && existingSource.sourceKind !== "manual") {
          const changedField = changedSourceManagedOpportunityField(existingOpportunity, proposed);
          if (changedField) {
            sendJson(res, 409, {
              error: "Source-managed opportunity facts are read-only in BossAI Funding.",
              code: "SOURCE_FACTS_READ_ONLY",
              field: changedField,
              recovery: "Refresh the official/licensed source to update source facts. Owner decisions and internal investor/fund links may be changed without overwriting source facts.",
            });
            return;
          }
        }
        const opportunity = opportunityRepo.updateOpportunity(id, proposed);
        if (!opportunity) {
          sendJson(res, 404, { error: "Funding opportunity not found." });
          return;
        }
        if (existingSource?.sourceKind === "manual") {
          sourceRepo.saveSource({
            opportunityId: opportunity.id,
            providerKey: existingSource.providerKey,
            sourceKind: existingSource.sourceKind,
            externalId: existingSource.externalId,
            externalNumber: existingSource.externalNumber,
            canonicalUrl: opportunity.sourceUrl,
            apiEndpoint: existingSource.apiEndpoint,
            termsUrl: existingSource.termsUrl,
            fetchedAt: new Date().toISOString(),
            attribution: existingSource.attribution,
          });
        }
        const match = opportunityRepo.saveMatch(evaluateOpportunity(repo.getCompanyProfile(), repo.getFundingGoal(), opportunity));
        const track = opportunity.type === "loan" ? "debt" : opportunity.type === "grant" ? "grant" : "equity";
        recordActivity({ category: "opportunity", action: "update", title: `Opportunity ${opportunity.decision}: ${opportunity.title}`, summary: `${match.fit} fit · ${match.nextStep}`, entityType: "opportunity", entityId: opportunity.id, track, amountCents: opportunity.amountMaxCents });
        sendJson(res, 200, { opportunity, match, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/opportunities/recalculate") {
        refreshOpportunityMatches();
        sendJson(res, 200, { state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/applications") {
        const application = executionRepo.createApplication(parseApplication(await readJson(req)));
        recordActivity({ category: "application", action: "create", title: `Application created: ${application.title}`, summary: `${application.status} · ${application.nextAction}`, entityType: "application", entityId: application.id, track: application.track, amountCents: application.requestedAmountCents });
        sendJson(res, 201, { application, state: state() });
        return;
      }
      const applicationMatch = url.pathname.match(/^\/api\/applications\/(\d+)$/);
      if (method === "PATCH" && applicationMatch) {
        const application = executionRepo.updateApplication(Number(applicationMatch[1]), parseApplication(await readJson(req)));
        if (!application) { sendJson(res, 404, { error: "Funding application not found." }); return; }
        recordActivity({ category: "application", action: "update", title: `Application ${application.status}: ${application.title}`, summary: application.rejectionReason || application.nextAction || application.notes, entityType: "application", entityId: application.id, track: application.track, amountCents: application.approvedAmountCents || application.requestedAmountCents });
        sendJson(res, 200, { application, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/documents") {
        const document = executionRepo.createDocument(parseDocument(await readJson(req)));
        recordActivity({ category: "document", action: "create", title: `Funding document created: ${document.title}`, summary: `${document.documentType} · ${document.status} · ${document.completionPct}% complete`, entityType: "document", entityId: document.id, track: null, amountCents: null });
        sendJson(res, 201, { document, state: state() });
        return;
      }
      const documentMatch = url.pathname.match(/^\/api\/documents\/(\d+)$/);
      if (method === "PATCH" && documentMatch) {
        const document = executionRepo.updateDocument(Number(documentMatch[1]), parseDocument(await readJson(req)));
        if (!document) { sendJson(res, 404, { error: "Funding document not found." }); return; }
        recordActivity({ category: "document", action: "update", title: `Funding document updated: ${document.title}`, summary: `${document.status} · ${document.completionPct}% complete`, entityType: "document", entityId: document.id, track: null, amountCents: null });
        sendJson(res, 200, { document, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/data-rooms") {
        const dataRoom = executionRepo.createDataRoom(parseDataRoom(await readJson(req)));
        recordActivity({ category: "data-room", action: "create", title: `Data room created: ${dataRoom.name}`, summary: "Eight standard diligence folders were created for financing readiness.", entityType: "data-room", entityId: dataRoom.id, track: null, amountCents: null });
        sendJson(res, 201, { dataRoom, state: state() });
        return;
      }
      if (method === "POST" && url.pathname === "/api/data-room-documents") {
        const dataRoomDocument = executionRepo.createDataRoomDocument(parseDataRoomDocument(await readJson(req)));
        recordActivity({ category: "data-room", action: "create", title: `Data room item added: ${dataRoomDocument.title}`, summary: `Status ${dataRoomDocument.status}.`, entityType: "data-room-document", entityId: dataRoomDocument.id, track: null, amountCents: null });
        sendJson(res, 201, { dataRoomDocument, state: state() });
        return;
      }
      const dataRoomDocumentMatch = url.pathname.match(/^\/api\/data-room-documents\/(\d+)$/);
      if (method === "PATCH" && dataRoomDocumentMatch) {
        const dataRoomDocument = executionRepo.updateDataRoomDocument(Number(dataRoomDocumentMatch[1]), parseDataRoomDocument(await readJson(req)));
        if (!dataRoomDocument) { sendJson(res, 404, { error: "Data room document not found." }); return; }
        recordActivity({ category: "data-room", action: "update", title: `Data room item updated: ${dataRoomDocument.title}`, summary: `Status ${dataRoomDocument.status}.`, entityType: "data-room-document", entityId: dataRoomDocument.id, track: null, amountCents: null });
        sendJson(res, 200, { dataRoomDocument, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/due-diligence") {
        const dueDiligenceRequest = executionRepo.createDueDiligenceRequest(parseDueDiligenceRequest(await readJson(req)));
        recordActivity({ category: "due-diligence", action: "create", title: "Due diligence request added", summary: `${dueDiligenceRequest.status} · ${dueDiligenceRequest.request}`, entityType: "due-diligence", entityId: dueDiligenceRequest.id, track: "equity", amountCents: null });
        sendJson(res, 201, { dueDiligenceRequest, state: state() });
        return;
      }
      const dueDiligenceMatch = url.pathname.match(/^\/api\/due-diligence\/(\d+)$/);
      if (method === "PATCH" && dueDiligenceMatch) {
        const dueDiligenceRequest = executionRepo.updateDueDiligenceRequest(Number(dueDiligenceMatch[1]), parseDueDiligenceRequest(await readJson(req)));
        if (!dueDiligenceRequest) { sendJson(res, 404, { error: "Due diligence request not found." }); return; }
        recordActivity({ category: "due-diligence", action: "update", title: `Due diligence ${dueDiligenceRequest.status}`, summary: dueDiligenceRequest.responseNotes || dueDiligenceRequest.request, entityType: "due-diligence", entityId: dueDiligenceRequest.id, track: "equity", amountCents: null });
        sendJson(res, 200, { dueDiligenceRequest, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/term-sheets") {
        const termSheet = executionRepo.createTermSheet(parseTermSheet(await readJson(req)));
        recordActivity({ category: "term-sheet", action: "create", title: "Term sheet received", summary: `${termSheet.status} · ${termSheet.liquidationPreference || "liquidation preference not recorded"}`, entityType: "term-sheet", entityId: termSheet.id, track: "equity", amountCents: termSheet.investmentAmountCents });
        sendJson(res, 201, { termSheet, state: state() });
        return;
      }
      const termSheetMatch = url.pathname.match(/^\/api\/term-sheets\/(\d+)$/);
      if (method === "PATCH" && termSheetMatch) {
        const termSheet = executionRepo.updateTermSheet(Number(termSheetMatch[1]), parseTermSheet(await readJson(req)));
        if (!termSheet) { sendJson(res, 404, { error: "Term sheet not found." }); return; }
        recordActivity({ category: "term-sheet", action: "update", title: `Term sheet ${termSheet.status}`, summary: termSheet.notes || termSheet.closingConditions || "Terms updated for comparison.", entityType: "term-sheet", entityId: termSheet.id, track: "equity", amountCents: termSheet.investmentAmountCents });
        sendJson(res, 200, { termSheet, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/closing-conditions") {
        const closingCondition = executionRepo.createClosingCondition(parseClosingCondition(await readJson(req)));
        recordActivity({ category: "term-sheet", action: "create-condition", title: `Closing condition added: ${closingCondition.title}`, summary: `${closingCondition.status} · ${closingCondition.dueDate ?? "no due date"} · owner ${closingCondition.owner}`, entityType: "closing-condition", entityId: closingCondition.id, track: "equity", amountCents: null });
        sendJson(res, 201, { closingCondition, state: state() });
        return;
      }
      const closingConditionMatch = url.pathname.match(/^\/api\/closing-conditions\/(\d+)$/);
      if (method === "PATCH" && closingConditionMatch) {
        const closingCondition = executionRepo.updateClosingCondition(Number(closingConditionMatch[1]), parseClosingCondition(await readJson(req)));
        if (!closingCondition) { sendJson(res, 404, { error: "Closing condition not found." }); return; }
        recordActivity({ category: "term-sheet", action: "update-condition", title: `Closing condition ${closingCondition.status}: ${closingCondition.title}`, summary: closingCondition.evidenceNote || `${closingCondition.dueDate ?? "no due date"} · owner ${closingCondition.owner}`, entityType: "closing-condition", entityId: closingCondition.id, track: "equity", amountCents: null });
        sendJson(res, 200, { closingCondition, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/receipt-tranches") {
        const receiptTranche = executionRepo.createReceiptTranche(parseReceiptTranche(await readJson(req)));
        const outcome = executionRepo.listOutcomes().find((candidate) => candidate.id === receiptTranche.outcomeId) ?? null;
        recordActivity({ category: "outcome", action: "receipt-tranche-create", title: "Funding receipt tranche recorded", summary: `${receiptTranche.amountCents} cents received on ${receiptTranche.receivedDate}; Funding Outcome received total reconciled to ${outcome?.receivedAmountCents ?? 0} cents.`, entityType: "receipt-tranche", entityId: receiptTranche.id, track: outcome?.track ?? null, amountCents: receiptTranche.amountCents });
        sendJson(res, 201, { receiptTranche, outcome, state: state() });
        return;
      }
      const receiptTrancheMatch = url.pathname.match(/^\/api\/receipt-tranches\/(\d+)$/);
      if (method === "PATCH" && receiptTrancheMatch) {
        const receiptTranche = executionRepo.updateReceiptTranche(Number(receiptTrancheMatch[1]), parseReceiptTranche(await readJson(req)));
        if (!receiptTranche) { sendJson(res, 404, { error: "Receipt tranche not found." }); return; }
        const outcome = executionRepo.listOutcomes().find((candidate) => candidate.id === receiptTranche.outcomeId) ?? null;
        recordActivity({ category: "outcome", action: "receipt-tranche-update", title: `Funding receipt tranche ${receiptTranche.status}`, summary: receiptTranche.status === "voided" ? receiptTranche.voidReason : `${receiptTranche.amountCents} cents · ${receiptTranche.receivedDate}; Funding Outcome received total reconciled to ${outcome?.receivedAmountCents ?? 0} cents.`, entityType: "receipt-tranche", entityId: receiptTranche.id, track: outcome?.track ?? null, amountCents: receiptTranche.status === "received" ? receiptTranche.amountCents : 0 });
        sendJson(res, 200, { receiptTranche, outcome, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/receipt-expectations") {
        const receiptExpectation = executionRepo.createReceiptExpectation(parseReceiptExpectation(await readJson(req)));
        const outcome = executionRepo.listOutcomes().find((candidate) => candidate.id === receiptExpectation.outcomeId) ?? null;
        recordActivity({ category: "outcome", action: "receipt-expectation-create", title: "Committed-capital arrival expectation recorded", summary: `${receiptExpectation.amountCents} cents expected on ${receiptExpectation.expectedDate}; owner ${receiptExpectation.owner}.`, entityType: "receipt-expectation", entityId: receiptExpectation.id, track: outcome?.track ?? null, amountCents: receiptExpectation.amountCents });
        sendJson(res, 201, { receiptExpectation, outcome, state: state() });
        return;
      }
      const receiptExpectationMatch = url.pathname.match(/^\/api\/receipt-expectations\/(\d+)$/);
      if (method === "PATCH" && receiptExpectationMatch) {
        const receiptExpectation = executionRepo.updateReceiptExpectation(Number(receiptExpectationMatch[1]), parseReceiptExpectation(await readJson(req)));
        if (!receiptExpectation) { sendJson(res, 404, { error: "Expected receipt not found." }); return; }
        const outcome = executionRepo.listOutcomes().find((candidate) => candidate.id === receiptExpectation.outcomeId) ?? null;
        recordActivity({ category: "outcome", action: "receipt-expectation-update", title: `Committed-capital arrival expectation ${receiptExpectation.status}`, summary: receiptExpectation.status === "cancelled" ? receiptExpectation.cancellationReason : `${receiptExpectation.amountCents} cents · ${receiptExpectation.expectedDate} · owner ${receiptExpectation.owner}.`, entityType: "receipt-expectation", entityId: receiptExpectation.id, track: outcome?.track ?? null, amountCents: receiptExpectation.status === "expected" ? receiptExpectation.amountCents : 0 });
        sendJson(res, 200, { receiptExpectation, outcome, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/receipt-expectation-allocations") {
        const receiptExpectationAllocation = executionRepo.createReceiptExpectationAllocation(parseReceiptExpectationAllocation(await readJson(req)));
        const expectation = executionRepo.listReceiptExpectations().find((candidate) => candidate.id === receiptExpectationAllocation.expectationId) ?? null;
        const outcome = expectation ? executionRepo.listOutcomes().find((candidate) => candidate.id === expectation.outcomeId) ?? null : null;
        recordActivity({ category: "outcome", action: "receipt-expectation-allocation-create", title: "Actual receipt allocated to arrival expectation", summary: `${receiptExpectationAllocation.amountCents} cents explicitly linked from Receipt Tranche #${receiptExpectationAllocation.trancheId} to Arrival Expectation #${receiptExpectationAllocation.expectationId}.`, entityType: "receipt-expectation", entityId: receiptExpectationAllocation.expectationId, track: outcome?.track ?? null, amountCents: receiptExpectationAllocation.amountCents });
        sendJson(res, 201, { receiptExpectationAllocation, state: state() });
        return;
      }
      const receiptExpectationAllocationMatch = url.pathname.match(/^\/api\/receipt-expectation-allocations\/(\d+)$/);
      if (method === "PATCH" && receiptExpectationAllocationMatch) {
        const receiptExpectationAllocation = executionRepo.updateReceiptExpectationAllocation(Number(receiptExpectationAllocationMatch[1]), parseReceiptExpectationAllocation(await readJson(req)));
        if (!receiptExpectationAllocation) { sendJson(res, 404, { error: "Receipt expectation allocation not found." }); return; }
        const expectation = executionRepo.listReceiptExpectations().find((candidate) => candidate.id === receiptExpectationAllocation.expectationId) ?? null;
        const outcome = expectation ? executionRepo.listOutcomes().find((candidate) => candidate.id === expectation.outcomeId) ?? null : null;
        recordActivity({ category: "outcome", action: "receipt-expectation-allocation-update", title: `Receipt-to-expectation allocation ${receiptExpectationAllocation.status}`, summary: receiptExpectationAllocation.status === "voided" ? receiptExpectationAllocation.voidReason : `${receiptExpectationAllocation.amountCents} cents remains explicitly allocated from Receipt Tranche #${receiptExpectationAllocation.trancheId}.`, entityType: "receipt-expectation", entityId: receiptExpectationAllocation.expectationId, track: outcome?.track ?? null, amountCents: receiptExpectationAllocation.status === "active" ? receiptExpectationAllocation.amountCents : 0 });
        sendJson(res, 200, { receiptExpectationAllocation, state: state() });
        return;
      }

      if (method === "POST" && url.pathname === "/api/outcomes") {
        const outcome = executionRepo.createOutcome(parseOutcome(await readJson(req)));
        recordActivity({ category: "outcome", action: "create", title: `Funding outcome: ${outcome.status}`, summary: outcome.status === "won" ? `Received ${outcome.receivedAmountCents} cents; conditions: ${outcome.conditions || "none recorded"}.` : outcome.lossReason || outcome.feedback || "Outcome recorded.", entityType: "funding-outcome", entityId: outcome.id, track: outcome.track, amountCents: outcome.receivedAmountCents || outcome.committedAmountCents || outcome.approvedAmountCents });
        sendJson(res, 201, { outcome, state: state() });
        return;
      }
      const outcomeMatch = url.pathname.match(/^\/api\/outcomes\/(\d+)$/);
      if (method === "PATCH" && outcomeMatch) {
        const outcome = executionRepo.updateOutcome(Number(outcomeMatch[1]), parseOutcome(await readJson(req)));
        if (!outcome) { sendJson(res, 404, { error: "Funding outcome not found." }); return; }
        recordActivity({ category: "outcome", action: "update", title: `Funding outcome updated: ${outcome.status}`, summary: outcome.status === "won" ? `Received amount now ${outcome.receivedAmountCents} cents.` : outcome.lossReason || outcome.feedback || "Outcome updated.", entityType: "funding-outcome", entityId: outcome.id, track: outcome.track, amountCents: outcome.receivedAmountCents || outcome.committedAmountCents || outcome.approvedAmountCents });
        sendJson(res, 200, { outcome, state: state() });
        return;
      }

      if (method === "GET" && !url.pathname.startsWith("/api/") && serveStatic(publicDir, url.pathname, res)) {
        return;
      }

      sendJson(res, 404, { error: "Not found." });
    } catch (error) {
      const classified = classifyServerError(error);
      sendJson(res, classified.status, { error: classified.message, code: classified.code, recovery: classified.recovery, field: classified.field ?? null });
    }
  });
}
