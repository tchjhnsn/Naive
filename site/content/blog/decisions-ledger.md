---
title: The decisions ledger
date: 2026-10-29
authors:
  - Torian
summary: Schema decisions are appended to docs/decisions/decisions.json and cited as EE-NNN. A changed decision is a new entry.
tags:
  - decisions
image: /blog/decisions-ledger/image
---

<!-- DRAFT: agent-written, needs Torian -->

The schema's own decision log is `docs/decisions/decisions.json`. `packages/naive/src/engine/README.md` indexes it under Knowledge. The record schema is `packages/naive/src/records/decision.schema.json`. Ids use the prefix EE.

## What an entry holds

The schema requires `log`, `prefix`, and `decisions`. Each entry requires `id`, `date`, `decision`, and `status`. `why`, `related`, and `supersedes` are optional. An id matches the prefix plus three digits, such as EE-001. Status is `proposed`, `in-force`, `superseded`, or `withdrawn`.

The schema says entries are appended, never rewritten. A changed decision is a new entry that supersedes the old one.

The file's `log` field is "Everything Ecosystem schema" and its `prefix` is EE. The first entry is EE-001, dated 2026-10-26. Later entries include EE-083, dated 2026-10-29. EE-080 says a gap in the ledger is fine, and that EE-049 stays unused.

## How the repository cites them

`AGENTS.md` says schema decisions are logged in that file and cited by id (`EE-NNN`). The schema never cites a decision from any instance.

A venture's own decisions are a different record. The docs page [Decisions](/docs/get-started/decisions) describes a decision in a venture's `decisions/` folder: a question, its options, the record it decides, whether it fails closed, and the phase it is needed in. That page is a how-to for a venture. This note is about the schema log.

## Where this is written

- `docs/decisions/decisions.json`
- `packages/naive/src/records/decision.schema.json`
- `packages/naive/src/engine/README.md`
- `AGENTS.md`
- EE-001 and EE-080
