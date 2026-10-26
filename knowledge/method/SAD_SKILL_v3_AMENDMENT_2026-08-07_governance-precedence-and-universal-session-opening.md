---
type: methodology-amendment
spec-layer: methodology
version: 3.0.12
source: hybrid
ai-model: claude-opus-5
created: 2026-08-07
ratified: 2026-08-08
ratified-by: The owner
last-reviewed: 2026-08-08T22:01:59Z
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[sad/SAD_SKILL_v3]]"
status: RATIFIED — canonical methodology as of 2026-08-08
change-class: 2
sections-affected:
  - PART 3 — Session-start ritual (read set named explicitly)
  - PART 4 — Session Opening Protocol (scope widened beyond implementation sessions)
  - PART 14 — critical reminders (two added)
  - Universal frontmatter contract (three fields added, one conditional)
  - "[[skills/session-capture/SKILL]] — entity-level session log named"
  - vault CLAUDE.md — new §Governance precedence; Required Frontmatter table
related-amendments:
  - "[[SAD_SKILL_v3_AMENDMENT_2026-05-17_dependency-actuality-and-version-categorization]]"
  - "[[SAD_SKILL_v3_AMENDMENT_2026-07-08_ai-model-provenance]]"
tags: [methodology, sad-v3, amendment, class-2, governance, precedence, authority, discoverability, session-protocol, frontmatter]
---

# SAD v3.0.12 Amendment — Governance Precedence + Universal Session Opening

**Status:** RATIFIED 2026-08-08. Class 2. Adds three frontmatter fields (`governed-by`, `authority`, `decision-status`), one conditional field (`corrected-by`), and widens the Session Opening Protocol from implementation sessions to every scope-bounded session.

**One-line summary:** A document's *authority* must be declared by the document rather than inferred by the reader, and every session — not only implementation sessions — must read the governing documents before writing. This supplies the vault-document application of §NEW.2 that v3.0.5 explicitly deferred.

---

## Provenance

Directed by the owner on 2026-08-07, after an architecture session produced three days of work that contradicted a strategy locked six weeks earlier:

> "Figure out why you missed all of this when this is some of the most important aspects of the platform in my vault. A lot of time and tokens have been wasted because you missed all of this. Is there an issue with the front matter and how these documents are being related to each other? Is there an issue with the folder structure? … Whatever is causing these issues needs to be identified and reconciled."

### The failure

Session 27 of a project note locked a four-layer system design, wrote five ADRs, and drafted an evolution roadmap without ever reading CITIZENS_OS_STRATEGY (tchjhnsn/polity: docs/specs/social/CITIZENS_OS_STRATEGY.md) — the 2026-07-21 strategy that already specified the platform layer the session "discovered," and already fixed the product-scope boundary the session proposed to widen. The session also repeated two claims that had been disproven weeks earlier (a runtime-LLM prohibition archived by amendment on 2026-07-23, and a "built twice" schema claim corrected on 2026-08-03).

### Diagnosis — three designated memory locations, none consulted

The material was not hidden. It was in every place the methodology designates:

1. **A project file** — carries `citizens-os-strategy:`, `ontology-reconcile:`, and `nds-research:` frontmatter pointers plus a closing §"Citizens OS boundary (2026-07-21)" stating the exact scope boundary in dispute. The vault CLAUDE.md designates this file as the project memory layer for the wiki half.
2. **`<entity>/product/SESSION_LOG.md`** — the 2026-07-21 entry names all seven Citizens OS artifacts, the Class 0 gate, and founder gates FG-1…FG-10.
3. **`product/spec/`** — where the artifacts live.

PART 3's session-start ritual already requires reading "the entity's profile." That was violated outright, and no amendment excuses it.

### But four gaps are the methodology's, not the operator's

**Gap 1 — the fuller protocol does not cover architecture sessions.** PART 4 opens: *"For implementation sessions specifically (Phase 2 and beyond). Mandatory."* Its steps — read the session log **in full**, read `CLAUDE.md` **in full**, check staleness markers — are the steps that would have caught this. Architecture, planning, and research sessions are the sessions most able to contradict a Vision, and they have **no mandatory opening protocol at all**.

