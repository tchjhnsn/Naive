// Validates records against their JSON Schemas in JavaScript, with no Python and no dependency. It is the
// twin of validate.py and takes the same arguments:
//
//   node packages/naive/src/records/validate.mjs
//   node packages/naive/src/records/validate.mjs --schema <name>.schema.json --file <path>
//   node packages/naive/src/records/validate.mjs --schema <name>.schema.json --def <name> --file <path>
//
// Exit 0: valid. Exit 1: a record failed. Exit 2: the checker itself failed, so a caller must not record
// that as a reject (the same contract as validate.py).
//
// It is .mjs with JSDoc types, not .ts, because the write path will import it, and an app that installs
// Naive runs it from node_modules, where Node does not strip types. It becomes .ts when Naive ships compiled
// JavaScript.
//
// It covers the JSON Schema 2020-12 keywords Naive's schemas use, and fails with exit 2 on a schema keyword
// it does not know, so a new keyword cannot be silently ignored. Formats: only "date" is checked, because
// that is the only format validate.py checks where it runs (jsonschema checks date-time and uri only when
// optional packages are installed, and CI does not install them). validate-test.ts checks that both give
// the same verdicts on every record until validate.py is removed.

import * as fs from "node:fs";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, RECORDS, recordPath, recordRelative } from "./index.mjs";

/** @typedef {{ [key: string]: Json }} JsonObject */
/** @typedef {Json[]} JsonArray */
/** @typedef {null | boolean | number | string | JsonArray | JsonObject} Json */
/** @typedef {boolean | { [key: string]: Json }} Schema */
/** @typedef {{ path: string, message: string }} Failure */

/** Keywords that only annotate: they never fail. */
const ANNOTATIONS = new Set(["$schema", "$id", "$comment", "$defs", "definitions", "title", "description", "default", "examples", "deprecated", "readOnly", "writeOnly", "x-note", "note", "mappings"]);
/** Keywords this validator applies. "then" and "else" are applied through "if". */
const APPLIED = new Set(["$ref", "type", "enum", "const", "properties", "additionalProperties", "required", "propertyNames", "dependentRequired", "minProperties", "maxProperties",
  "items", "minItems", "maxItems", "uniqueItems", "contains", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength",
  "pattern", "allOf", "anyOf", "oneOf", "not", "if", "then", "else", "format"]);

/** @param {unknown} v @returns {v is { [key: string]: Json }} */
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

/** JSON equality as JSON Schema defines it: 1 equals 1.0, true does not equal 1, key order does not matter.
 *  @param {Json} a @param {Json} b @returns {boolean} */
export function equal(a, b) {
  if (typeof a === "boolean" || typeof b === "boolean") return a === b;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => equal(x, b[i]));
  if (isObject(a) || isObject(b)) {
    if (!isObject(a) || !isObject(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => k in b && equal(a[k], b[k]));
  }
  return a === b;
}

/** @param {Json} v @param {string} t */
function typeOk(v, t) {
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

/** A calendar date in RFC 3339 full-date form, as Python's jsonschema checks "date". @param {string} s */
function isDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || y < 1) return false;
  const days = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return d <= days;
}

/** @param {Json} v */
const show = (v) => JSON.stringify(v);
/** @param {string} s */
const codePoints = (s) => [...s].length;

/** Every schema in a folder, registered by its $id (or file name), so one may $ref another by name.
 *  @param {string} [folder] @returns {Map<string, Schema>} */
export function registryOf(folder = RECORDS) {
  /** @type {Map<string, Schema>} */
  const reg = new Map();
  for (const f of readdirSync(folder).filter((n) => n.endsWith(".schema.json")).sort()) {
    /** @type {Schema} */
    const s = JSON.parse(readFileSync(join(folder, f), "utf8"));
    reg.set(isObject(s) && typeof s.$id === "string" ? s.$id : f, s);
    if (!reg.has(f)) reg.set(f, s);
  }
  return reg;
}

