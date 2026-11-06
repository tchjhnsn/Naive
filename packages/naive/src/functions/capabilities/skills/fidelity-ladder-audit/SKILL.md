---
type: knowledge
tags: [everything-ecosystem, skills, fidelity-ladders, design-system, audit]
ai-model: claude-opus-5
created: 2026-09-09
source: hybrid
name: fidelity-ladder-audit
description: >
  Audit a project's component tree as a set of fidelity ladders — one domain
  object, many renderings ordered by how much of the object each shows — and
  produce the field-projection matrix, kernel, and gap list for each. Use when
  auditing a design system, cataloguing components, reconciling a component
  library against a data model, planning a new surface, or asking "how many
  ways do we render X?" Also use before adding a rendering of an object that
  already has one. Implements [[FIDELITY_LADDERS]]. MANDATORY TRIGGERS: fidelity
  ladder, component bundle, component audit, design system audit, component
  inventory, representation, view mode, kernel, projection matrix, how many
  ways do we render, object model, card variants, component gaps.
---

# Fidelity Ladder Audit

Audits a codebase against [[FIDELITY_LADDERS]]. The census is mechanical; the matrix is not.

## What this skill will and will not do

It **will** inventory a component tree, propose ladders from naming and prop shapes, and find components that render the same object at the same tier while disagreeing about its fields.

It **will not** decide what a component renders. Names and props are evidence, not truth. Every candidate the script emits is a question for a human, and the matrix is always hand-built from reading the components.

## Procedure

### Step 0 · Ground the session

Invoke [[skills/time-awareness/SKILL|time-awareness]]. The audit produces dated artifacts.

### Step 1 · Get the object lexicon from the data model, not from intuition

The object axis comes from the project's own vocabulary. In order of preference:

1. An entity-type enum in the code (`ENTITY_TYPES`, a discriminated union, a table list). This is authoritative — it is what the system already believes its objects are.
2. `DATA_MODEL_SPEC` headings or table names.
3. Frequency analysis of domain nouns in the data model, as a fallback.

```bash
grep -rn "ENTITY_TYPES\|EntityType =" <repo>/packages <repo>/apps --include=*.ts | grep -v node_modules
```

**If more than one entity-type enum exists, stop and record it.** Competing enums mean the system disagrees with itself about what its objects are, and no ladder built on either one is trustworthy. This is a finding, not an obstacle.

### Step 2 · Run the census

```bash
node ladder-census.mjs <components-dir> --json out.json
```

It reports three sections:

- **Candidate ladders** — components grouped by object, sorted by fidelity tier, with props and absent rungs.
- **Object-named, no representation suffix** — named for an object but not declaring a fidelity. Each is a question: a rung that needs renaming, or not a rendering at all?
- **Representation suffix, no object** — generic primitives, or objects missing from the lexicon.

### Step 3 · Re-run with the codebase's own nouns

The default lexicon is the *specified* vocabulary. Codebases drift from it, and the drift is where ladders hide. In one audit the largest ladder was invisible on the first pass because the spec says `officeholder` and the components say `Rep`.

Scan the third section for recurring nouns the lexicon missed, then re-run:

```bash
node ladder-census.mjs <components-dir> --objects Rep,Post,Event,Vault
```

**A ladder found only on the second pass is itself a finding** — it means the component names and the data model use different words for the same object.

### Step 4 · Read the top ladders and build the matrix by hand

Take the three or four objects with the most rungs. For each, open every rung and record what it actually renders. Then build the matrix from [[FIDELITY_LADDERS]] §4: fields down the side, rungs across the top, cells as full / reduced / promoted / absent.

Two things to watch for that the script cannot see:

- **Same-tier forks.** Two components at the same rung rendering the same object under different names. Compare their prop lists directly — near-identical shapes with different field names are the signature.
- **Encoding disagreements.** The same fact carried at different resolutions in different rungs — a boolean in one, a six-value enum in another. The richest encoding is usually the correct one, and the flattened ones are lossy.

### Step 5 · Name the kernel

For each ladder, the fields present in every rung. The script offers a `kernelCandidate` from prop intersection; treat it as a starting point, since props and rendered fields are not the same thing.

Then apply Rule K1: does every rung actually render the whole kernel? A rung that does not is either a defect or proof the kernel is drawn too wide.

### Step 6 · Add the machine rungs

The census only sees components. Find the non-visual renderings by hand — embed fragments, OG tags, JSON-LD, public API responses — and add them as columns. Per Rule K4 an audit without them is half an audit.

```bash
ls <repo>/apps/*/src/app/embed <repo>/apps/*/src/app/api 2>/dev/null
grep -rn "openGraph\|application/ld+json" <repo>/apps --include=*.tsx | grep -v node_modules
```

### Step 7 · Write the gap list

Per object, in this order of severity:

1. **Forked rungs** — same object, same tier, two components, disagreeing fields.
2. **Kernel violations** — a rung missing a kernel field.
3. **Lossy encodings** — a fact carried at lower resolution than the object supports.
4. **Missing rungs** — a fidelity the product needs and does not have.
5. **Naming drift** — components whose names do not state object and fidelity.

Missing rungs rank fourth deliberately. An absent rung is a gap; a forked rung is a bug that is already shipping.

## Output

An audit artifact with, per object: the ladder, the kernel, the projection matrix, and the gap list. Plus one project-level section for cross-cutting findings — competing enums, vocabulary drift, subsystems that implement the method in isolation.

File it per the vault's document-placement rule. An audit is a finding, not a contract: `product/research/` while it is a report, `product/spec/` only once it is elevated to a binding ladder contract — and per the authority gate, elevation and relocation are one edit.

## Notes

- The tier list in the script (page / panel / card / row / glyph / preview) is a default, not a truth. Projects with a genuinely different fidelity vocabulary should edit `TIERS` rather than force their components into these six.
- `NON_REPRESENTATION` filters infrastructure — filters, providers, shells. When the census looks empty for an object, check whether its components are being filtered out as infrastructure.
- The script never writes to the audited repo.
