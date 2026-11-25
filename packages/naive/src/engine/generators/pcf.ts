// Record generator for APQC's Process Classification Framework (EE-165). The PCF is packages/naive/src/functions/pcf.json
// in the framework. Its elements are APQC's, so the generator never adds one by hand: draft takes the whole hierarchy
// (every element's hierarchy id, name, element id and level, as extracted from APQC's own files), keeps the header the
// file holds now (version, edition, published, source, attribution, note), and sorts the elements by hierarchy id.
// format writes it with one element per line, so the same hierarchy always gives the same bytes. scripts/import-pcf.ts
// runs both and writes the file, a change to the framework made in a pull request.
// packages/naive/src/checks/check-pcf.ts checks the result across elements (parents, numbering, levels, categories).
import { join } from "node:path";
import { cli, questions, readJson, repo, schemaOf, validate } from "./generate.ts";
import type { Pcf } from "../../records/types/records.d.ts";

export const record = "pcf";
export const FILE = "packages/naive/src/functions/pcf.json";
export type PcfElement = Pcf["elements"][number];
export const describe = () => ({ record, ask: questions(schemaOf(record).properties.elements.items, "elements[]."),
  derived: { header: "version, edition, published, source, attribution and note are kept from the file as it is", order: "elements sorted by hierarchy id, part by part as numbers" } });

const parts = (id: string) => id.split(".").map(Number);
/** Hierarchy order: part by part as numbers, a parent before its children (1.0, 1.1, 1.1.1, 1.2, 2.0, 10.0). */
export const byHierarchy = (a: PcfElement, b: PcfElement): number => {
  const x = parts(a.id), y = parts(b.id);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
};

export function draft(a: { elements?: PcfElement[] }, { root = repo }: { root?: string } = {}) {
  if (!a.elements?.length) return { ok: false, record, errors: ["the PCF needs its elements: each one's hierarchy id, name, element id and level"] };
  const now = readJson(join(root, FILE)) as Pcf | null;
  if (!now) return { ok: false, record, errors: [`${FILE} is missing: write its header (version, edition, published, source, attribution) first, with no elements`] };
  const elements = a.elements.map(({ id, name, pcf, level }) => ({ id, name, pcf, level })).sort(byHierarchy);
  const rec: Pcf = { version: now.version, edition: now.edition, published: now.published, source: now.source, attribution: now.attribution,
    ...(now.note === undefined ? {} : { note: now.note }), elements };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: FILE, draft: rec, errors: v.errors };
}

/** The file's bytes: the header as indented JSON, then one element per line, in the order given. */
export function format(rec: Pcf): string {
  const { elements, ...header } = rec;
  const head = JSON.stringify(header, null, 2).slice(0, -2);
  const line = (e: PcfElement) => `    {"id": ${JSON.stringify(e.id)}, "name": ${JSON.stringify(e.name)}, "pcf": ${e.pcf}, "level": ${e.level}}`;
  return `${head},\n  "elements": [\n${elements.map(line).join(",\n")}\n  ]\n}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
