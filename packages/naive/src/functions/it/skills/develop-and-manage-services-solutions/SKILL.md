---
type: knowledge
tags: [naive, skills, it, apqc-8-5]
ai-model: claude-opus-5-5
created: 2026-11-27T03:45:06Z
source: hybrid
name: develop-and-manage-services-solutions
process_group: "8.5"
description: >
  Decide build, buy or connect for each capability the venture needs, write the
  standards and the architecture its own code follows, and run the build and the
  fixes so that each one is tested against the requirement it was asked for. Load
  it for the five workflows of APQC process group 8.5 and when the founder asks
  "should we build this or buy it", "what are we depending on", "how is this put
  together" or "is this fix safe to ship".
---

# develop-and-manage-services-solutions

You decide nothing that costs money, accepts terms or commits the venture to a dependency; you produce the options, the evidence and the recommendation, and you do the building, the testing and the recording. The founder chooses build, buy or connect, accepts a licence, and approves the spend.

Three rules hold across all five processes. A requirement that cannot be checked is not a requirement, so restate it until it can be or ask the founder. Nothing is called working until a check was run and its output recorded. Every departure from the venture's own standards is written down as an exception with an end date, never left unsaid.

## The processes

### 8.5.1 Develop service/solution and integration strategy

Runs `workflows/8-5-1-develop-service-solution-and-integration-strategy.json`.

Do it in this order: list the capabilities the product needs, answer build, buy or connect for each, write the standards the venture's own code follows, then write the test a component must pass before the venture depends on it. Build only what is the venture's own advantage; connect the rest. Good evidence for a build answer is a cost to run and a cost to maintain, not an opinion about elegance. Score candidate tools with the `tool-selection` skill, which favours the option that leaves the venture holding the record of its own work.

The trap is to adopt a component because it is popular and discover its licence or its single maintainer afterwards. Record the licence and the last release date before the choice, not after.

The founder decides every answer that spends money, accepts a vendor's terms or takes on a dependency. The component list and the exception rule are yours to keep.

### 8.5.2 Manage service/solution lifecycle planning

Runs `workflows/8-5-2-manage-service-solution-lifecycle-planning.json`.

List what the venture actually runs, including the scripts a founder runs by hand, then give each one a stage and a next step. Watch only the changes in the venture's own tools and providers that would let it drop a component, cut a cost or do something new; everything else is noise. The valuable half of this process is the end: every solution should have a named successor or a retirement plan before it is needed.

A retirement plan goes to the founder as an `irreversible-data-change` decision, because turning a system off and dropping its data cannot be undone, and as `cancel-or-downgrade` where it ends a paid plan.

### 8.5.3 Develop and manage service/solution architecture

Runs `workflows/8-5-3-develop-and-manage-service-solution-architecture.json`.

Write the constraints before the design: what the stack and the host force, then what the budget, the date and the venture's commitments force. Then describe the parts, their boundaries, what each one owns and every exchange between them, saying for each exchange which side is authoritative and what happens on failure. Record the alternatives rejected and why, so the next reader does not reopen a settled question.

The conformance step is what makes the architecture worth keeping: read the code and the running systems and list every place the built thing departs from the written one. A departure the venture will not fix now becomes an exception with an end date; one that puts customer data, money or a commitment at risk is `security-loosening` and goes to the founder.

### 8.5.4 Execute IT service/solution creation and testing

Runs `workflows/8-5-4-execute-it-service-solution-creation-and-testing.json`.

One step covers the whole lifecycle because APQC puts it in one activity, and its level 5 tasks give the order: validate the requirements, design, build and unit-test the components, integrate, validate the whole, package, and record exceptions. Keep that order. Ask the founder where a requirement is ambiguous rather than choosing an interpretation. The package is not finished until it carries its configuration and a way back to the previous version. Put the test output on `operations/handoff/[id]`; a claim that tests pass without the output is not evidence.

### 8.5.5 Perform service/solution maintenance and testing

Runs `workflows/8-5-5-perform-service-solution-maintenance-and-testing.json`.

Read the bug and the support cases behind it first, and say what the fix is worth against what it risks before touching anything. Write the test that fails before the fix and passes after it: that pair is the evidence, and a fix with no failing test first is a guess. Change the design only as far as the fix needs, and keep the solution running while the fix is prepared. Package the fixed version with a way back, as in 8.5.4.

## Records

The workflows read `product`, `product/capabilities`, `product/bugs`, `support/cases`, `foundation/requirements`, `foundation/constraints`, `it/connections`, `finance/spend`, `finance/budget`, `purpose/competitor`, `system/naive-config` and `operations/handoff`.

They write `it/connections/[id]` for each development tool, hosted service or system the venture adopts, with its scopes and what it is authoritative for; `operations/handoff/[id]` for the capability answers, the standards, the component list, the architecture, the exceptions and the test output; and `decisions/[id]` for every build, buy or connect answer, every licence to accept, every spend and every retirement.

There is no record type for an architecture description, an architecture decision record, a dependency inventory or a standards exception: those are not built, so they are carried on the handoff as evidence and settled in the decision the founder reads.

## Standards

- ISO/IEC/IEEE 42010 is the reference for an architecture description: stakeholders, concerns, viewpoints and views, and the rule that every architectural decision records the concern it answers.
- ISO/IEC/IEEE 12207 names the software life cycle processes this group performs, and is why requirements validation, design, construction, integration, verification and packaging are kept as separate pieces of work even inside one activity.
- ISO/IEC 25010 gives the product quality characteristics to write non-functional requirements against, including performance efficiency, reliability, security and maintainability.
- An architecture decision record, one short file per decision with its context, the choice and its consequences, is the usual way to keep the rejected alternatives; Naive has no route for one, so it goes on the handoff.

## What the person decides

- Build, buy or connect for each capability, and anything that spends money.
- Whether to accept a component's or a vendor's licence and terms.
- The meaning of an ambiguous requirement.
- Whether to keep an exception to the standards or the architecture, and for how long.
- Whether to retire a solution and what happens to the data it holds.
