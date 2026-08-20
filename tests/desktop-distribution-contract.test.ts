import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
  main?: string;
  scripts?: Record<string, string>;
};
const main = readFileSync(resolve(root, "desktop", "main.cjs"), "utf8");
const builder = readFileSync(resolve(root, "electron-builder.yml"), "utf8");
const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");

test("desktop distribution reuses the existing Funding server and SQLite authority", () => {
  assert.equal(pkg.main, "desktop/main.cjs");
  assert.match(main, /dist\/src\/server\/app\.js/);
  assert.match(main, /dist\/src\/server\/database\.js/);
  assert.match(main, /new FundingRepository\(databasePath\)/);
  assert.match(main, /createFundingServer\(repo, publicDir/);
  assert.doesNotMatch(main, /new DatabaseSync|CREATE TABLE|INSERT INTO|UPDATE funding_/);
});

test("desktop runtime is loopback-only, single-instance and renderer-isolated", () => {
  assert.match(main, /const HOST = "127\.0\.0\.1"/);
  assert.match(main, /serverInstance\.listen\(0, HOST/);
  assert.match(main, /app\.requestSingleInstanceLock\(\)/);
  assert.match(main, /nodeIntegration: false/);
  assert.match(main, /contextIsolation: true/);
  assert.match(main, /sandbox: true/);
  assert.match(main, /setWindowOpenHandler/);
  assert.match(main, /will-navigate/);
});

test("desktop persists business data under Electron userData and test modes use an isolated override", () => {
  assert.match(main, /app\.getPath\("userData"\)/);
  assert.match(main, /join\(userDataDir, "data"\)/);
  assert.match(main, /bossai-funding\.sqlite/);
  assert.match(main, /BOSSAI_FUNDING_DESKTOP_USER_DATA/);
  assert.match(main, /BOSSAI_FUNDING_DESKTOP_SMOKE_PASS/);
  assert.match(main, /BOSSAI_FUNDING_DESKTOP_LIFECYCLE/);
});

test("Windows distribution is pinned and produces an NSIS x64 installer without deleting user data on uninstall", () => {
  assert.match(builder, /appId: com\.bossai\.funding/);
  assert.match(builder, /electronVersion: 43\.4\.1/);
  assert.match(builder, /target: nsis/);
  assert.match(builder, /- x64/);
  assert.match(builder, /deleteAppDataOnUninstall: false/);
  assert.match(builder, /allowToChangeInstallationDirectory: true/);
  assert.match(gitignore, /^out\/$/m);
  assert.equal(pkg.scripts?.["desktop:installer"], "npm run build && npx --yes electron-builder@26.15.3 --win nsis");
  assert.equal(pkg.scripts?.["desktop:packaged-smoke"], "node scripts/desktop-packaged-smoke.cjs");
  assert.equal(pkg.scripts?.["desktop:installer-lifecycle"], "node scripts/desktop-installer-lifecycle.cjs");
  assert.equal(pkg.scripts?.["verify:desktop-installer"], "npm run desktop:installer && npm run desktop:installer-lifecycle");
});
