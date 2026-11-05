// Checks the catalog of ontologies (N-050): docs/ontology-catalog.json lists every name@function scope with its
// version, owner, status and imports. A scope's terms are the live nouns in docs/ontology.json whose function is
// its suffix. A shared noun (function null) and a top category are visible to every scope.
//
//   node schema/terms/catalog-test.ts               fixture cases, then the repository
//   node schema/terms/catalog-test.ts --root <dir>  one tree only, exit 1 on any problem
//
// Fails closed: a file that cannot be read or parsed is a failure, never a pass. Each scope's suffix must be a
// function id and its owner, every function must have a scope, and every import must name a scope in the
// catalog. Imports must not cycle. That verdict is the admitted term layer's property L2 (no cycle) run through
// the EE-095 engine on the scopes as an arrangement, the property lean/Naive/Layer.lean's cycle_no_downward_order
// is about. The catalog need not be one stack, so only L2 is read. Every term a scope's nouns use, through
// broader and capabilities, must be defined in that scope or in one it imports directly, and a noun's term must
// be admitted in schema/terms/admitted.json. A missing term is never coined: it is printed as an open item for
// its owning scope, the scope that defines it, else the scope its name@function suffix names, else the scope
// that uses it.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { OntologyCatalog, OntologyMetamodel } from "../types/records.d.ts";
import { run } from "./engine.ts";
import type { Arrangement } from "./levels.ts";
import { layer } from "./terms.ts";

type Admitted = { terms: { id: string }[] };
type Inputs = { catalog: OntologyCatalog; ontology: OntologyMetamodel; admitted: Admitted; functions: string[] };

const CATALOG = "docs/ontology-catalog.json";
const ONTOLOGY = "docs/ontology.json";
const ADMITTED = "schema/terms/admitted.json";
const DEPARTMENTS = "operations/departments.json";

const suffixOf = (name: string): string | undefined => /^.+@([^@]+)$/.exec(name)?.[1];

/** One cycle per back edge found by a depth-first walk, each written from where it starts back to itself. */
function cyclesOf(edges: number[][]): number[][] {
  const state = new Array<0 | 1 | 2>(edges.length).fill(0);
  const path: number[] = [];
  const found: number[][] = [];
  const visit = (a: number): void => {
    state[a] = 1;
    path.push(a);
    for (const b of edges[a]) {
      if (state[b] === 1) found.push([...path.slice(path.indexOf(b)), b]);
      else if (state[b] === 0) visit(b);
    }
    path.pop();
    state[a] = 2;
  };
  edges.forEach((_, a) => { if (state[a] === 0) visit(a); });
  return found;
}

export function checkCatalog({ catalog, ontology, admitted, functions }: Inputs): string[] {
  const problems: string[] = [];
  const scopes = catalog.scopes.map((s) => s.scope);
  const index = new Map<string, number>();
  const scopeOf = new Map<string, string>();
  const known = new Set(functions);
  catalog.scopes.forEach((s, i) => {
    if (index.has(s.scope)) problems.push(`${s.scope}: listed twice`);
    index.set(s.scope, i);
    const fn = suffixOf(s.scope) ?? "";
    if (!known.has(fn)) problems.push(`${s.scope}: ${fn} is not a function id`);
    else if (s.owner !== fn) problems.push(`${s.scope}: owner ${s.owner} is not its function ${fn}`);
    else if (scopeOf.has(fn)) problems.push(`${s.scope}: ${fn} already has scope ${scopeOf.get(fn)}`);
    else scopeOf.set(fn, s.scope);
  });
  for (const fn of functions) if (!scopeOf.has(fn)) problems.push(`function ${fn} has no scope in the catalog`);

  const edges = catalog.scopes.map((s) => s.imports.flatMap((target) => {
    const at = index.get(target);
    if (at === undefined) problems.push(`${s.scope}: imports ${target}, which is not in the catalog`);
    return at === undefined ? [] : [at];
  }));
  const facts: Arrangement = { confirmed: true, parts: scopes.length, dependsOn: edges.flatMap((to, a) => to.map((b): [number, number] => [a, b])), byConcern: true };
  if (run(layer, facts).failed.includes("L2")) {
    const cycles = cyclesOf(edges);
    for (const c of cycles) problems.push(`import cycle: ${c.map((i) => scopes[i]).join(" -> ")}`);
    if (!cycles.length) problems.push("import cycle: layer L2 failed on the imports");
  }

  const tops = new Set(ontology.top_categories.map((t) => t.name));
  const live = new Map(ontology.nouns.filter((n) => n.status !== "retired").map((n) => [n.noun, n.function ?? null]));
  const terms = new Set(admitted.terms.map((t) => t.id));
  const importsOf = new Map(catalog.scopes.map((s) => [s.scope, s.imports]));
  for (const n of ontology.nouns) {
    const used = n.status === "retired" || !n.function ? undefined : scopeOf.get(n.function);
    if (!used) continue;
    const sees = new Set([used, ...(importsOf.get(used) ?? [])]);
    const open = (term: string, field: string, owning: string, why: string): void => {
      problems.push(`undefined term "${term}" in ${used} (${n.noun}, ${field}): ${why}; open item for ${owning}`);
    };
    for (const [field, targets] of [["broader", n.broader ?? []], ["capabilities", n.capabilities ?? []]] as const) for (const term of targets) {
      if (tops.has(term)) continue;
      const owner = live.get(term);
      if (owner === null) continue;
      if (owner === undefined) {
        open(term, field, scopeOf.get(suffixOf(term) ?? "") ?? used, "no scope defines it");
        continue;
      }
      const owning = scopeOf.get(owner);
      if (!owning) open(term, field, used, `its function ${owner} has no scope`);
      else if (!sees.has(owning)) open(term, field, owning, `defined in ${owning}, which ${used} does not import`);
    }
    if (n.term && !terms.has(n.term)) open(n.term, "term", used, `not admitted in ${ADMITTED}`);
  }
  return problems;
}