**Gap 2 — the rituals name the wrong session log.** PART 3 step 3 and PART 4 step 2 both name `_sessions/SESSION_LOG.md` (vault root). Entity work is logged at `<entity>/product/SESSION_LOG.md`. For the reference project the vault-root log contains no entry after 2026-05-29; the entity log is the live one. A reader who follows the protocol literally reads the wrong file.

**Gap 3 — "relevant spec layers" is circular.** PART 3 step 3 asks for "any open spec layers **relevant** to the Session's scope." Relevance is assessed by a reader who does not yet know what exists, so a document nobody knows about is never relevant. Nothing points *upward*: the vault's "no orphan notes" convention is satisfied by sideways links to peers, and every document Session 27 wrote satisfied it while sitting outside the vision hierarchy entirely.

**Gap 4 — no declared precedence, so recency substituted for authority.** §NEW.2 (v3.0.5, RATIFIED) established that *authority depends on the question* and gave a five-tier map — but that map governs **runtime and deployment facts** (local code → git → GitHub → provider → production). Its final section notes the principle generalizes to vault documents and states: *"full articulation deferred to a the reference project methodology refinement."* That deferral is the hole. With no precedence declared among governance documents, a 2026-08-06 planning note silently outranked a 2026-07-21 strategy for no reason other than its date.

**Folder structure was not a contributing cause.** The audit found no case where a document was unfindable because of its location. Restructuring was considered and rejected: the 2026-07-31 reorganization has not finished migrating, and a second incomplete reorganization layered on the first would reduce discoverability rather than improve it.

---

## §NEW.8 — Governance precedence for vault documents

Supplies the vault-document articulation of §NEW.2 that v3.0.5 deferred. Where §NEW.2 answers *"which source is authoritative for a fact about the running system?"*, §NEW.8 answers *"which document is authoritative when two documents in the vault disagree?"*

### Statement

**Authority is declared, not inferred. Recency confers no authority.** Every governance document declares the tier it speaks at and the document it answers to. A document at a lower tier may not silently contradict one at a higher tier.

### The `authority:` field

```yaml
authority: constitutional | strategic | architectural | implementation | exploratory
```

| Tier | Holds | Examples |
|---|---|---|
| `constitutional` | Identity, scope boundaries, and commitments that require a Class 0 amendment to change | vault `CLAUDE.md`, `entity-profile.md`, `VISION_SPEC` |
| `strategic` | Direction and ecosystem shape within the constitutional boundary | `CITIZENS_OS_STRATEGY`, ecosystem synthesis, ontology reconciles |
| `architectural` | Adopted structural decisions | ADRs, locked architecture maps, subsystem charters |
| `implementation` | How a decided thing gets built | specs, build plans, migrations, checklists |
| `exploratory` | Thinking not yet decided | research, stubs, idea-dumps |

**The contradiction rule.** A document may not contradict a higher tier without one of:

1. an amendment at the higher tier (Class 0 for constitutional), or
2. an explicit `contradicts:` pointer plus an open question naming the founder decision required.

Silent contradiction is the defect this amendment exists to prevent. When two documents at the *same* tier disagree, neither wins by date; the disagreement is surfaced as an open question.

### The `governed-by:` field (required on governance documents)

```yaml
governed-by:
  - "[[entity-profile]]"
  - "CITIZENS_OS_STRATEGY (tchjhnsn/polity: docs/specs/social/CITIZENS_OS_STRATEGY.md)"
```

An upward pointer to the document(s) this one answers to. Required on every `planning`, `planning-note`, `architecture-spec`, `spec`, `research`, and `policy` note. Optional on `idea`, `idea-dump`, and raw sources.

This is the field that breaks Gap 3's circularity. Relevance stops being a guess the reader makes and becomes a property the document declares. A session that reads a document's `governed-by:` chain to its root cannot fail to encounter the constitutional layer.

**Consequence for the "no orphan notes" convention:** sideways links to peers no longer satisfy it for governance documents. Every such document must be reachable *upward*.

### The `decision-status:` field

```yaml
decision-status: in-force | awaiting-decision | proposed | draft | superseded
```

