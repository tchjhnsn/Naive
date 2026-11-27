---
type: knowledge
tags: [naive, skills, finance, apqc-9-6]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:58Z
source: hybrid
name: process-accounts-payable-and-expense
process_group: "9.6"
description: >
  Check and prepare everything the venture owes, for the finance agent: supplier
  bills matched to orders and deliveries, expense claims against a written rule,
  and the company cards and their statements. Load it for the three workflows of
  APQC 9.6 and whenever the founder asks "what do we owe right now", "is this
  bill right", "can I claim this" or "what is on the company card".
---

# process-accounts-payable-and-expense

You check, record and prepare. The founder approves every payment, pays it, applies for and cancels every card, and sends every word to a supplier. You never pay, never approve and never contact anyone outside the venture.

## The processes

### 9.6.1 Process accounts payable (AP)

Runs `workflows/9-6-1-process-accounts-payable-ap.json`.

Match before you record and record before you prepare a payment. The three checks are the order, the delivery and the bill: a bill with no order, a price that differs from the agreed one, or an amount for something nobody received is held back, not paid and queried later. Check the bank details on every bill against what `supply-chain/suppliers` already holds, because a changed account number on a familiar invoice is the commonest fraud a small venture meets. Record the bill in `finance/spend/[id]` with its document and due date at the time you check it, so the register and the register's evidence never drift. Good evidence is a payment run where every line names its bill, its order and its approval. The trap is paying on the invoice's own urgency: the due date and the balance decide the order, not the supplier's tone.

Approval and payment are the founder's. You prepare the run, and you record what was paid only once the statement shows it.

### 9.6.2 Process expense reimbursements

Runs `workflows/9-6-2-process-expense-reimbursements.json`.

Write the rule first, because without one every claim becomes an argument and the founder ends up deciding the same question repeatedly. Then judge each claim against the rule with its receipt attached: no receipt, no approval from the agent, ever. Record the reimbursement in the spend category the cost actually belongs to rather than in a reimbursement bucket, or the venture cannot see what it really spends on travel, software or tools. Track advances separately and chase the ones no claim has cleared. Good evidence is a claim with a receipt, a rule and an approval beside the spend entry it produced. The trap is reimbursing a cost that is really pay, which changes what is owed in tax.

The rule, the limits and every approval are the founder's.

### 9.6.3 Manage corporate credit cards

Runs `workflows/9-6-3-manage-corporate-credit-cards.json`.

A card is an open door to spending, so the rule and the limit come before the card. Reconcile every statement line to a spend entry with a receipt each period and list what nobody can account for, because an unexplained card line is either a forgotten subscription or a problem. Before a card is cancelled, list every recurring charge on it and where each one must move first; cancelling in the wrong order stops services the venture still needs and is hard to unwind. Good evidence is a statement where every line is matched or explicitly listed as unaccounted for. The trap is one card doing everything: a single compromised number then stops the whole venture.

Applying for a card, changing a limit and cancelling a card are all the founder's, because each is a credit agreement with a bank.

## Records

Read: `finance/spend/[id]`, `finance/budget/[id]`, `money/[id]`, `purpose/money/summary`, `supply-chain/suppliers`, `supply-chain/purchase-orders`, `people/team`, `people/founders`, `it/connections`, `legal/obligations`, `assets/register`.

Write: `finance/spend/[id]` for each bill, card charge and reimbursed cost with its document, `money/[id]` for the balance a statement proves after a payment, `decisions/[id]` to put an approval, a dispute or a cancellation in front of the founder, and `operations/handoff/[id]` for the payment run, the held bills, the claims and the statement reconciliation.

Not built: Naive has no record for a supplier bill, a payment, an expense claim, a receipt, a credit card or a card statement. Each bill and claim lives as a spend register entry plus its document on the handoff, and the supplier and order records the matching reads are `supply-chain/suppliers` and `supply-chain/purchase-orders`, which the supply chain function owns.

## Standards

- The three-way match, invoice against purchase order against receipt of goods or services, is the standard control before a bill is paid.
- Segregation of duties, from the COSO internal control framework: whoever prepares a payment does not approve it. Here the agent prepares and the founder approves, which is how a one-person venture keeps the control.
- Verify a change of supplier bank details out of band, against the details already on record and with the supplier by a channel already known, because invoice redirection fraud arrives as an ordinary-looking email.
- Early payment discount terms, written as 2/10 net 30 and read as two percent off if paid within ten days, otherwise due in thirty, which is worth taking only when the cash is there.
- Duplicate payment checks on supplier, amount, date and invoice number, the cheapest recovery available in payables.

## What the person decides

- Which bills are paid, when, and in what order when the balance cannot cover them all.
- Whether to dispute a bill, and what is said to the supplier.
- The expense rule, its limits and every claim, especially one with no receipt.
- Who holds a company card, what its limits are, and when a card is applied for, changed or cancelled.
- How each duplicate, overpayment or unexplained charge is settled.
