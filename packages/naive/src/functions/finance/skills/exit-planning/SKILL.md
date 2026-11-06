---
type: knowledge
tags: [everything-ecosystem, skills, governance, exit, preference-stack]
ai-model: claude-opus-5.5
created: 2026-10-27T15:49:30Z
source: hybrid
name: exit-planning
description: >
  Help a founder decide which ways the venture might end it should keep open
  (acquisition, IPO, secondary sales, merger, management buyout, wind-down, or
  hold) and see what each owner would get at different sale values from the
  cap table, using packages/naive/src/engine/payouts.mjs. Records paths and scenarios in
  governance/exit.json. Founder decision with counsel (EE-022).
  MANDATORY TRIGGERS: exit, acquisition, sell the company, IPO, secondary,
  preference stack, payout, who gets what, liquidation preference
  outcome, drag-along, wind down, shut down.
---

# Exit planning

Governance layer, ownership-and-control kit (EE-022). Writes `exit.json`; payouts are never typed, they are computed from `ownership.json` by `node packages/naive/src/engine/payouts.mjs`.

## 1. Paths follow ambition

| Ambition | Usual paths |
| --- | --- |
| Hobby, lifestyle | Hold; sell the business or its assets; wind down |
| Managed growth | Hold and pay distributions; sale to a buyer or to the team (management buyout) |
| Aggressive growth with investors | Acquisition or IPO. Investors usually expect one within the life of their fund |

Record each path with a stance: preferred, open or ruled-out. Ruling a path out is a real decision: investors will ask.

## 2. Who gets what

`node packages/naive/src/engine/payouts.mjs <venture>` runs every scenario in `exit.json`:

- Debt and costs come first. Scenario values are what is left for the owners.
- Preferred classes take their liquidation preference, highest seniority first. Non-participating preferred converts to common when that pays more.
- SAFEs and notes take the greater of their amount or their converted share.
- The rest goes to common, pro rata. The unissued option pool gets nothing.

Model at least three values: a soft landing (near the money raised), a base case and a strong case. At a soft landing the preferences can take most of the money; that is the moment the terms in `financing-and-investor-rights` matter.

## 3. Rights that decide an exit

- Drag-along: who can force everyone to sell.
- Tag-along and co-sale: who can join a sale someone else makes.
- Right of first refusal: who may buy shares before an outsider.
- Board reserved matters: a sale is usually one.
- Acceleration of vesting on a sale (see `cofounder-structure`).

## 4. Wind-down

If the venture ends without a sale, assets pay debts first, then the preferences, then common. Record the path as `wind-down`, and plan for employees, customers' data and obligations before money runs out.

## Guardrails (all five ownership-and-control skills)

- These are **founder decisions made with counsel** (decision class `ownership-or-control`, level escalate). An agent lays out the options, the trade-offs and the sources, drafts the records and documents, and stops. It never signs, files or agrees to anything.
- Rules differ by country, state and legal form. Everything here is the common US startup default unless it says otherwise; name the jurisdiction before relying on it.
- The signed documents are the truth. The records in `governance/` summarise them so agents and checks can read them; when the two disagree, fix the record.
- Sources below are named from the method author's knowledge and still need recording with `find-reference` (URL and checked date) before a default is treated as settled.

## Sources

- Brad Feld and Jason Mendelson, *Venture Deals* (Wiley), chapters on liquidation preference and exits.
- NVCA model legal documents: Voting Agreement (drag-along), Right of First Refusal and Co-Sale Agreement.
