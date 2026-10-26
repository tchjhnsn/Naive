---
publish: true
type: catalog-methodology
id: spike-prototype
name: "Spike / prototype"
domain: software
family: exploratory
lifecycle: listed
source-of-truth: "Running experiment plus a short learning note"
answers:
  M2: { value: "discovered by building", basis: assumed }
  M3: { value: "unknown", basis: assumed }
  M4: { value: "low", basis: assumed }
  M5: { value: "use", basis: assumed }
  M7: { value: "agents work well on tiny briefs", basis: assumed }
fits-when:
  - "Use cases still countable on one hand but the shape is unknown"
  - "Killing bad ideas cheaply"
unfit-when:
  - "A public surface, custody or identity risk"
  - "Multiple consumers already depend on it"
switch-when:
  - "It survives 2-3 sessions or gains a second consumer: extract tests or a contract"
artifact-types: [test-suite]
bodies-of-knowledge: []
evidence: []
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, exploratory]
---

# Spike / prototype

Learn an unknown shape by writing throwaway or near-throwaway code. See sdd-cousins note §2.1.
