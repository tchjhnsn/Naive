// The membership gate (the first gate of the handoff pipeline). Deterministic: a package's
// ontology either belongs to the receiving function, or it does not, and then the verdict names
// the function it does belong to. One verdict per package. No model call.
//
//   node packages/naive/src/checks/check-nouns.mjs --package <file> --function <id> [--record]
//
// G1 the handoff schema. G2 every term is a live noun. G3 the type noun's function is the
// receiver, otherwise refer to its owner. G4 some term is owned by the receiver, and every term
// owned by another function names that function in touches. G5 where the type lists properties,
// packages/naive/src/terms/engine.ts runs over facts (EE-095). A fact value is either the boolean true or a
// record. Anything else fails that property. Two records that give one field different values
// are a reject, not a merge. A throw while reading a record fails every property of that type.
// The verdict is written to <id>.provenance.jsonl, not onto the handoff. Only a real
// schema-validation failure (the checker exits 1) is recorded as a reject. Any other failure
// of the checker is a tool error: no verdict, and nothing is recorded. A rejection's
// disposition is read from the operating-rules module. The default is one retry by the lead,
// then the founder. An operating-rules module that cannot be read is the same kind of tool error.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { recordGate } from "../core/provenance.mjs";
import { dispositionOf, operatingRulesFor, OperatingRulesError } from "./operating-rules.ts";
import { run, type Base, type Term } from "./engine.ts";
import { TERMS } from "./terms.ts";
import type { Handoff, OperatingRules, ProvenanceEntry } from "../records/types/records.d.ts";

export type Judgment = NonNullable<ProvenanceEntry["judgment"]>;
type Block = NonNullable<Handoff["ontology"]>;

type Noun = {
  noun: string;
  level: string;
  standard?: string;
  status?: string;
  function?: string | null;
  handoff_type?: boolean;
  capabilities?: string[];
  replaced_by?: string;
  term?: string;
  properties?: string[];
  required_touches?: string[];
  hasFunction: boolean;
  hasHandoffType: boolean;
};

/** The schema checker could not run. Not a verdict about the package, and not recorded. */
export class GateToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GateToolError";
  }
}

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

function rulesFor(root: string, file: string): OperatingRules {
  try {
    return operatingRulesFor(root, file);
  } catch (e) {
    if (e instanceof OperatingRulesError) throw new GateToolError(e.message);
    throw e;
  }
}
const strings = (x: unknown): string[] | undefined => Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : undefined;

function loadNouns(root: string): Noun[] {
  const raw = JSON.parse(readFileSync(join(root, "packages/naive/src/terms/ontology.json"), "utf8")) as unknown;
  if (!isRecord(raw) || !Array.isArray(raw.nouns)) throw new Error("packages/naive/src/terms/ontology.json has no nouns");
  return raw.nouns.filter(isRecord).map((n) => ({
    noun: typeof n.noun === "string" ? n.noun : "",
    level: typeof n.level === "string" ? n.level : "",
    standard: typeof n.standard === "string" ? n.standard : undefined,
    status: typeof n.status === "string" ? n.status : undefined,
    function: n.function === null ? null : typeof n.function === "string" ? n.function : undefined,
    handoff_type: typeof n.handoff_type === "boolean" ? n.handoff_type : undefined,
    capabilities: strings(n.capabilities),
    replaced_by: typeof n.replaced_by === "string" ? n.replaced_by : undefined,
    term: typeof n.term === "string" ? n.term : undefined,
    properties: strings(n.properties),
    required_touches: strings(n.required_touches),
    hasFunction: Object.prototype.hasOwnProperty.call(n, "function"),
    hasHandoffType: Object.prototype.hasOwnProperty.call(n, "handoff_type"),
  }));
}

function departmentIds(root: string): Set<string> {
  const raw = JSON.parse(readFileSync(join(root, "packages/naive/src/functions/departments.json"), "utf8")) as unknown;
  if (!isRecord(raw) || !Array.isArray(raw.departments)) return new Set();
  return new Set(raw.departments.filter(isRecord).map((d) => d.id).filter((id): id is string => typeof id === "string"));
}

function termById(id: string): Term<Base> | null {
  const raw = JSON.parse(readFileSync(fileURLToPath(new URL("./admitted.json", import.meta.url)), "utf8")) as { terms?: { id?: string; valid?: boolean }[] };
  const row = raw.terms?.find((t) => t.id === id);
  if (!row?.valid) return null;
  const term = TERMS.find((t) => t.id === id);
  return term ? term as unknown as Term<Base> : null;
}

