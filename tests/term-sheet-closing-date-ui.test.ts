import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve(process.cwd(), "public/index.html"), "utf8");
const app = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");

test("term sheet form records a target close date without labeling it a predicted wire date", () => {
  assert.match(html, /name="targetCloseDate" type="date"/);
  assert.match(html, /closing target, not a predicted wire date/i);
});

test("term sheet cards expose owner-editable closing timing and status", () => {
  assert.match(app, /data-term-close-date/);
  assert.match(app, /data-term-status/);
  assert.match(app, /data-save-term-close/);
  assert.match(app, /Save closing timing/);
  assert.match(app, /management target, not a predicted funding receipt date/i);
  assert.match(app, /\/api\/term-sheets\/\$\{id\}/);
});

test("term sheet card makes a missing closing target explicit", () => {
  assert.match(app, /target close not recorded/i);
});
