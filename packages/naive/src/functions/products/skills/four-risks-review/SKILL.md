---
name: four-risks-review
description: >
  Check whether a product or a proposed build has evidence for each of the four
  product risks (value, usability, feasibility, business viability), whether the
  team touched customers this week, and what the product-market fit survey says.
  Use in the products intake and the weekly product review, before a build
  handoff is accepted.
---

# Four risks review

Use this when a workflow step asks you to check a product or a build against its risks. You prepare the finding; the product lead and the founder decide.

## 1. The four risks

For the product or the handoff in front of you, look for evidence of each risk (Cagan, "The Four Big Risks", SVPG):

| Risk | The question | Evidence that counts |
|---|---|---|
| Value | Will the customer buy it or choose to use it? | Interviews (`validation/interviews/[id]`) where people describe the problem unprompted, a paid pilot, a pre-order, use of a prototype |
| Usability | Can they figure out how to use it? | A usability session or beta feedback (`validation/feedback/[id]`) where a user finished the task without help |
| Feasibility | Can we build it with the time, skills and technology we have? | A spike, a prototype, an estimate in a handoff |
| Viability | Does it work for the rest of the business? | Pricing (`validation/pricing`), cost to serve, legal or partner constraints (`foundation/constraints`) |

Write what you find on the product card, one line per risk, each citing the record it came from. A risk with no record is "no evidence", never "probably fine".

A handoff proposed as a build with any risk at "no evidence" is a discovery task. Say which test would close the gap and how long it takes.

## 2. Weekly customer touchpoints

Count the interviews, usability sessions and customer calls logged this week. The people who build a product should talk to customers at least weekly (Torres, Continuous Discovery Habits). Zero is a finding: report it to the product lead.

## 3. Product-market fit

When there are enough active users to survey (as a rule of thumb, at least 30 who used the product in the last two weeks), read the latest answers to "How would you feel if you could no longer use the product?" (the Sean Ellis test).

- 40% or more "very disappointed" is a leading sign of fit.
- Below 40%, segment the "very disappointed" by who they are, set aside the "not disappointed", and keep only the "somewhat disappointed" whose main benefit matches the core benefit (Vohra, First Round Review). Report both scores.
- Say the sample size. A score from a small or hand-picked sample is weak evidence.

Retention benchmarks are priors, not gates: six-month user retention around 40% is good for consumer SaaS and around 60% for small-business SaaS (Rachitsky, 2020).

## 4. What you bring up

- Evidence that contradicts the current direction: a continue-or-stop or change-direction decision for the founder, with the evidence and the options.
- An open risk on a build: back to the product lead with the test that closes it.
- Never mark a risk closed on your own judgment without a record.
