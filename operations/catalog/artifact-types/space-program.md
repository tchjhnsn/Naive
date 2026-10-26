---
publish: true
type: catalog-artifact-type
id: space-program
name: "Space programme (room schedule)"
question-answered: "What is each room for, who uses it, and how much space does that intent require?"
readers: [person, machine, outside-party]
use: [read, checked]
notations: ["Room schedule: room, intent, occupancy (persons per bedroom), privacy level, acoustic and visual separation, adjacency to shared rooms, who controls the space, derived area, source"]
formats: [csv, markdown]
alternatives: [bim-model]
use-when:
  - "Before design: rooms must be justified by their intended use, occupancy and behaviour"
  - "Several stakeholders must agree what the building is for"
unfit-when:
  - "A standard unit plan is being repeated with no change of use"
lifecycle: listed
last-checked: 2026-10-11
source: hybrid
created: 2026-10-11
ai-model: claude-opus-5.5
tags: [catalog, artifact-type, candidate, built-environment]
---

# Space programme (room schedule)

Listed 2026-10-11 after research: the established method is architectural programming (Peña and Parshall, *Problem Seeking*: goals, facts, concepts, needs, problem statement). States each room's intent and derives its area from use and from the behavioural basis of design (Robert Sommer, *Personal Space*) as well as from codes. Feeds the building model. Research pass 2 (2026-10-11): perceived crowding, persons per bedroom, privacy and layout predict outcomes better than floor area, so area is derived from them, not set first. No single area threshold is settled ([[physical-methodologies-research-2026-10-11]]).
