import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const i18n = readFileSync(resolve(process.cwd(), "public", "i18n.ts"), "utf8");
const app = readFileSync(resolve(process.cwd(), "public", "app.ts"), "utf8");
const html = readFileSync(resolve(process.cwd(), "public", "index.html"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as { scripts?: Record<string, string> };

test("owner UI defaults to English and exposes only complete production locales with a user-controlled preference", () => {
  for (const locale of ["zh-CN", "zh-TW", "en", "es"]) {
    assert.match(i18n, new RegExp(locale.replace("-", "[-]")));
    assert.match(html, new RegExp(`value="${locale}"`));
  }
  for (const incompleteLocale of ["ja", "ko"]) assert.doesNotMatch(html, new RegExp(`value="${incompleteLocale}"`));
  assert.match(i18n, /function detectLocale\(\): SupportedLocale \{[\s\S]*if \(stored\) return stored;[\s\S]*return "en";/);
  assert.doesNotMatch(i18n, /navigator\.languages/);
  assert.match(html, /<select id="locale-select"[^>]*>\s*<option value="en">English<\/option>/);
  assert.match(i18n, /bossai-funding-locale/);
  assert.match(i18n, /document\.cookie = `\$\{LOCALE_COOKIE\}=/);
  assert.match(i18n, /SameSite=Lax/);
  assert.match(app, /localeSelect\.addEventListener\("change"/);
  assert.match(app, /setLocale\(localeSelect\.value as SupportedLocale\)/);
});

test("internationalization stays in the presentation layer and preserves financing authority boundaries", () => {
  assert.doesNotMatch(i18n, /src\/domain|src\/server|\/api\//);
  assert.match(app, /applyTranslations\(document\)/);
  assert.match(app, /translateCanonical\(data\.todayFocus\.title\)/);
  assert.match(app, /new Intl\.NumberFormat\(getLocale\(\)/);
  assert.match(app, /formatLocalDate\(parsed\)/);
  assert.match(app, /formatLocalDateTime\(parsed\)/);
});

test("real Chrome locale acceptance covers every production locale, primary owner forms and reload persistence", () => {
  assert.equal(packageJson.scripts?.["test:locales"], "node scripts/ui-browser-acceptance.cjs --locale-acceptance");
  assert.equal(packageJson.scripts?.["test:locale-leaks"], "node scripts/ui-browser-acceptance.cjs --locale-leak-audit");
  assert.match(packageJson.scripts?.["verify:owner-readiness"] ?? "", /test:locales/);
  assert.match(packageJson.scripts?.["verify:owner-readiness"] ?? "", /test:locale-leaks/);
  const browserAcceptance = readFileSync(resolve(process.cwd(), "scripts", "ui-browser-acceptance.cjs"), "utf8");
  assert.match(browserAcceptance, /BOSSAI_FUNDING_LOCALE_ACCEPTANCE_PASS/);
  assert.match(browserAcceptance, /BOSSAI_FUNDING_LOCALE_LEAK_AUDIT_PASS/);
});
