// Tests for schema/record-types.ts. Hand-written schemas go through a copy of the generator, and tsc
// must accept what the schema accepts and reject what the mapping promises to reject. Every real
// record then goes through tsc against its generated type. Copies live in a temp folder.
//
//   node schema/record-types-test.ts

import { spawnSync } from "node:child_process";
import { copyFileSync, globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Case = { type: string; accepts: unknown[]; rejects: unknown[] };
type RecordType = { schema: string | null; form?: string; paths: string[] };

const root = new URL("..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "ee-record-types-test-"));
let failed = 0;
const expect = (name: string, ok: boolean) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) failed++; };

const object = (properties: object, extra: object = {}) => ({ type: "object", additionalProperties: false, properties, ...extra });

// The generator reads the schemas beside it, so a folder holding a copy of it is a separate schema set.
let folders = 0;
const sandbox = (schemas: Record<string, object>) => {
  const dir = join(tmp, `s${++folders}`);
  mkdirSync(dir);
  copyFileSync(join(root, "schema/record-types.ts"), join(dir, "record-types.ts"));
  for (const [name, schema] of Object.entries(schemas)) writeFileSync(join(dir, `${name}.schema.json`), JSON.stringify(schema));
  return dir;
};
const generate = (dir: string, ...args: string[]) => spawnSync("node", [join(dir, "record-types.ts"), ...args], { encoding: "utf8" });

// Writes one annotated constant per line and returns the line numbers tsc reports errors on.
const typecheck = (dir: string, types: string, values: { type: string; value: unknown }[]) => {
  const names = [...new Set(values.map((v) => v.type))];
  const lines = [`import type { ${names.join(", ")} } from ${JSON.stringify(types)};`,
    ...values.map((v, i) => `export const v${i}: ${v.type} = ${JSON.stringify(v.value)};`)];
  writeFileSync(join(dir, "check.ts"), `${lines.join("\n")}\n`);
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ files: ["check.ts"], compilerOptions: {
    strict: true, noEmit: true, target: "es2023", lib: ["es2023"], module: "nodenext", moduleResolution: "nodenext", types: [] } }));
  const r = spawnSync(join(root, "node_modules/.bin/tsc"), ["-p", join(dir, "tsconfig.json"), "--pretty", "false"], { cwd: dir, encoding: "utf8", maxBuffer: 1 << 28 });
  const errors = r.stdout.split("\n").filter((l) => / error TS\d+:/.test(l));
  return { errors, lines: new Set(errors.flatMap((l) => /check\.ts\((\d+),/.exec(l)?.[1] ?? [])) };
};

const mapping = {
  mapped: object({
    status: { enum: ["open", "closed"] },
    version: { const: 2 },
    id: { type: "string" },
    count: { type: "integer" },
    ratio: { type: ["number", "null"] },
    tags: { type: "array", items: { type: "string" } },
    scores: { type: "object", additionalProperties: { type: "number" } },
    rules: { type: "object", propertyNames: { enum: ["a", "b"] }, additionalProperties: { type: "boolean" } },
    open: { type: "object", properties: { name: { type: "string" } } },
    owner: { $ref: "#/$defs/person" },
    other: { $ref: "other.schema.json" },
    pinned: { $ref: "other.schema.json#/$defs/pin" },
  }, { required: ["status", "id"], $defs: { person: object({ name: { type: "string" } }, { required: ["name"] }) } }),
  other: { ...object({ on: { type: "boolean" } }), $defs: { pin: { enum: [1, 2] } } },
  "required-only": object({ route: { type: "string" }, propose: { type: "number" }, action: { type: "string" } }, {
    oneOf: [{ required: ["route"] }, { required: ["propose"] }],
  }),
  union: object({ kind: { enum: ["a", "b"] }, x: { type: "string" }, y: { type: "number" } }, {
    required: ["kind"],
    oneOf: [
      { properties: { kind: { const: "a" }, x: { type: "string" } }, required: ["x"] },
      { properties: { kind: { const: "b" }, y: { type: "number" } }, required: ["y"] },
    ],
  }),
  "open-union": {
    type: "object",
    properties: { kind: { enum: ["a", "b"] } },
    oneOf: [{ properties: { kind: { const: "a" } } }, { properties: { kind: { const: "b" } } }],
  },
  "standalone-union": { oneOf: [{ type: "object", properties: { kind: { const: "a" } }, required: ["kind"] }, { type: "string" }] },
  "with-all-of": object({ kind: { const: "a" }, x: { type: "string" } }, { allOf: [{ properties: { x: { type: "string" } }, required: ["x"] }] }),
  "any-value": { anyOf: [{ type: "string" }, {}] },
  "described-branch": { anyOf: [{ type: "string" }, { description: "anything else" }] },
  "no-required": object({ a: { type: "string" } }, { anyOf: [{ required: [] }, { required: ["a"] }] }),
  "empty-branch": object({ a: { type: "string" } }, { oneOf: [{ properties: {} }] }),
  "left-out": object({
    code: { type: "string", pattern: "^[a-z]+$", minLength: 2 },
    n: { type: "number", minimum: 0, maximum: 1 },
    list: { type: "array", items: { type: "number" }, minItems: 1, uniqueItems: true },
  }, { minProperties: 1 }),
};

