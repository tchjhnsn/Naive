---
name: design-coverage
description: "Check which design documents (domain, product, experience, interface, systems) exist for any project and flag gaps, using the registry in packages/naive/src/functions/capabilities/design-documents.registry.json and each entity's design-profile. Run --quick at every SAD session opening (PART 4 step 4b) for the entity in scope; deep (TypeSafe) at phase gates. Use whenever the owner says \"domain design\", \"systems design\", \"capability map\", \"categories\", \"product architecture\", \"user experience\", \"UX\", \"UI\", \"interface\", \"front-end contract\", or asks what docs are missing. MANDATORY TRIGGERS: session start on any project, domain design, systems design, capability map, design docs, what are we missing, design coverage, gaps."
type: skill
source: hybrid
created: 2026-10-09
ai-model: claude-opus-5.5
tags: [skill, sad-v3, domain-design, systems-design, typesafe]
---

# design-coverage

Method: [[DOMAIN_AND_SYSTEMS_DESIGN_METHOD]]. Registry: `packages/naive/src/functions/capabilities/design-documents.registry.json`.

## When the owner says…

- **"domain design"** → work in `DD-*` documents for the named scope. Say so.
- **"systems design"** → first confirm domain readiness (DD-04, DD-05, DD-06 exist; DD-10 or DD-11 shows they hold). If not ready, say so and propose finishing the domain first. If ready, produce the full `SD-*` package for the next phase to be built, an outline (SD-04, SD-05, SD-21) for the phase after, nothing further.
- Always state which layer the work is in and how it relates to the other.

## Run the checker

**Layers (SAD v3.0.14):** domain (DD) → product (PA) → experience (XD) → interface (UI) → systems (SD). Experience and interface are active by default; an entity with no human users declares `n/a` with the reason. A candidate needs a strong signal (title pattern in file name or title, a heading naming the ID, or a path match).

**At every session opening on a project (SAD v3.0.13, PART 4 step 4b), quick, free:**

```bash
node packages/naive/src/functions/capabilities/skills/design-coverage/check.mjs --entity <vault>/projects/<entity> --quick
```

Read `<entity>/_meta/design-coverage/latest-quick.md`. Tell the owner, in one or two lines, which required documents bearing on today's task have no candidate (✗), and if the entity has no `design-profile`, say that first: it's the gap that hides the others. Don't start design work that depends on a missing document without writing it first or recording why not.

**Deep (TypeSafe) at phase gates, before ratification, or when candidates need judging:**

```bash
node --env-file=<env file that sets TYPESAFE_API_KEY> packages/naive/src/functions/capabilities/skills/design-coverage/check.mjs --entity <vault>/projects/<entity>
```

**Vault-wide** (campaign start): `node packages/naive/src/functions/capabilities/skills/design-coverage/scan.mjs` writes `<vault>/_meta/design-coverage/STATUS.md`.

**Explicit mode** (a scope that isn't one entity): `--root <dir> [--root …] [--include '<regex>'] --characteristics … --obligations … [--entity-class business] [--layer domain|product|system|all] --out <prefix>`.

**Declaring a design profile** (when missing): add the `design-profile:` block to the entity profile (schema in `references/entity-profile-schema.md`): ARS characteristics and obligations, extra roots, `systems-design: active | not-started | n/a`. Propose values from the profile and mark them `declared: "<date>, proposed by <model>; confirm"` until the owner confirms.

Writes `<prefix>.json` (per document: status, answered/total, unanswered questions, candidates) and `<prefix>.md` (table). Characteristics and obligations come from the scope's Asset Requirement Set; documents whose `required_when` isn't met are `not_applicable`. Never print the API key.

## Layers

- **Domain (DD-01..12):** includes the **capability map (DD-12)**, required for every project: categories by job, core / supporting / generic, build or integrate, dependencies, owners, success measures.
- **Product (PA-01..03):** structure and naming (C-19), packaging and buyer mapping, competitive landscape by category (businesses).
- **Systems (SD-01..23):** only when `systems-design: active`.

## Interpreting

- Deep: `exists` ≥ 80% of questions answered; `partial` ≥ 20%; `null` otherwise. Quick: `candidate` (judge it with a deep run) or `null` (nothing found).
- `not_started`: systems design hasn't begun for this entity; `not_applicable`: the document's `required_when` isn't met.
- Treat results as evidence for review: a concept spread over several files can read `partial`. Confirm by reading the unanswered questions.
