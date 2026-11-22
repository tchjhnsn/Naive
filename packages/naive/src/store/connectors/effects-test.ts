// Tests the store connectors' Effect versions (EE-125) on an in-memory VentureFs: the source map,
// the filesystem connector's Effect methods, compare on write and the tagged errors.
import assert from "node:assert/strict";
import { Effect } from "effect";
import { MemoryFs } from "../../core/effect/fs.mjs";
import { safePathEffect, checkWriteEffect, blobSha } from "./contract.mjs";
import { sourceForEffect, sourcesOfEffect } from "./index.mjs";
import { connectEffects } from "./filesystem.mjs";

const results: [string, boolean][] = [];
const test = async (name: string, fn: () => void | Promise<void>) => {
  try { await fn(); results.push([name, true]); } catch (e) { results.push([name, false]); console.error(name, e); }
};
const run = <A, E>(program: Effect.Effect<A, E, "naive/VentureFs">, files: Record<string, string> = {}) =>
  Effect.runPromise(Effect.provide(program, MemoryFs(files)));
const tagOf = async <A, E>(program: Effect.Effect<A, E, "naive/VentureFs">, files: Record<string, string> = {}) =>
  run(Effect.match(program, { onFailure: (e) => (e as { _tag?: string })._tag ?? "untagged", onSuccess: () => "success" }), files);

await test("sourcesOfEffect reads a source map from memory, with the venture source first", async () => {
  const map = { sources: [{ id: "docs", connector: "filesystem", root: "../docs" }], records: { product: "docs" } };
  const m = await run(sourcesOfEffect("/v"), { "/v/venture.json": "{}", "/v/knowledge/sources.json": JSON.stringify(map) });
  assert.deepEqual(m.sources.map((s) => s.id), ["venture", "docs"]);
  assert.equal(m.mapped, true);
});

await test("sourceForEffect fails with CannotRun when the map names a missing source", async () => {
  const map = { sources: [], records: { product: "crm" } };
  assert.equal(await tagOf(sourceForEffect("/v", "product"), { "/v/venture.json": "{}", "/v/knowledge/sources.json": JSON.stringify(map) }), "CannotRun");
});

await test("safePathEffect refuses a path that leaves the root", async () => {
  assert.equal(await tagOf(safePathEffect("../x")), "Refused");
  assert.equal(await run(safePathEffect("a/./b")), "a/b");
});

await test("checkWriteEffect fails with VersionConflict on a stale base", async () => {
  const tag = await tagOf(checkWriteEffect("a.md", "abc", null, "x", { base: "def" }));
  assert.equal(tag, "VersionConflict");
});

await test("the filesystem connector's Effect methods write, read, list and compare on memory", async () => {
  const program = Effect.gen(function* () {
    const c = yield* connectEffects({ root: "/r" });
    const w = yield* c.write("notes/a.md", "# A\n");
    const read = yield* c.read("notes/a.md");
    const listed = yield* c.list();
    const appended = yield* c.write("log.jsonl", "1\n", { append: true, base: null });
    const stale = yield* Effect.match(c.write("log.jsonl", "2\n", { append: true, base: null }), { onFailure: (e) => e._tag, onSuccess: () => "success" });
    return { w, read, listed, appended, stale };
  });
  const out = await run(program);
  assert.equal(out.w.version, blobSha("# A\n"));
  assert.equal(out.read?.content, "# A\n");
  assert.deepEqual(out.listed.map((x) => x.path), ["notes/a.md"]);
  assert.equal(out.appended.version, blobSha("1\n"));
  assert.equal(out.stale, "VersionConflict");
});

await test("a read-only filesystem connector refuses a write with Refused", async () => {
  const program = Effect.flatMap(connectEffects({ root: "/r", writes: "none" }), (c) => c.write("a.md", "x"));
  assert.equal(await tagOf(program), "Refused");
});

for (const [name, ok] of results) console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
const failed = results.filter(([, ok]) => !ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failing`);
if (failed) process.exitCode = 1;
