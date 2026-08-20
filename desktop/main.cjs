const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require("electron");
const { randomUUID } = require("node:crypto");
const { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const HOST = "127.0.0.1";
const APP_ID = "com.bossai.funding";
const SMOKE_MODE = process.env.BOSSAI_FUNDING_DESKTOP_SMOKE === "1";
const COMMERCIAL_SMOKE_MODE = process.env.BOSSAI_FUNDING_DESKTOP_COMMERCIAL_SMOKE === "1";
const COMMERCIAL_SESSION_SMOKE_MODE = process.env.BOSSAI_FUNDING_DESKTOP_COMMERCIAL_SESSION_SMOKE === "1";
const LIFECYCLE_MODE = process.env.BOSSAI_FUNDING_DESKTOP_LIFECYCLE === "1";
const HIDDEN_TEST_MODE = SMOKE_MODE || COMMERCIAL_SMOKE_MODE || COMMERCIAL_SESSION_SMOKE_MODE || LIFECYCLE_MODE;
const COMMERCIAL_SESSION_FILE = "commercial-session.bin";

let mainWindow = null;
let authWindow = null;
let server = null;
let repo = null;
let shuttingDown = false;

const userDataOverride = process.env.BOSSAI_FUNDING_DESKTOP_USER_DATA;
if (userDataOverride) {
  mkdirSync(userDataOverride, { recursive: true });
  app.setPath("userData", userDataOverride);
}
app.setAppUserModelId(APP_ID);

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const target = mainWindow || authWindow;
    if (!target) return;
    if (target.isMinimized()) target.restore();
    target.show();
    target.focus();
  });

  app.whenReady().then(startDesktop).catch(async (error) => {
    console.error("BOSSAI_FUNDING_DESKTOP_START_FAILED", error);
    if (!HIDDEN_TEST_MODE) {
      try {
        await dialog.showMessageBox({
          type: "error",
          title: "BossAI Funding",
          message: "BossAI Funding could not start.",
          detail: safeStartupErrorDetail(error),
          buttons: ["Close"],
        });
      } catch {
        // Do not replace the original startup failure with a dialog failure.
      }
    }
    app.exit(1);
  });
}

async function loadRuntimeModule(relativePath) {
  const absolute = resolve(__dirname, "..", relativePath);
  return import(pathToFileURL(absolute).href);
}

function safeStartupErrorDetail(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  if (code.startsWith("COMMERCIAL_")) return String(error.message || "Commercial access could not be verified.");
  return "The local BossAI Funding runtime could not be prepared. Review the application log or contact BossAI support.";
}

function commercialSessionPath(userDataDir) {
  return join(userDataDir, COMMERCIAL_SESSION_FILE);
}

function resolveCommercialInstallationId(userDataDir) {
  const configured = String(process.env.BOSSAI_FUNDING_INSTALLATION_ID ?? "").trim();
  if (configured) return configured;
  const mode = String(process.env.BOSSAI_FUNDING_DISTRIBUTION ?? "community").trim().toLowerCase();
  if (mode !== "commercial") return null;

  const installationFile = join(userDataDir, "commercial-installation-id.txt");
  if (existsSync(installationFile)) {
    const existing = readFileSync(installationFile, "utf8").trim();
    if (existing) return existing;
  }

  const created = `bossai-funding-${randomUUID()}`;
  writeFileSync(installationFile, `${created}\n`, { encoding: "utf8", mode: 0o600 });
  return created;
}

function assertSafeStorageAvailable() {
  if (!safeStorage.isEncryptionAvailable()) {
    const error = new Error("Secure operating-system credential storage is unavailable. BossAI Funding will not persist a commercial session in plaintext.");
    error.code = "COMMERCIAL_SAFE_STORAGE_UNAVAILABLE";
    throw error;
  }
}

function readStoredCommercialSession(userDataDir) {
  const sessionFile = commercialSessionPath(userDataDir);
  if (!existsSync(sessionFile)) return null;
  assertSafeStorageAvailable();
  try {
    const encrypted = readFileSync(sessionFile);
    const token = safeStorage.decryptString(encrypted).trim();
    if (!/^bossai_session_[A-Za-z0-9_-]{20,}$/.test(token)) throw new Error("Stored session has an invalid format.");
    return token;
  } catch {
    try {
      rmSync(sessionFile, { force: true });
    } catch {
      // A corrupt secure-session file is still unusable; login will be required.
    }
    return null;
  }
}

