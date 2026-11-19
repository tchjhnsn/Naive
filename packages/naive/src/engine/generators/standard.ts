// Record generator for the catalog of standards (EE-099, EE-124). Each standard is one file,
// packages/naive/src/terms/standards/<id>.json, in the framework, so the generator drafts one new file with an id that
// no file has yet. It is a change to the framework (a pull request), not a venture route. A standard not yet confirmed
// at its url (checked null) must say why in note, as packages/naive/src/terms/standards-test.ts requires.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cli, drop, questions, repo, schemaOf, slug, validate } from "./generate.mjs";
import type { Standard } from "../../records/types/records.d.ts";

export const record = "standard";
export const DIR = "packages/naive/src/terms/standards";
export const describe = () => ({ record, ask: questions(schemaOf(record)),
  derived: { id: "a slug of the name unless given; a standard already in the catalog is refused", checked: "null unless given", used_by: "no nouns or record types unless given", gaps: "none unless given" } });

export function draft(a: Partial<Standard>, { root = repo }: { root?: string } = {}) {
  if (!a.name || !a.issuer || !a.url || !a.status || !a.copyright || !a.uses) {
    return { ok: false, record, errors: ["a standard needs a name, issuer, url, status, copyright and what we use it for"] };
  }
  const checked = a.checked ?? null;
  if (checked === null && !a.note) return { ok: false, record, errors: ["a standard not yet confirmed at its url (checked null) says why in note"] };
  const id = slug(a.id ?? a.name);
  const file = `${DIR}/${id}.json`;
  if (existsSync(join(root, file))) return { ok: false, record, errors: [`the catalog already has a standard ${id}`] };
  const rec = drop({ id, name: a.name, issuer: a.issuer, identifier: a.identifier, version: a.version, url: a.url, status: a.status,
    checked, copyright: a.copyright, uses: a.uses, used_by: a.used_by ?? { nouns: [], record_types: [] }, gaps: a.gaps ?? [], note: a.note }) as Standard;
  const v = validate(record, rec);
  return { ok: v.ok, record, file, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
