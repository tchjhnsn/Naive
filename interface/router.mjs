// The route table and its actions, shared by the CLI, the MCP server and the HTTP API (EE-030,
// EE-032). Routes are generated from the data model and the kit manifests, never written by hand,
// so they cannot drift from the files. The conventions follow the Next.js App Router:
//
//   segments      a route is <layer>[/<kit>]/<record>; layers stay in the path, so a route is the
//                 record's folder path (purpose/validation/problem -> purpose/validation/problem.json)
//   [id]          a collection (products, accounts, handoffs, evidence) has a list route and an
//                 item route: purpose/product and purpose/product/[id]
//   [...venture]  the venture is the dynamic segment in front of every route: an id, or its folder
//                 path for a nested venture (studio/print)
//   route         record routes: read, write, check, template; command routes: run
//   page          view: a Markdown page of a record or command result, for people
//   layout        layout: the context wrapping a route (system, layer and kit purpose, references,
//                 skills, the gate and what need-now says), given to an agent before it acts
//   not-found     read of a missing record answers with its template and need-now status
//   loading       read of a record with an agent's draft waiting says so
//   error         a failed check or write answers with the kit's skills and the template to fix it
//   (group)       route groups by phase: (discovery) ... (platform) gather the routes need-now
//                 suggests in that phase, with the phase as their layout; the path is unchanged
//   @slot         system/overview renders slots side by side (telos, validation, need-now, ready,
//                 team, provenance); a failing slot shows its error and the others still render
//   _private      _drafts/ is never routed
//   proxy         gates run before a write: the schema, the decision class the data model gives the
//                 record (escalate -> an agent's write is a draft), and the role's allowed routes
//   robots        a team-plan role may list the routes it may read and write; system/robots shows them
//   aliases       interface/route-aliases.json maps a renamed route to its new one, with a note
//
// Partial adoption: a route needs only its own record and what its kit reads.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { agentFromEnv, entries as provEntries, record as prov } from "./provenance.mjs";

export const repo = new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const defaultWorkspace = () => process.env.MENTURA_WORKSPACE ?? join(repo, "instance");
export const PHASES = load(join(repo, "purpose/frameworks/product-anatomy/phases.json")).phases;

export const glob = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*\*/g, "\u0001").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*").replace(/\u0001/g, ".*") + "$");
// A venture's files, stopping at a nested venture (which has its own records) and skipping dot and private folders.
export const files = (d, base = d) => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.name.startsWith(".") ? [] : e.isDirectory() ? (existsSync(join(d, e.name, "venture.json")) || (d === base && e.name.startsWith("_")) ? [] : files(join(d, e.name), base)) : [join(d, e.name).slice(base.length + 1)]) : [];

export function kits() {
  const model = load(join(repo, "schema/data-model.json"));
  const paths = [...model.layers.map((l) => `${l}/kit.json`), "schema/kit.json"];
  for (const l of model.layers) {
    const k = join(repo, l, "kits");
    if (existsSync(k)) for (const d of readdirSync(k)) if (existsSync(join(k, d, "kit.json"))) paths.push(`${l}/kits/${d}/kit.json`);
  }
  return paths.filter((p) => existsSync(join(repo, p))).map((p) => ({ path: p, ...load(join(repo, p)) }));
}

const needNowPriors = () => load(join(repo, "schema/need-now.json"));

