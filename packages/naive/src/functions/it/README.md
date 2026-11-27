# it

Up: [functions](../README.md)

## What this is

The information technology function (APQC 8.0, Manage Information Technology (IT)). Its governance side is tool approval (scored by Jev, EE-042); its operations side is accounts, integrations, devices and access. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The IT agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix. The architect approves a free new dependency (`new-dependency-free`), because the architect holds that grant in the default delegation and product-lead does not |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's systems and access. It reads the source map through `knowledge/knowledge-sources`. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/quarterly-access-review.json](./workflows/quarterly-access-review.json) | Workflow: review access and tools each quarter, reading the source map through `knowledge/knowledge-sources` |
| [skills/access-review](./skills/access-review) | Skill: keep each person's and agent role's access to the least the work needs: MFA, scoped credentials, leavers, rotation and restore tests (CIS Controls v8.1 IG1, OWASP LLM06) |
| [capability-clusters.json](./capability-clusters.json) | The capability cluster catalog (lead agents build plan item 7): the whole-venture monorepo thesis's six clusters, the functions that depend on each and the gap kinds that justify an outside tool. It names no vendor; a venture's connection record (`it/connections/<id>.json`, `packages/naive/src/records/connection.schema.json`) names its own system. Checked by `packages/naive/src/checks/check-connections.ts` |
| [language-rubric.json](./language-rubric.json) | The language rubric (EE-189): eight criteria for judging which programming language fits a system, each with a question, why, a 0 to 4 scale, its sources and a default weight that is an unvalidated prior, and Naive's own choices as worked examples (TypeScript on Effect for the framework, Lean 4 for proofs). `scoreLanguages` in `packages/naive/src/engine/language-rubric.ts` ranks candidates and a person decides; checked by `packages/naive/src/checks/check-language-rubric.ts`. The tool-selection skill says when to use it |
| [visibility-rubric.json](./visibility-rubric.json) | The visibility rubric (EE-222): five criteria for judging how far a tool gives the system visibility of an activity and how far the venture owns the record, each with a question, why, a 0 to 4 scale, its sources and a default weight that is an unvalidated prior a venture replaces under `visibility` in `naive.config.json`; a gate on consent and retention; a blind spot where nothing is recorded; the channels an activity is performed on, read from the words of its statement; and the tool kinds that capture each, named as kinds and never as vendors. `scoreTools` in `packages/naive/src/engine/visibility-rubric.ts` ranks candidates and `naive tools recommend` reads a goal (`packages/naive/src/engine/tool-recommendations.ts`); checked by `packages/naive/src/checks/check-visibility-rubric.ts`. A person decides |
| [skills/tool-selection](./skills/tool-selection) | Skill: Help someone choose the tools for a layer (knowledge, operations, execution, evidence, governance, interface, purpose) by offering situation questions, only when they wan |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/it.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own. The IT workflows also run `node packages/naive/src/checks/check-connections.ts "$NAIVE_VENTURE"` on its connections.
