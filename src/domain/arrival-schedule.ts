import { projectReceiptExpectationFulfillment } from "./receipt-expectation-reconciliation.ts";
import type {
  FundingOutcome,
  FundingReceiptExpectation,
  FundingReceiptExpectationAllocation,
  FundingReceiptScheduleSummary,
  FundingReceiptTranche,
} from "./types.ts";

const DAY_MS = 86_400_000;

function utcDayStart(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function calendarDaysAway(value: string, now: Date): number | null {
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.round((utcDayStart(parsed) - utcDayStart(now)) / DAY_MS);
}

export function isActiveReceiptExpectation(expectation: FundingReceiptExpectation): boolean {
  return expectation.status === "expected";
}

export function projectFundingReceiptSchedule(
  outcome: FundingOutcome,
  expectations: FundingReceiptExpectation[],
  now = new Date(),
  allocations?: FundingReceiptExpectationAllocation[],
  tranches?: FundingReceiptTranche[],
): FundingReceiptScheduleSummary {
  const active = expectations
    .filter((item) => item.outcomeId === outcome.id && isActiveReceiptExpectation(item))
    .map((expectation) => {
      const fulfillment = allocations && tranches
        ? projectReceiptExpectationFulfillment(expectation, allocations, tranches)
        : null;
      return {
        expectation,
        remainingAmountCents: fulfillment?.remainingAmountCents ?? expectation.amountCents,
        fulfillmentStatus: fulfillment?.status ?? "unfulfilled",
      };
    })
    .sort((left, right) => left.expectation.expectedDate.localeCompare(right.expectation.expectedDate) || left.expectation.id - right.expectation.id);
  const invalidAllocation = active.some((item) => item.fulfillmentStatus === "invalid-receipt" || item.fulfillmentStatus === "overallocated");
  const outstandingActive = active.filter((item) => item.remainingAmountCents > 0);
  const outstandingAmountCents = Math.max(0, outcome.committedAmountCents - outcome.receivedAmountCents);
  const activeExpectedAmountCents = outstandingActive.reduce((sum, item) => sum + Math.max(0, item.remainingAmountCents), 0);
  const unscheduledAmountCents = Math.max(0, outstandingAmountCents - activeExpectedAmountCents);
  const overScheduledAmountCents = Math.max(0, activeExpectedAmountCents - outstandingAmountCents);
  const overdueExpectationCount = outstandingActive.filter((item) => {
    const days = calendarDaysAway(item.expectation.expectedDate, now);
    return days !== null && days < 0;
  }).length;

  let status: FundingReceiptScheduleSummary["status"];
  if (invalidAllocation) status = "allocation-error";
  else if (outstandingAmountCents === 0) status = activeExpectedAmountCents > 0 ? "over-scheduled" : "no-outstanding-commitment";
  else if (activeExpectedAmountCents === 0) status = "unscheduled";
  else if (activeExpectedAmountCents < outstandingAmountCents) status = "partial";
  else if (activeExpectedAmountCents === outstandingAmountCents) status = "balanced";
  else status = "over-scheduled";

  return {
    outcomeId: outcome.id,
    committedAmountCents: outcome.committedAmountCents,
    receivedAmountCents: outcome.receivedAmountCents,
    outstandingAmountCents,
    activeExpectedAmountCents,
    unscheduledAmountCents,
    overScheduledAmountCents,
    activeExpectationCount: outstandingActive.length,
    overdueExpectationCount,
    nextExpectedDate: outstandingActive[0]?.expectation.expectedDate ?? null,
    status,
  };
}

export function projectFundingReceiptSchedules(
  outcomes: FundingOutcome[],
  expectations: FundingReceiptExpectation[],
  now = new Date(),
  allocations?: FundingReceiptExpectationAllocation[],
  tranches?: FundingReceiptTranche[],
): FundingReceiptScheduleSummary[] {
  return outcomes.map((outcome) => projectFundingReceiptSchedule(outcome, expectations, now, allocations, tranches));
}
