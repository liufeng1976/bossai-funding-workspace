import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve(process.cwd(), "public/index.html"), "utf8");
const app = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");
const styles = readFileSync(resolve(process.cwd(), "public/styles.css"), "utf8");

test("committed-capital arrival UI requires explicit amount date basis and owner without promising receipt", () => {
  assert.match(html, /id="receipt-expectation-form"/);
  assert.match(html, /name="expectedDate"/);
  assert.match(html, /name="basisNote"/);
  assert.match(html, /name="owner"/);
  assert.match(html, /not a forecast or guarantee/i);
  assert.match(html, /never counts as received cash/i);
  assert.match(html, /Actual cash is authoritative/i);
});

test("arrival expectation register preserves cancellation history and exact-item navigation", () => {
  assert.match(app, /receipt-expectation-\$\{expectation\.id\}/);
  assert.match(app, /data-save-receipt-expectation/);
  assert.match(app, /data-receipt-expectation-cancel-reason/);
  assert.match(app, /history retained/i);
  assert.match(app, /\/api\/receipt-expectations\/\$\{id\}/);
  assert.match(app, /funding-outcome\|receipt-expectation/);
  assert.match(styles, /\.receipt-expectation-cancelled/);
  assert.match(styles, /\.receipt-expectation-overdue/);
});

test("Funding Outcome card keeps remaining arrival schedule separate from actual receipt aggregate", () => {
  assert.match(app, /Arrival schedule/);
  assert.match(app, /remaining scheduled/);
  assert.match(app, /RECONCILIATION REQUIRED/);
  assert.match(app, /do not rely on this schedule until the explicit Allocation is corrected or voided/);
  assert.match(app, /still to arrive/);
  assert.match(app, /Managed by Receipt Tranche Register/);
  assert.match(app, /OVER-SCHEDULED/);
});
