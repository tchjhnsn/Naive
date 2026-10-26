---
publish: true
type: catalog-methodology
id: set-based-design
name: "Set-based concurrent engineering"
domain: physical
family: exploratory
lifecycle: listed
source-of-truth: "A set of design alternatives and the constraints that narrow it; the chosen design emerges late"
answers:
  M2: { value: "partly discovered: key constraints are unknown at the start", basis: assumed }
  M3: { value: "unstable early; narrows over time", basis: assumed }
  M4: { value: "high if a point decision is made too early", basis: assumed }
  M5: { value: "each alternative tested against constraints as they become known", basis: assumed }
fits-when:
  - "Key constraints (site, jurisdiction, partners) are not yet known"
  - "A wrong early commitment would be very costly to reverse"
unfit-when:
  - "Constraints are already fixed and one design clearly satisfies them"
  - "The team cannot afford to carry several alternatives in parallel"
switch-when:
  - "Constraints are fixed: converge and switch to the model-based method for detailed design"
artifact-types: []
bodies-of-knowledge: []
evidence: []
last-checked: 2026-10-11
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [catalog, methodology, candidate]
---

# Set-based concurrent engineering

Researched 2026-10-11 ([[physical-methodologies-research-2026-10-11]]): origin at Toyota (Ward et al. 1995; Sobek, Ward and Liker 1999). No construction case studies found yet, so its fit for buildings is assumed. Keep design options open until evidence narrows them; suits uncertain physical work.
