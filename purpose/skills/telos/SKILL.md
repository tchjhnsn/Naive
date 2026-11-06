---
type: knowledge
tags: [everything-ecosystem, skills, purpose, telos, start-with-the-end]
ai-model: claude-opus-5.5
created: 2026-10-27T16:04:54Z
source: hybrid
name: telos
description: >
  Start with the end: help the owner state what the venture is for when it has
  done its job, how anyone would know (measures), what the owners intend to
  happen then (hold, sell, list, wind down), and what must be true to leave each
  phase of the Succession Matrix, each tied to a measure. Records
  foundation/goals and foundation/exit-criteria. Other layers read it: governance's exit paths and MAD's
  success measure. The owner writes it; an agent drafts and asks (EE-023).
  MANDATORY TRIGGERS: telos, start with the end, end in mind, end state, what is
  this for, north star, long-term goal, exit criteria, phase gate, when do we
  move to the next phase, what does done look like for the venture.
---

# Telos: start with the end

Purpose layer (EE-023). Writes `foundation/goals/telos` (the end and its measures), `foundation/goals/owner-outcome` and `foundation/exit-criteria/<phase>`; `node packages/naive/src/checks/check-telos.mjs` checks them. A `foundation/telos` write is refused once a venture has any of these records. Covey's habit "begin with the end in mind" and Aristotle's telos, the end a thing exists for, name the same move: decide the end first, then derive every earlier step from it.

## When

- When a venture leaves Discovery (`check-telos.mjs` warns from then on, unless the ambition is hobby).
- At every phase gate, to write the next phase's exit criteria.
- When the ambition changes, because the owner outcome may change with it.

## Template

The default is `purpose/templates/telos-based-smart.md`. Write the ambition first, uncensored (BASED: statement, end state, owner outcome), then scope it (SMART: measures and exit criteria). The owner may choose another template.

## Steps

1. **Statement.** One sentence: what the venture is for when it has done its job. Draw on `venture.json` core (promise, promised to); the core is what the venture offers now, the telos is where that leads.
2. **End state.** What is true in the world when the end is reached. Concrete enough that two people would agree whether it is true.
3. **Measures.** Two to five, one primary. Each has a kind (revenue, usage or adoption, cost or time saved, compliance met, learning, flow and lead time, impact) and a target. The primary measure becomes MAD's success measure.
4. **Owner outcome.** What the owners intend once the end is reached: hold, acquisition, IPO, secondary sale, merger, management buyout, or wind-down, and why. Check it fits the ambition and the ownership: investors who bought preferred shares expect an exit. `governance/exit.json` must prefer this path and may not rule it out.
5. **Exit criteria per phase.** For the current phase and the next, what must be true to leave it. Start from the phase's generic gate in `purpose/frameworks/product-anatomy/phases.json` (Validation: product-market fit, retention holds) and make it this venture's. Every criterion names the measures it serves, so each phase's exit traces back to the end.

## Who decides

The owner. An agent drafts the statement and measures from the core and the venture profile, and asks; it never settles the end on the owner's behalf. Changing the owner outcome is also an `ownership-or-control` decision when there are other owners.

## Sources

- Stephen R. Covey, *The 7 Habits of Highly Effective People* (1989), habit 2: begin with the end in mind.
- Aristotle, *Physics* II.3 and *Nicomachean Ethics* I (the final cause, telos).
- Robert G. Cooper, Stage-Gate: each stage ends at a gate with exit criteria.

These still need recording with `find-reference`.

## Framework

This skill is the interview for the `telos` framework for thinking (`frameworks/telos/framework.json`). Answers are written to canonical records (`foundation/goals/`, `foundation/exit-criteria/`) through its `maps_to`, not to framework-only files (Torian, 2026-10-30).
