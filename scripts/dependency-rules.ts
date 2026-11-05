// The monorepo's dependency rules (plan: the monorepo rebuild, PR 2).
//
//   node scripts/dependency-rules.ts            check, exit 1 on a broken rule
//   node scripts/dependency-rules.ts --graph    print the import graph between units
//
// Two rules:
//
//   acyclic       Units import each other without cycles. A unit is a tracked top-level folder until the code
//                 moves into workspace packages; then each package is a unit. Today's cycles are listed in
//                 scripts/dependency-rules.json as known, so the check passes now and fails on any new cycle, on a
//                 known cycle that grew, and on a known cycle that is gone but still listed (so the list only shrinks).
//   one version   Every package.json of the workspace (the root and each workspace in its `workspaces`) asks for a
//                 shared dependency by the same version.
//
// An import is a relative specifier in `import ... from`, `export ... from`, `import "..."` or `import("...")` in a
// tracked .mjs, .js, .cjs, .ts or .tsx file. Bare specifiers (npm packages) are not edges between units.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";

export type Rules = { readonly known_cycles: readonly (readonly string[])[] };
export type Graph = ReadonlyMap<string, ReadonlyMap<string, number>>;
export type Finding = { readonly rule: "acyclic" | "one-version"; readonly detail: string };

const CODE = /\.(mjs|cjs|js|ts|tsx)$/;
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'](\.{1,2}\/[^"']+)["']/g;

function tracked(root: string): string[] {
  const out = spawnSync("git", ["ls-files"], { cwd: root, encoding: "utf8" });
  if (out.status !== 0) throw new Error(`git ls-files failed: ${out.stderr}`);
  return out.stdout.split("\n").filter(Boolean);
}

/** The unit a repository path belongs to: its top-level folder, or "(root)" for a file at the root. */
export function unitOf(path: string): string {
  const i = path.indexOf("/");
  return i < 0 ? "(root)" : path.slice(0, i);
}

/** The import graph between units: from unit, to unit, number of imports. Edges inside a unit are left out. */
export function graph(root: string, files = tracked(root)): Graph {
  const g = new Map<string, Map<string, number>>();
  for (const file of files) {
    if (!CODE.test(file) || file.includes("node_modules/")) continue;
    const full = join(root, file);
    if (!existsSync(full)) continue;
    const from = unitOf(file);
    for (const m of readFileSync(full, "utf8").matchAll(SPECIFIER)) {
      const target = normalize(join(dirname(file), m[1]));
      if (target.startsWith("..")) continue; // outside the repository
      const to = unitOf(target);
      if (to === from) continue;
      const edges = g.get(from) ?? new Map<string, number>();
      edges.set(to, (edges.get(to) ?? 0) + 1);
      g.set(from, edges);
    }
  }
  return g;
}

/** The strongly connected components with more than one unit, each sorted, sorted by first member (Tarjan). */
export function cycles(g: Graph): string[][] {
  const nodes = new Set<string>([...g.keys(), ...[...g.values()].flatMap((e) => [...e.keys()])]);
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const on = new Set<string>();
  const out: string[][] = [];
  let next = 0;
  const visit = (v: string): void => {
    index.set(v, next);
    low.set(v, next);
    next++;
    stack.push(v);
    on.add(v);
    for (const w of g.get(v)?.keys() ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (on.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
    }
    if (low.get(v) === index.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        on.delete(w);
        comp.push(w);
      } while (w !== v);
      if (comp.length > 1) out.push(comp.sort());
    }
  };
  for (const v of [...nodes].sort()) if (!index.has(v)) visit(v);
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

/** Findings for the acyclic rule: a cycle not inside one known cycle, or a known cycle that no longer exists. */
export function checkCycles(found: readonly (readonly string[])[], rules: Rules): Finding[] {
  const out: Finding[] = [];
  const key = (c: readonly string[]) => [...c].sort().join(" ");
  for (const c of found) {
    if (!rules.known_cycles.some((k) => c.every((u) => k.includes(u)))) out.push({ rule: "acyclic", detail: `new cycle: ${key(c)}` });
  }
  for (const k of rules.known_cycles) {
    if (!found.some((c) => key(c) === key(k))) out.push({ rule: "acyclic", detail: `known cycle ${key(k)} is gone or smaller; update scripts/dependency-rules.json to what --graph shows` });
  }
  return out;
}

type Manifest = { readonly workspaces?: readonly string[]; readonly dependencies?: Record<string, string>; readonly devDependencies?: Record<string, string>; readonly peerDependencies?: Record<string, string> };

/** Findings for the one-version rule over the root package.json and each workspace it names. */
export function checkVersions(root: string): Finding[] {
  const read = (dir: string): Manifest => JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8")) as Manifest;
  const top = read(".");
  const dirs = [".", ...(top.workspaces ?? [])];
  const asked = new Map<string, Map<string, string[]>>();
  for (const dir of dirs) {
    const m = read(dir);
    for (const deps of [m.dependencies, m.devDependencies]) {
      for (const [name, version] of Object.entries(deps ?? {})) {
        const byVersion = asked.get(name) ?? new Map<string, string[]>();
        byVersion.set(version, [...(byVersion.get(version) ?? []), dir === "." ? "(root)" : dir]);
        asked.set(name, byVersion);
      }
    }
  }
  const out: Finding[] = [];
  for (const [name, byVersion] of [...asked].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (byVersion.size > 1) out.push({ rule: "one-version", detail: `${name}: ${[...byVersion].map(([v, where]) => `${v} in ${where.join(", ")}`).join("; ")}` });
  }
  return out;
}

export function check(root: string): Finding[] {
  const rules = JSON.parse(readFileSync(join(root, "scripts/dependency-rules.json"), "utf8")) as Rules;
  return [...checkCycles(cycles(graph(root)), rules), ...checkVersions(root)];
}

if (process.argv[1] && relative(process.argv[1], new URL(import.meta.url).pathname) === "") {
  const root = new URL("..", import.meta.url).pathname;
  if (process.argv.includes("--graph")) {
    const g = graph(root);
    for (const [from, edges] of [...g].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`${from} -> ${[...edges].sort((a, b) => b[1] - a[1]).map(([to, n]) => `${to} (${n})`).join(", ")}`);
    }
    console.log(`cycles: ${JSON.stringify(cycles(g))}`);
  } else {
    const findings = check(root);
    for (const f of findings) console.log(`FAIL  ${f.rule}: ${f.detail}`);
    if (findings.length) process.exit(1);
    console.log("pass  dependency rules: no new cycle between units, one version per shared dependency");
  }
}
