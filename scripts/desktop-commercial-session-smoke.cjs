const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const productVersion = require(path.join(projectRoot, "package.json")).version;
const packagedMode = process.argv.includes("--packaged");
const packagedExecutable = path.join(projectRoot, "out", "desktop", "win-unpacked", "BossAI Funding.exe");
if (packagedMode && !fs.existsSync(packagedExecutable)) {
  console.error("BOSSAI_FUNDING_COMMERCIAL_SESSION_PACKAGED_MISSING", packagedExecutable);
  process.exit(1);
}

const command = packagedMode
  ? packagedExecutable
  : process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";
const args = packagedMode
  ? []
  : process.platform === "win32"
    ? ["/d", "/s", "/c", "npx --yes electron@43.4.1 ."]
    : ["--yes", "electron@43.4.1", "."];

const identifier = "owner@example.test";
const password = "Commercial-session-smoke-password-2026";
const installationId = "bossai-funding-secure-session-smoke";
const sessionToken = `bossai_session_${"s".repeat(43)}`;
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bossai-funding-secure-session-smoke-"));
const sessionFile = path.join(userDataDir, "commercial-session.bin");
const databasePath = path.join(userDataDir, "data", "bossai-funding.sqlite");

function assert(condition, message, detail) {
  if (condition) return;
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function runElectron({ baseUrl, includeCredentials }) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let readyEvidence = null;
    let timedOut = false;

    const child = spawn(command, args, {
      cwd: projectRoot,
      env: {
        ...process.env,
        BOSSAI_FUNDING_DESKTOP_COMMERCIAL_SESSION_SMOKE: "1",
        BOSSAI_FUNDING_DESKTOP_USER_DATA: userDataDir,
        BOSSAI_FUNDING_DISTRIBUTION: "commercial",
        BOSSAI_FUNDING_HEADQUARTERS_BASE_URL: baseUrl,
        BOSSAI_FUNDING_INSTALLATION_ID: installationId,
        ...(includeCredentials ? {
          BOSSAI_FUNDING_DESKTOP_LOGIN_SMOKE_IDENTIFIER: identifier,
          BOSSAI_FUNDING_DESKTOP_LOGIN_SMOKE_PASSWORD: password,
        } : {
          BOSSAI_FUNDING_DESKTOP_LOGIN_SMOKE_IDENTIFIER: "",
          BOSSAI_FUNDING_DESKTOP_LOGIN_SMOKE_PASSWORD: "",
        }),
        BOSSAI_FUNDING_HEADQUARTERS_BEARER_TOKEN: "",
      },
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 90_000);

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
      for (const line of text.split(/\r?\n/u)) {
        if (!line.startsWith("BOSSAI_FUNDING_DESKTOP_READY ")) continue;
        try {
          readyEvidence = JSON.parse(line.slice("BOSSAI_FUNDING_DESKTOP_READY ".length));
        } catch {
          // Final assertions expose malformed evidence.
        }
      }
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, timedOut, stdout, stderr, readyEvidence });
    });
  });
}

function entitlementEnvelope() {
  return {
    success: true,
    data: {
      schemaVersion: "bossai.commercial-entitlement.v1",
      generatedAt: new Date().toISOString(),
      diagnosticId: "secure-session-smoke",
      entitlementRevision: "secure-session-smoke-v1",
      tenant: { id: "tenant-secure-session", name: "Secure Session", plan: "commercial" },
      product: { id: "bossai-funding", version: productVersion },
      device: { id: installationId, registered: true, lastSeenAt: new Date().toISOString() },
      headquartersCommerce: {
        authority: "bossai-headquarters-commerce",
        controlsBusinessExecution: false,
        controlsLocalUsers: false,
        controlsLocalRoles: false,
        controlsLocalWorkflows: false,
        routesProviders: false,
        invokesProviders: false,
        acceptsCustomerBusinessContent: false,
        remoteBusinessActionsAllowed: false,
      },
      entitlement: {
        licenseActive: true,
        accessReason: "AUTHORIZED",
        planCode: "commercial",
        planName: "Commercial",
        membershipStatus: "active",
        features: ["bossai-funding.commercial"],
        expiresAt: null,
      },
    },
  };
}

