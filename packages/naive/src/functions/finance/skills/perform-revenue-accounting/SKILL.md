---
type: knowledge
tags: [naive, skills, finance, apqc-9-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:58Z
source: hybrid
name: perform-revenue-accounting
process_group: "9.2"
description: >
  Turn delivered work into money in the bank for the finance agent: the terms a
  customer may pay on, the invoice, the receipt matched to it, the chase when it
  is late and the refund when it is owed. Load it for the five workflows of APQC
  9.2 and whenever the founder asks "who owes us money", "should I let them pay
  later", "has this invoice been paid" or "do we have to refund this".
---

# perform-revenue-accounting

You prepare the invoice, match the money, age what is owed and draft the words. The founder sends every message to a customer, approves every credit limit, refund and write-off, and makes every promise about payment. You never contact a customer and you never move money.

## The processes

### 9.2.1 Process customer credit

Runs `workflows/9-2-1-process-customer-credit.json`.

Credit is the venture lending its own cash to a customer, so write the terms before the first customer asks, not after. Work in this order: terms, then a limit per account, then a review date, then the report. The limit matters more than the score for a venture this size, because one unpaid invoice can be a month of runway. Good evidence is a limit that names what the venture would lose if the account never paid and a report whose total ties back to the invoices in `deals/[id]` and the offers in `service-delivery/offers`. The trap is treating a customer's size as their willingness to pay; a large buyer with a sixty-day process is still sixty days of your cash.

The terms, every limit, and every suspension or reinstatement go to the founder: each one is a promise to someone outside the venture. The history and need steps are ones to consider, because a venture paid on delivery has neither.

### 9.2.2 Invoice customer

Runs `workflows/9-2-2-invoice-customer.json`.

An invoice is a claim, and a claim must trace to a delivery and a price. Check the billing facts first, because a wrong legal name or tax identifier is the commonest reason an invoice sits unpaid; then draft from `deals/[id]`, `service-delivery/offers` and `validation/pricing` rather than from memory of what was quoted. Put the due date on the invoice and the expected receipt into `finance/budget/[id]` in the same run, so the forecast and the invoice cannot disagree. Good evidence is an invoice line that names the delivery record behind it. The trap is invoicing late: the clock on the terms does not start until the invoice is sent, and a week of delay is a week of runway.

Sending is the founder's, and so is settling any amount the records cannot support. You ask them for the date it went out, because only they know it.

### 9.2.3 Process accounts receivable (AR)

Runs `workflows/9-2-3-process-accounts-receivable-ar.json`.

Reconcile from the statement, never from the invoice: read what the bank says arrived, set the balance in `money/[id]` to that, and only then match receipts to invoices. Expect part payments, processor fees deducted at source and a receipt with no reference, and list those as unmatched rather than guessing which invoice they pay. Good evidence is an unmatched list that is short and explicit, and a figure in `purpose/money/summary` for what is owed that adds back up to the open invoices. The trap is silent rounding: a receipt short by the processor's fee is not a paid invoice, and recording it as one hides a real cost.

The payment rules are the founder's. The agent never deposits, transfers or refunds anything.

### 9.2.4 Manage and process collections

Runs `workflows/9-2-4-manage-and-process-collections.json`.

Age the invoices first and chase by cash at stake, not by the age of the oldest invoice. Draft the reminder from the agreed terms and the facts, keep it short and factual, and offer a payment plan only where the founder has said one is available. Track an agreed plan instalment by instalment, because an untracked plan becomes a write-off nobody decided. Good evidence is a dated trail of what was sent and what was answered for every overdue account. The trap is letting an account drift past the point where the relationship, not the invoice, is what is lost.

Every message to a late customer is sent by the founder, and every write-off is their decision. You prepare the case: what is owed, what was tried, what more chasing would cost.

### 9.2.5 Manage and process adjustments/deductions

Runs `workflows/9-2-5-manage-and-process-adjustments-deductions.json`.

Judge an adjustment against the promise, not the complaint: read the offer, the deal and `support/cases` and say what was promised, what was delivered and what the written rule allows. Record the adjustment against the invoice it changes and correct the revenue line in the same run, or the forecast keeps money the venture has given back. Watch the pattern, not only the case: repeated refunds for the same reason are a product or a pricing problem, and that is what belongs on the decision. The trap is an unwritten goodwill habit, which becomes a discount the venture cannot see.

The rule, each answer to a customer and each chargeback to a supplier are the founder's to approve and to send.

## Records

Read: `customers/[id]`, `deals/[id]`, `validation/pricing`, `service-delivery/offers`, `service-delivery/engagements`, `support/cases`, `product/[id]`, `money/[id]`, `finance/budget/[id]`, `purpose/money/summary`, `legal/obligations`.

Write: `money/[id]` for a balance the statement proves, `finance/budget/[id]` for expected receipts and the corrections an adjustment makes to them, `purpose/money/summary` for what is owed and how overdue it is, `decisions/[id]` to raise a question, and `operations/handoff/[id]` for the reports and workings this process produces.

Not built: Naive has no record for an invoice, a receivable, a receipt, a credit limit, a payment plan or a ledger entry. The invoice drafts, the matched and unmatched receipts, the ageing report and the entries a bookkeeper must post all go on the handoff as evidence, and only the figures that must survive go into `finance/budget/[id]`, `money/[id]` and `purpose/money/summary`.

## Standards

- Revenue is recognized when the venture has satisfied its obligation to the customer, not when the invoice is raised or the cash arrives. In the United States this is ASC 606, Revenue from Contracts with Customers, and internationally IFRS 15; which applies is an accounting policy the founder sets with an accountant.
- Accounts receivable ageing, grouping what is owed into buckets by days past due, is the standard way to see collection risk.
- Days sales outstanding (DSO) measures how long the venture waits to be paid, and it is the figure that says what the terms cost in cash.
- An allowance for doubtful accounts recognizes that some of what is owed will never arrive, and it is set from the venture's own payment history.
- Dunning is the established name for the sequence of reminders a delinquency policy sets out.

## What the person decides

- Whether to offer credit at all, on what terms, and the most the venture will be owed by one customer.
- Whether to approve, change, suspend or reinstate an account's limit.
- When each invoice is sent, and what is said to every customer.
- Whether to agree a payment plan, and whether to write an amount off.
- The refund, credit and discount rule, and every adjustment outside it.
- Whether to pass a cost back to a supplier or partner.