/** A validator over a registry of schemas. */
export class Validator {
  /** @param {Map<string, Schema>} reg */
  constructor(reg) {
    this.reg = reg;
    /** @type {Map<string, RegExp>} */
    this.regex = new Map();
  }

  /** Every failure of `value` against `schema`, which lives in the document `base`.
   *  @param {Json} value @param {Schema} schema @param {string} base @returns {Failure[]} */
  validate(value, schema, base) {
    /** @type {Failure[]} */
    const out = [];
    this.at(value, schema, base, [], out);
    return out;
  }

  /** @param {string} ref @param {string} base @returns {{ schema: Schema, base: string }} */
  resolve(ref, base) {
    const [doc, frag = ""] = ref.split("#");
    const name = doc || base;
    const root = this.reg.get(name);
    if (root === undefined) throw new Error(`$ref ${ref}: no schema ${name}`);
    /** @type {Json} */
    let node = root;
    for (const raw of frag.split("/").filter(Boolean)) {
      const key = decodeURIComponent(raw).replace(/~1/g, "/").replace(/~0/g, "~");
      /** @type {Json | undefined} */
      const next = Array.isArray(node) ? node[Number(key)] : isObject(node) ? node[key] : undefined;
      if (next === undefined) throw new Error(`$ref ${ref}: ${key} is not there`);
      node = next;
    }
    if (typeof node !== "boolean" && !isObject(node)) throw new Error(`$ref ${ref} is not a schema`);
    return { schema: node, base: name };
  }

  /** @param {string} p */
  pattern(p) {
    let r = this.regex.get(p);
    if (!r) { r = new RegExp(p, "u"); this.regex.set(p, r); }
    return r;
  }

  /** @param {Json} v @param {Schema} s @param {string} base @param {(string | number)[]} path @param {Failure[]} out */
  at(v, s, base, path, out) {
    const where = path.length ? path.join("/") : "(root)";
    /** @param {string} message */
    const fail = (message) => { out.push({ path: where, message }); };
    if (s === true) return;
    if (s === false) { fail(`False schema does not allow ${show(v)}`); return; }
    for (const k of Object.keys(s)) if (!APPLIED.has(k) && !ANNOTATIONS.has(k)) throw new Error(`schema keyword ${k} is not supported by validate.mjs`);
    /** @param {Json | undefined} x @returns {Schema} */
    const sub = (x) => (typeof x === "boolean" || isObject(x) ? x : true);

    if (typeof s.$ref === "string") { const r = this.resolve(s.$ref, base); this.at(v, r.schema, r.base, path, out); }
    if (s.type !== undefined) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      if (!types.some((t) => typeOk(v, String(t)))) fail(`${show(v)} is not of type ${types.map((t) => `'${String(t)}'`).join(", ")}`);
    }
    if (Array.isArray(s.enum) && !s.enum.some((e) => equal(v, e))) fail(`${show(v)} is not one of ${show(s.enum)}`);
    if ("const" in s && !equal(v, s.const)) fail(`${show(s.const)} was expected`);

    if (isObject(v)) {
      const props = isObject(s.properties) ? s.properties : {};
      for (const [k, p] of Object.entries(props)) if (k in v) this.at(v[k], sub(p), base, [...path, k], out);
      if (s.additionalProperties !== undefined) {
        const extra = Object.keys(v).filter((k) => !(k in props));
        if (s.additionalProperties === false) { if (extra.length) fail(`Additional properties are not allowed (${extra.map((k) => `'${k}'`).join(", ")} ${extra.length === 1 ? "was" : "were"} unexpected)`); }
        else for (const k of extra) this.at(v[k], sub(s.additionalProperties), base, [...path, k], out);
      }
      if (Array.isArray(s.required)) for (const r of s.required) if (!(String(r) in v)) fail(`'${String(r)}' is a required property`);
      if (s.propertyNames !== undefined) for (const k of Object.keys(v)) this.at(k, sub(s.propertyNames), base, path, out);
      if (typeof s.minProperties === "number" && Object.keys(v).length < s.minProperties) fail(`${show(v)} does not have enough properties`);
      if (typeof s.maxProperties === "number" && Object.keys(v).length > s.maxProperties) fail(`${show(v)} has too many properties`);
      if (isObject(s.dependentRequired)) for (const [k, needs] of Object.entries(s.dependentRequired)) {
        if (k in v && Array.isArray(needs)) for (const n of needs) if (!(String(n) in v)) fail(`'${String(n)}' is a dependency of '${k}'`);
      }
    }

