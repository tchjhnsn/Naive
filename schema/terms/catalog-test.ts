// Checks the catalog of ontologies (N-050): docs/ontology-catalog.json lists every name@function scope with its
// version, owner, status and imports. A scope's terms are the live nouns in docs/ontology.json whose function is
// its suffix. A shared noun (function null) and a top category are visible to every scope.
//
//   node schema/terms/catalog-test.ts               fixture cases, then the repository
//   node schema/terms/catalog-test.ts --root <dir>  one tree only, exit 1 on any problem
//
// Fails closed: a file that cannot be read or parsed, or lacks a field the check reads, is a failure, never a pass.
// Each scope's suffix must be a function id and its owner, every function must have a scope, and every import must
// name a scope in the catalog. Imports must not cycle. That verdict is the admitted term layer's property L2 (no
// cycle) run through the EE-095 engine on the scopes as an arrangement, the property lean/Naive/Layer.lean's
// cycle_no_downward_order is about. The catalog need not be one stack, so only L2 is read. Every term a scope's
// nouns use, through broader and capabilities, must be defined in that scope or in one it imports directly, and a
// noun's term must be admitted in schema/terms/admitted.json. A missing term is never coined: it is printed as an
// open item for its owning scope, the scope that defines it, else the scope its name@function suffix names, else
// the scope that uses it.

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

const text = { ok: (v: unknown): boolean => typeof v === "string", is: "a string" };
type Check = typeof text;
const texts: Check = { ok: (v) => Array.isArray(v) && v.every((x) => typeof x === "string"), is: "a list of strings" };
const nullable = (c: Check): Check => ({ ok: (v) => v === null || c.ok(v), is: `${c.is} or null` });
const optional = (c: Check): Check => ({ ok: (v) => v === undefined || c.ok(v), is: c.is });

