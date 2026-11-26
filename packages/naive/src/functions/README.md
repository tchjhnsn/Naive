# functions

Up: [naive](../../../../README.md)

## What this is

One module per function of a venture, the 13 in [`departments.json`](./departments.json) (APQC's cross-industry categories, EE-047). Each module holds the skills, templates, frameworks and kits Naive ships for that function. They came out of the six layer folders (purpose, knowledge, operations, evidence, governance, interface) in EE-118 step 7: each item went to the function that owns it. The layers' own manifests, tooling lists and references moved to [`../records/layers/`](../records/layers/), because a layer still organizes record types in the data model. The interface layer's skills went to [`../interfaces/skills/`](../interfaces/skills/), because they are about using Naive, not about a venture function.

## A complete module

A module is complete when it has every piece below; `node packages/naive/src/checks/check-functions.ts --complete` lists what each one still lacks, and all 13 modules are complete, and `check-functions.ts` without the flag checks every piece a module has (`node packages/naive/src/checks/check-functions-test.ts`). [`finance/`](./finance/README.md) was the first.

| File | Holds |
|---|---|
| `function.json` | Purpose, intake workflow, telos measure kinds, capability clusters (`packages/naive/src/records/function-module.schema.json`). Records owned, lead and write reach are derived from the data model, the lead role templates and the route table |
| `agent.md` | The function agent's instructions, harness-neutral, with frontmatter `role: <id>-agent` and `function: <id>` |
| `workflows/<id>.json` | At least two: the intake and the recurring work, each with a trigger, steps, the routes each writes, the classes it raises, optionally the activity a step performs (an APQC level 4 activity in `pcf.json` or an activity in `activities.json`, under the function's APQC category, EE-168) and done criteria (`packages/naive/src/records/function-workflow.schema.json`). A step with `consider` is optional: it says why a person might want it and when the agent runs it unasked, and every workflow keeps at least one required step (EE-181) |
| `decisions.json` | The decision matrix: decide, recommend or escalate per decision class; one-way doors and never-redelegated classes are always escalate (`packages/naive/src/records/function-decisions.schema.json`) |
| `skills/` | At least one skill a workflow step loads |

## Where things are

| Path | Holds |
|---|---|
| [`departments.json`](./departments.json) | The 13 functions: APQC category, value-chain place, governance and operations sides, and phase priors (EE-047, EE-028). Each `apqc` entry cites PCF 8.0 by hierarchy id, the category's name and its element id. The department label for human capital stays Human capital. |
| [`tools.json`](./tools.json) | The tool catalog (EE-163): each function's APQC level 2 process groups, and the tools a business needs, each with its function (none for the 11 universal tools), process groups, the record types it reads and writes, and the ones it proposes. `node packages/naive/src/checks/check-tools.ts` checks it (`--json` prints coverage per function); consoles build their navigation from it. A tool's `phase` is never before the earliest phase in which a record type it writes can be suggested: need-now's priors (`packages/naive/src/engine/need-now.json`) are the one source of when a record type starts, and the route table's phase groups come from them too. The calendar tool reads and writes the meeting record (EE-200) |
| [`activities.json`](./activities.json) | The activity catalog (EE-164): units of work in O*NET task statement form, each under an APQC level 2 process group from `tools.json`, cross-industry or for one NAICS industry, and the seven published scales an activity may be scored on. It holds 38 activities under 3.1 Understand markets, customers, and capabilities, taken from SciNet (CC BY 4.0) with SciNet's scores, which rate each task as researchers perform it and not as a business does (EE-167); `node scripts/import-scinet.ts` wrote them. An activity's optional process is a level 3 element of `pcf.json`. Its `proposal_rules` are the two rules by which scores propose a decision, each a list of lines on scales and a question for a person; the lines are unvalidated priors, and `naive activities propose` files what they find for a venture as open decisions (EE-169). `node packages/naive/src/checks/check-activities.ts` checks it (`--json` prints counts per function and process group) A proposal rule's `sets` says which field of a venture's `operations/activity-assignments.json` its decided answer sets, `performer` or `approval` (EE-172). Its `kinds` (EE-179) say which activities a person performs by default, a decision, a value, a commitment and a relationship, told from the verb and terms of the statement; they are unvalidated priors, and `naive activities defaults` lists the activities that have one. |
| [`pcf.json`](./pcf.json) | APQC's Process Classification Framework 8.0 (March 2026), cross-industry, levels 1 to 5 (EE-165): 13 categories, 74 process groups, 363 processes, 1,352 activities and 215 tasks, each a hierarchy id, a name verbatim from APQC and a five-digit element id, with the attribution APQC's licence requires in every copy. No definitions or measures. Written by `node scripts/import-pcf.ts <hierarchy.json>` from a hierarchy extracted from APQC's 13 Definitions and Key Measures articles, which are not kept here; `node packages/naive/src/checks/check-pcf.ts` checks it. Element ids are not unique: APQC files 19950, 19951, 14197 and 10530 at two hierarchy ids each, and the file keeps them so |
| [`strategy/`](./strategy/README.md) | Strategy |
| [`products/`](./products/README.md) | Products and services |
| [`marketing-and-sales/`](./marketing-and-sales/README.md) | Marketing and sales |
| [`supply-chain/`](./supply-chain/README.md) | Supply chain |
| [`service-delivery/`](./service-delivery/README.md) | Service delivery |
| [`customer-service/`](./customer-service/README.md) | Customer service |
| [`human-capital/`](./human-capital/README.md) | Human capital (HR) |
| [`it/`](./it/README.md) | Information technology |
| [`finance/`](./finance/README.md) | Finance and accounting |
| [`assets/`](./assets/README.md) | Assets and facilities |
| [`risk-and-compliance/`](./risk-and-compliance/README.md) | Legal, risk and compliance |
| [`external-relationships/`](./external-relationships/README.md) | External relationships |
| [`capabilities/`](./capabilities/README.md) | Business capabilities |

## How it connects

- A venture's `venture.json` names its functions and their owners by these ids.
- The tool catalog sits under the functions: function, then process group, then tool. A tool's status is derived from what it touches: ready when the data model has every record type it needs, partial when it reads or writes some and proposes others, proposed when it only proposes. No console screen is implied by a tool being ready.
- The activity catalog sits beside the tool catalog on the same process groups: function, then process group, then activity. A score on an activity is one rater's judgment and decides nothing.
- `pcf.json` is APQC's own hierarchy, version 8.0. `tools.json` uses its process group numbers, names and element ids (EE-166), and `node packages/naive/src/checks/check-pcf.ts` fails when they differ. PCF 8.0's two new process groups have no tool of their own: 5.3 is on Engagements and 13.6 on Knowledge base. Hierarchy ids change between PCF versions and element ids do not, so a reference meant to outlast a version names the element id.
- The data model's layers still own the record types (`../records/data-model.json`); a function module owns no record type.
- Every module carries the function's autoresearch work: `templates/research-program.md`, a starter research program with one section per pattern the function researches (strategy's covers `competitors/[id]/signals`, whose record type the competitors package owns; the rest have none yet and say what to research and how). Each starter's research questions and signals to watch come from the function research thread's signals and research questions. Products, marketing and sales, and supply chain name their first patterns (a feature-request register counted by distinct ICP accounts; leads and win-loss reasons; inventory position, shipments and a supplier scorecard), but those record types are not built, so each starter lists them as research questions until they are. `../engine/research-programs.ts` copies it into a venture's `programs/<function>.md` once, when the venture lists the function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it. The loop the function's researcher runs is the research skill, [`../interfaces/skills/research/SKILL.md`](../interfaces/skills/research/SKILL.md), the same for every function.
