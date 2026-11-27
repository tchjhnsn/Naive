---
type: knowledge
tags: [naive, skills, finance, apqc-9-7]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:58Z
source: hybrid
name: manage-treasury-operations
process_group: "9.7"
description: >
  Look after the venture's cash for the finance agent: the rules and controls over
  who may move money, the reconciled position and the thirteen-week forecast,
  internal accounts between entities, debt and investments, rate and currency
  exposure, and fraud or dispute cases. Load it for the six workflows of APQC 9.7
  and whenever the founder asks "how much cash do we have", "will we make
  payroll", "where should spare cash sit" or "what is this charge".
---

# manage-treasury-operations

You reconcile, forecast, measure exposure and prepare. The founder approves the rules, speaks to every bank and broker, signs every loan and investment, transacts every hedge, and handles every dispute with an outside party. You never move money, never open or close an account, never trade and never contact a bank.

## The processes

### 9.7.1 Manage treasury policies and procedures

Runs `workflows/9-7-1-manage-treasury-policies-and-procedures.json`.

Start from the list of ways money can leave: each account, card, payment service, standing order and direct debit. Then write who may do what, then the step-by-step procedure for each action, then check what actually happened against it. The important controls for a venture this size are few and concrete: a second pair of eyes before a payment, a verified change of payee details, and a reconciliation nobody can skip. Name a credential by its variable name only and never write its value anywhere. Good evidence is a movement traced from its approval to its statement line. The trap is writing a policy nobody checks against, which reads like a control and is not one.

The rules and the limits are the founder's, because they are giving out authority over their own money.

### 9.7.2 Manage cash

Runs `workflows/9-7-2-manage-cash.json`.

Reconcile first and forecast second, because a forecast built on an unreconciled balance is wrong from week one. Forecast thirteen weeks, week by week, from invoices owed, bills due, recurring spend and pay dates, and mark every week the balance would fall below the minimum. Keep the forecast separate from the budget: the budget is the plan and the forecast is what is now expected to hit the bank. For each short week, name what could move rather than only that it is short. Good evidence is a cash line whose total equals the sum of the reconciled balances in `money/[id]` and a forecast whose every row names its record. The trap is counting money that takes a month to reach the current account as this month's runway.

The bank relationship, every instruction to the bank and every fee negotiation are the founder's. You prepare the figures and the questions.

### 9.7.3 Manage in-house bank accounts

Runs `workflows/9-7-3-manage-in-house-bank-accounts.json`.

This applies only where the venture holds money for its own entities, so every step is one to consider. The rule is that each entity's balance inside the shared account is tracked separately and the shared total always equals the sum of them. Record every internal transfer, loan and charge on both sides with the same amount and date, and treat an internal loan with no written agreement as a finding, because a tax authority will treat it as something other than a loan. Good evidence is a statement per entity that balances. The trap is paying one entity's bill from another's money and calling it a transfer later.

### 9.7.4 Manage debt and investment

Runs `workflows/9-7-4-manage-debt-and-investment.json`.

Write the rule for spare cash before there is spare cash: what may be held, how long it may be tied up, how much in one institution and how much must stay reachable within a week. Take every term from the signed document and never from a summary or a term sheet, and hand the founder each covenant that binds the venture with the date it is tested. For a venture, liquidity beats yield: a deposit that earns more and cannot be reached in the week payroll falls is a worse holding than one that earns nothing. Good evidence is a record whose rate, dates, security and covenants each cite a clause. The trap is holding more with one institution than the deposit protection covers because the balance grew quietly.

Every loan, note, investment and intermediary agreement is the founder's to agree and sign.

### 9.7.5 Monitor and execute risk and hedging transactions

Runs `workflows/9-7-5-monitor-and-execute-risk-and-hedging-transactions.json`.

Measure before covering. For each exposure, say what it is, how large, from which records, and what a move of a stated size would do to the cash position: one and three points on a floating rate, ten percent on a currency. Count an invoice already issued in another currency as exposure, not only cash held. Customer concentration belongs here too and is usually the largest exposure a small venture has. Good evidence is a sensitivity figure a reader can recompute from the records. The trap is hedging an exposure the venture could simply avoid, by invoicing in its own currency or by holding a fixed rate.

Every step is one to consider, and every transaction is the founder's. The agent never opens, closes or adjusts a position.

### 9.7.6 Manage financial fraud/dispute cases

Runs `workflows/9-7-6-manage-financial-fraud-dispute-cases.json`.

Move quickly, because a business account's window to dispute a transaction is usually short and shorter than a consumer's. Open the case with the statement line that proves it, gather the order, the bill, the price and the payee details on file, and say which side the records support rather than which side the venture prefers. Close the case by correcting `money/[id]` and the spend entry from the statement and by naming the control that would have caught it, so the loss buys something. Good evidence is a case with a dated trail and a named control gap. The trap is treating a recovered amount as the end of the matter when the hole that allowed it is still open.

Only the founder contacts a bank, a provider, a supplier or a customer about a dispute.

## Records

Read: `money/[id]`, `finance/spend/[id]`, `finance/budget/[id]`, `purpose/money/summary`, `governance/decision-rights`, `governance/delegation`, `governance/ownership`, `fund/thesis`, `fund/terms`, `investors`, `investor-relations/raises`, `customers/[id]`, `deals/[id]`, `supply-chain/suppliers`, `it/connections`, `legal/obligations`, `legal/risks`, `markets`, `industries`, `people/team`.

Write: `money/[id]` for a reconciled balance and for a recorded instrument or recovery, `finance/budget/[id]` for the cash forecast's weeks, `finance/spend/[id]` for bank fees and corrected charges, `purpose/money/summary` for the cash position and runway, `decisions/[id]` to raise a question, and `operations/handoff/[id]` for the policies, the procedures, the forecast, the exposure measurements and the case files.

Not built: Naive has no record for a treasury policy, a payment approval, a cash forecast of its own, a loan, an investment, a hedge, an internal entity account or a fraud case. The forecast's figures go into `finance/budget/[id]` and `purpose/money/summary`, and the policies, procedures, instrument terms, exposure workings and case files go on the handoff as evidence.

## Standards

- A rolling thirteen-week cash flow forecast, rebuilt weekly, is the standard short-horizon treasury view, and it is the one that answers whether payroll and the next bills clear.
- Segregation of duties and dual authorization, from the COSO internal control framework: preparing a payment and approving it are different hands. In a one-person venture the agent prepares and the founder approves.
- Bank reconciliation against an external statement, the control over cash that catches almost everything else.
- Deposit insurance limits what is protected if an institution fails, per depositor and per insured institution; in the United States that is the Federal Deposit Insurance Corporation (FDIC) for banks. The current limit and how it applies to the venture's accounts is a question for the bank or the accountant.
- Sensitivity analysis, showing the effect of a stated move in a rate or a currency, which is the form an exposure figure takes here. Hedge accounting itself follows ASC 815 in the United States and IFRS 9 internationally, and applying either is work for an accountant.
- Verify a change of bank or payee details out of band before any payment, because invoice redirection arrives as an ordinary email.

## What the person decides

- The treasury rules: the minimum cash, the most in one institution, who approves a payment at each size, and what happens when they are unreachable.
- Every account opened or closed, every payee added, and every instruction given to a bank.
- Where spare cash sits, and whether to accept each loan, note or investment and its covenants.
- Whether to carry or cover each exposure, and every hedge transaction.
- What is said to a bank, provider, supplier or customer in a dispute, and whether to pursue or absorb a loss.
