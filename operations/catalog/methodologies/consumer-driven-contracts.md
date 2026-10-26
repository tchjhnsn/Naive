---
publish: true
type: catalog-methodology
id: consumer-driven-contracts
name: "Consumer-driven contracts"
domain: software
family: contract
lifecycle: listed
source-of-truth: "Each consumer's published expectations"
answers:
  M2: { value: "knowable", basis: assumed }
  M3: { value: "several known consumers", basis: assumed }
  M4: { value: "high", basis: assumed }
  M5: { value: "contract tests per consumer", basis: assumed }
fits-when:
  - "Several internal consumers whose needs diverge"
unfit-when:
  - "One consumer"
  - "Unknown public consumers"
switch-when: []
artifact-types: [test-suite]
bodies-of-knowledge: []
evidence: []
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, contract]
---

# Consumer-driven contracts

Consumers publish expected interactions; the provider must satisfy them (Pact). Complements OpenAPI.
