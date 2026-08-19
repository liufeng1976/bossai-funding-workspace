const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const port = 34817;
const debugPort = 9347;
const mode = process.argv.includes("--locale-leak-audit")
  ? "locale-leak-audit"
  : process.argv.includes("--locale-acceptance")
    ? "locale-acceptance"
    : process.argv.includes("--mobile-owner-readiness")
      ? "mobile-owner-readiness"
      : "full";
const baseUrl = `http://127.0.0.1:${port}`;
const chromeExecutable = process.env.BOSSAI_FUNDING_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bossai-funding-ui-browser-"));
let server = null;
let chrome = null;
let socket = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message, evidence) {
  if (!condition) throw new Error(`${message}\n${JSON.stringify(evidence, null, 2)}`);
}

async function waitForServer() {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await sleep(120);
  }
  throw new Error("Timed out waiting for BossAI Funding built local server.");
}

async function waitForChromeTarget() {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const target = targets.find((item) => item.type === "page" && String(item.url || "").startsWith(baseUrl))
          || targets.find((item) => item.type === "page");
        if (target?.webSocketDebuggerUrl) return target;
      }
    } catch {}
    await sleep(120);
  }
  throw new Error("System Chrome DevTools endpoint did not become available.");
}

async function cleanup() {
  try { socket?.close(); } catch {}
  try { if (chrome && !chrome.killed) chrome.kill(); } catch {}
  try { if (server && !server.killed) server.kill(); } catch {}
  await sleep(200);
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
}

function rgbTuple(value) {
  const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return match ? match.slice(1, 4).map(Number) : null;
}

