// Record generator for a package glossary (EE-099). The record is the whole file glossary/<package>.json, so the
// generator adds one term to what the file holds now and refuses a term the package already defines differently.
// Every new term also runs the term engine (glossary skill); this generator only shapes the record.
// The draft goes to: mentura glossary/<package> write --venture <id> --input -
import { cli, drop, questions, readJson, schemaOf, validate } from "./generate.mjs";
import { ventureFile } from "../../packages/core/venture-paths.mjs";

export const record = "glossary";
export const describe = () => ({ record, ask: [{ field: "package", required: true, type: "string", says: schemaOf(record).properties.package.description },
  ...questions(schemaOf(record).properties.terms.items, "terms[].")], derived: { terms: "the file's current terms plus this one, in the order written" } });

/** @param {any} a @param {{ venture?: string }} [o] */
export function draft(a, { venture } = {}) {
  if (!a.package || !a.term || !a.meaning) return { ok: false, record, errors: ["a glossary entry needs package, term and meaning"] };
  const now = (venture && readJson(ventureFile(venture, `glossary/${a.package}.json`))) ?? { package: a.package, terms: [] };
  const same = now.terms.find((t) => t.term.toLowerCase() === a.term.toLowerCase());
  if (same && same.meaning !== a.meaning) return { ok: false, record, errors: [`${a.package} already defines "${same.term}" as: ${same.meaning}`] };
  const terms = same ? now.terms : [...now.terms, drop({ term: a.term, meaning: a.meaning, export: a.export })];
  const rec = { package: a.package, terms };
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `glossary/${a.package}`, draft: rec, added: !same, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
