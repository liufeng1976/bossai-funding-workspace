const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const installer = path.join(root, "out", "desktop", "BossAI-Funding-Setup-0.48.0-x64.exe");
if (!fs.existsSync(installer)) {
  console.error("BOSSAI_FUNDING_INSTALLER_LIFECYCLE_MISSING", installer);
  process.exit(1);
}

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "bossai-funding-installer-lifecycle-"));
const installDir = path.join(sandbox, "installed-app");
const userDataDir = path.join(sandbox, "user-data");
const databasePath = path.join(userDataDir, "data", "bossai-funding.sqlite");
const expectedCompany = "BossAI Funding Installer Lifecycle Co";
const desktopEnv = {
  ...process.env,
  BOSSAI_FUNDING_DESKTOP_LIFECYCLE: "1",
  BOSSAI_FUNDING_DESKTOP_USER_DATA: userDataDir,
};

function assert(condition, message, detail) {
  if (condition) return;
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, timeoutMs = 20_000, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await sleep(intervalMs);
  }
  return false;
}

function installApp() {
  const result = spawnSync(installer, ["/S", `/D=${installDir}`], {
    cwd: path.dirname(installer),
    windowsHide: true,
    encoding: "utf8",
  });
  assert(result.status === 0, "NSIS silent install failed.", result);
  const executable = path.join(installDir, "BossAI Funding.exe");
  assert(fs.existsSync(executable), "Installed executable is missing.", { executable, installDir });
  return executable;
}

function findUninstaller() {
  const name = fs.readdirSync(installDir).find((entry) => /^Uninstall .*\.exe$/i.test(entry));
  assert(Boolean(name), "NSIS uninstaller is missing.", fs.readdirSync(installDir));
  return path.join(installDir, name);
}

async function uninstallApp(executable) {
  const uninstaller = findUninstaller();
  const result = spawnSync(uninstaller, ["/S"], {
    cwd: installDir,
    windowsHide: true,
    encoding: "utf8",
  });
  assert(result.status === 0, "NSIS silent uninstall failed.", result);
  await waitFor(() => !fs.existsSync(executable), 15_000);
  assert(!fs.existsSync(executable), "Installed executable remained after uninstall.", { executable });
}

async function launchInstalled(executable) {
  const child = spawn(executable, [], {
    cwd: installDir,
    env: desktopEnv,
    windowsHide: true,
  });

  let stdout = "";
  let stderr = "";
  let readyEvidence = null;

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    stdout += text;
    process.stdout.write(text);
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("BOSSAI_FUNDING_DESKTOP_READY ")) continue;
      try {
        readyEvidence = JSON.parse(line.slice("BOSSAI_FUNDING_DESKTOP_READY ".length));
      } catch {
        // The timeout path reports malformed/missing evidence.
      }
    }
  });
  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderr += text;
    process.stderr.write(text);
  });

  const ready = await waitFor(() => Boolean(readyEvidence), 30_000);
  if (!ready) {
    child.kill();
    throw Object.assign(new Error("Installed desktop did not become ready."), { stdout, stderr });
  }

  return { child, evidence: readyEvidence, stdout, stderr };
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once("close", resolve)),
    sleep(5_000),
  ]);
}

function assertSecondInstanceRejected(executable, primaryEvidence) {
  const result = spawnSync(executable, [], {
    cwd: installDir,
    env: desktopEnv,
    windowsHide: true,
    encoding: "utf8",
    timeout: 8_000,
  });
  assert(result.error === undefined, "Second-instance process failed abnormally.", result);
  assert(result.status === 0, "Second instance did not exit cleanly.", result);
  assert(!String(result.stdout || "").includes("BOSSAI_FUNDING_DESKTOP_READY"), "Second instance incorrectly started another Funding runtime.", result);
  return fetch(`${primaryEvidence.localUrl}/api/health`).then(async (response) => {
    const payload = await response.json();
    assert(response.ok && payload.ok === true, "Primary instance stopped responding after second-instance attempt.", payload);
  });
}

