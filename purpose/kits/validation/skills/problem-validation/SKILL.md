---
type: knowledge
tags: [everything-ecosystem, skills, purpose, validation, problem, evidence]
ai-model: claude-opus-5.5
created: 2026-10-27T20:21:00Z
source: hybrid
name: problem-validation
description: >
  Help a builder show that the problem their venture solves is real, with cited
  evidence instead of a statement: who has it, how they cope today, what it
  costs them, and evidence graded high to very low (GRADE, adapted). Writes
  purpose/validation/problem.json; schema/check-validation.mjs grades it. The
  first sub-score of the validation kit (EE-026).
  MANDATORY TRIGGERS: problem validation, validate the problem, is this a real
  problem, customer discovery, problem interview, Mom Test, pain point,
  evidence for the problem, market research for the problem, problem-solution fit.
---

# Problem validation

Purpose layer, validation kit (EE-026). Writes `purpose/validation/problem.json`; `node schema/check-validation.mjs <venture dir>` grades it.

## The rule: a claim is not evidence

A problem statement on its own grades very low. The record rises only with cited evidence, and evidence is weighed by what kind of signal it is, who it came from, how many, how specific and how recent. This is the GRADE method from evidence-based medicine, adapted: behavior starts high, commitment moderate, stated intent and desk research low, opinion very low; the wrong audience, a small sample, general answers and old evidence each lower it.

## Steps

1. **Draft the claim** from `venture.json` core (promise, promised to): `statement`, `segment`, `workarounds`. Use `templates/problem.md`.
2. **Grade it** now. It will say "claim only". That is the honest starting point.
3. **Find the cheapest strong evidence.** Look for behavior first: are people in the segment already paying for or building a workaround? Desk research can size the segment, with a cited source.
4. **Interview** five or more people in the segment with `templates/problem-interview.md`. Record past facts as evidence items and save the notes in the venture folder.
5. **Grade again**, and record evidence against the claim as well (`supports: false`).
6. **Score the probability** (`probability.p`) with Jev, or as the owner until Jev runs. The validation score multiplies it by the evidence weight.

## When to stop

Don't over-research. When the record grades moderate or high and the weakest validation sub-score is elsewhere, move on to it. The framework asks for the evidence the current phase needs, not all evidence.

## Guardrails

- Never invent evidence or fill a source with a plausible URL. A missing source is an open question.
- Interview notes may hold personal data. Keep names out of the notes, or keep the notes out of any public repository.
