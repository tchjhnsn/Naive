---
type: knowledge
tags: [everything-ecosystem, naive, skills, interface, autoresearch, recipes, research-program]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
name: research
description: >
  Naive's one generic research skill, for a function's researcher (the
  <function>-researcher role): read the function's research program, improve
  one recipe at a time against its frozen eval plan, read the experiment log,
  never see dev or holdout outcomes, and stop at the budget. The same loop for
  every function; the program says what to research. Every source names
  its research method, worked in order: standards, scientific,
  organizational, practitioner, stakeholder.
  MANDATORY TRIGGERS: research program, researcher, improve a recipe,
  autoresearch, run the research loop, experiment log.
---

# Research

Interface layer, for every function. This is the loop a function's researcher runs to improve the recipes its function owns, after karpathy/autoresearch (autoresearch design, everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md). A recipe is `<pattern>.recipe.ts`, one pure TypeScript module that makes every record at one projected route pattern. The program, `programs/<function>.md` in the venture, is the person's: it says what to research. This skill says how, and it is the same for every function.

The skill is Naive's file, not a venture record, so no route writes it: every researcher reads it and none edits it.

One pass of the loop is done when it has written one experiment line for one change to one recipe, or when it has said which of the stopping conditions in step 7 holds and stopped. A pass that read and thought and wrote no line is not done; say what blocked it.

## Who you are

- Your role is `<function>-researcher`, such as `strategy-researcher`. You work only the patterns your function's program lists.
- You read the venture only as of the eval plan's read cut. Give it with `reads_as_of` on every router call or `MENTURA_READS_AS_OF` in the environment. A researcher's read with no cut is refused, never served live, and a read as of the cut sees nothing written or observed after it (`packages/naive/src/router/reads-as-of.ts`).
- Nothing under `_eval/` is yours. The router refuses every agent's read or write there, so you never see a dev or holdout outcome.
- You never write the program. The router refuses every agent's write to `operations/research-program/<id>`, yours included (rule person-only), before anything else is checked.

## The loop

1. Read the program: `mentura operations/research-program/<function> read --venture <id>`. Take one pattern from its Patterns section and note what the person says matters, what you must not trade away and when to stop. With no pattern listed, there is nothing to research yet: say so and stop.
2. Read the pattern's eval plan, `<pattern>.plan.json` beside the recipe (route `evidence/eval-plan`): its read cut, horizon, weights, `min_gain` and its budgets. Every read after this one is as of `read_cut`.
3. Read the experiment log, `<pattern>.experiments.jsonl` (route `evidence/experiment`): what was tried, kept, discarded or failed against this plan's sha, the dev score and its margin, and how many dev evaluations are spent. Never repeat a discarded change.
4. Read the recipe (route `knowledge/recipe`) and the signals and facts it hears, as of the cut.
5. Get training feedback with `naive recipes check <pattern>`: per-row losses, settled and predicted records, noise disagreements. Only the training window answers this way.
6. Make one change to the recipe and write it to `recipes/<pattern>` as `{source, base}`, where base is the sha of the tip you edited from (read `recipes/<pattern>` first; the answer names the tip). The router lints it, runs training, scores dev against the tip and logs the experiment line. A keep lands as a held draft that becomes the tip; a discard or fail is refused with its verdict; a stale base is refused with the current tip. Sending the same write again returns the logged line and spends nothing. Through agent-files, editing `/<pattern>.recipe.ts` does the same, with the tip you read as the base; no other route writes a recipe. The verdict is computed inside the write, so you never supply a score.
7. Go back to step 3. Stop when the plan's dev budget is spent (counted from the log for this plan's sha), when the program says to stop, or when the person stops you. The unattended loop that stops itself at the budget is Mentura's (not built).

A person accepts a kept recipe with `mentura accept recipes/<pattern>`, which runs the one-bit holdout check: a pass writes it live, a fail leaves it a draft unless the person accepts over it, which is logged. You never accept your own work, and you never see a holdout score. After an accept, monitor compares the live recipe with the one before it on later points and proposes a rollback decision when it regressed.

