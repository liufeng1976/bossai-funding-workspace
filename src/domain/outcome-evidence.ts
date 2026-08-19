import type { FundingOutcome, FundingOutcomeEvidenceStatus, FundingReceiptTranche } from "./types.ts";

export function projectFundingOutcomeEvidence(
  outcome: FundingOutcome,
  receiptTranches?: FundingReceiptTranche[],
): FundingOutcomeEvidenceStatus {
  const commitmentEvidenceRequired = outcome.committedAmountCents > 0;
  const receiptEvidenceRequired = outcome.receivedAmountCents > 0;
  const commitmentEvidencePresent = Boolean((outcome.commitmentEvidence ?? "").trim());
  const trancheRegisterKnown = receiptTranches !== undefined;
  const activeTranches = (receiptTranches ?? []).filter((tranche) => tranche.outcomeId === outcome.id && tranche.status === "received");
  const receiptTrancheAmountCents = activeTranches.reduce((sum, tranche) => sum + tranche.amountCents, 0);
  const receiptTrancheReconciled = !trancheRegisterKnown
    || (receiptEvidenceRequired ? activeTranches.length > 0 && receiptTrancheAmountCents === outcome.receivedAmountCents : receiptTrancheAmountCents === 0);
  const trancheEvidenceComplete = activeTranches.length > 0 && activeTranches.every((tranche) => Boolean(tranche.receivedDate && tranche.receiptEvidence.trim()));
  const receiptEvidencePresent = trancheRegisterKnown && receiptEvidenceRequired
    ? trancheEvidenceComplete
    : Boolean((outcome.receiptEvidence ?? "").trim());
  const missing: FundingOutcomeEvidenceStatus["missing"] = [];
  if (commitmentEvidenceRequired && !commitmentEvidencePresent) missing.push("commitment");
  if (receiptEvidenceRequired && !receiptEvidencePresent) missing.push("receipt");
  if (!receiptTrancheReconciled) missing.push("reconciliation");
  return {
    outcomeId: outcome.id,
    commitmentEvidenceRequired,
    commitmentEvidencePresent,
    receiptEvidenceRequired,
    receiptEvidencePresent,
    receiptTrancheCount: activeTranches.length,
    receiptTrancheAmountCents,
    receiptTrancheReconciled,
    complete: missing.length === 0,
    missing,
  };
}

export function projectFundingOutcomeEvidenceStatuses(
  outcomes: FundingOutcome[],
  receiptTranches?: FundingReceiptTranche[],
): FundingOutcomeEvidenceStatus[] {
  return outcomes.map((outcome) => projectFundingOutcomeEvidence(outcome, receiptTranches));
}
