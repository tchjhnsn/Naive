// Validates records against their JSON Schemas in TypeScript, with no Python and no dependency. It is the
// TypeScript twin of validate.py and takes the same arguments:
//
//   node packages/naive/src/records/validate.ts
//   node packages/naive/src/records/validate.ts --schema <name>.schema.json --file <path>
//   node packages/naive/src/records/validate.ts --schema <name>.schema.json --def <name> --file <path>
//
// Exit 0: valid. Exit 1: a record failed. Exit 2: the checker itself failed, so a caller must not record
// that as a reject (the same contract as validate.py).
//
// It covers the JSON Schema 2020-12 keywords Naive's schemas use, and fails with exit 2 on a schema keyword
// it does not know, so a new keyword cannot be silently ignored. Formats: only "date" is checked, because
// that is the only format validate.py checks where it runs (jsonschema checks date-time and uri only when
// optional packages are installed, and CI does not install them). validate-test.ts checks that both give
// the same verdicts on every record until validate.py is removed.

import { globSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, RECORDS, recordPath, recordRelative } from "./index.mjs";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Schema = boolean | { [key: string]: Json };
export type Failure = { path: string; message: string };

/** Keywords that only annotate: they never fail. */
const ANNOTATIONS = new Set(["$schema", "$id", "$comment", "$defs", "definitions", "title", "description", "default", "examples", "deprecated", "readOnly", "writeOnly", "x-note", "note", "mappings"]);
/** Keywords this validator applies. "then" and "else" are applied through "if". */
const APPLIED = new Set(["$ref", "type", "enum", "const", "properties", "additionalProperties", "required", "propertyNames", "dependentRequired", "minProperties", "maxProperties",
  "items", "minItems", "maxItems", "uniqueItems", "contains", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength",
  "pattern", "allOf", "anyOf", "oneOf", "not", "if", "then", "else", "format"]);

const isObject = (v: unknown): v is { [key: string]: Json } => typeof v === "object" && v !== null && !Array.isArray(v);

/** JSON equality as JSON Schema defines it: 1 equals 1.0, true does not equal 1, key order does not matter. */
export function equal(a: Json, b: Json): boolean {
  if (typeof a === "boolean" || typeof b === "boolean") return a === b;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => equal(x, b[i]));
  if (isObject(a) || isObject(b)) {
    if (!isObject(a) || !isObject(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => k in b && equal(a[k], b[k]));
  }
  return a === b;
}

function typeOk(v: Json, t: string): boolean {
  switch (t) {
    case "null": return v === null;
    case "boolean": return typeof v === "boolean";
    case "number": return typeof v === "number";
    case "integer": return typeof v === "number" && Number.isInteger(v);
    case "string": return typeof v === "string";
    case "array": return Array.isArray(v);
    case "object": return isObject(v);
    default: throw new Error(`unknown type ${t}`);
  }
}

/** A calendar date in RFC 3339 full-date form, as Python's jsonschema checks "date". */
function isDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || y < 1) return false;
  const days = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return d <= days;
}

const show = (v: Json) => JSON.stringify(v);
const codePoints = (s: string) => [...s].length;

/** Every schema in a folder, registered by its $id (or file name), so one may $ref another by name. */
export function registryOf(folder: string = RECORDS): Map<string, Schema> {
  const reg = new Map<string, Schema>();
  for (const f of readdirSync(folder).filter((n) => n.endsWith(".schema.json")).sort()) {
    const s = JSON.parse(readFileSync(join(folder, f), "utf8")) as Schema;
    reg.set(isObject(s) && typeof s.$id === "string" ? s.$id : f, s);
    if (!reg.has(f)) reg.set(f, s);
  }
  return reg;
}

/** A validator over a registry. */
export class Validator {
  readonly reg: Map<string, Schema>;
  readonly regex = new Map<string, RegExp>();
  constructor(reg: Map<string, Schema>) { this.reg = reg; }

  /** Every failure of `value` against `schema`, which lives in the document `base`. */
  validate(value: Json, schema: Schema, base: string): Failure[] {
    const out: Failure[] = [];
    this.at(value, schema, base, [], out);
    return out;
  }

  private resolve(ref: string, base: string): { schema: Schema; base: string } {
    const [doc, frag = ""] = ref.split("#");
    const name = doc || base;
    const root = this.reg.get(name);
    if (root === undefined) throw new Error(`$ref ${ref}: no schema ${name}`);
    let node: Json = root;
    for (const raw of frag.split("/").filter(Boolean)) {
      const key = decodeURIComponent(raw).replace(/~1/g, "/").replace(/~0/g, "~");
      if (!isObject(node) && !Array.isArray(node)) throw new Error(`$ref ${ref}: ${key} is not there`);
      node = Array.isArray(node) ? node[Number(key)] : node[key];
      if (node === undefined) throw new Error(`$ref ${ref}: ${key} is not there`);
    }
    if (typeof node !== "boolean" && !isObject(node)) throw new Error(`$ref ${ref} is not a schema`);
    return { schema: node, base: name };
  }

