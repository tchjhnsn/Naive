---
publish: false
type: catalog-methodology
id: scrum
name: "Scrum"
domain: software
family: agile
lifecycle: candidate
source-of-truth: "The product backlog, ordered by the product owner, and the working increment produced by each sprint"
answers: {}
fits-when:
  - "Requirements evolve with user feedback and are expected to change (low requirements stability, change driven by learning)"
  - "Work can be cut into fixed-length sprints that each produce something a user can see or use"
  - "The team can fill the roles: a product owner who decides priority, a Scrum Master who guards the process, and developers who build"
  - "Early user feedback and incremental shipping matter (high time-to-market pressure)"
unfit-when:
  - "Work arrives as a continuous stream of unplanned requests that cannot wait for a sprint boundary: use a flow method"
  - "Nobody can act as product owner and decide priority"
  - "Scope and price are fixed by contract with no room to reorder the backlog"
switch-when:
  - "Sprints keep being broken by urgent unplanned work: move to a flow-based board such as Kanban"
  - "Delivery has become routine and the sprint events add no learning: consider Kanban for the maintenance phase"
artifact-types: []
bodies-of-knowledge: ["Schwaber, K. and Sutherland, J., The Scrum Guide (current edition 2020)"]
evidence: []
last-checked: 2026-10-18
source: hybrid
created: 2026-10-18
ai-model: grok-bot
tags: [catalog, methodology, agile, candidate]
---

# Scrum

A framework for delivering a product in fixed-length sprints. A product owner keeps an ordered product backlog; the team picks work for the sprint, builds a usable increment, and the sprint ends with a review with stakeholders and a retrospective on how the team worked. Roles, events and artifacts are defined, which gives structure but also means it is adopted as a whole rather than picked apart.

The source of truth is the backlog for what is next and the increment for what exists. Feedback from each increment is meant to change the backlog.

Related: [[kanban]] drops the fixed sprint and manages flow instead.

Status: candidate. This entry is written from secondary summaries. The primary sources listed in `bodies-of-knowledge` have not yet been read, and the `fits-when` and `unfit-when` lines are working judgments that no recorded system has tested (no answers are recorded).
