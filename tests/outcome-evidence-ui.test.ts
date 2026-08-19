import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appSource = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");
const htmlSource = readFileSync(resolve(process.cwd(), "public/index.html"), "utf8");

test("Funding Outcome form requires owner-visible commitment and receipt evidence inputs", () => {
  assert.match(htmlSource, /name="commitmentEvidence"/);
  assert.match(htmlSource, /Required when committed capital is greater than \$0/);
  assert.match(htmlSource, /name="receiptEvidence"/);
  assert.match(htmlSource, /Required when received capital is greater than \$0/);
  assert.match(htmlSource, /first Receipt Tranche automatically/i);
  assert.match(htmlSource, /Later receipts belong in the Receipt Tranche Register/i);
});

test("Funding Outcome cards expose evidence gaps and exact correction controls", () => {
  assert.match(appSource, /item\.id = `funding-outcome-\$\{outcome\.id\}`/);
  assert.match(appSource, /EVIDENCE MISSING/);
  assert.match(appSource, /data-outcome-commitment-evidence/);
  assert.doesNotMatch(appSource, /data-outcome-received=/);
  assert.doesNotMatch(appSource, /data-outcome-receipt-evidence=/);
  assert.match(appSource, /Received aggregate/);
  assert.match(appSource, /Managed by Receipt Tranche Register/);
  assert.match(appSource, /receiptTranches/);
});

test("funding outcome is a resumable exact financing anchor", () => {
  assert.match(appSource, /closing-condition\|funding-outcome/);
});
