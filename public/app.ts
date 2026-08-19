import { applyTranslations, formatLocalDate, formatLocalDateTime, getLocale, setLocale, t, translateCanonical, type SupportedLocale } from "./i18n.ts";

type Track = "grant" | "debt" | "equity";

type CapitalPipelineEvidenceKind = "term-sheet" | "application" | "investor" | "opportunity" | "funding-action";

interface TrackSummary {
  track: Track;
  potentialAmountCents: number;
  activeCount: number;
  latestAction: string;
  risk: string;
  nextStep: string;
  evidenceKinds: CapitalPipelineEvidenceKind[];
  pipelineExplanation: string;
}

type TodayFocusEntityType = "funding-action" | "opportunity" | "investor" | "investor-follow-up" | "financing-meeting" | "funding-application" | "due-diligence" | "term-sheet" | "closing-condition" | "funding-outcome" | "receipt-expectation" | null;

interface TodayFocus {
  title: string;
  reason: string;
  nextStep: string;
  urgency: string;
  track: Track | null;
  actionId: number | null;
  entityType: TodayFocusEntityType;
  entityId: number | null;
  workStatus: string | null;
  workOwner: string | null;
  workDueAt: string | null;
  destination: "setup" | "actions" | "equity" | "opportunities" | "execution";
}

interface FundingAction {
  id: number;
  track: Track;
  title: string;
  amountCents: number;
  stage: string;
  priority: string;
  deadline: string | null;
  nextStep: string;
  owner: string;
  result: string;
  updatedAt: string;
}

interface StrategyAllocation {
  track: Track;
  amountCents: number;
  sharePct: number;
  reason: string;
  primaryRisk: string;
  order: number;
}

interface CapitalStrategy {
  totalNeedCents: number;
  allocations: StrategyAllocation[];
  unfundedResidualCents: number;
  assumptions: string[];
  warnings: string[];
  generatedAt: string;
}

interface CapitalStrategyFreshness {
  state: "not-created" | "no-goal" | "current" | "recalculate";
  reason: string;
  generatedAt: string | null;
  currentNeedCents: number;
  autoSyncEligible: boolean;
}

interface CompanyProfile {
  name: string;
  industry: string;
  stage: string;
  geography: string;
  foundedYear: number | null;
  annualRevenueCents: number;
  mrrCents: number;
  arrCents: number;
  growthRatePct: number;
  grossMarginPct: number;
  cashBalanceCents: number;
  monthlyBurnCents: number;
  runwayMonths: number;
  teamSize: number;
  product: string;
  businessModel: string;
  fundingHistory: string;
  existingDebtCents: number;
  capTableSummary: string;
  useOfFunds: string;
  targetFundingCents: number;
  targetFundingDate: string | null;
}

interface FundingGoal {
  targetAmountCents: number;
  needByDate: string | null;
  purpose: string;
  acceptsDilution: boolean;
  maxMonthlyDebtServiceCents: number;
  growthPlan: string;
}

interface CapitalBlocker {
  key: string;
  severity: "critical" | "high" | "normal";
  title: string;
  reason: string;
  nextStep: string;
  track: Track | null;
  entityType: TodayFocusEntityType;
  entityId: number | null;
  destination: "setup" | "actions" | "equity" | "opportunities" | "execution";
}

interface ClosingPlanItem {
  key: string;
  track: Track | null;
  amountCents: number;
  evidenceKind: "term-sheet" | "application" | "investor" | "opportunity" | "funding-action" | "recorded-commitment";
  status: string;
  title: string;
  whyClose: string;
  remainingSteps: string[];
  entityType: TodayFocusEntityType;
  entityId: number | null;
  destination: "actions" | "equity" | "opportunities" | "execution";
}

interface CapitalCoveragePlan {
  status: "no-target" | "cash-covered" | "secured" | "pipeline-covered" | "pipeline-shortfall";
  targetAmountCents: number;
  receivedAmountCents: number;
  receivedCoveragePct: number;
  cashStillToArriveCents: number;
  committedAmountCents: number;
  securedAmountCents: number;
  securedCoveragePct: number;
  inMotionAmountCents: number;
  recordedCoverageCents: number;
  recordedCoveragePct: number;
  uncoveredAfterPipelineCents: number;
  explanation: string;
  disclaimer: string;
  closestToCash: ClosingPlanItem[];
}

interface CapitalTimingMilestone {
  key: string;
  kind: string;
  date: string;
  daysAway: number;
  title: string;
  track: Track | null;
  status: "overdue" | "due-soon" | "upcoming";
  entityType: TodayFocusEntityType;
  entityId: number | null;
  destination: "setup" | "actions" | "equity" | "opportunities" | "execution";
}

interface UndatedCapitalItem {
  key: string;
  title: string;
  reason: string;
  track: Track | null;
  entityType: TodayFocusEntityType;
  entityId: number | null;
  destination: "actions" | "equity" | "opportunities" | "execution";
}

interface CapitalTimingPlan {
  status: "no-target-date" | "cash-covered" | "past-need-date" | "runway-before-need" | "near-term" | "dated";
  needByDate: string | null;
  daysUntilNeed: number | null;
  runwayEstimateDate: string | null;
  runwayEstimateAsOf: string | null;
  daysUntilRunwayEstimate: number | null;
  overdueMilestoneCount: number;
  dueNext14DaysCount: number;
  undatedActiveItemCount: number;
  explanation: string;
  disclaimer: string;
  milestones: CapitalTimingMilestone[];
  undatedItems: UndatedCapitalItem[];
}

interface Dashboard {
  targetAmountCents: number;
  receivedAmountCents: number;
  committedAmountCents: number;
  activePipelineCents: number;
  remainingGapCents: number;
  tracks: TrackSummary[];
  todayFocus: TodayFocus;
  capitalBlockers: CapitalBlocker[];
  coveragePlan: CapitalCoveragePlan;
  timingPlan: CapitalTimingPlan;
}

interface FundraisingRoundSummary { id: number; roundName: string; }
interface Fund { id: number; name: string; fundType: string; geography: string; }
interface Investor {
  id: number;
  name: string;
  fundId: number | null;
  roundId: number | null;
  stage: string;
  priority: string;
  relationship: string;
  warmIntroSource: string;
  chequeMinCents: number;
  chequeMaxCents: number;
  geography: string;
  sectors: string;
  stages: string;
  portfolio: string;
  lastContactDate: string | null;
  nextFollowUpDate: string | null;
  nextAction: string;
  owner: string;
  notes: string;
  rejectionReason: string;
}
interface InvestorFollowUp { id: number; investorId: number; dueDate: string; status: string; channel: string; action: string; result: string; owner: string; }
interface FinancingMeeting { id: number; investorId: number; roundId: number | null; meetingAt: string; meetingType: string; status: string; attendees: string; objective: string; outcome: string; nextAction: string; }
interface EquityPipelineSummary { activeInvestorCount: number; committedInvestorCount: number; closedInvestorCount: number; resolvedInvestorCount: number; totalPotentialCents: number; pendingFollowUpCount: number; nextMeetingAt: string | null; stageCounts: Record<string, number>; }
interface FundingOpportunity {
  id: number; type: "grant" | "loan" | "investor"; title: string; provider: string; sourceUrl: string; description: string;
  geography: string; sectors: string; stages: string; amountMinCents: number; amountMaxCents: number; deadline: string | null;
  decision: "new" | "saved" | "pursuing" | "dismissed"; grantProgramType: string; grantEligibility: string;
  matchFundingRequiredCents: number; loanTermMonths: number | null; annualInterestRatePct: number | null; loanFeesCents: number;
  minimumDscr: number | null; collateralRequired: boolean; personalGuaranteeRequired: boolean; investorId: number | null; fundId: number | null; investorType: string;
}
interface OpportunityDeadlineViability { opportunityId: number; deadlineState: "undated" | "open" | "due-soon" | "deadline-passed"; deadline: string | null; daysToDeadline: number | null; deadlineViable: boolean; reason: string; recovery: string; }
interface MatchRuleResult { key: string; label: string; outcome: string; explanation: string; correctiveAction: string; }
interface OpportunityMatch { opportunityId: number; fit: string; score: number; rules: MatchRuleResult[]; blockers: string[]; missingFacts: string[]; nextStep: string; evaluatedAt: string; }
interface FundingReadinessCheck { key: string; label: string; ready: boolean; reason: string; nextStep: string; }
interface FundingSourceRecord { id: number; opportunityId: number; providerKey: string; sourceKind: string; externalId: string; externalNumber: string; canonicalUrl: string; apiEndpoint: string; termsUrl: string; fetchedAt: string; attribution: string; }
interface FundingReadiness { completionPct: number; status: string; checks: FundingReadinessCheck[]; missingFacts: string[]; nextStep: string; }
interface FundingApplication { id: number; opportunityId: number | null; track: Track; title: string; requestedAmountCents: number; approvedAmountCents: number; status: string; deadline: string | null; submittedDate: string | null; decisionDate: string | null; owner: string; nextAction: string; rejectionReason: string; notes: string; }
interface FundingDocument { id: number; documentType: string; title: string; version: string; status: string; roundId: number | null; investorId: number | null; applicationId: number | null; completionPct: number; notes: string; }
interface DataRoom { id: number; name: string; roundId: number | null; }
interface DataRoomFolder { id: number; dataRoomId: number; category: string; }
interface DataRoomDocument { id: number; folderId: number; documentId: number | null; title: string; status: string; expiresAt: string | null; notes: string; }
interface DataRoomReadiness { dataRoomId: number; totalDocuments: number; readyDocuments: number; missingDocuments: number; expiredDocuments: number; completionPct: number; categoryStatus: Array<{ category: string; total: number; ready: number; missing: number; expired: number }>; nextStep: string; }
interface DueDiligenceRequest { id: number; investorId: number; roundId: number | null; documentId: number | null; owner: string; deadline: string | null; status: string; request: string; responseNotes: string; }
interface TermSheet { id: number; investorId: number; roundId: number | null; investmentAmountCents: number; preMoneyValuationCents: number | null; equityPct: number | null; liquidationPreference: string; boardSeat: string; proRata: string; vesting: string; optionPool: string; exclusivity: string; closingConditions: string; targetCloseDate: string | null; status: string; notes: string; }
interface ClosingCondition { id: number; termSheetId: number; title: string; owner: string; dueDate: string | null; status: "open" | "in-progress" | "satisfied" | "waived"; evidenceNote: string; }
interface TermSheetComparison { items: Array<{ termSheetId: number; investorName: string; investmentAmountCents: number; preMoneyValuationCents: number | null; estimatedOwnershipPct: number | null; economicSummary: string; governanceSummary: string; cautionFlags: string[] }>; lawyerReviewRequired: true; disclaimer: string; }
interface FundingOutcome { id: number; track: Track; applicationId: number | null; investorId: number | null; roundId: number | null; status: string; approvedAmountCents: number; committedAmountCents: number; receivedAmountCents: number; receivedDate: string | null; commitmentEvidence: string; receiptEvidence: string; conditions: string; lossReason: string; feedback: string; retryDate: string | null; }
interface FundingReceiptTranche { id: number; outcomeId: number; amountCents: number; receivedDate: string; receiptEvidence: string; note: string; status: "received" | "voided"; voidReason: string; }
interface FundingReceiptExpectation { id: number; outcomeId: number; amountCents: number; expectedDate: string; basisNote: string; owner: string; note: string; status: "expected" | "cancelled"; cancellationReason: string; }
interface FundingReceiptExpectationAllocation { id: number; expectationId: number; trancheId: number; amountCents: number; note: string; status: "active" | "voided"; voidReason: string; }
interface FundingReceiptAllocationReconciliationIssue { key: string; kind: "cancelled-expectation" | "missing-tranche" | "voided-tranche" | "cross-outcome" | "tranche-overallocated" | "expectation-overallocated"; expectationIds: number[]; trancheId: number | null; allocationIds: number[]; recordedAllocatedAmountCents: number; supportedAmountCents: number; requiredReductionCents: number; reason: string; }
interface FundingActivity { id: number; category: string; action: string; title: string; summary: string; entityType: string; entityId: number | null; track: Track | null; amountCents: number | null; occurredAt: string; }
interface BackupRecord { fileName: string; sizeBytes: number; createdAt: string; kind: "manual" | "pre-restore"; }
interface ContinuityStatus { schemaVersion: number; accessMode: "local-loopback"; exportAvailable: boolean; backupAvailable: boolean; restoreAvailable: boolean; latestBackup: BackupRecord | null; backupCount: number; }
interface IdentityBoundary { identityMode: "local-owner"; authenticationAuthority: "external-required"; tenantIsolation: "not-implemented"; remoteAccess: "blocked"; workspaceId: string; productionAuthenticationReady: false; tenantScopedPersistenceReady: false; }
interface OwnerJourneyStep { key: string; label: string; complete: boolean; reason: string; nextStep: string; destination: "setup" | "opportunities" | "actions" | "equity" | "execution" | "continuity"; }
interface OwnerJourneyProgress { completionPct: number; completedSteps: number; totalSteps: number; currentStepKey: string | null; steps: OwnerJourneyStep[]; }

interface BootstrapState {
  workspaceRevision: number;
  companyProfile: CompanyProfile | null;
  fundingGoal: FundingGoal | null;
  rounds: FundraisingRoundSummary[];
  actions: FundingAction[];
  strategy: CapitalStrategy | null;
  strategyFreshness: CapitalStrategyFreshness;
  funds: Fund[];
  investors: Investor[];
  contacts: unknown[];
  investmentTheses: unknown[];
  meetings: FinancingMeeting[];
  followUps: InvestorFollowUp[];
  equityPipeline: EquityPipelineSummary;
  opportunities: FundingOpportunity[];
  opportunityMatches: OpportunityMatch[];
  opportunityViability: OpportunityDeadlineViability[];
  fundingSources: FundingSourceRecord[];
  fundingReadiness: FundingReadiness;
  applications: FundingApplication[];
  documents: FundingDocument[];
  dataRooms: DataRoom[];
  dataRoomFolders: DataRoomFolder[];
  dataRoomDocuments: DataRoomDocument[];
  dataRoomReadiness: DataRoomReadiness[];
  dueDiligenceRequests: DueDiligenceRequest[];
  termSheets: TermSheet[];
  closingConditions: ClosingCondition[];
  termSheetComparison: TermSheetComparison;
  outcomes: FundingOutcome[];
  receiptTranches: FundingReceiptTranche[];
  receiptExpectations: FundingReceiptExpectation[];
  receiptExpectationAllocations: FundingReceiptExpectationAllocation[];
  receiptAllocationReconciliationIssues: FundingReceiptAllocationReconciliationIssue[];
  activities: FundingActivity[];
  backups: BackupRecord[];
  continuity: ContinuityStatus;
  identityBoundary: IdentityBoundary;
  ownerJourney: OwnerJourneyProgress;
  dashboard: Dashboard;
}

let state: BootstrapState | null = null;
let toastTimer: number | null = null;

function element<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing UI element: ${selector}`);
  return found;
}

function form(name: string): HTMLFormElement {
  return element<HTMLFormElement>(`#${name}`);
}

function field(target: HTMLFormElement, name: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const control = target.elements.namedItem(name);
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)) {
    throw new Error(`Missing form field: ${name}`);
  }
  return control;
}

function value(target: HTMLFormElement, name: string): string {
  return field(target, name).value.trim();
}

