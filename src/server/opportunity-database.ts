import type { DatabaseSync } from "node:sqlite";
import type {
  FundingOpportunity,
  FundingOpportunityInput,
  OpportunityMatch,
} from "../domain/types.ts";
import { assertOwnedReference, detectWorkspaceId } from "./repository-scope.ts";

interface OpportunityRow {
  id: number;
  type: FundingOpportunityInput["type"];
  title: string;
  provider: string;
  source_url: string;
  description: string;
  geography: string;
  sectors: string;
  stages: string;
  amount_min_cents: number;
  amount_max_cents: number;
  deadline: string | null;
  decision: FundingOpportunityInput["decision"];
  grant_program_type: string;
  grant_eligibility: string;
  match_funding_required_cents: number;
  loan_term_months: number | null;
  annual_interest_rate_pct: number | null;
  loan_fees_cents: number;
  minimum_dscr: number | null;
  collateral_required: number;
  personal_guarantee_required: number;
  investor_id: number | null;
  fund_id: number | null;
  investor_type: string;
  created_at: string;
  updated_at: string;
}

interface MatchRow {
  opportunity_id: number;
  fit: OpportunityMatch["fit"];
  score: number;
  rules_json: string;
  blockers_json: string;
  missing_facts_json: string;
  next_step: string;
  evaluated_at: string;
}

function nowIso(): string { return new Date().toISOString(); }

