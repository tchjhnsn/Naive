---
type: methodology-assignment
id: A-001
entity: "everything-ecosystem"
system: "Product Anatomy runner JSON output"
methodology: [tdd]
status: proposed
answers:
  M1: { value: "the role rules in code, checked by test.mjs; the JSON shape is stated in the README", basis: tested }
  M2: { value: "knowable before building: the fields are those the Markdown already shows", basis: tested }
  M3: { value: "stable; the roles change only when Product Anatomy's rules change", basis: assumed }
  M4: { value: "low; an internal tool, reversible in one commit", basis: tested }
  M5: { value: "high; tests compare JSON to the Markdown and to known fixtures", basis: tested }
  M6: { value: "low; no outside party", basis: tested }
  M7: { value: "AI agents, gated by tests", basis: tested }
  M8: { value: "long enough to matter: every venture's matrix runs through it", basis: assumed }
  M9: { value: "one module; its boundary is the CLI and the JSON shape", basis: tested }
  M10: { value: "if other tools come to depend on the shape, treat it as a contract and version it", basis: assumed }
  M11: { value: "the previous handoff on the same file (anatomy-runner-fixes) ran as a small change with tests", basis: tested }
  M12: { value: "low; nobody waits on it", basis: tested }
artifact-types: [adr-madr]
recommendation-ref: "register/_recommendations/R-2026-10-27-06-05-18-product-anatomy-runner-json-output-scoring-v2.json"
source: machine
created: 2026-10-27
ai-model: "ee propose; recommendation by jev-1.13.0"
tags: [assignment, proposed]
---

# A-001 Product Anatomy runner JSON output

**Proposed, not ratified.** The founder ratifies by editing `status`, `ratified-by` and `ratified-on` and recording the decision in the entity's ledger (I1, I2).

Add a JSON output mode to the Product Anatomy runner (purpose/frameworks/product-anatomy/anatomy.mjs matrix --json): the substrate, and for each phase the flagship, ties, successor and every product's portfolio role, as one JSON document. Today the runner prints Markdown only, so its tests parse the table; the first handoff's lesson was that a parser read the wrong rows. Consumers: the runner's own test.mjs, run-handoff self-proofs, and agents that read the matrix. The Markdown output stays and is rendered from the same data. Node only, no dependencies, one file plus tests.

## Options considered (from register/_recommendations/R-2026-10-27-06-05-18-product-anatomy-runner-json-output-scoring-v2.json)

- **tdd** — score 0.79 (whole 0.8, part 0.93) — **proposed**
- **spec-anchored** — score 0.45 (whole 0.36, part 0.76)
- **extreme-programming** — score 0.43 (whole 0.53, part 0.79)
- **design-by-contract** — score 0.4 (whole 0.42, part 0.81); unfit: Types plus tests express the same thing more cheaply
- **small-change** — score 0.33 (whole 0.84, part 0.93); unfit: New module behaviour or a new public endpoint
- **contract-first** — score 0.31 (whole 0.23, part 0.71)
- **spec-as-source** — score 0.31 (whole 0.22, part 0.51)
- **v-model** — score 0.31 (whole 0.76, part 0.87); unfit: Small, low-risk or easily reversed changes, where a test specification at every level costs more than it saves (low cost of being wrong)
- **consumer-driven-contracts** — score 0.24 (whole 0.19, part 0.48)
- **bdd** — score 0.23 (whole 0.4, part 0.77); unfit: Internal library code
- **model-driven** — score 0.2 (whole 0.22, part 0.49)
- **kanban** — score 0.13 (whole 0.18, part 0.32)
- **lean-software-development** — score 0.13 (whole 0.26, part 0.46); unfit: A fixed, well-understood specification must be delivered exactly, so there is little waste to remove
- **spec-first** — score 0.13 (whole 0.24, part 0.43); unfit: Tiny changes; Intent that must stay true for months
- **devops** — score 0.12 (whole 0.13, part 0.29)
- **spiral** — score 0.11 (whole 0.14, part 0.23); unfit: Small, low-risk work where the risk analysis costs more than it saves
- **rapid-application-development** — score 0.1 (whole 0.14, part 0.25); unfit: Users cannot be available during development
- **user-centred-design** — score 0.08 (whole 0.09, part 0.16)
- **spike-prototype** — score 0.07 (whole 0.13, part 0.29); unfit: Multiple consumers already depend on it
- **waterfall** — score 0.07 (whole 0.24, part 0.44); unfit: A small, low-risk change that fits in one short piece of work: phase-by-phase sign-off costs more than the change
- **agile-waterfall-hybrid** — score 0.04 (whole 0.17, part 0.26); unfit: A single small change with no milestone plan around it: use small change
- **scrum** — score 0.02 (whole 0.16, part 0.24); unfit: A single small change that needs no sprint, backlog or product owner: use small change

## Research before ratifying

_None flagged._

## Evidence

_None recorded yet._
