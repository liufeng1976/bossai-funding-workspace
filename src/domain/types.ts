export type FundingTrack = "grant" | "debt" | "equity";
export type Priority = "low" | "medium" | "high" | "critical";

export interface CompanyProfileInput {
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

export interface CompanyProfile extends CompanyProfileInput {
  id: number;
  updatedAt: string;
}

export interface FundingGoalInput {
  targetAmountCents: number;
  needByDate: string | null;
  purpose: string;
  acceptsDilution: boolean;
  maxMonthlyDebtServiceCents: number;
  growthPlan: string;
}

export interface FundingGoal extends FundingGoalInput {
  id: number;
  updatedAt: string;
}

export interface FundraisingRoundInput {
  roundName: string;
  roundType: string;
  targetAmountCents: number;
  minimumAmountCents: number;
  committedAmountCents: number;
  receivedAmountCents: number;
  preMoneyValuationCents: number | null;
  postMoneyValuationCents: number | null;
  targetCloseDate: string | null;
  status: "planning" | "active" | "closing" | "closed" | "paused";
  useOfFunds: string;
}

export interface FundraisingRound extends FundraisingRoundInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export type FundingActionStage =
  | "discover"
  | "saved"
  | "prepare"
  | "ready"
  | "applied"
  | "contacted"
  | "replied"
  | "meeting"
  | "partner-meeting"
  | "due-diligence"
  | "term-sheet"
  | "negotiation"
  | "committed"
  | "approved"
  | "closed"
  | "received"
  | "rejected"
  | "passed"
  | "no-response"
  | "not-a-fit";

export interface FundingActionInput {
  track: FundingTrack;
  title: string;
  amountCents: number;
  stage: FundingActionStage;
  priority: Priority;
  deadline: string | null;
  nextStep: string;
  owner: string;
  result: string;
}

export interface FundingAction extends FundingActionInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyAllocation {
  track: FundingTrack;
  amountCents: number;
  sharePct: number;
  reason: string;
  primaryRisk: string;
  order: number;
}

export interface CapitalStrategy {
  id: number | null;
  totalNeedCents: number;
  allocations: StrategyAllocation[];
  unfundedResidualCents: number;
  assumptions: string[];
  warnings: string[];
  generatedAt: string;
}

export interface CapitalStrategyFreshness {
  state: "not-created" | "no-goal" | "current" | "recalculate";
  reason: string;
  generatedAt: string | null;
  currentNeedCents: number;
  autoSyncEligible: boolean;
}

export type TodayFocusEntityType =
  | "funding-action"
  | "opportunity"
  | "investor"
  | "investor-follow-up"
  | "financing-meeting"
  | "funding-application"
  | "due-diligence"
  | "term-sheet"
  | "closing-condition"
  | "funding-outcome"
  | "receipt-expectation"
  | null;

export interface TodayFocus {
  title: string;
  reason: string;
  nextStep: string;
  urgency: "setup" | "normal" | "soon" | "urgent";
  track: FundingTrack | null;
  actionId: number | null;
  entityType: TodayFocusEntityType;
  entityId: number | null;
  workStatus: string | null;
  workOwner: string | null;
  workDueAt: string | null;
  destination: "setup" | "strategy" | "actions" | "equity" | "opportunities" | "execution";
}

export type CapitalPipelineEvidenceKind = "term-sheet" | "application" | "investor" | "opportunity" | "funding-action";

export interface CapitalPipelineItem {
  key: string;
  track: FundingTrack;
  kind: CapitalPipelineEvidenceKind;
  amountCents: number;
  label: string;
  status: string;
  risk: string;
  nextStep: string;
  entityType: TodayFocusEntityType;
  entityId: number | null;
  destination: "actions" | "equity" | "opportunities" | "execution";
  updatedAt: string;
}

export interface TrackSummary {
  track: FundingTrack;
  potentialAmountCents: number;
  activeCount: number;
  latestAction: string;
  risk: string;
  nextStep: string;
  evidenceKinds: CapitalPipelineEvidenceKind[];
  pipelineExplanation: string;
}

export type CapitalBlockerSeverity = "critical" | "high" | "normal";

export interface CapitalBlocker {
  key: string;
  severity: CapitalBlockerSeverity;
  title: string;
  reason: string;
  nextStep: string;
  track: FundingTrack | null;
  entityType: TodayFocusEntityType;
  entityId: number | null;
  destination: "setup" | "actions" | "equity" | "opportunities" | "execution";
}

export type CapitalCoverageStatus = "no-target" | "cash-covered" | "secured" | "pipeline-covered" | "pipeline-shortfall";

export type ClosingPlanEvidenceKind = CapitalPipelineEvidenceKind | "recorded-commitment";

export interface ClosingPlanItem {
  key: string;
  track: FundingTrack | null;
  amountCents: number;
  evidenceKind: ClosingPlanEvidenceKind;
  status: string;
  title: string;
  whyClose: string;
  remainingSteps: string[];
  entityType: TodayFocusEntityType;
  entityId: number | null;
  destination: "actions" | "equity" | "opportunities" | "execution";
}

export interface CapitalCoveragePlan {
  status: CapitalCoverageStatus;
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

export type CapitalTimingStatus = "no-target-date" | "cash-covered" | "past-need-date" | "runway-before-need" | "near-term" | "dated";

export type CapitalTimingMilestoneKind =
  | "funding-need"
  | "funding-action"
  | "opportunity-deadline"
  | "investor-follow-up"
  | "financing-meeting"
  | "funding-application"
  | "due-diligence"
  | "closing-condition"
  | "term-sheet-close"
  | "round-close"
  | "expected-receipt";

export interface CapitalTimingMilestone {
  key: string;
  kind: CapitalTimingMilestoneKind;
  date: string;
  daysAway: number;
  title: string;
  track: FundingTrack | null;
  status: "overdue" | "due-soon" | "upcoming";
  entityType: TodayFocusEntityType;
  entityId: number | null;
  destination: "setup" | "actions" | "equity" | "opportunities" | "execution";
}

export interface UndatedCapitalItem {
  key: string;
  title: string;
  reason: string;
  track: FundingTrack | null;
  entityType: TodayFocusEntityType;
  entityId: number | null;
  destination: "actions" | "equity" | "opportunities" | "execution";
}

export interface CapitalTimingPlan {
  status: CapitalTimingStatus;
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

export interface DashboardProjection {
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

export type EquityPipelineStage =
  | "target"
  | "research"
  | "ready-to-contact"
  | "contacted"
  | "replied"
  | "meeting"
  | "partner-meeting"
  | "due-diligence"
  | "term-sheet"
  | "negotiation"
  | "committed"
  | "closed"
  | "passed"
  | "no-response"
  | "not-a-fit";

export type RelationshipStrength = "none" | "cold" | "warm" | "strong";

export interface FundInput {
  name: string;
  fundType: string;
  website: string;
  geography: string;
  portfolio: string;
  notes: string;
}

export interface Fund extends FundInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentThesisInput {
  fundId: number | null;
  investorId: number | null;
  sectors: string;
  stages: string;
  geography: string;
  chequeMinCents: number;
  chequeMaxCents: number;
  thesis: string;
}

export interface InvestmentThesis extends InvestmentThesisInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvestorInput {
  name: string;
  fundId: number | null;
  roundId: number | null;
  stage: EquityPipelineStage;
  priority: Priority;
  relationship: RelationshipStrength;
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

export interface Investor extends InvestorInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInput {
  investorId: number | null;
  fundId: number | null;
  name: string;
  title: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  notes: string;
}

export interface Contact extends ContactInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinancingMeetingInput {
  investorId: number;
  roundId: number | null;
  meetingAt: string;
  meetingType: "intro" | "pitch" | "partner" | "diligence" | "terms" | "other";
  status: "scheduled" | "completed" | "cancelled";
  attendees: string;
  objective: string;
  outcome: string;
  nextAction: string;
}

export interface FinancingMeeting extends FinancingMeetingInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvestorFollowUpInput {
  investorId: number;
  dueDate: string;
  status: "pending" | "completed" | "cancelled";
  channel: "email" | "call" | "meeting" | "intro" | "other";
  action: string;
  result: string;
  owner: string;
}

export interface InvestorFollowUp extends InvestorFollowUpInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface EquityPipelineSummary {
  activeInvestorCount: number;
  committedInvestorCount: number;
  closedInvestorCount: number;
  resolvedInvestorCount: number;
  totalPotentialCents: number;
  pendingFollowUpCount: number;
  nextMeetingAt: string | null;
  stageCounts: Record<EquityPipelineStage, number>;
}

export type FundingOpportunityType = "grant" | "loan" | "investor";
export type OpportunityDecision = "new" | "saved" | "pursuing" | "dismissed";

export interface FundingOpportunityInput {
  type: FundingOpportunityType;
  title: string;
  provider: string;
  sourceUrl: string;
  description: string;
  geography: string;
  sectors: string;
  stages: string;
  amountMinCents: number;
  amountMaxCents: number;
  deadline: string | null;
  decision: OpportunityDecision;
  grantProgramType: string;
  grantEligibility: string;
  matchFundingRequiredCents: number;
  loanTermMonths: number | null;
  annualInterestRatePct: number | null;
  loanFeesCents: number;
  minimumDscr: number | null;
  collateralRequired: boolean;
  personalGuaranteeRequired: boolean;
  investorId: number | null;
  fundId: number | null;
  investorType: string;
}

export interface FundingOpportunity extends FundingOpportunityInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export type OpportunityDeadlineState = "undated" | "open" | "due-soon" | "deadline-passed";

export interface OpportunityDeadlineViability {
  opportunityId: number;
  deadlineState: OpportunityDeadlineState;
  deadline: string | null;
  daysToDeadline: number | null;
  deadlineViable: boolean;
  reason: string;
  recovery: string;
}

export type FundingSourceKind = "manual" | "official-public" | "licensed";

export interface FundingSourceRecordInput {
  opportunityId: number;
  providerKey: string;
  sourceKind: FundingSourceKind;
  externalId: string;
  externalNumber: string;
  canonicalUrl: string;
  apiEndpoint: string;
  termsUrl: string;
  fetchedAt: string;
  attribution: string;
}

export interface FundingSourceRecord extends FundingSourceRecordInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface FundingSourceImportSummary {
  providerKey: string;
  keyword: string;
  imported: number;
  updated: number;
  skipped: number;
  fetchedAt: string;
}

export type MatchOutcome = "match" | "partial" | "missing" | "mismatch" | "ineligible";
export interface MatchRuleResult {
  key: string;
  label: string;
  outcome: MatchOutcome;
  explanation: string;
  correctiveAction: string;
}

export interface OpportunityMatch {
  opportunityId: number;
  fit: "strong" | "possible" | "weak" | "ineligible";
  score: number;
  rules: MatchRuleResult[];
  blockers: string[];
  missingFacts: string[];
  nextStep: string;
  evaluatedAt: string;
}

export interface FundingReadinessCheck {
  key: string;
  label: string;
  ready: boolean;
  reason: string;
  nextStep: string;
}

export interface FundingReadiness {
  completionPct: number;
  status: "ready" | "needs-work" | "not-started";
  checks: FundingReadinessCheck[];
  missingFacts: string[];
  nextStep: string;
}

export type FundingApplicationStatus = "draft" | "preparing" | "submitted" | "under-review" | "approved" | "rejected" | "withdrawn" | "funded";

export interface FundingApplicationInput {
  opportunityId: number | null;
  track: FundingTrack;
  title: string;
  requestedAmountCents: number;
  approvedAmountCents: number;
  status: FundingApplicationStatus;
  deadline: string | null;
  submittedDate: string | null;
  decisionDate: string | null;
  owner: string;
  nextAction: string;
  rejectionReason: string;
  notes: string;
}

export interface FundingApplication extends FundingApplicationInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export type FundingDocumentType =
  | "pitch-deck"
  | "executive-summary"
  | "business-plan"
  | "financial-model"
  | "use-of-funds"
  | "funding-memo"
  | "grant-narrative"
  | "loan-package"
  | "investor-update"
  | "due-diligence"
  | "other";

export interface FundingDocumentInput {
  documentType: FundingDocumentType;
  title: string;
  version: string;
  status: "draft" | "in-review" | "ready" | "shared" | "archived";
  roundId: number | null;
  investorId: number | null;
  applicationId: number | null;
  completionPct: number;
  notes: string;
}

export interface FundingDocument extends FundingDocumentInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export type DataRoomCategory = "Corporate" | "Financial" | "Legal" | "Product" | "Customers" | "Team" | "IP" | "Fundraising";

export interface DataRoomInput {
  name: string;
  roundId: number | null;
}

export interface DataRoom extends DataRoomInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface DataRoomFolder {
  id: number;
  dataRoomId: number;
  category: DataRoomCategory;
  createdAt: string;
}

export interface DataRoomDocumentInput {
  folderId: number;
  documentId: number | null;
  title: string;
  status: "missing" | "preparing" | "ready" | "shared" | "expired";
  expiresAt: string | null;
  notes: string;
}

export interface DataRoomDocument extends DataRoomDocumentInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface DataRoomReadiness {
  dataRoomId: number;
  totalDocuments: number;
  readyDocuments: number;
  missingDocuments: number;
  expiredDocuments: number;
  completionPct: number;
  categoryStatus: Array<{ category: DataRoomCategory; total: number; ready: number; missing: number; expired: number }>;
  nextStep: string;
}

export type DueDiligenceStatus = "requested" | "preparing" | "ready" | "shared" | "accepted" | "needs-revision";

export interface DueDiligenceRequestInput {
  investorId: number;
  roundId: number | null;
  documentId: number | null;
  owner: string;
  deadline: string | null;
  status: DueDiligenceStatus;
  request: string;
  responseNotes: string;
}

export interface DueDiligenceRequest extends DueDiligenceRequestInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface TermSheetInput {
  investorId: number;
  roundId: number | null;
  investmentAmountCents: number;
  preMoneyValuationCents: number | null;
  equityPct: number | null;
  liquidationPreference: string;
  boardSeat: string;
  proRata: string;
  vesting: string;
  optionPool: string;
  exclusivity: string;
  closingConditions: string;
  targetCloseDate?: string | null;
  status: "received" | "reviewing" | "negotiating" | "accepted" | "rejected" | "expired";
  notes: string;
}

export interface TermSheet extends TermSheetInput {
  id: number;
  targetCloseDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ClosingConditionStatus = "open" | "in-progress" | "satisfied" | "waived";

export interface ClosingConditionInput {
  termSheetId: number;
  title: string;
  owner: string;
  dueDate: string | null;
  status: ClosingConditionStatus;
  evidenceNote: string;
}

export interface ClosingCondition extends ClosingConditionInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface TermSheetComparisonItem {
  termSheetId: number;
  investorName: string;
  investmentAmountCents: number;
  preMoneyValuationCents: number | null;
  estimatedOwnershipPct: number | null;
  economicSummary: string;
  governanceSummary: string;
  cautionFlags: string[];
}

export interface TermSheetComparison {
  items: TermSheetComparisonItem[];
  lawyerReviewRequired: true;
  disclaimer: string;
}

export type FundingOutcomeStatus = "won" | "lost" | "withdrawn" | "closed";

export interface FundingOutcomeEvidenceStatus {
  outcomeId: number;
  commitmentEvidenceRequired: boolean;
  commitmentEvidencePresent: boolean;
  receiptEvidenceRequired: boolean;
  receiptEvidencePresent: boolean;
  receiptTrancheCount: number;
  receiptTrancheAmountCents: number;
  receiptTrancheReconciled: boolean;
  complete: boolean;
  missing: Array<"commitment" | "receipt" | "reconciliation">;
}

export interface FundingOutcomeInput {
  track: FundingTrack;
  applicationId: number | null;
  investorId: number | null;
  roundId: number | null;
  status: FundingOutcomeStatus;
  approvedAmountCents: number;
  committedAmountCents: number;
  receivedAmountCents: number;
  receivedDate: string | null;
  commitmentEvidence?: string;
  receiptEvidence?: string;
  conditions: string;
  lossReason: string;
  feedback: string;
  retryDate: string | null;
}

export interface FundingOutcome extends Omit<FundingOutcomeInput, "commitmentEvidence" | "receiptEvidence"> {
  id: number;
  commitmentEvidence: string;
  receiptEvidence: string;
  createdAt: string;
  updatedAt: string;
}

export type FundingReceiptTrancheStatus = "received" | "voided";

export interface FundingReceiptTrancheInput {
  outcomeId: number;
  amountCents: number;
  receivedDate: string;
  receiptEvidence: string;
  note: string;
  status: FundingReceiptTrancheStatus;
  voidReason: string;
}

export interface FundingReceiptTranche extends FundingReceiptTrancheInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export type FundingReceiptExpectationStatus = "expected" | "cancelled";

export interface FundingReceiptExpectationInput {
  outcomeId: number;
  amountCents: number;
  expectedDate: string;
  basisNote: string;
  owner: string;
  note: string;
  status: FundingReceiptExpectationStatus;
  cancellationReason: string;
}

export interface FundingReceiptExpectation extends FundingReceiptExpectationInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export type FundingReceiptExpectationAllocationStatus = "active" | "voided";

export interface FundingReceiptExpectationAllocationInput {
  expectationId: number;
  trancheId: number;
  amountCents: number;
  note: string;
  status: FundingReceiptExpectationAllocationStatus;
  voidReason: string;
}

export interface FundingReceiptExpectationAllocation extends FundingReceiptExpectationAllocationInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export type FundingReceiptExpectationFulfillmentStatus =
  | "cancelled"
  | "unfulfilled"
  | "partial"
  | "fulfilled"
  | "overallocated"
  | "invalid-receipt";

export type FundingReceiptAllocationReconciliationIssueKind =
  | "cancelled-expectation"
  | "missing-tranche"
  | "voided-tranche"
  | "cross-outcome"
  | "tranche-overallocated"
  | "expectation-overallocated";

export interface FundingReceiptAllocationReconciliationIssue {
  key: string;
  kind: FundingReceiptAllocationReconciliationIssueKind;
  expectationIds: number[];
  trancheId: number | null;
  allocationIds: number[];
  recordedAllocatedAmountCents: number;
  supportedAmountCents: number;
  requiredReductionCents: number;
  reason: string;
}

export interface FundingReceiptExpectationFulfillment {
  expectationId: number;
  expectedAmountCents: number;
  allocatedAmountCents: number;
  invalidAllocatedAmountCents: number;
  remainingAmountCents: number;
  activeAllocationCount: number;
  reconciliationAllocationIds: number[];
  reconciliationIssues: FundingReceiptAllocationReconciliationIssue[];
  status: FundingReceiptExpectationFulfillmentStatus;
}

export type FundingReceiptScheduleStatus = "no-outstanding-commitment" | "unscheduled" | "partial" | "balanced" | "over-scheduled" | "allocation-error";

export interface FundingReceiptScheduleSummary {
  outcomeId: number;
  committedAmountCents: number;
  receivedAmountCents: number;
  outstandingAmountCents: number;
  activeExpectedAmountCents: number;
  unscheduledAmountCents: number;
  overScheduledAmountCents: number;
  activeExpectationCount: number;
  overdueExpectationCount: number;
  nextExpectedDate: string | null;
  status: FundingReceiptScheduleStatus;
}

export type FundingActivityCategory =
  | "setup"
  | "strategy"
  | "opportunity"
  | "equity"
  | "application"
  | "document"
  | "data-room"
  | "due-diligence"
  | "term-sheet"
  | "outcome"
  | "continuity";

export interface FundingActivityInput {
  category: FundingActivityCategory;
  action: string;
  title: string;
  summary: string;
  entityType: string;
  entityId: number | null;
  track: FundingTrack | null;
  amountCents: number | null;
}

export interface FundingActivity extends FundingActivityInput {
  id: number;
  occurredAt: string;
}

export interface BackupRecord {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  kind: "manual" | "pre-restore";
}

export type OwnerJourneyStepKey = "capital-plan" | "find-money" | "decide" | "execute" | "protect";

export interface OwnerJourneyStep {
  key: OwnerJourneyStepKey;
  label: string;
  complete: boolean;
  reason: string;
  nextStep: string;
  destination: "setup" | "opportunities" | "actions" | "equity" | "execution" | "continuity";
}

export interface OwnerJourneyProgress {
  completionPct: number;
  completedSteps: number;
  totalSteps: number;
  currentStepKey: OwnerJourneyStepKey | null;
  steps: OwnerJourneyStep[];
}

export interface IdentityBoundaryProjection {
  identityMode: "local-owner";
  authenticationAuthority: "external-required";
  tenantIsolation: "local-workspace-scoped";
  remoteAccess: "blocked";
  workspaceId: string;
  requiredExternalClaims: Array<"subject" | "tenantId" | "roles" | "issuer" | "authenticatedAt">;
  productionAuthenticationReady: false;
  tenantScopedPersistenceReady: true;
  productionAuthorizationReady: false;
}

export interface ContinuityStatus {
  schemaVersion: number;
  accessMode: "local-loopback";
  exportAvailable: boolean;
  backupAvailable: boolean;
  restoreAvailable: boolean;
  latestBackup: BackupRecord | null;
  backupCount: number;
}

export interface FundingExportSnapshot {
  product: "BossAI Funding";
  schemaVersion: number;
  workspaceId: string;
  tenantId: string;
  exportedAt: string;
  tables: Record<string, Array<Record<string, unknown>>>;
}

export interface BootstrapState {
  workspaceRevision: number;
  companyProfile: CompanyProfile | null;
  fundingGoal: FundingGoal | null;
  rounds: FundraisingRound[];
  actions: FundingAction[];
  strategy: CapitalStrategy | null;
  strategyFreshness: CapitalStrategyFreshness;
  funds: Fund[];
  investors: Investor[];
  contacts: Contact[];
  investmentTheses: InvestmentThesis[];
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
  identityBoundary: IdentityBoundaryProjection;
  ownerJourney: OwnerJourneyProgress;
  dashboard: DashboardProjection;
}