function numberValue(target: HTMLFormElement, name: string): number {
  const parsed = Number(field(target, name).value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cents(target: HTMLFormElement, name: string): number {
  return Math.max(0, Math.round(numberValue(target, name) * 100));
}

function dollars(centsValue: number): number {
  return Math.round(centsValue / 100);
}

function centsFromDollarInput(raw: string): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
}

function nullableDate(target: HTMLFormElement, name: string): string | null {
  return value(target, name) || null;
}

function nullableId(target: HTMLFormElement, name: string): number | null {
  const raw = value(target, name);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isoDateTime(target: HTMLFormElement, name: string): string {
  const raw = value(target, name);
  const parsed = new Date(raw);
  if (!raw || Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function optionalMoney(target: HTMLFormElement, name: string): number | null {
  const raw = value(target, name);
  return raw ? cents(target, name) : null;
}

function money(centsValue: number): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(centsValue / 100);
}

function showToast(message: string): void {
  const toast = element<HTMLDivElement>("#toast");
  toast.textContent = translateCanonical(message);
  toast.classList.add("show");
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function setConnection(text: string, error = false): void {
  const badge = element<HTMLSpanElement>("#save-state");
  badge.textContent = translateCanonical(text);
  badge.style.color = error ? "#a13b2f" : "#176b4d";
}

function setGrantsGovStatus(
  tone: "checking" | "success" | "error",
  title: string,
  copy: string,
  retry = false,
): void {
  const status = element<HTMLDivElement>("#grants-gov-status");
  const statusTitle = element<HTMLElement>("#grants-gov-status-title");
  const statusCopy = element<HTMLParagraphElement>("#grants-gov-status-copy");
  const retryButton = element<HTMLButtonElement>("#retry-grants-gov");
  status.hidden = false;
  status.classList.toggle("source-status-error", tone === "error");
  statusTitle.textContent = translateCanonical(title);
  statusCopy.textContent = translateCanonical(copy);
  retryButton.hidden = !retry;
}

interface ControlDraft {
  key: string;
  value: string;
  checked: boolean | null;
}

function controlDraftKey(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string | null {
  if (control.id) return `id:${control.id}`;
  if (control.name) return `name:${control.form?.id ?? "page"}:${control.name}`;
  const dataset = Object.entries(control.dataset).sort(([a], [b]) => a.localeCompare(b));
  if (dataset.length > 0) return `data:${control.tagName}:${dataset.map(([key, value]) => `${key}=${value ?? ""}`).join("|")}`;
  return null;
}

let renderedControlBaseline = new Map<string, ControlDraft>();
let pendingRecoveryTargetId: string | null = null;

function captureControlDrafts(root: ParentNode = document): ControlDraft[] {
  return [...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")]
    .map((control) => {
      const key = controlDraftKey(control);
      if (!key) return null;
      return {
        key,
        value: control.value,
        checked: control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio") ? control.checked : null,
      } satisfies ControlDraft;
    })
    .filter((draft): draft is ControlDraft => draft !== null);
}

function rememberRenderedControlBaseline(root: ParentNode = document): void {
  const drafts = captureControlDrafts(root);
  if (root === document) renderedControlBaseline = new Map();
  for (const draft of drafts) renderedControlBaseline.set(draft.key, draft);
}

function controlIsServerRendered(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  return control.form?.id === "company-form"
    || control.form?.id === "goal-form"
    || Object.keys(control.dataset).length > 0;
}

function captureUnsavedServerRenderedDrafts(): ControlDraft[] {
  return [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")]
    .filter(controlIsServerRendered)
    .map((control) => {
      const key = controlDraftKey(control);
      if (!key) return null;
      const draft: ControlDraft = {
        key,
        value: control.value,
        checked: control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio") ? control.checked : null,
      };
      const baseline = renderedControlBaseline.get(key);
      return baseline && baseline.value === draft.value && baseline.checked === draft.checked ? null : draft;
    })
    .filter((draft): draft is ControlDraft => draft !== null);
}

function moduleHasUnsavedDraft(module: HTMLElement): boolean {
  return captureControlDrafts(module).some((draft) => {
    const baseline = renderedControlBaseline.get(draft.key);
    return !baseline || baseline.value !== draft.value || baseline.checked !== draft.checked;
  });
}

function restoreControlDrafts(drafts: readonly ControlDraft[]): void {
  const draftMap = new Map(drafts.map((draft) => [draft.key, draft]));
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select").forEach((control) => {
    const key = controlDraftKey(control);
    const draft = key ? draftMap.get(key) : undefined;
    if (!draft) return;
    control.value = draft.value;
    if (draft.checked !== null && control instanceof HTMLInputElement) control.checked = draft.checked;
  });
}

async function refreshWorkspacePreservingDrafts(): Promise<void> {
  const drafts = captureControlDrafts();
  const recoveryTargetId = pendingRecoveryTargetId;
  const latest = await requestJson<BootstrapState>("/api/bootstrap");
  render(latest);
  restoreControlDrafts(drafts);
  refreshReceiptAllocationDraftWarnings(latest);
  syncOwnerReturnControl();
  const refresh = element<HTMLButtonElement>("#refresh-workspace");
  refresh.hidden = true;
  setConnection("Latest state loaded — draft kept");
  if (recoveryTargetId) {
    const recoveryTarget = document.getElementById(recoveryTargetId);
    if (recoveryTarget instanceof HTMLFormElement) {
      pendingRecoveryTargetId = recoveryTargetId;
      showFormRecovery(recoveryTarget, "Latest state loaded — your draft is still here", "Continue this same step, review the current facts, then save again.");
      navigateToWorkspaceTarget(recoveryTargetId, false);
    }
  }
  showToast("Latest financing state loaded. Your unsaved draft was kept.");
}

class ApiRequestError extends Error {
  readonly code: string;
  readonly recovery: string;
  readonly status: number;
  readonly field: string | null;

  constructor(message: string, code: string, recovery: string, status: number, field: string | null = null) {
    super(recovery ? `${message} ${recovery}` : message);
    this.name = "ApiRequestError";
    this.code = code;
    this.recovery = recovery;
    this.status = status;
    this.field = field;
  }
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  setConnection("Saving…");
  const method = (options.method ?? "GET").toUpperCase();
  const mutation = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
  const revisionHeaders = mutation && state
    ? { "x-bossai-workspace-revision": String(state.workspaceRevision) }
    : {};
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...revisionHeaders, ...(options.headers ?? {}) },
  });
  const payload = (await response.json()) as T & { error?: string; code?: string; recovery?: string; field?: string | null; currentWorkspaceRevision?: number };
  if (!response.ok) {
    const staleWorkspace = payload.code === "STALE_WORKSPACE_STATE" || payload.code === "WORKSPACE_REVISION_REQUIRED";
    setConnection(staleWorkspace ? "Changed elsewhere — refresh needed" : "Not saved — input kept", true);
    const refresh = document.querySelector<HTMLButtonElement>("#refresh-workspace");
    if (refresh) refresh.hidden = !staleWorkspace;
    throw new ApiRequestError(
      payload.error || `Request failed with ${response.status}`,
      payload.code || "REQUEST_FAILED",
      payload.recovery || "Review the entered values and retry; the current form contents remain in place.",
      response.status,
      payload.field ?? null,
    );
  }
  setConnection("Saved");
  return payload;
}

type FormFieldMap = Record<string, string>;

function clearFormErrors(target: HTMLFormElement): void {
  target.querySelectorAll<HTMLElement>(".field-error").forEach((item) => item.remove());
  target.querySelectorAll<HTMLElement>(".form-recovery").forEach((item) => item.remove());
  target.querySelectorAll<HTMLElement>("[aria-invalid='true']").forEach((item) => item.removeAttribute("aria-invalid"));
  target.querySelectorAll<HTMLElement>(".field-has-error").forEach((item) => item.classList.remove("field-has-error"));
  if (pendingRecoveryTargetId === target.id) pendingRecoveryTargetId = null;
}

function showFormRecovery(target: HTMLFormElement, title: string, copy: string): void {
  target.querySelectorAll<HTMLElement>(".form-recovery").forEach((item) => item.remove());
  const recovery = document.createElement("div");
  recovery.className = "form-recovery";
  recovery.setAttribute("role", "status");
  recovery.innerHTML = `<strong>${escapeHtml(translateCanonical(title))}</strong><span>${escapeHtml(translateCanonical(copy))}</span>`;
  const heading = target.querySelector<HTMLElement>(".form-card-heading");
  if (heading) heading.insertAdjacentElement("afterend", recovery);
  else target.prepend(recovery);
}

function showFormRequestError(target: HTMLFormElement, error: unknown, fieldMap: FormFieldMap = {}): void {
  clearFormErrors(target);
  pendingRecoveryTargetId = target.id || null;
  if (target.id) navigateToWorkspaceTarget(target.id, false);
  const staleWorkspace = error instanceof ApiRequestError && (error.code === "STALE_WORKSPACE_STATE" || error.code === "WORKSPACE_REVISION_REQUIRED");
  const saveLabel = target.querySelector<HTMLButtonElement>('button[type="submit"]')?.textContent?.trim() || "Save again";
  showFormRecovery(
    target,
    staleWorkspace ? "Changed elsewhere — your draft is still here" : "Not saved — your entries are still here",
    staleWorkspace ? "Choose Refresh latest — keep draft, then continue this same step." : `Fix the highlighted issue, then choose ${saveLabel} again.`,
  );
  if (error instanceof ApiRequestError && error.field) {
    const formField = fieldMap[error.field] ?? error.field;
    const control = target.elements.namedItem(formField);
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) {
      control.setAttribute("aria-invalid", "true");
      const label = control.closest("label");
      label?.classList.add("field-has-error");
      const message = document.createElement("span");
      message.className = "field-error";
      message.textContent = error.message;
      label?.append(message);
      control.focus({ preventScroll: true });
      control.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  showToast(error instanceof Error ? error.message : "Could not save this financing change.");
}

const companyFieldMap: FormFieldMap = {
  annualRevenueCents: "annualRevenue",
  mrrCents: "mrr",
  arrCents: "arr",
  cashBalanceCents: "cashBalance",
  monthlyBurnCents: "monthlyBurn",
  existingDebtCents: "existingDebt",
  targetFundingCents: "targetFunding",
};
const goalFieldMap: FormFieldMap = { targetAmountCents: "targetAmount", maxMonthlyDebtServiceCents: "maxMonthlyDebtService" };
const opportunityFieldMap: FormFieldMap = {
  amountMinCents: "amountMin",
  amountMaxCents: "amountMax",
  matchFundingRequiredCents: "matchFundingRequired",
  loanFeesCents: "loanFees",
};
const applicationFieldMap: FormFieldMap = { requestedAmountCents: "requestedAmount", approvedAmountCents: "approvedAmount" };
const investorFieldMap: FormFieldMap = { chequeMinCents: "chequeMin", chequeMaxCents: "chequeMax" };

function text(id: string, content: string): void {
  element<HTMLElement>(`#${id}`).textContent = translateCanonical(content);
}

const progressiveModuleSelector = "[data-progressive-module]";

function syncWorkspaceModuleToggle(module: HTMLElement): void {
  const toggle = module.querySelector<HTMLButtonElement>(":scope > .section-heading .workspace-module-toggle");
  if (!toggle) return;
  const open = module.dataset.moduleOpen === "true";
  const label = module.dataset.moduleLabel || "Workspace";
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = t(open ? "workspace.hide" : "workspace.open", { label });
}

function syncOwnerReturnControl(): void {
  const control = document.querySelector<HTMLButtonElement>("#return-to-overview");
  if (!control) return;
  const openModule = [...document.querySelectorAll<HTMLElement>(progressiveModuleSelector)]
    .find((module) => module.dataset.moduleOpen === "true") ?? null;
  control.hidden = !openModule;
  const label = openModule?.dataset.moduleLabel || "Workspace";
  const hasDraft = Boolean(openModule && moduleHasUnsavedDraft(openModule));
  const draftLabel = hasDraft ? ` · ${t("workspace.unsaved")}` : "";
  control.textContent = t("workspace.returnContext", { label, draft: draftLabel });
  control.dataset.hasDraft = String(hasDraft);
  control.setAttribute("aria-label", openModule
    ? t("workspace.currentAria", { label, draft: hasDraft ? `${t("workspace.unsaved")}.` : "" })
    : t("return.back"));
  document.querySelectorAll<HTMLButtonElement>(".owner-nav [data-scroll]").forEach((button) => {
    const current = Boolean(openModule && button.dataset.scroll === openModule.id);
    button.classList.toggle("current", current);
    if (current) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
}

function setWorkspaceModuleOpen(module: HTMLElement, open: boolean): void {
  if (open) module.dataset.moduleOpen = "true";
  else delete module.dataset.moduleOpen;
  syncWorkspaceModuleToggle(module);
  syncOwnerReturnControl();
}

function closeWorkspaceModules(): void {
  document.querySelectorAll<HTMLElement>(progressiveModuleSelector).forEach((module) => setWorkspaceModuleOpen(module, false));
}

function returnToOwnerOverview(smooth = true, focusAction = true): void {
  const openModule = [...document.querySelectorAll<HTMLElement>(progressiveModuleSelector)]
    .find((module) => module.dataset.moduleOpen === "true") ?? null;
  const draftKept = openModule ? moduleHasUnsavedDraft(openModule) : false;
  const label = openModule?.dataset.moduleLabel || "workspace";
  closeWorkspaceModules();
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  document.querySelector<HTMLElement>(".hero-grid")?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  if (draftKept) showToast(t("workspace.draftKept", { label }));
  if (focusAction) window.requestAnimationFrame(() => element<HTMLButtonElement>("#focus-action").focus({ preventScroll: true }));
}

function openWorkspaceModuleForTarget(target: HTMLElement): void {
  const module = target.matches(progressiveModuleSelector)
    ? target
    : target.closest<HTMLElement>(progressiveModuleSelector);
  if (!module) return;
  document.querySelectorAll<HTMLElement>(progressiveModuleSelector).forEach((candidate) => {
    setWorkspaceModuleOpen(candidate, candidate === module);
  });
}

function initializeProgressiveDisclosure(): void {
  document.querySelectorAll<HTMLElement>(progressiveModuleSelector).forEach((module) => {
    const heading = module.querySelector<HTMLElement>(":scope > .section-heading");
    if (!heading) return;
    let toggle = heading.querySelector<HTMLButtonElement>(".workspace-module-toggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "ghost workspace-module-toggle";
      toggle.setAttribute("aria-controls", module.id);
      toggle.addEventListener("click", () => {
        const shouldOpen = module.dataset.moduleOpen !== "true";
        if (shouldOpen) {
          openWorkspaceModuleForTarget(module);
          window.history.replaceState(null, "", `#${module.id}`);
        } else {
          setWorkspaceModuleOpen(module, false);
        }
      });
      heading.append(toggle);
    }
    syncWorkspaceModuleToggle(module);
  });
}

function focusEntityAnchor(entityType: TodayFocusEntityType, entityId: number | null): string | null {
  if (!entityType || !entityId) return null;
  return `${entityType}-${entityId}`;
}

function isFinancingItemAnchor(targetId: string): boolean {
  return /^(funding-action|opportunity|investor|investor-follow-up|financing-meeting|funding-application|due-diligence|term-sheet|closing-condition|funding-outcome|receipt-expectation|receipt-tranche|receipt-expectation-allocation)-\d+$/.test(targetId);
}

function navigateToWorkspaceTarget(targetId: string, smooth = true): boolean {
  const target = document.getElementById(targetId);
  if (!target) return false;
  openWorkspaceModuleForTarget(target);
  if (window.location.hash !== `#${targetId}`) window.history.replaceState(null, "", `#${targetId}`);
  target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: isFinancingItemAnchor(targetId) ? "center" : "start" });
  if (isFinancingItemAnchor(targetId)) {
    target.classList.remove("focus-highlight");
    void target.getBoundingClientRect();
    target.classList.add("focus-highlight");
    window.setTimeout(() => target.classList.remove("focus-highlight"), 2400);
  }
  return true;
}

function focusDestinationTarget(focus: TodayFocus): string {
  if (focus.destination !== "setup") return focus.destination;
  if (!state?.companyProfile) return "company-form";
  if (!state.fundingGoal || state.fundingGoal.targetAmountCents <= 0) return "goal-form";
  return "setup";
}

function scrollToFocus(focus: TodayFocus): void {
  const anchor = focusEntityAnchor(focus.entityType, focus.entityId);
  if (anchor && navigateToWorkspaceTarget(anchor)) return;
  navigateToWorkspaceTarget(focusDestinationTarget(focus));
}

function resumeWorkspaceLocation(returnToOverviewWhenEmpty = false): void {
  const targetId = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (!targetId) {
    if (returnToOverviewWhenEmpty) returnToOwnerOverview(false, false);
    else closeWorkspaceModules();
    return;
  }
  window.requestAnimationFrame(() => {
    if (navigateToWorkspaceTarget(targetId, false)) return;
    returnToOwnerOverview(false, false);
  });
}

function formatFocusWhen(value: string | null): string {
  if (!value) return translateCanonical("Not recorded");
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatLocalDate(parsed) : formatLocalDateTime(parsed);
}

function formatFocusStatus(value: string | null): string {
  return value ? translateCanonical(value.replaceAll("-", " ")) : translateCanonical("Not recorded");
}

function renderCoveragePlan(plan: CapitalCoveragePlan): void {
  text("coverage-status", plan.status.replaceAll("-", " ").toUpperCase());
  text("coverage-received-pct", `${plan.receivedCoveragePct}%`);
  text("coverage-secured-pct", `${plan.securedCoveragePct}%`);
  text("coverage-recorded-pct", `${plan.recordedCoveragePct}%`);
  text("coverage-uncovered", money(plan.uncoveredAfterPipelineCents));
  text("coverage-cash-still", money(plan.cashStillToArriveCents));
  text("coverage-explanation", plan.explanation);
  text("coverage-disclaimer", plan.disclaimer);

  const list = element<HTMLDivElement>("#closing-plan-list");
  if (plan.closestToCash.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = plan.receivedAmountCents >= plan.targetAmountCents && plan.targetAmountCents > 0
      ? "The recorded funding target is already covered by cash received."
      : "No closing candidate is available from the current recorded financing evidence.";
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(...plan.closestToCash.map((item, index) => {
    const card = document.createElement("article");
    card.className = "closing-plan-item";
    const steps = item.remainingSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
    card.innerHTML = `
      <div class="closing-plan-head">
        <div>
          <span class="closing-rank">${String(index + 1).padStart(2, "0")} · ${escapeHtml(item.evidenceKind.replaceAll("-", " "))}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <span class="entity-sub">${escapeHtml(item.status.replaceAll("-", " "))}</span>
        </div>
        <strong>${money(item.amountCents)}</strong>
      </div>
      <p>${escapeHtml(item.whyClose)}</p>
      <ol>${steps}</ol>
      <button type="button" class="ghost closing-open">${item.entityType && item.entityId ? "Open this financing item" : "Open closing work"}</button>`;
    card.querySelector<HTMLButtonElement>(".closing-open")?.addEventListener("click", () => {
      const anchor = focusEntityAnchor(item.entityType, item.entityId);
      if (anchor && navigateToWorkspaceTarget(anchor)) return;
      navigateToWorkspaceTarget(item.destination);
    });
    return card;
  }));
}

function timingDistanceLabel(daysAway: number): string {
  if (daysAway < 0) return `${Math.abs(daysAway)}d overdue`;
  if (daysAway === 0) return "today";
  if (daysAway === 1) return "tomorrow";
  return `in ${daysAway} days`;
}

function navigateTimingItem(entityType: TodayFocusEntityType, entityId: number | null, destination: "setup" | "actions" | "equity" | "opportunities" | "execution"): void {
  const anchor = focusEntityAnchor(entityType, entityId);
  if (anchor && navigateToWorkspaceTarget(anchor)) return;
  navigateToWorkspaceTarget(destination);
}

function renderTimingPlan(plan: CapitalTimingPlan): void {
  text("timing-status", plan.status.replaceAll("-", " ").toUpperCase());
  text("timing-need-date", plan.needByDate ? formatFocusWhen(plan.needByDate) : "Not recorded");
  text("timing-runway-date", plan.runwayEstimateDate ? formatFocusWhen(plan.runwayEstimateDate) : "Not recorded");
  text("timing-runway-asof", plan.runwayEstimateAsOf ? `Based on profile saved ${formatFocusWhen(plan.runwayEstimateAsOf)}` : "No saved runway date");
  text("timing-overdue", plan.overdueMilestoneCount.toString());
  text("timing-due14", plan.dueNext14DaysCount.toString());
  text("timing-undated-count", plan.undatedActiveItemCount.toString());
  text("timing-explanation", plan.explanation);
  text("timing-disclaimer", plan.disclaimer);

  const milestoneList = element<HTMLDivElement>("#timing-milestone-list");
  if (plan.milestones.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "No dated financing milestone is recorded yet.";
    milestoneList.replaceChildren(empty);
  } else {
    milestoneList.replaceChildren(...plan.milestones.map((milestone) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `timing-item ${milestone.status}`;
      item.innerHTML = `<div class="timing-item-head"><strong>${escapeHtml(milestone.title)}</strong><span class="tag">${escapeHtml(timingDistanceLabel(milestone.daysAway))}</span></div><span>${escapeHtml(formatFocusWhen(milestone.date))} · ${escapeHtml(milestone.kind.replaceAll("-", " "))}</span>`;
      item.addEventListener("click", () => navigateTimingItem(milestone.entityType, milestone.entityId, milestone.destination));
      return item;
    }));
  }

  const undatedList = element<HTMLDivElement>("#timing-undated-list");
  if (plan.undatedItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "Every active high-value financing item currently has a recorded date or dated next move.";
    undatedList.replaceChildren(empty);
  } else {
    undatedList.replaceChildren(...plan.undatedItems.map((undated) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "timing-item undated";
      item.innerHTML = `<div class="timing-item-head"><strong>${escapeHtml(undated.title)}</strong><span class="tag">missing date</span></div><span>${escapeHtml(undated.reason)}</span>`;
      item.addEventListener("click", () => navigateTimingItem(undated.entityType, undated.entityId, undated.destination));
      return item;
    }));
  }
}

function renderCapitalBlockers(blockers: CapitalBlocker[]): void {
  text("capital-blocker-count", `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`);
  const list = element<HTMLDivElement>("#capital-blocker-list");
  if (blockers.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "No active capital blocker is visible from the recorded financing facts.";
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(...blockers.map((blocker) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `capital-blocker ${blocker.severity}`;
    card.innerHTML = `<div class="capital-blocker-head"><strong>${escapeHtml(blocker.title)}</strong><span class="tag">${escapeHtml(blocker.severity)}</span></div><p>${escapeHtml(blocker.reason)}</p><span class="capital-blocker-next">Next: ${escapeHtml(blocker.nextStep)}</span>`;
    card.addEventListener("click", () => {
      const anchor = focusEntityAnchor(blocker.entityType, blocker.entityId);
      if (anchor && navigateToWorkspaceTarget(anchor)) return;
      navigateToWorkspaceTarget(blocker.destination);
    });
    return card;
  }));
}

function renderOwnerFirstView(data: Dashboard): void {
  const blocker = data.capitalBlockers[0] ?? null;
  text("owner-snapshot-blocker-count", translateCanonical(`${data.capitalBlockers.length} blocker${data.capitalBlockers.length === 1 ? "" : "s"}`));
  text("owner-snapshot-blocker-title", translateCanonical(blocker?.title ?? "No recorded blocker"));
  text("owner-snapshot-blocker-reason", translateCanonical(blocker?.reason ?? "No unresolved financing blocker is currently projected from the saved facts."));
  const blockerAction = element<HTMLButtonElement>("#owner-snapshot-blocker-action");
  blockerAction.textContent = translateCanonical(blocker ? "Review blocker evidence" : "Review blocker detail");
  blockerAction.onclick = () => navigateToWorkspaceTarget("blockers");

  const timing = data.timingPlan;
  text("owner-snapshot-timing-status", timing.status.replaceAll("-", " ").toUpperCase());
  text("owner-snapshot-timing-title", timing.needByDate ? `${translateCanonical("Need by")} ${formatFocusWhen(timing.needByDate)}` : translateCanonical("Need-by date not recorded"));
  text("owner-snapshot-overdue", String(timing.overdueMilestoneCount));
  text("owner-snapshot-due14", String(timing.dueNext14DaysCount));
  text("owner-snapshot-undated", String(timing.undatedActiveItemCount));
  element<HTMLButtonElement>("#owner-snapshot-timing-action").onclick = () => navigateToWorkspaceTarget("timing");

  const trackGrid = element<HTMLDivElement>("#owner-snapshot-track-grid");
  trackGrid.replaceChildren(...data.tracks.map((track) => {
    const item = document.createElement("div");
    item.className = "owner-snapshot-track";
    item.innerHTML = `<span>${escapeHtml(track.track)}</span><strong>${money(track.potentialAmountCents)}</strong><small>${track.activeCount} active</small>`;
    return item;
  }));
  element<HTMLButtonElement>("#owner-snapshot-track-action").onclick = () => navigateToWorkspaceTarget("tracks");
}

function renderDashboard(data: Dashboard): void {
  text("remaining-gap", money(data.remainingGapCents));
  text("target-amount", money(data.targetAmountCents));
  text("received-amount", money(data.receivedAmountCents));
  text("committed-amount", money(data.committedAmountCents));
  text("pipeline-amount", money(data.activePipelineCents));

  const funded = data.receivedAmountCents + data.committedAmountCents;
  const progress = data.targetAmountCents > 0 ? Math.min(100, (funded / data.targetAmountCents) * 100) : 0;
  element<HTMLElement>("#capital-progress").style.width = `${progress}%`;

  text("focus-title", translateCanonical(data.todayFocus.title));
  text("focus-reason", translateCanonical(data.todayFocus.reason));
  text("focus-next-step", translateCanonical(data.todayFocus.nextStep));
  text("focus-urgency", translateCanonical(data.todayFocus.urgency.toUpperCase()));
  const focusContext = element<HTMLDivElement>("#focus-context");
  focusContext.hidden = !(data.todayFocus.entityType && data.todayFocus.entityId);
  text("focus-status", formatFocusStatus(data.todayFocus.workStatus));
  text("focus-owner", data.todayFocus.workOwner || translateCanonical("Not recorded"));
  text("focus-when", formatFocusWhen(data.todayFocus.workDueAt));

  const focusButton = element<HTMLButtonElement>("#focus-action");
  focusButton.textContent = translateCanonical(data.todayFocus.entityType && data.todayFocus.entityId ? "Open this item" : "Do this now");
  focusButton.onclick = () => scrollToFocus(data.todayFocus);
  renderOwnerFirstView(data);
  renderCoveragePlan(data.coveragePlan);
  renderTimingPlan(data.timingPlan);
  renderCapitalBlockers(data.capitalBlockers);

  const trackGrid = element<HTMLDivElement>("#track-grid");
  trackGrid.replaceChildren(
    ...data.tracks.map((track) => {
      const card = document.createElement("article");
      card.className = "track-card";
      card.innerHTML = `
        <div class="track-head">
          <div class="track-name"><span class="track-dot"></span>${track.track}</div>
          <span class="tag">${track.activeCount} active</span>
        </div>
        <div class="track-amount">${money(track.potentialAmountCents)}</div>
        <div class="track-count">potential capital currently in motion</div>
        <div class="pipeline-basis">Basis: ${escapeHtml(track.evidenceKinds.length ? track.evidenceKinds.map((kind) => kind.replaceAll("-", " ")).join(" + ") : "none")}</div>
        <p class="pipeline-explanation">${escapeHtml(track.pipelineExplanation)}</p>
        <div class="track-detail">
          <div><span>Latest</span><strong>${escapeHtml(track.latestAction)}</strong></div>
          <div><span>Risk</span><strong>${escapeHtml(track.risk)}</strong></div>
          <div><span>Next</span><strong>${escapeHtml(track.nextStep)}</strong></div>
        </div>`;
      return card;
    }),
  );
}

function renderOwnerJourney(progress: OwnerJourneyProgress): void {
  text("owner-journey-summary", `${progress.completedSteps} of ${progress.totalSteps} steps complete`);
  text("owner-journey-percent", `${progress.completionPct}%`);
  element<HTMLElement>("#owner-journey-meter").style.width = `${progress.completionPct}%`;
  const container = element<HTMLDivElement>("#owner-journey-steps");
  container.replaceChildren(...progress.steps.map((step, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `owner-journey-step${step.complete ? " complete" : progress.currentStepKey === step.key ? " current" : ""}`;
    card.innerHTML = `<span class="journey-step-number">${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(step.label)}</strong><span class="journey-step-state">${step.complete ? "Complete" : progress.currentStepKey === step.key ? "Do this next" : "Upcoming"}</span><p>${escapeHtml(step.reason)}</p><span class="journey-step-next">${escapeHtml(step.nextStep)}</span>`;
    card.addEventListener("click", () => navigateToWorkspaceTarget(step.destination));
    return card;
  }));
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>'"]/g, (character) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
    return map[character] ?? character;
  });
}

