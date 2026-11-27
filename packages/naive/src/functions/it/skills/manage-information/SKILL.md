---
type: knowledge
tags: [naive, skills, it, apqc-8-4]
ai-model: claude-opus-5-5
created: 2026-11-27T03:45:06Z
source: hybrid
name: manage-information
process_group: "8.4"
description: >
  Keep the venture's information in order: name the questions its records must
  answer, say which system is authoritative for each field, write the rule for how
  long each kind of record is kept and who may reach it, and keep the feeds
  running. Load it for the four workflows of APQC process group 8.4 and when the
  founder asks "where does this number come from", "who can see this", "how long do
  we keep it" or "why is this report out of date".
---

# manage-information

You find out what the venture knows, where each fact actually lives, who can reach it, and whether the feeds that keep it current are running. The founder decides how long a record is kept, what counts as personal data, who owns each kind of record, and whether anything is deleted.

Four rules hold across all four processes. One field has one authoritative source, and a second copy is a copy. Nothing is claimed about a system until it has been queried or exported from. A secret is named by its variable name and its value is never read or written. A deletion is prepared and never performed by an agent.

## The processes

### 8.4.1 Define business information and analytics strategy

Runs `workflows/8-4-1-define-business-information-and-analytics-strategy.json`.

Start from the ends, not the tools. Read `foundation/telos` and `foundation/goals` and turn each measure into the question someone will ask of it, then name the record type or outside system that would answer it. A question with no named holder is the finding; a dashboard with no question behind it is waste. Good evidence is a query that was actually run or an export that was actually taken, with its date. The trap is to read a vendor's feature list and record it as a capability: write what the system returned, not what it claims.

The access and retention rule drafted here is the founder's. Anything that would let a person or an agent role read more than it reads today is `security-loosening` and goes up.

### 8.4.2 Define and maintain business information architecture

Runs `workflows/8-4-2-define-and-maintain-business-information.json`.

Work in this order: what the venture has to hold, what shape each record is in, which outside source supplies each field, who owns it. Read the route table before writing anything, because the record types and their fields already exist and are not the venture's to redesign. The useful output is the list of fields nobody fills and facts the venture keeps in a note or a spreadsheet because no field exists for them.

The source map decides authority between two systems, so read it first and refuse to leave two systems authoritative for the same field. Ownership is a person's assignment and is written outside this function's reach, so you propose one owner per kind of record and the founder sets it.

### 8.4.3 Define and execute business information lifecycle planning and control

Runs `workflows/8-4-3-define-and-execute-business-information-lifecycle.json`.

A lifecycle rule has four parts for each kind of record: where the authoritative copy lives, how long it is kept, who may reach it, and how it is destroyed. Write the rule, then put it in force in every system that holds a copy, which is the half that is usually skipped. Prove the backup by restoring it into a scratch copy and comparing, and record the date on `it/connections/[id]`; an untested backup is reported as untested.

Retention periods, personal data and anything a customer's contract touches are `legal-or-terms` and go to the founder and counsel. Every purge the rule now calls for is prepared as an `irreversible-data-change` decision, with what would be lost, and the founder performs or authorises it.

### 8.4.4 Manage business information

Runs `workflows/8-4-4-manage-business-information.json`.

This is the recurring one. Check freshness first, repair what needs no new access, then audit who actually read and wrote each kind of record against the rule, then narrow what nobody used. Follow the `access-review` skill for the audit and the narrowing. Two findings matter most: a feed that has written nothing since the last run and a read nobody can account for. Report both with dates.

Narrowing access is `security-tightening`, which you decide. Widening it is the founder's.

## Records

The workflows read `foundation/telos`, `foundation/goals`, `foundation/requirements`, `it/connections`, `knowledge/knowledge-sources`, `knowledge/where-used`, `knowledge/freshness-log`, `purpose/data-stream`, `operations/element-owners`, `legal/obligations`, `people/team-plan` and `governance/delegation`.

They write `it/connections/[id]` for what a system holds, what it is authoritative for, its access scopes, its backup schedule and its last tested restore; `operations/handoff/[id]` for the question list, the field inventory and the audit findings; and `decisions/[id]` for each gap, widening, retention rule and deletion.

A venture-level data dictionary, a retention schedule and an information-policy record are not built: there is no route for them, so the question list, the field inventory and the written rule go on the handoff as evidence and the rule itself is carried by the decision the founder settles.

## Standards

- DAMA-DMBOK names the knowledge areas this group covers, data governance, data architecture, metadata and data quality, and is the reference for separating the owner of a record from its steward and its user.
- ISO/IEC 27001 Annex A and the NIST Cybersecurity Framework 2.0 PR.DS and PR.AA outcomes cover classification, access control and protection of data at rest and in transit.
- CIS Controls v8.1 Control 3 (data protection) and Control 11 (data recovery) are the source of the inventory, the retention rule and the tested restore.
- The GDPR's principles of data minimisation and storage limitation (Article 5) are why a retention period is written per kind of record rather than for the venture as a whole, where the venture holds data about people in scope. This is not legal advice; the rule goes to the founder and counsel.

## What the person decides

- How long each kind of record is kept, and what counts as personal data.
- Who owns and who may reach each kind of record, and every widening of access.
- Every deletion, purge or system retirement, since none of them can be undone.
- Whether to accept a vendor's terms in order to hold the venture's records in its system.
- Which gap to close first, and whether a gap is worth a new tool or a paid plan.
