import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { projectDashboard } from "../domain/dashboard.ts";
import { calculateCapitalStrategy } from "../domain/strategy.ts";
import type { BootstrapState } from "../domain/types.ts";
import { FundingRepository } from "./database.ts";
import { parseAction, parseCompanyProfile, parseFundingGoal, parseRound } from "./validation.ts";

function bootstrap(repo: FundingRepository): BootstrapState {
  const companyProfile = repo.getCompanyProfile();
  const fundingGoal = repo.getFundingGoal();
  const rounds = repo.listRounds();
  const actions = repo.listActions();
  const strategy = repo.getCapitalStrategy();
  return {
    companyProfile,
    fundingGoal,
    rounds,
    actions,
    strategy,
    dashboard: projectDashboard(companyProfile, fundingGoal, rounds, actions),
  };
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(body);
}

function sendText(res: ServerResponse, status: number, body: string, contentType = "text/plain; charset=utf-8"): void {
  res.writeHead(status, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > 1_000_000) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new Error("Request body must contain valid JSON.");
  }
}

function staticContentType(path: string): string {
  const extension = extname(path);
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function serveStatic(publicDir: string, urlPath: string, res: ServerResponse): boolean {
  const requested = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
  const safe = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safe);
  if (!existsSync(filePath)) return false;
  const body = readFileSync(filePath);
  res.writeHead(200, {
    "content-type": staticContentType(filePath),
    "content-length": body.byteLength,
    "cache-control": urlPath === "/" ? "no-store" : "public, max-age=60",
  });
  res.end(body);
  return true;
}

export function createFundingServer(repo: FundingRepository, publicDir: string): Server {
  return createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", "http://localhost");

      if (method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true, product: "BossAI Funding", database: "sqlite" });
        return;
      }

      if (method === "GET" && url.pathname === "/api/bootstrap") {
        sendJson(res, 200, bootstrap(repo));
        return;
      }

      if (method === "PUT" && url.pathname === "/api/company-profile") {
        repo.saveCompanyProfile(parseCompanyProfile(await readJson(req)));
        sendJson(res, 200, bootstrap(repo));
        return;
      }

      if (method === "PUT" && url.pathname === "/api/funding-goal") {
        repo.saveFundingGoal(parseFundingGoal(await readJson(req)));
        sendJson(res, 200, bootstrap(repo));
        return;
      }

      if (method === "POST" && url.pathname === "/api/rounds") {
        const round = repo.createRound(parseRound(await readJson(req)));
        sendJson(res, 201, { round, state: bootstrap(repo) });
        return;
      }

      if (method === "POST" && url.pathname === "/api/actions") {
        const action = repo.createAction(parseAction(await readJson(req)));
        sendJson(res, 201, { action, state: bootstrap(repo) });
        return;
      }

      const actionMatch = url.pathname.match(/^\/api\/actions\/(\d+)$/);
      if (method === "PATCH" && actionMatch) {
        const id = Number(actionMatch[1]);
        const action = repo.updateAction(id, parseAction(await readJson(req)));
        if (!action) {
          sendJson(res, 404, { error: "Funding action not found." });
          return;
        }
        sendJson(res, 200, { action, state: bootstrap(repo) });
        return;
      }

      if (method === "POST" && url.pathname === "/api/capital-strategy/recalculate") {
        const goal = repo.getFundingGoal();
        if (!goal) {
          sendJson(res, 409, { error: "Set the funding goal before calculating the capital strategy." });
          return;
        }
        const strategy = repo.saveCapitalStrategy(calculateCapitalStrategy(repo.getCompanyProfile(), goal));
        sendJson(res, 200, { strategy, state: bootstrap(repo) });
        return;
      }

      if (method === "GET" && !url.pathname.startsWith("/api/") && serveStatic(publicDir, url.pathname, res)) {
        return;
      }

      sendJson(res, 404, { error: "Not found." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected server error.";
      sendJson(res, 400, { error: message });
    }
  });
}
