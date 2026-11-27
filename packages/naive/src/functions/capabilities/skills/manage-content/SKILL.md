---
type: knowledge
tags: [naive, skills, capabilities, apqc-13-6]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:06Z
source: hybrid
name: manage-content
process_group: "13.6"
description: >
  How the capabilities agent manages the venture's documents and copy as a
  capability: what kinds it keeps and who approves them, one set of names and
  tags, one true place with access and retention, drafting where every claim
  cites a record, delivery only after a person approves, and control of what is
  already live. Load it for the workflows of APQC 13.6 and when the founder asks
  "where is the current version", "can we say this" or "is anything on the site
  out of date".
---

# manage-content

You keep the venture's content findable, current and traceable to the records behind it. You never approve content and never publish it: a person approves, and the function that owns the channel publishes. Marketing owns the words of the public site through its own records; this skill owns the capability around them.

The rule that matters: a claim with no cited record is not ready, and a hole is better than a guess. A sentence written from memory is the one that is read back to the venture later.

## The processes

### 13.6.1 Define content management strategy

Runs `workflows/13-6-1-define-content-management-strategy.json`.

List the kinds of content the venture actually produces, from `marketing/sitemap` and `marketing/content`, and give each a reader and a purpose; a kind that serves nobody is dropped before it is maintained. Take the approval line from `governance/publication-policy` rather than inventing one. Write the few rules every piece follows into the writing process itself: the venture's words from the glossary, a cited source per claim, one owner per piece.

Cost is the honest part: content costs more to keep current than to write, which is what decides how many kinds a small venture can carry. The measures are pieces live, pieces past their review date, claims with no cited source, and the time from draft to approved.

### 13.6.2 Develop and manage taxonomies

Runs `workflows/13-6-2-develop-and-manage-taxonomies.json`.

A short list of kinds whose names come from the glossary, with one sentence each on what belongs and what does not, and any two kinds nobody can tell apart merged. Then the naming and tagging rule, enough that a piece can be found by subject, kind and date. Check it the only way that counts: find three existing pieces using the rule alone, as someone who did not write them. The `findability` skill is the method.

Renaming a term already in the glossary, or a path already published, is a decision, not an edit.

### 13.6.3 Define content systems of record and storage requirements

Runs `workflows/13-6-3-define-content-systems-of-record-and-storage.json`.

One place per kind that counts, and who may read, change and publish it, by role. Name every kind that is private or carries someone else's personal information, so it is never handed to a model or a public page. Retention follows the obligation: take any period a contract or a regulation fixes from `legal/obligations` and cite it, and never shorten one without the founder and counsel.

### 13.6.4 Manage content infrastructure

Runs `workflows/13-6-4-manage-content-infrastructure.json`.

Check that content sits where the rule says, write the recurring keeping work as an owned process record, and audit the live content against the rules that bind it: the approval it needed, the claims with their sources, the retention it sits under. An audit needs a schedule and a sample written in advance, or it only ever happens after something has gone out wrong. Each breach is a handoff with an owner and a due date, and a breach closes only when the piece itself has changed.

Anything that touches a public claim or a contract term goes to the founder.

### 13.6.5 Develop and manage content

Runs `workflows/13-6-5-develop-and-manage-content.json`.

Look for what already covers the subject before writing anything new, or the venture ends with two pieces that contradict each other. Name the controls the piece needs before drafting it. Draft created content from records and cite each fact; for acquired content, record the source, the licence or permission and the date, and drop anything whose permission cannot be shown. Refine by cutting and by checking each claim against the record it cites. Where the same subject must appear in several places, make the versions from one approved source and never let the shorter one say more than the longer one. Check the piece against `marketing/voice` and the glossary, and list the lines that depart from them rather than changing the voice.

### 13.6.6 Deliver approved content

Runs `workflows/13-6-6-deliver-approved-content.json`.

Check every control, then put what remains in front of the person whose approval the publication policy requires. Record their approval or their changes; approve nothing yourself. Hand the approved piece to the function that owns the channel with the version, the date and the approver named, and store the approved version where the storage rule says with its next review date. Anything that went out without the approval the policy requires is raised, not quietly fixed.

### 13.6.7 Control delivered content

Runs `workflows/13-6-7-control-delivered-content.json`.

Read each live piece against the records it cites and open a handoff to correct anything a customer could act on wrongly today. Archive what is no longer current but must be kept, leaving a note of where it went. Deleting is the one action that cannot be undone: prepare the list, show what cites each piece, and put it to the founder.

## Records

Read: `marketing/content`, `marketing/message`, `marketing/sitemap`, `marketing/voice`, `governance/publication-policy`, `governance/publications`, `glossary/terms`, `knowledge/catalog`, `knowledge/knowledge-sources`, `raw/sources`, `legal/obligations`, `product`, `it/connections`, `capabilities/processes`.

Write: `capabilities/processes/[id]` for the governance model, the taxonomy, the storage and retention rules, the audit schedule and the content measures, `operations/handoff/[id]` for drafts, audits, breaches and the handover to the publishing function, and `decisions/*`.

A content item record of this function's own, a content inventory and an audit log are not built: public copy lives in marketing's `marketing/content/[id]` and `marketing/message/[id]`, which the marketing function writes, and this function's audits and drafts are evidence on handoffs.

## Standards

- APQC Process Classification Framework 8.0, process group 13.6, whose name for this group is "Manage Content".
- ISO 15489-1:2016 (records management) for one authoritative place per kind, with access and retention written down.
- Dublin Core metadata terms, as the smallest useful set of tags: title, creator, date, subject and type.
- Single-source publishing: one approved source, from which every shorter version is made, which is why a shorter version may never claim more.

## What the person decides

- Which kinds of content the venture keeps, and what it stops producing.
- Approval of every piece before it leaves the venture, and every public commitment in it.
- Any retention period that a contract or a regulation does not already fix.
- Archiving, and every deletion.
- Renaming a glossary term or a published path.
