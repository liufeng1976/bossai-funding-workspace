import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve(process.cwd(), "public/index.html"), "utf8");
const app = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");

test("receipt tranche register is financing-specific and captures amount date and evidence", () => {
  assert.match(html, /id="receipt-tranche-form"/);
  assert.match(html, /Receipt tranche register/);
  assert.match(html, /not a general accounting ledger/i);
  assert.match(html, /name="outcomeId"/);
  assert.match(html, /name="amount"/);
  assert.match(html, /name="receivedDate"/);
  assert.match(html, /name="receiptEvidence"/);
});

test("Funding Outcome received aggregate is tranche-managed rather than directly editable", () => {
  assert.match(app, /Received aggregate/);
  assert.match(app, /Managed by Receipt Tranche Register/);
  assert.doesNotMatch(app, /data-outcome-received=/);
  assert.doesNotMatch(app, /data-outcome-received-date=/);
  assert.doesNotMatch(app, /data-outcome-receipt-evidence=/);
});

test("receipt tranche cards preserve void history and expose exact correction controls", () => {
  assert.match(app, /item\.id = `receipt-tranche-\$\{tranche\.id\}`/);
  assert.match(app, /data-save-receipt-tranche/);
  assert.match(app, /data-receipt-tranche-status/);
  assert.match(app, /data-receipt-tranche-amount/);
  assert.match(app, /data-receipt-tranche-date/);
  assert.match(app, /data-receipt-tranche-evidence/);
  assert.match(app, /data-receipt-tranche-void-reason/);
  assert.match(html, /Voided tranches remain visible as history/i);
});
