---
type: knowledge
tags: [everything-ecosystem, skills, linear, roadmap, anti-burial, sad]
ai-model: composer-2.5
created: 2026-08-03
source: hybrid
name: linear-workflow
description: >
  Operate Linear as the anti-burial navigation layer for SAD workspaces:
  Initiatives = ends/goals, Projects = subsystem or ship tracks, Issues =
  status-bearing work with vault pointers. Enforce session start/end
  contracts so actionable work never lives only in vault .md files.
  Synthesizes Linear's conceptual model with idea-182 (cycles) and
  idea-183 (initiatives). Auto-loads when planning roadmaps, creating
  issues, opening Cursor sessions against product or methodology work,
  or when the operator says they feel lost, buried, or unsure what
  to do next. MANDATORY TRIGGERS: linear, initiative, cycle, backlog,
  roadmap, buried, lost in the project, what should I work on,
  create an issue, file this, anti-burial.
related:
  - "[[industry-awareness]]"
  - "[[session-capture]]"
  - "[[idea-182-cycles-as-time-oriented-needle-moving]]"
  - "[[idea-183-initiatives-goal-bounded-aggregation]]"
---

# Linear Workflow Skill

Linear is not a second vault. It is the **navigation layer** so a non-CS-native
founder does not get lost in `.md` depth.

## Source-of-truth split

| Layer | Owns | Does not own |
|---|---|---|
| **Vault** | Vision prose, research, ADRs, schema drafts, session logs | Daily “what am I doing / what’s blocked” |
| **Linear** | Ends → projects → issues; status; active now; buried-idea recovery | Long-form reasoning (link out) |
| **Code** | Implementation truth | Product intent |

**Rule:** If it can change status, it is an **issue**. If it is a multi-issue
outcome, it is a **project**. If it is *why* several projects exist, it is an
**initiative**.

## Linear concepts → usage

| Linear | Mapping |
|---|---|
| **Initiative** | Goal / end (Mission slice). Matches idea-183 — goals ≠ ownership. |
| **Project** | Subsystem engine (Ingest, Index, …) or Ship/Operate or Methodology |
| **Issue** | Next action with a **Gate**, **Vault pointer**, **Depends on** |
| **Label** | Sprint type (`articulation`/`build`/`ship`/`operate`), tier (`DECISION`/`FIX`/…), pillar, **version** (`v1`/`v1.x`/`v1.5`/`v2`/`v3`) |
| **Milestone** | Stage inside a project (e.g. Schema drafted → Migrations live) |
| **Cycle** | Time-box over outstanding action items (idea-182) — **not** a replacement for scope-bounded SAD sessions. Enable after ~20 active issues. |
| **Document** | Short aiming reticle in Linear (e.g. Ends Map mirror); vault stays canonical for ratification |

## Issue template

```markdown
## Gate
<what “done” means in one sentence>

## Vault
`<path>` — optional Linear Doc / commit SHA

## Notes
<only what a future session needs; no essay>

## Depends on
<POL-xx or None>
```

Labels: always one sprint type; add pillar; add version if ship-facing; add
`DECISION` when blocked on founder choice.

## Session contract (anti-burial)

### Start

1. Name the Linear issue(s) in scope (`POL-xx`). Prefer one primary.
2. Set status **In Progress**; assignee = operator.
3. Open vault links from the issue description — do not rediscover by grepping.

### During

1. Scope-changing decisions → comment on the issue **or** spawn a `DECISION` child.
2. Long prose → vault note with `related: POL-xx` (or frontmatter link).
3. New actionable discovered mid-session → **create Linear issue before session ends**.

### End

1. Update issue status (Todo / In Progress / In Review / Done / Backlog).
2. If blocked, say so in a comment and set blocked-by relations.
3. Session-capture skill still writes the session log; Linear holds the needle.

**Fail condition:** An actionable exists only as a vault heading or TODO with no
`POL-` pointer after the session that produced it.

## Mimetics note (industry-awareness)

The operator previously designed operator console mockups that were structurally Linear.
Prefer Linear’s Initiatives/Projects/Issues over hand-rolled orchestration HTML
for *status*. Keep vault/SAD for *judgment and prose*. Framing can be novel;
the delivery vehicle for status should not be reinvented.

## When *not* to use Linear

- Pure research dumps with no next action yet → vault `research/` until triage.
- Spec stack ratification prose → vault; issue only tracks the ratification gate.
- One-line typos fixed in the same breath → no issue.

## Agent checklist (Cursor + Linear MCP)

1. `list_projects` / `list_issues` before inventing structure.
2. `save_issue` with Gate/Vault/Depends; never dump a research essay into description.
3. `save_project` for subsystem summaries; attach initiatives when they exist.
4. Cannot create Initiatives via MCP — surface **POL-71**-style UI task to founder.
5. Prefer updating an existing issue over creating a duplicate with a new title.
