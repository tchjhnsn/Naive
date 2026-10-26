---
publish: true
type: catalog-artifact-type
id: bpmn
name: "BPMN diagram"
question-answered: "What happens, in what order, and who does it?"
readers: [person, machine, outside-party]
use: [read, executed]
notations: ["BPMN 2.0"]
formats: [bpmn, svg]
alternatives: [uml-activity, flowchart]
use-when:
  - "Business processes with several roles; processes a workflow engine will run"
unfit-when:
  - "A simple linear sequence: a flowchart is enough"
lifecycle: listed
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, artifact-type]
---

# BPMN diagram

Answers: What happens, in what order, and who does it?
