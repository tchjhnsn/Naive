---
publish: false
type: catalog-methodology
id: user-centred-design
name: "User-centred design (iterative, evaluation-led)"
domain: software
family: exploratory
lifecycle: candidate
source-of-truth: "The experience documents (users, jobs, journeys, objects, states) plus the latest evaluated design; each iteration's evaluation findings decide what changes"
answers:
  M2: { value: "partly knowable: who the users are and what they must accomplish can be stated; how the interface should look and behave is discovered by designing and evaluating with users or proxies", basis: assumed }
  M3: { value: "changes driven by learning from evaluation, in short loops", basis: assumed }
  M4: { value: "low while designs are sketches or prototypes; rising once users depend on the interface", basis: assumed }
  M5: { value: "evaluation with users (task success, errors, comprehension) or, when users can't be reached, expert walkthrough against stated tasks", basis: assumed }
  M7: { value: "designers or AI agents produce sketches and prototypes from the experience documents; people evaluate", basis: assumed }
fits-when:
  - "People must do and understand things through an interface, and how is not yet known"
  - "Trust, comprehension or wording decides whether the product is used"
  - "Experience documents exist (users, jobs, journeys, objects, states) to design against"
unfit-when:
  - "No human uses the system directly (a library, a protocol, a batch job)"
  - "The interface is already settled and only needs maintenance: use small change"
switch-when:
  - "A view survives two evaluation rounds without new questions: fix it as fidelity ladders, a front-end contract and journey scenarios, and maintain it by spec"
artifact-types: [bdd-scenarios, test-suite]
bodies-of-knowledge: ["ISO 9241-210:2019 Human-centred design for interactive systems", "Nielsen, Usability Engineering (1993)", "Prater, Object-Oriented UX"]
evidence: []
last-checked: 2026-10-11
source: hybrid
created: 2026-10-11
ai-model: claude-opus-5.5
tags: [catalog, methodology, exploratory, ux, interface]
---

# User-centred design

Iterate between understanding users, designing, and evaluating, until the design meets stated tasks. ISO 9241-210 names the loop: understand the context of use, specify user requirements, produce design solutions, evaluate against requirements. Added 2026-10-11 as a candidate because the catalog had no interaction-design methodology, and the UI-01 recommendation for a reference suite produced a weak result (top score 0.32, "small change" in band 1) for that reason. Wireframes, prototypes and usability reports are its artifacts; the artifact catalog doesn't list them yet.
