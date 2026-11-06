---
type: template
tags: [everything-ecosystem, validation, operations-readiness, template]
ai-model: claude-opus-5.5
created: 2026-10-27T20:40:44Z
source: hybrid
---

# Template: the operations-readiness record

Fills `<venture>/purpose/validation/operations-readiness.json`. One entry per MAD tier that the coming phase uses. The record grades as its **weakest** tier, so a strong product with weak operations shows up.

| Tier | Ready means | Evidence |
| --- | --- | --- |
| governance | Decision rights and roles cover the phase's decisions | `governance/decision-rights.json` checked; escalations answered |
| delivery | A delivery method is assigned and runs | MAD assignment; handoffs reach done with evidence |
| software-engineering | The software practices the product needs hold | Passing checks and tests in the product's repository |
| automation | What should run without a person does | Scheduled checks or agents running, with results |

Record `ready_on` when the tier first held. Time to ready per tier is read from these dates.
