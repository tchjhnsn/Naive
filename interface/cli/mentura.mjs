#!/usr/bin/env node
// The command line over the router (EE-030). Same routes and gates as the MCP server and the API.
//
//   mentura routes [--group <phase>] [--json]       the route table, or one route group
//   mentura groups [--json]                         route groups: the routes each phase needs
//   mentura ventures [--json]                       ventures in the workspace
//   mentura init <dir> --id <id> [--phase <phase>] [--layers purpose,governance]
//                                                   start a venture; --layers turns on only those
//   mentura add <function> --venture <id> [--group]
//                                                   import a function (department is the alias for one release): list it and create its folders
//   mentura upgrade --venture <id>                  alias of naive upgrade: move the venture onto the package folder layout (EE-070, EE-076)
//   mentura migrate --from <project> --venture <id|dir> [--apply]
//                                                   alias of naive migrate: an agent rewrites a project as Naive records (EE-076)
//   mentura typegen                                 alias of naive typegen (EE-073)
//   mentura steps <payload|run|check|waterfall|provenance|confirm> --venture <id> [--answers <file>] [--speculate] [--stream]
//                                                   model steps (use model, EE-073): schema/model-steps.mjs
//   mentura accept <route> --venture <id> [--confirm <route>]
//                                                   a person accepts an agent's draft of a gated record;
//                                                   one holding a foundation statement asks you to type the route;
//                                                   [--pick <letter>] [--by <name>] accepts one of drafts kept side by side
//   mentura decide <decision> --venture <id> --by <name> [--answer <text>] [--rollback <version>] [--confirm <decision>]
//          [--reason "<claim>" | --against "<claim>" | --context "<claim>"] [--cite <ref> [--locator <where>]] ...
//                                                   reasons with citations, frozen with each cited file's sha256 at approval
//   mentura decisions --venture <id> [--why <decision>] [--json]
//                                                   the ranked decisions; --why prints one decision's reasons and citations
//                                                   a new --answer on a decided decision makes its next version; --rollback restores one
//   mentura merge <decision> --venture <id> --by <name> | --role <role> [--confirm <decision>]
//   mentura impact <decision> --venture <id>       rebuild a merged decision's impact map across the functions
//                                                   apply a decided version to the records it decides (applies_to)
//                                                   a person makes a decision: approves its wording or gives their own (EE-058)
//   mentura propose --venture <id> --input <file.json> [--as <role>]
//                                                   an agent proposes a decision; it stays open until a person decides
//   mentura understand --venture <id> [--confirm ideas] [--note <corrections made>]
//                                                   a person confirms Mentura read their ideas right (the map
//                                                   and graph, after any corrections), before routing (EE-069)
//   mentura confirm <statement> --venture <id> [--confirm <statement>]
//                                                   a person confirms one foundation statement as theirs (EE-051)
//   mentura <route> <action> --venture <id|path> [--input <file>|-] [--as person] [--value <n>] [--json]
//          actions: read, write, check, template, layout, view (a page), run (commands)
//          a collection item is <route>/<id> (purpose/product/kettle); a nested venture is its
//          folder path (--venture studio/print); system/overview view shows the venture at a glance
//          [--derived-from a,b] [--decision <id>] [--note <text>]   provenance for a write (EE-031)
//          [--confidence <n>]   a score computed before the write, read by the gate's confidence rules
//          knowledge/catalog run builds the catalog over the venture's sources; knowledge/search run
//          --value <query> finds items in any of them (EE-037)
//          purpose/validation/assess run lists what is missing and asks to fill it in or run as is;
//          --as-is runs it anyway (EE-050)
//          [--where status=active|trial,phase=build] filters a read; --hierarchy shows how it resolved
//          a package's own route (validation, packages/product) reads its state; (go-to-market) is a
//          route group; venture read is the manifest, venture check runs every boundary
//   mentura baseline --venture <id>                 adopt existing records into the provenance log
//   mentura revalidate <tag:route|path:folder|package:name|route> --venture <id> [--pivot] [--reason <text>]
//                                                   mark records stale on demand; a plain folder is refused for exact tags (Revalidating)
//   mentura verify <route|folder> --venture <id>    checked and still right, unchanged: its age starts again
//   mentura phase <phase> --venture <id> --as person   change phase; per-phase records go stale
//   mentura freshness --venture <id> [--freeze <out dir>]   what is fresh, stale, expired or a live hole
//   mentura <route> navigate|head --venture <id> [--session <s>] [--task <text>] [--prefetch a,b | --no-prefetch] [--stream]
//                                                   read a route header first, with layout once per session, template and prefetch
//   mentura batch --venture <id> --input <calls.json> [--stream]
//                                                   run a list of {route, action, input} calls, reporting each as it finishes
//
// The workspace is MENTURA_WORKSPACE, else --workspace <dir>, else this repository's instance/.
// Writes default to an agent actor; --as person is for a person at the keyboard, and a gated
// record written by an agent lands in <venture>/_drafts/ for a person to accept.

