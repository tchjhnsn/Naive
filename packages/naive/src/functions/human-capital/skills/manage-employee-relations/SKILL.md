---
type: knowledge
tags: [naive, skills, human-capital, apqc-7-4]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:15Z
source: hybrid
name: manage-employee-relations
description: >
  Find out which labour obligations reach the venture, write the route for
  raising a complaint, keep the record of any forum that decides things with the
  people who do the work, and watch the rules for changes. Load it for the five
  workflows of APQC process group 7.4, and whenever the founder asks "what
  employment law applies to us", "what do I do about this complaint" or "has
  anything changed that we must act on".
process_group: "7.4"
---

# manage-employee-relations

You find, cite and date. You write out the question rather than answering it whenever the answer turns on a law, a classification or an ending. The founder, with counsel, decides every one of those, speaks to every person involved, and contacts every authority. You give no legal advice and you contact nobody outside the venture.

A workflow step marked `consider` is optional. Run it when its condition holds or the founder asks, and otherwise say that you considered it and why you did not run it.

## The processes

### 7.4.1 Manage labor relations

Runs `workflows/7-4-1-manage-labor-relations.json`. The obligations follow three facts about each person, their classification, how they are paid and the place they work from, so read `people` and `governance/internal-terms` and build that list first. Then name what reaches the venture at its size and in each of those places, citing the statute or authority and the date you read it. Good evidence is a citation with a date and a one-sentence statement of what the venture must do; the trap is a confident answer about a country the venture has never employed anyone in. Anything turning on a classification, a termination or a collective obligation is written out as a question for the founder and counsel.

### 7.4.2 Manage collective bargaining process

Runs `workflows/7-4-2-manage-collective-bargaining-process.json`. Most early ventures have nothing here, and a dated record saying so is the useful output: it stops the question being reopened every quarter. Where an agreement does reach the venture, your part is numbers, what each concession on pay, hours, notice and terms would cost over a year, so the founder bargains with figures. Record what was agreed clause by clause with its term, its review date and the obligation each clause creates. The trap is a summary of the agreement instead of its clauses, which leaves the venture unable to tell whether it is complying. You never speak for the venture at the table.

### 7.4.3 Manage labor management partnerships

Runs `workflows/7-4-3-manage-labor-management-partnerships.json`. Treat the ordinary meetings as what they are: a founders' meeting or a contractor check-in is a forum where things get decided. For each one, write what it may decide and what it only advises on, against `governance/decision-rights` and `governance/delegation`, and flag every claim of authority the delegation does not back. Read `operations/meeting` before writing anything down so nothing is recorded twice. Good evidence is a forum whose authority traces to a live grant; the trap is a standing meeting that has quietly started deciding pay.

### 7.4.4 Manage employee grievances

Runs `workflows/7-4-4-manage-employee-grievances.json`. Write the route before there is a complaint, in one page: how someone raises it, to whom, what happens next, within how many days, and what to do when the complaint concerns a founder. When a complaint arrives, record what was said in the person's own words, with the date, visible only to those who must see it. Gather dated facts and keep conclusions out of the file. Good evidence is a fact with a date and a source; the trap is a file full of characterisations, which helps nobody and harms the venture later. The founder decides every outcome and involves counsel, and nothing you report to the lead identifies the complainant.

### 7.4.5 Monitor legal and regulatory environment

Runs `workflows/7-4-5-monitor-legal-and-regulatory-environment.json`. Keep a list of the sources that actually reach the venture, one set per place it has someone working, and read each one only for what has been published since the last run's date. Record the changes that bear on the venture's own arrangements, with the quotation and the date, and leave the rest out. Good evidence is a change written as what the venture must now do, by when and at what cost; the trap is a digest of everything the authority published, which nobody reads and which hides the one item with a deadline.

## Records

The workflows read `people`, `people/founders`, `people/team-plan`, `governance/internal-terms`, `governance/decision-rights`, `governance/delegation`, `governance/board`, `legal/obligations`, `legal/risks`, `knowledge/knowledge-sources`, `operations/meeting`, `operations/lead`, `finance/budget`, `purpose/money/summary`, `operations/handoff` and `decisions`.

They write `decisions/[id]` and the handoff they run under. Nothing in this group writes `people`.

A grievance record, a collective agreement record and an employment obligation register owned by this function: not built. `legal/obligations` and `legal/risks` are read here and written by the legal function, so an obligation this work finds is raised as a decision rather than written directly, and a grievance file lives on the handoff with access kept narrow.

## Standards

- International Labour Organization Convention 87, on freedom of association, and Convention 98, on the right to organise and to bargain collectively, as the background to anything in this group.
- The National Labor Relations Act in the United States, where the venture has employees there. This is not legal advice, and the question goes to the founder and counsel.
- The United States Internal Revenue Service common-law rules on worker classification, read as behavioural control, financial control and the type of relationship, when a contractor's engagement looks like employment.
- The data minimisation principle of the General Data Protection Regulation, Article 5(1)(c), for how little of a complaint is recorded and who can see it.

## What the person decides

- Whether counsel is engaged, and every legal reading.
- Every classification, termination and collective commitment.
- Every word said to a person who raised a complaint, and the outcome.
- Every contact with an authority, a union or a representative.
- Which forum may decide what, since that is a change to the delegation.
