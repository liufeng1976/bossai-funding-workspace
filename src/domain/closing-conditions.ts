import type { ClosingCondition, TermSheet } from "./types.ts";

export const ACTIVE_CLOSING_CONDITION_STATUSES = new Set<ClosingCondition["status"]>(["open", "in-progress"]);
export const CLEARED_CLOSING_CONDITION_STATUSES = new Set<ClosingCondition["status"]>(["satisfied", "waived"]);

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isActiveClosingCondition(condition: ClosingCondition): boolean {
  return ACTIVE_CLOSING_CONDITION_STATUSES.has(condition.status);
}

export function isClosingConditionOverdue(condition: ClosingCondition, now = new Date()): boolean {
  if (!isActiveClosingCondition(condition)) return false;
  const due = parseDate(condition.dueDate);
  return due !== null && due.getTime() < now.getTime();
}

export function closingConditionsForTermSheet(conditions: ClosingCondition[], termSheetId: number): ClosingCondition[] {
  return conditions.filter((condition) => condition.termSheetId === termSheetId);
}

export function activeClosingConditionsForTermSheet(conditions: ClosingCondition[], termSheetId: number): ClosingCondition[] {
  return closingConditionsForTermSheet(conditions, termSheetId).filter(isActiveClosingCondition);
}

export function summarizeClosingConditionRegister(termSheet: TermSheet, conditions: ClosingCondition[], now = new Date()): {
  termSheetId: number;
  totalCount: number;
  activeCount: number;
  overdueCount: number;
  undatedActiveCount: number;
  clearedCount: number;
  state: "not-recorded" | "open" | "cleared";
  nextConditionId: number | null;
} {
  const all = closingConditionsForTermSheet(conditions, termSheet.id);
  const active = all.filter(isActiveClosingCondition);
  const ordered = [...active].sort((left, right) => {
    const leftDue = left.dueDate ?? "9999-12-31";
    const rightDue = right.dueDate ?? "9999-12-31";
    return leftDue.localeCompare(rightDue) || left.id - right.id;
  });
  return {
    termSheetId: termSheet.id,
    totalCount: all.length,
    activeCount: active.length,
    overdueCount: active.filter((condition) => isClosingConditionOverdue(condition, now)).length,
    undatedActiveCount: active.filter((condition) => !condition.dueDate).length,
    clearedCount: all.filter((condition) => CLEARED_CLOSING_CONDITION_STATUSES.has(condition.status)).length,
    state: all.length === 0 ? "not-recorded" : active.length > 0 ? "open" : "cleared",
    nextConditionId: ordered[0]?.id ?? null,
  };
}
