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
//                                                   model steps (use model, EE-073): packages/naive/src/router/orchestration/model-steps.ts
//   mentura accept <route> --venture <id> [--confirm <route>]
//                                                   a person accepts an agent's draft of a gated record;
//                                                   one holding a foundation statement asks you to type the route;
//                                                   [--pick <letter>] [--by <name>] accepts one of drafts kept side by side
//   mentura accept recipes/<pattern> --venture <id> [--by <name>] [--over-holdout]
//                                                   a person accepts the held recipe tip: the one-bit holdout check runs,
//                                                   and the tip goes live on a pass, or over a failed check with --over-holdout
//   mentura decide <decision> --venture <id> --by <name> [--answer <text>] [--rollback <version>] [--confirm <decision>]
//          [--reason "<claim>" | --against "<claim>" | --context "<claim>"] [--cite <ref> [--locator <where>]] ...
//                                                   reasons with citations, frozen with each cited file's sha256 at approval
//   mentura decisions --venture <id> [--why <decision>] [--json]
//                                                   the ranked decisions; --why prints one decision's reasons and citations
//                                                   a new --answer on a decided decision makes its next version; --rollback restores one
//   mentura visibility <record> [<field>] --venture <id> [--public --by <name> | --propose]   field visibility; a person approves public
//   mentura merge <decision> --venture <id> --by <name> | --role <role> [--confirm <decision>]
//   mentura index --venture <id> [--since <iso>] [--rebuild]   update the live decision index from provenance
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
//          [--revert]   with --as person: this write restores the version before (provenance activity rollback)
//          append (governance/detector-trial/<detector>) adds one hash-chained line: --input holds { line, base? }
//          claim (operations/handoff/<id>) takes a ready, unclaimed handoff for the acting role (MENTURA_ACTOR_ID), once;
//          claimed_by is MENTURA_SESSION, else the role
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
// The workspace is --workspace <dir>, else the venture or workspace you are in, else MENTURA_WORKSPACE,
// else the current directory.
// Writes default to an agent actor; --as person is for a person at the keyboard, and a gated
// record written by an agent lands in <venture>/_drafts/ for a person to accept.

import "./guard.ts"; // wf/writes hook: a broken framework file answers with recovery steps (E-8)
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { call, draftOf, files, glob, groups, repo, routes, routesMd, ventureDir, ventures } from "../../router/router.ts";
import { agentFromEnv, entries, record } from "../../core/provenance.ts";
import { FRAME, filesOf, statementFiles } from "../../engine/foundation.ts";
import { approve, decisionFile, decisions, merge, propose, rollback } from "../../engine/decisions.ts";
import { reasonsFromArgs, whyLines } from "../../engine/reasons.ts";
import { impact } from "../../engine/impact.ts";
// Gate group hook (X-2): held drafts kept side by side.
import { pick as pickDraft, settle as settleDraft } from "../../engine/gate-drafts.ts";
import { asRouted, findVenture } from "./find-venture.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import { setPublic, visibilityOf } from "../../engine/visibility.ts";
import type { StrategicFoundation } from "../../records/types/records.d.ts";

/** A foundation statement in the strategic foundation frame. */
type Statement = StrategicFoundation["questions"][number]["statements"][number];
const frame = FRAME as StrategicFoundation;
/** A route in the route table: only the fields this CLI reads. */
type Route = { route: string, actions: string[], groups: string[], kind: string, record?: string, collection?: string, form?: string, files?: string[], view_of?: string };
const table = (): Route[] => routes();
/** A decision as decisions() lists it: only the fields this CLI reads. */
type Listed = { id: string, source: string, version?: number, question?: string, answer?: string | null, applies_to?: { file: string, field: string }[], rank?: number | null, render: string, why?: string[], reasons_changed?: unknown[] };
const listed = (dir: string): Listed[] => decisions(dir).decisions;
/** The value at a dotted path of a record; "." is the record itself. A missing path throws, as it did before the types. */
const get = (o: unknown, p: string | null | undefined): unknown => { if (p == null) throw new TypeError("a statement with no attribute path"); return p === "." ? o : p.split(".").reduce<unknown>((x, k) => (x == null ? undefined : (x as Record<string, unknown>)[k]), o); };

