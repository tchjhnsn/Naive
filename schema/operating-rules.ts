// Naive's operating rules, as a module a venture can override.
//
// The default module is operations/operating-rules.json. A venture supplies its own
// operating-rules.json, merged over the default. On a structured venture that file is
// meta/operating-rules.json. Scalars and arrays in the overlay replace the default.
// Objects merge key by key. The merged module is checked against
// schema/operating-rules.schema.json, and yes must be above no.
//
// The membership gate reads rejection.retry (schema/ontology-gate.ts). Question
// routing, pattern learning, standing-rule decay and the other settings are
// declared for later pull requests. This module validates them and does not enforce them.
//
//   node schema/operating-rules-test.ts

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ventureFile } from "./venture-paths.mjs";
import type { OperatingRules } from "./types/records.d.ts";

export const DEFAULT_MODULE = "operations/operating-rules.json";
export const VENTURE_MODULE = "operating-rules.json";

export class OperatingRulesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperatingRulesError";
  }
}

type Schema = {
  $ref?: string;
  type?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean | Schema;
  items?: Schema;
  enum?: unknown[];
  const?: unknown;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  minLength?: number;
  minItems?: number;
  uniqueItems?: boolean;
  pattern?: string;
  $defs?: Record<string, Schema>;
  dependentRequired?: Record<string, string[]>;
  allOf?: Schema[];
  anyOf?: Schema[];
  oneOf?: Schema[];
  if?: Schema;
  then?: Schema;
  else?: Schema;
  not?: Schema;
  description?: string;
};

const SCHEMA_KEYS = new Set([
  "$schema", "$id", "title", "description", "type", "properties", "required",
  "additionalProperties", "items", "enum", "const", "minimum", "maximum",
  "exclusiveMinimum", "minLength", "minItems", "uniqueItems", "pattern",
  "$defs", "$ref", "default", "dependentRequired", "allOf", "anyOf", "oneOf",
  "if", "then", "else", "not",
]);

const schemaPath = fileURLToPath(new URL("./operating-rules.schema.json", import.meta.url));
const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as Schema;

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

function assertSchema(s: Schema, at: string): void {
  for (const key of Object.keys(s)) if (!SCHEMA_KEYS.has(key)) throw new Error(`operating-rules schema: unsupported keyword ${key} at ${at}`);
  for (const [k, child] of Object.entries(s.properties ?? {})) assertSchema(child, `${at}.${k}`);
  for (const [k, child] of Object.entries(s.$defs ?? {})) assertSchema(child, `${at}.$defs.${k}`);
  if (s.items) assertSchema(s.items, `${at}.items`);
  if (isRecord(s.additionalProperties)) assertSchema(s.additionalProperties, `${at}.additionalProperties`);
  for (const key of ["allOf", "anyOf", "oneOf"] as const) for (const [i, child] of (s[key] ?? []).entries()) assertSchema(child, `${at}.${key}[${i}]`);
  if (s.if) assertSchema(s.if, `${at}.if`);
  if (s.then) assertSchema(s.then, `${at}.then`);
  if (s.else) assertSchema(s.else, `${at}.else`);
  if (s.not) assertSchema(s.not, `${at}.not`);
}
assertSchema(schema, "operating-rules");

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Schema problems for one module document. Empty when it is valid. Also requires jev.yes above jev.no. */
export function moduleProblems(value: unknown): string[] {
  const errors: string[] = [];
  check(schema, value, "(root)", errors);
  if (isRecord(value) && isRecord(value.jev) && typeof value.jev.yes === "number" && typeof value.jev.no === "number" && value.jev.yes <= value.jev.no) {
    errors.push("jev.yes must be above jev.no");
  }
  const rules = isRecord(value) && isRecord(value.questions) && isRecord(value.questions.routing) ? value.questions.routing.rules : undefined;
  if (Array.isArray(rules)) {
    const seen = new Set<string>();
    for (const rule of rules) {
      if (!isRecord(rule) || typeof rule.id !== "string") continue;
      if (seen.has(rule.id)) errors.push(`questions.routing.rules: duplicate id ${rule.id}`);
      seen.add(rule.id);
    }
  }
  return errors;
}

function childPath(path: string, key: string): string {
  return path === "(root)" ? key : `${path}.${key}`;
}

