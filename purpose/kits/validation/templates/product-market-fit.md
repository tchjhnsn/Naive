---
type: template
tags: [everything-ecosystem, validation, product-market-fit, template]
ai-model: claude-opus-5.5
created: 2026-10-27T20:40:44Z
source: hybrid
---

# Template: the product-market fit record

Fills `<venture>/purpose/validation/product-market-fit.json`. Product-market fit means a segment keeps using the product. Record the data itself; the checker reads it.

## Retention cohorts

Group users by the period they started. For each cohort, record its size and how many were still active at the end of each period after. Retention that **levels off** above zero (the last three periods within 5% of cohort size) is the strongest single sign. Retention that keeps falling to zero is not fit, whatever people say.

## The Sean Ellis survey

Ask active users who have used the product at least twice: "How would you feel if you could no longer use this product?" The answers are very disappointed, somewhat disappointed, not disappointed, or no longer use it. Record `asked` and `very_disappointed`. 40% or more very disappointed is the usual bar (references: `vohra-2018-superhuman-pmf-engine`).

## Evidence

Cite the retention data as `behavior` and the survey as `stated` (specific, from the target segment).
