---
type: knowledge
tags: [everything-ecosystem, skills, idea-archive]
ai-model: claude
created: 2026-05-15
source: hybrid
name: idea-archive
description: >
  Archive a tried-and-rolled-back, decided-against, or parking-lot idea to the
  per-project idea archive with the five-field capture (original, when tried,
  what happened, when/why rolled back, future notes). Per SAD v3.3+ amendment §25.
  Every project at every level carries an idea archive — the Meta-rollback
  pattern. Without it, the operator re-litigates the same questions on a
  long-cycle loop.
  MANDATORY TRIGGERS: archive idea, idea archive, parking lot, rolled back,
  tried this before, decided against, won't pursue, meta rollback, archived row,
  /archive-idea, ARCHIVED status, lessons from a failed attempt.
---

# Idea Archive Skill

The methodology workflow for archiving ideas to the per-project idea archive. Every project at every level carries one — the Meta-rollback pattern that prevents re-litigating the same decisions on a long-cycle loop.

## Why idea-archive exists

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §25]], across long project lifetimes, ideas get tried and rolled back. Sometimes permanently; sometimes shelved with intent to revisit. Without an archive, this history is lost — the operator re-considers the same idea three times in three years because no record of prior attempts exists.

The pattern comes from broader thinking about institutional memory: organizations that track their meta — their decisions about decisions, their rollbacks, their abandoned experiments — accumulate compounding wisdom. Organizations that don't, re-litigate the same questions every few years.

## When to invoke

This skill should auto-load when:

- A row in an enumeration is transitioning to status `ARCHIVED`
- An idea was tried and is being rolled back
- A decision-against is being recorded
- The user references "let's not pursue this" or "this didn't work"
- A canonical-doc replacement is archiving its predecessors (often involves idea-archive entries)
- The user explicitly invokes archive-idea or asks about prior attempts

## The five required fields

Every archive entry captures five fields:

### 1. The original idea

Verbatim, or as close to the source language as possible. Don't paraphrase into AI register; preserve how the operator actually said it. The reader (future operator) needs to recognize their own framing if they re-encounter the idea.

### 2. When tried

Date or sprint reference. "2026-05-13" or "Sprint 1, Phase 2.4" or "V1 ship cycle." Whatever pins it in time well enough to find the relevant SESSION_LOG entries.

### 3. What happened

The result of the attempt. Categories:

- **Shipped + reverted** — went live; rolled back. Include the revert date + rationale.
- **Prototyped + abandoned** — built but never shipped. What got built; why it didn't make it.
- **Decided against pre-build** — never built; the decision happened in articulation. What surfaced that killed it.
- **Deferred indefinitely** — neither rejected nor committed; parked for later. What conditions would re-open consideration.
- **Discovered as duplicate** — a different idea already covers this; the duplicate is archived with a pointer to the survivor.

### 4. When (and why) rolled back

For ideas that were tried and didn't survive:

- **When** — date of the rollback decision
- **Why** — specific cause:
  - "Broke invariant X"
  - "User testing showed confusion"
  - "Scope-creep made V[N] late"
  - "Cost > benefit at this scale"
  - "Adjacent decision made this obsolete"
  - "Founder preference / strategic shift"
  - Etc.

Be specific. "Didn't work" is not enough — the archive's value is in the specificity.

### 5. Future notes

Will we try this again? Under what conditions? Linked to what successor idea?

- **Never again** — explicit closure
- **Maybe at scale** — would re-open if the project reaches scale tier X
- **Re-open with adjacent change** — would re-consider if some other decision changes (e.g., "re-open if we add the AI Lab platform")
- **Linked to successor** — was superseded by [[<successor-idea>]] which addresses the same concern differently

This field is what distinguishes a useful archive from a graveyard. Without future notes, the archive is just a record; with them, it's institutional memory.

## How to run idea-archive

When this skill is loaded, the AI should:

