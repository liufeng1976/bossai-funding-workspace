import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appSource = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");
const htmlSource = readFileSync(resolve(process.cwd(), "public/index.html"), "utf8");

test("owner dashboard exposes why capital has not arrived", () => {
  assert.match(htmlSource, /WHY CAPITAL HASN'T ARRIVED/);
  assert.match(htmlSource, /id="capital-blocker-count"/);
  assert.match(htmlSource, /id="capital-blocker-list"/);
  assert.match(appSource, /function renderCapitalBlockers\(blockers: CapitalBlocker\[\]\)/);
  assert.match(appSource, /renderCapitalBlockers\(data\.capitalBlockers\)/);
});

test("capital blocker navigation opens the exact financing record before falling back to the section", () => {
  assert.match(appSource, /const anchor = focusEntityAnchor\(blocker\.entityType, blocker\.entityId\)/);
  assert.match(appSource, /if \(anchor && navigateToWorkspaceTarget\(anchor\)\) return/);
  assert.match(appSource, /navigateToWorkspaceTarget\(blocker\.destination\)/);
});

test("zero blockers are explained rather than rendering a blank section", () => {
  assert.match(appSource, /No active capital blocker is visible from the recorded financing facts\./);
});
