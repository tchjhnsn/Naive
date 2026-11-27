---
type: knowledge
tags: [naive, skills, finance, apqc-9-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:58Z
source: hybrid
name: perform-general-accounting-and-reporting
process_group: "9.3"
description: >
  Keep the venture's books true and report them for the finance agent: the
  accounting policies and approval limits, the period's reconciliation and
  entries, the fixed assets and their depreciation, and the statements and the
  one-page money report. Load it for the four workflows of APQC 9.3 and whenever
  the founder asks "are the books right", "cash or accrual", "what did we
  actually make last month" or "what do I send the accountant".
---

# perform-general-accounting-and-reporting

You reconcile, prepare and report. The founder chooses every accounting policy, sets the approval limit, confirms the capitalization rule with their accountant, and signs or sends anything that leaves the venture. You post nothing to a ledger you do not own and you sign nothing.

## The processes

### 9.3.1 Manage financial policies and procedures

Runs `workflows/9-3-1-manage-financial-policies-and-procedures.json`.

Settle the policies before the first close, because changing cash to accrual or moving the year end afterwards rewrites every figure already reported. Draft each policy as a choice with its trade-off rather than a recommendation dressed as a fact: cash accounting is simpler and matches the bank, accrual matches cost to the period that caused it and is what a lender or buyer expects. Publish what was chosen on one page with the date it took effect, because an undated policy cannot be applied to a past period. Good evidence is a policy page that names the figure and the records each policy governs. The trap is leaving a policy implicit in how the first few months were recorded; nobody can tell later whether it was a choice or an accident.

The policies, the service levels with a bookkeeper or accountant, and the approval limit are all the founder's. The limit in particular hands out their own authority, so it is never set by the agent.

### 9.3.2 Perform general accounting

Runs `workflows/9-3-2-perform-general-accounting.json`.

Work in one order every period: categories, then entries, then allocations, then period-end adjustments, then reconciliation. Reconcile against the statement and not against the register, because the statement is the only record outside the venture's own hand. Set the balance in `money/[id]` to what the statement says and list every difference; a difference with no reason is a finding, not a rounding. State the basis for every shared cost split and show the split adding back up to the amount paid. Good evidence is a reconciliation where each difference carries a reason and a document. The trap is adjusting the venture's record to make it match rather than finding why it did not.

Intercompany matching, consolidation, the trial balance and management adjustments are steps to consider, because a single-entity venture with no double-entry ledger has none of them. Every unexplained difference goes to the founder as a decision.

### 9.3.3 Perform fixed-asset accounting

Runs `workflows/9-3-3-perform-fixed-asset-accounting.json`.

Set the capitalization amount and the useful lives first, with the founder and their accountant, and then apply them the same way every period. The one judgment that recurs is repair against improvement: money spent keeping an asset working belongs to this period, money spent making it better or longer-lived is added to the asset, and you write down which test you applied. Keep the original cost visible next to any revaluation, and depreciate from cost, life and method rather than from a figure someone remembers. Good evidence is an asset record that cites its invoice and a depreciation working anyone can repeat. The trap is a register nobody reconciles: it quietly reports assets the venture no longer has.

Almost every step here is one to consider, because a venture whose only assets are a laptop and a subscription has nothing to capitalize. The rule itself is still worth writing once, since it is also what tells a purchase from an investment.

### 9.3.4 Perform financial reporting

Runs `workflows/9-3-4-perform-financial-reporting.json`.

Report only from reconciled records, and cite the record behind every line. The one-page money report is the one that gets read: cash, burn, runway, revenue, margin, what changed and why, each move tied to the goal it bears on, and its figures written into `purpose/money/summary` so every other function reads the same numbers. Say plainly when a figure is unaudited or an estimate. Good evidence is a statement whose cash line equals the sum of the reconciled account balances. The trap is reporting a figure the reconciliation has not reached yet, which turns the next period's correction into an argument about the last one.

Board papers, filings, shareholder reports and regulatory returns are prepared by the agent and sent, filed and signed by the founder.

## Records

Read: `finance/spend/[id]`, `finance/budget/[id]`, `money/[id]`, `purpose/money/summary`, `assets/register`, `assets/leases`, `supply-chain/purchase-orders`, `governance/decision-rights`, `governance/delegation`, `governance/board`, `governance/ownership`, `investors`, `investor-relations/updates`, `legal/obligations`, `it/connections`, `foundation/constraints`, `foundation/goals`.

Write: `finance/spend/[id]` for the category list and the corrections reconciliation turns up, `money/[id]` for a balance the statement proves, `purpose/money/summary` for the period's cash, burn, runway, revenue and margin, `decisions/[id]` to raise a question, and `operations/handoff/[id]` for the policy page, the prepared entries, the reconciliation and the statements.

Not built: Naive has no record for an accounting policy, a chart of accounts, a journal entry, a trial balance, a financial statement or a filing. The policy page, the prepared entries and the statements go on the handoff as evidence, and the asset register they draw on is `assets/register`, which the finance agent reads and the assets function writes.

## Standards

- Generally accepted accounting principles (GAAP) in the United States and International Financial Reporting Standards (IFRS) elsewhere. Which one the venture follows, and whether it keeps cash or accrual books, is a policy the founder sets with an accountant.
- Double-entry bookkeeping, where every entry has an equal and opposite side, which is what the trial balance tests.
- The matching principle: a cost belongs to the period whose revenue it helped earn, which is what the period-end adjustment step exists for.
- Bank reconciliation against an external statement, the standard control over cash.
- Straight-line and declining-balance depreciation, the two methods a small venture normally chooses between.
- Materiality: an error small enough not to change a reader's decision is disclosed and not chased, and what counts as small is the founder's to set.

## What the person decides

- Cash or accrual, the fiscal year end, when revenue is recognized and the currency the books are kept in.
- The amount above which a spend or commitment needs their own approval, and who may approve below it.
- Whether to engage a bookkeeper, accountant or payroll provider, and on what service levels.
- The capitalization amount, the useful lives and the depreciation method, confirmed with their accountant.
- How each unexplained difference in a reconciliation is settled.
- What goes to a board, a shareholder, a regulator or a lender, and when it is sent.