function writeStoredCommercialSession(userDataDir, sessionToken) {
  if (!/^bossai_session_[A-Za-z0-9_-]{20,}$/.test(sessionToken)) {
    const error = new Error("BossAI Headquarters returned an invalid account session token.");
    error.code = "COMMERCIAL_ACCOUNT_SESSION_INVALID";
    throw error;
  }
  assertSafeStorageAvailable();
  const encrypted = safeStorage.encryptString(sessionToken);
  writeFileSync(commercialSessionPath(userDataDir), encrypted, { mode: 0o600 });
}

function removeStoredCommercialSession(userDataDir) {
  try {
    rmSync(commercialSessionPath(userDataDir), { force: true });
  } catch {
    // A failed cleanup must not silently authorize a session; entitlement verification still fails closed.
  }
}

function accountClientConfig(distributionConfig) {
  if (!distributionConfig.headquartersBaseUrl || !distributionConfig.installationId) {
    const error = new Error("Commercial Headquarters account configuration is incomplete.");
    error.code = "COMMERCIAL_CONFIG_MISSING";
    throw error;
  }
  return {
    headquartersBaseUrl: distributionConfig.headquartersBaseUrl,
    installationId: distributionConfig.installationId,
    productVersion: distributionConfig.productVersion,
    timeoutMs: distributionConfig.timeoutMs,
  };
}

function distributionWithBearer(distributionConfig, bearerToken) {
  return { ...distributionConfig, bearerToken };
}

async function automatedCommercialSessionLogin(config, loginHeadquartersAccount, confirmHeadquartersMfa) {
  const identifier = String(process.env.BOSSAI_FUNDING_DESKTOP_LOGIN_SMOKE_IDENTIFIER ?? "").trim();
  const password = String(process.env.BOSSAI_FUNDING_DESKTOP_LOGIN_SMOKE_PASSWORD ?? "");
  if (!identifier || !password) {
    const error = new Error("Commercial session smoke credentials are missing.");
    error.code = "COMMERCIAL_LOGIN_SMOKE_CONFIG_MISSING";
    throw error;
  }
  const initial = await loginHeadquartersAccount(config, { identifier, password });
  if (initial.kind === "session") return initial.sessionToken;

  const code = String(process.env.BOSSAI_FUNDING_DESKTOP_LOGIN_SMOKE_MFA_CODE ?? "").trim();
  const recoveryCode = String(process.env.BOSSAI_FUNDING_DESKTOP_LOGIN_SMOKE_RECOVERY_CODE ?? "").trim();
  const session = await confirmHeadquartersMfa(config, initial.mfaChallengeToken, { code, recoveryCode });
  return session.sessionToken;
}

function safeAuthResult(error) {
  const code = typeof error?.code === "string" && error.code.startsWith("COMMERCIAL_") ? error.code : "COMMERCIAL_ACCOUNT_ERROR";
  const message = code.startsWith("COMMERCIAL_")
    ? String(error?.message || "BossAI commercial account verification failed.")
    : "BossAI commercial account verification failed.";
  return { ok: false, code, message };
}