`status:` today carries prose maturity and decision state in one string, and they are different facts. CITIZENS_OS_STRATEGY (tchjhnsn/polity: docs/specs/social/CITIZENS_OS_STRATEGY.md) reads `status: DRAFT — Class 0 proposal companion`, which parses as "speculative" when the document is in fact the pending Class 0 frame for the entire product — the single most consequential open decision in the entity. Correctly labelled it is `decision-status: awaiting-decision` with draft prose.

`status:` remains free prose. `decision-status:` is the queryable field, and `awaiting-decision` documents are read at session start regardless of their prose maturity.

### The `corrected-by:` field (conditional)

The vault already requires bidirectional `supersedes:` / `superseded-by:`. A *correction* is not a supersession — the corrected document remains canonical for everything else — and so had no rule, which is how a disproven claim survived in `subsystems/README.md` for four days while its correction sat in a sibling folder.

When a document disproves a specific claim in another, the corrected document gains:

```yaml
corrected-by:
  - doc: "L0_SCHEMA_RECONCILIATION_2026-08-03 (tchjhnsn/polity: docs/design/systems/subsystems/sdk/ingest/L0_SCHEMA_RECONCILIATION_2026-08-03.md)"
    claim: "Discourse L0 and platform ingest L0 are the same abstraction, built twice"
    corrected: 2026-08-03
```

The corrected claim is struck in place, not silently rewritten.

---

## §NEW.9 — Universal Session Opening Protocol

### Statement

PART 4's protocol applies to **every scope-bounded Session that touches specs, architecture, planning, research, or entity profiles** — not only implementation sessions. The exemption for non-implementation work is withdrawn.

The reasoning is that PART 4 had its scope backwards. Implementation sessions are constrained by the code: a wrong assumption fails a test, a type check, or a migration. Architecture and planning sessions have no such backstop — a wrong assumption becomes a locked decision, and the cost surfaces days later in documents already written against it. Those sessions need *more* opening discipline than implementation, not none.

### The read set (replaces PART 3 step 3 and PART 4 step 2–4)

At the start of every such Session, read:

1. **Vault `CLAUDE.md`** (repo `CLAUDE.md` additionally for code work).
2. **`projects/<entity>/entity-profile.md`** — in full, including frontmatter pointer fields. This is the project memory layer; frontmatter pointers such as `citizens-os-strategy:` are part of the read, not decoration.
3. **The entity-level session log** at `<entity>/product/SESSION_LOG.md` — most recent three entries minimum — **and** the vault-root `_sessions/SESSION_LOG.md` when the Session is cross-entity. Naming only the vault root was Gap 2.
4. **Every document reachable one hop up the `governed-by:` chain** from the Session's scope, plus every document in the entity with `decision-status: awaiting-decision`.
5. The open spec layers relevant to the scope, as before.

Then state the Session's scope, intent, exit criteria, and parent Campaign (PART 3 step 4, unchanged), and declare the level (PART 4 step 0, unchanged).

### Closing rule

No architecture, planning, or spec document is written until the read set is complete — the analogue of PART 4 step 7 for non-implementation work.

### Session-end obligation

The compiled session-log entry (PART 3 session-end ritual, PART 10 format) is written to the **entity-level** log for entity-scoped work. A Session that produces governance documents and no log entry has not closed; the next Session inherits no record of what was decided. Session 27's log gap ran 2026-07-31 → 2026-08-07 and covered every document under discussion.

---

## What this changes in the canonical docs

Applied in the same session as this amendment (per the 2026-07-26 precedent):

1. **[[SAD_SKILL_v3]] PART 3** — session-start ritual step 3 replaced by the §NEW.9 read set.
2. **[[SAD_SKILL_v3]] PART 4** — scope line widened; steps 2–4 replaced by the read set; closing rule added.
3. **[[SAD_SKILL_v3]] PART 14** — critical reminders #18 and #19 added.
4. **[[SAD_SKILL_v3]]** — ratified-amendments index gains this row.
5. **vault `CLAUDE.md`** — new §"Governance precedence" documenting `authority` / `governed-by` / `decision-status` / `corrected-by`; the Required Frontmatter section gains them; the "No orphan notes" convention gains the upward-reachability qualifier.
6. **[[skills/session-capture/SKILL]]** — entity-level session log named alongside the vault-root log.
7. **[[entity-profile-schema]]** — entity profiles declare `authority: constitutional`.

