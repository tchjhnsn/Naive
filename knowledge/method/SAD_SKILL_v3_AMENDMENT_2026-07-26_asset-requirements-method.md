---
type: methodology-amendment-proposal
ai-model: gpt-5.6-sol
spec-layer: methodology
version: 3.0.9-proposed
source: hybrid
created: 2026-07-26
last-reviewed: 2026-07-26
authorship: hybrid
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[sad/SAD_SKILL_v3]]"
status: APPLIED to SAD_SKILL_v3.md PART 5 + PART 6 + PART 8 + PART 11 — formal ratification still welcome
change-class: 3
sections-affected:
  - PART 5 — Phase 0C (Asset Requirement Set as phase output)
  - PART 6 — specification structures (ARS as named asset)
  - PART 8 — capability-skills invoked by SAD v3
  - PART 11 — supporting patterns (characteristic-driven asset derivation)
tags: [methodology, sad-v3, amendment-proposal, class-3, assets, deliverables, derivation, registry]
---

# SAD v3 Amendment Proposal — Asset Requirements Method and Canonical Asset Registry

**Status:** PROPOSED, patches applied. Class 3 change.

**One-line summary:** SAD derives required assets from **system characteristics
and obligations**, not from pillar × product type × ambition tier alone, and
records the derivation as an **Asset Requirement Set (ARS)** that gate skills
check.

**Capability skill:** [[skills/asset-requirements/SKILL|asset-requirements]]

**Canonical documents:**

- [[sad/ASSET_REQUIREMENTS_METHOD]]
- [[sad/CANONICAL_ASSET_REGISTRY]]

---

## 1. Provenance

Triggered 2026-07-26, immediately after the contract-first amendment. The
operator asked how skills determine which assets a job needs, then asked whether
that determination generalizes — using the reference project as the case study.

The answer was that it partly did not. Existing derivation ran on **pillar ×
product type × ambition tier**, filtered by phase. Under that scheme a static
marketing site and a civic knowledge platform with third-party data ingestion,
private records, runtime agents, third-party referrals, and institutional action
routing are both "software product, venture tier." the reference project's own inventory was
passing gates while lacking provenance policy, retention and deletion matrix,
agent authority bounds, referral disclosure policy, handoff contracts, and a
correction procedure — none of which any existing skill would have asked for.

The gap is a missing dimension, not a missing checklist.

---

## 2. Additions

### 2.1 System profile as a Phase 0A/0C obligation

Every entity declares a **system profile**: pillars, product type, ambition
tier, lifecycle stage, the C-01…C-18 characteristics (yes / no /
planned-with-trigger), and the O-01…O-09 obligations that follow. Characteristics
are answered explicitly; silence is not an answer.

### 2.2 Asset Requirement Set (ARS) as a named deliverable

Phase 0C produces an **ARS** alongside the Vision Spec: one row per derived
asset with pack and trigger, phase due, status, owner, exit criterion, and
location or deferral trigger. Refreshed at every version boundary.

Location: `<entity>/product/spec/ASSET_REQUIREMENTS_<date>.md`, with a repo
pointer per the spec-colocation amendment.

### 2.3 Gates check the ARS

Articulation closure, contract-first, and build-roadmap verify against the
project's ARS rather than a generic list. A gate with no ARS to check authors
one first.

### 2.4 Promotion paths replace the recurrence-only rule

Asset promotion into the registry follows five paths: **P1 standard-mandated,
P2 obligation-mandated, P3 characteristic-implied, P4 failure-derived** (all
immediate) and **P5 recurrence-derived** (3+ projects). This supersedes the
implicit "wait for three projects" default in
[[skills/deliverable-discovery/SKILL|deliverable-discovery]], which delayed
obligation-mandated assets behind an empirical threshold they should never have
been subject to.

### 2.5 Capability-skill registration

Register **asset-requirements** in PART 8 as a load-bearing ritual at Phase 0C,
at version boundaries, and whenever a new characteristic is declared.

---

## 3. Patches to SAD_SKILL_v3.md

### Patch 3.1 — PART 5, Phase 0C

**Append to Phase 0C:**

```
**v3.0.9 addition — Asset Requirement Set.** Phase 0C also produces an ARS:
the project's system profile (pillars, product type, ambition tier,
characteristics C-01…C-18, obligations O-01…O-09) and the assets those
characteristics require, each with phase due, status, owner, and exit
criterion. Derived per ASSET_REQUIREMENTS_METHOD against
CANONICAL_ASSET_REGISTRY, using the asset-requirements skill. Gate skills check
the ARS.
```

### Patch 3.2 — PART 6

**Append:**

```
v3.0.9 adds the Asset Requirement Set (ARS) as a named deliverable: the
derivation record of which assets this entity requires and why. It is not a
spec of the product; it is the spec of the project's own deliverables.
```

### Patch 3.3 — PART 8

**Append to the capability-skills list:**

```
- **asset-requirements** — at Phase 0C, at version boundaries, and whenever a
  new system characteristic appears; derives the required asset set from
  characteristics and obligations and records it as an ARS.
```

### Patch 3.4 — PART 11 (new supporting pattern)

**Insert:**

```
### Characteristic-Driven Asset Derivation

Required assets follow from what a system *is*, not only from its pillar and
product type. Declare characteristics (ingests third-party data, holds private
records, runs agents, routes consequential actions, lists third parties,
operates in a regulated domain), union the packs those characteristics trigger,
scale by ambition tier, filter by phase, and record the result. See
skills/asset-requirements/SKILL.md.
```

---

## 4. Companion skill updates (same ratification)

- `skills/deliverable-discovery/SKILL.md` — adopt promotion paths P1–P5.
- `skills/template-generation/SKILL.md` — walk the registry packs, not only
  Tier 1/2 defaults.
- `skills/articulation-closure/SKILL.md` — verify against the ARS.
- `skills/software-product/SKILL.md` — link characteristic packs.
- `skills/build-roadmap/SKILL.md` — carry `✗ missing` ARS rows as line items.

---

## 5. Non-goals

- Does not require every registry pack for every project; over-application is a
  named anti-pattern.
- Does not replace the spec stack; the ARS says which assets exist, not what
  the product does.
- Does not turn ambition tier into a compliance waiver; tier sizes an
  obligation, it does not remove one.

## 6. Backfill

Projects encountering the gate mid-lifecycle build the ARS retroactively from
current state, then follow `skills/_patterns/gate-backfill.md`.

## 7. Acceptance

- The owner ratifies; patches merge (already applied inline).
- asset-requirements skill discoverable from Cursor via wrapper.
- The reference project ARS authored as the first application and stress test.
