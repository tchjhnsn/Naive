// Generates schema/types/records.d.ts, one TypeScript type per record schema (schema/*.schema.json),
// so a record's type has one source, its JSON Schema (EE-087, phase 2). Every valid record must fit its
// type, so a type may accept more than the schema and never less. A keyword outside KEYWORDS throws.
//
// Left out of the types, each of which only accepts more: the checks in KEYWORDS that TypeScript cannot
// express, siblings of a $ref, required beside a propertyNames enum, and oneOf's "exactly one", so a
// required-only oneOf renders as anyOf ({ route, action, propose } fits trigger.run; the schema rejects it).
// A value the schema leaves open is unknown.
//
//   node schema/record-types.ts            write schema/types/records.d.ts
//   node schema/record-types.ts --check    exit 1 if the committed file differs from a fresh render

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Schema = {
  $ref?: string;
  description?: string;
  format?: string;
  type?: string | string[];
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean | Schema;
  propertyNames?: Schema;
  items?: Schema;
  enum?: unknown[];
  const?: unknown;
  oneOf?: Schema[];
  anyOf?: Schema[];
  allOf?: Schema[];
  $defs?: Record<string, Schema>;
};

// What each keyword does here. A new one needs a decision: applicators such as patternProperties can make
// a type reject valid records, so they throw until render handles them.
const KEYWORDS = new Set([
  // rendered
  "$ref", "$defs", "description", "format", "type", "properties", "required", "additionalProperties",
  "propertyNames", "items", "enum", "const", "oneOf", "anyOf", "allOf",
  // annotations, with no effect on what is valid
  "$schema", "$id", "title", "default",
  // checks TypeScript cannot express
  "pattern", "minimum", "maximum", "exclusiveMinimum", "minLength", "minItems", "maxItems", "uniqueItems",
  "minProperties", "maxProperties", "not", "if", "then", "else", "dependentRequired",
]);

const subschemas = (s: Schema) => [
  ...Object.values(s.properties ?? {}), ...Object.values(s.$defs ?? {}),
  ...(s.oneOf ?? []), ...(s.anyOf ?? []), ...(s.allOf ?? []),
  ...[s.items, s.additionalProperties, s.propertyNames].filter((x): x is Schema => typeof x === "object"),
];

const checkKeywords = (s: Schema, file: string) => {
  for (const k of Object.keys(s)) if (!KEYWORDS.has(k)) throw new Error(`${file}: unsupported keyword ${k}`);
  for (const sub of subschemas(s)) checkKeywords(sub, file);
};

const dir = new URL(".", import.meta.url).pathname;
const out = join(dir, "types/records.d.ts");

const pascal = (s: string) => s.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
const typeName = (file: string) => pascal(file.replace(/\.schema\.json$/, ""));

const files = readdirSync(dir).filter((f) => f.endsWith(".schema.json")).sort();
const schemas = new Map(files.map((f): [string, Schema] => [f, JSON.parse(readFileSync(join(dir, f), "utf8")) as Schema]));

const refName = (ref: string, file: string) => {
  const [target = "", pointer = ""] = ref.split("#");
  const owner = target || file;
  const schema = schemas.get(owner);
  if (!schema) throw new Error(`${file}: $ref ${ref} names no schema file`);
  if (!pointer) return typeName(owner);
  const def = /^\/\$defs\/([^/]+)$/.exec(pointer)?.[1];
  if (!def || !schema.$defs?.[def]) throw new Error(`${file}: $ref ${ref} is not a $defs entry`);
  return typeName(owner) + pascal(def);
};

const doc = (s: Schema, pad: string) => {
  const lines = [...(s.description ? s.description.replaceAll("*/", "*\\/").split("\n") : []), ...(s.format ? [`@format ${s.format}`] : [])];
  if (!lines.length) return "";
  return lines.length === 1 && !s.format ? `${pad}/** ${lines[0]} */\n` : `${pad}/**\n${lines.map((l) => `${pad} * ${l}`).join("\n")}\n${pad} */\n`;
};

const key = (k: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
const topLevel = (t: string) => {
  let depth = 0;
  let quoted = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) { if (c === "\\") i++; else if (c === '"') quoted = false; continue; }
    if (t.startsWith("/*", i)) i = t.indexOf("*/", i) + 1;
    else if (c === '"') quoted = true;
    else if ("{([".includes(c)) depth++;
    else if ("})]".includes(c)) depth--;
    else if (depth === 0 && (c === "|" || c === "&") && t[i - 1] === " ") return true;
  }
  return false;
};
const group = (t: string) => topLevel(t) ? `(${t})` : t;
const union = (ts: string[]) => [...new Set(ts)].join(" | ");

