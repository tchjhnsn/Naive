# Roles as agents, linked to the PCF

Date: 2026-11-28. Decisions: EE-229 (step 1, built), EE-235 (step 7, built), EE-230 to EE-234 and EE-236 to EE-239 (steps 2 to 6 and 8 to 11, not built). Status: steps 1 and 7 built; every other step is decided and not built.

## The ask

Torian decided on 2026-11-28 that every role in Naive and in a business becomes one role module in one role library, callable at any time by a lead agent or a person, and that roles link to the elements of APQC's Process Classification Framework, to the artifacts they produce and to the agents deployed as them. Every decision below is settled. This document describes the whole plan and what step 1 built.

## What Naive held before

Roles lived in three shapes, and no one check read them together.

- Fourteen role templates at `packages/naive/template/governance/roles/<id>.json`, governed by `role-template.schema.json`. Delegation, team plans, lead plans and the routing rule read them.
- An agent capability register (`agent-roles.json`) and a venture role register (`venture-roles.json`), with no schema checking their own fields. Decision rights named owners that only the register held (`domain-lead`, `operations-finance-lead`), so no check knew whether those owners were roles.
- Vault-era Markdown role files (`ceo.md`, `cto.md` and others) that no code read.

About ten modules scanned those folders separately, each with its own rules for what a role was.

## Decisions

- **One role library.** Every role is a role module. Person roles (founder, co-founder, board member, advisor, investor kinds, operator) are modules too, with `kind: "person"`, and are never deployed as agents.
- **Merged roles.** A lead agent or a person may merge roles and deploy one agent as the merged role. A merged role carries the union of its parents' PCF elements and artifacts, and its reach is never wider than the lead's portfolio.
- **Temporary roles.** Lead agents may write venture-local temporary roles and spawn agents as them. A temporary role that keeps being used is proposed as an open decision to become durable and enter the library. Only a person accepts that decision; a lead proposes and never accepts.
- **O*NET finds missing roles.** PCF elements a business runs with no responsible role are matched to O*NET occupations to suggest a role.
- **Digital workers.** A running agent is a digital worker, recorded as a deployment at `operations/workers/<id>.json` (route `operations/workers/[id]`) and listed by `naive workers` (`list`, `count`, `history`). They are never called employees.
- **Naive's own roles.** Product manager, architect, requirements engineer, release manager, technical writer and instruction steward live at `agents/<role>/` in this repository, beside `agents/chief-of-staff/`, in the same shape. Naive's rows are built before business rows.
- **SAD's gates become checks.** SAD's gate questions (0A, 0B, 0C, 1A, 1B) become Naive checks over Naive's own records, ending at a new staffing gate. SAD's documents stay out, and EE-036 stands.
- **Artifact lint.** Protocol rules are always errors. Design rules default to warn, every finding is logged, and each design rule is off, warn or error under `artifact_lint.rules` in `naive.config.json`.

## The shape

```mermaid
flowchart LR
  subgraph Library["Role library: packages/naive/src/roles/&lt;id&gt;/"]
    RJ["role.json<br/>kind person, agent or either"]
    SK["SKILL.md<br/>how to act in the role"]
    RP["role.ts, step 9<br/>RoleProgram checks"]
  end
  VO["Venture overlay<br/>governance/roles/&lt;id&gt;/role.json"] -- "replaces by id" --> RJ
  NA["Naive's own roles<br/>agents/&lt;id&gt;/, step 10"] -. "same shape" .-> RJ
  RJ -- "pcf: id and RACI, step 4" --> PCF["APQC PCF element<br/>functions/pcf.json"]
  RJ -- "onet: code, step 4" --> ON["O*NET occupation"]
  RJ -- "artifacts, step 2" --> AR["Record type or<br/>documents.json kind"]
  RJ -- "reads" --> RT["Record types read"]
  AR -- "linted, step 3" --> LI["naive lint artifacts"]
  RJ -- "deployed as, step 7" --> DW["Digital worker<br/>operations/workers/&lt;id&gt;.json"]
  DW -- "writes never wider than" --> RJ
  RT -. "depends-on derived, step 6" .-> GR["naive graph --role"]
  AR -. "depends-on derived, step 6" .-> GR
  SG["Staffing gate, step 8"] -- "a person decides" --> DW
```

A role module is a folder. Its `role.json` is a record that `packages/naive/src/records/role.schema.json` governs:

- Required for every role: `id`, `name`, `kind` (`person`, `agent` or `either`) and `description`.
- Required for an agent or either role: `function` (a departments.json id, or `all`), `grantable_classes`, `default_tier`, `lint_suites`, `verified_by` and `skill`.
- For a person role: `person_kind` (builder, investor, operator, advisor or governor), `founder` and `owns_when_solo`.
- Kept from the templates: `aliases`, `portfolio` with `default_measure_kinds` (a lead), `chief_delegator` and `also_verified_by`.
- Optional, for later steps: `status` (`durable` or `temporary`), `merged_from`, `proposed_by` and `created_at`; `onet` (`code`, `title`, `basis`, `by`); `pcf` (`id`, a hierarchy id in `functions/pcf.json`, and `raci`, one of responsible, accountable, consulted or informed); `reads`; `artifacts` (each a `record_type` or a `document_kind`); `standards` (reference ids); `research` (an ordered list of methods from standards, scientific, organizational, practitioner and stakeholder, with `questions`); and `level` (SFIA level 1 to 7).

Depends-on is never typed. Step 6 derives it from one role's `reads` against other roles' `artifacts`.

