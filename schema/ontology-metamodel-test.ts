// Behavior of the ontology metamodel (N-048). docs/ontology.json validates against it, a change line is valid
// only when it fits $defs/change_line, and the mappings table names a SKOS and an OWL term, or none, for each class.
//
//   node schema/ontology-metamodel-test.ts

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

type Mapping = { skos: string; owl: string; note?: string; fields?: Record<string, Mapping> };
type Def = { properties?: Record<string, unknown>; allOf?: { if?: { properties?: { verb?: { const?: string } } }; then?: { properties?: { kind?: { enum?: string[] } } } }[]; enum?: string[] };
type Metamodel = { mappings: Record<string, Mapping>; $defs: Record<string, Def> };
type Ran = { status: number | null; out: string };

const root = fileURLToPath(new URL("..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "ontology-metamodel-"));
const metamodel = JSON.parse(readFileSync(join(root, "schema/ontology-metamodel.schema.json"), "utf8")) as Metamodel;
let failed = 0;
const expect = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `\n     ${detail.trim()}`}`);
  if (!ok) failed++;
};

const validate = (value: unknown, def?: string) => new Promise<Ran>((resolve) => {
  const file = join(tmp, `${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(file, JSON.stringify(value));
  const args = ["-I", join(root, "schema/validate.py"), "--schema", "ontology-metamodel.schema.json", ...(def ? ["--def", def] : []), "--file", file];
  const child = spawn("python3", args, { cwd: root });
  let out = "";
  child.stdout.on("data", (d: Buffer) => { out += d.toString(); });
  child.stderr.on("data", (d: Buffer) => { out += d.toString(); });
  child.on("close", (status) => resolve({ status, out }));
});
const line = (value: unknown) => validate(value, "change_line");

const ontology = JSON.parse(readFileSync(join(root, "docs/ontology.json"), "utf8")) as { nouns: Record<string, unknown>[]; top_categories: Record<string, unknown>[] };
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

expect("docs/ontology.json validates against the metamodel", docs.status === 0 && docs.out.trim() === "valid", docs.out);
expect("a noun with an unknown key is rejected, the key named", extraNounKey.status === 1 && extraNounKey.out.includes("'synonym' was unexpected"), extraNounKey.out);
expect("a top category without a BFO mapping is rejected", noBfo.status === 1 && noBfo.out.includes("'bfo' is a required property"), noBfo.out);
expect("a top category mapped outside BFO is rejected", notBfo.status === 1 && notBfo.out.includes("does not match"), notBfo.out);
expect("a valid change line (amend, rename) is accepted", good.status === 0, good.out);
expect("create, derive with its source is accepted", derive.status === 0, derive.out);
expect("delete, merge with its successor is accepted", merge.status === 0, merge.out);
expect("a change line with an unknown key is rejected, the key named", unknownKey.status === 1 && unknownKey.out.includes("'reason' was unexpected"), unknownKey.out);
expect("a kind that is not of its verb is rejected", wrongKind.status === 1 && wrongKind.out.includes("'rename' is not one of ['originate', 'derive']"), wrongKind.out);
expect("derive without a source is rejected", deriveNoSource.status === 1 && deriveNoSource.out.includes("'source' is a required property"), deriveNoSource.out);
expect("a source on a line that is not derive is rejected", sourceOnAmend.status === 1, sourceOnAmend.out);
expect("a change line without a tier is rejected", noTier.status === 1 && noTier.out.includes("'tier' is a required property"), noTier.out);
expect("a tier outside low, costly, one_way_door is rejected", badTier.status === 1, badTier.out);
expect("an unknown --def exits 2, a checker that cannot run", unknownDef.status === 2, unknownDef.out);

const term = (m: Mapping) => (m.skos === "none" || m.skos.startsWith("skos:")) && (m.owl === "none" || m.owl.startsWith("owl:"));
const classes = Object.keys(metamodel.$defs).sort();
expect("every metamodel class has one mappings entry, and every entry is a class", JSON.stringify(Object.keys(metamodel.mappings).sort()) === JSON.stringify(classes));
const unnamed = Object.entries(metamodel.mappings).flatMap(([c, m]) => [...(term(m) ? [] : [c]), ...Object.entries(m.fields ?? {}).filter(([, f]) => !term(f)).map(([f]) => `${c}.${f}`)]);
expect("every class and field names a SKOS term, an OWL term or none", unnamed.length === 0, unnamed.join(", "));
const fieldGaps = ["ontology", "noun", "top_category"].filter((c) => JSON.stringify(Object.keys(metamodel.mappings[c]?.fields ?? {}).sort()) !== JSON.stringify(Object.keys(metamodel.$defs[c]?.properties ?? {}).sort()));
expect("the ontology, noun and top category fields are mapped one to one", fieldGaps.length === 0, fieldGaps.join(", "));

// operations/operating-rules.json declares the same verbs, kinds and tiers; the two must not drift.
const rules = JSON.parse(readFileSync(join(root, "operations/operating-rules.json"), "utf8")) as { design: { diff: { verbs: Record<string, { kinds: string[] }> } }; questions: { impact: { tiers: string[] } } };
const pairs = Object.fromEntries((metamodel.$defs.change_line?.allOf ?? []).flatMap((b) => {
  const verb = b.if?.properties?.verb?.const;
  const kinds = b.then?.properties?.kind?.enum;
  return verb && kinds ? [[verb, kinds]] : [];
}));
const declared = Object.fromEntries(Object.entries(rules.design.diff.verbs).map(([v, { kinds }]) => [v, kinds]));
expect("verbs and their kinds match design.diff.verbs in operations/operating-rules.json", JSON.stringify(pairs) === JSON.stringify(declared)
  && JSON.stringify(metamodel.$defs.verb?.enum) === JSON.stringify(Object.keys(declared))
  && JSON.stringify(metamodel.$defs.kind?.enum) === JSON.stringify(Object.values(declared).flat()));
expect("tiers match questions.impact.tiers in operations/operating-rules.json", JSON.stringify(metamodel.$defs.tier?.enum) === JSON.stringify(rules.questions.impact.tiers));

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} test(s) failed`); process.exit(1); }
console.log("all ontology metamodel tests pass");
