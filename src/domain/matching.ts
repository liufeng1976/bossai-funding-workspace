import type {
  CompanyProfile,
  FundingGoal,
  FundingOpportunity,
  FundingReadiness,
  MatchOutcome,
  MatchRuleResult,
  OpportunityMatch,
} from "./types.ts";

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function terms(value: string): string[] {
  return value
    .split(/[,;/|]/)
    .map(normalized)
    .filter(Boolean);
}

function overlaps(requirements: string, facts: string): boolean {
  const required = terms(requirements);
  const source = normalized(facts);
  return required.length === 0 || required.some((term) => source.includes(term) || term.includes(source));
}

function rule(
  key: string,
  label: string,
  outcome: MatchOutcome,
  explanation: string,
  correctiveAction = "",
): MatchRuleResult {
  return { key, label, outcome, explanation, correctiveAction };
}

function deadlineRule(opportunity: FundingOpportunity, now: Date): MatchRuleResult {
  if (!opportunity.deadline) return rule("deadline", "Deadline", "partial", "No deadline is recorded for this opportunity.", "Confirm the official deadline before committing resources.");
  const deadline = new Date(`${opportunity.deadline}T23:59:59Z`);
  if (Number.isNaN(deadline.getTime())) return rule("deadline", "Deadline", "missing", "The saved deadline cannot be interpreted.", "Correct the opportunity deadline.");
  const days = Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return rule("deadline", "Deadline", "ineligible", `The opportunity deadline passed ${Math.abs(days)} day(s) ago.`, "Confirm whether a new cycle is open before pursuing it.");
  if (days <= 14) return rule("deadline", "Deadline", "partial", `The deadline is in ${days} day(s), so execution time is tight.`, "Confirm eligibility and assign the application/contact work immediately.");
  return rule("deadline", "Deadline", "match", `There are ${days} day(s) before the recorded deadline.`);
}

function geographyRule(profile: CompanyProfile | null, opportunity: FundingOpportunity): MatchRuleResult {
  if (!opportunity.geography) return rule("geography", "Geography", "partial", "The opportunity does not state a geography restriction.", "Verify the official geography rules.");
  if (!profile?.geography) return rule("geography", "Geography", "missing", "Company geography is missing, so geography eligibility cannot be checked.", "Add the company's operating and registered geography.");
  if (overlaps(opportunity.geography, profile.geography)) return rule("geography", "Geography", "match", `Company geography (${profile.geography}) overlaps the recorded opportunity geography (${opportunity.geography}).`);
  return rule("geography", "Geography", "mismatch", `Company geography (${profile.geography}) does not clearly overlap ${opportunity.geography}.`, "Check the official location rules or remove this opportunity if the company is outside the eligible area.");
}

function sectorRule(profile: CompanyProfile | null, opportunity: FundingOpportunity): MatchRuleResult {
  if (!opportunity.sectors) return rule("sector", "Sector", "partial", "The opportunity does not state a sector restriction.", "Confirm whether any sector exclusions apply.");
  if (!profile?.industry) return rule("sector", "Sector", "missing", "Company industry is missing, so sector fit cannot be checked.", "Complete the company industry and product description.");
  const facts = `${profile.industry}, ${profile.product}, ${profile.businessModel}`;
  if (overlaps(opportunity.sectors, facts)) return rule("sector", "Sector", "match", `Company facts overlap the recorded sectors: ${opportunity.sectors}.`);
  return rule("sector", "Sector", "mismatch", `The recorded sectors (${opportunity.sectors}) do not clearly match the company profile (${profile.industry}).`, "Review the official sector definition before spending time on this opportunity.");
}

function stageRule(profile: CompanyProfile | null, opportunity: FundingOpportunity): MatchRuleResult {
  if (!opportunity.stages) return rule("stage", "Company stage", "partial", "No company-stage restriction is recorded.", "Confirm stage eligibility with the source.");
  if (!profile?.stage) return rule("stage", "Company stage", "missing", "Company stage is missing.", "Set the company's current stage.");
  if (overlaps(opportunity.stages, profile.stage)) return rule("stage", "Company stage", "match", `${profile.stage} is included in the recorded target stages (${opportunity.stages}).`);
  return rule("stage", "Company stage", "mismatch", `${profile.stage} is not clearly included in ${opportunity.stages}.`, "Confirm the official stage definition or deprioritize this opportunity.");
}

function amountRule(goal: FundingGoal | null, opportunity: FundingOpportunity): MatchRuleResult {
  if (opportunity.amountMaxCents <= 0) return rule("amount", "Capital amount", "missing", "No usable maximum amount is recorded.", "Add the available award, loan or cheque range.");
  if (!goal || goal.targetAmountCents <= 0) return rule("amount", "Capital amount", "missing", "The company funding target is not set.", "Set the funding target before comparing capital amounts.");
  const share = opportunity.amountMaxCents / goal.targetAmountCents;
  if (share >= 0.2) return rule("amount", "Capital amount", "match", `The maximum amount could cover about ${Math.round(share * 100)}% of the stated funding target.`);
  return rule("amount", "Capital amount", "partial", `The maximum amount covers about ${Math.round(share * 100)}% of the stated funding target.`, "Use this as one component of the capital stack rather than expecting it to close the full gap.");
}

