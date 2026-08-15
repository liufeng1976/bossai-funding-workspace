import type { CompanyProfile, FundingAction, FundingGoal, TodayFocus } from "./types.ts";

const terminalStages = new Set(["received", "rejected", "passed", "not-a-fit", "closed"]);
const highValueStages = new Set([
  "contacted",
  "replied",
  "meeting",
  "partner-meeting",
  "due-diligence",
  "term-sheet",
  "negotiation",
  "committed",
  "approved",
]);

function daysTo(deadline: string | null, now: Date): number | null {
  if (!deadline) return null;
  const date = new Date(`${deadline}T23:59:59Z`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((date.getTime() - now.getTime()) / 86_400_000);
}

function priorityWeight(priority: FundingAction["priority"]): number {
  if (priority === "critical") return 30;
  if (priority === "high") return 20;
  if (priority === "medium") return 10;
  return 0;
}

function actionScore(action: FundingAction, now: Date): number {
  if (terminalStages.has(action.stage)) return Number.NEGATIVE_INFINITY;

  let score = priorityWeight(action.priority);
  const days = daysTo(action.deadline, now);

  if (days !== null) {
    if (days < 0) score += 1_000;
    else if (days <= 3) score += 800;
    else if (days <= 7) score += 600;
    else if (days <= 14) score += 400;
  }

  if (highValueStages.has(action.stage)) score += 60;
  if (action.stage === "saved" || action.stage === "ready") score += 35;
  if (action.track === "equity" && (action.stage === "contacted" || action.stage === "no-response")) score += 30;
  if (action.stage === "discover") score += 10;

  score += Math.min(25, Math.floor(action.amountCents / 10_000_000));
  return score;
}

function urgencyFor(action: FundingAction, now: Date): TodayFocus["urgency"] {
  const days = daysTo(action.deadline, now);
  if (days !== null && days <= 3) return "urgent";
  if (days !== null && days <= 10) return "soon";
  return "normal";
}

export function chooseTodayFocus(
  profile: CompanyProfile | null,
  goal: FundingGoal | null,
  actions: FundingAction[],
  now = new Date(),
): TodayFocus {
  const ranked = actions
    .map((action) => ({ action, score: actionScore(action, now) }))
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score || b.action.amountCents - a.action.amountCents);

  const first = ranked[0]?.action;
  if (first) {
    const days = daysTo(first.deadline, now);
    const deadlineReason =
      days === null
        ? "This is the highest-value active financing action."
        : days < 0
          ? `This action is overdue by ${Math.abs(days)} day(s).`
          : days <= 3
            ? `This action is due in ${days} day(s).`
            : highValueStages.has(first.stage)
              ? "This action is already in a high-value financing stage."
              : "This action is the strongest current combination of timing, priority and potential value.";

    return {
      title: first.title,
      reason: deadlineReason,
      nextStep: first.nextStep || "Define the next concrete move and owner before leaving this item.",
      urgency: urgencyFor(first, now),
      track: first.track,
      actionId: first.id,
    };
  }

  if (!profile) {
    return {
      title: "Create the company funding profile",
      reason: "The capital plan has no reliable company facts yet.",
      nextStep: "Add the company, cash position, revenue, runway, financing history and intended use of funds.",
      urgency: "setup",
      track: null,
      actionId: null,
    };
  }

  if (!goal || goal.targetAmountCents <= 0) {
    return {
      title: "Set the funding target",
      reason: "The workspace cannot measure the capital gap until the owner states how much is needed and when.",
      nextStep: "Enter the target amount, need-by date, use of funds, dilution preference and repayment capacity.",
      urgency: "setup",
      track: null,
      actionId: null,
    };
  }

  return {
    title: "Create the first financing action",
    reason: "The funding target exists, but there is no active Grant, Debt or Equity action moving it forward.",
    nextStep: "Choose the most credible capital track and create one concrete action with an owner and next step.",
    urgency: "normal",
    track: null,
    actionId: null,
  };
}
