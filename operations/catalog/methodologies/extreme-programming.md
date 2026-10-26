---
publish: false
type: catalog-methodology
id: extreme-programming
name: "Extreme Programming (XP)"
domain: software
family: agile
lifecycle: candidate
source-of-truth: "The automated tests and the running code, with the current user stories as the plan"
answers: {}
fits-when:
  - "High reliability is needed and behaviour can be stated as automated tests (high verifiability)"
  - "Small, frequent releases are possible and wanted (strong time-to-market pressure)"
  - "The builders can pair, integrate continuously and keep a customer or a close proxy within reach"
unfit-when:
  - "The team cannot adopt the core practices of pairing, tests first and continuous integration"
  - "Behaviour cannot be checked by automated tests, as in visual or exploratory work"
  - "A fixed up-front specification with sign-off is contractually required"
switch-when:
  - "The product shape is still being found: run a prototype or spike first, then return to XP practices once the direction is clear"
  - "Releases cannot be made small because of outside constraints: keep the engineering practices but plan around the release limit"
artifact-types: [test-suite]
bodies-of-knowledge: ["Beck, K., Extreme Programming Explained: Embrace Change, 1999 (2nd edition with Andres, 2004)"]
evidence: []
last-checked: 2026-10-18
source: hybrid
created: 2026-10-18
ai-model: grok-bot
tags: [catalog, methodology, agile, candidate]
---

# Extreme Programming (XP)

An agile method centred on engineering practice: pair programming, test-driven development, continuous integration, refactoring, simple design, a close customer and frequent small releases. The practices are meant to support one another, so the code stays easy to change and the tests give confidence to change it.

Test-driven development is one of its practices; see [[tdd]] for it on its own.

Status: candidate. This entry is written from secondary summaries. The primary sources listed in `bodies-of-knowledge` have not yet been read, and the `fits-when` and `unfit-when` lines are working judgments that no recorded system has tested (no answers are recorded).
