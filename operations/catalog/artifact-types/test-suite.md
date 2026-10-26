---
publish: true
type: catalog-artifact-type
id: test-suite
name: "Test suite"
question-answered: "Does it behave correctly?"
readers: [machine, agent]
use: [executed]
notations: ["Code"]
formats: [code]
alternatives: [bdd-scenarios]
use-when:
  - "Anything with checkable outputs"
unfit-when:
  - "Behaviour not yet known"
lifecycle: listed
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, artifact-type]
---

# Test suite

Answers: Does it behave correctly?
