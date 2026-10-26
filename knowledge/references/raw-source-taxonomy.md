---
type: reference
ai-model: claude
source: hybrid
created: 2026-04-22
updated: 2026-04-22
last-reviewed: 2026-04-22
authorship: sole
ip-sensitivity: normal
tags: [reference, raw-source, taxonomy, sad-v3, two-layer-model]
---

# Raw-Source Taxonomy

Companion reference to **SAD v3** ([[SAD_SKILL_v3]]). Defines the `raw-source-type` discriminator and the per-subtype frontmatter shape used for every file living in a raw layer of the vault (`_ideas/`, `_sources/`, `_sessions/raw/`, per-entity `_sources/`).

## Purpose and discipline

SAD v3 distinguishes a **raw** layer (immutable inputs) from a **compiled** layer (re-buildable artifacts derived from raw). Without a controlled vocabulary for raw sources:

- Two captures of "the same kind of thing" end up with different frontmatter shapes and escape Dataview queries.
- The compile path for a given subtype becomes implicit, and staleness detection breaks.
- Cold-storage discipline (raw is not loaded into active context unless explicitly cited) cannot be enforced at retrieval time.

This taxonomy is the controlled vocabulary. It is **open-enum** — new subtypes can be proposed and added — but every raw file must declare a `raw-source-type` value.

## Universal frontmatter (all raw sources)

Every file under a raw layer carries these fields regardless of subtype:

```yaml
---
type: raw-source
raw-source-type: <subtype from the table below>
source: human | machine | hybrid | external
ai-model: <model-identifier> | none    # AI model that wrote this file (SAD v3.0.7); none for human-authored
created: <YYYY-MM-DD or ISO-8601>      # when the source was authored at its origin
ingested: <YYYY-MM-DD or ISO-8601>     # when it entered the vault
authorship: sole | co-authored | extracted-from | external
ip-sensitivity: high | normal | n/a
tags: [raw-source, <raw-source-type>, ...]
---
```

`ai-model` names the model that authored or last substantively wrote *this capture file* — for a session-capture, usually the capturing agent. It is distinct from the `conversation-log` subtype's `llm-model` / `llm-provider`, which name the model *inside* the captured transcript. See [[SAD_SKILL_v3_AMENDMENT_2026-07-08_ai-model-provenance]].

Optional but recommended:

```yaml
last-reviewed: <date>          # last time a human scanned this for correctness or relevance
retention-review: <date>        # if this should be re-evaluated for retention at a future date
destination-entity: [[<entity>]] # if the raw source is routed to a specific entity
campaign: <campaign-name>       # if this raw source belongs to a Campaign
scope: global | project | local # level the raw source operates at (see [[SAD_SKILL_v3#PART 0.5]])
scope-entity: [[<entity>]]      # required when scope: project
```

### Scope for raw sources

