import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const html = readFileSync(resolve(root, "public", "index.html"), "utf8");
const app = readFileSync(resolve(root, "public", "app.ts"), "utf8");
const styles = readFileSync(resolve(root, "public", "styles.css"), "utf8");
const browserAcceptance = readFileSync(resolve(root, "scripts", "ui-browser-acceptance.cjs"), "utf8");
const repairAcceptance = readFileSync(resolve(root, "scripts", "chrome-repair-smoke.cjs"), "utf8");

const progressiveModuleIds = ["strategy", "setup", "opportunities", "actions", "equity", "execution", "continuity"];

test("owner workspace keeps the four primary financing judgments outside progressive disclosure", () => {
  assert.match(html, /TODAY'S FOCUS/);
  assert.match(html, /CAPITAL GAP/);
  assert.match(html, /WHY CAPITAL HASN'T ARRIVED/);
  assert.match(html, /THREE CAPITAL TRACKS/);
  assert.doesNotMatch(html, /<section class="hero-grid"[^>]*data-progressive-module/);
  assert.doesNotMatch(html, /<section class="capital-blockers-card"[^>]*data-progressive-module/);
});

test("all seven professional workspaces are discoverable progressive modules without deleting their capabilities", () => {
  for (const id of progressiveModuleIds) {
    assert.match(html, new RegExp(`<section id="${id}"[^>]*data-progressive-module[^>]*data-professional-module`), `${id} must remain a discoverable professional workspace`);
  }
  assert.equal((html.match(/data-professional-module/g) || []).length, progressiveModuleIds.length);
  assert.equal((html.match(/data-progressive-module/g) || []).length, progressiveModuleIds.length + 1);
  assert.match(html, /<section id="decision-details"[^>]*data-progressive-module[^>]*data-module-label="Decision details"/);
  assert.match(html, /id="company-form"/);
  assert.match(html, /id="opportunity-form"/);
  assert.match(html, /id="investor-form"/);
  assert.match(html, /id="data-room-form"/);
  assert.match(html, /id="diligence-form"/);
  assert.match(html, /id="term-sheet-form"/);
  assert.match(html, /id="closing-condition-form"/);
  assert.match(html, /id="receipt-tranche-form"/);
  assert.match(html, /id="receipt-expectation-form"/);
  assert.match(html, /id="receipt-expectation-allocation-form"/);
});

test("navigation and exact-item focus reopen the containing workspace without introducing persistent financing UI truth", () => {
  assert.match(app, /function openWorkspaceModuleForTarget\(target: HTMLElement\)/);
  assert.match(app, /openWorkspaceModuleForTarget\(target\);/);
  assert.match(app, /window\.addEventListener\("hashchange", \(\) => resumeWorkspaceLocation\(true\)\)/);
  assert.match(app, /receipt-tranche/);
  assert.match(app, /receipt-expectation-allocation/);
  for (const storageName of ["local" + "Storage", "session" + "Storage"]) {
    assert.doesNotMatch(app, new RegExp(storageName));
  }
  assert.match(styles, /\[data-progressive-module\]:not\(\[data-module-open="true"\]\) > :not\(\.section-heading\) \{ display: none !important; \}/);
});

test("real Chrome acceptance measures height reduction and protects nav, draft refresh, exact focus and hash reload", () => {
  assert.match(browserAcceptance, /v038PageHeightBaseline/);
  assert.match(browserAcceptance, /v039PageHeightBaseline/);
  assert.match(browserAcceptance, /firstViewRect/);
  assert.match(browserAcceptance, /pageHeightReductionPct/);
  assert.match(browserAcceptance, /draftPreservedAcrossDisclosureAndRefresh/);
  assert.match(browserAcceptance, /todaysFocusTargetsExactAction/);
  assert.match(browserAcceptance, /exactFocusOpenedModule/);
  assert.match(browserAcceptance, /exactHashReload/);
  assert.match(browserAcceptance, /onlyOpportunitiesModuleOpen/);
  assert.match(browserAcceptance, /onlyActionsModuleOpen/);
});

test("reconciliation Chrome acceptance opens Execute and close through the owner navigation before asserting visible repair guidance", () => {
  assert.match(repairAcceptance, /data-scroll="execution"/);
  assert.match(repairAcceptance, /executionOpen/);
  assert.match(repairAcceptance, /RECONCILIATION REQUIRED/);
  assert.match(repairAcceptance, /BOSSAI_FUNDING_CHROME_REPAIR_SMOKE_PASS/);
});
