# Validation kit

Purpose layer, second kit (EE-026). How probable it is that a venture is validated, from cited evidence rather than a declared phase.

| Part | Where |
| --- | --- |
| Record types | One per sub-score: `schema/validation-<sub-score>.schema.json` at `<venture>/purpose/validation/<sub-score>.json`; all share `packages/naive/src/records/validation-evidence.schema.json` |
| Weights | `weights.json`: weights and floors by go-to-market path and venture kind (version 0.x, unevaluated) |
| Grading and score | `node packages/naive/src/checks/check-validation.mjs <dir> [--json] [--score]`: GRADE levels per evidence item and record, data facts (Ellis share, retention levelling off, team gaps), and the validation score |
| Skills | `skills/problem-validation/`, `skills/validation-score/` |
| Templates | `templates/<sub-score>.md` for each record, plus `templates/problem-interview.md` |
| References | `references/references.json` |

Sub-scores: problem, solution, product-market fit, pricing, go-to-market, team, operations readiness per MAD tier.
