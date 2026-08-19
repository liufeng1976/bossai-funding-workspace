import { projectOpportunityDeadlineViability } from "./opportunity-viability.ts";
import { projectFundingOutcomeResolution } from "./resolution.ts";
import type {
  CapitalPipelineEvidenceKind,
  CapitalPipelineItem,
  FundingAction,
  FundingApplication,
  FundingOpportunity,
  FundingOutcome,
  FundingTrack,
  Investor,
  InvestorFollowUp,
  TermSheet,
  TrackSummary,
} from "./types.ts";

export interface CapitalPipelineTruth {
  totalInMotionCents: number;
  tracks: TrackSummary[];
  items: CapitalPipelineItem[];
}

interface PipelineInput {
  actions: FundingAction[];
  opportunities: FundingOpportunity[];
  investors: Investor[];
  followUps: InvestorFollowUp[];
  applications: FundingApplication[];
  termSheets: TermSheet[];
  outcomes?: FundingOutcome[];
  now?: Date;
}

interface EvidenceItem extends CapitalPipelineItem {
  identity: string;
}

const terminalActionStages = new Set(["received", "rejected", "passed", "not-a-fit", "closed"]);
const terminalInvestorStages = new Set(["closed", "passed", "no-response", "not-a-fit"]);
const terminalApplicationStatuses = new Set(["funded", "rejected", "withdrawn"]);
const activeTermSheetStatuses = new Set(["received", "reviewing", "negotiating", "accepted"]);

function opportunityTrack(opportunity: FundingOpportunity): FundingTrack {
  return opportunity.type === "grant" ? "grant" : opportunity.type === "loan" ? "debt" : "equity";
}

function amountForApplication(application: FundingApplication): number {
  return Math.max(0, application.approvedAmountCents > 0 ? application.approvedAmountCents : application.requestedAmountCents);
}

function latestByUpdatedAt<T extends { updatedAt: string; id: number }>(items: readonly T[]): T | null {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id)[0] ?? null;
}

function selectLatestPerKey<T extends { updatedAt: string; id: number }>(items: readonly T[], keyOf: (item: T) => string): T[] {
  const selected = new Map<string, T>();
  for (const item of items) {
    const key = keyOf(item);
    const current = selected.get(key);
    if (!current || item.updatedAt > current.updatedAt || (item.updatedAt === current.updatedAt && item.id > current.id)) {
      selected.set(key, item);
    }
  }
  return [...selected.values()];
}

function nearestDateRisk(label: string, dates: Array<string | null>): string {
  const dated = dates.filter((value): value is string => Boolean(value)).sort((a, b) => a.localeCompare(b));
  return dated[0] ? `${label} nearest recorded date is ${dated[0]}.` : `${label} has no recorded near-term date; confirm the next dated move.`;
}

function evidencePriority(kind: CapitalPipelineEvidenceKind): number {
  if (kind === "term-sheet") return 5;
  if (kind === "application") return 4;
  if (kind === "investor") return 3;
  if (kind === "opportunity") return 2;
  return 1;
}

function dedupeEvidence(items: EvidenceItem[]): EvidenceItem[] {
  const selected = new Map<string, EvidenceItem>();
  for (const item of items) {
    const current = selected.get(item.identity);
    if (!current
      || evidencePriority(item.kind) > evidencePriority(current.kind)
      || (item.kind === current.kind && item.updatedAt > current.updatedAt)) {
      selected.set(item.identity, item);
    }
  }
  return [...selected.values()];
}

function pipelineExplanation(kinds: CapitalPipelineEvidenceKind[], fallbackUsed: boolean): string {
  if (fallbackUsed) {
    return "No more-specific opportunity/application/investor/term-sheet pipeline evidence is recorded for this track, so active Funding Actions are used as the fallback amount.";
  }
  const label = kinds.map((kind) => kind.replaceAll("-", " ")).join(" + ");
  return `In-motion capital uses ${label} evidence. Linked records are counted at their most-specific known stage to avoid stacking the same financing path twice.`;
}

