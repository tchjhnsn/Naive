---
publish: false
type: catalog-methodology
id: devops
name: "DevOps"
domain: software
family: collaborative-hybrid
lifecycle: candidate
source-of-truth: "The automated delivery pipeline and the monitoring of the running system, with infrastructure and configuration kept as code"
answers: {}
fits-when:
  - "The system is delivered continuously and the team that builds it also runs it (the builder owns operations)"
  - "Frequent, small, reversible releases are wanted and supported by automated build, test and deploy (CI/CD)"
  - "Production behaviour can be monitored so that failures and slowdowns show up quickly"
unfit-when:
  - "Releases are rare and large by contract or regulation, with no automation in place or planned"
  - "Development and operations are separate organisations with no shared ownership, so there is nothing to bridge"
  - "It is treated as a replacement for a development method: DevOps governs delivery and operation, not how requirements are found or specified"
switch-when:
  - "Requirements still churn and no method guides them: pair the pipeline with an iterative method such as Scrum or Kanban"
  - "Nobody is accountable for production: establish operations ownership before investing in pipelines"
artifact-types: []
bodies-of-knowledge: ["Forsgren, N., Humble, J. and Kim, G., Accelerate: The Science of Lean Software and DevOps, IT Revolution, 2018", "DORA, State of DevOps research reports"]
evidence: []
last-checked: 2026-10-18
source: hybrid
created: 2026-10-18
ai-model: grok-bot
tags: [catalog, methodology, collaborative-hybrid, candidate]
---

# DevOps

A set of practices and a culture that bridge development and operations: continuous integration and delivery (CI/CD), infrastructure and configuration as code, and monitoring of the running system feeding back to the builders. It is not a standalone lifecycle, so it is meant to be used alongside a method that decides what to build, such as [[scrum]] or [[kanban]].

The research programme behind the term reports delivery-performance measures (such as how often changes ship and how quickly failures are recovered); those measures have not been reviewed from the primary reports here.

Status: candidate. This entry is written from secondary summaries. The primary sources listed in `bodies-of-knowledge` have not yet been read, and the `fits-when` and `unfit-when` lines are working judgments that no recorded system has tested (no answers are recorded).
