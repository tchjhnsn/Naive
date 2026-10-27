# Validation kit

Purpose layer, second kit (EE-026). How probable it is that a venture is validated, from cited evidence rather than a declared phase.

| Part | Where |
| --- | --- |
| Record types | `schema/validation-problem.schema.json` at `<venture>/purpose/validation/problem.json`; every sub-score shares `schema/validation-evidence.schema.json` |
| Grading | `node schema/check-validation.mjs <dir> [--json]`: GRADE levels (high, moderate, low, very low) per evidence item and per record |
| Skills | `skills/problem-validation/` |
| Templates | `templates/problem.md` (the record, weak versus strong), `templates/problem-interview.md` (gathering the evidence) |
| References | `references/references.json` |

Sub-scores: problem (built), solution, product-market fit, pricing, go-to-market, team, operations readiness per MAD tier (to build, same pattern).