function grantOrDebtEvidence(track: "grant" | "debt", input: PipelineInput): EvidenceItem[] {
  const resolved = projectFundingOutcomeResolution(input.applications, input.outcomes ?? []);
  const now = input.now ?? new Date();
  const relevantApplications = selectLatestPerKey(
    input.applications.filter((item) => item.track === track && !terminalApplicationStatuses.has(item.status) && !resolved.resolvedApplicationIds.has(item.id)),
    (item) => item.opportunityId ? `opportunity:${item.opportunityId}` : `application:${item.id}`,
  );
  const coveredOpportunityIds = new Set(relevantApplications.flatMap((item) => item.opportunityId ? [item.opportunityId] : []));
  const applications: EvidenceItem[] = relevantApplications.map((item) => ({
    identity: item.opportunityId ? `opportunity:${item.opportunityId}` : `application:${item.id}`,
    key: `application:${item.id}`,
    track,
    kind: "application",
    amountCents: amountForApplication(item),
    updatedAt: item.updatedAt,
    label: `${item.title} · ${item.status}`,
    status: item.status,
    risk: item.deadline ? `${item.title} is working toward ${item.deadline}.` : `${item.title} has no recorded deadline.`,
    nextStep: item.nextAction || "Record the next application move.",
    entityType: "funding-application",
    entityId: item.id,
    destination: "execution",
  }));

  const opportunities: EvidenceItem[] = input.opportunities
    .filter((item) => opportunityTrack(item) === track
      && item.decision === "pursuing"
      && !coveredOpportunityIds.has(item.id)
      && !resolved.resolvedOpportunityIds.has(item.id)
      && projectOpportunityDeadlineViability(item, now).deadlineViable)
    .map((item) => ({
      identity: `opportunity:${item.id}`,
      key: `opportunity:${item.id}`,
      track,
      kind: "opportunity" as const,
      amountCents: Math.max(0, item.amountMaxCents),
      updatedAt: item.updatedAt,
      label: `${item.title} · pursuing`,
      status: item.decision,
      risk: item.deadline ? `${item.title} has a recorded deadline of ${item.deadline}.` : `${item.title} has no recorded deadline.`,
      nextStep: "Create or advance the concrete financing application/action for this pursued opportunity.",
      entityType: "opportunity" as const,
      entityId: item.id,
      destination: "opportunities" as const,
    }));

  const concrete = [...applications, ...opportunities];
  if (concrete.length > 0) return concrete;
  if ((input.outcomes ?? []).some((outcome) => outcome.track === track)) return [];

  return input.actions
    .filter((item) => item.track === track && !terminalActionStages.has(item.stage) && item.stage !== "committed")
    .map((item) => ({
      identity: `funding-action:${item.id}`,
      key: `funding-action:${item.id}`,
      track,
      kind: "funding-action" as const,
      amountCents: Math.max(0, item.amountCents),
      updatedAt: item.updatedAt,
      label: `${item.title} · ${item.stage}`,
      status: item.stage,
      risk: item.deadline ? `${item.title} has a recorded deadline of ${item.deadline}.` : `${item.title} has no recorded deadline.`,
      nextStep: item.nextStep || "Record the next financing move.",
      entityType: "funding-action" as const,
      entityId: item.id,
      destination: "actions" as const,
    }));
}

function equityEvidence(input: PipelineInput): EvidenceItem[] {
  const resolved = projectFundingOutcomeResolution(input.applications, input.outcomes ?? []);
  const now = input.now ?? new Date();
  const activeTermSheets = selectLatestPerKey(
    input.termSheets.filter((item) => activeTermSheetStatuses.has(item.status) && !resolved.resolvedInvestorIds.has(item.investorId)),
    (item) => `investor:${item.investorId}`,
  );
  const investorsCoveredByTerms = new Set(activeTermSheets.map((item) => item.investorId));
  const investorById = new Map(input.investors.map((item) => [item.id, item]));
  const evidence: EvidenceItem[] = activeTermSheets.map((item) => {
    const investor = investorById.get(item.investorId);
    return {
      identity: `investor:${item.investorId}`,
      key: `term-sheet:${item.id}`,
      track: "equity",
      kind: "term-sheet",
      amountCents: Math.max(0, item.investmentAmountCents),
      updatedAt: item.updatedAt,
      label: `${investor?.name ?? "Investor"} term sheet · ${item.status}`,
      status: item.status,
      risk: `Terms are ${item.status.replaceAll("-", " ")}; signed/received capital is not implied by the term sheet itself.`,
      nextStep: item.status === "accepted"
        ? "Complete closing conditions and record committed or received capital only when supporting evidence exists."
        : "Resolve open terms with counsel and record the closing outcome.",
      entityType: "term-sheet",
      entityId: item.id,
      destination: "execution",
    };
  });

  const relevantApplications = selectLatestPerKey(
    input.applications.filter((item) => item.track === "equity" && !terminalApplicationStatuses.has(item.status) && !resolved.resolvedApplicationIds.has(item.id)),
    (item) => item.opportunityId ? `opportunity:${item.opportunityId}` : `application:${item.id}`,
  );
  const coveredOpportunityIds = new Set(relevantApplications.flatMap((item) => item.opportunityId ? [item.opportunityId] : []));
  for (const item of relevantApplications) {
    const opportunity = item.opportunityId ? input.opportunities.find((candidate) => candidate.id === item.opportunityId) : undefined;
    if (opportunity?.investorId && investorsCoveredByTerms.has(opportunity.investorId)) continue;
    evidence.push({
      identity: opportunity?.investorId ? `investor:${opportunity.investorId}` : item.opportunityId ? `opportunity:${item.opportunityId}` : `application:${item.id}`,
      key: `application:${item.id}`,
      track: "equity",
      kind: "application",
      amountCents: amountForApplication(item),
      updatedAt: item.updatedAt,
      label: `${item.title} · ${item.status}`,
      status: item.status,
      risk: item.deadline ? `${item.title} is working toward ${item.deadline}.` : `${item.title} has no recorded deadline.`,
      nextStep: item.nextAction || "Record the next application move.",
      entityType: "funding-application",
      entityId: item.id,
      destination: "execution",
    });
  }

  const coveredIdentities = new Set(evidence.map((item) => item.identity));
  const activeInvestors = input.investors.filter((item) => !terminalInvestorStages.has(item.stage) && !resolved.resolvedInvestorIds.has(item.id));
  const pendingFollowUpByInvestor = new Map<number, InvestorFollowUp>();
  for (const followUp of input.followUps
    .filter((item) => item.status === "pending")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    if (!pendingFollowUpByInvestor.has(followUp.investorId)) pendingFollowUpByInvestor.set(followUp.investorId, followUp);
  }
  for (const investor of activeInvestors) {
    const identity = `investor:${investor.id}`;
    if (coveredIdentities.has(identity)) continue;
    const followUp = pendingFollowUpByInvestor.get(investor.id);
    evidence.push({
      identity,
      key: `investor:${investor.id}`,
      track: "equity",
      kind: "investor",
      amountCents: Math.max(0, investor.chequeMaxCents),
      updatedAt: investor.updatedAt,
      label: `${investor.name} · ${investor.stage}`,
      status: investor.stage,
      risk: followUp
        ? `${investor.name} follow-up is due ${followUp.dueDate}.`
        : investor.nextFollowUpDate
          ? `${investor.name} next follow-up is ${investor.nextFollowUpDate}.`
          : `${investor.name} has no dated next follow-up.`,
      nextStep: followUp?.action || investor.nextAction || "Record the next investor move and date.",
      entityType: "investor",
      entityId: investor.id,
      destination: "equity",
    });
  }

  const identitiesAfterInvestors = new Set(evidence.map((item) => item.identity));
  for (const opportunity of input.opportunities.filter((item) => item.type === "investor"
    && item.decision === "pursuing"
    && !coveredOpportunityIds.has(item.id)
    && !resolved.resolvedOpportunityIds.has(item.id)
    && !(item.investorId && resolved.resolvedInvestorIds.has(item.investorId))
    && projectOpportunityDeadlineViability(item, now).deadlineViable)) {
    const identity = opportunity.investorId ? `investor:${opportunity.investorId}` : `opportunity:${opportunity.id}`;
    if (identitiesAfterInvestors.has(identity)) continue;
    evidence.push({
      identity,
      key: `opportunity:${opportunity.id}`,
      track: "equity",
      kind: "opportunity",
      amountCents: Math.max(0, opportunity.amountMaxCents),
      updatedAt: opportunity.updatedAt,
      label: `${opportunity.title} · pursuing`,
      status: opportunity.decision,
      risk: opportunity.deadline ? `${opportunity.title} has a recorded deadline of ${opportunity.deadline}.` : `${opportunity.title} has no recorded deadline.`,
      nextStep: "Move the investor opportunity into a dated contact or execution step.",
      entityType: "opportunity",
      entityId: opportunity.id,
      destination: "opportunities",
    });
  }

  if (evidence.length > 0) return dedupeEvidence(evidence);
  if ((input.outcomes ?? []).some((outcome) => outcome.track === "equity")) return [];
  return input.actions
    .filter((item) => item.track === "equity" && !terminalActionStages.has(item.stage) && item.stage !== "committed")
    .map((item) => ({
      identity: `funding-action:${item.id}`,
      key: `funding-action:${item.id}`,
      track: "equity" as const,
      kind: "funding-action" as const,
      amountCents: Math.max(0, item.amountCents),
      updatedAt: item.updatedAt,
      label: `${item.title} · ${item.stage}`,
      status: item.stage,
      risk: item.deadline ? `${item.title} has a recorded deadline of ${item.deadline}.` : `${item.title} has no recorded deadline.`,
      nextStep: item.nextStep || "Record the next financing move.",
      entityType: "funding-action" as const,
      entityId: item.id,
      destination: "actions" as const,
    }));
}

