// What an artifact a role makes is (EE-230): a record type in the data model, or a document kind in the document
// catalog (packages/naive/src/functions/documents.json). Nothing else counts, so a role cannot name an artifact Naive
// has no type for.
//
//   artifactKind({ record_type: "decision-record" }, { model, catalog })   a record type, with its schema and paths
//   artifactKind({ document_kind: "adr" }, { model, catalog })             a document kind, with its formats
//   artifactKind({ record_type: "memo" }, { model, catalog })              unknown, saying why
//
// It is pure: the caller reads the data model (readDataModel in packages/naive/src/records/index.ts) and the catalog
// (catalog in packages/naive/src/engine/documents.ts) once and passes them in. The two namespaces never cross: a
// record_type is looked up only among record types and a document_kind only among document kinds.

import type { DataModel, DocumentCatalog } from "../records/types/records.d.ts";

/** An artifact as a role names it: exactly one of a record type or a document kind. */
export type ArtifactRef = { record_type: string; document_kind?: never } | { document_kind: string; record_type?: never };

/** What a reference resolves to. */
export type ArtifactKind =
  | { kind: "record-type"; record_type: string; schema: string | null; paths: string[] }
  | { kind: "document-kind"; document_kind: string; formats: string[]; highest_rung: string }
  | { kind: "unknown"; why: string };

/** What artifactKind resolves against: the data model's record types and the catalog's kinds. */
export type ArtifactTypes = { model: Pick<DataModel, "records">; catalog: Pick<DocumentCatalog, "kinds"> };

/** Says whether a reference names a data-model record type or a documents.json kind. */
export function artifactKind(ref: ArtifactRef, { model, catalog }: ArtifactTypes): ArtifactKind {
  if (ref.record_type !== undefined) {
    const r = model.records.find((x) => x.id === ref.record_type);
    return r
      ? { kind: "record-type", record_type: r.id, schema: r.schema, paths: r.paths ?? [] }
      : { kind: "unknown", why: `no record type ${ref.record_type} in packages/naive/src/records/data-model.json` };
  }
  const k = catalog.kinds.find((x) => x.id === ref.document_kind);
  return k
    ? { kind: "document-kind", document_kind: k.id, formats: [...k.formats], highest_rung: k.highest_rung }
    : { kind: "unknown", why: `no document kind ${ref.document_kind} in packages/naive/src/functions/documents.json` };
}
