---
type: template
tags: [everything-ecosystem, validation, problem, template]
ai-model: claude-opus-5.5
created: 2026-10-27T20:21:00Z
source: hybrid
---

# Template: the problem record

Fills `<venture>/purpose/validation/problem.json` (schema `schema/validation-problem.schema.json`). Grade it with `node schema/check-validation.mjs <venture dir>`.

## Weak: a claim only (grades very low)

```json
{
  "venture": "<id>",
  "statement": "<the problem>",
  "segment": "<who has it>",
  "evidence": []
}
```

A statement with no evidence is the weakest form of this record. It is a starting point, never a validated problem.

## Strong: the claim and the evidence that it is real

| Field | Write |
| --- | --- |
| `statement` | The problem in the words of the people who have it, not the solution |
| `segment` | Who has it, specifically enough to go and find ten of them |
| `frequency`, `cost` | How often it happens; what it costs them now in money, time or risk |
| `workarounds` | How they cope today. Money or time already spent on a workaround is the strongest early evidence |
| `evidence[]` | Each item: `kind`, `summary`, `source` (a URL with `checked`, or a file in the venture folder), `audience`, `sample`, `specificity`, `collected` |
| `probability` | The Jev probability that the problem is real and worth solving for this segment |

What raises the grade, strongest first:

1. **Behavior** from the target segment: they already pay for or build a workaround (starts high).
2. **Commitment**: they book a follow-up, introduce a colleague, put down a deposit (starts moderate).
3. **Stated** evidence from interviews with specific past facts, from five or more people in the segment (starts low).
4. **Desk research** with a cited source: market sizes, industry surveys (starts low).
5. Three or more independent sources at low or better that agree raise the record one level.

What lowers it: the wrong audience (friends, peers, people outside the segment), fewer than five people, general or hypothetical answers, evidence older than 18 months, and evidence as strong that contradicts the claim.
