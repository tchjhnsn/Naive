// Tests the direct-writes check (packages/naive/src/checks/check-direct-writes.ts). Each rule fails on a small copy
// that breaks it, and the repository itself passes.
//
//   node packages/naive/src/checks/check-direct-writes-test.ts

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { check, countWrites, inScope, LIST, readList, scan, WRITER, type List } from "./check-direct-writes.ts";

const root = fileURLToPath(new URL("../../../..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "check-direct-writes-"));
let passed = 0;
const test = (name: string, fn: () => void): void => { fn(); passed++; console.log(`ok ${name}`); };

let copies = 0;
/** A small repository on disk holding the given files, and the check's answer for it under the given list. */
function run(files: Record<string, string>, list: List["files"]): string[] {
  const dir = join(tmp, `r${++copies}`);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return check(dir, Object.keys(files), { files: list });
}
const E = "packages/naive/src/engine/thing.ts";
const DIRECT = `import { writeFileSync } from "node:fs";\nexport const save = (f: string, t: string) => writeFileSync(f, t);\n`;
const why = "a cache under .naive/ that is rebuilt from the records";

test("counts each call that puts bytes on disk and skips comments", () => {
  assert.equal(countWrites(`writeFileSync(a, b);\nappendFileSync(a, b); renameSync(a, b);\n  // writeFileSync(a, b)\n * cpSync(a, b)\n`), 3);
  assert.equal(countWrites(`yield* fs.writeText(f, t);\nyield* fs.append(log, line);\nyield* files.rename(a, b);\n`), 3);
  assert.equal(countWrites(`url.searchParams.append("a", "b");\nconst x = writeRecord(dir, f, v, i);\nimport { writeFileSync } from "node:fs";\n`), 0);
});

test("reads the units outside the router and leaves out tests, fixtures, connectors and the writer", () => {
  assert.ok(inScope(E));
  assert.ok(inScope("packages/naive/src/functions/strategy/frameworks/idea-map/ideamap.ts"));
  assert.ok(inScope("packages/naive/src/interfaces/cli/naive.ts"));
  for (const f of [WRITER, "packages/naive/src/core/provenance.ts", "packages/naive/src/router/router.ts", "packages/naive/src/store/connectors/filesystem.ts",
    "packages/naive/src/engine/thing-test.ts", "packages/naive/src/checks/test.ts", "packages/naive/src/interfaces/tests/x.ts", "packages/naive/src/functions/a/features/b.steps.ts",
    "packages/naive/src/functions/a/fixtures/b.ts", "packages/naive/src/records/examples/x/sync.ts", "scripts/build.ts", "packages/naive/src/engine/thing.json"]) assert.ok(!inScope(f), f);
});

test("a file that writes directly and is not on the list fails", () => {
  const out = run({ [E]: DIRECT }, {});
  assert.equal(out.length, 1);
  assert.match(out[0], /thing\.ts: writes a file directly \(1 call\)/);
  assert.match(out[0], /record-write\.ts/);
});

test("a listed file with the count its entry says passes", () => {
  assert.deepEqual(run({ [E]: DIRECT }, { [E]: { writes: 1, why } }), []);
});

test("a listed file that adds a direct write fails", () => {
  const out = run({ [E]: `${DIRECT}export const more = (f: string) => appendFileSync(f, "x");\n` }, { [E]: { writes: 1, why } });
  assert.equal(out.length, 1);
  assert.match(out[0], /makes 2 direct write calls and .* allows 1/);
});

test("a listed file that drops a direct write fails until its entry is lowered", () => {
  const out = run({ [E]: DIRECT }, { [E]: { writes: 2, why } });
  assert.equal(out.length, 1);
  assert.match(out[0], /lower its entry/);
});

test("an entry for a file that no longer writes directly fails until it is removed", () => {
  const out = run({ [E]: `export const x = 1;\n` }, { [E]: { writes: 1, why } });
  assert.equal(out.length, 1);
  assert.match(out[0], /remove its entry/);
});

test("an entry with no reason fails", () => {
  const out = run({ [E]: DIRECT }, { [E]: { writes: 1, why: "" } });
  assert.equal(out.length, 1);
  assert.match(out[0], /gives no reason/);
});

test("a file that writes through the writer passes with no entry", () => {
  assert.deepEqual(run({ [E]: `import { writeRecord } from "../store/record-write.ts";\nexport const save = (d: string, v: unknown) => writeRecord(d, "venture.json", v, { agent: { kind: "person" } });\n` }, {}), []);
});

test("the repository passes, and its list names only files that write directly", () => {
  assert.deepEqual(check(root), []);
  const found = scan(root);
  const list = readList(root);
  assert.deepEqual(Object.keys(list.files).filter((f) => !found[f]), []);
  assert.ok(!list.files[WRITER] && !list.files[LIST]);
});

rmSync(tmp, { recursive: true, force: true });
console.log(`check-direct-writes: ${passed} passed`);
