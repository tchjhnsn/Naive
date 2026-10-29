---
type: knowledge
tags: [everything-ecosystem, naive, skills, packages, foundation, functions]
ai-model: claude-opus-5.5
created: 2026-10-29T20:45:00Z
source: ai-generated
name: foundation-function
description: >
  Work with the foundation function of a Naive venture in code: read
  and write its records through the router or MCP, know what lands as a draft
  and what needs a person, run its checks, and pick the artifact each action
  builds. MANDATORY TRIGGERS: our problem statement, who is our customer, ICP, telos, why do we exist, principles, alignment, strategic foundation.
---

# Foundation function

Package `packages/foundation`. A venture function is a part of the venture with one accountable owner. The owner is named in `venture.json` under `functions` and in `naive.config.json`. What the venture is, why, for whom and with what. Every other function reads these records, so they change rarely and only by a person.

## Records

| Route | What it is | Record type |
|---|---|---|
| `foundation/problem` | The problem claim and its graded evidence | `validation-problem` |
| `foundation/icp` | Who the venture serves; one primary profile | `icp` |
| `foundation/telos` | The end the venture exists to reach, with exit criteria per phase | `telos` |
| `foundation/alignment` | How products and agents must behave | `alignment` |
| `knowledge/venture-profile` | The story and thesis in prose (read only) | `venture-profile` |
| `purpose/foundation` | Command: the Five Ws and How, each confirmed, drafted, waiting or missing | command or item |

The schemas are listed in `packages/foundation/package.json`. Call `mentura_layout` with a route to get its schema, template, gate and what need-now says before you act.

## Read and write

- Over MCP: `mentura_read` with `venture` and `route` (for example `foundation/problem`). Pass `header_only` to see state and owner first. `mentura_write` with the whole `record`, and say what it came from and the decision it acts under.
- In a shell inside the venture: `naive mcp` serves the same routes; `mentura routes` lists them.
- Read through Naive, never from memory. A missing, draft or stale record is shown as such, never filled in.
- Every write is checked against its schema and logged in `system/provenance`.

## Draft or person

All four foundation records carry the strategy-or-constitution decision class. An agent's write always lands as a draft in `_drafts/`. Only the founder accepts it. Never present a draft as the founder's words.

Open decisions for this function come from `mentura_decisions`. Propose with `mentura_propose_decision`; you never mark a decision decided.

## Checks

`naive check` runs every check that applies to the venture. For this function: `schema/check-telos.mjs`, `schema/check-validation.mjs`, `schema/foundation.mjs`, `schema/lint-foundation.mjs` (route `foundation/lint`) and the schema checks (`schema/validate.py`). `foundation/lint` warns, and does not fail, unless `naive.config.json` sets `foundation_lint.rules.<id>.mode` to `fail-closed`. Run it after each write, and fix a failure before you report the work done.

## Actions and artifacts

Build artifacts by the `choosing-artifacts` skill (`interface/skills/choosing-artifacts/SKILL.md`). Each artifact names the records it was built from.

| Action | Artifact | Built from |
|---|---|---|
| Review the strategic foundation | Document (brief) | foundation/*, the phase in venture.json |
| Decide pending decisions | Page that collects answers (the docket) | decisions/ |

## Depends on

Reads `product` (which product the foundation is about). Read by every other function: validation, product, marketing, people, finance and the handoffs. A change here marks dependents stale; run `system/revalidate` with `tag:foundation/icp` (or the route you changed).
