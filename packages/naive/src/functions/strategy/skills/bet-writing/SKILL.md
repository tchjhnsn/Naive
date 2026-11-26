---
type: knowledge
tags: [everything-ecosystem, skills, purpose, strategy, bets, pre-registration, falsifiability]
ai-model: claude-opus-5.5
created: 2026-11-26T22:10:00Z
source: hybrid
name: bet-writing
description: >
  Write a founder's strategic claims as bets, the way requirements are written:
  one claim each, in the fixed form for its kind, with the observation that
  would show it wrong, the bets it rests on, the rival it is read against, and
  the line and the date the founder set. Records foundation/bets/<id>. Then
  write the pre-registration that tests them, so the standard of proof is
  fixed before the evidence arrives (EE-221, EE-220).
  MANDATORY TRIGGERS: bet, bets, strategic bet, what we are betting on, our
  thesis, hypothesis, forecast, prediction, I think X will happen, the market
  will, founders will, incumbents will, this is why now, what would have to be
  true, premise, assumption behind it, kill criterion, what would change my
  mind, attack the premise, disprove, falsify, odds, probability, confidence,
  calibration, Brier, pre-research, research protocol, before we search,
  mission statement, vision statement, before the strategy docs.
---

# Writing a bet

Strategy function (EE-221). Writes `foundation/bets/[id]`. `node packages/naive/src/checks/check-bets.ts <venture dir>` checks the register, `naive lint premises` attacks it, and the router refuses a write that moves a registered claim.

A strategy is a set of claims about the world. Written as prose they cannot be wrong, because nothing in them says what would count against them. A bet is one of those claims written the way a requirement is written: singular, unambiguous and verifiable (ISO/IEC/IEEE 29148:2018), in a fixed sentence form for its kind (EARS, Mavin et al. 2009), with the observation that would show it wrong (Popper) and the date by which it would be looked for (Duke, *Quit*, 2022). A pre-registration is the plan for one test of one or more bets; the bet is the claim, and it outlives the test.

Nothing in this skill supplies a number. The line, the date and the odds are the founder's, and a bet carrying a number an agent chose is a bet nobody is bound by.

## When

- The founder says what they believe about the world, the market, their customer or the future, in any words, and acts as though it were settled.
- Before the mission and the vision. Those read differently once there is a claim they have to survive, and `lint-foundation` is where a rule that mission lines cite only registered bets would sit (not built).
- When a reason is given for a bet. A reason is a premise, not a second bet: write it as a bet of kind `premise` and name it in the first bet's `premises`.
- When a bet is about to be tested. Then the pre-registration comes first, and it names the bet in its `tests`.

## Steps

1. **Split.** One claim per bet. "The success rate, the market reach and the operating skill will all grow" is three bets. Each one points back at the founder's own words through `conversation`, and nothing is added that they did not say.
2. **Classify.** `empirical` (true or false today), `forecast` (resolves at a date), `causal` (a cause changes a measure against a comparison group), `premise` (a claim another bet rests on), `selection-rule` (whom or what the venture backs, which is a value and not true or false). A definition is not a bet at all: send it through the term engine (`glossary`).
3. **Write the parts, not the sentence.** Fill `claim`: the population with what is left in and out, the measure, the comparator, the threshold, the date it is judged on, the source the value will be read from, and the denominator when the bet is tested by counting cases. `statementForm` in `packages/naive/src/engine/bets.ts` renders the fixed sentence from those parts, and `naive bets show` prints it beside the founder's own wording so they can confirm the two say the same thing.
4. **Ask for the line and the date.** Never offer either as the answer. If the founder wants a starting point, say Naive ships none, propose one as a `strategy-or-constitution` decision with the reasoning, and let them settle it. Leave what they have not given as a gap: `naive bets register` lists every gap before it refuses.
5. **Say what would show it wrong.** `falsified_by`, with a date. A claim with no possible counter-observation is not a bet, and "can outperform" has none: push until there is a state and a date.
6. **Name the premises.** What must be true for the bet to hold, stated and unstated. Each is a bet of kind `premise` with its own id, so it can be tested and resolved on its own, and a bet reported supported while a premise of it is refuted is an error the check catches.
7. **Name the rival.** At least one competing claim, and the observation that would tell the two apart (Platt, strong inference, 1964). A register with no rivals is a register that only looks for agreement.
8. **Say whether the venture is working to make it true.** `intends_to_cause`. A founder building a product to make a forecast come true is not a neutral observer, and those bets are scored apart and never reported as foresight.
9. **Ask the founder for the odds, and for what they had already seen.** `naive bets confidence <id> --p <0..1> --by <person> --data-seen <answer>`. The five answers are the OSF template's, from `before-data-exists` to `after-analysis`. A bet drawn from two examples the founder already read is `after-analysis` for that evidence, and saying so is what makes the rest of the test readable. The first entry is the prior, and it is the one scored.
10. **Register it.** `naive bets register <id> --by <person>`. Read back what is being fixed, in one short list, and say plainly that the claim cannot be edited afterwards.
11. **Then pre-register the test.** Use the `pre-registration` skill, and list the bet in the plan's `tests`. Registering the plan fixes every claim it names, so the claim cannot be widened after the search starts.

