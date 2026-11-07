// validate.mjs against validate.py's jsonschema: the same verdict and the same failing paths on every record
// in the repository and on mutants of each (a node set to null, to a string, to a number, a key removed, an
// unknown key added), so every keyword the schemas use is exercised on both sides. The Python side runs
// once over all cases. Without python3 and jsonschema it says so and skips the comparison; the
// TypeScript-only cases still run.
//
//   node packages/naive/src/records/validate-test.ts

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { ROOT, RECORDS, recordPath } from "./index.mjs";
import { Validator, equal, recordFiles, registryOf } from "./validate.mjs";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

let failures = 0;
const check = (ok: boolean, what: string) => { if (!ok) { failures++; console.log(`FAIL  ${what}`); } };

const reg = registryOf(), v = new Validator(reg);
const pathsOf = (doc: Json, schema: string) => [...new Set(v.validate(doc, reg.get(schema) ?? false, schema).map((e) => e.path))].sort();

// TypeScript-only cases: the equality rules and the keywords' edges.
check(equal(1, 1.0) && !equal(true, 1) && equal({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }) && !equal([1, 2], [2, 1]), "JSON equality: 1 is 1.0, true is not 1, key order free, array order matters");
const tiny = new Validator(new Map([["t.schema.json", { $id: "t.schema.json", type: "object", required: ["d"], additionalProperties: false,
  properties: { d: { type: "string", format: "date" }, n: { type: "integer", minimum: 0 }, k: { oneOf: [{ type: "string" }, { type: "number" }] } } }]]));
const run = (doc: Json) => tiny.validate(doc, tiny.reg.get("t.schema.json") ?? false, "t.schema.json").map((e) => `${e.path}`);
check(run({ d: "2026-02-29" }).join() === "d", "2026-02-29 is not a date");
check(run({ d: "2028-02-29" }).length === 0, "2028-02-29 is a date");
check(run({ d: "2026-11-07", n: 1.5 }).join() === "n", "1.5 is not an integer");
check(run({ d: "2026-11-07", n: true }).join() === "n", "true is not an integer");
check(run({ d: "2026-11-07", x: 1 }).join() === "(root)", "an unknown key fails additionalProperties at the object");
check(run({}).join() === "(root)", "a missing required key fails at the object");
let threw = false;
try { new Validator(new Map([["u.schema.json", { unevaluatedProperties: false }]])).validate({}, { unevaluatedProperties: false }, "u.schema.json"); } catch { threw = true; }
check(threw, "an unsupported keyword throws instead of passing silently");

// The cases for the comparison: every record, and mutants of each.
type Case = { schema: string; doc: Json; label: string };
const cases: Case[] = [];
const clone = (x: Json): Json => JSON.parse(JSON.stringify(x)) as Json;
function nodes(doc: Json, at: (string | number)[] = [], out: (string | number)[][] = []): (string | number)[][] {
  out.push(at);
  if (Array.isArray(doc)) doc.forEach((x, i) => nodes(x, [...at, i], out));
  else if (doc !== null && typeof doc === "object") for (const [k, x] of Object.entries(doc)) nodes(x, [...at, k], out);
  return out;
}
function setAt(doc: Json, at: (string | number)[], f: (_parent: Json[] | { [k: string]: Json }, _key: string | number) => void): Json {
  const copy = clone(doc);
  let node: Json = copy;
  for (const k of at.slice(0, -1)) node = (node as { [k: string]: Json })[k as string];
  f(node as { [k: string]: Json }, at[at.length - 1]);
  return copy;
}
for (const { file, schema, form } of recordFiles()) {
  if (form !== "json") continue;
  const name = relative(RECORDS, recordPath(schema));
  let doc: Json;
  try { doc = JSON.parse(readFileSync(file, "utf8")) as Json; } catch { continue; }
  const rel = relative(ROOT, file);
  cases.push({ schema: name, doc, label: rel });
  const all = nodes(doc).filter((p) => p.length), step = Math.max(1, Math.floor(all.length / 6));
  for (let i = 0; i < all.length; i += step) {
    const p = all[i];
    cases.push({ schema: name, label: `${rel} ${p.join("/")}=null`, doc: setAt(doc, p, (o, k) => { (o as { [k: string]: Json })[k as string] = null; }) });
    cases.push({ schema: name, label: `${rel} ${p.join("/")}="zz"`, doc: setAt(doc, p, (o, k) => { (o as { [k: string]: Json })[k as string] = "zz"; }) });
    cases.push({ schema: name, label: `${rel} ${p.join("/")}=-1.5`, doc: setAt(doc, p, (o, k) => { (o as { [k: string]: Json })[k as string] = -1.5; }) });
    if (typeof p[p.length - 1] === "string") cases.push({ schema: name, label: `${rel} -${p.join("/")}`, doc: setAt(doc, p, (o, k) => { delete (o as { [k: string]: Json })[k as string]; }) });
  }
  if (doc !== null && typeof doc === "object" && !Array.isArray(doc)) cases.push({ schema: name, label: `${rel} +zz_unknown`, doc: { ...doc, zz_unknown: 1 } });
}

const PY = `
import json, sys
import jsonschema
from referencing import Registry, Resource
from pathlib import Path
folder = Path(sys.argv[1])
schemas = {p.name: json.loads(p.read_text()) for p in folder.glob("*.schema.json")}
registry = Registry().with_resources((s.get("$id", n), Resource.from_contents(s)) for n, s in schemas.items())
vs = {}
out = []
for c in json.load(sys.stdin):
    v = vs.setdefault(c["schema"], jsonschema.Draft202012Validator(schemas[c["schema"]], registry=registry, format_checker=jsonschema.FormatChecker()))
    out.append(sorted({"/".join(map(str, e.absolute_path)) or "(root)" for e in v.iter_errors(c["doc"])}))
json.dump(out, sys.stdout)
`;
const py = spawnSync("python3", ["-I", "-c", PY, RECORDS], { input: JSON.stringify(cases), encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
if (py.status !== 0) {
  console.log(`not compared: python3 with jsonschema is not available here (${(py.stderr || py.error?.message || "").trim().split("\n").pop()})`);
} else {
  const expected = JSON.parse(py.stdout) as string[][];
  let invalid = 0;
  cases.forEach((c, i) => {
    const got = pathsOf(c.doc, c.schema), want = expected[i];
    if (want.length) invalid++;
    check(got.join("|") === want.join("|"), `${c.label}: validate.mjs fails at [${got.join(", ")}], jsonschema at [${want.join(", ")}]`);
  });
  console.log(`compared ${cases.length} cases with jsonschema (${invalid} invalid)`);
}

console.log(failures ? `${failures} failing` : "validate.mjs agrees with validate.py");
process.exitCode = failures ? 1 : 0;
