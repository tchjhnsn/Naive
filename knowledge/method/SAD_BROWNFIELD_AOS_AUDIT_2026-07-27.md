---
type: methodology-audit
source: hybrid
created: 2026-07-27
ai-model: composer-2.5
tags: [everything-ecosystem, methodology, sad-v3, brownfield, aos, audit]
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
status: ACTIVE — brownfield aOS audit completed; backfill queue defined
description: "Audit SAD as brownfield methodology, determine aOS fit, map layers, and define backfill queue."
---

# SAD brownfield aOS audit (2026-07-27)

## Goal

Determine whether SAD is an aOS-class system (for methodology orchestration),
identify its layer contracts, and define concrete backfill work before further
methodology expansion.

## Outcome

- `sad_is_aos: partial`
- Classification: **methodology aOS** (not product/runtime aOS)
- Rationale: SAD already contains runtime-like orchestration and trust gates,
  but has only light model-gateway and integration-plane formalization.

## Inventory snapshot

### Already present

- Skill-and-wiki split and raw/compiled model in `SAD_SKILL_v3.md` PART 0–2.
- Campaign → Session → Checkpoint orchestration in PART 3.
- Continuous vs episodic activities in PART 1.
- Phase 0A/0B/0C+ pipeline and phase gates in PART 5.
- Capability skills integration in PART 8.
- Backfill pattern already named (`gate-backfill`) and invoked in v3 amendments.
- Trust behaviors: convergence thresholds, no silent drift, timestamp/provenance
  discipline, fail-closed gate language.

### Brownfield debt

- Many methodology amendments remain `PROPOSED`.
- Research in PART 5 Phase 0B is under-specified for multi-doc research cycles.
- No explicit layer map for SAD as methodology aOS.
- Historical consistency/backfill work remains distributed.

## Layer mapping (the reference project aOS frame used as audit questions)

| Plane | SAD mapping today | Maturity |
|---|---|---|
| Model gateway | `ai-model` provenance + model-aware writing discipline | Low |
| Agent runtime | Campaign/Session/Checkpoint + rituals + phase gates | High |
| Data/integration plane | Vault/repo split, `_sources`, `_sessions`, external raw-source ingest | Medium |
| Context/knowledge services | Skill-and-wiki, compile discipline, staleness review | High |
| Domain capabilities | Named skills (`time-awareness`, `session-capture`, `contract-first`, `asset-requirements`) | High |
| Experience layer | CLAUDE.md, skills, hooks, commands, session proposals | Medium |
| Trust plane | convergence, citation/provenance, no silent drift, gate-backfill | High |

## Verdict

SAD is best treated as a **partial methodology aOS**:

- Yes for orchestration, knowledge/context, capability, and trust planes.
- Partial for model-gateway and integration formalization.
- Not equivalent to a product agent runtime stack; it governs work, not civic
  transaction execution.

## Backfill queue (ordered)

1. Publish a SAD layer-contract companion (methodology-aOS articulation).
2. Backfill research method under Phase 0B for multi-doc cycles:
   Mimetic → Anti-Mimetic → Synthesised-Mimetic.
3. Standardize research frontmatter fields and canonical rules.
4. Add explicit `skip`/`empty` value semantics to research artifacts.
5. Ratify or supersede older PROPOSED amendments with status clarity.
6. Add one brownfield inventory index page linking RATIFIED/APPLIED/PROPOSED.
7. Agent-runtime session contract backfill:
   every session begins with a **preliminary review** of the last session
   (and/or full project when session-log discrepancies exist), then
   updates/records a **per-session changelog** and performs changelog review.
8. Conceptualize **bitemporal session closure**:
   - transactional time: session closes only when goals are complete
   - valid time: if too much valid time passes without interactions, close
   the session
   Decide how to represent both clocks in session metadata and how gates use
   them for staleness.
9. Agent-runtime session contract backfill:
   - publish brainstorming note
   - publish research shards (mimetic/anti-mimetic/synthesised)
   - publish PROPOSED Class 3 amendment (ratification deferred until methodology brownfield convergence)

## Climb-back path to the reference project

1. Complete SAD backfill and method docs.
2. Use the new research method to produce methodology locks:
   positive/negative mimesis and UX universals.
3. Run product-side M→AM→SM on the reference project Search.
4. Publish the reference project Search IA and Agora SDK pointer.