function grantRules(profile: CompanyProfile | null, opportunity: FundingOpportunity): MatchRuleResult[] {
  const rules: MatchRuleResult[] = [];
  if (!opportunity.grantEligibility) {
    rules.push(rule("grant-eligibility", "Grant eligibility", "missing", "No eligibility requirements are recorded.", "Capture the official eligibility requirements before preparing an application."));
  } else {
    rules.push(rule("grant-eligibility", "Grant eligibility", "partial", "Eligibility requirements are recorded but require factual verification against the company.", "Review each official eligibility requirement and attach evidence."));
  }
  if (opportunity.matchFundingRequiredCents > 0) {
    if (!profile) rules.push(rule("match-funding", "Required match funding", "missing", "Company cash facts are unavailable.", "Complete cash balance before evaluating the required match."));
    else if (profile.cashBalanceCents >= opportunity.matchFundingRequiredCents) rules.push(rule("match-funding", "Required match funding", "match", "Recorded cash balance can cover the stated matching-fund requirement."));
    else rules.push(rule("match-funding", "Required match funding", "mismatch", "Recorded cash balance is below the stated matching-fund requirement.", "Identify another eligible matching-fund source or deprioritize this grant."));
  }
  return rules;
}

function estimatedMonthlyPayment(principalCents: number, annualRatePct: number, termMonths: number): number {
  if (termMonths <= 0) return Number.POSITIVE_INFINITY;
  const principal = principalCents / 100;
  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyRate <= 0) return (principal / termMonths) * 100;
  const payment = principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -termMonths));
  return Math.round(payment * 100);
}

function loanRules(profile: CompanyProfile | null, goal: FundingGoal | null, opportunity: FundingOpportunity): MatchRuleResult[] {
  const rules: MatchRuleResult[] = [];
  if (opportunity.loanTermMonths === null || opportunity.annualInterestRatePct === null) {
    rules.push(rule("debt-service", "Debt service", "missing", "Loan term or interest rate is missing, so repayment pressure cannot be estimated.", "Record the term and annual interest rate."));
  } else {
    const payment = estimatedMonthlyPayment(opportunity.amountMaxCents, opportunity.annualInterestRatePct, opportunity.loanTermMonths) + Math.round(opportunity.loanFeesCents / Math.max(1, opportunity.loanTermMonths));
    if (!goal || goal.maxMonthlyDebtServiceCents <= 0) {
      rules.push(rule("debt-service", "Debt service", "missing", `Estimated monthly payment is about $${Math.round(payment / 100).toLocaleString("en-US")}, but owner repayment capacity is not set.`, "Set the maximum acceptable monthly debt service."));
    } else if (payment <= goal.maxMonthlyDebtServiceCents) {
      rules.push(rule("debt-service", "Debt service", "match", `Estimated monthly payment is about $${Math.round(payment / 100).toLocaleString("en-US")}, within the owner's stated repayment ceiling.`));
    } else {
      rules.push(rule("debt-service", "Debt service", "mismatch", `Estimated monthly payment is about $${Math.round(payment / 100).toLocaleString("en-US")}, above the owner's stated repayment ceiling.`, "Request a smaller principal, longer term, lower rate, or use another capital source."));
    }
  }

  if (opportunity.minimumDscr !== null) {
    if (!profile || profile.annualRevenueCents <= 0 || profile.grossMarginPct <= 0) {
      rules.push(rule("dscr", "DSCR capacity", "missing", "Revenue and gross-margin facts are insufficient for a repayment-capacity proxy.", "Complete revenue, margin and operating cash-flow facts; lender-calculated DSCR may differ."));
    } else {
      const monthlyGrossProfit = (profile.annualRevenueCents / 12) * (profile.grossMarginPct / 100);
      const available = Math.max(0, monthlyGrossProfit - profile.monthlyBurnCents);
      const debtCeiling = goal?.maxMonthlyDebtServiceCents ?? 0;
      const proxyDscr = debtCeiling > 0 ? available / debtCeiling : 0;
      if (proxyDscr >= opportunity.minimumDscr) rules.push(rule("dscr", "DSCR capacity", "match", `A conservative profile proxy is ${proxyDscr.toFixed(2)}× versus a recorded minimum of ${opportunity.minimumDscr.toFixed(2)}×.`));
      else rules.push(rule("dscr", "DSCR capacity", "mismatch", `A conservative profile proxy is ${proxyDscr.toFixed(2)}× versus a recorded minimum of ${opportunity.minimumDscr.toFixed(2)}×.`, "Validate lender-defined EBITDA/cash-flow adjustments before proceeding."));
    }
  }

  if (opportunity.personalGuaranteeRequired) rules.push(rule("personal-guarantee", "Personal guarantee", "partial", "This opportunity is recorded as requiring a personal guarantee.", "Confirm the owner's willingness and obtain professional review of guarantee exposure."));
  if (opportunity.collateralRequired) rules.push(rule("collateral", "Collateral", "partial", "This opportunity is recorded as requiring collateral.", "Confirm eligible collateral and lien position with the lender."));
  return rules;
}

