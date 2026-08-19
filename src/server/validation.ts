import type {
  ClosingConditionInput,
  CompanyProfileInput,
  ContactInput,
  DataRoomDocumentInput,
  DataRoomInput,
  DueDiligenceRequestInput,
  FinancingMeetingInput,
  FundInput,
  FundingApplicationInput,
  FundingDocumentInput,
  FundingOutcomeInput,
  FundingReceiptTrancheInput,
  FundingReceiptExpectationAllocationInput,
  FundingReceiptExpectationInput,
  FundingActionInput,
  FundingActionStage,
  FundingGoalInput,
  FundingOpportunityInput,
  FundingTrack,
  FundraisingRoundInput,
  InvestmentThesisInput,
  InvestorFollowUpInput,
  InvestorInput,
  Priority,
  TermSheetInput,
} from "../domain/types.ts";

export class RequestValidationError extends Error {
  readonly field: string | null;

  constructor(message: string, field: string | null = null) {
    super(message);
    this.name = "RequestValidationError";
    this.field = field;
  }
}

function fieldError(key: string, message: string): never {
  throw new RequestValidationError(message, key);
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RequestValidationError("Request body must be a JSON object.");
  return value as Record<string, unknown>;
}

function text(source: Record<string, unknown>, key: string, required = false): string {
  const value = source[key];
  if (value === undefined || value === null) {
    if (required) fieldError(key, `${key} is required.`);
    return "";
  }
  if (typeof value !== "string") fieldError(key, `${key} must be text.`);
  const normalized = value.trim();
  if (required && !normalized) fieldError(key, `${key} is required.`);
  return normalized;
}

function money(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fieldError(key, `${key} must be a non-negative number.`);
  return Math.round(value);
}

function numeric(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) fieldError(key, `${key} must be a number.`);
  return value;
}

function nullableInteger(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value)) fieldError(key, `${key} must be an integer or null.`);
  return value;
}

function nullableNumber(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) fieldError(key, `${key} must be a number or null.`);
  return value;
}

function nullableDate(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fieldError(key, `${key} must use YYYY-MM-DD.`);
  return value;
}

function nullableId(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) fieldError(key, `${key} must be a positive integer or null.`);
  return value;
}

function requiredId(source: Record<string, unknown>, key: string): number {
  const value = nullableId(source, key);
  if (value === null) fieldError(key, `${key} is required.`);
  return value;
}

function dateTime(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) fieldError(key, `${key} must be a valid date/time.`);
  return new Date(value).toISOString();
}

function boolean(source: Record<string, unknown>, key: string): boolean {
  const value = source[key];
  if (typeof value !== "boolean") fieldError(key, `${key} must be true or false.`);
  return value;
}

