---
name: find-reference
description: "Find, confirm and record the source behind a reference in a layer's references/references.json: fill a missing URL from title, authors and year, re-check URLs that may have rotted, and add new references with a stance. Triggers: add a reference, cite this, where does this term come from, find the source for, check the references, a reference has no url. Do not trigger for general web research that will not be recorded as a reference."
type: skill
source: hybrid
created: 2026-10-27T04:16:38Z
ai-model: claude-opus-5.5
tags: [skill, everything-ecosystem, knowledge, references]
---

# find-reference

The system is opinionated: each layer names one default for each choice, and its references say where the default came from and what the alternatives were (EE-014). This skill keeps those references findable.

## Where references live

One file per layer: `<layer>/references/references.json`, checked by `schema/reference.schema.json`. Each record has an id, title, authors, year, kind, summary, what it informs (`phase:validation`, `noun:wedge`, `field:venture.industry`), and a stance (adopted, adapted, alternative or rejected, with why). A url and the date it was last checked are recorded when a page exists.

## Fill a missing URL

1. Search with the exact title, the first author's surname and the year.
2. Prefer, in order: the author's or publisher's own page, a standards body, a library or DOI record, an archive copy (for example web.archive.org or a maintained mirror), then a reputable summary. Never a page that only quotes a snippet.
3. Open the page and confirm the title, author and year match. If they differ, fix the record or say which part could not be confirmed.
4. Write `url` and `checked` (today, from `date -u +%F`). If nothing confirms it, leave the url out and add one line to the summary saying what was searched.

## Re-check URLs

Re-check any url whose `checked` date is older than 180 days, or when a reader reports it broken. If it no longer resolves, look for the same work on an archive or the publisher's new site, and update the url. Never delete the record: the title, authors and year still identify the work.

## Add a reference

Add one when a default, a noun or a gate is chosen because of a source, or when an alternative was weighed and set aside. Write the summary in your own words (one or two sentences), set `informs` to the nouns, phases, gates or fields it backs, and give the stance with a one-line why. A source that is a conversation (for example an AI chat a founder shared) gets kind `conversation` and no url.

## Rules

- Standards first: when a published standard exists, cite it and use its term with its meaning (EE-014).
- A reference informs a decision; it never makes one. The decision log records the choice.
- Keep each layer's file to the sources that layer's defaults rest on.
