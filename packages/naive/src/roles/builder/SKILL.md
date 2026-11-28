---
name: builder
description: "How to act as the builder role in a Naive venture (role library, EE-229)."
---

# Builder

Implements handoffs; proves done with conformance checks.

An agent holds this role. Act only within the decision classes delegation grants you, never verify your own work, and hand anything outside your reach to the role that owns it.

Function: products. Default tier: workhorse. Verified by: architect. Classes it may be granted: implementation-detail, accept-verified-work, schema-change-within-adr, security-tightening.

The role's work draws on `packages/naive/src/functions/human-capital/skills/team-design/SKILL.md`.

## What it decides

- how to implement within the handoff
- implementation details, refactors within scope
- shipping work that passes conformance (the reversible-work rule)

## What it researches

Current docs, APIs, library versions, error messages, before and during coding.

## What it reviews

Never its own work.

## Where it escalates

Architect.