function load(root: string): Inputs {
  const read = <T>(path: string): T => JSON.parse(readFileSync(join(root, path), "utf8")) as T;
  const catalog = read<OntologyCatalog>(CATALOG);
  if (!Array.isArray(catalog.scopes)) throw new Error(`${CATALOG}: no scopes`);
  const departments = read<{ departments: { id: string }[] }>(DEPARTMENTS).departments.map((d) => d.id);
  return { catalog, ontology: read<OntologyMetamodel>(ONTOLOGY), admitted: read<Admitted>(ADMITTED), functions: departments };
}

function report(root: string): boolean {
  let inputs: Inputs;
  try {
    inputs = load(root);
  } catch (e) {
    console.log(`FAIL  the catalog cannot be checked: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
  const problems = checkCatalog(inputs);
  for (const p of problems) console.log(`FAIL  ${p}`);
  const owned = inputs.ontology.nouns.filter((n) => n.function && n.status !== "retired").length;
  console.log(`${problems.length ? "FAIL" : "pass"}  ${inputs.catalog.scopes.length} scopes: imports acyclic, every term defined or imported (${owned} nouns owned by a scope)`);
  return problems.length === 0;
}

let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const self = new URL(import.meta.url).pathname;
const repo = join(dirname(self), "../..");

function fixtureCases(): void {
  const scope = (fn: string, imports: string[] = []): OntologyCatalog["scopes"][number] => ({ scope: `naive@${fn}`, owner: fn, version: "0.1.0", status: "proposed", imports });
  const noun = (name: string, fn: string | null, more: Partial<OntologyMetamodel["nouns"][number]> = {}): OntologyMetamodel["nouns"][number] =>
    ({ noun: name, level: "venture", meaning: "x", standard: "x", status: "proposed", function: fn, handoff_type: false, broader: ["party"], ...more });
  const inputs = (scopes: OntologyCatalog["scopes"], nouns: OntologyMetamodel["nouns"]): Inputs => ({
    catalog: { note: "x", scopes },
    ontology: { version: "0.0.0", note: "x", check: ["x"], top_categories: [{ name: "party", meaning: "x", bfo: { class: "x", iri: "x" } }], nouns },
    admitted: { terms: [{ id: "founder" }] },
    functions: ["a", "b", "c"],
  });
  const shared = noun("relationship", null);
  const nouns = [shared, noun("ledger@b", "b"), noun("invoice", "a", { broader: ["ledger@b"] })];
  const problems = (scopes: OntologyCatalog["scopes"], ns = nouns): string[] => checkCatalog(inputs(scopes, ns));

  const acyclic = problems([scope("a", ["naive@b"]), scope("b", ["naive@c"]), scope("c")]);
  expect("acyclic imports, and a term used through an import, pass", acyclic.length === 0, acyclic.join("; "));

  const cycle = problems([scope("a", ["naive@b"]), scope("b", ["naive@c"]), scope("c", ["naive@a"])]);
  expect("an import cycle is printed in order", cycle.length === 1 && cycle[0] === "import cycle: naive@a -> naive@b -> naive@c -> naive@a", cycle.join("; "));

  const selfImport = problems([scope("a", ["naive@a", "naive@b"]), scope("b"), scope("c")]);
  expect("a scope that imports itself is a cycle", selfImport.length === 1 && selfImport[0] === "import cycle: naive@a -> naive@a", selfImport.join("; "));

  const notImported = problems([scope("a"), scope("b"), scope("c")]);
  expect("a term defined in a scope that is not imported names its owning scope", notImported.length === 1 && notImported[0] === "undefined term \"ledger@b\" in naive@a (invoice, broader): defined in naive@b, which naive@a does not import; open item for naive@b", notImported.join("; "));

  const all = [scope("a", ["naive@b"]), scope("b"), scope("c")];
  const nowhere = problems(all, [...nouns, noun("receipt", "a", { broader: ["voucher"] })]);
  expect("a term no scope defines is an open item for the scope that uses it", nowhere.length === 1 && nowhere[0] === "undefined term \"voucher\" in naive@a (receipt, broader): no scope defines it; open item for naive@a", nowhere.join("; "));

  const scoped = problems(all, [...nouns, noun("ticket", "a", { capabilities: ["queue@c"] })]);
  expect("a missing scoped term is an open item for the scope its suffix names", scoped.length === 1 && scoped[0] === "undefined term \"queue@c\" in naive@a (ticket, capabilities): no scope defines it; open item for naive@c", scoped.join("; "));

  const retired = problems(all, [...nouns, noun("old", "b", { status: "retired" }), noun("bill", "a", { broader: ["old"] })]);
  expect("a retired noun is not a defined term", retired.length === 1 && retired[0].startsWith("undefined term \"old\" in naive@a"), retired.join("; "));

  const unadmitted = problems(all, [...nouns, noun("appointment", "a", { term: "founderx" }), noun("seat", "a", { term: "founder" })]);
  expect("a noun's term that is not admitted is named", unadmitted.length === 1 && unadmitted[0] === `undefined term "founderx" in naive@a (appointment, term): not admitted in ${ADMITTED}; open item for naive@a`, unadmitted.join("; "));

  const structure = problems([scope("a", ["naive@z"]), { ...scope("b"), owner: "a" }, scope("q")], [shared]);
  expect("an unknown import, a wrong owner, a suffix that is no function and a function with no scope are named",
    ["naive@a: imports naive@z, which is not in the catalog", "naive@b: owner a is not its function b", "naive@q: q is not a function id", "function b has no scope in the catalog", "function c has no scope in the catalog"].every((p) => structure.includes(p)) && structure.length === 5, structure.join("; "));

  const root = mkdtempSync(join(tmpdir(), "catalog-"));
  try {
    const put = (path: string, text: string): void => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
    for (const path of [ONTOLOGY, ADMITTED, DEPARTMENTS]) put(path, readFileSync(join(repo, path), "utf8"));
    const fns = (JSON.parse(readFileSync(join(repo, DEPARTMENTS), "utf8")) as { departments: { id: string }[] }).departments.map((d) => d.id);
    const [first, second] = fns.map((fn) => scope(fn).scope);
    put(CATALOG, JSON.stringify({ note: "x", scopes: fns.map((fn, i) => scope(fn, i === 0 ? [second] : i === 1 ? [first] : [])) }));
    const looped = spawnSync(process.execPath, [self, "--root", root], { encoding: "utf8" });
    expect("a scratch import cycle in a copy exits 1 and prints the cycle", looped.status === 1 && looped.stdout.includes(`import cycle: ${first} -> ${second} -> ${first}`), `${looped.status} ${looped.stdout}${looped.stderr}`);
    rmSync(join(root, CATALOG));
    const missing = spawnSync(process.execPath, [self, "--root", root], { encoding: "utf8" });
    expect("a copy with no catalog file exits 1, not 0", missing.status === 1 && missing.stdout.includes("the catalog cannot be checked"), `${missing.status} ${missing.stdout}${missing.stderr}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const at = process.argv.indexOf("--root");
  if (at > 0) process.exit(report(process.argv[at + 1]) ? 0 : 1);
  fixtureCases();
  if (!report(repo)) failed++;
  console.log(failed ? `${failed} failed` : "ontology catalog: all pass");
  process.exit(failed ? 1 : 0);
}