function renderStrategy(strategy: CapitalStrategy | null, freshness: CapitalStrategyFreshness): void {
  const empty = element<HTMLDivElement>("#strategy-empty");
  const content = element<HTMLDivElement>("#strategy-content");
  const section = element<HTMLElement>("#strategy");
  text("strategy-freshness", freshness.state.replaceAll("-", " ").toUpperCase());
  text("strategy-freshness-reason", translateCanonical(freshness.reason));
  text("strategy-generated-at", freshness.generatedAt ? formatFocusWhen(freshness.generatedAt) : translateCanonical("Not calculated"));
  text("strategy-current-need", money(freshness.currentNeedCents));
  element<HTMLButtonElement>("#recalculate-strategy").textContent = translateCanonical(freshness.state === "not-created" ? "Calculate strategy" : "Recalculate strategy");
  section.classList.toggle("strategy-stale", freshness.state === "recalculate" || freshness.state === "no-goal");
  section.classList.toggle("strategy-current", freshness.state === "current");
  if (!strategy) {
    empty.textContent = translateCanonical(freshness.reason);
    empty.classList.remove("hidden");
    content.classList.add("hidden");
    return;
  }
  empty.classList.add("hidden");
  content.classList.remove("hidden");

  const bars = element<HTMLDivElement>("#strategy-bars");
  bars.replaceChildren(
    ...strategy.allocations
      .sort((a, b) => a.order - b.order)
      .map((allocation) => {
        const item = document.createElement("article");
        item.className = "strategy-bar";
        item.innerHTML = `
          <div class="track-name"><span class="track-dot"></span>${allocation.track}</div>
          <div class="amount">${money(allocation.amountCents)}</div>
          <div class="share">${allocation.sharePct}% of stated need</div>
          <p>${escapeHtml(allocation.reason)}</p>
          <p class="risk"><strong>Risk:</strong> ${escapeHtml(allocation.primaryRisk)}</p>`;
        return item;
      }),
  );

  if (strategy.unfundedResidualCents > 0) {
    const residual = document.createElement("article");
    residual.className = "strategy-bar";
    residual.innerHTML = `<div class="track-name">Unfunded residual</div><div class="amount">${money(strategy.unfundedResidualCents)}</div><p>Current constraints do not cover the full target.</p>`;
    bars.append(residual);
  }

  renderList("#strategy-assumptions", strategy.assumptions);
  renderList("#strategy-warnings", strategy.warnings.length ? strategy.warnings : ["No additional warning generated by the current rule set."]);
}

function renderList(selector: string, items: string[]): void {
  const list = element<HTMLUListElement>(selector);
  list.replaceChildren(...items.map((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    return li;
  }));
}

function renderActions(actions: FundingAction[]): void {
  text("action-count", `${actions.length} item${actions.length === 1 ? "" : "s"}`);
  const list = element<HTMLDivElement>("#action-list");
  if (actions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "No financing actions yet. Create one concrete next move on Grant, Debt or Equity.";
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(...actions.map((action) => {
    const item = document.createElement("article");
    item.className = "action-item";
    item.id = `funding-action-${action.id}`;
    item.innerHTML = `
      <div class="action-top">
        <div>
          <div class="action-title">${escapeHtml(action.title)}</div>
          <div class="action-tags">
            <span class="tag">${action.track}</span><span class="tag">${escapeHtml(action.stage)}</span><span class="tag">${escapeHtml(action.priority)}</span>
            ${action.deadline ? `<span class="tag">due ${escapeHtml(action.deadline)}</span>` : ""}
          </div>
          <div class="entity-sub">Owner: ${escapeHtml(action.owner || "Not recorded")}</div>
        </div>
        <strong>${money(action.amountCents)}</strong>
      </div>
      <div class="action-next"><span>Next step</span><strong>${escapeHtml(action.nextStep)}</strong></div>`;
    return item;
  }));
}

const equityStages = [
  "target", "research", "ready-to-contact", "contacted", "replied", "meeting", "partner-meeting",
  "due-diligence", "term-sheet", "negotiation", "committed", "closed", "passed", "no-response", "not-a-fit",
] as const;

function populateSelect(selectId: string, items: Array<{ value: number; label: string }>, emptyLabel: string): void {
  const select = element<HTMLSelectElement>(`#${selectId}`);
  const current = select.value;
  select.replaceChildren(new Option(emptyLabel, ""), ...items.map((item) => new Option(item.label, item.value.toString())));
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function investorName(investorId: number, investors: Investor[]): string {
  return investors.find((investor) => investor.id === investorId)?.name ?? `Investor #${investorId}`;
}

function latestOutcomeForApplication(applicationId: number, outcomes: FundingOutcome[]): FundingOutcome | null {
  return [...outcomes].filter((outcome) => outcome.applicationId === applicationId).sort((a, b) => b.id - a.id)[0] ?? null;
}

function latestOutcomeForInvestor(investorId: number, outcomes: FundingOutcome[]): FundingOutcome | null {
  return [...outcomes].filter((outcome) => outcome.investorId === investorId).sort((a, b) => b.id - a.id)[0] ?? null;
}

function outcomeResolutionHtml(outcome: FundingOutcome): string {
  const activeTranches = (state?.receiptTranches ?? []).filter((tranche) => tranche.outcomeId === outcome.id && tranche.status === "received");
  const trancheTotal = activeTranches.reduce((sum, tranche) => sum + tranche.amountCents, 0);
  const missingCommitmentEvidence = outcome.committedAmountCents > 0 && !outcome.commitmentEvidence.trim();
  const missingReceiptEvidence = outcome.receivedAmountCents > 0 && (activeTranches.length > 0
    ? activeTranches.some((tranche) => !tranche.receivedDate || !tranche.receiptEvidence.trim())
    : !outcome.receiptEvidence.trim());
  const reconciliationMissing = activeTranches.length > 0 && trancheTotal !== outcome.receivedAmountCents;
  const evidenceState = missingCommitmentEvidence || missingReceiptEvidence || reconciliationMissing
    ? `Outcome evidence incomplete: ${[missingCommitmentEvidence ? "commitment" : "", missingReceiptEvidence ? "receipt" : "", reconciliationMissing ? "receipt reconciliation" : ""].filter(Boolean).join(" + ")} issue.`
    : `Outcome evidence reconciled across ${activeTranches.length || (outcome.receivedAmountCents > 0 ? 1 : 0)} receipt tranche${activeTranches.length === 1 ? "" : "s"}.`;
  return `<div class="outcome-resolution-note"><strong>Resolved by Funding Outcome · ${escapeHtml(outcome.status)}</strong><span>${money(outcome.receivedAmountCents)} received · ${money(outcome.committedAmountCents)} committed total</span><span>${escapeHtml(evidenceState)}</span><span>Funding Outcome is the current financing state. This record remains as historical execution evidence.</span></div>`;
}

function renderOpportunities(nextState: BootstrapState): void {
  const readiness = nextState.fundingReadiness;
  const readinessCard = element<HTMLDivElement>("#readiness-card");
  readinessCard.innerHTML = `
    <div class="readiness-head"><div><strong>Funding readiness</strong><div class="entity-sub">Can the current company facts support matching and financing preparation?</div></div><strong>${readiness.completionPct}%</strong></div>
    <div class="readiness-meter"><span style="width:${Math.max(0, Math.min(100, readiness.completionPct))}%"></span></div>
    <div class="readiness-checks">${readiness.checks.length ? readiness.checks.map((check) => `<div class="readiness-check"><strong>${check.ready ? "Ready" : "Missing"} · ${escapeHtml(check.label)}</strong><span>${escapeHtml(check.ready ? check.reason : check.nextStep)}</span></div>`).join("") : `<div class="readiness-check"><strong>Not started</strong><span>${escapeHtml(readiness.nextStep)}</span></div>`}</div>`;

  populateSelect("opportunity-investor-select", nextState.investors.map((investor) => ({ value: investor.id, label: investor.name })), "Not linked");
  populateSelect("opportunity-fund-select", nextState.funds.map((fund) => ({ value: fund.id, label: fund.name })), "Not linked");

  text("opportunity-count", `${nextState.opportunities.length} opportunit${nextState.opportunities.length === 1 ? "y" : "ies"}`);
  const list = element<HTMLDivElement>("#opportunity-list");
  if (nextState.opportunities.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "No opportunity saved yet. Add one from an official or otherwise trusted source and review the rule evidence before pursuing it.";
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(...nextState.opportunities.map((opportunity) => {
    const match = nextState.opportunityMatches.find((candidate) => candidate.opportunityId === opportunity.id);
    const viability = nextState.opportunityViability.find((candidate) => candidate.opportunityId === opportunity.id);
    const deadlinePassed = viability?.deadlineState === "deadline-passed";
    const source = nextState.fundingSources.find((candidate) => candidate.opportunityId === opportunity.id);
    const item = document.createElement("article");
    item.className = `opportunity-card${deadlinePassed ? " opportunity-deadline-passed" : ""}`;
    item.id = `opportunity-${opportunity.id}`;
    item.innerHTML = `
      <div class="opportunity-head">
        <div>
          <div class="action-title">${escapeHtml(opportunity.title)}</div>
          <div class="action-tags"><span class="tag">${opportunity.type}</span><span class="tag">${escapeHtml(opportunity.decision)}</span>${opportunity.deadline ? `<span class="tag">due ${escapeHtml(opportunity.deadline)}</span>` : ""}</div>
          <div class="entity-sub">${escapeHtml(opportunity.provider)} · ${escapeHtml(opportunity.geography || "Geography not recorded")}</div>
        </div>
        <div class="opportunity-fit"><strong>${deadlinePassed ? "—" : match ? `${match.score}/100` : "—"}</strong><span>${escapeHtml(deadlinePassed ? "deadline passed" : match?.fit ?? "not evaluated")}</span></div>
      </div>
      <div class="action-next"><span>Potential</span><strong>${money(opportunity.amountMinCents)} – ${money(opportunity.amountMaxCents)}${deadlinePassed ? " · excluded from In motion" : ""}</strong></div>
      ${viability ? `<div class="opportunity-viability ${escapeHtml(viability.deadlineState)}"><strong>${escapeHtml(viability.deadlineState.replaceAll("-", " ").toUpperCase())}</strong><span>${escapeHtml(viability.reason)}</span>${deadlinePassed ? `<span><strong>Recovery:</strong> ${escapeHtml(viability.recovery)}</span>` : ""}</div>` : ""}
      <div class="match-rules">${match ? match.rules.map((rule) => `<div class="match-rule"><div class="outcome">${escapeHtml(rule.outcome)}</div><div><strong>${escapeHtml(rule.label)}</strong><p>${escapeHtml(rule.explanation)}</p>${rule.correctiveAction ? `<p><strong>Next:</strong> ${escapeHtml(rule.correctiveAction)}</p>` : ""}</div></div>`).join("") : `<div class="match-rule"><div class="outcome">pending</div><div>Recalculate this opportunity against the current funding profile.</div></div>`}</div>
      <div class="action-next"><span>Recommended next</span><strong>${escapeHtml(deadlinePassed ? viability?.recovery ?? "Confirm a current cycle or dismiss this opportunity." : match?.nextStep ?? "Recalculate the match.")}</strong></div>
      ${source ? `<div class="opportunity-source"><span>${escapeHtml(source.sourceKind)}</span><span>${escapeHtml(source.externalNumber || source.externalId)}</span><span>fetched ${escapeHtml(new Date(source.fetchedAt).toLocaleString())}</span><a href="${escapeHtml(source.canonicalUrl)}" target="_blank" rel="noreferrer">${source.sourceKind === "official-public" ? "Official source" : "Source reference"}</a></div>` : ""}
      ${deadlinePassed && source?.sourceKind === "manual" ? `<div class="opportunity-deadline-recovery"><label>Correct manual-source deadline<input type="date" data-opportunity-deadline="${opportunity.id}" value="${escapeHtml(opportunity.deadline ?? "")}" /></label><button class="ghost" type="button" data-save-opportunity-deadline="${opportunity.id}">Save corrected deadline</button></div>` : deadlinePassed && source?.sourceKind === "official-public" ? `<div class="opportunity-deadline-recovery"><strong>Official-source recovery</strong><span>Open the official source or run the Grants.gov refresh above. Do not overwrite an official deadline with a manual guess.</span></div>` : ""}
      <div class="opportunity-actions">
        <button class="ghost" type="button" data-opportunity-decision="saved" data-opportunity-id="${opportunity.id}">Save</button>
        <button class="primary" type="button" data-opportunity-decision="pursuing" data-opportunity-id="${opportunity.id}"${deadlinePassed ? " disabled title=\"Record a current deadline or refresh the official source before pursuing this as current capital.\"" : ""}>Pursue</button>
        <button class="ghost" type="button" data-opportunity-decision="dismissed" data-opportunity-id="${opportunity.id}">Dismiss</button>
      </div>`;
    return item;
  }));

  list.querySelectorAll<HTMLButtonElement>("[data-save-opportunity-deadline]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.saveOpportunityDeadline);
      const opportunity = nextState.opportunities.find((candidate) => candidate.id === id);
      const source = nextState.fundingSources.find((candidate) => candidate.opportunityId === id);
      const deadline = list.querySelector<HTMLInputElement>(`[data-opportunity-deadline="${id}"]`)?.value || null;
      if (!opportunity || source?.sourceKind !== "manual") return;
      try {
        const response = await requestJson<{ state: BootstrapState }>(`/api/opportunities/${id}`, { method: "PATCH", body: JSON.stringify({ ...opportunity, deadline }) });
        render(response.state);
        showToast("Manual opportunity deadline corrected and current viability recalculated.");
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not correct the opportunity deadline."); }
    });
  });

  list.querySelectorAll<HTMLButtonElement>("[data-opportunity-decision]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.opportunityId);
      const opportunity = nextState.opportunities.find((candidate) => candidate.id === id);
      const decision = button.dataset.opportunityDecision;
      if (!opportunity || !decision) return;
      try {
        const response = await requestJson<{ state: BootstrapState }>(`/api/opportunities/${id}`, { method: "PATCH", body: JSON.stringify({ ...opportunity, decision }) });
        render(response.state);
        showToast(`Opportunity marked ${decision}.`);
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not update opportunity."); }
    });
  });
}

