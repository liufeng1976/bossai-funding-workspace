import type { DatabaseSync } from "node:sqlite";
import type {
  Contact,
  ContactInput,
  FinancingMeeting,
  FinancingMeetingInput,
  Fund,
  FundInput,
  InvestmentThesis,
  InvestmentThesisInput,
  Investor,
  InvestorFollowUp,
  InvestorFollowUpInput,
  InvestorInput,
} from "../domain/types.ts";
import { assertOwnedReference, detectWorkspaceId } from "./repository-scope.ts";

interface FundRow {
  id: number; name: string; fund_type: string; website: string; geography: string; portfolio: string; notes: string;
  created_at: string; updated_at: string;
}
interface InvestorRow {
  id: number; name: string; fund_id: number | null; round_id: number | null; stage: InvestorInput["stage"];
  priority: InvestorInput["priority"]; relationship: InvestorInput["relationship"]; warm_intro_source: string;
  cheque_min_cents: number; cheque_max_cents: number; geography: string; sectors: string; stages: string; portfolio: string;
  last_contact_date: string | null; next_follow_up_date: string | null; next_action: string; owner: string; notes: string;
  rejection_reason: string; created_at: string; updated_at: string;
}
interface ContactRow {
  id: number; investor_id: number | null; fund_id: number | null; name: string; title: string; email: string; phone: string;
  linkedin_url: string; notes: string; created_at: string; updated_at: string;
}
interface ThesisRow {
  id: number; fund_id: number | null; investor_id: number | null; sectors: string; stages: string; geography: string;
  cheque_min_cents: number; cheque_max_cents: number; thesis: string; created_at: string; updated_at: string;
}
interface MeetingRow {
  id: number; investor_id: number; round_id: number | null; meeting_at: string; meeting_type: FinancingMeetingInput["meetingType"];
  status: FinancingMeetingInput["status"]; attendees: string; objective: string; outcome: string; next_action: string;
  created_at: string; updated_at: string;
}
interface FollowUpRow {
  id: number; investor_id: number; due_date: string; status: InvestorFollowUpInput["status"];
  channel: InvestorFollowUpInput["channel"]; action: string; result: string; owner: string; created_at: string; updated_at: string;
}

function nowIso(): string { return new Date().toISOString(); }

