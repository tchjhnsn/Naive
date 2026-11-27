---
type: knowledge
tags: [naive, skills, finance, apqc-9-9]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:58Z
source: hybrid
name: manage-taxes
process_group: "9.9"
description: >
  Keep the venture's tax position known and its returns assembled, for the
  finance agent: which taxes it owes where, the calendar and the cash for each
  deadline, the registrations and identifiers, and each return built from
  reconciled records for a licensed preparer to file. Load it for the two
  workflows of APQC 9.9 and whenever the founder asks "what tax do we owe",
  "when is it due" or "do we have to register here".
---

# manage-taxes

You find out which taxes apply, keep the calendar and the cash for them, and assemble each return from the records with a source for every figure. The founder and their accountant decide every tax position, and the founder or a licensed preparer files and signs every return and answers every notice. Nothing you produce is tax advice, and you say so on each piece of work.

## The processes

### 9.9.1 Develop tax strategy and plan

Runs `workflows/9-9-1-develop-tax-strategy-and-plan.json`.

Begin with liability, not with optimization: list every tax the venture is exposed to by jurisdiction, with the rate, the payee, the deadline and the form, and mark the ones it is not registered for. Registration is the item that bites, because it usually takes longer than the first deadline allows and penalties often run from the date the obligation began rather than the date anyone noticed. Then build the calendar and put each deadline's estimated amount into its month in `finance/budget/[id]`, so the money is there before the date. Record the identifiers and registration dates with the document each came from, and never write down anything that is a credential. Good evidence is a tax list where each line names the authority and the form. The trap is assuming one jurisdiction: selling to customers elsewhere can create an obligation without anyone moving.

The founder's accountant confirms the list, and the founder decides what to register for.

### 9.9.2 Process taxes

Runs `workflows/9-9-2-process-taxes.json`.

Reconcile before you assemble, because a return built on unreconciled records is a return that will be amended. Build each one figure by figure with the record behind it and list what is still missing rather than estimating the gap. Planning is a real step but it belongs before the year ends, when the choices are still open, and it ends with options handed to the accountant rather than a position taken. Record what was owed, paid and reclaimable against the budget's tax lines and reconcile it to what actually left the accounts, so the tax that was budgeted and the tax that was paid cannot drift apart. Good evidence is a return whose every figure can be traced back into the reconciled records. The trap is treating sales or value added tax collected from a customer as revenue: it is money held for an authority.

Every return is filed and signed by the founder or their licensed preparer, and only they reply to a tax authority.

## Records

Read: `finance/spend/[id]`, `finance/budget/[id]`, `money/[id]`, `purpose/money/summary`, `customers/[id]`, `deals/[id]`, `product/[id]`, `assets/register`, `governance/ownership`, `legal/obligations`, `markets`, `industries`.

Write: `finance/budget/[id]` for the tax amount due in each month and the tax owed, paid and reclaimable for the period, `decisions/[id]` to put a registration, an amount due or a late filing in front of the founder, and `operations/handoff/[id]` for the tax list, the calendar, the identifiers, the assembled returns and the timeline a notice needs.

Not built: Naive has no record for a tax, a tax registration, a tax return, a filing deadline or a tax authority notice. The list, the calendar, the identifiers and the returns go on the handoff as evidence, the amounts go into `finance/budget/[id]`, and a filing obligation the venture must track long term belongs in `legal/obligations`, which the legal side owns.

## Standards

- Income taxes are accounted for under ASC 740 in the United States and IAS 12 internationally, which is what the deferred tax step is about: a difference between the books and the return that reverses in a later year.
- Sales and value added taxes are collected from the customer on the authority's behalf and are not the venture's revenue.
- Nexus, the connection that makes a venture liable for tax in a place. In the United States, selling into a state can create an obligation to collect sales tax there without any physical presence, and the thresholds differ by state.
- Tax treaties and foreign tax credits exist to stop the same income being taxed twice, but relief is claimed rather than applied automatically, which is why the foreign step hands the question to an accountant.
- Record retention: tax records are kept for the period the authority may still examine them, which differs by jurisdiction and by the kind of return.
- Preparing a return is not the same as advising on it or signing it. In many jurisdictions signing as a paid preparer is restricted to licensed people, and in this module the founder or their preparer always signs.

## What the person decides

- Which jurisdictions the venture registers in, and when.
- Every tax position, with their accountant: the entity's treatment, what is capitalized, what is claimed, which year a cost falls in.
- Whether to pay each amount due, and in what order when cash is short.
- Who prepares and signs each return.
- What is said to a tax authority in reply to a notice, a question or an assessment.
