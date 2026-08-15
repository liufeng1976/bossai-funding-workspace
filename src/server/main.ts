import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createFundingServer } from "./app.ts";
import { FundingRepository } from "./database.ts";

const port = Number(process.env.PORT ?? 4317);
const host = process.env.HOST ?? "127.0.0.1";
const databaseSetting = process.env.BOSSAI_FUNDING_DB ?? "data/bossai-funding.sqlite";
const databasePath = databaseSetting === ":memory:" ? ":memory:" : resolve(process.cwd(), databaseSetting);
const builtPublic = resolve(process.cwd(), "dist/public");
const sourcePublic = resolve(process.cwd(), "public");
const publicDir = existsSync(builtPublic) ? builtPublic : sourcePublic;

const repo = new FundingRepository(databasePath);
const server = createFundingServer(repo, publicDir);

server.listen(port, host, () => {
  console.log(`BossAI Funding ready at http://${host}:${port}`);
  console.log(`Database: ${databasePath}`);
});

function shutdown(): void {
  server.close(() => {
    repo.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
