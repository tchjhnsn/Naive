---
publish: true
type: catalog-methodology
id: bdd
name: "Behaviour-driven development"
domain: software
family: test-first
lifecycle: listed
source-of-truth: "Automated Given/When/Then scenarios"
answers:
  M2: { value: "knowable", basis: assumed }
  M3: { value: "a few primary use cases", basis: assumed }
  M4: { value: "medium", basis: assumed }
  M5: { value: "scenario runner", basis: assumed }
  M7: { value: "agents pad scenarios; cap their number", basis: assumed }
fits-when:
  - "Locking a handful of primary use cases with a stakeholder"
unfit-when:
  - "Internal library code"
  - "Wire-level details: use a contract"
switch-when:
  - "Scenarios multiply unread: hold a product decision session first"
artifact-types: [bdd-scenarios, test-suite]
bodies-of-knowledge: []
evidence: []
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, test-first]
---

# Behaviour-driven development

Stakeholder-readable scenarios that drive tests. Keep them few and automated.