---

## Migration note (additive)

Additive. Existing notes remain valid until next-touched; backfill as session housekeeping, per the v3.0.7 convention.

Backfill order is by tier, top down — constitutional documents first, since `governed-by:` chains are only useful once their roots are labelled.

### The reference project backfill — executed 2026-08-08

The owner elected to complete the pass rather than leave it to next-touched. **158 governance documents** now carry `authority:`, of which 18 were declared by hand during the reconciliation and **140 were derived mechanically**. Resulting distribution: 1 constitutional · 17 strategic · 34 architectural · 66 implementation · 40 exploratory.

Scope was the types this amendment names, plus `architecture-decision`. `deliverable`, `design`, `spec-pointer`, `companion-md`, and `amendment` were left out — they are not governance documents in the §NEW.8 sense, and `amendment` needs its target's tier rather than a default.

Derivation rules, in precedence order (recorded here so the pass is reproducible, since declared values must beat derived ones on any re-run):

| Rule | Result |
|---|---|
| `VISION_SPEC*` | `constitutional` |
| `CITIZENS_OS_*`, `VERSION_SPEC*` | `strategic` |
| `IDEA_MAP`, `RESEARCH_SYNTHESIS` | `strategic` — Phase 0A/0B compiled scope, cited by the entity profile |
| `ADR-*` | `architectural` |
| `status:` beginning with `LOCKED` | `architectural` — a locked artifact is an adopted decision whatever folder it sits in |
| `type: architecture-spec` / `architecture-decision` | `architectural` |
| `type: policy` | `strategic` |
| `type: planning` / `planning-note` / `spec` | `implementation` |
| `type: research` / `research-note` | `exploratory` |

Two calibration notes worth carrying to the next entity. The `LOCKED` test must be **anchored at the start of the status value**: an unanchored match promoted a discussion note whose status read *"DISCUSSION — v1 buttons + fallacy shortlist locked."* And type alone mis-tiers the Phase 0 artifacts — `IDEA_MAP` is `type: planning` but is scope-defining, not cadence work.

`governed-by:` was seeded with the minimum useful uplink only: `[[entity-profile]]` for every document, plus the owning subsystem README for documents under `product/subsystems/<name>/`. That is enough to make every chain terminate at the constitutional root, which is the specific failure being fixed. Richer parentage is added as documents are next-touched.

`decision-status:` was **not** set mechanically — it requires reading each document's actual standing, and a wrong value there is worse than an absent one.

Dataview surfaces the gap:

```dataview
TABLE authority, governed-by, decision-status
FROM "projects"
WHERE contains(list("planning","planning-note","architecture-spec","spec","research","policy"), type)
  AND (!governed-by OR !authority)
```

And the audit query that would have prevented Session 27:

```dataview
TABLE file.folder, status
FROM "projects/<entity>/product/<product>"
WHERE decision-status = "awaiting-decision"
```

---

## Open questions for ratification

| ID | Question |
|---|---|
| **AM-1** | Should `authority:` be inferable from `type:` + folder (e.g. anything in `product/spec/` is at least `strategic`) rather than declared per document? Declared is more work and more reliable; inferred is cheaper and drifts. |
| **AM-2** | Does the contradiction rule need a mechanical check, or is a declared tier sufficient? A linter could flag a lower-tier document whose text contradicts a higher-tier lock, but only if locks are expressed as structured claims rather than prose. |
| **AM-3** | Should `decision-status: awaiting-decision` documents surface in a standing vault-level queue? Citizens OS FG-1…FG-10 have been open since 2026-07-21 with no surface that shows them. |

---

## Status

- **2026-08-07:** Drafted after the Session 27 discovery-failure diagnosis. Applied to canonical docs pending ratification.
- **2026-08-08:** **RATIFIED by the owner as-is.** Canonical methodology from this date. AM-1, AM-2, and AM-3 remain open as refinements rather than blockers — the amendment stands with `authority:` **declared** per §NEW.8, and the reference project backfill proceeds by mechanical derivation with declared values overriding wherever a session has set them by hand.