function assertionTerm(term: Term<Base>): Term<Base> {
  return {
    ...term,
    props: term.props.map((p) => ({
      id: p.id,
      says: p.says,
      permission: p.permission,
      check: (f: Base) => {
        if (p.permission) return true;
        const entry = (f as Base & Record<string, { value?: unknown } | undefined>)[p.id];
        return entry?.value === true;
      },
    })),
  };
}

/** A fact record is a plain object. An array, null, a number or a string is not one. */
function plainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Stable equality, so two records of the same fields in a different order do not conflict. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const record = plainRecord(value);
  if (record) return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}

/** Property ids that do not hold. Empty when the type defines none, or when every one holds. */
export function failedProperties(noun: Noun, facts: Block["facts"]): string[] {
  const properties = noun.properties ?? [];
  if (!properties.length) return [];
  const term = noun.term ? termById(noun.term) : null;
  if (!term) return [...properties];
  const record: Record<string, unknown> = {};
  let sawObject = false;
  const conflicts: string[] = [];
  for (const id of properties) {
    const value = plainRecord(facts?.[id]?.value);
    if (!value) continue;
    sawObject = true;
    const clash = Object.entries(value).some(([key, field]) => Object.prototype.hasOwnProperty.call(record, key) && stable(record[key]) !== stable(field));
    if (clash) conflicts.push(id);
    else Object.assign(record, value);
  }
  // Who confirms a package's facts is still open. Until that is decided, a record that does not
  // say is treated as confirmed, and one that says otherwise is left as it said.
  if (!Object.prototype.hasOwnProperty.call(record, "confirmed")) record.confirmed = true;
  // A throw here means the record is not one the term can read (a missing field, a field of the
  // wrong shape). That is a fact about the package: every property under evaluation fails.
  let ran;
  try {
    ran = sawObject
      ? run(term, record as Base)
      : run(assertionTerm(term), { confirmed: true, ...(facts ?? {}) } as Base);
  } catch {
    return [...properties];
  }
  const failed = [...ran.failed];
  for (const id of conflicts) if (!failed.includes(id)) failed.push(id);
  const known = new Set(term.props.map((p) => p.id));
  for (const id of properties) {
    if (!known.has(id) && !failed.includes(id)) failed.push(id);
    const fact = facts?.[id];
    if ((!fact || fact.quote.trim() === "") && !failed.includes(id)) failed.push(id);
    // true, or a record. null, 0, a string, false, an array: the property does not hold.
    const value = fact?.value;
    if (fact && value !== true && !plainRecord(value) && !failed.includes(id)) failed.push(id);
  }
  return failed;
}

/** Ontology rules that are not about one package: standards, function ids, capabilities. */
export function checkOntology(root: string): string[] {
  const errors: string[] = [];
  const nouns = loadNouns(root);
  const departments = departmentIds(root);
  const byName = new Map<string, Noun>();
  for (const noun of nouns) {
    if (byName.has(noun.noun)) errors.push(`packages/naive/src/terms/ontology.json: duplicate noun ${noun.noun}`);
    byName.set(noun.noun, noun);
    if (!noun.standard?.trim()) errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: no standard`);
    if (!noun.hasFunction) errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: function is missing`);
    else if (noun.function !== null && (typeof noun.function !== "string" || !departments.has(noun.function))) errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: function ${String(noun.function)} is not a department id`);
    if (!noun.hasHandoffType) errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: handoff_type is missing`);
    if (noun.handoff_type === true && (noun.function === null || noun.function === undefined)) errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: handoff type needs one function`);
    if (noun.properties?.length) checkProperties(noun, errors);
    for (const touch of noun.required_touches ?? []) {
      if (!departments.has(touch)) errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: required touch ${touch} is not a department id`);
      if (touch === noun.function) errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: required touch ${touch} is its own function`);
    }
  }
  for (const noun of nouns) {
    if (noun.level !== "function" || noun.status === "retired") continue;
    if (!departments.has(noun.noun)) errors.push(`packages/naive/src/terms/ontology.json: function ${noun.noun}: not a department id`);
    const caps = noun.capabilities ?? [];
    if (!caps.length) errors.push(`packages/naive/src/terms/ontology.json: function ${noun.noun}: no capabilities`);
    for (const cap of caps) checkCapability(noun.noun, cap, byName, errors);
  }
  checkScopes(nouns, departments, errors);
  return errors;
}

/** A scoped sense is `name@function`. The suffix is a function id and is the noun's owner. A bare name does not sit beside one. */
function checkScopes(nouns: Noun[], departments: Set<string>, errors: string[]): void {
  const stems = new Set<string>();
  for (const noun of nouns) {
    const match = /^(.+)@([^@]+)$/.exec(noun.noun);
    if (!match) continue;
    const stem = match[1] ?? "";
    const suffix = match[2] ?? "";
    if (noun.status === "retired") continue;
    stems.add(stem);
    if (!departments.has(suffix)) errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: scope ${suffix} is not a function id`);
    if (noun.function !== suffix) errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: function ${noun.function ?? "nobody"} does not match its scope ${suffix}`);
  }
  for (const noun of nouns) {
    if (noun.status === "retired" || noun.noun.includes("@")) continue;
    if (stems.has(noun.noun)) errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: bare noun beside a scoped sense`);
  }
}

