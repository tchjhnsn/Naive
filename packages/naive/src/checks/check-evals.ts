// Templates, synthetic exemplars and eval files (EE-198).
//
// A synthetic exemplar passes synthetic-record (generated, not under a venture) and declares that label.
// Each citation passes allowed-source. A Dogfood path, a gold path or a run venture is a private seed and fails.
// A held-out item passes held-out-item. A non-null label passes person-label.
// The canary is equality with one fixed string, in check-canary.ts.
//
//   node packages/naive/src/checks/check-evals.ts [root]

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { CANARIES, canaryError } from "./check-canary.ts";
import { heldOutFacts, judgeHeldOut, judgePersonLabel, personLabelFacts } from "../terms/evals.ts";
import { judgeLabel } from "../terms/labels.ts";
import type { LabelFacts } from "../terms/levels.ts";
import { judgeSource } from "../terms/sources.ts";

const PUBLIC_DIRS = ["packages/naive/founder-templates/", "packages/naive/src/records/vocab/"];
const PUBLIC_FILES = ["packages/naive/src/functions/pcf.json"];

type Citation = { url: string | null; archive_of: string | null; logged_in: boolean; path: string | null };
type Labeller = { kind: string; id: string };
type EvalItem = { id: string; split: string; record: string; label: "accept" | "reject" | null; labelled_by: Labeller | null };

const repoOf = (root: string, file: string): string => relative(root, file).split(sep).join("/");

/** A Dogfood path, a gold exemplar path, or one of our run ventures. */
export function privateSeed(text: string): boolean {
  const s = text.replaceAll("\\", "/").toLowerCase();
  if (s.split("/").some((part) => part === "dogfood")) return true;
  if (s.includes("exemplars/gold")) return true;
  if (s.includes("venture:naive") || s.includes("venture:mentura")) return true;
  return false;
}

function publicPath(path: string): boolean {
  if (PUBLIC_FILES.includes(path)) return true;
  return PUBLIC_DIRS.some((prefix) => path.startsWith(prefix));
}

function asObject(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : null;
}

function nullableString(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v === "string") return v;
  return undefined;
}

function citationOf(v: unknown): Citation | null {
  const o = asObject(v);
  if (!o) return null;
  const url = nullableString(o.url);
  const archive = nullableString(o.archive_of);
  const path = nullableString(o.path);
  const loggedIn = o.logged_in;
  if (url === undefined || archive === undefined || path === undefined || typeof loggedIn !== "boolean") return null;
  return { url, archive_of: archive, logged_in: loggedIn, path };
}

