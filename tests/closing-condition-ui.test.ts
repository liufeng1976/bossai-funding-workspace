import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve(process.cwd(), "public/index.html"), "utf8");
const app = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");

test("closing-condition register is financing-specific and captures owner, due date, status and evidence", () => {
  assert.match(html, /id="closing-condition-form"/);
  assert.match(html, /Closing condition register/);
  assert.match(html, /not a general task list/i);
  assert.match(html, /name="owner"/);
  assert.match(html, /name="dueDate"/);
  assert.match(html, /name="evidenceNote"/);
  assert.match(html, /Required when satisfied or waived/i);
});

test("closing-condition cards have stable exact-item anchors and correction controls", () => {
  assert.match(app, /item\.id = `closing-condition-\$\{condition\.id\}`/);
  assert.match(app, /data-save-closing-condition/);
  assert.match(app, /data-closing-condition-status/);
  assert.match(app, /data-closing-condition-owner/);
  assert.match(app, /data-closing-condition-due/);
  assert.match(app, /data-closing-condition-evidence/);
  assert.match(app, /closing-condition\|funding-outcome/);
});

test("closing-condition UI states Funding Outcome remains final financing authority", () => {
  assert.match(html, /Funding Outcome remains the final financing state/i);
  assert.match(html, /Clearing this register does not itself prove legal closing or cash receipt/i);
});
