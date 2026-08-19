import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appSource = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");
const htmlSource = readFileSync(resolve(process.cwd(), "public/index.html"), "utf8");

test("capital coverage UI separates received, secured, recorded reach, and uncovered pipeline gap", () => {
  assert.match(htmlSource, /CAPITAL COVERAGE & CLOSING PLAN/);
  assert.match(htmlSource, /Cash received/);
  assert.match(htmlSource, /Received \+ committed/);
  assert.match(htmlSource, /Recorded reach incl\. In motion/);
  assert.match(htmlSource, /Still uncovered after current pipeline/);
  assert.match(appSource, /coverage-received-pct/);
  assert.match(appSource, /coverage-secured-pct/);
  assert.match(appSource, /coverage-recorded-pct/);
  assert.match(appSource, /coverage-uncovered/);
});

test("closing plan states stage ordering is not predicted success probability", () => {
  assert.match(htmlSource, /Ordered by recorded financing stage only—not predicted success probability/);
  assert.match(htmlSource, /not a probability-weighted forecast, commitment, or guarantee/i);
  assert.match(appSource, /plan\.disclaimer/);
});

test("closest-to-cash item opens the exact financing entity before section fallback", () => {
  assert.match(appSource, /function renderCoveragePlan\(/);
  assert.match(appSource, /const anchor = focusEntityAnchor\(item\.entityType, item\.entityId\)/);
  assert.match(appSource, /if \(anchor && navigateToWorkspaceTarget\(anchor\)\) return/);
  assert.match(appSource, /navigateToWorkspaceTarget\(item\.destination\)/);
  assert.match(appSource, /Open this financing item/);
});
