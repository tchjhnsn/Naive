// Checks the upper ontology (N-049) through the EE-095 term engine: the top categories and nouns in
// docs/ontology.json, joined by broader, must pass the admitted term top-category (schema/terms/terms.ts), whose
// properties lean/Naive/Upper.lean proves give every noun exactly one top category.
//
//   node schema/terms/upper-test.ts               fixture cases, then the repository
//   node schema/terms/upper-test.ts --root <dir>  one tree only, exit 1 on any problem
//
// Each failed property is reported by name: the nouns on a cycle (U1), a top category with something broader
// (U2), an orphan, a noun that is not a top category and has nothing broader (U3), and a noun that reaches two
// top categories (U4). Before the term runs, every broader target must be a top category or a live noun, and no
// top category may share a noun's name. After it, the term engine's own hook: where both ends of a link name an
// admitted term at one level, the relation schema/terms/admit.ts read off their pass sets must be is_a or equal.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { OntologyMetamodel } from "../types/records.d.ts";
import { run, type Relation } from "./engine.ts";
import type { Hierarchy } from "./levels.ts";
import { below, hasBroader, topCategory, topsReached } from "./terms.ts";

type Admitted = { terms: { id: string; level: string; relations: Record<string, Relation> }[] };
type Verdict = { problems: string[]; topOf: Map<string, string> };

const ONTOLOGY = "docs/ontology.json";
const ADMITTED = "schema/terms/admitted.json";

export function checkUpper(ontology: OntologyMetamodel, admitted: Admitted): Verdict {
  const names = [...ontology.top_categories.map((t) => t.name), ...ontology.nouns.map((n) => n.noun)];
  const index = new Map<string, number>();
  const problems: string[] = [];
  names.forEach((name, i) => {
    if (index.has(name)) problems.push(`${name}: a top category and a noun, or two of either, share this name`);
    else index.set(name, i);
  });
  const retired = new Set(ontology.nouns.filter((n) => n.status === "retired").map((n) => n.noun));
  const links: [number, number][] = [];
  for (const n of ontology.nouns) for (const target of n.broader ?? []) {
    const at = index.get(target);
    if (at === undefined) problems.push(`${n.noun}: broader ${target} is not a noun or a top category`);
    else if (retired.has(target)) problems.push(`${n.noun}: broader ${target} is retired`);
    else links.push([index.get(n.noun) ?? -1, at]);
  }
  const facts: Hierarchy = { confirmed: true, nodes: names.length, tops: ontology.top_categories.map((_, i) => i), broader: links };
  const verdict = run(topCategory, facts);
  const failed = new Set(verdict.failed);
  const reach = below(facts);
  const tops = topsReached(facts);
  if (failed.has("U1")) problems.push(`broader cycle through: ${names.filter((_, a) => reach[a][a]).join(", ")}`);
  if (failed.has("U2")) for (const [a] of links) if (facts.tops.includes(a)) problems.push(`top category ${names[a]} has something broader`);
  if (failed.has("U3")) hasBroader(facts).forEach((ok, a) => { if (!ok) problems.push(`orphan: ${names[a]} is not a top category and has nothing broader`); });
  if (failed.has("U4")) tops.forEach((ts, a) => { if (ts.length > 1) problems.push(`${names[a]} reaches two top categories: ${ts.map((t) => names[t]).join(", ")}`); });
  if (!verdict.pass && problems.length === 0) problems.push(`top-category failed: ${verdict.failed.join(", ")}`);

  const terms = new Map(admitted.terms.map((t) => [t.id, t]));
  const termOf = new Map(ontology.nouns.flatMap((n) => (n.term ? [[n.noun, n.term] as const] : [])));
  for (const n of ontology.nouns) for (const target of n.broader ?? []) {
    const narrow = terms.get(termOf.get(n.noun) ?? "");
    const broad = terms.get(termOf.get(target) ?? "");
    if (!narrow || !broad || narrow.level !== broad.level || narrow.id === broad.id) continue;
    const found = narrow.relations[broad.id];
    if (found !== "is_a" && found !== "equal") problems.push(`${n.noun}: broader ${target}, but the engine reads ${narrow.id} ${found ?? "unrelated"} ${broad.id}, not is_a or equal`);
  }

  const topOf = new Map(names.flatMap((name, a) => (tops[a].length === 1 ? [[name, names[tops[a][0]]] as const] : [])));
  return { problems, topOf };
}

const read = <T>(root: string, path: string): T => JSON.parse(readFileSync(join(root, path), "utf8")) as T;

