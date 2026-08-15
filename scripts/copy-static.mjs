import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(process.cwd(), "public");
const target = resolve(process.cwd(), "dist/public");
mkdirSync(target, { recursive: true });
cpSync(resolve(source, "index.html"), resolve(target, "index.html"));
cpSync(resolve(source, "styles.css"), resolve(target, "styles.css"));
console.log("Copied static web assets to dist/public.");