function renderEquity(nextState: BootstrapState): void {
  const summary = nextState.equityPipeline;
  const summaryEl = element<HTMLDivElement>("#equity-summary");
  const summaryItems: Array<[string, string]> = [
    ["Active investors", summary.activeInvestorCount.toString()],
    ["Potential", money(summary.totalPotentialCents)],
    ["Pending follow-ups", summary.pendingFollowUpCount.toString()],
    ["Committed", summary.committedInvestorCount.toString()],
    ["Closed", summary.closedInvestorCount.toString()],
    ["Resolved outcomes", summary.resolvedInvestorCount.toString()],
  ];
  summaryEl.replaceChildren(...summaryItems.map(([label, metric]) => {
    const item = document.createElement("article");
    item.className = "equity-stat";
    item.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(metric)}</strong>`;
    return item;
  }));

  const funds = nextState.funds.map((fund) => ({ value: fund.id, label: fund.name }));
  const investors = nextState.investors.map((investor) => ({ value: investor.id, label: investor.name }));
  const rounds = nextState.rounds.map((round) => ({ value: round.id, label: round.roundName }));
  populateSelect("investor-fund-select", funds, "No fund linked");
  populateSelect("contact-fund-select", funds, "No fund linked");
  populateSelect("thesis-fund-select", funds, "No fund linked");
  populateSelect("investor-round-select", rounds, "No round linked");
  populateSelect("meeting-round-select", rounds, "No round linked");
  populateSelect("followup-investor-select", investors, "Select investor");
  populateSelect("meeting-investor-select", investors, "Select investor");
  populateSelect("contact-investor-select", investors, "No investor linked");
  populateSelect("thesis-investor-select", investors, "No investor linked");

  text("investor-count", `${nextState.investors.length} investor${nextState.investors.length === 1 ? "" : "s"}`);
  const investorList = element<HTMLDivElement>("#investor-list");
  if (nextState.investors.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "No investor targets yet. Add one with a clear fit thesis and next action.";
    investorList.replaceChildren(empty);
  } else {
    investorList.replaceChildren(...nextState.investors.map((investor) => {
      const fund = nextState.funds.find((candidate) => candidate.id === investor.fundId);
      const resolvedOutcome = latestOutcomeForInvestor(investor.id, nextState.outcomes);
      const item = document.createElement("article");
      item.className = `action-item${resolvedOutcome ? " resolved-by-outcome" : ""}`;
      item.id = `investor-${investor.id}`;
      item.innerHTML = `
        <div class="action-top">
          <div>
            <div class="action-title">${escapeHtml(investor.name)}</div>
            <div class="action-tags"><span class="tag pipeline-stage">${escapeHtml(investor.stage)}</span><span class="tag">${escapeHtml(investor.priority)}</span><span class="tag">${escapeHtml(investor.relationship)}</span></div>
            <div class="entity-sub">${fund ? escapeHtml(fund.name) : "Independent / fund not linked"} · ${escapeHtml(investor.sectors || "Sector not recorded")} · Owner: ${escapeHtml(investor.owner || "Not recorded")}</div>
          </div>
          <strong>${money(investor.chequeMaxCents)}</strong>
        </div>
        <div class="action-next"><span>${resolvedOutcome ? "Historical next" : "Next"}</span><strong>${escapeHtml(investor.nextAction || "Not recorded")}</strong></div>
        ${resolvedOutcome ? outcomeResolutionHtml(resolvedOutcome) : `<div class="pipeline-controls">
          <label>Stage<select data-investor-stage="${investor.id}">${equityStages.map((stage) => `<option value="${stage}"${stage === investor.stage ? " selected" : ""}>${stage.replaceAll("-", " ")}</option>`).join("")}</select></label>
          <label>Next action<input data-investor-next="${investor.id}" value="${escapeHtml(investor.nextAction)}" /></label>
          <label>Follow-up<input type="date" data-investor-date="${investor.id}" value="${investor.nextFollowUpDate ?? ""}" /></label>
          <label>Pass / rejection reason<input data-investor-rejection="${investor.id}" value="${escapeHtml(investor.rejectionReason)}" placeholder="Why did this stop?" /></label>
          <button class="ghost" type="button" data-save-investor="${investor.id}">Save</button>
        </div>`}`;
      return item;
    }));

    investorList.querySelectorAll<HTMLButtonElement>("[data-save-investor]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = Number(button.dataset.saveInvestor);
        const investor = nextState.investors.find((candidate) => candidate.id === id);
        if (!investor) return;
        const stage = investorList.querySelector<HTMLSelectElement>(`[data-investor-stage="${id}"]`)?.value ?? investor.stage;
        const nextAction = investorList.querySelector<HTMLInputElement>(`[data-investor-next="${id}"]`)?.value.trim() ?? investor.nextAction;
        const nextFollowUpDate = investorList.querySelector<HTMLInputElement>(`[data-investor-date="${id}"]`)?.value || null;
        const rejectionReason = investorList.querySelector<HTMLInputElement>(`[data-investor-rejection="${id}"]`)?.value.trim() ?? investor.rejectionReason;
        try {
          const response = await requestJson<{ state: BootstrapState }>(`/api/investors/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ ...investor, stage, nextAction, nextFollowUpDate, rejectionReason }),
          });
          render(response.state);
          showToast("Investor stage and next action updated.");
        } catch (error) { showToast(error instanceof Error ? error.message : "Could not update investor."); }
      });
    });
  }

  const resolvedInvestorIds = new Set(nextState.outcomes.flatMap((outcome) => outcome.investorId ? [outcome.investorId] : []));
  const pendingFollowUps = nextState.followUps.filter((followUp) => followUp.status === "pending" && !resolvedInvestorIds.has(followUp.investorId));
  text("followup-count", `${pendingFollowUps.length} pending`);
  const followUpList = element<HTMLDivElement>("#followup-list");
  followUpList.replaceChildren(...(pendingFollowUps.length ? pendingFollowUps.map((followUp) => {
    const item = document.createElement("article");
    const overdue = new Date(`${followUp.dueDate}T23:59:59`).getTime() < Date.now();
    item.className = `action-item${overdue ? " overdue" : ""}`;
    item.id = `investor-follow-up-${followUp.id}`;
    item.innerHTML = `<div class="action-title">${escapeHtml(investorName(followUp.investorId, nextState.investors))}</div><div class="action-tags"><span class="tag">${escapeHtml(followUp.channel)}</span><span class="tag">due ${escapeHtml(followUp.dueDate)}</span></div><div class="entity-sub">Owner: ${escapeHtml(followUp.owner || "Not recorded")}</div><div class="action-next"><span>Action</span><strong>${escapeHtml(followUp.action)}</strong></div><label>Result<input data-followup-result="${followUp.id}" value="${escapeHtml(followUp.result)}" placeholder="Reply received, intro sent, no response…" /></label><button class="ghost" type="button" data-complete-followup="${followUp.id}">Complete with result</button>`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "No pending investor follow-up." })]));

  followUpList.querySelectorAll<HTMLButtonElement>("[data-complete-followup]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.completeFollowup);
      const followUp = nextState.followUps.find((candidate) => candidate.id === id);
      if (!followUp) return;
      const result = followUpList.querySelector<HTMLInputElement>(`[data-followup-result="${id}"]`)?.value.trim() ?? followUp.result;
      try {
        const response = await requestJson<{ state: BootstrapState }>(`/api/follow-ups/${id}`, { method: "PATCH", body: JSON.stringify({ ...followUp, status: "completed", result }) });
        render(response.state);
        showToast("Follow-up completed. Today's Focus recalculated.");
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not complete follow-up."); }
    });
  });

  const scheduledMeetings = nextState.meetings.filter((meeting) => meeting.status === "scheduled" && !resolvedInvestorIds.has(meeting.investorId));
  text("meeting-count", `${scheduledMeetings.length} scheduled`);
  const meetingList = element<HTMLDivElement>("#meeting-list");
  meetingList.replaceChildren(...(nextState.meetings.length ? nextState.meetings.map((meeting) => {
    const resolvedOutcome = latestOutcomeForInvestor(meeting.investorId, nextState.outcomes);
    const item = document.createElement("article");
    item.className = `action-item${meeting.status === "completed" ? " done" : ""}${resolvedOutcome ? " resolved-by-outcome" : ""}`;
    item.id = `financing-meeting-${meeting.id}`;
    item.innerHTML = `<div class="action-title">${escapeHtml(investorName(meeting.investorId, nextState.investors))}</div><div class="action-tags"><span class="tag">${escapeHtml(meeting.meetingType)}</span><span class="tag">${escapeHtml(meeting.status)}</span></div><div class="entity-sub">${escapeHtml(new Date(meeting.meetingAt).toLocaleString())}</div><div class="action-next"><span>Objective</span><strong>${escapeHtml(meeting.objective)}</strong></div>${resolvedOutcome ? outcomeResolutionHtml(resolvedOutcome) : meeting.status === "scheduled" ? `<div class="pipeline-controls"><label>Outcome<input data-meeting-outcome="${meeting.id}" value="${escapeHtml(meeting.outcome)}" placeholder="What happened?" /></label><label>Next action<input data-meeting-next="${meeting.id}" value="${escapeHtml(meeting.nextAction)}" placeholder="What happens next?" /></label><button class="ghost" type="button" data-complete-meeting="${meeting.id}">Complete meeting</button></div>` : `<div class="action-next"><span>Outcome</span><strong>${escapeHtml(meeting.outcome || "No outcome recorded")}</strong></div>`}`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "No investor meeting recorded." })]));

  meetingList.querySelectorAll<HTMLButtonElement>("[data-complete-meeting]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.completeMeeting);
      const meeting = nextState.meetings.find((candidate) => candidate.id === id);
      if (!meeting) return;
      const outcome = meetingList.querySelector<HTMLInputElement>(`[data-meeting-outcome="${id}"]`)?.value.trim() ?? meeting.outcome;
      const nextAction = meetingList.querySelector<HTMLInputElement>(`[data-meeting-next="${id}"]`)?.value.trim() ?? meeting.nextAction;
      try {
        const response = await requestJson<{ state: BootstrapState }>(`/api/meetings/${id}`, { method: "PATCH", body: JSON.stringify({ ...meeting, status: "completed", outcome, nextAction }) });
        render(response.state);
        showToast("Meeting outcome saved. Today's Focus recalculated.");
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not complete meeting."); }
    });
  });
}

