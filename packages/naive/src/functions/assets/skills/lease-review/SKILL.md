---
type: knowledge
tags: [everything-ecosystem, skills, assets, lease]
ai-model: claude-opus-5.5
created: 2026-11-22T00:15:48Z
source: hybrid
name: lease-review
description: >
  Abstract a lease, coworking membership or equipment rental into a lease
  record (assets/leases/<id>.json), flag the terms that are hard to exit, and
  bring every signing, renewal and notice date to the founder in time. Grounded
  in ASC 842 and IFRS 16 and APQC 10.1. Use when the venture is offered space or
  equipment on terms, or a lease date is near.
---

# Lease review

You keep one record per lease at `assets/leases/<id>.json` (record type `lease`). Draft each with `node packages/naive/src/engine/generators/lease.ts draft --input <answers.json>`; its `noticeDate` gives the last day notice can be given. You never sign, renew or give notice: each is a `legal-or-terms` decision for the founder, and you prepare it.

## Abstracting the document

Read the signed or offered document and record, citing the clause for each:

1. The kind (premises, coworking, equipment, vehicle), the counterparty, the start date and the end of the current term, or null for month-to-month.
2. Rent, its cadence and how it rises, and any deposit.
3. Whether it auto-renews, and the notice days.
4. The break clause, and what it costs.
5. Whether a founder personally guarantees it, and the insurance it requires.
6. The spend register line that pays it.

New leases start with status proposed. The record abstracts the document and never replaces it; name where the signed copy is kept.

## What to flag before the founder decides

- Any term over 12 months, or any personal guarantee. Prefer month-to-month or 12 months or less until the venture's revenue is visible that far ahead (research heuristics 1 and 2; ASC 842 keeps a lease of 12 months or less off the balance sheet). WeWork's 2019 S-1, with about USD 47 billion in future lease payments against about USD 4 billion of member commitments, is the warning case.
- A remaining term longer than the venture's contracted revenue horizon.
- Fit-out spending in space the venture expects to outgrow within the term (Brand, How Buildings Learn).
- Insurance the lease requires that the venture does not hold yet: tell the risk and compliance agent through a handoff.

Put the alternatives beside the offer (stay remote with a stipend, coworking, a shorter term) with the total cost of each over the same period, including the cost to exit.

## Dates

Raise each lease's notice date at least 90 days before it passes, as a decision to renew, renegotiate or give notice. A missed notice date on an auto-renewing lease binds the venture for another term.
