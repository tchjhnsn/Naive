// Each dependency rule fails on a copy that breaks it.
//
//   node scripts/dependency-rules-test.ts

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, checkCycles, checkLeaves, checkVersions, cycles, graph } from "./dependency-rules.ts";

const root = new URL("..", import.meta.url).pathname;
let passed = 0;
const test = (name: string, fn: () => void): void => {
  fn();
  passed++;
  console.log(`ok ${name}`);
};

/** A small repository on disk: path to contents. Files are passed to graph() directly, so no git is needed. */
function repo(files: Record<string, string>): { dir: string; paths: string[] } {
  const dir = mkdtempSync(join(tmpdir(), "dependency-rules-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return { dir, paths: Object.keys(files) };
}

test("the repository passes as it is", () => {
  assert.deepEqual(check(root), []);
});

test("imports between units are edges, imports inside a unit and npm packages are not", () => {
  const r = repo({
    "a/x.ts": `import { y } from "./y.ts";\nimport z from "../b/z.mjs";\nimport "node:fs";\nexport * from "../b/w.ts";`,
    "a/y.ts": "export const y = 1;",
    "b/z.mjs": "export default 1;",
    "b/w.ts": `const c = await import("../c/v.ts");`,
    "c/v.ts": "export {};",
  });
  const g = graph(r.dir, r.paths);
  assert.deepEqual([...g.get("a")!], [["b", 2]]);
  assert.deepEqual([...g.get("b")!], [["c", 1]]);
  assert.deepEqual(cycles(g), []);
});

test("acyclic: a new cycle fails", () => {
  const r = repo({ "a/x.ts": `import "../b/y.ts";`, "b/y.ts": `import "../a/x.ts";` });
  assert.deepEqual(checkCycles(cycles(graph(r.dir, r.paths)), { known_cycles: [] }).map((f) => f.detail), ["new cycle: a b"]);
});

test("acyclic: a known cycle that grew fails", () => {
  const r = repo({ "a/x.ts": `import "../b/y.ts";`, "b/y.ts": `import "../c/z.ts";`, "c/z.ts": `import "../a/x.ts";` });
  const found = checkCycles(cycles(graph(r.dir, r.paths)), { known_cycles: [["a", "b"]] }).map((f) => f.detail);
  assert.ok(found.includes("new cycle: a b c"), JSON.stringify(found));
});

test("acyclic: a known cycle that is gone must leave the list", () => {
  const r = repo({ "a/x.ts": `import "../b/y.ts";`, "b/y.ts": "export {};" });
  const found = checkCycles(cycles(graph(r.dir, r.paths)), { known_cycles: [["a", "b"]] });
  assert.equal(found.length, 1);
  assert.match(found[0].detail, /known cycle a b is gone/);
});

test("leaf: a leaf folder that imports another unit fails, naming the import", () => {
  const r = repo({
    "packages/records/index.mjs": `import { x } from "../core/x.mjs";\nimport "./part.mjs";\nimport "node:fs";`,
    "packages/records/part.mjs": "export {};",
    "packages/core/x.mjs": "export const x = 1;",
  });
  const found = checkLeaves(r.dir, { "packages/records": "imports nothing" }, r.paths).map((f) => f.detail);
  assert.deepEqual(found, ["packages/records/index.mjs imports packages/core/x.mjs, but packages/records imports nothing outside itself (imports nothing)"]);
});

test("leaf: a leaf folder that imports only itself and Node passes; one with no code must leave the list", () => {
  const r = repo({ "packages/records/index.mjs": `import "./part.mjs";\nimport { join } from "node:path";`, "packages/records/part.mjs": "export {};" });
  assert.deepEqual(checkLeaves(r.dir, { "packages/records": "imports nothing" }, r.paths), []);
  assert.match(checkLeaves(r.dir, { "packages/gone": "imports nothing" }, r.paths)[0].detail, /packages\/gone holds no code/);
});

test("one version: two workspaces asking for different versions fail", () => {
  const r = repo({
    "package.json": JSON.stringify({ workspaces: ["app"], devDependencies: { typescript: "5.9.3" } }),
    "app/package.json": JSON.stringify({ dependencies: { react: "19.3.1" }, devDependencies: { typescript: "^5" } }),
  });
  assert.deepEqual(checkVersions(r.dir).map((f) => f.detail), ["typescript: 5.9.3 in (root); ^5 in app"]);
});

test("one version: a dependency only one package asks for passes", () => {
  const r = repo({
    "package.json": JSON.stringify({ workspaces: ["app"], devDependencies: { typescript: "5.9.3" } }),
    "app/package.json": JSON.stringify({ dependencies: { react: "19.3.1" }, devDependencies: { typescript: "5.9.3" } }),
  });
  assert.deepEqual(checkVersions(r.dir), []);
});

test("a specifier that names no file is not an edge, and require() is", () => {
  const r = repo({
    "a/x.ts": `// see import "../b/gone.ts"\nconst s = 'import("../c/nope.ts")';`,
    "a/y.cjs": `const z = require("../b/z.cjs");`,
    "b/z.cjs": "module.exports = 1;",
  });
  assert.deepEqual([...graph(r.dir, r.paths)].map(([f, e]) => [f, [...e]]), [["a", [["b", 1]]]]);
});

test("acyclic: a known cycle that grew says so", () => {
  const r = repo({ "a/x.ts": `import "../b/y.ts";`, "b/y.ts": `import "../c/z.ts";`, "c/z.ts": `import "../a/x.ts";` });
  const found = checkCycles(cycles(graph(r.dir, r.paths)), { known_cycles: [["a", "b"]] }).map((f) => f.detail);
  assert.ok(found.some((d) => /known cycle a b grew/.test(d)), JSON.stringify(found));
});

test("one version: peer dependencies count, and a workspaces glob names each package under it", () => {
  const r = repo({
    "package.json": JSON.stringify({ workspaces: { packages: ["packages/*"] }, dependencies: { react: "19.3.1" } }),
    "packages/ui/package.json": JSON.stringify({ peerDependencies: { react: "^19" } }),
    "packages/notes.md": "not a package",
  });
  assert.deepEqual(checkVersions(r.dir).map((f) => f.detail), ["react: 19.3.1 in (root); ^19 in packages/ui"]);
});

console.log(`${passed} tests passed`);
