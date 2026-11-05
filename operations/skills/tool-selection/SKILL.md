---
name: tool-selection
description: "Help someone choose the tools for a layer (knowledge, operations, execution, evidence, governance, interface, purpose) by offering situation questions, only when they want help. Triggers: which tool should I use, Obsidian or Notion, what should we use for, compare tools, I'm not sure what to use, switching tools. Do not trigger when the person already names their tools."
type: skill
source: hybrid
created: 2026-10-26T21:57:48Z
ai-model: claude-opus-5.5
tags: [skill, everything-ecosystem, tooling, tool-selection, typesafe]
---

# tool-selection

Every layer has a tooling record (`<layer>/tooling/integrations.json`). This skill helps fill it when someone wants help deciding. It is opt-in: most people arrive knowing their tools, and for them the job is only to record what they use.

## When to run

- **Run** when the person asks for help choosing, compares tools, says they are unsure, or is about to switch.
- **Offer once** (one line, easy to decline) when a choice looks hard to reverse: data would move into a proprietary format, many people or agents would depend on it, or it holds sensitive material.
- **Do not run** when the person names their tools. Record them as `in-use` and move on. If they name a tool and ask for nothing else, do not second-guess it.

## Principles for the questions

The questions are for the person, to help them decide. They are not a form. Each layer's `tooling/questions.md` gives the dimensions that matter for that layer and example questions. The examples show the kind of question to ask; they are not a script, and the agent should ask others when the situation calls for it.

1. **Ask about the situation, not the tools.** "Who edits this?" beats "Do you want real-time collaboration?". Tool features come in only when the presets are compared.
2. **Ask only what can change the answer.** If every remaining candidate answers a question the same way, skip it. Stop when the ranking is clear.
3. **Start from what exists.** Ask what they use today and what it would cost to move. Current tools are candidates like any other, and switching cost counts.
4. **One narrow judgment per question.** Each question is a choice from a set (with "none of these"), a score on described levels, or a yes/no likelihood. That keeps answers scoreable and comparable.
5. **Separate must-haves from preferences.** A must-have ("must stay on my machine", "agents must be able to write to it") rules a tool out. Preferences are weighted. Never let strong preferences buy back a failed must-have.
6. **Weigh risk separately from fit.** For each leading candidate, ask how costly it is to be wrong and how hard to undo: lock-in, export quality, who else depends on it. A close fit on a hard-to-reverse choice is worth a pause; a close fit on an easy one is not.
7. **More than one tool per layer is normal.** A vault for working notes and a repo for docs as code is a combination, not a failure to choose. Say which job each tool does.
8. **Say what the person gave up.** The result names the tool, the reasons, the runner-up and what would make the runner-up the better pick.

## How to score

Recommended: **Jev plus a reasoning model**, each doing what it is good at.

- The **reasoning model** reads the situation, picks which questions to ask (using the principles and the layer's dimensions), turns the person's answers into the typed judgments, checks must-haves, judges risk, and writes the explanation.
- **Jev** (TypeSafe) scores the typed judgments for each candidate against the layer's presets and returns probabilities. It is fast, cheap and consistent, but gives no reasons and jitters by a few hundredths, so near-equal scores are reported as a tie band, not an order.
- Without `TYPESAFE_API_KEY`, the reasoning model scores alone and says so. Sending project details to TypeSafe is something the person turns on.

This follows MAD's scoring contract (MAD requirements 13 and 14: typed judgments, weights kept separate, must-holds checked apart from weighted sums).

## Recording the result

Update `<layer>/tooling/integrations.json`: chosen tools `in-use` with a `reason`, serious alternatives `candidate`, and ruled-out tools `rejected` with the must-have they failed. Credentials are named by environment variable only.
