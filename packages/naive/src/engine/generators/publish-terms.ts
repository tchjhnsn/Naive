// Record generator for the publish terms (EE-099, EE-214). The record is the whole file marketing/publish-terms.json,
// so the generator adds one name to what the file holds now and refuses a name the list already holds differently. A
// private name needs a why: it is an error in the publish lint, so the reason is part of the record.
// The draft goes to: mentura marketing/publish-terms write --venture <id> --input -
import { cli, drop, questions, readJson, schemaOf, validate } from "./generate.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import { TERMS } from "../publish-lint.ts";
import type { PublishTerms } from "../../records/types/records.d.ts";

type Name = PublishTerms["marks"][number];

export const record = "publish-terms";
export const describe = () => ({ record, ask: questions(schemaOf(record).properties.marks.items, "marks[]."),
  derived: { marks: "the file's current names plus this one, in the order written" } });

export function draft(a: Partial<Name>, { venture }: { venture?: string } = {}) {
  const { name } = a;
  if (!name) return { ok: false, record, errors: ["a publish term needs a name"] };
  if (a.private && !a.why) return { ok: false, record, errors: ["a private name needs a why: the lint makes it an error, so say what it is"] };
  const found = venture ? readJson(ventureFile(venture, TERMS)) as PublishTerms | null : null;
  const now = found ?? { marks: [] };
  const same = now.marks.find((m) => m.name.toLowerCase() === name.toLowerCase());
  if (same && (same.private ?? false) !== (a.private ?? false)) return { ok: false, record, errors: [`${same.name} is already listed${same.private ? " as private" : ""}: withdraw it before listing it the other way`] };
  const marks = same ? now.marks : [...now.marks, drop({ name, private: a.private, why: a.why, until: a.until }) as Name];
  const rec: PublishTerms = drop({ ...now, marks }) as PublishTerms;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: "marketing/publish-terms", draft: rec, added: !same, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