function enumValue<T extends string>(source: Record<string, unknown>, key: string, values: readonly T[]): T {
  const value = source[key];
  if (typeof value !== "string" || !values.includes(value as T)) fieldError(key, `${key} has an unsupported value.`);
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

export function parseFund(value: unknown): FundInput {
  const source = object(value);
  return {
    name: text(source, "name", true),
    fundType: text(source, "fundType", true),
    website: text(source, "website"),
    geography: text(source, "geography"),
    portfolio: text(source, "portfolio"),
    notes: text(source, "notes"),
  };
}

export function parseInvestor(value: unknown): InvestorInput {
  const source = object(value);
  const chequeMinCents = money(source, "chequeMinCents");
  const chequeMaxCents = money(source, "chequeMaxCents");
  if (chequeMaxCents < chequeMinCents) fieldError("chequeMaxCents", "chequeMaxCents must be greater than or equal to chequeMinCents.");
  return {
    name: text(source, "name", true),
    fundId: nullableId(source, "fundId"),
    roundId: nullableId(source, "roundId"),
    stage: enumValue(source, "stage", ["target", "research", "ready-to-contact", "contacted", "replied", "meeting", "partner-meeting", "due-diligence", "term-sheet", "negotiation", "committed", "closed", "passed", "no-response", "not-a-fit"] as const),
    priority: enumValue<Priority>(source, "priority", ["low", "medium", "high", "critical"]),
    relationship: enumValue(source, "relationship", ["none", "cold", "warm", "strong"] as const),
    warmIntroSource: text(source, "warmIntroSource"),
    chequeMinCents,
    chequeMaxCents,
    geography: text(source, "geography"),
    sectors: text(source, "sectors"),
    stages: text(source, "stages"),
    portfolio: text(source, "portfolio"),
    lastContactDate: nullableDate(source, "lastContactDate"),
    nextFollowUpDate: nullableDate(source, "nextFollowUpDate"),
    nextAction: text(source, "nextAction", true),
    owner: text(source, "owner") || "Owner",
    notes: text(source, "notes"),
    rejectionReason: text(source, "rejectionReason"),
  };
}

export function parseContact(value: unknown): ContactInput {
  const source = object(value);
  const investorId = nullableId(source, "investorId");
  const fundId = nullableId(source, "fundId");
  if (investorId === null && fundId === null) fieldError("investorId", "Contact must belong to an investor or fund.");
  return {
    investorId,
    fundId,
    name: text(source, "name", true),
    title: text(source, "title"),
    email: text(source, "email"),
    phone: text(source, "phone"),
    linkedinUrl: text(source, "linkedinUrl"),
    notes: text(source, "notes"),
  };
}

export function parseInvestmentThesis(value: unknown): InvestmentThesisInput {
  const source = object(value);
  const fundId = nullableId(source, "fundId");
  const investorId = nullableId(source, "investorId");
  if (fundId === null && investorId === null) fieldError("fundId", "Investment thesis must belong to a fund or investor.");
  const chequeMinCents = money(source, "chequeMinCents");
  const chequeMaxCents = money(source, "chequeMaxCents");
  if (chequeMaxCents < chequeMinCents) fieldError("chequeMaxCents", "chequeMaxCents must be greater than or equal to chequeMinCents.");
  return {
    fundId,
    investorId,
    sectors: text(source, "sectors", true),
    stages: text(source, "stages", true),
    geography: text(source, "geography"),
    chequeMinCents,
    chequeMaxCents,
    thesis: text(source, "thesis", true),
  };
}

export function parseMeeting(value: unknown): FinancingMeetingInput {
  const source = object(value);
  return {
    investorId: requiredId(source, "investorId"),
    roundId: nullableId(source, "roundId"),
    meetingAt: dateTime(source, "meetingAt"),
    meetingType: enumValue(source, "meetingType", ["intro", "pitch", "partner", "diligence", "terms", "other"] as const),
    status: enumValue(source, "status", ["scheduled", "completed", "cancelled"] as const),
    attendees: text(source, "attendees"),
    objective: text(source, "objective", true),
    outcome: text(source, "outcome"),
    nextAction: text(source, "nextAction"),
  };
}

export function parseFollowUp(value: unknown): InvestorFollowUpInput {
  const source = object(value);
  const dueDate = nullableDate(source, "dueDate");
  if (!dueDate) fieldError("dueDate", "dueDate is required.");
  return {
    investorId: requiredId(source, "investorId"),
    dueDate,
    status: enumValue(source, "status", ["pending", "completed", "cancelled"] as const),
    channel: enumValue(source, "channel", ["email", "call", "meeting", "intro", "other"] as const),
    action: text(source, "action", true),
    result: text(source, "result"),
    owner: text(source, "owner") || "Owner",
  };
}

export function parseOpportunity(value: unknown): FundingOpportunityInput {
  const source = object(value);
  const amountMinCents = money(source, "amountMinCents");
  const amountMaxCents = money(source, "amountMaxCents");
  if (amountMaxCents < amountMinCents) fieldError("amountMaxCents", "amountMaxCents must be greater than or equal to amountMinCents.");
  const loanTermMonths = nullableInteger(source, "loanTermMonths");
  if (loanTermMonths !== null && loanTermMonths <= 0) fieldError("loanTermMonths", "loanTermMonths must be positive when provided.");
  const annualInterestRatePct = nullableNumber(source, "annualInterestRatePct");
  if (annualInterestRatePct !== null && annualInterestRatePct < 0) fieldError("annualInterestRatePct", "annualInterestRatePct must be non-negative.");
  const minimumDscr = nullableNumber(source, "minimumDscr");
  if (minimumDscr !== null && minimumDscr < 0) fieldError("minimumDscr", "minimumDscr must be non-negative.");
  return {
    type: enumValue(source, "type", ["grant", "loan", "investor"] as const),
    title: text(source, "title", true),
    provider: text(source, "provider", true),
    sourceUrl: text(source, "sourceUrl"),
    description: text(source, "description"),
    geography: text(source, "geography"),
    sectors: text(source, "sectors"),
    stages: text(source, "stages"),
    amountMinCents,
    amountMaxCents,
    deadline: nullableDate(source, "deadline"),
    decision: enumValue(source, "decision", ["new", "saved", "pursuing", "dismissed"] as const),
    grantProgramType: text(source, "grantProgramType"),
    grantEligibility: text(source, "grantEligibility"),
    matchFundingRequiredCents: money(source, "matchFundingRequiredCents"),
    loanTermMonths,
    annualInterestRatePct,
    loanFeesCents: money(source, "loanFeesCents"),
    minimumDscr,
    collateralRequired: boolean(source, "collateralRequired"),
    personalGuaranteeRequired: boolean(source, "personalGuaranteeRequired"),
    investorId: nullableId(source, "investorId"),
    fundId: nullableId(source, "fundId"),
    investorType: text(source, "investorType"),
  };
}

export function parseApplication(value: unknown): FundingApplicationInput {
  const source = object(value);
  return {
    opportunityId: nullableId(source, "opportunityId"),
    track: enumValue<FundingTrack>(source, "track", ["grant", "debt", "equity"]),
    title: text(source, "title", true),
    requestedAmountCents: money(source, "requestedAmountCents"),
    approvedAmountCents: money(source, "approvedAmountCents"),
    status: enumValue(source, "status", ["draft", "preparing", "submitted", "under-review", "approved", "rejected", "withdrawn", "funded"] as const),
    deadline: nullableDate(source, "deadline"),
    submittedDate: nullableDate(source, "submittedDate"),
    decisionDate: nullableDate(source, "decisionDate"),
    owner: text(source, "owner") || "Owner",
    nextAction: text(source, "nextAction", true),
    rejectionReason: text(source, "rejectionReason"),
    notes: text(source, "notes"),
  };
}

export function parseDocument(value: unknown): FundingDocumentInput {
  const source = object(value);
  const completionPct = numeric(source, "completionPct");
  if (completionPct < 0 || completionPct > 100) fieldError("completionPct", "completionPct must be between 0 and 100.");
  return {
    documentType: enumValue(source, "documentType", ["pitch-deck", "executive-summary", "business-plan", "financial-model", "use-of-funds", "funding-memo", "grant-narrative", "loan-package", "investor-update", "due-diligence", "other"] as const),
    title: text(source, "title", true),
    version: text(source, "version", true),
    status: enumValue(source, "status", ["draft", "in-review", "ready", "shared", "archived"] as const),
    roundId: nullableId(source, "roundId"),
    investorId: nullableId(source, "investorId"),
    applicationId: nullableId(source, "applicationId"),
    completionPct: Math.round(completionPct),
    notes: text(source, "notes"),
  };
}

export function parseDataRoom(value: unknown): DataRoomInput {
  const source = object(value);
  return { name: text(source, "name", true), roundId: nullableId(source, "roundId") };
}

export function parseDataRoomDocument(value: unknown): DataRoomDocumentInput {
  const source = object(value);
  return {
    folderId: requiredId(source, "folderId"),
    documentId: nullableId(source, "documentId"),
    title: text(source, "title", true),
    status: enumValue(source, "status", ["missing", "preparing", "ready", "shared", "expired"] as const),
    expiresAt: nullableDate(source, "expiresAt"),
    notes: text(source, "notes"),
  };
}

export function parseDueDiligenceRequest(value: unknown): DueDiligenceRequestInput {
  const source = object(value);
  return {
    investorId: requiredId(source, "investorId"),
    roundId: nullableId(source, "roundId"),
    documentId: nullableId(source, "documentId"),
    owner: text(source, "owner") || "Owner",
    deadline: nullableDate(source, "deadline"),
    status: enumValue(source, "status", ["requested", "preparing", "ready", "shared", "accepted", "needs-revision"] as const),
    request: text(source, "request", true),
    responseNotes: text(source, "responseNotes"),
  };
}

export function parseTermSheet(value: unknown): TermSheetInput {
  const source = object(value);
  const equityPct = nullableNumber(source, "equityPct");
  if (equityPct !== null && (equityPct < 0 || equityPct > 100)) fieldError("equityPct", "equityPct must be between 0 and 100.");
  return {
    investorId: requiredId(source, "investorId"),
    roundId: nullableId(source, "roundId"),
    investmentAmountCents: money(source, "investmentAmountCents"),
    preMoneyValuationCents: source.preMoneyValuationCents == null ? null : money(source, "preMoneyValuationCents"),
    equityPct,
    liquidationPreference: text(source, "liquidationPreference"),
    boardSeat: text(source, "boardSeat"),
    proRata: text(source, "proRata"),
    vesting: text(source, "vesting"),
    optionPool: text(source, "optionPool"),
    exclusivity: text(source, "exclusivity"),
    closingConditions: text(source, "closingConditions"),
    targetCloseDate: nullableDate(source, "targetCloseDate"),
    status: enumValue(source, "status", ["received", "reviewing", "negotiating", "accepted", "rejected", "expired"] as const),
    notes: text(source, "notes"),
  };
}

export function parseClosingCondition(value: unknown): ClosingConditionInput {
  const source = object(value);
  const status = enumValue(source, "status", ["open", "in-progress", "satisfied", "waived"] as const);
  const evidenceNote = text(source, "evidenceNote");
  if ((status === "satisfied" || status === "waived") && !evidenceNote) {
    fieldError("evidenceNote", "evidenceNote is required when a closing condition is satisfied or waived.");
  }
  return {
    termSheetId: requiredId(source, "termSheetId"),
    title: text(source, "title", true),
    owner: text(source, "owner") || "Owner",
    dueDate: nullableDate(source, "dueDate"),
    status,
    evidenceNote,
  };
}

export function parseGrantsGovSearch(value: unknown): { keyword: string; rows: number } {
  const source = object(value);
  const keyword = text(source, "keyword", true);
  const rowsRaw = source.rows === undefined ? 5 : numeric(source, "rows");
  const rows = Math.min(10, Math.max(1, Math.round(rowsRaw)));
  return { keyword, rows };
}

export function parseRestoreRequest(value: unknown): { fileName: string; confirmation: "RESTORE" } {
  const source = object(value);
  const fileName = text(source, "fileName", true);
  const confirmation = text(source, "confirmation", true);
  if (confirmation !== "RESTORE") fieldError("confirmation", "Type RESTORE to confirm local data recovery.");
  return { fileName, confirmation: "RESTORE" };
}

export function parseReceiptExpectation(value: unknown): FundingReceiptExpectationInput {
  const source = object(value);
  const amountCents = money(source, "amountCents");
  const expectedDate = text(source, "expectedDate", true);
  const status = enumValue(source, "status", ["expected", "cancelled"] as const);
  const cancellationReason = text(source, "cancellationReason");
  if (amountCents <= 0) fieldError("amountCents", "Expected receipt amount must be greater than zero.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate)) fieldError("expectedDate", "expectedDate must be YYYY-MM-DD.");
  if (status === "cancelled" && !cancellationReason) fieldError("cancellationReason", "Record why this expected receipt was cancelled.");
  return {
    outcomeId: requiredId(source, "outcomeId"),
    amountCents,
    expectedDate,
    basisNote: text(source, "basisNote", true),
    owner: text(source, "owner", true),
    note: text(source, "note"),
    status,
    cancellationReason,
  };
}

export function parseReceiptExpectationAllocation(value: unknown): FundingReceiptExpectationAllocationInput {
  const source = object(value);
  const amountCents = money(source, "amountCents");
  const status = enumValue(source, "status", ["active", "voided"] as const);
  const voidReason = text(source, "voidReason");
  if (amountCents <= 0) fieldError("amountCents", "Receipt allocation amount must be greater than zero.");
  if (status === "voided" && !voidReason) fieldError("voidReason", "Record why this receipt allocation is voided.");
  return {
    expectationId: requiredId(source, "expectationId"),
    trancheId: requiredId(source, "trancheId"),
    amountCents,
    note: text(source, "note"),
    status,
    voidReason,
  };
}

export function parseReceiptTranche(value: unknown): FundingReceiptTrancheInput {
  const source = object(value);
  const amountCents = money(source, "amountCents");
  const status = enumValue(source, "status", ["received", "voided"] as const);
  const receivedDate = text(source, "receivedDate", true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedDate)) fieldError("receivedDate", "receivedDate must be YYYY-MM-DD.");
  const receiptEvidence = text(source, "receiptEvidence", true);
  const voidReason = text(source, "voidReason");
  if (amountCents <= 0) fieldError("amountCents", "Receipt tranche amount must be greater than zero.");
  if (status === "voided" && !voidReason) fieldError("voidReason", "Record why this receipt tranche is voided.");
  return {
    outcomeId: requiredId(source, "outcomeId"),
    amountCents,
    receivedDate,
    receiptEvidence,
    note: text(source, "note"),
    status,
    voidReason,
  };
}

export function parseOutcome(value: unknown): FundingOutcomeInput {
  const source = object(value);
  const status = enumValue(source, "status", ["won", "lost", "withdrawn", "closed"] as const);
  const approvedAmountCents = money(source, "approvedAmountCents");
  const committedAmountCents = money(source, "committedAmountCents");
  const receivedAmountCents = money(source, "receivedAmountCents");
  const receivedDate = nullableDate(source, "receivedDate");
  const commitmentEvidence = text(source, "commitmentEvidence");
  const receiptEvidence = text(source, "receiptEvidence");

  if (receivedAmountCents > committedAmountCents) {
    fieldError("receivedAmountCents", "Received capital cannot exceed the recorded committed total.");
  }
  if (approvedAmountCents > 0 && committedAmountCents > approvedAmountCents) {
    fieldError("committedAmountCents", "Committed capital cannot exceed the recorded approved amount.");
  }
  if (committedAmountCents > 0 && !commitmentEvidence) {
    fieldError("commitmentEvidence", "Record the commitment evidence reference before committed capital changes the funding state.");
  }
  if (receivedAmountCents > 0 && !receivedDate) {
    fieldError("receivedDate", "Record the date when received capital actually arrived.");
  }
  if (receivedAmountCents > 0 && !receiptEvidence) {
    fieldError("receiptEvidence", "Record the receipt evidence reference before received capital is treated as cash received.");
  }
  if ((status === "lost" || status === "withdrawn") && (committedAmountCents > 0 || receivedAmountCents > 0)) {
    fieldError("committedAmountCents", "Lost or withdrawn financing cannot retain committed or received capital; correct the outcome status or amounts.");
  }

  return {
    track: enumValue<FundingTrack>(source, "track", ["grant", "debt", "equity"]),
    applicationId: nullableId(source, "applicationId"),
    investorId: nullableId(source, "investorId"),
    roundId: nullableId(source, "roundId"),
    status,
    approvedAmountCents,
    committedAmountCents,
    receivedAmountCents,
    receivedDate,
    commitmentEvidence,
    receiptEvidence,
    conditions: text(source, "conditions"),
    lossReason: text(source, "lossReason"),
    feedback: text(source, "feedback"),
    retryDate: nullableDate(source, "retryDate"),
  };
}
