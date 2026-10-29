# AGENTS.md: northstar

The map of this venture for agents. Read it, then a route's layout, before writing anything here.

## How to work here

- List the routes with `mentura routes`. Read a route's `layout` and `template` before you write to it.
- Write through the router (the CLI or the MCP server), not by editing files. Every write is checked against its schema and recorded in provenance.jsonl.
- A write that fails closed comes back as a draft in `_drafts/`. A person accepts it with `mentura accept`.
- Never read or send anything under `_private/` to a model.
- A deeper AGENTS.md (for example `marketing/AGENTS.md`) adds to this one for the routes under it; the nearer one wins.

## Instructions

phase: validation
voice: plain words, in the founder's own terms
private: _private/
