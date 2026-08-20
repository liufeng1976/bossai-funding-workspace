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
const normalizedLicense = license.replace(/\r\n/g, "\n");
const commercial = readFileSync(resolve(root, "COMMERCIAL_LICENSE.md"), "utf8");
const contributing = readFileSync(resolve(root, "CONTRIBUTING.md"), "utf8");
const cla = readFileSync(resolve(root, "CLA.md"), "utf8");
const entitlementBoundary = readFileSync(resolve(root, "COMMERCIAL_ENTITLEMENT_BOUNDARY.md"), "utf8");
const entitlementConsumer = readFileSync(resolve(root, "src", "server", "commercial-entitlement.ts"), "utf8");
const i18n = readFileSync(resolve(root, "public", "i18n.ts"), "utf8");
const html = readFileSync(resolve(root, "public", "index.html"), "utf8");

const requiredPublicFiles = [
  "README.md",
  "LICENSE",
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

test("repository metadata declares AGPL open-source licensing while preventing accidental npm publication", () => {
  assert.equal(pkg.private, true);
  assert.equal(pkg.license, "AGPL-3.0-or-later");
  assert.equal(pkg.repository?.url, "git+https://github.com/liufeng1976/bossai-funding-workspace.git");
  assert.equal(pkg.homepage, "https://github.com/liufeng1976/bossai-funding-workspace#readme");
  for (const file of requiredPublicFiles) assert.equal(existsSync(resolve(root, file)), true, `missing ${file}`);
});

test("LICENSE is the unmodified GNU Affero GPL version 3 text and not the abandoned Apache proposal", () => {
  assert.match(normalizedLicense, /GNU AFFERO GENERAL PUBLIC LICENSE\n\s+Version 3, 19 November 2007/);
  assert.match(normalizedLicense, /13\. Remote Network Interaction; Use with the GNU General Public License\./);
  assert.match(normalizedLicense, /END OF TERMS AND CONDITIONS/);
  assert.doesNotMatch(normalizedLicense, /Apache License/);
});

test("commercial licensing is an alternative permission path rather than a false ban on AGPL commercial use", () => {
  assert.match(commercial, /AGPL permits commercial activity/i);
  assert.match(commercial, /permissions outside the AGPL/i);
  assert.match(commercial, /proprietary or closed-source/i);
  assert.match(commercial, /does not create its own account, subscription, payment, license, or entitlement ledger/i);
  assert.match(entitlementBoundary, /Community build.*must not require a proprietary BossAI commercial entitlement/is);
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

test("dual-license contribution rights fail closed until the CLA workflow is approved and operational", () => {
  assert.match(contributing, /must not be merged/i);
  assert.match(contributing, /CLA\.md/);
  assert.match(cla, /CONTRIBUTOR-RIGHTS WORKFLOW NOT YET ACTIVE — NO LAWYER APPROVAL CLAIMED/);
  assert.match(cla, /sublicense, relicense/i);
});

test("fresh UI defaults to English while preserving explicit locale preference", () => {
  assert.match(i18n, /function detectLocale\(\): SupportedLocale \{[\s\S]*if \(stored\) return stored;[\s\S]*return "en";/);
  assert.doesNotMatch(i18n, /navigator\.languages/);
  assert.match(html, /<select id="locale-select"[^>]*>\s*<option value="en">English<\/option>/);
});
