# library

Up: [naive](../README.md)

## What this is

The venture package library (EE-070, EE-071, step 6). A venture package is a folder of records a venture adopts by function, such as foundation, people or money; `catalog.json` lists them.

## Where things are

| Path | Holds |
|---|---|
| [`packages/`](./packages) | One folder per venture package, each with its `package.json`. |

A package may carry `gate_rules`, which the venture's gate imports (unless `naive.config.json` `gate.packages` leaves the package out). The evidence package's `recipe-keeps-held` holds every agent write to `recipes/**` that is kept as a draft, so an agent's kept recipe becomes the tip without going live (autoresearch build plan item 6); only a person's `mentura accept recipes/<pattern>`, with its holdout check, writes it live (item 8).

Data packages hold master data a venture keeps without end, such as customers, investors and money. The competitors package ([`packages/naive/library/packages/competitors/`](./packages/competitors/README.md)) is one: it owns the competitor record types and ships open signal types and listeners in `signals/types/<id>/<version>.signal.json` and its manifest's `listeners` (signal library build item 6).

The finance package owns the spend register (`spend-register`, `finance/spend/[id]`, lead agents build item 2): one paid service per record, written only by the finance agent or a person. Its manifest gives the package a layer (`purpose`), as every package that owns a record type has.

The investor-relations package (function `external-relationships`) owns the raise (`raise`, `investor-relations/raises/[id]`: one fundraise with its ask, milestone, stop date, exemption, materials, target investors and meetings) and the stakeholder update (`stakeholder-update`, `investor-relations/updates/[id]`: one investor or board update). The capabilities package (function `capabilities`) owns the process catalog (`process`, `capabilities/processes/[id]`) and postmortems (`postmortem`, `capabilities/postmortems/[id]`). All four are written only by their function's agent or a person (writer function).

The raw package owns the raw record types: `raw-source` and `raw-text` (a founder-supplied source and its text), and, from raw triage build item 1 (`docs/design/RAW_TRIAGE_2026-11-09.md`), `raw-dump` (one capture per file at `raw/dump/<id>.md`) and `triage` (one triage run at `raw/triage/<id>.json`). All four are immutable once written.

The it package ([`packages/naive/library/packages/it/`](./packages/it/package.json)) is a data package the it function owns (lead agents build plan item 7): it owns the `connection` record type (`it/connections/<id>.json`, route `it/connections/[id]`) and the capability cluster catalog, and gives the it function its first write routes.

The sales package ([`packages/naive/library/packages/sales/`](./packages/sales/package.json)) is a data package the marketing and sales function owns: it owns the `opportunity` record type (`sales/opportunities/<id>.json`, route `sales/opportunities/[id]`), the sales pipeline from lead to won or lost. The support package ([`packages/naive/library/packages/support/`](./packages/support/package.json)) is a data package the customer service function owns: it owns `support-policy` (`support/policy.json`, route `support/policy`) and `support-case` (`support/cases/<id>.json`, route `support/cases/[id]`), and gives the customer service function its first write routes.
The assets package ([`packages/naive/library/packages/assets/`](./packages/assets/package.json)) is a data package the assets function owns: it owns the `fixed-asset` record type (`assets/register/<id>.json`, route `assets/register/[id]`) and the `lease` record type (`assets/leases/<id>.json`, route `assets/leases/[id]`). The legal package owns the `risk` record type (`legal/risks/[id]`) and the `obligation` record type (`legal/obligations/[id]`) for the risk-and-compliance function, and the finance package owns `budget` (`finance/budget/[id]`) beside the spend register.

The foundation package lists `packages/naive/src/records/validate.mjs` among its checks: records are validated in JavaScript, with no Python.

The validation package also owns the validation plan (`validation-plan`, `validation/plan.json`, EE-156): the assumptions not yet demonstrated, each with the gate item it bears on, its test, the result that counts as passing and a date. The discovery gate's validation-plan item reads it. Its route is `validation/plan`.
