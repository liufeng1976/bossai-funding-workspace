import { isActiveClosingCondition } from "./closing-conditions.ts";
import type {
  CapitalCoveragePlan,
  CapitalPipelineItem,
  ClosingCondition,
  ClosingPlanItem,
  FundingTrack,
} from "./types.ts";

interface CoverageInput {
  targetAmountCents: number;
  receivedAmountCents: number;
  committedAmountCents: number;
  inMotionItems: CapitalPipelineItem[];
  closingConditions?: ClosingCondition[];
}

const COVERAGE_DISCLAIMER = "In-motion capital is not a probability-weighted forecast, commitment, or guarantee. Coverage uses only recorded amounts and deterministic stage ordering.";

function pct(amountCents: number, targetAmountCents: number): number {
  if (targetAmountCents <= 0) return 0;
  return Math.min(100, Math.round((Math.max(0, amountCents) / targetAmountCents) * 1000) / 10);
}

function stageRank(item: CapitalPipelineItem): number {
  if (item.kind === "term-sheet") {
    if (item.status === "accepted") return 100;
    if (item.status === "negotiating") return 96;
    if (item.status === "reviewing") return 92;
    if (item.status === "received") return 88;
    return 80;
  }
  if (item.kind === "application") {
    if (item.status === "approved") return 86;
    if (item.status === "under-review") return 74;
    if (item.status === "submitted") return 68;
    if (item.status === "preparing") return 52;
    return 42;
  }
  if (item.kind === "investor") {
    const ranks: Record<string, number> = {
      committed: 90,
      negotiation: 86,
      "term-sheet": 82,
      "due-diligence": 76,
      "partner-meeting": 66,
      meeting: 60,
      replied: 52,
      contacted: 44,
      "ready-to-contact": 36,
      research: 26,
      target: 18,
    };
    return ranks[item.status] ?? 25;
  }
  if (item.kind === "funding-action") {
    const ranks: Record<string, number> = {
      approved: 86,
      negotiation: 82,
      "term-sheet": 78,
      "due-diligence": 72,
      meeting: 60,
      replied: 52,
      contacted: 44,
      ready: 36,
      saved: 30,
      prepare: 28,
      discover: 18,
    };
    return ranks[item.status] ?? 24;
  }
  return 22;
}

function termSheetSteps(status: string): string[] {
  if (status === "accepted") {
    return [
      "Complete the recorded closing conditions and definitive-document process with counsel.",
      "Confirm the signatures and settlement steps required for the closing.",
      "Record committed or received capital only when supporting closing evidence exists.",
    ];
  }
  if (status === "negotiating") {
    return [
      "Resolve the remaining economic and governance terms with counsel.",
      "Record the agreed term-sheet state without treating agreement as cash received.",
      "Move the deal through closing conditions before recording committed or received capital.",
    ];
  }
  return [
    "Review the recorded economics, governance terms, and caution flags with counsel.",
    "Resolve open term-sheet questions and record the next negotiation state.",
    "Do not record committed or received capital until the relevant closing evidence exists.",
  ];
}

function applicationSteps(status: string): string[] {
  if (status === "approved") {
    return [
      "Complete any provider award, acceptance, or closing conditions that are actually required.",
      "Confirm the amount and effective commitment from source documents.",
      "Record the Funding Outcome only when commitment or receipt is supported by evidence.",
    ];
  }
  if (status === "under-review" || status === "submitted") {
    return [
      "Track the external review or decision without treating the submitted request as committed capital.",
      "Respond to any documented reviewer request or missing item.",
      "Record approval, rejection, commitment, or receipt only when the external decision exists.",
    ];
  }
  return [
    "Complete the recorded application next action and required materials.",
    "Submit only when the package is ready and the owner confirms the source requirements.",
    "Track the external decision after submission.",
  ];
}

