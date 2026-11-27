---
type: knowledge
tags: [naive, skills, human-capital, apqc-7-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:15Z
source: hybrid
name: develop-and-manage-human-resources-hr-planning
description: >
  Plan who does the venture's work, agent or person, and write the policies,
  measures and competency list that follow from it. Load it for the four
  workflows of APQC process group 7.1, and whenever the founder asks "do we need
  to hire", "what would this role cost", "what policies do we actually need yet"
  or "what are we missing the skill to do".
process_group: "7.1"
---

# develop-and-manage-human-resources-hr-planning

You read the venture's goals, its activity assignments and its money, and you write what the work needs: which roles exist, what each would cost, which competencies nobody holds, and what a policy would say. The founder decides every one of them, because each opens a role, commits money, binds the venture or changes `people/team-plan`, which no agent writes.

A workflow step marked `consider` is optional. Run it when its condition holds or the founder asks, and otherwise say that you considered it and why you did not run it.

## The processes

### 7.1.1 Develop human resources strategy

Runs `workflows/7-1-1-develop-human-resources-strategy.json`. Work from the goals backwards, never from a list of HR practices forwards: read `foundation/goals` and `foundation/telos`, then `operations/activity-assignments`, and name the work that has nobody. For each gap, say whether an agent or a person is needed and cite the capability register entry (`packages/naive/src/functions/human-capital/capabilities/agent-capabilities.json`) with the date it was written. Good evidence here is a gap tied to a named goal with a cost; the trap is a strategy that lists employer branding, an employee experience and a systems plan for a venture with two founders and no open role, which is why those steps are ones to consider. Communicating the strategy, the employer brand and anything published go to the founder, because they are the venture's word about itself.

### 7.1.2 Develop and implement workforce planning, policies, and strategies

Runs `workflows/7-1-2-develop-and-implement-workforce-planning-policies.json`. Project the work quarter by quarter against the goals, then say what will do it; write the result as a proposed change to `people/team-plan`, never as a write. Draft only the policies the venture needs now, one page each, and leave the rest until something makes them necessary. Good evidence for a pay range is a public comparable range with the date it was read; the trap is a range taken from an unsourced survey or from what the founder hopes to pay. Pay, equity, benefits, every policy and the choice of workforce shape are the founder's, because each commits money, ownership or the venture's word.

### 7.1.3 Monitor and update HR strategies, plans, and policies

Runs `workflows/7-1-3-monitor-and-update-hr-strategies-plans-and.json`. Read the measures the strategy set, report each with the record and period it came from, and say plainly which ones the records cannot yet produce rather than estimating them. Then say, goal by goal, what the people work actually changed, and where it changed nothing. Good evidence is arithmetic a reader can repeat; the trap is reporting activity, how many policies were written, instead of the measure. Any revision of the plan, the policies or the measures is a decision for the founder, and any update that leaves the venture is sent by the founder.

### 7.1.4 Develop competency management models

Runs `workflows/7-1-4-develop-competency-management-models.json`. Start from the work the venture performs, in `operations/activity-assignments` and `capabilities/processes`, and name the competency each piece takes in the venture's own words from `glossary`. Two levels are enough for a small venture: enough to do it alone, enough to do it under review. Good evidence is a competency mapped to a holder with the capability register entry and its date; the trap is a long framework of competencies nobody is judged against, which costs hours and changes nothing. The person decides what to do about each competency nothing holds: learn it, hire it, contract it or drop the work.

## Records

The workflows read `foundation/goals`, `foundation/telos`, `foundation/constraints`, `people`, `people/founders`, `people/team-plan`, `operations/activity-assignments`, `operations/element-owners`, `operations/activity-summary`, `governance/delegation`, `governance/decision-rights`, `capabilities/processes`, `glossary`, `finance/budget`, `finance/spend`, `purpose/money/summary`, `legal/obligations` and `decisions`.

They write `people`, `people/founders/[id]`, `decisions/[id]` and the handoff they run under. `people/team-plan` is read only: only a person writes it, because it sets every agent's reach.

The venture's HR strategy, its policies, its job descriptions and its competency list have no record route of their own: not built. Each one lives on the handoff as evidence and in the decision that adopts it until Naive has a route for it.

## Standards

- ISO 30409:2016, *Human resource management: Workforce planning*, for the shape of a workforce plan.
- ISO 30408:2016, *Human resource management: Guidelines on human governance*, for who decides what about people.
- The United States Internal Revenue Service common-law rules on worker classification, read as behavioural control, financial control and the type of relationship, when a contractor's engagement starts to look like employment. This is not legal advice, and the question goes to the founder and counsel.

## What the person decides

- Whether to open a person role at all, and which one first.
- Every pay range, equity grant, benefit and tool purchase.
- Every policy the venture adopts, and when it changes.
- The measures the venture judges its people work by, since they sit in the telos.
- What the venture says about itself to anyone deciding whether to work on it.
- What to do about each competency nobody holds.
