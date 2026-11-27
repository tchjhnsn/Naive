---
title: What's built
status: not-publishable
source_states: [interim]
sources:
  - ventures/naive/interim/capabilities.json
generated: 2026-11-26
---
# What's built

Shipped, partial or planned. Each line links its evidence.

| Capability | Status | Note | Evidence |
|---|---|---|---|
| Create a venture as plain records (`naive new`) | shipped | Ran in this run; exit 0 | runs/naive-self-20261126-1/evidence/naive-new.txt |
| Decision docket: what a person must decide next, ranked | shipped | Ran in this run | runs/naive-self-20261126-1/evidence/cmd-decisions.txt |
| Agents propose; strategy and public-commitment writes become drafts for a person | shipped | 12 writes landed in k-base/_drafts | runs/naive-self-20261126-1/writes.jsonl |
| Provenance chain on every write | shipped | `naive check`: 65 entries, every chain holds | runs/naive-self-20261126-1/evidence/cmd-check.txt |
| A source and its text written together (EE-192) | shipped | 30 raw sources written; data-packages check passes | runs/naive-self-20261126-1/writes.jsonl |
| Phase gate with evidence levels | partial | Runs (evidence/cmd-system_phase-gate.txt) but only discovery has gate items; drafts do not count toward it | https://github.com/tchjhnsn/Naive/blob/134d2d35063b8b232389b0fb254d152ae40639a1/packages/naive/src/phases/gate-policies.json |
| Lean Canvas view over records | shipped | Ran in this run | runs/naive-self-20261126-1/evidence/cmd-identity_lean-canvas.txt |
| Plan the public site from records | partial | Runs, but offerings are empty while product cards are locked, and hiring is read only from legacy purpose/icp.json | runs/naive-self-20261126-1/evidence/cmd-operations_marketing_sitemap.txt |
| Write public page variants (MDX) | partial | marketing/content is a beachhead route; CLI write expects JSON, so MDX cannot be written through it | https://github.com/tchjhnsn/Naive/blob/134d2d35063b8b232389b0fb254d152ae40639a1/packages/naive/src/functions/marketing-and-sales/marketing/site/plan.ts |
| MCP server for any AI client | shipped | Code present; not exercised in this run (CLI used instead) | https://github.com/tchjhnsn/Naive/blob/134d2d35063b8b232389b0fb254d152ae40639a1/packages/naive/src/interfaces/mcp |
| Claude Code plugin | shipped | Not installed in this run | https://github.com/tchjhnsn/naive-plugins |
| Term engine with Lean proofs (EE-095) | partial | 182 theorems, no sorry (EE-095), but admission checks only that a named theorem exists | https://github.com/tchjhnsn/Naive/blob/134d2d35063b8b232389b0fb254d152ae40639a1/packages/naive/lean |
| Bring an existing project in (`naive port`) | partial | 4 sub-tests fail at this SHA | runs/naive-self-20261126-1/evidence/naive-test.log |
| Full test suite green | partial | 3 failing groups at this SHA: naive port, founders before ventures, decision affects grammar | runs/naive-self-20261126-1/evidence/naive-test.log |
| Published package | shipped | naive-framework 0.6.0, published 2026-10-29 | https://registry.npmjs.org/naive-framework |
| Mentura account creation | partial | /sign-in offers Create your account; /sign-up returns 404 | https://mentura.xyz/sign-in |
| Agent runs hosted in Mentura | planned | Marked "Not built in B1" | https://github.com/tchjhnsn/reflect |
| Metered model credits per organization | planned | AGENT_RUNTIME design Q10: pass-through metered cost first, BYOK later; not built | https://github.com/tchjhnsn/reflect |
