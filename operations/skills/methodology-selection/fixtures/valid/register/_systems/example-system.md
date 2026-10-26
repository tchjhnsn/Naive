---
type: system-description
entity: "example-entity"
system: "Example due-date calculator"
description: "Computes due dates for a fictional lending service. Each clock is defined by a rule: an anchor event, a direction (before or after), an amount and unit (business days, days, hours, months), a boundary phrasing, a counting rule and a versioned holiday calendar. Examples: a reminder at least 3 business days before an item is due; an escalation within 10 business days of a missed return. The calculator computes and reminds; it never takes an act. Every computed date must carry the rule and calendar version that produced it. Seven acceptance cases are hand-worked (month-end, leap day, daylight saving, retroactive holiday designation). The forbidden states F1 to F7 must never occur."
answers:
  M1: { value: "split: clock records for what each deadline is; acceptance cases for how counting works", basis: assumed }
  M2: { value: "knowable from the rules; exceptions flagged undetermined", basis: tested }
  M3: { value: "stable rules; change comes from outside (new holiday calendars, new locations)", basis: assumed }
  M4: { value: "high; a wrong date can trigger a wrongful penalty; reversible in the record, not in the world", basis: tested }
  M5: { value: "high; every date can be hand-worked and compared", basis: tested }
  M6: { value: "high; a reviewer must see the rule and calendar version behind any date", basis: tested }
  M7: { value: "AI agents, gated by tests", basis: assumed }
  M8: { value: "long; core of the service", basis: assumed }
  M9: { value: "rules, calendar and notification subsystems; boundary contract is the calculator's output record", basis: tested }
  M10: { value: "a clock that cannot be expressed as data drops to spec-anchored prose plus a flagged human decision", basis: assumed }
  M11: { value: "one case: hand-worked checks against real data caught a wrong rule", basis: tested }
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
tags: [system-description, example, golden-case]
---

Input for `ee recommend`, an invented example kept as the golden case (SD-20): the ranking should put spec-as-source (narrow), TDD and design by contract near the top, and should not put whole-system spec-anchored prose or spike/prototype first.
