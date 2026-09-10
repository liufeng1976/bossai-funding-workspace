import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
  private?: boolean;
  license?: string;
  repository?: { url?: string };
  homepage?: string;
};
const license = readFileSync(resolve(root, "LICENSE"), "utf8");
const commercial = readFileSync(resolve(root, "COMMERCIAL_LICENSE.md"), "utf8");
const history = readFileSync(resolve(root, "LICENSE_HISTORY.md"), "utf8");
const contributing = readFileSync(resolve(root, "CONTRIBUTING.md"), "utf8");
const cla = readFileSync(resolve(root, "CLA.md"), "utf8");
const entitlementBoundary = readFileSync(resolve(root, "COMMERCIAL_ENTITLEMENT_BOUNDARY.md"), "utf8");
const entitlementConsumer = readFileSync(resolve(root, "src", "server", "commercial-entitlement.ts"), "utf8");
const i18n = readFileSync(resolve(root, "public", "i18n.ts"), "utf8");
const html = readFileSync(resolve(root, "public", "index.html"), "utf8");

const requiredPublicFiles = [
  "README.md",
  "LICENSE",
  "LICENSE_HISTORY.md",
  "COMMERCIAL_LICENSE.md",
  "COMMERCIAL_ENTITLEMENT_BOUNDARY.md",
  "NOTICE.md",
  "CONTRIBUTING.md",
  "CLA.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  "TRADEMARKS.md",
  "CHANGELOG.md",
  "THIRD_PARTY_LICENSES.md",
];

test("repository metadata declares Community Source licensing while preventing accidental npm publication", () => {
  assert.equal(pkg.private, true);
  assert.equal(pkg.license, "LicenseRef-BossAI-Community-Source-1.0");
  assert.equal(pkg.repository?.url, "git+https://github.com/liufeng1976/bossai-funding-workspace.git");
  assert.equal(pkg.homepage, "https://github.com/liufeng1976/bossai-funding-workspace#readme");
  for (const file of requiredPublicFiles) assert.equal(existsSync(resolve(root, file)), true, `missing ${file}`);
});

test("LICENSE is the BossAI Community Source license and preserves historical AGPL rights", () => {
  assert.match(license, /BossAI Community Source License 1\.0/u);
  assert.match(license, /Personal and non-commercial grant/u);
  assert.match(license, /Commercial use requires authorization/u);
  assert.match(license, /Historical repository revisions.*AGPL-3\.0-or-later/is);
  assert.match(history, /v0\.51\.0/u);
  assert.match(history, /6600da2899d83eddcfc43efbc2d81805d662d77a/u);
  assert.match(history, /Rights already granted under AGPL.*remain governed/is);
});

test("commercial licensing separates offline Community runtime from commercial-use authorization", () => {
  assert.match(commercial, /source available, not OSI Open Source/i);
  assert.match(commercial, /Commercial use.*requires BossAI/i);
  assert.match(commercial, /offline technical behavior does.*not.*grant commercial-use rights/is);
  assert.match(commercial, /historical.*v0\.51\.0.*AGPL/is);
  assert.match(entitlementBoundary, /Community build.*must not require a proprietary BossAI commercial entitlement/is);
  assert.match(entitlementBoundary, /does not.*grant commercial-use rights/is);
  assert.match(entitlementBoundary, /BossAI Headquarters Commerce/i);
  assert.match(entitlementBoundary, /must not create a second source of truth/i);
  assert.match(entitlementBoundary, /bossai\.commercial-entitlement\.v1/i);
  assert.match(entitlementBoundary, /bossai-funding\.commercial/i);
  assert.match(entitlementBoundary, /safeStorage\.encryptString/i);
  assert.match(entitlementBoundary, /real paid-account end-to-end acceptance/i);
  assert.match(entitlementConsumer, /FUNDING_COMMERCIAL_PRODUCT_ID = "bossai-funding"/);
  assert.match(entitlementConsumer, /FUNDING_COMMERCIAL_FEATURE_ID = "bossai-funding\.commercial"/);
  assert.match(entitlementConsumer, /HEADQUARTERS_ENTITLEMENT_SCHEMA = "bossai\.commercial-entitlement\.v1"/);
  assert.doesNotMatch(entitlementConsumer, /FundingRepository|database\.ts|sqlite/i);
});

test("Community Source and commercial contribution rights are active and fail closed through the protected CLA status", () => {
  assert.match(contributing, /may be merged only when both the protected `verify` check and protected `contributor-rights` status pass/i);
  assert.match(contributing, /CLA\.md/);
  assert.match(cla, /ACTIVE BY BOSSAI CEO APPROVAL — NO LAWYER APPROVAL CLAIMED/);
  assert.match(cla, /sublicense, and relicense|sublicense,\s*and relicense/i);
  assert.match(cla, /Community Source/i);
  assert.match(cla, /contributor-rights/i);
});

test("fresh UI defaults to English while preserving explicit locale preference", () => {
  assert.match(i18n, /function detectLocale\(\): SupportedLocale \{[\s\S]*if \(stored\) return stored;[\s\S]*return "en";/);
  assert.doesNotMatch(i18n, /navigator\.languages/);
  assert.match(html, /<select id="locale-select"[^>]*>\s*<option value="en">English<\/option>/);
});
