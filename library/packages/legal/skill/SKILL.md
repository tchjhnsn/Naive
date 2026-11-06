---
type: knowledge
tags: [everything-ecosystem, naive, skills, packages, legal, functions]
ai-model: grok-4.7
created: 2026-10-29T22:30:00Z
source: ai-generated
name: legal-function
description: >
  Work with the legal function of a Naive venture in code: read
  and write its records through the router or MCP, know what lands as a draft
  and what needs a person, run its checks, and pick the artifact each action
  builds. MANDATORY TRIGGERS: ownership, cap table, founder agreement, publication policy, board, decision rights, legal lint.
---

# Legal function

Package `library/packages/legal`. A venture function is a part of the venture with one accountable owner. The owner is named in `venture.json` under `functions` and in `naive.config.json`. Who owns what, who decides what, what may be published, and how the venture ends.

## Records

| Route | What it is | Record type |
|---|---|---|
| `governance/ownership` | The cap table: classes, holders, grants | `ownership` |
| `governance/decision-rights` | Who may decide which class of decision | `decision-rights` |
| `governance/board` | Formal and advisory boards | `board` |
| `governance/exit` | Exit paths and sale values to model | `exit` |
| `governance/publication-policy` | Where the venture publishes and who approves | `publication-policy` |
| `governance/founder-agreement` | What the founders agreed | `founder-agreement` |
| `legal/lint` | Command: the legal lint | command |

The schemas are listed in `library/packages/legal/package.json`. Call `mentura_layout` with a route to get its schema, template, gate and what need-now says before you act.

## Read and write

- Over MCP: `mentura_read` with `venture` and `route` (for example `governance/ownership`). Pass `header_only` to see state and owner first. `mentura_write` with the whole `record`, and say what it came from and the decision it acts under.
- In a shell inside the venture: `naive mcp` serves the same routes; `mentura routes` lists them.
- Read through Naive, never from memory. A missing, draft or stale record is shown as such, never filled in.
- Every write is checked against its schema and logged in `system/provenance`.

## Draft or person

Ownership, the board, the founder agreement, the exit and decision rights carry decision classes that escalate. An agent's write is a draft a person accepts. Publication policy is the same. Never fill in equity, vesting, or the terms of an agreement.

Open decisions for this function come from `mentura_decisions`. Propose with `mentura_propose_decision`; you never mark a decision decided.

## Checks

`naive check` runs every check that applies to the venture. For this function: `packages/naive/src/checks/check-governance.mjs`, `packages/naive/src/checks/check-publication.mjs`, `packages/naive/src/checks/check-telos.mjs`, `packages/naive/src/engine/payouts.mjs`, and `packages/naive/src/checks/lint-legal.mjs` (route `legal/lint`).

`node packages/naive/src/checks/lint-legal.mjs <venture dir> [--json]` checks two rules. A published marketing content file with a `claim` and no `source` is a public claim with no source. `governance/founder-agreement.json` must name a counterparty that exists as an ownership holder, a founder, an account, a customer, or an investor. This is a lint, not legal advice. Each finding is `{rule, mode, file, message, suggestion}`. Rules are fail-open warnings by default; set `legal_lint.rules.<id>.mode` to `"fail-closed"` in naive.config.json to make a rule fail the run (exit 1). Exit 1 only when a fail-closed rule has findings.

Run it after each write, and fix a failure before you report the work done.

## Actions and artifacts

Build artifacts by the `choosing-artifacts` skill (`interface/skills/choosing-artifacts/SKILL.md`). Each artifact names the records it was built from.

| Action | Artifact | Built from |
|---|---|---|
| Show who owns the venture | Document | governance/ownership |
| Review what may be published | Document | governance/publication-policy and the legal lint |

## Depends on

Reads the founder agreement and the publication policy. Ownership is the record payouts are computed from (`packages/naive/src/engine/payouts.mjs`).