const cases: Case[] = [
  { type: "Mapped", accepts: [
    { status: "open", id: "x" },
    { status: "closed", id: "x", version: 2, count: 1, ratio: null, tags: ["a"], scores: { any: 1 }, rules: { a: true }, open: { name: "n", more: 1 },
      owner: { name: "n" }, other: { on: true }, pinned: 2 },
  ], rejects: [
    { id: "x" },
    { status: "open" },
    { status: "other", id: "x" },
    { status: "open", id: "x", version: 3 },
    { status: "open", id: 1 },
    { status: "open", id: "x", count: "1" },
    { status: "open", id: "x", ratio: "1" },
    { status: "open", id: "x", tags: [1] },
    { status: "open", id: "x", scores: { any: "1" } },
    { status: "open", id: "x", rules: { c: true } },
    { status: "open", id: "x", open: { name: 1 } },
    { status: "open", id: "x", owner: {} },
    { status: "open", id: "x", other: { on: 1 } },
    { status: "open", id: "x", pinned: 3 },
    { status: "open", id: "x", bogus: 1 },
  ] },
  { type: "RequiredOnly", accepts: [{ route: "r" }, { propose: 1 }, { route: "r", action: "a" }], rejects: [{}, { action: "a" }, { route: 1 }, { route: "r", bogus: 1 }] },
  { type: "Union", accepts: [{ kind: "a", x: "1" }, { kind: "b", y: 1 }], rejects: [{ kind: "a" }, { kind: "a", x: 1 }, { kind: "b", x: "1" }, { kind: "a", x: "1", bogus: 1 }, { kind: "b", y: 1, bogus: 1 }] },
  { type: "OpenUnion", accepts: [{ kind: "a", more: 1 }, { kind: "b" }], rejects: [{ kind: "c" }] },
  { type: "StandaloneUnion", accepts: [{ kind: "a", more: 1 }, "s"], rejects: [{ kind: "b" }, 1] },
  { type: "WithAllOf", accepts: [{ x: "1" }, { kind: "a", x: "1" }], rejects: [{ kind: "a" }, { x: "1", bogus: 1 }] },
  { type: "AnyValue", accepts: ["s", 1, null, {}], rejects: [] },
  { type: "DescribedBranch", accepts: ["s", 1, null, {}], rejects: [] },
  { type: "NoRequired", accepts: [{}, { a: "1" }], rejects: [{ b: 1 }] },
  { type: "EmptyBranch", accepts: [{}, { a: "1" }], rejects: [{ a: 1 }] },
  { type: "LeftOut", accepts: [{}, { code: "A", n: 2, list: [1, 1] }], rejects: [{ code: 1 }, { list: ["1"] }] },
];

const dir = sandbox(mapping);
expect("the generator writes the hand-written schemas", generate(dir).status === 0);
const values = cases.flatMap((c) => [...c.accepts, ...c.rejects].map((value) => ({ type: c.type, value })));
const { errors, lines } = typecheck(dir, "./types/records.js", values);
let line = 1;
for (const c of cases) {
  for (const value of c.accepts) expect(`${c.type} accepts ${JSON.stringify(value)}`, !lines.has(String(++line)));
  for (const value of c.rejects) expect(`${c.type} rejects ${JSON.stringify(value)}`, lines.has(String(++line)));
}
const elsewhere = errors.filter((l) => !l.includes("check.ts("));
expect("the generated declarations themselves have no type errors", elsewhere.length === 0);
for (const l of elsewhere.slice(0, 5)) console.log(`     ${l}`);