import "./guard.mjs"; // wf/writes hook: a broken framework file answers with recovery steps (E-8)
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { call, draftOf, files, glob, groups, repo, routes, routesMd, ventureDir, ventures } from "../router.mjs";
import { agentFromEnv, entries, record } from "../provenance.mjs";
import { FRAME, filesOf } from "../../schema/foundation.mjs";
import { approve, decisionFile, decisions, merge, propose, rollback } from "../../schema/decisions.mjs";
import { reasonsFromArgs, whyLines } from "../../schema/reasons.mjs";
import { impact } from "../../schema/impact.mjs";
// Gate group hook (X-2): held drafts kept side by side.
import { pick as pickDraft, settle as settleDraft } from "../../schema/gate-drafts.mjs";
import { asRouted, findVenture } from "./find-venture.mjs";
import { ventureFile } from "../../schema/venture-paths.mjs";

// The danger zone (EE-051): a foundation statement is accepted or confirmed only when the person types
// its name, at the prompt or with --confirm <name>.
async function typed(name, what, why = "This is a foundation statement: changing it changes the venture.") {
  if (opt("confirm") !== undefined) return opt("confirm") === name;
  console.log(`${what}\n${why} Type ${name} to confirm.`);
  if (!process.stdin.isTTY) { console.log(`(not at a terminal: pass --confirm ${name})`); return false; }
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question("> ")).trim();
  rl.close();
  return a === name;
}
const foundationOf = (recordType) => FRAME.questions.flatMap((q) => q.statements).filter((s) => s.record === recordType);

const argv = process.argv.slice(2);
// Inside a venture, --venture and the workspace default to it (I-2): `cd my-venture && mentura system/overview view`.
const here = !argv.includes("--venture") && !argv.includes("--workspace") ? findVenture() : null;
if (here) { argv.push("--venture", asRouted(here).venture, "--workspace", asRouted(here).workspace); process.env.MENTURA_WORKSPACE = asRouted(here).workspace; }
const opt = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (name) => argv.includes(`--${name}`);
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["json", "hierarchy"].includes(argv[i - 1].slice(2))));
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

// Brand hook: mentura brand ... and mentura assets ... (Y-2..Y-4, J-2..J-4, T-1, T-2, P-24, P-26) live in interface/brand.mjs.
if (cmd === "brand" || cmd === "assets") process.exit(await (await import("../brand.mjs")).main(argv, { workspace }));

