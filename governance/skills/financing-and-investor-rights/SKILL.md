---
type: knowledge
tags: [everything-ecosystem, skills, governance, financing, safe, investor-rights]
ai-model: claude-opus-5.5
created: 2026-10-27T15:49:30Z
source: hybrid
name: financing-and-investor-rights
description: >
  Help a founder decide whether and how to take outside money and what rights
  investors get in return: bootstrapping, grants, debt, SAFEs, convertible
  notes and priced rounds; liquidation preference, anti-dilution, pro-rata,
  information rights, board seats, protective provisions, drag-along,
  tag-along and right of first refusal. Records instruments and rights in
  governance/ownership.json. Founder decision with counsel (EE-022).
  MANDATORY TRIGGERS: fundraising, raise money, investors, SAFE, convertible
  note, priced round, seed round, Series A, term sheet, valuation cap,
  liquidation preference, anti-dilution, pro-rata, investor rights.
---

# Financing and investor rights

Governance layer, ownership-and-control kit (EE-022). Writes `instruments` and class `rights` in `ownership.json`; `venture.json` `form.funding` names the overall source.

## 1. Whether to raise at all

Read `ambition` first.

- **Hobby, survival, lifestyle, managed growth:** bootstrapping, revenue, grants or debt usually fit better. Equity investors expect aggressive growth and an exit; taking their money commits the venture to that path.
- **Aggressive growth:** outside equity is common. Raise for a milestone that moves the venture to its next phase, not for a length of time.

## 2. Instruments

| Instrument | What it is | Common terms |
| --- | --- | --- |
| Post-money SAFE (Y Combinator, 2018) | Right to future shares at the next priced round; not debt | Valuation cap, sometimes a discount; the investor's share is roughly amount divided by cap |
| Convertible note | Debt that converts at the next round | Interest, maturity date, cap, discount |
| Priced round | Preferred shares bought at a set price | Term sheet; NVCA documents are the common basis |
| Debt or revenue-based finance | Repaid from cash flow | No ownership given up; needs revenue |

Record each SAFE or note in `instruments` (amount, cap, discount, `converts_to`). A priced round adds a preferred class and grants.

## 3. Investor rights, and the market default

| Right | Founder-friendly default | Watch for |
| --- | --- | --- |
| Liquidation preference | 1x, non-participating | Multiples above 1x; participating preferred ("double dip") |
| Anti-dilution | Broad-based weighted average | Full ratchet |
| Board seat | One seat for the lead investor | Investor majority of the board early |
| Protective provisions | The NVCA standard list | Vetoes over the budget, hiring or ordinary operations |
| Pro-rata | Major investors only | Super pro-rata |
| Information rights | Annual and quarterly financials | Rights for every small holder |
| Drag-along | Triggered by the board and a majority of preferred and common | Triggered by investors alone |
| Right of first refusal and co-sale | On founder share sales | Covering transfers to family trusts |
| Redemption | None | Investors' right to be bought out on a date |

Record the rights each class or instrument grants in its `rights`. Board seats must match `board.json`, which `check-governance.mjs` checks.

## 4. Before signing

Run `node packages/naive/src/engine/payouts.mjs <venture> <value>` at a low, a middle and a high sale value to see what the terms mean for each holder.

## Guardrails (all five ownership-and-control skills)

- These are **founder decisions made with counsel** (decision class `ownership-or-control`, level escalate). An agent lays out the options, the trade-offs and the sources, drafts the records and documents, and stops. It never signs, files or agrees to anything.
- Rules differ by country, state and legal form. Everything here is the common US startup default unless it says otherwise; name the jurisdiction before relying on it.
- The signed documents are the truth. The records in `governance/` summarise them so agents and checks can read them; when the two disagree, fix the record.
- Sources below are named from the method author's knowledge and still need recording with `find-reference` (URL and checked date) before a default is treated as settled.

## Sources

- Brad Feld and Jason Mendelson, *Venture Deals* (Wiley).
- Y Combinator, post-money SAFE (2018) and its user guide.
- NVCA model legal documents: Term Sheet, Investors' Rights Agreement, Voting Agreement, Right of First Refusal and Co-Sale Agreement.
