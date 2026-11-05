---
type: knowledge
tags: [everything-ecosystem, naive, skills, packages, people, functions]
ai-model: claude-opus-5.5
created: 2026-10-29T20:45:00Z
source: ai-generated
name: people-function
description: >
  Work with the people function of a Naive venture in code: read
  and write its records through the router or MCP, know what lands as a draft
  and what needs a person, run its checks, and pick the artifact each action
  builds. MANDATORY TRIGGERS: team, cofounder, hire, team plan, founder agreement, who owns what, hats, roles.
---

# People function

Package `library/packages/people`. A venture function is a part of the venture with one accountable owner. The owner is named in `venture.json` under `functions` and in `naive.config.json`. Who the venture needs, what each person brings and on what terms people join.

## Records

| Route | What it is | Record type |
|---|---|---|
| `people` | Each person's role and hats | `people` |
| `people/founders/[id]` | One file per founder | command or item |
| `people/team` | Validation sub-score: skills needed, held and the gaps | `validation-team` |
| `people/team-plan` | Who the venture needs, agent or person, when and with what authority | `team-plan` |
| `governance/founder-agreement` | Roles, commitment, IP, departure, deadlock | `founder-agreement` |

The schemas are listed in `library/packages/people/package.json`. Call `mentura_layout` with a route to get its schema, template, gate and what need-now says before you act.

## Read and write

- Over MCP: `mentura_read` with `venture` and `route` (for example `people`). Pass `header_only` to see state and owner first. `mentura_write` with the whole `record`, and say what it came from and the decision it acts under.
- In a shell inside the venture: `naive mcp` serves the same routes; `mentura routes` lists them.
- Read through Naive, never from memory. A missing, draft or stale record is shown as such, never filled in.
- Every write is checked against its schema and logged in `system/provenance`.

## Draft or person

The founder agreement carries the ownership-or-control decision class: an agent's write is always a draft, and only the founders accept it. Never fill in equity, vesting or departure terms. The team plan sets who may read and write which routes (`system/robots`), so treat a change to it as a person's decision.

Open decisions for this function come from `mentura_decisions`. Propose with `mentura_propose_decision`; you never mark a decision decided.

## Checks

`naive check` runs every check that applies to the venture. For this function: `schema/check-validation.mjs` (team), `schema/check-governance.mjs`, `schema/check-team.mjs`, and `schema/lint-people.mjs` (route `people/lint`). Run it after each write, and fix a failure before you report the work done.

`node schema/lint-people.mjs <venture dir> [--json]` warns when a role owns no function, a hire is on the books before the team plan names that role, or a decided decision names no person. Each finding is `{rule, mode, file, message, suggestion}`. Rules are fail-open. Set `people_lint.rules.<id>.mode` to `"fail-closed"` in naive.config.json to make that rule fail the run (exit 1).

## Actions and artifacts

Build artifacts by the `choosing-artifacts` skill (`interface/skills/choosing-artifacts/SKILL.md`). Each artifact names the records it was built from.

| Action | Artifact | Built from |
|---|---|---|
| Plan the team or a hire | Document | people/team-plan, people/team |
| Show who owns which function | Page with a diagram | people, venture.json functions |

## Depends on

Read by the cofounder and counsel handoffs. Function owners in venture.json and `naive.config.json` come from here, and every gate that names an owner depends on it.
