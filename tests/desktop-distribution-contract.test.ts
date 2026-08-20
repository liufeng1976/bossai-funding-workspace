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
const commercialLoginHtml = readFileSync(resolve(root, "desktop", "commercial-login.html"), "utf8");
const commercialLoginJs = readFileSync(resolve(root, "desktop", "commercial-login.js"), "utf8");
const commercialLoginPreload = readFileSync(resolve(root, "desktop", "commercial-login-preload.cjs"), "utf8");
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

test("desktop commercial mode consumes Headquarters entitlement before opening Funding persistence", () => {
  assert.match(main, /dist\/src\/server\/commercial-entitlement\.js/);
  assert.match(main, /resolveCommercialInstallationId\(userDataDir\)/);
  assert.match(main, /resolveDesktopDistributionAuthorization/);
  assert.ok(main.indexOf("resolveDesktopDistributionAuthorization({") < main.indexOf("new FundingRepository(databasePath)"));
  assert.match(main, /commercial-installation-id\.txt/);
  assert.doesNotMatch(main, /writeFileSync\([^\n]*bearer|writeFileSync\([^\n]*entitlement/i);
});

test("commercial desktop session is OS-encrypted and login/MFA renderer has a narrow isolated bridge", () => {
  assert.match(main, /safeStorage\.isEncryptionAvailable\(\)/);
  assert.match(main, /safeStorage\.encryptString\(sessionToken\)/);
  assert.match(main, /safeStorage\.decryptString\(encrypted\)/);
  assert.match(main, /commercial-session\.bin/);
  assert.match(main, /dist\/src\/server\/commercial-account\.js/);
  assert.match(main, /loginHeadquartersAccount/);
  assert.match(main, /confirmHeadquartersMfa/);
  assert.match(main, /httpStatus !== 401/);
  for (const forbidden of ["local" + "Storage", "session" + "Storage"]) assert.equal(main.includes(forbidden), false);

  assert.match(commercialLoginPreload, /contextBridge\.exposeInMainWorld\("bossaiCommercialAuth"/);
  assert.match(commercialLoginPreload, /commercial-login/);
  assert.match(commercialLoginPreload, /commercial-mfa/);
  assert.doesNotMatch(commercialLoginPreload, /require\("fs"\)|require\("node:fs"\)|shell|child_process/);

  assert.match(commercialLoginHtml, /default-src 'none'/);
  assert.match(commercialLoginHtml, /type="password"/);
  for (const locale of ["en", "zh-CN", "zh-TW", "es"]) assert.match(commercialLoginHtml, new RegExp(`value="${locale}"`));
  assert.doesNotMatch(commercialLoginHtml, /https?:\/\//);
  for (const forbidden of ["local" + "Storage", "session" + "Storage"]) assert.equal(commercialLoginJs.includes(forbidden), false);
  assert.doesNotMatch(commercialLoginJs, /fetch\(|XMLHttpRequest|WebSocket/);
});

test("Windows distribution is pinned and produces an NSIS x64 installer without deleting user data on uninstall", () => {
  assert.match(builder, /appId: com\.bossai\.funding/);
  assert.match(builder, /copyright: Copyright \(c\) 2026 BossAI/);
  assert.match(builder, /electronVersion: 43\.4\.1/);
  assert.match(builder, /icon: out\/desktop-assets\/bossai-funding\.ico/);
  assert.match(builder, /legalTrademarks: BossAI/);
  assert.match(builder, /requestedExecutionLevel: asInvoker/);
  assert.match(builder, /target: nsis/);
  assert.match(builder, /- x64/);
  assert.match(builder, /installerIcon: out\/desktop-assets\/bossai-funding\.ico/);
  assert.match(builder, /uninstallerIcon: out\/desktop-assets\/bossai-funding\.ico/);
  assert.match(builder, /deleteAppDataOnUninstall: false/);
  assert.match(builder, /allowToChangeInstallationDirectory: true/);
  assert.match(gitignore, /^out\/$/m);
  assert.equal(pkg.scripts?.["desktop:prepare-assets"], "node scripts/prepare-desktop-assets.mjs");
  assert.match(pkg.scripts?.["desktop:commercial-smoke"] ?? "", /desktop:prepare-assets/);
  assert.match(pkg.scripts?.["desktop:commercial-session-smoke"] ?? "", /desktop:prepare-assets/);
  assert.match(pkg.scripts?.["verify:desktop"] ?? "", /desktop:commercial-smoke/);
  assert.match(pkg.scripts?.["verify:desktop"] ?? "", /desktop:commercial-session-smoke/);
  assert.match(pkg.scripts?.["desktop:installer"] ?? "", /desktop:prepare-assets/);
  assert.match(pkg.scripts?.["desktop:installer"] ?? "", /electron-builder@26\.15\.3 --win nsis/);
  assert.equal(pkg.scripts?.["desktop:packaged-smoke"], "node scripts/desktop-packaged-smoke.cjs");
  assert.equal(pkg.scripts?.["desktop:commercial-packaged-smoke"], "node scripts/desktop-commercial-entitlement-smoke.cjs --packaged");
  assert.equal(pkg.scripts?.["desktop:commercial-session-packaged-smoke"], "node scripts/desktop-commercial-session-smoke.cjs --packaged");
  assert.match(pkg.scripts?.["verify:desktop-package"] ?? "", /desktop:commercial-packaged-smoke/);
  assert.match(pkg.scripts?.["verify:desktop-package"] ?? "", /desktop:commercial-session-packaged-smoke/);
  assert.equal(pkg.scripts?.["desktop:installer-lifecycle"], "node scripts/desktop-installer-lifecycle.cjs");
  assert.equal(pkg.scripts?.["verify:desktop-installer"], "npm run desktop:installer && npm run desktop:installer-lifecycle");
});