    if (Array.isArray(v)) {
      if (s.items !== undefined) v.forEach((x, i) => this.at(x, sub(s.items), base, [...path, i], out));
      if (typeof s.minItems === "number" && v.length < s.minItems) fail(`${show(v)} should be non-empty`);
      if (typeof s.maxItems === "number" && v.length > s.maxItems) fail(`${show(v)} is too long`);
      if (s.uniqueItems === true && v.some((x, i) => v.slice(i + 1).some((y) => equal(x, y)))) fail(`${show(v)} has non-unique elements`);
      if (s.contains !== undefined && !v.some((x) => this.validate(x, sub(s.contains), base).length === 0)) fail(`${show(v)} does not contain items matching the given schema`);
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

    if (Array.isArray(s.allOf)) for (const x of s.allOf) this.at(v, sub(x), base, path, out);
    if (Array.isArray(s.anyOf) && !s.anyOf.some((x) => this.validate(v, sub(x), base).length === 0)) fail(`${show(v)} is not valid under any of the given schemas`);
    if (Array.isArray(s.oneOf)) {
      const n = s.oneOf.filter((x) => this.validate(v, sub(x), base).length === 0).length;
      if (n === 0) fail(`${show(v)} is not valid under any of the given schemas`);
      else if (n > 1) fail(`${show(v)} is valid under each of more than one given schema`);
    }
    if (s.not !== undefined && this.validate(v, sub(s.not), base).length === 0) fail(`${show(v)} should not be valid under ${show(s.not)}`);
    if (s.if !== undefined) {
      const branch = this.validate(v, sub(s.if), base).length === 0 ? s.then : s.else;
      if (branch !== undefined) this.at(v, sub(branch), base, path, out);
    }
  }
}

/** @type {Validator | null} */
let shared = null;

/**
 * Sets the validator validateFile and validateValue use, and returns the one it replaces (null before the
 * first check). A host with schemas of its own passes a Validator over a registry that adds them; a test
 * passes one that cannot run, to prove a caller refuses rather than passes.
 * @param {Validator | null} next null goes back to Naive's own schemas
 * @returns {Validator | null}
 */
export function useValidator(next) {
  const prev = shared;
  shared = next;
  return prev;
}

/**
 * Validates one file against one schema, in this process: what `python3 validate.py --schema <name> --file <path>`
 * did, with the same result shape as spawnSync so a caller swaps one line. status 0 valid, 1 invalid (stdout holds
 * one "path: message" line per failure), 2 the checker failed (stderr says why). `def` checks one $defs entry.
 * @param {string} name a schema file name, such as "venture.schema.json"
 * @param {string} file the JSON file to check
 * @param {{ def?: string }} [opts]
 * @returns {{ status: number, stdout: string, stderr: string }}
 */
export function validateFile(name, file, { def } = {}) {
  try {
    shared ??= new Validator(registryOf());
    const schema = shared.reg.get(name);
    if (schema === undefined) return { status: 2, stdout: "", stderr: `no schema ${name}\n` };
    /** @type {Schema} */
    let target = schema;
    if (def !== undefined) {
      const defs = isObject(schema) && isObject(schema.$defs) ? schema.$defs : {};
      if (!(def in defs)) return { status: 2, stdout: "", stderr: `${name} has no $defs entry ${def}\n` };
      target = { $ref: `${name}#/$defs/${def}` };
    }
    /** @type {Json} */
    let one;
    try { one = JSON.parse(readFileSync(file, "utf8")); } catch (e) { return { status: 1, stdout: `(root): ${e instanceof Error ? e.message : String(e)}\n`, stderr: "" }; }
    const errs = shared.validate(one, target, name);
    return errs.length ? { status: 1, stdout: `${errs.map((e) => `${e.path}: ${e.message}`).join("\n")}\n`, stderr: "" } : { status: 0, stdout: "valid\n", stderr: "" };
  } catch (e) {
    return { status: 2, stdout: "", stderr: `${e instanceof Error ? e.message : String(e)}\n` };
  }
}

