---
type: knowledge
tags: [everything-ecosystem, skills, governance, board, advisors]
ai-model: claude-opus-5.5
created: 2026-10-27T15:49:30Z
source: hybrid
name: board-design
description: >
  Help a founder decide whether and when to have a board, formal or advisory;
  its size and seats (founder, investor, independent, observer); who appoints
  each seat; which matters only the board may decide; and which powers the
  founders keep. Also covers advisors and an advisory board. Records it in
  governance/board.json. Founder decision with counsel (EE-022).
  MANDATORY TRIGGERS: board, board of directors, board seat, independent
  director, observer, advisory board, advisor, adviser, reserved matters,
  protective provisions, board control, when do I need a board.
---

# Board design

Governance layer, ownership-and-control kit (EE-022). Writes `board.json`; `check-governance.mjs` checks every seat against `ownership.json`.

## 1. Whether, and when

| State | Board |
| --- | --- |
| Hobby, lifestyle, sole owner | None. A corporation still has directors in law, often just the founder; record that as a one-seat formal board |
| Managed growth, bootstrapped | Optional. An **advisory board** often helps more than a formal one: advice without giving up control |
| First priced round (seed or Series A) | A **formal board** is usually a condition of the round. `check-governance.mjs` requires one with venture-capital funding |
| Later rounds, many investors | Larger board, independent directors, committees (audit, compensation) |

A SAFE or note alone usually does not bring a board seat.

## 2. Size and seats

- Odd numbers avoid deadlock. A common seed board is three: two founder seats and one investor seat, or one founder, one investor and one independent agreed by both. A common Series A board is five.
- **Who appoints each seat matters more than who sits there.** Seats appointed by the common shareholders (in practice, the founders) keep control with the founders; seats appointed by a preferred class go to investors; an independent seat chosen by the board balances them.
- **Observers** attend but do not vote; investors often ask for one in place of a seat.
- Write each seat as `{ id, person, type, appointed_by }`; an investor seat's `appointed_by` must hold the `board-seat` right in `ownership.json`.

## 3. Powers: what the board decides and what founders keep

- **Reserved matters** (only the formal board decides): issuing or reclassifying shares, the annual budget, hiring or removing the CEO, selling, merging or winding down, large debt.
- **Investor protective provisions** are separate: votes held by the preferred shareholders themselves, whatever the board says (NVCA model documents). They usually cover new senior shares, changing their rights, selling the company and changing the board's size.
- What founders keep depends on the seats they appoint, their share of the votes (including super-voting shares, see `equity-and-share-classes`) and what is left out of the reserved matters.

## 4. Advisors and the advisory board

- An advisory board advises and decides nothing; `check-governance.mjs` refuses reserved matters on it.
- Advisors usually get small common-stock grants with vesting, often over two years, under a standard agreement. The Founder Institute's FAST (Founder/Advisor Standard Template) is the common starting point. Record the advisor as a holder (`kind: advisor`) with `agreement` and the grant in `ownership.json`, and their seat on the advisory board.
- Agree what the advisor will actually do and how often before agreeing the grant.

## 5. Cadence

Formal boards of early companies commonly meet every six weeks to quarterly; advisory boards quarterly or as needed. Record `meets`.

## Guardrails (all five ownership-and-control skills)

- These are **founder decisions made with counsel** (decision class `ownership-or-control`, level escalate). An agent lays out the options, the trade-offs and the sources, drafts the records and documents, and stops. It never signs, files or agrees to anything.
- Rules differ by country, state and legal form. Everything here is the common US startup default unless it says otherwise; name the jurisdiction before relying on it.
- The signed documents are the truth. The records in `governance/` summarise them so agents and checks can read them; when the two disagree, fix the record.
- Sources below are named from the method author's knowledge and still need recording with `find-reference` (URL and checked date) before a default is treated as settled.

## Sources

- Brad Feld and Mahendra Ramsinghani, *Startup Boards* (Wiley, 2013).
- National Venture Capital Association (NVCA) model legal documents: Voting Agreement, Certificate of Incorporation.
- Founder Institute, FAST (Founder/Advisor Standard Template).
