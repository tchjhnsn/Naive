#!/usr/bin/env node
// The command line over the router (EE-030). Same routes and gates as the MCP server and the API.
//
//   mentura routes [--group <phase>] [--json]       the route table, or one route group
//   mentura groups [--json]                         route groups: the routes each phase needs
//   mentura ventures [--json]                       ventures in the workspace
//   mentura init <dir> --id <id> [--phase <phase>] [--layers purpose,governance]
//                                                   start a venture; --layers turns on only those
//   mentura add <department> --venture <id> [--group]
//                                                   import a department: list it and create its folders
//   mentura accept <route> --venture <id> [--confirm <route>]
//                                                   a person accepts an agent's draft of a gated record;
//                                                   one holding guiding statements asks you to type the route
//   mentura confirm <statement> --venture <id> [--confirm <statement>]
//                                                   a person confirms one guiding statement as theirs (EE-051)
//   mentura <route> <action> --venture <id|path> [--input <file>|-] [--as person] [--value <n>] [--json]
//          actions: read, write, check, template, layout, view (a page), run (commands)
//          a collection item is <route>/<id> (purpose/product/kettle); a nested venture is its
//          folder path (--venture studio/print); system/overview view shows the venture at a glance
//          [--derived-from a,b] [--decision <id>] [--note <text>]   provenance for a write (EE-031)
//          knowledge/catalog run builds the catalog over the venture's sources; knowledge/search run
//          --value <query> finds items in any of them (EE-037)
//          purpose/validation/assess run lists what is missing and asks to fill it in or run as is;
//          --as-is runs it anyway (EE-050)
//   mentura baseline --venture <id>                 adopt existing records into the provenance log
//
// The workspace is MENTURA_WORKSPACE, else --workspace <dir>, else this repository's instance/.
// Writes default to an agent actor; --as person is for a person at the keyboard, and a gated
// record written by an agent lands in <venture>/_drafts/ for a person to accept.

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { call, draftOf, files, glob, groups, repo, routes, routesMd, ventureDir, ventures } from "../router.mjs";
import { agentFromEnv, entries, record } from "../provenance.mjs";
import { FRAME, filesOf } from "../../schema/guiding.mjs";

// The danger zone (EE-051): a guiding statement is accepted or confirmed only when the person types
// its name, at the prompt or with --confirm <name>.
async function typed(name, what) {
  if (opt("confirm") !== undefined) return opt("confirm") === name;
  console.log(`${what}\nThis is a guiding statement: changing it changes the venture. Type ${name} to confirm.`);
  if (!process.stdin.isTTY) { console.log(`(not at a terminal: pass --confirm ${name})`); return false; }
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question("> ")).trim();
  rl.close();
  return a === name;
}
const guidingOf = (recordType) => FRAME.questions.flatMap((q) => q.statements).filter((s) => s.record === recordType);

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (name) => argv.includes(`--${name}`);
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["json"].includes(argv[i - 1].slice(2))));
const workspace = opt("workspace") ? resolve(opt("workspace")) : undefined;
const out = (x) => console.log(typeof x === "string" ? x : JSON.stringify(x, null, 2));

