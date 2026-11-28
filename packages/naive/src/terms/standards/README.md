# standards

Up: [terms](../README.md)

## What this is

The catalog of outside standards the Everything Ecosystem uses, maps to, has considered or has rejected: one record per standard, each saying what we take from it, which of our nouns and record types use it, and the gaps we found in it (EE-150). A citation of one source, such as a book or a page, stays a reference record; a standard is what many references and nouns rest on. Each record follows [`standard.schema.json`](../../records/standard.schema.json).

## Where things are

| Path | Holds |
|---|---|
| [`bfo.json`](./bfo.json) | Basic Formal Ontology, adopted: the top categories and the meaning of role. |
| [`prov-o.json`](./prov-o.json) | W3C PROV-O, mapped: provenance and the provenance log. |
| [`schema-org.json`](./schema-org.json) | Schema.org, mapped: Customer, and Role as the shape for role records. |
| [`ddd.json`](./ddd.json) | Domain-Driven Design, considered: the Shared Kernel pattern, which names the Everything Ecosystem's shared layer. |
| [`iso-iec-21838-1.json`](./iso-iec-21838-1.json) | ISO/IEC 21838-1, considered: what a top-level ontology is. Not yet confirmed at its url. |
| [`gufo.json`](./gufo.json) | gUFO, considered: relators for supply and resale relationships. |
| [`iof.json`](./iof.json) | Industrial Ontologies Foundry Core and supply chain ontology, considered: supply chain roles. |
| [`sysml-v2.json`](./sysml-v2.json) | SysML v2 and its API, considered: the backbone of the physical systems framework. |
| [`ifc.json`](./ifc.json) | Industry Foundation Classes, considered: building geometry. Not yet confirmed at its url. |
| [`gs1.json`](./gs1.json) | GS1, considered: maker, brand owner and reseller roles for retail. Written from memory, not yet confirmed. |

## Run and test

- `node packages/naive/src/terms/standards-test.ts` checks that each id is its file name, that every noun and record type named exists, that an adopted or mapped standard names a user, and that an unconfirmed one says why. `node test.mjs` runs it.
- `node packages/naive/src/records/validate.mjs` checks each record against its schema.

## How it connects

- Reads: [`ontology.json`](../ontology.json) for nouns and [`data-model.json`](../../records/data-model.json) for record types.
- A status means: adopted, we use its terms as our own; mapped, our terms map onto it under our own names; considered, planned or looked at and nothing uses it yet; rejected, looked at and not used.

## Not built

- A noun's `standard` field in `ontology.json` is still free text, not an id from this catalog.
- The catalog of ontologies (`ontology-catalog.json`) does not yet name these standards in its `imports`.
- Reference records do not yet point at the standard they cite.