  private pattern(p: string): RegExp {
    let r = this.regex.get(p);
    if (!r) { r = new RegExp(p, "u"); this.regex.set(p, r); }
    return r;
  }

  private at(v: Json, s: Schema, base: string, path: (string | number)[], out: Failure[]): void {
    const where = path.length ? path.join("/") : "(root)";
    const fail = (message: string) => out.push({ path: where, message });
    if (s === true) return;
    if (s === false) { fail(`False schema does not allow ${show(v)}`); return; }
    for (const k of Object.keys(s)) if (!APPLIED.has(k) && !ANNOTATIONS.has(k)) throw new Error(`schema keyword ${k} is not supported by validate.ts`);

    if (typeof s.$ref === "string") { const r = this.resolve(s.$ref, base); this.at(v, r.schema, r.base, path, out); }
    if (s.type !== undefined) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      if (!types.some((t) => typeOk(v, String(t)))) fail(`${show(v)} is not of type ${types.map((t) => `'${String(t)}'`).join(", ")}`);
    }
    if (Array.isArray(s.enum) && !s.enum.some((e) => equal(v, e))) fail(`${show(v)} is not one of ${show(s.enum)}`);
    if ("const" in s && !equal(v, s.const)) fail(`${show(s.const)} was expected`);

    if (isObject(v)) {
      const props = isObject(s.properties) ? s.properties : {};
      for (const [k, sub] of Object.entries(props)) if (k in v) this.at(v[k], sub as Schema, base, [...path, k], out);
      if (s.additionalProperties !== undefined) {
        const extra = Object.keys(v).filter((k) => !(k in props));
        if (s.additionalProperties === false) { if (extra.length) fail(`Additional properties are not allowed (${extra.map((k) => `'${k}'`).join(", ")} ${extra.length === 1 ? "was" : "were"} unexpected)`); }
        else for (const k of extra) this.at(v[k], s.additionalProperties as Schema, base, [...path, k], out);
      }
      if (Array.isArray(s.required)) for (const r of s.required) if (!(String(r) in v)) fail(`'${String(r)}' is a required property`);
      if (s.propertyNames !== undefined) for (const k of Object.keys(v)) this.at(k, s.propertyNames as Schema, base, path, out);
      if (typeof s.minProperties === "number" && Object.keys(v).length < s.minProperties) fail(`${show(v)} does not have enough properties`);
      if (typeof s.maxProperties === "number" && Object.keys(v).length > s.maxProperties) fail(`${show(v)} has too many properties`);
      if (isObject(s.dependentRequired)) for (const [k, needs] of Object.entries(s.dependentRequired)) {
        if (k in v && Array.isArray(needs)) for (const n of needs) if (!(String(n) in v)) fail(`'${String(n)}' is a dependency of '${k}'`);
      }
    }

    if (Array.isArray(v)) {
      if (s.items !== undefined) v.forEach((x, i) => this.at(x, s.items as Schema, base, [...path, i], out));
      if (typeof s.minItems === "number" && v.length < s.minItems) fail(`${show(v)} should be non-empty`);
      if (typeof s.maxItems === "number" && v.length > s.maxItems) fail(`${show(v)} is too long`);
      if (s.uniqueItems === true && v.some((x, i) => v.slice(i + 1).some((y) => equal(x, y)))) fail(`${show(v)} has non-unique elements`);
      if (s.contains !== undefined && !v.some((x) => this.validate(x, s.contains as Schema, base).length === 0)) fail(`${show(v)} does not contain items matching the given schema`);
    }

    if (typeof v === "number") {
      if (typeof s.minimum === "number" && v < s.minimum) fail(`${v} is less than the minimum of ${s.minimum}`);
      if (typeof s.maximum === "number" && v > s.maximum) fail(`${v} is greater than the maximum of ${s.maximum}`);
      if (typeof s.exclusiveMinimum === "number" && v <= s.exclusiveMinimum) fail(`${v} is less than or equal to the minimum of ${s.exclusiveMinimum}`);
      if (typeof s.exclusiveMaximum === "number" && v >= s.exclusiveMaximum) fail(`${v} is greater than or equal to the maximum of ${s.exclusiveMaximum}`);
    }

    if (typeof v === "string") {
      if (typeof s.minLength === "number" && codePoints(v) < s.minLength) fail(`${show(v)} is too short`);
      if (typeof s.maxLength === "number" && codePoints(v) > s.maxLength) fail(`${show(v)} is too long`);
      if (typeof s.pattern === "string" && !this.pattern(s.pattern).test(v)) fail(`${show(v)} does not match ${show(s.pattern)}`);
      if (s.format === "date" && !isDate(v)) fail(`${show(v)} is not a 'date'`);
    }

