// Record generator for the document catalog (EE-218). The catalog is packages/naive/src/functions/documents.json in
// the framework, so the generator adds one document kind to what the file holds now, with an id unique in the file.
// It is a change to the framework (a pull request), not a venture route: a venture that wants a kind the catalog
// lacks proposes it here, so every venture makes the same documents in the same order.
// packages/naive/src/checks/check-documents.ts checks the result across files (functions, rungs, record paths).
import { join } from "node:path";
import { cli, drop, questions, readJson, repo, schemaOf, slug, validate } from "./generate.ts";
import type { DocumentCatalog } from "../../records/types/records.d.ts";

export const record = "document-catalog";
export const FILE = "packages/naive/src/functions/documents.json";
type Kind = DocumentCatalog["kinds"][number];
export const describe = () => ({ record, ask: questions(schemaOf(record).properties.kinds.items, "kinds[]."),
  derived: { id: "a slug of the title unless given; a kind already in the file is refused", highest_rung: "reading-copy unless given, because most kinds stop there",
    style: "the brand voice (marketing-brand voice) unless given, because every document's words follow it (EE-230)" } });

export function draft(a: Partial<Kind>, { root = repo }: { root?: string } = {}) {
  if (!a.title || !a.function || !a.purpose || !a.audience?.length || !a.artifact_kind || !a.formats?.length || !a.why_format || !a.sections?.length)
    return { ok: false, record, errors: ["a document kind needs a title, the function whose agent drafts it, its purpose, its audience, its artifact kind, its formats with why those and not the others, and the sections it renders from records"] };
  const now = readJson(join(root, FILE)) as DocumentCatalog | null;
  if (!now) return { ok: false, record, errors: [`${FILE} is missing: the formats and the ladder come first`] };
  const id = slug(a.id ?? a.title);
  if (now.kinds.some((k) => k.id === id)) return { ok: false, record, errors: [`the catalog already has a kind ${id}`] };
  const rungs = new Set(now.ladder.rungs.map((r) => r.id));
  const highest = a.highest_rung ?? "reading-copy";
  if (!rungs.has(highest)) return { ok: false, record, errors: [`${highest} is not a rung of the ladder: ${[...rungs].join(", ")}`] };
  const formats = new Set(now.formats.map((f) => f.id));
  const unknown = a.formats.filter((f) => !formats.has(f));
  if (unknown.length) return { ok: false, record, errors: unknown.map((f) => `${f} is not a format the catalog has`) };
  const kind = drop({ id, title: a.title, function: a.function, purpose: a.purpose, audience: a.audience, artifact_kind: a.artifact_kind,
    highest_rung: highest, formats: a.formats, why_format: a.why_format, approves: a.approves, words_per_page: a.words_per_page,
    pages: a.pages, style: a.style?.length ? a.style : [{ record_type: "marketing-brand", field: "voice" }], sections: a.sections }) as Kind;
  const rec = { ...now, kinds: [...now.kinds, kind] };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: FILE, draft: rec, added: id, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
