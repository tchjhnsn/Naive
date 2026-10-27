// The route table and its actions, shared by the CLI, the MCP server and the HTTP API (EE-030).
// Routes are generated from the data model and the kit manifests, never written by hand, so they
// cannot drift from the files. Like Next.js's App Router: a kit path is a route
// (purpose/validation/problem), the venture is the dynamic segment, a record's actions are its
// handlers, and gates run before an action as middleware does.
//
//   record routes: one per venture-level record type: <layer>[/<kit>]/<record>
//     actions: read, write, check, template
//   command routes: venture-wide tools: system/need-now, system/time-to-ready,
//     purpose/validation/score, governance/payouts
//
// Gates on write: the record must match its schema (schema/validate.py --file); a record whose
// decision class escalates to a person is written as a draft (<venture>/_drafts/<file>.draft) when
// the actor is an agent, for a person to accept. Partial adoption: a route needs only its own
// record and what its kit reads; nothing else about the system is required.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

export const repo = new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));

// Record types whose writes are decisions a person makes (decision rights, EE-022, EE-023, EE-025).
const GATED = {
  ownership: "ownership-or-control", board: "ownership-or-control", "founder-agreement": "ownership-or-control", exit: "ownership-or-control",
  telos: "strategy-or-constitution", "decision-rights": "strategy-or-constitution", "publication-policy": "strategy-or-constitution",
};

function kits() {
  const model = load(join(repo, "schema/data-model.json"));
  const paths = [...model.layers.map((l) => `${l}/kit.json`), "schema/kit.json"];
  for (const l of model.layers) {
    const k = join(repo, l, "kits");
    if (existsSync(k)) for (const d of readdirSync(k)) if (existsSync(join(k, d, "kit.json"))) paths.push(`${l}/kits/${d}/kit.json`);
  }
  return paths.filter((p) => existsSync(join(repo, p))).map((p) => ({ path: p, ...load(join(repo, p)) }));
}

/** The route table, generated from schema/data-model.json and the kit manifests. */
export function routes() {
  const model = load(join(repo, "schema/data-model.json"));
  const ks = kits();
  const owner = new Map(ks.flatMap((k) => k.records.map((r) => [r, k])));
  const out = [];
  for (const r of model.records.filter((x) => x.level === "venture" && x.id !== "venture")) {
    const k = owner.get(r.id);
    const sub = k?.path.match(/^[a-z]+\/kits\/([^/]+)\//)?.[1];
    const short = sub && r.id.startsWith(`${sub}-`) ? r.id.slice(sub.length + 1) : r.id;
    const files = r.paths.filter((p) => p.startsWith("instance/**/")).map((p) => p.slice("instance/**/".length));
    const template = sub ? `${dirname(k.path)}/templates/${short}.md` : null;
    const checks = [...new Set((r.refs ?? []).map((x) => x.checked_by).filter((c) => c && c.startsWith("schema/check-") && c !== "schema/check-data-model.mjs"))];
    out.push({
      route: [r.layer === "system" ? "system" : r.layer, sub, short].filter(Boolean).join("/"),
      kind: "record", record: r.id, kit: k?.kit ?? null, files, schema: r.schema,
      actions: ["read", ...(r.schema && files.length === 1 && !files[0].includes("*") ? ["write"] : []), ...(checks.length ? ["check"] : []), ...(template && existsSync(join(repo, template)) ? ["template"] : [])],
      checks, template: template && existsSync(join(repo, template)) ? template : null, gate: GATED[r.id] ?? null, note: r.note ?? "",
    });
  }
  out.push(
    { route: "system/need-now", kind: "command", actions: ["run"], script: "schema/need-now.mjs", note: "What the venture needs now, soon, or should hold back (EE-028)" },
    { route: "system/time-to-ready", kind: "command", actions: ["run"], script: "schema/time-to-ready.mjs", note: "Time to running, and to ready per layer and MAD tier" },
    { route: "purpose/validation/score", kind: "command", actions: ["run"], script: "schema/check-validation.mjs", args: ["--score"], note: "The validation score from graded evidence (EE-026)" },
    { route: "governance/payouts", kind: "command", actions: ["run"], script: "schema/payouts.mjs", needs: ["governance/ownership.json"], note: "Who gets what at a sale value, from the cap table (EE-022); input value, else the scenarios in exit.json", venture_arg: "id" },
  );
  return out.sort((a, b) => a.route.localeCompare(b.route));
}

/** Finds a venture folder by id under a workspace (MENTURA_WORKSPACE, else the repository's instance/). */
export function ventureDir(id, workspace = process.env.MENTURA_WORKSPACE ?? join(repo, "instance")) {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
    : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
  for (const d of walk(workspace)) if (load(join(d, "venture.json")).id === id) return d;
  return null;
}

const glob = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*") + "$");
const files = (d, base = d) => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? files(join(d, e.name), base) : [join(d, e.name).slice(base.length + 1)]) : [];