## After it is registered

- **Nothing in the claim is edited.** Not by you, not by the founder. A narrowed or corrected claim is a new bet whose `supersedes` names the old one and whose `supersede_reason` says why; a person then supersedes the old one. The old claim and its outcome stay readable, which is the point.
- **Evidence is appended, for and against.** `evidence[]` with `supports: false` for anything that tells against the bet. It is never removed. Evidence against is what decides (Heuer, analysis of competing hypotheses), and the grading is `check-validation.ts`'s, adapted from GRADE: desk research starts at low, and saying so is an honest result, not a fault.
- **Attack it.** Run `naive lint premises` and answer each question or raise it as a decision. One agent searches and a different one attacks, because the builder is not the verifier.
- **The outcome is the founder's, once.** `naive bets resolve <id> <happened|did-not-happen|mixed|unresolvable> --by <person>`. The outcome and the verdict are kept apart: a forecast given low odds that did not happen is a bet refuted and a forecast well made, and `naive bets score` says so.

## What to refuse

- A threshold, a date or a probability you chose. Ask for it, or propose it as a decision.
- A claim with no counter-observation, and the words that hide one: "can", "may", "could", "better", "exponential", "best". `naive lint premises` lists the vague words it finds; a graded word needs a number or a definition.
- A bet that joins several claims. Split it.
- A reason written as a bet. It is a premise.
- Registering or resolving on the founder's behalf, and reading a verdict off the evidence.
- Calling the register verified, proved or formally correct. What is machine-checked is the form of each bet, the links between them, the order the register was written in and the arithmetic of two lines that cannot both hold. Whether a claim is true is evidence and a person's judgment of it, and no program settles it.
- Treating a selection rule as a claim. It says whom the venture backs. What can be tested is whether its observable test works and whether the bets under it hold; it is never reported as supported by evidence.
- An outside example counted as a test of the bet it prompted. It is where the idea came from. Evidence found after the lock, by the registered method, is what counts.

## Writing the words

The lints that bear on a bet's prose are already built, and this skill adds no runner:

- `naive lint premises` carries the vague-word list, and its `undefined-term` aspect is the check on a graded word in a statement.
- `packages/naive/src/engine/publish-lint.ts` carries the `claims` rule for anything public: a sentence asserting a number or customers with no source in the file's frontmatter fails.
- A house prose style as rule files (a Vale style, say) is **not built**. It would add a binary dependency, and for a bet the two lints above catch what such a rule file would catch.

## Sources

- ISO/IEC/IEEE 29148:2018, *Systems and software engineering: life cycle processes, requirements engineering*: the characteristics of one requirement (necessary, unambiguous, singular, feasible, verifiable, traceable) and of a set.
- Alistair Mavin, Philip Wilkinson, Adrian Harwood and Mark Novak, "Easy Approach to Requirements Syntax (EARS)", *IEEE International Requirements Engineering Conference* (2009): a fixed sentence template per kind.
- Karl Popper, *The Logic of Scientific Discovery* (1959): a claim is testable when an observation could contradict it.
- John R. Platt, "Strong inference", *Science* 146 (1964): rival hypotheses and a test that rules one out.
- Richards J. Heuer Jr., *Psychology of Intelligence Analysis* (1999): analysis of competing hypotheses, where evidence against decides.
- Brian A. Nosek, Charles R. Ebersole, Alexander C. DeHaven and David T. Mellor, "The preregistration revolution", *PNAS* 115(11) (2018): prediction kept apart from postdiction, and what to do when the data already exist.
- Center for Open Science, OSF Preregistration template: the existing-data item and its five answers.
- Philip E. Tetlock and Dan Gardner, *Superforecasting* (2015), and Glenn W. Brier, "Verification of forecasts expressed in terms of probability", *Monthly Weather Review* 78(1) (1950): a probability, a date, and a score afterwards.
- Annie Duke, *Quit* (2022): a kill criterion pairs a state with a date, set in advance.
- James A. Dewar, *Assumption-Based Planning* (2002): the premises a plan rests on most and knows least.
- Stephen Toulmin, *The Uses of Argument* (1958): a claim, its grounds, the warrant between them, and the rebuttal that would defeat it.

These still need recording with `find-reference`.
