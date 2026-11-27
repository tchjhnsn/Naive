---
type: knowledge
tags: [naive, skills, finance, apqc-9-10]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:58Z
source: hybrid
name: manage-international-funds-consolidation
process_group: "9.10"
description: >
  Handle money in more than one currency for the finance agent: which rate was
  used and from where, what each cross-border transaction really cost, how much
  exposure each currency carries, and how results read when they are reported in
  one currency. Load it for the four workflows of APQC 9.10 and whenever the
  founder asks "what rate did we get", "what did that transfer cost us" or "why
  did the result change when nothing happened".
---

# manage-international-funds-consolidation

You record the rates, the fees and the exposures, and you report results in one currency with the rate stated on each line. The founder decides how the venture invoices, which provider it uses and whether to buy any cover, and they transact everything. Almost all of this is work a single-currency venture does not have, so most steps are ones to consider; when the venture deals in one currency only, say so on the handoff and run nothing.

## The processes

### 9.10.1 Monitor international rates

Runs `workflows/9-10-1-monitor-international-rates.json`.

Name the currencies first, the one the books are kept in included, then record a rate per currency with its source and the date and time it was read. The rate used has to match the purpose: a transaction is translated at the rate on its day, a balance at the rate at the period end, and a period's revenue sometimes at an average. Write down which rule the venture follows for each purpose, once, so the figures can be reproduced. Good evidence is a rate with a named source and a timestamp. The trap is a rate taken from whatever site was open, which cannot be reconciled by anyone later.

### 9.10.2 Manage transactions

Runs `workflows/9-10-2-manage-transactions.json`.

Record both sides of every cross-border movement, what was sent and what arrived, and work out the effective rate from those two figures rather than from the rate that was quoted. The difference between them is the real cost, and most of it is usually the spread inside the rate rather than the fee printed next to it. Put that cost into `finance/spend/[id]` as its own line so the venture can see what moving money costs it over a year. When an invoice is raised in one period and settled in another, the rate moved in between and the difference is a real gain or loss. Good evidence is a transaction with both amounts, the rate and the fees from the statement. The trap is booking the fee and ignoring the spread.

Changing provider or route is the founder's decision.

### 9.10.3 Monitor currency exposure/hedge currency

Runs `workflows/9-10-3-monitor-currency-exposure-hedge-currency.json`.

Exposure is more than the cash held: an invoice the venture has issued in another currency and a bill it owes are both exposed already. Total each currency, show what a ten percent move either way would do to the position, and set that against the limit the treasury rules allow. Then offer the cheap options before the expensive one: invoicing in the venture's own currency, holding a working balance in the other, or matching receipts against payments in the same currency are all free compared with buying cover. Good evidence is an exposure total that lists the invoices and bills inside it. The trap is paying for a hedge against an exposure the venture could simply stop creating.

The founder decides and transacts; the agent never trades or converts.

### 9.10.4 Report results

Runs `workflows/9-10-4-report-results.json`.

Translate at the rate the policy names for each purpose and state the rate beside the line, so anyone can rebuild the figure. Then separate the two reasons a result changed: trading, and the rate moving. A venture that reports a better month only because a rate moved has not had a better month, and reading the two as one number is how a currency gain gets spent. Where there is more than one entity, show each one's own figures beside the combined total. Good evidence is a report where the currency effect is its own line. The trap is restating last period at this period's rate, which hides the movement entirely.

## Records

Read: `money/[id]`, `finance/spend/[id]`, `finance/budget/[id]`, `purpose/money/summary`, `customers/[id]`, `deals/[id]`, `supply-chain/suppliers`, `governance/ownership`, `investor-relations/updates`, `it/connections`, `legal/obligations`, `legal/risks`, `markets`.

Write: `money/[id]` for a balance or a settlement gain the statement proves, `finance/spend/[id]` for the conversion and transfer cost, `purpose/money/summary` for the cash position in the reporting currency, `decisions/[id]` to raise a question, and `operations/handoff/[id]` for the rate record, the transaction list, the exposure working and the translated report.

Not built: Naive has no record for an exchange rate, a conversion, a currency exposure or a translated statement. The rates, the transactions, the exposure measurement and the report go on the handoff as evidence, and only the balances, the costs and the position reach `money/[id]`, `finance/spend/[id]` and `purpose/money/summary`.

## Standards

- Foreign currency translation follows IAS 21, The Effects of Changes in Foreign Exchange Rates, internationally and ASC 830, Foreign Currency Matters, in the United States. Both distinguish the functional currency a venture actually operates in from the currency it presents results in.
- The usual convention is a transaction at the spot rate on its date, a monetary balance at the closing rate at the period end, and a period's flows sometimes at an average rate. Which the venture uses for each purpose is a policy the founder sets with an accountant.
- The mid-market rate is the reference the effective rate is compared against; the difference from it is the spread, and it is part of the cost.
- A natural hedge, matching receipts and payments in the same currency, removes exposure without buying anything, and it is the first option to put forward.
- Realized and unrealized gains and losses are different: realized when a transaction settles, unrealized while a balance is still open.

## What the person decides

- Which currencies the venture holds, invoices in and pays in.
- Which rate rule applies to each purpose, with their accountant.
- Which provider, account or route the venture converts and transfers through.
- Whether to carry or reduce each currency exposure, and how.
- Whether to buy cover, and every transaction that does so.
