# BossAI Funding Product Requirements

## Product statement

BossAI Funding is the owner's financing decision and execution workspace. It helps an enterprise owner move from “how much capital do I need?” to “what should I do today to get that capital into the company?”

## Primary user

Enterprise owner / founder.

The default product experience is not a consultant back office, CRM administration console, or platform administration surface.

## Primary questions

The product must continuously answer:

- How much capital is still missing?
- Which sources of capital are worth pursuing?
- What is the single most important funding action today?
- What is blocking money from being received?

## Canonical journey

Funding goal → capital strategy → find capital → evaluate fit → select opportunity → prepare materials → outreach/application → meeting → due diligence → terms → close → funds received → post-funding tracking.

## Capital tracks

### Non-dilutive

Grant, government subsidy, policy funding, special programs, innovation funds, and tax-linked incentives.

Lifecycle: Discover → Match → Save → Prepare → Apply → Review → Approved/Rejected → Received.

### Debt

Bank loan, policy loan, credit loan, equipment loan, working-capital loan, and other debt.

Required business data includes amount, term, interest rate, fees, monthly payment, DSCR/repayment capacity, collateral, personal guarantee, application status, approval status, and funding status.

### Equity

Angel, VC, PE, strategic investor, family office, accelerator.

Pipeline: Target → Research → Ready to Contact → Contacted → Replied → Meeting → Partner Meeting → Due Diligence → Term Sheet → Negotiation → Committed → Closed, plus Passed / No Response / Not a Fit.

## Phase 1 requirements

### Company Funding Profile

Single source of truth for company name, industry, stage, geography, founded year, revenue, MRR/ARR, growth, gross margin, cash, burn, runway, team size, product, business model, funding history, debt, cap-table summary, use of funds, target amount, and target timing.

### Funding Goal

Store the requested capital amount, need-by date, use of funds, dilution preference, repayment capacity, and rationale.

### Fundraising Round

Store round name/type, target/minimum/committed/received amounts, pre/post-money valuation, target close date, status, and use of funds.

### Capital Strategy

Given capital need, timing, stage, cash flow, dilution preference, debt capacity, and growth plan, produce an explainable Grant/Debt/Equity capital mix. The strategy must show assumptions, risks, costs/trade-offs, and recommended order. It is decision support, not legal or financial advice.

### Owner Dashboard

CEO Capital Command Center must display:

- target funding amount
- received
- committed
- active pipeline amount
- remaining gap
- Grant/Debt/Equity track cards
- recent critical action, risk, and next step per track
- Today's Focus

### Today's Focus

Priority order:

1. Near-deadline incomplete funding work.
2. High-value waiting reply / meeting / due-diligence work.
3. High-fit saved opportunity.
4. Investor follow-up.
5. New opportunity discovery.
6. Improve company funding profile.

The dashboard must never become empty merely because there are no applications. It must fall back to the next highest-value setup or discovery action.

### Funding action

Phase 1 uses a generic financing action as the execution bridge across all three tracks. Each action stores track, title, amount, stage, priority, deadline, next step, owner, outcome/result, and timestamps.

## Phase 1 acceptance journey

A fresh owner can:

1. Create a company funding profile.
2. Set a funding goal.
3. Create a fundraising round.
4. Calculate and understand a capital strategy.
5. Open Grant, Debt, and Equity track views.
6. Create at least one persisted funding action.
7. Return to the dashboard and see totals and Today's Focus reflect persisted state.

## Future phases

- Phase 2: Investor, Fund, Contact, Investor CRM, equity pipeline, meeting and follow-up.
- Phase 3: FundingOpportunity, explainable matching, saved opportunities, funding readiness.
- Phase 4: Application pipeline, document workspace, data room, due diligence, term-sheet comparison, funding outcome and post-funding tracking.

## Non-goals

- Generic Agent Platform.
- Separate task/approval/memory/provider/billing authority.
- General-purpose CRM.
- Legal advice.
- Black-box matching scores without reasons.
- Critical business state stored only in localStorage.