/**
 * Runs one action on one route for one venture. Returns { ok, result } or { ok: false, error }.
 * input: the record to write (write); actor: "person" or "agent" (write; default agent).
 */
export function call({ venture, route, action, input, actor = "agent", workspace }) {
  const r = routes().find((x) => x.route === route);
  if (!r) return { ok: false, error: `no route ${route}` };
  if (!r.actions.includes(action)) return { ok: false, error: `${route} has no action ${action} (it has ${r.actions.join(", ")})` };
  if (action === "template") return { ok: true, result: readFileSync(join(repo, r.template), "utf8") };
  const dir = ventureDir(venture, workspace);
  if (!dir) return { ok: false, error: `no venture ${venture}` };

  if (r.kind === "command") {
    const lacking = (r.needs ?? []).filter((f) => !existsSync(join(dir, f)));
    if (lacking.length) return { ok: false, error: `${route} needs ${lacking.join(", ")} in ${venture}` };
    const args = r.venture_arg === "id" ? [dir, ...(input?.value ? [String(input.value)] : []), "--json"] : [dir, ...(r.args ?? []), "--json"];
    const p = spawnSync("node", [join(repo, r.script), ...args], { encoding: "utf8" });
    if (p.status !== 0) return { ok: false, error: (p.stderr || p.stdout).trim() };
    try { return { ok: true, result: JSON.parse(p.stdout) }; } catch { return { ok: true, result: p.stdout }; }
  }
  if (action === "read") {
    const found = files(dir).filter((f) => r.files.some((g) => glob(g).test(f)));
    if (!found.length) return { ok: true, result: null, note: `no ${r.record} record yet` };
    const data = Object.fromEntries(found.map((f) => [f, f.endsWith(".json") ? load(join(dir, f)) : readFileSync(join(dir, f), "utf8")]));
    return { ok: true, result: found.length === 1 ? data[found[0]] : data };
  }
  if (action === "check") {
    const outs = r.checks.map((c) => ({ check: c, ...spawnSync("node", [join(repo, c), dir], { encoding: "utf8" }) }));
    return { ok: outs.every((o) => o.status === 0), result: outs.map((o) => ({ check: o.check, passed: o.status === 0, output: (o.stdout + o.stderr).trim() })) };
  }
  if (action === "write") {
    if (!input || typeof input !== "object") return { ok: false, error: "write needs the record as input" };
    const target = join(dir, r.files[0]);
    const draft = r.gate && actor !== "person";
    const dest = draft ? join(dir, "_drafts", `${r.files[0].replace(/\//g, "__")}.draft`) : target;
    mkdirSync(dirname(dest), { recursive: true });
    const tmp = `${dest}.tmp.json`;
    writeFileSync(tmp, JSON.stringify(input, null, 2) + "\n");
    const v = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", r.schema.replace(/^schema\//, ""), "--file", tmp], { encoding: "utf8" });
    if (v.status !== 0) { spawnSync("rm", ["-f", tmp]); return { ok: false, error: `does not match ${r.schema}:\n${(v.stdout + v.stderr).trim()}` }; }
    execFileSync("mv", [tmp, dest]);
    return { ok: true, result: { written: relative(dir, dest), draft, gate: r.gate, note: draft ? `${r.record} is a ${r.gate} decision: written as a draft for a person to accept` : "written" } };
  }
  return { ok: false, error: `unhandled action ${action}` };
}

/** The ventures under a workspace: id, name, phase and folder. */
export function ventures(workspace = process.env.MENTURA_WORKSPACE ?? join(repo, "instance")) {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
    : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
  return walk(workspace).map((d) => { const v = load(join(d, "venture.json")); return { id: v.id, name: v.name, phase: v.phase, dir: d }; });
}

/** The route table as Markdown, for docs/reference/ROUTES.md. */
export function routesMd() {
  const rows = routes().map((r) => `| \`${r.route}\` | ${r.kind} | ${r.actions.join(", ")} | ${r.kind === "record" ? `\`${r.files.join("`, `")}\`` : `\`${r.script}\``} | ${r.gate ?? ""} | ${r.note.replace(/\|/g, "/")} |`);
  return [
    "## Routes (generated by `node interface/router.mjs --md`)",
    "",
    "Every route works on one venture. Record routes read, write, check or show the template of one record type; command routes run a venture-wide tool. A write is checked against the record's schema first; a gated record written by an agent lands in `<venture>/_drafts/` for a person to accept.",
    "",
    "| Route | Kind | Actions | Files or script | Gate | What it is |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--md")) console.log(routesMd());
  else console.log(JSON.stringify(routes(), null, 2));
}
