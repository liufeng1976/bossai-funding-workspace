import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  CapitalStrategy,
  CompanyProfile,
  CompanyProfileInput,
  FundingAction,
  FundingActionInput,
  FundingGoal,
  FundingGoalInput,
  FundraisingRound,
  FundraisingRoundInput,
} from "../domain/types.ts";
import { detectWorkspaceId } from "./repository-scope.ts";

interface CompanyRow {
  id: number;
  name: string;
  industry: string;
  stage: string;
  geography: string;
  founded_year: number | null;
  annual_revenue_cents: number;
  mrr_cents: number;
  arr_cents: number;
  growth_rate_pct: number;
  gross_margin_pct: number;
  cash_balance_cents: number;
  monthly_burn_cents: number;
  runway_months: number;
  team_size: number;
  product: string;
  business_model: string;
  funding_history: string;
  existing_debt_cents: number;
  cap_table_summary: string;
  use_of_funds: string;
  target_funding_cents: number;
  target_funding_date: string | null;
  updated_at: string;
}

interface GoalRow {
  id: number;
  target_amount_cents: number;
  need_by_date: string | null;
  purpose: string;
  accepts_dilution: number;
  max_monthly_debt_service_cents: number;
  growth_plan: string;
  updated_at: string;
}

interface RoundRow {
  id: number;
  round_name: string;
  round_type: string;
  target_amount_cents: number;
  minimum_amount_cents: number;
  committed_amount_cents: number;
  received_amount_cents: number;
  pre_money_valuation_cents: number | null;
  post_money_valuation_cents: number | null;
  target_close_date: string | null;
  status: FundraisingRoundInput["status"];
  use_of_funds: string;
  created_at: string;
  updated_at: string;
}

interface ActionRow {
  id: number;
  track: FundingActionInput["track"];
  title: string;
  amount_cents: number;
  stage: FundingActionInput["stage"];
  priority: FundingActionInput["priority"];
  deadline: string | null;
  next_step: string;
  owner: string;
  result: string;
  created_at: string;
  updated_at: string;
}

interface StrategyRow {
  id: number;
  total_need_cents: number;
  allocations_json: string;
  unfunded_residual_cents: number;
  assumptions_json: string;
  warnings_json: string;
  generated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function asCompany(row: CompanyRow): CompanyProfile {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    stage: row.stage,
    geography: row.geography,
    foundedYear: row.founded_year,
    annualRevenueCents: row.annual_revenue_cents,
    mrrCents: row.mrr_cents,
    arrCents: row.arr_cents,
    growthRatePct: row.growth_rate_pct,
    grossMarginPct: row.gross_margin_pct,
    cashBalanceCents: row.cash_balance_cents,
    monthlyBurnCents: row.monthly_burn_cents,
    runwayMonths: row.runway_months,
    teamSize: row.team_size,
    product: row.product,
    businessModel: row.business_model,
    fundingHistory: row.funding_history,
    existingDebtCents: row.existing_debt_cents,
    capTableSummary: row.cap_table_summary,
    useOfFunds: row.use_of_funds,
    targetFundingCents: row.target_funding_cents,
    targetFundingDate: row.target_funding_date,
    updatedAt: row.updated_at,
  };
}

function asGoal(row: GoalRow): FundingGoal {
  return {
    id: row.id,
    targetAmountCents: row.target_amount_cents,
    needByDate: row.need_by_date,
    purpose: row.purpose,
    acceptsDilution: row.accepts_dilution === 1,
    maxMonthlyDebtServiceCents: row.max_monthly_debt_service_cents,
    growthPlan: row.growth_plan,
    updatedAt: row.updated_at,
  };
}

