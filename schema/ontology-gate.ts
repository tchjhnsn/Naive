// The membership gate (the first gate of the handoff pipeline). Deterministic: a package's
// ontology either belongs to the receiving function, or it does not, and then the verdict names
// the function it does belong to. One verdict per package. No model call.
//
//   node schema/check-nouns.mjs --package <file> --function <id> [--record]
//
// G1 the handoff schema. G2 every term is a live noun. G3 the type noun's function is the
// receiver, otherwise refer to its owner. G4 some term is owned by the receiver, and every term
// owned by another function names that function in touches. G5 where the type lists properties,
// schema/terms/engine.ts runs over facts (EE-095). A fact value that is an object is the term's
// record, and the term's own checks run. A boolean is an assertion, and the term's rule runs
// through the same engine. The verdict is written to <id>.provenance.jsonl, not onto the handoff.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { recordGate } from "../interface/provenance.mjs";
import { run, type Base, type Term } from "./terms/engine.ts";
import { TERMS } from "./terms/terms.ts";
import type { Handoff, ProvenanceEntry } from "./types/records.d.ts";

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

const DISPOSITION = {
  on_reject: "retry",
  retry_by: "lead",
  retries: 1,
  then: "escalate",
  escalate_to: "founder",
} as const;

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const strings = (x: unknown): string[] | undefined => Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : undefined;

function loadNouns(root: string): Noun[] {
  const raw = JSON.parse(readFileSync(join(root, "docs/ontology.json"), "utf8")) as unknown;
  if (!isRecord(raw) || !Array.isArray(raw.nouns)) throw new Error("docs/ontology.json has no nouns");
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
  const raw = JSON.parse(readFileSync(join(root, "operations/departments.json"), "utf8")) as unknown;
  if (!isRecord(raw) || !Array.isArray(raw.departments)) return new Set();
  return new Set(raw.departments.filter(isRecord).map((d) => d.id).filter((id): id is string => typeof id === "string"));
}