/** The route table, generated from schema/data-model.json, the kit manifests and schema/need-now.json. */
export function routes() {
  const model = load(join(repo, "schema/data-model.json"));
  const ks = kits();
  const owner = new Map(ks.flatMap((k) => k.records.map((r) => [r, k])));
  const N = needNowPriors();
  const out = [];
  for (const r of model.records.filter((x) => x.level === "venture" && x.id !== "venture")) {
    const k = owner.get(r.id);
    const sub = k?.path.match(/^[a-z]+\/kits\/([^/]+)\//)?.[1];
    const short = sub && r.id.startsWith(`${sub}-`) ? r.id.slice(sub.length + 1) : r.id;
    const filesOf = r.paths.filter((p) => p.startsWith("instance/**/")).map((p) => p.slice("instance/**/".length));
    // The template is <kit folder>/templates/<record>.md, or one whose name starts <record>- (telos-based-smart.md).
    const tdir = k ? join(dirname(k.path), "templates") : null;
    const tname = tdir && existsSync(join(repo, tdir)) ? readdirSync(join(repo, tdir)).filter((f) => f === `${short}.md` || (f.startsWith(`${short}-`) && f.endsWith(".md"))).sort((a, b) => (a === `${short}.md` ? -1 : b === `${short}.md` ? 1 : a.localeCompare(b)))[0] : null;
    const template = tname ? `${tdir}/${tname}` : null;
    const checks = [...new Set((r.refs ?? []).map((x) => x.checked_by).filter((c) => c && c.startsWith("schema/check-") && c !== "schema/check-data-model.mjs"))];
    const base = [r.layer === "system" ? "system" : r.layer, sub, short].filter(Boolean).join("/");
    const form = r.form ?? "json";
    const writable = r.schema && form === "json" && filesOf.length === 1;
    const groups = PHASES.map((p) => p.id).filter((p) => (N.records[r.id]?.base?.[p] ?? 0) >= N.suggest).map((p) => `(${p})`);
    const common = { kind: "record", record: r.id, layer: r.layer, kit: k?.kit ?? null, kit_path: k?.path ?? null, schema: r.schema, form, checks, template,
      decision_class: r.decision_class ?? null, groups, note: r.note ?? "" };
    // A collection's one wildcard is a whole id at the start of a path segment (products/*.json, accounts/*/account.json).
    const collection = filesOf.length === 1 && (filesOf[0].match(/\*/g) ?? []).length === 1 && /(^|\/)\*[./]/.test(filesOf[0]) && !filesOf[0].includes("**");
    if (collection) {
      out.push({ ...common, route: base, files: filesOf, collection: "list", actions: ["read", "view", "layout", ...(checks.length ? ["check"] : []), ...(template ? ["template"] : [])] });
      out.push({ ...common, route: `${base}/[id]`, files: filesOf, collection: "item",
        actions: ["read", "view", "layout", ...(writable ? ["write"] : []), ...(checks.length ? ["check"] : []), ...(template ? ["template"] : [])] });
    } else {
      out.push({ ...common, route: base, files: filesOf,
        actions: ["read", "view", "layout", ...(writable && !filesOf[0].includes("*") ? ["write"] : []), ...(checks.length ? ["check"] : []), ...(template ? ["template"] : [])] });
    }
  }
  const cmd = (route, script, note, extra = {}) => ({ route, kind: "command", actions: ["run", "view", "layout"], script, groups: [], note, ...extra });
  out.push(
    cmd("system/need-now", "schema/need-now.mjs", "What the venture needs now, soon, or should hold back (EE-028)"),
    cmd("system/time-to-ready", "schema/time-to-ready.mjs", "Time to running, and to ready per layer and MAD tier"),
    cmd("purpose/validation/score", "schema/check-validation.mjs", "The validation score from graded evidence (EE-026)", { args: ["--score"] }),
    cmd("governance/payouts", "schema/payouts.mjs", "Who gets what at a sale value, from the cap table (EE-022); input value, else the scenarios in exit.json", { needs: ["governance/ownership.json"], venture_arg: "id" }),
    cmd("system/overview", null, "The venture at a glance: telos, validation, need-now, time to ready, team and recent provenance, rendered as parallel slots", { internal: "overview" }),
    cmd("system/robots", null, "Which roles may read and write which routes, from the team plan", { internal: "robots" }),
  );
  return out.sort((a, b) => a.route.localeCompare(b.route));
}

/** Route groups: (phase) gathers the routes need-now suggests in that phase. The path is unchanged. */
export function groups() {
  const rs = routes();
  return PHASES.map((p) => ({ group: `(${p.id})`, phase: p.id, question: p.question, gate: p.gate, routes: rs.filter((r) => r.groups.includes(`(${p.id})`)).map((r) => r.route) }));
}

// Aliases for renamed routes (stability): interface/route-aliases.json, or MENTURA_ROUTE_ALIASES.
function aliases() {
  const f = process.env.MENTURA_ROUTE_ALIASES ?? join(repo, "interface/route-aliases.json");
  return existsSync(f) ? load(f).aliases : [];
}

/** Matches a concrete route (purpose/product/kettle) to its table entry and params. Follows aliases. */
export function resolve(route) {
  const rs = routes();
  const alias = aliases().find((a) => a.from === route || route.startsWith(`${a.from}/`));
  const concrete = alias ? alias.to + route.slice(alias.from.length) : route;
  const exact = rs.find((r) => r.route === concrete);
  if (exact) return { r: exact, params: {}, alias };
  for (const r of rs.filter((x) => x.route.endsWith("/[id]"))) {
    const head = r.route.slice(0, -"/[id]".length);
    if (concrete.startsWith(`${head}/`) && !concrete.slice(head.length + 1).includes("/")) return { r, params: { id: concrete.slice(head.length + 1) }, alias };
  }
  return { r: null, params: {}, alias };
}

const walkVentures = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") || e.name.startsWith("_") ? []
  : e.isDirectory() ? walkVentures(join(d, e.name)) : e.name === "venture.json" ? [d] : []);

