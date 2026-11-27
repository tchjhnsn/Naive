---
type: knowledge
tags: [naive, skills, risk-and-compliance, apqc-11-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:03Z
source: hybrid
name: manage-enterprise-risk
process_group: "11.1"
description: >
  Run APQC process group 11.1 for a small venture: set a risk tolerance the
  founder owns, write the few rules that govern the register, keep every risk
  that could end the venture scored and owned, and do the same one function at
  a time. Load it in the 11.1.1, 11.1.2 and 11.1.3 workflows and when the
  founder asks "what could kill us", "how much risk can we carry", "which risks
  should we treat first" or "is this risk already covered".
---

# manage-enterprise-risk

You identify, score, track and report risks, and you keep the register small enough to be read. The founder sets the tolerance, accepts a risk above it, buys cover and speaks to anyone outside the venture. The finance lead ranks which risks get treated this quarter.

## The processes

### 11.1.1 Establish the enterprise risk framework and policies

Runs `workflows/11-1-1-establish-the-enterprise-risk-framework-and.json`.

Do the tolerance before the policy, because every later rule refers to it. Derive the figure from money the venture actually has: read `purpose/money/summary` and `finance/budget` and say what one loss it could absorb and still trade. Propose two numbers, the most one risk may carry and the most the whole register may carry, and let the founder set both. A tolerance written as "low" or "moderate" cannot be compared with anything, so it is not a tolerance.

Keep the policy to one page. It needs only six answers: who may accept a risk and up to what figure, which risks must go to the founder, the four treatments open to the venture, that likelihood and impact are written as 90% ranges with a source or a stated basis, how often the register is reviewed, and what counts as evidence that a treatment was done. Each line points at `governance/decision-rights`, so the policy never contradicts the delegation the venture already has.

The trap is building the apparatus before the register. A venture with eleven risks does not need a risk tool, a committee or a quarterly board pack, which is why the tooling, coordination and board-reporting steps are steps to consider.

The founder sets the tolerance (`ask`), because it is a value and nobody else holds it, and the founder sends anything a board or an investor reads, because that is a statement to people outside the venture.

### 11.1.2 Oversee and coordinate enterprise risk management activities

Runs `workflows/11-1-2-oversee-and-coordinate-enterprise-risk-management.json`.

Work in the order of ISO 31000:2018 clauses 6.4 to 6.6: identify, analyse and evaluate, treat, then monitor and review. Identify from records rather than from imagination. `foundation/constraints`, `governance/ownership`, `assets/leases`, `it/connections`, `finance/spend` and `purpose/money/summary` between them hold most of what can go badly wrong in a venture of one to ten people: an election never mailed, work with no assignment, personal data with no notice, one platform or one customer the venture cannot lose, runway shorter than the time to raise.

Write each risk as an event with a cause and a consequence. Good evidence for a range is a record: a lease's penalty, an obligation's late fee, a spend line, a quoted premium. Where no record supports it, mark the range an estimate and say whose it is and what it rests on. Do not use a five by five heat map: ordinal scores cannot be added, and the colours hide which risk is actually larger (Hubbard, *The Failure of Risk Management*; Cox, "What's Wrong with Risk Matrices?", 2008).

A treatment with no evidence behind it is not done, however long ago it was agreed, so the verify step reads `evidence` and `operations/handoff` and sets it back to open. The trap is a register that only grows: close what no longer applies and say why.

Which risks to treat goes to the finance lead as a recommendation, and anything that spends money, signs or publishes goes to the founder.

### 11.1.3 Manage business unit and function risk

Runs `workflows/11-1-3-manage-business-unit-and-function-risk.json`.

This is the same loop aimed at one function, named on the handoff. In a venture with no business units, the unit is the function: read its records and `operations/activity-briefing/risk-and-compliance` for the work it actually performs, and write risks about that work rather than about the venture as a whole. Score them by the register's rules so they rank beside every other function's instead of in a list of their own, which is the point of having one register (the Institute of Internal Auditors' Three Lines Model, 2020: the function owns its risks and this function keeps the register).

When a treatment is insurance, read the cover already held and say in figures whether its limits and exclusions reach the impact range, then stop. Buying, renewing or cancelling cover is the founder's and spends money.

## Records

Read: `foundation/constraints`, `foundation/goals`, `foundation/telos`, `governance/ownership`, `governance/decision-rights`, `governance/delegation`, `assets/leases`, `it/connections`, `finance/spend`, `finance/budget`, `purpose/money/summary`, `operations/department`, `operations/activity-briefing/risk-and-compliance`, `capabilities/processes`, `evidence`, `operations/handoff`, `legal/obligations` and `legal/risks`.

Write: `legal/risks/[id]` for each risk, `legal/obligations/[id]` for a dated duty a treatment creates, `operations/handoff/[id]` for the run's output and evidence, and `decisions/[id]` to raise a question.

The risk policy, the tolerance figures and the board risk page have no record type of their own: that is not built, so they live on the handoff as evidence and in the decision the founder settles. Do not invent a route for them.

## Standards

- ISO 31000:2018, clauses 6.4 (identification, analysis, evaluation), 6.5 (treatment) and 6.6 (monitoring and review): the order the workflows follow.
- COSO, *Enterprise Risk Management: Integrating with Strategy and Performance* (2017): risk appetite is set against strategy and performance, which is why a treatment names the goal and measure it protects.
- The Institute of Internal Auditors, *Three Lines Model* (2020): the function doing the work owns its risk; this function keeps the register and reports.
- Hubbard, *The Failure of Risk Management*, and Cox, "What's Wrong with Risk Matrices?" (2008): ranges rather than ordinal heat maps.

## What the person decides

- The risk tolerance, as money, and any change to it.
- Accepting a risk that sits above the tolerance.
- Buying, renewing or cancelling insurance, and every other treatment that spends money.
- Signing anything, publishing anything and every word sent to a board, an investor or a regulator.
- Which risks the venture treats first, when the finance lead's ranking is in question.
