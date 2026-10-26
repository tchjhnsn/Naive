---
publish: true
type: catalog-methodology
id: v-model
name: "V-model"
domain: software
family: verification-paired
lifecycle: candidate
source-of-truth: "The requirements and design specification at each level, each paired with the test specification that verifies it; a level is done when its paired tests pass"
answers: {}
fits-when:
  - "High-stakes systems where failure is costly or unsafe (high cost of being wrong, strong accountability to a regulator or auditor)"
  - "Requirements are stable enough to write a test specification for each level before building (unit, integration, system, acceptance)"
  - "A verification phase can be planned in parallel with each design stage, so every specification has a test that checks it"
unfit-when:
  - "Requirements are expected to change often, or will be discovered by building"
  - "Early shipping and user feedback matter more than traceability (strong time-to-market pressure)"
  - "No test specification can be written before the thing exists, as in exploratory or research-heavy work"
switch-when:
  - "Requirements begin to churn after the specifications are signed off: keep the paired verification for the stable core and run the changing parts iteratively"
  - "The test specifications are being written after the fact just to fill the matrix: the pairing has lost its purpose, reconsider the method"
artifact-types: [verification-matrix]
bodies-of-knowledge: []
evidence: []
last-checked: 2026-10-18
source: hybrid
created: 2026-10-10
ai-model: grok-bot
tags: [catalog, methodology, verification-paired, candidate]
---

# V-model

A sequential process bent into a V. The left side goes down through requirements, system design and detailed design to the build; the right side goes back up through unit, integration, system and acceptance testing. Each level on the left is paired with the test level on the right that verifies it, and the test specification is planned at the same time as the design, not after the build.

It suits systems where being wrong is costly and the intent is stable enough to specify up front. Like [[waterfall]] it is slow to absorb late change.

No primary source is cited yet: none was identified that could be cited with certainty, so `bodies-of-knowledge` is left empty rather than guessed.

Status: candidate. This entry is written from secondary summaries. The primary sources listed in `bodies-of-knowledge` have not yet been read, and the `fits-when` and `unfit-when` lines are working judgments that no recorded system has tested (no answers are recorded).