async function main() {
  let loginCount = 0;
  let entitlementCount = 0;
  let entitlementUnauthorized = false;
  const observed = [];

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      if (req.method === "POST" && req.url === "/api/v1/auth/login") {
        loginCount += 1;
        const payload = JSON.parse(body || "{}");
        observed.push({ route: "login", payload });
        if (payload.identifier !== identifier || payload.password !== password
          || payload.deviceId !== installationId || payload.productId !== "bossai-funding"
          || payload.productVersion !== productVersion) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ success: false, error: { code: "BOSSAI_ACCOUNT_UNAUTHORIZED" } }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          data: {
            account: { id: "account-secure-session", tenantId: "tenant-secure-session", displayName: "Owner" },
            expiresAt: "2099-01-01T00:00:00.000Z",
            sessionId: "session-secure-session",
            sessionToken,
            refreshToken: `bossai_refresh_${"r".repeat(43)}`,
            refreshExpiresAt: "2099-02-01T00:00:00.000Z",
          },
        }));
        return;
      }

      if (req.method === "GET" && req.url === "/api/v1/commerce/entitlement") {
        entitlementCount += 1;
        observed.push({
          route: "entitlement",
          authorization: req.headers.authorization,
          productId: req.headers["x-bossai-product-id"],
          installationId: req.headers["x-bossai-installation-id"],
          productVersion: req.headers["x-bossai-product-version"],
          body,
        });
        if (entitlementUnauthorized) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(JSON.stringify({ success: false, error: { code: "BOSSAI_ACCOUNT_UNAUTHORIZED" } }));
          return;
        }
        if (req.headers.authorization !== `Bearer ${sessionToken}`) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(JSON.stringify({ success: false, error: { code: "BOSSAI_ACCOUNT_UNAUTHORIZED" } }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(entitlementEnvelope()));
        return;
      }

      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ success: false, error: { code: "NOT_FOUND" } }));
    });
  });

  try {
    await listen(server);
    const address = server.address();
    assert(address && typeof address !== "string", "Secure-session mock server did not expose a TCP address.", address);
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const first = await runElectron({ baseUrl, includeCredentials: true });
    assert(!first.timedOut && first.code === 0, "First secure-session desktop launch failed.", first);
    assert(first.stdout.includes("BOSSAI_FUNDING_DESKTOP_COMMERCIAL_SESSION_SMOKE_PASS"), "First secure-session launch did not report PASS.", first);
    assert(first.readyEvidence?.distributionMode === "commercial", "First launch did not enter commercial mode.", first.readyEvidence);
    assert(first.readyEvidence?.commercialSessionSource === "safe-storage-smoke-login", "First launch did not originate from secure login.", first.readyEvidence);
    assert(first.readyEvidence?.packaged === packagedMode, "First secure-session packaged evidence mismatch.", first.readyEvidence);
    assert(loginCount === 1 && entitlementCount === 1, "First launch did not perform exactly one login and entitlement check.", { loginCount, entitlementCount });
    assert(fs.existsSync(sessionFile), "Secure commercial session file was not created.", { sessionFile });
    const encryptedSession = fs.readFileSync(sessionFile);
    assert(!encryptedSession.includes(Buffer.from(sessionToken)), "Secure session file contains the plaintext session token.");
    assert(fs.existsSync(databasePath), "Funding SQLite was not created after secure commercial authorization.", { databasePath });
    assert(!first.stdout.includes(sessionToken) && !first.stderr.includes(sessionToken), "First secure-session logs exposed the session token.");

    const second = await runElectron({ baseUrl, includeCredentials: false });
    assert(!second.timedOut && second.code === 0, "Second secure-session desktop launch failed.", second);
    assert(second.stdout.includes("BOSSAI_FUNDING_DESKTOP_COMMERCIAL_SESSION_SMOKE_PASS"), "Second secure-session launch did not report PASS.", second);
    assert(second.readyEvidence?.commercialSessionSource === "safe-storage", "Second launch did not reuse OS-encrypted session storage.", second.readyEvidence);
    assert(loginCount === 1, "Second launch unexpectedly asked Headquarters to log in again.", { loginCount });
    assert(entitlementCount === 2, "Second launch did not revalidate entitlement.", { entitlementCount });
    assert(!second.stdout.includes(sessionToken) && !second.stderr.includes(sessionToken), "Second secure-session logs exposed the session token.");

    entitlementUnauthorized = true;
    const third = await runElectron({ baseUrl, includeCredentials: false });
    assert(!third.timedOut && third.code !== 0, "Expired secure session unexpectedly unlocked commercial Funding.", third);
    assert(loginCount === 1, "Expired-session test unexpectedly created a new account login without credentials.", { loginCount });
    assert(entitlementCount === 3, "Expired-session test did not attempt entitlement revalidation.", { entitlementCount });
    assert(!fs.existsSync(sessionFile), "HTTP 401 did not remove the stale encrypted commercial session.", { sessionFile });
    assert(!third.stdout.includes(sessionToken) && !third.stderr.includes(sessionToken), "Expired-session logs exposed the session token.");

    const entitlementRequests = observed.filter((item) => item.route === "entitlement");
    assert(entitlementRequests.every((item) => item.body === ""), "Entitlement validation sent a request body.", entitlementRequests);
    assert(entitlementRequests.every((item) => item.productId === "bossai-funding" && item.installationId === installationId && item.productVersion === productVersion), "Entitlement identity headers drifted.", entitlementRequests);

    console.log("BOSSAI_FUNDING_DESKTOP_SECURE_SESSION_SMOKE_PASS", JSON.stringify({
      productVersion,
      packagedMode,
      firstLoginEncrypted: true,
      secondLaunchReusedSafeStorage: true,
      entitlementRevalidatedEachLaunch: true,
      staleSessionRemovedOn401: true,
      sessionTokenNotLogged: true,
    }));
  } finally {
    await closeServer(server);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Temporary secure-session evidence cleanup is best-effort.
    }
  }
}

main().catch((error) => {
  console.error("BOSSAI_FUNDING_DESKTOP_SECURE_SESSION_SMOKE_FAIL", error, error.detail ?? "");
  process.exitCode = 1;
});