function contrastRatio(foreground, background) {
  const fg = rgbTuple(foreground);
  const bg = rgbTuple(background);
  if (!fg || !bg) return 0;
  const luminance = (rgb) => {
    const [r, g, b] = rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function pngEvidence(buffer, name) {
  assert(buffer.length >= 24, `Screenshot capture at ${name} must return a complete PNG.`, { bytes: buffer.length });
  return {
    name,
    bytes: buffer.length,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
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
    windowsHide: true,
  });
  let serverLog = "";
  server.stdout.on("data", (data) => { serverLog += data; });
  server.stderr.on("data", (data) => { serverLog += data; });
  server.once("exit", (code) => {
    if (code && code !== 0) console.error(serverLog);
  });
  await waitForServer();

  chrome = spawn(chromeExecutable, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${path.join(tempDir, "chrome")}`,
    "--window-size=1440,860",
    baseUrl,
  ], { stdio: "ignore", windowsHide: true });

  const target = await waitForChromeTarget();
  socket = new WebSocket(target.webSocketDebuggerUrl);
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
  const waitForPage = async (selector = ".shell") => {
    for (let index = 0; index < 120; index += 1) {
      try {
        const ready = await evaluate(`document.readyState === "complete" && Boolean(document.querySelector(${JSON.stringify(selector)}))`);
        if (ready) {
          await evaluate("document.fonts?.ready || Promise.resolve()");
          return;
        }
      } catch {}
      await sleep(100);
    }
    throw new Error(`Page did not become ready for selector ${selector}.`);
  };
  const navigate = async (url) => {
    await send("Page.navigate", { url });
    await waitForPage();
  };
  const setViewport = async (width, height) => {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: width,
      screenHeight: height,
    });
    await sleep(180);
  };
  const capture = async (name) => {
    const response = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    return pngEvidence(Buffer.from(response.data || "", "base64"), name);
  };

  await send("Runtime.enable");
  await send("Page.enable");
  await waitForPage();

  const probe = async () => evaluate(`(() => {
    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const body = getComputedStyle(document.body);
    const headings = [...document.querySelectorAll('h1,h2')].filter((node) => { const s=getComputedStyle(node), r=node.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0; });
    const heading = headings.sort((a,b) => Number.parseFloat(getComputedStyle(b).fontSize)-Number.parseFloat(getComputedStyle(a).fontSize))[0] || null;
    const headingStyle = heading ? getComputedStyle(heading) : null;
    const images = [...document.images];
    const shell = document.querySelector('.shell');
    const topbar = document.querySelector('.topbar');
    const ownerNav = document.querySelector('.owner-nav');
    const hero = document.querySelector('.hero-grid');
    const focus = document.querySelector('.focus-card');
    const gap = document.querySelector('.gap-card');
    const trackGrid = document.querySelector('.track-grid');
    const fields = document.querySelector('.fields.two-col');
    const firstView = document.querySelector('.owner-first-view');
    const progressiveModules = [...document.querySelectorAll('[data-progressive-module]')].map((module) => ({
      id: module.id,
      open: module.getAttribute('data-module-open') === 'true',
      label: module.getAttribute('data-module-label') || '',
      toggleText: module.querySelector('.workspace-module-toggle')?.textContent?.trim() || '',
      headingVisible: (() => { const node=module.querySelector(':scope > .section-heading'); if(!node) return false; const s=getComputedStyle(node), r=node.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0; })(),
    }));
    const rect = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height };
    };
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      noHorizontalOverflow: root.scrollWidth <= root.clientWidth + 1,
      bodyBackground: body.backgroundColor,
      bodyColor: body.color,
      typography: { fontsStatus:document.fonts?.status||'unsupported', bodyFontFamily:body.fontFamily, headingFontFamily:headingStyle?.fontFamily||'', headingFontSize:headingStyle?.fontSize||'', headingFontWeight:headingStyle?.fontWeight||'' },
      visualResources: { imageCount:images.length, brokenImageCount:images.filter((image)=>!image.complete||image.naturalWidth===0||image.naturalHeight===0).length, svgCount:document.querySelectorAll('svg').length, renderedSvgCount:[...document.querySelectorAll('svg')].filter((svg)=>{ const s=getComputedStyle(svg), r=svg.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0; }).length },
      panelToken: rootStyle.getPropertyValue('--panel').trim(),
      accentToken: rootStyle.getPropertyValue('--accent').trim(),
      shellRect: rect(shell),
      topbarDirection: topbar ? getComputedStyle(topbar).flexDirection : '',
      ownerNavPosition: ownerNav ? getComputedStyle(ownerNav).position : '',
      ownerNavColumns: ownerNav ? getComputedStyle(ownerNav).gridTemplateColumns : '',
      heroDisplay: hero ? getComputedStyle(hero).display : '',
      heroColumns: hero ? getComputedStyle(hero).gridTemplateColumns : '',
      heroRect: rect(hero),
      focusVisible: Boolean(focus),
      gapVisible: Boolean(gap),
      trackColumns: trackGrid ? getComputedStyle(trackGrid).gridTemplateColumns : '',
      twoColFieldsColumns: fields ? getComputedStyle(fields).gridTemplateColumns : '',
      todaysFocusVisible: Boolean(document.querySelector('.focus-card .card-label')),
      capitalGapVisible: Boolean(document.querySelector('.gap-card .card-label')),
      blockerVisible: Boolean(document.querySelector('.owner-snapshot-blocker')),
      threeTracksVisible: Boolean(document.querySelector('.owner-snapshot-tracks')),
      firstViewRect: rect(firstView),
      snapshotBlockerRect: rect(document.querySelector('.owner-snapshot-blocker')),
      snapshotTimingRect: rect(document.querySelector('.owner-snapshot-timing')),
      snapshotTracksRect: rect(document.querySelector('.owner-snapshot-tracks')),
      snapshotBlockerTitle: document.querySelector('#owner-snapshot-blocker-title')?.textContent?.trim() || '',
      snapshotTimingTitle: document.querySelector('#owner-snapshot-timing-title')?.textContent?.trim() || '',
      snapshotTrackCount: document.querySelectorAll('#owner-snapshot-track-grid .owner-snapshot-track').length,
      progressiveModules,
      progressiveModuleCount: progressiveModules.length,
      professionalModuleCount: document.querySelectorAll('[data-professional-module]').length,
      openProgressiveModuleCount: progressiveModules.filter((module) => module.open).length,
    };
  })()`);

  const assertVisual = (evidence, screenshot, label) => {
    const dpr = Number(evidence.devicePixelRatio || 1);
    assert(Math.abs(screenshot.width - evidence.innerWidth * dpr) <= 1 && Math.abs(screenshot.height - evidence.innerHeight * dpr) <= 1, `${label} screenshot pixels must match CSS viewport × DPR.`, { evidence, screenshot });
    assert(screenshot.bytes > 5000, `${label} screenshot must contain rendered pixels.`, screenshot);
    assert(evidence.typography.fontsStatus === "loaded", `${label} fonts must be settled.`, evidence);
    assert(Number.parseFloat(evidence.typography.headingFontSize) >= 20, `${label} primary heading must retain visual hierarchy.`, evidence);
    const weight = Number.parseInt(evidence.typography.headingFontWeight, 10);
    assert(Number.isFinite(weight) ? weight >= 600 : /bold/i.test(evidence.typography.headingFontWeight), `${label} primary heading weight must remain strong.`, evidence);
    assert(evidence.visualResources.brokenImageCount === 0, `${label} must not contain broken image resources.`, evidence);
    assert(contrastRatio(evidence.bodyColor, evidence.bodyBackground) >= 7, `${label} body/canvas contrast must remain >= 7:1.`, evidence);
  };

  const v038PageHeightBaseline = { desktop: 21203.5625, mobile: 35048.75 };
  const v039PageHeightBaseline = { desktop: 4460.46875, mobile: 9807.6875 };

  await setViewport(1440, 860);
  const desktop = await probe();
  const desktopScreenshot = await capture("owner-desktop");
  assertVisual(desktop, desktopScreenshot, "Funding desktop");
  desktop.visual = { screenshot: desktopScreenshot, contrastRatio: contrastRatio(desktop.bodyColor, desktop.bodyBackground) };
  assert(desktop.innerWidth === 1440, "Desktop funding viewport must be 1440px wide.", desktop);
  assert(desktop.shellRect && desktop.shellRect.left >= 0 && desktop.shellRect.right <= desktop.innerWidth + 1, "Desktop shell must remain bounded.", desktop);
  desktop.pageHeightReductionPct = Math.round((1 - desktop.shellRect.height / v038PageHeightBaseline.desktop) * 1000) / 10;
  desktop.v039HeightReductionPct = Math.round((1 - desktop.shellRect.height / v039PageHeightBaseline.desktop) * 1000) / 10;
  assert(desktop.shellRect.height < v038PageHeightBaseline.desktop * 0.5, "Desktop progressive disclosure must cut the v0.38 initial page height by more than half.", { baseline: v038PageHeightBaseline.desktop, current: desktop.shellRect.height, reductionPct: desktop.pageHeightReductionPct });
  assert(desktop.shellRect.height < v039PageHeightBaseline.desktop * 0.6, "Desktop owner first-view density must materially reduce the v0.39 initial page height without hiding the owner snapshot.", { baseline: v039PageHeightBaseline.desktop, current: desktop.shellRect.height, reductionPct: desktop.v039HeightReductionPct });
  assert(desktop.firstViewRect && desktop.heroRect && desktop.firstViewRect.top >= desktop.heroRect.bottom && desktop.firstViewRect.bottom <= desktop.innerHeight, "Desktop Today’s Focus, Capital Gap, blocker, timing and three-track snapshot must all fit in the first real viewport.", { hero: desktop.heroRect, firstView: desktop.firstViewRect, viewportHeight: desktop.innerHeight });
  assert(desktop.snapshotBlockerTitle && desktop.snapshotTimingTitle && desktop.snapshotTrackCount === 3, "Desktop owner snapshot must project a blocker judgment, timing judgment and all three capital tracks from the loaded dashboard facts.", desktop);
  assert(desktop.progressiveModuleCount === 8 && desktop.professionalModuleCount === 7 && desktop.openProgressiveModuleCount === 0 && desktop.progressiveModules.every((module) => module.headingVisible && module.toggleText.length > 0), "Desktop initial entry must keep seven professional workspaces plus owner decision detail discoverable but collapsed in the active locale.", desktop.progressiveModules);
  assert(desktop.focusVisible && desktop.gapVisible, "Desktop owner entry must render Today’s Focus and Capital Gap.", desktop);
  assert(desktop.todaysFocusVisible && desktop.capitalGapVisible && desktop.blockerVisible && desktop.threeTracksVisible, "Desktop owner entry must expose the four funding decisions promised by the product boundary.", desktop);
  assert(desktop.heroDisplay === "grid" && desktop.heroColumns.split(" ").length >= 2, "Desktop capital status must use the two-column hero geometry.", desktop);
  assert(desktop.ownerNavPosition === "sticky", "Desktop owner journey navigation must remain sticky.", desktop);
  assert(desktop.noHorizontalOverflow, "Desktop funding entry must not overflow horizontally.", desktop);
  assert(desktop.bodyBackground === "rgb(247, 247, 245)", "Desktop canvas must use the company light baseline.", desktop);
  assert(["#fff", "#ffffff"].includes(desktop.panelToken.toLowerCase()), "Desktop panel token must be white.", desktop);
  assert(desktop.accentToken.toLowerCase() === "#3558c8", "Desktop accent must remain the restrained company blue.", desktop);

  await setViewport(390, 844);
  const mobile = await probe();
  const mobileScreenshot = await capture("owner-mobile");
  assertVisual(mobile, mobileScreenshot, "Funding mobile");
  assert(desktopScreenshot.sha256 !== mobileScreenshot.sha256, "Funding desktop and mobile screenshots must be distinct.", { desktopScreenshot, mobileScreenshot });
  mobile.visual = { screenshot: mobileScreenshot, contrastRatio: contrastRatio(mobile.bodyColor, mobile.bodyBackground) };
  assert(mobile.innerWidth === 390, "Mobile funding viewport must be 390px wide.", mobile);
  assert(mobile.topbarDirection === "column", "Mobile topbar must stack vertically.", mobile);
  assert(mobile.ownerNavPosition === "static", "Mobile owner journey navigation must leave sticky mode.", mobile);
  assert(mobile.ownerNavColumns.split(" ").length === 2, "Mobile owner journey navigation must use two columns.", mobile);
  assert(mobile.heroColumns === "1fr" || mobile.heroColumns.split(" ").length === 1, "Mobile capital status must collapse to one column.", mobile);
  assert(mobile.trackColumns === "1fr" || mobile.trackColumns.split(" ").length === 1, "Mobile capital tracks must collapse to one column.", mobile);
  assert(mobile.twoColFieldsColumns === "1fr" || mobile.twoColFieldsColumns.split(" ").length === 1, "Mobile two-column forms must collapse to one column.", mobile);
  assert(mobile.shellRect && mobile.shellRect.left >= 0 && mobile.shellRect.right <= mobile.innerWidth + 1, "Mobile shell must fit the viewport.", mobile);
  mobile.pageHeightReductionPct = Math.round((1 - mobile.shellRect.height / v038PageHeightBaseline.mobile) * 1000) / 10;
  mobile.v039HeightReductionPct = Math.round((1 - mobile.shellRect.height / v039PageHeightBaseline.mobile) * 1000) / 10;
  assert(mobile.shellRect.height < v038PageHeightBaseline.mobile * 0.5, "Mobile progressive disclosure must cut the v0.38 initial page height by more than half.", { baseline: v038PageHeightBaseline.mobile, current: mobile.shellRect.height, reductionPct: mobile.pageHeightReductionPct });
  assert(mobile.shellRect.height < v039PageHeightBaseline.mobile * 0.5, "Mobile owner first-view density must cut the v0.39 initial page height by more than half without removing professional workspaces.", { baseline: v039PageHeightBaseline.mobile, current: mobile.shellRect.height, reductionPct: mobile.v039HeightReductionPct });
  assert(mobile.firstViewRect && mobile.heroRect && mobile.firstViewRect.top >= mobile.heroRect.bottom && mobile.firstViewRect.bottom <= mobile.innerHeight * 2, "Mobile owner must reach the complete blocker, timing and three-track snapshot within two real 390×844 viewports.", { hero: mobile.heroRect, firstView: mobile.firstViewRect, twoViewports: mobile.innerHeight * 2 });
  assert(mobile.snapshotBlockerTitle && mobile.snapshotTimingTitle && mobile.snapshotTrackCount === 3, "Mobile owner snapshot must retain blocker, timing and all three capital tracks.", mobile);
  assert(mobile.progressiveModuleCount === 8 && mobile.professionalModuleCount === 7 && mobile.openProgressiveModuleCount === 0 && mobile.progressiveModules.every((module) => module.headingVisible), "Mobile initial entry must keep seven professional workspace headings plus owner decision detail visible without expanding their full forms/registers.", mobile.progressiveModules);
  assert(mobile.noHorizontalOverflow, "Mobile funding entry must not overflow horizontally.", mobile);
  assert(mobile.todaysFocusVisible && mobile.capitalGapVisible, "Mobile owner entry must retain Today’s Focus and Capital Gap.", mobile);

  const mobileReturnPath = await evaluate(`(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    document.querySelector('.owner-nav [data-scroll="execution"]')?.click();
    await sleep(120);
    window.scrollTo(0, document.documentElement.scrollHeight);
    await sleep(120);
    const control = document.querySelector('#return-to-overview');
    const before = control?.getBoundingClientRect();
    const visibleDeepInModule = Boolean(control && !control.hidden && before && before.top >= 0 && before.bottom <= window.innerHeight && before.left >= 0 && before.right <= window.innerWidth);
    const executionLabel = document.querySelector('#execution')?.getAttribute('data-module-label') || '';
    const contextNamesExecution = Boolean(executionLabel) && String(control?.textContent || '').startsWith(executionLabel);
    const executionNavCurrent = document.querySelector('.owner-nav [data-scroll="execution"]')?.getAttribute('aria-current') === 'step';
    control?.click();
    const deadline = Date.now() + 1800;
    let hero = document.querySelector('.hero-grid')?.getBoundingClientRect();
    while (Date.now() < deadline && hero && !(hero.bottom > 0 && hero.top < window.innerHeight)) {
      await sleep(60);
      hero = document.querySelector('.hero-grid')?.getBoundingClientRect();
    }
    await sleep(80);
    return {
      visibleDeepInModule,
      contextNamesExecution,
      executionNavCurrent,
      executionOpened: document.querySelector('#execution')?.getAttribute('data-module-open') !== 'true',
      allModulesClosed: [...document.querySelectorAll('[data-progressive-module]')].every((module) => module.getAttribute('data-module-open') !== 'true'),
      hashCleared: location.hash === '',
      returnHidden: Boolean(control?.hidden),
      heroVisible: Boolean(hero && hero.bottom > 0 && hero.top < window.innerHeight),
      focusRestoredToToday: document.activeElement?.id === 'focus-action',
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    };
  })()`);
  assert(mobileReturnPath.visibleDeepInModule && mobileReturnPath.contextNamesExecution && mobileReturnPath.executionNavCurrent && mobileReturnPath.allModulesClosed && mobileReturnPath.hashCleared && mobileReturnPath.returnHidden && mobileReturnPath.heroVisible && mobileReturnPath.focusRestoredToToday && mobileReturnPath.noHorizontalOverflow, "Mobile owner must see the current professional workspace, have matching navigation context, and retain a bounded one-step return to the capital overview with keyboard focus restored to Today’s Focus.", mobileReturnPath);
  mobile.returnPath = mobileReturnPath;

  if (mode !== "locale-acceptance" && mode !== "locale-leak-audit") {
    await evaluate(`(() => {
      const select = document.querySelector('#locale-select');
      if (!(select instanceof HTMLSelectElement)) return false;
      select.value = 'en';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return document.documentElement.lang === 'en';
    })()`);
    await sleep(80);
  }

  if (mode === "locale-leak-audit") {
    const leakEvidence = await evaluate(`(async () => {
      const select = document.querySelector('#locale-select');
      if (!(select instanceof HTMLSelectElement)) throw new Error('Locale selector missing');
      const collect = () => {
        const phrases = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          const text = String(node.data || '').replace(/\\s+/g, ' ').trim();
          const parent = node.parentElement;
          if (text && parent && !['SCRIPT','STYLE'].includes(parent.tagName)) phrases.push(text);
          node = walker.nextNode();
        }
        document.querySelectorAll('[placeholder],[aria-label],[title],[data-module-label]').forEach((element) => {
          for (const name of ['placeholder','aria-label','title','data-module-label']) {
            const value = element.getAttribute(name)?.replace(/\\s+/g, ' ').trim();
            if (value) phrases.push(value);
          }
        });
        return [...new Set(phrases)];
      };
      select.value = 'en';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 80));
      const english = collect();
      const allowed = [
        /^BossAI Funding$/i,
        /^BOSSAI FUNDING$/,
        /^English$/,
        /^Español$/,
        /^Grants\\.gov$/i,
        /^Search Grants\\.gov$/i,
        /^MRR \\(\\$\\)$/,
        /^ARR \\(\\$\\)$/,
        /^Minimum DSCR$/i,
        /^LinkedIn URL$/i,
        /^API$/i,
        /^CSV$/i,
        /^Northstar Ventures$/,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        /^v\\d+$/i,
        /^DD$/,
        /^F$/,
        /^C$/,
        /^T$/,
        /^R$/,
        /^A$/,
        /^E$/,
      ];
      const results = {};
      for (const locale of ['zh-CN', 'zh-TW', 'es']) {
        select.value = locale;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 80));
        const localized = new Set(collect());
        const leaks = english.filter((phrase) => localized.has(phrase)
          && /[A-Za-z]{2,}/.test(phrase)
          && !allowed.some((pattern) => pattern.test(phrase)));
        results[locale] = { localizedCount: localized.size, leakCount: leaks.length, sample: leaks.slice(0, 12) };
      }
      return { englishCount: english.length, results };
    })()`);
    const leakingLocales = Object.entries(leakEvidence.results).filter(([, result]) => result.leakCount > 0);
    assert(leakingLocales.length === 0, "Every officially selectable non-English locale must eliminate unchanged translatable English phrases across the full owner DOM.", leakEvidence);
    console.log(`BOSSAI_FUNDING_LOCALE_LEAK_AUDIT ${JSON.stringify(leakEvidence)}`);
    console.log("BOSSAI_FUNDING_LOCALE_LEAK_AUDIT_PASS");
    return;
  }

  if (mode === "locale-acceptance") {
    const localeEvidence = await evaluate(`(async () => {
      const select = document.querySelector('#locale-select');
      if (!(select instanceof HTMLSelectElement)) throw new Error('Locale selector missing');
      const expected = {
        'zh-CN': { title: '融资指挥中心', nav: '融资计划', focus: '先建立公司融资档案', growth: '增长期', companyName: '公司名称', goal: '融资目标', strategy: '这笔资金应该怎么筹', opportunities: '判断哪些钱真正值得追' },
        'zh-TW': { title: '融資指揮中心', nav: '融資計畫', focus: '先建立公司融資檔案', growth: '成長期', companyName: '公司名稱', goal: '融資目標', strategy: '這筆資金應該怎麼籌', opportunities: '判斷哪些資金真正值得追' },
        en: { title: 'Capital Command Center', nav: 'Capital plan', focus: 'Create the company funding profile', growth: 'Growth', companyName: 'Company name', goal: 'Funding goal', strategy: 'How to fund the need', opportunities: 'Decide which money is actually worth pursuing' },
        es: { title: 'Centro de mando de financiación', nav: 'Plan de capital', focus: 'Crear el perfil de financiación de la empresa', growth: 'Crecimiento', companyName: 'Nombre de la empresa', goal: 'Objetivo de financiación', strategy: 'Cómo financiar la necesidad', opportunities: 'Decide qué capital realmente vale la pena perseguir' },
      };
      const results = {};
      for (const locale of ['zh-CN', 'zh-TW', 'en', 'es']) {
        select.value = locale;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 40));
        results[locale] = {
          htmlLang: document.documentElement.lang,
          selected: select.value,
          title: document.querySelector('.topbar h1')?.textContent?.trim() || '',
          nav: document.querySelector('.owner-nav [data-scroll="setup"]')?.textContent?.replace(/^01\\s*/, '').trim() || '',
          focus: document.querySelector('#focus-title')?.textContent?.trim() || '',
          growth: document.querySelector('#company-form select[name="stage"] option[value="growth"]')?.textContent?.trim() || '',
          companyName: document.querySelector('#company-form label')?.childNodes?.[0]?.textContent?.trim() || '',
          goal: document.querySelector('#goal-form h3')?.textContent?.trim() || '',
          strategy: document.querySelector('#strategy-heading')?.textContent?.trim() || '',
          opportunities: document.querySelector('#opportunities-heading')?.textContent?.trim() || '',
          stored: decodeURIComponent((document.cookie.split('; ').find((item) => item.startsWith('bossai-funding-locale=')) || '').split('=').slice(1).join('=')) || null,
          noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        };
      }
      select.value = 'zh-CN';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 40));
      return { expected, results };
    })()`);
    for (const [locale, expected] of Object.entries(localeEvidence.expected)) {
      const actual = localeEvidence.results[locale];
      assert(actual.htmlLang === locale && actual.selected === locale && actual.stored === locale, `Locale ${locale} must update document language, selector and saved UI preference.`, { locale, expected, actual });
      assert(actual.title === expected.title && actual.nav === expected.nav && actual.focus === expected.focus && actual.growth === expected.growth && actual.companyName === expected.companyName && actual.goal === expected.goal && actual.strategy === expected.strategy && actual.opportunities === expected.opportunities, `Locale ${locale} must translate the owner first-run forms and decision surfaces rather than only the language selector.`, { locale, expected, actual });
      assert(actual.noHorizontalOverflow, `Locale ${locale} must preserve bounded 390px layout.`, actual);
    }
    const localeScreenshot = await capture("owner-locale-zh-cn");
    await navigate(baseUrl);
    await sleep(250);
    const persisted = await evaluate(`(() => ({
      htmlLang: document.documentElement.lang,
      selected: document.querySelector('#locale-select')?.value || '',
      title: document.querySelector('.topbar h1')?.textContent?.trim() || '',
      focus: document.querySelector('#focus-title')?.textContent?.trim() || '',
      stored: decodeURIComponent((document.cookie.split('; ').find((item) => item.startsWith('bossai-funding-locale=')) || '').split('=').slice(1).join('=')) || null,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    }))()`);
    assert(persisted.htmlLang === 'zh-CN' && persisted.selected === 'zh-CN' && persisted.stored === 'zh-CN' && persisted.title === '融资指挥中心' && persisted.focus === '先建立公司融资档案' && persisted.noHorizontalOverflow, "Selected locale must survive a real page reload without becoming financing persistence state.", persisted);
    console.log(`BOSSAI_FUNDING_LOCALE_ACCEPTANCE ${JSON.stringify({ localeEvidence, persisted, screenshot: localeScreenshot })}`);
    console.log("BOSSAI_FUNDING_LOCALE_ACCEPTANCE_PASS");
    return;
  }

  if (mode === "mobile-owner-readiness") {
    const mobileOwnerReadiness = await evaluate(`(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const toast = document.querySelector('#toast');
      const setValue = (form, name, value) => {
        const node = form?.elements?.namedItem(name);
        if (!node) throw new Error('Missing field: ' + name);
        const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        setter?.call(node, value);
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const waitForToast = async (text) => {
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          if (String(toast?.textContent || '').includes(text)) return true;
          await sleep(80);
        }
        return false;
      };
      const visible = (selector) => {
        const node = document.querySelector(selector);
        const rect = node?.getBoundingClientRect();
        return Boolean(rect && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth);
      };
      const waitForVisible = async (selector) => {
        const deadline = Date.now() + 2800;
        while (Date.now() < deadline) {
          if (visible(selector)) return true;
          await sleep(60);
        }
        return visible(selector);
      };
      const waitForCondition = async (predicate) => {
        const deadline = Date.now() + 2800;
        while (Date.now() < deadline) {
          if (predicate()) return true;
          await sleep(60);
        }
        return Boolean(predicate());
      };

      const initialFocusTitle = document.querySelector('#focus-title')?.textContent?.trim() || '';
      document.querySelector('#focus-action')?.click();
      const companyVisible = await waitForVisible('#company-form');
      const company = document.querySelector('#company-form');
      const goal = document.querySelector('#goal-form');
      const firstStepExact = initialFocusTitle.includes('Create the company funding profile')
        && location.hash === '#company-form'
        && document.querySelector('#setup')?.getAttribute('data-module-open') === 'true'
        && companyVisible;

      const invalidBefore = company ? company.querySelectorAll(':invalid').length : 0;
      company?.requestSubmit();
      await sleep(100);
      const nativeValidationBlocks = invalidBefore >= 4 && !String(toast?.textContent || '').includes('Company funding profile saved.');

      setValue(company, 'name', 'BossAI Funding Mobile Acceptance Co');
      setValue(company, 'industry', 'AI software');
      setValue(company, 'geography', 'California, USA');
      setValue(company, 'targetFunding', '400000');
      setValue(company, 'useOfFunds', 'Validate the mobile owner journey without triggering external action.');
      company?.requestSubmit();
      const companySaved = await waitForToast('Company funding profile saved. Next: set the funding goal.');
      const goalVisibleAfterCompanySave = await waitForVisible('#goal-form');
      const companyAdvances = location.hash === '#goal-form' && goalVisibleAfterCompanySave;

      setValue(goal, 'targetAmount', '400000');
      setValue(goal, 'purpose', '');
      if (goal) goal.noValidate = true;
      goal?.requestSubmit();
      const validationRendered = await waitForCondition(() => String(goal?.querySelector('.form-recovery')?.textContent || '').includes('Not saved — your entries are still here')
        && Boolean(goal?.querySelector('[name="purpose"][aria-invalid="true"]')));
      const goalVisibleAfterValidation = await waitForVisible('#goal-form');
      const validationRecovery = validationRendered
        && location.hash === '#goal-form'
        && goalVisibleAfterValidation;
      if (goal) goal.noValidate = false;
      setValue(goal, 'purpose', 'Reach a measurable owner milestone with an auditable financing plan.');

      const latestBeforeStale = await fetch('/api/bootstrap').then((response) => response.json());
      const externalCompanyUpdate = await fetch('/api/company-profile', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-bossai-workspace-revision': String(latestBeforeStale.workspaceRevision),
        },
        body: JSON.stringify(latestBeforeStale.companyProfile),
      });
      goal?.requestSubmit();
      await sleep(180);
      const staleRecovery = externalCompanyUpdate.ok
        && String(goal?.querySelector('.form-recovery')?.textContent || '').includes('Changed elsewhere — your draft is still here')
        && document.querySelector('#refresh-workspace')?.hidden === false;
      const purposeBeforeRefresh = goal?.elements?.namedItem('purpose')?.value || '';
      document.querySelector('#refresh-workspace')?.click();
      const refreshToast = await waitForToast('Latest financing state loaded. Your unsaved draft was kept.');
      const goalVisibleAfterRefresh = await waitForVisible('#goal-form');
      const staleRefreshReturnsExact = refreshToast
        && location.hash === '#goal-form'
        && goalVisibleAfterRefresh
        && goal?.elements?.namedItem('purpose')?.value === purposeBeforeRefresh
        && String(goal?.querySelector('.form-recovery')?.textContent || '').includes('Continue this same step');

      goal?.requestSubmit();
      const goalSaved = await waitForToast('Funding goal saved. Next: calculate the capital strategy.');
      const strategyVisible = await waitForVisible('#strategy');
      const goalAdvances = location.hash === '#strategy'
        && document.querySelector('#strategy')?.getAttribute('data-module-open') === 'true'
        && strategyVisible
        && document.querySelector('#recalculate-strategy')?.textContent?.trim() === 'Calculate strategy';

      document.querySelector('#recalculate-strategy')?.click();
      const strategyReady = await waitForToast('Capital strategy ready. Next: find a funding target.');
      document.querySelector('#focus-action')?.click();
      const opportunitiesVisible = await waitForVisible('#opportunities');
      const findMoneyExact = strategyReady
        && location.hash === '#opportunities'
        && document.querySelector('#opportunities')?.getAttribute('data-module-open') === 'true'
        && opportunitiesVisible;

      const noHorizontalOverflow = document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1;
      return {
        firstStepExact,
        nativeValidationBlocks,
        companySaved,
        companyAdvances,
        validationRecovery,
        staleRecovery,
        staleRefreshReturnsExact,
        goalSaved,
        goalAdvances,
        strategyReady,
        findMoneyExact,
        noHorizontalOverflow,
        finalHash: location.hash,
      };
    })()`);
    const mobileOwnerScreenshot = await capture("owner-mobile-readiness");
    assertVisual(await probe(), mobileOwnerScreenshot, "Funding mobile owner readiness");
    assert(
      mobileOwnerReadiness.firstStepExact
        && mobileOwnerReadiness.nativeValidationBlocks
        && mobileOwnerReadiness.companySaved
        && mobileOwnerReadiness.companyAdvances
        && mobileOwnerReadiness.validationRecovery
        && mobileOwnerReadiness.staleRecovery
        && mobileOwnerReadiness.staleRefreshReturnsExact
        && mobileOwnerReadiness.goalSaved
        && mobileOwnerReadiness.goalAdvances
        && mobileOwnerReadiness.strategyReady
        && mobileOwnerReadiness.findMoneyExact
        && mobileOwnerReadiness.noHorizontalOverflow,
      "390×844 owner readiness must complete the empty-workspace path, validation recovery and stale-refresh recovery without losing exact-step context.",
      mobileOwnerReadiness,
    );
    console.log(`BOSSAI_FUNDING_MOBILE_OWNER_READINESS ${JSON.stringify({ mobile, mobileOwnerReadiness, screenshot: mobileOwnerScreenshot })}`);
    console.log("BOSSAI_FUNDING_MOBILE_OWNER_READINESS_PASS");
    return;
  }

  await setViewport(1440, 860);
  const beforeReload = await evaluate(`(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const company = document.querySelector('#company-form');
    const goal = document.querySelector('#goal-form');
    const toast = document.querySelector('#toast');
    const setValue = (form, name, value) => {
      const node = form?.elements?.namedItem(name);
      if (!node) throw new Error('Missing field: ' + name);
      const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter?.call(node, value);
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const waitForToast = async (text) => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if (String(toast?.textContent || '').includes(text)) return true;
        await sleep(80);
      }
      return false;
    };

    const decisionDetails = document.querySelector('#decision-details');
    document.querySelector('#owner-snapshot-blocker-action')?.click();
    await sleep(80);
    const blockerSnapshotOpensDecisionDetail = decisionDetails?.getAttribute('data-module-open') === 'true' && location.hash === '#blockers';
    document.querySelector('#owner-snapshot-timing-action')?.click();
    await sleep(80);
    const timingSnapshotOpensDecisionDetail = decisionDetails?.getAttribute('data-module-open') === 'true' && location.hash === '#timing';
    document.querySelector('#owner-snapshot-track-action')?.click();
    await sleep(80);
    const trackSnapshotOpensDecisionDetail = decisionDetails?.getAttribute('data-module-open') === 'true' && location.hash === '#tracks';

    const initialFocusTitle = document.querySelector('#focus-title')?.textContent?.trim() || '';
    document.querySelector('#focus-action')?.click();
    await sleep(120);
    const firstRunFocusOpensCompanyForm = initialFocusTitle.includes('Create the company funding profile')
      && location.hash === '#company-form'
      && document.querySelector('#setup')?.getAttribute('data-module-open') === 'true'
      && Boolean(document.querySelector('#company-form')?.getBoundingClientRect().height);

    const setupNav = document.querySelector('.owner-nav [data-scroll="setup"]');
    setupNav?.click();
    await sleep(120);
    const setupModule = document.querySelector('#setup');
    const setupOpenThroughNav = setupModule?.getAttribute('data-module-open') === 'true';
    const onlySetupOpenThroughNav = [...document.querySelectorAll('[data-progressive-module]')].filter((module) => module.getAttribute('data-module-open') === 'true').map((module) => module.id).join(',') === 'setup';

    const invalidFieldCount = company ? company.querySelectorAll(':invalid').length : 0;
    const nativeRequiredBlocked = Boolean(company) && company.checkValidity() === false && invalidFieldCount >= 4;
    company?.requestSubmit();
    await sleep(120);
    const invalidSubmitDidNotMutate = !String(toast?.textContent || '').includes('Company funding profile saved.');

    setValue(company, 'name', 'BossAI Funding L5 Acceptance Co');
    setValue(company, 'industry', 'AI software');
    setValue(company, 'stage', 'growth');
    setValue(company, 'geography', 'California, USA');
    setValue(company, 'annualRevenue', '2400000');
    setValue(company, 'cashBalance', '500000');
    setValue(company, 'monthlyBurn', '80000');
    setValue(company, 'runwayMonths', '6.2');
    setValue(company, 'targetFunding', '750000');
    setValue(company, 'product', 'Owner-facing financing workspace');
    setValue(company, 'businessModel', 'B2B software');
    setValue(company, 'useOfFunds', 'Extend runway and fund customer acquisition without triggering any external action.');
    const companyInvalidAfterFill = company ? [...company.querySelectorAll(':invalid')].map((node) => node.getAttribute('name') || node.tagName) : [];
    const companyValidAfterFill = Boolean(company?.checkValidity());
    company?.requestSubmit();
    const companySavedToast = await waitForToast('Company funding profile saved. Next: set the funding goal.');
    const companySavedInUi = company?.elements?.namedItem('name')?.value === 'BossAI Funding L5 Acceptance Co';
    const companyErrorText = [...(company?.querySelectorAll('.field-error') || [])].map((node) => node.textContent?.trim() || '').filter(Boolean).join(' | ') || (!companySavedToast ? String(toast?.textContent || '').trim() : '');
    const companySaveAdvancesToGoal = location.hash === '#goal-form'
      && document.querySelector('#setup')?.getAttribute('data-module-open') === 'true'
      && String(document.querySelector('#focus-title')?.textContent || '').includes('Set the funding target');

    setValue(goal, 'targetAmount', '750000');
    setValue(goal, 'purpose', '');
    setValue(goal, 'maxMonthlyDebtService', '25000');
    setValue(goal, 'growthPlan', 'Use capital only against measurable owner milestones.');
    if (goal) goal.noValidate = true;
    goal?.requestSubmit();
    await sleep(160);
    const goalFailureRecoveryVisible = String(goal?.querySelector('.form-recovery')?.textContent || '').includes('Not saved — your entries are still here')
      && String(goal?.querySelector('.form-recovery')?.textContent || '').includes('Save funding goal again');
    const goalFailureFieldVisible = Boolean(goal?.querySelector('[name="purpose"][aria-invalid="true"]'))
      && String(goal?.querySelector('.field-error')?.textContent || '').toLowerCase().includes('purpose is required');
    const goalFailureKeepsStep = location.hash === '#goal-form'
      && document.querySelector('#setup')?.getAttribute('data-module-open') === 'true'
      && goal?.elements?.namedItem('targetAmount')?.value === '750000';
    if (goal) goal.noValidate = false;
    setValue(goal, 'purpose', 'Reach the next revenue milestone with an auditable financing plan.');

    const latestBeforeStale = await fetch('/api/bootstrap').then((response) => response.json());
    const externalCompanyUpdate = await fetch('/api/company-profile', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-bossai-workspace-revision': String(latestBeforeStale.workspaceRevision),
      },
      body: JSON.stringify(latestBeforeStale.companyProfile),
    });
    const externalMutationAdvancedRevision = externalCompanyUpdate.ok;
    goal?.requestSubmit();
    await sleep(180);
    const staleRecoveryVisible = String(goal?.querySelector('.form-recovery')?.textContent || '').includes('Changed elsewhere — your draft is still here')
      && String(goal?.querySelector('.form-recovery')?.textContent || '').includes('Refresh latest — keep draft');
    const staleRefreshAvailable = document.querySelector('#refresh-workspace')?.hidden === false;
    const staleDraftBeforeRefresh = goal?.elements?.namedItem('purpose')?.value || '';
    document.querySelector('#refresh-workspace')?.click();
    const staleRefreshToast = await waitForToast('Latest financing state loaded. Your unsaved draft was kept.');
    await sleep(100);
    const staleRefreshReturnsToGoal = location.hash === '#goal-form'
      && document.querySelector('#setup')?.getAttribute('data-module-open') === 'true'
      && String(goal?.querySelector('.form-recovery')?.textContent || '').includes('Latest state loaded — your draft is still here')
      && String(goal?.querySelector('.form-recovery')?.textContent || '').includes('Continue this same step');
    const staleRefreshPreservedDraft = goal?.elements?.namedItem('purpose')?.value === staleDraftBeforeRefresh;

    const dilution = goal?.elements?.namedItem('acceptsDilution');
    if (dilution instanceof HTMLInputElement) {
      dilution.checked = false;
      dilution.dispatchEvent(new Event('change', { bubbles: true }));
    }
    goal?.requestSubmit();
    const goalSavedToast = await waitForToast('Funding goal saved. Next: calculate the capital strategy.');
    const goalSavedInUi = goal?.elements?.namedItem('targetAmount')?.value === '750000';
    const goalSaveAdvancesToStrategy = location.hash === '#strategy'
      && document.querySelector('#strategy')?.getAttribute('data-module-open') === 'true'
      && String(document.querySelector('#focus-title')?.textContent || '').includes('capital strategy')
      && document.querySelector('#recalculate-strategy')?.textContent?.trim() === 'Calculate strategy';

    document.querySelector('#recalculate-strategy')?.click();
    const firstStrategyToast = await waitForToast('Capital strategy ready. Next: find a funding target.');
    const strategyCreatesFindMoneyFocus = firstStrategyToast
      && String(document.querySelector('#focus-title')?.textContent || '').includes('Find the first funding target');
    document.querySelector('#focus-action')?.click();
    await sleep(120);
    const findMoneyFocusOpensOpportunities = location.hash === '#opportunities'
      && document.querySelector('#opportunities')?.getAttribute('data-module-open') === 'true';

    setupNav?.click();
    await sleep(100);
    setValue(company, 'product', 'Unsaved disclosure draft — keep me');
    const setupToggle = setupModule?.querySelector('.workspace-module-toggle');
    setupToggle?.click();
    await sleep(80);
    const setupClosedWithDraft = setupModule?.getAttribute('data-module-open') !== 'true';
    const draftWhileCollapsed = company?.elements?.namedItem('product')?.value || '';
    document.querySelector('#refresh-workspace')?.click();
    const refreshKeptDraftToast = await waitForToast('Latest financing state loaded. Your unsaved draft was kept.');
    const draftAfterRefreshWhileCollapsed = company?.elements?.namedItem('product')?.value || '';
    setupNav?.click();
    await sleep(100);
    const draftAfterReopen = company?.elements?.namedItem('product')?.value || '';
    const draftPreservedAcrossDisclosureAndRefresh = setupClosedWithDraft
      && draftWhileCollapsed === 'Unsaved disclosure draft — keep me'
      && draftAfterRefreshWhileCollapsed === draftWhileCollapsed
      && draftAfterReopen === draftWhileCollapsed;

    window.scrollTo(0, Math.max(0, (setupModule?.offsetTop || 0) + (setupModule?.scrollHeight || 0) - window.innerHeight / 2));
    await sleep(120);
    const returnControl = document.querySelector('#return-to-overview');
    const returnRect = returnControl?.getBoundingClientRect();
    const desktopReturnVisibleDeep = Boolean(returnControl && !returnControl.hidden && returnRect && returnRect.top >= 0 && returnRect.bottom <= window.innerHeight);
    const desktopContextNamesSetup = String(returnControl?.textContent || '').startsWith('Capital plan ·');
    const desktopContextShowsUnsavedDraft = returnControl?.dataset?.hasDraft === 'true' && String(returnControl?.textContent || '').includes('Unsaved draft');
    const setupNavCurrent = setupNav?.getAttribute('aria-current') === 'step';
    returnControl?.click();
    const overviewDeadline = Date.now() + 1800;
    let overviewRect = document.querySelector('.hero-grid')?.getBoundingClientRect();
    while (Date.now() < overviewDeadline && overviewRect && !(overviewRect.bottom > 0 && overviewRect.top < window.innerHeight)) {
      await sleep(60);
      overviewRect = document.querySelector('.hero-grid')?.getBoundingClientRect();
    }
    await sleep(80);
    const desktopReturnDraftToast = await waitForToast('Capital plan draft kept. Reopen Capital plan to continue.');
    const desktopReturnPreservedDraft = company?.elements?.namedItem('product')?.value === draftWhileCollapsed;
    const desktopReturnClosedModules = [...document.querySelectorAll('[data-progressive-module]')].every((module) => module.getAttribute('data-module-open') !== 'true');
    const desktopReturnHashCleared = location.hash === '';
    const desktopReturnHeroVisible = Boolean(overviewRect && overviewRect.bottom > 0 && overviewRect.top < window.innerHeight);
    const desktopReturnFocusRestored = document.activeElement?.id === 'focus-action';

    const actionNav = document.querySelector('.owner-nav [data-scroll="actions"]');
    actionNav?.click();
    await sleep(100);
    const actionModule = document.querySelector('#actions');
    const action = document.querySelector('#action-form');
    setValue(action, 'track', 'grant');
    setValue(action, 'title', 'Acceptance deadline action');
    setValue(action, 'amount', '125000');
    setValue(action, 'stage', 'prepare');
    setValue(action, 'priority', 'critical');
    setValue(action, 'deadline', new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    setValue(action, 'nextStep', 'Complete the owner-priority financing package.');
    setValue(action, 'owner', 'Owner');
    action?.requestSubmit();
    const actionSavedToast = await waitForToast('Financing action added. Dashboard updated.');
    const crossWorkspaceSavePreservedDraft = company?.elements?.namedItem('product')?.value === draftWhileCollapsed;
    const actionItem = document.querySelector('[id^="funding-action-"]');
    const exactActionId = actionItem?.id || '';
    const focusTitleBeforeExactNavigation = document.querySelector('#focus-title')?.textContent?.trim() || '';
    const focusButton = document.querySelector('#focus-action');
    const todaysFocusTargetsExactAction = Boolean(exactActionId)
      && focusTitleBeforeExactNavigation.includes('Acceptance deadline action')
      && String(focusButton?.textContent || '').includes('Open this item');
    actionModule?.querySelector('.workspace-module-toggle')?.click();
    await sleep(80);
    const exactActionHiddenBeforeFocus = Boolean(actionItem && actionItem.getBoundingClientRect().height === 0);
    focusButton?.click();
    const focusDeadline = Date.now() + 2500;
    let exactActionRect = actionItem?.getBoundingClientRect();
    while (Date.now() < focusDeadline && exactActionRect && !(exactActionRect.bottom > 0 && exactActionRect.top < window.innerHeight)) {
      await sleep(80);
      exactActionRect = actionItem?.getBoundingClientRect();
    }
    const exactFocusOpenedModule = actionModule?.getAttribute('data-module-open') === 'true';
    const exactFocusHash = location.hash;
    const exactFocusTargetVisible = Boolean(exactActionRect && exactActionRect.bottom > 0 && exactActionRect.top < window.innerHeight);

    const nav = document.querySelector('.owner-nav [data-scroll="opportunities"]');
    nav?.click();
    const opportunities = document.querySelector('#opportunities');
    const deadline = Date.now() + 2500;
    let targetRect = opportunities?.getBoundingClientRect();
    while (Date.now() < deadline && targetRect && !(targetRect.bottom > 0 && targetRect.top < window.innerHeight)) {
      await sleep(80);
      targetRect = opportunities?.getBoundingClientRect();
    }
    const opportunitiesOpenThroughNav = opportunities?.getAttribute('data-module-open') === 'true';
    const onlyOpportunitiesOpenThroughNav = [...document.querySelectorAll('[data-progressive-module]')].filter((module) => module.getAttribute('data-module-open') === 'true').map((module) => module.id).join(',') === 'opportunities';
    return {
      blockerSnapshotOpensDecisionDetail,
      timingSnapshotOpensDecisionDetail,
      trackSnapshotOpensDecisionDetail,
      firstRunFocusOpensCompanyForm,
      setupOpenThroughNav,
      onlySetupOpenThroughNav,
      nativeRequiredBlocked,
      invalidFieldCount,
      invalidSubmitDidNotMutate,
      companySavedToast,
      companySavedInUi,
      companySaveAdvancesToGoal,
      companyErrorText,
      companyValidAfterFill,
      companyInvalidAfterFill,
      goalFailureRecoveryVisible,
      goalFailureFieldVisible,
      goalFailureKeepsStep,
      externalMutationAdvancedRevision,
      staleRecoveryVisible,
      staleRefreshAvailable,
      staleRefreshToast,
      staleRefreshReturnsToGoal,
      staleRefreshPreservedDraft,
      goalSavedToast,
      goalSavedInUi,
      goalSaveAdvancesToStrategy,
      firstStrategyToast,
      strategyCreatesFindMoneyFocus,
      findMoneyFocusOpensOpportunities,
      refreshKeptDraftToast,
      draftPreservedAcrossDisclosureAndRefresh,
      desktopReturnVisibleDeep,
      desktopContextNamesSetup,
      desktopContextShowsUnsavedDraft,
      setupNavCurrent,
      desktopReturnDraftToast,
      desktopReturnPreservedDraft,
      desktopReturnClosedModules,
      desktopReturnHashCleared,
      desktopReturnHeroVisible,
      desktopReturnFocusRestored,
      actionSavedToast,
      crossWorkspaceSavePreservedDraft,
      exactActionId,
      todaysFocusTargetsExactAction,
      exactActionHiddenBeforeFocus,
      exactFocusOpenedModule,
      exactFocusHash,
      exactFocusTargetVisible,
      opportunitiesOpenThroughNav,
      onlyOpportunitiesOpenThroughNav,
      navigationHash: location.hash,
      navigationTargetVisible: Boolean(targetRect && targetRect.bottom > 0 && targetRect.top < window.innerHeight),
      navigationScrollY: window.scrollY,
      navigationTargetRect: targetRect ? { top:targetRect.top, bottom:targetRect.bottom, height:targetRect.height } : null,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    };
  })()`);

  await navigate(`${baseUrl}/#opportunities`);
  await sleep(500);
  const afterReload = await evaluate(`(() => {
    const company = document.querySelector('#company-form');
    const goal = document.querySelector('#goal-form');
    const saveState = document.querySelector('#save-state');
    return {
      companyName: company?.elements?.namedItem('name')?.value || '',
      industry: company?.elements?.namedItem('industry')?.value || '',
      geography: company?.elements?.namedItem('geography')?.value || '',
      useOfFunds: company?.elements?.namedItem('useOfFunds')?.value || '',
      targetAmount: goal?.elements?.namedItem('targetAmount')?.value || '',
      purpose: goal?.elements?.namedItem('purpose')?.value || '',
      acceptsDilution: goal?.elements?.namedItem('acceptsDilution')?.checked,
      connectionText: saveState?.textContent?.trim() || '',
      connectionColor: saveState ? getComputedStyle(saveState).color : '',
      navigationHash: location.hash,
      navigationTargetRect: (() => { const r=document.querySelector('#opportunities')?.getBoundingClientRect(); return r ? {top:r.top,bottom:r.bottom,height:r.height} : null; })(),
      navigationTargetVisible: (() => { const r=document.querySelector('#opportunities')?.getBoundingClientRect(); return Boolean(r && r.bottom > 0 && r.top < window.innerHeight); })(),
      opportunitiesModuleOpen: document.querySelector('#opportunities')?.getAttribute('data-module-open') === 'true',
      onlyOpportunitiesModuleOpen: [...document.querySelectorAll('[data-progressive-module]')].filter((module) => module.getAttribute('data-module-open') === 'true').map((module) => module.id).join(',') === 'opportunities',
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    };
  })()`);
  await navigate(`${baseUrl}/#${encodeURIComponent(beforeReload.exactActionId)}`);
  await sleep(500);
  const exactHashReload = await evaluate(`(() => {
    const target = document.getElementById(${JSON.stringify(beforeReload.exactActionId)});
    const rect = target?.getBoundingClientRect();
    return {
      navigationHash: location.hash,
      actionsModuleOpen: document.querySelector('#actions')?.getAttribute('data-module-open') === 'true',
      onlyActionsModuleOpen: [...document.querySelectorAll('[data-progressive-module]')].filter((module) => module.getAttribute('data-module-open') === 'true').map((module) => module.id).join(',') === 'actions',
      targetVisible: Boolean(rect && rect.bottom > 0 && rect.top < window.innerHeight),
      targetRect: rect ? { top:rect.top,bottom:rect.bottom,height:rect.height } : null,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    };
  })()`);
  const interaction = { beforeReload, afterReload, exactHashReload };

  assert(interaction.beforeReload.blockerSnapshotOpensDecisionDetail && interaction.beforeReload.timingSnapshotOpensDecisionDetail && interaction.beforeReload.trackSnapshotOpensDecisionDetail, "Owner first-view blocker, timing and track summaries must open the existing detailed evidence workspace rather than becoming a second financing truth surface.", interaction);
  assert(interaction.beforeReload.firstRunFocusOpensCompanyForm, "Empty-workspace Today’s Focus must open the exact Company funding profile form rather than dropping the owner at the top of a long setup workspace.", interaction);
  assert(interaction.beforeReload.setupOpenThroughNav && interaction.beforeReload.onlySetupOpenThroughNav, "Owner navigation must open the Capital plan workspace in one step without expanding unrelated professional modules.", interaction);
  assert(interaction.beforeReload.nativeRequiredBlocked && interaction.beforeReload.invalidSubmitDidNotMutate, "L5 native required-field validation must block an incomplete company profile without mutating financing state.", interaction);
  assert(interaction.beforeReload.companySavedToast && interaction.beforeReload.companySavedInUi && interaction.beforeReload.companySaveAdvancesToGoal, "First-run company-profile save must persist and advance to the exact Funding Goal form with Today’s Focus updated to that same next step.", interaction);
  assert(interaction.beforeReload.goalFailureRecoveryVisible && interaction.beforeReload.goalFailureFieldVisible && interaction.beforeReload.goalFailureKeepsStep, "A server-rejected first-run Funding Goal must stay on the exact step, keep entered values, and present persistent owner-readable recovery guidance instead of relying on a transient toast.", interaction);
  assert(interaction.beforeReload.externalMutationAdvancedRevision && interaction.beforeReload.staleRecoveryVisible && interaction.beforeReload.staleRefreshAvailable && interaction.beforeReload.staleRefreshToast && interaction.beforeReload.staleRefreshReturnsToGoal && interaction.beforeReload.staleRefreshPreservedDraft, "When the first-run Funding Goal becomes stale because financing state changed elsewhere, Refresh latest — keep draft must preserve the draft and return the owner to the exact same goal step with explicit continuation guidance.", interaction);
  assert(interaction.beforeReload.goalSavedToast && interaction.beforeReload.goalSavedInUi && interaction.beforeReload.goalSaveAdvancesToStrategy, "After correcting and refreshing the rejected Funding Goal, the owner must be able to save the same retained draft and advance to Capital Strategy without skipping the incomplete planning step.", interaction);
  assert(interaction.beforeReload.firstStrategyToast && interaction.beforeReload.strategyCreatesFindMoneyFocus && interaction.beforeReload.findMoneyFocusOpensOpportunities, "After first strategy calculation, Today’s Focus must advance to Find money and open that workspace instead of prematurely directing the owner to generic execution.", interaction);
  assert(interaction.beforeReload.refreshKeptDraftToast && interaction.beforeReload.draftPreservedAcrossDisclosureAndRefresh, "Collapsing a professional workspace and refreshing latest state must preserve the owner's unsaved draft.", interaction);
  assert(interaction.beforeReload.desktopReturnVisibleDeep && interaction.beforeReload.desktopContextNamesSetup && interaction.beforeReload.desktopContextShowsUnsavedDraft && interaction.beforeReload.setupNavCurrent && interaction.beforeReload.desktopReturnDraftToast && interaction.beforeReload.desktopReturnPreservedDraft && interaction.beforeReload.desktopReturnClosedModules && interaction.beforeReload.desktopReturnHashCleared && interaction.beforeReload.desktopReturnHeroVisible && interaction.beforeReload.desktopReturnFocusRestored, "Desktop owner must see the current Capital plan context plus its unsaved-draft state, then return in one step with an explicit kept-draft notice and focus restored to Today’s Focus.", interaction);
  assert(interaction.beforeReload.actionSavedToast && interaction.beforeReload.crossWorkspaceSavePreservedDraft, "Saving work in another professional workspace must not silently erase a previously kept Capital plan draft.", interaction);
  assert(interaction.beforeReload.actionSavedToast && interaction.beforeReload.todaysFocusTargetsExactAction, "A near-deadline financing action must become an exact Today’s Focus target in the real browser journey.", interaction);
  assert(interaction.beforeReload.exactActionHiddenBeforeFocus && interaction.beforeReload.exactFocusOpenedModule && interaction.beforeReload.exactFocusTargetVisible && interaction.beforeReload.exactFocusHash === `#${interaction.beforeReload.exactActionId}`, "Today’s Focus exact-item navigation must reopen the containing collapsed workspace and expose the targeted financing item.", interaction);
  assert(interaction.beforeReload.opportunitiesOpenThroughNav && interaction.beforeReload.onlyOpportunitiesOpenThroughNav && interaction.beforeReload.navigationHash === "#opportunities", "Owner navigation must open the requested professional workspace in one step and collapse the previously opened module.", interaction);
  assert(interaction.beforeReload.noHorizontalOverflow && interaction.afterReload.noHorizontalOverflow, "L5 interaction flow must preserve bounded page geometry.", interaction);
  assert(["Connected", "Saved"].includes(interaction.afterReload.connectionText) && interaction.afterReload.connectionColor === "rgb(23, 107, 77)", "L5 reload must reconnect to the isolated local funding server without entering the Offline/error state.", interaction);
  assert(interaction.afterReload.navigationHash === "#opportunities" && interaction.afterReload.navigationTargetVisible && interaction.afterReload.opportunitiesModuleOpen && interaction.afterReload.onlyOpportunitiesModuleOpen, "L5 hash-based return must restore and reopen the opportunities workspace section without expanding unrelated modules.", interaction);
  assert(interaction.exactHashReload.navigationHash === `#${interaction.beforeReload.exactActionId}` && interaction.exactHashReload.actionsModuleOpen && interaction.exactHashReload.onlyActionsModuleOpen && interaction.exactHashReload.targetVisible, "Exact-item hash reload must reopen the containing professional workspace and restore the financing item into view.", interaction);
  assert(interaction.beforeReload.noHorizontalOverflow && interaction.afterReload.noHorizontalOverflow && interaction.exactHashReload.noHorizontalOverflow, "Progressive-disclosure navigation and hash restoration must preserve bounded page geometry.", interaction);
  assert(interaction.afterReload.companyName === "BossAI Funding L5 Acceptance Co" && interaction.afterReload.industry === "AI software" && interaction.afterReload.geography === "California, USA", "L5 company profile must persist through server reload.", interaction);
  assert(interaction.afterReload.useOfFunds.includes("without triggering any external action"), "L5 use-of-funds truth must persist through server reload.", interaction);
  assert(interaction.afterReload.targetAmount === "750000" && interaction.afterReload.purpose.includes("auditable financing plan") && interaction.afterReload.acceptsDilution === false, "L5 funding goal and dilution preference must persist through server reload.", interaction);

  console.log(`BOSSAI_FUNDING_UI_ACCEPTANCE ${JSON.stringify({ desktop, mobile, interaction })}`);
  console.log("BOSSAI_FUNDING_UI_ACCEPTANCE_PASS");
}

main()
  .then(cleanup)
  .catch(async (error) => {
    console.error(error.stack || error);
    await cleanup();
    process.exit(1);
  });
