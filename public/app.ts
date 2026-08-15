type Track = "grant" | "debt" | "equity";

interface TrackSummary {
  track: Track;
  potentialAmountCents: number;
  activeCount: number;
  latestAction: string;
  risk: string;
  nextStep: string;
}

interface TodayFocus {
  title: string;
  reason: string;
  nextStep: string;
  urgency: string;
  track: Track | null;
  actionId: number | null;
}

interface FundingAction {
  id: number;
  track: Track;
  title: string;
  amountCents: number;
  stage: string;
  priority: string;
  deadline: string | null;
  nextStep: string;
  owner: string;
  result: string;
  updatedAt: string;
}

interface StrategyAllocation {
  track: Track;
  amountCents: number;
  sharePct: number;
  reason: string;
  primaryRisk: string;
  order: number;
}

interface CapitalStrategy {
  allocations: StrategyAllocation[];
  unfundedResidualCents: number;
  assumptions: string[];
  warnings: string[];
}

interface CompanyProfile {
  name: string;
  industry: string;
  stage: string;
  geography: string;
  foundedYear: number | null;
  annualRevenueCents: number;
  mrrCents: number;
  arrCents: number;
  growthRatePct: number;
  grossMarginPct: number;
  cashBalanceCents: number;
  monthlyBurnCents: number;
  runwayMonths: number;
  teamSize: number;
  product: string;
  businessModel: string;
  fundingHistory: string;
  existingDebtCents: number;
  capTableSummary: string;
  useOfFunds: string;
  targetFundingCents: number;
  targetFundingDate: string | null;
}

interface FundingGoal {
  targetAmountCents: number;
  needByDate: string | null;
  purpose: string;
  acceptsDilution: boolean;
  maxMonthlyDebtServiceCents: number;
  growthPlan: string;
}

interface Dashboard {
  targetAmountCents: number;
  receivedAmountCents: number;
  committedAmountCents: number;
  activePipelineCents: number;
  remainingGapCents: number;
  tracks: TrackSummary[];
  todayFocus: TodayFocus;
}

interface BootstrapState {
  companyProfile: CompanyProfile | null;
  fundingGoal: FundingGoal | null;
  rounds: unknown[];
  actions: FundingAction[];
  strategy: CapitalStrategy | null;
  dashboard: Dashboard;
}

let state: BootstrapState | null = null;
let toastTimer: number | null = null;

function element<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing UI element: ${selector}`);
  return found;
}

function form(name: string): HTMLFormElement {
  return element<HTMLFormElement>(`#${name}`);
}

function field(target: HTMLFormElement, name: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const control = target.elements.namedItem(name);
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)) {
    throw new Error(`Missing form field: ${name}`);
  }
  return control;
}

function value(target: HTMLFormElement, name: string): string {
  return field(target, name).value.trim();
}

