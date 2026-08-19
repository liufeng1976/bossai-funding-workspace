import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const app = readFileSync(resolve(process.cwd(), "public/app.ts"), "utf8");
const html = readFileSync(resolve(process.cwd(), "public/index.html"), "utf8");

test("capital timing UI exposes need date, runway estimate, overdue, due-soon and undated metrics", () => {
  assert.match(html, /CAPITAL TIMING & DEADLINE DISCIPLINE/);
  for (const id of ["timing-need-date", "timing-runway-date", "timing-overdue", "timing-due14", "timing-undated-count", "timing-disclaimer"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /renderTimingPlan\(data\.timingPlan\)/);
  assert.match(app, /plan\.overdueMilestoneCount/);
  assert.match(app, /plan\.dueNext14DaysCount/);
  assert.match(app, /plan\.undatedActiveItemCount/);
});

test("timing milestones and missing-date items use exact financing navigation before section fallback", () => {
  assert.match(app, /focusEntityAnchor\(entityType, entityId\)/);
  assert.match(app, /navigateTimingItem\(milestone\.entityType, milestone\.entityId, milestone\.destination\)/);
  assert.match(app, /navigateTimingItem\(undated\.entityType, undated\.entityId, undated\.destination\)/);
});

test("timing UI does not label runway or milestone ordering as a close forecast", () => {
  const timingSection = html.match(/<section class="capital-timing-card"[\s\S]*?<section class="capital-blockers-card"/)?.[0] ?? "";
  assert.match(timingSection, /not a cash-flow or closing forecast/i);
  assert.doesNotMatch(timingSection, /success probability/i);
  assert.doesNotMatch(timingSection, /expected close date/i);
});
