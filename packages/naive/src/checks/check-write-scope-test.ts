// Proves check-write-scope.ts fails on a write outside the venture, in a copy of the repository where
// Naive's provenance code also writes beside the repository root.
//
//   node packages/naive/src/checks/check-write-scope-test.ts

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../../..", import.meta.url));
const TEST = "packages/naive/src/interfaces/tests/agent-files-test.ts";
const PROVENANCE = "packages/naive/src/core/provenance.mjs";
const LINE = 'appendFileSync(ventureFile(dir, LOG), JSON.stringify(entry) + "\\n");';

function copy(): string {
  const dir = mkdtempSync(join(tmpdir(), "write-scope-test-"));
  for (const d of ["packages", "schema", "frameworks", "agents", "beta", "package.json", "tsconfig.json"]) cpSync(join(repo, d), join(dir, d), { recursive: true });
  symlinkSync(join(repo, "node_modules"), join(dir, "node_modules"));
  return dir;
}

function check(root: string, ...files: string[]): { status: number, out: string } {
  const r = spawnSync("node", [join(root, "packages/naive/src/checks/check-write-scope.ts"), "--root", root, ...files], { encoding: "utf8" });
  return { status: r.status ?? -1, out: r.stdout + r.stderr };
}

const dirs: string[] = [];
let passed = 0;
const test = (name: string, fn: () => void): void => {
  fn();
  passed++;
  console.log(`ok ${name}`);
};

try {
  const clean = copy();
  dirs.push(clean);
  test("a clean copy passes: the test writes only inside its venture under the temp dir", () => {
    const r = check(clean, TEST);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /wrote only inside the venture/);
  });

  const broken = copy();
  dirs.push(broken);
  const source = readFileSync(join(broken, PROVENANCE), "utf8");
  assert.ok(source.includes(LINE), `${PROVENANCE} no longer holds the line this test breaks`);
  writeFileSync(join(broken, PROVENANCE), source.replace(LINE, `${LINE}\n  appendFileSync(new URL("../../../../stray-provenance.jsonl", import.meta.url), "x\\n");`));
  test("a copy whose provenance code also writes beside the repository fails, and names the path", () => {
    const r = check(broken, TEST);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /pass {2}packages\/naive\/src\/interfaces\/tests\/agent-files-test\.ts/);
    assert.match(r.out, /write outside the venture: appendFileSync stray-provenance\.jsonl/);
  });

  test("a write from a child process through node:fs/promises is caught", () => {
    writeFileSync(join(clean, "child-writes.mjs"), [
      'import { spawnSync } from "node:child_process";',
      `spawnSync("node", ["--input-type=module", "-e", 'import { writeFile } from "node:fs/promises"; await writeFile(${JSON.stringify(join(clean, "stray.txt"))}, "x");'], { stdio: "inherit" });`,
    ].join("\n"));
    const r = check(clean, "child-writes.mjs");
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /write outside the venture: writeFile stray\.txt/);
  });

  test("a failing test fails the check", () => {
    writeFileSync(join(clean, "fails.mjs"), "process.exit(3);\n");
    const r = check(clean, "fails.mjs");
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /FAIL {2}fails\.mjs/);
  });
} finally {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}
console.log(`\n${passed} passed`);