    if (Array.isArray(s.allOf)) for (const sub of s.allOf) this.at(v, sub as Schema, base, path, out);
    if (Array.isArray(s.anyOf) && !s.anyOf.some((sub) => this.validate(v, sub as Schema, base).length === 0)) fail(`${show(v)} is not valid under any of the given schemas`);
    if (Array.isArray(s.oneOf)) {
      const n = s.oneOf.filter((sub) => this.validate(v, sub as Schema, base).length === 0).length;
      if (n === 0) fail(`${show(v)} is not valid under any of the given schemas`);
      else if (n > 1) fail(`${show(v)} is valid under each of more than one given schema`);
    }
    if (s.not !== undefined && this.validate(v, s.not as Schema, base).length === 0) fail(`${show(v)} should not be valid under ${show(s.not)}`);
    if (s.if !== undefined) {
      const branch = this.validate(v, s.if as Schema, base).length === 0 ? s.then : s.else;
      if (branch !== undefined) this.at(v, branch as Schema, base, path, out);
    }
  }
}

type Rule = { schema: string; form: string; globs: string[] };

/** Every record file in the repository with the schema and form that govern it: the more specific glob wins,
 *  as in validate.py. */
export function recordFiles(root: string = ROOT): { file: string; schema: string; form: string }[] {
  const model = JSON.parse(readFileSync(join(RECORDS, "data-model.json"), "utf8")) as { records: { schema?: string | null; form?: string; paths: string[] }[] };
  const rules: Rule[] = model.records
    .filter((r) => r.schema && recordRelative(r.schema) !== null && ["json", "json-list", "json-lines"].includes(r.form ?? "json"))
    .map((r) => ({ schema: String(r.schema), form: r.form ?? "json", globs: r.paths }));
  const best = new Map<string, { weight: number; schema: string; form: string }>();
  for (const r of rules) for (const g of r.globs) {
    const weight = g.replace(/\*\*\//g, "").replace(/\*/g, "").length;
    for (const rel of globSync(g, { cwd: root })) {
      if (rel.split("/").some((part) => part.startsWith("."))) continue;
      const file = join(root, rel), seen = best.get(file);
      if (!seen || weight > seen.weight) best.set(file, { weight, schema: r.schema, form: r.form });
    }
  }
  return [...best.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([file, x]) => ({ file, schema: x.schema, form: x.form }));
}

const nameOf = (stored: string) => relative(RECORDS, recordPath(stored));

function main(argv: string[]): number {
  const opt = (n: string) => { const i = argv.indexOf(n); return i < 0 ? undefined : argv[i + 1]; };
  if ((argv.includes("--schema") || argv.includes("--def")) && !argv.includes("--file")) {
    process.stderr.write("usage: node packages/naive/src/records/validate.ts --schema <name>.schema.json [--def <name>] --file <path>\n");
    return 2;
  }
  const reg = registryOf(), v = new Validator(reg);
  const file = opt("--file");
  if (file !== undefined) {
    let one: Json;
    try { one = JSON.parse(readFileSync(file, "utf8")) as Json; } catch (e) { console.log(`(root): ${(e as Error).message}`); return 1; }
    const name = opt("--schema") ?? "";
    const schema = reg.get(name);
    if (schema === undefined) { process.stderr.write(`no schema ${name}\n`); return 2; }
    let target: Schema = schema;
    const def = opt("--def");
    if (def !== undefined) {
      const defs = isObject(schema) && isObject(schema.$defs) ? schema.$defs : {};
      if (!(def in defs)) { process.stderr.write(`${name} has no $defs entry ${def}\n`); return 2; }
      target = { $ref: `${name}#/$defs/${def}` };
    }
    const errs = v.validate(one, target, name);
    console.log(errs.length ? errs.map((e) => `${e.path}: ${e.message}`).join("\n") : "valid");
    return errs.length ? 1 : 0;
  }
  let failed = 0, checked = 0;
  for (const { file: f, schema, form } of recordFiles()) {
    const name = nameOf(schema), rel = relative(ROOT, f);
    let docs: Json[];
    try {
      const text = readFileSync(f, "utf8");
      docs = form === "json-lines" ? text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Json) : [JSON.parse(text) as Json];
      if (form === "json-list") docs = Array.isArray(docs[0]) ? docs[0] : docs;
    } catch (e) { failed++; console.log(`${rel}: (root): ${(e as Error).message}`); continue; }
    for (const d of docs) {
      checked++;
      for (const e of v.validate(d, reg.get(name) ?? false, name)) { failed++; console.log(`${rel}: ${e.path}: ${e.message}`); }
    }
  }
  console.log(`${checked} records checked against their schemas: ${failed ? `${failed} error(s)` : "all valid"}.`);
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) { process.stderr.write(`${(e as Error).stack ?? String(e)}\n`); process.exitCode = 2; }
}