function renderExecution(nextState: BootstrapState): void {
  const resolvedApplicationIds = new Set(nextState.outcomes.flatMap((outcome) => outcome.applicationId ? [outcome.applicationId] : []));
  const resolvedInvestorIds = new Set(nextState.outcomes.flatMap((outcome) => outcome.investorId ? [outcome.investorId] : []));
  const opportunities = nextState.opportunities.map((item) => ({ value: item.id, label: item.title }));
  const investors = nextState.investors.map((item) => ({ value: item.id, label: item.name }));
  const rounds = nextState.rounds.map((item) => ({ value: item.id, label: item.roundName }));
  const applications = nextState.applications.map((item) => ({ value: item.id, label: item.title }));
  const documents = nextState.documents.map((item) => ({ value: item.id, label: `${item.title} · ${item.version}` }));
  populateSelect("application-opportunity-select", opportunities, "No opportunity linked");
  populateSelect("document-round-select", rounds, "No round linked");
  populateSelect("document-investor-select", investors, "No investor linked");
  populateSelect("document-application-select", applications, "No application linked");
  populateSelect("data-room-round-select", rounds, "No round linked");
  populateSelect("data-room-document-select", documents, "No workspace document linked");
  populateSelect("diligence-investor-select", investors, "Select investor");
  populateSelect("diligence-round-select", rounds, "No round linked");
  populateSelect("diligence-document-select", documents, "No document linked");
  populateSelect("term-investor-select", investors, "Select investor");
  populateSelect("term-round-select", rounds, "No round linked");
  const closingTermSheets = nextState.termSheets
    .filter((termSheet) => !["rejected", "expired"].includes(termSheet.status) && !resolvedInvestorIds.has(termSheet.investorId))
    .map((termSheet) => ({ value: termSheet.id, label: `${investorName(termSheet.investorId, nextState.investors)} · ${termSheet.status}` }));
  populateSelect("closing-condition-term-select", closingTermSheets, "Select term sheet");
  populateSelect("outcome-application-select", applications, "No application linked");
  populateSelect("outcome-investor-select", investors, "No investor linked");
  populateSelect("outcome-round-select", rounds, "No round linked");
  populateSelect(
    "receipt-tranche-outcome-select",
    nextState.outcomes
      .filter((outcome) => outcome.status !== "lost" && outcome.status !== "withdrawn")
      .map((outcome) => ({ value: outcome.id, label: `${outcome.track.toUpperCase()} Outcome #${outcome.id} · ${money(outcome.committedAmountCents)} committed · ${money(outcome.receivedAmountCents)} received` })),
    "Select outcome",
  );
  populateSelect(
    "receipt-expectation-outcome-select",
    nextState.outcomes
      .filter((outcome) => outcome.status !== "lost" && outcome.status !== "withdrawn" && outcome.committedAmountCents > outcome.receivedAmountCents)
      .map((outcome) => ({ value: outcome.id, label: `${outcome.track.toUpperCase()} Outcome #${outcome.id} · ${money(outcome.committedAmountCents - outcome.receivedAmountCents)} still to arrive` })),
    "Select outcome",
  );
  populateSelect(
    "receipt-allocation-expectation-select",
    nextState.receiptExpectations
      .filter((expectation) => expectation.status === "expected")
      .map((expectation) => ({ expectation, fulfillment: receiptExpectationFulfillment(expectation, nextState) }))
      .filter(({ fulfillment }) => fulfillment.remainingAmountCents > 0 && fulfillment.status !== "invalid-receipt" && fulfillment.status !== "overallocated")
      .map(({ expectation, fulfillment }) => ({ value: expectation.id, label: `Expectation #${expectation.id} · ${expectation.expectedDate} · ${money(fulfillment.remainingAmountCents)} remaining` })),
    "Select expectation",
  );
  populateSelect(
    "receipt-allocation-tranche-select",
    nextState.receiptTranches
      .filter((tranche) => tranche.status === "received")
      .map((tranche) => {
        const allocatedCents = nextState.receiptExpectationAllocations
          .filter((allocation) => allocation.trancheId === tranche.id && allocation.status === "active")
          .reduce((sum, allocation) => sum + allocation.amountCents, 0);
        return { tranche, remainingCents: Math.max(0, tranche.amountCents - allocatedCents) };
      })
      .filter(({ remainingCents }) => remainingCents > 0)
      .map(({ tranche, remainingCents }) => ({ value: tranche.id, label: `Receipt #${tranche.id} · ${tranche.receivedDate} · ${money(remainingCents)} unallocated` })),
    "Select actual receipt",
  );

  const folderItems = nextState.dataRoomFolders.map((folder) => {
    const room = nextState.dataRooms.find((candidate) => candidate.id === folder.dataRoomId);
    return { value: folder.id, label: `${room?.name ?? "Data Room"} · ${folder.category}` };
  });
  populateSelect("data-room-folder-select", folderItems, "Select folder");

  const activeApplications = nextState.applications.filter((item) => !["funded", "rejected", "withdrawn"].includes(item.status) && !resolvedApplicationIds.has(item.id));
  text("application-count", `${activeApplications.length} active`);
  const applicationList = element<HTMLDivElement>("#application-list");
  applicationList.replaceChildren(...(nextState.applications.length ? nextState.applications.map((application) => {
    const resolvedOutcome = latestOutcomeForApplication(application.id, nextState.outcomes);
    const item = document.createElement("article");
    item.className = `action-item${resolvedOutcome ? " resolved-by-outcome" : ""}`;
    item.id = `funding-application-${application.id}`;
    item.innerHTML = `<div class="action-top"><div><div class="action-title">${escapeHtml(application.title)}</div><div class="action-tags"><span class="tag">${application.track}</span><span class="tag">${escapeHtml(application.status)}</span>${application.deadline ? `<span class="tag">due ${escapeHtml(application.deadline)}</span>` : ""}</div><div class="entity-sub">Owner: ${escapeHtml(application.owner || "Not recorded")}</div></div><strong>${money(application.approvedAmountCents > 0 ? application.approvedAmountCents : application.requestedAmountCents)}</strong></div><div class="action-next"><span>${resolvedOutcome ? "Historical next" : "Next"}</span><strong>${escapeHtml(application.nextAction || "Not recorded")}</strong></div>${resolvedOutcome ? outcomeResolutionHtml(resolvedOutcome) : `<div class="pipeline-controls"><label>Status<select data-application-status="${application.id}">${["draft","preparing","submitted","under-review","approved","rejected","withdrawn","funded"].map((status) => `<option value="${status}"${status === application.status ? " selected" : ""}>${status.replaceAll("-", " ")}</option>`).join("")}</select></label><label>Next action<input data-application-next="${application.id}" value="${escapeHtml(application.nextAction)}" /></label><label>Decision date<input type="date" data-application-decision-date="${application.id}" value="${application.decisionDate ?? ""}" /></label><button class="ghost" type="button" data-save-application="${application.id}">Save</button></div>`}`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "No financing application yet." })]));
  applicationList.querySelectorAll<HTMLButtonElement>("[data-save-application]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.saveApplication);
      const application = nextState.applications.find((candidate) => candidate.id === id);
      if (!application) return;
      const status = applicationList.querySelector<HTMLSelectElement>(`[data-application-status="${id}"]`)?.value ?? application.status;
      const nextAction = applicationList.querySelector<HTMLInputElement>(`[data-application-next="${id}"]`)?.value.trim() ?? application.nextAction;
      const decisionDate = applicationList.querySelector<HTMLInputElement>(`[data-application-decision-date="${id}"]`)?.value || null;
      try {
        const response = await requestJson<{ state: BootstrapState }>(`/api/applications/${id}`, { method: "PATCH", body: JSON.stringify({ ...application, status, nextAction, decisionDate }) });
        render(response.state);
        showToast("Application updated. Today's Focus recalculated.");
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not update application."); }
    });
  });

  text("document-count", `${nextState.documents.length} documents`);
  const documentList = element<HTMLDivElement>("#document-list");
  documentList.replaceChildren(...(nextState.documents.length ? nextState.documents.map((documentItem) => {
    const item = document.createElement("article");
    item.className = "action-item";
    item.innerHTML = `<div class="action-top"><div><div class="action-title">${escapeHtml(documentItem.title)}</div><div class="action-tags"><span class="tag">${escapeHtml(documentItem.documentType)}</span><span class="tag">${escapeHtml(documentItem.version)}</span><span class="tag">${escapeHtml(documentItem.status)}</span></div></div><strong>${documentItem.completionPct}%</strong></div><div class="readiness-meter"><span style="width:${documentItem.completionPct}%"></span></div>`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "No financing document yet." })]));

  const dataRoomList = element<HTMLDivElement>("#data-room-list");
  dataRoomList.replaceChildren(...(nextState.dataRooms.length ? nextState.dataRooms.map((room) => {
    const readiness = nextState.dataRoomReadiness.find((item) => item.dataRoomId === room.id);
    const card = document.createElement("article");
    card.className = "data-room-card";
    card.innerHTML = `<div class="opportunity-head"><div><div class="action-title">${escapeHtml(room.name)}</div><div class="entity-sub">8 standard diligence folders</div></div><strong>${readiness?.completionPct ?? 0}% ready</strong></div><div class="readiness-meter"><span style="width:${readiness?.completionPct ?? 0}%"></span></div><div class="data-room-categories">${(readiness?.categoryStatus ?? []).map((category) => `<div><strong>${escapeHtml(category.category)}</strong><span>${category.ready}/${category.total} ready${category.expired ? ` · ${category.expired} expired` : ""}</span></div>`).join("")}</div><div class="action-next"><span>Next</span><strong>${escapeHtml(readiness?.nextStep ?? "Add the first diligence item.")}</strong></div>`;
    return card;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "No data room yet." })]));

  const openDiligence = nextState.dueDiligenceRequests.filter((item) => item.status !== "accepted" && !resolvedInvestorIds.has(item.investorId));
  text("diligence-count", `${openDiligence.length} open`);
  const diligenceList = element<HTMLDivElement>("#diligence-list");
  diligenceList.replaceChildren(...(nextState.dueDiligenceRequests.length ? nextState.dueDiligenceRequests.map((request) => {
    const resolvedOutcome = latestOutcomeForInvestor(request.investorId, nextState.outcomes);
    const item = document.createElement("article");
    item.className = `action-item${resolvedOutcome ? " resolved-by-outcome" : ""}`;
    item.id = `due-diligence-${request.id}`;
    item.innerHTML = `<div class="action-title">${escapeHtml(investorName(request.investorId, nextState.investors))}</div><div class="action-tags"><span class="tag">${escapeHtml(request.status)}</span>${request.deadline ? `<span class="tag">due ${escapeHtml(request.deadline)}</span>` : ""}</div><div class="entity-sub">Owner: ${escapeHtml(request.owner || "Not recorded")}</div><div class="action-next"><span>Request</span><strong>${escapeHtml(request.request)}</strong></div>${resolvedOutcome ? outcomeResolutionHtml(resolvedOutcome) : `<div class="pipeline-controls"><label>Status<select data-dd-status="${request.id}">${["requested","preparing","ready","shared","accepted","needs-revision"].map((status) => `<option value="${status}"${status === request.status ? " selected" : ""}>${status.replaceAll("-", " ")}</option>`).join("")}</select></label><label>Response notes<input data-dd-notes="${request.id}" value="${escapeHtml(request.responseNotes)}" /></label><button class="ghost" type="button" data-save-dd="${request.id}">Save</button></div>`}`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "No diligence request yet." })]));
  diligenceList.querySelectorAll<HTMLButtonElement>("[data-save-dd]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.saveDd);
      const request = nextState.dueDiligenceRequests.find((candidate) => candidate.id === id);
      if (!request) return;
      const status = diligenceList.querySelector<HTMLSelectElement>(`[data-dd-status="${id}"]`)?.value ?? request.status;
      const responseNotes = diligenceList.querySelector<HTMLInputElement>(`[data-dd-notes="${id}"]`)?.value.trim() ?? request.responseNotes;
      try {
        const response = await requestJson<{ state: BootstrapState }>(`/api/due-diligence/${id}`, { method: "PATCH", body: JSON.stringify({ ...request, status, responseNotes }) });
        render(response.state);
        showToast("Diligence request updated.");
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not update diligence request."); }
    });
  });

  const comparison = element<HTMLDivElement>("#term-sheet-comparison");
  comparison.replaceChildren(...(nextState.termSheetComparison.items.length ? nextState.termSheetComparison.items.map((term) => {
    const source = nextState.termSheets.find((candidate) => candidate.id === term.termSheetId);
    const resolvedOutcome = source ? latestOutcomeForInvestor(source.investorId, nextState.outcomes) : null;
    const item = document.createElement("article");
    item.className = `term-card${resolvedOutcome ? " resolved-by-outcome" : ""}`;
    item.id = `term-sheet-${term.termSheetId}`;
    item.innerHTML = `<div class="action-title">${escapeHtml(term.investorName)}</div><div class="action-tags"><span class="tag">${escapeHtml(source?.status ?? "recorded")}</span>${source?.targetCloseDate ? `<span class="tag">target close ${escapeHtml(source.targetCloseDate)}</span>` : `<span class="tag">target close not recorded</span>`}</div><p>${escapeHtml(term.economicSummary)}</p><p>${escapeHtml(term.governanceSummary)}</p>${term.cautionFlags.length ? `<ul>${term.cautionFlags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join("")}</ul>` : "<p>No automatic caution flag from recorded terms.</p>"}${source && !resolvedOutcome ? `<div class="term-close-controls"><p class="muted">Keep the closing target current. This date is a management target, not a predicted funding receipt date.</p><label>Target close date<input type="date" data-term-close-date="${source.id}" value="${source.targetCloseDate ?? ""}" /></label><label>Status<select data-term-status="${source.id}">${["received","reviewing","negotiating","accepted","rejected","expired"].map((status) => `<option value="${status}"${status === source.status ? " selected" : ""}>${status}</option>`).join("")}</select></label><button type="button" class="ghost" data-save-term-close="${source.id}">Save closing timing</button></div>` : ""}${resolvedOutcome ? outcomeResolutionHtml(resolvedOutcome) : ""}`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "No term sheet recorded yet." })]));
  comparison.querySelectorAll<HTMLButtonElement>("[data-save-term-close]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.saveTermClose);
      const source = nextState.termSheets.find((candidate) => candidate.id === id);
      if (!source) return;
      const targetCloseDate = comparison.querySelector<HTMLInputElement>(`[data-term-close-date="${id}"]`)?.value || null;
      const status = comparison.querySelector<HTMLSelectElement>(`[data-term-status="${id}"]`)?.value ?? source.status;
      try {
        const response = await requestJson<{ state: BootstrapState }>(`/api/term-sheets/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...source, targetCloseDate, status }),
        });
        render(response.state);
        showToast("Term sheet closing timing updated.");
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not update term sheet closing timing."); }
    });
  });
  if (nextState.termSheetComparison.items.length) {
    const warning = document.createElement("div");
    warning.className = "legal-warning";
    warning.textContent = nextState.termSheetComparison.disclaimer;
    comparison.append(warning);
  }

  const activeClosingConditions = nextState.closingConditions.filter((condition) => {
    if (!["open", "in-progress"].includes(condition.status)) return false;
    const termSheet = nextState.termSheets.find((candidate) => candidate.id === condition.termSheetId);
    return Boolean(termSheet && !["rejected", "expired"].includes(termSheet.status) && !resolvedInvestorIds.has(termSheet.investorId));
  });
  text("closing-condition-count", `${activeClosingConditions.length} open`);
  const closingConditionList = element<HTMLDivElement>("#closing-condition-list");
  const orderedConditions = [...nextState.closingConditions].sort((left, right) => {
    const leftActive = ["open", "in-progress"].includes(left.status) ? 0 : 1;
    const rightActive = ["open", "in-progress"].includes(right.status) ? 0 : 1;
    if (leftActive !== rightActive) return leftActive - rightActive;
    return (left.dueDate ?? "9999-12-31").localeCompare(right.dueDate ?? "9999-12-31") || left.id - right.id;
  });
  closingConditionList.replaceChildren(...(orderedConditions.length ? orderedConditions.map((condition) => {
    const termSheet = nextState.termSheets.find((candidate) => candidate.id === condition.termSheetId);
    const resolvedOutcome = termSheet ? latestOutcomeForInvestor(termSheet.investorId, nextState.outcomes) : null;
    const investor = termSheet ? investorName(termSheet.investorId, nextState.investors) : "Term sheet";
    const overdue = condition.dueDate && ["open", "in-progress"].includes(condition.status)
      ? new Date(`${condition.dueDate}T23:59:59.999Z`).getTime() < Date.now()
      : false;
    const item = document.createElement("article");
    item.className = `action-item closing-condition-card${resolvedOutcome ? " resolved-by-outcome" : ""}${overdue ? " closing-condition-overdue" : ""}`;
    item.id = `closing-condition-${condition.id}`;
    item.innerHTML = `<div class="action-top"><div><div class="action-title">${escapeHtml(condition.title)}</div><div class="action-tags"><span class="tag">${escapeHtml(condition.status)}</span>${condition.dueDate ? `<span class="tag">${overdue ? "overdue" : "due"} ${escapeHtml(condition.dueDate)}</span>` : `<span class="tag">due date not recorded</span>`}</div><div class="entity-sub">${escapeHtml(investor)} · Owner: ${escapeHtml(condition.owner || "Not recorded")}</div></div><strong>${overdue ? "OVERDUE" : condition.status === "satisfied" || condition.status === "waived" ? "CLEARED" : "OPEN"}</strong></div>${condition.evidenceNote ? `<div class="action-next"><span>Evidence</span><strong>${escapeHtml(condition.evidenceNote)}</strong></div>` : ""}${resolvedOutcome ? outcomeResolutionHtml(resolvedOutcome) : `<div class="closing-condition-controls"><label>Status<select data-closing-condition-status="${condition.id}">${["open","in-progress","satisfied","waived"].map((status) => `<option value="${status}"${status === condition.status ? " selected" : ""}>${status.replaceAll("-", " ")}</option>`).join("")}</select></label><label>Owner<input data-closing-condition-owner="${condition.id}" value="${escapeHtml(condition.owner)}" /></label><label>Due date<input type="date" data-closing-condition-due="${condition.id}" value="${condition.dueDate ?? ""}" /></label><label>Evidence note<input data-closing-condition-evidence="${condition.id}" value="${escapeHtml(condition.evidenceNote)}" placeholder="Required when cleared" /></label><button class="ghost" type="button" data-save-closing-condition="${condition.id}">Save condition</button></div>`}`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "No structured closing condition yet. Add the material conditions that must be satisfied or formally waived before closing." })]));
  closingConditionList.querySelectorAll<HTMLButtonElement>("[data-save-closing-condition]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.saveClosingCondition);
      const condition = nextState.closingConditions.find((candidate) => candidate.id === id);
      if (!condition) return;
      const status = closingConditionList.querySelector<HTMLSelectElement>(`[data-closing-condition-status="${id}"]`)?.value ?? condition.status;
      const owner = closingConditionList.querySelector<HTMLInputElement>(`[data-closing-condition-owner="${id}"]`)?.value.trim() || "Owner";
      const dueDate = closingConditionList.querySelector<HTMLInputElement>(`[data-closing-condition-due="${id}"]`)?.value || null;
      const evidenceNote = closingConditionList.querySelector<HTMLInputElement>(`[data-closing-condition-evidence="${id}"]`)?.value.trim() ?? condition.evidenceNote;
      try {
        const response = await requestJson<{ state: BootstrapState }>(`/api/closing-conditions/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...condition, status, owner, dueDate, evidenceNote }),
        });
        render(response.state);
        showToast("Closing condition updated. Closing focus recalculated.");
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not update closing condition."); }
    });
  });

  text("outcome-count", `${nextState.outcomes.length} outcomes`);
  const outcomeList = element<HTMLDivElement>("#outcome-list");
  outcomeList.replaceChildren(...(nextState.outcomes.length ? nextState.outcomes.map((outcome) => {
    const item = document.createElement("article");
    const activeReceiptTranches = nextState.receiptTranches.filter((tranche) => tranche.outcomeId === outcome.id && tranche.status === "received");
    const receiptTrancheTotalCents = activeReceiptTranches.reduce((sum, tranche) => sum + tranche.amountCents, 0);
    const activeReceiptExpectations = nextState.receiptExpectations.filter((expectation) => expectation.outcomeId === outcome.id && expectation.status === "expected");
    const arrivalFulfillments = activeReceiptExpectations.map((expectation) => receiptExpectationFulfillment(expectation, nextState));
    const scheduledArrivalCents = arrivalFulfillments.reduce((sum, fulfillment) => sum + fulfillment.remainingAmountCents, 0);
    const outstandingCommitmentCents = Math.max(0, outcome.committedAmountCents - outcome.receivedAmountCents);
    const allocationError = arrivalFulfillments.some((fulfillment) => fulfillment.status === "invalid-receipt" || fulfillment.status === "overallocated");
    const arrivalScheduleState = allocationError ? "ALLOCATION ERROR" : outstandingCommitmentCents === 0
      ? scheduledArrivalCents > 0 ? "OVER-SCHEDULED" : "NO OUTSTANDING"
      : scheduledArrivalCents === 0 ? "UNSCHEDULED"
        : scheduledArrivalCents < outstandingCommitmentCents ? "PARTIAL"
          : scheduledArrivalCents === outstandingCommitmentCents ? "BALANCED" : "OVER-SCHEDULED";
    const commitmentEvidenceMissing = outcome.committedAmountCents > 0 && !outcome.commitmentEvidence.trim();
    const receiptEvidenceMissing = outcome.receivedAmountCents > 0 && (activeReceiptTranches.length > 0
      ? activeReceiptTranches.some((tranche) => !tranche.receivedDate || !tranche.receiptEvidence.trim())
      : !outcome.receiptEvidence.trim());
    const reconciliationMissing = activeReceiptTranches.length > 0 && receiptTrancheTotalCents !== outcome.receivedAmountCents;
    const reconciliationRequired = reconciliationMissing || allocationError;
    const evidenceMissing = commitmentEvidenceMissing || receiptEvidenceMissing || reconciliationRequired;
    const arrivalScheduleDetail = allocationError
      ? `RECONCILIATION REQUIRED · ${money(scheduledArrivalCents)} unresolved remaining expectation · do not rely on this schedule until the explicit Allocation is corrected or voided`
      : `${arrivalScheduleState} · ${money(scheduledArrivalCents)} remaining scheduled · ${money(outstandingCommitmentCents)} still to arrive`;
    item.className = `action-item outcome-authority-card${evidenceMissing ? " outcome-evidence-missing" : ""}`;
    item.id = `funding-outcome-${outcome.id}`;
    item.innerHTML = `<div class="action-top"><div><div class="action-title">${outcome.track.toUpperCase()} · ${escapeHtml(outcome.status)}</div><div class="action-tags">${outcome.receivedDate ? `<span class="tag">latest receipt ${escapeHtml(outcome.receivedDate)}</span>` : ""}<span class="tag">current financing state</span>${reconciliationRequired ? `<span class="tag evidence-warning">RECONCILIATION REQUIRED</span>` : evidenceMissing ? `<span class="tag evidence-warning">EVIDENCE MISSING</span>` : `<span class="tag">evidence reconciled</span>`}</div></div><strong>${money(outcome.receivedAmountCents)} received</strong></div><div class="action-next"><span>Committed total</span><strong>${money(outcome.committedAmountCents)}</strong></div><div class="action-next"><span>Receipt register</span><strong>${activeReceiptTranches.length} active tranche${activeReceiptTranches.length === 1 ? "" : "s"} · ${money(receiptTrancheTotalCents)}</strong></div><div class="action-next"><span>Arrival schedule</span><strong>${arrivalScheduleDetail}</strong></div>${outcome.committedAmountCents > 0 ? `<div class="action-next"><span>Commitment evidence</span><strong>${escapeHtml(outcome.commitmentEvidence || "Missing — required to support committed capital")}</strong></div>` : ""}${outcome.status === "lost" ? `<div class="action-next"><span>Why lost</span><strong>${escapeHtml(outcome.lossReason || "Not recorded")}</strong></div>` : ""}<div class="outcome-edit"><p class="muted">Correct final status, links, commitment and commitment evidence here. Received cash is tranche-managed: add or correct the exact receipt below instead of editing the aggregate total.</p><div class="pipeline-controls outcome-evidence-controls"><label>Status<select data-outcome-status="${outcome.id}">${["won","lost","withdrawn","closed"].map((status) => `<option value="${status}"${status === outcome.status ? " selected" : ""}>${status}</option>`).join("")}</select></label><label>Application<select data-outcome-application="${outcome.id}"><option value="">No application linked</option>${applications.map((option) => `<option value="${option.value}"${option.value === outcome.applicationId ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label><label>Investor<select data-outcome-investor="${outcome.id}"><option value="">No investor linked</option>${investors.map((option) => `<option value="${option.value}"${option.value === outcome.investorId ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label><label>Round<select data-outcome-round="${outcome.id}"><option value="">No round linked</option>${rounds.map((option) => `<option value="${option.value}"${option.value === outcome.roundId ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label><label>Committed total<input type="number" min="0" step="1" data-outcome-committed="${outcome.id}" value="${dollars(outcome.committedAmountCents)}" /></label><label>Commitment evidence<input data-outcome-commitment-evidence="${outcome.id}" value="${escapeHtml(outcome.commitmentEvidence)}" placeholder="Signed agreement, award notice, closing memo reference" /></label><div class="outcome-receipt-managed"><span>Received aggregate</span><strong>${money(outcome.receivedAmountCents)}</strong><small>Managed by Receipt Tranche Register</small></div><button class="ghost" type="button" data-save-outcome="${outcome.id}">Save correction</button></div></div>`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "No funding outcome recorded yet." })]));

  outcomeList.querySelectorAll<HTMLButtonElement>("[data-save-outcome]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.saveOutcome);
      const outcome = nextState.outcomes.find((candidate) => candidate.id === id);
      if (!outcome) return;
      const status = outcomeList.querySelector<HTMLSelectElement>(`[data-outcome-status="${id}"]`)?.value ?? outcome.status;
      const applicationRaw = outcomeList.querySelector<HTMLSelectElement>(`[data-outcome-application="${id}"]`)?.value ?? "";
      const investorRaw = outcomeList.querySelector<HTMLSelectElement>(`[data-outcome-investor="${id}"]`)?.value ?? "";
      const roundRaw = outcomeList.querySelector<HTMLSelectElement>(`[data-outcome-round="${id}"]`)?.value ?? "";
      const applicationId = applicationRaw ? Number(applicationRaw) : null;
      const investorId = investorRaw ? Number(investorRaw) : null;
      const roundId = roundRaw ? Number(roundRaw) : null;
      const committedAmountCents = centsFromDollarInput(outcomeList.querySelector<HTMLInputElement>(`[data-outcome-committed="${id}"]`)?.value ?? dollars(outcome.committedAmountCents).toString());
      const commitmentEvidence = outcomeList.querySelector<HTMLInputElement>(`[data-outcome-commitment-evidence="${id}"]`)?.value.trim() ?? outcome.commitmentEvidence;
      try {
        const response = await requestJson<{ state: BootstrapState }>(`/api/outcomes/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...outcome, applicationId, investorId, roundId, status, committedAmountCents, commitmentEvidence }),
        });
        render(response.state);
        showToast("Funding Outcome corrected. Capital state recalculated.");
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not correct funding outcome."); }
    });
  });

  renderReceiptTranches(nextState);
  renderReceiptExpectations(nextState);
  renderReceiptExpectationAllocations(nextState);
}

