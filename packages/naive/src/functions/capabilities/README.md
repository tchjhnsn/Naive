# capabilities

Up: [functions](../README.md)

## What this is

The business capabilities function (APQC 13.0, Develop and Manage Business Capabilities). Its governance side is process ownership; its operations side is process improvement, knowledge management, quality. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The capabilities agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn how the venture works. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/postmortem.json](./workflows/postmortem.json) | Workflow: write a postmortem when work fails |
| [workflows/weekly-process-review.json](./workflows/weekly-process-review.json) | Workflow: review process health each week |
| [design-documents.registry.json](./design-documents.registry.json) | A record |
| [handoff-v2.md](./handoff-v2.md) | Handoff v2: the handoff format |
| [skills/design-coverage](./skills/design-coverage) | Skill: Check which design documents (domain, product, experience, interface, systems) exist for any project and flag gaps, using the registry in packages/naive/src/functions/cap |
| [skills/fidelity-ladder-audit](./skills/fidelity-ladder-audit) | Skill: Audit a project's component tree as a set of fidelity ladders: one domain object, many renderings ordered by how much of the object each shows: and produce the field-pr |
| [skills/find-reference](./skills/find-reference) | Skill: Find, confirm and record the source behind a reference in a layer's references/references.json: fill a missing URL from title, authors and year, re-check URLs that may ha |
| [skills/findability](./skills/findability) | Skill: Check whether an entity's documents and decisions can be found (SAD v3.0.16 §NEW.26). |
| [skills/foreshadowing-audit](./skills/foreshadowing-audit) | Skill: Run the V[N] → V[N+1] foreshadowing audit. |
| [skills/industry-awareness](./skills/industry-awareness) | Skill: Map the operator's terminology to industry-standard terminology and surface existing industry solutions BEFORE the operator reinvents the wheel. |
| [skills/postmortem](./skills/postmortem) | Skill: Draft a blameless postmortem when a trigger set in advance fires: timeline, contributing causes as process conditions, corrective and preventive actions with owners, and lessons |
| [skills/working-procedure](./skills/working-procedure) | Skill: Turn recurring work into a process record: one owner, SIPOC, steps with control points, and cycle time, rework rate and first-pass yield |
| [templates/glossary.md](./templates/glossary.md) | Template: package glossary |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/capabilities.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.

## APQC processes

Each level 3 process of APQC category 13.0 has one workflow, named by its hierarchy id and holding that id in its `process` field, and each level 2 process group has one skill that carries the method for its processes. The workflows run on request, once a meeting has walked `intake`.

