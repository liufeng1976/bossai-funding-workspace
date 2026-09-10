import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const tag = String(process.argv[2] ?? process.env.GITHUB_REF_NAME ?? "").trim();
const expectedTag = `v${pkg.version}`;
const expectedLicense = "LicenseRef-BossAI-Community-Source-1.0";

if (!/^v\d+\.\d+\.\d+$/u.test(tag)) {
  console.error(`Source release tag must be semantic vX.Y.Z; received: ${tag || "<empty>"}.`);
  process.exit(1);
}
if (tag !== expectedTag) {
  console.error(`Source release tag ${tag} does not match package version ${pkg.version}; expected ${expectedTag}.`);
  process.exit(1);
}
if (pkg.license !== expectedLicense) {
  console.error(`Unexpected source license metadata: ${pkg.license}; expected ${expectedLicense}.`);
  process.exit(1);
}
if (pkg.private !== true) {
  console.error("package.json must remain private=true to prevent accidental npm publication.");
  process.exit(1);
}

console.log(JSON.stringify({
  schemaVersion: "bossai.source-release-gate.v1",
  tag,
  packageVersion: pkg.version,
  license: pkg.license,
  npmPublicationBlocked: pkg.private === true,
  sourceReleaseOnly: true,
  signedWindowsBinaryIncluded: false,
}));