async function promptForCommercialSession(config, loginHeadquartersAccount, confirmHeadquartersMfa) {
  return new Promise(async (resolveSession, rejectSession) => {
    let settled = false;
    let mfaChallengeToken = null;

    const cleanup = () => {
      ipcMain.removeHandler("bossai-funding:commercial-login");
      ipcMain.removeHandler("bossai-funding:commercial-mfa");
      ipcMain.removeAllListeners("bossai-funding:commercial-login-cancel");
      mfaChallengeToken = null;
    };

    const settleSuccess = (sessionToken) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolveSession(sessionToken);
      if (authWindow && !authWindow.isDestroyed()) authWindow.close();
    };

    const settleFailure = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      rejectSession(error);
      if (authWindow && !authWindow.isDestroyed()) authWindow.close();
    };

    authWindow = new BrowserWindow({
      title: "BossAI Funding — Commercial sign in",
      width: 680,
      height: 700,
      minWidth: 560,
      minHeight: 620,
      show: false,
      backgroundColor: "#f7f7f5",
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, "commercial-login-preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        devTools: !app.isPackaged,
      },
    });

    const authWebContentsId = authWindow.webContents.id;
    const validSender = (event) => event.sender.id === authWebContentsId;

    ipcMain.removeHandler("bossai-funding:commercial-login");
    ipcMain.removeHandler("bossai-funding:commercial-mfa");
    ipcMain.removeAllListeners("bossai-funding:commercial-login-cancel");

    ipcMain.handle("bossai-funding:commercial-login", async (event, payload) => {
      if (!validSender(event)) return { ok: false, code: "COMMERCIAL_ACCOUNT_FORBIDDEN", message: "Commercial sign-in request was rejected." };
      try {
        const result = await loginHeadquartersAccount(config, {
          identifier: typeof payload?.identifier === "string" ? payload.identifier : "",
          password: typeof payload?.password === "string" ? payload.password : "",
        });
        if (result.kind === "mfa") {
          mfaChallengeToken = result.mfaChallengeToken;
          return { ok: true, mfaRequired: true, expiresAt: result.expiresAt };
        }
        setTimeout(() => settleSuccess(result.sessionToken), 0);
        return { ok: true, complete: true };
      } catch (error) {
        return safeAuthResult(error);
      }
    });

    ipcMain.handle("bossai-funding:commercial-mfa", async (event, payload) => {
      if (!validSender(event)) return { ok: false, code: "COMMERCIAL_ACCOUNT_FORBIDDEN", message: "Commercial MFA request was rejected." };
      if (!mfaChallengeToken) return { ok: false, code: "COMMERCIAL_ACCOUNT_MFA_INPUT_INVALID", message: "Sign in again before entering MFA." };
      try {
        const result = await confirmHeadquartersMfa(config, mfaChallengeToken, {
          code: typeof payload?.code === "string" ? payload.code : "",
          recoveryCode: typeof payload?.recoveryCode === "string" ? payload.recoveryCode : "",
        });
        setTimeout(() => settleSuccess(result.sessionToken), 0);
        return { ok: true, complete: true };
      } catch (error) {
        return safeAuthResult(error);
      }
    });

    ipcMain.on("bossai-funding:commercial-login-cancel", (event) => {
      if (!validSender(event)) return;
      const error = new Error("Commercial sign-in was cancelled.");
      error.code = "COMMERCIAL_LOGIN_CANCELLED";
      settleFailure(error);
    });

    authWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    authWindow.webContents.on("will-navigate", (event, url) => {
      const allowed = pathToFileURL(join(__dirname, "commercial-login.html")).href;
      if (url === allowed) return;
      event.preventDefault();
    });
    authWindow.once("closed", () => {
      authWindow = null;
      if (!settled) {
        const error = new Error("Commercial sign-in window was closed.");
        error.code = "COMMERCIAL_LOGIN_CANCELLED";
        settleFailure(error);
      }
    });

    try {
      await authWindow.loadFile(join(__dirname, "commercial-login.html"));
      authWindow.show();
      authWindow.focus();
    } catch (error) {
      settleFailure(error);
    }
  });
}

async function resolveDesktopDistributionAuthorization({
  distributionConfig,
  userDataDir,
  verifyFundingDistributionAuthorization,
  loginHeadquartersAccount,
  confirmHeadquartersMfa,
}) {
  if (distributionConfig.mode === "community") {
    return {
      authorization: await verifyFundingDistributionAuthorization(distributionConfig),
      sessionSource: "community",
    };
  }

  if (distributionConfig.bearerToken) {
    return {
      authorization: await verifyFundingDistributionAuthorization(distributionConfig),
      sessionSource: "environment",
    };
  }

  const storedSession = readStoredCommercialSession(userDataDir);
  if (storedSession) {
    try {
      return {
        authorization: await verifyFundingDistributionAuthorization(distributionWithBearer(distributionConfig, storedSession)),
        sessionSource: "safe-storage",
      };
    } catch (error) {
      if (error?.httpStatus !== 401) throw error;
      removeStoredCommercialSession(userDataDir);
    }
  }

  const clientConfig = accountClientConfig(distributionConfig);
  const sessionToken = COMMERCIAL_SESSION_SMOKE_MODE
    ? await automatedCommercialSessionLogin(clientConfig, loginHeadquartersAccount, confirmHeadquartersMfa)
    : await promptForCommercialSession(clientConfig, loginHeadquartersAccount, confirmHeadquartersMfa);
  writeStoredCommercialSession(userDataDir, sessionToken);

  try {
    const authorization = await verifyFundingDistributionAuthorization(distributionWithBearer(distributionConfig, sessionToken));
    return {
      authorization,
      sessionSource: COMMERCIAL_SESSION_SMOKE_MODE ? "safe-storage-smoke-login" : "safe-storage-login",
    };
  } catch (error) {
    if (error?.httpStatus === 401) removeStoredCommercialSession(userDataDir);
    throw error;
  }
}

async function listen(serverInstance) {
  await new Promise((resolveListen, rejectListen) => {
    const onError = (error) => rejectListen(error);
    serverInstance.once("error", onError);
    serverInstance.listen(0, HOST, () => {
      serverInstance.off("error", onError);
      resolveListen();
    });
  });
}

