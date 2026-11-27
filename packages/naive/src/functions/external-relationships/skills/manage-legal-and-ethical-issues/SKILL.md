---
type: knowledge
tags: [naive, skills, external-relationships, apqc-12-4]
ai-model: claude-opus-5-5
created: 2026-11-27T03:48:39Z
source: hybrid
name: manage-legal-and-ethical-issues
process_group: "12.4"
description: >
  The venture's legal and ethical work that an agent may safely do: writing the
  rules the venture will not break, keeping its governance records consistent,
  preventing the disputes it can see coming, proving its obligations were met,
  running outside counsel, holding its intellectual property, handling a dispute,
  answering a legal question from written sources, and marking up a contract.
  Load it in the nine APQC 12.4 workflows, and whenever the founder asks whether
  the venture is allowed to do something.
---

# manage-legal-and-ethical-issues

You read, assemble, compare and draft. You do not practise law, and you say so wherever the answer needs legal judgment. The founder signs, pays, engages counsel and adopts every rule.

Two lines hold everywhere in this group. Anything from counsel is privileged: keep it where the venture keeps privileged records and out of anything public. And nothing that disagrees with a record is quietly reconciled: name the conflict and the record it conflicts with.

## The processes

### 12.4.1 Create ethics policies

Runs `workflows/12-4-1-create-ethics-policies.json`.

Read `foundation/alignment`, `governance/pillar`, `governance/decision-rights` and `foundation/constraints` before writing a word, so the policy restates nothing the venture has already committed to. Then draft only the rules that would change a decision, each with a real case it would have decided differently. A rule with no such case is a slogan and does not belong in the record.

Say who hears a concern about conduct and what happens next, including the honest answer in a venture of one, which is the founder alone.

To the person: adopting the rules, which is `strategy-or-constitution`, and the answer to who hears a concern, which only they know.

### 12.4.2 Manage corporate governance policies

Runs `workflows/12-4-2-manage-corporate-governance-policies.json`.

The work is consistency, not drafting. Read `governance/decision-rights`, `governance/delegation`, `governance/board`, `governance/founder-agreement`, `governance/ownership`, `governance/internal-terms` and `governance/exit`, list what each settles, and then name every place two of them disagree: a class delegated to a role the board reserves, a signing right nobody holds, a vesting term the agreement and the cap table state differently.

Order the conflicts by what breaks if nobody fixes them, and propose the smallest change that settles each one, in the words the record would carry. Never edit a governance record yourself: these are the records that say who may decide, so changing one to fit the others is the one mistake that cannot be undone from inside.

To the person: every change, which is `strategy-or-constitution` or `ownership-or-control`.

### 12.4.3 Develop and perform preventive law programs

Runs `workflows/12-4-3-develop-and-perform-preventive-law-programs.json`.

Preventive work beats dispute work by an order of magnitude, so look where disputes actually start in a small venture: work done with no signed scope, a promise in public that the product does not keep, data held with no stated basis. Read `legal/risks`, `deals`, `service-delivery/offers`, `service-delivery/engagements` and `support/cases`, order the places by what each would cost, and give each one habit that prevents it and one function that owns that habit.

A habit nobody owns is not prevention. The cheapest of all is checking a public claim against a record before it is published, which is why the marketing claims step reads `marketing/message` and `marketing/content`.

To the person: whether to adopt a habit that changes how other functions work.

### 12.4.4 Ensure compliance

Runs `workflows/12-4-4-ensure-compliance.json`.

Two halves, and the second is the one that matters. First, derive what applies from the venture's legal form, industry and places of business, and compare it with `legal/obligations`, handing the gaps to risk and compliance with the source and the date read. Second, for everything due in the next quarter, find the evidence it was met in `evidence` and the records the obligation names, and hand each unproven one to its owner with the days remaining.

Good evidence is a dated artifact, a filed return, a receipt, a passing check, not a note that someone remembers doing it. The trap is a register that looks complete because nothing has been checked against reality.

To the person: anything that costs money to put right, and anything the records cannot prove.

### 12.4.5 Manage outside counsel

Runs `workflows/12-4-5-manage-outside-counsel.json`.

Counsel is expensive per hour and cheap per good question, so the whole method is to arrive with the question already written: what happened with dates, what the venture wants, the records that bear on it, the deadline, and which parts the venture's own records already answer. That last part is what stops the venture paying for work it has already done.

Keep the engagement letter's rate and fee cap, the strategy and budget as received with the date, and a matter log of every document, filing, deadline and task owed, naming every deadline inside fourteen days. Check each invoice line against the rate and the approved budget and list every line outside them. Afterwards, record what was spent against what was budgeted and whether the outcome matched what counsel predicted, which is what makes the next choice of counsel cheap.

To the person: engaging counsel, which is `spend-money` and `legal-or-terms`, signing the engagement letter, and approving every payment. You never pay and never sign.

### 12.4.6 Protect intellectual property

Runs `workflows/12-4-6-protect-intellectual-property.json`.

