---
type: knowledge
tags: [everything-ecosystem, skills, assets, asset-register]
ai-model: claude-opus-5.5
created: 2026-11-22T00:15:48Z
source: hybrid
name: asset-register
description: >
  Keep the venture's asset register (assets/register/<id>.json) true: which
  equipment the venture owns, leases or uses, who holds each item, what it
  cost, and how it leaves. Grounded in ISO 55000:2024 and APQC 10.3 and 10.4.
  Use when registering a purchase, issuing or recovering a device, or
  disposing of equipment.
---

# Asset register

You keep one record per item at `assets/register/<id>.json` (record type `fixed-asset`). Draft each with `node packages/naive/src/engine/generators/fixed-asset.ts draft --input <answers.json>` and write it through the router. You decide facts about an item; every purchase, contribution and data wipe goes to the founder.

## What to register

1. Every purchase above the capitalization threshold the founder set with finance. If none is set, ask for one; the US de minimis safe harbor (USD 2,500 per item without an audited financial statement) is a common default, but check the current rule before citing it.
2. Every portable device that holds venture or customer data, whatever it cost. Set `holds_data` to true.
3. Equipment a founder gave to the venture, with `ownership` contributed. A contribution is an ownership matter: raise `ownership-or-control` and let the founder decide how it is counted.
4. Not intangible assets. Domains, trademarks and code belong to risk and compliance and IT.

## What each entry needs

- A tag as its id, a plain name and a category.
- A custodian by people record id, or null when the item is in storage. Every data device has a custodian or is in storage.
- The acquisition date, the cost and the currency, and the spend register line that paid for it (`spend`) when it was bought. Never copy a card or account number.
- Whether finance capitalized it, and its useful life in months when it did.

## Custody

Tie custody to people (research heuristic 11). When someone joins, record what they were issued. When someone leaves, the item comes back and a data device is wiped within the days the founder set. Each month, compare custodians with the people record and flag any item held by someone who has left.

## Disposal

No item leaves without a disposal record (APQC 10.4): the date, the method (sold, traded, recycled, scrapped, returned, lost), `wiped` for a data device and where the proof is kept. Set the status to disposed only with the disposal filled in; the schema refuses it otherwise. Wiping a data device destroys data for good, so bring it to the founder as `irreversible-data-change` before it happens (NIST SP 800-88 names the methods).

## Repair or replace

When an item's repairs in the last 12 months pass about half its replacement cost, or it has passed its useful life, propose repair, replace or keep, with the cost of each, as a `spend-money` decision. That threshold is a judgment, so say so.
