// Record generator for a layer's references (EE-099). The record is packages/naive/src/records/layers/<layer>/references/references.json in the
// framework, so the generator adds one source to what the file holds now: id from the first author and year,
// unique in the file; checked only alongside a url. Written by a person or the find-reference skill as a
// change to the framework (a pull request), not through a venture route.
import { join } from "node:path";
import { cli, drop, questions, readJson, repo, schemaOf, slug, validate } from "./generate.mjs";

export const record = "reference";
export const describe = () => ({ record, ask: [{ field: "layer", required: true, type: "choice", choices: schemaOf(record).properties.layer.enum },
  ...questions(schemaOf(record).properties.references.items, "references[].").filter((q) => q.field !== "references[].id")],
  derived: { id: "first author's surname, year and a title word, unique in the file", checked: "only with a url" } });

export function draft(a, { root = repo } = {}) {
  if (!a.layer || !a.title || !a.year) return { ok: false, record, errors: ["a reference needs layer, title and year"] };
  const file = join(root, "packages/naive/src/records/layers", a.layer, "references/references.json");
  const now = readJson(file) ?? { layer: a.layer, references: [] };
  const surname = String((a.authors ?? ["anon"])[0]).split(/\s+/).pop();
  const base = a.id ?? slug(`${surname}-${a.year}-${String(a.title).split(/\s+/).find((w) => w.length > 3) ?? ""}`);
  let id = base, n = 2; const taken = new Set(now.references.map((r) => r.id)); while (taken.has(id)) id = `${base}-${n++}`;
  const ref = drop({ id, title: a.title, authors: a.authors, year: Number(a.year), kind: a.kind, summary: a.summary, url: a.url,
    checked: a.url ? a.checked : undefined, informs: a.informs ?? [], stance: a.stance });
  const rec = { ...now, references: [...now.references, ref] };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: `packages/naive/src/records/layers/${a.layer}/references/references.json`, draft: rec, added: id, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