function numberValue(target: HTMLFormElement, name: string): number {
  const parsed = Number(field(target, name).value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cents(target: HTMLFormElement, name: string): number {
  return Math.max(0, Math.round(numberValue(target, name) * 100));
}

function dollars(centsValue: number): number {
  return Math.round(centsValue / 100);
}

function nullableDate(target: HTMLFormElement, name: string): string | null {
  return value(target, name) || null;
}

function optionalMoney(target: HTMLFormElement, name: string): number | null {
  const raw = value(target, name);
  return raw ? cents(target, name) : null;
}

function money(centsValue: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(centsValue / 100);
}

function showToast(message: string): void {
  const toast = element<HTMLDivElement>("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function setConnection(text: string, error = false): void {
  const badge = element<HTMLSpanElement>("#save-state");
  badge.textContent = text;
  badge.style.color = error ? "#a13b2f" : "#176b4d";
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  setConnection("Saving…");
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    setConnection("Needs attention", true);
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }
  setConnection("Saved");
  return payload;
}

function text(id: string, content: string): void {
  element<HTMLElement>(`#${id}`).textContent = content;
}

function renderDashboard(data: Dashboard): void {
  text("remaining-gap", money(data.remainingGapCents));
  text("target-amount", money(data.targetAmountCents));
  text("received-amount", money(data.receivedAmountCents));
  text("committed-amount", money(data.committedAmountCents));
  text("pipeline-amount", money(data.activePipelineCents));

  const funded = data.receivedAmountCents + data.committedAmountCents;
  const progress = data.targetAmountCents > 0 ? Math.min(100, (funded / data.targetAmountCents) * 100) : 0;
  element<HTMLElement>("#capital-progress").style.width = `${progress}%`;

  text("focus-title", data.todayFocus.title);
  text("focus-reason", data.todayFocus.reason);
  text("focus-next-step", data.todayFocus.nextStep);
  text("focus-urgency", data.todayFocus.urgency.toUpperCase());

  const focusButton = element<HTMLButtonElement>("#focus-action");
  focusButton.onclick = () => {
    const target = data.todayFocus.actionId ? "actions" : data.todayFocus.title.toLowerCase().includes("strategy") ? "strategy" : "setup";
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const trackGrid = element<HTMLDivElement>("#track-grid");
  trackGrid.replaceChildren(
    ...data.tracks.map((track) => {
      const card = document.createElement("article");
      card.className = "track-card";
      card.innerHTML = `
        <div class="track-head">
          <div class="track-name"><span class="track-dot"></span>${track.track}</div>
          <span class="tag">${track.activeCount} active</span>
        </div>
        <div class="track-amount">${money(track.potentialAmountCents)}</div>
        <div class="track-count">potential capital currently in motion</div>
        <div class="track-detail">
          <div><span>Latest</span><strong>${escapeHtml(track.latestAction)}</strong></div>
          <div><span>Risk</span><strong>${escapeHtml(track.risk)}</strong></div>
          <div><span>Next</span><strong>${escapeHtml(track.nextStep)}</strong></div>
        </div>`;
      return card;
    }),
  );
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>'"]/g, (character) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
    return map[character] ?? character;
  });
}

function renderStrategy(strategy: CapitalStrategy | null): void {
  const empty = element<HTMLDivElement>("#strategy-empty");
  const content = element<HTMLDivElement>("#strategy-content");
  if (!strategy) {
    empty.classList.remove("hidden");
    content.classList.add("hidden");
    return;
  }
  empty.classList.add("hidden");
  content.classList.remove("hidden");

  const bars = element<HTMLDivElement>("#strategy-bars");
  bars.replaceChildren(
    ...strategy.allocations
      .sort((a, b) => a.order - b.order)
      .map((allocation) => {
        const item = document.createElement("article");
        item.className = "strategy-bar";
        item.innerHTML = `
          <div class="track-name"><span class="track-dot"></span>${allocation.track}</div>
          <div class="amount">${money(allocation.amountCents)}</div>
          <div class="share">${allocation.sharePct}% of stated need</div>
          <p>${escapeHtml(allocation.reason)}</p>
          <p class="risk"><strong>Risk:</strong> ${escapeHtml(allocation.primaryRisk)}</p>`;
        return item;
      }),
  );

  if (strategy.unfundedResidualCents > 0) {
    const residual = document.createElement("article");
    residual.className = "strategy-bar";
    residual.innerHTML = `<div class="track-name">Unfunded residual</div><div class="amount">${money(strategy.unfundedResidualCents)}</div><p>Current constraints do not cover the full target.</p>`;
    bars.append(residual);
  }

  renderList("#strategy-assumptions", strategy.assumptions);
  renderList("#strategy-warnings", strategy.warnings.length ? strategy.warnings : ["No additional warning generated by the current rule set."]);
}

function renderList(selector: string, items: string[]): void {
  const list = element<HTMLUListElement>(selector);
  list.replaceChildren(...items.map((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    return li;
  }));
}

function renderActions(actions: FundingAction[]): void {
  text("action-count", `${actions.length} item${actions.length === 1 ? "" : "s"}`);
  const list = element<HTMLDivElement>("#action-list");
  if (actions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "No financing actions yet. Create one concrete next move on Grant, Debt or Equity.";
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(...actions.map((action) => {
    const item = document.createElement("article");
    item.className = "action-item";
    item.id = `action-${action.id}`;
    item.innerHTML = `
      <div class="action-top">
        <div>
          <div class="action-title">${escapeHtml(action.title)}</div>
          <div class="action-tags">
            <span class="tag">${action.track}</span><span class="tag">${escapeHtml(action.stage)}</span><span class="tag">${escapeHtml(action.priority)}</span>
            ${action.deadline ? `<span class="tag">due ${escapeHtml(action.deadline)}</span>` : ""}
          </div>
        </div>
        <strong>${money(action.amountCents)}</strong>
      </div>
      <div class="action-next"><span>Next step</span><strong>${escapeHtml(action.nextStep)}</strong></div>`;
    return item;
  }));
}

function fillCompany(profile: CompanyProfile | null): void {
  if (!profile) return;
  const target = form("company-form");
  const values: Record<string, string> = {
    name: profile.name,
    industry: profile.industry,
    stage: profile.stage,
    geography: profile.geography,
    foundedYear: profile.foundedYear?.toString() ?? "",
    teamSize: profile.teamSize.toString(),
    annualRevenue: dollars(profile.annualRevenueCents).toString(),
    mrr: dollars(profile.mrrCents).toString(),
    arr: dollars(profile.arrCents).toString(),
    growthRatePct: profile.growthRatePct.toString(),
    grossMarginPct: profile.grossMarginPct.toString(),
    cashBalance: dollars(profile.cashBalanceCents).toString(),
    monthlyBurn: dollars(profile.monthlyBurnCents).toString(),
    runwayMonths: profile.runwayMonths.toString(),
    existingDebt: dollars(profile.existingDebtCents).toString(),
    targetFunding: dollars(profile.targetFundingCents).toString(),
    targetFundingDate: profile.targetFundingDate ?? "",
    product: profile.product,
    businessModel: profile.businessModel,
    fundingHistory: profile.fundingHistory,
    capTableSummary: profile.capTableSummary,
    useOfFunds: profile.useOfFunds,
  };
  for (const [key, item] of Object.entries(values)) field(target, key).value = item;
}

function fillGoal(goal: FundingGoal | null): void {
  if (!goal) return;
  const target = form("goal-form");
  field(target, "targetAmount").value = dollars(goal.targetAmountCents).toString();
  field(target, "needByDate").value = goal.needByDate ?? "";
  field(target, "purpose").value = goal.purpose;
  field(target, "maxMonthlyDebtService").value = dollars(goal.maxMonthlyDebtServiceCents).toString();
  field(target, "growthPlan").value = goal.growthPlan;
  const checkbox = field(target, "acceptsDilution");
  if (checkbox instanceof HTMLInputElement) checkbox.checked = goal.acceptsDilution;
}

function render(nextState: BootstrapState): void {
  state = nextState;
  renderDashboard(nextState.dashboard);
  renderStrategy(nextState.strategy);
  renderActions(nextState.actions);
  fillCompany(nextState.companyProfile);
  fillGoal(nextState.fundingGoal);
}

function companyPayload(target: HTMLFormElement): Record<string, unknown> {
  return {
    name: value(target, "name"),
    industry: value(target, "industry"),
    stage: value(target, "stage"),
    geography: value(target, "geography"),
    foundedYear: value(target, "foundedYear") ? Math.round(numberValue(target, "foundedYear")) : null,
    annualRevenueCents: cents(target, "annualRevenue"),
    mrrCents: cents(target, "mrr"),
    arrCents: cents(target, "arr"),
    growthRatePct: numberValue(target, "growthRatePct"),
    grossMarginPct: numberValue(target, "grossMarginPct"),
    cashBalanceCents: cents(target, "cashBalance"),
    monthlyBurnCents: cents(target, "monthlyBurn"),
    runwayMonths: numberValue(target, "runwayMonths"),
    teamSize: Math.max(0, Math.round(numberValue(target, "teamSize"))),
    product: value(target, "product"),
    businessModel: value(target, "businessModel"),
    fundingHistory: value(target, "fundingHistory"),
    existingDebtCents: cents(target, "existingDebt"),
    capTableSummary: value(target, "capTableSummary"),
    useOfFunds: value(target, "useOfFunds"),
    targetFundingCents: cents(target, "targetFunding"),
    targetFundingDate: nullableDate(target, "targetFundingDate"),
  };
}

form("company-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const next = await requestJson<BootstrapState>("/api/company-profile", { method: "PUT", body: JSON.stringify(companyPayload(event.currentTarget as HTMLFormElement)) });
    render(next);
    showToast("Company funding profile saved.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not save company profile."); }
});

