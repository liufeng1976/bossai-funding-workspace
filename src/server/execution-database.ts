import type { DatabaseSync } from "node:sqlite";
import { standardDataRoomCategories } from "../domain/execution.ts";
import { projectReceiptExpectationFulfillment } from "../domain/receipt-expectation-reconciliation.ts";
import type {
  ClosingCondition,
  ClosingConditionInput,
  DataRoom,
  DataRoomDocument,
  DataRoomDocumentInput,
  DataRoomFolder,
  DataRoomInput,
  DueDiligenceRequest,
  DueDiligenceRequestInput,
  FundingApplication,
  FundingApplicationInput,
  FundingDocument,
  FundingDocumentInput,
  FundingOutcome,
  FundingOutcomeInput,
  FundingReceiptTranche,
  FundingReceiptTrancheInput,
  FundingReceiptExpectation,
  FundingReceiptExpectationAllocation,
  FundingReceiptExpectationAllocationInput,
  FundingReceiptExpectationInput,
  TermSheet,
  TermSheetInput,
} from "../domain/types.ts";
import { assertOwnedReference, detectWorkspaceId } from "./repository-scope.ts";

interface ApplicationRow {
  id: number; opportunity_id: number | null; track: FundingApplicationInput["track"]; title: string;
  requested_amount_cents: number; approved_amount_cents: number; status: FundingApplicationInput["status"];
  deadline: string | null; submitted_date: string | null; decision_date: string | null; owner: string; next_action: string;
  rejection_reason: string; notes: string; created_at: string; updated_at: string;
}
interface DocumentRow {
  id: number; document_type: FundingDocumentInput["documentType"]; title: string; version: string;
  status: FundingDocumentInput["status"]; round_id: number | null; investor_id: number | null; application_id: number | null;
  completion_pct: number; notes: string; created_at: string; updated_at: string;
}
interface DataRoomRow { id: number; name: string; round_id: number | null; created_at: string; updated_at: string; }
interface FolderRow { id: number; data_room_id: number; category: DataRoomFolder["category"]; created_at: string; }
interface DataRoomDocumentRow {
  id: number; folder_id: number; document_id: number | null; title: string; status: DataRoomDocumentInput["status"];
  expires_at: string | null; notes: string; created_at: string; updated_at: string;
}
interface DdRow {
  id: number; investor_id: number; round_id: number | null; document_id: number | null; owner: string; deadline: string | null;
  status: DueDiligenceRequestInput["status"]; request: string; response_notes: string; created_at: string; updated_at: string;
}
interface TermSheetRow {
  id: number; investor_id: number; round_id: number | null; investment_amount_cents: number; pre_money_valuation_cents: number | null;
  equity_pct: number | null; liquidation_preference: string; board_seat: string; pro_rata: string; vesting: string;
  option_pool: string; exclusivity: string; closing_conditions: string; target_close_date: string | null; status: TermSheetInput["status"]; notes: string;
  created_at: string; updated_at: string;
}
interface ClosingConditionRow {
  id: number; term_sheet_id: number; title: string; owner: string; due_date: string | null;
  status: ClosingConditionInput["status"]; evidence_note: string; created_at: string; updated_at: string;
}
interface OutcomeRow {
  id: number; track: FundingOutcomeInput["track"];  application_id: number | null; investor_id: number | null; round_id: number | null;
  status: FundingOutcomeInput["status"]; approved_amount_cents: number; committed_amount_cents: number; received_amount_cents: number;
  received_date: string | null; commitment_evidence: string; receipt_evidence: string; conditions: string; loss_reason: string; feedback: string; retry_date: string | null;
  created_at: string; updated_at: string;
}
interface ReceiptTrancheRow {
  id: number; outcome_id: number; amount_cents: number; received_date: string; receipt_evidence: string; note: string;
  status: FundingReceiptTrancheInput["status"]; void_reason: string; created_at: string; updated_at: string;
}
interface ReceiptExpectationRow {
  id: number; outcome_id: number; amount_cents: number; expected_date: string; basis_note: string; owner: string; note: string;
  status: FundingReceiptExpectationInput["status"]; cancellation_reason: string; created_at: string; updated_at: string;
}
interface ReceiptExpectationAllocationRow {
  id: number; expectation_id: number; tranche_id: number; amount_cents: number; note: string;
  status: FundingReceiptExpectationAllocationInput["status"]; void_reason: string; created_at: string; updated_at: string;
}

function nowIso(): string { return new Date().toISOString(); }
function asApplication(row: ApplicationRow): FundingApplication {
  return { id: row.id, opportunityId: row.opportunity_id, track: row.track, title: row.title, requestedAmountCents: row.requested_amount_cents, approvedAmountCents: row.approved_amount_cents, status: row.status, deadline: row.deadline, submittedDate: row.submitted_date, decisionDate: row.decision_date, owner: row.owner, nextAction: row.next_action, rejectionReason: row.rejection_reason, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at };
}
function asDocument(row: DocumentRow): FundingDocument {
  return { id: row.id, documentType: row.document_type, title: row.title, version: row.version, status: row.status, roundId: row.round_id, investorId: row.investor_id, applicationId: row.application_id, completionPct: row.completion_pct, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at };
}
function asDataRoom(row: DataRoomRow): DataRoom { return { id: row.id, name: row.name, roundId: row.round_id, createdAt: row.created_at, updatedAt: row.updated_at }; }
function asFolder(row: FolderRow): DataRoomFolder { return { id: row.id, dataRoomId: row.data_room_id, category: row.category, createdAt: row.created_at }; }
function asDataRoomDocument(row: DataRoomDocumentRow): DataRoomDocument { return { id: row.id, folderId: row.folder_id, documentId: row.document_id, title: row.title, status: row.status, expiresAt: row.expires_at, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at }; }
function asDd(row: DdRow): DueDiligenceRequest { return { id: row.id, investorId: row.investor_id, roundId: row.round_id, documentId: row.document_id, owner: row.owner, deadline: row.deadline, status: row.status, request: row.request, responseNotes: row.response_notes, createdAt: row.created_at, updatedAt: row.updated_at }; }
function asTermSheet(row: TermSheetRow): TermSheet { return { id: row.id, investorId: row.investor_id, roundId: row.round_id, investmentAmountCents: row.investment_amount_cents, preMoneyValuationCents: row.pre_money_valuation_cents, equityPct: row.equity_pct, liquidationPreference: row.liquidation_preference, boardSeat: row.board_seat, proRata: row.pro_rata, vesting: row.vesting, optionPool: row.option_pool, exclusivity: row.exclusivity, closingConditions: row.closing_conditions, targetCloseDate: row.target_close_date ?? null, status: row.status, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at }; }
function asClosingCondition(row: ClosingConditionRow): ClosingCondition { return { id: row.id, termSheetId: row.term_sheet_id, title: row.title, owner: row.owner, dueDate: row.due_date, status: row.status, evidenceNote: row.evidence_note, createdAt: row.created_at, updatedAt: row.updated_at }; }
function asOutcome(row: OutcomeRow): FundingOutcome { return { id: row.id, track: row.track, applicationId: row.application_id, investorId: row.investor_id, roundId: row.round_id, status: row.status, approvedAmountCents: row.approved_amount_cents, committedAmountCents: row.committed_amount_cents, receivedAmountCents: row.received_amount_cents, receivedDate: row.received_date, commitmentEvidence: row.commitment_evidence ?? "", receiptEvidence: row.receipt_evidence ?? "", conditions: row.conditions, lossReason: row.loss_reason, feedback: row.feedback, retryDate: row.retry_date, createdAt: row.created_at, updatedAt: row.updated_at }; }
function asReceiptTranche(row: ReceiptTrancheRow): FundingReceiptTranche { return { id: row.id, outcomeId: row.outcome_id, amountCents: row.amount_cents, receivedDate: row.received_date, receiptEvidence: row.receipt_evidence, note: row.note, status: row.status, voidReason: row.void_reason, createdAt: row.created_at, updatedAt: row.updated_at }; }
function asReceiptExpectation(row: ReceiptExpectationRow): FundingReceiptExpectation { return { id: row.id, outcomeId: row.outcome_id, amountCents: row.amount_cents, expectedDate: row.expected_date, basisNote: row.basis_note, owner: row.owner, note: row.note, status: row.status, cancellationReason: row.cancellation_reason, createdAt: row.created_at, updatedAt: row.updated_at }; }
function asReceiptExpectationAllocation(row: ReceiptExpectationAllocationRow): FundingReceiptExpectationAllocation { return { id: row.id, expectationId: row.expectation_id, trancheId: row.tranche_id, amountCents: row.amount_cents, note: row.note, status: row.status, voidReason: row.void_reason, createdAt: row.created_at, updatedAt: row.updated_at }; }

