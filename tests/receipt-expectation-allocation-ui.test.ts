import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve(process.cwd(), "public", "index.html"), "utf8");
const app = readFileSync(resolve(process.cwd(), "public", "app.ts"), "utf8");

test("expectation-to-receipt UI requires explicit owner allocation and never advertises automatic matching", () => {
  assert.match(html, /Expectation → actual receipt/);
  assert.match(html, /No automatic matching/);
  assert.match(html, /receipt-expectation-allocation-form/);
  assert.match(html, /receipt-allocation-expectation-select/);
  assert.match(html, /receipt-allocation-tranche-select/);
  assert.match(html, /Link actual receipt/);
  assert.match(app, /\/api\/receipt-expectation-allocations/);
  assert.match(app, /No automatic matching was used/);
  assert.match(app, /Expected total/);
  assert.match(app, /Explicitly allocated actual cash/);
  assert.match(app, /Remaining expectation/);
  assert.match(app, /Current maximum supported amount for this link/);
  assert.match(app, /Repair constraint/);
  assert.match(app, /BossAI Funding will not choose which owner-confirmed relationship to remove/);
});

test("reconciliation repair drafting is owner-controlled and does not persist until Save link", () => {
  assert.match(app, /Owner-controlled repair draft/);
  assert.match(app, /data-draft-receipt-allocation-supported/);
  assert.match(app, /Draft supported amount/);
  assert.match(app, /data-draft-receipt-allocation-void/);
  assert.match(app, /Draft void/);
  assert.match(app, /Nothing is persisted until you review the fields and choose Save link/);
  assert.match(app, /server will revalidate current revision and both capacities/);
  assert.match(app, /amountInput\.value = dollars\(supportedAmountCents\)\.toString\(\)/);
  assert.match(app, /statusSelect\.value = "voided"/);
  assert.match(app, /Enter the real void reason/);
  assert.match(app, /refreshReceiptAllocationDraftWarnings\(latest\)/);
  assert.match(app, /Unsaved draft is .* above the maximum supported by the currently loaded financing facts/);
  assert.match(app, /The server revalidates again when you save/);
});

test("repair impact preview explains the unsaved consequence without claiming server authority", () => {
  assert.match(app, /Unsaved repair impact preview/);
  assert.match(app, /This Allocation/);
  assert.match(app, /Arrival Expectation/);
  assert.match(app, /Receipt Tranche/);
  assert.match(app, /Loaded-facts capacity check/);
  assert.match(app, /Fits the currently loaded relationship\/capacity facts/);
  assert.match(app, /Does not fit the currently loaded relationship\/capacity facts/);
  assert.match(app, /Save prerequisites/);
  assert.match(app, /Owner void reason still required before Save/);
  assert.match(app, /Ready to submit for server validation/);
  assert.match(app, /Preview only — nothing is saved/);
  assert.match(app, /Actual Receipt cash is unchanged/);
  assert.match(app, /newer facts can reject this draft/);
  assert.match(app, /draftChanged/);
});

test("allocation register keeps void history and displays reconciliation errors instead of rewriting cash", () => {
  assert.match(app, /receipt-allocation-voided/);
  assert.match(app, /receipt-allocation-invalid/);
  assert.match(app, /RECONCILIATION REQUIRED/);
  assert.match(app, /Reconciliation-invalid allocation amount/);
  assert.match(app, /Receipt Tranche/);
  assert.match(app, /Explicit Allocations against this receipt/);
  assert.match(app, /unallocated current cash capacity/);
  assert.match(html, /financing truth wins/);
});
