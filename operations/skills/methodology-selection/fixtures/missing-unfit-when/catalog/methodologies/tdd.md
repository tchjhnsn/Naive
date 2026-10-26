---
type: catalog-methodology
id: tdd
name: Test-driven development
domain: software
family: test-first
lifecycle: listed
source-of-truth: "Tests"
answers:
  M1: { value: "the test suite", basis: assumed }
  M2: { value: knowable, basis: assumed }
  M3: { value: "known behaviour, may evolve", basis: assumed }
  M4: { value: "medium to high", basis: assumed }
  M5: { value: "test runner, seconds of feedback", basis: assumed }
  M7: { value: "agents loop well on failing tests", basis: assumed }
fits-when:
  - "Pure functions and services with checkable outputs: date arithmetic, rules, parsing"
  - "Agents building with little oversight, gated by a red-green loop"
unfit-when: []
switch-when:
  - "Behaviour is still being discovered: move to a spike, return to TDD when it stabilises"
artifact-types: [adr-madr]
bodies-of-knowledge: []
evidence: []
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, test-first]
---

# Test-driven development

Write a failing test, make it pass, refactor. Tests are themselves a form of specification, and often a better anchor than prose because they are checked on every run ([[sdd-cousins-pros-cons-api-first-2026-08-11]] §4.1).