export class ExecutionRepository {
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
      CREATE TABLE IF NOT EXISTS funding_application (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opportunity_id INTEGER REFERENCES funding_opportunity(id) ON DELETE SET NULL,
        track TEXT NOT NULL CHECK (track IN ('grant','debt','equity')),
        title TEXT NOT NULL,
        requested_amount_cents INTEGER NOT NULL CHECK (requested_amount_cents >= 0),
        approved_amount_cents INTEGER NOT NULL CHECK (approved_amount_cents >= 0),
        status TEXT NOT NULL CHECK (status IN ('draft','preparing','submitted','under-review','approved','rejected','withdrawn','funded')),
        deadline TEXT, submitted_date TEXT, decision_date TEXT,
        owner TEXT NOT NULL, next_action TEXT NOT NULL, rejection_reason TEXT NOT NULL, notes TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_funding_application_status_deadline ON funding_application(status, deadline);

      CREATE TABLE IF NOT EXISTS funding_document (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_type TEXT NOT NULL CHECK (document_type IN ('pitch-deck','executive-summary','business-plan','financial-model','use-of-funds','funding-memo','grant-narrative','loan-package','investor-update','due-diligence','other')),
        title TEXT NOT NULL, version TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('draft','in-review','ready','shared','archived')),
        round_id INTEGER REFERENCES fundraising_round(id) ON DELETE SET NULL,
        investor_id INTEGER REFERENCES investor(id) ON DELETE SET NULL,
        application_id INTEGER REFERENCES funding_application(id) ON DELETE SET NULL,
        completion_pct INTEGER NOT NULL CHECK (completion_pct >= 0 AND completion_pct <= 100),
        notes TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS data_room (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        round_id INTEGER REFERENCES fundraising_round(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS data_room_folder (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_room_id INTEGER NOT NULL REFERENCES data_room(id) ON DELETE CASCADE,
        category TEXT NOT NULL CHECK (category IN ('Corporate','Financial','Legal','Product','Customers','Team','IP','Fundraising')),
        created_at TEXT NOT NULL,
        UNIQUE(data_room_id, category)
      );
      CREATE TABLE IF NOT EXISTS data_room_document (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INTEGER NOT NULL REFERENCES data_room_folder(id) ON DELETE CASCADE,
        document_id INTEGER REFERENCES funding_document(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('missing','preparing','ready','shared','expired')),
        expires_at TEXT, notes TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS due_diligence_request (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        investor_id INTEGER NOT NULL REFERENCES investor(id) ON DELETE CASCADE,
        round_id INTEGER REFERENCES fundraising_round(id) ON DELETE SET NULL,
        document_id INTEGER REFERENCES funding_document(id) ON DELETE SET NULL,
        owner TEXT NOT NULL, deadline TEXT,
        status TEXT NOT NULL CHECK (status IN ('requested','preparing','ready','shared','accepted','needs-revision')),
        request TEXT NOT NULL, response_notes TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_due_diligence_deadline ON due_diligence_request(status, deadline);

      CREATE TABLE IF NOT EXISTS term_sheet (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        investor_id INTEGER NOT NULL REFERENCES investor(id) ON DELETE CASCADE,
        round_id INTEGER REFERENCES fundraising_round(id) ON DELETE SET NULL,
        investment_amount_cents INTEGER NOT NULL CHECK (investment_amount_cents >= 0),
        pre_money_valuation_cents INTEGER,
        equity_pct REAL,
        liquidation_preference TEXT NOT NULL, board_seat TEXT NOT NULL, pro_rata TEXT NOT NULL, vesting TEXT NOT NULL,
        option_pool TEXT NOT NULL, exclusivity TEXT NOT NULL, closing_conditions TEXT NOT NULL,
        target_close_date TEXT,
        status TEXT NOT NULL CHECK (status IN ('received','reviewing','negotiating','accepted','rejected','expired')),
        notes TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS term_sheet_closing_condition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term_sheet_id INTEGER NOT NULL REFERENCES term_sheet(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        owner TEXT NOT NULL,
        due_date TEXT,
        status TEXT NOT NULL CHECK (status IN ('open','in-progress','satisfied','waived')),
        evidence_note TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_closing_condition_status_due ON term_sheet_closing_condition(status, due_date);

      CREATE TABLE IF NOT EXISTS funding_outcome (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track TEXT NOT NULL CHECK (track IN ('grant','debt','equity')),
        application_id INTEGER REFERENCES funding_application(id) ON DELETE SET NULL,
        investor_id INTEGER REFERENCES investor(id) ON DELETE SET NULL,
        round_id INTEGER REFERENCES fundraising_round(id) ON DELETE SET NULL,
        status TEXT NOT NULL CHECK (status IN ('won','lost','withdrawn','closed')),
        approved_amount_cents INTEGER NOT NULL CHECK (approved_amount_cents >= 0),
        committed_amount_cents INTEGER NOT NULL CHECK (committed_amount_cents >= 0),
        received_amount_cents INTEGER NOT NULL CHECK (received_amount_cents >= 0),
        received_date TEXT, commitment_evidence TEXT NOT NULL DEFAULT '', receipt_evidence TEXT NOT NULL DEFAULT '', conditions TEXT NOT NULL, loss_reason TEXT NOT NULL, feedback TEXT NOT NULL, retry_date TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS funding_receipt_tranche (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT,
        outcome_id INTEGER NOT NULL REFERENCES funding_outcome(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        received_date TEXT NOT NULL,
        receipt_evidence TEXT NOT NULL,
        note TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('received','voided')),
        void_reason TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_receipt_tranche_outcome_date ON funding_receipt_tranche(outcome_id, received_date, id);

      CREATE TABLE IF NOT EXISTS funding_receipt_expectation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT,
        outcome_id INTEGER NOT NULL REFERENCES funding_outcome(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        expected_date TEXT NOT NULL,
        basis_note TEXT NOT NULL,
        owner TEXT NOT NULL,
        note TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('expected','cancelled')),
        cancellation_reason TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_receipt_expectation_outcome_date ON funding_receipt_expectation(outcome_id, status, expected_date, id);

      CREATE TABLE IF NOT EXISTS funding_receipt_expectation_allocation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT,
        expectation_id INTEGER NOT NULL REFERENCES funding_receipt_expectation(id) ON DELETE CASCADE,
        tranche_id INTEGER NOT NULL REFERENCES funding_receipt_tranche(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        note TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active','voided')),
        void_reason TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_receipt_expectation_allocation_expectation ON funding_receipt_expectation_allocation(expectation_id, status, id);
      CREATE INDEX IF NOT EXISTS idx_receipt_expectation_allocation_tranche ON funding_receipt_expectation_allocation(tranche_id, status, id);
    `);
    const termSheetColumns = this.db.prepare("PRAGMA table_info(term_sheet)").all() as unknown as Array<{ name: string }>;
    if (!termSheetColumns.some((column) => column.name === "target_close_date")) {
      this.db.exec("ALTER TABLE term_sheet ADD COLUMN target_close_date TEXT");
    }
    const outcomeColumns = this.db.prepare("PRAGMA table_info(funding_outcome)").all() as unknown as Array<{ name: string }>;
    if (!outcomeColumns.some((column) => column.name === "commitment_evidence")) {
      this.db.exec("ALTER TABLE funding_outcome ADD COLUMN commitment_evidence TEXT NOT NULL DEFAULT ''");
    }
    if (!outcomeColumns.some((column) => column.name === "receipt_evidence")) {
      this.db.exec("ALTER TABLE funding_outcome ADD COLUMN receipt_evidence TEXT NOT NULL DEFAULT ''");
    }
    const refreshedOutcomeColumns = this.db.prepare("PRAGMA table_info(funding_outcome)").all() as unknown as Array<{ name: string }>;
    const outcomeHasWorkspace = refreshedOutcomeColumns.some((column) => column.name === "workspace_id");
    if (outcomeHasWorkspace) {
      this.db.exec(`
        INSERT INTO funding_receipt_tranche(workspace_id,outcome_id,amount_cents,received_date,receipt_evidence,note,status,void_reason,created_at,updated_at)
        SELECT o.workspace_id,o.id,o.received_amount_cents,COALESCE(o.received_date,''),COALESCE(o.receipt_evidence,''),'Migrated from the pre-tranche Funding Outcome aggregate.','received','',o.created_at,o.updated_at
        FROM funding_outcome o
        WHERE o.received_amount_cents>0
          AND NOT EXISTS (SELECT 1 FROM funding_receipt_tranche t WHERE t.outcome_id=o.id)
      `);
    } else {
      this.db.exec(`
        INSERT INTO funding_receipt_tranche(outcome_id,amount_cents,received_date,receipt_evidence,note,status,void_reason,created_at,updated_at)
        SELECT o.id,o.received_amount_cents,COALESCE(o.received_date,''),COALESCE(o.receipt_evidence,''),'Migrated from the pre-tranche Funding Outcome aggregate.','received','',o.created_at,o.updated_at
        FROM funding_outcome o
        WHERE o.received_amount_cents>0
          AND NOT EXISTS (SELECT 1 FROM funding_receipt_tranche t WHERE t.outcome_id=o.id)
      `);
    }
  }

  private listScoped(table: string, orderBy: string): unknown[] {
    return this.workspaceId
      ? this.db.prepare(`SELECT * FROM "${table}" WHERE workspace_id=? ORDER BY ${orderBy}`).all(this.workspaceId)
      : this.db.prepare(`SELECT * FROM "${table}" ORDER BY ${orderBy}`).all();
  }

  private getScoped(table: string, id: number | bigint): unknown {
    return this.workspaceId
      ? this.db.prepare(`SELECT * FROM "${table}" WHERE id=? AND workspace_id=?`).get(id,this.workspaceId)
      : this.db.prepare(`SELECT * FROM "${table}" WHERE id=?`).get(id);
  }

  listApplications(): FundingApplication[] { return (this.listScoped("funding_application","updated_at DESC") as ApplicationRow[]).map(asApplication); }
  createApplication(input: FundingApplicationInput): FundingApplication {
    const at = nowIso();
    assertOwnedReference(this.db,"funding_opportunity","id",input.opportunityId,this.workspaceId,"Opportunity");
    const values = [input.opportunityId,input.track,input.title,input.requestedAmountCents,input.approvedAmountCents,input.status,input.deadline,input.submittedDate,input.decisionDate,input.owner,input.nextAction,input.rejectionReason,input.notes,at,at] as const;
    const result = this.workspaceId ? this.db.prepare("INSERT INTO funding_application (workspace_id,opportunity_id,track,title,requested_amount_cents,approved_amount_cents,status,deadline,submitted_date,decision_date,owner,next_action,rejection_reason,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values) : this.db.prepare("INSERT INTO funding_application (opportunity_id,track,title,requested_amount_cents,approved_amount_cents,status,deadline,submitted_date,decision_date,owner,next_action,rejection_reason,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...values);
    return asApplication(this.getScoped("funding_application",result.lastInsertRowid) as ApplicationRow);
  }
  updateApplication(id: number, input: FundingApplicationInput): FundingApplication | null {
    const at = nowIso();
    assertOwnedReference(this.db,"funding_opportunity","id",input.opportunityId,this.workspaceId,"Opportunity");
    const values = [input.opportunityId,input.track,input.title,input.requestedAmountCents,input.approvedAmountCents,input.status,input.deadline,input.submittedDate,input.decisionDate,input.owner,input.nextAction,input.rejectionReason,input.notes,at] as const;
    const result = this.workspaceId ? this.db.prepare("UPDATE funding_application SET opportunity_id=?,track=?,title=?,requested_amount_cents=?,approved_amount_cents=?,status=?,deadline=?,submitted_date=?,decision_date=?,owner=?,next_action=?,rejection_reason=?,notes=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId) : this.db.prepare("UPDATE funding_application SET opportunity_id=?,track=?,title=?,requested_amount_cents=?,approved_amount_cents=?,status=?,deadline=?,submitted_date=?,decision_date=?,owner=?,next_action=?,rejection_reason=?,notes=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    return asApplication(this.getScoped("funding_application",id) as ApplicationRow);
  }

  listDocuments(): FundingDocument[] { return (this.listScoped("funding_document","updated_at DESC") as DocumentRow[]).map(asDocument); }
  createDocument(input: FundingDocumentInput): FundingDocument {
    const at = nowIso();
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"funding_application","id",input.applicationId,this.workspaceId,"Application");
    const values = [input.documentType,input.title,input.version,input.status,input.roundId,input.investorId,input.applicationId,input.completionPct,input.notes,at,at] as const;
    const result = this.workspaceId ? this.db.prepare("INSERT INTO funding_document (workspace_id,document_type,title,version,status,round_id,investor_id,application_id,completion_pct,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values) : this.db.prepare("INSERT INTO funding_document (document_type,title,version,status,round_id,investor_id,application_id,completion_pct,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(...values);
    return asDocument(this.getScoped("funding_document",result.lastInsertRowid) as DocumentRow);
  }
  updateDocument(id: number, input: FundingDocumentInput): FundingDocument | null {
    const at = nowIso();
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"funding_application","id",input.applicationId,this.workspaceId,"Application");
    const values = [input.documentType,input.title,input.version,input.status,input.roundId,input.investorId,input.applicationId,input.completionPct,input.notes,at] as const;
    const result = this.workspaceId ? this.db.prepare("UPDATE funding_document SET document_type=?,title=?,version=?,status=?,round_id=?,investor_id=?,application_id=?,completion_pct=?,notes=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId) : this.db.prepare("UPDATE funding_document SET document_type=?,title=?,version=?,status=?,round_id=?,investor_id=?,application_id=?,completion_pct=?,notes=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    return asDocument(this.getScoped("funding_document",id) as DocumentRow);
  }

  listDataRooms(): DataRoom[] { return (this.listScoped("data_room","updated_at DESC") as DataRoomRow[]).map(asDataRoom); }
  createDataRoom(input: DataRoomInput): DataRoom {
    const at = nowIso();
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    this.db.exec("BEGIN");
    try {
      const result = this.workspaceId ? this.db.prepare("INSERT INTO data_room (workspace_id,name,round_id,created_at,updated_at) VALUES (?,?,?,?,?)").run(this.workspaceId,input.name,input.roundId,at,at) : this.db.prepare("INSERT INTO data_room (name,round_id,created_at,updated_at) VALUES (?,?,?,?)").run(input.name,input.roundId,at,at);
      const roomId = Number(result.lastInsertRowid);
      const insertFolder = this.workspaceId ? this.db.prepare("INSERT INTO data_room_folder (workspace_id,data_room_id,category,created_at) VALUES (?,?,?,?)") : this.db.prepare("INSERT INTO data_room_folder (data_room_id,category,created_at) VALUES (?,?,?)");
      for (const category of standardDataRoomCategories) {
        if (this.workspaceId) insertFolder.run(this.workspaceId,roomId,category,at);
        else insertFolder.run(roomId,category,at);
      }
      this.db.exec("COMMIT");
      return asDataRoom(this.getScoped("data_room",roomId) as DataRoomRow);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  listDataRoomFolders(): DataRoomFolder[] { return (this.listScoped("data_room_folder","data_room_id,id") as FolderRow[]).map(asFolder); }
  listDataRoomDocuments(): DataRoomDocument[] { return (this.listScoped("data_room_document","updated_at DESC") as DataRoomDocumentRow[]).map(asDataRoomDocument); }
  createDataRoomDocument(input: DataRoomDocumentInput): DataRoomDocument {
    const at = nowIso();
    assertOwnedReference(this.db,"data_room_folder","id",input.folderId,this.workspaceId,"Data room folder");
    assertOwnedReference(this.db,"funding_document","id",input.documentId,this.workspaceId,"Funding document");
    const values = [input.folderId,input.documentId,input.title,input.status,input.expiresAt,input.notes,at,at] as const;
    const result = this.workspaceId ? this.db.prepare("INSERT INTO data_room_document (workspace_id,folder_id,document_id,title,status,expires_at,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values) : this.db.prepare("INSERT INTO data_room_document (folder_id,document_id,title,status,expires_at,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").run(...values);
    return asDataRoomDocument(this.getScoped("data_room_document",result.lastInsertRowid) as DataRoomDocumentRow);
  }
  updateDataRoomDocument(id: number, input: DataRoomDocumentInput): DataRoomDocument | null {
    const at = nowIso();
    assertOwnedReference(this.db,"data_room_folder","id",input.folderId,this.workspaceId,"Data room folder");
    assertOwnedReference(this.db,"funding_document","id",input.documentId,this.workspaceId,"Funding document");
    const values = [input.folderId,input.documentId,input.title,input.status,input.expiresAt,input.notes,at] as const;
    const result = this.workspaceId ? this.db.prepare("UPDATE data_room_document SET folder_id=?,document_id=?,title=?,status=?,expires_at=?,notes=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId) : this.db.prepare("UPDATE data_room_document SET folder_id=?,document_id=?,title=?,status=?,expires_at=?,notes=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    return asDataRoomDocument(this.getScoped("data_room_document",id) as DataRoomDocumentRow);
  }

  listDueDiligenceRequests(): DueDiligenceRequest[] { return (this.listScoped("due_diligence_request","updated_at DESC") as DdRow[]).map(asDd); }
  createDueDiligenceRequest(input: DueDiligenceRequestInput): DueDiligenceRequest {
    const at = nowIso();
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    assertOwnedReference(this.db,"funding_document","id",input.documentId,this.workspaceId,"Funding document");
    const values = [input.investorId,input.roundId,input.documentId,input.owner,input.deadline,input.status,input.request,input.responseNotes,at,at] as const;
    const result = this.workspaceId ? this.db.prepare("INSERT INTO due_diligence_request (workspace_id,investor_id,round_id,document_id,owner,deadline,status,request,response_notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values) : this.db.prepare("INSERT INTO due_diligence_request (investor_id,round_id,document_id,owner,deadline,status,request,response_notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(...values);
    return asDd(this.getScoped("due_diligence_request",result.lastInsertRowid) as DdRow);
  }
  updateDueDiligenceRequest(id: number, input: DueDiligenceRequestInput): DueDiligenceRequest | null {
    const at = nowIso();
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    assertOwnedReference(this.db,"funding_document","id",input.documentId,this.workspaceId,"Funding document");
    const values = [input.investorId,input.roundId,input.documentId,input.owner,input.deadline,input.status,input.request,input.responseNotes,at] as const;
    const result = this.workspaceId ? this.db.prepare("UPDATE due_diligence_request SET investor_id=?,round_id=?,document_id=?,owner=?,deadline=?,status=?,request=?,response_notes=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId) : this.db.prepare("UPDATE due_diligence_request SET investor_id=?,round_id=?,document_id=?,owner=?,deadline=?,status=?,request=?,response_notes=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    return asDd(this.getScoped("due_diligence_request",id) as DdRow);
  }

  listTermSheets(): TermSheet[] { return (this.listScoped("term_sheet","updated_at DESC") as TermSheetRow[]).map(asTermSheet); }
  createTermSheet(input: TermSheetInput): TermSheet {
    const at = nowIso();
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    const values = [input.investorId,input.roundId,input.investmentAmountCents,input.preMoneyValuationCents,input.equityPct,input.liquidationPreference,input.boardSeat,input.proRata,input.vesting,input.optionPool,input.exclusivity,input.closingConditions,input.targetCloseDate ?? null,input.status,input.notes,at,at] as const;
    const result = this.workspaceId ? this.db.prepare("INSERT INTO term_sheet (workspace_id,investor_id,round_id,investment_amount_cents,pre_money_valuation_cents,equity_pct,liquidation_preference,board_seat,pro_rata,vesting,option_pool,exclusivity,closing_conditions,target_close_date,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values) : this.db.prepare("INSERT INTO term_sheet (investor_id,round_id,investment_amount_cents,pre_money_valuation_cents,equity_pct,liquidation_preference,board_seat,pro_rata,vesting,option_pool,exclusivity,closing_conditions,target_close_date,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...values);
    return asTermSheet(this.getScoped("term_sheet",result.lastInsertRowid) as TermSheetRow);
  }
  updateTermSheet(id: number, input: TermSheetInput): TermSheet | null {
    const at = nowIso();
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    const values = [input.investorId,input.roundId,input.investmentAmountCents,input.preMoneyValuationCents,input.equityPct,input.liquidationPreference,input.boardSeat,input.proRata,input.vesting,input.optionPool,input.exclusivity,input.closingConditions,input.targetCloseDate ?? null,input.status,input.notes,at] as const;
    const result = this.workspaceId ? this.db.prepare("UPDATE term_sheet SET investor_id=?,round_id=?,investment_amount_cents=?,pre_money_valuation_cents=?,equity_pct=?,liquidation_preference=?,board_seat=?,pro_rata=?,vesting=?,option_pool=?,exclusivity=?,closing_conditions=?,target_close_date=?,status=?,notes=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId) : this.db.prepare("UPDATE term_sheet SET investor_id=?,round_id=?,investment_amount_cents=?,pre_money_valuation_cents=?,equity_pct=?,liquidation_preference=?,board_seat=?,pro_rata=?,vesting=?,option_pool=?,exclusivity=?,closing_conditions=?,target_close_date=?,status=?,notes=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    return asTermSheet(this.getScoped("term_sheet",id) as TermSheetRow);
  }

  listClosingConditions(): ClosingCondition[] { return (this.listScoped("term_sheet_closing_condition","updated_at DESC") as ClosingConditionRow[]).map(asClosingCondition); }
  createClosingCondition(input: ClosingConditionInput): ClosingCondition {
    const at = nowIso();
    assertOwnedReference(this.db,"term_sheet","id",input.termSheetId,this.workspaceId,"Term sheet");
    const values = [input.termSheetId,input.title,input.owner,input.dueDate,input.status,input.evidenceNote,at,at] as const;
    const result = this.workspaceId ? this.db.prepare("INSERT INTO term_sheet_closing_condition (workspace_id,term_sheet_id,title,owner,due_date,status,evidence_note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values) : this.db.prepare("INSERT INTO term_sheet_closing_condition (term_sheet_id,title,owner,due_date,status,evidence_note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").run(...values);
    return asClosingCondition(this.getScoped("term_sheet_closing_condition",result.lastInsertRowid) as ClosingConditionRow);
  }
  updateClosingCondition(id: number, input: ClosingConditionInput): ClosingCondition | null {
    const at = nowIso();
    assertOwnedReference(this.db,"term_sheet","id",input.termSheetId,this.workspaceId,"Term sheet");
    const values = [input.termSheetId,input.title,input.owner,input.dueDate,input.status,input.evidenceNote,at] as const;
    const result = this.workspaceId ? this.db.prepare("UPDATE term_sheet_closing_condition SET term_sheet_id=?,title=?,owner=?,due_date=?,status=?,evidence_note=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId) : this.db.prepare("UPDATE term_sheet_closing_condition SET term_sheet_id=?,title=?,owner=?,due_date=?,status=?,evidence_note=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    return asClosingCondition(this.getScoped("term_sheet_closing_condition",id) as ClosingConditionRow);
  }

  listOutcomes(): FundingOutcome[] { return (this.listScoped("funding_outcome","updated_at DESC") as OutcomeRow[]).map(asOutcome); }
  listReceiptTranches(): FundingReceiptTranche[] { return (this.listScoped("funding_receipt_tranche","received_date DESC,id DESC") as ReceiptTrancheRow[]).map(asReceiptTranche); }
  listReceiptExpectations(): FundingReceiptExpectation[] { return (this.listScoped("funding_receipt_expectation","expected_date,id") as ReceiptExpectationRow[]).map(asReceiptExpectation); }
  listReceiptExpectationAllocations(): FundingReceiptExpectationAllocation[] { return (this.listScoped("funding_receipt_expectation_allocation","updated_at DESC,id DESC") as ReceiptExpectationAllocationRow[]).map(asReceiptExpectationAllocation); }

  private receiptTranchesForOutcome(outcomeId: number): FundingReceiptTranche[] {
    const rows = this.workspaceId
      ? this.db.prepare("SELECT * FROM funding_receipt_tranche WHERE outcome_id=? AND workspace_id=? ORDER BY received_date,id").all(outcomeId,this.workspaceId)
      : this.db.prepare("SELECT * FROM funding_receipt_tranche WHERE outcome_id=? ORDER BY received_date,id").all(outcomeId);
    return (rows as unknown as ReceiptTrancheRow[]).map(asReceiptTranche);
  }

  private activeReceiptExpectationRemainingTotal(outcomeId: number, excludeId: number | null = null): number {
    const expectations = this.listReceiptExpectations()
      .filter((expectation) => expectation.outcomeId === outcomeId && expectation.status === "expected" && expectation.id !== excludeId);
    const allocations = this.listReceiptExpectationAllocations();
    const tranches = this.listReceiptTranches();
    return expectations.reduce(
      (sum, expectation) => sum + projectReceiptExpectationFulfillment(expectation, allocations, tranches).remainingAmountCents,
      0,
    );
  }

  private activeAllocationTotalForExpectation(expectationId: number, excludeId: number | null = null): number {
    const rows = this.workspaceId
      ? this.db.prepare("SELECT id,amount_cents,status FROM funding_receipt_expectation_allocation WHERE expectation_id=? AND workspace_id=?").all(expectationId,this.workspaceId)
      : this.db.prepare("SELECT id,amount_cents,status FROM funding_receipt_expectation_allocation WHERE expectation_id=?").all(expectationId);
    return (rows as unknown as Array<{ id: number; amount_cents: number; status: FundingReceiptExpectationAllocationInput["status"] }>)
      .filter((row) => row.status === "active" && row.id !== excludeId)
      .reduce((sum, row) => sum + row.amount_cents, 0);
  }

  private activeAllocationTotalForTranche(trancheId: number, excludeId: number | null = null): number {
    const rows = this.workspaceId
      ? this.db.prepare("SELECT id,amount_cents,status FROM funding_receipt_expectation_allocation WHERE tranche_id=? AND workspace_id=?").all(trancheId,this.workspaceId)
      : this.db.prepare("SELECT id,amount_cents,status FROM funding_receipt_expectation_allocation WHERE tranche_id=?").all(trancheId);
    return (rows as unknown as Array<{ id: number; amount_cents: number; status: FundingReceiptExpectationAllocationInput["status"] }>)
      .filter((row) => row.status === "active" && row.id !== excludeId)
      .reduce((sum, row) => sum + row.amount_cents, 0);
  }

  private reconcileOutcomeReceipts(outcomeId: number): FundingOutcome {
    const outcomeRow = this.getScoped("funding_outcome",outcomeId) as OutcomeRow | undefined;
    if (!outcomeRow) throw new Error("Funding outcome not found.");
    const active = this.receiptTranchesForOutcome(outcomeId).filter((tranche) => tranche.status === "received");
    const receivedAmountCents = active.reduce((sum, tranche) => sum + tranche.amountCents, 0);
    if (receivedAmountCents > outcomeRow.committed_amount_cents) throw new Error("Receipt tranche total cannot exceed committed capital.");
    const receivedDate = active.length ? active.map((tranche) => tranche.receivedDate).sort().at(-1) ?? null : null;
    const receiptEvidence = active.length === 0
      ? ""
      : active.length === 1
        ? active[0]!.receiptEvidence
        : `See ${active.length} reconciled receipt tranches.`;
    const at = nowIso();
    const result = this.workspaceId
      ? this.db.prepare("UPDATE funding_outcome SET received_amount_cents=?,received_date=?,receipt_evidence=?,updated_at=? WHERE id=? AND workspace_id=?").run(receivedAmountCents,receivedDate,receiptEvidence,at,outcomeId,this.workspaceId)
      : this.db.prepare("UPDATE funding_outcome SET received_amount_cents=?,received_date=?,receipt_evidence=?,updated_at=? WHERE id=?").run(receivedAmountCents,receivedDate,receiptEvidence,at,outcomeId);
    if (result.changes === 0) throw new Error("Funding outcome not found.");
    return asOutcome(this.getScoped("funding_outcome",outcomeId) as OutcomeRow);
  }

  createReceiptTranche(input: FundingReceiptTrancheInput): FundingReceiptTranche {
    assertOwnedReference(this.db,"funding_outcome","id",input.outcomeId,this.workspaceId,"Funding outcome");
    if (input.status !== "received") throw new Error("Create a receipt tranche as received; void an existing tranche through correction.");
    const outcome = asOutcome(this.getScoped("funding_outcome",input.outcomeId) as OutcomeRow);
    if (outcome.status === "lost" || outcome.status === "withdrawn") throw new Error("Lost or withdrawn financing cannot receive a cash tranche.");
    const activeTotal = this.receiptTranchesForOutcome(input.outcomeId).filter((tranche) => tranche.status === "received").reduce((sum, tranche) => sum + tranche.amountCents, 0);
    if (activeTotal + input.amountCents > outcome.committedAmountCents) throw new Error("Receipt tranche total cannot exceed committed capital.");
    const at = nowIso();
    const values = [input.outcomeId,input.amountCents,input.receivedDate,input.receiptEvidence,input.note,input.status,input.voidReason,at,at] as const;
    this.db.exec("BEGIN");
    try {
      const result = this.workspaceId
        ? this.db.prepare("INSERT INTO funding_receipt_tranche (workspace_id,outcome_id,amount_cents,received_date,receipt_evidence,note,status,void_reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values)
        : this.db.prepare("INSERT INTO funding_receipt_tranche (outcome_id,amount_cents,received_date,receipt_evidence,note,status,void_reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").run(...values);
      this.reconcileOutcomeReceipts(input.outcomeId);
      this.db.exec("COMMIT");
      return asReceiptTranche(this.getScoped("funding_receipt_tranche",result.lastInsertRowid) as ReceiptTrancheRow);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  updateReceiptTranche(id: number, input: FundingReceiptTrancheInput): FundingReceiptTranche | null {
    const existingRow = this.getScoped("funding_receipt_tranche",id) as ReceiptTrancheRow | undefined;
    if (!existingRow) return null;
    const existing = asReceiptTranche(existingRow);
    if (input.outcomeId !== existing.outcomeId) throw new Error("Receipt tranche cannot be moved to another Funding Outcome.");
    assertOwnedReference(this.db,"funding_outcome","id",input.outcomeId,this.workspaceId,"Funding outcome");
    const outcome = asOutcome(this.getScoped("funding_outcome",input.outcomeId) as OutcomeRow);
    if (input.status === "received" && (outcome.status === "lost" || outcome.status === "withdrawn")) throw new Error("Lost or withdrawn financing cannot retain a received cash tranche.");
    const otherActiveTotal = this.receiptTranchesForOutcome(input.outcomeId)
      .filter((tranche) => tranche.id !== id && tranche.status === "received")
      .reduce((sum, tranche) => sum + tranche.amountCents, 0);
    if (input.status === "received" && otherActiveTotal + input.amountCents > outcome.committedAmountCents) throw new Error("Receipt tranche total cannot exceed committed capital.");
    const at = nowIso();
    const values = [input.amountCents,input.receivedDate,input.receiptEvidence,input.note,input.status,input.voidReason,at] as const;
    this.db.exec("BEGIN");
    try {
      const result = this.workspaceId
        ? this.db.prepare("UPDATE funding_receipt_tranche SET amount_cents=?,received_date=?,receipt_evidence=?,note=?,status=?,void_reason=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId)
        : this.db.prepare("UPDATE funding_receipt_tranche SET amount_cents=?,received_date=?,receipt_evidence=?,note=?,status=?,void_reason=?,updated_at=? WHERE id=?").run(...values,id);
      if (result.changes === 0) { this.db.exec("ROLLBACK"); return null; }
      this.reconcileOutcomeReceipts(input.outcomeId);
      this.db.exec("COMMIT");
      return asReceiptTranche(this.getScoped("funding_receipt_tranche",id) as ReceiptTrancheRow);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  createReceiptExpectation(input: FundingReceiptExpectationInput): FundingReceiptExpectation {
    assertOwnedReference(this.db,"funding_outcome","id",input.outcomeId,this.workspaceId,"Funding outcome");
    if (input.status !== "expected") throw new Error("Create an expected receipt as expected; cancel an existing expectation through correction.");
    const outcome = asOutcome(this.getScoped("funding_outcome",input.outcomeId) as OutcomeRow);
    if (outcome.status === "lost" || outcome.status === "withdrawn") throw new Error("Lost or withdrawn financing cannot carry an expected receipt schedule.");
    const outstanding = Math.max(0, outcome.committedAmountCents - outcome.receivedAmountCents);
    if (outstanding <= 0) throw new Error("No committed capital remains outstanding for this Funding Outcome.");
    const scheduled = this.activeReceiptExpectationRemainingTotal(input.outcomeId);
    if (scheduled + input.amountCents > outstanding) throw new Error("Expected receipt schedule cannot exceed committed capital that remains unreceived after explicit receipt allocations.");
    const at = nowIso();
    const values = [input.outcomeId,input.amountCents,input.expectedDate,input.basisNote,input.owner,input.note,input.status,input.cancellationReason,at,at] as const;
    const result = this.workspaceId
      ? this.db.prepare("INSERT INTO funding_receipt_expectation (workspace_id,outcome_id,amount_cents,expected_date,basis_note,owner,note,status,cancellation_reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values)
      : this.db.prepare("INSERT INTO funding_receipt_expectation (outcome_id,amount_cents,expected_date,basis_note,owner,note,status,cancellation_reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(...values);
    return asReceiptExpectation(this.getScoped("funding_receipt_expectation",result.lastInsertRowid) as ReceiptExpectationRow);
  }

  updateReceiptExpectation(id: number, input: FundingReceiptExpectationInput): FundingReceiptExpectation | null {
    const existingRow = this.getScoped("funding_receipt_expectation",id) as ReceiptExpectationRow | undefined;
    if (!existingRow) return null;
    const existing = asReceiptExpectation(existingRow);
    if (input.outcomeId !== existing.outcomeId) throw new Error("Expected receipt cannot be moved to another Funding Outcome.");
    assertOwnedReference(this.db,"funding_outcome","id",input.outcomeId,this.workspaceId,"Funding outcome");
    const outcome = asOutcome(this.getScoped("funding_outcome",input.outcomeId) as OutcomeRow);
    if (input.status === "expected" && (outcome.status === "lost" || outcome.status === "withdrawn")) throw new Error("Lost or withdrawn financing cannot retain an expected receipt schedule.");
    const activeAllocated = this.activeAllocationTotalForExpectation(id);
    if (input.amountCents < activeAllocated) throw new Error("Expected total cannot be lower than actual cash already explicitly allocated to this expectation. Correct or void the corresponding Allocation first.");
    if (input.status === "cancelled" && activeAllocated > 0) throw new Error("An expectation with active Allocations cannot be cancelled. Void the active Allocation(s) first; BossAI Funding will not erase or auto-void the owner's recorded relationship.");
    if (input.status === "expected") {
      const outstanding = Math.max(0, outcome.committedAmountCents - outcome.receivedAmountCents);
      const otherScheduled = this.activeReceiptExpectationRemainingTotal(input.outcomeId,id);
      const hypotheticalExpectation: FundingReceiptExpectation = {
        ...existing,
        ...input,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
      const updatedRemaining = projectReceiptExpectationFulfillment(
        hypotheticalExpectation,
        this.listReceiptExpectationAllocations(),
        this.listReceiptTranches(),
      ).remainingAmountCents;
      if (otherScheduled + updatedRemaining > outstanding) throw new Error("Remaining expected receipt schedule cannot exceed committed capital that remains unreceived after explicit receipt allocations.");
    }
    const at = nowIso();
    const values = [input.amountCents,input.expectedDate,input.basisNote,input.owner,input.note,input.status,input.cancellationReason,at] as const;
    const result = this.workspaceId
      ? this.db.prepare("UPDATE funding_receipt_expectation SET amount_cents=?,expected_date=?,basis_note=?,owner=?,note=?,status=?,cancellation_reason=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId)
      : this.db.prepare("UPDATE funding_receipt_expectation SET amount_cents=?,expected_date=?,basis_note=?,owner=?,note=?,status=?,cancellation_reason=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    return asReceiptExpectation(this.getScoped("funding_receipt_expectation",id) as ReceiptExpectationRow);
  }

  createReceiptExpectationAllocation(input: FundingReceiptExpectationAllocationInput): FundingReceiptExpectationAllocation {
    assertOwnedReference(this.db,"funding_receipt_expectation","id",input.expectationId,this.workspaceId,"Receipt expectation");
    assertOwnedReference(this.db,"funding_receipt_tranche","id",input.trancheId,this.workspaceId,"Receipt tranche");
    if (input.status !== "active") throw new Error("Create an expectation allocation as active; void an existing allocation through correction.");
    const expectation = asReceiptExpectation(this.getScoped("funding_receipt_expectation",input.expectationId) as ReceiptExpectationRow);
    const tranche = asReceiptTranche(this.getScoped("funding_receipt_tranche",input.trancheId) as ReceiptTrancheRow);
    if (expectation.status !== "expected") throw new Error("Cancelled receipt expectation cannot accept an active receipt allocation.");
    if (tranche.status !== "received") throw new Error("Voided receipt tranche cannot fulfill an expected receipt.");
    if (expectation.outcomeId !== tranche.outcomeId) throw new Error("Receipt expectation and receipt tranche must belong to the same Funding Outcome.");
    if (this.activeAllocationTotalForExpectation(input.expectationId) + input.amountCents > expectation.amountCents) throw new Error("Receipt allocation cannot exceed the expected receipt amount.");
    if (this.activeAllocationTotalForTranche(input.trancheId) + input.amountCents > tranche.amountCents) throw new Error("Receipt allocation cannot exceed the actual receipt tranche amount.");
    const at = nowIso();
    const values = [input.expectationId,input.trancheId,input.amountCents,input.note,input.status,input.voidReason,at,at] as const;
    const result = this.workspaceId
      ? this.db.prepare("INSERT INTO funding_receipt_expectation_allocation (workspace_id,expectation_id,tranche_id,amount_cents,note,status,void_reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values)
      : this.db.prepare("INSERT INTO funding_receipt_expectation_allocation (expectation_id,tranche_id,amount_cents,note,status,void_reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").run(...values);
    return asReceiptExpectationAllocation(this.getScoped("funding_receipt_expectation_allocation",result.lastInsertRowid) as ReceiptExpectationAllocationRow);
  }

  updateReceiptExpectationAllocation(id: number, input: FundingReceiptExpectationAllocationInput): FundingReceiptExpectationAllocation | null {
    const existingRow = this.getScoped("funding_receipt_expectation_allocation",id) as ReceiptExpectationAllocationRow | undefined;
    if (!existingRow) return null;
    const existing = asReceiptExpectationAllocation(existingRow);
    if (input.expectationId !== existing.expectationId || input.trancheId !== existing.trancheId) throw new Error("Receipt allocation relationship cannot be moved; void it and record a new explicit allocation instead.");
    assertOwnedReference(this.db,"funding_receipt_expectation","id",input.expectationId,this.workspaceId,"Receipt expectation");
    assertOwnedReference(this.db,"funding_receipt_tranche","id",input.trancheId,this.workspaceId,"Receipt tranche");
    const expectation = asReceiptExpectation(this.getScoped("funding_receipt_expectation",input.expectationId) as ReceiptExpectationRow);
    const tranche = asReceiptTranche(this.getScoped("funding_receipt_tranche",input.trancheId) as ReceiptTrancheRow);
    if (input.status === "active") {
      if (expectation.status !== "expected") throw new Error("Cancelled receipt expectation cannot retain an active receipt allocation.");
      if (tranche.status !== "received") throw new Error("Voided receipt tranche cannot retain an active expectation allocation.");
      if (expectation.outcomeId !== tranche.outcomeId) throw new Error("Receipt expectation and receipt tranche must belong to the same Funding Outcome.");
      if (this.activeAllocationTotalForExpectation(input.expectationId,id) + input.amountCents > expectation.amountCents) throw new Error("Allocation amount exceeds the remaining expectation capacity after excluding this Allocation.");
      if (this.activeAllocationTotalForTranche(input.trancheId,id) + input.amountCents > tranche.amountCents) throw new Error("Allocation amount exceeds the remaining Receipt Tranche capacity after excluding this Allocation.");
    }
    if (input.status === "voided" && !input.voidReason.trim()) throw new Error("Record why this receipt allocation is voided.");
    const at = nowIso();
    const values = [input.amountCents,input.note,input.status,input.voidReason,at] as const;
    const result = this.workspaceId
      ? this.db.prepare("UPDATE funding_receipt_expectation_allocation SET amount_cents=?,note=?,status=?,void_reason=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId)
      : this.db.prepare("UPDATE funding_receipt_expectation_allocation SET amount_cents=?,note=?,status=?,void_reason=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    return asReceiptExpectationAllocation(this.getScoped("funding_receipt_expectation_allocation",id) as ReceiptExpectationAllocationRow);
  }

  createOutcome(input: FundingOutcomeInput): FundingOutcome {
    const at = nowIso();
    assertOwnedReference(this.db,"funding_application","id",input.applicationId,this.workspaceId,"Application");
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    const values = [input.track,input.applicationId,input.investorId,input.roundId,input.status,input.approvedAmountCents,input.committedAmountCents,0,null,input.commitmentEvidence ?? "","",input.conditions,input.lossReason,input.feedback,input.retryDate,at,at] as const;
    this.db.exec("BEGIN");
    try {
      const result = this.workspaceId ? this.db.prepare("INSERT INTO funding_outcome (workspace_id,track,application_id,investor_id,round_id,status,approved_amount_cents,committed_amount_cents,received_amount_cents,received_date,commitment_evidence,receipt_evidence,conditions,loss_reason,feedback,retry_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...values) : this.db.prepare("INSERT INTO funding_outcome (track,application_id,investor_id,round_id,status,approved_amount_cents,committed_amount_cents,received_amount_cents,received_date,commitment_evidence,receipt_evidence,conditions,loss_reason,feedback,retry_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...values);
      const outcomeId = Number(result.lastInsertRowid);
      if (input.receivedAmountCents > 0) {
        const trancheValues = [outcomeId,input.receivedAmountCents,input.receivedDate ?? "",input.receiptEvidence ?? "","Initial receipt recorded with Funding Outcome.","received","",at,at] as const;
        if (this.workspaceId) this.db.prepare("INSERT INTO funding_receipt_tranche (workspace_id,outcome_id,amount_cents,received_date,receipt_evidence,note,status,void_reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(this.workspaceId,...trancheValues);
        else this.db.prepare("INSERT INTO funding_receipt_tranche (outcome_id,amount_cents,received_date,receipt_evidence,note,status,void_reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").run(...trancheValues);
      }
      const outcome = this.reconcileOutcomeReceipts(outcomeId);
      this.db.exec("COMMIT");
      return outcome;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  updateOutcome(id: number, input: FundingOutcomeInput): FundingOutcome | null {
    const existingRow = this.getScoped("funding_outcome",id) as OutcomeRow | undefined;
    if (!existingRow) return null;
    const existing = asOutcome(existingRow);
    const tranches = this.receiptTranchesForOutcome(id);
    if (tranches.length > 0 && (
      input.receivedAmountCents !== existing.receivedAmountCents
      || input.receivedDate !== existing.receivedDate
      || (input.receiptEvidence ?? "") !== existing.receiptEvidence
    )) {
      throw new Error("Received capital is managed by the Receipt Tranche Register; correct the specific tranche instead of editing the Outcome aggregate.");
    }
    const at = nowIso();
    assertOwnedReference(this.db,"funding_application","id",input.applicationId,this.workspaceId,"Application");
    assertOwnedReference(this.db,"investor","id",input.investorId,this.workspaceId,"Investor");
    assertOwnedReference(this.db,"fundraising_round","id",input.roundId,this.workspaceId,"Fundraising round");
    const values = [input.track,input.applicationId,input.investorId,input.roundId,input.status,input.approvedAmountCents,input.committedAmountCents,existing.receivedAmountCents,existing.receivedDate,input.commitmentEvidence ?? "",existing.receiptEvidence,input.conditions,input.lossReason,input.feedback,input.retryDate,at] as const;
    const result = this.workspaceId ? this.db.prepare("UPDATE funding_outcome SET track=?,application_id=?,investor_id=?,round_id=?,status=?,approved_amount_cents=?,committed_amount_cents=?,received_amount_cents=?,received_date=?,commitment_evidence=?,receipt_evidence=?,conditions=?,loss_reason=?,feedback=?,retry_date=?,updated_at=? WHERE id=? AND workspace_id=?").run(...values,id,this.workspaceId) : this.db.prepare("UPDATE funding_outcome SET track=?,application_id=?,investor_id=?,round_id=?,status=?,approved_amount_cents=?,committed_amount_cents=?,received_amount_cents=?,received_date=?,commitment_evidence=?,receipt_evidence=?,conditions=?,loss_reason=?,feedback=?,retry_date=?,updated_at=? WHERE id=?").run(...values,id);
    if (result.changes === 0) return null;
    return this.reconcileOutcomeReceipts(id);
  }
}
