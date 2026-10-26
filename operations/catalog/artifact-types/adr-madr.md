---
publish: true
type: catalog-artifact-type
id: adr-madr
name: "Architecture decision record (MADR)"
question-answered: "Why did we decide this, which options did we reject, and what did we give up?"
readers: [person, agent]
use: [read]
notations: ["MADR template"]
formats: [markdown]
alternatives: ["Nygard ADR (context, decision, consequences)", "Y-statement (one sentence)", "Decision log row"]
use-when:
  - "A decision is hard to reverse or will be questioned later"
  - "Several options were seriously considered"
unfit-when:
  - "The decision is trivial or easily reversed: a decision-log row is enough"
lifecycle: listed
last-checked: 2026-10-10
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, artifact-type, adr]
---

# Architecture decision record (MADR)

Markdown Architectural Decision Records: title, context, decision drivers, options considered with pros and cons, decision, consequences. Chosen for the Ecosystem's own decisions (2026-10-10) because it keeps the rejected options.
