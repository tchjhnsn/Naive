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

Package `library/packages/customers`. A venture function is a part of the venture with one accountable owner. The owner is named in `venture.json` under `functions` and in `naive.config.json`. Master data for customers: one `[id].json` each, plus append-only activity in `_streams/`. Never complete. When a CRM is the system of record, records are pointers and summaries.

## Records

| Route | What it is | Record type |
|---|---|---|
| `customers` | List of customer master records | `customer` |
| `customers/[id]` | One customer master record | `customer` |
| `purpose/data-stream/[id]` | Declares one append-only stream and whether it is sensitive | `data-stream` |

The schemas are listed in `library/packages/customers/package.json`. Call `mentura_layout` with a route to get its schema, template, gate and what need-now says before you act.

## Read and write

- Over MCP: `mentura_read` with `venture` and `route` (for example `customers`). Pass `header_only` to see state and owner first. `mentura_write` with the whole `record`, and say what it came from and the decision it acts under.
- In a shell inside the venture: `naive mcp` serves the same routes; `mentura routes` lists them.
- Read through Naive, never from memory. A missing, draft or stale record is shown as such, never filled in.
- Every write is checked against its schema and logged in `system/provenance`.

## Draft or person

Customer records have no escalating class, so an agent's write is the record, logged in provenance. Streams are append-only: add lines, never rewrite them. A sensitive stream stays out of model context; read its summary. If `knowledge/sources.json` names a CRM, write a pointer, not a copy.

Open decisions for this function come from `mentura_decisions`. Propose with `mentura_propose_decision`; you never mark a decision decided.

## Checks

`naive check` runs every check that applies to the venture. For this function: `packages/naive/src/checks/check-data-packages.mjs` (coverage and freshness, not completeness) and `packages/naive/src/checks/lint-customers.mjs` (route `customers/lint`).

`node packages/naive/src/checks/lint-customers.mjs <venture dir> [--json]` warns when a customer matches no ICP profile, and when a promise on the customer names a product key whose record no longer keeps that promise. A product keeps a promise when its `job` or `description` still contains the promise text and its status is not `retired`. The product record is read by key (`product/<id>.json`, then `products/<id>.json`) through `ventureFile` on that run, so a later edit to the product shows up on the next run. Nothing is copied onto the customer. Rules are fail-open. Set `customers_lint.rules.<id>.mode` to `"fail-closed"` in `naive.config.json` to make that rule's findings exit 1.

Run the checks after each write, and fix a failure before you report the work done.

## Actions and artifacts

Build artifacts by the `choosing-artifacts` skill (`packages/naive/src/interfaces/skills/choosing-artifacts/SKILL.md`). Each artifact names the records it was built from.

| Action | Artifact | Built from |
|---|---|---|
| Review accounts | Dashboard | customers/ |
| Prepare for a customer call | Document | customers/[id] and its stream |

## Depends on

Feeds validation evidence (interviews, retention) and marketing audiences. The lint reads ICP profiles and product records by key. It does not copy them.
