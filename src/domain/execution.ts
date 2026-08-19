import type {
  DataRoom,
  DataRoomCategory,
  DataRoomDocument,
  DataRoomFolder,
  DataRoomReadiness,
  Investor,
  TermSheet,
  TermSheetComparison,
  TermSheetComparisonItem,
} from "./types.ts";

export const standardDataRoomCategories: readonly DataRoomCategory[] = [
  "Corporate",
  "Financial",
  "Legal",
  "Product",
  "Customers",
  "Team",
  "IP",
  "Fundraising",
];

export function calculateDataRoomReadiness(
  room: DataRoom,
  folders: DataRoomFolder[],
  documents: DataRoomDocument[],
  now = new Date(),
): DataRoomReadiness {
  const roomFolders = folders.filter((folder) => folder.dataRoomId === room.id);
  const folderIds = new Set(roomFolders.map((folder) => folder.id));
  const roomDocuments = documents.filter((document) => folderIds.has(document.folderId));

  const normalizedDocuments = roomDocuments.map((document) => {
    const expiredByDate = document.expiresAt ? new Date(`${document.expiresAt}T23:59:59Z`).getTime() < now.getTime() : false;
    return { ...document, effectiveStatus: expiredByDate && document.status !== "missing" ? "expired" : document.status };
  });
  const readyDocuments = normalizedDocuments.filter((document) => document.effectiveStatus === "ready" || document.effectiveStatus === "shared").length;
  const missingDocuments = normalizedDocuments.filter((document) => document.effectiveStatus === "missing" || document.effectiveStatus === "preparing").length;
  const expiredDocuments = normalizedDocuments.filter((document) => document.effectiveStatus === "expired").length;
  const totalDocuments = normalizedDocuments.length;

  const categoryStatus = standardDataRoomCategories.map((category) => {
    const categoryFolderIds = new Set(roomFolders.filter((folder) => folder.category === category).map((folder) => folder.id));
    const categoryDocuments = normalizedDocuments.filter((document) => categoryFolderIds.has(document.folderId));
    const ready = categoryDocuments.filter((document) => document.effectiveStatus === "ready" || document.effectiveStatus === "shared").length;
    const explicitMissing = categoryDocuments.filter((document) => document.effectiveStatus === "missing" || document.effectiveStatus === "preparing").length;
    return {
      category,
      total: categoryDocuments.length,
      ready,
      missing: categoryDocuments.length === 0 ? 1 : explicitMissing,
      expired: categoryDocuments.filter((document) => document.effectiveStatus === "expired").length,
    };
  });

  const coveredCategories = categoryStatus.filter((item) => item.ready > 0 && item.missing === 0 && item.expired === 0).length;
  const completionPct = Math.round((coveredCategories / standardDataRoomCategories.length) * 100);
  const firstExpired = categoryStatus.find((item) => item.expired > 0);
  const firstMissing = categoryStatus.find((item) => item.missing > 0 || item.total === 0);

  return {
    dataRoomId: room.id,
    totalDocuments,
    readyDocuments,
    missingDocuments,
    expiredDocuments,
    completionPct,
    categoryStatus,
    nextStep: firstExpired
      ? `Replace or refresh expired ${firstExpired.category} material.`
      : firstMissing
        ? `Prepare the next missing ${firstMissing.category} diligence item.`
        : totalDocuments === 0
          ? "Add the first diligence document to the data room."
          : "Review sharing permissions and keep time-sensitive documents current.",
  };
}

function ownershipPct(termSheet: TermSheet): number | null {
  if (termSheet.equityPct !== null) return termSheet.equityPct;
  if (termSheet.preMoneyValuationCents === null || termSheet.preMoneyValuationCents <= 0 || termSheet.investmentAmountCents <= 0) return null;
  const postMoney = termSheet.preMoneyValuationCents + termSheet.investmentAmountCents;
  return Math.round((termSheet.investmentAmountCents / postMoney) * 10_000) / 100;
}

function cautionFlags(termSheet: TermSheet): string[] {
  const flags: string[] = [];
  const preference = termSheet.liquidationPreference.toLowerCase();
  const board = termSheet.boardSeat.toLowerCase();
  const exclusivity = termSheet.exclusivity.toLowerCase();
  if (preference && !/(^|\s)1x(\s|$)/.test(preference)) flags.push("Liquidation preference is not clearly standard 1x language; lawyer review is important.");
  if (preference.includes("participating")) flags.push("Participating liquidation preference can materially change founder/common-holder economics.");
  if (board.includes("control") || board.includes("majority")) flags.push("Board language may affect control or governance balance.");
  if (exclusivity) flags.push("Exclusivity/no-shop terms can restrict parallel fundraising during the stated period.");
  if (termSheet.optionPool) flags.push("Option-pool treatment can affect effective dilution depending on whether it is sized pre- or post-money.");
  if (termSheet.vesting) flags.push("Founder/employee vesting terms may alter ownership or retention obligations.");
  return flags;
}

export function compareTermSheets(termSheets: TermSheet[], investors: Investor[]): TermSheetComparison {
  const investorById = new Map(investors.map((investor) => [investor.id, investor]));
  const items: TermSheetComparisonItem[] = termSheets.map((termSheet) => {
    const estimatedOwnershipPct = ownershipPct(termSheet);
    const economicParts = [
      `Investment ${(termSheet.investmentAmountCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`,
      termSheet.preMoneyValuationCents !== null
        ? `pre-money ${(termSheet.preMoneyValuationCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`
        : "valuation not recorded",
      estimatedOwnershipPct !== null ? `estimated ownership ${estimatedOwnershipPct.toFixed(2)}%` : "ownership not calculable",
      termSheet.liquidationPreference || "liquidation preference not recorded",
    ];
    const governanceParts = [
      termSheet.boardSeat || "board terms not recorded",
      termSheet.proRata || "pro-rata terms not recorded",
      termSheet.optionPool || "option-pool terms not recorded",
      termSheet.exclusivity || "exclusivity terms not recorded",
    ];
    return {
      termSheetId: termSheet.id,
      investorName: investorById.get(termSheet.investorId)?.name ?? `Investor #${termSheet.investorId}`,
      investmentAmountCents: termSheet.investmentAmountCents,
      preMoneyValuationCents: termSheet.preMoneyValuationCents,
      estimatedOwnershipPct,
      economicSummary: economicParts.join(" · "),
      governanceSummary: governanceParts.join(" · "),
      cautionFlags: cautionFlags(termSheet),
    };
  });

  return {
    items,
    lawyerReviewRequired: true,
    disclaimer: "This comparison organizes recorded business terms for owner review. It is not legal advice and does not determine which term sheet is legally best. Qualified counsel should review all material terms before signature.",
  };
}
