# founder-templates

Up: [naive](../README.md)

## What this is

Public founder templates (EE-198). A template holds placeholders, ranges and labelled examples. It never holds a real company's values. The venture scaffold stays in [`template/`](../template/README.md).

## Where things are

| Path | Holds |
|---|---|
| [`discovery/cross-industry/subscription/template.json`](./discovery/cross-industry/subscription/template.json) | One template. The phase is a `venture.schema.json` phase. The industry is the cross-industry edition of APQC's PCF, which is the edition this repository carries. The archetype is `subscription` from [`business-models.json`](../src/records/vocab/business-models.json). |

The layout is `founder-templates/<phase>/<industry>/<archetype>/`.

## Run and test

- `node packages/naive/src/checks/check-evals.ts` fails when a template file cites a Dogfood path, a gold path or a run venture.

## How it connects

- Cited by synthetic exemplars in [`../exemplars/README.md`](../exemplars/README.md).
- Checked by [`check-evals.ts`](../src/checks/check-evals.ts).

## Not built

- Industry-specific APQC PCFs are not in this repository, so no template uses one yet.
