---
type: methodology-amendment
spec-layer: methodology
version: 3.0.7
source: hybrid
ai-model: claude-opus-4.8
created: 2026-07-08
ratified: 2026-07-08
ratified-by: The owner
last-reviewed: 2026-07-08
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[sad/SAD_SKILL_v3]]"
status: RATIFIED — canonical methodology as of 2026-07-08
change-class: 2
sections-affected:
  - Universal frontmatter contract (every note type)
  - PART 2 — two-layer data model (file-type table gains a provenance field)
  - "[[raw-source-taxonomy]] — universal raw-source frontmatter"
  - "[[entity-profile-schema]] — required-on-every-profile frontmatter"
  - vault CLAUDE.md — "Required Frontmatter by Note Type" + "Human vs. Machine Content"
related-amendments:
  - "[[SAD_SKILL_v3_AMENDMENT_2026-05-17_shipped-definition-and-version-categorization-applicability]]"
tags: [methodology, sad-v3, amendment, class-2, ai-model, provenance, frontmatter, model-attribution]
---

# SAD v3.0.7 Amendment — AI-Model Provenance on Every Note

**Status:** RATIFIED. Class 2 change. Adds one universal frontmatter field (`ai-model`) required on every note written to the vault, and one optional companion field (`ai-model-history`). Additive — existing notes remain valid until next-touched.

**One-line summary:** Every note written to the vault records the AI model that authored or last substantively wrote it, via an `ai-model` frontmatter field. Human-only notes carry `ai-model: none`. This closes a provenance gap: the vault already recorded *whether* a note was machine-written (`source`) and its *IP posture* (`authorship`), but never *which model* did the writing.

---

## Provenance

Directed by the owner on 2026-07-08:

> "Let's update the SAD methodology so that whenever anything is written to the vault, one of the front matter tags includes the AI model that wrote the document."

The vault already distinguishes `source: human | machine | hybrid` and `authorship: sole | co-authored | extracted-from | external`. Neither captures *which* AI model produced the content. As multiple frontier models (Claude, GPT, Gemini, and their successive versions) contribute to the vault over time, model attribution becomes load-bearing for three reasons:

1. **Archaeology.** When re-reading a compiled artifact, knowing the authoring model contextualizes its style, blind spots, and likely error modes.
2. **Regeneration.** A compile pass benefits from knowing which model last built the artifact — regressions and improvements between models become traceable.
3. **Quality auditing.** Dataview can surface "everything written by model X" for spot-checking when a model turns out to have a systematic weakness.

The only existing model-attribution fields were `llm-provider` / `llm-model`, scoped narrowly to the `conversation-log` raw-source subtype (they describe the model *in* a captured transcript, not the model that *wrote the vault file*). This amendment generalizes model attribution to a universal authorship field.

---

## §NEW.7 — The `ai-model` universal frontmatter field

### Statement

Every note written to the vault — raw or compiled, at any scope, of any `type` — carries an `ai-model` field recording the AI model that authored or last substantively wrote the note's content.

### Schema

```yaml
ai-model: <model-identifier> | none
```

- **`<model-identifier>`** — the model that authored or last substantively wrote the note, recorded as the model reports itself, family-plus-version, kebab or dotted: e.g. `claude-opus-4.8`, `claude-sonnet-4.6`, `gpt-5.3-codex`, `gemini-3-pro`. Prefer the specific version; if the version is genuinely unknown, record the family alone (`claude`, `gpt`) and treat it as lower-fidelity.
- **`none`** — the note was authored entirely by a human with no AI generation of its content. Pairs with `source: human`.

### Applicability rule

The value of `ai-model` is governed by `source`:

| `source` | `ai-model` |
|---|---|
| `human` | `none` |
| `machine` | required — the model that generated the note |
| `hybrid` | required — the model that did the AI-assisted writing |
| `external` (raw only) | the model that produced the external material if AI-generated and known; otherwise `none` or `n/a` |

"Substantively wrote" means generated or materially rewrote the note's *content*. Frontmatter housekeeping (stamping `last-reviewed`, fixing a typo, adding a tag) does **not** change `ai-model`; it stays attributed to the model that last authored the body. A human hand-editing an AI-drafted note to correct content flips `source` to `hybrid` and leaves `ai-model` naming the model whose draft is being edited (or updates it, per the multi-model rule below).

### Multi-model documents: `ai-model-history` (optional)

A compiled artifact may be built by one model and later re-compiled by another. When authorship crosses models over time, `ai-model` names the **most recent** substantive author, and an optional append-only `ai-model-history` list preserves the chain:

```yaml
ai-model: gpt-5.3-codex          # most recent substantive author
ai-model-history:
  - claude-opus-4.8 (2026-07-08, created)
  - gpt-5.3-codex (2026-08-15, recompiled Phase 0B)
```

`ai-model-history` is optional and used only when the crossing matters for archaeology. For single-model notes, omit it.

### Relationship to `llm-model` / `llm-provider` (conversation-log)

These are distinct and both may appear on a `conversation-log` raw capture:

- `llm-provider` / `llm-model` — the model **inside** the captured transcript (e.g., a captured ChatGPT conversation records `llm-model: gpt-5.3`).
- `ai-model` — the model that **wrote the capture file itself** (usually the session-capture agent, e.g. `claude-opus-4.8`).

They coincide when a model captures its own session; they diverge when one model captures another's transcript. Keep both.

---

## What this changes in the canonical docs

On ratification, the following are updated in lockstep (this amendment is the record; the edits are applied directly):

1. **vault `CLAUDE.md`** — the universal requirement line becomes "Every note must have: `type`, `source`, `created`, `ai-model`, `tags`." The "Human vs. Machine Content" section documents `ai-model`.
2. **[[raw-source-taxonomy]]** — the universal raw-source frontmatter block gains `ai-model`.
3. **[[entity-profile-schema]]** — the "Required on every entity profile" block gains `ai-model`.
4. **[[SAD_SKILL_v3]]** — the amendments index gains the v3.0.7 row; PART 14 gains critical reminder #17.
5. **`_meta/templates/*.md`** — every note template gains an `ai-model` field (defaulting to `none` alongside the template's default `source: human`; the authoring agent overwrites it when it writes content).
6. **[[skills/time-awareness/SKILL]]** — the "when authoring a new note" guidance notes that `ai-model` is stamped alongside the timestamp fields.

---

## Migration note (additive)

`ai-model` is additive. Existing notes remain valid until next-touched. Backfill discipline mirrors the SAD v3 alignment convention: when a session opens any note for a substantive edit, add `ai-model` as part of that session's housekeeping — set `none` if the note's content is human-authored, or the editing model if this edit is the first AI touch. No scheduled migration pass is required; a Dataview query can surface notes missing the field when convenient:

```dataview
TABLE source, ai-model
FROM ""
WHERE type AND !ai-model
```

---

## Status

- **2026-07-08:** Drafted and ratified per the owner's direct instruction. Canonical frontmatter docs updated in the same session.
