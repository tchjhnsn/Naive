---
type: template
tags: [everything-ecosystem, purpose, strategy, bets, template]
ai-model: claude-opus-5.5
created: 2026-11-26T22:30:22Z
source: hybrid
---

# Template: bet

Fills `<venture>/foundation/bets/<id>.json` (EE-221), one strategic claim written the way a requirement is written. The skill is `packages/naive/src/functions/strategy/skills/bet-writing/SKILL.md`, and the plan that tests it is a pre-registration (`templates/pre-registration.md`).

**Every number below is an example, not a recommendation.** Naive ships no line, no date and no probability. Each is the venture's own, and if nobody has chosen one yet, that is what to settle first, as a `strategy-or-constitution` decision. A number that arrived from a template is a number nobody is bound by.

## 1. One claim

One bet holds one claim. A sentence joining several is several bets, each with its own id. A reason given for a claim is not a second claim: it is a premise, written as a bet of kind `premise` and named in this bet's `premises`.

Write the founder's own wording in `statement`. The fixed sentence is rendered from the parts below, and `naive bets show` prints the two side by side so the founder can confirm they say the same thing.

## 2. The kind

| Kind | What it claims | Resolved by |
|---|---|---|
| `empirical` | Something is true of the world today | Looking, at the date it is judged on |
| `forecast` | Something will be true by a date | The date arriving |
| `causal` | A cause moves a measure, against a comparison group | A comparison, so `compared_with` is required in practice |
| `premise` | Something another bet rests on | Its own evidence, on its own |
| `selection-rule` | Whom or what the venture backs | Nothing: it is a value, never resolved by evidence and never scored |

A definition is not a bet. Send it through the term engine (the `glossary` skill).

## 3. The claim's parts

For every kind but `selection-rule`:

| Part | What it holds |
|---|---|
| `population` | Who or what the claim is about, with what is left in and out |
| `measure` | What is counted or read, in words someone else could read the same way |
| `comparator` | `>=`, `>`, `<=`, `<`, `==` or `!=` |
| `threshold` | *(example)* `{ "value": 10, "unit": "%", "set_by": "the founder" }`. A threshold with no `set_by` is a gap |
| `compared_with` | For a causal claim: the group it is measured against |
| `resolves_by` | *(example)* `2027-06-30`. A forecast with no date cannot be wrong, only late |
| `source` | Where the value will be read from when the date comes |
| `denominator` | When the bet is tested by counting cases, what is being counted out of |

For `selection-rule` alone, `rule` with all three of `back`, `do_not_back` and `observable_test`. The schema holds the two apart: a selection rule carries no `claim`, and no other kind carries a `rule`.

## 4. What would show it wrong

`falsified_by`, with a date. A claim with no possible counter-observation is not a bet. "Can outperform" has none, and neither do "better", "exponential" or "best" without a number or a definition behind them.

## 5. The premises and the rival

- `premises`: the ids of the bets this one rests on, stated and unstated. Each is a bet in its own right, so it can be tested and resolved on its own.
- `rivals`: at least one competing claim, each with what `separates` the two. A register with no rivals only looks for agreement.
- `intends_to_cause`: true when the venture is working to make the claim come true. Those bets are scored apart and never reported as foresight.

## 6. The odds

`naive bets confidence <id> --p <0..1> --by <person> --data-seen <answer>`. Only a person puts odds on a bet. `data_seen` is one of `before-data-exists`, `before-any-observation`, `before-access`, `before-analysis` or `after-analysis`: a bet drawn from examples the founder had already read is `after-analysis` for that evidence, and saying so is what makes the rest readable. The first entry is the prior, and it is the one scored.

## 7. Register it, then pre-register the test

`naive bets register <id> --by <person>`. Only a person registers one. From then on the kind, the statement, the claim, what would show it wrong, the premises and `intends_to_cause` do not change, for a person either: a narrowed or corrected claim is a new bet whose `supersedes` names this one with a reason, so the old claim and its outcome stay readable.

Then write the pre-registration that tests it and list this bet in that plan's `tests`. Registering the plan freezes the claim it was written against, so the claim cannot be widened once the search has started. Evidence is appended afterwards, for and against, and is never removed; the outcome is the founder's, once, with `naive bets resolve`.
