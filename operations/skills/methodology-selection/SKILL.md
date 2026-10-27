---
name: methodology-selection
description: "Choose and record which development methodology builds each system, using the Everything Ecosystem methodology catalog, artifact catalog, decision questions and assignment register (ee.mjs). Run `ee report` at session opening; use recommend/propose when a system needs a methodology; record evidence as work ships. Triggers: which methodology, how should we build this, spec-driven or TDD, methodology catalog, artifact type, which diagram, ADR, BPMN, assignment, evidence, research before choosing."
type: skill
source: hybrid
created: 2026-10-11
ai-model: claude-opus-5.5
tags: [skill, everything-ecosystem, methodology-catalog, assignment-register, typesafe]
---

# methodology-selection

Domain: [[EVERYTHING_ECOSYSTEM_DOMAIN_DESIGN_2026-10-10]]. System: [[EVERYTHING_ECOSYSTEM_SYSTEMS_DESIGN_PHASE1_2026-10-10]]. Tool: `ee.mjs` in this folder.

```bash
EE=<ecosystem-root>/skills/methodology-selection/ee.mjs
```


**Read before asking (EE-023).** Run `node operations/skills/methodology-selection/derive-answers.mjs <venture dir>` first. It answers the governance-tier questions the venture's records already settle (who decides, funding, agent autonomy, success measure from the telos) and names each source. Ask only what it lists under still ask.
## Principles to keep in mind

- **The quality of the question determines the quality of the answer (P1).** When a recommendation looks wrong, look first for a poor or missing decision question, and refine it with a new version.
- **Recommend; never ratify (I2).** Only the owner ratifies. You may write `status: proposed`, never anything above it.
- **Mark every answer tested or assumed.** Research first when an answer is assumed and the cost of error (M4) is high.
- **The catalogs guide, they don't limit (I7).** If the right methodology or artifact type isn't listed, add it as a `candidate` entry.

## When to use it

| Situation | Do |
|---|---|
| Session opening on any entity | `node $EE report` — name research triggers and ratified assignments with no evidence that bear on the task |
| A system needs a methodology, or "how should we build this?" | Write a system description, `recommend`, then `propose`; show the owner the tie bands and research triggers |
| Choosing a document or diagram (ADR, BPMN, C4, …) | `node $EE list --kind artifact-type`; answer A1–A8 in the proposal or decision |
| Work on an assigned system ships or teaches something | `node $EE evidence A-NNN …` |
| Editing catalog or register files | `node $EE index` (validates, then regenerates the views) |

## Commands

```bash
node $EE validate                       # schemas, references, lifecycle, ratified assignments unchanged, evidence append-only
node $EE list --kind methodology --domain software [--family spec-driven] [--lifecycle listed] [--json]
node $EE report                         # research triggers, mostly-assumed entries, assignments without evidence, stale, candidates
node --env-file=<env file that sets TYPESAFE_API_KEY> $EE recommend --system <system-description.md> [--repeat 3]
node $EE recommend --system <system-description.md> --answers <answers.json>   # no Jev: a reasoning model fills the answers; its scorer is recorded
node $EE propose --from register/_recommendations/<run>.json [--methodology a,b,c]
node $EE evidence A-NNN --title "…" --note "…" [--source "…"] [--methodology a,b] [--tested tdd:M7]
node $EE index
```

## Writing a system description

Copy `skills/methodology-selection/fixtures/valid/register/_systems/example-system.md` (an invented example). Fill `system`, `entity`, a concrete `description`, and answer M1–M12 (read the current question text in `catalog/questions/`), each with `basis: tested` or `assumed`. Be specific about the form the source of truth can take (M1 v2): prose, data, tests, contract or model, running code.

## Reading a recommendation

- **Band 1 is a tie.** Don't present the order inside a band as a ranking.
- A combination is often right (for example, one assignment chose spec-as-source in the narrow sense, TDD and design by contract). Propose with `--methodology a,b,c` when the system has distinct parts.
- Results are evidence about the catalog too. If an obviously wrong option ranks high, look at that entry's fits-when and unfit-when conditions, or a missing question, before trusting the score. Log what you find in `register/_recommendations/README.md`.

## Don't

- Edit a ratified assignment's frontmatter, or any past evidence block. Record a new assignment that supersedes it.
- Change a question's text without raising its `version` and stating `refined-from` and `reason`.
- Hand-edit `catalog/INDEX.md` or `register/INDEX.md`.
- Commit or push without the owner's explicit go-ahead.
