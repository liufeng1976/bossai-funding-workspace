import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const script = readFileSync(resolve(process.cwd(), "scripts", "ui-browser-acceptance.cjs"), "utf8");
const app = readFileSync(resolve(process.cwd(), "public", "app.ts"), "utf8");
const styles = readFileSync(resolve(process.cwd(), "public", "styles.css"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as { scripts?: Record<string, string>; devDependencies?: Record<string, string> };

test("UI browser acceptance targets the real local Web runtime through system Chrome rather than Electron", () => {
  assert.doesNotMatch(script, /require\(["']electron["']\)/);
  assert.doesNotMatch(script, /BrowserWindow/);
  assert.match(script, /Google\\\\Chrome\\\\Application\\\\chrome\.exe/);
  assert.match(script, /remote-debugging-port/);
  assert.match(script, /Page\.captureScreenshot/);
  assert.match(script, /Emulation\.setDeviceMetricsOverride/);
  assert.match(script, /1440/);
  assert.match(script, /390/);
  assert.match(script, /BOSSAI_FUNDING_UI_ACCEPTANCE_PASS/);
  assert.equal(packageJson.scripts?.["test:ui-browser"], "node scripts/ui-browser-acceptance.cjs");
  assert.equal(packageJson.scripts?.["test:owner-mobile"], "node scripts/ui-browser-acceptance.cjs --mobile-owner-readiness");
  assert.equal(packageJson.scripts?.["verify:owner-readiness"], "npm run verify && npm run test:ui-browser && npm run test:owner-mobile && npm run test:locales && npm run test:locale-leaks && npm run test:chrome-repair");
  assert.equal(packageJson.devDependencies?.electron, undefined);
});

test("first-run form failure recovery is persistent, exact-step and draft-preserving", () => {
  assert.match(app, /let pendingRecoveryTargetId: string \| null = null/);
  assert.match(app, /function showFormRecovery\(/);
  assert.match(app, /Not saved — your entries are still here/);
  assert.match(app, /Changed elsewhere — your draft is still here/);
  assert.match(app, /navigateToWorkspaceTarget\(target\.id, false\)/);
  assert.match(app, /Latest state loaded — your draft is still here/);
  assert.match(app, /Continue this same step, review the current facts, then save again/);
  assert.match(styles, /\.form-recovery \{/);
  assert.match(script, /goalFailureRecoveryVisible/);
  assert.match(script, /staleRefreshReturnsToGoal/);
  assert.match(script, /staleRefreshPreservedDraft/);
});

test("owner readiness adds an independent fresh-database 390x844 interaction gate before human acceptance", () => {
  assert.match(script, /--mobile-owner-readiness/);
  assert.match(script, /BOSSAI_FUNDING_MOBILE_OWNER_READINESS_PASS/);
  assert.match(script, /firstStepExact/);
  assert.match(script, /nativeValidationBlocks/);
  assert.match(script, /validationRecovery/);
  assert.match(script, /staleRefreshReturnsExact/);
  assert.match(script, /findMoneyExact/);
  assert.match(script, /noHorizontalOverflow/);
});
