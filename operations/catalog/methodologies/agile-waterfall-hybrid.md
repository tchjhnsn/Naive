---
publish: false
type: catalog-methodology
id: agile-waterfall-hybrid
name: "Agile-waterfall hybrid"
domain: software
family: collaborative-hybrid
lifecycle: candidate
source-of-truth: "A fixed high-level plan of milestones, scope envelope and budget, with each team backlog and its working increments inside that plan"
answers: {}
fits-when:
  - "A budget, date or milestone plan is fixed by a contract, funder or regulator, but the feature list inside it will change"
  - "Parts of the system need sequential phases and sign-offs (hardware, compliance, procurement) while others can be built iteratively"
  - "The organisation reports against milestones, yet the teams can work in short cycles"
unfit-when:
  - "Neither the milestones nor the feature list is fixed: use an agile method outright"
  - "The plan allows no change at all: a sequential method is the honest choice"
  - "Nobody owns the boundary between the milestone plan and the teams, so milestones and sprints contradict each other"
  - "A single small change with no milestone plan around it: use small change"
switch-when:
  - "The milestone plan is rewritten every cycle: drop the fixed plan and run an agile method"
  - "The iterations inside the plan never change anything: run it as a sequential process"
artifact-types: []
bodies-of-knowledge: ["Boehm, B. and Turner, R., Balancing Agility and Discipline: A Guide for the Perplexed, Addison-Wesley, 2003 (home grounds: size and criticality)"]
evidence: []
last-checked: 2026-10-27
source: hybrid
created: 2026-10-18
ai-model: grok-bot
tags: [catalog, methodology, collaborative-hybrid, candidate]
---

# Agile-waterfall hybrid

High-level sequential milestones, with agile execution by the teams inside them. It is the common compromise when the budget and dates are fixed from outside but the list of features is expected to change. The two layers need an explicit rule for what may change inside a milestone and what needs the milestone plan to be reopened.

This is a pattern rather than a single published method, so no primary source is cited and `bodies-of-knowledge` is left empty. Related: [[waterfall]], [[scrum]].

Status: candidate. This entry is written from secondary summaries. The primary sources listed in `bodies-of-knowledge` have not yet been read, and the `fits-when` and `unfit-when` lines are working judgments that no recorded system has tested (no answers are recorded).

Proportion (added 2026-10-27, after Jev ranked this method first for a one-flag CLI change): Boehm and Turner place plan-driven methods in a home ground of large, critical systems; for small, low-criticality work their overhead outweighs what they prevent.
