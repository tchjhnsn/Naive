---
type: knowledge
tags: [everything-ecosystem, naive, skills, packages, investors, functions]
ai-model: claude-opus-5.5
created: 2026-10-29T20:45:00Z
source: ai-generated
name: investors-function
description: >
  Work with the investors function of a Naive venture in code: read
  and write its records through the router or MCP, know what lands as a draft
  and what needs a person, run its checks, and pick the artifact each action
  builds. MANDATORY TRIGGERS: investor list, fundraising pipeline, investor update, who has invested, cap table contacts.
---

# Investors function

Package `packages/investors`. A venture function is a part of the venture with one accountable owner. The owner is named in `venture.json` under `functions` and in `naive.config.json`. Master data for investors: one `[id].json` each, plus append-only activity in `_streams/`. Never complete.

## Records

| Route | What it is | Record type |
|---|---|---|
| `investors` | List of investor master records | `investor` |
| `investors/[id]` | One investor master record | `investor` |
| `purpose/data-stream/[id]` | The investor activity streams | `data-stream` |

The schemas are listed in `packages/investors/package.json`. Call `mentura_layout` with a route to get its schema, template, gate and what need-now says before you act.

## Read and write

- Over MCP: `mentura_read` with `venture` and `route` (for example `investors`). Pass `header_only` to see state and owner first. `mentura_write` with the whole `record`, and say what it came from and the decision it acts under.
- In a shell inside the venture: `naive mcp` serves the same routes; `mentura routes` lists them.
- Read through Naive, never from memory. A missing, draft or stale record is shown as such, never filled in.
- Every write is checked against its schema and logged in `system/provenance`.

## Draft or person

Investor records have no escalating class, so an agent's write is the record, logged in provenance. Terms and ownership live in `governance/ownership`, which a person decides; never record a commitment here that the cap table does not show.

Open decisions for this function come from `mentura_decisions`. Propose with `mentura_propose_decision`; you never mark a decision decided.

## Checks

`naive check` runs every check that applies to the venture. For this function: `schema/check-data-packages.mjs`: coverage and freshness. Run it after each write, and fix a failure before you report the work done.

## Actions and artifacts

Build artifacts by the `choosing-artifacts` skill (`interface/skills/choosing-artifacts/SKILL.md`). Each artifact names the records it was built from.

| Action | Artifact | Built from |
|---|---|---|
| Pitch or investor update | Deck | foundation/, evidence/ (traction) and purpose/money/summary |
| Track the raise | Dashboard | investors/ |

## Depends on

Reads foundation, evidence and money summaries for updates. Feeds the investor handoff and `governance/ownership`.