for (const [name, schema, keyword] of [
  ["beside additionalProperties: false", object({}, { patternProperties: { "^x": { type: "string" } } }), "patternProperties"],
  ["inside a property", object({ a: { type: "array", prefixItems: [{ type: "string" }] } }), "prefixItems"],
  ["inside a oneOf branch", { oneOf: [{ type: "object", unevaluatedProperties: false }] }, "unevaluatedProperties"],
  ["inside a $defs entry", { type: "string", $defs: { a: { contains: {} } } }, "contains"],
  ["in an additionalProperties schema beside properties", { type: "object", properties: { a: {} }, additionalProperties: { dependentSchemas: {} } }, "dependentSchemas"],
  ["beside a $ref", object({ a: { $ref: "#/$defs/b", patternProperties: {} } }, { $defs: { b: { type: "string" } } }), "patternProperties"],
] as const) {
  const r = generate(sandbox({ bad: schema }));
  expect(`an unsupported keyword ${name} throws`, r.status !== 0 && r.stderr.includes(keyword));
}

const clash = sandbox({ venture: { type: "object", $defs: { layer: { type: "string" } } }, "venture-layer": { type: "string" } });
const clashed = generate(clash, "--check");
expect("two schemas producing one type name throw", clashed.status !== 0 && clashed.stderr.includes("VentureLayer"));
expect("an unknown type still throws", generate(sandbox({ bad: { type: "strnig" } })).status !== 0);

const stale = sandbox({ thing: object({ a: { enum: ["x"] } }) });
const output = join(stale, "types/records.d.ts");
expect("--check fails before the file exists", generate(stale, "--check").status === 1);
generate(stale);
expect("--check passes on a fresh file", generate(stale, "--check").status === 0);
writeFileSync(join(stale, "thing.schema.json"), JSON.stringify(object({ a: { enum: ["x", "y"] } })));
expect("--check fails when a schema changes", generate(stale, "--check").status === 1);
generate(stale);
writeFileSync(join(stale, "added.schema.json"), JSON.stringify({ type: "string" }));
expect("--check fails when a schema is added", generate(stale, "--check").status === 1);
generate(stale);
unlinkSync(join(stale, "added.schema.json"));
expect("--check fails when a schema is removed", generate(stale, "--check").status === 1);
generate(stale);
writeFileSync(output, `${readFileSync(output, "utf8")}// edited\n`);
expect("--check fails on a hand edit", generate(stale, "--check").status === 1);

// Which files a schema governs comes from schema/data-model.json; a file two record types match
// belongs to the more specific glob, as in schema/validate.py.
const model = JSON.parse(readFileSync(join(root, "schema/data-model.json"), "utf8")) as { records: RecordType[] };
const pascal = (s: string) => s.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
const best = new Map<string, { weight: number; type: string; form: string }>();
for (const { schema, form = "json", paths } of model.records) {
  if (!schema?.startsWith("schema/") || !["json", "json-list", "json-lines"].includes(form)) continue;
  const type = pascal(schema.slice("schema/".length).replace(/\.schema\.json$/, ""));
  for (const glob of paths) {
    const weight = glob.replaceAll("**/", "").replaceAll("*", "").length;
    for (const file of globSync(glob, { cwd: root })) {
      if (file.split("/").some((part) => part.startsWith(".") || part === "node_modules")) continue;
      if ((best.get(file)?.weight ?? -1) < weight) best.set(file, { weight, type, form });
    }
  }
}
const records = [...best].flatMap(([file, { type, form }]) => {
  const text = readFileSync(join(root, file), "utf8");
  const docs: unknown[] = form === "json-lines" ? text.split("\n").filter((l) => l.trim()).map((l): unknown => JSON.parse(l))
    : form === "json-list" ? JSON.parse(text) as unknown[] : [JSON.parse(text)];
  return docs.map((value) => ({ type, value, file }));
});
const real = sandbox({});
const checked = typecheck(real, join(root, "schema/types/records.js"), records);
for (const l of checked.errors.slice(0, 5)) console.log(`     ${l}`);
expect(`${records.length} real records fit their generated types`, records.length > 100 && checked.errors.length === 0);

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} test(s) failed`); process.exit(1); }
console.log("all record type tests pass");