function activeAllocatedToTranche(trancheId: number, nextState: BootstrapState): number {
  return nextState.receiptExpectationAllocations
    .filter((allocation) => allocation.trancheId === trancheId && allocation.status === "active")
    .reduce((sum, allocation) => sum + allocation.amountCents, 0);
}

function activeAllocatedToExpectation(expectationId: number, nextState: BootstrapState): number {
  return nextState.receiptExpectationAllocations
    .filter((allocation) => allocation.expectationId === expectationId && allocation.status === "active")
    .reduce((sum, allocation) => sum + allocation.amountCents, 0);
}

function currentMaximumSupportedReceiptAllocation(allocation: FundingReceiptExpectationAllocation, nextState: BootstrapState): number {
  const expectation = nextState.receiptExpectations.find((candidate) => candidate.id === allocation.expectationId);
  const tranche = nextState.receiptTranches.find((candidate) => candidate.id === allocation.trancheId);
  if (!expectation || expectation.status !== "expected" || !tranche || tranche.status !== "received" || tranche.outcomeId !== expectation.outcomeId) return 0;
  const currentAmountCents = allocation.status === "active" ? allocation.amountCents : 0;
  const otherExpectationAllocatedCents = Math.max(0, activeAllocatedToExpectation(allocation.expectationId, nextState) - currentAmountCents);
  const otherTrancheAllocatedCents = Math.max(0, activeAllocatedToTranche(allocation.trancheId, nextState) - currentAmountCents);
  return Math.max(0, Math.min(expectation.amountCents - otherExpectationAllocatedCents, tranche.amountCents - otherTrancheAllocatedCents));
}

function receiptAllocationHasInvalidTranche(allocation: FundingReceiptExpectationAllocation, expectation: FundingReceiptExpectation, nextState: BootstrapState): boolean {
  const tranche = nextState.receiptTranches.find((candidate) => candidate.id === allocation.trancheId);
  return !tranche
    || tranche.status !== "received"
    || tranche.outcomeId !== expectation.outcomeId
    || activeAllocatedToTranche(allocation.trancheId, nextState) > tranche.amountCents;
}

function receiptExpectationFulfillment(expectation: FundingReceiptExpectation, nextState: BootstrapState): {
  allocatedAmountCents: number;
  invalidAllocatedAmountCents: number;
  remainingAmountCents: number;
  reconciliationAllocationIds: number[];
  reconciliationIssues: FundingReceiptAllocationReconciliationIssue[];
  status: "cancelled" | "unfulfilled" | "partial" | "fulfilled" | "overallocated" | "invalid-receipt";
} {
  const activeAllocations = nextState.receiptExpectationAllocations.filter((allocation) => allocation.expectationId === expectation.id && allocation.status === "active");
  const reconciliationIssues = nextState.receiptAllocationReconciliationIssues.filter((issue) => issue.expectationIds.includes(expectation.id));
  const invalidAllocationIds = new Set(reconciliationIssues
    .filter((issue) => issue.kind !== "expectation-overallocated")
    .flatMap((issue) => issue.allocationIds));
  let allocatedAmountCents = 0;
  let invalidAllocatedAmountCents = 0;
  for (const allocation of activeAllocations) {
    if (!invalidAllocationIds.has(allocation.id) && !receiptAllocationHasInvalidTranche(allocation, expectation, nextState)) allocatedAmountCents += allocation.amountCents;
    else invalidAllocatedAmountCents += allocation.amountCents;
  }
  const remainingAmountCents = Math.max(0, expectation.amountCents - allocatedAmountCents);
  const status = reconciliationIssues.some((issue) => issue.kind !== "expectation-overallocated")
    ? "invalid-receipt"
    : reconciliationIssues.some((issue) => issue.kind === "expectation-overallocated") || allocatedAmountCents > expectation.amountCents
      ? "overallocated"
      : expectation.status === "cancelled"
        ? "cancelled"
        : allocatedAmountCents === expectation.amountCents && expectation.amountCents > 0
          ? "fulfilled"
          : allocatedAmountCents > 0 ? "partial" : "unfulfilled";
  const reconciliationAllocationIds = [...new Set(reconciliationIssues.flatMap((issue) => issue.allocationIds))].sort((left, right) => left - right);
  return { allocatedAmountCents, invalidAllocatedAmountCents, remainingAmountCents, reconciliationAllocationIds, reconciliationIssues, status };
}

function receiptRepairConstraintHtml(issues: FundingReceiptAllocationReconciliationIssue[]): string {
  if (issues.length === 0) return "";
  return issues.map((issue) => `<div class="action-next receipt-reconciliation-guidance"><span>Repair constraint</span><strong>Reduce, correct, or void at least ${money(issue.requiredReductionCents)} across Allocation(s) ${issue.allocationIds.join(", ") || "unknown"}</strong><small>${escapeHtml(issue.reason)} Recorded allocated ${money(issue.recordedAllocatedAmountCents)} · supported ${money(issue.supportedAmountCents)}. BossAI Funding will not choose which owner-confirmed relationship to remove.</small></div>`).join("");
}

