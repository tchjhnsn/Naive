// Tests artifactKind (EE-230): a role's artifact resolves to a record type in the data model or a document kind in the
// catalog, and nothing else.
//
//   node packages/naive/src/engine/artifact-kind-test.ts

import { readDataModel } from "../records/index.ts";
import { artifactKind, type ArtifactTypes } from "./artifact-kind.ts";
import { catalog } from "./documents.ts";

let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };

// Against the data model and catalog Naive ships.
const shipped: ArtifactTypes = { model: readDataModel(), catalog: catalog() };
const decision = artifactKind({ record_type: "decision-record" }, shipped);
t("a record type in the data model is a record type, with its schema and paths",
  decision.kind === "record-type" && decision.schema === "packages/naive/src/records/decision-record.schema.json" && decision.paths.some((p) => p.endsWith("decisions/*.decision.json")), decision);
const adr = artifactKind({ document_kind: "adr" }, shipped);
t("a document kind in the catalog is a document kind, with its formats", adr.kind === "document-kind" && adr.formats.join() === "md" && adr.highest_rung === "reading-copy", adr);
const framework = artifactKind({ record_type: "document-catalog" }, shipped);
t("a framework record type counts too: a role of Naive's own may write the catalog", framework.kind === "record-type", framework);
for (const id of ["adr", "release-note", "changelog-entry", "requirements-spec"]) {
  const r = artifactKind({ document_kind: id }, shipped);
  t(`the catalog has the kind ${id} that Naive's own roles make`, r.kind === "document-kind", r);
}

// The two namespaces never cross, and a name nobody has is unknown with why.
const crossed = artifactKind({ record_type: "adr" }, shipped);
t("a document kind named as a record type is unknown", crossed.kind === "unknown" && /no record type adr in .*data-model\.json/.test(crossed.why), crossed);
const crossedBack = artifactKind({ document_kind: "decision-record" }, shipped);
t("a record type named as a document kind is unknown", crossedBack.kind === "unknown" && /no document kind decision-record in .*documents\.json/.test(crossedBack.why), crossedBack);
t("a name neither has is unknown", artifactKind({ document_kind: "brochure" }, shipped).kind === "unknown");

// It is pure: it reads only what it is given.
const tiny: ArtifactTypes = { model: { records: [{ id: "note", layer: "system", function: null, level: "venture", data: "master", schema: null, paths: ["instance/**/notes/*.json"] }] }, catalog: { kinds: [] } };
const note = artifactKind({ record_type: "note" }, tiny);
t("it resolves against the model it is given, not the repository's", note.kind === "record-type" && note.schema === null && note.paths[0] === "instance/**/notes/*.json", note);
t("an empty catalog has no document kinds", artifactKind({ document_kind: "adr" }, tiny).kind === "unknown");

console.log(failed ? `${failed} failed` : "all passed");
process.exitCode = failed ? 1 : 0;
