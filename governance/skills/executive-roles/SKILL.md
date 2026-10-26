---
type: knowledge
tags: [everything-ecosystem, skills, executive-roles]
ai-model: claude
created: 2026-05-15
source: hybrid
name: executive-roles
description: >
  Provide context for executive-level work — CEO, Founder, Chief of Staff,
  and pillar leads (CTO, CMO, COO). Auto-loads when conversation surfaces
  executive-level concerns: strategic decisions, cross-pillar tradeoffs,
  board materials, exec hiring, fundraising, organizational design. References
  the per-role files at company-template/roles/. Companion to the per-pillar
  skills (which cover pillar leads specifically when pillar work is happening).
  Per SAD v3.3+ amendment §33.
  MANDATORY TRIGGERS: CEO, founder, chief of staff, executive team, exec team,
  strategic decision, board, fundraising, exec hiring, organizational design,
  C-level, leadership, CTO, CMO, COO, CFO, CRO, CPO, GC, pillar lead.
---

# Executive Roles Skill

The context-providing skill for executive-level work. Auto-loads when conversation surfaces executive concerns.

## What this skill provides

References to all per-role files in the company template:

- [[../../company-template/roles/ceo|CEO]] — cross-pillar lead; sets direction
- [[../../company-template/roles/founder|Founder]] — pre-CEO state; multi-role
- [[../../company-template/roles/chief-of-staff|Chief of Staff]] — CEO force multiplier
- [[../../company-template/roles/cto|CTO]] — Product pillar lead
- [[../../company-template/roles/cmo|CMO]] — Brand pillar lead
- [[../../company-template/roles/coo|COO]] — Business pillar lead

When loaded, the AI can speak to executive-level concerns with reference to specific role contexts.

## When to invoke

Auto-loads when:

- Strategic decisions are being made or framed
- Cross-pillar tradeoffs surface (invokes [[../cross-pillar-tradeoff/SKILL|cross-pillar-tradeoff]] too)
- Board materials, all-hands, or investor materials are being authored
- Executive hiring is being discussed
- Fundraising work is happening
- Organizational design questions surface (reporting lines, role splits)
- The user references C-level roles or executive team work

## What this skill emphasizes

When loaded, the AI should keep in mind:

1. **Roles have responsibilities + non-responsibilities.** Each per-role file has a "What this role is NOT" section. The non-responsibilities matter as much as the responsibilities — they're how the role stays focused.

2. **Role transitions are methodology-relevant.** Founder → CEO is the most common; founder may also evolve into CTO / CPO / CMO. The methodology should support these transitions explicitly. See [[../../company-template/roles/founder|founder.md]] §"Founder transitions."

3. **Pillar leads sit *under* their pillar; cross-pillar roles sit *above*.** CEO + Founder + Chief of Staff are cross-pillar. CTO + CMO + COO are pillar leads. Don't conflate.

4. **Specialized C-level roles emerge from COO's scope.** CFO emerges from COO's Finance scope; GC emerges from Legal; CRO emerges from Sales; CPO emerges from People. Stage-dependent emergence; the methodology accommodates both COO-broad and specialized-narrow structures.

5. **The CoS role is variable.** Per [[../../company-template/roles/chief-of-staff|chief-of-staff.md]], the role scope depends heavily on the CEO. Don't over-prescribe; meet the CEO where they are.

## How role context affects the work

When this skill is loaded alongside specific work, it should:

- **For strategic decisions:** route through CEO context. Surface what CEO-level decisions look like; whether the current decision warrants CEO authority or can be made at pillar-lead level.
- **For cross-pillar tradeoffs:** invoke [[../cross-pillar-tradeoff/SKILL|cross-pillar-tradeoff]]. The tradeoff is a CEO decision; the CoS often surfaces it.
- **For pillar-specific work:** route through the relevant pillar lead's role context. CTO context for technical decisions; CMO for brand; COO for operational / commercial.
- **For board / investor materials:** combine [[../stakeholder-update/SKILL|stakeholder-update]] (the composition) with CEO + CFO context (the authority + ownership).
- **For exec hiring:** the CEO hires pillar leads. The decision shape is "we need a CMO / VP Marketing — what does this hire look like?" Reference the relevant role file.

## Per-role context skills (future)

This composite skill covers the executive layer. If individual per-role skills (`ceo-role`, `cto-role`, `cmo-role`, `coo-role`) become useful as the methodology matures, they can be authored as more specialized children of this skill. The composite covers the common ground; specialization can grow as needed.

## What this skill is NOT

- **Not the org chart.** Role files describe responsibilities, not headcount or reporting graphs. **Org seats** (instances, occupancy, assignments) use [[position-schema]]; templates here remain the “what is a CTO” reference.
- **Not a hiring rubric.** Hiring rubrics are a Business-pillar deliverable; the role files inform them but aren't them. Human fill path: [[role-and-candidate-authoring]] against a position instance.
- **Not a substitute for actual exec relationships.** The methodology supports the work; it doesn't replace the conversations between CEO + pillar leads.

## Relationship to other skills

- [[../product-pillar/SKILL|product-pillar]] / [[../brand-pillar/SKILL|brand-pillar]] / [[../business-pillar/SKILL|business-pillar]] — pillar skills auto-load alongside this skill when pillar work is happening
- [[../cross-pillar-tradeoff/SKILL|cross-pillar-tradeoff]] — CEO-level decision framing
- [[../stakeholder-update/SKILL|stakeholder-update]] — exec comms
- [[../office-hours-mode/SKILL|office-hours-mode]] — typical posture for exec-level decisions
- [[../role-and-candidate-authoring/SKILL|role-and-candidate-authoring]] — when filling a seat with a human
- [[position-schema]] — position instances vs these role templates; agent vs human occupancy

## Status

- **2026-05-14:** Initial authoring. Composite skill covering 6 per-role files; individual per-role skills can be authored when specialization warrants.
