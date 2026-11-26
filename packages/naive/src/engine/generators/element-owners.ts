// Record generator for a venture's element owners (EE-187): operations/element-owners.json, the accountable owner a
// venture names for an element of APQC's framework, a role or a person. It drafts the record from the owners given,
// for a person who writes it by hand, and refuses a key that is not an element of packages/naive/src/functions/pcf.json.
// Whether a role exists and may answer for the element is check-owners.ts's work, because it needs the venture's roles.
import { join } from "node:path";
import { cli, questions, readJson, repo, schemaOf, validate } from "./generate.ts";
import type { ElementOwners, Pcf } from "../../records/types/records.d.ts";

export const record = "element-owners";
export const FILE = "operations/element-owners.json";
const PCF = "packages/naive/src/functions/pcf.json";
export const describe = () => ({ record, ask: questions(schemaOf(record)),
  derived: { owners: "empty unless given; each key is the hierarchy id of an element of APQC's framework, and each value is { role } or { person }" } });

export function draft(a: Partial<ElementOwners>, { root = repo }: { root?: string } = {}) {
  const pcf = readJson(join(root, PCF)) as Pcf | null;
  if (!pcf) return { ok: false, record, errors: [`${PCF} is missing`] };
  const rec: ElementOwners = { owners: a.owners ?? {} };
  const known = new Set(pcf.elements.map((e) => e.id));
  const unknown = Object.keys(rec.owners).filter((id) => !known.has(id));
  if (unknown.length) return { ok: false, record, errors: unknown.map((id) => `APQC's framework has no element ${id}`) };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: FILE, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