if (cmd === "add") {
  // Imports one function into a venture (EE-047, EE-048, EE-071). department is the alias for function for one release.
  const v = opt("venture");
  if (!action || !v) usage();
  const p = spawnSync("node", [join(repo, "schema/add-department.mjs"), ventureDir(v, workspace), action, ...(flag("group") ? ["--group"] : [])], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

if (cmd === "typegen") {
  const p = spawnSync("node", [join(repo, "interface/cli/naive.mjs"), "typegen"], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

// Upgrades hook (M-12, E-7, V-9, Z-4): these commands live in their own modules; this only dispatches.
//   mentura triggers --venture <id> [--fire] [--json]
//                                                   the venture's triggers, their runs and open failures; --fire runs what new events start
//   mentura stale --venture <id> [--json]           summaries whose system of record changed since they were written
//   mentura notify --venture <id> --source <id> --path <p> [--version <v>]
//                                                   a system of record says <p> changed: mark what reads it stale (a webhook does this on Mentura)
//   mentura adapt <adapter> --venture <id>          write a harness's entry files into the venture (claude-code, codex, cursor)
//   mentura adapters [verify [<adapter>]] [--json]  the adapters, or run the framework's tests an adapter must pass
if (["triggers", "stale", "notify", "adapt", "adapters"].includes(cmd)) {
  const d = ["triggers", "stale", "notify", "adapt"].includes(cmd) ? (opt("venture") ? ventureDir(opt("venture"), workspace) : null) : null;
  if (cmd !== "adapters" && !d) { console.error(opt("venture") ? `no venture ${opt("venture")}` : `mentura ${cmd} needs --venture <id>`); process.exit(2); }
  const pass = (...names) => names.flatMap((n) => argv.flatMap((a, i) => (a === `--${n}` ? [a, ...(argv[i + 1] && !argv[i + 1].startsWith("--") ? [argv[i + 1]] : [])] : [])));
  const args = cmd === "triggers" ? ["schema/triggers.mjs", d, ...pass("fire", "json")]
    : cmd === "stale" ? ["schema/stale.mjs", d, ...pass("json")]
    : cmd === "notify" ? ["schema/stale.mjs", d, "--notify", ...pass("source", "path", "version", "json")]
    : cmd === "adapt" ? ["interface/adapters.mjs", "adapt", action ?? "", d, ...pass("json")]
    : ["interface/adapters.mjs", ...positional.slice(1), ...pass("json")];
  const p = spawnSync("node", [join(repo, args[0]), ...args.slice(1)], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

if (cmd === "migrate" && (opt("from") || flag("apply"))) {
  // migrate means rewriting an outside project into a new venture (EE-076): the same as naive migrate.
  const v = opt("venture");
  const d = v && (existsSync(join(resolve(v), "venture.json")) ? resolve(v) : ventureDir(v, workspace));
  if (!d) usage();
  const p = spawnSync("node", [join(repo, "schema/migrate-venture.mjs"), "--venture", d, ...(opt("from") ? ["--from", opt("from")] : ["--apply"])], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

if (cmd === "upgrade" || cmd === "migrate") {
  // migrate without --from is the old name of upgrade: for one release it still runs upgrade, with a notice.
  if (cmd === "migrate") console.error("mentura migrate --venture <id> is now naive upgrade (EE-076); migrate --from <project> rewrites an outside project into Naive");
  const v = opt("venture");
  const d = v && ventureDir(v, workspace);
  if (!d) usage();
  const p = spawnSync("node", [join(repo, "schema/upgrade-venture.mjs"), d], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

// Model steps hook (use model, EE-073): mentura steps <payload|run|check|waterfall|provenance|confirm> --venture <id> [...].
// The logic is schema/model-steps.mjs; this passes the venture folder and the other arguments through.
if (cmd === "steps") {
  const v = opt("venture"), d = v && ventureDir(v, workspace);
  if (!d || !action) usage();
  const pass = argv.slice(argv.indexOf("steps") + 1).filter((a, i, all) => !["--venture", "--workspace"].includes(a) && !["--venture", "--workspace"].includes(all[i - 1]));
  const p = spawnSync("node", [join(repo, "schema/model-steps.mjs"), d, ...pass], { stdio: "inherit" });
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
  // Any held draft can be accepted: one gated by its decision class, held by an open decision, or held by
  // the venture's naive.config.json gate.
  if (!d) { console.error(`${rt} is not a record route, or no venture ${venture}`); process.exit(1); }
  const draft = ventureFile(d.dir, d.draft);
  if (!existsSync(draft)) { console.error(`no draft of ${d.route} in ${venture}`); process.exit(1); }
  // Gate group hook (X-2): drafts kept side by side are accepted one at a time with --pick <letter>.
  let chosen;
  try { chosen = pickDraft(d.dir, d.draft, opt("pick")); } catch (e) { console.error(e.message); process.exit(1); }
  const chosenFile = ventureFile(d.dir, chosen);
  const recType = routes().find((x) => x.route === d.route || x.route === d.route.replace(/[^/]+$/, "[id]"))?.record;
  const touched = foundationOf(recType);
  if (touched.length) {
    const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
    const now = existsSync(ventureFile(d.dir, d.file)) ? JSON.parse(readFileSync(ventureFile(d.dir, d.file), "utf8")) : {};
    const next = JSON.parse(readFileSync(chosenFile, "utf8"));
    const diff = touched.map((s) => `  ${s.id}:\n    now:   ${JSON.stringify(get(now, s.attribute) ?? null)}\n    draft: ${JSON.stringify(get(next, s.attribute) ?? null)}`).join("\n");
    const names = new Set([d.route, rt]);
    const confirmed = opt("confirm") !== undefined ? names.has(opt("confirm")) : await typed(d.route, `Accepting ${d.route} changes these foundation statements:\n${diff}`);
    if (!confirmed) { console.error("not accepted: the confirmation did not match"); process.exit(1); }
  }
  const w = await call({ venture, route: d.route, action: "write", input: JSON.parse(readFileSync(chosenFile, "utf8")), actor: "person", workspace, via: "cli",
    provenance: { activity: "accept", derived_from: [chosen], note: opt("note") } });
  if (!w.ok) { console.error(w.error); process.exit(1); }
  // Gate group hook (X-2): removes the draft, its variants and sidecar, and decides the variants decision.
  const settled = settleDraft(d.dir, d.draft, { picked: opt("pick") ?? "a", by: opt("by") });
  out(`accepted: ${w.result.written}${settled.decision ? ` (draft ${settled.picked}; decision ${settled.decision} ${settled.decided ? "decided" : `not decided: ${settled.error}`})` : ""}`);
  process.exit(0);
}

if (cmd === "merge") {
  // A person (or a delegated role) applies a decided version to the records it decides (applies_to).
  // Approving and merging are separate steps; typing the decision's id confirms the merge.
  const venture = opt("venture"), id = action;
  const dir = venture && ventureDir(venture, workspace);
  if (!dir || !id) usage();
  const d = decisions(dir).decisions.find((x) => x.id === id);
  if (!d || d.source !== "file") { console.error(`no decision record ${id} in ${venture}`); process.exit(1); }
  if (!(await typed(id, `Merging ${id} version ${d.version ?? 1}: ${d.answer ?? "(no answer)"}\n  into: ${(d.applies_to ?? []).map((t) => `${t.file} ${t.field}`).join(", ") || "(nothing)"}`, "This writes the decided answer into the records it decides."))) { console.error("not merged: the confirmation did not match"); process.exit(1); }
  // --role merges as a role under a delegation grant that names may_merge (an agent with no --by merges as its role).
  const by = opt("by") ?? process.env.MENTURA_PERSON;
  const r = merge(dir, id, { by, role: opt("role") ?? (by ? undefined : process.env.MENTURA_ACTOR_ID), note: opt("note") });
  if (!r.ok) { console.error(r.error); process.exit(1); }
  out(r.result);
  process.exit(0);
}

if (cmd === "impact") {
  // Which records in each function depend on what a merged decision changed; marks them stale and
  // proposes an open follow-up decision per function (merge runs this itself).
  const venture = opt("venture"), id = action;
  const dir = venture && ventureDir(venture, workspace);
  if (!dir || !id) usage();
  const r = impact(dir, id, { via: "cli" });
  if (!r.ok) { console.error(r.error); process.exit(1); }
  out(r.result);
  process.exit(0);
}

if (cmd === "decisions") {
  // The ranked decisions, or with --why one decision's reasons and what they cite.
  const venture = opt("venture"), dir = venture && ventureDir(venture, workspace);
  if (!dir) usage();
  const r = decisions(dir);
  const id = opt("why");
  if (id) {
    const f = decisionFile(dir, id);
    if (!f) { console.error(`no decision record ${id} in ${venture}`); process.exit(1); }
    const d = JSON.parse(readFileSync(ventureFile(dir, f), "utf8"));
    const live = r.decisions.find((x) => x.id === id);
    out(flag("json") ? { id, reasons: d.reasons ?? [], approved_on: d.provenance?.reasons ?? [], changed: live?.reasons_changed ?? [], render: live?.render } : whyLines(dir, d).join("\n"));
  } else out(flag("json") ? r : r.decisions.filter((d) => d.rank !== null && d.rank !== undefined).map((d) => `${String(d.rank).padStart(4)} ${d.render.padEnd(8)} ${d.id}${d.why?.length ? `\n       why: ${d.why.join("; ")}` : ""}`).join("\n") || "nothing to decide now");
  process.exit(0);
}

if (cmd === "decide") {
  let givenReasons = [];
  try { givenReasons = reasonsFromArgs(argv); } catch (e) { console.error(e.message); process.exit(2); }
  // A person makes a decision (EE-058): approves the drafted wording, or gives their own with
  // --answer. Typing the decision's id confirms it. Provenance records who, when and in which phase.
  const venture = opt("venture"), id = action;
  const dir = venture && ventureDir(venture, workspace);
  if (!dir || !id) usage();
  const d = decisions(dir).decisions.find((x) => x.id === id);
  if (!d || d.source !== "file") { console.error(`no decision record ${id} in ${venture}`); process.exit(1); }
  if (!(await typed(id, `Deciding ${id}: ${d.question}\n  ${opt("answer") ? "your answer" : "drafted wording"}: ${opt("answer") ?? d.answer ?? "(none)"}`, "This is a decision: it unlocks what waits on it."))) { console.error("not decided: the confirmation did not match"); process.exit(1); }
  const r = opt("rollback") !== undefined
    ? rollback(dir, id, opt("rollback"), { by: opt("by") ?? process.env.MENTURA_PERSON })
    : approve(dir, id, { by: opt("by") ?? process.env.MENTURA_PERSON, answer: opt("answer"), note: opt("note"), reasons: givenReasons.length ? givenReasons : undefined });
  if (!r.ok) { console.error(r.error); process.exit(1); }
  out(r.result);
  process.exit(0);
}

if (cmd === "propose") {
  // An agent proposes a decision from a JSON file; it stays open until a person decides it.
  const venture = opt("venture"), dir = venture && ventureDir(venture, workspace);
  if (!dir || !opt("input")) usage();
  const r = propose(dir, JSON.parse(readFileSync(resolve(opt("input")), "utf8")), { agentId: opt("as") ?? process.env.MENTURA_ACTOR_ID, via: "cli" });
  if (!r.ok) { console.error(r.error); process.exit(1); }
  out(r.result);
  process.exit(0);
}

if (cmd === "understand") {
  // The Understand gate (EE-069): the founder has looked over the map and the graph, corrected what
  // Mentura got wrong, and confirms the understanding before the ideas are routed.
  const venture = opt("venture"), dir = venture && ventureDir(venture, workspace);
  if (!dir) usage();
  const hits = ["purpose/ideas/map.mdx", "purpose/ideas/graph.json"].filter((f) => existsSync(ventureFile(dir, f)));
  if (!hits.length) { console.error(`${venture} has no idea map yet: map the idea dump first (purpose/ideas)`); process.exit(1); }
  if (!(await typed("ideas", `Confirming Mentura's understanding of your ideas: ${hits.join(", ")}`, "Your ideas are routed to their records from this understanding."))) { console.error("not confirmed: the confirmation did not match"); process.exit(1); }
  for (const f of hits) record(dir, { entity: f, route: f.endsWith(".mdx") ? "purpose/ideas" : "purpose/ideas/graph", activity: "confirm", statement: "ideas", agent: agentFromEnv("person", "cli"), note: opt("note") });
  out("confirmed: ideas");
  process.exit(0);
}

if (cmd === "confirm") {
  // A person confirms a foundation statement an agent wrote as their own; the content is unchanged.
  const venture = opt("venture"), id = action;
  const dir = venture && ventureDir(venture, workspace);
  if (!dir || !id) usage();
  const s = FRAME.questions.flatMap((q) => q.statements).find((x) => x.id === id);
  if (!s?.record) { console.error(`${id} is not a foundation statement with a record (see mentura purpose/foundation run)`); process.exit(1); }
  const rt = routes().find((x) => x.record === s.record && x.collection !== "list")?.route ?? s.record;
  const hits = filesOf(dir, s.record).filter((f) => existsSync(ventureFile(dir, f)));
  if (!hits.length) { console.error(`${venture} has no ${s.record} record to confirm`); process.exit(1); }
  const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
  const shown = hits.map((f) => `  ${f}: ${JSON.stringify(get(JSON.parse(readFileSync(ventureFile(dir, f), "utf8")), s.attribute) ?? null)}`).join("\n");
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

// Freshness (Revalidating, V-1 to V-8): revalidate, verify, phase and freshness live in ./freshness.mjs.
if (["revalidate", "verify", "phase", "freshness"].includes(cmd)) process.exit(await (await import("./freshness.mjs")).main(cmd, argv, workspace));

// Context hook (interface/context.mjs): navigate and head read a route header first, with its layout once per
// session (--session), its template and prefetched refs (--task, --prefetch, --no-prefetch, --stream); batch runs
// a list of calls with progress.
if (["navigate", "head"].includes(action) || cmd === "batch") { const { cli } = await import("../context.mjs"); process.exit(await cli(argv, { workspace })); }
if (!action) usage();
const venture = opt("venture");
if (!venture && !["template", "layout"].includes(action)) usage();
let input;
const src = opt("input");
if (src) input = JSON.parse(src === "-" ? readFileSync(0, "utf8") : readFileSync(src, "utf8"));
if (opt("value")) input = { ...(input ?? {}), value: Number.isNaN(Number(opt("value"))) ? opt("value") : Number(opt("value")) };
if (flag("as-is")) input = { ...(input ?? {}), as_is: true };
// wf/writes hook: --where k=v[,k=v] filters a read (L-10); --hierarchy returns its resolution levels (P-28).
if (["read", "view"].includes(action) && opt("where")) input = { ...(input ?? {}), where: Object.fromEntries(opt("where").split(",").map((kv) => kv.split("=")).map(([k, ...v]) => [k, v.join("=").includes("|") ? v.join("=").split("|") : v.join("=")])) };
if (["read", "view"].includes(action) && flag("hierarchy")) input = { ...(input ?? {}), hierarchy: true };
const provenance = { derived_from: opt("derived-from")?.split(",").filter(Boolean), decision: opt("decision"), note: opt("note") };
// Gate group hook (X-4): a confidence score computed before the write, for the gate's confidence rules.
if (opt("confidence") !== undefined) provenance.confidence = Number(opt("confidence"));
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
const extra = ["not_found", "pending_draft", "fix", "needs_input", "errors", "filtered_out", "hierarchy", "stale"].some((k) => r[k]); // stale: V-9 (schema/stale.mjs)
out(flag("json") || extra ? r : r.result);