form("goal-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  const checkbox = field(target, "acceptsDilution");
  try {
    const next = await requestJson<BootstrapState>("/api/funding-goal", {
      method: "PUT",
      body: JSON.stringify({
        targetAmountCents: cents(target, "targetAmount"),
        needByDate: nullableDate(target, "needByDate"),
        purpose: value(target, "purpose"),
        acceptsDilution: checkbox instanceof HTMLInputElement ? checkbox.checked : false,
        maxMonthlyDebtServiceCents: cents(target, "maxMonthlyDebtService"),
        growthPlan: value(target, "growthPlan"),
      }),
    });
    render(next);
    showToast("Funding goal saved.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not save funding goal."); }
});

form("round-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/rounds", {
      method: "POST",
      body: JSON.stringify({
        roundName: value(target, "roundName"), roundType: value(target, "roundType"),
        targetAmountCents: cents(target, "targetAmount"), minimumAmountCents: cents(target, "minimumAmount"),
        committedAmountCents: cents(target, "committedAmount"), receivedAmountCents: cents(target, "receivedAmount"),
        preMoneyValuationCents: optionalMoney(target, "preMoneyValuation"), postMoneyValuationCents: optionalMoney(target, "postMoneyValuation"),
        targetCloseDate: nullableDate(target, "targetCloseDate"), status: value(target, "status"), useOfFunds: value(target, "useOfFunds"),
      }),
    });
    render(response.state);
    target.reset();
    showToast("Fundraising round created.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not create round."); }
});

