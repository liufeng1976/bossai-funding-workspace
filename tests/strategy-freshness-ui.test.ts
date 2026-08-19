import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const app = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");
const html = readFileSync(resolve(process.cwd(), "public/index.html"), "utf8");
const css = readFileSync(resolve(process.cwd(), "public/styles.css"), "utf8");

test("capital strategy UI exposes freshness, generation time and current funding need", () => {
  for (const id of ["strategy-freshness", "strategy-generated-at", "strategy-current-need", "strategy-freshness-reason"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /renderStrategy\(nextState\.strategy, nextState\.strategyFreshness\)/);
  assert.match(app, /freshness\.state\.replaceAll/);
  assert.match(app, /freshness\.generatedAt/);
  assert.match(app, /freshness\.currentNeedCents/);
});

test("stale strategy is visually downgraded and explicitly requires recalculation", () => {
  assert.match(app, /strategy-stale/);
  assert.match(css, /OUT OF DATE — recalculate before using these allocations as a current decision input/);
  assert.match(css, /\.strategy-stale \.strategy-content \{ opacity:/);
});

test("manual strategy recalculation remains available alongside automatic synchronization", () => {
  assert.match(html, /id="recalculate-strategy"/);
  assert.match(app, /\/api\/capital-strategy\/recalculate/);
});
