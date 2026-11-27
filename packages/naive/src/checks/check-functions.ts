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
//     recommend row names its approver, and that approver holds, in the default delegation, a live grant of the
//     row's class that reaches the founder and whose scope is the venture or covers every folder the function's record
//     types sit in (functionScopes below), so the matrix never names an approver without authority,
//     and the approver is the founder, the chief of staff, the lead whose portfolio holds the function, or a role
//     the delegation grants that class to (EE-215);
//   - every capability cluster is in packages/naive/src/functions/it/capability-clusters.json;
//   - the intake names a workflow the module has, and that workflow's trigger is intake;
//   - every route a workflow or a step reads is one the router serves (readable below), and an event trigger's route
//     is one too, since a trigger on no route never fires;
//   - every workflow's measures are its function's, from function.json (EE-215); its goal and done criteria are
//     required by the schema;
//   - a step's skill is a skill of the module (skills/ at any depth, as the agent spec derives it); a step writes only
//     routes in the function's write reach (writeReach below, the same list the router enforces) and only routes the
//     router serves with a write action; a step raises only classes the module's decisions.json has a row for; a
//     step's activity is a level 4 element of packages/naive/src/functions/pcf.json or an activity in
//     packages/naive/src/functions/activities.json, under the function's APQC category (EE-168);
//   - every skill of the module is named by a step or by agent.md, so the agent is never handed a skill with no cue
//     for when to load it (EE-215);
//   - agent.md has frontmatter naming role <id>-agent, its function and the lead whose portfolio holds it; the six
//     sections AGENT_SECTIONS in that order; and a Writes: line whose routes are exactly the function's write reach,
//     so the prose an agent reads cannot drift from what the router allows (EE-215);
//   - an intake workflow asks only for what Discovery allows. Intake runs when a function is added, and a business can
//     add any function in Discovery, so a required step (one without `consider`) of a workflow whose trigger is intake
//     writes only record types that need-now suggests to every venture in Discovery. A record type need-now suggests
//     later, or never (master data), is written only by a step to consider, and that step's `when` names the phase the
//     record type starts in (the route table's first phase group). Need-now's priors are the one source of when a record
//     type starts (startOf in packages/naive/src/engine/need-now.ts); a route to no record type need-now lists, such
//     as decisions/*, is not checked.
// With --complete, a module must also have every piece: function.json, agent.md, decisions.json, at least two
// workflows, at least one skill, and at least one venture-level record type in data-model.json whose function is its
// id, and its function must sit in exactly one lead's portfolio. Until every module is filled, test.mjs runs it without.
//
// It reads files through VentureFs (EE-125). Findings exit 1; a shared file it needs (departments, decision rights,
// delegation, the cluster catalog, pcf.json, the activity catalog, need-now.json) that cannot be read exits 2.

import { join } from "node:path";
import { PLANS } from "../engine/access.ts";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { grantBacked, liveGrant, scopeWithin } from "../core/venture-paths.ts";
import type { Delegation } from "../records/types/records.d.ts";
import { recordsIn, venturePaths } from "../records/index.ts";
import { PHASES, resolve, routes } from "../records/routes/routes.ts";
import { startOf, type Prior } from "../engine/need-now.ts";
import { validateValue } from "../records/validate.ts";

const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const at = args.indexOf("--root");
const root = at >= 0 ? args[at + 1] : new URL("../../../..", import.meta.url).pathname;
const complete = flag("--complete");

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const schemaErrors = (schema: string, value: unknown): string[] => {
  const v = validateValue(schema, value);
  return v.status === 0 ? [] : (v.stdout + v.stderr).trim().split("\n").filter((l: string) => l && !/checked against/.test(l));
};
/** A shared file the check cannot do without: one that cannot be read means the check cannot run (exit 2). */
const required = (f: string) => readJson(f).pipe(Effect.mapError((e) => new CannotRun({ message: describe(e), cause: e })));
const ids = (v: unknown, key: string): string[] =>
  isObject(v) && Array.isArray(v[key]) ? v[key].flatMap((x: unknown) => (isObject(x) && typeof x.id === "string" ? [x.id] : [])) : [];

