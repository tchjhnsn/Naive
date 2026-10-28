---
type: knowledge
tags: [everything-ecosystem, skills, foreshadowing-audit]
ai-model: claude
created: 2026-05-15
source: hybrid
name: foreshadowing-audit
description: >
  Run the V[N] → V[N+1] foreshadowing audit. Verify that V[N] foreshadows
  V[N+1]'s audience and capabilities — anything that will exist later must be
  named or hinted at now, or V[N]'s identity gets revised when V[N+1] ships.
  Also verify brand continuity invariants (I-series) hold across versions.
  Brand-pillar discipline; CMO-sponsored. Per SAD foreshadowing discipline
  (encoded in build-roadmap §19) + version-identity skill.
  MANDATORY TRIGGERS: foreshadowing, foreshadowing audit, V1 to V2, V2 to V3,
  version evolution, audience evolution, brand continuity, brand invariants,
  one persona per version, what does V[N+1] add, version boundary, /foreshadowing-audit.
---

# Foreshadowing Audit Skill

The Brand-pillar discipline that prevents brand whiplash across product versions. Runs at every version boundary.

## Why foreshadowing-audit exists

V[N] establishes an audience, a persona, a register. V[N+1] expands or shifts. If V[N+1] introduces audience or capabilities V[N] didn't foreshadow at all, existing users experience whiplash: "this isn't the product I signed up for."

The discipline: **V[N] must foreshadow V[N+1]'s audience and capabilities.** Anything that will exist later must be named or hinted at now. The brand audit is what catches this.

Companion to the [[../version-identity/SKILL|version-identity skill]] (one-new-persona-per-version rule). Together they prevent the two major brand-evolution failure modes:

- **Surprise pivot** — V[N+1] introduces a persona V[N] didn't foreshadow → existing audience leaves
- **Identity drift** — V[N+1] silently changes invariants V[N] established → trust erosion

## When to invoke

- **Approaching a version boundary** (authoring VERSION_SPEC for V[N+1])
- **V[N] ship is imminent and V[N+1] articulation has begun** (parallel-track work)
- **Brand changes are being proposed for an existing version** (e.g., V1.x patches that touch identity)
- **The user explicitly asks for a foreshadowing audit**

## The two audits

### Audit 1 — Audience foreshadowing

For each new audience V[N+1] introduces:

1. **Is this audience visible in V[N]?** Either:
   - Explicitly named (e.g., "V2 is for citizens who want to annotate the wiki")
   - Hinted via affordances (e.g., V1 includes a "save for later" button that hints at the V2 personalization layer)
   - Visible in the wiki / public artifacts (e.g., a roadmap page that shows the version-identities arc)
2. **If not, what's the foreshadowing gap?** Surface specifically:
   - "V2 introduces X audience. V1 has no mention of X. The closest hint is Y, which doesn't really cover this."
3. **What can be added to V[N] (or V[N+1] articulation) to close the gap?** Concrete options:
   - Add an affordance to V[N] that hints at X
   - Reword V[N]'s public copy to acknowledge X is coming
   - Explicitly name X in V[N]'s "what's next" / roadmap surfaces

### Audit 2 — Invariant verification

Brand invariants (I-series; a typical project defines I1–I9) are the things that must hold across versions. For each invariant:

1. **Does V[N+1] preserve this invariant?** Check the V[N+1] artifacts (brand identity, voice, key surfaces) against the invariant statement.
2. **If not, is this a deliberate change?** Either:
   - The invariant needs updating (and the change is documented)
   - V[N+1] needs adjustment to preserve the invariant
3. **For deliberate changes:** is the change foreshadowed in V[N]? Same audit as Audit 1, applied to invariants rather than audiences.

## The invariant pattern (I-series)

A brand invariant has the form:

```
I1: <Invariant statement>
- What it means in practice: <concrete description>
- How V[N] expresses it: <specific surfaces / artifacts>
- Risk if broken: <what happens to the audience's trust>
```

Example:

