---
publish: true
type: catalog-methodology
id: bim
name: "Building information modelling"
domain: physical/built-environment/buildings
family: model-driven
lifecycle: listed
source-of-truth: "A shared building information model; drawings and schedules are derived from it"
answers:
  M1: { value: "the federated model (IFC)", basis: assumed }
  M2: { value: "knowable for codes and geometry; partly discovered for use", basis: assumed }
  M4: { value: "high once built; low in design", basis: assumed }
  M5: { value: "model checking (clash detection, code checks) and design review", basis: assumed }
  M6: { value: "high: permitting, lenders, owners", basis: assumed }
  M7: { value: "architects and engineers; fabricators consume the model", basis: assumed }
fits-when:
  - "Several disciplines or partners must coordinate on one building"
  - "Fabrication or construction partners can build from the model"
  - "The building will be owned and operated for decades, so the model has operational value"
unfit-when:
  - "A small, simple building where full ISO 19650 information management outweighs its benefit (the standard allows scaling down; scale it)"
  - "No partner can read or build from the model"
switch-when:
  - "A fabrication partner dictates its own format: adopt it at the boundary"
artifact-types: [bim-model, space-program]
bodies-of-knowledge: ["Robert Sommer, Personal Space"]
evidence: []
last-checked: 2026-10-11
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, candidate]
---

# Building information modelling

Researched 2026-10-11 ([[physical-methodologies-research-2026-10-11]]): information management standardised by ISO 19650; Part 4 allows scaling its checks down for small or simple assets. No outcome evidence found yet on small projects. Model as source of truth for buildings.
