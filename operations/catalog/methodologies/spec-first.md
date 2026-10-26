---
publish: true
type: catalog-methodology
id: spec-first
name: "Spec-first"
domain: software
family: spec-driven
lifecycle: listed
source-of-truth: "A change spec that expires at merge"
answers:
  M2: { value: "knowable", basis: assumed }
  M3: { value: "stable for the change", basis: assumed }
  M4: { value: "medium", basis: assumed }
  M5: { value: "review plus tests", basis: assumed }
  M7: { value: "good for one agent session", basis: assumed }
fits-when:
  - "A slice with known acceptance criteria, done in one agent session"
unfit-when:
  - "Tiny changes"
  - "Intent that must stay true for months"
switch-when:
  - "The spec must stay true for months: move to spec-anchored"
artifact-types: [spec-document]
bodies-of-knowledge: []
evidence: []
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, spec-driven]
---

# Spec-first

A spec written before AI-assisted coding guides one task. Böckeler's first level; Kiro and Spec Kit mostly work here.
