---
type: venture-template-roles-readme
ai-model: claude-opus-5
source: hybrid
created: 2026-05-14
last-reviewed: 2026-08-10
updated: 2026-08-10
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [venture-template, roles, methodology, position-schema]
related:
  - "[[position-schema]]"
---

# `roles/` — role **templates** (not the org chart)

Per-role files describe what a seat *is in general* — responsibilities, non-responsibilities, pillar home. They are **role templates**.

**Position instances** (filled or vacant seats *in a specific company*, with occupancy human/agent/vacant/hybrid and team/project assignments) live on the entity under `business/org/positions/` (or brand/product `org/`). Canonical system: [[position-schema]]. Template: `_meta/templates/tpl-position.md`.

```
venture-template/roles/<slug>.md   →  what the role is
<entity>/business/org/positions/   →  the seat here + who/what fills it
```

The roles folder is **selective, not exhaustive**. Most ICs and many specialist roles don't have a file here — they live in the pillar files at `pillars/` or as one-off position instances. A role gets its own template file when:

1. Methodology mechanisms invoke it as context (e.g., `/ceo-review` reads `ceo.md` to know what to evaluate).
2. The role is common across most companies regardless of stage / industry.
3. The role has distinct enough deliverables + collaboration patterns to warrant its own page (rather than being one section in a pillar file).
4. **Staffing posture matters** (e.g. forward-deployed engineer as a `human-required` archetype).

## Status of role files

| Role | Status | Pillar | File |
|---|---|---|---|
| CEO | Authored 2026-05-14 | Company-wide | [[ceo]] |
| CTO | Authored 2026-05-14 | Product (lead) | [[cto]] |
| CMO | Authored 2026-05-14 | Brand (lead) | [[cmo]] |
| COO | Authored 2026-05-14 | Business (lead) | [[coo]] |
| Founder | Authored 2026-05-14 | Company-wide | [[founder]] |
| Chief of Staff | Authored 2026-05-14 | Company-wide | [[chief-of-staff]] |
| HR Manager | Stub 2026-08-10 | Business | [[hr-manager]] |
| Talent Acquisition Manager | Stub 2026-08-10 | Business | [[talent-acquisition-manager]] |
| Department Head (pattern) | Stub 2026-08-10 | Pattern | [[department-head]] |
| Forward-Deployed Engineer | Stub 2026-08-10 | Product | [[forward-deployed-engineer]] |
| CFO | Future | Business | `cfo.md` |
| General Counsel | Future | Business | `general-counsel.md` |
| CRO / VP Sales | Future | Business | `cro.md` |
| CPO (People) | Future | Business | `cpo.md` |
| VP Engineering | Future | Product | `vp-engineering.md` |
| Designer (Product) | Future | Product (× Brand) | `designer-product.md` |
| Designer (Brand) | Future | Brand (× Product) | `designer-brand.md` |
| Product Manager | Future | Product | `pm.md` |
| Engineering Manager | Future | Product | `em.md` |
| Customer Success Lead | Future | Business (× Product) | `cs-lead.md` |

**Authoring wave:** 6 exec roles authored 2026-05-14. Functional stubs (HR, TA, FDE, department-head pattern) added 2026-08-10 with [[position-schema]]. Next priority remains CFO + General Counsel when Business scope expands beyond COO.

## Role template JSON and its function

Each `<id>.json` here is a role template the delegation check reads (`packages/naive/src/records/role-template.schema.json`). Its `function` is an id in `packages/naive/src/functions/departments.json`, or `all` for the founder, the chief delegator, and for a lead (a role with a `portfolio`); `node packages/naive/src/checks/check-delegation.mjs` fails on any other value. Today: architect, builder and product-design-lead serve `products`; chief-of-staff serves `capabilities` (it runs the docket and handoffs, which is portfolio and project work); counsel serves `risk-and-compliance`; finance-agent serves `finance`; growth-lead, product-lead, finance-lead and strategy-lead are leads with `all`; marketing-lead serves `marketing-and-sales`; people-lead serves `human-capital`; validation-lead serves `strategy`.

`finance-agent.json` is the finance function's agent (EE-123), the only agent that writes the spend register (`finance/spend/[id]`). The founder grants it `spend-register-upkeep` and `cancel-or-downgrade` over `finance/` directly (`founder-to-finance-agent` in `../delegation.json`), since both are never re-delegated; that grant replaced `founder-to-finance-lead` (lead agents design, default 3). `finance-lead.json` kept its id and became a cross-function lead in build item 3 (default 3), so a venture that installed it keeps its grant id; its spend work is the finance agent's.

## Leads

A lead is a role over a portfolio of functions (lead agents design, build item 3). Four templates ship, with `function: "all"`, a `portfolio` of `packages/naive/src/functions/departments.json` ids and `default_measure_kinds` (telos measure kinds, `primary` meaning the telos's primary measure). The four portfolios cover the 13 functions once each, which `check-delegation.mjs` enforces.

| Lead | Portfolio | Default measure kinds |
|---|---|---|
| `growth-lead` | marketing-and-sales, customer-service | revenue, usage_or_adoption |
| `product-lead` | products, service-delivery, supply-chain, it | flow_and_lead_time, usage_or_adoption |
| `finance-lead` | finance, assets, risk-and-compliance | cost_or_time_saved, compliance_met |
| `strategy-lead` | strategy, capabilities, human-capital, external-relationships | primary, learning, impact |

human-capital sits with strategy-lead (default 2). Each lead may be granted `accept-verified-work`, `defer-or-route` and `set-priorities`, all from the chief of staff (`chief-of-staff-to-<lead>` and `chief-of-staff-to-<lead>-priorities` in `../delegation.json`), and is verified by the founder. A lead reads every record and writes only its lead plan (`operations/lead/<lead>`), `decisions/*` and `operations/handoff/*`; `check-team.mjs` refuses a lead in a team plan that writes more or is bound to no telos measure. Each lead's `skill` points at its main portfolio's existing skill; a lead skill of its own is not built.

## Per-role file structure

Every per-role file follows the same shape:

1. **Purpose** — one paragraph on what the role is for
2. **Primary pillar + secondary pillars** — where the role sits
3. **Typical responsibilities** — what the role owns
4. **Typical deliverables** — artifacts the role produces or sponsors
5. **Reporting + collaboration patterns** — who the role reports to + who reports to it
6. **Stage variations** — how the role changes from early-stage to mature
7. **Methodology mechanisms** — skills, hooks, or commands that invoke this role
8. **Status**

Stubs may omit later sections until expanded.

## How this folder relates to the pillars

Pillar files (`pillars/*.md`) list typical roles by pillar with one-line descriptions. Per-role files expand those into substantive descriptions. The two cross-link:

- Pillar file lists "CTO — Product pillar lead" with a link to `roles/cto.md`.
- Per-role file links back to `pillars/product.md` for the pillar context.

When pillar work needs role-specific guidance (e.g., articulation closure for the Product pillar needs to know what the CTO should review), the methodology mechanism reads both the pillar file and the role file.
