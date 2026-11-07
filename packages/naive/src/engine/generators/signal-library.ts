// Record generator for a signal library's library.json (EE-099; signal library design, everything-ecosystem
// docs/design/SIGNAL_LIBRARY_2026-11-06.md). The publisher gives the id, the title, who publishes it and the
// license; the generator fills the layout contract naive-signal-library@1.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { SignalLibrary } from "../../records/types/records.d.ts";

export const record = "signal-library";
export const CONTRACT = "naive-signal-library@1";
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => q.field !== "contract"), derived: { contract: CONTRACT } });

export function draft(a: Partial<SignalLibrary>) {
  if (!a.id || !a.title || !a.publisher || !a.license) return { ok: false, record, errors: ["a library needs an id, a title, a publisher and a license"] };
  const rec = drop({ id: slug(a.id), title: a.title, publisher: a.publisher, contract: CONTRACT, license: a.license, homepage: a.homepage, note: a.note }) as SignalLibrary;
  const v = validate(record, rec);
  return { ok: v.ok, record, file: "library.json", draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
