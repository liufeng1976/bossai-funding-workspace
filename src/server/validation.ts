import type {
  CompanyProfileInput,
  FundingActionInput,
  FundingActionStage,
  FundingGoalInput,
  FundingTrack,
  FundraisingRoundInput,
  Priority,
} from "../domain/types.ts";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Request body must be a JSON object.");
  return value as Record<string, unknown>;
}

function text(source: Record<string, unknown>, key: string, required = false): string {
  const value = source[key];
  if (value === undefined || value === null) {
    if (required) throw new Error(`${key} is required.`);
    return "";
  }
  if (typeof value !== "string") throw new Error(`${key} must be text.`);
  const normalized = value.trim();
  if (required && !normalized) throw new Error(`${key} is required.`);
  return normalized;
}

function money(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`${key} must be a non-negative number.`);
  return Math.round(value);
}

function numeric(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${key} must be a number.`);
  return value;
}

function nullableInteger(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`${key} must be an integer or null.`);
  return value;
}

function nullableDate(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${key} must use YYYY-MM-DD.`);
  return value;
}

function boolean(source: Record<string, unknown>, key: string): boolean {
  const value = source[key];
  if (typeof value !== "boolean") throw new Error(`${key} must be true or false.`);
  return value;
}

function enumValue<T extends string>(source: Record<string, unknown>, key: string, values: readonly T[]): T {
  const value = source[key];
  if (typeof value !== "string" || !values.includes(value as T)) throw new Error(`${key} has an unsupported value.`);
  return value as T;
}

export function parseCompanyProfile(value: unknown): CompanyProfileInput {
  const source = object(value);
  return {
    name: text(source, "name", true),
    industry: text(source, "industry", true),
    stage: text(source, "stage", true),
    geography: text(source, "geography", true),
    foundedYear: nullableInteger(source, "foundedYear"),
    annualRevenueCents: money(source, "annualRevenueCents"),
    mrrCents: money(source, "mrrCents"),
    arrCents: money(source, "arrCents"),
    growthRatePct: numeric(source, "growthRatePct"),
    grossMarginPct: numeric(source, "grossMarginPct"),
    cashBalanceCents: money(source, "cashBalanceCents"),
    monthlyBurnCents: money(source, "monthlyBurnCents"),
    runwayMonths: numeric(source, "runwayMonths"),
    teamSize: Math.max(0, Math.round(numeric(source, "teamSize"))),
    product: text(source, "product"),
    businessModel: text(source, "businessModel"),
    fundingHistory: text(source, "fundingHistory"),
    existingDebtCents: money(source, "existingDebtCents"),
    capTableSummary: text(source, "capTableSummary"),
    useOfFunds: text(source, "useOfFunds", true),
    targetFundingCents: money(source, "targetFundingCents"),
    targetFundingDate: nullableDate(source, "targetFundingDate"),
  };
}

export function parseFundingGoal(value: unknown): FundingGoalInput {
  const source = object(value);
  return {
    targetAmountCents: money(source, "targetAmountCents"),
    needByDate: nullableDate(source, "needByDate"),
    purpose: text(source, "purpose", true),
    acceptsDilution: boolean(source, "acceptsDilution"),
    maxMonthlyDebtServiceCents: money(source, "maxMonthlyDebtServiceCents"),
    growthPlan: text(source, "growthPlan"),
  };
}

export function parseRound(value: unknown): FundraisingRoundInput {
  const source = object(value);
  return {
    roundName: text(source, "roundName", true),
    roundType: text(source, "roundType", true),
    targetAmountCents: money(source, "targetAmountCents"),
    minimumAmountCents: money(source, "minimumAmountCents"),
    committedAmountCents: money(source, "committedAmountCents"),
    receivedAmountCents: money(source, "receivedAmountCents"),
    preMoneyValuationCents: source.preMoneyValuationCents == null ? null : money(source, "preMoneyValuationCents"),
    postMoneyValuationCents: source.postMoneyValuationCents == null ? null : money(source, "postMoneyValuationCents"),
    targetCloseDate: nullableDate(source, "targetCloseDate"),
    status: enumValue(source, "status", ["planning", "active", "closing", "closed", "paused"] as const),
    useOfFunds: text(source, "useOfFunds", true),
  };
}

export function parseAction(value: unknown): FundingActionInput {
  const source = object(value);
  const stages: readonly FundingActionStage[] = [
    "discover", "saved", "prepare", "ready", "applied", "contacted", "replied", "meeting",
    "partner-meeting", "due-diligence", "term-sheet", "negotiation", "committed", "approved",
    "closed", "received", "rejected", "passed", "no-response", "not-a-fit",
  ];
  return {
    track: enumValue<FundingTrack>(source, "track", ["grant", "debt", "equity"]),
    title: text(source, "title", true),
    amountCents: money(source, "amountCents"),
    stage: enumValue(source, "stage", stages),
    priority: enumValue<Priority>(source, "priority", ["low", "medium", "high", "critical"]),
    deadline: nullableDate(source, "deadline"),
    nextStep: text(source, "nextStep", true),
    owner: text(source, "owner") || "Owner",
    result: text(source, "result"),
  };
}
