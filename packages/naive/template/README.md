# template

Up: [repository](../../../AGENTS.md)

## What this is

The files a new venture starts from, laid out the way the venture holds them (EE-118 step 8). Two levels, like `src/` and `public/` in a Next.js app: `src/` holds what the venture knows and does, one folder per function of the 13, each present even when empty (EE-115); `public/` holds the static files the venture hands out unchanged, with its register `public/assets.json`. `governance/` holds the templates a venture's own governance records extend. `knowledge/sources.json` is the template's source map (EE-042): its rules are the spend register's access matrix, field by field (the bank statement sync masters amount, currency and dates, finance owns status, IT's tool record masters approval). Its two sources are stand-in folders until a venture points them at its own connectors; `init-venture.mjs` does not copy it, and `node packages/naive/src/checks/check-sources.mjs` checks a venture's copy.

`node packages/naive/src/engine/init-venture.mjs <dir> <id> --layout src` copies `src/` and `public/` from here, then writes `venture.json` with `layout: "src"`. Each package folder the venture uses lands under the function that owns it (`PACKAGE_FUNCTION` in [`packages/naive/src/core/venture-paths.mjs`](../src/core/venture-paths.mjs)): `foundation/` in `src/strategy/foundation/`. `decisions/`, `evidence/` and `raw/` belong to no single function and stay at the top. Every record keeps its logical path (`foundation/problem.json`), so routes, citations and the provenance log never see the folder it sits in.

## Where things are

| Path | Holds |
|---|---|
| [`src/strategy/`](./src/strategy/) | Strategy |
| [`src/products/`](./src/products/) | Products and services |
| [`src/marketing-and-sales/`](./src/marketing-and-sales/) | Marketing and sales |
| [`src/supply-chain/`](./src/supply-chain/) | Supply chain |
| [`src/service-delivery/`](./src/service-delivery/) | Service delivery |
| [`src/customer-service/`](./src/customer-service/) | Customer service |
| [`src/human-capital/`](./src/human-capital/) | Human capital (HR) |
| [`src/it/`](./src/it/) | Information technology |
| [`src/finance/`](./src/finance/) | Finance and accounting |
| [`src/assets/`](./src/assets/) | Assets and facilities |
| [`src/risk-and-compliance/`](./src/risk-and-compliance/) | Legal, risk and compliance |
| [`src/external-relationships/`](./src/external-relationships/) | External relationships |
| [`src/capabilities/`](./src/capabilities/) | Business capabilities |
| [`public/`](./public/) | The static files a venture hands out |
| [`governance/`](./governance/README.md) | Decision rights, delegation, roles and pillar guides a venture's governance records extend (moved from `governance/venture-template/`; a record that names the old path still resolves for one release) |

## Run and test

- `node packages/naive/src/engine/src-layout-test.mjs` moves the example workspace onto the src layout and runs the venture checks on it.
- `naive upgrade <venture dir> --layout src` moves an existing venture, flat or structured, onto this layout; `--check` says what would move.
