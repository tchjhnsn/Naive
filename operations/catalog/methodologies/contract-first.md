---
publish: true
type: catalog-methodology
id: contract-first
name: "Contract-first / API-first"
domain: software
family: contract
lifecycle: listed
source-of-truth: "A machine-readable contract (OpenAPI, AsyncAPI)"
answers:
  M2: { value: "knowable at the boundary", basis: assumed }
  M3: { value: "boundary stable", basis: assumed }
  M4: { value: "high", basis: assumed }
  M5: { value: "contract checks in CI", basis: assumed }
  M7: { value: "enables parallel agents", basis: assumed }
fits-when:
  - "Any boundary between two systems or two agents"
  - "An API that is itself a product"
unfit-when:
  - "A solo spike with no second consumer yet"
switch-when: []
artifact-types: [openapi, asyncapi, json-schema]
bodies-of-knowledge: []
evidence: []
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, contract]
---

# Contract-first / API-first

Agree the contract before or alongside implementation and validate both sides against it.
