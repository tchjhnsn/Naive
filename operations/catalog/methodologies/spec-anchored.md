---
publish: true
type: catalog-methodology
id: spec-anchored
name: "Spec-anchored (SAD)"
domain: software
family: spec-driven
lifecycle: listed
source-of-truth: "A living spec kept beside the code"
answers:
  M2: { value: "knowable", basis: assumed }
  M3: { value: "evolving but coherent", basis: assumed }
  M4: { value: "medium to high", basis: assumed }
  M5: { value: "only as good as its checks", basis: assumed }
  M7: { value: "agents ignore long prose specs", basis: assumed }
fits-when:
  - "Behaviour must stay coherent across many sessions and readers"
unfit-when:
  - "The spec is unverified prose"
switch-when:
  - "The spec can be made executable: tests or a contract become the anchor"
artifact-types: [spec-document, adr-madr]
bodies-of-knowledge: []
evidence: []
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, spec-driven]
---

# Spec-anchored (SAD)

The spec persists and evolves with the feature. SAD is the author's practice of spec-driven development at this level.