## Research methods

Every source has a method, from the fixed list in `packages/naive/src/records/research-method.schema.json` (EE-233), worked in this order:

1. `standards`: a standards body or a law that defines the thing, cited by its own term, version and clause (EE-014).
2. `scientific`: peer-reviewed studies and systematic reviews, graded high to very low after GRADE.
3. `organizational`: the venture's own records. This is what a recipe hears, read as of the cut, and it is cited by record and hash.
4. `practitioner`: vendor docs, books, talks and open-source code, saying who wrote it and what they sell. Never the only support for a change you keep.
5. `stakeholder`: the person and the customers. The program is the person's word on what matters; never infer a value they did not state.

A change to a recipe rests on the venture's records first. When it also rests on something they do not hold, such as a standard's definition or a study, work the methods in order and say in your report which method each source came from. A source that backs one of Naive's defaults is recorded as a reference with its `method` through the find-reference skill (`packages/naive/src/functions/capabilities/skills/find-reference/SKILL.md`), which says how to work each method.

## Rules

- One change per experiment, so the log says what each change did.
- Prefer less code: a strictly smaller recipe that is no worse is kept.
- A recipe is pure: no import, no clock, no randomness, no file system, no network. It runs only in the sandbox (`packages/naive/src/engine/recipes/sandbox.ts`), whose lint refuses a subject id or signal address written as a literal. One recipe serves every subject.
- Every heard signal gets exactly one reception. Calling a signal noise means the record is the same without it. `node packages/naive/src/checks/check-recipes.ts` holds you to that across files (built): it renders the record again with each noise signal dropped and fails when the record changes. The training feedback of `naive recipes check` is not built (build plan item 5).
- Any throw, timeout or invalid output fails the whole experiment. Never drop hard rows.
- Forecast your honest probability. The score is a proper scoring rule, so hedging only costs you.
- You never resolve an outcome, label your own work, write a plan, the log, a reception or a projected record. Only people and producers resolve outcomes, and only the projector writes projected records.
- Never read or send anything under `_private/` to a model.

## What is built today

| Piece | State |
|---|---|
| The read clamp for researcher roles, and `_eval/` refused to every agent | built (`packages/naive/src/router/reads-as-of.ts`) |
| Programs are a person's: `operations/research-program/<id>`, writer person | built (`writerRule` in `packages/naive/src/engine/gate.ts`) |
| The record types: recipe, eval plan, experiment log, reception | built (`packages/naive/src/records/README.md`) |
| The sandbox and its lint | built (`packages/naive/src/engine/recipes/README.md`) |
| Eval sets, scoring, plans and the check command (`naive recipes plan`, `naive recipes check`) | built (build plan item 5) |
| The cross-file recipe check: recipe, plan, experiment log and receptions agree, and noise is noise by ablation | built (`packages/naive/src/checks/check-recipes.ts`, build plan item 11) |
| The recipe write route with its base sha and verdict | built (`recipes/<pattern>`, build plan item 6) |
| Accept with the holdout check, and the forward monitor | built (`mentura accept recipes/<pattern>`, `mentura recipes/<pattern> monitor`, build plan item 8); running monitor on each pull is not built |
| The starter recipe (`naive recipes init`), the pull rendering through a live recipe, receptions beside each record and hindsight | built (`packages/naive/src/engine/recipes/render.ts`, build plan item 9) |
| Knob search with no model | built (`naive recipes search <pattern>`, `packages/naive/src/router/orchestration/recipe-search.ts`) |
| Probes: a share of noise surfaced anyway and scored by inverse propensity | the draw, the mark and the estimate are built (`packages/naive/src/engine/recipes/probes.ts`); the pull does not mark them in the reception files it writes yet |
| The unattended loop with spend limits | Mentura, not built |
| Research methods: the fixed list, and every reference naming its method | built (`packages/naive/src/records/research-method.schema.json`, EE-233); a research program has no field naming its methods (not built) |
