---
type: knowledge
tags: [everything-ecosystem, skills, asset-requirements, sad-v3, deliverables, derivation]
ai-model: gpt-5.6-sol
created: 2026-07-26
source: hybrid
name: asset-requirements
description: >
  Derive which assets a project actually requires — from its system
  characteristics and obligations, not just its pillar, product type, and
  ambition tier — and record them as an Asset Requirement Set (ARS) that gates
  can check. Uses the Asset Requirements Method plus the Canonical Asset
  Registry. Mandatory at SAD Phase 0C, at every version boundary, and whenever
  a new system characteristic is declared (ingests third-party data, stores
  private records, runs agents, routes actions to institutions, lists third
  parties, enters a regulated domain). MANDATORY TRIGGERS: what assets do we
  need, required deliverables, deliverable inventory, definition of done,
  asset registry, what are we missing, do we have everything, readiness,
  pre-build assets, new characteristic, new integration surface, compliance
  assets, ARS.
---

# Asset Requirements Skill

Determines **which assets this work requires**, when each is due, and what counts
as done — then records the answer as a reviewable artifact so gates check a list
rather than a memory.

Canonical companions:

- `knowledge/method/ASSET_REQUIREMENTS_METHOD.md` — the derivation procedure
- `knowledge/method/CANONICAL_ASSET_REGISTRY.md` — the asset definitions

## Why this exists

Asset selection used to run on **pillar × product type × ambition tier**, filtered
by phase. That treats a marketing site and a civic data platform with private
records, agents, and institutional action routing as the same kind of thing. The
resulting inventories look complete while omitting the assets the system's real
characteristics demand — provenance policy, retention matrix, agent authority
bounds, handoff contracts, correction procedure.

This skill adds the missing question: **what kind of system is this, and what
obligations follow?**

## When to invoke

- SAD Phase 0C, before specification begins.
- Every version boundary.
- Whenever a new characteristic is declared or discovered mid-build (a new
  ingest source, a new private-record type, a new agent role, a first referral
  listing, a first action submitted to an institution).
- When someone asks "what are we missing," "are we ready to build," or "what
  does done mean here."
- Before running any gate skill, so the gate has a list to check.

Do not use this skill to generate assets a project's characteristics do not
imply. Over-application is a failure mode too.

## Workflow

### Step 1 — Declare the system profile

Answer all three blocks from the method §3: base (pillars, product type,
ambition tier, lifecycle stage), the C-01…C-18 characteristics (yes / no /
planned-with-trigger), and the O-01…O-09 obligations that follow.

Never leave a characteristic unanswered. "Planned, trigger = v2 payments" is an
answer; silence is not.

### Step 2 — Derive the candidate set

Pull every entry for every active pack from the registry. Union and deduplicate
by asset id, keeping all reasons — the reasons justify the contents.

### Step 3 — Scale and filter

Apply ambition tier (strength) then phase (timing). Tier may thin a pack; it may
not delete an obligation-mandated asset.

### Step 4 — Write the ARS

`<entity>/product/spec/ASSET_REQUIREMENTS_<date>.md`, one row per asset:

`id · name · why required · phase due · status · owner · exit criterion ·
location or deferral trigger`

Status: `✓ authored` / `↺ partial` / `✗ missing` / `— deferred (trigger)` /
`N/A (reason)`. Close with ranked debt.

### Step 5 — Hand to the gates

Point articulation-closure, contract-first, and build-roadmap at the ARS. A gate
that checks a generic list instead of the ARS is running blind.

### Step 6 — Promote discoveries

Any asset the work needed but the registry lacked goes back to the registry via
the promotion paths in method §9. **P1 standard-mandated, P2 obligation-mandated,
P3 characteristic-implied, and P4 failure-derived promote immediately**; only P5
recurrence waits for three projects.

## Backfill / missing assets

Follow [[../_patterns/gate-backfill|gate-backfill]] (detect → triage → order →
freeze → exit). Skill-specific notes:

**Detect.** Existing projects have no ARS. Build one retroactively from the
current state before judging anything missing.

**Triage.**

| Class | Rule |
|---|---|
| **Blocker debt** | Obligation-mandated and the risk is live (records held, actions routed, facts published) |
| **Queued debt** | Characteristic-implied but the surface is not yet shipped; no new surface of that characteristic until authored |
| **Deferred** | Recorded with a version trigger |

**Order.** Obligation-mandated before characteristic-implied; assets that gate
other assets before their dependents; assets whose absence is already producing
user-visible risk first.

**Freeze.** No *new* surface of a characteristic whose pack is unauthored.
Existing surfaces keep running with dated debt notes.

**Exit.** Every derived row has a status; no `✗ missing` row is obligation-
mandated and live.

## Anti-patterns

- An ARS listing only assets that already exist.
- Deriving from product type alone.
- Using ambition tier to skip an obligation instead of to size it.
- One "compliance" row standing in for privacy, security, accessibility, and
  provenance.
- Deferring without a trigger.
- Generating a full pack for a characteristic the project does not have.

## Relationship to SAD

- **Phase 0C** — ARS is authored; it is the input to specification scope.
- **Phase 1B / 1B-Final** — articulation closure verifies against the ARS.
- **Phase 2** — build-roadmap carries every `✗ missing` row as a line item.
- **Phase 4** — a contradicted asset is amended, not quietly dropped.

Canonical methodology amendment:

`knowledge/method/SAD_SKILL_v3_AMENDMENT_2026-07-26_asset-requirements-method.md`

## Status

- **2026-07-26:** Initial authoring alongside the method and registry.