// The danger zone (EE-051): a foundation statement is accepted or confirmed only when the person types
// its name, at the prompt or with --confirm <name>.
async function typed(name: string, what: string, why: string = "This is a foundation statement: changing it changes the venture."): Promise<boolean> {
  if (opt("confirm") !== undefined) return opt("confirm") === name;
  console.log(`${what}\n${why} Type ${name} to confirm.`);
  if (!process.stdin.isTTY) { console.log(`(not at a terminal: pass --confirm ${name})`); return false; }
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question("> ")).trim();
  rl.close();
  return a === name;
}
const foundationOf = (recordType: string | undefined): Statement[] => frame.questions.flatMap((q) => q.statements).filter((s) => s.record === recordType);

const argv = process.argv.slice(2);
// Inside a venture, --venture and the workspace default to it (I-2): `cd my-venture && mentura system/overview view`.
const here = !argv.includes("--venture") && !argv.includes("--workspace") ? findVenture() : null;
if (here) { argv.push("--venture", asRouted(here).venture, "--workspace", asRouted(here).workspace); process.env.MENTURA_WORKSPACE = asRouted(here).workspace; }
const opt = (name: string): string | undefined => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (name: string): boolean => argv.includes(`--${name}`);
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["json", "hierarchy"].includes(argv[i - 1].slice(2))));
const workspaceArg = opt("workspace");
const workspace = workspaceArg ? resolve(workspaceArg) : undefined;
const out = (x: unknown): void => console.log(typeof x === "string" ? x : JSON.stringify(x, null, 2));

