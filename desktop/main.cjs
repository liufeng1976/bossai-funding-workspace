const { app, BrowserWindow, shell } = require("electron");
const { mkdirSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const HOST = "127.0.0.1";
const APP_ID = "com.bossai.funding";
const SMOKE_MODE = process.env.BOSSAI_FUNDING_DESKTOP_SMOKE === "1";
const LIFECYCLE_MODE = process.env.BOSSAI_FUNDING_DESKTOP_LIFECYCLE === "1";
const HIDDEN_TEST_MODE = SMOKE_MODE || LIFECYCLE_MODE;

let mainWindow = null;
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
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(startDesktop).catch((error) => {
    console.error("BOSSAI_FUNDING_DESKTOP_START_FAILED", error);
    app.exit(1);
  });
}

async function loadRuntimeModule(relativePath) {
  const absolute = resolve(__dirname, "..", relativePath);
  return import(pathToFileURL(absolute).href);
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
  const [{ createFundingServer }, { FundingRepository }, { resolveStandaloneSecurityRuntimeConfig }] = await Promise.all([
    loadRuntimeModule("dist/src/server/app.js"),
    loadRuntimeModule("dist/src/server/database.js"),
    loadRuntimeModule("dist/src/server/runtime-security-config.js"),
  ]);

  const userDataDir = app.getPath("userData");
  const dataDir = join(userDataDir, "data");
  mkdirSync(dataDir, { recursive: true });
  const databasePath = join(dataDir, "bossai-funding.sqlite");
  const publicDir = resolve(__dirname, "..", "dist", "public");

  const securityRuntime = resolveStandaloneSecurityRuntimeConfig();
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
    evidence: smokeEvidence,
  }));

  if (SMOKE_MODE) {
    const valid = smokeEvidence.title === "Capital Command Center"
      && smokeEvidence.locale === "en"
      && smokeEvidence.hasCompanyForm === true
      && smokeEvidence.horizontalOverflow === false;
    console.log(valid ? "BOSSAI_FUNDING_DESKTOP_SMOKE_PASS" : "BOSSAI_FUNDING_DESKTOP_SMOKE_FAIL");
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
