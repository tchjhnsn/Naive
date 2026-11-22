// Checks the 13 function modules (packages/naive/src/functions/<id>/): each one a folder with a manifest, an agent,
// workflows, a decision matrix and skills, agreeing with the data Naive already has.
//
//   node packages/naive/src/checks/check-functions.ts [--complete] [--json] [--root <repo copy>]
//
// Always, for every file a module has:
//   - function.json, decisions.json and workflows/*.json match their schemas (function-module, function-decisions,
//     function-workflow), and each names its own function and, for a workflow, its own file;
//   - every decision class is a class in packages/naive/template/governance/decision-rights.json, and a class in
//     delegation.json one_way_doors or never_redelegated is escalate (a function's matrix never loosens them); a
//     recommend row names its approver;
//   - every capability cluster is in packages/naive/src/functions/it/capability-clusters.json;
//   - the intake names a workflow the module has, and that workflow's trigger is intake;
//   - a step's skill is a folder in the module's skills/ with a SKILL.md; a step writes only routes in the function's
//     write reach (WRITE_REACH below); a step raises only classes the module's decisions.json has a row for;
//   - agent.md has frontmatter naming role <id>-agent and its function.
// With --complete, a module must also have every piece: function.json, agent.md, decisions.json, at least two
// workflows, at least one skill, and at least one venture-level record type in data-model.json whose function is its
// id, and its function must sit in exactly one lead's portfolio. Until every module is filled, test.mjs runs it without.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PLANS } from "../engine/access.mjs";
import { recordsIn } from "../records/index.mjs";
import { routes } from "../records/routes/routes.mjs";
import { validateValue } from "../records/validate.mjs";

const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const at = args.indexOf("--root");
const root = at >= 0 ? args[at + 1] : new URL("../../../..", import.meta.url).pathname;
const complete = flag("--complete");

const readJson = (f: string): unknown => JSON.parse(readFileSync(f, "utf8"));
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const schemaErrors = (schema: string, value: unknown): string[] => {
  const v = validateValue(schema, value);
  return v.status === 0 ? [] : (v.stdout + v.stderr).trim().split("\n").filter((l: string) => l && !/checked against/.test(l));
};

const FUNCTIONS = join(root, "packages/naive/src/functions");
const departments = (readJson(join(FUNCTIONS, "departments.json")) as { departments: { id: string }[] }).departments.map((d) => d.id);
const rights = readJson(join(root, "packages/naive/template/governance/decision-rights.json")) as { classes: { id: string }[] };
const classes = new Set(rights.classes.map((c) => c.id));
const delegation = readJson(join(root, "packages/naive/template/governance/delegation.json")) as { one_way_doors: string[], never_redelegated: string[] };
const personOnly = new Set([...delegation.one_way_doors, ...delegation.never_redelegated]);
const clusters = new Set((readJson(join(FUNCTIONS, "it/capability-clusters.json")) as { clusters: { id: string }[] }).clusters.map((c) => c.id));
const model = recordsIn(root).readDataModel() as { records: { id: string, function?: string | null, level?: string }[] };
const ROLES = join(root, "packages/naive/template/governance/roles");
const leads = readdirSync(ROLES).filter((f) => f.endsWith(".json")).map((f) => readJson(join(ROLES, f))).filter(isObject)
  .filter((r) => Array.isArray(r.portfolio)).map((r) => ({ id: String(r.id), portfolio: strings(r.portfolio) }));

// The team plan sets every agent's reach, so no agent writes it, whichever function owns its record type.
// The routes each function may write: decisions, handoffs, and every record route whose record type the function owns.
const owner = new Map(model.records.map((r) => [r.id, r.function ?? null]));
const SHARED = ["decisions/*", "decisions/[id]", "operations/handoff/[id]"];
export const writeReach = (fn: string): Set<string> => new Set([...SHARED,
  ...(routes() as { kind: string, record?: string, route: string, files?: string[] }[]).filter((r) => r.kind === "record" && r.record && owner.get(r.record) === fn
    && !(r.files ?? []).some((f) => PLANS.includes(f))).map((r) => r.route)]);
const reaches = (reach: Set<string>, route: string) => reach.has(route) || [...reach].some((r) => r.endsWith("/*") && route.startsWith(r.slice(0, -1)));

type Finding = { fn: string, file: string, error: string };
const findings: Finding[] = [];
const fail = (fn: string, file: string, error: string) => findings.push({ fn, file, error });