/**
 * Finds a venture folder ([...venture]): by id, or by its folder path under the workspace or its
 * ventures/ folder, so a nested venture can be named studio/print.
 */
export function ventureDir(id, workspace = defaultWorkspace()) {
  if (!id) return null;
  if (id.includes("/")) {
    for (const base of [workspace, join(workspace, "ventures")]) {
      const d = join(base, id);
      if (!relative(workspace, d).startsWith("..") && existsSync(join(d, "venture.json"))) return d;
    }
    return null;
  }
  for (const d of walkVentures(workspace)) if (load(join(d, "venture.json")).id === id) return d;
  return null;
}

/** The ventures under a workspace: id, name, phase, path (the [...venture] segment) and folder. */
export function ventures(workspace = defaultWorkspace()) {
  const root = existsSync(join(workspace, "ventures")) ? join(workspace, "ventures") : workspace;
  return walkVentures(workspace).map((d) => { const v = load(join(d, "venture.json")); return { id: v.id, name: v.name, phase: v.phase, path: relative(root, d), dir: d }; });
}

// The venture's decision rights: the template, tightened by the venture's own file.
function decisionRights(dir) {
  const t = load(join(repo, "governance/venture-template/decision-rights.json"));
  const classes = new Map(t.classes.map((c) => [c.id, c]));
  const own = join(dir, "governance/decision-rights.json");
  if (existsSync(own)) for (const c of load(own).classes) classes.set(c.id, { ...classes.get(c.id), ...c, level: classes.get(c.id)?.level === "escalate" ? "escalate" : c.level });
  return classes;
}

/** The gate on a record: its decision class from the data model, and whether an agent's write is a draft. */
export function gateOf(r, dir) {
  if (!r.decision_class) return null;
  const c = dir ? decisionRights(dir).get(r.decision_class) : null;
  const level = c?.level ?? "escalate";
  return { class: r.decision_class, owner: c?.owner ?? null, level, drafts: level === "escalate" || level === "recommend-approve" };
}

// Robots: a team-plan role may list the routes it may read and write (globs over routes).
function allowed(dir, actorId, action, route) {
  if (!actorId || !dir) return true;
  const plan = join(dir, "operations/team-plan.json");
  if (!existsSync(plan)) return true;
  const role = load(plan).roles.find((x) => x.id === actorId);
  if (!role?.routes) return true;
  const list = action === "write" ? role.routes.write ?? [] : role.routes.read ?? ["**"];
  return list.some((g) => glob(g).test(route));
}

const fileFor = (r, params) => r.collection === "item" ? r.files[0].replace("*", params.id) : r.files[0];
const draftPath = (file) => join("_drafts", `${file.replace(/\//g, "__")}.draft`);

