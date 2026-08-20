const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const productVersion = require(path.join(projectRoot, "package.json")).version;
const installationId = "bossai-funding-commercial-smoke-installation";
const bearerToken = `bossai_${"session"}_${"x".repeat(32)}`;
const packagedMode = process.argv.includes("--packaged");
const packagedExecutable = path.join(projectRoot, "out", "desktop", "win-unpacked", "BossAI Funding.exe");
if (packagedMode && !fs.existsSync(packagedExecutable)) {
  console.error("BOSSAI_FUNDING_DESKTOP_COMMERCIAL_PACKAGED_MISSING", packagedExecutable);
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

function assert(condition, message, detail) {
  if (condition) return;
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function entitlementEnvelope({ authorized }) {
  return {
    success: true,
    data: {
      schemaVersion: "bossai.commercial-entitlement.v1",
      generatedAt: new Date().toISOString(),
      diagnosticId: "hq-commerce-desktop-smoke",
      entitlementRevision: "hq-commerce-desktop-smoke-v1",
      tenant: { id: "tenant-desktop-smoke", name: "Desktop Smoke", plan: "commercial" },
      product: { id: "bossai-funding", version: productVersion },
      device: { id: installationId, registered: true, lastSeenAt: new Date().toISOString() },
      headquartersCommerce: {
        authority: "bossai-headquarters-commerce",
        manages: [
          "commercial-account-and-tenant",
          "membership-plan-and-license",
          "points-wallet-and-ledger",
          "payment-refund-invoice-and-settlement",
        ],
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
        licenseActive: authorized,
        canUseLocalBusinessProduct: authorized,
        canCreatePaidAiTasks: false,
        commerceAuthorizationRequired: true,
        commerceConnectivity: "connected",
        walletAuthority: "headquarters",
        localWalletAuthoritative: false,
        allowedBillingModes: ["bossai_points"],
        defaultBillingMode: "bossai_points",
        accessReason: authorized ? "AUTHORIZED" : "LICENSE_SUSPENDED",
        planCode: "commercial",
        planName: "Commercial",
        membershipStatus: "active",
        features: ["bossai-funding.commercial"],
        walletAvailable: 0,
        walletReserved: 0,
        walletFrozen: false,
        expiresAt: null,
        offlineGraceUntil: null,
      },
      localBusinessExecution: {
        authority: "customer-local",
        owns: ["funding-business-state"],
        businessDataResidency: "customer-local",
        headquartersRemoteBusinessControl: false,
      },
    },
  };
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

function containsSecret(rootDir, secret) {
  if (!fs.existsSync(rootDir)) return false;
  const needle = Buffer.from(secret);
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(current)) stack.push(path.join(current, name));
      continue;
    }
    if (!stat.isFile() || stat.size > 10 * 1024 * 1024) continue;
    const content = fs.readFileSync(current);
    if (content.includes(needle)) return true;
  }
  return false;
}

