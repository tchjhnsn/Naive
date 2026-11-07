---
type: research-program
tags: [naive, autoresearch, research-program, strategy]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
---

# Research program: Strategy

This is the strategy function's research program, `programs/strategy.md` in the venture. It tells the `strategy-researcher` role what to research and how. Naive copied it in from its starter (`packages/naive/src/functions/strategy/templates/research-program.md`) because the venture lists this function and had no program; it is yours now, and Naive never copies over it.

Only a person edits this file. Naive refuses every agent's write to it, the researcher's included. A person writes it whole with `mentura operations/research-program/strategy write --venture <id> --as person --input <file.json>`, where the file holds `{ "text": "..." }`.

## How the researcher works

- It follows Naive's research skill (`packages/naive/src/interfaces/skills/research/SKILL.md`): read this program, change one recipe at a time, read the experiment log, and stop at the budget.
- It reads the venture only as of the eval plan's read cut, and never sees the dev or holdout outcomes.
- It works only the patterns the strategy function owns, listed below.

## What to research

- Which competitor and market signals change a decision the venture owes, and how soon after they are observed.
- Which producers are reliable for this market, and how long their claims take to be confirmed or withdrawn.
- Whether a competitor is likely to raise in the next 90 days, as a forecast a person or a producer later resolves.

Say here what matters most to you, what the researcher must never trade away, and when to stop early.

## Patterns

### competitors/[id]/signals

What signals say about each competitor (`competitors/<id>/signals.json`, record type `competitor-signals`), projected from the competitor funding and product launch signal types. It settles its funding and launches by set overlap and its first and last seen dates exactly, over a 90 day horizon, and forecasts `p_raise_90d`, resolved by a competitor funding signal within 90 days.

- Start from the plain fold of the signal types it hears.
- Look for producers whose claims are later withdrawn, and for signals that arrive long after the event: lag and the producer's withdrawn share are factors the engine gives the recipe.
- A better recipe forecasts a raise before the funding signal arrives, or calls fewer signals salient without losing any confirmed event.