const FUNCTIONS = join(root, "packages/naive/src/functions");
const model = recordsIn(root).readDataModel() as { records: { id: string, function?: string | null, level?: string, paths?: string[] }[] };

/**
 * The folders a function's venture record types sit in, as delegation scopes: each record type's folder (the first
 * path's folder before its wildcard), widened to its top folder when no other function's record type sits under that
 * folder, and narrowed to nothing when another function's record type sits in the very same folder (shared, such as
 * governance/ or people/), since a scope is a folder and cannot name one file.
 */
export function functionScopes(records: typeof model.records, fn: string): { scopes: string[], shared: string[] } {
  const folderOf = (p: string) => { const head = p.includes("*") ? p.slice(0, p.indexOf("*")) : p; return head.includes("/") ? head.slice(0, head.lastIndexOf("/")) : ""; };
  const venture = records.filter((r) => r.level === "venture");
  const others = venture.filter((r) => r.function !== fn).flatMap((r) => venturePaths(r).map(folderOf));
  const scopes = new Set<string>(), shared = new Set<string>();
  for (const r of venture.filter((x) => x.function === fn)) {
    const first = venturePaths(r)[0];
    if (first === undefined) continue;
    const folder = folderOf(first);
    if (!folder || others.includes(folder)) { shared.add(folder || "(venture top)"); continue; }
    const top = folder.split("/")[0];
    scopes.add(others.some((o) => o === top || o.startsWith(`${top}/`)) ? folder : top);
  }
  return { scopes: [...scopes].filter((d) => ![...scopes].some((e) => e !== d && d.startsWith(`${e}/`))).sort(), shared: [...shared].sort() };
}
const ROLES = join(root, "packages/naive/template/governance/roles");

// The team plan sets every agent's reach, so no agent writes it, whichever function owns its record type.
// The routes each function may write: decisions, handoffs, and every record route whose record type the function owns
// and the router serves with a write action. This mirrors functionWrites in ../engine/agents/reach.ts, the list the
// router enforces, and is derived here so --root can check a copy of the repository.
const owner = new Map(model.records.map((r) => [r.id, r.function ?? null]));
const SHARED = ["decisions/*", "operations/handoff/*"];
export const writeReach = (fn: string): string[] => [...new Set([...SHARED,
  ...[...new Set((routes() as { kind: string, record?: string, route: string, actions?: string[], files?: string[] }[])
    .filter((r) => r.kind === "record" && r.record && owner.get(r.record) === fn && (r.actions ?? []).includes("write")
      && (r.files ?? []).length && !(r.files ?? []).some((f) => PLANS.includes(f)))
    .map((r) => r.route.replace("[id]", "*")))].sort()])];
const star = (route: string) => route.replace(/\[id\]/g, "*");
const reaches = (reach: readonly string[], route: string) => reach.some((r) => r === star(route)
  || (r.endsWith("/*") && star(route).startsWith(r.slice(0, -1))));

/** The sections every agent.md carries, in this order (EE-215). Extra sections are allowed between them. */
export const AGENT_SECTIONS = ["What you work toward", "What you own", "How you work", "When you do not know",
  "What you decide, and what you bring up", "Skills"];

/** Record routes the router serves without a write action, so a step that writes one is refused at run time. */
const NO_WRITE = new Set((routes() as { kind: string, route: string, actions?: string[] }[])
  .filter((r) => r.kind === "record" && !(r.actions ?? []).includes("write")).map((r) => r.route));

// What a workflow or a step may read: venture.json ("venture", which no route claims), a route, or a glob ending in
// /* that some route falls under. A read the router has no route for fails at run time, so it is a finding here.
const ROUTES = new Set((routes() as { route: string }[]).map((r) => r.route));
export const readable = (read: string): boolean => read === "venture" || ROUTES.has(read)
  || (read.endsWith("/*") && [...ROUTES].some((r) => r.startsWith(read.slice(0, -1))));

