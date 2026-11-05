---
type: playbook
source: ai-drafted
created: 2026-10-29T22:20:00Z
ai-model: grok-4.7
tags: [naive, playbook, validation, lean-startup, mom-test, draft]
---

# Lean validation

Draft. You decide what the problem is. This playbook fills an interview plan and evidence on `foundation/problem`. It does not decide the claim for you.

Run a step from the repo root:

```sh
node interface/cli/mentura.mjs <route> <action> --venture <id> --json
```

An agent's write of `foundation/icp/<profile id>` or `foundation/problem` lands as a draft. Accept it before you read it back or run the assessment:

```sh
node interface/cli/mentura.mjs accept foundation/icp/<profile id> --venture <id> --confirm foundation/icp/<profile id>
node interface/cli/mentura.mjs accept foundation/problem --venture <id> --confirm foundation/problem
```

A person at the keyboard writes with `--as person`. The reads and the assessment see the accepted file. A draft is not that file.

## What the methods do

### The Lean Startup

[The Lean Startup methodology](https://theleanstartup.com/principles) is Eric Ries's process for building under uncertainty. The page defines the work as getting a product to customers faster by testing a vision, and it says many startups fail because they never spoke to prospective customers before perfecting a product.

The same page says a startup is a human institution designed to create a new product or service under conditions of extreme uncertainty. The questions it names are whether this product should be built, and whether a sustainable business can be built around it. "Can it be built?" is the wrong question. Progress is validated learning: experiments that test each element of the vision. The build-measure-learn loop starts by figuring out the problem that needs to be solved. The five principles on that page are: entrepreneurs are everywhere, entrepreneurship is management, validated learning, innovation accounting, and build-measure-learn.

[Lean Startup Co.](https://leanstartup.co/resources/articles/4-misapplications-of-the-lean-startup-and-how-you-can-avoid-them/) describes the risky assumptions in that vision as leap-of-faith assumptions. The examples it gives include which customer segment to target and which problem is worth solving. The same article says the method is not asking customers what they want and then building that. Experiments should get as close as possible to a real reaction, and they should measure what customers actually do.

This playbook uses that slice of the method: name the segment and the problem as assumptions, then learn from what people already do. It does not run the later build-measure-learn loop. Pricing, a solution test, and a growth hypothesis are other records (`validation/pricing`, `validation/solution`).

### The Mom Test

[The Mom Test](https://www.momtestbook.com/) is Rob Fitzpatrick's handbook for customer conversations when people are not telling you the truth. The site describes it as a way to get reliable, non-biased feedback on a business or product before it exists, including how to avoid biased feedback and how to tell whether someone is really going to buy.

On the [teacher page](https://www.momtestbook.com/teachers) Fitzpatrick lists the parts he asks classes to use: turn bad questions into good ones, recognise the three major causes of bad and biased data, use commitment and advancement to validate early interest, pick three learning goals (the "important questions"), and decide the commitment you will ask for before the meeting.

In [a 2022 essay](https://robfitz.com/c/writing/bias-is-never-0-validation-is-never-100-context-and-pragmatism-in-custdev/) he writes that a conversation will not be free of bias. Keep the bits that are clean, ignore the bits that are biased, and then choose whether to learn more or to try something.

The question wording this framework already uses is `purpose/kits/validation/templates/problem-interview.md`. The kit's reference for that template is Rob Fitzpatrick, *The Mom Test* (2013), in `purpose/kits/validation/references/references.json`.

### Trademark

"The Lean Startup" and "The Mom Test" are the authors' book titles. This playbook borrows the method. It does not use their covers, diagrams, or slogans, and it does not say that Eric Ries or Rob Fitzpatrick endorse the venture. Cite the books. Do not use the titles as a product name.

## Template

Each prompt names the route it reads or writes. Read a missing record as missing. Do not fill it from memory.

### 1. Who you will talk to

Read `foundation/icp`.

`foundation/icp` lists the profiles, keyed by id. It has no write. If the read is not found, write one profile to `foundation/icp/<profile id>` before you go on, using `schema/icp-profile.schema.json`. One primary profile is enough: `id`, `who` (specific enough to find ten of them), `primary`, `where_to_find`, and `not` (who is out). Then read `foundation/icp` again.

Prompt: which profile is primary, where you can actually reach those people, and who you will not interview.

Use that profile as the people you talk to. Friends and peers who are outside it are the wrong audience. The problem's `segment` names the same people in the problem's own words. Do not copy the profile into a second record.

### 2. The claim you are testing

Read `foundation/problem`.

Write `foundation/problem` with the assumption you are about to test:

| Field | Prompt |
| --- | --- |
| `statement` | The problem in their words. Leave the product out of the sentence. |
| `segment` | The people from the profile you just read. |
| `cost` or `workarounds` | What it costs them now, in time, money, or risk, or how they cope today. |
| `why_now` | What changed that makes this urgent or solvable now. |
| `evidence` | `[]` until you have notes. |

This is the leap-of-faith claim. It is not a finding yet.

### 3. The interview plan

Run `purpose/validation/assess`.

If it asks for a claim field (`statement`, `segment`, `cost` or `workarounds`, `why_now`), fill that field and run it again. If it asks because an assumption has no evidence yet, those assumption names are the learning goals. Pass `--as-is` only if you want the labels anyway. They will be assumed or unknown, and `blocking` names the next test.

Keep at most three learning goals. Fitzpatrick's teacher page treats three important questions as the plan.

Write `raw/sources/problem-interview-plan`:

| Field | Prompt |
| --- | --- |
| `id` | `problem-interview-plan` |
| `origin` | `founder-supplied` |
| `title` | The learning goals in one line, and the commitment you will ask for (time, a next meeting, or an introduction). |
| `fetched` | The date you wrote the plan. |

Read `raw/sources/problem-interview-plan` back. If it is not found, stop.

In the conversations, use the questions in `purpose/kits/validation/templates/problem-interview.md`. Ask about a specific time it happened, what they did, what it cost, and what they already pay for. Decide the commitment before you meet. A compliment, a general wish, or a guess about a future product is biased data. Ignore it. Do not pitch.

Raw records are immutable. A new plan is a new id. Do not edit this one.

### 4. The notes

After the conversations, write `raw/sources/problem-interview-notes` the same way (`id` `problem-interview-notes`, `origin` `founder-supplied`, `title` naming the batch, `fetched` the date of the conversations).

Save the notes at `raw/sources/problem-interview-notes/text.md`. That is the file `purpose/raw/text/problem-interview-notes` reads. That route has no write.

Read `purpose/raw/text/problem-interview-notes`. If it is not found, the file is not there yet. Do not write evidence.

Keep names out of the notes, or keep the file out of a public repository. `purpose/kits/validation/skills/problem-validation/SKILL.md` says the same thing.

### 5. Evidence on the problem

Write `foundation/problem` again with the claim from step 2 and one evidence item per finding. Each item cites `source.path` `raw/sources/problem-interview-notes/text.md`.

| Field | What to put |
| --- | --- |
| `id` | A short id, unique in the record. |
| `kind` | `behavior` if they already spent time or money. `commitment` if they gave time, made an introduction, or booked a next step. `stated` if they described a specific past event. `opinion` for praise or a guess about the future. `desk-research` for a published source, with `source.url` and `source.checked`. |
| `summary` | What the notes show, specific enough to check. |
| `supports` | `false` when the notes go against the claim. |
| `audience` | `target` for the profile you read. `wrong` for everyone else. The wrong audience does not count. |
| `sample.n` | How many people this item comes from. |
| `specificity` | `specific` for a past fact. `general` for a hypothetical. |
| `collected` | The date of the conversation. Not a future date. |
| `assumption` | `exists`, `segment`, `hurts`, or `why-now`. An item with no assumption counts toward `exists` only. |
| `origin` | `first-hand` when the notes are yours. |

Do not invent a count, a quote, or a source. A missing source stays an open question.

`schema/assess-problem.mjs` demonstrates an assumption only for first-hand `behavior` or `commitment` from the target segment, five or more people, collected within 18 months. Anything else from a target, adjacent, or unknown audience infers. That bar is this framework's, in that file (`MIN_SAMPLE`, `MAX_AGE_MONTHS`).

## Checks

Both of these can pass and can fail. `verification/playbook-lean-validation/replay.mjs` runs them on a fixture venture.

### The source check

```sh
node interface/cli/mentura.mjs foundation/problem check --venture <id> --json
```

This runs `schema/check-validation.mjs`.

It fails, and the command exits 1, when an evidence item cites a path that is not in the venture folder, a URL with no `checked` date, a `collected` date in the future, or a repeated id.

It passes, and the command exits 0, when those are clean. A pass can still be a claim with no evidence. The grader then marks that record very low. That is not "the interviews worked."

### The learning check

```sh
node interface/cli/mentura.mjs purpose/validation/assess run --venture <id> --json
```

It asks, and does not assess, when there is no accepted problem record, or when `statement`, `segment`, `cost` or `workarounds`, or `why_now` is missing, or when an assumption has no evidence yet. A draft does not count as the record.

When it assesses, `supports` is `explore`, `prototype`, `charge`, or `raise`. It worked for the commitment you are about to make when `blocking` is empty for that next rung. It did not work when a blocking test remains. The result names the next test. Missing evidence stays unknown or assumed.

`schema/assess-problem.mjs` reads `foundation/problem.json` when that file is present, and `purpose/validation/problem.json` when that is the only copy. Those are the two files on the `foundation/problem` route.
