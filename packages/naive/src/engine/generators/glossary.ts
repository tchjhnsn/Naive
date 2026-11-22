// Record generator for a package glossary (EE-099). The record is the whole file glossary/<package>.json, so the
// generator adds one term to what the file holds now and refuses a term the package already defines differently.
// Every new term also runs the term engine (glossary skill); this generator only shapes the record.
// The draft goes to: mentura glossary/<package> write --venture <id> --input -
import { cli, drop, questions, readJson, schemaOf, validate } from "./generate.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import type { Glossary } from "../../records/types/records.d.ts";

type Term = Glossary["terms"][number];

export const record = "glossary";
export const describe = () => ({ record, ask: [{ field: "package", required: true, type: "string", says: schemaOf(record).properties.package.description },
  ...questions(schemaOf(record).properties.terms.items, "terms[].")], derived: { terms: "the file's current terms plus this one, in the order written" } });

export function draft(a: Partial<Term> & { package?: string }, { venture }: { venture?: string } = {}) {
  const { package: pkg, term, meaning } = a;
  if (!pkg || !term || !meaning) return { ok: false, record, errors: ["a glossary entry needs package, term and meaning"] };
  const found = venture ? readJson(ventureFile(venture, `glossary/${pkg}.json`)) as Glossary | null : null;
  const now = found ?? { package: pkg, terms: [] };
  const same = now.terms.find((t) => t.term.toLowerCase() === term.toLowerCase());
  if (same && same.meaning !== meaning) return { ok: false, record, errors: [`${pkg} already defines "${same.term}" as: ${same.meaning}`] };
  const terms = same ? now.terms : [...now.terms, drop({ term, meaning, export: a.export }) as Term];
  const rec: Glossary = { package: pkg, terms };
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `glossary/${pkg}`, draft: rec, added: !same, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
