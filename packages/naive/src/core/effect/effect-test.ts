// Tests Naive's Effect base (EE-125): tagged errors, VentureFs on memory and on disk, the runners, and the venture
// runtime (EE-161).
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cause, Effect, Exit, Layer } from "effect";
import { CannotRun, IoError, NotFound, Refused } from "./errors.ts";
import { MemoryFs, memoryFs, readJson, VentureFs, writeJson } from "./fs.ts";
import { describe, exitCode, runMain, runPromise, runSync } from "./run.ts";
import { ventureRuntime } from "./runtime.ts";

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

await test("runMain gives the value, or prints one line and sets the exit code: 2 for CannotRun, else 1", async () => {
  const lines: string[] = [];
  const print = console.error;
  const before = process.exitCode;
  console.error = (...args: unknown[]) => { lines.push(args.join(" ")); };
  try {
    assert.equal(await runMain(Effect.succeed(7)), 7);
    assert.equal(await runMain(Effect.fail(new CannotRun({ message: "no python" }))), undefined);
    assert.deepEqual({ lines, code: process.exitCode }, { lines: ["cannot run: no python"], code: 2 });
    await runMain(Effect.fail(new NotFound({ what: "venture", path: "/v" })));
    assert.deepEqual({ lines: lines.slice(1), code: process.exitCode }, { lines: ["venture not found: /v"], code: 1 });
  } finally { console.error = print; process.exitCode = before; }
});

await test("every error carries a readable message", () => {
  assert.equal(new NotFound({ what: "file", path: "/v/a.json" }).message, "file not found: /v/a.json");
  assert.match(new IoError({ path: "/v", op: "read", cause: new Error("EACCES") }).message, /cannot read \/v: EACCES/);
});

await test("a venture runtime on MemoryFs reads and writes, and never touches the disk", async () => {
  const runtime = ventureRuntime("/v", { fs: MemoryFs({ "/v/venture.json": '{"id":"acme"}' }) });
  try {
    assert.deepEqual(runtime.runSync(readJson("/v/venture.json")), { id: "acme" });
    await runtime.runPromise(writeJson("/v/x.json", [1]));
    assert.deepEqual(await runtime.runPromise(readJson("/v/x.json")), [1]);
    assert.equal(existsSync("/v/x.json"), false);
  } finally { await runtime.dispose(); }
});

await test("a disposed venture runtime has released its layer and refuses to run", async () => {
  let released = 0;
  const fs = Layer.effect(VentureFs, Effect.acquireRelease(Effect.sync(() => memoryFs({ "/v/a.json": "1" })), () => Effect.sync(() => { released++; })));
  const runtime = ventureRuntime("/v", { fs });
  assert.equal(runtime.runSync(readJson("/v/a.json")), 1);
  assert.equal(released, 0);
  await runtime.dispose();
  assert.equal(released, 1);
  const exit = runtime.runSyncExit(readJson("/v/a.json"));
  assert.ok(Exit.isFailure(exit) && Cause.hasDies(exit.cause));
  await assert.rejects(runtime.runPromise(readJson("/v/a.json")));
});

await test("two ventures' runtimes stay separate: one's files are not the other's, and disposing one leaves the other running", async () => {
  const a = ventureRuntime("/a", { fs: MemoryFs() });
  const b = ventureRuntime("/b", { fs: MemoryFs() });
  const read = (path: string) => readJson(path).pipe(Effect.catchTag("NotFound", () => Effect.succeed("missing")));
  a.runSync(writeJson("/x.json", "written by a"));
  assert.equal(b.runSync(read("/x.json")), "missing");
  await a.dispose();
  b.runSync(writeJson("/x.json", "written by b"));
  assert.equal(b.runSync(read("/x.json")), "written by b");
  await b.dispose();
});

for (const [name, ok] of results) console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
if (results.some(([, ok]) => !ok)) process.exitCode = 1;
