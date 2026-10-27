---
type: knowledge
tags: [everything-ecosystem, skills, governance, equity, share-classes, cap-table]
ai-model: claude-opus-5.5
created: 2026-10-27T15:49:30Z
source: hybrid
name: equity-and-share-classes
description: >
  Help a founder decide how ownership is counted and which share types to
  have, and when: common, preferred, super-voting (dual-class), non-voting, LLC
  units, the employee option pool, and what each does to control and payouts.
  Keeps governance/ownership.json, the cap table, in step. Founder decision
  with counsel (EE-022).
  MANDATORY TRIGGERS: cap table, shares, stock, share class, common stock,
  preferred stock, dual-class, super-voting, option pool, ESOP, stock options,
  units, LLC membership interest, dilution, fully diluted, S corporation stock.
---

# Equity and share classes

Governance layer, ownership-and-control kit (EE-022). Keeps `ownership.json`. `check-governance.mjs` checks it; `node schema/payouts.mjs <venture>` shows what each class would get in a sale.

## 1. The unit follows the legal form

| Legal form (`venture.json` form.legal_form) | Unit in `ownership.json` | Notes |
| --- | --- | --- |
| none, sole proprietorship | none needed | One owner; no cap table |
| partnership | percent | The partnership agreement sets the split |
| LLC | units | Classes of units are possible; profits interests replace options |
| S corporation | shares | **One class of stock only** (US tax rule; classes may differ in votes alone), at most 100 shareholders, no corporate or foreign shareholders. `check-governance.mjs` refuses a second class. Usually rules out venture capital |
| C corporation | shares | Any number of classes; the usual form for venture capital in the US |

If the ambition is aggressive growth with outside investors, a C corporation is the common choice. Converting later is possible but costs money and can have tax effects; raise it early with counsel.

## 2. Share types, and when each appears

| Type | When | What it does |
| --- | --- | --- |
| Common | From day one | Founders, employees and advisors hold it; paid last in a sale |
| Option pool (reserved common) | Before hiring, or as a condition of a priced round | Reserved for employee options; unissued options are paid nothing. Commonly 10 to 20 percent at seed or Series A, and investors usually ask for it to come out of the founders' share (the "option pool shuffle") |
| Preferred | At a priced round | Investors' class: liquidation preference, protective provisions and other rights (see `financing-and-investor-rights`) |
| Super-voting common (dual-class) | When founders must keep control through later rounds or a public listing | Founders' shares carry more than one vote each. Investors and some stock indexes resist it; it is easier to set up early than late |
| Non-voting | For holders who should share value but not control | Votes per share 0 |

Record each class with `kind`, `votes_per_share`, and for preferred `price_per_share` and `liquidation`.

## 3. Control and dilution

- Control is votes, not value: add up `votes_per_share` times shares by holder, and compare with the board seats each group appoints.
- Every new grant or round dilutes everyone else's share. Model a round before agreeing to it: the fully diluted cap table after the pool top-up and after any SAFEs convert.
- Employee equity beyond the pool (profits interests in an LLC, restricted stock, phantom equity) is a further choice; record it as grants of the relevant class.

## 4. Record it

`ownership.json`: `unit`, `classes`, `holders` (including the pool as `kind: pool`), `grants` with vesting. Every change is an `ownership-or-control` decision.

## Guardrails (all five ownership-and-control skills)

- These are **founder decisions made with counsel** (decision class `ownership-or-control`, level escalate). An agent lays out the options, the trade-offs and the sources, drafts the records and documents, and stops. It never signs, files or agrees to anything.
- Rules differ by country, state and legal form. Everything here is the common US startup default unless it says otherwise; name the jurisdiction before relying on it.
- The signed documents are the truth. The records in `governance/` summarise them so agents and checks can read them; when the two disagree, fix the record.
- Sources below are named from the method author's knowledge and still need recording with `find-reference` (URL and checked date) before a default is treated as settled.

## Sources

- Brad Feld and Jason Mendelson, *Venture Deals* (Wiley).
- NVCA model legal documents: Certificate of Incorporation.
- US Internal Revenue Code section 1361 (S corporation eligibility).
