// Tests the NaiveConfig service (phase 3 of docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md): the file layer
// over MemoryFs and over disk, fixed configs, the venture runtime's override, and the engine reading through it.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit, Layer } from "effect";
import { configOf, NaiveConfigFile, NaiveConfigOf } from "./config.ts";
import { MemoryFs, NodeFs } from "./fs.ts";
import { ventureRuntime } from "./runtime.ts";
import { configFor, rawConfig, readConfig } from "../../engine/naive-config.ts";

const results: [string, boolean][] = [];
const test = async (name: string, fn: () => void | Promise<void>) => {
  try { await fn(); results.push([name, true]); } catch (e) { results.push([name, false]); console.error(name, e); }
};
const fileLayer = (files: Record<string, string>) => Layer.provide(NaiveConfigFile, MemoryFs(files));

await test("the file layer reads a venture's naive.config.json through VentureFs", () => {
  const cfg = Effect.runSync(Effect.provide(configOf("/v"), fileLayer({ "/v/venture.json": "{}", "/v/naive.config.json": '{"gate":{"fail_closed":["x"]}}' })));
  assert.deepEqual(cfg, { gate: { fail_closed: ["x"] } });
});

await test("a venture with no naive.config.json has the empty config", () => {
  assert.deepEqual(Effect.runSync(Effect.provide(configOf("/v"), fileLayer({ "/v/venture.json": "{}" }))), {});
});

await test("a file that is not JSON fails with ParseError naming the file", () => {
  const exit = Effect.runSyncExit(Effect.provide(configOf("/v"), fileLayer({ "/v/naive.config.json": "{ nope" })));
  assert.ok(Exit.isFailure(exit));
  const err = Effect.runSync(Effect.provide(configOf("/v").pipe(Effect.flip), fileLayer({ "/v/naive.config.json": "{ nope" })));
  assert.equal(err._tag, "ParseError");
  assert.match(err.message, /\/v\/naive\.config\.json is not valid JSON/);
});

await test("fixed configs answer by folder and copy, so a caller cannot change them", () => {
  const layer = NaiveConfigOf({ "/a": { owners: { finance: "pat" } } });
  const first = Effect.runSync(Effect.provide(configOf("/a"), layer));
  first.owners = {};
  assert.deepEqual(Effect.runSync(Effect.provide(configOf("/a"), layer)), { owners: { finance: "pat" } });
  assert.deepEqual(Effect.runSync(Effect.provide(configOf("/b"), layer)), {});
});

await test("the venture runtime reads the config through its own VentureFs, and takes an override", async () => {
  const onMemory = ventureRuntime("/v", { fs: MemoryFs({ "/v/naive.config.json": '{"checks":{"off":["telos"]}}' }) });
  assert.deepEqual(await onMemory.runPromise(configOf("/v")), { checks: { off: ["telos"] } });
  await onMemory.dispose();
  const fixed = ventureRuntime("/v", { fs: NodeFs, config: NaiveConfigOf({ "/v": { thresholds: { confidence: 0.9 } } }) });
  assert.deepEqual(await fixed.runPromise(configOf("/v")), { thresholds: { confidence: 0.9 } });
  await fixed.dispose();
});

await test("the engine reads through the service with its old shapes and messages", () => {
  const dir = mkdtempSync(join(tmpdir(), "naive-config-"));
  try {
    writeFileSync(join(dir, "venture.json"), "{}");
    assert.deepEqual(rawConfig(dir), {});
    assert.deepEqual(rawConfig(undefined), {});
    writeFileSync(join(dir, "naive.config.json"), '{"thresholds":{"confidence":0.8}}');
    assert.deepEqual(readConfig(dir), { thresholds: { confidence: 0.8 } });
    assert.equal(configFor(dir).thresholds.confidence, 0.8);
    assert.deepEqual(configFor(dir).checks, { off: [], warn: [] });
    writeFileSync(join(dir, "naive.config.json"), "{ nope");
    assert.throws(() => rawConfig(dir), /^Error: naive\.config\.json is not valid JSON: /);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

for (const [name, ok] of results) console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
if (results.some(([, ok]) => !ok)) process.exit(1);
console.log("all passed");
