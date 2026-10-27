---
publish: true
type: catalog-methodology
id: spec-as-source
name: Spec-as-source
domain: software
family: spec-driven
lifecycle: listed
source-of-truth: "Spec; code is generated from it and not edited by hand"
answers:
  M1: { value: "the spec", basis: assumed }
  M2: { value: knowable, basis: tested }
  M3: { value: "stable and formalisable", basis: assumed }
  M4: { value: medium, basis: assumed }
  M5: { value: "regeneration gated by tests or formal checks", basis: assumed }
  M7: { value: "agents, only when generation is gated", basis: assumed }
fits-when:
  - "Correct behaviour can be stated before building and written formally or in a structured form"
  - "Narrow, schema-shaped domains: validators, protocol code, SDK clients, clocks or rules as data"
unfit-when:
  - "Exploratory or UI-heavy work where behaviour is discovered by building"
  - "Repository-scale systems specified in prose"
  - "No automated check stands between regeneration and merge"
switch-when:
  - "The spec cannot be made precise: fall back to spec-anchored with tests as the anchor"
artifact-types: [adr-madr]
bodies-of-knowledge: ["Böckeler, B., Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl, martinfowler.com, 2025 (spec-first, spec-anchored, spec-as-source)"]
evidence: []
last-checked: 2026-10-27
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, spec-driven]
---

# Spec-as-source

The spec is the only thing people edit; code is derived from it. The third and strictest level in Böckeler's spec-first / spec-anchored / spec-as-source framing.

Evidence so far ([[specs-as-source-survey-2026-10-10]]): feasible in narrow formal domains (Scania spec2code); regeneration from prose is non-deterministic (Böckeler on Tessl). The strongest empirical result found (Tufano et al.) supports specs as a reasoning step, not as the source. It also applies in a narrow sense wherever rules can be stored as data that a generic engine interprets: the records are the spec.

Re-check (2026-10-27): the framing still holds; Böckeler's article (checked today) defines the three levels this catalog uses, and notes that the maintenance strategy for specs is often left vague, which the third unfit-when line already guards against. Returned to `listed`.
