---
type: knowledge
tags: [everything-ecosystem, skills, purpose, validation, score]
ai-model: claude-opus-5.5
created: 2026-10-27T20:41:06Z
source: hybrid
name: validation-score
description: >
  Say how probable it is that a venture is validated, and what to work on next:
  grades each sub-score's evidence, combines the seven sub-scores (problem,
  solution, product-market fit, pricing, go-to-market, team, operations
  readiness) into one probability weighted by the go-to-market path and the
  venture's kind, and names the sub-score with the most to gain (EE-026).
  MANDATORY TRIGGERS: are we validated, validation score, have we reached
  validation, product-market fit, should we move to beachhead, phase gate,
  what should we validate next.
---

# Validation score

Purpose layer, validation kit (EE-026). Run `node packages/naive/src/checks/check-validation.mjs <venture dir> --score`.

## How it works

1. Each sub-score record cites evidence; the checker grades it high, moderate, low or very low (GRADE, adapted). The grade's weight is `e`.
2. Each record carries a probability `p` (Jev, or the owner until Jev runs).
3. The score is the weighted average of p times e. Weights and floors come from `weights.json`, set by the go-to-market record's `path` and by the venture's kind (from its products: software, service, content or physical).
4. A sub-score below its floor holds the venture back whatever the average. A sub-score not yet stated counts zero and is listed.
5. Crossing the threshold is a recommendation. The owner decides the phase change in `venture.json`.

## What to do with it

- Work on **most to gain** first: the sub-score where weight times what is missing is largest.
- Don't fill every record at once. Discovery needs the problem record; the rest follow as the venture approaches Validation (see the need-now score).
- Use the sub-score templates in `templates/` to gather evidence.