async function readBootstrap(localUrl) {
  const response = await fetch(`${localUrl}/api/bootstrap`);
  const payload = await response.json();
  assert(response.ok, "Installed bootstrap request failed.", payload);
  return payload;
}

async function main() {
  let first = null;
  let second = null;
  let afterReinstall = null;
  try {
    let executable = installApp();

    first = await launchInstalled(executable);
    assert(first.evidence.packaged === true, "Installed executable must report packaged=true.", first.evidence);
    assert(first.evidence.evidence?.locale === "en", "Fresh installed lifecycle profile must default to English.", first.evidence);
    await assertSecondInstanceRejected(executable, first.evidence);

    const initial = await readBootstrap(first.evidence.localUrl);
    assert(initial.companyProfile === null, "Fresh installed database must start without a company profile.", initial);

    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 120);
    const profilePayload = {
      name: expectedCompany,
      industry: "Financing software",
      stage: "growth",
      geography: "United States",
      foundedYear: 2026,
      annualRevenueCents: 120_000_000,
      mrrCents: 10_000_000,
      arrCents: 120_000_000,
      growthRatePct: 40,
      grossMarginPct: 70,
      cashBalanceCents: 30_000_000,
      monthlyBurnCents: 8_000_000,
      runwayMonths: 3.75,
      teamSize: 12,
      product: "Owner financing decision workspace.",
      businessModel: "Software and commercial licensing.",
      fundingHistory: "No external capital recorded for this isolated lifecycle test.",
      existingDebtCents: 0,
      capTableSummary: "Test data only.",
      useOfFunds: "Validate installed desktop persistence.",
      targetFundingCents: 80_000_000,
      targetFundingDate: future.toISOString().slice(0, 10),
    };
    const saveResponse = await fetch(`${first.evidence.localUrl}/api/company-profile`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profilePayload),
    });
    const saved = await saveResponse.json();
    assert(saveResponse.ok && saved.companyProfile?.name === expectedCompany, "Installed app failed to persist Company Profile.", saved);
    assert(fs.existsSync(databasePath), "Installed app did not create the isolated SQLite database.", { databasePath });

    await stopChild(first.child);
    first = null;

    second = await launchInstalled(executable);
    const reopened = await readBootstrap(second.evidence.localUrl);
    assert(reopened.companyProfile?.name === expectedCompany, "Company Profile did not survive installed-app restart.", reopened);
    await stopChild(second.child);
    second = null;

    await uninstallApp(executable);
    assert(fs.existsSync(databasePath), "Uninstall unexpectedly deleted owner financing data.", { databasePath });

    executable = installApp();
    afterReinstall = await launchInstalled(executable);
    const reinstalledState = await readBootstrap(afterReinstall.evidence.localUrl);
    assert(reinstalledState.companyProfile?.name === expectedCompany, "Company Profile did not survive uninstall and reinstall.", reinstalledState);
    await stopChild(afterReinstall.child);
    afterReinstall = null;

    await uninstallApp(executable);
    assert(fs.existsSync(databasePath), "Final uninstall unexpectedly deleted owner financing data.", { databasePath });

    console.log("BOSSAI_FUNDING_INSTALLER_LIFECYCLE_PASS", JSON.stringify({
      installer,
      installDir,
      userDataDir,
      databasePath,
      singleInstanceRejected: true,
      companyPersistedAcrossRestart: true,
      executableRemovedByUninstall: true,
      dataPreservedAfterUninstall: true,
      companyPersistedAcrossReinstall: true,
      finalDataPreservedAfterUninstall: true,
    }));
  } finally {
    if (first) await stopChild(first.child);
    if (second) await stopChild(second.child);
    if (afterReinstall) await stopChild(afterReinstall.child);
    try {
      fs.rmSync(sandbox, { recursive: true, force: true });
    } catch {
      // Test sandbox cleanup is best-effort after assertions have completed.
    }
  }
}

main().catch((error) => {
  console.error("BOSSAI_FUNDING_INSTALLER_LIFECYCLE_FAIL", error, error.detail ?? "");
  process.exitCode = 1;
});
