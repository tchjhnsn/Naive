---
type: knowledge
tags: [everything-ecosystem, naive, skills, packages, money, functions]
ai-model: claude-opus-5.5
created: 2026-10-29T20:45:00Z
source: ai-generated
name: money-function
description: >
  Work with the money function of a Naive venture in code: read
  and write its records through the router or MCP, know what lands as a draft
  and what needs a person, run its checks, and pick the artifact each action
  builds. MANDATORY TRIGGERS: bank account, cash, burn, runway numbers, transactions, money summary.
---

# Money function

Package `packages/money`. A venture function is a part of the venture with one accountable owner. The owner is named in `venture.json` under `functions` and in `naive.config.json`. Master data for money: one `[id].json` per account, plus append-only activity in `_streams/`. When a bank or spend tool is the system of record, records are pointers and summaries.

## Records

| Route | What it is | Record type |
|---|---|---|
| `money` | List of money accounts | `money-account` |
| `money/[id]` | One money account | `money-account` |
| `purpose/money/summary` | Cash, monthly flows and runway from the last sync; the only money record a model sees | `money-summary` |

The schemas are listed in `packages/money/package.json`. Call `mentura_layout` with a route to get its schema, template, gate and what need-now says before you act.

## Read and write

- Over MCP: `mentura_read` with `venture` and `route` (for example `money`). Pass `header_only` to see state and owner first. `mentura_write` with the whole `record`, and say what it came from and the decision it acts under.
- In a shell inside the venture: `naive mcp` serves the same routes; `mentura routes` lists them.
- Read through Naive, never from memory. A missing, draft or stale record is shown as such, never filled in.
- Every write is checked against its schema and logged in `system/provenance`.

## Draft or person

The gate rule `money-to-finance`: money master data an agent writes goes to the finance function's owner before it is the record. Read `purpose/money/summary`, never raw transactions. Never move money or enter account numbers.

Open decisions for this function come from `mentura_decisions`. Propose with `mentura_propose_decision`; you never mark a decision decided.

## Checks

`naive check` runs every check that applies to the venture. For this function: `schema/check-data-packages.mjs`: coverage and freshness. Run it after each write, and fix a failure before you report the work done.

## Actions and artifacts

Build artifacts by the `choosing-artifacts` skill (`interface/skills/choosing-artifacts/SKILL.md`). Each artifact names the records it was built from.

| Action | Artifact | Built from |
|---|---|---|
| Show runway, burn, revenue | Dashboard | purpose/money/summary |
| Build a model or budget | File (.xlsx) when asked, else dashboard | purpose/money/summary and validation/pricing |

## Depends on

Read by finance and investors. Its owner is the finance function's owner.
