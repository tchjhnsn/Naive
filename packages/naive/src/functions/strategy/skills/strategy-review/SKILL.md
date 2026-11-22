---
type: knowledge
tags: [naive, skills, strategy, strategy-review]
ai-model: claude-opus-5.5
created: 2026-11-22T00:16:06Z
source: hybrid
name: strategy-review
description: >
  Run the strategy agent's fixed-cadence strategy review: read what the evidence
  says since the last review, test the venture's strategy against a diagnosis,
  guiding policy and coherent actions, check each bet's kill criteria, compare
  intended with realized strategy, and bring every strategic choice to the founder
  as a prepared decision. Use in the strategy-review workflow step and whenever the
  founder asks "should we keep going", "pivot or persevere", "is this still the
  right customer" or "what is our strategy".
---

# strategy-review

You prepare the review; the founder decides. Every change to the telos, the chosen customer, the product line, or whether to continue is a one-way door (`strategy-or-constitution`, `change-direction`, `continue-or-stop`) and goes to the founder as a decision with options and evidence.

## Cadence

Hold the review on a fixed date, not when someone feels like it (Ries, *The Lean Startup*, pivot or persevere). In validation, every four to six weeks; from beachhead, every quarter. The workflow runs monthly and you skip a month only when the venture is past validation and the quarter is not over. These numbers are inference, not a published rule.

## Steps

1. **Read the evidence since the last review.** Validation records (`validation/*`), interviews and feedback, competitor signals (`purpose/competitor-signals/[id]`), the money summary, decisions taken, and what the venture actually spent time and money on (handoffs and spend). Cite each source by route.
2. **Test the strategy as a kernel** (Rumelt, *Good Strategy Bad Strategy*, 2011). Write down the diagnosis of the crux, the one guiding policy and the coherent actions that follow. If the records hold only goals and no diagnosis, say so plainly: a list of goals is not a strategy.
3. **Test each choice for a real opposite** (Lafley and Martin, *Playing to Win*). A choice whose opposite no sane competitor would make is a platitude. Check that the venture core names what the venture will not deliver, and that at least one request was refused because of it (Porter, "What Is Strategy?", 1996).
4. **Check kill criteria.** Each live bet needs a state and a date set in advance (Duke, *Quit*, 2022). A bet with a state but no date, or a date but no state, fails. When a bet's criteria are met, raise `continue-or-stop`; never decide it.
5. **Check default alive** (Graham, "Default Alive or Default Dead?", 2015). From the money summary: at current growth and burn, does the venture reach profitability before cash runs out? If not, say that growth, burn or funding must change before anything else.
6. **Compare intended with realized strategy** (Mintzberg and Waters, 1985). Name what the venture actually did. A pattern that differs and works is evidence to write into the strategy, not a deviation to suppress.
7. **Name the next assumption to test.** For each live option, write what would have to be true, and propose testing the condition the founder is least sure of first (Lafley and Martin). Work the make-or-break uncertainty before visible easy work. Raise the order as `set-priorities` to the strategy lead.
8. **Prepare decisions.** For each choice that the evidence puts in question, open one decision with the options, the evidence for each, what would change your recommendation, and your recommendation. Before any one-way door, list at least five ways it could fail a year from now (Klein, premortem, HBR 2007).

## What you write

Goals and exit criteria only as drafts the founder confirms. Decisions under `decisions/*`. Nothing about the telos or the chosen customer changes until the founder decides.

## What you never do

Accept a goal list as a strategy. Decide to stop, continue or change direction. Treat a contested rule above (cadence, OKR attainment targets) as settled.
