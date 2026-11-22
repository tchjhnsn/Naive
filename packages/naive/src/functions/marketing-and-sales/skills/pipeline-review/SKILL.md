---
name: pipeline-review
description: >
  Keep a venture's sales pipeline true: qualify each opportunity with the MEDDIC
  fields, move it to the stage its evidence supports, flag leads with no reply and
  deals with no next step, and record why each closed deal was won or lost. Load it
  for the marketing and sales intake and the weekly pipeline review.
---

# Pipeline review

Use this skill when you write or review `sales/opportunities/[id]` records. Each record is one potential sale (APQC PCF 3.5.1). You keep them true; you never send anything to a buyer yourself.

## Stages and what moves a deal

Move an opportunity (its `pipeline_stage`) only when its record holds the evidence for the new stage:

| Stage | It may enter when |
|---|---|
| `lead` | Someone showed interest. Record `source`, `created` and, once someone replies, `first_response` |
| `qualified` | `qualification.economic_buyer`, `qualification.decision_criteria` and `qualification.pain` are known (MEDDIC). Without all three it stays a lead |
| `proposal` | An offer was sent. The offer itself was a `public-commitment` or `legal-or-terms` decision a person made |
| `negotiation` | The buyer answered the offer and terms are being agreed |
| `won` or `lost` | The buyer signed, said no, or stopped answering. Write `outcome` before you set `pipeline_stage` |

Write what the buyer did, not what they said they might do. "We would buy that" is not evidence; a meeting booked, a trial started, money paid or an introduction made is (Fitzpatrick, The Mom Test).

## What to flag each time

1. **No reply.** A lead with `first_response` null. Inbound leads are answered within an hour (Oldroyd, McElheran and Elkington, HBR 2011). Draft the reply and raise it as a `public-commitment` decision; the founder sends it.
2. **No next step.** An open opportunity whose `next_step` is empty or dated in the past. Propose a next step or closing it as lost with category `no-decision`.
3. **Stage without evidence.** A stage the qualification fields do not support. Move it back and say why in `note`.
4. **Wrong fit.** An opportunity whose buyer matches no `foundation/icp` profile. Say so; it may still be worth working, but the growth lead decides that as `set-priorities`.

## Recording why a deal closed

For every `won` or `lost` opportunity write `outcome`:

- `reason`: the main reason in one sentence.
- `category`: one of product, price, positioning, timing, competitor, relationship, no-decision, other, so reasons can be counted.
- `from`: `buyer` when the buyer said it (a win-loss interview or their own message), `seller` when it is the founder's account. Prefer the buyer's reason; seller-recorded reasons often differ from buyers' (win-loss analysis practice).
- `competitor`: the competitor record id, when one won or lost against the venture.

On a win, write or update the `customers/[id]` record and link it from `customer`.

## What you never do

- Never write contact details (email, phone, address) into an opportunity. Name the buyer by `account` or `customer` record id.
- Never send, publish or quote. Each is a decision for a person: `public-commitment` for a message or page, `legal-or-terms` for a quote with terms.
- Never put an opportunity in a forecast or a count of likely revenue unless it is `qualified` or later.
