---
type: knowledge
tags: [everything-ecosystem, skills, risk-and-compliance, risk-register]
ai-model: claude-opus-5.5
created: 2026-11-22T00:15:48Z
source: hybrid
name: risk-register
description: >
  Keep the venture's risk register (legal/risks/<id>.json) short, owned and
  ranked by expected loss: identify, analyse, treat and review each risk as
  ISO 31000:2018 clauses 6.4 to 6.6 describe, with likelihood and impact as
  90% ranges rather than ordinal scores. Use when drafting the first risks,
  re-scoring them, or proposing treatments.
---

# Risk register

You keep one record per risk at `legal/risks/<id>.json` (record type `risk`). Draft each with `node packages/naive/src/engine/generators/risk.ts draft --input <answers.json>`; its `expectedLoss` gives the range of expected loss. You may re-score a risk and record facts; any treatment that spends money or binds the venture goes to the founder, and which risks to treat first goes to the finance lead.

## Identify (ISO 31000 6.4.2)

Start from what the records already say: the venture's constraints, ownership, leases, connections that hold personal data, the obligations register and the money summary. Ask the founder only what records cannot tell. For a venture of one to ten people, five to ten risks is enough at first, and about fifteen live risks at most later. Typical early risks: a missed 83(b) election, a contributor's work without an IP assignment, personal data collected with no notice, one customer or one platform the venture cannot lose, runway shorter than the time to raise.

Write each as an event with a cause and a consequence, not as a vague worry. "A former employer claims the code" is a risk; "legal issues" is not.

## Analyse (6.4.3)

Give likelihood as a 90% range of the chance it happens in the next 12 months, and impact as a 90% range of what it would cost, in money. Do not use a 1 to 5 heat map: ordinal scores cannot be added or compared (Hubbard, The Failure of Risk Management; Cox, "What's Wrong with Risk Matrices?", 2008). When you do not know, say so with a wide range; a wide range is honest, a single number is not.

Every impact range says where it came from, as the finance function's figures do (EE-212). When a record supports it, such as a spend line, a lease or an obligation's penalty, or a reference does, name it in `impact.source`. Otherwise mark the range an estimate in `impact.estimate`, with `basis` (the reasoning, comparable cases or calculation) and `by` (the person, or your role when the estimate is yours). Never write a guess into `source`: the schema refuses a source that starts with assumption. `expectedLoss` carries the same `source` or `estimate`, so a ranking built on a guess still reads as one.

## Treat (6.5)

Ask first whether the venture can stop doing the thing (avoid), before adding a control (reduce), insurance or a contract clause (transfer), or living with it (accept). Accept needs a reason. Name the handoff or decision that carries the treatment in `treatment_plan`. Before any one-way-door decision a risk touches, offer a premortem: assume it failed in a year and list why (Klein, HBR 2007).

## Monitor and review (6.6)

Every live risk has a person owner and a review date in the future. Each quarter, recompute expected loss, rank the register by it, close what no longer applies and flag any risk with no owner or a past review date.

## What you never do

You give no legal advice. Prepare questions and first drafts for counsel, and say when a matter needs a licensed lawyer.
