---
type: methodology
source: hybrid
created: 2026-07-27
ai-model: composer-2.5
tags: [everything-ecosystem, methodology, research, sad-v3, articulation]
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
status: ACTIVE — canonical research method for SAD campaigns
description: "Canonical research workflow for SAD: Mimetic -> Anti-Mimetic -> Synthesised-Mimetic, with asset contracts and frontmatter rules."
---

# RESEARCH_METHOD

## Purpose

Make research in SAD explicit, reproducible, and composable with articulation.
Research is treated as a structured sub-phase of SAD Phase 0B and later
Class-2/Class-3 evolution work.

## Mandatory order

Every research unit follows:

1. **Mimetic** — map and mirror established models, evidence, and methods.
2. **Anti-Mimetic** — identify anomalies, contradictions, and breakpoints.
3. **Synthesised-Mimetic** — produce the canonical standing synthesis.

## Canonical rule

Only Synthesised-Mimetic artifacts are canonical for downstream decisions.
Mimetic and Anti-Mimetic artifacts are evidence shards that feed synthesis.

## Research-unit model

Use a `research-unit` id across all related documents. A unit may have many
documents per phase. The unit is complete only when a canonical synthesis
exists or an explicit `deferred` status is recorded.

## Required frontmatter (all research docs)

- `type`
- `source`
- `created`
- `ai-model`
- `tags`
- `research-phase: mimetic | anti-mimetic | synthesised-mimetic`
- `research-unit: <id>`
- `canonical: true|false`
- `research-problem: <statement>`
- `status`

Optional but recommended:

- `feeds: [paths...]`
- `supersedes: [paths...]`
- `skip: {<subprocess>: <reason>}`
- `empty: {<asset>: <reason>}`

## Classical process mapping

All units begin with explicit **research-problem** definition.

| Classical step | SAD artifact expectation |
|---|---|
| Conceptualization | mimetic shard(s): literature/problem framing |
| Design/methodology | method shard(s): protocol, instrumentation, constraints |
| Implementation/collection | raw-source captures + logs |
| Processing/analysis | anti-mimetic and analysis shards |
| Reporting/dissemination | synthesised-mimetic canonical artifact |

If a step is intentionally skipped or empty, record `skip`/`empty` with reason.

## Synthesis obligations

A canonical synthesis must include:

- `adopt`: what is taken and why
- `reject`: what is not taken and why
- `transform`: what is adapted and why
- `open`: unresolved items and explicit status

