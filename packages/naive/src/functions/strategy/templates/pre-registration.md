---
type: template
tags: [everything-ecosystem, purpose, strategy, pre-registration, template]
ai-model: claude-opus-5.5
created: 2026-11-26T21:07:41Z
source: hybrid
---

# Template: pre-registration

Fills `<venture>/foundation/pre-registration/<id>.json` (EE-220), the plan for one test, fixed before the test runs. Write it before the mission and the vision. The skill is `packages/naive/src/functions/strategy/skills/pre-registration/SKILL.md`.

**Every number below is an example, not a recommendation.** Naive ships no threshold and no sample size. The line and the date are the venture's own, and if nobody has chosen them yet, that is what to settle first, as a `strategy-or-constitution` decision. A number that arrived from a template is a number nobody is bound by.

## 1. The thesis

One sentence about the world, and the state that would show it is wrong.

- **Statement:** the claim, as plainly as you would say it to someone who disagrees.
- **Falsified if:** what you would have to see to drop the claim. If you cannot name it, this is not yet a thesis.

## 2. The assumptions

What the thesis rests on. Rank them: the ones you most depend on and least know are what this test is for.

| Assumption id | Statement | Criticality | Uncertainty | Measures it bears on |
|---|---|---|---|---|
| *(example)* `will-pay` | *(example)* The buyer pays from a budget they already control | high | high | `paid-pilots` |

## 3. The method

- **Who:** the population, not a list of names.
- **How many:** a number, or the rule that decides when to stop.
- **Recruitment:** how they are found and approached. Warm intros and friends are a recruitment method; write them down as one.
- **Asked or observed:** what happens, concretely enough that someone else could run it the same way.
- **Analysis:** how the answers become the numbers below, when that is not obvious.

## 4. The measures

| Measure id | Statement | Threshold | Judged by | Who chose the line |
|---|---|---|---|---|
| *(example)* `paid-pilots` | *(example)* teams that start a paid pilot | *(example)* `>= 3 teams` | *(example)* `2026-12-20` | the founder, or the decision that settled it |

The date is not decoration. Without it, a test that is failing simply runs longer.

## 5. What does not count as evidence

At least one, and in practice several. Ask of each candidate: if the test came back positive only because of this, would you still believe the thesis?

- *(example)* a compliment on the demo, because it costs nothing to give
- *(example)* a sign-up with no payment, because it is not a purchase
- *(example)* an opinion from someone who is not the buyer

## 6. The two actions

Both written before the answer is known.

- **On a pass:** persevere, pivot or stop, and what that means here.
- **On a fail:** persevere, pivot or stop, and what that means here. A fail with no action is a test nobody meant to act on.

## 7. Register it

`naive prereg register <id> --by <person>`. Only a person registers one. From then on the thesis, assumptions, method, measures, thresholds, dates, exclusions and the two actions do not change. A departure is appended to `deviations`, with the date, what changed, why and who. A real change is a new pre-registration that `supersedes` this one with a reason, so what was promised and what happened are both still readable.
