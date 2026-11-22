# supply-chain

Up: [functions](../README.md)

## What this is

The supply chain function (APQC 4.0, Manage Supply Chain for Physical Products). Its governance side is supplier approval; its operations side is sourcing, production, inventory and shipping. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The supply chain agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's suppliers and orders |
| [workflows/monthly-supply-review.json](./workflows/monthly-supply-review.json) | Workflow: review suppliers, orders and supply risk each month |
| [skills/supplier-and-purchasing](./skills/supplier-and-purchasing) | Skill: keep the approved supplier list and purchase orders: supplier evaluation, Kraljic risk classes and single sources, Incoterms 2020, landed cost and reorder points |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/supply-chain.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |
