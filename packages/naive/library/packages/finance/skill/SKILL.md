---
type: knowledge
tags: [everything-ecosystem, naive, skills, packages, finance, functions]
ai-model: claude-opus-5.5
created: 2026-10-29T20:45:00Z
source: ai-generated
name: finance-function
description: >
  Work with the finance function of a Naive venture in code: read
  and write its records through the router or MCP, know what lands as a draft
  and what needs a person, run its checks, and pick the artifact each action
  builds. MANDATORY TRIGGERS: business model, pricing, budget, runway, how do we make money, unit economics.
---

# Finance function

Package `packages/naive/library/packages/finance`. A venture function is a part of the venture with one accountable owner. The owner is named in `venture.json` under `functions` and in `naive.config.json`. How the venture makes and spends money: business models, pricing, budget and runway.

## Records

| Route | What it is | Record type |
|---|---|---|
| `business-models` | The business models the venture uses (a system record from `packages/naive/src/records/vocab/business-models.json`; no route of its own yet, so read it through `mentura_layout`) | `business-models` |
| `validation/pricing` | Price model, points, buyer and evidence they pay (owned by validation, read here) | `validation-pricing` |
| `purpose/money/summary` | Cash, monthly flows and runway (owned by money, read here) | `money-summary` |

The schemas are listed in `packages/naive/library/packages/finance/package.json`. Call `mentura_layout` with a route to get its schema, template, gate and what need-now says before you act.

## Read and write

- Over MCP: `mentura_read` with `venture` and `route` (for example `business-models`). Pass `header_only` to see state and owner first. `mentura_write` with the whole `record`, and say what it came from and the decision it acts under.
- In a shell inside the venture: `naive mcp` serves the same routes; `mentura routes` lists them.
- Read through Naive, never from memory. A missing, draft or stale record is shown as such, never filled in.
- Every write is checked against its schema and logged in `system/provenance`.

## Draft or person

Finance has no record of its own that an agent may settle. Pricing changes go through validation; money facts come from the money source. Propose a budget or model with `mentura_propose_decision`; a person decides.

Open decisions for this function come from `mentura_decisions`. Propose with `mentura_propose_decision`; you never mark a decision decided.

## Checks

`node packages/naive/src/checks/lint-finance.mjs <venture dir> [--json]` (route `finance/lint`) checks spend decisions, prices and metrics. Rules: `spend-no-runway` (a spend decision whose answer, note and options never say what it does to runway), `price-below-cost` (a pricing point whose amount is below its cost) and `metric-no-target` (a metric with no numeric target for the venture's current phase). Each finding is `{rule, mode, file, message, suggestion}`. Rules are fail-open warnings by default; set `finance_lint.rules.<id>.mode` to `"fail-closed"` in naive.config.json to make a rule fail the run (exit 1). `naive check` runs it, and still covers the records this function reads (validation and money checks). Run it after each write, and fix a failure before you report the work done.

## Actions and artifacts

Build artifacts by the `choosing-artifacts` skill (`interface/skills/choosing-artifacts/SKILL.md`). Each artifact names the records it was built from.

| Action | Artifact | Built from |
|---|---|---|
| Show runway, burn, revenue | Dashboard | money/ and purpose/money/summary |
| Build a model or budget | File (.xlsx) when asked, else dashboard | money/, validation/pricing |

## Depends on

Reads `validation/pricing` and `product`. Owns money master data through its owner: an agent's money write goes to the finance owner first (money's gate rule).
