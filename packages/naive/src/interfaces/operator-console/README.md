---
type: entity-readme
ai-model: claude
entity-name: operator-console
companion-to: "[[project-view-mockup-2026-05-14.html]]"
source: hybrid
created: 2026-05-14
last-reviewed: 2026-05-14
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [operator-console, methodology-product, orchestration-software, mockup, html-companion, 2026-05-14]
---

# `operator-console/` — The Operator Console

*Renamed from `harness/` on 2026-10-26 (G-029). G-039 later returned that entity class to "app"; EE-096 gave "harness" its industry sense (the software around a model) and named the operator console's kind of tool a workbench, so the operator console is a custom workbench.*

> Working folder for the operator console — the operational software layered on top of the SAD methodology. Per §39, the trajectory is HTML now → real software later. The first mockup is **[[project-view-mockup-2026-05-14.html]]**. Open it in a browser.

## What this is

The operator console is the methodology's operational consumer surface. It's the dashboard a solo operator (or eventually a multi-person team) lives in when managing projects under the methodology. Distinct from:

- **The methodology itself** ([[pipeline-canonical-view-2026-05-14]]) — the abstract framework
- **The methodology website** (separate concern; for publishing + teaching + onboarding to the public)
- **Per-entity orchestration HTML** ([[per-entity-orchestration-template]]) — the static, vault-embedded version of similar information

The operator console is a polished SaaS-style application that surfaces project state, agent activity, and methodology mechanisms (skills, commands, hooks) for the operator.

## Current state

- **[[project-view-mockup-2026-05-14.html]]** — high-fidelity static mockup of the project-level view (the reference project as the demonstrative project)
- Topbar with project switcher; left sidebar with project + operations + methodology nav groups; main area showing three-pillar prominence + agent system panel + recent decisions + quick action cards

## Trajectory

Per §39 orchestration trajectory:

- **Now:** static HTML mockup for design iteration
- **Next:** real web app (Next.js + Postgres likely), bespoke for the owner's solo use initially
- **Later:** multi-person team support (auth, real-time collaboration, role-based access)
- **Eventually:** publicly available methodology product (when the methodology generalizes beyond the reference project)

Paused as of 2026-05-14 to return to the reference project work. Will resume after V1.5 articulation has more shape.

## Related

- [[pipeline-canonical-view-2026-05-14]] — the methodology the operator console operationalizes
- [[per-entity-orchestration-template]] — vault-embedded parallel artifact (less polished, more comprehensive)
- A project note — the orchestration HTML instance the operator console mockup demonstrates against
- [[build-roadmap-and-html-orchestration-2026-05-12]] §32 + §39 — methodology amendments establishing the operator console concept

## Status

- **2026-05-14:** Initial mockup authored; paused to return to the reference project V1.5 work.
