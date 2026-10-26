---
type: research
source: hybrid
created: 2026-10-14T21:30:00Z
ai-model: claude-opus-5.5
authority: exploratory
decision-status: in-force
status: COMPLETE
governed-by:
  - "[[SAD_SKILL_v3]]"
related:
  - "[[sad-vs-g-stack-comparative-analysis-2026-05-13]]"
  - "[[FOUNDER_OPERATING_MODEL_CAMPAIGN_2026-10-14]]"
  - "[[SAD_SKILL_v3_AMENDMENT_2026-10-13_findability-product-harness-and-repository-structure]]"
domain: org_methodology
serves: [company]
owner: chief-of-staff-umbrella
tags: [methodology, comparison, pstack, sad, execution-layer, governance-layer, cursor, plugins]
description: "Comparison of pstack (Cursor plugin by poteto) with SAD as of v3.0.16 and the operating model. pstack is an execution layer for one engineering task; SAD and the Everything Ecosystem are the governance layer above it. They meet at the version-2 handoff. Decisions are in section 5."
---

# pstack and SAD: comparison (2026-10-14)

Source: [pstack](https://github.com/cursor/plugins/tree/main/pstack) (source S-011), read from its skill files on 2026-10-14. SAD as of v3.0.16 plus the founder operating model ([[FOUNDER_OPERATING_MODEL_CAMPAIGN_2026-10-14]]). Successor to [[sad-vs-g-stack-comparative-analysis-2026-05-13]], whose verdict was "gstack's operational layer on top of SAD's structural layer gets something better than either alone." pstack is a more developed version of that operational layer.

## 1. What pstack is

A Cursor plugin (MIT) by poteto (React core team; Meta, Netflix, Cursor) for doing one engineering task well:

- `/poteto-mode` matches the task to one of 23 playbooks (feature, bug fix, refactoring, investigation, autonomous run, session pickup, shipping, babysit, multi-phase plan, opening a PR, and others) and routes to other skills.
- 24 one-rule principle skills (laziness protocol, prove it works, fix root causes, encode lessons in structure, redesign from first principles, model the domain, never block on the human, and others).
- A per-role model mapping written by `/setup-pstack` to an always-applied rule: code delegates to Grok, judgment, prose and the hardest work to Opus; review panels mix both.
- Verification skills that let agents drive the real app for proof.
- `show-me-your-work`: a TSV decision log, one row per decision (timestamp, phase, decision, why, evidence, result).
- `automate-me` drafts a personal `<your-name>-mode` skill.
- Works inside one repo on one task. "The best spec is code"; planning is not a default.

## 2. Where they independently agree

| pstack | SAD v3.0.16 and the operating model |
|---|---|
| Code delegates to Grok; judgment and prose to Opus | A ratified rule: frontier tier for design roles, workhorse coding tier for the Builder |
| Never block on the human: proceed on reversible work, confirm irreversible actions | The reversible-work rule and the decision-rights levels, which also split by stakes and reversibility |
| Encode lessons in structure: a structural fix beats an instruction | v3.0.16: registries, generated views, findability scripts |
| Redesign from first principles | The first-principles rule: derive from the work's functions, then test against established practice |
| Autonomous run with a checkable exit predicate | Version-2 handoffs' verifiable done-criteria |
| Session pickup: read the prior trail, don't redo it | Rediscovery check (PART 4 step 4d) and the work queue |
| Verification skills drive the real app | The conformance rule: objective checks accept work with no reviewer |
| `automate-me` drafts a personal mode | The chief-of-staff skill is in effect a mode of the owner |
| Build the lever: the tool that does or proves the work | Findability inventory, register renderers, TypeSafe synthesis scripts |

## 3. Where they differ

**Scope.** pstack has no ledger, no authority tiers, no domain design, no decision rights across roles and ventures, no founder or umbrella level, no registries. It optimizes how a task gets done well. SAD and the Everything Ecosystem decide what is worth doing, why, and who may decide.

**Specs.** pstack treats code as the spec and avoids planning. SAD is spec-anchored. Resolved by layer, as an earlier decision did for one feature (spike, then tests, then the API): SAD binds the domain, the decisions and the done-criteria; inside a handoff the Builder works the pstack way, with code as the spec for implementation detail. This also exposes that SAD's name over-commits: the Everything Ecosystem catalog lists spec-anchored as one of 19 methodologies, so specs as source of truth is a per-system choice, not a rule of the whole method (see §6).

**Blocking.** pstack's "never block on the human" goes further than SAD's escalation list, but it also exempts irreversible actions, and the founder classes (money, legal, public commitments, strategy) are the irreversible ones. Compatible.

## 4. What each does that the other lacks

| pstack has, SAD lacks | SAD has, pstack lacks |
|---|---|
| Playbooks for engineering situations (bug fix, perf, refactor, shipping, babysit) | Domain, product, experience, interface and systems design layers |
| An execution-level decision log | Ledgers, ADR register, authority tiers, governed-by chains |
| Multi-model panels (arena, swarm, interrogate) for design bakeoffs | Decision rights across roles, ventures and the founder |
| A verification-skill builder | Registries (risk, dependency, source, spend, open questions, work queue) |
| Prose discipline as skills (unslop, technical writing) | Findability and rediscovery checks; versioning and brand continuity |

## 5. Decisions (2026-10-14)

- pstack is the Builder's execution kit under the governance layer; not used for the founder session or governance roles; the Architect may borrow `architect` and `interrogate` for code-level review.
- pstack's model settings are generated from `agent-roles.json`.
- The Builder reports with pstack's decision log, committed in the PR.
- The operating model and execution kit go into the next methodology amendment; `cursor-team-kit` is evaluated alongside.

## 6. Consequence for SAD

The founder observed (2026-10-14) that the Everything Ecosystem does not require spec-driven development, yet SAD has been used as if it were the Everything Ecosystem's method. The catalog confirms it: `spec-anchored` is one entry among 19 (with TDD, BDD, contract-first, spike-prototype, small-change, model-driven and others), each naming its own source of truth. The operating method (rituals, governance, registries, design layers, methodology selection) is broader than its spec anchor. Proposed response: rename the umbrella method to MAD, Methodology-Anchored Development, with spec-anchored kept as one catalog option. See the open decision in the work queue.