function citationError(c: Citation): string | null {
  for (const text of [c.path, c.url, c.archive_of]) {
    if (text !== null && text !== "" && privateSeed(text)) return `cites a private seed ${text}`;
  }
  if (c.path !== null && c.path !== "" && !publicPath(c.path)) return `cites a path that is not a public input ${c.path}`;
  if (judgeSource({ url: c.url, archiveOf: c.archive_of, loggedIn: c.logged_in }).verdict !== "allowed") return "does not pass allowed-source";
  return null;
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

function readJson(file: string): { value: unknown } | { error: string } {
  try { return { value: JSON.parse(readFileSync(file, "utf8")) as unknown }; }
  catch { return { error: "is not JSON" }; }
}

function checkExemplar(root: string, file: string, errors: string[]): void {
  const rel = repoOf(root, file);
  const parsed = readJson(file);
  if ("error" in parsed) { errors.push(`${rel}: ${parsed.error}`); return; }
  const o = asObject(parsed.value);
  if (!o || typeof o.id !== "string" || o.id === "") { errors.push(`${rel}: an exemplar needs a string id`); return; }
  const generated = o.generated === true;
  const underVenture = o.under_venture === true;
  const facts: LabelFacts = {
    confirmed: true, hasSource: false, hasMethod: false, generated, accepted: false, ownVenture: false, underVenture,
  };
  const judged = judgeLabel(facts);
  if (judged.verdict !== "synthetic") errors.push(`${rel}: does not pass synthetic-record`);
  if (o.label !== "synthetic") errors.push(`${rel}: label is not synthetic`);
  if (!Array.isArray(o.derived_from)) { errors.push(`${rel}: derived_from is not a list`); return; }
  for (const entry of o.derived_from) {
    const citation = citationOf(entry);
    if (!citation) { errors.push(`${rel}: a citation is missing url, archive_of, logged_in or path`); continue; }
    const error = citationError(citation);
    if (error) errors.push(`${rel}: ${error}`);
  }
}

function labelOf(v: unknown): "accept" | "reject" | null | undefined {
  if (v === null) return null;
  if (v === "accept" || v === "reject") return v;
  return undefined;
}

function itemOf(v: unknown): EvalItem | null {
  const o = asObject(v);
  const id = o?.id;
  const split = o?.split;
  const record = o?.record;
  const label = o ? labelOf(o.label) : undefined;
  if (!o || typeof id !== "string" || id === "" || typeof split !== "string" || typeof record !== "string" || record === "" || label === undefined) return null;
  if (o.labelled_by === null) return { id, split, record, label, labelled_by: null };
  const by = asObject(o.labelled_by);
  const kind = by?.kind;
  const byId = by?.id;
  if (!by || typeof kind !== "string" || kind === "" || typeof byId !== "string" || byId === "") return null;
  return { id, split, record, label, labelled_by: { kind, id: byId } };
}

function listed(id: string, texts: readonly string[]): boolean {
  return id !== "" && texts.some((text) => text.includes(id));
}

function checkEval(root: string, file: string, exemplarTexts: readonly string[], promptTexts: readonly string[], errors: string[]): void {
  const rel = repoOf(root, file);
  const parsed = readJson(file);
  if ("error" in parsed) { errors.push(`${rel}: ${parsed.error}`); return; }
  const o = asObject(parsed.value);
  if (!o || !Array.isArray(o.items)) { errors.push(`${rel}: an eval file needs items`); return; }
  const canary = canaryError(rel, o.canary);
  if (canary) errors.push(canary);
  for (const entry of o.items) {
    const item = itemOf(entry);
    if (!item) { errors.push(`${rel}: an item needs id, split, record, label and labelled_by`); continue; }
    const facts = heldOutFacts(item.split, listed(item.id, exemplarTexts), listed(item.id, promptTexts));
    const held = judgeHeldOut(facts);
    if (facts.splitHeldOut && !held.pass) errors.push(`${rel}: held-out item ${item.id} does not pass held-out-item (${held.failed.join(", ")})`);
    const person = judgePersonLabel(personLabelFacts(item.label !== null, item.labelled_by?.kind ?? null));
    if (!person.pass) errors.push(`${rel}: item ${item.id} does not pass person-label (${person.failed.join(", ")})`);
  }
}

function promptTexts(root: string): string[] {
  return walk(join(root, "packages/naive")).flatMap((file) => {
    const rel = repoOf(root, file);
    if (!rel.includes("/prompts/") && !rel.endsWith(".prompt.md")) return [];
    return [readFileSync(file, "utf8")];
  });
}

export function checkRoot(root: string): string[] {
  const errors: string[] = [];
  const gold = join(root, "packages/naive/exemplars/gold");
  if (existsSync(gold)) errors.push("packages/naive/exemplars/gold is not part of Naive");
  const exemplarFiles = walk(join(root, "packages/naive/exemplars"));
  const exemplarTexts = exemplarFiles.filter((f) => !f.endsWith(".md")).map((f) => readFileSync(f, "utf8"));
  for (const file of walk(join(root, "packages/naive/exemplars/synthetic")).filter((f) => f.endsWith(".json"))) checkExemplar(root, file, errors);
  for (const file of walk(join(root, "packages/naive/founder-templates")).filter((f) => f.endsWith(".json"))) {
    const text = readFileSync(file, "utf8");
    if (privateSeed(text)) errors.push(`${repoOf(root, file)}: cites a private seed`);
  }
  const prompts = promptTexts(root);
  const evalFiles = new Set(walk(join(root, "packages/naive/evals")).filter((f) => f.endsWith(".json")).map((f) => repoOf(root, f)));
  for (const rel of Object.keys(CANARIES)) if (!evalFiles.has(rel)) errors.push(`${rel}: canary file is missing`);
  for (const rel of evalFiles) checkEval(root, join(root, rel), exemplarTexts, prompts, errors);
  return errors;
}

function main(): void {
  const root = process.argv[2] ? process.argv[2].replace(/\/$/, "") : new URL("../../../..", import.meta.url).pathname.replace(/\/$/, "");
  const errors = checkRoot(root);
  for (const error of errors) console.log(`FAIL ${error}`);
  if (errors.length) process.exit(1);
  console.log("ok");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
