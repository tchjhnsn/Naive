---
type: planning
source: hybrid
created: <% tp.date.now("YYYY-MM-DDTHH:mm:ss[Z]") %>
ai-model: <model>
authority: implementation
decision-status: in-force
status: READY
progress: "Not started."
governed-by:
  - "<the ADR or decision this executes>"
role: builder            # the position this handoff is assigned to (agent-roles.json id)
entity: "<entity>"       # where the position lives (decision levels)
domain: <domain>
serves: [<product or harness>]
owner: <position id>
session-id: "<id of the session that wrote this handoff>"      # Claude Code: from the scratchpad path; otherwise the runtime's run id, or unknown
parent-session-id: "<id of the session that assigned it, if any>"  # lineage: umbrella CoS -> ecosystem CoS -> role
handoff-status: ready     # ready | in-progress | escalated | done
claimed-by: ""            # session or run id of the agent that claimed it
pr: ""                    # PR link once opened
max-attempts: 3           # runs (claims) allowed before escalating to the Architect (EE-006)
run-cap: "2h"             # wall-clock or spend cap per run, e.g. "2h" or "$20"; reaching it escalates (EE-006)
attempts: 0               # incremented by each run that claims this handoff
tags: [handoff, v2]
---

# <Title>: handoff to <role> (<date>)

> Handoff contract v2 ([[FOUNDER_OPERATING_MODEL_CAMPAIGN_2026-10-14]] §4.4). You hold the decision rights below. **Do not report back to Claude or the founder for anything inside them.** Stop only on an escalation class (§4).

## 0. Where this lives and how it is picked up

- **Implementation handoffs** live in the code repo at `docs/handoffs/` and are listed in `docs/handoffs/index.json`; the vault work queue points to them (implementation-bound artifacts are canonical in the repo).
- **Other handoffs** (finance, research, design) live in the vault at `<entity>/product/planning/handoffs/`, listed in `<vault>/_meta/registers/work-queue.json`.
- **To claim (code handoffs):** open a draft PR titled `<id>: <title>` whose first commit sets `handoff-status: in-progress` and `claimed-by` in the index and this file. The open PR is the lock; if two exist, the older wins. Cursor automations open PRs but are not documented to push to main, so this replaces committing to main (see the repo's `docs/handoffs/PICKUP_AUTOMATION.md`).
- **To claim (vault handoffs):** set `handoff-status: in-progress` and `claimed-by`, commit and push; a rejected push means someone else claimed it.
- **Before claiming, check it is ready (EE-019):** run `node packages/naive/src/checks/check-ready.mjs <venture> <id>`. Any FAIL is a question for the author, asked before work starts; do not fill the gap yourself. When every item passes and the brief tells you enough to act, record it with `--record --by <you>`. An in-progress handoff without this record fails `check-execution.mjs`.
- **While working:** `in-progress`; on an escalation, `escalated` and write §7; when done-criteria pass and the PR is up, `done` with `pr`.

## 1. Outcome

One paragraph: what exists when this is done, and why (the decision it executes).

## 2. Work

Numbered steps or workstreams. One PR per workstream.

## 3. Your decision rights

From `everything-ecosystem/venture-template/decision-rights.json` (and `<entity>/_meta/registers/decision-rights.json` if it tightens any class). List the classes that apply:

| You decide | Level |
|---|---|
| Implementation inside this handoff | decide |
| Accepting work that passes the done-criteria in §5 | decide |
| Schema change inside the governing ADR, via the documented procedure | decide-inform |
| Security tightening | decide-inform |

**Research:** you may research anything this work needs (current docs, APIs, library versions, prior art). Record new sources in the source register. If a finding would change a decision above your level, escalate it; do not act on it.

## 4. Escalate only for

| Class | Goes to |
|---|---|
| Contradicts an in-force ledger decision or ADR | Architect, then founder |
| Security loosening; irreversible data change; new structure without an ADR | Architect |
| Money, legal terms, anything public, production ship | Founder (or named delegate) |
| `attempts` reached `max-attempts`, or a run hit `run-cap` (EE-006) | Architect |

Write the question in §7 and continue any work it doesn't block.

## 5. Done-criteria (conformance, checked by CI or scripts)

Each criterion is objectively checkable. Name the command or test:

- [ ] `<command>` passes
- [ ] `<golden or invariant>` holds
- [ ] **Self-proof (EE-006):** `<the command or skill that exercises the change for real, e.g. drive the running app to the changed screen>`; evidence (screenshot, log or output) attached to the PR. Tests passing is not this step.

Classes marked for Architect review (fit to intent), if any: <list, or "none">.

## 6. Report (to the PR and registers, not to a person)

- PR link and description: what changed, criteria results, anything unexpected.
- Update affected registers (dependency, risk, open questions) and run their renderers.
- Record decide-inform decisions in the PR description.
- Put this handoff's `session-id` and your own run or session id in the PR description, so work traces back through the chain (source S-001).
- If something failed for a reason that could recur (a wrong path, a missed convention, a check you had to run by hand), name the lesson and propose the check one rung higher that would catch it next time: prose, skill, rule, static analysis, code (EE-006). The Architect decides whether to add it.

## 7. Escalations

(Write here. Each: class, question, what is blocked, what continued.)
