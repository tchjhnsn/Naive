---
publish: true
type: catalog-artifact-type
id: spec-document
name: "Specification document"
question-answered: "What must be true of this system, and why?"
readers: [person, agent]
use: [read]
notations: ["SAD spec package"]
formats: [markdown]
alternatives: [bdd-scenarios, test-suite]
use-when:
  - "Narrative intent that people must read"
unfit-when:
  - "The intent can be made executable: prefer tests or a contract as the anchor"
lifecycle: listed
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, artifact-type]
---

# Specification document

Answers: What must be true of this system, and why?