function usage(code = 2) {
  console.error(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//   ")).map((l) => l.slice(5)).join("\n"));
  process.exit(code);
}

const [cmd, action] = positional;
if (!cmd || cmd === "help" || flag("help")) usage(cmd ? 0 : 2);

if (cmd === "routes") {
  const g = opt("group")?.replace(/^\(|\)$/g, "");
  const rs = g ? routes().filter((r) => r.groups.includes(`(${g})`)) : routes();
  out(flag("json") || g ? (flag("json") ? rs : rs.map((r) => `${r.route.padEnd(44)} ${r.actions.join(", ")}`).join("\n")) : routesMd());
  process.exit(0);
}

if (cmd === "groups") { out(flag("json") ? groups() : groups().map((g) => `${g.group.padEnd(14)} ${g.routes.length} routes  ${g.question}`).join("\n")); process.exit(0); }

if (cmd === "ventures") {
  const vs = ventures(workspace);
  out(flag("json") ? vs : vs.map((v) => `${v.id.padEnd(24)} ${String(v.phase).padEnd(12)} ${v.path}`).join("\n") || "no ventures");
  process.exit(0);
}

if (cmd === "add") {
  // Imports one department into a venture (EE-047, EE-048): schema/add-department.mjs.
  const v = opt("venture");
  if (!action || !v) usage();
  const p = spawnSync("node", [join(repo, "schema/add-department.mjs"), ventureDir(v, workspace), action, ...(flag("group") ? ["--group"] : [])], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

if (cmd === "init") {
  // The venture scaffold lives in schema/init-venture.mjs; this passes the options through.
  const id = opt("id");
  if (!action || !id) usage();
  const pass = ["phase", "parent", "legal-form", "layers"].flatMap((k) => opt(k) !== undefined ? [`--${k}`, opt(k)] : []);
  const p = spawnSync("node", [join(repo, "schema/init-venture.mjs"), resolve(action), id, ...pass], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

if (cmd === "accept") {
  // The person at the keyboard accepts a draft: it is checked again and moved into place. The CLI
  // cannot tell a person from an agent running it, so the repository's review (a pull request a
  // person merges) remains the gate that holds; this makes the person's step explicit.
  const venture = opt("venture"), rt = action;
  if (!venture || !rt) usage();
  const d = draftOf(rt, venture, workspace);
  if (!d?.gate) { console.error(`${rt} is not a gated record route, or no venture ${venture}`); process.exit(1); }
  const draft = join(d.dir, d.draft);
  if (!existsSync(draft)) { console.error(`no draft of ${d.route} in ${venture}`); process.exit(1); }
  const recType = routes().find((x) => x.route === d.route || x.route === d.route.replace(/[^/]+$/, "[id]"))?.record;
  const touched = guidingOf(recType);
  if (touched.length) {
    const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
    const now = existsSync(join(d.dir, d.file)) ? JSON.parse(readFileSync(join(d.dir, d.file), "utf8")) : {};
    const next = JSON.parse(readFileSync(draft, "utf8"));
    const diff = touched.map((s) => `  ${s.id}:\n    now:   ${JSON.stringify(get(now, s.attribute) ?? null)}\n    draft: ${JSON.stringify(get(next, s.attribute) ?? null)}`).join("\n");
    if (!(await typed(d.route, `Accepting ${d.route} changes these guiding statements:\n${diff}`))) { console.error("not accepted: the confirmation did not match"); process.exit(1); }
  }
  const w = await call({ venture, route: d.route, action: "write", input: JSON.parse(readFileSync(draft, "utf8")), actor: "person", workspace, via: "cli",
    provenance: { activity: "accept", derived_from: [d.draft], note: opt("note") } });
  if (!w.ok) { console.error(w.error); process.exit(1); }
  rmSync(draft);
  out(`accepted: ${w.result.written}`);
  process.exit(0);
}

if (cmd === "confirm") {
  // A person confirms a guiding statement an agent wrote as their own; the content is unchanged.
  const venture = opt("venture"), id = action;
  const dir = venture && ventureDir(venture, workspace);
  if (!dir || !id) usage();
  const s = FRAME.questions.flatMap((q) => q.statements).find((x) => x.id === id);
  if (!s?.record) { console.error(`${id} is not a guiding statement with a record (see mentura purpose/guiding run)`); process.exit(1); }
  const rt = routes().find((x) => x.record === s.record && x.collection !== "list")?.route ?? s.record;
  const hits = filesOf(dir, s.record).filter((f) => existsSync(join(dir, f)));
  if (!hits.length) { console.error(`${venture} has no ${s.record} record to confirm`); process.exit(1); }
  const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
  const shown = hits.map((f) => `  ${f}: ${JSON.stringify(get(JSON.parse(readFileSync(join(dir, f), "utf8")), s.attribute) ?? null)}`).join("\n");
  if (!(await typed(id, `Confirming ${id} as yours:\n${shown}`))) { console.error("not confirmed: the confirmation did not match"); process.exit(1); }
  for (const f of hits) record(dir, { entity: f, route: rt, activity: "confirm", statement: id, agent: agentFromEnv("person", "cli"), note: opt("note") });
  out(`confirmed: ${id}`);
  process.exit(0);
}

if (cmd === "baseline") {
  // A venture that existed before the log: record each record file as it is now, once, so later
  // writes have a starting point. Files already in the log are left alone.
  const venture = opt("venture");
  const dir = venture && ventureDir(venture, workspace);
  if (!dir) usage();
  const logged = new Set(entries(dir).map((e) => e.entity));
  const globs = routes().filter((r) => r.kind === "record" && r.form === "json" && r.collection !== "list").flatMap((r) => r.files.map((g) => [r.route, g]));
  const routeOf = (rt, g, f) => rt.endsWith("/[id]") ? rt.replace("[id]", f.match(new RegExp("^" + g.split("*").map((x) => x.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("([^/]*)") + "$"))[1]) : rt;
  let n = 0;
  for (const f of files(dir).filter((f) => !f.startsWith("_drafts/"))) {
    const hit = globs.find(([, g]) => glob(g).test(f));
    if (!hit || logged.has(f)) continue;
    record(dir, { entity: f, route: routeOf(hit[0], hit[1], f), activity: "baseline", agent: agentFromEnv(opt("as") === "person" ? "person" : "agent", "cli"), note: "existed before the provenance log; its history before this is in git" });
    n++;
  }
  out(`baseline: ${n} records added to ${venture}'s provenance log`);
  process.exit(0);
}

if (!action) usage();
const venture = opt("venture");
if (!venture && !["template", "layout"].includes(action)) usage();
let input;
const src = opt("input");
if (src) input = JSON.parse(src === "-" ? readFileSync(0, "utf8") : readFileSync(src, "utf8"));
if (opt("value")) input = { ...(input ?? {}), value: Number.isNaN(Number(opt("value"))) ? opt("value") : Number(opt("value")) };
if (flag("as-is")) input = { ...(input ?? {}), as_is: true };
const provenance = { derived_from: opt("derived-from")?.split(",").filter(Boolean), decision: opt("decision"), note: opt("note") };
let r = await call({ venture, route: cmd, action, input, actor: opt("as") === "person" ? "person" : "agent", workspace, via: "cli", provenance });
// Asks before running (EE-050): at a terminal, the person chooses; otherwise it prints both choices.
if (r.ok && r.needs_input && !flag("json")) {
  const n = r.needs_input;
  console.log(`${n.ask}\n${n.missing.map((m) => `  - ${m.field}${m.items ? ` (${m.items.join(", ")})` : ""}: ${m.why}. As is: ${m.as_is}`).join("\n")}`);
  if (!process.stdin.isTTY) { console.log(`Fill in: ${n.options[0].how}\nRun as is: ${n.options[1].how}`); process.exit(0); }
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question("Fill in (f) or run as is (r)? ")).trim().toLowerCase();
  rl.close();
  if (!a.startsWith("r")) { console.log(`Fill in: ${n.options[0].how}`); process.exit(0); }
  r = await call({ venture, route: cmd, action, input: { ...(input ?? {}), as_is: true }, actor: opt("as") === "person" ? "person" : "agent", workspace, via: "cli", provenance });
}
if (!r.ok) { console.error(r.error ?? JSON.stringify(r.result, null, 2)); process.exit(1); }
if (r.deprecated) console.error(`note: ${r.deprecated}`);
const extra = ["not_found", "pending_draft", "fix", "needs_input"].some((k) => r[k]);
out(flag("json") || extra ? r : r.result);
