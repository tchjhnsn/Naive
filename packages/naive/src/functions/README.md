# functions

Up: [naive](../../../../README.md)

## What this is

One module per function of a venture, the 13 in [`departments.json`](./departments.json) (APQC's cross-industry categories, EE-047). Each module holds the skills, templates, frameworks and kits Naive ships for that function. They came out of the six layer folders (purpose, knowledge, operations, evidence, governance, interface) in EE-118 step 7: each item went to the function that owns it. The layers' own manifests, tooling lists and references moved to [`../records/layers/`](../records/layers/), because a layer still organizes record types in the data model. The interface layer's skills went to [`../interfaces/skills/`](../interfaces/skills/), because they are about using Naive, not about a venture function.

## Where things are

| Path | Holds |
|---|---|
| [`departments.json`](./departments.json) | The 13 functions: APQC category, value-chain place, governance and operations sides, and phase priors (EE-047, EE-028) |
| [`strategy/`](./strategy/README.md) | Strategy |
| [`products/`](./products/README.md) | Products and services |
| [`marketing-and-sales/`](./marketing-and-sales/README.md) | Marketing and sales |
| [`supply-chain/`](./supply-chain/README.md) | Supply chain |
| [`service-delivery/`](./service-delivery/README.md) | Service delivery |
| [`customer-service/`](./customer-service/README.md) | Customer service |
| [`human-capital/`](./human-capital/README.md) | Human capital (HR) |
| [`it/`](./it/README.md) | Information technology |
| [`finance/`](./finance/README.md) | Finance and accounting |
| [`assets/`](./assets/README.md) | Assets and facilities |
| [`risk-and-compliance/`](./risk-and-compliance/README.md) | Legal, risk and compliance |
| [`external-relationships/`](./external-relationships/README.md) | External relationships |
| [`capabilities/`](./capabilities/README.md) | Business capabilities |

## How it connects

- A venture's `venture.json` names its functions and their owners by these ids.
- The data model's layers still own the record types (`../records/data-model.json`); a function module owns no record type.
