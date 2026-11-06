---
type: knowledge
tags: [everything-ecosystem, naive, skills, interface, artifacts, records, views]
ai-model: claude-opus-5.5
created: 2026-10-29T20:12:08Z
source: hybrid
name: choosing-artifacts
description: >
  Decide whether a venture action should build an artifact (a rendered view a
  person reads, presents, shares or fills in) and which kind, and keep records,
  the source of truth in k-base/, separate from artifacts, which are views built
  from records and cite them. General for any agent, with a section for Claude's
  own artifacts in Claude Code and claude.ai.
  MANDATORY TRIGGERS: make an artifact, build a page, make a deck, make a
  dashboard, pitch deck, investor update, show me, visualize, one-pager, which
  artifact, should this be a doc, render this record.
---

# Choosing artifacts

Interface layer. An artifact is a rendered view; a record is the source of truth. Build an artifact from records when a person needs to look at, present, share or fill in something. Never let the artifact become the record.

## The core rule: records are not artifacts

- A **record** is a file in the venture's `k-base/` with a schema. It is what agents read, what decisions cite and what `naive check` tests.
- An **artifact** is a page, deck, dashboard or file made from one or more records for a reader. A marketing site describes the company, but the company's facts live in its records, not on the site.
- Records are never what gets published; artifacts are. Every artifact is itself a record in `artifacts/<id>.json` (`packages/naive/src/records/artifact.schema.json`) naming the records it was built from with their hashes, so a reader can trace each claim and `packages/naive/src/engine/check-artifacts.mjs` says when it has gone stale.
- When a record changes, rebuild the artifact. Never hand-edit an artifact to change a fact.
- What people type into an artifact (a form, a docket, comments) is input. Write it back through the router as a proposal or a draft in `_drafts/`; a person settles it. The artifact's own stored state is never the source of truth.
- Outside a Naive venture the same rule holds: name what the view was made from, and keep the facts where they already live.

## Should this be an artifact at all?

Answer in the conversation when the result is short, read once and acted on now. Build an artifact when any of these is true:

1. Someone other than the requester will read or use it.
2. It will be presented, printed, exported or sent.
3. A person needs to fill it in, decide on it or come back to it.
4. It is longer than about fifteen lines, or a picture explains it better than prose.

If it belongs in the venture's code (a README, a spec that ships, code docs), write a file in `codebase/` instead.

## Kinds of artifact

| Kind | Use it for |
|---|---|
| Document | Writing people keep editing or pass around: memo, plan, spec, brief, report, notes |
| Deck | Something to present or page through: pitch, investor update, demo-day talk |
| Dashboard | Numbers people read: KPIs, runway, scorecards. Every number shows its source record |
| Design | Visual work: landing pages, screens, mockups, ads, social posts |
| Design system | The brand's tokens, type, components and assets, built from the brand record |
| Page | Explainers, diagrams, interactive tools, trackers, forms |
| File | Only when a format is named (.pptx, .docx, .xlsx, PDF) or an existing file is to be changed |

## Decide in order

1. Is it an artifact at all? (above)
2. Did the person name a format? Use it.
3. Writing to edit: document. To present: deck. Data to read: dashboard. A visual: design. A brand: design system.
4. Otherwise a page. Add a diagram, charts or interactivity only when each earns its place.
5. List the records it reads, and put that source list in the artifact.
6. Read the records through Naive (`mentura_read`, or `naive` routes), never from memory. A record that is missing, a draft or stale is shown as such, never filled in.

## Actions and their artifacts

Each function's skills say which of its actions build which artifact. This is the starting map; it is a proposal until the founder confirms it in `naive.config.json` or the function's own skill.

| Function | Action | Artifact | Built from |
|---|---|---|---|
| Foundation | Review the strategic foundation | Document (brief) | foundation/problem, foundation/icp, telos, the phase in venture.json |
| Foundation | Decide pending decisions | Page that collects answers (the docket) | decisions/; answers go back as decisions a person settles |
| Validation | Plan or report an experiment | Document | validation records and evidence/ |
| Validation | Track evidence over time | Dashboard | evidence/ and metric records |
| Validation | Run interviews | Page that collects answers (intake form) | the interview schema; answers become records |
| Marketing | Draft a landing page or ad | Design | positioning and marketing/brand |
| Marketing | Set up the brand | Design system | marketing/brand |
| Marketing | Plan content | Document | positioning and calendar records |
| Product | Write a spec or roadmap | Document | product/ and decisions/ |
| Product | Show a flow or architecture | Page with a diagram | product/ |
| Product | Prototype a screen | Design | product specs |
| Money | Show runway, burn, revenue | Dashboard | money/ (from the bank or accounting source in sources.json) |
| Money | Build a model or budget | File (.xlsx) when asked, else dashboard | money/ and finance/ |
| Investors | Pitch or investor update | Deck | foundation/, evidence/ (traction) and money/ |
| Any | Release notes for a release | Document | the release in meta/releases/ |

## Checks before you publish

- [ ] The artifact names its source records.
- [ ] No fact appears that is missing from a record. If one is needed, write the record first (as a draft) or mark the claim as a proposal.
- [ ] Agent-drafted content is marked as a proposal, never as the founder's words.
- [ ] Input the artifact collects has a path back to records.
- [ ] Nothing from `_private/`, no secrets, keys or `.env` contents.
- [ ] Nothing imitates a real person or organization.

## In Claude (Claude Code and claude.ai)

Claude publishes artifacts with its `Artifact` tool. The kinds above map onto the artifact types on the person's account, which change, so always start a new artifact with `Artifact` `action: "quickstart"` and the fitting `intent`; it names the type to start from and the default design system.

| Kind | Claude artifact type | Intent |
|---|---|---|
| Document | Docs (through the Claude Docs connector) | `document` |
| Deck | Slides | `slides` |
| Dashboard | Dashboard | `other` |
| Design | Design | `design` |
| Design system | Design System | `other` |
| Page | plain HTML page, after loading `artifact-design` | `other` |
| File | the matching file skill (docx, pptx, xlsx, pdf) | none |

- **Diagram:** load `artifact-diagramming` when a picture shows the real mechanism.
- **Charts:** load `dataviz` before drawing any chart; prefer the Dashboard type when the page is mostly data.
- **Collecting input:** load `artifact-capabilities` and declare the smallest set: `db` and `user` for answers from several people (the docket, an intake form), `artifact` for a page that saves its own versions. Sync what it holds back to records through Naive; never treat the page's store as the record.
- **Updating:** republish to the same URL when the records change, so the link people hold stays current.
- Publish privately and give the link. Sharing it further is the founder's call.
