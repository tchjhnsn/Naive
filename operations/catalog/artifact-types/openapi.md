---
publish: true
type: catalog-artifact-type
id: openapi
name: "OpenAPI contract"
question-answered: "What is the contract of an HTTP API?"
readers: [agent, machine, person]
use: [checked, executed]
notations: ["OpenAPI 3"]
formats: [yaml, json]
alternatives: [asyncapi]
use-when:
  - "Any HTTP boundary"
unfit-when:
  - "Event-driven boundaries: AsyncAPI"
lifecycle: listed
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, artifact-type]
---

# OpenAPI contract

Answers: What is the contract of an HTTP API?