for (const fn of departments) {
  const dir = join(FUNCTIONS, fn);
  const rel = (f: string) => `packages/naive/src/functions/${fn}/${f}`;
  if (!existsSync(dir)) { fail(fn, rel(""), "the function has no module folder"); continue; }
  const skills = existsSync(join(dir, "skills")) ? readdirSync(join(dir, "skills")).filter((s) => existsSync(join(dir, "skills", s, "SKILL.md"))) : [];
  const reach = writeReach(fn);

  // The decision matrix.
  const rows = new Set<string>();
  if (existsSync(join(dir, "decisions.json"))) {
    const d = readJson(join(dir, "decisions.json"));
    for (const e of schemaErrors("function-decisions.schema.json", d)) fail(fn, rel("decisions.json"), e);
    if (isObject(d)) {
      if (d.function !== fn) fail(fn, rel("decisions.json"), `names function ${String(d.function)}, not ${fn}`);
      for (const row of Array.isArray(d.rows) ? d.rows.filter(isObject) : []) {
        const c = String(row.class);
        if (rows.has(c)) fail(fn, rel("decisions.json"), `class ${c} has two rows`);
        rows.add(c);
        if (!classes.has(c)) fail(fn, rel("decisions.json"), `class ${c} is not in decision-rights.json`);
        if (personOnly.has(c) && row.level !== "escalate") fail(fn, rel("decisions.json"), `class ${c} is a one-way door or never redelegated, so it must be escalate, not ${String(row.level)}`);
        if (row.level === "recommend" && !row.approver) fail(fn, rel("decisions.json"), `class ${c} is recommend but names no approver`);
      }
    }
  } else if (complete) fail(fn, rel("decisions.json"), "missing");

  // Workflows.
  const workflows = new Map<string, Record<string, unknown>>();
  const wdir = join(dir, "workflows");
  for (const f of existsSync(wdir) ? readdirSync(wdir).filter((x) => x.endsWith(".json")) : []) {
    const w = readJson(join(wdir, f));
    const file = rel(`workflows/${f}`);
    for (const e of schemaErrors("function-workflow.schema.json", w)) fail(fn, file, e);
    if (!isObject(w)) continue;
    workflows.set(String(w.id), w);
    if (`${String(w.id)}.json` !== f) fail(fn, file, `id ${String(w.id)} is not the file's name`);
    if (w.function !== fn) fail(fn, file, `names function ${String(w.function)}, not ${fn}`);
    for (const s of Array.isArray(w.steps) ? w.steps.filter(isObject) : []) {
      if (s.skill && !skills.includes(String(s.skill))) fail(fn, file, `step ${String(s.id)} loads skill ${String(s.skill)}, which skills/ does not have`);
      for (const r of strings(s.writes)) if (!reaches(reach, r)) fail(fn, file, `step ${String(s.id)} writes ${r}, outside the function's write reach`);
      for (const c of strings(s.raises)) if (!rows.has(c)) fail(fn, file, `step ${String(s.id)} raises ${c}, which decisions.json has no row for`);
    }
  }
  if (complete && workflows.size < 2) fail(fn, rel("workflows/"), `has ${workflows.size} workflow${workflows.size === 1 ? "" : "s"}; a complete module has at least two`);

  // The manifest.
  if (existsSync(join(dir, "function.json"))) {
    const m = readJson(join(dir, "function.json"));
    for (const e of schemaErrors("function-module.schema.json", m)) fail(fn, rel("function.json"), e);
    if (isObject(m)) {
      if (m.id !== fn) fail(fn, rel("function.json"), `id ${String(m.id)} is not the folder's name`);
      for (const c of strings(m.clusters)) if (!clusters.has(c)) fail(fn, rel("function.json"), `cluster ${c} is not in capability-clusters.json`);
      const intake = workflows.get(String(m.intake));
      if (!intake) fail(fn, rel("function.json"), `intake ${String(m.intake)} is not a workflow in workflows/`);
      else if (!isObject(intake.trigger) || intake.trigger.kind !== "intake") fail(fn, rel("function.json"), `intake ${String(m.intake)} has a trigger other than intake`);
    }
  } else if (complete) fail(fn, rel("function.json"), "missing");

  // The agent.
  if (existsSync(join(dir, "agent.md"))) {
    const text = readFileSync(join(dir, "agent.md"), "utf8");
    const front = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "";
    if (!new RegExp(`^role: ${fn}-agent$`, "m").test(front)) fail(fn, rel("agent.md"), `frontmatter does not name role: ${fn}-agent`);
    if (!new RegExp(`^function: ${fn}$`, "m").test(front)) fail(fn, rel("agent.md"), `frontmatter does not name function: ${fn}`);
  } else if (complete) fail(fn, rel("agent.md"), "missing");

  if (complete) {
    if (!skills.length) fail(fn, rel("skills/"), "has no skill");
    if (!model.records.some((r) => r.function === fn && r.level === "venture")) fail(fn, "the data model", "the function owns no venture record type, so its agent could write nothing of its own");
    const in_ = leads.filter((l) => l.portfolio.includes(fn));
    if (in_.length !== 1) fail(fn, "packages/naive/template/governance/roles/", `sits in ${in_.length} lead portfolios; it must sit in exactly one`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (flag("--json")) console.log(JSON.stringify({ ok: findings.length === 0, complete, findings }, null, 2));
  else {
    for (const f of findings) console.log(`FAIL  ${f.fn}: ${f.file}: ${f.error}`);
    console.log(findings.length ? `\n${findings.length} finding${findings.length === 1 ? "" : "s"}` : `function modules: ${departments.length} checked${complete ? ", every one complete" : ""}`);
  }
  process.exitCode = findings.length ? 1 : 0;
}
