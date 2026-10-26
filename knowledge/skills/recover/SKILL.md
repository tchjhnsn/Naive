---
name: recover
description: "Recover a built thing's behaviour, design or spec (reverse engineering, teardown, distillation) and record it in the vault with purpose, legal basis, evidence and confidence. Software targets run through REA (the `reverse-engineer-anything` skill and MCP); business and physical targets use the same record. Use when the owner says reverse engineer, decompile, teardown, distill, recover the spec, how does X work under the hood, or wants to rebuild or interoperate with an existing product. MANDATORY TRIGGERS: reverse engineer, decompile, disassemble, teardown, distill, recover, recovered artifact, clean room, how does this app work, rebuild X."
type: skill
source: hybrid
created: 2026-10-12
ai-model: claude-opus-5.5
tags: [skill, recovery, reverse-engineering, distillation, rea, ip, domain-design]
---

# recover

Domain design: [[EVERYTHING_ECOSYSTEM_DOMAIN_DESIGN_2026-10-10]] (DD-04 direction, DD-05 I9, DD-12 Recovery). Origin: [[recovery-reverse-engineering-and-distillation-2026-10-12]]. Engine for software: REA (`reverse-engineer-anything` skill at `~/.agents/skills/reverse-engineer-anything`, MCP server `rea`).

Recovery runs intent provenance backwards: built thing → behaviour → design → spec. This skill adds what REA doesn't: an intake a person declares, a vault record, and a path from findings to spec candidates.

## 0. Timing gate (I10; check before intake)

Classify the recovery:
- **Competitor or incumbent product** (someone else's design): allowed only once the system it informs has its own first-principles design set: domain design (DD-04 to DD-06) and, where it has users, experience design (users and jobs, journeys, objects, states). If not, stop and say which design documents are missing (run `design-coverage`). Then recovery tests the design; it never seeds it.
- **Own system**, or **a customer's or government's own records or data for import**: exempt from the gate.
- A founder may lift the gate for one named recovery; record who and why.

Check the entity's decision ledger for a pause first.

## 1. Intake (I9; nothing runs before this)

Ask for, or confirm, and write down:

| Field | Meaning |
|---|---|
| `target` | Exact artifact: path, app and version, URL, product, object |
| `purpose` | What question the recovery answers (interoperate, audit, learn, compare, rebuild) |
| `legal-basis` | One of: `own-software`, `licensed-permits`, `open-source`, `interoperability`, `security-research`, `public-behaviour` (observing what any user sees), `other` (explain) |
| `declared-by` | The person who declared purpose and legal basis (the owner unless stated) |
| `clean-room` | `yes` if recovered material will inform a reimplementation: the spec is written by one party, the code by another who never sees decompiled output |
| `entity` | Which entity the recovery serves |

Rules:
- An agent may propose the intake; only a person declares `purpose` and `legal-basis`. If either is missing, stop and ask.
- If the target is someone else's proprietary software and the purpose is reimplementation, publication, or bypassing a protection measure (DMCA §1201), invoke the `ip-protection` skill and flag counsel review before any output leaves the vault.
- **Distilling AI models:** most providers' terms forbid it. Allowed only when the terms permit it, recorded as `licensed-permits`.
- Never extract or record secrets, keys or credentials found in a target (global security rules); note "secret present, not recorded".

## 2. Run

- **Software:** follow the `reverse-engineer-anything` skill. Route by target type (JavaScript/Electron, managed .NET, packages, browser, native). Native binaries need Ghidra (`GHIDRA_INSTALL_DIR`) or Hopper; check `rea doctor` if a tool is missing.
- **Business:** public sources, product use, pricing pages, filings; same record.
- **Physical:** teardown notes, photographs, scans; same record.

Keep REA's distinction between **observations, inferences and unknowns**, and its Evidence IDs and limitations.

## 3. Record

Write one raw source per recovery under the entity's `_sources/` (or the vault `_sources/` if cross-entity), per [[raw-source-taxonomy]]:

```yaml
type: raw-source
raw-source-type: recovered
source: machine
created: <time-awareness>
ai-model: <model>
target: "<artifact>"
target-version: "<version or digest>"
purpose: "<question>"
legal-basis: interoperability
declared-by: The owner
clean-room: no
recovery-tool: "rea-agents 4.0.1 (<engine>)"
evidence-path: "<where REA evidence or captures are kept>"
confidence: low | medium | high
tags: [recovered]
```

Body: observations (with Evidence IDs), inferences, unknowns, limitations.

## 4. Compile

**Recover, don't copy (the owner, 2026-10-12).** Recovery describes the source; it doesn't set the design. Much of what a source does is outdated or was never designed for our users. For each recovered element, decide one of:
- **preserve**: keep the source's form verbatim as evidence (e.g. a title exactly as published);
- **restructure**: pull out the kinds of information packed into one place (a title holding body, meeting type, date, time, event and status) and present each by its type, in a human-friendly way, while keeping the original alongside;
- **improve**: replace a pattern with a better one, citing a better example where one exists (e.g. CivicClerk's typed files with publication times, over Agenda Center's prose titles);
- **drop**: don't carry it forward.

Record the decision with the recovered artifact so the design layers (XD, UI) inherit it, not the source's habits.

- Produce the artifact the purpose needs (C4, sequence, state, data model, OpenAPI), each with `provenance: recovered`, a link to the raw source, and claims marked **assumed** until checked.
- If it feeds a build, draft spec candidates marked `recovered` / `assumed`, filed per the document-placement rule (research unless ratified).
- Novelty check (operator-knowledge Q4): when the recovery tests whether an idea is new, say what the existing artifact already does.

## 5. Close

Report: target, legal basis, what was observed vs. inferred, confidence, where the record lives, and any IP flag raised.
