// Tests the router's write steps as Effects (phase 8 of docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md):
// the schema check through RecordValidator, the gate through Gate, and that a provided service replaces each.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Layer } from "effect";
import { gateWrite, gateWriteEffect } from "./gate-hooks.ts";
import { schemaFailure, schemaFailureEffect } from "./write-effects.ts";
import { Gate } from "../engine/gate-service.ts";
import { RecordValidatorOver } from "../records/record-validator.ts";
import { Validator } from "../records/validate.ts";

const results: [string, boolean][] = [];
const test = async (name: string, fn: () => void | Promise<void>) => {
  try { await fn(); results.push([name, true]); } catch (e) { results.push([name, false]); console.error(name, e); }
};
const venture = (config: unknown) => {
  const dir = mkdtempSync(join(tmpdir(), "naive-write-effects-"));
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "v" }));
  if (config !== undefined) writeFileSync(join(dir, "naive.config.json"), typeof config === "string" ? config : JSON.stringify(config));
  return dir;
};
const args = (dir: string, actor = "agent") => ({ dir, r: { route: "products/[id]", record: "product" }, route: "products/kettle", requested: "products/kettle", file: "products/kettle.json", actor });

await test("the schema check names the failing field, and passes a valid record", () => {
  assert.match(String(schemaFailure("venture.schema.json", { id: 7 })), /id: 7 is not of type 'string'/);
  assert.match(String(schemaFailure("no-such.schema.json", {})), /cannot validate against no-such\.schema\.json/);
});

await test("a provided RecordValidator replaces Naive's schemas", () => {
  const v = new Validator(new Map([["venture.schema.json", true]]));
  assert.equal(Effect.runSync(Effect.provide(schemaFailureEffect("venture.schema.json", { id: 7 }), RecordValidatorOver(v))), null);
});

await test("the gate passes an unruled write, holds a fail-closed one and fails closed on a broken config", () => {
  const open = venture(undefined), closed = venture({ gate: { fail_closed: ["products"] } }), broken = venture("{ not json");
  assert.equal(gateWrite(args(open)), null);
  assert.equal(gateWrite(args(closed))?.then, "draft");
  assert.equal(gateWrite(args(closed, "person")), null);
  assert.equal(gateWrite(args(broken))?.then, "draft");
  for (const d of [open, closed, broken]) rmSync(d, { recursive: true });
});

await test("a provided Gate replaces the rules", () => {
  const dir = venture(undefined);
  const refuse = Layer.succeed(Gate, { evaluate: () => Effect.succeed({ then: "refuse", rule: "host", source: "host", matched: ["host"], why: "the host refuses" }) });
  const v = Effect.runSync(Effect.provide(gateWriteEffect(args(dir, "person")), refuse));
  assert.equal(v?.then, "refuse");
  assert.equal(v?.why, "the host refuses");
  rmSync(dir, { recursive: true });
});

for (const [name, ok] of results) console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
if (results.some(([, ok]) => !ok)) process.exit(1);
console.log("all passed");
