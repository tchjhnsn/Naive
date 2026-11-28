---
type: knowledge
tags: [everything-ecosystem, naive, skills, interface, documents, artifacts, records]
ai-model: claude-opus-5.5
created: 2026-11-26T20:45:00Z
source: hybrid
name: writing-documents
description: >
  Make a document a person can read, print and take into a meeting, in the right
  format and in the right order: the printable reading copy first, approved by a
  person, then any interactive page, then the live site. Reads the document
  catalog (packages/naive/src/functions/documents.json) for which kinds exist,
  which format each takes and which records it is rendered from, and names the
  tool for each format in each harness. General for any agent, with a section
  for Claude Code.
  MANDATORY TRIGGERS: write a one-pager, write a memo, make a brief, meeting
  pack, board update, investor update, pitch deck, write a spec, site copy,
  write an ADR, release note, changelog entry, requirements specification,
  make a PDF, make a PowerPoint, make a deck, which format, build the page,
  build the website, print this, render this document.
---

# Writing documents

Interface layer. A record is the source of truth; a document is a view rendered from records and never the record. Before you open an editor, read `packages/naive/src/functions/documents.json`: it says which documents exist, what each is for, which format it takes and why, which records its sections read, and the order every document climbs.

Run `naive render` to see the catalog in the terminal.

## The ladder: reading copy, then page, then site

This is the founder's rule and the catalog enforces it (EE-218). Build down the list, never up:

1. **Reading copy.** A printable copy a person reads end to end and could hand round a table. Markdown first, PDF when it will be printed or must not change under the reader. `naive render <kind>` writes it from the records, so every claim cites one.
2. **Slides**, for a kind that is spoken over. Built from the approved reading copy, never instead of it.
3. **Interactive page**, one HTML page a person clicks through, to settle layout and interaction. Only once a person approved the reading copy.
4. **Live site**, through the publishing gate (`naive publish`). A one-way door in public, so it is last and the founder approves it.

`naive render <kind> --format html` is refused until the reading copy's artifact record carries a person's `approved_by`, and `--format site` until the page does. The refusal names what is missing. Do not work around it; render the rung below and hand it to a person.

**Never let the document become the record.** A fact the records do not hold shows in the reading copy as a hole (`_Not recorded: ..._`). Write the record, or raise the question as a decision, then render again. Do not type the fact into the document. Some sections are holes in the catalog itself (`hole`), because no record type holds that fact yet, such as a release's version: say so to the person and leave it a hole.

## Style comes from the brand, by name

Each kind's `style` names the brand fields it is styled with, such as `marketing-brand` `voice`, `fonts` and `colors`, or `marketing-design-system` `components` (EE-230). The values are the venture's, in `marketing/brand.json` and `marketing/design-system.json`; the catalog names only which fields apply. `naive render <kind> --format <format>` prints them for every format it leaves to the harness. Use those fields and no others. When the venture has not written a field, that is a hole to raise, never a colour or a typeface to pick yourself.

## Choosing a format

The catalog's `rules` are the whole answer; these are the two that get broken most:

- **A person reading alone, in order, before or during a meeting** takes a document, not slides. Slides read alone lose the speaker, which is most of their content.
- **A person speaking to a room** takes slides, one point a slide. A document with the words made smaller is not a deck.

Word counts and page counts in the catalog (`words_per_page`, `pages`) are unvalidated priors. A venture overrides them in `naive.config.json`, and a person may override any rule; the override is a decision, not a quiet edit.

## What to do per format

| Format | Who renders it | How |
|---|---|---|
| Markdown | Naive | `naive render <kind>`. Nothing else writes the reading copy |
| PDF | your harness | Build it from the approved Markdown, changing no fact |
| Word | your harness | Only when the reader must edit the words, such as counsel marking up terms |
| Slides | your harness | From the approved reading copy, one point a slide |
| HTML page | your harness | One page, from the approved reading copy |
| Live site | the venture's site build | `naive publish`, under the gate a person approves (EE-025) |

Naive renders only Markdown on purpose: the framework carries no document dependency, and your harness already has better tools.

## Present each rung for approval

Only a person approves a rung. After you render:

1. Say which file you wrote, and that it is a view of records.
2. Name every hole you left and the record each one needs.
3. Ask them to read it and approve it, and say plainly that you will not build the rung above until they have.
4. When they approve, a person writes `approved_by` on the artifact record (`artifacts/<kind>-<rung>.json`). You never write it for them, and you never approve as them.

`node packages/naive/src/checks/check-documents.ts <venture dir>` fails when a document sits on a rung whose rung below is missing or unapproved. Run it before you say a document is done.

## In Claude Code

Each harness adapter's `artifacts` list (`packages/naive/src/interfaces/adapters/<harness>.json`) says what that harness can produce, the formats each yields and the skill or tool that makes it. Claude Code's lists a Claude doc, an artifact page, slides and a dashboard beside the four document skills. Claude Code has Anthropic's own document skills, under the Apache 2.0 licence, and they are the right tool for every format Naive does not render:

| Format | Skill to load | Note |
|---|---|---|
| PDF | `pdf` | Also reads and fills existing PDFs |
| Word | `docx` | Only for the cases above |
| Slides | `pptx` | Build a structured deck: a theme, layouts and placeholders, not loose text boxes |
| Spreadsheet | `xlsx` | A model or a budget, when a person asked for one |
| HTML page | `artifact-design`, then the Artifact tool | One page, published privately, and the link given to the person |

Load the skill when you reach that step, not before, and load nothing heavier than the step needs. Before drawing any chart, load `dataviz`; before a diagram, `artifact-diagramming`. For which artifact kind a venture action produces at all, read the `choosing-artifacts` skill beside this one.

Marketplace plugins that render documents through an outside service (an HTML-to-PDF API, a hosted slides service) are not used here: a venture's own records would leave the tenant, and `NAIVE_RUNTIME=hosted` refuses to reach outside it. Keep the rendering local.
