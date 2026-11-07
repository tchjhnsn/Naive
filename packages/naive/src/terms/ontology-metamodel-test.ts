// Behavior of the ontology metamodel (N-048). packages/naive/src/terms/ontology.json validates against it, a change line is valid
// only when it fits $defs/change_line, and the mappings table names a SKOS and an OWL term, or none, for each class.
//
//   node packages/naive/src/terms/ontology-metamodel-test.ts

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readSchema } from "../records/index.mjs";

type Mapping = { skos: string; owl: string; note?: string; fields?: Record<string, Mapping> };
type Def = { properties?: Record<string, unknown>; allOf?: { if?: { properties?: { verb?: { const?: string } } }; then?: { properties?: { kind?: { enum?: string[] } } } }[]; enum?: string[] };
type Metamodel = { mappings: Record<string, Mapping>; $defs: Record<string, Def> };
type Ran = { status: number | null; out: string };

const root = fileURLToPath(new URL("../../../..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "ontology-metamodel-"));
const metamodel = readSchema("ontology-metamodel") as Metamodel;
let failed = 0;
const expect = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `\n     ${detail.trim()}`}`);
  if (!ok) failed++;
};

const run = (args: string[]) => new Promise<Ran>((resolve) => {
  const child = spawn(process.execPath, [join(root, "packages/naive/src/records/validate.mjs"), ...args], { cwd: root });
  let out = "";
  child.stdout.on("data", (d: Buffer) => { out += d.toString(); });
  child.stderr.on("data", (d: Buffer) => { out += d.toString(); });
  child.on("close", (status) => resolve({ status, out }));
});
const validate = (value: unknown, def?: string) => {
  const file = join(tmp, `${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(file, JSON.stringify(value));
  return run(["--schema", "ontology-metamodel.schema.json", ...(def ? ["--def", def] : []), "--file", file]);
};
const line = (value: unknown) => validate(value, "change_line");

const ontology = JSON.parse(readFileSync(join(root, "packages/naive/src/terms/ontology.json"), "utf8")) as { nouns: Record<string, unknown>[]; top_categories: Record<string, unknown>[] };
const withTop = (top: Record<string, unknown>) => ({ ...ontology, top_categories: [top, ...ontology.top_categories.slice(1)] });
const rename = { verb: "amend", kind: "rename", noun: "customer@finance", tier: "costly" };
const [docs, extraNounKey, noBfo, notBfo, good, derive, merge, unknownKey, wrongKind, deriveNoSource, sourceOnAmend, noTier, badTier, unknownDef] = await Promise.all([
  validate(ontology),
  validate({ ...ontology, nouns: [{ ...ontology.nouns[0], synonym: "x" }, ...ontology.nouns.slice(1)] }),
  validate(withTop({ name: "x", meaning: "x" })),
  validate(withTop({ name: "x", meaning: "x", bfo: { class: "thing", iri: "http://www.w3.org/2002/07/owl#Thing" } })),
  line(rename),
  line({ verb: "create", kind: "derive", noun: "client account", source: "account", tier: "low" }),
  line({ verb: "delete", kind: "merge", noun: "client", successor: "account", tier: "one_way_door" }),
  line({ ...rename, reason: "clearer" }),
  line({ ...rename, verb: "create" }),
  line({ verb: "create", kind: "derive", noun: "client account", tier: "low" }),
  line({ ...rename, source: "account" }),
  line({ verb: "amend", kind: "rename", noun: "customer@finance" }),
  line({ ...rename, tier: "high" }),
  validate(rename, "no_such_def"),
]);

expect("packages/naive/src/terms/ontology.json validates against the metamodel", docs.status === 0 && docs.out.trim() === "valid", docs.out);
expect("a noun with an unknown key is rejected, the key named", extraNounKey.status === 1 && extraNounKey.out.includes("'synonym' was unexpected"), extraNounKey.out);
expect("a top category without a BFO mapping is rejected", noBfo.status === 1 && noBfo.out.includes("'bfo' is a required property"), noBfo.out);
expect("a top category mapped outside BFO is rejected", notBfo.status === 1 && notBfo.out.includes("does not match"), notBfo.out);
expect("a valid change line (amend, rename) is accepted", good.status === 0, good.out);
expect("create, derive with its source is accepted", derive.status === 0, derive.out);
expect("delete, merge with its successor is accepted", merge.status === 0, merge.out);
expect("a change line with an unknown key is rejected, the key named", unknownKey.status === 1 && unknownKey.out.includes("'reason' was unexpected"), unknownKey.out);
expect("a kind that is not of its verb is rejected", wrongKind.status === 1 && /kind: "rename" is not one of \["originate","derive"\]/.test(wrongKind.out), wrongKind.out);
expect("derive without a source is rejected", deriveNoSource.status === 1 && deriveNoSource.out.includes("'source' is a required property"), deriveNoSource.out);
expect("a source on a line that is not derive is rejected", sourceOnAmend.status === 1, sourceOnAmend.out);
expect("a change line without a tier is rejected", noTier.status === 1 && noTier.out.includes("'tier' is a required property"), noTier.out);
expect("a tier outside low, costly, one_way_door is rejected", badTier.status === 1, badTier.out);
expect("an unknown --def exits 2, a checker that cannot run", unknownDef.status === 2, unknownDef.out);

const withNoun = (patch: Record<string, unknown>) => ({ ...ontology, nouns: [{ ...ontology.nouns[0], ...patch }, ...ontology.nouns.slice(1)] });
const rules = JSON.parse(readFileSync(join(root, "packages/naive/src/terms/operating-rules.json"), "utf8")) as { design: { diff: { verbs: Record<string, { kinds: string[]; derive_names?: string; merge_names?: string }> } }; questions: { impact: { tiers: string[] } } };
const deriveField = rules.design.diff.verbs.create?.derive_names ?? "";
const mergeField = rules.design.diff.verbs.delete?.merge_names ?? "";
const merge2 = { verb: "delete", kind: "merge", noun: "client", tier: "low" };
const derive2 = { verb: "create", kind: "derive", noun: "client account", tier: "low" };
const [mergeNoSuccessor, successorOnRemove, replacedNotRetired, patternNoReplaced, spaceNoun, paddedNoun, spaceLine, badSource, spaceSource, badSuccessor, spaceSuccessor, deriveNamed, mergeNamed, defNoFile, schemaNoFile] = await Promise.all([
  line(merge2),
  line({ ...merge2, kind: "remove", successor: "account" }),
  validate(withNoun({ replaced_by: "Naive" })),
  validate(withNoun({ status: "retired", retired_pattern: "\\bEverything Ecosystem\\b" })),
  validate(withNoun({ noun: " " })),
  validate(withNoun({ noun: "Everything Ecosystem " })),
  line({ ...rename, noun: " " }),
  line({ ...derive2, source: "y@Bad" }),
  line({ ...derive2, source: " " }),
  line({ ...merge2, successor: "y@Bad" }),
  line({ ...merge2, successor: "\t" }),
  line({ ...derive2, [deriveField]: "account" }),
  line({ ...merge2, [mergeField]: "account" }),
  run(["--schema", "ontology-metamodel.schema.json", "--def", "change_line"]),
  run(["--schema", "ontology-metamodel.schema.json"]),
]);

expect("merge without a successor is rejected", mergeNoSuccessor.status === 1 && mergeNoSuccessor.out.includes("'successor' is a required property"), mergeNoSuccessor.out);
expect("a successor on a line that is not merge is rejected", successorOnRemove.status === 1, successorOnRemove.out);
expect("a noun with replaced_by that is not retired is rejected", replacedNotRetired.status === 1 && replacedNotRetired.out.includes('"retired" was expected'), replacedNotRetired.out);
expect("a noun with retired_pattern and no replaced_by is rejected", patternNoReplaced.status === 1 && patternNoReplaced.out.includes("'replaced_by' is a dependency of 'retired_pattern'"), patternNoReplaced.out);
expect("a noun named by a single space is rejected", spaceNoun.status === 1 && spaceNoun.out.includes("does not match"), spaceNoun.out);
expect("a noun name with trailing whitespace is rejected", paddedNoun.status === 1 && paddedNoun.out.includes("does not match"), paddedNoun.out);
expect("a change line whose noun is a single space is rejected", spaceLine.status === 1 && spaceLine.out.includes("does not match"), spaceLine.out);
expect("a source that is not a noun name (y@Bad, a space) is rejected", badSource.status === 1 && spaceSource.status === 1 && badSource.out.includes("does not match") && spaceSource.out.includes("does not match"), badSource.out + spaceSource.out);
expect("a successor that is not a noun name (y@Bad, a tab) is rejected", badSuccessor.status === 1 && spaceSuccessor.status === 1 && badSuccessor.out.includes("does not match") && spaceSuccessor.out.includes("does not match"), badSuccessor.out + spaceSuccessor.out);
expect("derive accepts the field design.diff.verbs.create.derive_names names", deriveNamed.status === 0, deriveNamed.out);
expect("merge accepts the field design.diff.verbs.delete.merge_names names", mergeNamed.status === 0, mergeNamed.out);
expect("--def without --file exits 2 with a usage line", defNoFile.status === 2 && defNoFile.out.includes("usage:"), defNoFile.out);
expect("--schema without --file exits 2 with a usage line", schemaNoFile.status === 2 && schemaNoFile.out.includes("usage:"), schemaNoFile.out);

// Python's $ also matches before a final newline, so each name is checked with one.
const [newlineNoun, newlineLineNoun, newlineScopedNoun, newlineSource, newlineSuccessor] = await Promise.all([
  validate(withNoun({ noun: "Everything Ecosystem\n" })),
  line({ ...rename, noun: "client\n" }),
  line({ ...rename, noun: "client@sales\n" }),
  line({ ...derive2, source: "client@sales\n" }),
  line({ ...merge2, successor: "account\n" }),
]);
const rejected = (r: Ran) => r.status === 1 && r.out.includes("does not match");
expect("a noun name with a trailing newline is rejected", rejected(newlineNoun), newlineNoun.out);
expect("a change line noun with a trailing newline (client, client@sales) is rejected", rejected(newlineLineNoun) && rejected(newlineScopedNoun), newlineLineNoun.out + newlineScopedNoun.out);
expect("a source with a trailing newline is rejected", rejected(newlineSource), newlineSource.out);
expect("a successor with a trailing newline is rejected", rejected(newlineSuccessor), newlineSuccessor.out);

const term = (m: Mapping) => (m.skos === "none" || m.skos.startsWith("skos:")) && (m.owl === "none" || m.owl.startsWith("owl:"));
const classes = Object.keys(metamodel.$defs).sort();
expect("every metamodel class has one mappings entry, and every entry is a class", JSON.stringify(Object.keys(metamodel.mappings).sort()) === JSON.stringify(classes));
const unnamed = Object.entries(metamodel.mappings).flatMap(([c, m]) => [...(term(m) ? [] : [c]), ...Object.entries(m.fields ?? {}).filter(([, f]) => !term(f)).map(([f]) => `${c}.${f}`)]);
expect("every class and field names a SKOS term, an OWL term or none", unnamed.length === 0, unnamed.join(", "));
const fieldGaps = ["ontology", "noun", "top_category"].filter((c) => JSON.stringify(Object.keys(metamodel.mappings[c]?.fields ?? {}).sort()) !== JSON.stringify(Object.keys(metamodel.$defs[c]?.properties ?? {}).sort()));
expect("the ontology, noun and top category fields are mapped one to one", fieldGaps.length === 0, fieldGaps.join(", "));

// packages/naive/src/terms/operating-rules.json declares the same verbs, kinds and tiers; the two must not drift.
const pairs = Object.fromEntries((metamodel.$defs.change_line?.allOf ?? []).flatMap((b) => {
  const verb = b.if?.properties?.verb?.const;
  const kinds = b.then?.properties?.kind?.enum;
  return verb && kinds ? [[verb, kinds]] : [];
}));
const declared = Object.fromEntries(Object.entries(rules.design.diff.verbs).map(([v, { kinds }]) => [v, kinds]));
expect("verbs and their kinds match design.diff.verbs in packages/naive/src/terms/operating-rules.json", JSON.stringify(pairs) === JSON.stringify(declared)
  && JSON.stringify(metamodel.$defs.verb?.enum) === JSON.stringify(Object.keys(declared))
  && JSON.stringify(metamodel.$defs.kind?.enum) === JSON.stringify(Object.values(declared).flat()));
expect("tiers match questions.impact.tiers in packages/naive/src/terms/operating-rules.json", JSON.stringify(metamodel.$defs.tier?.enum) === JSON.stringify(rules.questions.impact.tiers));

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} test(s) failed`); process.exit(1); }
console.log("all ontology metamodel tests pass");
