// Tests the Effect versions of the provenance log and the blob store (EE-125) on a memory file system:
// the lock file is released however the work inside ends, a gate line chains exactly as lineHash says,
// and a blob is stored under its hash and refused when its bytes do not match. The disk paths, the
// cross-process lock and the router are covered by as-of-test, ontology-gate-test and handoff-claim-test.
import assert from "node:assert/strict";
import { Effect } from "effect";
import { blobFile, blobHash, hasBlobEffect, readBlobEffect, writeBlobEffect } from "./blobs.mjs";
import { IoError } from "./effect/errors.ts";
import { memoryFs, VentureFs } from "./effect/fs.ts";
import { lineHash, recordGateEffect, stealDeadLockEffect, withLockFileEffect } from "./provenance.mjs";

const results: [string, boolean][] = [];
const test = async (name: string, fn: () => void | Promise<void>) => {
  try { await fn(); results.push([name, true]); } catch (e) { results.push([name, false]); console.error(name, e); }
};
const on = <A, E>(fs: ReturnType<typeof memoryFs>, effect: Effect.Effect<A, E, "naive/VentureFs">) =>
  Effect.runSyncExit(Effect.provideService(effect, VentureFs, fs));

await test("the lock file holds this process's pid while the work runs and is gone after", () => {
  const fs = memoryFs();
  const seen = on(fs, withLockFileEffect("/v/.x.lock", Effect.sync(() => fs.files.get("/v/.x.lock"))));
  assert.equal(seen._tag, "Success");
  assert.equal(seen._tag === "Success" && String(seen.value), String(process.pid));
  assert.equal(fs.files.has("/v/.x.lock"), false);
});

await test("the lock file is released when the work inside fails", () => {
  const fs = memoryFs();
  const exit = on(fs, withLockFileEffect("/v/.x.lock", Effect.fail(new IoError({ path: "/v/x", op: "write", cause: "boom" }))));
  assert.equal(exit._tag, "Failure");
  assert.equal(fs.files.has("/v/.x.lock"), false);
});

await test("a lock held by a live pid is never stolen", () => {
  const fs = memoryFs({ "/v/.x.lock": String(process.pid) });
  const exit = on(fs, stealDeadLockEffect("/v/.x.lock"));
  assert.equal(exit._tag === "Success" && exit.value, false);
  assert.equal(fs.files.has("/v/.x.lock"), true);
});

await test("a gate line chains from genesis by lineHash, and the same verdict again appends nothing", () => {
  const fs = memoryFs({ "/v/pkg.json": "{\"a\":1}\n" });
  const judgment = { function: "finance" };
  const first = on(fs, recordGateEffect("/v/pkg.json", judgment));
  const again = on(fs, recordGateEffect("/v/pkg.json", judgment));
  assert.ok(first._tag === "Success" && again._tag === "Success");
  const line = first.value;
  assert.equal(line.prev, "genesis");
  assert.equal(line.sha256, blobHash("{\"a\":1}\n"));
  assert.equal(line.hash, lineHash("genesis", line));
  assert.deepEqual(again.value, line);
  assert.equal(String(fs.files.get("/v/pkg.provenance.jsonl")), JSON.stringify(line) + "\n");
});

await test("a gate on a file that is not .json is refused", () => {
  const exit = on(memoryFs(), recordGateEffect("/v/pkg.txt", { function: "finance" }));
  assert.ok(exit._tag === "Failure" && String(exit.cause).includes("Refused"));
});

await test("a blob is stored under its hash, found again, and refused when its bytes do not match", () => {
  const fs = memoryFs();
  const written = on(fs, writeBlobEffect("/v", "hello"));
  assert.ok(written._tag === "Success");
  const h = written.value;
  assert.equal(h, blobHash("hello"));
  assert.equal(fs.files.has(blobFile("/v", h)), true);
  assert.equal([...fs.files.keys()].some((k) => k.endsWith(".tmp")), false);
  const has = on(fs, hasBlobEffect("/v", h));
  assert.equal(has._tag === "Success" && has.value, true);
  const read = on(fs, readBlobEffect("/v", h));
  assert.equal(read._tag === "Success" && read.value.toString("utf8"), "hello");
  fs.files.set(blobFile("/v", h), "tampered");
  const damaged = on(fs, readBlobEffect("/v", h));
  assert.ok(damaged._tag === "Failure" && String(damaged.cause).includes("ParseError"));
});

for (const [name, ok] of results) console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
const failed = results.filter(([, ok]) => !ok).length;
console.log(failed ? `provenance effects: ${failed} failing` : "provenance effects: all passing");
process.exit(failed ? 1 : 0);