| Process | APQC name | Workflow | Skill |
|---|---|---|---|
| 13.1.1 | Establish and maintain process management governance | [workflows/13-1-1-establish-and-maintain-process-management.json](./workflows/13-1-1-establish-and-maintain-process-management.json) | [skills/manage-business-processes](./skills/manage-business-processes) |
| 13.1.2 | Define and manage process frameworks | [workflows/13-1-2-define-and-manage-process-frameworks.json](./workflows/13-1-2-define-and-manage-process-frameworks.json) | [skills/manage-business-processes](./skills/manage-business-processes) |
| 13.1.3 | Define processes | [workflows/13-1-3-define-processes.json](./workflows/13-1-3-define-processes.json) | [skills/manage-business-processes](./skills/manage-business-processes) |
| 13.1.4 | Manage process performance | [workflows/13-1-4-manage-process-performance.json](./workflows/13-1-4-manage-process-performance.json) | [skills/manage-business-processes](./skills/manage-business-processes) |
| 13.1.5 | Improve processes | [workflows/13-1-5-improve-processes.json](./workflows/13-1-5-improve-processes.json) | [skills/manage-business-processes](./skills/manage-business-processes) |
| 13.2.1 | Manage portfolio | [workflows/13-2-1-manage-portfolio.json](./workflows/13-2-1-manage-portfolio.json) | [skills/manage-portfolio-program-and-project](./skills/manage-portfolio-program-and-project) |
| 13.2.2 | Manage programs | [workflows/13-2-2-manage-programs.json](./workflows/13-2-2-manage-programs.json) | [skills/manage-portfolio-program-and-project](./skills/manage-portfolio-program-and-project) |
| 13.2.3 | Manage projects | [workflows/13-2-3-manage-projects.json](./workflows/13-2-3-manage-projects.json) | [skills/manage-portfolio-program-and-project](./skills/manage-portfolio-program-and-project) |
| 13.3.1 | Establish quality requirements | [workflows/13-3-1-establish-quality-requirements.json](./workflows/13-3-1-establish-quality-requirements.json) | [skills/manage-enterprise-quality](./skills/manage-enterprise-quality) |
| 13.3.2 | Evaluate performance to requirements | [workflows/13-3-2-evaluate-performance-to-requirements.json](./workflows/13-3-2-evaluate-performance-to-requirements.json) | [skills/manage-enterprise-quality](./skills/manage-enterprise-quality) |
| 13.3.3 | Manage non-conformance | [workflows/13-3-3-manage-non-conformance.json](./workflows/13-3-3-manage-non-conformance.json) | [skills/manage-enterprise-quality](./skills/manage-enterprise-quality) |
| 13.3.4 | Implement and maintain the enterprise quality management system (EQMS) | [workflows/13-3-4-implement-and-maintain-the-enterprise-quality.json](./workflows/13-3-4-implement-and-maintain-the-enterprise-quality.json) | [skills/manage-enterprise-quality](./skills/manage-enterprise-quality) |
| 13.4.1 | Plan for change | [workflows/13-4-1-plan-for-change.json](./workflows/13-4-1-plan-for-change.json) | [skills/manage-change](./skills/manage-change) |
| 13.4.2 | Design the change | [workflows/13-4-2-design-the-change.json](./workflows/13-4-2-design-the-change.json) | [skills/manage-change](./skills/manage-change) |
| 13.4.3 | Implement change | [workflows/13-4-3-implement-change.json](./workflows/13-4-3-implement-change.json) | [skills/manage-change](./skills/manage-change) |
| 13.4.4 | Sustain improvement | [workflows/13-4-4-sustain-improvement.json](./workflows/13-4-4-sustain-improvement.json) | [skills/manage-change](./skills/manage-change) |
| 13.5.1 | Develop KM strategy | [workflows/13-5-1-develop-km-strategy.json](./workflows/13-5-1-develop-km-strategy.json) | [skills/develop-and-manage-enterprise-wide-knowledge](./skills/develop-and-manage-enterprise-wide-knowledge) |
| 13.5.2 | Assess KM capabilities | [workflows/13-5-2-assess-km-capabilities.json](./workflows/13-5-2-assess-km-capabilities.json) | [skills/develop-and-manage-enterprise-wide-knowledge](./skills/develop-and-manage-enterprise-wide-knowledge) |
| 13.5.3 | Design and implement KM capabilities | [workflows/13-5-3-design-and-implement-km-capabilities.json](./workflows/13-5-3-design-and-implement-km-capabilities.json) | [skills/develop-and-manage-enterprise-wide-knowledge](./skills/develop-and-manage-enterprise-wide-knowledge) |
| 13.5.4 | Evolve and sustain KM capabilities | [workflows/13-5-4-evolve-and-sustain-km-capabilities.json](./workflows/13-5-4-evolve-and-sustain-km-capabilities.json) | [skills/develop-and-manage-enterprise-wide-knowledge](./skills/develop-and-manage-enterprise-wide-knowledge) |
| 13.6.1 | Define content management strategy | [workflows/13-6-1-define-content-management-strategy.json](./workflows/13-6-1-define-content-management-strategy.json) | [skills/manage-content](./skills/manage-content) |
| 13.6.2 | Develop and manage taxonomies | [workflows/13-6-2-develop-and-manage-taxonomies.json](./workflows/13-6-2-develop-and-manage-taxonomies.json) | [skills/manage-content](./skills/manage-content) |
| 13.6.3 | Define content systems of record and storage requirements | [workflows/13-6-3-define-content-systems-of-record-and-storage.json](./workflows/13-6-3-define-content-systems-of-record-and-storage.json) | [skills/manage-content](./skills/manage-content) |
| 13.6.4 | Manage content infrastructure | [workflows/13-6-4-manage-content-infrastructure.json](./workflows/13-6-4-manage-content-infrastructure.json) | [skills/manage-content](./skills/manage-content) |
| 13.6.5 | Develop and manage content | [workflows/13-6-5-develop-and-manage-content.json](./workflows/13-6-5-develop-and-manage-content.json) | [skills/manage-content](./skills/manage-content) |
| 13.6.6 | Deliver approved content | [workflows/13-6-6-deliver-approved-content.json](./workflows/13-6-6-deliver-approved-content.json) | [skills/manage-content](./skills/manage-content) |
| 13.6.7 | Control delivered content | [workflows/13-6-7-control-delivered-content.json](./workflows/13-6-7-control-delivered-content.json) | [skills/manage-content](./skills/manage-content) |
| 13.7.1 | Define and manage organizational performance strategy | [workflows/13-7-1-define-and-manage-organizational-performance.json](./workflows/13-7-1-define-and-manage-organizational-performance.json) | [skills/measure-and-benchmark](./skills/measure-and-benchmark) |
| 13.7.2 | Benchmark performance | [workflows/13-7-2-benchmark-performance.json](./workflows/13-7-2-benchmark-performance.json) | [skills/measure-and-benchmark](./skills/measure-and-benchmark) |
| 13.7.3 | Evaluate performance | [workflows/13-7-3-evaluate-performance.json](./workflows/13-7-3-evaluate-performance.json) | [skills/measure-and-benchmark](./skills/measure-and-benchmark) |
| 13.8.1 | Identify needs from stakeholders | [workflows/13-8-1-identify-needs-from-stakeholders.json](./workflows/13-8-1-identify-needs-from-stakeholders.json) | [skills/develop-manage-and-deliver-analytics](./skills/develop-manage-and-deliver-analytics) |
| 13.8.2 | Scope analytics project | [workflows/13-8-2-scope-analytics-project.json](./workflows/13-8-2-scope-analytics-project.json) | [skills/develop-manage-and-deliver-analytics](./skills/develop-manage-and-deliver-analytics) |
| 13.8.3 | Develop and manage hypotheses | [workflows/13-8-3-develop-and-manage-hypotheses.json](./workflows/13-8-3-develop-and-manage-hypotheses.json) | [skills/develop-manage-and-deliver-analytics](./skills/develop-manage-and-deliver-analytics) |
| 13.8.4 | Collect data | [workflows/13-8-4-collect-data.json](./workflows/13-8-4-collect-data.json) | [skills/develop-manage-and-deliver-analytics](./skills/develop-manage-and-deliver-analytics) |
| 13.8.5 | Prepare data | [workflows/13-8-5-prepare-data.json](./workflows/13-8-5-prepare-data.json) | [skills/develop-manage-and-deliver-analytics](./skills/develop-manage-and-deliver-analytics) |
| 13.8.6 | Analyze data | [workflows/13-8-6-analyze-data.json](./workflows/13-8-6-analyze-data.json) | [skills/develop-manage-and-deliver-analytics](./skills/develop-manage-and-deliver-analytics) |
| 13.8.7 | Create data models | [workflows/13-8-7-create-data-models.json](./workflows/13-8-7-create-data-models.json) | [skills/develop-manage-and-deliver-analytics](./skills/develop-manage-and-deliver-analytics) |
| 13.8.8 | Review data models with stakeholders | [workflows/13-8-8-review-data-models-with-stakeholders.json](./workflows/13-8-8-review-data-models-with-stakeholders.json) | [skills/develop-manage-and-deliver-analytics](./skills/develop-manage-and-deliver-analytics) |
| 13.8.9 | Refine data models | [workflows/13-8-9-refine-data-models.json](./workflows/13-8-9-refine-data-models.json) | [skills/develop-manage-and-deliver-analytics](./skills/develop-manage-and-deliver-analytics) |
| 13.8.10 | Report on analysis | [workflows/13-8-10-report-on-analysis.json](./workflows/13-8-10-report-on-analysis.json) | [skills/develop-manage-and-deliver-analytics](./skills/develop-manage-and-deliver-analytics) |
| 13.8.11 | Identify remedial actions | [workflows/13-8-11-identify-remedial-actions.json](./workflows/13-8-11-identify-remedial-actions.json) | [skills/develop-manage-and-deliver-analytics](./skills/develop-manage-and-deliver-analytics) |
| 13.9.1 | Determine environmental health and safety impacts | [workflows/13-9-1-determine-environmental-health-and-safety-impacts.json](./workflows/13-9-1-determine-environmental-health-and-safety-impacts.json) | [skills/manage-environmental-health-and-safety-ehs](./skills/manage-environmental-health-and-safety-ehs) |
| 13.9.2 | Develop EHS program | [workflows/13-9-2-develop-ehs-program.json](./workflows/13-9-2-develop-ehs-program.json) | [skills/manage-environmental-health-and-safety-ehs](./skills/manage-environmental-health-and-safety-ehs) |
| 13.9.3 | Monitor and manage EHS program | [workflows/13-9-3-monitor-and-manage-ehs-program.json](./workflows/13-9-3-monitor-and-manage-ehs-program.json) | [skills/manage-environmental-health-and-safety-ehs](./skills/manage-environmental-health-and-safety-ehs) |
| 13.10.1 | Develop sustainability capability | [workflows/13-10-1-develop-sustainability-capability.json](./workflows/13-10-1-develop-sustainability-capability.json) | [skills/manage-sustainability](./skills/manage-sustainability) |
| 13.10.2 | Manage sustainability capability | [workflows/13-10-2-manage-sustainability-capability.json](./workflows/13-10-2-manage-sustainability-capability.json) | [skills/manage-sustainability](./skills/manage-sustainability) |

## Time

Code here reads business time from the one clock, `packages/naive/src/core/clock.ts` (`now`, `nowMs`, `nowIso`), so `NAIVE_NOW` pins it for a simulation or a test, and reads `wallClock()` only for elapsed time, timeouts, lock staleness and unique names (EE-227). `node packages/naive/src/checks/check-clock.ts` fails on a direct read of the system clock.
