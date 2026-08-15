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

export interface TodayFocus {
  title: string;
  reason: string;
  nextStep: string;
  urgency: "setup" | "normal" | "soon" | "urgent";
  track: FundingTrack | null;
  actionId: number | null;
}

export interface TrackSummary {
  track: FundingTrack;
  potentialAmountCents: number;
  activeCount: number;
  latestAction: string;
  risk: string;
  nextStep: string;
}

export interface DashboardProjection {
  targetAmountCents: number;
  receivedAmountCents: number;
  committedAmountCents: number;
  activePipelineCents: number;
  remainingGapCents: number;
  tracks: TrackSummary[];
  todayFocus: TodayFocus;
}

export interface BootstrapState {
  companyProfile: CompanyProfile | null;
  fundingGoal: FundingGoal | null;
  rounds: FundraisingRound[];
  actions: FundingAction[];
  strategy: CapitalStrategy | null;
  dashboard: DashboardProjection;
}
