---
type: knowledge
tags: [everything-ecosystem, skills, purpose, strategy, pre-registration, falsifiability]
ai-model: claude-opus-5.5
created: 2026-11-26T21:07:41Z
source: hybrid
name: pre-registration
description: >
  Help a founder write down what would have to be true, how it will be looked
  for, what does not count as evidence, and what the venture does on each
  answer, before the mission and the vision are written. Records
  foundation/pre-registration/<id>. A person registers it, and from then on the
  thesis, assumptions, method, measures, thresholds, dates, exclusions and
  decision rules never change: a deviation is appended beside it and a real
  change is a new version that supersedes it (EE-220).
  MANDATORY TRIGGERS: pre-registration, preregistration, prereg, what would
  change my mind, how will we know, what would falsify this, kill criteria for
  a test, success criteria before the test, what counts as evidence, what does
  not count, moving the goalposts, we will know it when we see it, let us test
  this first, mission statement, vision statement, before the strategy docs.
---

# Pre-registration: fix the standard of proof before the evidence

Strategy function (EE-220). Writes `foundation/pre-registration/[id]`. `node packages/naive/src/checks/check-pre-registration.ts <venture dir>` checks it, and the router refuses a write that moves a registered field.

A mission and a vision written before anything has been tested are claims nobody can lose an argument with. A pre-registration comes first: it says what would have to be true, and it says it while the answer is still unknown, so the evidence can disagree. This is the practice of preregistration in science (Nosek et al. 2018), discovery-driven planning's assumption checklist (McGrath and MacMillan 1995) and the Test Card's success criterion (Bland and Osterwalder 2019).

## When

- Before the venture's mission, vision and other strategy documents. It is the second step of the strategy intake workflow, before `ask-telos`.
- Whenever a new bet starts: a new buyer, a new channel, a new price.
- When the founder says a test is already running. Write the pre-registration now, register it, and say in it what has already been observed, so the rest of the test is still readable.

## Steps

1. **The thesis.** One sentence about the world, not about the venture's hopes, and then the state that would show it is wrong (`thesis.falsified_if`). A claim with no such state is not a thesis. Push until there is one: "what would you see that would make you drop this?"
2. **The assumptions.** What the thesis rests on, each with how much the thesis rests on it (`criticality`) and how little is known about it (`uncertainty`). The critical and uncertain ones are what this test is for; say so and leave the rest for later.
3. **The method.** Who, how many, how they are found and approached, and what is asked or observed. Warm intros and friends are a recruitment method: write them down as one. A method nobody else could follow is not a method.
4. **The measures.** What is counted, the line it must pass, and the date it is judged on. Ask the founder for the line and the date, and write what they say. Never offer a number as the answer. If they want a starting point, say that Naive ships none and that the number is theirs, propose one as a `strategy-or-constitution` decision with the reasoning, and let them settle it. The date matters as much as the line: without it, a test that is failing simply runs longer.
5. **What does not count.** At least one, and in practice several: compliments on the demo, friends' and advisors' opinions, sign-ups with no payment, a meeting that was agreed to out of politeness, interest from someone who is not the buyer. Ask: "if this test came back positive only because of X, would you still believe the thesis?" If no, X is an exclusion. A standard of proof chosen after the evidence arrives admits whatever arrived.
6. **The two actions.** What the venture does on a pass, and on a fail: persevere, pivot or stop, each with what that means concretely. Both are written before the answer is known. A fail with no action is a test nobody intended to act on.
7. **Register it.** `naive prereg register <id> --by <person>`. Only a person registers one. Read back what is being fixed first, in one short list, and say plainly that it cannot be edited afterwards.

## After it is registered

- **Nothing registered is edited.** Not by you, not by the founder. The router refuses it and the check catches a hand edit.
- **A departure is appended.** `deviations`: when, what was done differently, why, and who. Recruiting two of ten through warm intros is a deviation, not a rewrite of the method.
- **A result is a measure, an observation and its pass or fail.** `naive prereg result <id> --measure <id>=<value> --evidence <ref>`. The pass or fail is the observed value against the registered threshold, which is arithmetic. You never argue a number across its line.
- **The verdict is the founder's.** You may lay out the results, the deviations and the action the record said it would take. You do not write the verdict and you do not decide the action.
- **A real change is a new version.** A new pre-registration with `supersedes` and `supersede_reason`, and the old one marked `superseded` with `superseded_by`. The old plan stays readable, which is the point.

## What to refuse

- A threshold you chose. Say that the line is the venture's and ask for it, or propose it as a decision.
- A measure with no date it is judged by.
- A pre-registration with no exclusions. It would call anything evidence.
- Registering on the founder's behalf, or reading a verdict off the results.
- "Let us start with the mission and come back to this." The order is the point: say that the mission is next, and that it reads differently once there is something it has to survive.

## Sources

- Brian A. Nosek, Charles R. Ebersole, Alexander C. DeHaven and David T. Mellor, "The preregistration revolution", *PNAS* 115(11) (2018).
- Rita Gunther McGrath and Ian C. MacMillan, "Discovery-driven planning", *Harvard Business Review* 73(4) (1995): the assumption checklist and milestone planning.
- David J. Bland and Alexander Osterwalder, *Testing Business Ideas* (2019): the Test Card's hypothesis, test, metric and criterion.
- Norbert L. Kerr, "HARKing: hypothesizing after the results are known", *Personality and Social Psychology Review* 2(3) (1998).
- Joseph P. Simmons, Leif D. Nelson and Uri Simonsohn, "False-positive psychology", *Psychological Science* 22(11) (2011): researcher degrees of freedom.
- Alistair Croll and Benjamin Yoskovitz, *Lean Analytics* (2013): vanity metrics.
- Eric Ries, *The Lean Startup* (2011): persevere or pivot against a criterion set in advance.

These still need recording with `find-reference`.
