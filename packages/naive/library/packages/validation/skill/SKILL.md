---
type: knowledge
tags: [everything-ecosystem, naive, skills, packages, validation, functions]
ai-model: grok-4.7
created: 2026-10-29T22:10:00Z
source: ai-generated
name: validation-function
description: >
  Work with the validation function of a Naive venture in code: read its
  records through the router, and run validation/lint before treating a claim,
  an assumption, or a Validation decision as settled. MANDATORY TRIGGERS:
  validation lint, claim with no evidence, shelf life, assumption grade.
---

# Validation function

Package `packages/naive/library/packages/validation`. Whether the problem is real, whether this solves it, and whether people pay and keep using it, with the evidence graded (EE-026, EE-050).

## Records

| Route | What it is |
|---|---|
| `foundation/problem` | The problem claim and the evidence on each assumption |
| `validation/solution` | How it solves the problem, and the evidence people choose it |
| `validation/pricing` | Price and the evidence people pay |
| `validation/go-to-market` | Path, motion, channels, and the evidence a channel works |
| `validation/product-market-fit` | Retention and the evidence a segment keeps using it |
| `people/team` | Skills needed, skills held, and the evidence |
| `purpose/validation/assess` | What the problem's evidence is strong enough for |

Read and write through the router. A missing record stays missing.

## Checks

`node packages/naive/src/checks/lint-validation.mjs <venture dir> [--json]` (route `validation/lint`) warns, fail-open, when a claim cites no evidence, evidence is past the assumption shelf life (the freshness profile's expire, or a phase change after it was collected), an assumption was graded only by an agent (`probability.by` is not `owner`), or a decision was made in Validation on evidence that grades very low. Set `validation_lint.rules.<id>.mode` to `"fail-closed"` in naive.config.json to make that rule fail the run (exit 1). `naive check` runs it.

`packages/naive/src/checks/check-validation.mjs` grades each record from its evidence. `packages/naive/src/engine/assess-problem.mjs` (route `purpose/validation/assess`) labels the four assumptions and asks before it runs on an incomplete record.
