# roles

Up: [src](../README.md)

## What this is

The role library (EE-229): every role Naive knows, agent or person, as one module. A role is a folder holding `role.json`, a record that [`role.schema.json`](../records/role.schema.json) governs, and a short SKILL.md that tells an agent how to act in the role or how to work with the person who holds it. `kind` says who may hold the role: `agent`, `person` or `either`. An agent or either role carries what delegation needs (its function, the decision classes it may be granted, its default tier, its lint suites, its verifier and its skill); a person role carries what governance needs (`person_kind`, `founder`, `owns_when_solo`). A role with a `portfolio` is a lead. The library replaced the role templates under the venture template and the two role registers, which are archived in [`docs/archive/roles-2026-11/`](../../../../docs/archive/roles-2026-11/README.md).

A venture's own roles live at `<venture>/governance/roles/<id>/role.json` and overlay the library by id: a venture role with a library role's id replaces it whole, and any other id adds a role.

## Where things are

| Path | Holds |
|---|---|
| `<id>/role.json` | One role: id, name, kind, description and the fields for its kind |
| `<id>/SKILL.md` | How an agent works in the role, or with the person in it |

The roles: `architect`, `builder`, `chief-of-staff`, `domain-lead`, `finance-agent`, `finance-lead`, `growth-lead`, `marketing-lead`, `people-lead`, `product-design-lead`, `product-lead`, `strategy-lead` and `validation-lead` are agent roles; `counsel` is either; `founder`, `co-founder`, `general-partner`, `limited-partner`, `operator`, `advisor` and `board-member` are person roles.

## Run and test

- `node packages/naive/src/checks/check-roles.ts [venture dir] [--json]` checks the library and, with a venture, its overlay: every file validates, its id matches its folder, `verified_by` and each `also_verified_by` name a known role and never the role itself, ids and aliases are unique, and a person role grants no agent tier.
- `node packages/naive/src/checks/check-roles-test.ts` breaks each rule on a copy of the library. `node test.ts` runs both, and `naive check` runs the check on a venture.
- `node packages/naive/src/checks/check-delegation.ts [venture dir]` checks what delegation needs from the roles: a verifier for every role that is not a person's, grantable classes, and leads' portfolios covering the 13 functions once each.

## How it connects

- Read through [`loadRoles`, `knownRoles` and `isPersonRole`](../engine/agents/roles.ts), the one loader. Every reader goes through it: delegation, team plans, lead plans, the routing rule, element owners, the decision queue, detectors, publication and people checks.
- Records that name a role: decision rights owners, delegation grants, team plans, lead plans (`operations/lead/[id]`), element owners (`operations/element-owners`), handoffs and detectors.

## Not built

- The fields later steps of EE-229 fill (`onet`, `pcf`, `reads`, `artifacts`, `standards`, `research`, `level`) are in the schema and empty in every role; linking roles to PCF elements, artifacts and deployments is not built.