/**
 * Validates a value already in memory against one schema. Same result shape as validateFile.
 * @param {string} name @param {unknown} value
 * @returns {{ status: number, stdout: string, stderr: string }}
 */
export function validateValue(name, value) {
  try {
    shared ??= new Validator(registryOf());
    const schema = shared.reg.get(name);
    if (schema === undefined) return { status: 2, stdout: "", stderr: `no schema ${name}\n` };
    /** @type {Json} */
    const one = JSON.parse(JSON.stringify(value));
    const errs = shared.validate(one, schema, name);
    return errs.length ? { status: 1, stdout: `${errs.map((e) => `${e.path}: ${e.message}`).join("\n")}\n`, stderr: "" } : { status: 0, stdout: "valid\n", stderr: "" };
  } catch (e) {
    return { status: 2, stdout: "", stderr: `${e instanceof Error ? e.message : String(e)}\n` };
  }
}

/** Every record file in the repository with the schema and form that govern it: the more specific glob wins,
 *  as in validate.py.
 *  @param {string} [root] @returns {{ file: string, schema: string, form: string }[]} */
export function recordFiles(root = ROOT) {
  /** @type {{ records: { schema?: string | null, form?: string, paths: string[] }[] }} */
  const model = JSON.parse(readFileSync(join(RECORDS, "data-model.json"), "utf8"));
  const rules = model.records
    .filter((r) => r.schema && recordRelative(r.schema) !== null && ["json", "json-list", "json-lines"].includes(r.form ?? "json"))
    .map((r) => ({ schema: String(r.schema), form: r.form ?? "json", globs: r.paths }));
  // fs.globSync is Node 22; the published package runs on Node 20, so it is looked up only here, in the
  // whole-repository run, and never when a caller validates one record.
  const globSync = fs.globSync;
  if (typeof globSync !== "function") throw new Error("validating every record needs Node 22 or later (fs.globSync)");
  /** @type {Map<string, { weight: number, schema: string, form: string }>} */
  const best = new Map();
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

/** @param {string} stored */
const nameOf = (stored) => relative(RECORDS, recordPath(stored));

/** @param {string[]} argv @returns {number} */
function main(argv) {
  /** @param {string} n */
  const opt = (n) => { const i = argv.indexOf(n); return i < 0 ? undefined : argv[i + 1]; };
  if ((argv.includes("--schema") || argv.includes("--def")) && !argv.includes("--file")) {
    process.stderr.write("usage: node packages/naive/src/records/validate.mjs --schema <name>.schema.json [--def <name>] --file <path>\n");
    return 2;
  }
  const reg = registryOf(), v = new Validator(reg);
  const file = opt("--file");
  if (file !== undefined) {
    /** @type {Json} */
    let one;
    try { one = JSON.parse(readFileSync(file, "utf8")); } catch (e) { console.log(`(root): ${e instanceof Error ? e.message : String(e)}`); return 1; }
    const name = opt("--schema") ?? "";
    const schema = reg.get(name);
    if (schema === undefined) { process.stderr.write(`no schema ${name}\n`); return 2; }
    /** @type {Schema} */
    let target = schema;
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
    /** @type {Json[]} */
    let docs;
    try {
      const text = readFileSync(f, "utf8");
      docs = form === "json-lines" ? text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : [JSON.parse(text)];
      if (form === "json-list" && Array.isArray(docs[0])) docs = docs[0];
    } catch (e) { failed++; console.log(`${rel}: (root): ${e instanceof Error ? e.message : String(e)}`); continue; }
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
  catch (e) { process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`); process.exitCode = 2; }
}
