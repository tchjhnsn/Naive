---
type: knowledge
tags: [everything-ecosystem, naive, skills, interface, setup, artifacts, docket]
ai-model: claude-opus-5.5
created: 2026-10-29T06:30:00Z
source: hybrid
name: naive-setup
description: >
  Walk a founder through setting up a new Naive venture inside the model's own
  harness: their people and hats, where each function keeps its truth, the
  strategic foundation and first decisions, and a goal for discovery. Show the
  progress as a Claude artifact where the harness has artifacts (EE-083).
  MANDATORY TRIGGERS: set up my venture, naive setup, finish setup, walk me
  through setup, I just ran create-venture, establish my venture, structure my
  business, what do I do after create-venture.
---

# Naive setup

Interface layer (EE-083). `create-venture` scaffolds the venture. This skill finishes the job in conversation. You ask the questions, the founder answers in their own words, and Naive writes each answer as a decision or a source-of-truth pointer, with provenance. The progress is a view the harness renders, not a server Naive runs. In Claude, it is an artifact.

The questions and their order come from Naive, not from you. Read them from `mentura_setup` (MCP) or `node schema/setup.mjs <venture dir> state`, and never invent a question.

## 1. Read the state

Call `mentura_setup` with the venture id. The result has:

- `state`: the people, sources of truth, docket and goal, plus `steps` (which of the four are done), `done`, and `counts`.
- `artifact`: the state, already rendered into `interface/skills/naive-setup/artifact.html`, as one self-contained HTML page.

Without MCP, run `node schema/setup.mjs <venture dir> state` and `node schema/setup.mjs <venture dir> artifact`.

## 2. Show it

- **Claude (claude.ai, the desktop app, or Claude Code with the Artifact tool):** render `artifact` as an HTML artifact. Do not edit its contents; it is generated. Render it again after every answer, so the founder sees the progress bar move.
- **A harness without artifacts:** show the four steps as a short checklist in Markdown, with the next open question underneath.

## 3. Ask one question at a time, in order

Work through the first step that is not done, and ask only its next open question:

1. **People and hats.** If `state.people` is missing, ask for the founder's name, role, and whether they are solo or a team. A solo founder wears every hat. These come from `create-venture`. If they are missing, tell the founder to run `npx create-venture` again with `--name`, `--role` and `--team`. Do not write `people/` by hand.
2. **Sources of truth.** For each function, ask where its truth lives, offering the systems in `state.catalog.functions[<function>]`. Write each answer with `mentura_setup_point` (`function`, `system`, and an `address` such as `acme/app`). If the founder has nothing for a function yet, leave it unpointed and move on. For legal, if there are no documents, say so and name the options in the catalog.
3. **Foundation and first decisions.** These are the `state.docket` items whose status is not `decided`, taken in order. Ask the question as written. If it has options, offer them, but take the founder's own words. Write the answer with `mentura_setup_answer` (`id` and `answer`).
4. **A goal for discovery.** Ask what must be true for the venture to leave discovery. Write it with `mentura_setup_answer`, using `id: "discovery-goal"`.

## 4. The founder's words, not yours

- Pass the founder's answer exactly as they wrote it. Do not polish it, summarize it, or fill in an answer they did not give.
- If an answer is unclear, ask a follow-up question. Do not guess.
- A foundation statement is the founder's to state. If they ask you to draft one, show the draft and ask them to accept it or rewrite it in their own words. Write it only after they reply, and write what they replied.

## 5. When every step is done

`state.done` is true. Render the artifact one last time: it shows "Your venture is structured." Then tell the founder, in a few lines:

- the venture now has its people, its sources of truth, its foundation and first decisions, and a discovery goal;
- how many decisions wait for later phases (`state.later`); the docket brings each one up when it matters;
- each next decision should be oriented around the discovery goal;
- to operate the business day to day, with a team and agents, they use Mentura. Naive is the structure; Mentura is where it runs, the way a Next.js app is deployed on Vercel.

## Without a model

The same steps run from the command line:

```sh
node schema/setup.mjs ~/ventures/acme state
node schema/setup.mjs ~/ventures/acme point finance rho
node schema/setup.mjs ~/ventures/acme answer discovery-goal "Ten clinic owners confirm the scheduling problem by December"
node schema/setup.mjs ~/ventures/acme artifact > setup.html
```