form("action-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLFormElement;
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/actions", {
      method: "POST",
      body: JSON.stringify({
        track: value(target, "track"), title: value(target, "title"), amountCents: cents(target, "amount"),
        stage: value(target, "stage"), priority: value(target, "priority"), deadline: nullableDate(target, "deadline"),
        nextStep: value(target, "nextStep"), owner: value(target, "owner"), result: "",
      }),
    });
    render(response.state);
    target.reset();
    field(target, "owner").value = "Owner";
    showToast("Financing action added. Dashboard updated.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not add financing action."); }
});

element<HTMLButtonElement>("#recalculate-strategy").addEventListener("click", async () => {
  try {
    const response = await requestJson<{ state: BootstrapState }>("/api/capital-strategy/recalculate", { method: "POST", body: "{}" });
    render(response.state);
    showToast("Capital strategy recalculated from current facts.");
  } catch (error) { showToast(error instanceof Error ? error.message : "Could not calculate strategy."); }
});

document.querySelectorAll<HTMLElement>("[data-scroll]").forEach((control) => {
  control.addEventListener("click", () => document.getElementById(control.dataset.scroll ?? "")?.scrollIntoView({ behavior: "smooth" }));
});

async function boot(): Promise<void> {
  try {
    const initial = await requestJson<BootstrapState>("/api/bootstrap");
    render(initial);
    setConnection("Connected");
  } catch (error) {
    setConnection("Offline", true);
    showToast(error instanceof Error ? error.message : "BossAI Funding could not load.");
  }
}

void boot();
