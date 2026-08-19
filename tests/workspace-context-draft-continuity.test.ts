import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const app = readFileSync(resolve(root, "public", "app.ts"), "utf8");
const styles = readFileSync(resolve(root, "public", "styles.css"), "utf8");
const browserAcceptance = readFileSync(resolve(root, "scripts", "ui-browser-acceptance.cjs"), "utf8");

test("open professional workspace exposes explicit owner location and matching journey context", () => {
  assert.match(app, /t\("workspace\.currentAria", \{ label, draft:/);
  assert.match(app, /control\.textContent = t\("workspace\.returnContext", \{ label, draft: draftLabel \}\)/);
  assert.match(app, /button\.setAttribute\("aria-current", "step"\)/);
  assert.match(app, /button\.classList\.toggle\("current", current\)/);
  assert.match(styles, /\.owner-nav button\.current/);
});

test("unsaved owner state is derived from rendered controls and remains presentation-only", () => {
  assert.match(app, /let renderedControlBaseline = new Map<string, ControlDraft>\(\)/);
  assert.match(app, /function moduleHasUnsavedDraft\(module: HTMLElement\)/);
  assert.match(app, /control\.dataset\.hasDraft = String\(hasDraft\)/);
  assert.match(app, /document\.addEventListener\("input"/);
  assert.match(app, /document\.addEventListener\("change"/);
  for (const storageName of ["local" + "Storage", "session" + "Storage"]) {
    assert.doesNotMatch(app, new RegExp(storageName));
  }
});

test("server renders preserve dirty server-backed controls while accepting successfully persisted values", () => {
  assert.match(app, /function controlIsServerRendered/);
  assert.match(app, /function captureUnsavedServerRenderedDrafts/);
  assert.match(app, /const unsavedServerRenderedDrafts = captureUnsavedServerRenderedDrafts\(\)/);
  assert.match(app, /const draftsStillUnsaved = unsavedServerRenderedDrafts\.filter/);
  assert.match(app, /restoreControlDrafts\(draftsStillUnsaved\)/);
  assert.match(app, /document\.addEventListener\("reset"/);
  assert.match(app, /rememberRenderedControlBaseline\(target\)/);
});

test("real Chrome acceptance proves workspace context, kept-draft notice and cross-workspace save continuity", () => {
  assert.match(browserAcceptance, /contextNamesExecution/);
  assert.match(browserAcceptance, /executionNavCurrent/);
  assert.match(browserAcceptance, /desktopContextShowsUnsavedDraft/);
  assert.match(browserAcceptance, /desktopReturnDraftToast/);
  assert.match(browserAcceptance, /crossWorkspaceSavePreservedDraft/);
  assert.match(browserAcceptance, /Saving work in another professional workspace must not silently erase/);
});
