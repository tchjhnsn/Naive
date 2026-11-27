---
type: knowledge
tags: [naive, skills, external-relationships, apqc-12-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:48:39Z
source: hybrid
name: manage-government-and-industry-relationships
process_group: "12.2"
description: >
  Keep track of the bodies outside the venture that can license, certify, admit,
  audit or regulate it, and of the trade groups it pays to belong to. Load it in
  the four APQC 12.2 workflows, and when the founder asks who regulates this,
  what a certification would cost, whether a membership is worth renewing, or
  whether the venture is allowed to lobby for a rule change.
---

# manage-government-and-industry-relationships

You find out who outside the venture can say no to it, what each of them decides, and what each date and fee is. The founder makes every approach, every call and every filing. You contact nobody and file nothing.

This group produces almost no records of its own. The obligations register is risk and compliance's, so a rule change you find is handed on, not written over.

## The processes

### 12.2.1 Manage government relations

Runs `workflows/12-2-1-manage-government-relations.json`.

Work outward from the obligations the venture already has. Read `legal/obligations` and the venture's industry and places of business, and for each body answer three questions: what does it decide about the venture, what happens if it decides against, and does the venture have any contact there now. A body with no decision over the venture does not belong on the list, however large it is.

Monitoring is only worth doing with dates on it. Read each body's own rulemaking, guidance and deadline pages on the day of the run, and record every change against the obligation it affects with the source and the date read. The trap is a summary of a rule written from memory or from a secondary article: read the body's own page or write nothing. A change that moves a deadline goes to the function that owns that obligation as a handoff, because this function does not write the register.

Input from advisors is input the venture already holds. Ask the founders and the team what they know, and read the written guidance counsel has already given. Asking an outside advisor a new question costs money and is the founder's to spend.

To the person: who may speak to a body and sign what it asks for, which is `strategy-or-constitution`, and every call, letter and filing, which is `public-commitment`. Appointing someone other than the founder is usually premature in a venture of one, and the honest proposal says so.

### 12.2.2 Manage relations with quasi-government bodies

Runs `workflows/12-2-2-manage-relations-with-quasi-government-bodies.json`.

These are the bodies that are not government but act with its force: standards bodies, accreditation bodies, self-regulatory organizations, registries a buyer checks. For each one, say what it grants and what it costs in fees and in hours, because the hours are what a small venture actually cannot pay.

An inquiry is answered from the records, with the record named behind every fact, and what the records cannot answer is listed as such. Good evidence is a dated contact log: who was spoken to, what was asked, what was said, and what the venture promised with its date. Never write down a promise the founder did not make, and never take a meeting's silence as agreement.

To the person: joining or registering, which costs money and is `spend-money`, every approach, and sending any answer, which is `public-commitment`.

### 12.2.3 Manage relations with trade or industry groups

Runs `workflows/12-2-3-manage-relations-with-trade-or-industry-groups.json`.

Judge a membership by what it returned, not by whether it sounded useful. Put the fee from `finance/spend` beside what it produced since joining, counted from `deals`, `sales/opportunities` and `customers`: introductions, deals in the pipeline, a standard met. When it produced nothing, say so in those words.

The renewal date is the only cheap moment to leave, so the work is worth doing in the ninety days before one. The trap is counting attendance and brochures as a return.

To the person: joining, renewing, changing tier and leaving, each of which is `spend-money`.

### 12.2.4 Manage lobby activities

Runs `workflows/12-2-4-manage-lobby-activities.json`.

Most ventures do not lobby, and the right outcome of a first run is a record that says so plainly. When the founder does want a rule changed, two things come before any contact: the position in one sentence, and the registration and reporting line it would cross, read from the published thresholds where the venture operates and cited with the date read. Mark that reading as something counsel confirms, because crossing a registration threshold without knowing it is the whole risk here.

The case itself is drafted from the venture's own records and public sources with every claim cited. The founder sends it, takes the meeting and makes any public statement.

To the person: whether to pursue a position at all, and every statement, meeting and filing, which is `public-commitment`.

## Records

Read: `legal/obligations`, `legal/risks`, `industries`, `markets`, `finance/spend`, `deals`, `sales/opportunities`, `customers`, `evidence`, `operations/meeting`, `governance/delegation`, `governance/publication-policy`, `people/founders`, `people/team`, `knowledge/knowledge-sources`, `raw/sources`, `foundation/goals` and the open decisions.

Write: `operations/handoff/[id]` for every assessment, log and list, and `decisions/[id]` to raise a question.

A government body, a standards body and a trade group have no record type, and neither has a contact log nor a lobbying position: these are not built, so each one lives on the handoff as evidence until a record type exists. The obligations register itself is risk and compliance's to write, so a rule change is handed to it.

## Standards

- The United States Lobbying Disclosure Act sets registration and reporting thresholds for federal lobbying, and states and cities set their own. Read the thresholds that apply where the venture operates from the body that publishes them, and treat the reading as a question for counsel rather than an answer.
- ISO/IEC 17000 series terms for conformity assessment, which is what an accreditation or certification body does, when the venture needs to tell certification, accreditation and registration apart.

## What the person decides

- Who may speak to a government or quasi-government body, and who signs what it asks for.
- Every call, letter, filing, meeting and public statement.
- Whether to join, renew, change tier or leave a trade or industry group, and what to pay for it.
- Whether the venture pursues a rule change at all, and whether counsel is engaged first.
- Whether to pay for a certification or a registration.
