---
type: knowledge
tags: [everything-ecosystem, skills, canonicalize]
ai-model: claude
created: 2026-05-15
source: hybrid
name: canonicalize
description: >
  Establish a document as canonical for its concern, with the canonical-doc
  declaration banner + cross-reference table + supersession entries for any
  predecessor docs. Per SAD v3.3+ amendment §26. Run when multiple documents
  cover overlapping concerns and the operator needs to designate exactly one
  as authoritative, or when a new authoritative document is being authored
  and the operator wants the canonical-doc discipline applied from the start.
  MANDATORY TRIGGERS: canonical, canonicalize, canonical doc, source of truth,
  authoritative document, cross-reference, shadow documents, which doc is
  authoritative, /canonicalize, single source of truth.
---

# Canonicalize Skill

The methodology workflow for designating a document as canonical for its concern, with the discipline + cross-reference table that prevents shadow-document drift.

## Why canonicalize exists

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §26]], without explicit canonicalization, the operator authors multiple documents covering overlapping concerns and loses track of which is authoritative. Three weeks later, document A gets updated but document B doesn't; the next session reads B; work proceeds on stale assumptions.

The fix isn't "be more disciplined." The fix is to **name canonicality explicitly** so the discipline has a place to live.

## When to invoke

This skill should auto-load when:

- Multiple documents cover overlapping concerns and the operator needs to designate exactly one as authoritative
- A new authoritative document is being authored and the canonical-doc discipline should apply from the start
- The user explicitly asks to "canonicalize" or "establish as canonical"
- Drift is detected (two docs disagree; the operator needs to reconcile)
- A document is being elevated from "one of many" to "the canonical source"

## What canonicalization produces

A canonical document carries three structural elements:

### 1. Canonical-doc banner at the top

```markdown
> **Canonical for:** <concern>. This document is the source of truth for
> <concern>. Other documents must defer to this one or be reconciled against
> it. Last canonical review: <date>.
```

Or in HTML:

```html
<div class="canonical-banner">
  <strong>Canonical for:</strong> &lt;concern&gt;. This document is the source
  of truth for &lt;concern&gt;. Other documents must defer to this one or be
  reconciled against it. Last canonical review: &lt;date&gt;.
</div>
```

Or in frontmatter (for indexed docs):

```yaml
canonical-for: <concern>
last-canonical-review: <date>
```

The form varies; the declaration is consistent.

### 2. Cross-reference table

The canonical document includes a section listing every related document with the relationship type:

```markdown
## Related documents

| Document | Relationship | Notes |
|---|---|---|
| `path/to/predecessor.md` | superseded-by-this | Old enumeration; rows migrated 2026-05-14 |
| `path/to/companion.md` | elaborates-on | Per-pillar deep-dive for the brand pillar |
| `path/to/derived.md` | derived-from-this | Generated from this canonical's content |
| `path/to/parent.md` | child-of | This canonical is one of N children under <parent concern> |
```

Relationship types:

- **superseded-by-this** — predecessor doc; no longer authoritative. Old doc should have a `superseded-by` frontmatter pointing to canonical.
- **elaborates-on** — companion doc with deeper detail on a subset of canonical's concern. Both stay live; companion defers to canonical on overlap.
- **derived-from-this** — generated from canonical (e.g., a per-version sub-doc derived from the version-spec canonical).
- **child-of** — this canonical is itself part of a larger parent concern; the parent's canonical has authority on the broader question.
- **references** — this canonical cites the linked doc as input but doesn't depend on it for authority.

### 3. Supersession entries for predecessor docs

When canonicalization replaces a predecessor doc, the predecessor:

- Gets a `superseded-by` frontmatter entry pointing to the new canonical
- Gets a `superseded-date` entry
- Stays in the file tree (per vault constitution — archive, don't delete) but is moved to an archive if it shouldn't be wikilinked into anymore

If the predecessor was actively wikilinked elsewhere, the canonicalize skill scans for back-references and updates them to point to the new canonical (or notes them for manual update).

## How to run canonicalize

When this skill is loaded, the AI should:

### Step 1 — Identify the concern

Surface the concern explicitly:

> "This document will be canonical for: <concern>. Examples:
> - 'V1-next scope' (the enumeration HTML)
> - 'Brand identity for <entity>' (the brand/identity.md)
> - 'What a company is' (company-template/index.md)
> - 'Articulation closure inventory for V1' (the articulation closure HTML)"

If the concern can't be stated cleanly, the doc may not be the right canonical — multiple concerns merged. Surface this; consider splitting.

### Step 2 — Identify the candidate canonical doc

The doc that *should* be canonical. Often this is the most recent / most authoritative / most maintained version.

### Step 3 — Identify related docs

Walk the file tree (or use grep on the concern's keywords) to find every doc that covers overlapping concerns. For each:

- What's its relationship to the proposed canonical? (superseded-by-this / elaborates-on / derived-from-this / child-of / references)
- Should it stay live or be archived?
- Should any wikilinks be updated?

### Step 4 — Apply the canonical-doc banner

Add the canonical declaration to the top of the canonical doc.

### Step 5 — Build the cross-reference table

Add the "Related documents" section with the relationship types.

### Step 6 — Update predecessor frontmatter

For each `superseded-by-this` predecessor:

- Add `superseded-by: [[canonical-doc]]` frontmatter
- Add `superseded-date: <date>`
- Consider moving to archive if no longer wikilinked

### Step 7 — Update back-references

Scan for wikilinks that point to predecessor docs but should now point to the canonical. Update them (or surface for manual update if substantive).

### Step 8 — Update the orchestration HTML

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§32]], the per-project orchestration HTML lists canonical docs. Update with the new canonical + cross-reference.

### Step 9 — Schedule canonical review

Add the canonical to a periodic-review queue. Canonical docs should be reviewed periodically (quarterly is reasonable) to confirm they're still authoritative + still accurate.

## What canonicalize is NOT

- **Not a one-shot blessing.** Canonicalization is a discipline, not a label. Canonical docs need ongoing review.
- **Not a hierarchy of importance.** "Canonical" means "authoritative for this concern" — not "more important than other docs." Many concerns; many canonicals.
- **Not a deletion mechanism.** Predecessor docs are superseded, not deleted. They remain reference material (in archive if no longer active).

## Relationship to other skills

- [[../articulation-closure/SKILL|articulation-closure]] — articulation closure inventories are often canonical for their version's deliverable matrix
- [[../idea-archive/SKILL|idea-archive]] — when canonicalization moves a predecessor to archive, idea-archive handles the capture
- [[../deliverable-discovery/SKILL|deliverable-discovery]] — newly-discovered Tier 3 deliverables sometimes become canonical for their concern after authoring

## Status

- **2026-05-14:** Initial authoring per §26 amendment.
