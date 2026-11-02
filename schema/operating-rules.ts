// Naive's operating rules, as a module a venture can override.
//
// The default module is operations/operating-rules.json. A venture supplies its own
// operating-rules.json, merged over the default. On a structured venture that file is
// meta/operating-rules.json. Scalars and arrays in the overlay replace the default.
// Objects merge key by key. The merged module is checked by schema/validate.py, the
// same checker the handoff schema uses. Three checks the schema does not express stay
// here: jev.yes must be above jev.no, loss.p0 must be below loss.p1, and a routing rule id is unique.
//
// The membership gate reads rejection.retry (schema/ontology-gate.ts). Question
// routing, pattern learning, standing-rule decay and the other settings are
// declared for later pull requests. This module validates them and does not enforce them.
//
//   node schema/operating-rules-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/** Schema problems from schema/validate.py. Empty when the document matches. A checker that cannot run throws. */
function schemaProblems(value: unknown): string[] {
  const dir = mkdtempSync(join(tmpdir(), "operating-rules-"));
  const file = join(dir, "module.json");
  try {
    writeFileSync(file, JSON.stringify(value));
    const script = fileURLToPath(new URL("./validate.py", import.meta.url));
    const ran = spawnSync("python3", ["-I", script, "--schema", "operating-rules.schema.json", "--file", file], { encoding: "utf8" });
    const text = `${ran.stdout ?? ""}\n${ran.stderr ?? ""}\n${ran.error?.message ?? ""}`.split("\n").map((line) => line.trim()).filter(Boolean);
    if (ran.error || ran.status === 2 || ran.status === null) throw new OperatingRulesError(text.join("\n") || "the schema checker could not run");
    if (ran.status === 0) return [];
    return text.length ? text : ["the module is not valid"];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Schema problems for one module document, plus the two checks the schema does not express. */
export function moduleProblems(value: unknown): string[] {
  const errors = schemaProblems(value);
  if (isRecord(value) && isRecord(value.jev) && typeof value.jev.yes === "number" && typeof value.jev.no === "number" && value.jev.yes <= value.jev.no) {
    errors.push("jev.yes must be above jev.no");
  }
  const loss = isRecord(value) && isRecord(value.questions) ? value.questions.loss : undefined;
  if (isRecord(loss) && typeof loss.p0 === "number" && typeof loss.p1 === "number" && loss.p0 >= loss.p1) {
    errors.push("questions.loss.p0 must be below questions.loss.p1");
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
  for (const [key, value] of Object.entries(over)) {
    const next = Object.hasOwn(base, key) ? merge(base[key], value) : structuredClone(value);
    Object.defineProperty(out, key, { value: next, enumerable: true, writable: true, configurable: true });
  }
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
