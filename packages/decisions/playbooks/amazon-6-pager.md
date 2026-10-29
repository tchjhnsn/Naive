---
type: playbook
source: ai-drafted
created: 2026-10-29T22:30:00Z
ai-model: grok-4.7
tags: [naive, playbook, decisions, amazon-6-pager, draft]
---

# Narrative memo for a decision

This is a draft. It does not decide anything for the founder. It is a way to fill `decisions/<id>` before a person decides it.

The memo moves through three states. **Draft:** the record exists, `status` is `open`, and `answer` is empty. **Proposed:** `answer` holds the recommendation you are willing to defend, and `status` is still `open`. **Decided:** a person has approved it. The memo never does that step. `schema/decisions.mjs` `approve()`, reached by `mentura decide`, is what sets `status` to `decided`.

## What the source method does

Amazon's 2017 shareholder letter says the company does not use slide presentations. It writes narratively structured six-page memos, and a meeting starts with the room reading one in silence, which the letter calls a study hall. The letter says a strong memo is rewritten, shown to colleagues, set aside, and edited again, and that this often takes a week or more rather than a day or two. It also says that, by tradition, the authors' names are left off the memo, because the memo is from the team. [2017 Letter to Shareholders](https://www.aboutamazon.com/news/company-news/2017-letter-to-shareholders)

A later Amazon page on interviews describes the same habit for some roles: narratively structured memos, a silent read at the start of the meeting, papers that generally run from one to six pages, and a paper that states the goal, the approach, the outcome, and the next steps. [What's it like to interview at Amazon?](https://www.aboutamazon.com/news/workplace/whats-it-like-to-interview-at-amazon)

Amazon published an excerpt from *Working Backwards* by Colin Bryar and Bill Carr, former employees, describing a second narrative they call the PR/FAQ (press release and frequently asked questions). The excerpt says most of the company's major products and initiatives since 2004 were created through a process called Working Backwards: define the customer experience first, then work backwards until the team is clear about what to build. The press release is the customer experience in a few paragraphs, always under one page. The FAQ holds the detail, including how expensive and hard the work is, and the excerpt says the FAQ should be five pages or less. The excerpt says it is not unusual for a team to write ten drafts or more and to meet senior leaders five times or more. A draft starts with the person who had the idea. In the review meeting everyone reads it, senior people speak last, and the group then goes line by line. The writer sends notes and revises. The excerpt says that, in the authors' time at the company, most of these documents were never launched, and that choosing what not to build is part of the point. The document does not grant itself approval. Leadership decides later whether to keep going. [An insider look at Amazon's culture and processes](https://www.aboutamazon.com/news/workplace/an-insider-look-at-amazons-culture-and-processes)

The authors' own write-up of the same method adds the shape of the press release and the shape of the meeting. The press release names the customer in one sentence, states the problem in the customer's words, describes the solution in enough detail to see that it meets that problem, says how it differs from what the customer does today, and closes with how someone would start. The FAQ answers questions a customer or a reporter would ask, then questions the people who would have to fund and staff the work would ask, including cost, risk, and reasons not to build. Their meeting note says the document is read in silence for 15 to 20 minutes of a one-hour meeting, and that the point of the meeting is to understand and improve the idea. A go or no-go comes when the document is far enough along to decide, not when the first draft is finished. [The Amazon Working Backwards PR/FAQ Process](https://workingbackwards.com/concepts/working-backwards-pr-faq-process/)

The six-page narrative and the PR/FAQ are related and not the same artifact. The shareholder letter is about the memo a meeting reads. The PR/FAQ is the customer press release plus the FAQ, and the authors say a first draft of that document can be a few hours, with the quality coming from later drafts. This playbook uses both: a short customer narrative, then an FAQ, written as one decision memo the founder can re-read. It does not set a deadline of a week, of ten drafts, or of 15 minutes. Those are reports about Amazon, not quotas for this venture.

## Trademark

Amazon's name, smile logo, and Leadership Principles are Amazon's. *Working Backwards* is the title of Bryar and Carr's book. PR/FAQ is their name for this document. This playbook borrows the method. It does not use Amazon's name, logo, or slogans as the venture's brand, and it does not copy their sample announcements or their principle text.

## Before you start

The venture already has these records. Read each route. If a read comes back missing, stop. Do not invent the customer, the problem, or the principle.

| Read | Route | What you copy |
| --- | --- | --- |
| The problem, in the customer's words | `foundation/problem` | `statement`, and `workarounds` if it has them |
| Who it is for | `foundation/icp` | The profile with `primary: true`, its `id` and `who` |
| What the venture will not do | `foundation/alignment` | Each principle `id` and `statement` |
| Who is allowed to decide | `governance/decision-rights` | The class `id`, its `owner`, and its `level` |

This playbook does not read `ideas/map`. That record may not exist. If you already have idea ids, you may set `ideas` on the decision. Do not read a route to fetch them.

## Template

The record is `decisions/<id>`. The route is `decisions/[id]`. The id is lowercase letters, digits, and hyphens, because a write to that route rejects any other id. Use one id for the whole memo.

`status` in every write below is `open`. Do not set `decided_by`, `decided_at`, or `provenance.approved_by`. Those belong to the person who decides, after this template is done.

### 1. Draft

Write `decisions/<id>` with a question and nothing else filled in. This is the draft.

- Read `foundation/problem`, `foundation/icp`, `foundation/alignment`, and `governance/decision-rights` first.
- Write `decisions/<id>`.
- `question` is the decision, as a question.
- `status` is `open`.
- `needed_in` is the phase you are in. Run `governance/decisions` and use the phase it reports.
- `decides.record` is optional. If this decision settles one record type, name that type. Otherwise omit `decides`.
- Leave `answer` unset. Leave `options` unset. Leave `note` unset or empty.
- `provenance.drafted_by` records who wrote it. An agent uses `mentura propose --venture <id> --input <file.json>`, which calls `propose()` in `schema/decisions.mjs`. That function refuses any `status` other than `open`, forces `status` to `open`, and sets `drafted_by.kind` to `agent`. A person can instead write the route `decisions/<id>` themselves, still with `status` `open`.

### 2. Customer narrative

Write the press-release shape into `note` on the same record. This is still a draft. `status` stays `open`.

- Read `decisions/<id>` (the draft from step 1).
- Read `foundation/icp` and copy the primary profile `id`. Read `foundation/problem` and copy `statement` unchanged. Read `foundation/alignment` and keep the principle you must not break.
- Write `decisions/<id>` again. `status` is `open`. `answer` is still unset.
- `note` uses these labels, each on its own line. The words after `Customer:` and `Problem:` are copied from the records, not rewritten from memory.

```text
Customer: <primary profile id>
Problem: <statement copied from foundation/problem>
Solution: <how this meets that problem, in the customer's words>
Difference: <what they do today, from workarounds if the problem record has them, and how this differs>
Principle: <alignment principle id this must not break>
```

The solution is yours. Do not paste a sample announcement from Amazon or from the book.

### 3. Record the finding the FAQ depends on

The internal FAQ needs a fact the venture may not have yet: a cost, a risk, or a reason not to build. Write that fact before the FAQ cites it. The route is `evidence/[id]`.

- Write `evidence/<finding-id>`.
- `id` matches the route id.
- `subject.kind` is `venture` and `subject.id` is this venture.
- `results` has one entry whose `output` is the fact, in your words, with where it came from.
- `passed` is whether you accept the fact as usable in the memo, not whether the decision is yes.

### 4. FAQ

- Read `evidence/<finding-id>` (step 3). Read `decisions/<id>`. Read `foundation/alignment` again if you are unsure the recommendation breaks a principle.
- Write `decisions/<id>`. `status` is `open`.
- `options` has at least two strings. One of them starts with `Not doing it: ` and says what stays the same if you stop. The others are real alternatives, including the one you lean toward.
- `outcomes` has a risk. Its `id` is `main-risk`, `projected` is how this fails, and `evidence` is a list containing the finding id from step 3.
- Add these lines to `note`:

```text
External FAQ: <a question a customer would ask, and the answer>
Internal FAQ: <the cost, the risk, or the reason not to do it, citing the finding id>
```

### 5. Propose

The recommendation is one sentence in `answer`. The record is still not decided.

- Read `decisions/<id>` and check that `note` has the labels from steps 2 and 4, that `options` has the "Not doing it" line, and that `outcomes` cites a finding you can read back at `evidence/<finding-id>`.
- Write `decisions/<id>` with that `answer` and `status` `open`.
- Prefer `mentura propose`. If the input says `status` is `decided`, `propose()` returns an error and does not write. A raw write of the same route can store `status: "decided"` with no `approved_by`. Do not do that. The check below fails when it sees it.

### 6. Read it back

Run `governance/decisions`. The memo is on the matrix with `status` `open`. In the authors' meeting, the room would read this document before anyone argues. Here, you re-read `decisions/<id>` the same way: the record is the memo. Then revise by writing `decisions/<id>` again, still `open`. `propose()` refuses to change a record that is already `decided`, so revision happens before a person decides.

### 7. A person decides

This step is not the memo. Do not set `status` inside the template.

The person named as `owner` on the class you read from `governance/decision-rights` runs `mentura decide <id> --venture <venture> --by <their name>`. That calls `approve()` in `schema/decisions.mjs`. It sets `status` to `decided` and `provenance.approved_by` to that name. It refuses a record that is already decided, and it refuses when there is no `answer` to approve. An agent does not run it.

`schema/decisions.mjs` treats a decided record in Discovery as a working draft (`firmness` `working`). In a later phase the same status is `firm`. Either way, the memo did not set it.

## Checks

Run these against the records. Each one can pass or fail. A fail means the memo is not ready to hand to the person who decides. It does not mean the venture should proceed.

| Check | Pass | Fail |
| --- | --- | --- |
| Customer | Read `decisions/<id>` and `foundation/icp`. `note` contains `Customer: ` plus the primary profile `id`. | The label is missing, or the id is not the primary profile. |
| Problem | Read `decisions/<id>` and `foundation/problem`. `note` contains `Problem: ` plus the record's `statement`, copied unchanged. | The problem route is missing, or the statement is not in `note`. |
| Solution | `note` matches `Solution: ` followed by text. | The label is missing or the rest of the line is blank. |
| Principle | `note` contains `Principle: ` plus an `id` you read from `foundation/alignment`. | Alignment was not read, or the id is not in that record. |
| FAQ | `options` has at least two entries and one starts with `Not doing it: `. Some `outcomes` entry has `id` `main-risk`, a non-empty `projected`, and an `evidence` id. Read `evidence/<that id>` and the record is there. | An option is missing, the risk has no finding, or the evidence read is missing. |
| Still open | After step 5, `status` is `open`, `answer` is a non-empty string, and `provenance.approved_by`, `decided_by`, and `decided_at` are absent. | `status` is `decided`, or an approver is already set. This is the memo marking itself decided. |
| A person decided | After step 7 only: `status` is `decided` and `provenance.approved_by` is the person who ran `mentura decide`. Until then, `status` is not `decided`. | `status` is `decided` and `approved_by` is missing. |

The incomplete draft from step 1 fails Customer, Problem, Solution, Principle, FAQ, and Still open. That is the point of those checks. The finished proposal passes them and stays open until step 7.