/** Where an agent's draft of a gated record waits: { dir, file, draft, gate } or null. */
export function draftOf(route, venture, workspace) {
  const { r, params } = resolve(route);
  const dir = ventureDir(venture, workspace);
  if (!r || r.kind !== "record" || r.collection === "list" || !dir) return null;
  const file = fileFor(r, params);
  return { dir, file, draft: draftPath(file), gate: gateOf(r, dir), route: r.collection === "item" ? r.route.replace("[id]", params.id) : r.route };
}

/** The layout wrapping a route: system, layer and kit context, references, skills, the gate and need-now. */
export function layout(r, dir) {
  const ks = kits();
  const stack = [ks.find((k) => k.path === "schema/kit.json"), ks.find((k) => k.path === `${r.layer ?? r.route.split("/")[0]}/kit.json`), r.kit_path && r.kit_path.includes("/kits/") ? ks.find((k) => k.path === r.kit_path) : null]
    .filter(Boolean).map((k) => {
      const refs = [join(dirname(k.path), "references/references.json"), join(dirname(k.path), "references")].find((p) => existsSync(join(repo, p)));
      return { kit: k.kit, path: k.path, purpose: k.purpose, skills: k.skills.map((s) => s.path), references: refs ?? null, gaps: k.gaps ?? [] };
    });
  const out = { route: r.route, stack, note: r.note, groups: r.groups ?? [] };
  if (r.kind === "record") Object.assign(out, { schema: r.schema, template: r.template, checks: r.checks, gate: gateOf(r, dir) });
  if (dir && r.kind === "record") {
    try {
      const nn = JSON.parse(spawnSync("node", [join(repo, "schema/need-now.mjs"), dir, "--json"], { encoding: "utf8" }).stdout);
      const row = nn.rows.find((x) => x.type === r.record);
      if (row) out.need_now = { phase: nn.phase, status: row.status, now: row.now, next: row.next, why: row.why };
    } catch {}
  }
  return out;
}

const fix = (r) => ({ skills: r.kit_path ? kits().find((k) => k.path === r.kit_path)?.skills.map((s) => s.path) ?? [] : [], template: r.template ?? null, schema: r.schema ?? null });

/**
 * Runs one action on one route for one venture. Returns { ok, result } or { ok: false, error }.
 * input: the record to write (write), or { value } for payouts; actor: "person" or "agent" (default
 * agent); actor_id: the role acting (default MENTURA_ACTOR_ID), checked against the team plan's
 * routes; via: the interface (cli, mcp, api; default router); provenance: { derived_from,
 * decision, note, agent } for the log.
 */