function asFund(row: FundRow): Fund {
  return { id: row.id, name: row.name, fundType: row.fund_type, website: row.website, geography: row.geography, portfolio: row.portfolio, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at };
}
function asInvestor(row: InvestorRow): Investor {
  return {
    id: row.id, name: row.name, fundId: row.fund_id, roundId: row.round_id, stage: row.stage, priority: row.priority,
    relationship: row.relationship, warmIntroSource: row.warm_intro_source, chequeMinCents: row.cheque_min_cents,
    chequeMaxCents: row.cheque_max_cents, geography: row.geography, sectors: row.sectors, stages: row.stages,
    portfolio: row.portfolio, lastContactDate: row.last_contact_date, nextFollowUpDate: row.next_follow_up_date,
    nextAction: row.next_action, owner: row.owner, notes: row.notes, rejectionReason: row.rejection_reason,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function asContact(row: ContactRow): Contact {
  return { id: row.id, investorId: row.investor_id, fundId: row.fund_id, name: row.name, title: row.title, email: row.email, phone: row.phone, linkedinUrl: row.linkedin_url, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at };
}
function asThesis(row: ThesisRow): InvestmentThesis {
  return { id: row.id, fundId: row.fund_id, investorId: row.investor_id, sectors: row.sectors, stages: row.stages, geography: row.geography, chequeMinCents: row.cheque_min_cents, chequeMaxCents: row.cheque_max_cents, thesis: row.thesis, createdAt: row.created_at, updatedAt: row.updated_at };
}
function asMeeting(row: MeetingRow): FinancingMeeting {
  return { id: row.id, investorId: row.investor_id, roundId: row.round_id, meetingAt: row.meeting_at, meetingType: row.meeting_type, status: row.status, attendees: row.attendees, objective: row.objective, outcome: row.outcome, nextAction: row.next_action, createdAt: row.created_at, updatedAt: row.updated_at };
}
function asFollowUp(row: FollowUpRow): InvestorFollowUp {
  return { id: row.id, investorId: row.investor_id, dueDate: row.due_date, status: row.status, channel: row.channel, action: row.action, result: row.result, owner: row.owner, createdAt: row.created_at, updatedAt: row.updated_at };
}

export class EquityRepository {
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
      CREATE TABLE IF NOT EXISTS fund (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        fund_type TEXT NOT NULL,
        website TEXT NOT NULL,
        geography TEXT NOT NULL,
        portfolio TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS investor (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        fund_id INTEGER REFERENCES fund(id) ON DELETE SET NULL,
        round_id INTEGER REFERENCES fundraising_round(id) ON DELETE SET NULL,
        stage TEXT NOT NULL CHECK (stage IN ('target','research','ready-to-contact','contacted','replied','meeting','partner-meeting','due-diligence','term-sheet','negotiation','committed','closed','passed','no-response','not-a-fit')),
        priority TEXT NOT NULL CHECK (priority IN ('low','medium','high','critical')),
        relationship TEXT NOT NULL CHECK (relationship IN ('none','cold','warm','strong')),
        warm_intro_source TEXT NOT NULL,
        cheque_min_cents INTEGER NOT NULL CHECK (cheque_min_cents >= 0),
        cheque_max_cents INTEGER NOT NULL CHECK (cheque_max_cents >= cheque_min_cents),
        geography TEXT NOT NULL,
        sectors TEXT NOT NULL,
        stages TEXT NOT NULL,
        portfolio TEXT NOT NULL,
        last_contact_date TEXT,
        next_follow_up_date TEXT,
        next_action TEXT NOT NULL,
        owner TEXT NOT NULL,
        notes TEXT NOT NULL,
        rejection_reason TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_investor_stage ON investor(stage);
      CREATE INDEX IF NOT EXISTS idx_investor_followup ON investor(next_follow_up_date);
      CREATE TABLE IF NOT EXISTS contact (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        investor_id INTEGER REFERENCES investor(id) ON DELETE CASCADE,
        fund_id INTEGER REFERENCES fund(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        linkedin_url TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (investor_id IS NOT NULL OR fund_id IS NOT NULL)
      );
      CREATE TABLE IF NOT EXISTS investment_thesis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fund_id INTEGER REFERENCES fund(id) ON DELETE CASCADE,
        investor_id INTEGER REFERENCES investor(id) ON DELETE CASCADE,
        sectors TEXT NOT NULL,
        stages TEXT NOT NULL,
        geography TEXT NOT NULL,
        cheque_min_cents INTEGER NOT NULL CHECK (cheque_min_cents >= 0),
        cheque_max_cents INTEGER NOT NULL CHECK (cheque_max_cents >= cheque_min_cents),
        thesis TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (fund_id IS NOT NULL OR investor_id IS NOT NULL)
      );
      CREATE TABLE IF NOT EXISTS financing_meeting (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        investor_id INTEGER NOT NULL REFERENCES investor(id) ON DELETE CASCADE,
        round_id INTEGER REFERENCES fundraising_round(id) ON DELETE SET NULL,
        meeting_at TEXT NOT NULL,
        meeting_type TEXT NOT NULL CHECK (meeting_type IN ('intro','pitch','partner','diligence','terms','other')),
        status TEXT NOT NULL CHECK (status IN ('scheduled','completed','cancelled')),
        attendees TEXT NOT NULL,
        objective TEXT NOT NULL,
        outcome TEXT NOT NULL,
        next_action TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_financing_meeting_at ON financing_meeting(meeting_at);
      CREATE TABLE IF NOT EXISTS investor_follow_up (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        investor_id INTEGER NOT NULL REFERENCES investor(id) ON DELETE CASCADE,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending','completed','cancelled')),
        channel TEXT NOT NULL CHECK (channel IN ('email','call','meeting','intro','other')),
        action TEXT NOT NULL,
        result TEXT NOT NULL,
        owner TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_investor_follow_up_due ON investor_follow_up(status, due_date);
    `);
  }

  listFunds(): Fund[] {
    const rows = this.workspaceId
      ? this.db.prepare("SELECT * FROM fund WHERE workspace_id=? ORDER BY updated_at DESC").all(this.workspaceId)
      : this.db.prepare("SELECT * FROM fund ORDER BY updated_at DESC").all();
    return (rows as unknown as FundRow[]).map(asFund);
  }
  createFund(input: FundInput): Fund {
    const at = nowIso();
    const result = this.workspaceId
      ? this.db.prepare("INSERT INTO fund (workspace_id,name,fund_type,website,geography,portfolio,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").run(this.workspaceId,input.name,input.fundType,input.website,input.geography,input.portfolio,input.notes,at,at)
      : this.db.prepare("INSERT INTO fund (name,fund_type,website,geography,portfolio,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").run(input.name,input.fundType,input.website,input.geography,input.portfolio,input.notes,at,at);
    const row = this.workspaceId
      ? this.db.prepare("SELECT * FROM fund WHERE id=? AND workspace_id=?").get(result.lastInsertRowid,this.workspaceId)
      : this.db.prepare("SELECT * FROM fund WHERE id=?").get(result.lastInsertRowid);
    return asFund(row as unknown as FundRow);
  }

  listInvestors(): Investor[] {
    const rows = this.workspaceId
      ? this.db.prepare("SELECT * FROM investor WHERE workspace_id=? ORDER BY updated_at DESC").all(this.workspaceId)
      : this.db.prepare("SELECT * FROM investor ORDER BY updated_at DESC").all();
    return (rows as unknown as InvestorRow[]).map(asInvestor);
  }
  createInvestor(input: InvestorInput): Investor {
    const at = nowIso();
    assertOwnedReference(this.db,"fund","id",input.fundId,this.workspaceId,"Fund");
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    const values = [input.name,input.fundId,input.roundId,input.stage,input.priority,input.relationship,input.warmIntroSource,input.chequeMinCents,input.chequeMaxCents,input.geography,input.sectors,input.stages,input.portfolio,input.lastContactDate,input.nextFollowUpDate,input.nextAction,input.owner,input.notes,input.rejectionReason,at,at] as const;
    const result = this.workspaceId
      ? this.db.prepare("INSERT INTO investor (workspace_id,name,fund_id,round_id,stage,priority,relationship,warm_intro_source,cheque_min_cents,cheque_max_cents,geography,sectors,stages,portfolio,last_contact_date,next_follow_up_date,next_action,owner,notes,rejection_reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values)
      : this.db.prepare("INSERT INTO investor (name,fund_id,round_id,stage,priority,relationship,warm_intro_source,cheque_min_cents,cheque_max_cents,geography,sectors,stages,portfolio,last_contact_date,next_follow_up_date,next_action,owner,notes,rejection_reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...values);
    const row = this.workspaceId ? this.db.prepare("SELECT * FROM investor WHERE id=? AND workspace_id=?").get(result.lastInsertRowid,this.workspaceId) : this.db.prepare("SELECT * FROM investor WHERE id=?").get(result.lastInsertRowid);
    return asInvestor(row as unknown as InvestorRow);
  }
  updateInvestor(id: number, input: InvestorInput): Investor | null {
    const at = nowIso();
    assertOwnedReference(this.db,"fund","id",input.fundId,this.workspaceId,"Fund");
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    const values = [input.name,input.fundId,input.roundId,input.stage,input.priority,input.relationship,input.warmIntroSource,input.chequeMinCents,input.chequeMaxCents,input.geography,input.sectors,input.stages,input.portfolio,input.lastContactDate,input.nextFollowUpDate,input.nextAction,input.owner,input.notes,input.rejectionReason,at] as const;
    const result = this.workspaceId
      ? this.db.prepare("UPDATE investor SET name=?,fund_id=?,round_id=?,stage=?,priority=?,relationship=?,warm_intro_source=?,cheque_min_cents=?,cheque_max_cents=?,geography=?,sectors=?,stages=?,portfolio=?,last_contact_date=?,next_follow_up_date=?,next_action=?,owner=?,notes=?,rejection_reason=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId)
      : this.db.prepare("UPDATE investor SET name=?,fund_id=?,round_id=?,stage=?,priority=?,relationship=?,warm_intro_source=?,cheque_min_cents=?,cheque_max_cents=?,geography=?,sectors=?,stages=?,portfolio=?,last_contact_date=?,next_follow_up_date=?,next_action=?,owner=?,notes=?,rejection_reason=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    const row = this.workspaceId ? this.db.prepare("SELECT * FROM investor WHERE id=? AND workspace_id=?").get(id,this.workspaceId) : this.db.prepare("SELECT * FROM investor WHERE id=?").get(id);
    return asInvestor(row as unknown as InvestorRow);
  }

  listContacts(): Contact[] {
    const rows = this.workspaceId ? this.db.prepare("SELECT * FROM contact WHERE workspace_id=? ORDER BY updated_at DESC").all(this.workspaceId) : this.db.prepare("SELECT * FROM contact ORDER BY updated_at DESC").all();
    return (rows as unknown as ContactRow[]).map(asContact);
  }
  createContact(input: ContactInput): Contact {
    const at = nowIso();
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"fund","id",input.fundId,this.workspaceId,"Fund");
    const values = [input.investorId,input.fundId,input.name,input.title,input.email,input.phone,input.linkedinUrl,input.notes,at,at] as const;
    const result = this.workspaceId ? this.db.prepare("INSERT INTO contact (workspace_id,investor_id,fund_id,name,title,email,phone,linkedin_url,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values) : this.db.prepare("INSERT INTO contact (investor_id,fund_id,name,title,email,phone,linkedin_url,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(...values);
    const row = this.workspaceId ? this.db.prepare("SELECT * FROM contact WHERE id=? AND workspace_id=?").get(result.lastInsertRowid,this.workspaceId) : this.db.prepare("SELECT * FROM contact WHERE id=?").get(result.lastInsertRowid);
    return asContact(row as unknown as ContactRow);
  }

  listInvestmentTheses(): InvestmentThesis[] {
    const rows = this.workspaceId ? this.db.prepare("SELECT * FROM investment_thesis WHERE workspace_id=? ORDER BY updated_at DESC").all(this.workspaceId) : this.db.prepare("SELECT * FROM investment_thesis ORDER BY updated_at DESC").all();
    return (rows as unknown as ThesisRow[]).map(asThesis);
  }
  createInvestmentThesis(input: InvestmentThesisInput): InvestmentThesis {
    const at = nowIso();
    assertOwnedReference(this.db,"fund","id",input.fundId,this.workspaceId,"Fund");
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    const values = [input.fundId,input.investorId,input.sectors,input.stages,input.geography,input.chequeMinCents,input.chequeMaxCents,input.thesis,at,at] as const;
    const result = this.workspaceId ? this.db.prepare("INSERT INTO investment_thesis (workspace_id,fund_id,investor_id,sectors,stages,geography,cheque_min_cents,cheque_max_cents,thesis,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values) : this.db.prepare("INSERT INTO investment_thesis (fund_id,investor_id,sectors,stages,geography,cheque_min_cents,cheque_max_cents,thesis,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(...values);
    const row = this.workspaceId ? this.db.prepare("SELECT * FROM investment_thesis WHERE id=? AND workspace_id=?").get(result.lastInsertRowid,this.workspaceId) : this.db.prepare("SELECT * FROM investment_thesis WHERE id=?").get(result.lastInsertRowid);
    return asThesis(row as unknown as ThesisRow);
  }

  listMeetings(): FinancingMeeting[] {
    const rows = this.workspaceId ? this.db.prepare("SELECT * FROM financing_meeting WHERE workspace_id=? ORDER BY meeting_at ASC").all(this.workspaceId) : this.db.prepare("SELECT * FROM financing_meeting ORDER BY meeting_at ASC").all();
    return (rows as unknown as MeetingRow[]).map(asMeeting);
  }
  createMeeting(input: FinancingMeetingInput): FinancingMeeting {
    const at = nowIso();
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    const values = [input.investorId,input.roundId,input.meetingAt,input.meetingType,input.status,input.attendees,input.objective,input.outcome,input.nextAction,at,at] as const;
    const result = this.workspaceId ? this.db.prepare("INSERT INTO financing_meeting (workspace_id,investor_id,round_id,meeting_at,meeting_type,status,attendees,objective,outcome,next_action,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values) : this.db.prepare("INSERT INTO financing_meeting (investor_id,round_id,meeting_at,meeting_type,status,attendees,objective,outcome,next_action,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(...values);
    const row = this.workspaceId ? this.db.prepare("SELECT * FROM financing_meeting WHERE id=? AND workspace_id=?").get(result.lastInsertRowid,this.workspaceId) : this.db.prepare("SELECT * FROM financing_meeting WHERE id=?").get(result.lastInsertRowid);
    return asMeeting(row as unknown as MeetingRow);
  }
  updateMeeting(id: number, input: FinancingMeetingInput): FinancingMeeting | null {
    const at = nowIso();
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    const values = [input.investorId,input.roundId,input.meetingAt,input.meetingType,input.status,input.attendees,input.objective,input.outcome,input.nextAction,at] as const;
    const result = this.workspaceId ? this.db.prepare("UPDATE financing_meeting SET investor_id=?,round_id=?,meeting_at=?,meeting_type=?,status=?,attendees=?,objective=?,outcome=?,next_action=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId) : this.db.prepare("UPDATE financing_meeting SET investor_id=?,round_id=?,meeting_at=?,meeting_type=?,status=?,attendees=?,objective=?,outcome=?,next_action=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    const row = this.workspaceId ? this.db.prepare("SELECT * FROM financing_meeting WHERE id=? AND workspace_id=?").get(id,this.workspaceId) : this.db.prepare("SELECT * FROM financing_meeting WHERE id=?").get(id);
    return asMeeting(row as unknown as MeetingRow);
  }

  listFollowUps(): InvestorFollowUp[] {
    const rows = this.workspaceId ? this.db.prepare("SELECT * FROM investor_follow_up WHERE workspace_id=? ORDER BY due_date ASC").all(this.workspaceId) : this.db.prepare("SELECT * FROM investor_follow_up ORDER BY due_date ASC").all();
    return (rows as unknown as FollowUpRow[]).map(asFollowUp);
  }
  createFollowUp(input: InvestorFollowUpInput): InvestorFollowUp {
    const at = nowIso();
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    const values = [input.investorId,input.dueDate,input.status,input.channel,input.action,input.result,input.owner,at,at] as const;
    const result = this.workspaceId ? this.db.prepare("INSERT INTO investor_follow_up (workspace_id,investor_id,due_date,status,channel,action,result,owner,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values) : this.db.prepare("INSERT INTO investor_follow_up (investor_id,due_date,status,channel,action,result,owner,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").run(...values);
    const row = this.workspaceId ? this.db.prepare("SELECT * FROM investor_follow_up WHERE id=? AND workspace_id=?").get(result.lastInsertRowid,this.workspaceId) : this.db.prepare("SELECT * FROM investor_follow_up WHERE id=?").get(result.lastInsertRowid);
    return asFollowUp(row as unknown as FollowUpRow);
  }
  updateFollowUp(id: number, input: InvestorFollowUpInput): InvestorFollowUp | null {
    const at = nowIso();
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    const values = [input.investorId,input.dueDate,input.status,input.channel,input.action,input.result,input.owner,at] as const;
    const result = this.workspaceId ? this.db.prepare("UPDATE investor_follow_up SET investor_id=?,due_date=?,status=?,channel=?,action=?,result=?,owner=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId) : this.db.prepare("UPDATE investor_follow_up SET investor_id=?,due_date=?,status=?,channel=?,action=?,result=?,owner=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    const row = this.workspaceId ? this.db.prepare("SELECT * FROM investor_follow_up WHERE id=? AND workspace_id=?").get(id,this.workspaceId) : this.db.prepare("SELECT * FROM investor_follow_up WHERE id=?").get(id);
    return asFollowUp(row as unknown as FollowUpRow);
  }
}
