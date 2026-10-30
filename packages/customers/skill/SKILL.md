---
type: knowledge
tags: [everything-ecosystem, naive, skills, packages, customers, functions]
ai-model: claude-opus-5.5
created: 2026-10-29T20:45:00Z
source: ai-generated
name: customers-function
description: >
  Work with the customers function of a Naive venture in code: read
  and write its records through the router or MCP, know what lands as a draft
  and what needs a person, run its checks, and pick the artifact each action
  builds. MANDATORY TRIGGERS: customer record, CRM, customer list, customer activity, who are our customers.
---

# Customers function

Package `packages/customers`. A venture function is a part of the venture with one accountable owner. The owner is named in `venture.json` under `functions` and in `naive.config.json`. Master data for customers: one `[id].json` each, plus append-only activity in `_streams/`. Never complete. When a CRM is the system of record, records are pointers and summaries.

## Records

| Route | What it is | Record type |
|---|---|---|
| `customers` | List of customer master records | `customer` |
| `customers/[id]` | One customer master record | `customer` |
| `purpose/data-stream/[id]` | Declares one append-only stream and whether it is sensitive | `data-stream` |

The schemas are listed in `packages/customers/package.json`. Call `mentura_layout` with a route to get its schema, template, gate and what need-now says before you act.

## Read and write

- Over MCP: `mentura_read` with `venture` and `route` (for example `customers`). Pass `header_only` to see state and owner first. `mentura_write` with the whole `record`, and say what it came from and the decision it acts under.
- In a shell inside the venture: `naive mcp` serves the same routes; `mentura routes` lists them.
- Read through Naive, never from memory. A missing, draft or stale record is shown as such, never filled in.
- Every write is checked against its schema and logged in `system/provenance`.

## Draft or person

Customer records have no escalating class, so an agent's write is the record, logged in provenance. Streams are append-only: add lines, never rewrite them. A sensitive stream stays out of model context; read its summary. If `knowledge/sources.json` names a CRM, write a pointer, not a copy.

Open decisions for this function come from `mentura_decisions`. Propose with `mentura_propose_decision`; you never mark a decision decided.

## Checks

`naive check` runs every check that applies to the venture. For this function: `schema/check-data-packages.mjs`: coverage and freshness, not completeness. Run it after each write, and fix a failure before you report the work done.

## Actions and artifacts

Build artifacts by the `choosing-artifacts` skill (`interface/skills/choosing-artifacts/SKILL.md`). Each artifact names the records it was built from.

| Action | Artifact | Built from |
|---|---|---|
| Review accounts | Dashboard | customers/ |
| Prepare for a customer call | Document | customers/[id] and its stream |

## Depends on

Feeds validation evidence (interviews, retention) and marketing audiences. Reads nothing it does not own.
