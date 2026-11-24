// Tests Connectors as a service (phase 7 of docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md): with no layer
// the registry's filesystem connector reads and writes a venture's records, a source map routes a record type to
// another folder, and a host's Connectors replaces the registry.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Layer } from "effect";
import { NodeFs } from "../../core/effect/fs.ts";
import { Connectors, connectorFor, registryConnectors } from "./service.ts";
import type { Connector } from "./contract.ts";

const results: [string, boolean][] = [];
const test = async (name: string, fn: () => void | Promise<void>) => {
  try { await fn(); results.push([name, true]); } catch (e) { results.push([name, false]); console.error(name, e); }
};
const run = <A, E>(eff: Effect.Effect<A, E, "naive/VentureFs">) => Effect.runPromise(Effect.provide(eff, NodeFs));

await test("with no layer, the registry's filesystem connector reads and writes the venture's records", async () => {
  const dir = mkdtempSync(join(tmpdir(), "naive-connectors-"));
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "v" }));
  const { source, connector } = await run(connectorFor(dir, "product"));
  assert.equal(source.id, "venture");
  await connector.write("products/a.json", '{"id":"a"}\n');
  assert.equal(readFileSync(join(dir, "products/a.json"), "utf8"), '{"id":"a"}\n');
  assert.equal(String((await connector.read("products/a.json"))?.content), '{"id":"a"}\n');
  rmSync(dir, { recursive: true });
});

await test("a source map sends a record type to another folder", async () => {
  const dir = mkdtempSync(join(tmpdir(), "naive-connectors-"));
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "v" }));
  const docs = `${dir}-docs`;
  mkdirSync(join(dir, "knowledge"));
  writeFileSync(join(dir, "knowledge/sources.json"), JSON.stringify({ sources: [{ id: "docs", connector: "filesystem", root: docs }], records: { product: "docs" } }));
  const { source, connector } = await run(connectorFor(dir, "product"));
  assert.equal(source.id, "docs");
  await connector.write("products/b.json", "{}\n");
  assert.equal(readFileSync(join(docs, "products/b.json"), "utf8"), "{}\n");
  rmSync(dir, { recursive: true });
  rmSync(docs, { recursive: true });
});

await test("a host's Connectors replaces the registry", async () => {
  const fake: Connector = {
    id: "host", writes: "direct", list: async () => [], read: async () => null, version: async () => null, search: async () => [],
    write: async () => { throw new Error("not used"); },
  };
  const host = Layer.succeed(Connectors, { ...registryConnectors, sourceFor: () => Effect.succeed({ id: "neon", connector: "postgres" }), connect: () => Effect.succeed(fake) });
  const got = await Effect.runPromise(Effect.provide(connectorFor("/nowhere", "product"), Layer.merge(host, NodeFs)));
  assert.equal(got.source.id, "neon");
  assert.equal(got.connector.id, "host");
});

for (const [name, ok] of results) console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
if (results.some(([, ok]) => !ok)) process.exit(1);
console.log("all passed");
