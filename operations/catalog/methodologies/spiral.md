---
publish: false
type: catalog-methodology
id: spiral
name: "Spiral model"
domain: software
family: risk-driven
lifecycle: candidate
source-of-truth: "The risk analysis and prototype of the current cycle, together with the requirements and plan that the cycle review revises"
answers: {}
fits-when:
  - "Large, complex or high-risk systems where the main uncertainties (technical, cost, schedule) can be named and reduced step by step"
  - "Each cycle can end with a review that decides whether to continue, change course or stop (high cost of being wrong, spending staged)"
  - "Prototypes or experiments can retire a risk before the next commitment is made"
unfit-when:
  - "Small, low-risk work where the risk analysis costs more than it saves"
  - "Nobody on the team can do the risk analysis well: the process depends on that skill"
  - "Fixed-price or fixed-scope arrangements that cannot allow repeated re-planning after each cycle"
switch-when:
  - "The main risks have been retired and the remaining work is well understood: finish with a sequential or iterative build"
  - "Cycles are turning into routine delivery with no real risk decisions: switch to an agile method"
artifact-types: []
bodies-of-knowledge: ["Boehm, B. W., A Spiral Model of Software Development and Enhancement, ACM SIGSOFT Software Engineering Notes 11(4), 1986"]
evidence: []
last-checked: 2026-10-18
source: hybrid
created: 2026-10-18
ai-model: grok-bot
tags: [catalog, methodology, risk-driven, candidate]
---

# Spiral model

Development proceeds in repeated cycles. Each cycle sets objectives, identifies and analyses the biggest risks, builds a prototype or other evidence to reduce them, then plans the next cycle and reviews whether to go on. The level of risk drives how much specification, prototyping and testing each cycle does, so the effort goes where the uncertainty is.

It is aimed at large, complex or high-risk work where an up-front sequential plan would be a guess, but where a commitment can still be staged and reviewed.

Status: candidate. This entry is written from secondary summaries. The primary sources listed in `bodies-of-knowledge` have not yet been read, and the `fits-when` and `unfit-when` lines are working judgments that no recorded system has tested (no answers are recorded).
