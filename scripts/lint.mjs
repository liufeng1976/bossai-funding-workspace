import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = process.cwd();
const implementationRoots = [resolve(root, "src"), resolve(root, "public"), resolve(root, "tests")];
const allowedExtensions = new Set([".ts", ".html", ".css", ".mjs"]);
const violations = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const info = statSync(path);
    if (info.isDirectory()) walk(path);
    else if (allowedExtensions.has(extname(path))) inspect(path);
  }
}

function inspect(path) {
  const content = readFileSync(path, "utf8");
  const display = relative(root, path).replaceAll("\\", "/");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (/\s+$/.test(line)) violations.push(`${display}:${index + 1} trailing whitespace`);
    if (/D:\\BossAI-Projects\\OpenBcon/i.test(line)) violations.push(`${display}:${index + 1} forbidden repository reference in implementation code`);
    if (/\blocalStorage\b/.test(line)) violations.push(`${display}:${index + 1} critical product code must not rely on localStorage`);
    if (/\b(AI-powered|magic|agentic|revolutionary|next-generation)\b/i.test(line)) violations.push(`${display}:${index + 1} avoid AI-flavored marketing language`);
  });
}

for (const directory of implementationRoots) {
  try { walk(directory); } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") continue;
    throw error;
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("Project lint checks passed.");