function check(s: Schema, value: unknown, path: string, errors: string[]): void {
  if (s.$ref) {
    const name = s.$ref.startsWith("#/$defs/") ? s.$ref.slice("#/$defs/".length) : "";
    const def = name ? schema.$defs?.[name] : undefined;
    if (!def) { errors.push(`${path}: unknown $ref ${s.$ref}`); return; }
    check(def, value, path, errors);
    return;
  }
  if ("const" in s) {
    if (!same(value, s.const)) errors.push(`${path}: must be ${JSON.stringify(s.const)}`);
    return;
  }
  if (s.enum) {
    if (!s.enum.some((item) => same(item, value))) errors.push(`${path}: must be one of ${s.enum.map((item) => JSON.stringify(item)).join(", ")}`);
    return;
  }
  let ok = true;
  if (s.type === "object" || (!s.type && (s.properties || s.required))) {
    if (s.type === "object" && !isRecord(value)) { errors.push(`${path}: must be an object`); ok = false; }
    else if (isRecord(value)) {
      const props = s.properties ?? {};
      for (const key of s.required ?? []) if (!(key in value)) errors.push(`${path}: missing ${key}`);
      const entries = s.type === "object" ? Object.entries(value) : Object.entries(value).filter(([key]) => key in props);
      for (const [key, child] of entries) {
        const prop = props[key];
        if (!prop) {
          if (s.additionalProperties === false) errors.push(`${path}: unknown field ${key}`);
          else if (isRecord(s.additionalProperties)) check(s.additionalProperties, child, childPath(path, key), errors);
          continue;
        }
        check(prop, child, childPath(path, key), errors);
      }
    }
  } else if (s.type === "array") {
    if (!Array.isArray(value)) { errors.push(`${path}: must be an array`); ok = false; }
    else {
      if (s.minItems !== undefined && value.length < s.minItems) errors.push(`${path}: needs at least ${s.minItems}`);
      if (s.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${path}: duplicate items`);
      if (s.items) value.forEach((item, i) => check(s.items as Schema, item, `${path}[${i}]`, errors));
    }
  } else if (s.type === "string") {
    if (typeof value !== "string") { errors.push(`${path}: must be a string`); ok = false; }
    else {
      if (s.minLength !== undefined && value.length < s.minLength) errors.push(`${path}: is empty`);
      if (s.pattern && !new RegExp(s.pattern).test(value)) errors.push(`${path}: must match ${s.pattern}`);
    }
  } else if (s.type === "integer" || s.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value) || (s.type === "integer" && !Number.isInteger(value))) {
      errors.push(`${path}: must be ${s.type === "integer" ? "an integer" : "a number"}`);
      ok = false;
    } else {
      if (s.minimum !== undefined && value < s.minimum) errors.push(`${path}: must be >= ${s.minimum}`);
      if (s.maximum !== undefined && value > s.maximum) errors.push(`${path}: must be <= ${s.maximum}`);
      if (s.exclusiveMinimum !== undefined && value <= s.exclusiveMinimum) errors.push(`${path}: must be > ${s.exclusiveMinimum}`);
    }
  } else if (s.type === "boolean") {
    if (typeof value !== "boolean") { errors.push(`${path}: must be a boolean`); ok = false; }
  }
  if (ok) combinators(s, value, path, errors);
}

function matches(s: Schema, value: unknown): boolean {
  const probe: string[] = [];
  check(s, value, "(root)", probe);
  return probe.length === 0;
}

function combinators(s: Schema, value: unknown, path: string, errors: string[]): void {
  if (s.dependentRequired && isRecord(value)) {
    for (const [key, need] of Object.entries(s.dependentRequired)) {
      if (!(key in value)) continue;
      for (const name of need) if (!(name in value)) errors.push(`${path}: ${key} needs ${name}`);
    }
  }
  if (s.allOf) for (const branch of s.allOf) check(branch, value, path, errors);
  if (s.anyOf && !s.anyOf.some((branch) => matches(branch, value))) errors.push(`${path}: must name a verb, a noun, or an asking function`);
  if (s.oneOf) {
    const hits = s.oneOf.filter((branch) => matches(branch, value)).length;
    if (hits !== 1) errors.push(`${path}: must match exactly one verb shape`);
  }
  if (s.if && matches(s.if, value)) {
    if (s.then) check(s.then, value, path, errors);
  } else if (s.if && s.else) check(s.else, value, path, errors);
  if (s.not && matches(s.not, value)) errors.push(s.not.description ? `${path}: ${s.not.description}` : `${path}: is not allowed here`);
}

function readJson(file: string): unknown {
  let text: string;
  try { text = readFileSync(file, "utf8"); }
  catch (e) { throw new OperatingRulesError(`${file}: ${e instanceof Error ? e.message : "could not be read"}`); }
  try { return JSON.parse(text) as unknown; }
  catch { throw new OperatingRulesError(`${file}: not valid JSON`); }
}

function merge(base: unknown, over: unknown): unknown {
  if (!isRecord(base) || !isRecord(over)) return structuredClone(over);
  const out: Record<string, unknown> = structuredClone(base);
  for (const [key, value] of Object.entries(over)) out[key] = key in base ? merge(base[key], value) : structuredClone(value);
  return out;
}

function parseModule(value: unknown, label: string): OperatingRules {
  const problems = moduleProblems(value);
  if (problems.length) throw new OperatingRulesError(`${label}: ${problems.join("; ")}`);
  return value as OperatingRules;
}

/** The module at `file`, checked against the schema. Throws OperatingRulesError when it is invalid. */
export function readOperatingRules(file: string): OperatingRules {
  return parseModule(readJson(file), file);
}

/** The default module with a venture overlay merged on top. The overlay is not a full module. */
export function applyOverlay(base: OperatingRules, overlay: unknown, label: string): OperatingRules {
  if (!isRecord(overlay)) throw new OperatingRulesError(`${label}: a venture module is a JSON object`);
  return parseModule(merge(base, overlay), label);
}

function ventureDir(file: string): string | null {
  let dir = dirname(file);
  for (;;) {
    if (existsSync(join(dir, "venture.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * The operating rules for a gate run. The default module lives in the framework root.
 * When the package sits inside a venture, that venture's operating-rules.json is merged over it.
 */
export function operatingRulesFor(root: string, packageFile?: string): OperatingRules {
  const base = readOperatingRules(join(root, DEFAULT_MODULE));
  const venture = packageFile ? ventureDir(resolve(packageFile)) : null;
  if (!venture) return base;
  const file = ventureFile(venture, VENTURE_MODULE);
  if (!existsSync(file)) return base;
  return applyOverlay(base, readJson(file), file);
}

/** The rejection disposition the membership gate copies onto a rejected package. */
export function dispositionOf(rules: OperatingRules) {
  const retry = rules.rejection.retry;
  return {
    on_reject: retry.on_reject,
    retry_by: retry.retry_by,
    retries: retry.retries,
    then: retry.then,
    escalate_to: retry.escalate_to,
  };
}