function investorSteps(status: string, nextStep: string): string[] {
  if (status === "committed") {
    return [
      "Verify that the recorded commitment is supported by actual deal or closing evidence.",
      "Complete the remaining closing and settlement steps.",
      "Record received capital only after the funds actually settle.",
    ];
  }
  if (["negotiation", "term-sheet"].includes(status)) {
    return [
      nextStep || "Resolve the next recorded investor decision or term step.",
      "Record the actual term-sheet or closing evidence when it exists.",
      "Keep commitment and received capital separate until the deal closes.",
    ];
  }
  if (status === "due-diligence") {
    return [
      nextStep || "Close the current due-diligence request.",
      "Resolve any documented diligence blockers or revisions.",
      "Advance only when the investor records the next financing decision.",
    ];
  }
  return [
    nextStep || "Complete the next recorded investor move.",
    "Obtain the next explicit investor decision or dated step.",
    "Do not treat interest or meetings as committed capital.",
  ];
}

function fundingActionSteps(item: CapitalPipelineItem): string[] {
  return [
    item.nextStep || "Complete the recorded financing next step.",
    "Replace the generic action with more-specific opportunity, application, investor, or term evidence when available.",
    "Record commitment or receipt only when the financing evidence supports it.",
  ];
}

function structuredTermSheetSteps(item: CapitalPipelineItem, conditions: ClosingCondition[]): { steps: string[]; why: string | null } {
  if (item.entityType !== "term-sheet" || item.entityId === null) return { steps: termSheetSteps(item.status), why: null };
  const registered = conditions.filter((condition) => condition.termSheetId === item.entityId);
  const active = registered
    .filter(isActiveClosingCondition)
    .sort((left, right) => (left.dueDate ?? "9999-12-31").localeCompare(right.dueDate ?? "9999-12-31") || left.id - right.id);
  if (active.length > 0) {
    return {
      steps: [
        ...active.map((condition) => `${condition.title} — ${condition.status.replaceAll("-", " ")} · owner ${condition.owner || "not recorded"} · due ${condition.dueDate ?? "not recorded"}.`),
        "Complete or formally waive each recorded condition and retain its evidence note; involve counsel for material legal conditions.",
        "Record committed or received capital only when the closing evidence and actual financing state support it.",
      ],
      why: `${active.length} structured closing condition(s) remain active on this Term Sheet.`,
    };
  }
  if (registered.length > 0) {
    return {
      steps: [
        "All currently recorded structured closing conditions are cleared; verify any remaining definitive-document, signature and settlement requirements with counsel.",
        "Do not infer closing from a cleared register alone; record the final Funding Outcome only from actual closing evidence.",
        "Record committed or received capital only when the financing evidence supports it.",
      ],
      why: `All ${registered.length} recorded structured closing condition(s) are cleared, but Funding Outcome has not yet resolved this financing path.`,
    };
  }
  return {
    steps: [
      "Record the material closing conditions with an owner and due date so the closing path is explicit.",
      ...termSheetSteps(item.status),
    ],
    why: "No structured Closing Condition Register is recorded for this Term Sheet yet.",
  };
}

function closingItem(item: CapitalPipelineItem, conditions: ClosingCondition[]): ClosingPlanItem {
  const structuredTerm = item.kind === "term-sheet" ? structuredTermSheetSteps(item, conditions) : null;
  const remainingSteps = item.kind === "term-sheet"
    ? structuredTerm!.steps
    : item.kind === "application"
      ? applicationSteps(item.status)
      : item.kind === "investor"
        ? investorSteps(item.status, item.nextStep)
        : item.kind === "opportunity"
          ? [
              "Turn the pursued opportunity into a concrete application, investor, or financing action.",
              item.nextStep || "Complete the next recorded opportunity step.",
              "Do not treat an opportunity amount as committed capital.",
            ]
          : fundingActionSteps(item);
  return {
    key: `closing:${item.key}`,
    track: item.track,
    amountCents: item.amountCents,
    evidenceKind: item.kind,
    status: item.status,
    title: item.label,
    whyClose: `${item.kind.replaceAll("-", " ")} is at recorded stage ${item.status.replaceAll("-", " ")}; its position is ordered by workflow stage, not predicted success probability.${structuredTerm?.why ? ` ${structuredTerm.why}` : ""}`,
    remainingSteps,
    entityType: item.entityType,
    entityId: item.entityId,
    destination: item.destination,
  };
}