/** For each input file, the lists the check reads and the fields each entry must carry. */
const SHAPES: Record<string, Record<string, Record<string, Check>>> = {
  [CATALOG]: { scopes: { scope: text, owner: text, version: text, status: text, imports: texts } },
  [ONTOLOGY]: { top_categories: { name: text }, nouns: { noun: text, status: text, function: nullable(text), broader: optional(texts), capabilities: optional(texts), term: optional(text) } },
  [ADMITTED]: { terms: { id: text } },
  [DEPARTMENTS]: { departments: { id: text } },
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Parses one input file and checks the shape in SHAPES. Anything else throws an Error naming the file. */
function read<T>(root: string, path: string): T {
  let doc: unknown;
  try {
    doc = JSON.parse(readFileSync(join(root, path), "utf8"));
  } catch (e) {
    throw new Error(`${path}: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!isObject(doc)) throw new Error(`${path}: not a JSON object`);
  for (const [key, fields] of Object.entries(SHAPES[path])) {
    const entries = doc[key];
    if (!Array.isArray(entries)) throw new Error(`${path}: ${key} must be a list`);
    entries.forEach((entry: unknown, i) => {
      if (!isObject(entry)) throw new Error(`${path}: ${key}[${i}] must be an object`);
      for (const [field, c] of Object.entries(fields)) if (!c.ok(entry[field])) throw new Error(`${path}: ${key}[${i}].${field} must be ${c.is}`);
    });
  }
  return doc as T;
}

function load(root: string): Inputs {
  return {
    catalog: read<OntologyCatalog>(root, CATALOG),
    ontology: read<OntologyMetamodel>(root, ONTOLOGY),
    admitted: read<Admitted>(root, ADMITTED),
    functions: read<{ departments: { id: string }[] }>(root, DEPARTMENTS).departments.map((d) => d.id),
  };
}

/** The lines to print for one tree. Every input is parsed in load, so checkCatalog gets only checked data. */
function report(root: string): { ok: boolean; lines: string[] } {
  let inputs: Inputs;
  try {
    inputs = load(root);
  } catch (e) {
    return { ok: false, lines: [`FAIL  the catalog cannot be checked: ${(e as Error).message}`] };
  }
  const problems = checkCatalog(inputs);
  const owned = inputs.ontology.nouns.filter((n) => n.function && n.status !== "retired").length;
  const summary = `${problems.length ? "FAIL" : "pass"}  ${inputs.catalog.scopes.length} scopes: imports acyclic, every term defined or imported (${owned} nouns owned by a scope)`;
  return { ok: problems.length === 0, lines: [...problems.map((p) => `FAIL  ${p}`), summary] };
}

const print = ({ ok, lines }: { ok: boolean; lines: string[] }): boolean => { for (const l of lines) console.log(l); return ok; };

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

  const base = inputs(all, nouns);
  const files: Record<string, unknown> = { [CATALOG]: base.catalog, [ONTOLOGY]: base.ontology, [ADMITTED]: base.admitted, [DEPARTMENTS]: { departments: base.functions.map((id) => ({ id })) } };
  const root = mkdtempSync(join(tmpdir(), "catalog-"));
  try {
    const put = (path: string, text: string): void => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
    const tree = (path?: string, text?: string | null): { ok: boolean; lines: string[] } => {
      for (const [p, doc] of Object.entries(files)) put(p, JSON.stringify(doc));
      if (path && text === null) rmSync(join(root, path));
      else if (path && typeof text === "string") put(path, text);
      return report(root);
    };
    const cannot = (path: string, text: string | null, field = ""): string => {
      let r: { ok: boolean; lines: string[] };
      try {
        r = tree(path, text);
      } catch (e) {
        return `${path}: threw ${(e as Error).message}`;
      }
      const ok = !r.ok && r.lines.length === 1 && r.lines[0].startsWith(`FAIL  the catalog cannot be checked: ${path}: ${field}`);
      return ok ? "" : `${path}: ${r.lines.join(" | ")}`;
    };
    const each = (text: string | null): string => [CATALOG, ONTOLOGY, ADMITTED, DEPARTMENTS].map((path) => cannot(path, text)).filter(Boolean).join("; ");

    const whole = tree();
    expect("a scratch tree built from the fixtures passes", whole.ok, whole.lines.join(" | "));
    const missing = each(null);
    expect("a missing catalog, ontology, admitted terms or departments file prints FAIL, not a stack trace", !missing, missing);
    const unparsed = each("{");
    expect("an input file that is not JSON prints FAIL", !unparsed, unparsed);
    const nonObject = each("null");
    expect("an input file that is not a JSON object prints FAIL naming it", !nonObject, nonObject);
    const lists: [string, string][] = [[CATALOG, "scopes"], [ONTOLOGY, "top_categories"], [ONTOLOGY, "nouns"], [ADMITTED, "terms"], [DEPARTMENTS, "departments"]];
    const shapeless = lists.map(([path, key]) => {
      const rest = { ...(files[path] as Record<string, unknown>) };
      delete rest[key];
      return cannot(path, JSON.stringify(rest), `${key} must be a list`);
    }).filter(Boolean).join("; ");
    expect("an input file missing any list the check reads prints FAIL", !shapeless, shapeless);
    const noImports: Partial<OntologyCatalog["scopes"][number]> = scope("a", ["naive@b"]);
    delete noImports.imports;
    const unimported = cannot(CATALOG, JSON.stringify({ note: "x", scopes: [noImports, scope("b"), scope("c")] }), "scopes[0].imports must be a list of strings");
    expect("a scope with no imports prints FAIL", !unimported, unimported);
    const mistyped = cannot(CATALOG, JSON.stringify({ note: "x", scopes: [scope("a", ["naive@b"]), { ...scope("b"), owner: 2 }, scope("c")] }), "scopes[1].owner must be a string");
    expect("a scope field of the wrong type prints FAIL", !mistyped, mistyped);

    files[CATALOG] = { note: "x", scopes: [scope("a", ["naive@b"]), scope("b", ["naive@a"]), scope("c")] };
    tree();
    const looped = spawnSync(process.execPath, [self, "--root", root], { encoding: "utf8" });
    expect("a scratch import cycle in a copy exits 1 and prints the cycle", looped.status === 1 && looped.stdout.includes("import cycle: naive@a -> naive@b -> naive@a"), `${looped.status} ${looped.stdout}${looped.stderr}`);
    rmSync(join(root, CATALOG));
    const gone = spawnSync(process.execPath, [self, "--root", root], { encoding: "utf8" });
    expect("a copy with no catalog file exits 1 and prints FAIL, with nothing on stderr", gone.status === 1 && gone.stdout.includes("the catalog cannot be checked") && !gone.stderr, `${gone.status} ${gone.stdout}${gone.stderr}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const at = process.argv.indexOf("--root");
  if (at > 0) process.exit(print(report(process.argv[at + 1])) ? 0 : 1);
  fixtureCases();
  if (!print(report(repo))) failed++;
  console.log(failed ? `${failed} failed` : "ontology catalog: all pass");
  process.exit(failed ? 1 : 0);
}