```
I3: The product speaks in the user's register, not the institution's.
- What it means in practice: copy uses second-person + active voice + concrete
  scenarios; doesn't sound like government documentation.
- How V1 expresses it: every wiki article opens with "When you ___" or
  "Your ___" framing; microcopy in error states is human, not stilted.
- Risk if broken: The product reads like another corporate website; existing
  audience disengages because the differentiator is the register.
```

V[N+1]'s foreshadowing audit verifies I3 still holds in every V[N+1] surface.

## How to run a foreshadowing audit

When this skill is loaded, the AI should:

### Step 1 — Load the version-identities document

Read `<entity>/brand/version-identities*.md` (or equivalent). Identify:
- V[N]'s declared persona / audience
- V[N+1]'s declared persona / audience
- The continuity invariants (I-series)

If no version-identities document exists, surface the gap — the audit needs this as input.

### Step 2 — Run Audit 1 (audience foreshadowing)

For each new audience or capability V[N+1] introduces, walk the visibility check. Produce:

```
Audience Foreshadowing Audit · V[N] → V[N+1]

| V[N+1] addition | Foreshadowed in V[N]? | Gap | Proposed fix |
|---|---|---|---|
| <addition 1> | ✓ / ↺ / ✗ | <if not, what's missing> | <concrete option> |
| ...
```

### Step 3 — Run Audit 2 (invariant verification)

For each I-series invariant, walk the preservation check. Produce:

```
Invariant Verification · V[N+1]

| Invariant | Preserved in V[N+1]? | Notes | Action |
|---|---|---|---|
| I1: <statement> | ✓ / ↺ / ✗ | <specific evidence or gap> | <action if needed> |
| ...
```

### Step 4 — Surface the audit results

Walk the operator through:
- Which audiences need additional foreshadowing in V[N]
- Which invariants are at risk in V[N+1]
- Which gaps can be closed before V[N] ships (vs. which require V[N+1] adjustment)

### Step 5 — Update artifacts

For each accepted fix:
- Update V[N] artifacts (if foreshadowing-by-adding-to-V[N])
- Update V[N+1] artifacts (if adjusting V[N+1])
- Update the version-identities document to reflect the audit
- Update the brand foreshadowing inventory

### Step 6 — Update the per-project orchestration HTML

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§32]], surface the audit results in the brand-pillar deliverables section of the orchestration HTML.

## Posture

Foreshadowing-audit runs in **office-hours mode**. The work is convergent (verifying invariants, finding gaps); sharp framing is appropriate.

## What foreshadowing-audit is NOT

- **Not a one-shot.** Audits run at every version boundary and whenever V[N+1] articulation surfaces a major change.
- **Not a substitute for brand discipline.** The audit catches drift; it doesn't author the version-identities document or the invariants. Those are upstream.
- **Not a Product-pillar check.** It's Brand-pillar work. Product-pillar capability changes that don't affect brand identity / persona / audience don't trigger it.

## Relationship to other skills

- [[../version-identity/SKILL|version-identity]] — produces the version-identities document this audit reads
- [[../brand-pillar/SKILL|brand-pillar]] — auto-loads when brand work surfaces; foreshadowing-audit is one of its workflows
- [[../articulation-closure/SKILL|articulation-closure]] — V[N+1]'s articulation closure should include a passed foreshadowing audit before Phase 2 begins

## Backfill / missing assets

Follow `operations/skills/_patterns/gate-backfill.md`. Skill-specific notes:

1. **Detect** — V[N+1]+ capabilities vs foreshadowed / gap / N/A on shipped V[N].
2. **Triage** — brand-discontinuity on shipping surfaces = blocker; pure V[N+1]
   gaps = queued with version trigger.
3. **Order** — audit shipped affordances first; patch foreshadowing only where
   cheap; else record discontinuity + brand decision.
4. **Freeze** — do not market or UI-promise red V[N+1] capabilities without a plan.
5. **Exit** — audit grid exists; red cells have fix or recorded brand decision.

## Status

- **2026-05-14:** Initial authoring per build-roadmap §19 foreshadowing discipline.
- **2026-07-26:** Backfill / missing-assets recovery mode added.
