// Tests that the engine's config readers (naive-config.ts) read through the NaiveConfig service with their old
// shapes and messages (phase 3 of docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md).
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configFor, rawConfig, readConfig } from "./naive-config.ts";

const results: [string, boolean][] = [];
const test = async (name: string, fn: () => void | Promise<void>) => {
  try { await fn(); results.push([name, true]); } catch (e) { results.push([name, false]); console.error(name, e); }
};

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
