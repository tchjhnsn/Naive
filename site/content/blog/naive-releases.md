---
title: Naive 0.1.0, 0.2.0, and 0.3.0
date: 2026-10-29
authors:
  - Torian
summary: The versions recorded in schema/upgrades.json, from the layer layout through package folders and the split between packages and kits.
tags:
  - releases
image: /blog/naive-releases/image
---

<!-- DRAFT: agent-written, needs Torian -->

`packages/naive/src/engine/upgrades.json` records three Naive versions. Its framework field is 0.3.0. A venture with no pin in `naive.config.json` is treated as 0.1.0.

## 0.1.0, the layer layout

Dated 2026-10-27. The summary in that file says records live under `purpose/`, `knowledge/`, `operations/`, `governance/`, and `pillars/` (EE-030, EE-032).

```json
{
  "version": "0.1.0",
  "date": "2026-10-27",
  "summary": "The layer layout: records under purpose/, knowledge/, operations/, governance/ and pillars/ (EE-030, EE-032). A venture with no pin in naive.config.json is on this version."
}
```

EE-030 gives the system one route table, generated from `packages/naive/src/records/data-model.json` and the kit manifests, with a command line, an MCP server, and a local HTTP API over it. EE-032 says routes follow the Next.js App Router, and a route is its record's folder path.

## 0.2.0, package folders

Dated 2026-10-29. The summary says records move into `foundation/`, `validation/`, `product/`, `marketing/`, `people/`, and `decisions/`, with the old routes kept as aliases (EE-070). The guide is `docs/upgrades/0.2.0.md`. The migration id is `package-layout`.

The guide says the migration:

- Moves foundation records, including `purpose/validation/problem.json` to `foundation/problem.json`, `purpose/icp.json` to `foundation/icp.json`, `purpose/alignment.json` to `foundation/alignment.json`, and `purpose/telos.draft.md` to `foundation/telos.draft.md`.
- Moves validation records to `validation/`, the team plan to `people/team-plan.json`, product cards from `products/` to `product/`, and Product Anatomy files to `product/anatomy/`.
- Moves decision files from `purpose/decisions/`, `purpose/anatomy/decisions/`, and `operations/decisions/` into `decisions/`. Each one is stamped with the path of the record it decides first.
- Moves the brand pillar to `marketing/brand.md` and rewrites the publication policy to point there.
- Creates `raw/dump`, `raw/sources`, `ideas`, `finance`, `customers`, `investors`, `money`, and `public`.
- Writes `.release/layout.json` with every move.

Files move with `git mv` when git tracks them. Each move is a new provenance line. The product and business pillars, and anything under `purpose/research/`, are archived under `_private/` and listed for a person to place. Old routes keep answering through `packages/naive/src/router/route-aliases.json`. The guide says agents that still use the old routes keep working for one release.

The guide's own status is DRAFT. EE-070 is proposed in `docs/decisions/decisions.json`. The upgrade command is described on the [upgrading](/docs/get-started/upgrading) page.

## 0.3.0, packages and kits

Same date, 2026-10-29. The summary says packages are Naive's and kits are Mentura's (EE-071): `naive.config.json` pins the framework and each package, and routes inside records are package routes. The guide is `docs/upgrades/0.3.0.md`. The migration id is `kit-to-package`.

The guide says a package is Naive's open definition: schemas, templates, and checks. A kit is Mentura's enhanced package: automations, agent workflows, skills, and connectors. The upgrade pins `naive.version`, `naive.channel`, and every package the venture uses. Names in `naive.config.json` `kits` that are Naive packages move into `packages`. A Mentura kit stays in `kits`. Any other name is escalated.

EE-071 is proposed. The 0.3.0 guide's status is DRAFT.

## Where this is written

- `packages/naive/src/engine/upgrades.json`
- `docs/upgrades/0.2.0.md`
- `docs/upgrades/0.3.0.md`
- EE-030, EE-032, EE-070, and EE-071 in `docs/decisions/decisions.json`