function usage(code: number = 2): never {
  console.error(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//   ")).map((l) => l.slice(5)).join("\n"));
  process.exit(code);
}

const [cmd, action] = positional;
if (!cmd || cmd === "help" || flag("help")) usage(cmd ? 0 : 2);

if (cmd === "routes") {
  const g = opt("group")?.replace(/^\(|\)$/g, "");
  const rs = g ? table().filter((r) => r.groups.includes(`(${g})`)) : table();
  out(flag("json") || g ? (flag("json") ? rs : rs.map((r) => `${r.route.padEnd(44)} ${r.actions.join(", ")}`).join("\n")) : routesMd());
  process.exit(0);
}

if (cmd === "groups") { out(flag("json") ? groups() : groups().map((g) => `${g.group.padEnd(14)} ${g.routes.length} routes  ${g.question}`).join("\n")); process.exit(0); }

if (cmd === "ventures") {
  const vs = ventures(workspace);
  out(flag("json") ? vs : vs.map((v: { id: string, phase: unknown, path: string }) => `${v.id.padEnd(24)} ${String(v.phase).padEnd(12)} ${v.path}`).join("\n") || "no ventures");
  process.exit(0);
}

// Brand hook: mentura brand ... and mentura assets ... (Y-2..Y-4, J-2..J-4, T-1, T-2, P-24, P-26) live in packages/naive/src/router/brand.ts.
if (cmd === "brand" || cmd === "assets") process.exit(await (await import("../../router/brand.ts")).main(argv, { workspace }));

if (cmd === "add") {
  // Imports one function into a venture (EE-047, EE-048, EE-071). department is the alias for function for one release.
  const v = opt("venture");
  if (!action || !v) usage();
  // An unknown venture reaches spawnSync as null and throws there, as it did before the types; the cast keeps that.
  const p = spawnSync("node", [join(repo, "packages/naive/src/engine/add-department.ts"), ventureDir(v, workspace) as string, action, ...(flag("group") ? ["--group"] : [])], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

if (cmd === "typegen") {
  const p = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/naive.ts"), "typegen"], { stdio: "inherit" });
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
  const v = opt("venture");
  const d = ["triggers", "stale", "notify", "adapt"].includes(cmd) ? (v ? ventureDir(v, workspace) : null) : null;
  if (cmd !== "adapters" && !d) { console.error(v ? `no venture ${v}` : `mentura ${cmd} needs --venture <id>`); process.exit(2); }
  const pass = (...names: string[]): string[] => names.flatMap((n) => argv.flatMap((a, i) => (a === `--${n}` ? [a, ...(argv[i + 1] && !argv[i + 1].startsWith("--") ? [argv[i + 1]] : [])] : [])));
  const args = cmd === "triggers" ? ["packages/naive/src/router/orchestration/triggers.ts", d ?? "", ...pass("fire", "json")]
    : cmd === "stale" ? ["packages/naive/src/engine/stale.ts", d ?? "", ...pass("json")]
    : cmd === "notify" ? ["packages/naive/src/engine/stale.ts", d ?? "", "--notify", ...pass("source", "path", "version", "json")]
    : cmd === "adapt" ? ["packages/naive/src/interfaces/adapters.ts", "adapt", action ?? "", d ?? "", ...pass("json")]
    : ["packages/naive/src/interfaces/adapters.ts", ...positional.slice(1), ...pass("json")];
  const p = spawnSync("node", [join(repo, args[0]), ...args.slice(1)], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

if (cmd === "migrate" && (opt("from") || flag("apply"))) {
  // migrate means rewriting an outside project into a new venture (EE-076): the same as naive migrate.
  const v = opt("venture");
  const d = v && (existsSync(join(resolve(v), "venture.json")) ? resolve(v) : ventureDir(v, workspace));
  if (!d) usage();
  const from = opt("from");
  const p = spawnSync("node", [join(repo, "packages/naive/src/router/orchestration/migrate-venture.ts"), "--venture", d, ...(from ? ["--from", from] : ["--apply"])], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

if (cmd === "upgrade" || cmd === "migrate") {
  // migrate without --from is the old name of upgrade: for one release it still runs upgrade, with a notice.
  if (cmd === "migrate") console.error("mentura migrate --venture <id> is now naive upgrade (EE-076); migrate --from <project> rewrites an outside project into Naive");
  const v = opt("venture");
  const d = v && ventureDir(v, workspace);
  if (!d) usage();
  const p = spawnSync("node", [join(repo, "packages/naive/src/engine/upgrade-venture.ts"), d], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

// Model steps hook (use model, EE-073): mentura steps <payload|run|check|waterfall|provenance|confirm> --venture <id> [...].
// The logic is packages/naive/src/router/orchestration/model-steps.ts; this passes the venture folder and the other arguments through.
if (cmd === "steps") {
  const v = opt("venture"), d = v && ventureDir(v, workspace);
  if (!d || !action) usage();
  const pass = argv.slice(argv.indexOf("steps") + 1).filter((a, i, all) => !["--venture", "--workspace"].includes(a) && !["--venture", "--workspace"].includes(all[i - 1]));
  const p = spawnSync("node", [join(repo, "packages/naive/src/router/orchestration/model-steps.ts"), d, ...pass], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

if (cmd === "init") {
  // The venture scaffold lives in packages/naive/src/engine/init-venture.ts; this passes the options through.
  const id = opt("id");
  if (!action || !id) usage();
  const pass = ["phase", "parent", "legal-form", "layers"].flatMap((k) => { const v = opt(k); return v !== undefined ? [`--${k}`, v] : []; });
  const p = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.ts"), resolve(action), id, ...pass], { stdio: "inherit" });
  process.exit(p.status ?? 1);
}

if (cmd === "accept") {
  if (table().find((r) => r.route === action)?.view_of) { console.error("not accepted: this route takes no drafts; a person writes it directly"); process.exit(1); }
  // The person at the keyboard accepts a draft: it is checked again and moved into place. The CLI
  // cannot tell a person from an agent running it, so the repository's review (a pull request a
  // person merges) remains the gate that holds; this makes the person's step explicit.
  const venture = opt("venture"), rt = action;
  if (!venture || !rt) usage();
  // A recipe's held tip is accepted only through its route, which runs the holdout check (autoresearch build plan item 8).
  if (rt.startsWith("recipes/")) {
    const a = await call({ venture, route: rt, action: "accept", input: { over_holdout: flag("over-holdout") }, actor: "person", actor_id: opt("by"), workspace, via: "cli" });
    if (!a.ok) { console.error(`not accepted: ${a.error}`); process.exit(1); }
    // The recipe route's accept answer (packages/naive/src/router/recipes.ts), as this line reads it.
    const acc = a.result as { written: string, result: unknown, over_holdout?: boolean };
    out(`accepted: ${acc.written} (holdout ${acc.result}${acc.over_holdout ? ", accepted over it" : ""})`);
    process.exit(0);
  }
  const d = draftOf(rt, venture, workspace);
  // Any held draft can be accepted: one gated by its decision class, held by an open decision, or held by
  // the venture's naive.config.json gate.
  if (!d) { console.error(`${rt} is not a record route, or no venture ${venture}`); process.exit(1); }
  const draft = ventureFile(d.dir, d.draft);
  if (!existsSync(draft)) { console.error(`no draft of ${d.route} in ${venture}`); process.exit(1); }
  // Gate group hook (X-2): drafts kept side by side are accepted one at a time with --pick <letter>.
  let chosen: string;
  try { chosen = pickDraft(d.dir, d.draft, opt("pick")); } catch (e) { console.error((e as Error).message); process.exit(1); }
  const chosenFile = ventureFile(d.dir, chosen);
  const recType = table().find((x) => x.route === d.route || x.route === d.route.replace(/[^/]+$/, "[id]"))?.record;
  const touched: { id: string, attribute?: string | null }[] = frame.questions.flatMap((q) => q.statements).filter((s): s is Statement & { record: string } => Boolean(s.record) && !s.derived_from).map((s) => ({ ...s, ...statementFiles(d.dir, s) as { files: string[], attribute: string | null } })).filter((s) => s.files.includes(d.file) || (s.id === "exit-criteria" && d.file.startsWith("foundation/exit-criteria/")));
  touched.push(...foundationOf(recType).filter((s) => !touched.some((t) => t.id === s.id)));
  if (touched.length) {
    const now = existsSync(ventureFile(d.dir, d.file)) ? JSON.parse(readFileSync(ventureFile(d.dir, d.file), "utf8")) : {};
    const next = JSON.parse(readFileSync(chosenFile, "utf8"));
    const diff = touched.map((s) => `  ${s.id}:\n    now:   ${JSON.stringify(get(now, s.attribute) ?? null)}\n    draft: ${JSON.stringify(get(next, s.attribute) ?? null)}`).join("\n");
    const names = new Set<string | undefined>([d.route, rt]);
    const confirmed = opt("confirm") !== undefined ? names.has(opt("confirm")) : await typed(d.route, `Accepting ${d.route} changes these foundation statements:\n${diff}`);
    if (!confirmed) { console.error("not accepted: the confirmation did not match"); process.exit(1); }
  }
  const w = await call({ venture, route: d.route, action: "write", input: JSON.parse(readFileSync(chosenFile, "utf8")), actor: "person", workspace, via: "cli",
    provenance: { activity: "accept", derived_from: [chosen], note: opt("note") } });
  if (!w.ok) { console.error(w.error); process.exit(1); }
  // Gate group hook (X-2): removes the draft, its variants and sidecar, and decides the variants decision.
  const settled = settleDraft(d.dir, d.draft, { picked: opt("pick") ?? "a", by: opt("by") });
  out(`accepted: ${(w.result as { written: string }).written}${settled.decision ? ` (draft ${settled.picked}; decision ${settled.decision} ${settled.decided ? "decided" : `not decided: ${settled.error}`})` : ""}`);
  process.exit(0);
}

if (cmd === "visibility") {
  // Field visibility (publishing gate): each field's level, or a person approves one as public, pinning
  // its wording by sha256. An agent may only propose (--propose); the field stays as it was.
  const venture = opt("venture"), rel = action;
  const dir = venture && ventureDir(venture, workspace);
  if (!dir || !rel) usage();
  const file = rel.endsWith(".json") ? rel : `${rel}.json`;
  const field = positional[2];
  if (flag("public") || flag("propose")) {
    if (!field) { console.error("name the field: mentura visibility <record> <field> --venture <id> --public --by <name>"); process.exit(2); }
    const by = opt("by") ?? process.env.MENTURA_PERSON;
    const actor = process.env.MENTURA_ACTOR_ID;
    if (flag("public") && (process.env.MENTURA_ACTOR === "agent" || process.env.MENTURA_MODEL || (actor && actor !== by))) { console.error(`an agent (${actor ?? process.env.MENTURA_MODEL ?? "MENTURA_ACTOR"}) is acting: only a person approves a field as public; an agent proposes (--propose)`); process.exit(1); }
    const r = setPublic(dir, file, field, flag("propose") ? { propose: true, agentId: opt("as") ?? process.env.MENTURA_ACTOR_ID } : { by });
    if (!r.ok) { console.error(r.error); process.exit(1); }
    record(dir, { entity: file.replace(/\.json$/, ".visibility.json"), route: "governance/visibility", activity: flag("propose") ? "draft" : "accept", agent: agentFromEnv(flag("propose") ? "agent" : "person", "cli", flag("propose") ? {} : { id: by }), note: `${flag("propose") ? "proposed" : "approved"} ${file}#${field} as public` });
    out(r.result);
    process.exit(0);
  }
  if (!existsSync(ventureFile(dir, file))) { console.error(`no record ${file} in ${venture}`); process.exit(1); }
  const rec = JSON.parse(readFileSync(ventureFile(dir, file), "utf8"));
  out(Object.fromEntries(Object.keys(rec).filter((k) => !field || k === field).map((k) => [k, visibilityOf(dir, file, k)])));
  process.exit(0);
}

if (cmd === "merge") {
  // A person (or a delegated role) applies a decided version to the records it decides (applies_to).
  // Approving and merging are separate steps; typing the decision's id confirms the merge.
  const venture = opt("venture"), id = action;
  const dir = venture && ventureDir(venture, workspace);
  if (!dir || !id) usage();
  const d = listed(dir).find((x) => x.id === id);
  if (!d || d.source !== "file") { console.error(`no decision record ${id} in ${venture}`); process.exit(1); }
  if (!(await typed(id, `Merging ${id} version ${d.version ?? 1}: ${d.answer ?? "(no answer)"}\n  into: ${(d.applies_to ?? []).map((t) => `${t.file} ${t.field}`).join(", ") || "(nothing)"}`, "This writes the decided answer into the records it decides."))) { console.error("not merged: the confirmation did not match"); process.exit(1); }
  // --role merges as a role under a delegation grant that names may_merge (an agent with no --by merges as its role).
  const by = opt("by") ?? (opt("role") ? undefined : process.env.MENTURA_PERSON);
  const r = merge(dir, id, { by, role: opt("role") ?? (by ? undefined : process.env.MENTURA_ACTOR_ID), note: opt("note") });
  if (!r.ok) { console.error(r.error); process.exit(1); }
  out((r as { result?: unknown }).result);
  process.exit(0);
}

if (cmd === "index") {
  // The live decision index (packages/naive/src/engine/decision-index.ts): re-scores every active decision
  // (an update equals a rebuild) and appends rank history for what moved.
  const venture = opt("venture");
  const dir = venture && ventureDir(venture, workspace);
  if (!dir) usage();
  const { rebuild, update } = await import("../../engine/decision-index.ts");
  /** The decision index: only the fields this command prints. */
  type Entry = { id: string, rank: number, score: number, weight: { total: number }, why: unknown, flags: { why: string }[] };
  type Index = { venture: string, phase: string, last_update: { mode: string, events: unknown, touched: { id: string }[] }, entries: Entry[], queue?: unknown[] };
  const idx: Index = argv.includes("--rebuild") ? rebuild(dir) : update(dir, { since: opt("since") });
  out({ venture: idx.venture, phase: idx.phase, update: { mode: idx.last_update.mode, events: idx.last_update.events, rescored: idx.last_update.touched.map((t) => t.id) },
    flagged: idx.entries.filter((e) => e.flags.length).map((e) => ({ id: e.id, flags: e.flags.map((f) => f.why) })),
    ranked: idx.entries.map((e) => ({ rank: e.rank, id: e.id, score: e.score, weight: e.weight.total, why: e.why })), queue: idx.queue ?? [] });
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
  const ds: Listed[] = r.decisions;
  const id = opt("why");
  if (id) {
    const f = decisionFile(dir, id);
    if (!f) { console.error(`no decision record ${id} in ${venture}`); process.exit(1); }
    const d = JSON.parse(readFileSync(ventureFile(dir, f), "utf8"));
    const live = ds.find((x) => x.id === id);
    out(flag("json") ? { id, reasons: d.reasons ?? [], approved_on: d.provenance?.reasons ?? [], changed: live?.reasons_changed ?? [], render: live?.render } : whyLines(dir, d).join("\n"));
  } else out(flag("json") ? r : ds.filter((d) => d.rank !== null && d.rank !== undefined).map((d) => `${String(d.rank).padStart(4)} ${d.render.padEnd(8)} ${d.id}${d.why?.length ? `\n       why: ${d.why.join("; ")}` : ""}`).join("\n") || "nothing to decide now");
  process.exit(0);
}

if (cmd === "decide") {
  let givenReasons: ReturnType<typeof reasonsFromArgs> = [];
  try { givenReasons = reasonsFromArgs(argv); } catch (e) { console.error((e as Error).message); process.exit(2); }
  // A person makes a decision (EE-058): approves the drafted wording, or gives their own with
  // --answer. Typing the decision's id confirms it. Provenance records who, when and in which phase.
  const venture = opt("venture"), id = action;
  const dir = venture && ventureDir(venture, workspace);
  if (!dir || !id) usage();
  const d = listed(dir).find((x) => x.id === id);
  if (!d || d.source !== "file") { console.error(`no decision record ${id} in ${venture}`); process.exit(1); }
  if (!(await typed(id, `Deciding ${id}: ${d.question}\n  ${opt("answer") ? "your answer" : "drafted wording"}: ${opt("answer") ?? d.answer ?? "(none)"}`, "This is a decision: it unlocks what waits on it."))) { console.error("not decided: the confirmation did not match"); process.exit(1); }
  const back = opt("rollback");
  const r = back !== undefined
    ? rollback(dir, id, back, { by: opt("by") ?? process.env.MENTURA_PERSON })
    : approve(dir, id, { by: opt("by") ?? process.env.MENTURA_PERSON, answer: opt("answer"), note: opt("note"), reasons: givenReasons.length ? givenReasons : undefined });
  if (!r.ok) { console.error(r.error); process.exit(1); }
  out(r.result);
  process.exit(0);
}

if (cmd === "propose") {
  // An agent proposes a decision from a JSON file; it stays open until a person decides it.
  const venture = opt("venture"), dir = venture && ventureDir(venture, workspace);
  const inputFile = opt("input");
  if (!dir || !inputFile) usage();
  const r = propose(dir, JSON.parse(readFileSync(resolve(inputFile), "utf8")), { agentId: opt("as") ?? process.env.MENTURA_ACTOR_ID, via: "cli" });
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
  const s = frame.questions.flatMap((q) => q.statements).find((x) => x.id === id);
  if (!s?.record) { console.error(`${id} is not a foundation statement with a record (see mentura purpose/foundation run)`); process.exit(1); }
  const rt = table().find((x) => x.record === s.record && x.collection !== "list")?.route ?? s.record;
  const { files: home, attribute } = statementFiles(dir, { ...s, record: s.record });
  const hits = home.filter((f) => existsSync(ventureFile(dir, f)));
  if (!hits.length) { console.error(`${venture} has no ${s.record} record to confirm`); process.exit(1); }
  const shown = hits.map((f) => `  ${f}: ${JSON.stringify(get(JSON.parse(readFileSync(ventureFile(dir, f), "utf8")), attribute) ?? null)}`).join("\n");
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
  const globs = table().filter((r) => r.kind === "record" && r.form === "json" && r.collection !== "list").flatMap((r) => (r.files ?? []).map((g): [string, string] => [r.route, g]));
  const routeOf = (rt: string, g: string, f: string): string => rt.endsWith("/[id]") ? rt.replace("[id]", (f.match(new RegExp("^" + g.split("*").map((x) => x.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("([^/]*)") + "$")) as RegExpMatchArray)[1]) : rt;
  let n = 0;
  for (const f of (files(dir) as string[]).filter((f) => !f.startsWith("_drafts/"))) {
    const hit = globs.find(([, g]) => glob(g).test(f));
    if (!hit || logged.has(f)) continue;
    record(dir, { entity: f, route: routeOf(hit[0], hit[1], f), activity: "baseline", agent: agentFromEnv(opt("as") === "person" ? "person" : "agent", "cli"), note: "existed before the provenance log; its history before this is in git" });
    n++;
  }
  out(`baseline: ${n} records added to ${venture}'s provenance log`);
  process.exit(0);
}

// Freshness (Revalidating, V-1 to V-8): revalidate, verify, phase and freshness live in ./freshness.ts.
if (["revalidate", "verify", "phase", "freshness"].includes(cmd)) process.exit(await (await import("./freshness.ts")).main(cmd, argv, workspace));

// Context hook (packages/naive/src/router/context.ts): navigate and head read a route header first, with its layout once per
// session (--session), its template and prefetched refs (--task, --prefetch, --no-prefetch, --stream); batch runs
// a list of calls with progress.
if (["navigate", "head"].includes(action) || cmd === "batch") { const { cli } = await import("../../router/context.ts"); process.exit(await cli(argv, { workspace })); }
if (!action) usage();
const venture = opt("venture");
if (!venture && !["template", "layout"].includes(action)) usage();
let input: Record<string, unknown> | undefined;
const src = opt("input");
if (src) input = JSON.parse(src === "-" ? readFileSync(0, "utf8") : readFileSync(src, "utf8"));
const value = opt("value");
if (value) input = { ...(input ?? {}), value: Number.isNaN(Number(value)) ? value : Number(value) };
if (flag("as-is")) input = { ...(input ?? {}), as_is: true };
// wf/writes hook: --where k=v[,k=v] filters a read (L-10); --hierarchy returns its resolution levels (P-28).
const where = opt("where");
if (["read", "view"].includes(action) && where) input = { ...(input ?? {}), where: Object.fromEntries(where.split(",").map((kv) => kv.split("=")).map(([k, ...v]) => [k, v.join("=").includes("|") ? v.join("=").split("|") : v.join("=")])) };
if (["read", "view"].includes(action) && flag("hierarchy")) input = { ...(input ?? {}), hierarchy: true };
const provenance: { derived_from?: string[], decision?: string, note?: string, confidence?: number, activity?: string } = { derived_from: opt("derived-from")?.split(",").filter(Boolean), decision: opt("decision"), note: opt("note") };
// Gate group hook (X-4): a confidence score computed before the write, for the gate's confidence rules.
if (opt("confidence") !== undefined) provenance.confidence = Number(opt("confidence"));
// Detection ledger hook: --revert marks a person's write as restoring the version before (activity rollback), which
// resolves the gate's no call on the write it reverts as a miss when the venture keeps the gate detector.
if (flag("revert")) provenance.activity = "rollback";
const as = opt("as");
const actor = as === "person" || as === "public" ? as : "agent";
let r = await call({ venture, route: cmd, action, input, actor, workspace, via: "cli", provenance });
// Asks before running (EE-050): at a terminal, the person chooses; otherwise it prints both choices.
if (r.ok && r.needs_input && !flag("json")) {
  // A run that needs the person first says what is missing and how to fill it in or run as is (packages/naive/src/router/context.ts).
  const n = r.needs_input as { ask: string, missing: { field: string, items?: string[], why: string, as_is: string }[], options: { how: string }[] };
  console.log(`${n.ask}\n${n.missing.map((m: { field: string, items?: string[], why: string, as_is: string }) => `  - ${m.field}${m.items ? ` (${m.items.join(", ")})` : ""}: ${m.why}. As is: ${m.as_is}`).join("\n")}`);
  if (!process.stdin.isTTY) { console.log(`Fill in: ${n.options[0].how}\nRun as is: ${n.options[1].how}`); process.exit(0); }
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question("Fill in (f) or run as is (r)? ")).trim().toLowerCase();
  rl.close();
  if (!a.startsWith("r")) { console.log(`Fill in: ${n.options[0].how}`); process.exit(0); }
  r = await call({ venture, route: cmd, action, input: { ...(input ?? {}), as_is: true }, actor, workspace, via: "cli", provenance });
}
if (!r.ok) { console.error(r.error ?? JSON.stringify(r.result, null, 2)); process.exit(1); }
if (r.deprecated) console.error(`note: ${r.deprecated}`);
const extra = ["not_found", "pending_draft", "fix", "needs_input", "errors", "filtered_out", "hierarchy", "stale"].some((k) => r[k]); // stale: V-9 (packages/naive/src/engine/stale.ts)
out(flag("json") || extra ? r : r.result);
