---
publish: false
type: catalog-methodology
id: rapid-application-development
name: "Rapid application development (RAD)"
domain: software
family: agile
lifecycle: candidate
source-of-truth: "The working prototype, refined with users in short cycles"
answers: {}
fits-when:
  - "Time to a usable release is the main constraint (strong time-to-market pressure)"
  - "Users can take part throughout and judge each prototype (active user involvement)"
  - "Little up-front planning is acceptable because the requirements are only partly known and will be shaped by the prototype"
  - "The system is small or modular enough to build within a short timebox"
unfit-when:
  - "Users cannot be available during development"
  - "The system is large, safety-critical or needs heavy documentation and formal verification (high cost of being wrong)"
  - "A prototype could be mistaken for the finished system and carry weak structure into a long-lived product (long lifespan)"
switch-when:
  - "The prototype is accepted and the system must live long: harden the design, tests and structure before scaling it"
  - "The users disagree about what the prototype should do: step back and settle the requirements before another cycle"
artifact-types: []
bodies-of-knowledge: ["Martin, J., Rapid Application Development, Macmillan, 1991"]
evidence: []
last-checked: 2026-10-18
source: hybrid
created: 2026-10-18
ai-model: grok-bot
tags: [catalog, methodology, agile, candidate]
---

# Rapid application development (RAD)

A way of building where minimal up-front planning is traded for fast prototyping. Users are involved continuously, prototypes are built and reviewed in short timeboxes, and the working system emerges from the revisions. It is chosen when speed matters and the exact requirements cannot be written in advance.

The risk is that the prototype quietly becomes the product. See [[spike-prototype]] for throwaway prototyping that is meant to be discarded.

Status: candidate. This entry is written from secondary summaries. The primary sources listed in `bodies-of-knowledge` have not yet been read, and the `fits-when` and `unfit-when` lines are working judgments that no recorded system has tested (no answers are recorded).
