// Tests Naive's Effect base (EE-125): tagged errors, VentureFs on memory and on disk, and the runners.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun, IoError, NotFound, Refused } from "./errors.mjs";
import { MemoryFs, readJson, VentureFs, writeJson } from "./fs.mjs";
import { describe, exitCode, runPromise, runSync } from "./run.mjs";

const results: [string, boolean][] = [];
const test = async (name: string, fn: () => void | Promise<void>) => {
  try { await fn(); results.push([name, true]); } catch (e) { results.push([name, false]); console.error(name, e); }
};

await test("readJson and writeJson round-trip on a memory file system", () => {
  const program = Effect.gen(function* () {
    yield* writeJson("/v/venture.json", { id: "acme" });
    return yield* readJson("/v/venture.json");
  });
  assert.deepEqual(Effect.runSync(Effect.provide(program, MemoryFs())), { id: "acme" });
});

await test("a missing file fails with NotFound, caught by tag", () => {
  const program = readJson("/v/missing.json").pipe(Effect.catchTag("NotFound", (e) => Effect.succeed(e.path)));
  assert.equal(Effect.runSync(Effect.provide(program, MemoryFs())), "/v/missing.json");
});

await test("bad JSON fails with ParseError", () => {
  const exit = Effect.runSyncExit(Effect.provide(readJson("/v/a.json"), MemoryFs({ "/v/a.json": "{" })));
  assert.equal(exit._tag, "Failure");
});

await test("list gives the direct children of a folder", () => {
  const program = Effect.gen(function* () { const fs = yield* VentureFs; return yield* fs.list("/v"); });
  assert.deepEqual(Effect.runSync(Effect.provide(program, MemoryFs({ "/v/a.json": "1", "/v/b/c.json": "2" }))), ["a.json", "b"]);
});

await test("runSync and runPromise use the disk and throw the tagged error itself", async () => {
  const dir = mkdtempSync(join(tmpdir(), "naive-effect-"));
  try {
    runSync(writeJson(join(dir, "x.json"), [1]));
    assert.equal(readFileSync(join(dir, "x.json"), "utf8"), "[\n  1\n]\n");
    assert.deepEqual(await runPromise(readJson(join(dir, "x.json"))), [1]);
    assert.throws(() => runSync(readJson(join(dir, "none.json"))), (e: unknown) => e instanceof NotFound);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

await test("exit codes: CannotRun is 2, every other failure 1", () => {
  assert.equal(exitCode(new CannotRun({ message: "no python" })), 2);
  assert.equal(exitCode(new Refused({ rule: "writer", message: "no" })), 1);
  assert.match(describe(new Refused({ rule: "writer", message: "an agent may not write it", hint: "emit a signal" })), /refused \(writer\)/);
});

await test("every error carries a readable message", () => {
  assert.equal(new NotFound({ what: "file", path: "/v/a.json" }).message, "file not found: /v/a.json");
  assert.match(new IoError({ path: "/v", op: "read", cause: new Error("EACCES") }).message, /cannot read \/v: EACCES/);
});

for (const [name, ok] of results) console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
if (results.some(([, ok]) => !ok)) process.exitCode = 1;
