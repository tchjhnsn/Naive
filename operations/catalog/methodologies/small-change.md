---
publish: true
type: catalog-methodology
id: small-change
name: "Small change"
domain: software
family: maintenance
lifecycle: listed
source-of-truth: "Existing tests, contract or code"
answers:
  M2: { value: "knowable", basis: assumed }
  M3: { value: "stable", basis: assumed }
  M4: { value: "low", basis: assumed }
  M5: { value: "existing tests", basis: assumed }
fits-when:
  - "Bugs, copy, styling, an obvious one-endpoint tweak"
unfit-when:
  - "New module behaviour or a new public endpoint"
switch-when:
  - "The change grows into new behaviour"
artifact-types: [test-suite]
bodies-of-knowledge: []
evidence: []
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, maintenance]
---

# Small change

Fix or tweak known behaviour without opening a full methodology. See sdd-cousins note §2.2.
