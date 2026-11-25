// Writes APQC's Process Classification Framework into packages/naive/src/functions/pcf.json (EE-165).
//
//   node scripts/import-pcf.ts <hierarchy.json> [--root <dir>]
//
// <hierarchy.json> is a JSON array of every element of one PCF version, levels 1 to 5, each
// {id, name, pcf, level}: the hierarchy id (a category's is N.0), the name verbatim from APQC, the five-digit element
// id and the level. For PCF 8.0 it was extracted from APQC's 13 Definitions and Key Measures articles (March 2026)
// with pdftotext -layout; neither the articles nor the extract is kept in the repository. The script keeps the header
// pcf.json holds (version, edition, published, source, attribution, note), replaces the elements with the hierarchy
// sorted by hierarchy id, and writes one element per line, so a rerun on the same hierarchy writes the same bytes.
// It refuses input that is not such an array, a pcf.json with no header, and a result that fails pcf.schema.json.
// packages/naive/src/checks/check-pcf.ts checks the written file across elements. --root writes into another copy
// of the repository (used by scripts/import-pcf-test.ts).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { draft, FILE, format, type PcfElement } from "../packages/naive/src/engine/generators/pcf.ts";

const isElement = (v: unknown): v is PcfElement => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.pcf === "number" && typeof o.level === "number";
};

const args = process.argv.slice(2);
const at = args.indexOf("--root");
const root = at >= 0 ? args[at + 1] : new URL("..", import.meta.url).pathname;
const input = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--root");
if (!input || !root) {
  console.error("usage: node scripts/import-pcf.ts <hierarchy.json> [--root <dir>]");
  process.exit(2);
}
const raw: unknown = JSON.parse(readFileSync(input, "utf8"));
if (!Array.isArray(raw) || !raw.every(isElement)) {
  console.error(`${input}: not an array of {id, name, pcf, level}`);
  process.exit(1);
}
const d = draft({ elements: raw }, { root });
if (!d.ok || !("draft" in d) || !d.draft) {
  for (const e of d.errors) console.error(`FAIL  ${e}`);
  process.exit(1);
}
writeFileSync(join(root, FILE), format(d.draft));
console.log(`wrote ${FILE}: PCF ${d.draft.version} ${d.draft.edition}, ${d.draft.elements.length} elements`);
