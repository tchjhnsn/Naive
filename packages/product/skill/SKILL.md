---
type: knowledge
tags: [everything-ecosystem, naive, skills, packages, product, functions]
ai-model: claude-opus-5.5
created: 2026-10-29T20:45:00Z
source: ai-generated
name: product-function
description: >
  Work with the product function of a Naive venture in code: read
  and write its records through the router or MCP, know what lands as a draft
  and what needs a person, run its checks, and pick the artifact each action
  builds. MANDATORY TRIGGERS: product card, what do we offer, flagship, wedge, substrate, spec, roadmap, product anatomy.
---

# Product function

Package `packages/product`. A venture function is a part of the venture with one accountable owner. The owner is named in `venture.json` under `functions` and in `naive.config.json`. What the venture offers, each product's role (flagship, substrate, wedge) and to whom.

## Records

| Route | What it is | Record type |
|---|---|---|
| `product` | List of product cards | `product` |
| `product/[id]` | One product card | `product` |
| `product/anatomy-answers` | Product Anatomy scores per question (read only) | `anatomy-answers` |
| `product/anatomy/[id]` | Product Anatomy input for one product (read only) | command or item |

The schemas are listed in `packages/product/package.json`. Call `mentura_layout` with a route to get its schema, template, gate and what need-now says before you act.

## Read and write

- Over MCP: `mentura_read` with `venture` and `route` (for example `product`). Pass `header_only` to see state and owner first. `mentura_write` with the whole `record`, and say what it came from and the decision it acts under.
- In a shell inside the venture: `naive mcp` serves the same routes; `mentura routes` lists them.
- Read through Naive, never from memory. A missing, draft or stale record is shown as such, never filled in.
- Every write is checked against its schema and logged in `system/provenance`.

## Draft or person

Product cards have no escalating decision class, so an agent's write is the record, logged in provenance. The package still gates completion: a person must confirm every required record before the engineering handoff opens. Specs and roadmap are planned, not records yet; write them as proposals.

Open decisions for this function come from `mentura_decisions`. Propose with `mentura_propose_decision`; you never mark a decision decided.

## Checks

`naive check` runs every check that applies to the venture. For this function: `schema/check-ventures.mjs`, the product schema (`schema/product.schema.json`), and `node schema/lint-product.mjs <venture dir>` (route `product/lint`). The `check` action on `product/[id]` runs the venture check for one card. Run it after each write, and fix a failure before you report the work done.

`product/lint` warns when a product is offered to no ICP profile, a feature's job is not a job of an ICP it is offered to, or a business model has no pricing record. The ICP jobs and the pricing record are read by key. They are not copied onto the product. Rules are fail-open. Set `product_lint.rules.<id>.mode` to `"fail-closed"` in `naive.config.json` to make that rule fail the run.

## Actions and artifacts

Build artifacts by the `choosing-artifacts` skill (`interface/skills/choosing-artifacts/SKILL.md`). Each artifact names the records it was built from.

| Action | Artifact | Built from |
|---|---|---|
| Write a spec or roadmap | Document | product/ and decisions/ |
| Show a flow or architecture | Page with a diagram | product/ |
| Prototype a screen | Design | product specs |

## Depends on

Reads `foundation/icp`. Read by foundation, validation, marketing and finance. Unlocks the engineering handoff: build what is specified.