function asOpportunity(row: OpportunityRow): FundingOpportunity {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    provider: row.provider,
    sourceUrl: row.source_url,
    description: row.description,
    geography: row.geography,
    sectors: row.sectors,
    stages: row.stages,
    amountMinCents: row.amount_min_cents,
    amountMaxCents: row.amount_max_cents,
    deadline: row.deadline,
    decision: row.decision,
    grantProgramType: row.grant_program_type,
    grantEligibility: row.grant_eligibility,
    matchFundingRequiredCents: row.match_funding_required_cents,
    loanTermMonths: row.loan_term_months,
    annualInterestRatePct: row.annual_interest_rate_pct,
    loanFeesCents: row.loan_fees_cents,
    minimumDscr: row.minimum_dscr,
    collateralRequired: row.collateral_required === 1,
    personalGuaranteeRequired: row.personal_guarantee_required === 1,
    investorId: row.investor_id,
    fundId: row.fund_id,
    investorType: row.investor_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function asMatch(row: MatchRow): OpportunityMatch {
  return {
    opportunityId: row.opportunity_id,
    fit: row.fit,
    score: row.score,
    rules: JSON.parse(row.rules_json) as OpportunityMatch["rules"],
    blockers: JSON.parse(row.blockers_json) as string[],
    missingFacts: JSON.parse(row.missing_facts_json) as string[],
    nextStep: row.next_step,
    evaluatedAt: row.evaluated_at,
  };
}

export class OpportunityRepository {
  private readonly db: DatabaseSync;
  private workspaceId: string | null;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.initializeSchema();
    this.workspaceId = detectWorkspaceId(db);
  }

  bindWorkspace(workspaceId: string): void {
    this.workspaceId = workspaceId;
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS funding_opportunity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK (type IN ('grant','loan','investor')),
        title TEXT NOT NULL,
        provider TEXT NOT NULL,
        source_url TEXT NOT NULL,
        description TEXT NOT NULL,
        geography TEXT NOT NULL,
        sectors TEXT NOT NULL,
        stages TEXT NOT NULL,
        amount_min_cents INTEGER NOT NULL CHECK (amount_min_cents >= 0),
        amount_max_cents INTEGER NOT NULL CHECK (amount_max_cents >= amount_min_cents),
        deadline TEXT,
        decision TEXT NOT NULL CHECK (decision IN ('new','saved','pursuing','dismissed')),
        grant_program_type TEXT NOT NULL,
        grant_eligibility TEXT NOT NULL,
        match_funding_required_cents INTEGER NOT NULL CHECK (match_funding_required_cents >= 0),
        loan_term_months INTEGER,
        annual_interest_rate_pct REAL,
        loan_fees_cents INTEGER NOT NULL CHECK (loan_fees_cents >= 0),
        minimum_dscr REAL,
        collateral_required INTEGER NOT NULL CHECK (collateral_required IN (0,1)),
        personal_guarantee_required INTEGER NOT NULL CHECK (personal_guarantee_required IN (0,1)),
        investor_id INTEGER REFERENCES investor(id) ON DELETE SET NULL,
        fund_id INTEGER REFERENCES fund(id) ON DELETE SET NULL,
        investor_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_funding_opportunity_type_decision ON funding_opportunity(type, decision);
      CREATE INDEX IF NOT EXISTS idx_funding_opportunity_deadline ON funding_opportunity(deadline);
      CREATE TABLE IF NOT EXISTS opportunity_match (
        opportunity_id INTEGER PRIMARY KEY REFERENCES funding_opportunity(id) ON DELETE CASCADE,
        fit TEXT NOT NULL CHECK (fit IN ('strong','possible','weak','ineligible')),
        score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
        rules_json TEXT NOT NULL,
        blockers_json TEXT NOT NULL,
        missing_facts_json TEXT NOT NULL,
        next_step TEXT NOT NULL,
        evaluated_at TEXT NOT NULL
      );
    `);
  }

  listOpportunities(): FundingOpportunity[] {
    const rows = this.workspaceId ? this.db.prepare("SELECT * FROM funding_opportunity WHERE workspace_id=? ORDER BY updated_at DESC").all(this.workspaceId) : this.db.prepare("SELECT * FROM funding_opportunity ORDER BY updated_at DESC").all();
    return (rows as unknown as OpportunityRow[]).map(asOpportunity);
  }

  createOpportunity(input: FundingOpportunityInput): FundingOpportunity {
    const at = nowIso();
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"fund","id",input.fundId,this.workspaceId,"Fund");
    const values = [input.type,input.title,input.provider,input.sourceUrl,input.description,input.geography,input.sectors,input.stages,input.amountMinCents,input.amountMaxCents,input.deadline,input.decision,input.grantProgramType,input.grantEligibility,input.matchFundingRequiredCents,input.loanTermMonths,input.annualInterestRatePct,input.loanFeesCents,input.minimumDscr,input.collateralRequired ? 1 : 0,input.personalGuaranteeRequired ? 1 : 0,input.investorId,input.fundId,input.investorType,at,at] as const;
    const result = this.workspaceId
      ? this.db.prepare("INSERT INTO funding_opportunity (workspace_id,type,title,provider,source_url,description,geography,sectors,stages,amount_min_cents,amount_max_cents,deadline,decision,grant_program_type,grant_eligibility,match_funding_required_cents,loan_term_months,annual_interest_rate_pct,loan_fees_cents,minimum_dscr,collateral_required,personal_guarantee_required,investor_id,fund_id,investor_type,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values)
      : this.db.prepare("INSERT INTO funding_opportunity (type,title,provider,source_url,description,geography,sectors,stages,amount_min_cents,amount_max_cents,deadline,decision,grant_program_type,grant_eligibility,match_funding_required_cents,loan_term_months,annual_interest_rate_pct,loan_fees_cents,minimum_dscr,collateral_required,personal_guarantee_required,investor_id,fund_id,investor_type,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...values);
    const row = this.workspaceId ? this.db.prepare("SELECT * FROM funding_opportunity WHERE id=? AND workspace_id=?").get(result.lastInsertRowid,this.workspaceId) : this.db.prepare("SELECT * FROM funding_opportunity WHERE id=?").get(result.lastInsertRowid);
    return asOpportunity(row as unknown as OpportunityRow);
  }

  updateOpportunity(id: number, input: FundingOpportunityInput): FundingOpportunity | null {
    const at = nowIso();
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"fund","id",input.fundId,this.workspaceId,"Fund");
    const values = [input.type,input.title,input.provider,input.sourceUrl,input.description,input.geography,input.sectors,input.stages,input.amountMinCents,input.amountMaxCents,input.deadline,input.decision,input.grantProgramType,input.grantEligibility,input.matchFundingRequiredCents,input.loanTermMonths,input.annualInterestRatePct,input.loanFeesCents,input.minimumDscr,input.collateralRequired ? 1 : 0,input.personalGuaranteeRequired ? 1 : 0,input.investorId,input.fundId,input.investorType,at] as const;
    const result = this.workspaceId
      ? this.db.prepare("UPDATE funding_opportunity SET type=?,title=?,provider=?,source_url=?,description=?,geography=?,sectors=?,stages=?,amount_min_cents=?,amount_max_cents=?,deadline=?,decision=?,grant_program_type=?,grant_eligibility=?,match_funding_required_cents=?,loan_term_months=?,annual_interest_rate_pct=?,loan_fees_cents=?,minimum_dscr=?,collateral_required=?,personal_guarantee_required=?,investor_id=?,fund_id=?,investor_type=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId)
      : this.db.prepare("UPDATE funding_opportunity SET type=?,title=?,provider=?,source_url=?,description=?,geography=?,sectors=?,stages=?,amount_min_cents=?,amount_max_cents=?,deadline=?,decision=?,grant_program_type=?,grant_eligibility=?,match_funding_required_cents=?,loan_term_months=?,annual_interest_rate_pct=?,loan_fees_cents=?,minimum_dscr=?,collateral_required=?,personal_guarantee_required=?,investor_id=?,fund_id=?,investor_type=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    const row = this.workspaceId ? this.db.prepare("SELECT * FROM funding_opportunity WHERE id=? AND workspace_id=?").get(id,this.workspaceId) : this.db.prepare("SELECT * FROM funding_opportunity WHERE id=?").get(id);
    return asOpportunity(row as unknown as OpportunityRow);
  }

  listMatches(): OpportunityMatch[] {
    const rows = this.workspaceId ? this.db.prepare("SELECT * FROM opportunity_match WHERE workspace_id=? ORDER BY evaluated_at DESC").all(this.workspaceId) : this.db.prepare("SELECT * FROM opportunity_match ORDER BY evaluated_at DESC").all();
    return (rows as unknown as MatchRow[]).map(asMatch);
  }

  getMatch(opportunityId: number): OpportunityMatch | null {
    const row = this.workspaceId ? this.db.prepare("SELECT * FROM opportunity_match WHERE opportunity_id=? AND workspace_id=?").get(opportunityId,this.workspaceId) as MatchRow | undefined : this.db.prepare("SELECT * FROM opportunity_match WHERE opportunity_id=?").get(opportunityId) as MatchRow | undefined;
    return row ? asMatch(row) : null;
  }

  saveMatch(match: OpportunityMatch): OpportunityMatch {
    assertOwnedReference(this.db,"funding_opportunity","id",match.opportunityId,this.workspaceId,"Opportunity");
    const values = [match.opportunityId,match.fit,match.score,JSON.stringify(match.rules),JSON.stringify(match.blockers),JSON.stringify(match.missingFacts),match.nextStep,match.evaluatedAt] as const;
    if (this.workspaceId) {
      this.db.prepare(`INSERT INTO opportunity_match (workspace_id,opportunity_id,fit,score,rules_json,blockers_json,missing_facts_json,next_step,evaluated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(opportunity_id) DO UPDATE SET workspace_id=excluded.workspace_id,fit=excluded.fit,score=excluded.score,rules_json=excluded.rules_json,blockers_json=excluded.blockers_json,missing_facts_json=excluded.missing_facts_json,next_step=excluded.next_step,evaluated_at=excluded.evaluated_at`).run(this.workspaceId,...values);
    } else {
      this.db.prepare(`INSERT INTO opportunity_match (opportunity_id,fit,score,rules_json,blockers_json,missing_facts_json,next_step,evaluated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(opportunity_id) DO UPDATE SET fit=excluded.fit,score=excluded.score,rules_json=excluded.rules_json,blockers_json=excluded.blockers_json,missing_facts_json=excluded.missing_facts_json,next_step=excluded.next_step,evaluated_at=excluded.evaluated_at`).run(...values);
    }
    return this.getMatch(match.opportunityId) as OpportunityMatch;
  }
}
