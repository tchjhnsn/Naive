---
publish: true
type: catalog-methodology
id: design-by-contract
name: "Design by contract"
domain: software
family: contract
lifecycle: listed
source-of-truth: "Preconditions, postconditions and invariants"
answers:
  M2: { value: "knowable", basis: assumed }
  M3: { value: "stable invariants", basis: assumed }
  M4: { value: "high", basis: assumed }
  M5: { value: "assertions and types", basis: assumed }
  M7: { value: "precise constraints for agents", basis: assumed }
fits-when:
  - "Core invariants that must never break"
  - "Agents reasoning about edge cases (Tufano et al. 2026)"
unfit-when:
  - "Types plus tests express the same thing more cheaply"
switch-when: []
artifact-types: [test-suite, json-schema]
bodies-of-knowledge: []
evidence: []
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, contract]
---

# Design by contract

State what must hold going in, coming out and always. Tufano et al. (SpecOps '26) found agents that first write a contract catch more bugs.