A deployment (step 7) at `operations/workers/<id>.json` carries `role`, `mode` (temporary or durable), `level`, `sponsor` (a person), `writes` (never wider than the role's or the deployer's reach), `started_at`, `expires`, `status` (proposed, active, suspended or ended, a statechart in pure TypeScript with a Lean model), `deployed_by` and `ended_at`. Specialists (EE-213) migrate into temporary deployments.

## Step 1: one role record (EE-229, built)

- `role.schema.json` replaces `role-template.schema.json` and `venture-role.schema.json`, and both old schemas are deleted. `packages/naive/src/records/types/records.d.ts` has `Role`.
- The library is `packages/naive/src/roles/<id>/`, a `role.json` and a `SKILL.md` per role. It holds 21 roles:
  - Agent roles: architect, builder, chief-of-staff, domain-lead, finance-agent, finance-lead, growth-lead, marketing-lead, people-lead, product-design-lead, product-lead, strategy-lead and validation-lead.
  - Either: counsel.
  - Person roles: founder, co-founder, general-partner, limited-partner, operator, advisor and board-member.
- From the agent capability register, `domain-lead` joined the library, because decision rights name it as the owner of `domain-fact`. `business-lead` was archived, superseded by the four leads (strategy-lead, product-lead, growth-lead and finance-lead), whose portfolios cover the 13 functions. `operations-finance-lead` was archived, superseded by `finance-agent` (EE-123), and decision rights now name `finance-agent` as the owner of `spend-register-upkeep`, `cancel-or-downgrade` and `move-payment-method`.
- The registers' model chains, tiers and conformance notes were read by no code and are archived with them. The tier descriptions moved into the schema's `default_tier` description.
- A venture's own roles live at `<venture>/governance/roles/<id>/role.json` and overlay the library by id. No test or example needed the old flat form, so it is gone.
- The registers, `AGENT_ROLES_AND_DECISION_RIGHTS.md`, `render-roles.py` and the vault-era Markdown role files are archived in `docs/archive/roles-2026-11/`.
- `loadRoles(dir)` in `packages/naive/src/engine/agents/roles.ts` is the one loader. It reads the library and overlays the venture. `knownRoles(dir)` adds `<function>-agent` and `<function>-researcher`, and `isPersonRole` says whether a role is held only by a person. Delegation, team plans, lead plans, lead specs, the routing rule, element owners, the decision queue, detectors, publication, people, the SDLC catalog, the roadmap and venture types all read through it.
- `packages/naive/src/checks/check-roles.ts` checks every role file in the library and a venture's overlay:
  - it is JSON and validates;
  - its id matches its folder;
  - `verified_by` and each `also_verified_by` name a known role and never the role itself;
  - ids and aliases are unique;
  - a person role grants no agent tier.
- `check-roles-test.ts` breaks each rule on a copy. `node test.ts` runs both, and `naive check` runs the check on a venture.

## Steps 2 to 11 (step 7 built, the rest not built)

Each step is one pull request with its decision id assigned.

2. **EE-230 Artifact types.** Every role artifact is a record type or a documents.json kind, and new kinds join documents.json. Each kind names the brand fields it uses (`marketing/brand`, `marketing/design-system`). Harness adapters gain an `artifacts` list: what the harness can produce, its format and its skill.
3. **EE-231 Artifact lint.** `naive lint artifacts`: protocol rules are errors, and design rules warn unless configured. Findings are logged to `.naive/lint-findings.jsonl`, and `naive lint report` groups them by rule, role and harness.
4. **EE-232 PCF links both ways.** The `pcf` and `onet` fields are filled. `scripts/import-onet.ts` imports O*NET, a generated `functions/pcf-roles.json` maps each element to its roles with `--check`, and `check-roles --complete` fails on a gap.
5. **EE-233 Research methods.** The method enum: references record their method, and the find-reference and research skills take a method.
6. **EE-234 Roles in the graph.** `naive graph` gains role nodes and the derived depends-on edges, and `naive graph --role`.
7. **EE-235 Digital workers (built).** The deployment record, its statechart with a Lean model, and `naive workers`. Specialists are migrated, leads write temporary roles and merges, and promotion is proposed as a decision only a person accepts. Built in `packages/naive/src/engine/agents/workers.ts`, `packages/naive/src/engine/agents/worker-state.ts` and `packages/naive/lean/Naive/Workers.lean`; see `packages/naive/src/engine/agents/README.md` for the statechart. A worker goes active only when a person activates it, which is the hook step 8 uses.
8. **EE-236 Staffing gate.** SAD's gate questions run as checks. After 1B a lead drafts a staffing plan from the specs as one decision with EE-211 candidates. Deployments go active only once a person decides, and the gate fails closed (EE-217).
9. **EE-237 Role programs on Effect.** The `RoleProgram` interface and `naive role check <role>`, which run deterministic checks of a role's artifacts.
10. **EE-238 Rows for Naive.** `agents/<role>/` for the six Naive roles.
11. **EE-239 and after: rows for businesses.** One function per pull request. The first cut is one role per PCF level 2 process group (74), named after its best O*NET match.

## Not built

- Everything in steps 2 to 6 and 8 to 11. The step 1 schema holds their optional fields, and every role leaves them empty.
- Vault wikilinks to the archived `roles/ceo` and `roles/cto` remain in a few skills and the venture template's `index.md` and `pillars/product.md`. They pointed at vault paths that were already broken, and are left for the step that writes those rows.