type Finding = { fn: string, file: string, error: string };
const PHASE_IDS = PHASES.map((p) => p.id);
const phaseName = (id: string) => PHASES.find((p) => p.id === id)?.name ?? id;

/** Checks every function module under root and returns the findings, in department order. */
export const checkFunctions = Effect.gen(function* () {
  const fs = yield* VentureFs;
  const departments = ids(yield* required(join(FUNCTIONS, "departments.json")), "departments");
  const classes = new Set(ids(yield* required(join(root, "packages/naive/template/governance/decision-rights.json")), "classes"));
  const delegation = yield* required(join(root, "packages/naive/template/governance/delegation.json"));
  const today = new Date().toISOString().slice(0, 10);
  const personOnly = new Set(isObject(delegation) ? [...strings(delegation.one_way_doors), ...strings(delegation.never_redelegated)] : []);
  const clusters = new Set(ids(yield* required(join(FUNCTIONS, "it/capability-clusters.json")), "clusters"));
  const roleFiles = (yield* fs.list(ROLES)).filter((f) => f.endsWith(".json"));
  const leads = (yield* Effect.forEach(roleFiles, (f) => readJson(join(ROLES, f)))).filter(isObject)
    .filter((r) => Array.isArray(r.portfolio)).map((r) => ({ id: String(r.id), portfolio: strings(r.portfolio) }));

  // Each function's APQC category number, APQC's level 4 activities and the activity catalog's ids with their category.
  const departmentsFile = yield* required(join(FUNCTIONS, "departments.json"));
  const category = new Map((isObject(departmentsFile) && Array.isArray(departmentsFile.departments) ? departmentsFile.departments.filter(isObject) : [])
    .map((d) => [String(d.id), isObject(d.apqc) ? String(d.apqc.id).split(".")[0] ?? "" : ""]));
  const pcf = yield* required(join(FUNCTIONS, "pcf.json"));
  const apqcActivities = new Set((isObject(pcf) && Array.isArray(pcf.elements) ? pcf.elements.filter(isObject) : []).filter((e) => e.level === 4).map((e) => String(e.id)));
  const catalog = yield* required(join(FUNCTIONS, "activities.json"));
  const catalogActivities = new Map((isObject(catalog) && Array.isArray(catalog.activities) ? catalog.activities.filter(isObject) : [])
    .map((a) => [String(a.id), String(a.process_group).split(".")[0] ?? ""]));
  /** Why a step's activity is wrong for a function, or null. */
  const activityError = (fn: string, id: string): string | null => {
    const apqc = /^\d/.test(id);
    if (apqc ? !apqcActivities.has(id) : !catalogActivities.has(id)) return `which is not ${apqc ? "a level 4 activity in pcf.json" : "an activity in activities.json"}`;
    const major = apqc ? id.split(".")[0] : catalogActivities.get(id);
    return major === category.get(fn) ? null : `which is under APQC category ${major}.0, not the function's ${category.get(fn)}.0`;
  };

  // When each record type starts, from need-now's priors. startsIn is undefined for a route to a record type need-now
  // does not list (decisions/*), which the intake rule does not check.
  const need = yield* required(join(root, "packages/naive/src/engine/need-now.json"));
  const priors: Record<string, Prior> = isObject(need) && isObject(need.records) ? need.records as Record<string, Prior> : {};
  const suggest = isObject(need) && typeof need.suggest === "number" ? need.suggest : 0.5;
  const startsIn = (route: string): { record: string, start: string | null } | undefined => {
    const r = resolve(route.replace(/\[[a-z]+\]|\*/g, "x")).r;
    if (r?.kind !== "record" || !priors[r.record]) return undefined;
    return { record: r.record, start: startOf(priors[r.record], PHASE_IDS, suggest).start };
  };

  const findings: Finding[] = [];
  const fail = (fn: string, file: string, error: string) => { findings.push({ fn, file, error }); };

  for (const fn of departments) {
    const dir = join(FUNCTIONS, fn);
    const rel = (f: string) => `packages/naive/src/functions/${fn}/${f}`;
    if (!(yield* fs.exists(dir))) { fail(fn, rel(""), "the function has no module folder"); continue; }
    // Every skills/ folder at any depth under the module, as functionAgent derives a spec's skills (skills/, kits/<kit>/skills/).
    const skills: string[] = [];
    for (const at = [dir]; at.length;) {
      const here = at.pop() as string;
      for (const e of yield* fs.list(here)) {
        if (e.startsWith(".") || e === "node_modules" || !(yield* fs.isDirectory(join(here, e)))) continue;
        if (e === "skills") { for (const s of yield* fs.list(join(here, e))) if (yield* fs.exists(join(here, e, s, "SKILL.md"))) skills.push(s); }
        else at.push(join(here, e));
      }
    }
    const reach = writeReach(fn);
    const leadOf = leads.filter((l) => l.portfolio.includes(fn)).map((l) => l.id);

    // The decision matrix.
    const rows = new Set<string>();
    if (yield* fs.exists(join(dir, "decisions.json"))) {
      const d = yield* readJson(join(dir, "decisions.json"));
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
          if (typeof row.approver === "string" && isObject(delegation)) {
            const del = delegation as Delegation, who = row.approver;
            const held = del.grants.filter((g) => g.to === who && g.classes.includes(c) && liveGrant(g, today) && grantBacked(del, g, today).ok);
            const { scopes } = functionScopes(model.records, fn);
            const uncovered = scopes.filter((f) => !held.some((g) => scopeWithin(f, g.scope)));
            if (!held.length) fail(fn, rel("decisions.json"), `class ${c} names approver ${who}, who holds no live grant of ${c} reaching ${del.root} in packages/naive/template/governance/delegation.json`);
            else if (uncovered.length) fail(fn, rel("decisions.json"), `class ${c} names approver ${who}, whose grants of ${c} do not cover ${uncovered.join(", ")}, where the function's records sit`);
          }
          if (row.level === "recommend" && row.approver && !["founder", "chief-of-staff", ...leadOf].includes(String(row.approver))
            && !(isObject(delegation) && (delegation as Delegation).grants.some((g) => g.to === row.approver && g.classes.includes(c) && liveGrant(g, today)))) {
            fail(fn, rel("decisions.json"), `class ${c} recommends to ${String(row.approver)}, who is not in this function's line and holds no grant of ${c}: the approver is founder, chief-of-staff, ${leadOf.join(" or ") || "the lead whose portfolio holds the function"}, or a role delegation.json grants ${c}`);
          }
        }
      }
    } else if (complete) fail(fn, rel("decisions.json"), "missing");

    // Workflows. The manifest is read first, because a workflow's measures must be its function's.
    const manifest = (yield* fs.exists(join(dir, "function.json"))) ? yield* readJson(join(dir, "function.json")) : null;
    const measures = new Set(isObject(manifest) ? strings(manifest.measures) : []);
    const workflows = new Map<string, Record<string, unknown>>();
    const named = new Set<string>();
    const wdir = join(dir, "workflows");
    for (const f of (yield* fs.list(wdir)).filter((x) => x.endsWith(".json"))) {
      const w = yield* readJson(join(wdir, f));
      const file = rel(`workflows/${f}`);
      for (const e of schemaErrors("function-workflow.schema.json", w)) fail(fn, file, e);
      if (!isObject(w)) continue;
      workflows.set(String(w.id), w);
      if (`${String(w.id)}.json` !== f) fail(fn, file, `id ${String(w.id)} is not the file's name`);
      if (w.function !== fn) fail(fn, file, `names function ${String(w.function)}, not ${fn}`);
      const steps = Array.isArray(w.steps) ? w.steps.filter(isObject) : [];
      for (const r of strings(w.reads)) if (!readable(r)) fail(fn, file, `reads ${r}, which no route serves`);
      for (const m of strings(w.measures)) if (!measures.has(m)) fail(fn, file, `moves measure kind ${m}, which function.json does not list for ${fn}`);
      if (isObject(w.trigger) && w.trigger.kind === "event" && typeof w.trigger.route === "string" && !readable(w.trigger.route)) {
        fail(fn, file, `its event trigger watches ${w.trigger.route}, which no route serves, so it never fires`);
      }
      if (steps.length && steps.every((s) => isObject(s.consider))) fail(fn, file, "every step is one to consider; a workflow has at least one required step");
      for (const s of Array.isArray(w.steps) ? w.steps.filter(isObject) : []) {
        if (s.skill && !skills.includes(String(s.skill))) fail(fn, file, `step ${String(s.id)} loads skill ${String(s.skill)}, which skills/ does not have`);
        if (typeof s.skill === "string") named.add(s.skill);
        for (const r of strings(s.reads)) if (!readable(r)) fail(fn, file, `step ${String(s.id)} reads ${r}, which no route serves`);
        for (const r of strings(s.writes)) if (!reaches(reach, r)) fail(fn, file, `step ${String(s.id)} writes ${r}, outside the function's write reach`);
        for (const r of strings(s.writes)) if (NO_WRITE.has(r)) fail(fn, file, `step ${String(s.id)} writes ${r}, which the router serves without a write action, so the write is refused`);
        for (const c of strings(s.raises)) if (!rows.has(c)) fail(fn, file, `step ${String(s.id)} raises ${c}, which decisions.json has no row for`);
        if (typeof s.activity === "string") { const e = activityError(fn, s.activity); if (e) fail(fn, file, `step ${String(s.id)} performs activity ${s.activity}, ${e}`); }
        if (!isObject(w.trigger) || w.trigger.kind !== "intake") continue;
        for (const r of strings(s.writes)) {
          const at = startsIn(r);
          if (!at || at.start === "discovery") continue;
          const when = at.start ? `from ${phaseName(at.start)}` : "only when a person asks for it (need-now never suggests it)";
          if (!isObject(s.consider)) fail(fn, file, `intake step ${String(s.id)} is required but writes ${r}, whose record type ${at.record} need-now suggests ${when}; make it a step to consider`);
          else if (at.start && !(typeof s.consider.when === "string" && s.consider.when.includes(phaseName(at.start)))) fail(fn, file, `intake step ${String(s.id)} writes ${r}, which starts in ${phaseName(at.start)}, but its consider.when does not name ${phaseName(at.start)}`);
        }
      }
    }
    if (complete && workflows.size < 2) fail(fn, rel("workflows/"), `has ${workflows.size} workflow${workflows.size === 1 ? "" : "s"}; a complete module has at least two`);

    // The manifest.
    if (manifest !== null) {
      for (const e of schemaErrors("function-module.schema.json", manifest)) fail(fn, rel("function.json"), e);
      if (isObject(manifest)) {
        if (manifest.id !== fn) fail(fn, rel("function.json"), `id ${String(manifest.id)} is not the folder's name`);
        for (const c of strings(manifest.clusters)) if (!clusters.has(c)) fail(fn, rel("function.json"), `cluster ${c} is not in capability-clusters.json`);
        const intake = workflows.get(String(manifest.intake));
        if (!intake) fail(fn, rel("function.json"), `intake ${String(manifest.intake)} is not a workflow in workflows/`);
        else if (!isObject(intake.trigger) || intake.trigger.kind !== "intake") fail(fn, rel("function.json"), `intake ${String(manifest.intake)} has a trigger other than intake`);
      }
    } else if (complete) fail(fn, rel("function.json"), "missing");

    // The agent.
    if (yield* fs.exists(join(dir, "agent.md"))) {
      const text = yield* fs.readText(join(dir, "agent.md"));
      const front = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "";
      if (!new RegExp(`^role: ${fn}-agent$`, "m").test(front)) fail(fn, rel("agent.md"), `frontmatter does not name role: ${fn}-agent`);
      if (!new RegExp(`^function: ${fn}$`, "m").test(front)) fail(fn, rel("agent.md"), `frontmatter does not name function: ${fn}`);
      const lead = /^lead: (.+)$/m.exec(front)?.[1]?.trim();
      if (leadOf.length === 1 && lead !== leadOf[0]) fail(fn, rel("agent.md"), `frontmatter names lead ${lead ?? "none"}, but ${leadOf[0]} is the lead whose portfolio holds ${fn}`);

      // The sections an agent reads, in order: what it works toward, what it owns, how it works, what to do when it
      // does not know, what it decides, and its skills (EE-215).
      const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
      const missing = AGENT_SECTIONS.filter((s) => !headings.includes(s));
      if (missing.length) fail(fn, rel("agent.md"), `has no "## ${missing.join('" and no "## ')}" section`);
      else {
        const order = AGENT_SECTIONS.map((s) => headings.indexOf(s));
        if (order.some((at, i) => i > 0 && at < order[i - 1])) fail(fn, rel("agent.md"), `its sections are out of order: they read ${headings.filter((h) => AGENT_SECTIONS.includes(h)).join(", ")}, and the order is ${AGENT_SECTIONS.join(", ")}`);
      }

      // The Writes line is the write reach in prose, so it must say exactly what the router allows.
      const writesLine = text.split("\n").find((l) => l.startsWith("Writes: "));
      if (!writesLine) fail(fn, rel("agent.md"), 'has no "Writes: " line under "## What you own", so the agent is not told what it may write');
      else {
        const claimed = new Set([...writesLine.matchAll(/`([^`]+)`/g)].map((m) => star(m[1])).filter((t) => !t.includes(".")));
        const extra = [...claimed].filter((t) => !reach.includes(t));
        const absent = reach.filter((t) => !claimed.has(t));
        if (extra.length) fail(fn, rel("agent.md"), `its Writes line claims ${extra.join(", ")}, which is outside the function's write reach, so the router refuses it`);
        if (absent.length) fail(fn, rel("agent.md"), `its Writes line leaves out ${absent.join(", ")}, which the function may write`);
      }

      // A skill the agent is never told to load is a skill it will not use.
      const unnamed = skills.filter((s) => !named.has(s) && !text.includes(`\`${s}\``));
      if (unnamed.length) fail(fn, rel("agent.md"), `never names skill${unnamed.length === 1 ? "" : "s"} ${unnamed.join(", ")}, which the module ships, so the agent has no cue for when to load ${unnamed.length === 1 ? "it" : "them"}`);
    } else if (complete) fail(fn, rel("agent.md"), "missing");

    if (complete) {
      if (!skills.length) fail(fn, rel("skills/"), "has no skill");
      if (!model.records.some((r) => r.function === fn && r.level === "venture")) fail(fn, "the data model", "the function owns no venture record type, so its agent could write nothing of its own");
      const in_ = leads.filter((l) => l.portfolio.includes(fn));
      if (in_.length !== 1) fail(fn, "packages/naive/template/governance/roles/", `sits in ${in_.length} lead portfolios; it must sit in exactly one`);
    }
  }
  return { departments, findings };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  await runMain(Effect.map(checkFunctions, ({ departments, findings }) => {
    if (flag("--json")) console.log(JSON.stringify({ ok: findings.length === 0, complete, findings }, null, 2));
    else {
      for (const f of findings) console.log(`FAIL  ${f.fn}: ${f.file}: ${f.error}`);
      console.log(findings.length ? `\n${findings.length} finding${findings.length === 1 ? "" : "s"}` : `function modules: ${departments.length} checked${complete ? ", every one complete" : ""}`);
    }
    process.exitCode = findings.length ? 1 : 0;
  }));
}
