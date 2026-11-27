---
type: knowledge
tags: [naive, skills, it, apqc-8-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:43:41Z
source: hybrid
name: develop-and-manage-it-business-strategy
process_group: "8.2"
description: >
  How the IT agent works out what the venture should build on, what it should
  rent, what it should drop, and how that is governed and measured: technology
  intelligence, the IT portfolio, architecture principles, the few service
  management practices worth keeping, the measures and control points, the value
  each system actually returns, and time-boxed tests of new technology. Load it
  in the 8.2 workflows and when the founder asks "should we adopt this",
  "what are we spending IT money on", "is this tool paying for itself" or
  "what should our architecture rules be".
---

# develop-and-manage-it-business-strategy

You gather the evidence, score the options on written criteria and show the arithmetic. The founder states the principles, sets the order and spends the money. The thing that makes this group useful in a small venture is not a strategy document: it is that every technology choice can be traced to a live goal, every paid system to a number, and every adopted technology to a test that could have failed.

The processes build on each other. Intelligence and principles come first (8.2.1), then architecture rules that settle recurring questions (8.2.3), then the portfolio those rules filter (8.2.2), the practices that run the work (8.2.4), the measures and control points that catch mistakes (8.2.5), the value review that closes the loop (8.2.6), and innovation tests feeding new candidates back in (8.2.7).

## The processes

### 8.2.1 Define business technology and governance strategy

Runs `workflows/8-2-1-define-business-technology-and-governance-strategy.json`.

Intelligence here means the venture's own dependencies, not the industry at large: the runtimes, languages and services it already runs on, watched for release and deprecation notices, licence changes, pricing changes and ownership changes. Cite the page and the date for each. Mark each dependency adopt, hold, watch or leave, and keep anything unproven out of adopt, because the point of the four labels is that most things are not adopt.

Alignment is the cheap, high-value part: for each live goal, name the technology choice it depends on and say whether the present stack serves it, works against it, or is irrelevant. A choice that serves no goal is then visible.

The person's part: step `articulate-it-alignment-principles` is the founder's. A principle is a value. You offer three to six candidates with what each one would forbid, which is the only way to tell whether a founder means it.

### 8.2.2 Manage IT portfolio strategy

Runs `workflows/8-2-2-manage-it-portfolio-strategy.json`.

Write the value criteria before you score anything, and check each criterion against a live goal's measure, dropping any criterion no goal measures. Then split spend into keeping the lights on, removing risk and building something new, which is the one portfolio view a small venture can actually act on. Score with the number and the record it came from, and mark a guess a guess.

The trap is a ranked list with no displacement: a project that fits only because nothing was dropped is not prioritised. The decision the founder makes must also say what the venture will not do.

The person's part: step `prioritize-it-projects` is the founder's, and so is every spend, cancellation, widening and set of terms.

### 8.2.3 Define and maintain enterprise architecture

Runs `workflows/8-2-3-define-and-maintain-enterprise-architecture.json`.

The value of a principle is what it forbids, so draft each candidate with its prohibition: one system of record per fact, a record the venture can export, no system it cannot leave. Then write how an exception is asked for and approved, taking the approver from `governance/decision-rights` rather than naming one yourself, and give every exception an expiry. One system of record per fact is the rule that pays for itself fastest: it is checked against the venture's source map, and a fact with two authorities is a defect, not a preference.

The person's part: step `create-and-publish-enterprise-architecture-principles` is the founder's, for the same reason as 8.2.1.5.

### 8.2.4 Define IT service management strategy

Runs `workflows/8-2-4-define-it-service-management-strategy.json`.

Adopt almost nothing. ITIL 4 has dozens of practices; a solo founder can run three well: service request management, change enablement and incident management. Write the smallest version of each, say plainly which practices the venture is not adopting, and then put each kept practice into records the venture already has, naming the workflow step that performs it. A practice with no step that performs it is a wish.

The trap is buying a service desk. The step that considers tools is one to consider for exactly that reason, and it runs `naive tools recommend` first so the activities a candidate would leave unrecorded are named before anyone pays.

The person's part: the founder approves any tool, plan or terms.

### 8.2.5 Control IT management system

Runs `workflows/8-2-5-control-it-management-system.json`.

Keep four or five measures, each with a named source and a cadence, and drop any measure with no source rather than estimating it. Control points are the other half: write where an IT mistake would be caught before it does harm, and name the moves that have no control point at all. Then report performance, spend against budget and value against what was promised, with every number traced to a record, and mark a saving nobody can measure as unmeasured, never as zero and never as achieved.

Interdependencies are worth one line each: the single system, credential or person that sits in the path of more than one thing is where a small venture actually breaks.

The person's part: step `select-deploy-and-operate-it-performance-analytics-tools` is the founder's, because a tool that holds the venture's data is a commitment; it is also one to consider, because reading four measures by hand is cheaper until the venture has several systems.

### 8.2.6 Manage IT value portfolio

Runs `workflows/8-2-6-manage-it-value-portfolio.json`.

Judge each system and finished project against the criteria its own approving decision named, not against criteria invented afterwards. Put a number on it: hours and money saved a month against what it costs a month in `finance/spend`, with the arithmetic shown. Three verdicts are honest here, pass, short and unmeasured, and the third is common and must not be dressed as either of the others.

The person's part: cancelling, downgrading, replacing and deleting a system's data.

### 8.2.7 Define and manage technology innovation

Runs `workflows/8-2-7-define-and-manage-technology-innovation.json`.

Write the question, the time box and the pass line before the test runs, and run it on sample data only, never on the venture's live records or a customer's. Judge against the line you wrote, and report inconclusive when that is what happened. Record failures with their reason, so the same candidate is not tried again blindly in six months.

The trap is adopting on impression after a pleasant afternoon with a new tool. The written pass line exists to make that impossible.

The person's part: adoption. A free open-licence tool is a recommendation to the product lead; anything that costs money, accepts terms or widens access is the founder's.

## Records

The workflows read `venture`, `foundation/telos`, `foundation/goals`, `foundation/constraints`, `foundation/bets`, `it/connections`, `finance/spend`, `finance/budget`, `markets`, `industries`, `capabilities/processes`, `operations/handoff`, `operations/activity-assignments`, `support/policy`, `knowledge/knowledge-sources`, `knowledge/where-used`, `governance/decision-rights`, `governance/detector`, `system/provenance`, `evidence` and `decisions`.

They write only `it/connections/[id]` and `decisions/[id]`. The strategy page, the portfolio scores, the catalog of services, the practice definitions, the measures report and each test result go on `operations/handoff/[id]` as evidence.

Not built: Naive has no record type for an IT strategy, an architecture principle, an architecture exception, an IT project in a portfolio, or an IT measure and its reading. Principles and exceptions are recorded as decisions; projects and measures live on the handoff. Do not invent a route for them.

Two files in this module are read, never written, and they rank candidates without deciding: `language-rubric.json` scores which programming language fits a system, and `visibility-rubric.json` scores how far a tool records the activity and how far the venture owns the record. `node packages/naive/src/checks/check-connections.ts` checks a venture's connections and the cluster catalog.

## Standards

- APQC Process Classification Framework 8.0, category 8.0 Manage Information Technology (IT), process group 8.2, which gives the processes and activities their names.
- ITIL 4, for the service management practices in 8.2.4: adopt the few the venture can run, and name the rest as not adopted.
- ISO/IEC 27001 and the NIST Cybersecurity Framework, named only as the two frameworks a venture might choose to map its controls to; the choice belongs to the resilience and risk group, not here.

## What the person decides

- The venture's IT alignment principles (8.2.1.5) and its architecture principles (8.2.3.1).
- The order of IT projects, and what the venture will not do (8.2.2.4).
- Any analytics or service management tool, and whether a measure is worth a tool at all (8.2.5.9).
- Every adoption that costs money, accepts terms or widens access, and every cancellation, downgrade or deletion of a system's data.