function commitmentClosingItem(committedAmountCents: number): ClosingPlanItem {
  return {
    key: "closing:recorded-commitment",
    track: null,
    amountCents: committedAmountCents,
    evidenceKind: "recorded-commitment",
    status: "committed-not-received",
    title: "Recorded committed capital still needs to arrive",
    whyClose: "This amount is already recorded as committed, but committed capital is kept separate from cash actually received.",
    remainingSteps: [
      "Confirm any remaining documented closing or settlement conditions.",
      "Confirm the actual settlement or transfer required for the funds to arrive.",
      "Move the amount to received only when the funds are actually received and recorded.",
    ],
    entityType: null,
    entityId: null,
    destination: "execution",
  };
}

function coverageExplanation(
  targetAmountCents: number,
  receivedAmountCents: number,
  securedAmountCents: number,
  recordedCoverageCents: number,
  uncoveredAfterPipelineCents: number,
): string {
  if (targetAmountCents <= 0) return "Set the funding target before interpreting capital coverage.";
  if (receivedAmountCents >= targetAmountCents) return "Recorded cash received already covers the current funding target.";
  if (securedAmountCents >= targetAmountCents) return "Received plus recorded committed capital covers the target, but some committed capital still has to become cash received.";
  if (recordedCoverageCents >= targetAmountCents) return "Received + committed + current de-duplicated in-motion capital can cover the target on recorded amounts, but in-motion capital is not assumed to close.";
  return "Even if every current in-motion item closed at its recorded amount, the current pipeline would still leave part of the target uncovered.";
}

export function projectCapitalCoveragePlan(input: CoverageInput): CapitalCoveragePlan {
  const targetAmountCents = Math.max(0, input.targetAmountCents);
  const receivedAmountCents = Math.max(0, input.receivedAmountCents);
  const committedAmountCents = Math.max(0, input.committedAmountCents);
  const securedAmountCents = receivedAmountCents + committedAmountCents;
  const inMotionAmountCents = input.inMotionItems.reduce((sum, item) => sum + Math.max(0, item.amountCents), 0);
  const recordedCoverageCents = securedAmountCents + inMotionAmountCents;
  const uncoveredAfterPipelineCents = Math.max(0, targetAmountCents - recordedCoverageCents);
  const cashStillToArriveCents = Math.max(0, targetAmountCents - receivedAmountCents);

  const status: CapitalCoveragePlan["status"] = targetAmountCents <= 0
    ? "no-target"
    : receivedAmountCents >= targetAmountCents
      ? "cash-covered"
      : securedAmountCents >= targetAmountCents
        ? "secured"
        : recordedCoverageCents >= targetAmountCents
          ? "pipeline-covered"
          : "pipeline-shortfall";

  const candidates: Array<{ rank: number; updatedAt: string; item: ClosingPlanItem }> = [];
  if (cashStillToArriveCents > 0 && committedAmountCents > 0) {
    candidates.push({ rank: 110, updatedAt: "9999", item: commitmentClosingItem(committedAmountCents) });
  }
  if (cashStillToArriveCents > 0) {
    for (const item of input.inMotionItems) {
      candidates.push({ rank: stageRank(item), updatedAt: item.updatedAt, item: closingItem(item, input.closingConditions ?? []) });
    }
  }
  candidates.sort((a, b) => b.rank - a.rank || b.updatedAt.localeCompare(a.updatedAt) || b.item.amountCents - a.item.amountCents);

  return {
    status,
    targetAmountCents,
    receivedAmountCents,
    receivedCoveragePct: pct(receivedAmountCents, targetAmountCents),
    cashStillToArriveCents,
    committedAmountCents,
    securedAmountCents,
    securedCoveragePct: pct(securedAmountCents, targetAmountCents),
    inMotionAmountCents,
    recordedCoverageCents,
    recordedCoveragePct: pct(recordedCoverageCents, targetAmountCents),
    uncoveredAfterPipelineCents,
    explanation: coverageExplanation(targetAmountCents, receivedAmountCents, securedAmountCents, recordedCoverageCents, uncoveredAfterPipelineCents),
    disclaimer: COVERAGE_DISCLAIMER,
    closestToCash: candidates.slice(0, 3).map((candidate) => candidate.item),
  };
}
