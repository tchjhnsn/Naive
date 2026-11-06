---
type: reference
source: hybrid
created: 2026-10-26T21:57:48Z
ai-model: claude-opus-5.5
tags: [everything-ecosystem, knowledge, tooling, tool-selection]
description: "What to ask when someone wants help choosing knowledge-layer tools: the dimensions, example questions, and how common tools answer them. Used by packages/naive/src/functions/it/skills/tool-selection."
---

# Knowledge layer: choosing tools

Opt-in. Use this only when someone asks for help choosing (see `packages/naive/src/functions/it/skills/tool-selection/SKILL.md`). The questions below are examples of each kind, not a script.

## Dimensions that matter

| Dimension | Why it matters | Example question | Type |
|---|---|---|---|
| Who writes | Solo, a team, outside parties and agents need different tools | Who will write and edit this: just you, your team, people outside the company, agents? | choice (several) |
| Where it lives | Local files you own versus a hosted service | Does any of it have to stay on your own machine? | yes/no (often a must-have) |
| Agent access | Agents read and write through files, MCP or an API | How much should agents write here, rather than only read? | score: none / read / draft / write freely |
| Shape | Linked notes, structured databases, long documents, specs next to code | Is most of it linked notes, tables of records, or documents that ship with code? | choice |
| Working together | Live co-editing and comments versus review by pull request | When two people change the same page, do they need to do it at the same time? | yes/no |
| Sensitivity | Legal, health or customer records may not belong in a hosted tool | Will this hold anything you couldn't put in a third-party cloud? | yes/no (must-have) |
| Cost and scale | Per-seat pricing grows with the team | How many people will need access in a year? | score: 1 / 2–10 / 10–50 / 50+ |
| Exit | Plain files leave cleanly; some formats don't | If you stopped using it, how bad would a lossy export be? | score: fine / annoying / serious |
| What exists | Switching cost is real | What do you use today, and what would it take to move it? | free text, turned into a switching-cost score |

## How common tools answer them

Presets are general descriptions and should be checked against current product terms before a hard-to-reverse choice.

| Tool | Who writes | Where it lives | Agent access | Shape | Live co-editing | Exit |
|---|---|---|---|---|---|---|
| Obsidian | Mostly one person; teams through a shared sync | Local Markdown files (optional paid sync) | Files, so any agent with folder access | Linked notes | No | Clean: plain Markdown |
| GitHub (docs as code) | Anyone who can use pull requests; agents easily | Hosted git, cloned locally | Files, CLI, API, MCP | Docs that ship with code | No; review by pull request | Clean: plain files with history |
| Notion | Teams and outside guests | Hosted | API and MCP | Databases and pages | Yes, with comments | Partial: Markdown/CSV export loses some structure |
| Claude Docs | People and Claude together | Hosted on claude.ai | MCP | Documents with comments | Yes | Export to Markdown, Word, PDF |
| Google Drive | Outside parties, non-technical readers | Hosted | API and MCP | Documents and sheets | Yes | Good: Office formats |

## Worked example: Torian, 2026-10-26

Situation as recorded: one founder plus agents, specs belong with code (docs as code, G-020), principles and philosophy kept in a personal vault, some collaboration with Claude on drafts, nothing that must be off-cloud at this stage.

- Must-haves: agents must write freely; docs that govern code must live in the repo. Notion and Google Drive pass but are not needed for either.
- Fit: GitHub for specs and design docs, Obsidian for vaults, Claude Docs for drafts written with Claude. All three are low lock-in except Claude Docs, which is used only for drafts and exports cleanly.
- Result: matches `integrations.json` today. Notion stays a candidate for when a team or outside readers need a shared knowledge base.
