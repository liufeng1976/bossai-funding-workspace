import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appSource = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");
const focusSource = readFileSync(resolve(process.cwd(), "src/domain/focus.ts"), "utf8");
const dashboardSource = readFileSync(resolve(process.cwd(), "src/domain/dashboard.ts"), "utf8");
const serverSource = readFileSync(resolve(process.cwd(), "src/server/app.ts"), "utf8");
const browserAcceptance = readFileSync(resolve(process.cwd(), "scripts/ui-browser-acceptance.cjs"), "utf8");

test("Today Focus UI resolves a concrete financing entity before falling back to a section", () => {
  assert.match(appSource, /function focusEntityAnchor\(/);
  assert.match(appSource, /if \(anchor && navigateToWorkspaceTarget\(anchor\)\) return/);
  assert.match(appSource, /navigateToWorkspaceTarget\(focusDestinationTarget\(focus\)\)/);
  assert.match(appSource, /if \(!state\?\.companyProfile\) return "company-form"/);
  assert.match(appSource, /if \(!state\.fundingGoal \|\| state\.fundingGoal\.targetAmountCents <= 0\) return "goal-form"/);
  assert.match(appSource, /focusButton\.textContent = translateCanonical\(data\.todayFocus\.entityType && data\.todayFocus\.entityId \? "Open this item" : "Do this now"\)/);
});

 test("workspace navigation stores a resumable hash and restores it after bootstrap render", () => {
  assert.match(appSource, /window\.history\.replaceState\(null, "", `#\$\{targetId\}`\)/);
  assert.match(appSource, /function resumeWorkspaceLocation\(returnToOverviewWhenEmpty = false\)/);
  assert.match(appSource, /decodeURIComponent\(window\.location\.hash\.replace/);
  assert.match(appSource, /render\(initial\);\s*resumeWorkspaceLocation\(\);/);
  assert.match(appSource, /if \(navigateToWorkspaceTarget\(targetId, false\)\) return/);
  assert.match(appSource, /window\.history\.replaceState\(null, "", `\$\{window\.location\.pathname\}\$\{window\.location\.search\}`\)/);
});

test("Today Focus exposes status, owner and timing context without inventing missing facts", () => {
  assert.match(appSource, /focusContext\.hidden = !\(data\.todayFocus\.entityType && data\.todayFocus\.entityId\)/);
  assert.match(appSource, /text\("focus-status", formatFocusStatus\(data\.todayFocus\.workStatus\)\)/);
  assert.match(appSource, /text\("focus-owner", data\.todayFocus\.workOwner \|\| translateCanonical\("Not recorded"\)\)/);
  assert.match(appSource, /text\("focus-when", formatFocusWhen\(data\.todayFocus\.workDueAt\)\)/);
});

test("first-run fallback keeps Capital Strategy and Find money ahead of generic execution", () => {
  const strategyIndex = focusSource.indexOf('title: strategyFreshness.state === "recalculate" ? "Refresh the capital strategy" : "Create the capital strategy"');
  const findMoneyIndex = focusSource.indexOf('title: "Find the first funding target"');
  const firstActionIndex = focusSource.lastIndexOf('title: "Create the first financing action"');
  assert.ok(strategyIndex >= 0 && findMoneyIndex > strategyIndex && firstActionIndex > findMoneyIndex);
  assert.match(focusSource, /strategyFreshness && strategyFreshness\.state !== "current"/);
  assert.match(focusSource, /opportunities\.length === 0 && investors\.length === 0/);
  assert.match(dashboardSource, /strategyFreshness: CapitalStrategyFreshness \| null = null/);
  assert.ok(serverSource.includes("receiptExpectationAllocations, strategyFreshness)"));
});

test("first-run successful saves advance to the exact next planning surface", () => {
  assert.match(appSource, /const firstProfile = !state\?\.companyProfile/);
  assert.match(appSource, /navigateToWorkspaceTarget\("goal-form"\)/);
  assert.match(appSource, /const firstGoal = !state\?\.fundingGoal/);
  assert.match(appSource, /navigateToWorkspaceTarget\("strategy"\)/);
  assert.match(appSource, /translateCanonical\(freshness\.state === "not-created" \? "Calculate strategy" : "Recalculate strategy"\)/);
});

test("real Chrome acceptance proves the sequential empty-workspace core journey", () => {
  for (const signal of ["firstRunFocusOpensCompanyForm", "companySaveAdvancesToGoal", "goalSaveAdvancesToStrategy", "strategyCreatesFindMoneyFocus", "findMoneyFocusOpensOpportunities"]) {
    assert.ok(browserAcceptance.includes(signal), `missing first-run acceptance signal ${signal}`);
  }
});

test("rendered financing items expose stable anchors for every focus entity type", () => {
  const requiredAnchors = [
    "funding-action-${action.id}",
    "opportunity-${opportunity.id}",
    "investor-${investor.id}",
    "investor-follow-up-${followUp.id}",
    "financing-meeting-${meeting.id}",
    "funding-application-${application.id}",
    "due-diligence-${request.id}",
    "term-sheet-${term.termSheetId}",
    "closing-condition-${condition.id}",
    "funding-outcome-${outcome.id}",
  ];
  for (const anchor of requiredAnchors) {
    assert.ok(appSource.includes(anchor), `missing focus anchor ${anchor}`);
  }
  assert.match(appSource, /focus-highlight/);
});
