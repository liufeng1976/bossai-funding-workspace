import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appSource = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");
const htmlSource = readFileSync(resolve(process.cwd(), "public/index.html"), "utf8");

test("capital command center explains the in-motion counting method", () => {
  assert.match(htmlSource, /In motion uses the most-specific recorded pipeline evidence\. Linked stages are not stacked twice\./);
  assert.match(appSource, /Basis: \$\{escapeHtml\(track\.evidenceKinds\.length/);
  assert.match(appSource, /track\.pipelineExplanation/);
});

test("track cards expose the evidence kind used for potential capital", () => {
  assert.match(appSource, /kind\.replaceAll\("-", " "\)/);
  assert.match(appSource, /pipeline-basis/);
  assert.match(appSource, /pipeline-explanation/);
});
