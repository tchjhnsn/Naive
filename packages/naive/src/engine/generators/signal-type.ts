// Record generator for a signal type (EE-099; signal library design, everything-ecosystem
// docs/design/SIGNAL_LIBRARY_2026-11-06.md). The author gives the id, the version, the title, the props schema, the
// parts it composes, its projects and at least one worked case. The generator fills nothing it could get wrong: it
// slugs the id and defaults projects to none. The draft is for types/<id>/<version>.signal.json in a library, or
// signals/types/<id>/<version>.signal.json in a Naive package.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { SignalType } from "../../records/types/records.d.ts";

export const record = "signal-type";
export const describe = () => ({ record, ask: questions(schemaOf(record)), derived: { projects: "none unless given" } });

export function draft(a: Partial<SignalType>) {
  if (!a.id || !a.version || !a.title || !a.props || !a.cases?.length) return { ok: false, record, errors: ["a signal type needs an id, a version, a title, props and at least one worked case"] };
  const id = slug(a.id);
  const rec = drop({ id, version: a.version, title: a.title, description: a.description, subject: a.subject, props: a.props, composes: a.composes,
    projects: a.projects ?? [], freshness: a.freshness, cases: a.cases, note: a.note }) as SignalType;
  const v = validate(record, rec);
  return { ok: v.ok, record, file: `types/${id}/${a.version}.signal.json`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
