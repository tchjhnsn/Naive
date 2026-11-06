# Frameworks for thinking

Naive's schema is opinionated and stable. A framework for thinking (the telos, ambition tiers, later OKRs, Lean Canvas, Jobs to Be Done, org-chart models) is a swappable package of questions, vocabulary, a template and an adapter that reads and writes the canonical records. It never changes the schema (Torian, 2026-10-30).

| Path | Holds |
|---|---|
| `<id>/framework.json` | The framework (`packages/naive/src/records/framework.schema.json`): vocabulary, frames, template, skill, adapter, and `maps_to` from each framework field to a canonical route and field |
| `<id>/adapter.mjs` | Reads the framework's old record as a fallback before migration, and renders its view from canonical records |

Canonical records: `foundation/goals/<id>.json`, `foundation/requirements/<id>.json`, `foundation/exit-criteria/<phase>.json`, `foundation/constraints.json`. Core code reads them through `packages/naive/src/engine/canonical.mjs`. `node packages/naive/src/engine/check-frameworks.mjs` fails when a `maps_to` targets a non-canonical route, or when core code reads a framework-only field (`telos.json`, `ambition`) outside the adapters, the migration and the fallback.

Skills stay at their layer paths (`purpose/skills/telos/`, `purpose/skills/ambition-tier/`); the framework names them.
