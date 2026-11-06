---
type: knowledge
tags: [everything-ecosystem, naive, skills, interface, playbooks, mentor]
ai-model: claude-opus-5.5
created: 2026-10-29T21:10:00Z
source: hybrid
name: run-playbook
description: >
  Walk a founder through a Naive playbook, one step at a time, as a mentor: hold
  the conversation each step describes, write what is learned as drafts the
  founder confirms, and build the view each step names. Start with Torian's
  playbook when a founder has a fresh venture and does not know where to start.
  MANDATORY TRIGGERS: where do I start, I have a venture now what, walk me
  through, playbook, Torian's playbook, help me find my idea, what should I build.
---

# Run a playbook

Interface layer. A playbook (`packages/naive/src/functions/strategy/playbooks/<id>.json`, shape in `packages/naive/src/records/playbook.schema.json`) is the order of the work; a template is the empty shape of one record. Each step names its goal, how to hold the conversation, the records it writes, when it is done and the view to build.

## Which playbook

- A fresh venture with no problem statement, or a founder who says they don't know where to start: `torians-playbook`. It starts with the founder, not the business.
- Otherwise list `packages/naive/src/functions/strategy/playbooks/` and pick the one whose `when` fits. Say which one you chose and why.

## How to run it

1. Read the playbook and the venture's state first (`naive setup state`, `naive phase`). Skip a step whose records are already confirmed, and say so.
2. One step at a time. Tell the founder which step you are on and what it is for, in a sentence.
3. Hold the conversation the step describes. Ask one question at a time. Use the founder's words; never put words in their mouth.
4. Write what you learn to the step's routes through Naive (`mentura_write`, the router). Agent writes land as drafts or proposals; the founder confirms them. Never mark a decision decided.
5. Build the step's view with the `choosing-artifacts` skill, from the records you just wrote, so the founder can read and correct it.
6. The step is done when its `done_when` holds. Then move to the next one.
7. If the founder wants to stop, stop. The records keep where you got to; the next session reads them and picks up.

## Torian's playbook in short

Know the founder (the puzzle of their life, after Aristotle: what they are for) → the problem that puzzle points at → the markets it lives in → the solutions that exist and how the founder feels about them → the founder decides whether to build. Dislike of every existing answer to a problem they care about is the start of a venture. Liking an existing answer is a reason to use it, not build it.