Ownership on paper is the whole question. For each asset, the venture's name and marks from `marketing/brand`, the product's code and written work, any invention, say whether it is registered, where, who holds it on paper, and the next renewal or filing date. Then say what the venture may and may not do with it: the licence of everything it ships that it did not write, the assignment from each founder and contractor, and anything it cannot use publicly.

A missing assignment from a founder or a contractor is the most common and most expensive gap, and it is cheapest to fix before anyone has a reason to argue. Licences and options that renew or lapse on their own are the other trap, so name the ones falling due in the next ninety days.

To the person: registering anything, which costs money, agreeing to any licence term, which is `legal-or-terms`, and asking a founder or contractor to sign an assignment.

### 12.4.7 Resolve disputes and litigations

Runs `workflows/12-4-7-resolve-disputes-and-litigations.json`.

Build the timeline from the records alone, with where each document sits and what the records do not show marked plainly, because a timeline that mixes memory with records cannot be relied on later. Put a hold on everything the dispute reaches before anything else is done, saying which records must be kept and from what date, so nothing is deleted or archived while it is open.

Then write what each side wants, with the least the venture would accept, asking the founder for what was said and promised outside the records. Cost settle, defend and do nothing in money and in the founder's weeks, with what would have to be true for each to be right. The founder's weeks are usually the larger cost and the one nobody writes down.

To the person: the choice, every communication with the other side, and anything filed, which goes through counsel.

### 12.4.8 Provide legal advice/counseling

Runs `workflows/12-4-8-provide-legal-advice-counseling.json`.

You are not counsel, and this process exists to make that boundary useful rather than paralysing. Name the question, the decision it blocks and the date it is needed by, and when no decision waits on it, stop. Answer only from the venture's own records and public primary sources, quoting the clause, statute or rule and the date you read it, and mark every part the sources do not answer.

Then say plainly which part is legal judgment the venture should not take from an agent, and hand that part to the founder with the page already written, so counsel starts from it. Never paraphrase a rule you have not read in the original, and never give a conclusion where the sources give only text.

To the person: whether to engage counsel, which is `spend-money`, and any reliance on the answer.

### 12.4.9 Negotiate and document agreements/contracts

Runs `workflows/12-4-9-negotiate-and-document-agreements-contracts.json`.

Read the draft against what the venture has already decided: a price in `service-delivery/offers`, an exclusivity `foundation/icp` contradicts, a data term `governance/publication-policy` forbids, a limit in `foundation/constraints`. Name the record each conflicting term conflicts with, so the founder argues from the venture's own decisions rather than from taste.

Then rank the open terms by what each would cost if it went the other way and write, for each, the position, the reason and the least the venture would accept. Draft the changed wording as a proposal only. After signing, record the parties, dates, fee, term and how it ends with where the signed file sits, and hand every obligation it creates to the function that must meet it, which is how a contract stops being a document nobody reads again.

To the person: negotiating, initialling and signing, which is `legal-or-terms`. An agent never agrees to a term.

## Records

Read: `legal/obligations`, `legal/risks`, `evidence`, `deals`, `service-delivery/offers`, `service-delivery/engagements`, `support/cases`, `customers`, `finance/budget`, `finance/spend`, `governance/decision-rights`, `governance/delegation`, `governance/board`, `governance/founder-agreement`, `governance/ownership`, `governance/internal-terms`, `governance/exit`, `governance/publication-policy`, `governance/pillar`, `foundation/alignment`, `foundation/constraints`, `foundation/icp`, `marketing/brand`, `marketing/message`, `marketing/content`, `product`, `product/capabilities`, `people/founders`, `people/team`, `industries`, `markets`, `operations/handoff` and the open decisions.

Write: `operations/handoff/[id]` for every register, timeline, matter log and markup, and `decisions/[id]` to raise what the founder must settle.

`legal/obligations` and `legal/risks` are risk and compliance's to write, so a gap found here is handed to it. An ethics policy, a contract register, a matter file for outside counsel, an intellectual property register, a litigation hold and a dispute record have no record type at all: these are not built, and each lives on the handoff as evidence until one exists.

## Standards

- The venture's own governance records are the authority on who may decide and who may sign. `governance/decision-rights` and `governance/delegation` outrank anything in this skill.
- ISO 31000 risk management vocabulary, which `legal/risks` follows in holding a cause, a consequence, an owner and likelihood and impact as ranges.
- Legal privilege attaches to communications with counsel. Keep them in the venture's privileged records and quote them in nothing public. The function's capability clusters name this: signatures and privileged records.
- This skill is not legal advice, and neither is anything the agent writes under it.

## What the person decides

- Adopting any rule the venture will hold itself to.
- Every change to a governance record.
- Engaging outside counsel, signing the engagement letter, and approving each invoice.
- Signing, initialling or agreeing to any term of any agreement.
- Registering intellectual property, and asking anyone to sign an assignment.
- Settling, defending or doing nothing about a dispute, and every word sent to the other side.
- Whether a legal question is worth paying counsel to settle.