function termById(id: string): Term<Base> | null {
  const raw = JSON.parse(readFileSync(fileURLToPath(new URL("./terms/admitted.json", import.meta.url)), "utf8")) as { terms?: { id?: string; valid?: boolean }[] };
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

/** Property ids that do not hold. Empty when the type defines none, or when every one holds. */
export function failedProperties(noun: Noun, facts: Block["facts"]): string[] {
  const properties = noun.properties ?? [];
  if (!properties.length) return [];
  const term = noun.term ? termById(noun.term) : null;
  if (!term) return [...properties];
  const record: Record<string, unknown> = { confirmed: true };
  let sawObject = false;
  for (const id of properties) {
    const value = facts?.[id]?.value;
    if (value && typeof value === "object") { Object.assign(record, value); sawObject = true; }
  }
  const ran = sawObject
    ? run(term, record as Base)
    : run(assertionTerm(term), { confirmed: true, ...(facts ?? {}) } as Base);
  const failed = [...ran.failed];
  const known = new Set(term.props.map((p) => p.id));
  for (const id of properties) {
    if (!known.has(id) && !failed.includes(id)) failed.push(id);
    const fact = facts?.[id];
    if ((!fact || fact.quote.trim() === "") && !failed.includes(id)) failed.push(id);
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
    if (byName.has(noun.noun)) errors.push(`docs/ontology.json: duplicate noun ${noun.noun}`);
    byName.set(noun.noun, noun);
    if (!noun.standard?.trim()) errors.push(`docs/ontology.json: ${noun.noun}: no standard`);
    if (!noun.hasFunction) errors.push(`docs/ontology.json: ${noun.noun}: function is missing`);
    else if (noun.function !== null && (typeof noun.function !== "string" || !departments.has(noun.function))) errors.push(`docs/ontology.json: ${noun.noun}: function ${String(noun.function)} is not a department id`);
    if (!noun.hasHandoffType) errors.push(`docs/ontology.json: ${noun.noun}: handoff_type is missing`);
    if (noun.handoff_type === true && (noun.function === null || noun.function === undefined)) errors.push(`docs/ontology.json: ${noun.noun}: handoff type needs one function`);
    if (noun.properties?.length) checkProperties(noun, errors);
    for (const touch of noun.required_touches ?? []) {
      if (!departments.has(touch)) errors.push(`docs/ontology.json: ${noun.noun}: required touch ${touch} is not a department id`);
      if (touch === noun.function) errors.push(`docs/ontology.json: ${noun.noun}: required touch ${touch} is its own function`);
    }
  }
  for (const noun of nouns) {
    if (noun.level !== "function" || noun.status === "retired") continue;
    if (!departments.has(noun.noun)) errors.push(`docs/ontology.json: function ${noun.noun}: not a department id`);
    const caps = noun.capabilities ?? [];
    if (!caps.length) errors.push(`docs/ontology.json: function ${noun.noun}: no capabilities`);
    for (const cap of caps) checkCapability(noun.noun, cap, byName, errors);
  }
  return errors;
}

function checkProperties(noun: Noun, errors: string[]): void {
  if (!noun.term) { errors.push(`docs/ontology.json: ${noun.noun}: properties need a term`); return; }
  const term = termById(noun.term);
  if (!term) { errors.push(`docs/ontology.json: ${noun.noun}: term ${noun.term} is not admitted`); return; }
  const listed = noun.properties ?? [];
  const known = new Set(term.props.map((p) => p.id));
  for (const id of listed) if (!known.has(id)) errors.push(`docs/ontology.json: ${noun.noun}: property ${id} is not on term ${noun.term}`);
  for (const prop of term.props) if (!prop.permission && !listed.includes(prop.id)) errors.push(`docs/ontology.json: ${noun.noun}: property ${prop.id} is not listed`);
}

function checkCapability(owner: string, cap: string, byName: Map<string, Noun>, errors: string[]): void {
  const noun = byName.get(cap);
  if (!noun) { errors.push(`docs/ontology.json: function ${owner}: capability ${cap} is missing`); return; }
  if (noun.status === "retired") { errors.push(`docs/ontology.json: function ${owner}: capability ${cap} is retired`); return; }
  if (noun.function !== owner) errors.push(`docs/ontology.json: function ${owner}: capability ${cap} is owned by ${noun.function ?? "nobody"}`);
}

function schemaProblems(file: string): string[] {
  const script = fileURLToPath(new URL("./validate.py", import.meta.url));
  const ran = spawnSync("python3", ["-I", script, "--schema", "handoff.schema.json", "--file", file], { encoding: "utf8" });
  if (ran.status === 0) return [];
  const text = `${ran.stdout ?? ""}\n${ran.stderr ?? ""}`.split("\n").map((l) => l.trim()).filter(Boolean);
  return text.length ? text : ["the package is not a valid handoff"];
}

function reject(fields: Omit<Judgment, "verdict" | "disposition">): Judgment {
  return { verdict: "reject", disposition: DISPOSITION, ...fields };
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
  let parsed: unknown = null;
  try { parsed = JSON.parse(readFileSync(file, "utf8")) as unknown; } catch { parsed = null; }
  const id = isRecord(parsed) && typeof parsed.id === "string" ? parsed.id : "package";
  const problems = schemaProblems(file);
  const finish = (judgment: Judgment): Judgment => {
    if (options.record && isRecord(parsed)) recordGate(file, judgment);
    return judgment;
  };
  if (problems.length || !isRecord(parsed)) return finish(reject({ code: "schema", function: functionId, witness: id, detail: problems[0] ?? "the package is not a valid handoff" }));
  const ontology = blockOf(parsed);
  if (!ontology) return finish(reject({ code: "schema", function: functionId, witness: id, detail: "the package has no ontology block" }));
  return finish(judge(ontology, functionId, options.root));
}

function judge(ontology: Block, functionId: string, root: string): Judgment {
  const nouns = loadNouns(root);
  const byName = new Map(nouns.map((n) => [n.noun, n]));
  const departments = departmentIds(root);
  if (!departments.has(functionId)) return reject({ code: "unknown", function: functionId, witness: functionId, detail: `${functionId} is not a function` });

  const typeNoun = byName.get(ontology.type);
  if (!typeNoun) return reject({ code: "unknown", function: functionId, witness: ontology.type, detail: `${ontology.type} is not a noun` });
  if (typeNoun.status === "retired") return retired(functionId, typeNoun);

  for (const term of ontology.terms) {
    const noun = byName.get(term);
    if (!noun) return reject({ code: "unknown", function: functionId, witness: term, detail: `${term} is not a noun` });
    if (noun.status === "retired") return retired(functionId, noun);
  }

  if (typeNoun.handoff_type !== true) return reject({ code: "not-a-type", function: functionId, witness: typeNoun.noun, detail: `${typeNoun.noun} is not a handoff type` });
  if (typeNoun.function == null) return reject({ code: "untyped", function: functionId, witness: typeNoun.noun, detail: `${typeNoun.noun} has no function, so it cannot decide a package` });
  if (typeNoun.function !== functionId) return { verdict: "refer", code: "refer", function: functionId, witness: typeNoun.noun, owner: typeNoun.function, detail: `${typeNoun.noun} belongs to ${typeNoun.function}` };

  for (const touch of ontology.touches) if (!departments.has(touch)) return reject({ code: "unknown", function: functionId, witness: touch, detail: `${touch} is not a function` });

  const owned: string[] = [];
  for (const term of ontology.terms) {
    const noun = byName.get(term);
    if (!noun || noun.status === "retired" || noun.function == null) continue;
    if (noun.function === functionId) { owned.push(term); continue; }
    if (!ontology.touches.includes(noun.function)) return reject({ code: "incomplete", function: functionId, witness: term, missing: noun.function, detail: `${term} is owned by ${noun.function}, which is not in touches` });
  }
  if (!owned.length) return reject({ code: "incomplete", function: functionId, witness: typeNoun.noun, detail: `no term owned by ${functionId}` });
  for (const need of typeNoun.required_touches ?? []) if (!ontology.touches.includes(need)) return reject({ code: "incomplete", function: functionId, witness: typeNoun.noun, missing: need, detail: `${need} is required in touches` });

  const failed = failedProperties(typeNoun, ontology.facts);
  if (failed.length) return reject({ code: "properties", function: functionId, witness: typeNoun.noun, failed, detail: `failed: ${failed.join(", ")}` });
  return { verdict: "admit", code: "admit", function: functionId, witness: owned[0] ?? typeNoun.noun, detail: `${owned[0]} belongs to ${functionId}` };
}

function retired(functionId: string, noun: Noun): Judgment {
  const instead = noun.replaced_by ?? "the noun that replaced it";
  return reject({ code: "retired", function: functionId, witness: noun.noun, replaced_by: noun.replaced_by, detail: `${noun.noun} is retired; use ${instead}` });
}
