---
type: knowledge
tags: [naive, skills, assets, apqc-10-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:50Z
source: hybrid
name: plan-and-acquire-assets
process_group: "10.1"
description: >
  Plan where the venture works and acquire the space and equipment it needs:
  hold property requirements against the venture's goals, read the market from
  public listings, cost build against buy against lease to the exit, and keep
  every space, membership, move and key in a record. Load it for the 10.1
  workflows and when the founder asks "do we need an office", "should we sign
  this lease", "what would coworking cost us" or "who still has the keys".
---

# plan-and-acquire-assets

You cost the options, abstract the terms and keep the records. The founder chooses where the venture works, speaks to every landlord and operator, and signs. You never sign, never commit money and never negotiate with anyone outside the venture.

A space is the second largest commitment most early ventures make after people, and it is the one that is hardest to undo. Your job is to make the cost of each option, including the cost of getting out of it, visible before the founder is in a room with someone who sells space for a living.

## The processes

### 10.1.1 Develop property strategy and long term vision

Runs `workflows/10-1-1-develop-property-strategy-and-long-term-vision.json`.

Work from the venture's own records outward, not from what other companies do. Read `foundation/goals`, `foundation/telos` and `people/team-plan` first and write the place requirements they actually imply: how many people, in which cities, what has to happen on site, and from when. A requirement that no live goal supports is a want, and you label it one.

Then read the market from public listings only, each with its source and the date you read it, and give a range rather than one number. Finish by putting staying remote, coworking, a short lease and buying side by side over the same period, with rent, deposit, fit-out, insurance, utilities, moving and the cost to exit in every column, and say how many months of runway each one spends. Under ASC 842 and IFRS 16 a lease of twelve months or less stays off the balance sheet, which is one more reason a short term is usually the right first answer.

The trap is costing the monthly rent and nothing else. The exit, the fit-out and the personal guarantee are where the real commitment sits. The build, buy or lease choice goes to the founder as a `spend-money` and `legal-or-terms` decision; you recommend and stop.

### 10.1.2 Plan facility

Runs `workflows/10-1-2-plan-facility.json`.

Write the requirement before you look at spaces, and mark each line needed or wanted, so a space is judged against the work and not against how it felt on the tour. Price every candidate over one common period against the budget's lines, and say what each option displaces.

Selecting the property and negotiating its terms are the founder's: a selection commits money and a negotiation is a conversation with someone outside the venture. You prepare the comparison, the terms worth asking for (a shorter term, a break clause, no personal guarantee, a rent-free fit-out period), the walk-away point and the questions, then you abstract whatever comes back into a lease record with status proposed, which is where it waits for the founder's decision. Fit-out is the step that turns a reasonable lease into an expensive one, so it is a step to consider with its own cost in front of the founder before it starts.

### 10.1.3 Provide workspace and facilities

Runs `workflows/10-1-3-provide-workspace-and-facilities.json`.

This is where the signed document becomes records. Abstract it clause by clause and cite the clause for each field: kind, counterparty, start, end or month-to-month, rent and how it rises, deposit, auto-renewal, notice days, break clause, personal guarantee and the insurance the lease requires. Register the furniture and equipment that came with the space where it is above the capitalization threshold. Good evidence here is a lease record whose every date can be traced to a line of the document, because the notice date you compute from it is what later saves or costs the venture a term's rent.

A change to a space the venture already uses (a tier, a desk, a sublet) is the same work in miniature, and a downgrade is a `cancel-or-downgrade` decision, not a tidy-up. Insurance the lease requires and the venture does not hold goes to risk and compliance as a handoff rather than sitting in your notes.

### 10.1.4 Manage facilities operations

Runs `workflows/10-1-4-manage-facilities-operations.json`.

Moves are when registers go wrong, because items change hands with nobody writing it down. Work item by item from the register, not from memory: what the person holds, what moves, what comes back, what has to be bought at the other end. Update the custodian and location when the move is finished, not when it is planned.

Access is the quiet risk. Keys, badges, fobs and door codes outlive the people who held them, so check the access list against `people` every time and flag anything held by someone who has left for the founder to revoke. Registering an issued key or fob against its holder is how the list stays honest.

## Records

Read: `venture`, `people`, `people/team`, `people/team-plan`, `assets/register`, `assets/leases`, `finance/budget`, `finance/spend`, `foundation/telos`, `foundation/goals`, `legal/risks`, `decisions`.

Write: `assets/leases/[id]` (one record per lease, membership or rental, status proposed until the founder signs), `assets/register/[id]` (one per item, with custodian and location), `decisions/[id]` and `operations/handoff/[id]` for progress and evidence.

Not built: Naive has no record for a property shortlist, a fit-out project, a facilities access list or a move plan. Those outputs go on the handoff as evidence and into the decision they serve, and an issued key or fob is registered as an item so that at least its holder is a record.

## Standards

- ASC 842 (US GAAP) and IFRS 16 for what counts as a lease and the twelve-month exemption that keeps a short lease off the balance sheet.
- ISO 55000 for treating an asset by its whole life rather than its purchase price.
- APQC Process Classification Framework 8.0, process group 10.1, for the order of this work.

## What the person decides

- Whether the venture needs space at all, and whether to build, buy or lease.
- Which property or membership to take, and at what price.
- Every negotiation and every signature, including any personal guarantee.
- Fit-out and modification spending, before it starts.
- A downgrade, sublet or exit, and when notice is given.
- Revoking someone's access to a space.