function report(root: string): boolean {
  const ontology = read<OntologyMetamodel>(root, ONTOLOGY);
  const { problems, topOf } = checkUpper(ontology, read<Admitted>(root, ADMITTED));
  for (const p of problems) console.log(`FAIL  ${p}`);
  const counts = new Map<string, number>();
  for (const n of ontology.nouns) { const t = topOf.get(n.noun); if (t) counts.set(t, (counts.get(t) ?? 0) + 1); }
  const summary = ontology.top_categories.map((t) => `${t.name} (BFO ${t.bfo.class}) ${counts.get(t.name) ?? 0}`).join(", ");
  console.log(`${problems.length ? "FAIL" : "pass"}  every noun reaches exactly one top category (${ontology.nouns.length} nouns: ${summary})`);
  return problems.length === 0;
}

let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const self = new URL(import.meta.url).pathname;
const repo = join(dirname(self), "../..");

function fixtureCases(): void {
  const ontology = read<OntologyMetamodel>(repo, ONTOLOGY);
  const admitted = read<Admitted>(repo, ADMITTED);
  const relink = (noun: string, broader: string[] | undefined): OntologyMetamodel => ({
    ...ontology,
    nouns: ontology.nouns.map((n) => {
      if (n.noun !== noun) return n;
      const copy = { ...n, broader };
      if (!broader) delete copy.broader;
      return copy;
    }),
  });
  const problems = (o: OntologyMetamodel): string[] => checkUpper(o, admitted).problems;

  const twoTops = problems(relink("venture", ["party", "capacity"]));
  expect("a noun with two top categories is named", twoTops.length === 1 && twoTops[0] === "venture reaches two top categories: party, capacity", twoTops.join("; "));

  const orphan = problems(relink("workbench", undefined));
  expect("an orphan is named, and only the orphan, not the nouns under it", orphan.length === 1 && orphan[0] === "orphan: workbench is not a top category and has nothing broader", orphan.join("; "));

  const cycle = problems(relink("AI harness", ["agent harness"]));
  expect("a broader cycle names the nouns on it", cycle.some((p) => p === "broader cycle through: agent harness, AI harness"), cycle.join("; "));

  const unknown = problems(relink("vault", ["folder"]));
  expect("a broader target that is neither a noun nor a top category is named", unknown.includes("vault: broader folder is not a noun or a top category"), unknown.join("; "));

  const toRetired = problems(relink("venture", ["sphere"]));
  expect("a broader target that is retired is named", toRetired.includes("venture: broader sphere is retired"), toRetired.join("; "));

  const clash = problems({ ...ontology, top_categories: [...ontology.top_categories, { name: "venture", meaning: "x", bfo: { class: "entity", iri: "http://purl.obolibrary.org/obo/BFO_0000001" } }] });
  expect("a top category that shares a noun's name is named", clash.includes("venture: a top category and a noun, or two of either, share this name"), clash.join("; "));

  const base = { level: "membership", meaning: "x", standard: "x", status: "proposed" as const, function: null, handoff_type: false };
  const pair = (narrow: string, broad: string): OntologyMetamodel => ({
    ...ontology,
    nouns: [{ ...base, noun: "a", term: narrow, broader: ["b"] }, { ...base, noun: "b", term: broad, broader: ["party"] }],
  });
  expect("a link between admitted terms the engine reads as is_a passes", problems(pair("co-founder", "founder")).length === 0, problems(pair("co-founder", "founder")).join("; "));
  const inverted = problems(pair("founder", "co-founder"));
  expect("a link between admitted terms the engine reads as has_a_kind is named", inverted.length === 1 && inverted[0] === "a: broader b, but the engine reads founder has_a_kind co-founder, not is_a or equal", inverted.join("; "));

  const root = mkdtempSync(join(tmpdir(), "upper-"));
  try {
    const put = (path: string, text: string): void => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
    put(ONTOLOGY, JSON.stringify(relink("decision", undefined)));
    put(ADMITTED, JSON.stringify(admitted));
    const r = spawnSync(process.execPath, [self, "--root", root], { encoding: "utf8" });
    expect("removing one broader link in a copy exits 1 and names the orphan", r.status === 1 && r.stdout.includes("orphan: decision"), `${r.status} ${r.stdout}${r.stderr}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const at = process.argv.indexOf("--root");
  if (at > 0) process.exit(report(process.argv[at + 1]) ? 0 : 1);
  fixtureCases();
  if (!report(repo)) failed++;
  console.log(failed ? `${failed} failed` : "upper ontology: all pass");
  process.exit(failed ? 1 : 0);
}
