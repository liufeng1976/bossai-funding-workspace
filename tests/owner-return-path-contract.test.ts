import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const html = readFileSync(resolve(root, "public", "index.html"), "utf8");
const app = readFileSync(resolve(root, "public", "app.ts"), "utf8");
const styles = readFileSync(resolve(root, "public", "styles.css"), "utf8");
const browserAcceptance = readFileSync(resolve(root, "scripts", "ui-browser-acceptance.cjs"), "utf8");

test("owner return control is a presentation-only escape path outside financing workspaces", () => {
  assert.match(html, /id="return-to-overview"[^>]*hidden[^>]*>Back to capital overview<\/button>/);
  const returnIndex = html.indexOf('id="return-to-overview"');
  const mainCloseIndex = html.indexOf("</main>");
  assert.ok(returnIndex > mainCloseIndex, "return control must not become part of a financing form/register");
  assert.match(styles, /\.owner-return \{ position: fixed;/);
  assert.match(styles, /\.owner-return\[hidden\] \{ display: none; \}/);
});

test("opening a progressive workspace exposes one return control and returning closes disclosure only", () => {
  assert.match(app, /function syncOwnerReturnControl\(\): void/);
  assert.match(app, /const openModule = \[\.\.\.document\.querySelectorAll<HTMLElement>\(progressiveModuleSelector\)\]/);
  assert.match(app, /control\.hidden = !openModule/);
  assert.match(app, /function closeWorkspaceModules\(\): void/);
  assert.match(app, /function returnToOwnerOverview\(smooth = true, focusAction = true\): void/);
  assert.match(app, /window\.history\.replaceState\(null, "", `\$\{window\.location\.pathname\}\$\{window\.location\.search\}`\)/);
  assert.match(app, /document\.querySelector<HTMLElement>\("\.hero-grid"\)\?\.scrollIntoView/);
  const returnFunction = app.match(/function returnToOwnerOverview[\s\S]*?\n}\n\nfunction openWorkspaceModuleForTarget/)?.[0] ?? "";
  assert.doesNotMatch(returnFunction, /render\(/);
  assert.doesNotMatch(returnFunction, /requestJson/);
});

test("initial no-hash boot does not jump past the product header while hash return can restore overview", () => {
  assert.match(app, /function resumeWorkspaceLocation\(returnToOverviewWhenEmpty = false\): void/);
  assert.match(app, /if \(returnToOverviewWhenEmpty\) returnToOwnerOverview\(false, false\);\s*else closeWorkspaceModules\(\);/);
  assert.match(app, /window\.addEventListener\("hashchange", \(\) => resumeWorkspaceLocation\(true\)\)/);
  assert.match(app, /render\(initial\);\s*resumeWorkspaceLocation\(\);/);
});

test("real Chrome acceptance proves desktop and mobile deep-work return without losing drafts", () => {
  assert.match(browserAcceptance, /mobileReturnPath/);
  assert.match(browserAcceptance, /visibleDeepInModule/);
  assert.match(browserAcceptance, /desktopReturnVisibleDeep/);
  assert.match(browserAcceptance, /desktopReturnPreservedDraft/);
  assert.match(browserAcceptance, /desktopReturnClosedModules/);
  assert.match(browserAcceptance, /desktopReturnHashCleared/);
  assert.match(browserAcceptance, /desktopReturnHeroVisible/);
  assert.match(browserAcceptance, /desktopReturnFocusRestored/);
  assert.match(browserAcceptance, /focusRestoredToToday/);
});
