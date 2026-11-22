---
name: support-triage
description: >
  Triage a customer contact into a support case: set its kind and contact reason,
  catch what must go to a person at once, draft a reply from what the venture has
  published, and count contact reasons so the venture removes the causes. Load it
  for the customer service intake, each new case and the weekly contact review.
---

# Support triage

Use this skill when you write or review `support/cases/[id]` records against the venture's `support/policy`. A case is one customer contact (APQC PCF 6.2.2); a complaint follows ISO 10002:2018. You keep cases true and you draft replies; a person sends them.

## 1. Classify

- `kind`: `question` (how do I), `problem` (something does not work), `request` (change my plan, add a seat), or `complaint` (the customer is unhappy with the venture and expects a response, ISO 10002). When a problem comes with anger or a demand for redress, it is a complaint.
- `reason`: one id from the policy's `reasons` list. If none fits, use the closest and propose a new reason in `note`; a person adds it to the policy.
- `repeat_of`: the earlier case when the same customer wrote about the same issue within seven days. A repeat means the first answer did not resolve it (Dixon, Freeman and Toman, HBR 2010).
- `summary`: what the customer needs, in one sentence, with no names, emails, phone numbers or payment details. The conversation stays in the helpdesk under `external_id`.

## 2. Escalate before anything else

Check the policy's `escalate_when` list first. Bring the case to the founder at once, with the case and what is known, when it is:

| Trigger | Decision class |
|---|---|
| complaint, legal threat, chargeback | `legal-or-terms` |
| safety risk to a person | `legal-or-terms`, and say it is urgent |
| a request to delete the customer's data or account | `irreversible-data-change` |
| a refund or credit, above the policy limit or not | `spend-money` |
| a public mention, review or post | `public-commitment` |

Do not draft promises, admissions of fault or compensation for an escalated case. Prepare the facts and the options.

## 3. Draft the reply

- Answer from the records and the venture's published help only. If you cannot answer from them, say so in the draft and mark it for the founder; never guess.
- Resolve the next likely question in the same reply, so the customer need not write again (effort reduction, Dixon et al.).
- Keep a visible way to reach a person. Self-service alone resolved only 9% of issues in Gartner's 2019 survey.
- Never sell inside a complaint or a failure. Buying interest from a happy customer goes to marketing and sales as a handoff.
- The draft is a `public-commitment` decision. The founder sends it; then you write `first_response`.

## 4. Refunds

Propose a refund only when the policy's `refunds.rule` covers it. State the amount, the currency and the rule. It is a `spend-money` decision for a person; once decided, write `refund` with the decision's id. Open the fix for the cause as its own handoff, separate from the refund.

## 5. Count, so causes are removed

Each week count cases per active customer by reason, not cases handled (Price and Jaffe, The Best Service Is No Service). For the top reason by volume, propose one of: remove it (a product or policy fix), answer it with published help, or keep handling it. A falling count of contacts per customer is the win. Send the top reasons, with counts and the cases behind them, to products every week (APQC PCF 6.5.1.3).