### Step 1 — Confirm the archive location

The per-project idea archive lives at:

```
projects/<entity>/idea-archive.md
```

For sub-entity scope (e.g., archiving an idea specific to one product within a multi-product entity):

```
projects/<entity>/<product-or-pillar>/idea-archive.md
```

If the archive doesn't exist yet, the skill scaffolds it with the standard structure (see "Archive document structure" below).

### Step 2 — Capture the five fields

Walk the operator through the five fields. Don't fill them in automatically — the operator's framing in each field is part of the archive's value.

Probe for specificity:

- "What was the original idea? Quote it if you can."
- "When did we try this?"
- "What happened? Did we ship and revert, prototype and abandon, or decide against pre-build?"
- "Why did it not survive?"
- "Will we try this again? Under what conditions?"

### Step 3 — Author the entry

Append the entry to the archive:

```markdown
## <Idea name / one-line description>

- **Original framing:** <verbatim or near-verbatim>
- **When tried:** <date or sprint>
- **What happened:** <category + specifics>
- **When + why rolled back:** <date + specific cause>
- **Future notes:** <re-open conditions or "never" or successor link>

[Optional additional context — relevant SESSION_LOG entries, lessons learned, etc.]

---
```

### Step 4 — Update the source row

If the idea was a row in an enumeration document, update its status:

- Change status from `OPEN`/`TRIAGED`/etc. → `ARCHIVED`
- Keep the row in the enumeration with a brief stub ("see idea-archive#<idea-name>")
- The enumeration stays focused on live work; the archive carries the history

### Step 5 — Update the orchestration HTML

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§32]], the orchestration HTML surfaces archived idea counts + recent archive entries. Update accordingly.

### Step 6 — Cross-reference adjacents

If the archive entry has a successor idea (`Future notes` links to a live row), ensure the successor's documentation mentions the predecessor's archive entry. Wikilink both directions.

## Archive document structure

When the per-project idea archive doesn't exist yet, scaffold it:

```markdown
---
type: idea-archive
scope-entity: [[<entity>]]
created: <date>
last-reviewed: <date>
authorship: hybrid
ip-sensitivity: normal
tags: [idea-archive, meta-rollback, <entity>]
canonical-for: "idea-archive-for-<entity>"
---

# <Entity> · Idea Archive

> Per SAD v3.3+ amendment §25 (the Meta-rollback pattern). Tracks ideas that
> were tried + rolled back, decided against, or deferred indefinitely. Reference-
> only — live work does not wikilink into archive entries. If a successor idea
> needs the knowledge, it rewrites from first principles.

## How to read this archive

Each entry captures five fields: original framing, when tried, what happened,
when/why rolled back, future notes. Entries are append-only (per the vault's
archive-don't-delete principle).

## Archive entries

[Entries get appended here, most recent first]
```

## What idea-archive is NOT

- **Not a graveyard.** Entries with "future notes: never" are explicit closure, but the goal of the archive is institutional memory — *what we learned by trying* — not a list of failures.
- **Not for active deferral.** A row deferred to V[N+1] stays in the enumeration with status `DEFERRED-V[N+1]`. It moves to archive only when explicitly rolled back or decided-against-permanently.
- **Not for ideas that were never captured.** Only ideas that were articulated enough to be tried (or considered seriously) belong here. Pure-speculation never-captured ideas don't enter the archive.

## Relationship to other skills

- [[../triage/SKILL|triage]] — triage transitions rows from OPEN to TRIAGED → eventually some go to ARCHIVED, invoking this skill
- [[../canonicalize/SKILL|canonicalize]] — when canonicalization supersedes a predecessor doc, the predecessor's archival often involves an idea-archive entry
- [[../articulation-closure/SKILL|articulation-closure]] — rows in the closure inventory that are marked as "deferred with rationale" may eventually transition to archive

## Status

- **2026-05-14:** Initial authoring per §25 amendment.