function runElectron({ baseUrl, userDataDir }) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let readyEvidence = null;
    let timedOut = false;

    const child = spawn(command, args, {
      cwd: projectRoot,
      env: {
        ...process.env,
        BOSSAI_FUNDING_DESKTOP_COMMERCIAL_SMOKE: "1",
        BOSSAI_FUNDING_DESKTOP_USER_DATA: userDataDir,
        BOSSAI_FUNDING_DISTRIBUTION: "commercial",
        BOSSAI_FUNDING_HEADQUARTERS_BASE_URL: baseUrl,
        BOSSAI_FUNDING_HEADQUARTERS_BEARER_TOKEN: bearerToken,
        BOSSAI_FUNDING_INSTALLATION_ID: installationId,
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
          // Final assertions report malformed evidence.
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

async function main() {
  const successUserData = fs.mkdtempSync(path.join(os.tmpdir(), "bossai-funding-commercial-smoke-ok-"));
  const deniedUserData = fs.mkdtempSync(path.join(os.tmpdir(), "bossai-funding-commercial-smoke-denied-"));
  const requests = [];
  let authorized = true;

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      requests.push({
        authorized,
        method: req.method,
        url: req.url,
        authorization: req.headers.authorization,
        productId: req.headers["x-bossai-product-id"],
        installationId: req.headers["x-bossai-installation-id"],
        productVersion: req.headers["x-bossai-product-version"],
        body,
      });
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(entitlementEnvelope({ authorized })));
    });
  });

  try {
    await listen(server);
    const address = server.address();
    assert(address && typeof address !== "string", "Mock Headquarters server did not expose a TCP address.", address);
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const success = await runElectron({ baseUrl, userDataDir: successUserData });
    const successRequest = requests.find((item) => item.authorized === true);
    assert(!success.timedOut, "Commercial desktop success smoke timed out.", success);
    assert(success.code === 0, "Commercial desktop success smoke did not exit cleanly.", success);
    assert(success.stdout.includes("BOSSAI_FUNDING_DESKTOP_COMMERCIAL_SMOKE_PASS"), "Commercial desktop did not report PASS.", success);
    assert(success.readyEvidence?.distributionMode === "commercial", "Commercial desktop did not report commercial distribution mode.", success.readyEvidence);
    assert(success.readyEvidence?.packaged === packagedMode, "Commercial desktop packaged-state evidence did not match the requested smoke mode.", success.readyEvidence);
    assert(success.readyEvidence?.evidence?.title === "Capital Command Center", "Commercial desktop did not load the Funding UI.", success.readyEvidence);
    assert(Boolean(successRequest), "Commercial desktop did not call Headquarters entitlement.", requests);
    assert(successRequest.method === "GET" && successRequest.url === "/api/v1/commerce/entitlement", "Commercial desktop called the wrong Headquarters route.", successRequest);
    assert(successRequest.authorization === `Bearer ${bearerToken}`, "Commercial desktop did not send the configured bearer credential.", { authorizationPresent: Boolean(successRequest.authorization) });
    assert(successRequest.productId === "bossai-funding", "Commercial desktop sent the wrong product ID.", successRequest);
    assert(successRequest.installationId === installationId, "Commercial desktop sent the wrong installation ID.", successRequest);
    assert(successRequest.productVersion === productVersion, "Commercial desktop sent the wrong product version.", successRequest);
    assert(successRequest.body === "", "Commercial entitlement request must not contain business payload.", { bodyLength: successRequest.body.length });
    assert(!success.stdout.includes(bearerToken) && !success.stderr.includes(bearerToken), "Commercial desktop logs exposed the bearer credential.");
    assert(!containsSecret(successUserData, bearerToken), "Commercial desktop persisted the bearer credential in userData.");
    assert(fs.existsSync(path.join(successUserData, "data", "bossai-funding.sqlite")), "Authorized commercial desktop did not create Funding persistence after entitlement success.");

    authorized = false;
    const denied = await runElectron({ baseUrl, userDataDir: deniedUserData });
    const deniedRequest = requests.find((item) => item.authorized === false);
    assert(!denied.timedOut, "Commercial desktop denial smoke timed out.", denied);
    assert(denied.code !== 0, "Denied commercial entitlement unexpectedly started Funding.", denied);
    assert(!denied.stdout.includes("BOSSAI_FUNDING_DESKTOP_READY"), "Denied commercial entitlement reached desktop ready state.", denied);
    assert(denied.stderr.includes("COMMERCIAL_ENTITLEMENT_DENIED") || denied.stderr.includes("CommercialEntitlementError"), "Denied commercial entitlement did not fail through the expected boundary.", denied);
    assert(Boolean(deniedRequest), "Denied commercial desktop did not call Headquarters entitlement.", requests);
    assert(!denied.stdout.includes(bearerToken) && !denied.stderr.includes(bearerToken), "Denied commercial desktop logs exposed the bearer credential.");
    assert(!containsSecret(deniedUserData, bearerToken), "Denied commercial desktop persisted the bearer credential.");
    assert(!fs.existsSync(path.join(deniedUserData, "data", "bossai-funding.sqlite")), "Denied commercial entitlement created Funding SQLite before authorization.");

    console.log("BOSSAI_FUNDING_DESKTOP_COMMERCIAL_ENTITLEMENT_SMOKE_PASS", JSON.stringify({
      productVersion,
      packagedMode,
      success: {
        commercialReady: true,
        requestBodyEmpty: true,
        tokenNotPersisted: true,
        databaseCreatedAfterAuthorization: true,
      },
      denied: {
        failedClosed: true,
        tokenNotPersisted: true,
        databaseNotCreated: true,
      },
    }));
  } finally {
    await closeServer(server);
    for (const directory of [successUserData, deniedUserData]) {
      try {
        fs.rmSync(directory, { recursive: true, force: true });
      } catch {
        // Temporary smoke cleanup is best-effort after assertions.
      }
    }
  }
}

main().catch((error) => {
  console.error("BOSSAI_FUNDING_DESKTOP_COMMERCIAL_ENTITLEMENT_SMOKE_FAIL", error, error.detail ?? "");
  process.exitCode = 1;
});
