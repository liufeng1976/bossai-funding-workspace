import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appSource = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");
const stylesSource = readFileSync(resolve(process.cwd(), "public/styles.css"), "utf8");

test("resolved financing records visibly defer to Funding Outcome without deleting historical context", () => {
  assert.match(appSource, /Resolved by Funding Outcome/);
  assert.match(appSource, /Funding Outcome is the current financing state\. This record remains as historical execution evidence/);
  assert.match(appSource, /latestOutcomeForApplication/);
  assert.match(appSource, /latestOutcomeForInvestor/);
  assert.match(appSource, /resolved-by-outcome/);
  assert.match(stylesSource, /\.resolved-by-outcome/);
  assert.match(stylesSource, /\.outcome-resolution-note/);
});

test("resolved application and investor cards stop presenting historical next steps as current execution controls", () => {
  assert.match(appSource, /resolvedOutcome \? "Historical next" : "Next"/);
  assert.match(appSource, /resolvedOutcome \? outcomeResolutionHtml\(resolvedOutcome\) : `<div class="pipeline-controls">/);
  assert.match(appSource, /resolvedInvestorIds/);
});

test("Funding Outcome correction UI can repair final facts and application investor round links", () => {
  assert.match(appSource, /data-save-outcome/);
  assert.match(appSource, /data-outcome-application/);
  assert.match(appSource, /data-outcome-investor/);
  assert.match(appSource, /data-outcome-round/);
  assert.match(appSource, /data-outcome-committed/);
  assert.doesNotMatch(appSource, /data-outcome-received=/);
  assert.match(appSource, /Managed by Receipt Tranche Register/);
  assert.match(appSource, /data-save-receipt-tranche/);
  assert.match(appSource, /`\/api\/outcomes\/\$\{id\}`/);
  assert.match(appSource, /method: "PATCH"/);
  assert.match(appSource, /Funding Outcome corrected\. Capital state recalculated/);
});

test("Equity summary exposes resolved outcomes separately from active investors", () => {
  assert.match(appSource, /\["Resolved outcomes", summary\.resolvedInvestorCount\.toString\(\)\]/);
  assert.match(appSource, /followUp\.status === "pending" && !resolvedInvestorIds\.has\(followUp\.investorId\)/);
  assert.match(appSource, /meeting\.status === "scheduled" && !resolvedInvestorIds\.has\(meeting\.investorId\)/);
});
