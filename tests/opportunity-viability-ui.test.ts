import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const app = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");
const css = readFileSync(resolve(process.cwd(), "public/styles.css"), "utf8");

test("past-deadline opportunity card suppresses current fit authority and says it is excluded from In motion", () => {
  assert.match(app, /deadlinePassed \? "—" : match \? `\$\{match\.score\}\/100`/);
  assert.match(app, /deadlinePassed \? "deadline passed"/);
  assert.match(app, /excluded from In motion/);
  assert.match(app, /opportunity-deadline-passed/);
  assert.match(css, /\.opportunity-card\.opportunity-deadline-passed/);
});

test("manual past-deadline opportunity has a correction control while official source requires source refresh", () => {
  assert.match(app, /source\?\.sourceKind === "manual"/);
  assert.match(app, /Correct manual-source deadline/);
  assert.match(app, /data-save-opportunity-deadline/);
  assert.match(app, /source\?\.sourceKind === "official-public"/);
  assert.match(app, /Official-source recovery/);
  assert.match(app, /Do not overwrite an official deadline with a manual guess/);
});

test("Pursue is disabled for a past-deadline opportunity until source timing is made current", () => {
  assert.match(app, /deadlinePassed \? " disabled title=/);
  assert.match(app, /Record a current deadline or refresh the official source before pursuing this as current capital/);
});