function asRound(row: RoundRow): FundraisingRound {
  return {
    id: row.id,
    roundName: row.round_name,
    roundType: row.round_type,
    targetAmountCents: row.target_amount_cents,
    minimumAmountCents: row.minimum_amount_cents,
    committedAmountCents: row.committed_amount_cents,
    receivedAmountCents: row.received_amount_cents,
    preMoneyValuationCents: row.pre_money_valuation_cents,
    postMoneyValuationCents: row.post_money_valuation_cents,
    targetCloseDate: row.target_close_date,
    status: row.status,
    useOfFunds: row.use_of_funds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function asAction(row: ActionRow): FundingAction {
  return {
    id: row.id,
    track: row.track,
    title: row.title,
    amountCents: row.amount_cents,
    stage: row.stage,
    priority: row.priority,
    deadline: row.deadline,
    nextStep: row.next_step,
    owner: row.owner,
    result: row.result,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class FundingRepository {
  readonly db: DatabaseSync;
  readonly databasePath: string;
  private workspaceId: string | null = null;

  constructor(databasePath: string) {
    this.databasePath = databasePath;
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    this.initializeSchema();
    this.workspaceId = detectWorkspaceId(this.db);
  }

  bindWorkspace(workspaceId: string): void {
    this.workspaceId = workspaceId;
  }

  getWorkspaceBinding(): string | null {
    return this.workspaceId;
  }

  close(): void {
    this.db.close();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS company_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        industry TEXT NOT NULL,
        stage TEXT NOT NULL,
        geography TEXT NOT NULL,
        founded_year INTEGER,
        annual_revenue_cents INTEGER NOT NULL CHECK (annual_revenue_cents >= 0),
        mrr_cents INTEGER NOT NULL CHECK (mrr_cents >= 0),
        arr_cents INTEGER NOT NULL CHECK (arr_cents >= 0),
        growth_rate_pct REAL NOT NULL,
        gross_margin_pct REAL NOT NULL,
        cash_balance_cents INTEGER NOT NULL CHECK (cash_balance_cents >= 0),
        monthly_burn_cents INTEGER NOT NULL CHECK (monthly_burn_cents >= 0),
        runway_months REAL NOT NULL CHECK (runway_months >= 0),
        team_size INTEGER NOT NULL CHECK (team_size >= 0),
        product TEXT NOT NULL,
        business_model TEXT NOT NULL,
        funding_history TEXT NOT NULL,
        existing_debt_cents INTEGER NOT NULL CHECK (existing_debt_cents >= 0),
        cap_table_summary TEXT NOT NULL,
        use_of_funds TEXT NOT NULL,
        target_funding_cents INTEGER NOT NULL CHECK (target_funding_cents >= 0),
        target_funding_date TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS funding_goal (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        target_amount_cents INTEGER NOT NULL CHECK (target_amount_cents >= 0),
        need_by_date TEXT,
        purpose TEXT NOT NULL,
        accepts_dilution INTEGER NOT NULL CHECK (accepts_dilution IN (0, 1)),
        max_monthly_debt_service_cents INTEGER NOT NULL CHECK (max_monthly_debt_service_cents >= 0),
        growth_plan TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS fundraising_round (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round_name TEXT NOT NULL,
        round_type TEXT NOT NULL,
        target_amount_cents INTEGER NOT NULL CHECK (target_amount_cents >= 0),
        minimum_amount_cents INTEGER NOT NULL CHECK (minimum_amount_cents >= 0),
        committed_amount_cents INTEGER NOT NULL CHECK (committed_amount_cents >= 0),
        received_amount_cents INTEGER NOT NULL CHECK (received_amount_cents >= 0),
        pre_money_valuation_cents INTEGER,
        post_money_valuation_cents INTEGER,
        target_close_date TEXT,
        status TEXT NOT NULL CHECK (status IN ('planning','active','closing','closed','paused')),
        use_of_funds TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS funding_action (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track TEXT NOT NULL CHECK (track IN ('grant','debt','equity')),
        title TEXT NOT NULL,
        amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
        stage TEXT NOT NULL,
        priority TEXT NOT NULL CHECK (priority IN ('low','medium','high','critical')),
        deadline TEXT,
        next_step TEXT NOT NULL,
        owner TEXT NOT NULL,
        result TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_funding_action_track_stage ON funding_action(track, stage);
      CREATE INDEX IF NOT EXISTS idx_funding_action_deadline ON funding_action(deadline);

      CREATE TABLE IF NOT EXISTS capital_strategy (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_need_cents INTEGER NOT NULL CHECK (total_need_cents >= 0),
        allocations_json TEXT NOT NULL,
        unfunded_residual_cents INTEGER NOT NULL CHECK (unfunded_residual_cents >= 0),
        assumptions_json TEXT NOT NULL,
        warnings_json TEXT NOT NULL,
        generated_at TEXT NOT NULL
      );
    `);
  }

  getCompanyProfile(): CompanyProfile | null {
    const row = this.workspaceId
      ? this.db.prepare("SELECT * FROM company_profile WHERE id=1 AND workspace_id=?").get(this.workspaceId) as CompanyRow | undefined
      : this.db.prepare("SELECT * FROM company_profile WHERE id=1").get() as CompanyRow | undefined;
    return row ? asCompany(row) : null;
  }

  saveCompanyProfile(input: CompanyProfileInput): CompanyProfile {
    const updatedAt = nowIso();
    const values = [
      input.name, input.industry, input.stage, input.geography, input.foundedYear, input.annualRevenueCents,
      input.mrrCents, input.arrCents, input.growthRatePct, input.grossMarginPct, input.cashBalanceCents,
      input.monthlyBurnCents, input.runwayMonths, input.teamSize, input.product, input.businessModel,
      input.fundingHistory, input.existingDebtCents, input.capTableSummary, input.useOfFunds,
      input.targetFundingCents, input.targetFundingDate, updatedAt,
    ] as const;
    if (this.workspaceId) {
      this.db.prepare(`
        INSERT INTO company_profile (
          workspace_id, id, name, industry, stage, geography, founded_year, annual_revenue_cents, mrr_cents, arr_cents,
          growth_rate_pct, gross_margin_pct, cash_balance_cents, monthly_burn_cents, runway_months, team_size,
          product, business_model, funding_history, existing_debt_cents, cap_table_summary, use_of_funds,
          target_funding_cents, target_funding_date, updated_at
        ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, id) DO UPDATE SET
          name=excluded.name, industry=excluded.industry, stage=excluded.stage, geography=excluded.geography,
          founded_year=excluded.founded_year, annual_revenue_cents=excluded.annual_revenue_cents,
          mrr_cents=excluded.mrr_cents, arr_cents=excluded.arr_cents, growth_rate_pct=excluded.growth_rate_pct,
          gross_margin_pct=excluded.gross_margin_pct, cash_balance_cents=excluded.cash_balance_cents,
          monthly_burn_cents=excluded.monthly_burn_cents, runway_months=excluded.runway_months,
          team_size=excluded.team_size, product=excluded.product, business_model=excluded.business_model,
          funding_history=excluded.funding_history, existing_debt_cents=excluded.existing_debt_cents,
          cap_table_summary=excluded.cap_table_summary, use_of_funds=excluded.use_of_funds,
          target_funding_cents=excluded.target_funding_cents, target_funding_date=excluded.target_funding_date,
          updated_at=excluded.updated_at
      `).run(this.workspaceId, ...values);
    } else {
      this.db.prepare(`
        INSERT INTO company_profile (
          id, name, industry, stage, geography, founded_year, annual_revenue_cents, mrr_cents, arr_cents,
          growth_rate_pct, gross_margin_pct, cash_balance_cents, monthly_burn_cents, runway_months, team_size,
          product, business_model, funding_history, existing_debt_cents, cap_table_summary, use_of_funds,
          target_funding_cents, target_funding_date, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name, industry=excluded.industry, stage=excluded.stage, geography=excluded.geography,
          founded_year=excluded.founded_year, annual_revenue_cents=excluded.annual_revenue_cents,
          mrr_cents=excluded.mrr_cents, arr_cents=excluded.arr_cents, growth_rate_pct=excluded.growth_rate_pct,
          gross_margin_pct=excluded.gross_margin_pct, cash_balance_cents=excluded.cash_balance_cents,
          monthly_burn_cents=excluded.monthly_burn_cents, runway_months=excluded.runway_months,
          team_size=excluded.team_size, product=excluded.product, business_model=excluded.business_model,
          funding_history=excluded.funding_history, existing_debt_cents=excluded.existing_debt_cents,
          cap_table_summary=excluded.cap_table_summary, use_of_funds=excluded.use_of_funds,
          target_funding_cents=excluded.target_funding_cents, target_funding_date=excluded.target_funding_date,
          updated_at=excluded.updated_at
      `).run(...values);
    }
    return this.getCompanyProfile() as CompanyProfile;
  }

  getFundingGoal(): FundingGoal | null {
    const row = this.workspaceId
      ? this.db.prepare("SELECT * FROM funding_goal WHERE id=1 AND workspace_id=?").get(this.workspaceId) as GoalRow | undefined
      : this.db.prepare("SELECT * FROM funding_goal WHERE id=1").get() as GoalRow | undefined;
    return row ? asGoal(row) : null;
  }

  saveFundingGoal(input: FundingGoalInput): FundingGoal {
    const updatedAt = nowIso();
    const values = [input.targetAmountCents, input.needByDate, input.purpose, input.acceptsDilution ? 1 : 0, input.maxMonthlyDebtServiceCents, input.growthPlan, updatedAt] as const;
    if (this.workspaceId) {
      this.db.prepare(`
        INSERT INTO funding_goal (
          workspace_id, id, target_amount_cents, need_by_date, purpose, accepts_dilution,
          max_monthly_debt_service_cents, growth_plan, updated_at
        ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, id) DO UPDATE SET
          target_amount_cents=excluded.target_amount_cents,
          need_by_date=excluded.need_by_date,
          purpose=excluded.purpose,
          accepts_dilution=excluded.accepts_dilution,
          max_monthly_debt_service_cents=excluded.max_monthly_debt_service_cents,
          growth_plan=excluded.growth_plan,
          updated_at=excluded.updated_at
      `).run(this.workspaceId, ...values);
    } else {
      this.db.prepare(`
        INSERT INTO funding_goal (
          id, target_amount_cents, need_by_date, purpose, accepts_dilution,
          max_monthly_debt_service_cents, growth_plan, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          target_amount_cents=excluded.target_amount_cents,
          need_by_date=excluded.need_by_date,
          purpose=excluded.purpose,
          accepts_dilution=excluded.accepts_dilution,
          max_monthly_debt_service_cents=excluded.max_monthly_debt_service_cents,
          growth_plan=excluded.growth_plan,
          updated_at=excluded.updated_at
      `).run(...values);
    }
    return this.getFundingGoal() as FundingGoal;
  }

  listRounds(): FundraisingRound[] {
    const rows = this.workspaceId
      ? this.db.prepare("SELECT * FROM fundraising_round WHERE workspace_id=? ORDER BY created_at DESC").all(this.workspaceId)
      : this.db.prepare("SELECT * FROM fundraising_round ORDER BY created_at DESC").all();
    return (rows as unknown as RoundRow[]).map(asRound);
  }

  createRound(input: FundraisingRoundInput): FundraisingRound {
    const timestamp = nowIso();
    const values = [input.roundName, input.roundType, input.targetAmountCents, input.minimumAmountCents, input.committedAmountCents, input.receivedAmountCents, input.preMoneyValuationCents, input.postMoneyValuationCents, input.targetCloseDate, input.status, input.useOfFunds, timestamp, timestamp] as const;
    const result = this.workspaceId
      ? this.db.prepare(`INSERT INTO fundraising_round (workspace_id,round_name,round_type,target_amount_cents,minimum_amount_cents,committed_amount_cents,received_amount_cents,pre_money_valuation_cents,post_money_valuation_cents,target_close_date,status,use_of_funds,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(this.workspaceId, ...values)
      : this.db.prepare(`INSERT INTO fundraising_round (round_name,round_type,target_amount_cents,minimum_amount_cents,committed_amount_cents,received_amount_cents,pre_money_valuation_cents,post_money_valuation_cents,target_close_date,status,use_of_funds,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...values);
    const row = this.workspaceId
      ? this.db.prepare("SELECT * FROM fundraising_round WHERE id=? AND workspace_id=?").get(result.lastInsertRowid, this.workspaceId)
      : this.db.prepare("SELECT * FROM fundraising_round WHERE id=?").get(result.lastInsertRowid);
    return asRound(row as unknown as RoundRow);
  }

  listActions(): FundingAction[] {
    const rows = this.workspaceId
      ? this.db.prepare("SELECT * FROM funding_action WHERE workspace_id=? ORDER BY updated_at DESC").all(this.workspaceId)
      : this.db.prepare("SELECT * FROM funding_action ORDER BY updated_at DESC").all();
    return (rows as unknown as ActionRow[]).map(asAction);
  }

  createAction(input: FundingActionInput): FundingAction {
    const timestamp = nowIso();
    const values = [input.track, input.title, input.amountCents, input.stage, input.priority, input.deadline, input.nextStep, input.owner, input.result, timestamp, timestamp] as const;
    const result = this.workspaceId
      ? this.db.prepare("INSERT INTO funding_action (workspace_id,track,title,amount_cents,stage,priority,deadline,next_step,owner,result,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId, ...values)
      : this.db.prepare("INSERT INTO funding_action (track,title,amount_cents,stage,priority,deadline,next_step,owner,result,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(...values);
    const row = this.workspaceId
      ? this.db.prepare("SELECT * FROM funding_action WHERE id=? AND workspace_id=?").get(result.lastInsertRowid, this.workspaceId)
      : this.db.prepare("SELECT * FROM funding_action WHERE id=?").get(result.lastInsertRowid);
    return asAction(row as unknown as ActionRow);
  }

  updateAction(id: number, input: FundingActionInput): FundingAction | null {
    const timestamp = nowIso();
    const values = [input.track, input.title, input.amountCents, input.stage, input.priority, input.deadline, input.nextStep, input.owner, input.result, timestamp] as const;
    const result = this.workspaceId
      ? this.db.prepare("UPDATE funding_action SET track=?,title=?,amount_cents=?,stage=?,priority=?,deadline=?,next_step=?,owner=?,result=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values, id, this.workspaceId)
      : this.db.prepare("UPDATE funding_action SET track=?,title=?,amount_cents=?,stage=?,priority=?,deadline=?,next_step=?,owner=?,result=?,updated_at=? WHERE id=?").run(...values, id);
    if (result.changes === 0) return null;
    const row = this.workspaceId
      ? this.db.prepare("SELECT * FROM funding_action WHERE id=? AND workspace_id=?").get(id, this.workspaceId)
      : this.db.prepare("SELECT * FROM funding_action WHERE id=?").get(id);
    return asAction(row as unknown as ActionRow);
  }

  getCapitalStrategy(): CapitalStrategy | null {
    const row = this.workspaceId
      ? this.db.prepare("SELECT * FROM capital_strategy WHERE id=1 AND workspace_id=?").get(this.workspaceId) as StrategyRow | undefined
      : this.db.prepare("SELECT * FROM capital_strategy WHERE id=1").get() as StrategyRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      totalNeedCents: row.total_need_cents,
      allocations: JSON.parse(row.allocations_json) as CapitalStrategy["allocations"],
      unfundedResidualCents: row.unfunded_residual_cents,
      assumptions: JSON.parse(row.assumptions_json) as string[],
      warnings: JSON.parse(row.warnings_json) as string[],
      generatedAt: row.generated_at,
    };
  }

  saveCapitalStrategy(strategy: CapitalStrategy): CapitalStrategy {
    const values = [strategy.totalNeedCents, JSON.stringify(strategy.allocations), strategy.unfundedResidualCents, JSON.stringify(strategy.assumptions), JSON.stringify(strategy.warnings), strategy.generatedAt] as const;
    if (this.workspaceId) {
      this.db.prepare(`
        INSERT INTO capital_strategy (workspace_id,id,total_need_cents,allocations_json,unfunded_residual_cents,assumptions_json,warnings_json,generated_at)
        VALUES (?,1,?,?,?,?,?,?)
        ON CONFLICT(workspace_id,id) DO UPDATE SET
          total_need_cents=excluded.total_need_cents,
          allocations_json=excluded.allocations_json,
          unfunded_residual_cents=excluded.unfunded_residual_cents,
          assumptions_json=excluded.assumptions_json,
          warnings_json=excluded.warnings_json,
          generated_at=excluded.generated_at
      `).run(this.workspaceId, ...values);
    } else {
      this.db.prepare(`
        INSERT INTO capital_strategy (id,total_need_cents,allocations_json,unfunded_residual_cents,assumptions_json,warnings_json,generated_at)
        VALUES (1,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET
          total_need_cents=excluded.total_need_cents,
          allocations_json=excluded.allocations_json,
          unfunded_residual_cents=excluded.unfunded_residual_cents,
          assumptions_json=excluded.assumptions_json,
          warnings_json=excluded.warnings_json,
          generated_at=excluded.generated_at
      `).run(...values);
    }
    return this.getCapitalStrategy() as CapitalStrategy;
  }
}
