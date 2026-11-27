---
type: knowledge
tags: [naive, skills, customer-service, apqc-6-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:53:00Z
source: hybrid
name: service-products-after-sales
process_group: "6.3"
description: >
  Serve what the venture has already sold: know what each customer bought, work
  warranty claims from receipt to close, recover from a supplier whose part
  failed, and deliver and check a service a customer is owed. Load it for the
  four workflows of APQC process group 6.3 and when the founder asks "is this
  under warranty", "who pays for this", "what did this customer buy" or "did we
  do what we promised".
---

# service-products-after-sales

You assemble the facts of a claim or a service, record them on the case, and recommend. The founder approves or rejects a claim, authorizes any payment, speaks to a supplier, and makes any promise to a customer about what will be done and by when.

Everything here hangs on knowing what the customer holds. Run 6.3.1 before the others, because a claim cannot be validated against terms if nobody can say what was bought and when.

## The processes

### 6.3.1 Register products

Runs `workflows/6-3-1-register-products.json`.

Build the purchase picture from the records first, `customers`, `deals`, `money` and `product`, and list every customer whose purchase they cannot say. Then ask the founder about those, taking the ones with an open case first, and write the answer onto the case; a version guessed from a date is worse than a blank, because it later looks like evidence. The useful output is not a register but a product and version on every open case, which is what lets a contact reason be counted per version instead of per customer. The trap is asking the founder to reconstruct every purchase ever made; ask only for what an open case needs.

### 6.3.2 Process warranty claims

Runs `workflows/6-3-2-process-warranty-claims.json`.

Ten activities, in APQC's order, and the order is the method: receive, validate, investigate, place responsibility, pre-authorize any cost, approve or reject, notify, pay, close, reconcile. Validate before investigating, because a claim outside the terms needs a decision, not an investigation, and name the term and the date that decide it. Investigate toward a cause, not toward a verdict: state the fault in one line, get what is needed to reproduce it, then record the cause and the corrective action, which is where a repeat claim is prevented. Five whys and an Ishikawa diagram are enough structure for one claim; what matters is that the cause is written and linked to the bug. Good evidence for responsibility is the purchase record, the investigation and the supplier record agreeing; where they do not reach, write that it is a guess. Four steps are the founder's: pre-authorizing a cost before the claim is decided, approving or rejecting the claim, the notice to the customer, and authorizing the payment. Reconciling the closed claims against `finance/spend` is how the venture learns what the warranty actually costs.

### 6.3.3 Manage supplier recovery

Runs `workflows/6-3-3-manage-supplier-recovery.json`.

Recovery is only possible while the evidence is still together, so group the claims that trace to one supplier as soon as the second one appears: the units, what each cost the venture, and the term of the purchase order relied on. The claim is a document the founder can take into a conversation; it is not a message you send. The negotiation and any settlement are the founder's, because they commit the venture, and a settlement is a `legal-or-terms` decision. The trap is claiming a cost the records cannot show the venture carried.

### 6.3.4 Service products

Runs `workflows/6-3-4-service-products.json`.

Confirm what is owed before scheduling anything, and have the founder confirm the promise, since only they can commit a date. Record the product, the fault, the agreed outcome and the date on the case; together they are the service order, and nothing else holds them. Then schedule honestly: say what each case needs and which promises the schedule cannot meet, as a `set-priorities` recommendation, rather than quietly running late. During delivery, record on each case what was done, when, and with what, and hand over every step that needs hands, a visit or an account you do not hold. Finish with quality: list what closed and what failed or ran past its date, and draft one question to each served customer for the founder to send. A service recorded as delivered with no customer answer and no failure noted is the trap, because it reads as a success nobody checked.

## Records

Reads: `support/policy`, `support/cases`, `customers`, `deals`, `money`, `product`, `product/bugs`, `legal/obligations`, `supply-chain/suppliers`, `supply-chain/purchase-orders`, `service-delivery/offers`, `service-delivery/engagements`, `finance/spend`, `people/team`.

Writes: `support/cases/[id]`, which carries the claim, the coverage verdict, the service order, what was done and the outcome; `operations/handoff/[id]` for the recovery claim and for a defect that products must fix; and `decisions/[id]` for coverage facts, approvals, payments and settlements.

A warranty claim record, a product registration record, a service order record, a supplier recovery claim record and a parts or field service record are not built. Naive has no route for any of them, so the claim and the service order live on the case, the recovery claim lives on the handoff as evidence, and a repair done by someone outside the venture is recorded on the case in plain words.

## Standards

- ISO 9001 treats corrective action as acting on the cause rather than the occurrence, which is why 6.3.2 records a cause and a corrective action and not only a remedy.
- Failure mode and effects analysis, and the eight disciplines problem solving method, are the established ways to take a field failure back to a cause; one claim rarely needs more than the five whys and an Ishikawa diagram.
- APQC Process Classification Framework 8.0, category 6.0, for the process names and their order.
- No fault found is the industry's name for a unit returned, tested and sent back working; counting those separately keeps them out of the defect counts.

## What the person decides

- What the venture promises this customer, and by when.
- Whether a warranty claim is approved or rejected.
- Any cost spent before a claim is decided, and any payment, credit or replacement after it.
- Every notice to a customer about a claim or a service.
- Whether to raise a recovery with a supplier, and what to settle for.
- Any repair, visit or account action that needs a person.
