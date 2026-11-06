---
name: findability
type: reference
source: hybrid
created: 2026-10-14T03:30:00Z
ai-model: claude-opus-5.5
description: "Check whether an entity's documents and decisions can be found (SAD v3.0.16 §NEW.26). Free structural inventory at every phase boundary; paid TypeSafe deep pass for domain classification and decision contradictions. Use when the owner says findability, orphans, rediscovery, scattered, discombobulated, vault audit, or at phase boundaries."
tags: [skill, methodology, findability, registries, rediscovery]
---

# Findability

Ratified in [[SAD_SKILL_v3_AMENDMENT_2026-10-13_findability-product-harness-and-repository-structure]] (v3.0.16). Built from an organization campaign.

## 1. Structural inventory (free, every phase boundary)

```bash
ruby -E UTF-8 packages/naive/src/functions/capabilities/skills/findability/inventory.rb <vault>/projects/<entity>
```

Reports: notes without frontmatter, YAML errors, orphans, governance notes missing `governed-by` or `authority`, authority-gate violations, wholly superseded notes not archived (partly superseded notes are excluded on purpose), and governance notes with lock language but no D- or ADR number. `--json out.json` writes the full rows.

## 2. Rediscovery check (every session, SAD PART 4 step 4d)

Before creating a decision, ADR, term, source, dependency, skill, contract, risk or open question, search the entity's ledger, ADR register and `_meta/registers/`; cite what exists.

## 3. Deep pass (paid, phase boundaries and campaigns)

Reference implementation: a private synthesis project (`synth.mjs` classifies notes by domain, product, layer and kind; `decisions.mjs` compares ledger decisions pairwise within a domain). TypeSafe Jev, cached; key from the repo's `.env.local`, never printed. Lessons from the first run:
- Ask *wholly* versus *partly* superseded; 11 of 12 "superseded" flags were partial.
- A domain list that misses areas leaves decisions uncompared (27 of 120 in the first run); include company-structure and peer-company domains.
- Treat results as leads to confirm, not findings.
