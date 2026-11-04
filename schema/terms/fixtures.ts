// Real arrangements, run beside the generated cases. Each says where it comes from and what its authors expect
// each term to find; admit records what the term found and whether the expectation held. A refuted expectation
// is a finding, as with predictions.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Base } from "./engine.ts";
import type { Arrangement } from "./levels.ts";

export type Fixture<F extends Base> = { id: string; says: string; source: string; parts: string[]; facts: F; expects: Record<string, boolean> };

function arrangement(parts: string[], dependsOn: [string, string][], byConcern: boolean): Arrangement {
  const at = (p: string): number => { const i = parts.indexOf(p); if (i < 0) throw new Error(`fixture names an unknown part: ${p}`); return i; };
  return { confirmed: true, parts: parts.length, dependsOn: dependsOn.map(([a, b]) => [at(a), at(b)]), byConcern };
}

const stack = (parts: string[]): [string, string][] => parts.slice(1).map((p, i) => [p, parts[i]]);

/** The layers as built: one part per manifest, and a reader depends on the layer that owns a record type it
 *  reads (the rule schema/check-data-model.mjs uses for its layer relationships). */
function manifests(repo: string): Fixture<Arrangement> {
  const read = (f: string) => JSON.parse(readFileSync(join(repo, f), "utf8"));
  const model: { layers: string[]; records: { id: string; layer: string }[] } = read("schema/data-model.json");
  const owner = new Map(model.records.map((r) => [r.id, r.layer]));
  const parts = [...model.layers, "system"];
  const kits: { layer: string; reads?: string[] }[] = [...model.layers.map((l) => read(`${l}/layer.json`)), read("schema/layer.json")];
  const deps = new Map<string, [string, string]>();
  for (const k of kits) for (const t of k.reads ?? []) {
    const o = owner.get(t);
    if (o && o !== k.layer) deps.set(`${k.layer}>${o}`, [k.layer, o]);
  }
  return {
    id: "naive-layer-manifests", says: "Naive's layers as built: the six layer manifests and the system manifest, with the dependencies their reads declare",
    source: "<layer>/layer.json, schema/layer.json and schema/data-model.json", parts,
    facts: arrangement(parts, [...deps.values()].sort(), true), expects: { layer: false, area: true },
  };
}

const ee001 = ["purpose", "knowledge", "operations", "execution", "evidence", "governance", "interface"];
const osi = ["physical", "data link", "network", "transport", "session", "presentation", "application"];
const ontology = ["metamodel", "upper ontology", "catalog"];

export function arrangementFixtures(repo: string): Fixture<Arrangement>[] {
  return [
    {
      id: "naive-seven-ee-001", says: "Naive's seven groupings as EE-001 decided them: five that form a loop, each taking from the one before, and governance and interface cutting across (EE-001 states no dependency for those two)",
      source: "EE-001 (2026-10-26)", parts: ee001,
      facts: arrangement(ee001, [...stack(ee001.slice(0, 5)), ["purpose", "evidence"]], true), expects: { layer: false, area: true },
    },
    manifests(repo),
    {
      id: "osi-model", says: "The OSI model's seven layers, each using the services of the one beneath it",
      source: "ISO/IEC 7498-1:1994", parts: osi,
      facts: arrangement(osi, stack(osi), true), expects: { layer: true, area: true },
    },
    {
      id: "ontology-three", says: "The ontology's three layers, each constraining the one below: the upper ontology's categories are written to the metamodel, and each scope the catalog lists traces its nouns to the upper ontology",
      source: "docs/design/ONTOLOGY_LAYERS_2026-11-02.md (ledger N-047)", parts: ontology,
      facts: arrangement(ontology, stack(ontology), true), expects: { layer: true, area: true },
    },
  ];
}
