// Tests RecordValidator and record views (phase 6 of docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md): every
// JSON record in the example ventures decodes through its view and through decodeRecord, a broken record fails with
// the validator's lines, an unknown schema cannot run, and RecordValidatorOver checks against another registry.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { Effect, Exit, Schema } from "effect";
import { decodeRecord, RecordValidator, RecordValidatorOver, recordView } from "./record-validator.ts";
import { recordFiles, Validator } from "./validate.ts";
import { RECORDS, recordPath, ROOT } from "./index.ts";
import type { Venture } from "./types/records.d.ts";

const results: [string, boolean][] = [];
const test = async (name: string, fn: () => void | Promise<void>) => {
  try { await fn(); results.push([name, true]); } catch (e) { results.push([name, false]); console.error(name, e); }
};
const failure = <A, E>(exit: Exit.Exit<A, E>): E => {
  assert.ok(Exit.isFailure(exit), "expected a failure");
  const e = exit.cause.reasons.find((r) => r._tag === "Fail");
  assert.ok(e && e._tag === "Fail", "expected a typed failure");
  return e.error;
};

const examples = recordFiles().filter((r) => r.form === "json" && relative(ROOT, r.file).startsWith("packages/naive/src/records/examples/"));
const venture = JSON.parse(readFileSync(examples.find((r) => r.file.endsWith("/venture.json"))?.file ?? "", "utf8"));

await test("every JSON record in the example ventures decodes through its view and decodeRecord", () => {
  assert.ok(examples.length > 50, `only ${examples.length} example records`);
  const bad: string[] = [];
  for (const { file, schema } of examples) {
    const name = relative(RECORDS, recordPath(schema)), value: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (!Exit.isSuccess(Schema.decodeUnknownExit(recordView(name))(value))) bad.push(`view ${relative(ROOT, file)}`);
    if (!Exit.isSuccess(Effect.runSyncExit(decodeRecord(name, value)))) bad.push(`decodeRecord ${relative(ROOT, file)}`);
  }
  assert.deepEqual(bad, []);
});

await test("decodeRecord types the value and a broken record fails with SchemaInvalid and the validator's lines", () => {
  const ok: Venture = Effect.runSync(decodeRecord<Venture>("venture.schema.json", venture));
  assert.equal(ok.id, venture.id);
  const e = failure(Effect.runSyncExit(decodeRecord("venture.schema.json", { ...venture, id: 7 })));
  assert.equal(e._tag, "SchemaInvalid");
  assert.ok(e._tag === "SchemaInvalid" && e.errors.some((l) => l.startsWith("id: ")), JSON.stringify(e));
});

await test("a view's issue carries the validator's lines", () => {
  const exit = Schema.decodeUnknownExit(recordView<Venture>("venture.schema.json"))({ ...venture, id: 7 });
  assert.ok(Exit.isFailure(exit));
  assert.match(String(exit.cause), /venture\.schema\.json: id: 7 is not of type 'string'/);
});

await test("an unknown schema cannot run, which is not a reject", () => {
  const e = failure(Effect.runSyncExit(decodeRecord("no-such.schema.json", {})));
  assert.equal(e._tag, "CannotRun");
});

await test("RecordValidatorOver checks against another registry", () => {
  const v = new Validator(new Map([["thing.schema.json", { type: "object", required: ["name"] }]]));
  const run = <A, E>(eff: Effect.Effect<A, E>) => Effect.runSyncExit(Effect.provide(eff, RecordValidatorOver(v)));
  assert.ok(Exit.isSuccess(run(decodeRecord("thing.schema.json", { name: "x" }))));
  assert.equal(failure(run(decodeRecord("thing.schema.json", {})))._tag, "SchemaInvalid");
  assert.equal(failure(run(decodeRecord("venture.schema.json", venture)))._tag, "CannotRun");
  assert.ok(Exit.isSuccess(Effect.runSyncExit(Effect.gen(function* () { yield* (yield* RecordValidator).validate("venture.schema.json", venture); }))));
});

for (const [name, ok] of results) console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
if (results.some(([, ok]) => !ok)) process.exit(1);
console.log("all passed");
