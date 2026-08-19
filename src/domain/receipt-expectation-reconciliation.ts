import type {
  FundingReceiptAllocationReconciliationIssue,
  FundingReceiptExpectation,
  FundingReceiptExpectationAllocation,
  FundingReceiptExpectationFulfillment,
  FundingReceiptTranche,
} from "./types.ts";

function allocationTotal(allocations: FundingReceiptExpectationAllocation[]): number {
  return allocations.reduce((sum, allocation) => sum + Math.max(0, allocation.amountCents), 0);
}

function sortedUnique(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

export function projectReceiptAllocationReconciliationIssues(
  expectations: FundingReceiptExpectation[],
  allocations: FundingReceiptExpectationAllocation[],
  tranches: FundingReceiptTranche[],
): FundingReceiptAllocationReconciliationIssue[] {
  const expectationById = new Map(expectations.map((expectation) => [expectation.id, expectation]));
  const trancheById = new Map(tranches.map((tranche) => [tranche.id, tranche]));
  const activeAllocations = allocations.filter((allocation) => allocation.status === "active");
  const issues: FundingReceiptAllocationReconciliationIssue[] = [];

  for (const expectation of expectations) {
    const linked = activeAllocations.filter((allocation) => allocation.expectationId === expectation.id);
    if (expectation.status === "cancelled" && linked.length > 0) {
      const recorded = allocationTotal(linked);
      issues.push({
        key: `cancelled-expectation-${expectation.id}`,
        kind: "cancelled-expectation",
        expectationIds: [expectation.id],
        trancheId: null,
        allocationIds: sortedUnique(linked.map((allocation) => allocation.id)),
        recordedAllocatedAmountCents: recorded,
        supportedAmountCents: 0,
        requiredReductionCents: recorded,
        reason: `Arrival Expectation #${expectation.id} is cancelled but still has active explicit Allocation history. Active Allocations must be voided or corrected before cancellation can be treated as reconciled.`,
      });
    }
    if (expectation.status === "expected") {
      const recorded = allocationTotal(linked);
      if (recorded > expectation.amountCents) {
        issues.push({
          key: `expectation-overallocated-${expectation.id}`,
          kind: "expectation-overallocated",
          expectationIds: [expectation.id],
          trancheId: null,
          allocationIds: sortedUnique(linked.map((allocation) => allocation.id)),
          recordedAllocatedAmountCents: recorded,
          supportedAmountCents: expectation.amountCents,
          requiredReductionCents: recorded - expectation.amountCents,
          reason: `Arrival Expectation #${expectation.id} supports ${expectation.amountCents} cents but active explicit Allocations total ${recorded} cents.`,
        });
      }
    }
  }

  for (const allocation of activeAllocations) {
    const expectation = expectationById.get(allocation.expectationId);
    if (!expectation) continue;
    const tranche = trancheById.get(allocation.trancheId);
    if (!tranche) {
      issues.push({
        key: `missing-tranche-${allocation.id}`,
        kind: "missing-tranche",
        expectationIds: [expectation.id],
        trancheId: allocation.trancheId,
        allocationIds: [allocation.id],
        recordedAllocatedAmountCents: allocation.amountCents,
        supportedAmountCents: 0,
        requiredReductionCents: allocation.amountCents,
        reason: `Allocation #${allocation.id} points to Receipt Tranche #${allocation.trancheId}, which is unavailable in the current financing state.`,
      });
      continue;
    }
    if (tranche.status !== "received") {
      issues.push({
        key: `voided-tranche-${tranche.id}-${allocation.id}`,
        kind: "voided-tranche",
        expectationIds: [expectation.id],
        trancheId: tranche.id,
        allocationIds: [allocation.id],
        recordedAllocatedAmountCents: allocation.amountCents,
        supportedAmountCents: 0,
        requiredReductionCents: allocation.amountCents,
        reason: `Allocation #${allocation.id} points to voided Receipt Tranche #${tranche.id}; voided cash supports no active fulfillment.`,
      });
      continue;
    }
    if (tranche.outcomeId !== expectation.outcomeId) {
      issues.push({
        key: `cross-outcome-${allocation.id}`,
        kind: "cross-outcome",
        expectationIds: [expectation.id],
        trancheId: tranche.id,
        allocationIds: [allocation.id],
        recordedAllocatedAmountCents: allocation.amountCents,
        supportedAmountCents: 0,
        requiredReductionCents: allocation.amountCents,
        reason: `Allocation #${allocation.id} links Arrival Expectation #${expectation.id} to Receipt Tranche #${tranche.id} from a different Funding Outcome.`,
      });
    }
  }

  for (const tranche of tranches.filter((item) => item.status === "received")) {
    const linked = activeAllocations.filter((allocation) => allocation.trancheId === tranche.id);
    const recorded = allocationTotal(linked);
    if (recorded <= tranche.amountCents) continue;
    issues.push({
      key: `tranche-overallocated-${tranche.id}`,
      kind: "tranche-overallocated",
      expectationIds: sortedUnique(linked.map((allocation) => allocation.expectationId).filter((id) => expectationById.has(id))),
      trancheId: tranche.id,
      allocationIds: sortedUnique(linked.map((allocation) => allocation.id)),
      recordedAllocatedAmountCents: recorded,
      supportedAmountCents: tranche.amountCents,
      requiredReductionCents: recorded - tranche.amountCents,
      reason: `Receipt Tranche #${tranche.id} contains ${tranche.amountCents} cents of current received cash but active explicit Allocations total ${recorded} cents.`,
    });
  }

  return issues.sort((left, right) => left.key.localeCompare(right.key));
}

export function projectReceiptExpectationFulfillment(
  expectation: FundingReceiptExpectation,
  allocations: FundingReceiptExpectationAllocation[],
  tranches: FundingReceiptTranche[],
): FundingReceiptExpectationFulfillment {
  const trancheById = new Map(tranches.map((tranche) => [tranche.id, tranche]));
  const activeAllocations = allocations.filter((allocation) => allocation.expectationId === expectation.id && allocation.status === "active");
  const reconciliationIssues = projectReceiptAllocationReconciliationIssues([expectation], allocations, tranches)
    .filter((issue) => issue.expectationIds.includes(expectation.id));
  const invalidAllocationIds = new Set(reconciliationIssues
    .filter((issue) => issue.kind === "missing-tranche" || issue.kind === "voided-tranche" || issue.kind === "cross-outcome" || issue.kind === "tranche-overallocated")
    .flatMap((issue) => issue.allocationIds));
  const validAllocations = activeAllocations.filter((allocation) => {
    const tranche = trancheById.get(allocation.trancheId);
    return Boolean(tranche && tranche.status === "received" && tranche.outcomeId === expectation.outcomeId && !invalidAllocationIds.has(allocation.id));
  });
  const invalidAllocations = activeAllocations.filter((allocation) => invalidAllocationIds.has(allocation.id));
  const allocatedAmountCents = validAllocations.reduce((sum, allocation) => sum + Math.max(0, allocation.amountCents), 0);
  const invalidAllocatedAmountCents = invalidAllocations.reduce((sum, allocation) => sum + Math.max(0, allocation.amountCents), 0);
  const remainingAmountCents = Math.max(0, expectation.amountCents - allocatedAmountCents);
  const reconciliationAllocationIds = reconciliationIssues.flatMap((issue) => issue.allocationIds);

  let status: FundingReceiptExpectationFulfillment["status"];
  if (reconciliationIssues.some((issue) => issue.kind !== "expectation-overallocated")) status = "invalid-receipt";
  else if (reconciliationIssues.some((issue) => issue.kind === "expectation-overallocated") || allocatedAmountCents > expectation.amountCents) status = "overallocated";
  else if (expectation.status === "cancelled") status = "cancelled";
  else if (allocatedAmountCents === expectation.amountCents && expectation.amountCents > 0) status = "fulfilled";
  else if (allocatedAmountCents > 0) status = "partial";
  else status = "unfulfilled";

  return {
    expectationId: expectation.id,
    expectedAmountCents: expectation.amountCents,
    allocatedAmountCents,
    invalidAllocatedAmountCents,
    remainingAmountCents,
    activeAllocationCount: activeAllocations.length,
    reconciliationAllocationIds: sortedUnique(reconciliationAllocationIds),
    reconciliationIssues,
    status,
  };
}

export function projectReceiptExpectationFulfillments(
  expectations: FundingReceiptExpectation[],
  allocations: FundingReceiptExpectationAllocation[],
  tranches: FundingReceiptTranche[],
): FundingReceiptExpectationFulfillment[] {
  return expectations.map((expectation) => projectReceiptExpectationFulfillment(expectation, allocations, tranches));
}
