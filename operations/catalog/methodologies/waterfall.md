---
publish: false
type: catalog-methodology
id: waterfall
name: "Waterfall"
domain: software
family: sequential
lifecycle: candidate
source-of-truth: "The signed-off document of each phase (requirements, then design, then the build and its verification); each phase document is the input to the next"
answers: {}
fits-when:
  - "Requirements are fixed and well understood before building starts (high knowability, low expected change)"
  - "Scope drift must be zero: a contract, tender or regulator fixes what is built, and any change goes through formal change control"
  - "Each phase can be reviewed and signed off on its own document before the next phase begins"
unfit-when:
  - "Requirements are expected to change, or will only be discovered by building something and showing it to users"
  - "Early user feedback or a fast first release matters more than a complete first release (strong time-to-market pressure)"
  - "Late changes are likely: the process is slow and inflexible once a phase has been signed off"
  - "A small, low-risk change that fits in one short piece of work: phase-by-phase sign-off costs more than the change"
switch-when:
  - "Requirements start to move after design sign-off: move the unstable parts to an iterative or agile process"
  - "Phase reviews keep finding that earlier documents were wrong: add prototypes or risk analysis earlier, as in the spiral model"
artifact-types: [spec-document]
bodies-of-knowledge: ["Royce, W. W., Managing the Development of Large Software Systems, Proceedings of IEEE WESCON, 1970", "Boehm, B. and Turner, R., Balancing Agility and Discipline: A Guide for the Perplexed, Addison-Wesley, 2003 (home grounds: size and criticality)"]
evidence: []
last-checked: 2026-10-27
source: hybrid
created: 2026-10-18
ai-model: grok-bot
tags: [catalog, methodology, sequential, candidate]
---

# Waterfall

Work moves through fixed phases in order: requirements, design, implementation, verification, then maintenance. Each phase is finished and signed off before the next one starts, so the documents of one phase are the inputs of the next. The strength is predictability and a clear audit trail; the cost is that a mistake found late is expensive to fix and change is slow.

Royce's 1970 paper is commonly cited as the origin of the sequential diagram. It is often reported that the paper itself treats the pure one-pass form as risky; that has not been checked against the primary source here.

Related: [[v-model]] keeps the sequential shape and pairs each phase with its own verification.

Status: candidate. This entry is written from secondary summaries. The primary sources listed in `bodies-of-knowledge` have not yet been read, and the `fits-when` and `unfit-when` lines are working judgments that no recorded system has tested (no answers are recorded).

Proportion (added 2026-10-27, after Jev ranked this method first for a one-flag CLI change): Boehm and Turner place plan-driven methods in a home ground of large, critical systems; for small, low-criticality work their overhead outweighs what they prevent.