async function startDesktop() {
  const [
    { createFundingServer },
    { FundingRepository },
    { resolveStandaloneSecurityRuntimeConfig },
    { resolveFundingDistributionConfig, verifyFundingDistributionAuthorization },
    { loginHeadquartersAccount, confirmHeadquartersMfa },
  ] = await Promise.all([
    loadRuntimeModule("dist/src/server/app.js"),
    loadRuntimeModule("dist/src/server/database.js"),
    loadRuntimeModule("dist/src/server/runtime-security-config.js"),
    loadRuntimeModule("dist/src/server/commercial-entitlement.js"),
    loadRuntimeModule("dist/src/server/commercial-account.js"),
  ]);

  const userDataDir = app.getPath("userData");
  const publicDir = resolve(__dirname, "..", "dist", "public");
  const securityRuntime = resolveStandaloneSecurityRuntimeConfig();
  const distributionConfig = resolveFundingDistributionConfig({
    productVersion: app.getVersion(),
    installationId: resolveCommercialInstallationId(userDataDir),
  });
  const { authorization: distributionAuthorization, sessionSource } = await resolveDesktopDistributionAuthorization({
    distributionConfig,
    userDataDir,
    verifyFundingDistributionAuthorization,
    loginHeadquartersAccount,
    confirmHeadquartersMfa,
  });

  const dataDir = join(userDataDir, "data");
  mkdirSync(dataDir, { recursive: true });
  const databasePath = join(dataDir, "bossai-funding.sqlite");
  repo = new FundingRepository(databasePath);
  server = createFundingServer(repo, publicDir, {
    authorizationEnforcement: securityRuntime.authorizationEnforcement,
  });
  await listen(server);

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Desktop local server did not expose a TCP address.");
  const localUrl = `http://${HOST}:${address.port}`;

  mainWindow = new BrowserWindow({
    title: "BossAI Funding",
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    show: !HIDDEN_TEST_MODE,
    backgroundColor: "#f7f7f5",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(localUrl)) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(localUrl)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  mainWindow.once("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(localUrl);

  const smokeEvidence = await mainWindow.webContents.executeJavaScript(`(() => ({
    title: document.querySelector('.topbar h1')?.textContent?.trim() || '',
    locale: document.documentElement.lang,
    connected: document.querySelector('#save-state')?.textContent?.trim() || '',
    hasCompanyForm: Boolean(document.querySelector('#company-form')),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  }))()`);

  console.log("BOSSAI_FUNDING_DESKTOP_READY", JSON.stringify({
    localUrl,
    databasePath,
    userDataDir,
    packaged: app.isPackaged,
    distributionMode: distributionAuthorization.mode,
    commercialSessionSource: sessionSource,
    evidence: smokeEvidence,
  }));

  if (SMOKE_MODE) {
    const valid = distributionAuthorization.mode === "community"
      && smokeEvidence.title === "Capital Command Center"
      && smokeEvidence.locale === "en"
      && smokeEvidence.hasCompanyForm === true
      && smokeEvidence.horizontalOverflow === false;
    console.log(valid ? "BOSSAI_FUNDING_DESKTOP_SMOKE_PASS" : "BOSSAI_FUNDING_DESKTOP_SMOKE_FAIL");
    app.exit(valid ? 0 : 1);
  } else if (COMMERCIAL_SMOKE_MODE || COMMERCIAL_SESSION_SMOKE_MODE) {
    const valid = distributionAuthorization.mode === "commercial"
      && distributionAuthorization.authority === "bossai-headquarters-commerce"
      && distributionAuthorization.accessReason === "AUTHORIZED"
      && smokeEvidence.title === "Capital Command Center"
      && smokeEvidence.locale === "en"
      && smokeEvidence.hasCompanyForm === true
      && smokeEvidence.horizontalOverflow === false;
    const label = COMMERCIAL_SESSION_SMOKE_MODE
      ? "BOSSAI_FUNDING_DESKTOP_COMMERCIAL_SESSION_SMOKE"
      : "BOSSAI_FUNDING_DESKTOP_COMMERCIAL_SMOKE";
    console.log(valid ? `${label}_PASS` : `${label}_FAIL`);
    app.exit(valid ? 0 : 1);
  } else if (!LIFECYCLE_MODE) {
    mainWindow.show();
  }
}

function closeRuntime() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    server?.close();
  } catch (error) {
    console.error("BOSSAI_FUNDING_DESKTOP_SERVER_CLOSE_FAILED", error);
  }
  server = null;
  try {
    repo?.close();
  } catch (error) {
    console.error("BOSSAI_FUNDING_DESKTOP_DATABASE_CLOSE_FAILED", error);
  }
  repo = null;
}

app.on("before-quit", closeRuntime);
app.on("window-all-closed", () => app.quit());