export function call({ venture, route, action, input, actor = "agent", actor_id = process.env.MENTURA_ACTOR_ID, workspace, via = "router", provenance = {} }) {
  const { r, params, alias } = resolve(route);
  if (!r) return { ok: false, error: `no route ${route}` };
  const deprecated = alias ? { deprecated: `${alias.from} is now ${alias.to}${alias.note ? `: ${alias.note}` : ""}` } : {};
  route = r.collection === "item" ? r.route.replace("[id]", params.id) : r.route;
  if (!r.actions.includes(action)) return { ok: false, error: `${route} has no action ${action} (it has ${r.actions.join(", ")})` };
  if (action === "template") return { ok: true, result: readFileSync(join(repo, r.template), "utf8"), ...deprecated };
  const dir = venture ? ventureDir(venture, workspace) : null;
  if (action === "layout") { if (venture && !dir) return { ok: false, error: `no venture ${venture}` }; return { ok: true, result: layout(r, dir), ...deprecated }; }
  if (!dir) return { ok: false, error: `no venture ${venture}` };
  if (!allowed(dir, actor_id, action === "write" ? "write" : "read", route)) return { ok: false, error: `${actor_id} may not ${action === "write" ? "write" : "read"} ${route} (team plan routes)` };

  if (action === "view") {
    const inner = call({ venture, route, action: r.kind === "command" ? "run" : "read", input, actor, actor_id, workspace, via, provenance });
    return inner.ok ? { ok: true, result: render(route, inner), ...deprecated } : inner;
  }

  if (r.kind === "command") {
    if (r.internal === "overview") return { ok: true, result: overview(venture, workspace), ...deprecated };
    if (r.internal === "robots") return { ok: true, result: robots(dir), ...deprecated };
    const lacking = (r.needs ?? []).filter((f) => !existsSync(join(dir, f)));
    if (lacking.length) return { ok: false, error: `${route} needs ${lacking.join(", ")} in ${venture}`, fix: { missing: lacking } };
    const args = r.venture_arg === "id" ? [dir, ...(input?.value ? [String(input.value)] : []), "--json"] : [dir, ...(r.args ?? []), "--json"];
    const p = spawnSync("node", [join(repo, r.script), ...args], { encoding: "utf8" });
    if (p.status !== 0) return { ok: false, error: (p.stderr || p.stdout).trim() };
    try { return { ok: true, result: JSON.parse(p.stdout), ...deprecated }; } catch { return { ok: true, result: p.stdout, ...deprecated }; }
  }

  if (action === "read") {
    const patterns = r.collection === "item" ? [fileFor(r, params)] : r.files;
    const found = files(dir).filter((f) => patterns.some((g) => glob(g).test(f)));
    const draft = r.collection !== "list" && existsSync(join(dir, draftPath(fileFor(r, params)))) ? draftPath(fileFor(r, params)) : null;
    const loading = draft ? { pending_draft: { file: draft, since: provEntries(dir).filter((e) => e.entity === draft).at(-1)?.at ?? null, accept: `mentura accept ${route} --venture ${venture}` } } : {};
    if (!found.length) {
      const l = layout(r, dir);
      return { ok: true, result: null, not_found: { note: r.collection === "list" ? `no ${r.record} records yet` : `no ${r.record} record yet`, template: r.template, schema: r.schema, need_now: l.need_now ?? null, skills: fix(r).skills }, ...loading, ...deprecated };
    }
    const parse = (f) => f.endsWith(".json") ? load(join(dir, f)) : f.endsWith(".jsonl") ? readFileSync(join(dir, f), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : readFileSync(join(dir, f), "utf8");
    if (r.collection === "list") {
      const re = new RegExp("^" + r.files[0].split("*").map((s) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("([^/]*)") + "$");
      return { ok: true, result: Object.fromEntries(found.map((f) => [f.match(re)[1], parse(f)])), ...deprecated };
    }
    const data = Object.fromEntries(found.map((f) => [f, parse(f)]));
    return { ok: true, result: found.length === 1 ? data[found[0]] : data, ...loading, ...deprecated };
  }

  if (action === "check") {
    const outs = r.checks.map((c) => ({ check: c, ...spawnSync("node", [join(repo, c), dir], { encoding: "utf8" }) }));
    const ok = outs.every((o) => o.status === 0);
    return { ok, result: outs.map((o) => ({ check: o.check, passed: o.status === 0, output: (o.stdout + o.stderr).trim() })), ...(ok ? {} : { fix: fix(r) }), ...deprecated };
  }

  if (action === "write") {
    if (!input || typeof input !== "object") return { ok: false, error: "write needs the record as input" };
    if (r.collection === "item" && !/^[a-z0-9][a-z0-9-]*$/.test(params.id)) return { ok: false, error: `${params.id} is not a valid id (lowercase letters, digits and hyphens)` };
    const file = fileFor(r, params);
    const gate = gateOf(r, dir);
    const draft = !!gate?.drafts && actor !== "person";
    const dest = join(dir, draft ? draftPath(file) : file);
    mkdirSync(dirname(dest), { recursive: true });
    const tmp = `${dest}.tmp.json`;
    writeFileSync(tmp, JSON.stringify(input, null, 2) + "\n");
    const v = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", r.schema.replace(/^schema\//, ""), "--file", tmp], { encoding: "utf8" });
    if (v.status !== 0) { spawnSync("rm", ["-f", tmp]); return { ok: false, error: `does not match ${r.schema}:\n${(v.stdout + v.stderr).trim()}`, fix: fix(r) }; }
    execFileSync("mv", [tmp, dest]);
    const entry = prov(dir, { entity: relative(dir, dest), route, activity: draft ? "draft" : provenance.activity ?? "write",
      agent: agentFromEnv(actor === "person" ? "person" : "agent", via, { ...(actor_id && actor !== "person" ? { id: actor_id } : {}), ...provenance.agent }), derived_from: provenance.derived_from,
      decision: provenance.decision ?? gate?.class ?? undefined, note: provenance.note });
    return { ok: true, result: { written: relative(dir, dest), draft, gate: gate?.class ?? null, provenance: entry.hash, note: draft ? `${r.record} is a ${gate.class} decision (${gate.level}, owner ${gate.owner}): written as a draft for a person to accept` : "written" }, ...deprecated };
  }
  return { ok: false, error: `unhandled action ${action}` };
}

// Views (pages): Markdown for people. A generic renderer: objects become headings and lists,
// arrays of flat objects become tables.
function md(x, depth = 2) {
  if (x === null || x === undefined) return "_none_";
  if (typeof x !== "object") return String(x);
  if (Array.isArray(x)) {
    if (!x.length) return "_none_";
    const flat = x.every((o) => o && typeof o === "object" && !Array.isArray(o) && Object.values(o).every((v) => v === null || typeof v !== "object"));
    if (flat) {
      const cols = [...new Set(x.flatMap((o) => Object.keys(o)))];
      return [`| ${cols.join(" | ")} |`, `| ${cols.map(() => "---").join(" | ")} |`, ...x.map((o) => `| ${cols.map((c) => String(o[c] ?? "").replace(/\|/g, "/").replace(/\n/g, " ")).join(" | ")} |`)].join("\n");
    }
    return x.every((v) => v === null || typeof v !== "object") ? x.map((v) => `- ${v}`).join("\n") : x.map((v) => typeof v === "object" ? md(v, depth + 1) : `- ${v}`).join("\n\n");
  }
  const blocks = [];
  for (const [k, v] of Object.entries(x)) {
    if (v !== null && typeof v === "object") blocks.push(`${"#".repeat(Math.min(depth, 6))} ${k}\n\n${md(v, depth + 1)}`);
    else if (blocks.length && blocks.at(-1).startsWith("- **")) blocks[blocks.length - 1] += `\n- **${k}:** ${v}`;
    else blocks.push(`- **${k}:** ${v}`);
  }
  return blocks.join("\n\n");
}

function render(route, res) {
  if (res.result?.slots) return [`# ${res.result.venture}: overview`, ...res.result.slots.map((s) => `## ${s.slot}\n\n${s.error ? `_could not render: ${s.error}_` : md(s.data, 3)}`)].join("\n\n");
  const head = `# ${route}`;
  if (res.result === null && res.not_found) return `${head}\n\n${res.not_found.note}.${res.not_found.template ? ` Start from \`${res.not_found.template}\`.` : ""}${res.not_found.need_now ? ` Need-now: ${res.not_found.need_now.status} (${res.not_found.need_now.now}).` : ""}`;
  return `${head}\n\n${res.pending_draft ? `> A draft is waiting for a person to accept: \`${res.pending_draft.accept}\`\n\n` : ""}${md(res.result)}`;
}

// The overview's slots (@slot): each is computed on its own, so one failing does not stop the rest.
function overview(venture, workspace) {
  const dir = ventureDir(venture, workspace);
  const v = load(join(dir, "venture.json"));
  const slot = (name, f) => { try { return { slot: name, data: f() }; } catch (e) { return { slot: name, error: String(e.message ?? e).split("\n")[0] }; } };
  const run = (route) => { const r = call({ venture, route, action: "run", workspace }); if (!r.ok) throw new Error(r.error); return r.result; };
  const read = (route) => { const r = call({ venture, route, action: "read", workspace }); if (!r.ok) throw new Error(r.error); return r.result ?? r.not_found?.note; };
  return {
    venture: v.id,
    slots: [
      slot("@venture", () => ({ name: v.name, phase: v.phase, ambition: v.ambition ?? null, status: v.status, promise: v.core?.promise ?? null })),
      slot("@telos", () => { const t = read("purpose/telos"); return typeof t === "string" ? t : { end: t.end ?? t.statement ?? null, phases: (t.phases ?? []).map((p) => p.phase) }; }),
      slot("@validation", () => { const s = run("purpose/validation/score").scores?.find((x) => x.venture === v.id); if (!s) throw new Error("no validation records yet"); return { V: s.V, threshold: s.threshold, below_floor: s.below_floor.join(", ") || "none", most_to_gain: s.most_to_gain }; }),
      slot("@need-now", () => run("system/need-now").rows.filter((x) => x.status === "suggest now").map((x) => ({ record: x.type, now: x.now, why: x.why }))),
      slot("@ready", () => { const t = run("system/time-to-ready"); return { running: t.running.on ?? `not yet: ${t.running.missing.join(", ")}`, layers: t.layers.map((l) => ({ layer: l.layer, ready: l.ready_on ?? `missing ${l.missing.join(", ")}` })) }; }),
      slot("@team", () => { const p = read("operations/team-plan"); if (typeof p === "string") return p; return p.roles.map((x) => ({ role: x.id, occupant: x.occupant, status: x.status, needed_by: x.needed_by })); }),
      slot("@provenance", () => provEntries(dir).slice(-5).reverse().map((e) => ({ at: e.at, activity: e.activity, entity: e.entity, by: `${e.agent.kind}${e.agent.id ? ` ${e.agent.id}` : ""} via ${e.agent.via}` }))),
    ],
  };
}

// Robots: per role, the routes it may read and write.
function robots(dir) {
  const plan = join(dir, "operations/team-plan.json");
  if (!existsSync(plan)) return { note: "no team plan: every actor may reach every route; gates still apply", roles: [] };
  return { note: "a role without routes may reach every route; gates still apply", roles: load(plan).roles.map((r) => ({ role: r.id, occupant: r.occupant, read: (r.routes?.read ?? ["**"]).join(", "), write: (r.routes?.write ?? (r.routes ? [] : ["**"])).join(", ") || "none" })) };
}

/** The route table as Markdown, for docs/reference/ROUTES.md. */
export function routesMd() {
  const rows = routes().map((r) => `| \`${r.route}\` | ${r.kind}${r.collection ? ` (${r.collection})` : ""} | ${r.actions.join(", ")} | ${r.kind === "record" ? `\`${r.files.join("`, `")}\`` : r.script ? `\`${r.script}\`` : "router"} | ${r.decision_class ?? ""} | ${r.groups.join(" ")} | ${r.note.replace(/\|/g, "/")} |`);
  const gs = groups().map((g) => `| \`${g.group}\` | ${g.question} | ${g.routes.length ? g.routes.map((x) => `\`${x}\``).join(", ") : "none"} |`);
  return [
    "## Routes (generated by `node interface/router.mjs --md`)",
    "",
    "Every route works on one venture, named in front of it: its id, or its folder path for a nested venture (`studio/print`). Record routes read, write, check, view, lay out or show the template of one record type; a collection has a list route and an `[id]` item route; command routes run a venture-wide tool and can be viewed. A write is checked against the record's schema first; a record whose decision class escalates is written as a draft when an agent writes it, for a person to accept.",
    "",
    "| Route | Kind | Actions | Files or script | Decision class | Groups | What it is |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "### Route groups (generated)",
    "",
    "A group gathers the routes need-now suggests in a phase. It changes the layout an agent is given, not the path.",
    "",
    "| Group | The phase asks | Routes |",
    "| --- | --- | --- |",
    ...gs,
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--md")) console.log(routesMd());
  else console.log(JSON.stringify(routes(), null, 2));
}