function summarizeTrack(track: FundingTrack, evidence: EvidenceItem[]): TrackSummary {
  const latest = latestByUpdatedAt(evidence.map((item, index) => ({ ...item, id: index + 1 })));
  const kinds = [...new Set(evidence.map((item) => item.kind))];
  const fallbackUsed = kinds.length === 1 && kinds[0] === "funding-action";
  return {
    track,
    potentialAmountCents: evidence.reduce((sum, item) => sum + item.amountCents, 0),
    activeCount: evidence.length,
    latestAction: latest?.label ?? "No pipeline evidence yet",
    risk: latest?.risk ?? "This track has no active pipeline evidence yet.",
    nextStep: latest?.nextStep ?? `Create the first ${track} financing target or action.`,
    evidenceKinds: kinds,
    pipelineExplanation: evidence.length > 0
      ? pipelineExplanation(kinds, fallbackUsed)
      : "No in-motion capital is counted because no active financing evidence is recorded for this track.",
  };
}

export function projectCapitalPipelineTruth(input: PipelineInput): CapitalPipelineTruth {
  const grantEvidence = grantOrDebtEvidence("grant", input);
  const debtEvidence = grantOrDebtEvidence("debt", input);
  const equityPipelineEvidence = equityEvidence(input);
  const tracks = [
    summarizeTrack("grant", grantEvidence),
    summarizeTrack("debt", debtEvidence),
    summarizeTrack("equity", equityPipelineEvidence),
  ];
  const items = [...grantEvidence, ...debtEvidence, ...equityPipelineEvidence].map(({ identity: _identity, ...item }) => item);
  return {
    totalInMotionCents: tracks.reduce((sum, track) => sum + track.potentialAmountCents, 0),
    tracks,
    items,
  };
}