Raw sources inherit the Global / Project / Local level model from [[SAD_SKILL_v3#PART 0.5]]:

- **Global raw** — captures not yet routed to an entity, or relevant across multiple. Live at `_sources/` (root) or `_sessions/raw/` (root). Examples: a podcast on general methodology; a session-capture of a cross-entity planning conversation.
- **Project raw** — captures scoped to one entity. Live under `projects/<entity>/_sources/` or `projects/<entity>/_ideas/`. `scope-entity` is the owning entity. Examples: a paper specifically studied for the reference project's AI Lab; a competitor screenshot for another project.
- **Local raw** — captures transient to a specific Session (rare; most raw outlives its Session). Examples: a mid-session scratchpad capture that gets folded into a compiled artifact before Session-end and therefore doesn't need cold-storage persistence.

Declaration rules as in the schema: **required when ambiguous from path, optional when unambiguous**. A raw source under `projects/<entity>/_sources/` is obviously project-scoped; path implies the field. A raw source at the root `_sources/` that plausibly applies to multiple entities should declare `scope: global` to distinguish from "not-yet-routed project raw."

### What raw sources never have

- `last-compiled` — that field belongs to compiled artifacts.
- Direct edits other than frontmatter housekeeping (e.g., adding `last-reviewed`). The body is immutable.

## Subtype index

| `raw-source-type` | One-line | Required FM (beyond universal) | Compile path | Cold-storage rule |
|---|---|---|---|---|
| `idea-dump` | Mind-dump session output, free-form thinking | `topic`, `duration` | Feeds `IDEA_MAP.md` of destination entity | Warm-context OK during routing/triage |
| `session-proposal` | Prospective session description | `destination-entity`, `scope`, `intent`, `target-outcome`, `estimated-duration`, `priority`, `proposed-in-session` | Graduates to a session-log entry when run | Warm during planning; cold after graduation |
| `conversation-log` | AI conversation transcript (Claude/ChatGPT/etc.) | `llm-provider`, `llm-model`, `session-id`, `interface`, `participants`, `predecessor-session`, `successor-session`, `capture-mode`, `captured-at`, `captured-by`, `captured-via`, `scope` | Feeds compiled `SESSION_LOG.md` entries | Cold by default — cite explicitly when needed |
| `meeting-notes` | Real-time capture from a meeting | `participants`, `meeting-date`, `venue` | Feeds entity `_ideas/`, project decisions, action items | Warm during triage; cold after compile |
| `podcast-transcript` | Audio → text of a podcast episode | `show-name`, `episode-title`, `episode-url`, `speakers`, `duration` | Feeds `RESEARCH_SYNTHESIS.md` of destination entity | Cold by default |
| `video-transcript` | YouTube/lecture/talk transcript | `video-url`, `speaker`, `venue`, `duration` | Feeds `RESEARCH_SYNTHESIS.md` | Cold by default |
| `research-article` | Blog post, news piece, Substack essay, tweet thread | `author`, `publication`, `source-url`, `publication-date` | Feeds `RESEARCH_SYNTHESIS.md` | Cold by default |
| `academic-paper` | Peer-reviewed or preprint | `authors`, `doi`, `journal`, `publication-year`, `citation-format` | Feeds `RESEARCH_SYNTHESIS.md`, `THESIS.md` | Cold by default |
| `book-excerpt` | Quoted section of a book | `author`, `title`, `edition`, `page-range`, `isbn` | Feeds `THESIS.md`, `RESEARCH_SYNTHESIS.md` | Cold by default |
| `email-thread` | Extracted conversation | `participants`, `subject`, `thread-start`, `message-count` | Feeds entity logs, partner records | Cold by default; honor IP if recipients didn't author for the vault |
| `screenshot` | Image of a UI, whiteboard, chart | `captured-from`, `context`, `image-path` | Feeds design notes, `RESEARCH_SYNTHESIS.md` | Cold; warm only when the visual is the source of an active claim |
| `photograph` | Physical-world image | `captured-at`, `camera-or-device`, `image-path` | Feeds field notes, `_ideas/` | Cold |
| `audio-note` | Raw voice memo (pre-transcription) | `duration`, `audio-path`, `transcription-status` | Transcribed → becomes a `voice-memo-transcript` raw source; that compile path applies | Cold (and requires transcription before useful) |
| `voice-memo-transcript` | Transcribed voice memo | `original-audio-path`, `transcription-engine`, `duration` | Feeds `_ideas/`, `RESEARCH_SYNTHESIS.md` depending on content | Warm during triage; cold after route |
| `web-clip` | Saved page as markdown | `source-url`, `captured-at`, `author` | Feeds `RESEARCH_SYNTHESIS.md` | Cold by default |
| `code-fragment` | Snippet captured for reference | `language`, `source-url`, `source-file` | Feeds `IMPL_SPEC.md`, code-pointer notes | Cold; cite explicitly |
| `slack-thread` | Exported Slack/Discord thread | `workspace`, `channel`, `participants`, `thread-start`, `message-count`, `permalink` | Feeds entity logs, decisions, `_ideas/` | Cold; respect channel privacy |
| `github-issue-thread` | Snapshot of an issue/PR discussion | `repo`, `issue-number`, `participants`, `state`, `permalink` | Feeds entity logs, code-pointer notes | Cold |
| `interview-transcript` | User-research or expert-interview transcript | `interviewer`, `interviewee`, `interview-date`, `duration`, `consent-status` | Feeds `RESEARCH_SYNTHESIS.md` (user-research subtype) | Cold; honor consent terms |
| `handwritten-note-ocr` | OCR'd handwritten notes | `original-image-path`, `ocr-engine`, `confidence` | Feeds `_ideas/` after triage | Cold |
| `recovered` | Knowledge extracted from an artifact (binary, app, web traffic, model outputs, physical object, competitor product) rather than written by someone; added 2026-10-12 | `target`, `target-version`, `purpose`, `legal-basis`, `declared-by`, `recovery-tool`, `evidence-path`, `confidence` | Feeds recovered artifacts (`provenance: recovered`) and spec candidates via the `recover` skill | Cold; cite explicitly; honor the recorded legal basis |
| `ai-draft-rejected` | An AI draft worth preserving even though it was rejected | `rejected-during-session`, `rejection-reason`, `lineage-to` | Provenance-only — does not feed compiled artifacts directly | Cold; provenance only |

The list is **open**. New subtypes are added by proposing them in a session and either appending here or in a follow-on edit. Naming convention: kebab-case, descriptive, singular noun.

---

## Subtype deep-dives

Each subtype below names: required FM, optional FM, ingest method, compile path, cold-storage posture, retention default, known pitfalls, and a worked example.

### `idea-dump`

- **Purpose.** Free-form mind-dump capture. The user thinks out loud (often in a Cowork session); the result is preserved as a raw artifact even after its content is compiled into `IDEA_MAP.md` or routed to specific entity `_ideas/` notes.
- **Required FM.** `topic`, `duration`.
- **Optional FM.** `participants`, `triggered-by`, `destination-entity`.
- **Ingest method.** Inline during a session, or paste-in from a separate journaling tool.
- **Compile path.** `IDEA_MAP.md` of the destination entity, plus per-idea routing into `_ideas/` notes.
- **Cold/warm.** Warm during the same session; cold after the dump is triaged.
- **Retention.** Indefinite. Idea-dumps are cheap and historically valuable.
- **Pitfalls.** Forgetting to capture the trigger context (what the user was reading, who they were talking to). Add `triggered-by` when known.
- **Worked example.** [[idea-sad-v3-integration-2026-04-22]] — the v3 idea-dump itself.

### `session-proposal`

- **Purpose.** Describes a future session the user wants to run. Lives in `_ideas/` and routes to the relevant entity. Ages through a small status pipeline: `active → in-progress → graduated` (or `archived` / `deferred`).
- **Required FM (beyond universal).** `destination-entity`, `scope`, `intent`, `target-outcome`, `estimated-duration`, `priority` (`next | queued | someday | last`), `proposed-in-session`.
- **Optional FM.** `dependencies` (wikilinks to other proposals), `predecessor-source`, `lineage-to` (set when graduated).
- **Ingest method.** Authored directly during a planning or wrap-up session.
- **Compile path.** When the session runs, the proposal flips to `idea-status: graduated` with `lineage-to` pointing at the resulting session-log entry.
- **Cold/warm.** Warm during planning and just before running the session; cold after graduation.
- **Retention.** Indefinite; preserved as provenance even after graduation.
- **Pitfalls.** Treating proposals as commitments rather than candidates. The `priority: someday` value exists to absorb maybes without inflating the next-up queue.
- **Worked example.** [[session-proposal-author-sad-skill-v3]] — the bundle proposal that authors SAD v3.

### `conversation-log`

- **Purpose.** Capture of an AI session transcript (Claude/Cowork/Claude-Code/ChatGPT/etc.). Foundation for the predecessor/successor session graph and the Campaign view.
- **Required FM (beyond universal).** `llm-provider`, `llm-model`, `session-id`, `interface`, `participants`, `predecessor-session`, `successor-session`, `capture-mode` (`tail-only | full | excerpt | backfill`), `captured-at`, `captured-by`, `captured-via`, `scope`.
- **Optional FM.** `campaign`, `duration-hours`, `transcript-path`.
- **Ingest method.** `mcp__session_info__list_sessions` + `mcp__session_info__read_transcript` (Cowork). Manual paste for non-Cowork interfaces.
- **Compile path.** Feeds compiled `SESSION_LOG.md` entries (one log entry per scope-bounded session, citing the raw transcript).
- **Cold/warm.** Cold by default — never loaded into active context unless a later session explicitly cites a passage.
- **Retention.** Indefinite. These are the raw trail of how the methodology evolved.
- **Pitfalls.** Bloating the vault with full transcripts when tail-only would suffice. Default to `tail-only`; upgrade only when the tail isn't self-sufficient.
- **Worked example.** [[_sessions/raw/2026-04-20-sad-gap-handoff]] — the first SAD v3 era conversation-log capture.

### `meeting-notes`

- **Required FM.** `participants`, `meeting-date`, `venue`.
- **Optional.** `meeting-type` (1:1 / standup / review / planning), `duration`.
- **Ingest.** Author live in the meeting or transcribe from notes within a few hours.
- **Compile path.** Action items → entity `_ideas/`; decisions → entity log; observations → `RESEARCH_SYNTHESIS.md` if relevant.
- **Cold/warm.** Warm during triage (within ~72 hours); cold after.
- **Retention.** Indefinite for decisions; consider purging trivial check-ins after a year.
- **Pitfalls.** Treating verbatim notes as the artifact. The artifact is the *capture*; the *value* comes from the compile pass.

### `podcast-transcript` / `video-transcript`

- **Required FM.** `show-name` / `video-url`, `episode-title` / `speaker`, `episode-url`, `speakers`, `duration`.
- **Optional.** `auto-transcribed: true | false`, `transcription-engine`.
- **Ingest.** Whisper / YouTube auto-captions / manual transcription.
- **Compile path.** `RESEARCH_SYNTHESIS.md` of the destination entity. Quote with timestamp + permalink.
- **Cold/warm.** Cold.
- **Pitfalls.** Forgetting to attach speaker labels — makes citation harder later.

### `research-article` / `academic-paper` / `book-excerpt`

- **Common required FM.** `author(s)`, source identifier (`source-url` / `doi` / `isbn`).
- **Compile path.** All feed `RESEARCH_SYNTHESIS.md`. Academic papers and book excerpts may also feed `THESIS.md` for platform/research entities.
- **Cold/warm.** Cold by default; warm only while actively cited in a compile.
- **Pitfalls.** Fair-use limits on book excerpts. Capture only what's needed and cite properly.

### `email-thread` / `slack-thread` / `github-issue-thread`

- **Common required FM.** `participants`, source identifier (`subject` / `permalink` / `issue-number`), `thread-start`.
- **Cold/warm.** Cold. Honor channel privacy and consent.
- **Compile path.** Decisions → entity logs; product feedback → `_ideas/`; code-relevant snippets → code-pointer notes.
- **Pitfalls.** Importing IP-sensitive material without setting `ip-sensitivity: high`. Always check.

### `screenshot` / `photograph`

- **Required FM.** `captured-at` (or `captured-from`), `image-path`.
- **Optional.** `caption`, `entities-depicted`, `ocr-text` (if OCR'd separately).
- **Compile path.** Design notes, `_ideas/`, `RESEARCH_SYNTHESIS.md` (UI competitive scans).
- **Cold/warm.** Cold; warm only while a claim explicitly rests on the visual.
- **Pitfalls.** Storing in the wrong subfolder (vault vs. `attachments/`). Use a consistent path convention.

### `audio-note` → `voice-memo-transcript`

- **Two-step.** `audio-note` is the raw recording; transcription produces a separate `voice-memo-transcript` file with `original-audio-path` linking back.
- **Compile path.** Voice-memo transcripts feed `_ideas/` or `RESEARCH_SYNTHESIS.md` depending on content.
- **Pitfalls.** Leaving `transcription-status: pending` indefinitely. Set a `retention-review` date if pending more than a month.

### `web-clip` / `code-fragment` / `interview-transcript` / `handwritten-note-ocr`

These follow the same pattern: required FM names the source, compile path routes to the appropriate compiled artifact, retention is indefinite, cold by default.

### `ai-draft-rejected`

- **Purpose.** Preserve a Claude (or other AI) draft that was rejected during a session, when the rejection itself is informative for future archaeology.
- **Required FM.** `rejected-during-session`, `rejection-reason`, `lineage-to` (the artifact that replaced it).
- **Compile path.** Provenance only. Does not feed any compiled artifact directly.
- **Cold/warm.** Cold; provenance access only.
- **Pitfalls.** Capturing every rejected draft. Use sparingly — only when the rejection itself teaches something.

---

## Adding a new subtype

When a session encounters a raw source that doesn't fit the existing subtypes:

1. **Don't force it.** A bad-fit subtype assignment poisons future queries.
2. **Propose a new subtype** in the session: name (kebab-case), one-line description, required FM beyond universal, compile path, cold/warm posture, retention default, expected pitfalls.
3. **Add it to this doc** in the subtype index table and as a new deep-dive section.
4. **Author the raw file** with the new `raw-source-type` value.
5. **Cite the proposing session** in this doc's changelog.

## Cold-storage discipline

The taxonomy assumes a single rule: **raw is cold by default**. Compiled wiki pages cite raw with wikilinks; raw is loaded into active context only when:

- A compile pass is producing or refreshing a derivative artifact, or
- A session explicitly cites the raw source by path.

This keeps active-context windows lean and forces the compile-step discipline that makes the wiki layer useful in the first place.

## Cross-references

- [[SAD_SKILL_v3]] — the methodology that defines and uses this taxonomy.
- [[entity-profile-schema]] — the entity-profile fields that complement raw-source frontmatter.
- [[skills/session-capture/SKILL]] — the skill that produces `conversation-log` raw sources automatically.
- [[skills/time-awareness/SKILL]] — the skill that grounds `created` / `ingested` / `captured-at` timestamps.

## Changelog

| Date | Change | Trigger |
|------|--------|---------|
| 2026-04-22 | Created. Initial 21 subtypes enumerated. | SAD v3 bundle session ([[session-proposal-author-sad-skill-v3]]) |
| 2026-07-08 | Added `ai-model` to the universal raw-source frontmatter block; clarified its distinction from `conversation-log`'s `llm-model`. | SAD v3.0.7 ([[SAD_SKILL_v3_AMENDMENT_2026-07-08_ai-model-provenance]]) |
