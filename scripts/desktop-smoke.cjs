const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const tempUserData = fs.mkdtempSync(path.join(os.tmpdir(), "bossai-funding-desktop-smoke-"));
const command = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "npx --yes electron@43.4.1 ."]
  : ["--yes", "electron@43.4.1", "."];

let stdout = "";
let stderr = "";
let readyEvidence = null;
let timedOut = false;

const child = spawn(command, args, {
  cwd: projectRoot,
  env: {
    ...process.env,
    BOSSAI_FUNDING_DESKTOP_SMOKE: "1",
    BOSSAI_FUNDING_DESKTOP_USER_DATA: tempUserData,
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
  for (const line of text.split(/\r?\n/)) {
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

child.on("error", (error) => {
  clearTimeout(timeout);
  cleanup();
  console.error("BOSSAI_FUNDING_DESKTOP_PROCESS_ERROR", error);
  process.exitCode = 1;
});

child.on("close", (code) => {
  clearTimeout(timeout);
  const databasePath = readyEvidence?.databasePath ? path.resolve(readyEvidence.databasePath) : "";
  const expectedRoot = path.resolve(tempUserData);
  const databaseInsideTemp = databasePath.startsWith(expectedRoot + path.sep);
  const passed = !timedOut
    && code === 0
    && stdout.includes("BOSSAI_FUNDING_DESKTOP_SMOKE_PASS")
    && readyEvidence?.packaged === false
    && readyEvidence?.evidence?.title === "Capital Command Center"
    && readyEvidence?.evidence?.locale === "en"
    && readyEvidence?.evidence?.hasCompanyForm === true
    && readyEvidence?.evidence?.horizontalOverflow === false
    && databaseInsideTemp;

  console.log("BOSSAI_FUNDING_DESKTOP_SMOKE", JSON.stringify({
    passed,
    code,
    timedOut,
    databaseInsideTemp,
    evidence: readyEvidence,
    stderrTail: stderr.slice(-1000),
  }));
  cleanup();
  if (!passed) process.exitCode = 1;
});

function cleanup() {
  try {
    fs.rmSync(tempUserData, { recursive: true, force: true });
  } catch {
    // Temporary smoke evidence must not block process exit.
  }
}
