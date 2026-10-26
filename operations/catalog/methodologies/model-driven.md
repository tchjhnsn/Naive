---
publish: true
type: catalog-methodology
id: model-driven
name: "Model-driven development"
domain: software
family: model-driven
lifecycle: listed
source-of-truth: "A model; code generated from it"
answers:
  M2: { value: "knowable", basis: assumed }
  M3: { value: "narrow domain", basis: assumed }
  M4: { value: "medium", basis: assumed }
  M5: { value: "generator plus tests", basis: assumed }
fits-when:
  - "Narrow code generation, such as SDK clients from OpenAPI"
unfit-when:
  - "General product development"
switch-when: []
artifact-types: [openapi, uml-class]
bodies-of-knowledge: []
evidence: []
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, model-driven]
---

# Model-driven development

Models or DSLs generate code. The historical precedent Böckeler warns spec-as-source may repeat.
