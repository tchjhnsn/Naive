// Tests Provenance as a service (phase 7 of docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md): the file log
// over a MemoryFs is a memory log that chains and stores blobs, a runtime override replaces it, and two ventures'
// runtimes keep their logs apart.
import assert from "node:assert/strict";
import { Effect, Layer } from "effect";
import { MemoryFs, memoryFs, VentureFs } from "./fs.ts";
import { Provenance, recordProvenance } from "./provenance.ts";
import { ventureRuntime } from "./runtime.ts";
import { lineHash, type Entry } from "../provenance.ts";
import { blobHash } from "../blobs.ts";

const results: [string, boolean][] = [];
const test = async (name: string, fn: () => void | Promise<void>) => {
  try { await fn(); results.push([name, true]); } catch (e) { results.push([name, false]); console.error(name, e); }
};
delete process.env.NAIVE_TRACES;
const agent = { kind: "person", via: "cli" };

await test("the log over a MemoryFs chains lines and stores each write's bytes", async () => {
  const mem = memoryFs({ "/v/venture.json": "{}", "/v/products/a.json": '{"id":"a"}' });
  const rt = ventureRuntime("/v", { fs: Layer.succeed(VentureFs, mem) });
  const [one, two] = await rt.runPromise(Effect.gen(function* () {
    const a = yield* recordProvenance("/v", { entity: "products/a.json", route: "products/a", activity: "write", agent });
    const b = yield* recordProvenance("/v", { entity: "products/a.json", route: "products/a", activity: "accept", agent });
    return [a, b];
  }));
  const all: Entry[] = await rt.runPromise(Effect.gen(function* () { return yield* (yield* Provenance).entries("/v"); }));
  await rt.dispose();
  assert.equal(one.prev, "genesis");
  assert.equal(two.prev, one.hash);
  const { hash, ...rest } = two;
  assert.equal(hash, lineHash(two.prev, rest));
  assert.deepEqual(all.map((e) => e.activity), ["write", "accept"]);
  const sha = blobHash('{"id":"a"}');
  assert.equal(one.sha256, sha);
  assert.ok([...mem.files.keys()].some((k) => k.startsWith("/v/.naive/blobs/") && k.includes(sha.slice(2))), "the blob is stored");
  assert.ok(mem.files.get("/v/provenance.jsonl")?.split("\n").filter(Boolean).length === 2);
});

await test("an override replaces the log", async () => {
  const kept: string[] = [];
  const fake = Layer.succeed(Provenance, {
    record: (_dir, input) => Effect.sync(() => { kept.push(input.entity); return { at: "t", entity: input.entity, activity: input.activity, sha256: "x", prev: "genesis", hash: "h" }; }),
    entries: () => Effect.succeed([]),
  });
  const rt = ventureRuntime("/v", { fs: MemoryFs({}), provenance: fake });
  await rt.runPromise(recordProvenance("/v", { entity: "x.json", activity: "write", sha256: "x" }));
  await rt.dispose();
  assert.deepEqual(kept, ["x.json"]);
});

await test("two ventures' runtimes keep their logs apart", async () => {
  const a = ventureRuntime("/a", { fs: MemoryFs({ "/a/f.json": "1" }) });
  const b = ventureRuntime("/b", { fs: MemoryFs({ "/b/f.json": "2" }) });
  await a.runPromise(recordProvenance("/a", { entity: "f.json", activity: "write", agent }));
  const inB = await b.runPromise(Effect.gen(function* () { return yield* (yield* Provenance).entries("/b"); }));
  await a.dispose(); await b.dispose();
  assert.deepEqual(inB, []);
});

for (const [name, ok] of results) console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
if (results.some(([, ok]) => !ok)) process.exit(1);
console.log("all passed");