function checkProperties(noun: Noun, errors: string[]): void {
  if (!noun.term) { errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: properties need a term`); return; }
  const term = termById(noun.term);
  if (!term) { errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: term ${noun.term} is not admitted`); return; }
  const listed = noun.properties ?? [];
  const known = new Set(term.props.map((p) => p.id));
  for (const id of listed) if (!known.has(id)) errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: property ${id} is not on term ${noun.term}`);
  for (const prop of term.props) if (!prop.permission && !listed.includes(prop.id)) errors.push(`packages/naive/src/terms/ontology.json: ${noun.noun}: property ${prop.id} is not listed`);
}

function checkCapability(owner: string, cap: string, byName: Map<string, Noun>, errors: string[]): void {
  const noun = byName.get(cap);
  if (!noun) { errors.push(`packages/naive/src/terms/ontology.json: function ${owner}: capability ${cap} is missing`); return; }
  if (noun.status === "retired") { errors.push(`packages/naive/src/terms/ontology.json: function ${owner}: capability ${cap} is retired`); return; }
  if (noun.function !== owner) errors.push(`packages/naive/src/terms/ontology.json: function ${owner}: capability ${cap} is owned by ${noun.function ?? "nobody"}`);
}

function schemaProblems(file: string): string[] {
  const script = fileURLToPath(new URL("../records/validate.py", import.meta.url));
  const ran = spawnSync("python3", ["-I", script, "--schema", "handoff.schema.json", "--file", file], { encoding: "utf8" });
  const text = `${ran.stdout ?? ""}\n${ran.stderr ?? ""}\n${ran.error?.message ?? ""}`.split("\n").map((l) => l.trim()).filter(Boolean);
  if (ran.status === 0) return [];
  // Exit 1 is the checker reporting that this package failed its schema. Every other exit is the tool.
  if (ran.status === 1) return text.length ? text : ["the package is not a valid handoff"];
  throw new GateToolError(text.join("\n") || "the schema checker could not run");
}

function reject(fields: Omit<Judgment, "verdict" | "disposition">, rules: OperatingRules): Judgment {
  return { verdict: "reject", disposition: dispositionOf(rules), ...fields };
}

function factsOf(raw: Record<string, unknown>): Block["facts"] {
  const out: NonNullable<Block["facts"]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value) || typeof value.quote !== "string") continue;
    out[key] = { value: value.value, quote: value.quote };
  }
  return out;
}

function blockOf(raw: Record<string, unknown>): Block | null {
  if (!isRecord(raw.ontology)) return null;
  const o = raw.ontology;
  if (typeof o.type !== "string" || !Array.isArray(o.terms) || !Array.isArray(o.touches)) return null;
  return {
    type: o.type,
    terms: o.terms.filter((t): t is string => typeof t === "string"),
    touches: o.touches.filter((t): t is string => typeof t === "string"),
    facts: isRecord(o.facts) ? factsOf(o.facts) : undefined,
  };
}

/** One verdict. The first failing check wins, so a package is never both rejected and referred. */
export function decidePackage(file: string, functionId: string, options: { root: string; record?: boolean }): Judgment {
  if (!file.endsWith(".json")) throw new GateToolError("a handoff package is a .json file");
  const rules = rulesFor(options.root, file);
  const problems = schemaProblems(file);
  let parsed: unknown = null;
  try { parsed = JSON.parse(readFileSync(file, "utf8")) as unknown; } catch { parsed = null; }
  const id = isRecord(parsed) && typeof parsed.id === "string" ? parsed.id : "package";
  const finish = (judgment: Judgment): Judgment => {
    if (options.record && isRecord(parsed)) recordGate(file, judgment);
    return judgment;
  };
  if (problems.length || !isRecord(parsed)) return finish(reject({ code: "schema", function: functionId, witness: id, detail: problems[0] ?? "the package is not a valid handoff" }, rules));
  const ontology = blockOf(parsed);
  if (!ontology) return finish(reject({ code: "schema", function: functionId, witness: id, detail: "the package has no ontology block" }, rules));
  return finish(judge(ontology, functionId, options.root, rules));
}

function judge(ontology: Block, functionId: string, root: string, rules: OperatingRules): Judgment {
  const nouns = loadNouns(root);
  const byName = new Map(nouns.map((n) => [n.noun, n]));
  const departments = departmentIds(root);
  const active = new Set(nouns.filter((n) => n.level === "function" && n.status !== "retired").map((n) => n.noun));
  if (!active.has(functionId)) return reject({ code: "unknown", function: functionId, witness: functionId, detail: `${functionId} is not a function` }, rules);

  const typeNoun = byName.get(ontology.type);
  if (!typeNoun) return reject({ code: "unknown", function: functionId, witness: ontology.type, detail: `${ontology.type} is not a noun` }, rules);
  if (typeNoun.status === "retired") return retired(functionId, typeNoun, rules);

  for (const term of ontology.terms) {
    const noun = byName.get(term);
    if (!noun) return reject({ code: "unknown", function: functionId, witness: term, detail: `${term} is not a noun` }, rules);
    if (noun.status === "retired") return retired(functionId, noun, rules);
  }

  if (typeNoun.handoff_type !== true) return reject({ code: "not-a-type", function: functionId, witness: typeNoun.noun, detail: `${typeNoun.noun} is not a handoff type` }, rules);
  if (typeNoun.function == null) return reject({ code: "untyped", function: functionId, witness: typeNoun.noun, detail: `${typeNoun.noun} has no function, so it cannot decide a package` }, rules);
  if (typeNoun.function !== functionId) return { verdict: "refer", code: "refer", function: functionId, witness: typeNoun.noun, owner: typeNoun.function, detail: `${typeNoun.noun} belongs to ${typeNoun.function}` };

  for (const touch of ontology.touches) if (!departments.has(touch)) return reject({ code: "unknown", function: functionId, witness: touch, detail: `${touch} is not a function` }, rules);

  const owned: string[] = [];
  for (const term of ontology.terms) {
    const noun = byName.get(term);
    if (!noun || noun.status === "retired" || noun.function == null) continue;
    if (noun.function === functionId) { owned.push(term); continue; }
    if (!ontology.touches.includes(noun.function)) return reject({ code: "incomplete", function: functionId, witness: term, missing: noun.function, detail: `${term} is owned by ${noun.function}, which is not in touches` }, rules);
  }
  if (!owned.length) return reject({ code: "incomplete", function: functionId, witness: typeNoun.noun, detail: `no term owned by ${functionId}` }, rules);
  for (const need of typeNoun.required_touches ?? []) if (!ontology.touches.includes(need)) return reject({ code: "incomplete", function: functionId, witness: typeNoun.noun, missing: need, detail: `${need} is required in touches` }, rules);
  const used = new Set(typeNoun.required_touches ?? []);
  for (const term of ontology.terms) {
    const owner = byName.get(term)?.function;
    if (owner && owner !== functionId) used.add(owner);
  }
  for (const touch of ontology.touches) if (touch !== functionId && !used.has(touch)) return reject({ code: "incomplete", function: functionId, witness: touch, detail: `${touch} is in touches but the package does not use it` }, rules);

  const failed = failedProperties(typeNoun, ontology.facts);
  if (failed.length) return reject({ code: "properties", function: functionId, witness: typeNoun.noun, failed, detail: `failed: ${failed.join(", ")}` }, rules);
  return { verdict: "admit", code: "admit", function: functionId, witness: owned[0] ?? typeNoun.noun, detail: `${owned[0]} belongs to ${functionId}` };
}

function retired(functionId: string, noun: Noun, rules: OperatingRules): Judgment {
  const instead = noun.replaced_by ?? "the noun that replaced it";
  return reject({ code: "retired", function: functionId, witness: noun.noun, replaced_by: noun.replaced_by, detail: `${noun.noun} is retired; use ${instead}` }, rules);
}