const objectType = (s: Schema, file: string, depth: number): string => {
  const pad = "  ".repeat(depth + 1);
  const required = new Set(s.required ?? []);
  const props = Object.entries(s.properties ?? {});
  const lines = props.map(([k, p]) => `${doc(p, pad)}${pad}${key(k)}${required.has(k) ? "" : "?"}: ${render(p, file, depth + 1)};`);
  for (const k of required) if (!s.properties?.[k]) lines.push(`${pad}${key(k)}: unknown;`);
  const extra = s.additionalProperties;
  if (extra !== false) {
    const value = typeof extra === "object" && !props.length ? render(extra, file, depth + 1) : "unknown";
    const names = s.propertyNames?.enum;
    if (names && !props.length) return `{ [K in ${union(names.map((n) => JSON.stringify(n)))}]?: ${value} }`;
    lines.push(`${pad}[key: string]: ${value};`);
  }
  if (!lines.length) return "Record<string, never>";
  return `{\n${lines.join("\n")}\n${"  ".repeat(depth)}}`;
};

// A oneOf branch that only lists required keys picks which of the parent's properties must be present.
const requiredOnly = (b: Schema) => !!b.required?.length && Object.keys(b).every((k) => k === "required" || k === "description");

const branch = (b: Schema, parent: Schema, file: string, depth: number) => {
  if (requiredOnly(b)) {
    return render({ type: "object", additionalProperties: false, required: b.required,
      properties: Object.fromEntries((b.required ?? []).map((k) => [k, parent.properties?.[k] ?? {}])) }, file, depth);
  }
  // Under a closed parent, a branch's index signature would let any key through the intersection.
  const closed = parent.additionalProperties === false && b.additionalProperties === undefined && Object.keys(b.properties ?? {}).length > 0;
  return render(closed ? { ...b, additionalProperties: false } : b, file, depth);
};

const render = (s: Schema, file: string, depth: number): string => {
  if (s.$ref) return refName(s.$ref, file);
  if ("const" in s) return JSON.stringify(s.const);
  if (s.enum) return union(s.enum.map((v) => JSON.stringify(v)));
  const variants = s.oneOf ?? s.anyOf;
  const base = s.type !== undefined || s.properties || s.additionalProperties !== undefined ? single(s, file, depth) : undefined;
  const parts: string[] = [];
  if (variants) parts.push(union(variants.map((b) => branch(b, s, file, depth))));
  for (const b of s.allOf ?? []) {
    const t = branch(b, s, file, depth);
    if (t !== "unknown") parts.push(t);
  }
  if (base && base !== "unknown") parts.unshift(base);
  return parts.length > 1 ? parts.map(group).join(" & ") : parts[0] ?? base ?? "unknown";
};

const single = (s: Schema, file: string, depth: number): string => {
  const types = Array.isArray(s.type) ? s.type : [s.type ?? "object"];
  return union(types.map((t) => {
    switch (t) {
      case "string": return "string";
      case "number": case "integer": return "number";
      case "boolean": return "boolean";
      case "null": return "null";
      case "array": return s.items ? `${group(render(s.items, file, depth))}[]` : "unknown[]";
      case "object": return objectType(s, file, depth);
      default: throw new Error(`${file}: unknown type ${t}`);
    }
  }));
};

const declare = (name: string, s: Schema, file: string) => `${doc(s, "")}export type ${name} = ${render(s, file, 0)};\n`;

const renderAll = () => {
  const declared = new Map<string, string>();
  const blocks = files.flatMap((f) => {
    const s = schemas.get(f) ?? {};
    checkKeywords(s, f);
    const { $defs, ...root } = s;
    const entries: [string, Schema][] = [[typeName(f), root], ...Object.entries($defs ?? {}).map(([d, ds]): [string, Schema] => [typeName(f) + pascal(d), ds])];
    return entries.map(([name, schema]) => {
      const other = declared.get(name);
      if (other) throw new Error(`${f}: type ${name} is already declared by ${other}`);
      declared.set(name, f);
      return declare(name, schema, f);
    });
  });
  return `// Generated by node schema/record-types.ts from schema/*.schema.json. Do not edit; edit the schema and regenerate.\n\n${blocks.join("\n")}`;
};

const text = renderAll();
if (process.argv.includes("--check")) {
  let committed = "";
  try { committed = readFileSync(out, "utf8"); } catch { /* missing counts as stale */ }
  if (committed !== text) {
    console.log("FAIL  schema/types/records.d.ts is stale: run node schema/record-types.ts");
    process.exit(1);
  }
  console.log(`ok    schema/types/records.d.ts matches ${files.length} schemas`);
} else {
  mkdirSync(join(dir, "types"), { recursive: true });
  writeFileSync(out, text);
  console.log(`wrote schema/types/records.d.ts: ${files.length} schemas`);
}
