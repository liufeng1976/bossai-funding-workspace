const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const port = 34936;
const debugPort = 9346;
const baseUrl = `http://127.0.0.1:${port}`;
const chromeExecutable = process.env.BOSSAI_FUNDING_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bossai-funding-chrome-repair-"));
let server = null;
let chrome = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message, evidence) {
  if (!condition) throw new Error(`${message}\n${JSON.stringify(evidence, null, 2)}`);
}

async function api(route, method = "GET", body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${route} ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function waitForHealth() {
  for (let index = 0; index < 120; index += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error("BossAI Funding built server did not become healthy.");
}

async function waitForChromeTarget() {
  for (let index = 0; index < 120; index += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((item) => item.type === "page");
        if (page) return page;
      }
    } catch {}
    await sleep(100);
  }
  throw new Error("System Chrome DevTools endpoint did not become available.");
}

async function cleanup() {
  try {
    if (chrome && !chrome.killed) chrome.kill();
  } catch {}
  try {
    if (server && !server.killed) server.kill();
  } catch {}
  await sleep(200);
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
}

async function main() {
  if (!fs.existsSync(chromeExecutable)) throw new Error(`Chrome executable not found: ${chromeExecutable}`);

  server = spawn(process.execPath, [path.join(projectRoot, "dist", "src", "server", "main.js")], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      BOSSAI_FUNDING_DB: path.join(tempDir, "funding.sqlite"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  server.stdout.on("data", (data) => { serverLog += data; });
  server.stderr.on("data", (data) => { serverLog += data; });
  server.once("exit", (code) => {
    if (code && code !== 0) console.error(serverLog);
  });
  await waitForHealth();

  const outcomeResult = await api("/api/outcomes", "POST", {
    track: "equity",
    applicationId: null,
    investorId: null,
    roundId: null,
    status: "closed",
    approvedAmountCents: 20_000_000,
    committedAmountCents: 20_000_000,
    receivedAmountCents: 0,
    receivedDate: null,
    commitmentEvidence: "Signed closing Chrome",
    receiptEvidence: "",
    conditions: "",
    lossReason: "",
    feedback: "",
    retryDate: null,
  });
  const outcomeId = outcomeResult.outcome.id;

  const expectationResult = await api("/api/receipt-expectations", "POST", {
    outcomeId,
    amountCents: 10_000_000,
    expectedDate: "2026-08-25",
    basisNote: "Signed settlement schedule",
    owner: "Founder",
    note: "",
    status: "expected",
    cancellationReason: "",
  });
  const expectationId = expectationResult.receiptExpectation.id;

  const trancheResult = await api("/api/receipt-tranches", "POST", {
    outcomeId,
    amountCents: 10_000_000,
    receivedDate: "2026-08-18",
    receiptEvidence: "Bank receipt Chrome 10",
    note: "",
    status: "received",
    voidReason: "",
  });
  const trancheId = trancheResult.receiptTranche.id;

  const allocationResult = await api("/api/receipt-expectation-allocations", "POST", {
    expectationId,
    trancheId,
    amountCents: 10_000_000,
    note: "Owner confirmed Chrome link",
    status: "active",
    voidReason: "",
  });
  const allocationId = allocationResult.receiptExpectationAllocation.id;

  await api(`/api/receipt-tranches/${trancheId}`, "PATCH", {
    ...trancheResult.receiptTranche,
    amountCents: 5_000_000,
    receiptEvidence: "Bank receipt Chrome 5",
    note: "Cash correction",
  });

  chrome = spawn(chromeExecutable, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${path.join(tempDir, "chrome")}`,
    baseUrl,
  ], { stdio: "ignore" });

  const target = await waitForChromeTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  const evaluate = async (expression) => {
    const output = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (output.exceptionDetails) throw new Error(JSON.stringify(output.exceptionDetails));
    return output.result.value;
  };
  await send("Runtime.enable");

  const selectors = {
    amount: `[data-receipt-allocation-amount="${allocationId}"]`,
    status: `[data-receipt-allocation-status="${allocationId}"]`,
    reason: `[data-receipt-allocation-void-reason="${allocationId}"]`,
    support: `[data-draft-receipt-allocation-supported="${allocationId}"]`,
    voidDraft: `[data-draft-receipt-allocation-void="${allocationId}"]`,
    save: `[data-save-receipt-allocation="${allocationId}"]`,
    warning: `[data-receipt-allocation-draft-warning="${allocationId}"]`,
    preview: `[data-receipt-allocation-draft-preview="${allocationId}"]`,
  };
  const query = (selector) => `document.querySelector(${JSON.stringify(selector)})`;

  for (let index = 0; index < 100; index += 1) {
    if (await evaluate(`Boolean(${query(selectors.support)})`)) break;
    if (index === 99) throw new Error("Repair UI did not load.");
    await sleep(100);
  }

  await evaluate(`(() => {
    const locale = document.querySelector('#locale-select');
    if (locale) {
      locale.value = 'en';
      locale.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return document.documentElement.lang;
  })()`);
  await sleep(120);
  await evaluate(`document.querySelector('.owner-nav [data-scroll="execution"]')?.click(); true`);
  await sleep(180);
  const initial = await evaluate(`(() => ({
    amount: ${query(selectors.amount)}?.value,
    support: Boolean(${query(selectors.support)}),
    voidDraft: Boolean(${query(selectors.voidDraft)}),
    executionOpen: document.querySelector("#execution")?.getAttribute("data-module-open") === "true",
    hash: location.hash,
    reconciliation: document.body.innerText.includes("RECONCILIATION REQUIRED")
  }))()`);
  assert(initial.amount === "100000" && initial.support && initial.voidDraft && initial.executionOpen && initial.hash === "#execution" && initial.reconciliation, "Initial repair UI is incomplete after opening Execute and close through owner navigation.", initial);

  const drafted = await evaluate(`(() => {
    ${query(selectors.support)}.click();
    return { amount: ${query(selectors.amount)}.value, status: ${query(selectors.status)}.value, previewHidden: ${query(selectors.preview)}.hidden, preview: ${query(selectors.preview)}.innerText };
  })()`);
  assert(
    drafted.amount === "50000"
      && drafted.status === "active"
      && drafted.previewHidden === false
      && drafted.preview.includes("$100,000 → $50,000 active")
      && drafted.preview.includes("$50,000 active allocated · $50,000 remaining")
      && drafted.preview.includes("$50,000 allocated · $0 current cash capacity left")
      && drafted.preview.includes("Fits the currently loaded relationship/capacity facts")
      && drafted.preview.includes("Preview only — nothing is saved"),
    "Supported amount draft did not expose the exact unsaved impact preview.",
    drafted,
  );

  let state = await api("/api/bootstrap");
  assert(state.receiptExpectationAllocations.find((item) => item.id === allocationId).amountCents === 10_000_000, "Draft action persisted before Save link.", state.receiptExpectationAllocations);

  let tranche = state.receiptTranches.find((item) => item.id === trancheId);
  const secondCorrection = await api(`/api/receipt-tranches/${trancheId}`, "PATCH", {
    ...tranche,
    amountCents: 4_000_000,
    receiptEvidence: "Bank receipt Chrome 4",
    note: "Second cash correction",
  });
  assert(secondCorrection.state.receiptAllocationReconciliationIssues.find((item) => item.trancheId === trancheId)?.requiredReductionCents === 6_000_000, "Second cash correction did not update reconciliation truth.", secondCorrection.state.receiptAllocationReconciliationIssues);

  await evaluate(`${query(selectors.save)}.click()`);
  await sleep(450);
  const staleUi = await evaluate(`(() => ({
    save: document.querySelector("#save-state")?.textContent,
    refreshHidden: document.querySelector("#refresh-workspace")?.hidden,
    amount: ${query(selectors.amount)}?.value
  }))()`);
  assert(staleUi.save?.includes("refresh needed") && staleUi.refreshHidden === false && staleUi.amount === "50000", "Stale repair draft did not fail closed with draft preserved.", staleUi);

  state = await api("/api/bootstrap");
  assert(
    state.receiptExpectationAllocations.find((item) => item.id === allocationId).amountCents === 10_000_000
      && state.receiptTranches.find((item) => item.id === trancheId).amountCents === 4_000_000,
    "Stale Save changed authoritative financing truth.",
    state,
  );

  await evaluate(`document.querySelector("#refresh-workspace").click()`);
  await sleep(600);
  const refreshed = await evaluate(`(() => ({
    amount: ${query(selectors.amount)}?.value,
    warningHidden: ${query(selectors.warning)}?.hidden,
    warning: ${query(selectors.warning)}?.textContent,
    previewHidden: ${query(selectors.preview)}?.hidden,
    preview: ${query(selectors.preview)}?.innerText,
    support: Boolean(${query(selectors.support)})
  }))()`);
  assert(
    refreshed.amount === "50000"
      && refreshed.warningHidden === false
      && refreshed.warning?.includes("$40,000")
      && refreshed.previewHidden === false
      && refreshed.preview?.includes("$100,000 → $50,000 active")
      && refreshed.preview?.includes("Does not fit the currently loaded relationship/capacity facts")
      && refreshed.support,
    "Refresh did not preserve and revalidate the stale repair draft.",
    refreshed,
  );

  const latestDraft = await evaluate(`(() => {
    ${query(selectors.support)}.click();
    return { amount: ${query(selectors.amount)}.value, warningHidden: ${query(selectors.warning)}.hidden, previewHidden: ${query(selectors.preview)}.hidden, preview: ${query(selectors.preview)}.innerText };
  })()`);
  assert(
    latestDraft.amount === "40000"
      && latestDraft.warningHidden === true
      && latestDraft.previewHidden === false
      && latestDraft.preview.includes("$100,000 → $40,000 active")
      && latestDraft.preview.includes("$40,000 active allocated · $60,000 remaining")
      && latestDraft.preview.includes("$40,000 allocated · $0 current cash capacity left")
      && latestDraft.preview.includes("Fits the currently loaded relationship/capacity facts"),
    "Latest supported amount did not expose the refreshed impact preview.",
    latestDraft,
  );

  await evaluate(`${query(selectors.save)}.click()`);
  await sleep(450);
  state = await api("/api/bootstrap");
  assert(
    state.receiptExpectationAllocations.find((item) => item.id === allocationId).amountCents === 4_000_000
      && !state.receiptAllocationReconciliationIssues.some((item) => item.allocationIds.includes(allocationId)),
    "Explicit supported repair did not persist cleanly.",
    state,
  );

  tranche = state.receiptTranches.find((item) => item.id === trancheId);
  await api(`/api/receipt-tranches/${trancheId}`, "PATCH", {
    ...tranche,
    status: "voided",
    voidReason: "Bank reversal confirmed",
  });

  await evaluate("location.reload(); true");
  for (let index = 0; index < 100; index += 1) {
    await sleep(100);
    if (await evaluate(`Boolean(${query(selectors.voidDraft)})`)) break;
    if (index === 99) throw new Error("Void repair UI did not load.");
  }

  const voidDraft = await evaluate(`(() => {
    ${query(selectors.voidDraft)}.click();
    return { status: ${query(selectors.status)}.value, reason: ${query(selectors.reason)}.value, previewHidden: ${query(selectors.preview)}.hidden, preview: ${query(selectors.preview)}.innerText };
  })()`);
  assert(
    voidDraft.status === "voided"
      && voidDraft.reason === ""
      && voidDraft.previewHidden === false
      && voidDraft.preview.includes("$40,000 → $0 active")
      && voidDraft.preview.includes("$0 active allocated · $100,000 remaining")
      && voidDraft.preview.includes("$0 allocated · $0 current cash capacity left")
      && voidDraft.preview.includes("Fits the currently loaded relationship/capacity facts")
      && voidDraft.preview.includes("Owner void reason still required before Save"),
    "Draft void did not expose the correct non-persistent impact preview or invented a reason.",
    voidDraft,
  );

  state = await api("/api/bootstrap");
  assert(state.receiptExpectationAllocations.find((item) => item.id === allocationId).status === "active", "Draft void persisted before Save link.", state.receiptExpectationAllocations);

  await evaluate(`${query(selectors.save)}.click()`);
  await sleep(350);
  state = await api("/api/bootstrap");
  assert(state.receiptExpectationAllocations.find((item) => item.id === allocationId).status === "active", "Void without an owner reason did not fail closed.", state.receiptExpectationAllocations);

  const voidReasonReady = await evaluate(`(() => {
    ${query(selectors.reason)}.value = "Underlying bank receipt was reversed";
    ${query(selectors.reason)}.dispatchEvent(new Event("input", { bubbles: true }));
    return { preview: ${query(selectors.preview)}.innerText };
  })()`);
  assert(voidReasonReady.preview.includes("Ready to submit for server validation"), "Void reason did not update the unsaved Save prerequisite preview.", voidReasonReady);
  await evaluate(`${query(selectors.save)}.click()`);
  await sleep(450);
  state = await api("/api/bootstrap");
  assert(
    state.receiptExpectationAllocations.find((item) => item.id === allocationId).status === "voided"
      && !state.receiptAllocationReconciliationIssues.some((item) => item.allocationIds.includes(allocationId)),
    "Explicit owner void repair did not clear reconciliation.",
    state,
  );

  console.log(`BOSSAI_FUNDING_CHROME_REPAIR_SMOKE ${JSON.stringify({
    initial,
    drafted,
    staleUi,
    refreshed,
    latestDraft,
    voidDraft,
    voidReasonReady,
    finalAllocation: state.receiptExpectationAllocations.find((item) => item.id === allocationId),
    finalIssues: state.receiptAllocationReconciliationIssues.length,
  })}`);
  console.log("BOSSAI_FUNDING_CHROME_REPAIR_SMOKE_PASS");
  socket.close();
}

main()
  .then(cleanup)
  .catch(async (error) => {
    console.error(error.stack || error);
    await cleanup();
    process.exit(1);
  });
