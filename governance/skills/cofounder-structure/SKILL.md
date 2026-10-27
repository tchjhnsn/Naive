---
type: knowledge
tags: [everything-ecosystem, skills, governance, ownership, cofounders]
ai-model: claude-opus-5.5
created: 2026-10-27T15:49:30Z
source: hybrid
name: cofounder-structure
description: >
  Help a founder decide whether to have cofounders, who, in what roles, how to
  split founder equity, how it vests, and what happens if someone leaves; then
  record it as holders and grants in governance/ownership.json and a founder
  agreement (founder-agreement.json plus prose). Reads the venture's phase,
  ambition, legal form and members. Founder decision with counsel (EE-022).
  MANDATORY TRIGGERS: cofounder, co-founder, founding team, equity split, founder
  equity, vesting, cliff, founder agreement, founder leaves, 83(b), solo founder.
---

# Cofounder structure

Governance layer, ownership-and-control kit (EE-022). Writes `ownership.json` (founder holders and grants) and `founder-agreement.json` with its prose beside it. `node schema/check-governance.mjs` then requires an agreement once two or more founders share ownership.

## 1. Read the venture first

From `venture.json`: `phase`, `ambition`, `form` and `members`.

| State | What it usually needs |
| --- | --- |
| Hobby or lifestyle, sole owner | Nothing here. Record the owner as the only holder if the venture is formalized |
| Managed growth, one founder plus agents | A cap table with one founder and, later, an option pool; no founder agreement |
| Two or more people building it together | A founder agreement, vesting for every founder, IP assigned to the venture |
| Aggressive growth, raising venture capital | All of the above, in a form investors expect (in the US usually a Delaware C corporation, shares with vesting, an 83(b) election filed by each founder) |

## 2. The questions, in order

1. **Solo or team?** The trade-off is control against capacity: every cofounder dilutes control and adds skills, time and resilience (Wasserman's "rich versus king": founders who keep control tend to give up some value, and the reverse). Agents now cover much of the work a second founder once did; ask what only a person can bring (selling, a network, a skill, accountability).
2. **Who, and in what role?** Name each founder's role and time commitment (full-time or part-time). A part-time founder is a common source of later conflict; say so.
3. **How to split?**
   - Fixed split at the start, equal or weighted. Many investors and Y Combinator's partners favour near-equal splits among founders who start together, because unequal splits signal unequal commitment.
   - Dynamic split (Moyer's *Slicing Pie*), where each founder earns equity in proportion to what they put in until the venture is funded or profitable. Fits bootstrapped teams whose contributions are uneven or uncertain.
   Write the reasoning down; the number matters less than everyone agreeing why.
4. **Vesting.** The common default is four years with a one-year cliff, monthly after. Vesting protects the founders who stay from one who leaves early. In the US, founders who receive shares subject to vesting usually file an 83(b) election within 30 days of the grant; flag it to counsel.
5. **Acceleration.** Double-trigger (vesting speeds up only if the company is sold and the founder is let go) is the common default; single-trigger (on sale alone) is rarer and investors resist it.
6. **Departure.** Good leaver and bad leaver terms, and the buyback of unvested shares (commonly at cost).
7. **IP.** Every founder assigns to the venture what they have built for it and will build. A missing assignment is a common reason a financing stalls.
8. **Deadlock.** How two founders who disagree reach a decision (a named tie-breaker by domain, an independent director, or mediation).

## 3. Record it

- `ownership.json`: one holder per founder (`kind: founder`), one grant each with `vesting`.
- `founder-agreement.json`: the founders, their roles, commitment, `ip_assigned`, departure and deadlock terms, `signed` (null until signed) and `document`.
- `founder-agreement.md` beside it: the agreement in plain words, or where the signed copy is.

## Guardrails (all five ownership-and-control skills)

- These are **founder decisions made with counsel** (decision class `ownership-or-control`, level escalate). An agent lays out the options, the trade-offs and the sources, drafts the records and documents, and stops. It never signs, files or agrees to anything.
- Rules differ by country, state and legal form. Everything here is the common US startup default unless it says otherwise; name the jurisdiction before relying on it.
- The signed documents are the truth. The records in `governance/` summarise them so agents and checks can read them; when the two disagree, fix the record.
- Sources below are named from the method author's knowledge and still need recording with `find-reference` (URL and checked date) before a default is treated as settled.

## Sources

- Noam Wasserman, *The Founder's Dilemmas* (Princeton University Press, 2012).
- Mike Moyer, *Slicing Pie* (dynamic equity).
- Y Combinator guidance on cofounder equity splits.
