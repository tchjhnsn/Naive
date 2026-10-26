---
publish: false
type: catalog-methodology
id: kanban
name: "Kanban"
domain: software
family: agile
lifecycle: candidate
source-of-truth: "The visible board: each work item, its stage, and the explicit policies and work-in-progress limits that govern the flow"
answers: {}
fits-when:
  - "Work arrives continuously and unpredictably, as in operations, support, maintenance and small changes"
  - "Priorities change often and fixed-length iterations would only add waiting"
  - "Making the flow visible and limiting work in progress is the improvement the team needs"
unfit-when:
  - "A fixed commitment to a date or a scope is the main need and there is no incoming-flow problem to manage"
  - "Nobody will keep the board and the limits honest: without work-in-progress limits it is only a task list"
  - "The work is a one-off large build that needs a defined start-to-finish plan"
switch-when:
  - "The work becomes a planned product build with learning loops: consider Scrum"
  - "Work keeps queueing at the same step: change the limits or the policy, and if that fails, change the process around that step"
artifact-types: []
bodies-of-knowledge: ["Anderson, D. J., Kanban: Successful Evolutionary Change for Your Technology Business, Blue Hole Press, 2010"]
evidence: []
last-checked: 2026-10-18
source: hybrid
created: 2026-10-18
ai-model: grok-bot
tags: [catalog, methodology, agile, candidate]
---

# Kanban

Work is shown on a visual board, with columns for the stages it passes through. Limits on work in progress force the team to finish before starting, so bottlenecks show up as queues. The team improves the flow step by step by changing the policies and limits, rather than adopting a new process all at once.

There are no fixed iterations or roles, which makes it a natural fit for continuous work such as support, operations and maintenance. See [[small-change]] for the lightweight route to a single change.

Status: candidate. This entry is written from secondary summaries. The primary sources listed in `bodies-of-knowledge` have not yet been read, and the `fits-when` and `unfit-when` lines are working judgments that no recorded system has tested (no answers are recorded).
