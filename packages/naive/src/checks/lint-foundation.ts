#!/usr/bin/env node
// Foundation lint: the foundation records held to each other.
//
//   node packages/naive/src/checks/lint-foundation.ts <venture dir> [--json]
//
// Rules are fail-open (warn) by default. naive.config.json foundation_lint.rules.<id>.mode
// set to "fail-closed" makes that rule's findings fail the run (exit 1).
// Every record is read through ventureFile. A missing or malformed record is skipped.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { ventureFile } from "../core/venture-paths.ts";

// A JSON object from a record that may be malformed: every field is unknown until checked. The generated record
// types describe valid records, and this lint reads any.
type Loose = { readonly [key: string]: unknown };
const isLoose = (v: unknown): v is Loose => !!v && typeof v === "object" && !Array.isArray(v);
/** A record at a logical path, or a skip. */
type Loaded = { status: "ok", file: string, value: Loose } | { status: "skipped", file: string } | { status: "absent" };
/** An ICP profile with the file it came from. */
type Profile = Loose & { readonly file: string };
/** One lint finding. */
export type Finding = { rule: string, mode: string, file: string, message: string, suggestion: string };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasPhrase = (text: string, term: unknown) => {
  const t = typeof term === "string" ? term.trim() : "";
  if (!t) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc(t)}(?=$|[^\\p{L}\\p{N}])`, "iu").test(text);
};
const jobsOf = (p: Loose) => (Array.isArray(p.jobs) ? p.jobs as unknown[] : []).filter((j): j is string => typeof j === "string" && j.trim() !== "");
const checkOf = (p: Loose) => (typeof p.check === "string" ? p.check.trim() : "");

export const RULES = [
  { id: "mission-names-no-icp", description: "A mission that names no ICP", severity: "warn", mode: "fail-open" },
  { id: "icp-no-jobs", description: "An ICP with no jobs", severity: "warn", mode: "fail-open" },
  { id: "alignment-no-check", description: "An alignment principle with no check", severity: "warn", mode: "fail-open" },
  { id: "problem-form-no-icp", description: "A problem form no ICP has", severity: "warn", mode: "fail-open" },
];

// A JSON file at a logical path, or a skip. Never throws. Directories are not records.
function loadRecord(dir: string, rels: string[]): Loaded {
  for (const rel of rels) {
    const f = ventureFile(dir, rel);
    let text;
    try {
      if (!existsSync(f) || !statSync(f).isFile()) continue;
      text = readFileSync(f, "utf8");
    } catch {
      return { status: "skipped", file: rel };
    }
    try {
      const value = JSON.parse(text);
      if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "skipped", file: rel };
      return { status: "ok", file: rel, value };
    } catch {
      return { status: "skipped", file: rel };
    }
  }
  return { status: "absent" };
}

const isProfile = isLoose;
const current = (profiles: Profile[]) => profiles.filter((p) => p.status !== "retired");

// foundation/icp/<id>.json when that folder holds profiles, else the single ICP record.
function icpProfiles(dir: string): { status: Loaded["status"], profiles: Profile[] } {
  try {
    const folder = ventureFile(dir, "foundation/icp");
    if (existsSync(folder) && statSync(folder).isDirectory()) {
      const names = readdirSync(folder).filter((n) => n.endsWith(".json")).sort();
      if (names.length) {
        const profiles: Profile[] = [];
        let skipped = false;
        for (const name of names) {
          const rel = `foundation/icp/${name}`;
          const got = loadRecord(dir, [rel]);
          if (got.status !== "ok") { skipped = true; continue; }
          if (Array.isArray(got.value.profiles)) {
            for (const p of got.value.profiles as unknown[]) {
              if (isProfile(p)) profiles.push({ ...p, file: rel });
              else skipped = true;
            }
          } else if (typeof got.value.id === "string") profiles.push({ ...got.value, file: rel });
          else skipped = true;
        }
        return { status: (profiles.length || !skipped) ? "ok" : "skipped", profiles };
      }
    }
  } catch {
    return { status: "skipped", profiles: [] };
  }
  const got = loadRecord(dir, ["foundation/icp.json", "purpose/icp.json"]);
  if (got.status !== "ok") return { status: got.status, profiles: [] };
  if (!Array.isArray(got.value.profiles)) return { status: "skipped", profiles: [] };
  return { status: "ok", profiles: (got.value.profiles as unknown[]).filter(isProfile).map((p) => ({ ...p, file: got.file })) };
}

function modesOf(dir: string): Record<string, string> {
  const got = loadRecord(dir, ["naive.config.json"]);
  const block = got.status === "ok" ? got.value.foundation_lint : null;
  const rules = isLoose(block) ? block.rules : null;
  const cfg: Loose = isLoose(rules) ? rules : {};
  return Object.fromEntries(RULES.map((r) => {
    const entry = cfg[r.id];
    const mode = isLoose(entry) ? entry.mode : undefined;
    return [r.id, mode === "fail-open" || mode === "fail-closed" ? mode : r.mode];
  }));
}

export function lint(dir: string) {
  const mode = modesOf(dir);
  const rules = RULES.map((r) => ({ ...r, mode: mode[r.id] }));
  const findings: Finding[] = [];
  const add = (rule: string, file: string, message: string, suggestion: string) => findings.push({ rule, mode: mode[rule], file, message, suggestion });
  const icp = icpProfiles(dir);
  const profiles = icp.status === "ok" ? current(icp.profiles) : [];

  const venture = loadRecord(dir, ["venture.json"]);
  const core = venture.status === "ok" && isLoose(venture.value.core) ? venture.value.core : undefined;
  const promise = typeof core?.promise === "string" ? core.promise.trim() : "";
  if (promise && icp.status !== "skipped") {
    const mission = [promise, core?.promised_to].filter((t) => typeof t === "string").join("\n");
    const named = profiles.some((p) => hasPhrase(mission, p.id) || hasPhrase(mission, p.short));
    const looked = profiles.map((p) => (typeof p.short === "string" && p.short.trim()) || p.id).filter(Boolean);
    if (!named) add("mission-names-no-icp", "venture.json", `the mission names no ICP${looked.length ? ` (${looked.join(", ")})` : ""}`, "name an ICP in core.promise or core.promised_to by its id or its short line");
  }

  if (icp.status === "ok") {
    for (const p of profiles) {
      if (jobsOf(p).length) continue;
      const who = typeof p.id === "string" && p.id ? p.id : "a profile";
      add("icp-no-jobs", p.file, `ICP ${who} has no jobs`, "add the jobs this profile is trying to get done");
    }
  }

  const alignment = loadRecord(dir, ["foundation/alignment.json", "purpose/alignment.json"]);
  if (alignment.status === "ok" && Array.isArray(alignment.value.principles)) {
    for (const p of alignment.value.principles as unknown[]) {
      if (!isProfile(p) || checkOf(p)) continue;
      const who = typeof p.id === "string" && p.id ? p.id : "a principle";
      add("alignment-no-check", alignment.file, `alignment principle ${who} has no check`, "name the test or script that holds this principle");
    }
  }

  const problem = loadRecord(dir, ["foundation/problem.json", "purpose/validation/problem.json"]);
  if (problem.status === "ok" && Array.isArray(problem.value.forms) && icp.status !== "skipped") {
    const claimed = new Set(profiles.flatMap((p) => (Array.isArray(p.problem_forms) ? p.problem_forms as unknown[] : []).filter((id) => typeof id === "string")));
    for (const form of problem.value.forms as unknown[]) {
      if (!isProfile(form) || typeof form.id !== "string" || !form.id || form.status === "dropped") continue;
      if (!claimed.has(form.id)) add("problem-form-no-icp", problem.file, `problem form ${form.id} is on no ICP`, `add ${form.id} to an ICP profile's problem_forms, or drop the form`);
    }
  }

  const failed = findings.some((x) => x.mode === "fail-closed");
  return { ok: !failed, rules, findings };
}

export { foundationLintCommands } from "../records/routes/commands.ts";

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(ventureFile(dir, "venture.json"))) {
    console.error("usage: node packages/naive/src/checks/lint-foundation.ts <venture dir> [--json]");
    process.exit(2);
  }
  const r = lint(dir);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.findings) console.log(`${x.mode === "fail-closed" ? "FAIL" : "WARN"}  [${x.rule}] ${x.file}: ${x.message} -> ${x.suggestion}`);
    console.log(`${r.findings.length} finding(s); ${r.ok ? "ok" : "failed (fail-closed rule)"}`);
  }
  process.exit(r.ok ? 0 : 1);
}