export function evaluateOpportunity(
  profile: CompanyProfile | null,
  goal: FundingGoal | null,
  opportunity: FundingOpportunity,
  now = new Date(),
): OpportunityMatch {
  const rules: MatchRuleResult[] = [
    deadlineRule(opportunity, now),
    geographyRule(profile, opportunity),
    sectorRule(profile, opportunity),
    stageRule(profile, opportunity),
    amountRule(goal, opportunity),
  ];
  if (opportunity.type === "grant") rules.push(...grantRules(profile, opportunity));
  if (opportunity.type === "loan") rules.push(...loanRules(profile, goal, opportunity));
  if (opportunity.type === "investor" && opportunity.investorId === null && opportunity.fundId === null) {
    rules.push(rule("investor-record", "Investor identity", "missing", "This investor opportunity is not linked to an Investor or Fund record.", "Link the opportunity to the investor CRM before outreach."));
  }

  const weights: Record<MatchOutcome, number> = { match: 20, partial: 8, missing: 0, mismatch: -15, ineligible: -100 };
  const rawScore = rules.reduce((sum, item) => sum + weights[item.outcome], 20);
  const score = Math.max(0, Math.min(100, rawScore));
  const blockers = rules.filter((item) => item.outcome === "ineligible" || item.outcome === "mismatch").map((item) => item.explanation);
  const missingFacts = rules.filter((item) => item.outcome === "missing").map((item) => item.explanation);
  const matchCount = rules.filter((item) => item.outcome === "match").length;
  const mismatchCount = rules.filter((item) => item.outcome === "mismatch").length;
  const fit = rules.some((item) => item.outcome === "ineligible")
    ? "ineligible"
    : mismatchCount >= 2
      ? "weak"
      : matchCount >= 3 && mismatchCount === 0 && missingFacts.length <= 1
        ? "strong"
        : "possible";
  const firstCorrection = rules.find((item) => item.outcome !== "match" && item.correctiveAction)?.correctiveAction;

  return {
    opportunityId: opportunity.id,
    fit,
    score,
    rules,
    blockers,
    missingFacts,
    nextStep: firstCorrection || "Save the opportunity and create the first execution action.",
    evaluatedAt: now.toISOString(),
  };
}

export function calculateFundingReadiness(profile: CompanyProfile | null, goal: FundingGoal | null): FundingReadiness {
  if (!profile) {
    return {
      completionPct: 0,
      status: "not-started",
      checks: [],
      missingFacts: ["Company funding profile has not been created."],
      nextStep: "Create the company funding profile with capital, operating and ownership facts.",
    };
  }

  const checks = [
    { key: "identity", label: "Company identity", ready: Boolean(profile.name && profile.industry && profile.stage && profile.geography), reason: "Company, industry, stage and geography support basic eligibility checks.", nextStep: "Complete company, industry, stage and geography." },
    { key: "revenue", label: "Revenue facts", ready: profile.annualRevenueCents > 0 || profile.arrCents > 0 || profile.mrrCents > 0, reason: "Revenue facts support lender and investor fit checks.", nextStep: "Add current annual revenue, ARR or MRR." },
    { key: "cash", label: "Cash and runway", ready: profile.cashBalanceCents > 0 && profile.runwayMonths > 0, reason: "Cash, burn and runway determine urgency and financing constraints.", nextStep: "Add current cash balance, monthly burn and runway." },
    { key: "economics", label: "Economics", ready: profile.grossMarginPct !== 0, reason: "Gross margin supports debt-capacity and investor-readiness analysis.", nextStep: "Add the current gross margin." },
    { key: "product", label: "Product and business model", ready: Boolean(profile.product && profile.businessModel), reason: "Matching requires a clear product and business model.", nextStep: "Describe the product and how the company makes money." },
    { key: "ownership", label: "Ownership and financing history", ready: Boolean(profile.capTableSummary && profile.fundingHistory), reason: "Equity and diligence work require ownership and prior-financing facts.", nextStep: "Add the cap-table summary and funding history." },
    { key: "use-of-funds", label: "Use of funds", ready: Boolean(profile.useOfFunds), reason: "Capital sources need a concrete use of proceeds.", nextStep: "State exactly what the money will fund." },
    { key: "target", label: "Funding target", ready: Boolean(goal && goal.targetAmountCents > 0 && goal.purpose), reason: "The owner must state how much capital is needed and why.", nextStep: "Set the funding target, timing and purpose." },
  ];

  const completed = checks.filter((item) => item.ready).length;
  const completionPct = Math.round((completed / checks.length) * 100);
  const missing = checks.filter((item) => !item.ready);
  return {
    completionPct,
    status: completed === checks.length ? "ready" : "needs-work",
    checks,
    missingFacts: missing.map((item) => item.label),
    nextStep: missing[0]?.nextStep ?? "Funding profile is ready for opportunity matching.",
  };
}
