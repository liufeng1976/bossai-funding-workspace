import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
  version?: string;
  license?: string;
  private?: boolean;
  scripts?: Record<string, string>;
};
const sourceRelease = readFileSync(resolve(root, ".github", "workflows", "source-release.yml"), "utf8");
const signedRelease = readFileSync(resolve(root, ".github", "workflows", "windows-signed-release.yml"), "utf8");
const assetGenerator = readFileSync(resolve(root, "scripts", "prepare-desktop-assets.mjs"), "utf8");
const builder = readFileSync(resolve(root, "electron-builder.yml"), "utf8");
const iconDesign = readFileSync(resolve(root, "desktop", "assets", "ICON_DESIGN.md"), "utf8");
const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");

test("v0.51 source release is tag-bound AGPL source only", () => {
  assert.equal(pkg.version, "0.51.0");
  assert.equal(pkg.license, "AGPL-3.0-or-later");
  assert.equal(pkg.private, true);
  assert.match(sourceRelease, /tags:/u);
  assert.match(sourceRelease, /"v\*\.\*\.\*"/u);
  assert.match(sourceRelease, /npm run verify/u);
  assert.match(sourceRelease, /npm run test:desktop-contract/u);
  assert.match(sourceRelease, /verify-source-release\.mjs/u);
  assert.match(sourceRelease, /Source Release/u);
  assert.match(sourceRelease, /does not include or imply a publicly trusted signed Windows binary/u);
  assert.doesNotMatch(sourceRelease, /desktop:installer|BossAI-Funding-Setup/u);
});

test("signed Windows release fails closed unless Authenticode and publisher identity are valid", () => {
  for (const secret of ["WINDOWS_CSC_LINK", "WINDOWS_CSC_KEY_PASSWORD", "WINDOWS_SIGNING_EXPECTED_SUBJECT"]) {
    assert.ok(signedRelease.includes(`secrets.${secret}`));
  }
  assert.match(signedRelease, /Authenticode must be Valid/u);
  assert.match(signedRelease, /Signer subject does not match the approved publisher contract/u);
  assert.match(signedRelease, /npm run verify:owner-readiness/u);
  assert.match(signedRelease, /npm run verify:desktop/u);
  assert.match(signedRelease, /npm run desktop:installer/u);
  assert.match(signedRelease, /npm run desktop:installer-lifecycle/u);
  assert.ok(signedRelease.indexOf("Require valid Authenticode") < signedRelease.indexOf("Upload signed Windows release assets"));
  assert.match(signedRelease, /gh release upload/u);
});

test("Funding Windows identity is deterministic and no longer relies on Electron default icon", () => {
  assert.equal(pkg.scripts?.["desktop:prepare-assets"], "node scripts/prepare-desktop-assets.mjs");
  assert.match(assetGenerator, /const sizes = \[16, 24, 32, 48, 64, 128, 256\]/u);
  assert.match(assetGenerator, /bossai-funding\.ico/u);
  assert.match(assetGenerator, /bossai-funding-512\.png/u);
  assert.match(builder, /icon: out\/desktop-assets\/bossai-funding\.ico/u);
  assert.match(builder, /installerIcon: out\/desktop-assets\/bossai-funding\.ico/u);
  assert.match(builder, /legalTrademarks: BossAI/u);
  assert.match(builder, /requestedExecutionLevel: asInvoker/u);
  assert.match(iconDesign, /BossAI Quiet OS/u);
  assert.match(iconDesign, /ca679813f9054a43fd34ca18a60d341a2eb81f642675c030ff71817de7835571/u);
  assert.match(gitignore, /^\/desktop\/assets\/\*\.base64$/mu);
});