function renderReceiptTranches(nextState: BootstrapState): void {
  const activeCount = nextState.receiptTranches.filter((tranche) => tranche.status === "received").length;
  const voidedCount = nextState.receiptTranches.filter((tranche) => tranche.status === "voided").length;
  text("receipt-tranche-count", `${activeCount} active · ${voidedCount} voided`);
  const list = element<HTMLDivElement>("#receipt-tranche-list");
  const ordered = [...nextState.receiptTranches].sort((left, right) => right.receivedDate.localeCompare(left.receivedDate) || right.id - left.id);
  list.replaceChildren(...(ordered.length ? ordered.map((tranche) => {
    const outcome = nextState.outcomes.find((candidate) => candidate.id === tranche.outcomeId);
    const allocatedToTrancheCents = activeAllocatedToTranche(tranche.id, nextState);
    const trancheIssues = nextState.receiptAllocationReconciliationIssues.filter((issue) => issue.trancheId === tranche.id);
    const item = document.createElement("article");
    item.className = `action-item receipt-tranche-card${tranche.status === "voided" ? " receipt-tranche-voided" : ""}`;
    item.id = `receipt-tranche-${tranche.id}`;
    item.innerHTML = `<div class="action-top"><div><div class="action-title">${outcome ? `${outcome.track.toUpperCase()} Outcome #${outcome.id}` : `Funding Outcome #${tranche.outcomeId}`}</div><div class="action-tags"><span class="tag">${tranche.status}</span><span class="tag">${escapeHtml(tranche.receivedDate)}</span>${trancheIssues.length > 0 ? `<span class="tag evidence-warning">RECONCILIATION REQUIRED</span>` : ""}</div></div><strong>${money(tranche.amountCents)}</strong></div><div class="action-next"><span>Receipt evidence</span><strong>${escapeHtml(tranche.receiptEvidence)}</strong></div><div class="action-next"><span>Explicit Allocations against this receipt</span><strong>${money(allocatedToTrancheCents)} allocated · ${money(Math.max(0, tranche.amountCents - allocatedToTrancheCents))} unallocated current cash capacity</strong></div>${receiptRepairConstraintHtml(trancheIssues)}${tranche.note ? `<div class="entity-sub">${escapeHtml(tranche.note)}</div>` : ""}${tranche.status === "voided" ? `<div class="action-next"><span>Void reason</span><strong>${escapeHtml(tranche.voidReason)}</strong></div>` : ""}<div class="receipt-tranche-controls"><label>Status<select data-receipt-tranche-status="${tranche.id}"><option value="received"${tranche.status === "received" ? " selected" : ""}>received</option><option value="voided"${tranche.status === "voided" ? " selected" : ""}>voided</option></select></label><label>Amount ($)<input type="number" min="0.01" step="0.01" data-receipt-tranche-amount="${tranche.id}" value="${dollars(tranche.amountCents)}" /></label><label>Received date<input type="date" data-receipt-tranche-date="${tranche.id}" value="${escapeHtml(tranche.receivedDate)}" /></label><label>Receipt evidence<input data-receipt-tranche-evidence="${tranche.id}" value="${escapeHtml(tranche.receiptEvidence)}" /></label><label>Note<input data-receipt-tranche-note="${tranche.id}" value="${escapeHtml(tranche.note)}" /></label><label>Void reason<input data-receipt-tranche-void-reason="${tranche.id}" value="${escapeHtml(tranche.voidReason)}" placeholder="Required when voided" /></label><button class="ghost" type="button" data-save-receipt-tranche="${tranche.id}">Save tranche</button></div>`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "No receipt tranche yet. Record each actual funding receipt separately when cash arrives." })]));

  list.querySelectorAll<HTMLButtonElement>("[data-save-receipt-tranche]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.saveReceiptTranche);
      const tranche = nextState.receiptTranches.find((candidate) => candidate.id === id);
      if (!tranche) return;
      const status = list.querySelector<HTMLSelectElement>(`[data-receipt-tranche-status="${id}"]`)?.value ?? tranche.status;
      const amountCents = centsFromDollarInput(list.querySelector<HTMLInputElement>(`[data-receipt-tranche-amount="${id}"]`)?.value ?? dollars(tranche.amountCents).toString());
      const receivedDate = list.querySelector<HTMLInputElement>(`[data-receipt-tranche-date="${id}"]`)?.value ?? tranche.receivedDate;
      const receiptEvidence = list.querySelector<HTMLInputElement>(`[data-receipt-tranche-evidence="${id}"]`)?.value.trim() ?? tranche.receiptEvidence;
      const note = list.querySelector<HTMLInputElement>(`[data-receipt-tranche-note="${id}"]`)?.value.trim() ?? tranche.note;
      const voidReason = list.querySelector<HTMLInputElement>(`[data-receipt-tranche-void-reason="${id}"]`)?.value.trim() ?? tranche.voidReason;
      try {
        const response = await requestJson<{ state: BootstrapState }>(`/api/receipt-tranches/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...tranche, status, amountCents, receivedDate, receiptEvidence, note, voidReason }),
        });
        render(response.state);
        showToast(status === "voided" ? "Receipt tranche voided. Received total reconciled." : "Receipt tranche updated. Received total reconciled.");
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not update receipt tranche."); }
    });
  });
}

function renderReceiptExpectations(nextState: BootstrapState): void {
  const activeCount = nextState.receiptExpectations.filter((item) => item.status === "expected").length;
  const cancelledCount = nextState.receiptExpectations.filter((item) => item.status === "cancelled").length;
  text("receipt-expectation-count", `${activeCount} expected · ${cancelledCount} cancelled`);
  const list = element<HTMLDivElement>("#receipt-expectation-list");
  const ordered = [...nextState.receiptExpectations].sort((left, right) => {
    const leftRank = left.status === "expected" ? 0 : 1;
    const rightRank = right.status === "expected" ? 0 : 1;
    return leftRank - rightRank || left.expectedDate.localeCompare(right.expectedDate) || left.id - right.id;
  });
  list.replaceChildren(...(ordered.length ? ordered.map((expectation) => {
    const outcome = nextState.outcomes.find((candidate) => candidate.id === expectation.outcomeId);
    const fulfillment = receiptExpectationFulfillment(expectation, nextState);
    const overdue = expectation.status === "expected" && fulfillment.remainingAmountCents > 0 && new Date(`${expectation.expectedDate}T23:59:59.999Z`).getTime() < Date.now();
    const allocationError = fulfillment.status === "invalid-receipt" || fulfillment.status === "overallocated";
    const item = document.createElement("article");
    item.className = `action-item receipt-expectation-card${expectation.status === "cancelled" ? " receipt-expectation-cancelled" : ""}${overdue ? " receipt-expectation-overdue" : ""}${allocationError ? " receipt-expectation-invalid" : ""}`;
    item.id = `receipt-expectation-${expectation.id}`;
    const explicitlyAllocatedActualCents = fulfillment.allocatedAmountCents + fulfillment.invalidAllocatedAmountCents;
    item.innerHTML = `<div class="action-top"><div><div class="action-title">${outcome ? `${outcome.track.toUpperCase()} Outcome #${outcome.id}` : `Funding Outcome #${expectation.outcomeId}`}</div><div class="action-tags"><span class="tag">${expectation.status}</span><span class="tag">${escapeHtml(fulfillment.status)}</span><span class="tag">${overdue ? "overdue" : "expected"} ${escapeHtml(expectation.expectedDate)}</span>${allocationError ? `<span class="tag evidence-warning">RECONCILIATION REQUIRED</span>` : ""}</div><div class="entity-sub">Owner: ${escapeHtml(expectation.owner)}</div></div><strong>Expectation #${expectation.id}</strong></div><div class="action-next"><span>Expected total</span><strong>${money(expectation.amountCents)}</strong></div><div class="action-next"><span>Explicitly allocated actual cash</span><strong>${money(explicitlyAllocatedActualCents)}</strong></div><div class="action-next"><span>Remaining expectation</span><strong>${money(fulfillment.remainingAmountCents)}</strong></div>${fulfillment.invalidAllocatedAmountCents > 0 ? `<div class="action-next"><span>Reconciliation-invalid allocation amount</span><strong>${money(fulfillment.invalidAllocatedAmountCents)} · Allocation(s) ${fulfillment.reconciliationAllocationIds.join(", ")}</strong></div>` : ""}${receiptRepairConstraintHtml(fulfillment.reconciliationIssues)}<div class="action-next"><span>Expectation basis</span><strong>${escapeHtml(expectation.basisNote)}</strong></div>${expectation.note ? `<div class="entity-sub">${escapeHtml(expectation.note)}</div>` : ""}${expectation.status === "cancelled" ? `<div class="action-next"><span>Cancellation reason</span><strong>${escapeHtml(expectation.cancellationReason)}</strong></div>` : ""}<div class="receipt-expectation-controls"><label>Status<select data-receipt-expectation-status="${expectation.id}"><option value="expected"${expectation.status === "expected" ? " selected" : ""}>expected</option><option value="cancelled"${expectation.status === "cancelled" ? " selected" : ""}>cancelled</option></select></label><label>Amount ($)<input type="number" min="0.01" step="0.01" data-receipt-expectation-amount="${expectation.id}" value="${dollars(expectation.amountCents)}" /></label><label>Expected date<input type="date" data-receipt-expectation-date="${expectation.id}" value="${escapeHtml(expectation.expectedDate)}" /></label><label>Basis<input data-receipt-expectation-basis="${expectation.id}" value="${escapeHtml(expectation.basisNote)}" /></label><label>Owner<input data-receipt-expectation-owner="${expectation.id}" value="${escapeHtml(expectation.owner)}" /></label><label>Note<input data-receipt-expectation-note="${expectation.id}" value="${escapeHtml(expectation.note)}" /></label><label>Cancellation reason<input data-receipt-expectation-cancel-reason="${expectation.id}" value="${escapeHtml(expectation.cancellationReason)}" placeholder="Required when cancelled" /></label><button class="ghost" type="button" data-save-receipt-expectation="${expectation.id}">Save expectation</button></div>`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "No explicit committed-capital arrival expectation yet. Only add one when a payer, signed closing schedule, award notice or equivalent financing evidence gives you a real date." })]));

  list.querySelectorAll<HTMLButtonElement>("[data-save-receipt-expectation]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.saveReceiptExpectation);
      const expectation = nextState.receiptExpectations.find((candidate) => candidate.id === id);
      if (!expectation) return;
      const status = list.querySelector<HTMLSelectElement>(`[data-receipt-expectation-status="${id}"]`)?.value ?? expectation.status;
      const amountCents = centsFromDollarInput(list.querySelector<HTMLInputElement>(`[data-receipt-expectation-amount="${id}"]`)?.value ?? dollars(expectation.amountCents).toString());
      const expectedDate = list.querySelector<HTMLInputElement>(`[data-receipt-expectation-date="${id}"]`)?.value ?? expectation.expectedDate;
      const basisNote = list.querySelector<HTMLInputElement>(`[data-receipt-expectation-basis="${id}"]`)?.value.trim() ?? expectation.basisNote;
      const owner = list.querySelector<HTMLInputElement>(`[data-receipt-expectation-owner="${id}"]`)?.value.trim() ?? expectation.owner;
      const note = list.querySelector<HTMLInputElement>(`[data-receipt-expectation-note="${id}"]`)?.value.trim() ?? expectation.note;
      const cancellationReason = list.querySelector<HTMLInputElement>(`[data-receipt-expectation-cancel-reason="${id}"]`)?.value.trim() ?? expectation.cancellationReason;
      try {
        const response = await requestJson<{ state: BootstrapState }>(`/api/receipt-expectations/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...expectation, amountCents, expectedDate, basisNote, owner, note, status, cancellationReason }),
        });
        render(response.state);
        showToast(status === "cancelled" ? "Arrival expectation cancelled; history retained." : "Arrival expectation updated. Timing and blockers recalculated.");
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not update arrival expectation."); }
    });
  });
}

function refreshReceiptAllocationDraftWarnings(nextState: BootstrapState): void {
  const list = document.querySelector<HTMLDivElement>("#receipt-allocation-list");
  if (!list) return;
  for (const allocation of nextState.receiptExpectationAllocations) {
    const warning = list.querySelector<HTMLDivElement>(`[data-receipt-allocation-draft-warning="${allocation.id}"]`);
    const preview = list.querySelector<HTMLDivElement>(`[data-receipt-allocation-draft-preview="${allocation.id}"]`);
    if (!warning && !preview) continue;
    const status = list.querySelector<HTMLSelectElement>(`[data-receipt-allocation-status="${allocation.id}"]`)?.value ?? allocation.status;
    const amountInput = list.querySelector<HTMLInputElement>(`[data-receipt-allocation-amount="${allocation.id}"]`);
    const voidReasonInput = list.querySelector<HTMLInputElement>(`[data-receipt-allocation-void-reason="${allocation.id}"]`);
    const draftedAmountCents = centsFromDollarInput(amountInput?.value ?? dollars(allocation.amountCents).toString());
    const draftedVoidReason = voidReasonInput?.value.trim() ?? allocation.voidReason;
    const supportedAmountCents = currentMaximumSupportedReceiptAllocation(allocation, nextState);
    const exceedsLoadedSupport = status === "active" && draftedAmountCents > supportedAmountCents;
    if (warning) {
      warning.hidden = !exceedsLoadedSupport;
      warning.textContent = exceedsLoadedSupport
        ? `Unsaved draft is ${money(draftedAmountCents - supportedAmountCents)} above the maximum supported by the currently loaded financing facts (${money(supportedAmountCents)}). Draft the latest supported amount or void the link, then review before Save. The server revalidates again when you save.`
        : "";
    }
    if (!preview) continue;
    const draftChanged = status !== allocation.status || draftedAmountCents !== allocation.amountCents;
    preview.hidden = !draftChanged;
    if (!draftChanged) {
      preview.innerHTML = "";
      continue;
    }
    const expectation = nextState.receiptExpectations.find((candidate) => candidate.id === allocation.expectationId);
    const tranche = nextState.receiptTranches.find((candidate) => candidate.id === allocation.trancheId);
    const currentActiveAmountCents = allocation.status === "active" ? allocation.amountCents : 0;
    const otherExpectationAllocatedCents = Math.max(0, activeAllocatedToExpectation(allocation.expectationId, nextState) - currentActiveAmountCents);
    const otherTrancheAllocatedCents = Math.max(0, activeAllocatedToTranche(allocation.trancheId, nextState) - currentActiveAmountCents);
    const projectedActiveAmountCents = status === "active" ? draftedAmountCents : 0;
    const projectedExpectationAllocatedCents = otherExpectationAllocatedCents + projectedActiveAmountCents;
    const projectedTrancheAllocatedCents = otherTrancheAllocatedCents + projectedActiveAmountCents;
    const projectedExpectationRemainingCents = expectation ? Math.max(0, expectation.amountCents - projectedExpectationAllocatedCents) : 0;
    const projectedTrancheUnallocatedCents = tranche?.status === "received" ? Math.max(0, tranche.amountCents - projectedTrancheAllocatedCents) : 0;
    const loadedFactsFit = status === "voided" || Boolean(
      expectation
      && expectation.status === "expected"
      && tranche
      && tranche.status === "received"
      && tranche.outcomeId === expectation.outcomeId
      && draftedAmountCents > 0
      && draftedAmountCents <= supportedAmountCents
    );
    const draftPrerequisite = status === "voided" && !draftedVoidReason
      ? "Owner void reason still required before Save"
      : status === "active" && draftedAmountCents <= 0
        ? "Active Allocation amount must be greater than $0 before Save"
        : !loadedFactsFit
          ? "Loaded financing facts do not support this draft"
          : "Ready to submit for server validation";
    preview.innerHTML = `<strong>Unsaved repair impact preview</strong><div class="receipt-repair-impact-grid"><span>This Allocation</span><b>${money(currentActiveAmountCents)} → ${money(projectedActiveAmountCents)} active</b><span>Arrival Expectation</span><b>${money(projectedExpectationAllocatedCents)} active allocated · ${money(projectedExpectationRemainingCents)} remaining</b><span>Receipt Tranche</span><b>${money(projectedTrancheAllocatedCents)} allocated · ${money(projectedTrancheUnallocatedCents)} current cash capacity left</b><span>Loaded-facts capacity check</span><b>${loadedFactsFit ? "Fits the currently loaded relationship/capacity facts" : "Does not fit the currently loaded relationship/capacity facts"}</b><span>Save prerequisites</span><b>${draftPrerequisite}</b></div><small>Preview only — nothing is saved. Actual Receipt cash is unchanged. Saving still goes through the server's current workspace revision, relationship, status and capacity validation, so newer facts can reject this draft.</small>`;
  }
}

function renderReceiptExpectationAllocations(nextState: BootstrapState): void {
  const activeCount = nextState.receiptExpectationAllocations.filter((item) => item.status === "active").length;
  const voidedCount = nextState.receiptExpectationAllocations.filter((item) => item.status === "voided").length;
  text("receipt-allocation-count", `${activeCount} active · ${voidedCount} voided`);
  const list = element<HTMLDivElement>("#receipt-allocation-list");
  const ordered = [...nextState.receiptExpectationAllocations].sort((left, right) => {
    const leftRank = left.status === "active" ? 0 : 1;
    const rightRank = right.status === "active" ? 0 : 1;
    return leftRank - rightRank || right.id - left.id;
  });
  list.replaceChildren(...(ordered.length ? ordered.map((allocation) => {
    const expectation = nextState.receiptExpectations.find((candidate) => candidate.id === allocation.expectationId);
    const tranche = nextState.receiptTranches.find((candidate) => candidate.id === allocation.trancheId);
    const allocationIssues = nextState.receiptAllocationReconciliationIssues.filter((issue) => issue.allocationIds.includes(allocation.id));
    const invalid = allocation.status === "active" && allocationIssues.length > 0;
    const otherExpectationAllocatedCents = Math.max(0, activeAllocatedToExpectation(allocation.expectationId, nextState) - (allocation.status === "active" ? allocation.amountCents : 0));
    const otherTrancheAllocatedCents = Math.max(0, activeAllocatedToTranche(allocation.trancheId, nextState) - (allocation.status === "active" ? allocation.amountCents : 0));
    const maximumSupportedAmountCents = currentMaximumSupportedReceiptAllocation(allocation, nextState);
    const canDraftSupportedAmount = invalid && maximumSupportedAmountCents > 0 && maximumSupportedAmountCents < allocation.amountCents;
    const repairDraftActions = invalid
      ? `<div class="receipt-repair-draft-actions"><span>Owner-controlled repair draft</span><div>${canDraftSupportedAmount ? `<button class="ghost" type="button" data-draft-receipt-allocation-supported="${allocation.id}">Draft supported amount</button>` : ""}<button class="ghost" type="button" data-draft-receipt-allocation-void="${allocation.id}">Draft void</button></div><small>${maximumSupportedAmountCents > 0 ? `Drafting the supported amount only fills ${money(maximumSupportedAmountCents)} into this link.` : "No positive amount is currently supported for this link."} Nothing is persisted until you review the fields and choose Save link; the server will revalidate current revision and both capacities.</small><div class="receipt-repair-draft-warning" data-receipt-allocation-draft-warning="${allocation.id}" hidden></div><div class="receipt-repair-impact-preview" data-receipt-allocation-draft-preview="${allocation.id}" hidden></div></div>`
      : "";
    const item = document.createElement("article");
    item.className = `action-item receipt-allocation-card${allocation.status === "voided" ? " receipt-allocation-voided" : ""}${invalid ? " receipt-allocation-invalid" : ""}`;
    item.id = `receipt-expectation-allocation-${allocation.id}`;
    item.innerHTML = `<div class="action-top"><div><div class="action-title">Expectation #${allocation.expectationId} → Receipt Tranche #${allocation.trancheId}</div><div class="action-tags"><span class="tag">${allocation.status}</span>${invalid ? `<span class="tag evidence-warning">RECONCILIATION REQUIRED</span>` : ""}</div><div class="entity-sub">${expectation ? `Expected ${escapeHtml(expectation.expectedDate)} · ${escapeHtml(expectation.basisNote)}` : "Expectation unavailable"}</div><div class="entity-sub">${tranche ? `Actual ${escapeHtml(tranche.receivedDate)} · ${escapeHtml(tranche.receiptEvidence)}` : "Receipt tranche unavailable"}</div></div><strong>${money(allocation.amountCents)}</strong></div><div class="action-next"><span>Current maximum supported amount for this link</span><strong>${money(maximumSupportedAmountCents)}</strong></div>${expectation ? `<div class="entity-sub">Expectation: ${money(expectation.amountCents)} total · ${money(otherExpectationAllocatedCents)} allocated by other active links.</div>` : ""}${tranche ? `<div class="entity-sub">Receipt: ${money(tranche.amountCents)} current cash · ${money(otherTrancheAllocatedCents)} allocated by other active links.</div>` : ""}${receiptRepairConstraintHtml(allocationIssues)}${repairDraftActions}${allocation.note ? `<div class="action-next"><span>Allocation note</span><strong>${escapeHtml(allocation.note)}</strong></div>` : ""}${allocation.status === "voided" ? `<div class="action-next"><span>Void reason</span><strong>${escapeHtml(allocation.voidReason)}</strong></div>` : ""}<div class="receipt-allocation-controls"><label>Status<select data-receipt-allocation-status="${allocation.id}"><option value="active"${allocation.status === "active" ? " selected" : ""}>active</option><option value="voided"${allocation.status === "voided" ? " selected" : ""}>voided</option></select></label><label>Allocated amount ($)<input type="number" min="0.01" step="0.01" data-receipt-allocation-amount="${allocation.id}" value="${dollars(allocation.amountCents)}" /></label><label>Note<input data-receipt-allocation-note="${allocation.id}" value="${escapeHtml(allocation.note)}" /></label><label>Void reason<input data-receipt-allocation-void-reason="${allocation.id}" value="${escapeHtml(allocation.voidReason)}" placeholder="Required when voided" /></label><button class="ghost" type="button" data-save-receipt-allocation="${allocation.id}">Save link</button></div>`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "No expectation-to-receipt link yet. BossAI Funding will not create one automatically." })]));

  list.querySelectorAll<HTMLButtonElement>("[data-draft-receipt-allocation-supported]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.draftReceiptAllocationSupported);
      const allocation = nextState.receiptExpectationAllocations.find((candidate) => candidate.id === id);
      if (!allocation) return;
      const supportedAmountCents = currentMaximumSupportedReceiptAllocation(allocation, nextState);
      if (supportedAmountCents <= 0 || supportedAmountCents >= allocation.amountCents) {
        showToast("No smaller positive supported amount is available for this link. Review the relationship before saving any change.");
        return;
      }
      const amountInput = list.querySelector<HTMLInputElement>(`[data-receipt-allocation-amount="${id}"]`);
      if (!amountInput) return;
      amountInput.value = dollars(supportedAmountCents).toString();
      refreshReceiptAllocationDraftWarnings(nextState);
      amountInput.focus();
      showToast(`Drafted ${money(supportedAmountCents)} for this Allocation. Review the fields, then choose Save link to persist.`);
    });
  });

  list.querySelectorAll<HTMLButtonElement>("[data-draft-receipt-allocation-void]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.draftReceiptAllocationVoid);
      const allocation = nextState.receiptExpectationAllocations.find((candidate) => candidate.id === id);
      if (!allocation || allocation.status !== "active") return;
      const statusSelect = list.querySelector<HTMLSelectElement>(`[data-receipt-allocation-status="${id}"]`);
      const voidReasonInput = list.querySelector<HTMLInputElement>(`[data-receipt-allocation-void-reason="${id}"]`);
      if (!statusSelect || !voidReasonInput) return;
      statusSelect.value = "voided";
      refreshReceiptAllocationDraftWarnings(nextState);
      voidReasonInput.focus();
      showToast("Drafted void status only. Enter the real void reason, review the link, then choose Save link to persist.");
    });
  });

  list.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-receipt-allocation-amount], [data-receipt-allocation-status], [data-receipt-allocation-void-reason]").forEach((control) => {
    control.addEventListener(control instanceof HTMLSelectElement ? "change" : "input", () => refreshReceiptAllocationDraftWarnings(nextState));
  });
  refreshReceiptAllocationDraftWarnings(nextState);

  list.querySelectorAll<HTMLButtonElement>("[data-save-receipt-allocation]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.saveReceiptAllocation);
      const allocation = nextState.receiptExpectationAllocations.find((candidate) => candidate.id === id);
      if (!allocation) return;
      const status = list.querySelector<HTMLSelectElement>(`[data-receipt-allocation-status="${id}"]`)?.value ?? allocation.status;
      const amountCents = centsFromDollarInput(list.querySelector<HTMLInputElement>(`[data-receipt-allocation-amount="${id}"]`)?.value ?? dollars(allocation.amountCents).toString());
      const note = list.querySelector<HTMLInputElement>(`[data-receipt-allocation-note="${id}"]`)?.value.trim() ?? allocation.note;
      const voidReason = list.querySelector<HTMLInputElement>(`[data-receipt-allocation-void-reason="${id}"]`)?.value.trim() ?? allocation.voidReason;
      try {
        const response = await requestJson<{ state: BootstrapState }>(`/api/receipt-expectation-allocations/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...allocation, amountCents, note, status, voidReason }),
        });
        render(response.state);
        showToast(status === "voided" ? "Receipt allocation voided; history retained." : "Explicit receipt allocation updated.");
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not update receipt allocation."); }
    });
  });
}

function renderContinuity(nextState: BootstrapState): void {
  text("continuity-access", nextState.continuity.accessMode === "local-loopback" ? "Local only" : nextState.continuity.accessMode);
  text("continuity-schema", `v${nextState.continuity.schemaVersion}`);
  text("continuity-backup-count", nextState.continuity.backupCount.toString());
  text("continuity-latest", nextState.continuity.latestBackup ? new Date(nextState.continuity.latestBackup.createdAt).toLocaleString() : "None yet");
  text("continuity-workspace", nextState.identityBoundary.workspaceId);
  text("continuity-identity", nextState.identityBoundary.authenticationAuthority === "external-required" ? "External authority required" : nextState.identityBoundary.authenticationAuthority);
  text("activity-count", `${nextState.activities.length} event${nextState.activities.length === 1 ? "" : "s"}`);

  const createBackup = element<HTMLButtonElement>("#create-backup");
  createBackup.disabled = !nextState.continuity.backupAvailable;
  createBackup.title = nextState.continuity.backupAvailable ? "Create a local SQLite recovery point." : "Backups require a file-backed database.";
  createBackup.onclick = async () => {
    try {
      const response = await requestJson<{ state: BootstrapState }>("/api/continuity/backup", { method: "POST", body: "{}" });
      render(response.state);
      showToast("Local recovery point created.");
    } catch (error) { showToast(error instanceof Error ? error.message : "Could not create backup."); }
  };

  element<HTMLButtonElement>("#export-funding-data").onclick = () => {
    window.location.assign("/api/continuity/export");
  };
  element<HTMLButtonElement>("#export-pipeline-csv").onclick = () => {
    window.location.assign("/api/reports/capital-pipeline.csv");
  };
  element<HTMLButtonElement>("#export-owner-summary").onclick = () => {
    window.location.assign("/api/reports/owner-board-summary.md");
  };

  const backupList = element<HTMLDivElement>("#backup-list");
  backupList.replaceChildren(...(nextState.backups.length ? nextState.backups.map((backup) => {
    const item = document.createElement("article");
    item.className = "action-item";
    const sizeMb = (backup.sizeBytes / (1024 * 1024)).toFixed(2);
    item.innerHTML = `<div class="action-title">${escapeHtml(backup.fileName)}</div><div class="action-tags"><span class="tag">${backup.kind}</span><span class="tag">${sizeMb} MB</span></div><div class="entity-sub">${escapeHtml(new Date(backup.createdAt).toLocaleString())}</div><div class="backup-actions"><span class="muted">Recovery replaces current local financing data.</span><button class="ghost" type="button" data-restore-backup="${escapeHtml(backup.fileName)}">Restore</button></div>`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: nextState.continuity.backupAvailable ? "No local backup yet." : "Backup is unavailable for this database mode." })]));

  backupList.querySelectorAll<HTMLButtonElement>("[data-restore-backup]").forEach((button) => {
    button.addEventListener("click", async () => {
      const fileName = button.dataset.restoreBackup;
      if (!fileName) return;
      const confirmation = window.prompt(`Restore ${fileName}? A pre-restore backup will be created first. Type RESTORE to continue.`);
      if (confirmation !== "RESTORE") {
        showToast("Restore cancelled.");
        return;
      }
      try {
        const response = await requestJson<{ state: BootstrapState }>("/api/continuity/restore", {
          method: "POST",
          body: JSON.stringify({ fileName, confirmation }),
        });
        render(response.state);
        showToast("Funding workspace restored from the selected recovery point.");
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not restore backup."); }
    });
  });

  const activityList = element<HTMLDivElement>("#activity-list");
  activityList.replaceChildren(...(nextState.activities.length ? nextState.activities.map((activity) => {
    const item = document.createElement("article");
    item.className = "activity-item";
    const amount = activity.amountCents && activity.amountCents > 0 ? ` · ${money(activity.amountCents)}` : "";
    item.innerHTML = `<div class="activity-meta"><span>${escapeHtml(activity.category)}</span><span>${escapeHtml(activity.action)}</span><span>${escapeHtml(new Date(activity.occurredAt).toLocaleString())}</span>${activity.track ? `<span>${activity.track}</span>` : ""}</div><strong>${escapeHtml(activity.title)}${amount}</strong><div class="activity-summary">${escapeHtml(activity.summary)}</div>`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty-list", textContent: "Funding activity will appear here as the owner moves financing work forward." })]));
}

function fillCompany(profile: CompanyProfile | null): void {
  if (!profile) return;
  const target = form("company-form");
  const values: Record<string, string> = {
    name: profile.name,
    industry: profile.industry,
    stage: profile.stage,
    geography: profile.geography,
    foundedYear: profile.foundedYear?.toString() ?? "",
    teamSize: profile.teamSize.toString(),
    annualRevenue: dollars(profile.annualRevenueCents).toString(),
    mrr: dollars(profile.mrrCents).toString(),
    arr: dollars(profile.arrCents).toString(),
    growthRatePct: profile.growthRatePct.toString(),
    grossMarginPct: profile.grossMarginPct.toString(),
    cashBalance: dollars(profile.cashBalanceCents).toString(),
    monthlyBurn: dollars(profile.monthlyBurnCents).toString(),
    runwayMonths: profile.runwayMonths.toString(),
    existingDebt: dollars(profile.existingDebtCents).toString(),
    targetFunding: dollars(profile.targetFundingCents).toString(),
    targetFundingDate: profile.targetFundingDate ?? "",
    product: profile.product,
    businessModel: profile.businessModel,
    fundingHistory: profile.fundingHistory,
    capTableSummary: profile.capTableSummary,
    useOfFunds: profile.useOfFunds,
  };
  for (const [key, item] of Object.entries(values)) field(target, key).value = item;
}

function fillGoal(goal: FundingGoal | null): void {
  if (!goal) return;
  const target = form("goal-form");
  field(target, "targetAmount").value = dollars(goal.targetAmountCents).toString();
  field(target, "needByDate").value = goal.needByDate ?? "";
  field(target, "purpose").value = goal.purpose;
  field(target, "maxMonthlyDebtService").value = dollars(goal.maxMonthlyDebtServiceCents).toString();
  field(target, "growthPlan").value = goal.growthPlan;
  const checkbox = field(target, "acceptsDilution");
  if (checkbox instanceof HTMLInputElement) checkbox.checked = goal.acceptsDilution;
}

function render(nextState: BootstrapState): void {
  const unsavedServerRenderedDrafts = captureUnsavedServerRenderedDrafts();
  state = nextState;
  element<HTMLButtonElement>("#refresh-workspace").hidden = true;
  renderDashboard(nextState.dashboard);
  renderOwnerJourney(nextState.ownerJourney);
  renderStrategy(nextState.strategy, nextState.strategyFreshness);
  renderOpportunities(nextState);
  renderActions(nextState.actions);
  renderEquity(nextState);
  renderExecution(nextState);
  renderContinuity(nextState);
  fillCompany(nextState.companyProfile);
  fillGoal(nextState.fundingGoal);
  rememberRenderedControlBaseline();

  if (unsavedServerRenderedDrafts.length > 0) {
    const renderedDraftMap = new Map(captureControlDrafts().map((draft) => [draft.key, draft]));
    const draftsStillUnsaved = unsavedServerRenderedDrafts.filter((draft) => {
      const rendered = renderedDraftMap.get(draft.key);
      return Boolean(rendered && (rendered.value !== draft.value || rendered.checked !== draft.checked));
    });
    restoreControlDrafts(draftsStillUnsaved);
  }
  applyTranslations(document);
  document.querySelectorAll<HTMLElement>(progressiveModuleSelector).forEach((module) => syncWorkspaceModuleToggle(module));
  applyTranslations(document);
  syncOwnerReturnControl();
}

function companyPayload(target: HTMLFormElement): Record<string, unknown> {
  return {
    name: value(target, "name"),
    industry: value(target, "industry"),
    stage: value(target, "stage"),
    geography: value(target, "geography"),
    foundedYear: value(target, "foundedYear") ? Math.round(numberValue(target, "foundedYear")) : null,
    annualRevenueCents: cents(target, "annualRevenue"),
    mrrCents: cents(target, "mrr"),
    arrCents: cents(target, "arr"),
    growthRatePct: numberValue(target, "growthRatePct"),
    grossMarginPct: numberValue(target, "grossMarginPct"),
    cashBalanceCents: cents(target, "cashBalance"),
    monthlyBurnCents: cents(target, "monthlyBurn"),
    runwayMonths: numberValue(target, "runwayMonths"),
    teamSize: Math.max(0, Math.round(numberValue(target, "teamSize"))),
    product: value(target, "product"),
    businessModel: value(target, "businessModel"),
    fundingHistory: value(target, "fundingHistory"),
    existingDebtCents: cents(target, "existingDebt"),
    capTableSummary: value(target, "capTableSummary"),
    useOfFunds: value(target, "useOfFunds"),
    targetFundingCents: cents(target, "targetFunding"),
    targetFundingDate: nullableDate(target, "targetFundingDate"),
  };
}

form("company-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  const firstProfile = !state?.companyProfile;
  clearFormErrors(target);
  try {
    const next = await requestJson<BootstrapState>("/api/company-profile", { method: "PUT", body: JSON.stringify(companyPayload(target)) });
    render(next);
    if (firstProfile && !next.fundingGoal) {
      navigateToWorkspaceTarget("goal-form");
      showToast("Company funding profile saved. Next: set the funding goal.");
    } else {
      showToast("Company funding profile saved.");
    }
  } catch (error) { showFormRequestError(target, error, companyFieldMap); }
});

form("goal-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  const firstGoal = !state?.fundingGoal;
  clearFormErrors(target);
  const checkbox = field(target, "acceptsDilution");
  try {
    const next = await requestJson<BootstrapState>("/api/funding-goal", {
      method: "PUT",
      body: JSON.stringify({
        targetAmountCents: cents(target, "targetAmount"),
        needByDate: nullableDate(target, "needByDate"),
        purpose: value(target, "purpose"),
        acceptsDilution: checkbox instanceof HTMLInputElement ? checkbox.checked : false,
        maxMonthlyDebtServiceCents: cents(target, "maxMonthlyDebtService"),
        growthPlan: value(target, "growthPlan"),
      }),
    });
    render(next);
    if (firstGoal && next.strategyFreshness.state !== "current") {
      navigateToWorkspaceTarget("strategy");
      showToast("Funding goal saved. Next: calculate the capital strategy.");
    } else {
      showToast("Funding goal saved.");
    }
  } catch (error) { showFormRequestError(target, error, goalFieldMap); }
});

form("round-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/rounds", {
      method: "POST",
      body: JSON.stringify({
        roundName: value(target, "roundName"), roundType: value(target, "roundType"),
        targetAmountCents: cents(target, "targetAmount"), minimumAmountCents: cents(target, "minimumAmount"),
        committedAmountCents: cents(target, "committedAmount"), receivedAmountCents: cents(target, "receivedAmount"),
        preMoneyValuationCents: optionalMoney(target, "preMoneyValuation"), postMoneyValuationCents: optionalMoney(target, "postMoneyValuation"),
        targetCloseDate: nullableDate(target, "targetCloseDate"), status: value(target, "status"), useOfFunds: value(target, "useOfFunds"),
      }),
    });
    render(response.state);
    target.reset();
    showToast("Fundraising round created.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not create round."); }
});

form("action-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/actions", {
      method: "POST",
      body: JSON.stringify({
        track: value(target, "track"), title: value(target, "title"), amountCents: cents(target, "amount"),
        stage: value(target, "stage"), priority: value(target, "priority"), deadline: nullableDate(target, "deadline"),
        nextStep: value(target, "nextStep"), owner: value(target, "owner"), result: "",
      }),
    });
    render(response.state);
    target.reset();
    field(target, "owner").value = "Owner";
    showToast("Financing action added. Dashboard updated.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not add financing action."); }
});

form("application-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  clearFormErrors(target);
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/applications", { method: "POST", body: JSON.stringify({
      opportunityId: nullableId(target, "opportunityId"), track: value(target, "track"), title: value(target, "title"),
      requestedAmountCents: cents(target, "requestedAmount"), approvedAmountCents: cents(target, "approvedAmount"), status: value(target, "status"),
      deadline: nullableDate(target, "deadline"), submittedDate: nullableDate(target, "submittedDate"), decisionDate: nullableDate(target, "decisionDate"),
      owner: value(target, "owner"), nextAction: value(target, "nextAction"), rejectionReason: value(target, "rejectionReason"), notes: value(target, "notes"),
    }) });
    render(response.state); target.reset(); field(target, "owner").value = "Owner"; showToast("Application created.");
  } catch (error) { showFormRequestError(target, error, applicationFieldMap); }
});

form("document-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/documents", { method: "POST", body: JSON.stringify({
      documentType: value(target, "documentType"), title: value(target, "title"), version: value(target, "version"), status: value(target, "status"),
      roundId: nullableId(target, "roundId"), investorId: nullableId(target, "investorId"), applicationId: nullableId(target, "applicationId"),
      completionPct: numberValue(target, "completionPct"), notes: value(target, "notes"),
    }) });
    render(response.state); target.reset(); field(target, "version").value = "v1"; showToast("Funding document added.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not add document."); }
});

form("data-room-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/data-rooms", { method: "POST", body: JSON.stringify({ name: value(target, "name"), roundId: nullableId(target, "roundId") }) });
    render(response.state); target.reset(); showToast("Data room created with 8 standard folders.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not create data room."); }
});

form("data-room-document-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/data-room-documents", { method: "POST", body: JSON.stringify({
      folderId: nullableId(target, "folderId"), documentId: nullableId(target, "documentId"), title: value(target, "title"),
      status: value(target, "status"), expiresAt: nullableDate(target, "expiresAt"), notes: value(target, "notes"),
    }) });
    render(response.state); target.reset(); showToast("Data room item added.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not add data room item."); }
});

form("diligence-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/due-diligence", { method: "POST", body: JSON.stringify({
      investorId: nullableId(target, "investorId"), roundId: nullableId(target, "roundId"), documentId: nullableId(target, "documentId"), owner: value(target, "owner"),
      deadline: nullableDate(target, "deadline"), status: value(target, "status"), request: value(target, "request"), responseNotes: value(target, "responseNotes"),
    }) });
    render(response.state); target.reset(); field(target, "owner").value = "Owner"; showToast("Due diligence request added.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not add diligence request."); }
});

form("term-sheet-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/term-sheets", { method: "POST", body: JSON.stringify({
      investorId: nullableId(target, "investorId"), roundId: nullableId(target, "roundId"), investmentAmountCents: cents(target, "investmentAmount"),
      preMoneyValuationCents: optionalMoney(target, "preMoneyValuation"), equityPct: value(target, "equityPct") ? numberValue(target, "equityPct") : null,
      liquidationPreference: value(target, "liquidationPreference"), boardSeat: value(target, "boardSeat"), proRata: value(target, "proRata"), vesting: value(target, "vesting"),
      optionPool: value(target, "optionPool"), exclusivity: value(target, "exclusivity"), closingConditions: value(target, "closingConditions"), targetCloseDate: nullableDate(target, "targetCloseDate"), status: value(target, "status"), notes: value(target, "notes"),
    }) });
    render(response.state); target.reset(); showToast("Term sheet saved for comparison. Lawyer review remains required.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not save term sheet."); }
});

form("closing-condition-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/closing-conditions", { method: "POST", body: JSON.stringify({
      termSheetId: nullableId(target, "termSheetId"), title: value(target, "title"), owner: value(target, "owner") || "Owner",
      dueDate: nullableDate(target, "dueDate"), status: value(target, "status"), evidenceNote: value(target, "evidenceNote"),
    }) });
    render(response.state); target.reset(); field(target, "owner").value = "Owner"; showToast("Closing condition added.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not add closing condition."); }
});

form("outcome-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/outcomes", { method: "POST", body: JSON.stringify({
      track: value(target, "track"), applicationId: nullableId(target, "applicationId"), investorId: nullableId(target, "investorId"), roundId: nullableId(target, "roundId"),
      status: value(target, "status"), approvedAmountCents: cents(target, "approvedAmount"), committedAmountCents: cents(target, "committedAmount"), receivedAmountCents: cents(target, "receivedAmount"),
      receivedDate: nullableDate(target, "receivedDate"), commitmentEvidence: value(target, "commitmentEvidence"), receiptEvidence: value(target, "receiptEvidence"), conditions: value(target, "conditions"), lossReason: value(target, "lossReason"), feedback: value(target, "feedback"), retryDate: nullableDate(target, "retryDate"),
    }) });
    render(response.state); target.reset(); showToast("Funding outcome recorded. Capital dashboard updated.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not record funding outcome."); }
});

form("receipt-tranche-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/receipt-tranches", { method: "POST", body: JSON.stringify({
      outcomeId: nullableId(target, "outcomeId"), amountCents: cents(target, "amount"), receivedDate: value(target, "receivedDate"),
      receiptEvidence: value(target, "receiptEvidence"), note: value(target, "note"), status: "received", voidReason: "",
    }) });
    render(response.state); target.reset(); showToast("Receipt tranche recorded. Funding Outcome received total reconciled.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not record receipt tranche."); }
});

form("receipt-expectation-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/receipt-expectations", { method: "POST", body: JSON.stringify({
      outcomeId: nullableId(target, "outcomeId"), amountCents: cents(target, "amount"), expectedDate: value(target, "expectedDate"),
      basisNote: value(target, "basisNote"), owner: value(target, "owner") || "Owner", note: value(target, "note"), status: "expected", cancellationReason: "",
    }) });
    render(response.state); target.reset(); field(target, "owner").value = "Owner"; showToast("Committed-capital arrival expectation recorded. It remains a plan until cash is actually received.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not record arrival expectation."); }
});

form("receipt-expectation-allocation-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/receipt-expectation-allocations", { method: "POST", body: JSON.stringify({
      expectationId: nullableId(target, "expectationId"), trancheId: nullableId(target, "trancheId"), amountCents: cents(target, "amount"),
      note: value(target, "note"), status: "active", voidReason: "",
    }) });
    render(response.state); target.reset(); showToast("Actual receipt explicitly linked to the arrival expectation. No automatic matching was used.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not link actual receipt to the expectation."); }
});

form("grants-gov-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  const submit = target.querySelector<HTMLButtonElement>("button[type='submit']");
  clearFormErrors(target);
  if (submit) submit.disabled = true;
  setGrantsGovStatus("checking", "Checking Grants.gov…", "Looking up current posted and forecasted opportunities. Your saved financing work stays available while this runs.");
  try {
    const response = await requestJson<{ summary: { imported: number; updated: number; skipped: number }; state: BootstrapState }>("/api/sources/grants-gov/search", {
      method: "POST",
      body: JSON.stringify({ keyword: value(target, "keyword"), rows: numberValue(target, "rows") }),
    });
    render(response.state);
    setGrantsGovStatus(
      "success",
      "Official grants checked",
      `${response.summary.imported} new, ${response.summary.updated} refreshed, ${response.summary.skipped} skipped. Your saved pursuit decisions were preserved.`,
    );
    showToast(`Official grants refreshed: ${response.summary.imported} new, ${response.summary.updated} updated, ${response.summary.skipped} skipped.`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.code === "SOURCE_UNAVAILABLE") {
      setGrantsGovStatus(
        "error",
        "Grants.gov is temporarily unavailable",
        "Your saved opportunities and pursuit decisions were not changed. Keep working with what is already here, or try the official search again.",
        true,
      );
      showToast("Official grant search unavailable — saved opportunities are unchanged.");
    } else {
      showFormRequestError(target, error);
    }
  } finally {
    if (submit) submit.disabled = false;
  }
});

element<HTMLButtonElement>("#retry-grants-gov").addEventListener("click", () => {
  form("grants-gov-form").requestSubmit();
});

form("opportunity-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  clearFormErrors(target);
  const collateral = field(target, "collateralRequired");
  const personalGuarantee = field(target, "personalGuaranteeRequired");
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/opportunities", {
      method: "POST",
      body: JSON.stringify({
        type: value(target, "type"), title: value(target, "title"), provider: value(target, "provider"), sourceUrl: value(target, "sourceUrl"),
        description: value(target, "description"), geography: value(target, "geography"), sectors: value(target, "sectors"), stages: value(target, "stages"),
        amountMinCents: cents(target, "amountMin"), amountMaxCents: cents(target, "amountMax"), deadline: nullableDate(target, "deadline"), decision: "new",
        grantProgramType: value(target, "grantProgramType"), grantEligibility: value(target, "grantEligibility"), matchFundingRequiredCents: cents(target, "matchFundingRequired"),
        loanTermMonths: value(target, "loanTermMonths") ? Math.round(numberValue(target, "loanTermMonths")) : null,
        annualInterestRatePct: value(target, "annualInterestRatePct") ? numberValue(target, "annualInterestRatePct") : null,
        loanFeesCents: cents(target, "loanFees"), minimumDscr: value(target, "minimumDscr") ? numberValue(target, "minimumDscr") : null,
        collateralRequired: collateral instanceof HTMLInputElement ? collateral.checked : false,
        personalGuaranteeRequired: personalGuarantee instanceof HTMLInputElement ? personalGuarantee.checked : false,
        investorId: nullableId(target, "investorId"), fundId: nullableId(target, "fundId"), investorType: value(target, "investorType"),
      }),
    });
    render(response.state);
    target.reset();
    showToast("Opportunity added and evaluated against current facts.");
  } catch (error) { showFormRequestError(target, error, opportunityFieldMap); }
});

form("fund-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/funds", {
      method: "POST",
      body: JSON.stringify({ name: value(target, "name"), fundType: value(target, "fundType"), website: value(target, "website"), geography: value(target, "geography"), portfolio: value(target, "portfolio"), notes: value(target, "notes") }),
    });
    render(response.state);
    target.reset();
    showToast("Fund saved.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not save fund."); }
});

form("investor-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  clearFormErrors(target);
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/investors", {
      method: "POST",
      body: JSON.stringify({
        name: value(target, "name"), fundId: nullableId(target, "fundId"), roundId: nullableId(target, "roundId"),
        stage: value(target, "stage"), priority: value(target, "priority"), relationship: value(target, "relationship"),
        warmIntroSource: value(target, "warmIntroSource"), chequeMinCents: cents(target, "chequeMin"), chequeMaxCents: cents(target, "chequeMax"),
        geography: value(target, "geography"), sectors: value(target, "sectors"), stages: value(target, "stages"), portfolio: value(target, "portfolio"),
        lastContactDate: nullableDate(target, "lastContactDate"), nextFollowUpDate: nullableDate(target, "nextFollowUpDate"),
        nextAction: value(target, "nextAction"), owner: value(target, "owner"), notes: value(target, "notes"), rejectionReason: "",
      }),
    });
    render(response.state);
    target.reset();
    field(target, "owner").value = "Owner";
    showToast("Investor added to the equity pipeline.");
  } catch (error) { showFormRequestError(target, error, investorFieldMap); }
});

form("contact-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/contacts", {
      method: "POST",
      body: JSON.stringify({ investorId: nullableId(target, "investorId"), fundId: nullableId(target, "fundId"), name: value(target, "name"), title: value(target, "title"), email: value(target, "email"), phone: value(target, "phone"), linkedinUrl: value(target, "linkedinUrl"), notes: value(target, "notes") }),
    });
    render(response.state);
    target.reset();
    showToast("Contact saved.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not save contact."); }
});

form("thesis-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/investment-theses", {
      method: "POST",
      body: JSON.stringify({ fundId: nullableId(target, "fundId"), investorId: nullableId(target, "investorId"), sectors: value(target, "sectors"), stages: value(target, "stages"), geography: value(target, "geography"), chequeMinCents: cents(target, "chequeMin"), chequeMaxCents: cents(target, "chequeMax"), thesis: value(target, "thesis") }),
    });
    render(response.state);
    target.reset();
    showToast("Investment thesis saved.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not save investment thesis."); }
});

form("followup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/follow-ups", {
      method: "POST",
      body: JSON.stringify({ investorId: nullableId(target, "investorId"), dueDate: nullableDate(target, "dueDate"), status: "pending", channel: value(target, "channel"), action: value(target, "action"), result: "", owner: value(target, "owner") }),
    });
    render(response.state);
    target.reset();
    field(target, "owner").value = "Owner";
    showToast("Follow-up scheduled. Today's Focus updated.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not schedule follow-up."); }
});

form("meeting-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/meetings", {
      method: "POST",
      body: JSON.stringify({ investorId: nullableId(target, "investorId"), roundId: nullableId(target, "roundId"), meetingAt: isoDateTime(target, "meetingAt"), meetingType: value(target, "meetingType"), status: "scheduled", attendees: value(target, "attendees"), objective: value(target, "objective"), outcome: "", nextAction: "" }),
    });
    render(response.state);
    target.reset();
    showToast("Financing meeting scheduled.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not schedule meeting."); }
});

element<HTMLButtonElement>("#recalculate-matches").addEventListener("click", async () => {
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/opportunities/recalculate", { method: "POST", body: "{}" });
    render(response.state);
    showToast("Opportunity matches recalculated from current company facts.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not recalculate matches."); }
});

element<HTMLButtonElement>("#recalculate-strategy").addEventListener("click", async () => {
  const firstStrategy = !state?.strategy;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/capital-strategy/recalculate", { method: "POST", body: "{}" });
    render(response.state);
    showToast(firstStrategy ? "Capital strategy ready. Next: find a funding target." : "Capital strategy recalculated from current facts.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not calculate strategy."); }
});

const localeSelect = element<HTMLSelectElement>("#locale-select");
localeSelect.value = getLocale();
applyTranslations(document);
localeSelect.addEventListener("change", () => {
  setLocale(localeSelect.value as SupportedLocale);
  if (state) render(state);
  else applyTranslations(document);
  document.querySelectorAll<HTMLElement>(progressiveModuleSelector).forEach((module) => syncWorkspaceModuleToggle(module));
  syncOwnerReturnControl();
});

initializeProgressiveDisclosure();

document.addEventListener("reset", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLFormElement)) return;
  window.requestAnimationFrame(() => {
    rememberRenderedControlBaseline(target);
    syncOwnerReturnControl();
  });
});

document.addEventListener("input", (event) => {
  if (event.target instanceof Element && event.target.closest(progressiveModuleSelector)) syncOwnerReturnControl();
});
document.addEventListener("change", (event) => {
  if (event.target instanceof Element && event.target.closest(progressiveModuleSelector)) syncOwnerReturnControl();
});

document.querySelectorAll<HTMLElement>("[data-scroll]").forEach((control) => {
  control.addEventListener("click", () => navigateToWorkspaceTarget(control.dataset.scroll ?? ""));
});

window.addEventListener("hashchange", () => resumeWorkspaceLocation(true));

element<HTMLButtonElement>("#return-to-overview").addEventListener("click", () => returnToOwnerOverview());

element<HTMLButtonElement>("#refresh-workspace").addEventListener("click", async () => {
  try {
    await refreshWorkspacePreservingDrafts();
  } catch (error) {
    setConnection("Could not refresh", true);
    showToast(error instanceof Error ? error.message : "Could not refresh the latest funding state.");
  }
});

async function boot(): Promise<void> {
  try {
    const initial = await requestJson<BootstrapState>("/api/bootstrap");
    render(initial);
    resumeWorkspaceLocation();
    setConnection("Connected");
  } catch (error) {
    setConnection("Offline", true);
    showToast(error instanceof Error ? error.message : "BossAI Funding could not load.");
  }
}

void boot();
