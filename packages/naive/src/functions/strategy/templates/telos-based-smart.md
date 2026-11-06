---
type: template
tags: [everything-ecosystem, purpose, telos, template, based, smart]
ai-model: claude-opus-5.5
created: 2026-10-27T20:47:00Z
source: hybrid
---

# Template: telos, BASED then SMART

Fills `<venture>/purpose/telos.json` (EE-023), the default telos template. It writes in two passes. **BASED** states the ambition without hedging: the end as the owner truly means it. **SMART** then scopes it: measures and exit criteria that are specific, measurable, achievable, relevant and time-bound. BASED is the owner's ambition practice from earlier venture work; its letters are still to be written down here.

## Pass 1: BASED (the ambition, uncensored)

Write it the way you would say it if no one could object.

- **Statement:** what the venture is for when it has done its job, in one sentence.
- **End state:** what is true in the world then. Concrete enough that two people would agree whether it is true.
- **Owner outcome:** what the owners intend then: hold, acquisition, IPO, secondary sale, merger, management buyout or wind-down, and why.

## Pass 2: SMART (the scope)

Turn the ambition into numbers the framework can check.

| Measure id | Kind | Statement | Target (number and date) | Primary? |
| --- | --- | --- | --- | --- |
| | revenue, usage_or_adoption, cost_or_time_saved, compliance_met, learning, flow_and_lead_time, impact | | | exactly one |

Then, for the current phase and the next, the exit criteria, each serving one or more measures:

| Phase | Criterion id | What must be true | Serves |
| --- | --- | --- | --- |
| | | | |

## Check

- `node packages/naive/src/checks/check-telos.mjs <venture dir>`: every exit criterion traces to a measure, and `governance/exit.json` follows the owner outcome.
- The primary measure is what a build method such as MAD reads as the success measure.
- Other templates can replace this one. The skill offers BASED + SMART first.
