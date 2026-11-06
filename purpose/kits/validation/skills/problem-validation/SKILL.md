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
  costs them, and what the evidence is strong enough for (explore, prototype,
  charge, raise), with no single score and never a "not viable" verdict.
  Writes purpose/validation/problem.json; packages/naive/src/engine/assess-problem.mjs assesses it
  after asking the person to fill in what is missing or run as is (EE-026, EE-050).
  MANDATORY TRIGGERS: problem validation, validate the problem, is this a real
  problem, customer discovery, problem interview, Mom Test, pain point,
  evidence for the problem, market research for the problem, problem-solution fit.
---

# Problem validation

Purpose layer, validation kit (EE-026, EE-050). Writes `purpose/validation/problem.json`; `node packages/naive/src/engine/assess-problem.mjs <venture dir>` (route `purpose/validation/assess`) says what its evidence is strong enough for. The behaviors it keeps are in `features/problem-assessment.feature`.

## The rule: no verdict from missing evidence

There is no score and no "not viable". The problem splits into four assumptions (it exists, our segment has it, it hurts enough that people already spend on it, why now), and each gets a label from its evidence: demonstrated, inferred, assumed, unknown or contradicted. The labels say which commitment the evidence supports: explore, prototype, charge or raise. Missing evidence is unknown, never a verdict against the idea. Competitors with paying customers count for the problem. Only first-hand behavior or commitment from five or more people in the segment demonstrates; anything reported (a vendor's customer count, a report) infers. Contradicted needs evidence against from the segment at least as strong as the evidence for.

## Steps

1. **Run the assessment first.** When the record is missing or incomplete it does not assess; it lists what is missing and what running as is would mean. **Show the person that list and ask whether to fill it in or run as is.** Never choose for them: pass `as_is` (CLI `--as-is`, MCP and API `as_is: true`) only after they chose it.
2. **Fill in** what they chose to fill: `statement`, `segment`, `cost` or `workarounds`, `why_now`, and for each evidence item the `assumption` it bears on. Use `templates/problem.md`.
3. **Find the cheapest evidence for the blocking assumption.** The result names it and a test. Competitors and desk research are quick and infer; interviews with five or more people in the segment (`templates/problem-interview.md`) and workarounds they already pay for can demonstrate. Save notes in the venture folder, so items are first-hand.
4. **Record evidence against as well** (`supports: false`).
5. **Run again** and tell the person what the evidence now supports and the next test, in those words.

## When to stop

When the evidence supports the commitment the founder is about to make. Prototyping needs the problem and its cost inferred; charging needs the segment and the cost demonstrated. Don't research past the next commitment.

## Guardrails

- Never invent evidence or fill a source with a plausible URL. A missing source is an open question.
- Interview notes may hold personal data. Keep names out of the notes, or keep the notes out of any public repository.
