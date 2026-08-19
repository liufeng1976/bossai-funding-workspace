import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const html = readFileSync(resolve(root, "public", "index.html"), "utf8");
const app = readFileSync(resolve(root, "public", "app.ts"), "utf8");
const styles = readFileSync(resolve(root, "public", "styles.css"), "utf8");
const browserAcceptance = readFileSync(resolve(root, "scripts", "ui-browser-acceptance.cjs"), "utf8");

test("owner first view projects the existing blocker, timing and three-track truth without adding a new financing authority", () => {
  assert.match(html, /class="owner-first-view"/);
  assert.match(html, /WHY CAPITAL HASN'T ARRIVED/);
  assert.match(html, /CAPITAL TIMING/);
  assert.match(html, /THREE CAPITAL TRACKS/);
  assert.match(app, /function renderOwnerFirstView\(data: Dashboard\)/);
  assert.match(app, /data\.capitalBlockers\[0\]/);
  assert.match(app, /const timing = data\.timingPlan/);
  assert.match(app, /data\.tracks\.map/);
  const projection = app.match(/function renderOwnerFirstView\(data: Dashboard\): void \{([\s\S]*?)\n\}\n\nfunction renderDashboard/);
  const projectionBody = projection?.[1] ?? "";
  assert.ok(projectionBody, "owner first-view projection must remain a bounded browser projection");
  assert.doesNotMatch(projectionBody, /requestJson|fetch\(|POST|PATCH|DELETE/);
});

test("owner snapshot opens existing decision detail instead of duplicating professional forms or registers", () => {
  assert.match(html, /id="decision-details"[^>]*data-progressive-module[^>]*data-module-label="Decision details"/);
  assert.match(html, /class="capital-timing-card" id="timing"/);
  assert.match(html, /class="capital-blockers-card" id="blockers"/);
  assert.match(html, /class="section" id="tracks"/);
  assert.match(app, /owner-snapshot-blocker-action[\s\S]*navigateToWorkspaceTarget\("blockers"\)/);
  assert.match(app, /owner-snapshot-timing-action[\s\S]*navigateToWorkspaceTarget\("timing"\)/);
  assert.match(app, /owner-snapshot-track-action[\s\S]*navigateToWorkspaceTarget\("tracks"\)/);
  assert.equal((html.match(/data-professional-module/g) || []).length, 7);
  assert.match(html, /id="company-form"/);
  assert.match(html, /id="term-sheet-form"/);
  assert.match(html, /id="receipt-expectation-allocation-form"/);
});

test("real Chrome acceptance makes first-view visibility a geometry contract on desktop and mobile", () => {
  assert.match(browserAcceptance, /v039PageHeightBaseline/);
  assert.match(browserAcceptance, /desktop\.firstViewRect\.bottom <= desktop\.innerHeight/);
  assert.match(browserAcceptance, /mobile\.firstViewRect\.bottom <= mobile\.innerHeight \* 2/);
  assert.match(browserAcceptance, /desktop\.v039HeightReductionPct/);
  assert.match(browserAcceptance, /mobile\.v039HeightReductionPct/);
  assert.match(browserAcceptance, /blockerSnapshotOpensDecisionDetail/);
  assert.match(browserAcceptance, /timingSnapshotOpensDecisionDetail/);
  assert.match(browserAcceptance, /trackSnapshotOpensDecisionDetail/);
  assert.match(styles, /\.owner-first-view \{ display: grid;/);
});
