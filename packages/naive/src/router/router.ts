// The routes' actions, shared by the CLI, the MCP server and the HTTP API (EE-030, EE-032). The route
// table itself is packages/naive/src/records/routes/routes.ts, re-exported here: routes are generated from the data
// model and the kit manifests, never written by hand, so they cannot drift from the files. The
// conventions follow the Next.js App Router:
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
//   aliases       packages/naive/src/router/route-aliases.json maps a renamed route to its new one, with a note
//   hierarchy     a read resolves layout, template, error, loading, not-found, then page (P-28);
//                 resolved_by names the level that answered (packages/naive/src/router/reads.ts)
//   writes        a write answers with what it changed and the next route to act on; a layout lists
//                 the actions open to the actor; package, group and venture routes; global errors
//                 (packages/naive/src/router/writes.ts wraps call)
//   storage       a record is read and written through the connector for the source its record
//                 type lives in (packages/naive/src/store/connectors, EE-037): the venture's own folder unless its
//                 knowledge/sources.json names another, such as a GitHub repository, where a write
//                 opens a draft pull request. A read says which source and version it came from.
//
// Partial adoption: a route needs only its own record and what its kit reads.

import { mayKnow, publicView } from "../engine/visibility.ts";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { actingAgent, agentFromEnv, entries as provEntries } from "../core/provenance.ts";
import { logWrite as prov, schemaFailure } from "./write-effects.ts";
import type { Entry } from "../core/provenance.ts";
import { address } from "../store/connectors/contract.ts";
import { decisionFile, holding, locked } from "../engine/decisions.ts";
import { timeBoxSpan } from "../engine/time-box-span.ts";
import { configOf, hold } from "../engine/gate.ts";
import { blocked as betaBlocked } from "../engine/beta-gate.ts";
// Freshness (Revalidating, V-1 to V-8): stale flags on reads, and the freshness and revalidate commands.
import { readFlag as freshnessFlag } from "../engine/freshness.ts";
// Gate group hooks (M-18, F-5, X-2, X-4 to X-6, P-2, P-7, U-4): who is acting, access at the record,
// the gate's verdict, where held drafts wait, and check settings. The logic lives in these modules.
import { PROJECTOR, actingCall, isProjector, itemId, mayReadItem, mayReadSome } from "./acting.ts";
import { asOfStore, cutFor, inEval, observedBy, refusal as asOfRefusal } from "./reads-as-of.ts";
import { checkPlan, gateWrite, heldDraft, ledgerHook, ownerOfWrite, reachOfWrite } from "./gate-hooks.ts";
// Appends (packages/naive/src/router/appends.ts): one hash-chained line added to a log route, such as the detection ledger.
import { appendLine } from "./appends.ts";
import { claimHandoff, handoffWriteRule } from "./handoff-claim.ts";
import { LOCAL, attributeSources, connect, sourceFor } from "../store/connectors/index.ts";
// Caching (packages/naive/src/engine/caching.ts): per-action memo, the record-level cache for command routes, and system/cache, system/judge, system/answer.
import { command as cachedCommand, forget, internal as cacheInternal } from "../engine/caching.ts";
import type { InternalInput } from "../engine/caching.ts";
import { actionScope, memo } from "../core/action-scope.ts";
// Context hook: instrumentation of every call and judgment (packages/naive/src/core/instrumentation.ts, P-4, F-4).
import { instrumented, judgment } from "../core/instrumentation.ts";
// Hooks for writes, reads and boundaries (wf/writes): the wrapper around call, per-record containment and private folders.
import { around } from "./writes.ts";
import { contain } from "./boundaries.ts";
import { packageSlots } from "./package-routes.ts";
import { routable } from "../engine/structure.ts";
// Brand hook (Y-2..Y-4, J-2..J-4, T-1, T-2, P-24, P-26): routes, commands and layout context from packages/naive/src/engine/brand.ts.
import { brandLayout } from "../engine/brand.ts";
// Investors lint hook: investors/lint (packages/naive/src/checks/lint-investors.ts).
// Customers lint: a customer that matches no ICP, and a promise the product record does not keep.
// Legal lint hook: legal/lint (packages/naive/src/checks/lint-legal.ts). A lint, not legal advice.
// Upgrades hook (V-9): a read says when what the record reads changed in its system of record.
import { staleOf } from "../engine/stale.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { isFunction, templateOf } from "../engine/research-programs.ts";
import { coreOf, statementsIn, withCore } from "../engine/venture-core.ts";
import { telosView } from "../../../../frameworks/telos/adapter.ts";
import { migrated, scale } from "../engine/canonical.ts";
import { schemaNameOf } from "../records/index.ts";
import type { DecisionRecord, TeamPlan, Venture } from "../records/types/records.d.ts";
import type { RecordRoute, Route } from "../records/routes/routes.ts";
import {
  PHASES, allowed, defaultWorkspace, files, gateOf, glob, groups, kits, load, repo, resolve, routes, skillsOf, ventureDir, ventures,
} from "../records/routes/routes.ts";
// The route table lives in packages/naive/src/records/routes so that schema/ can read it without importing this file.
export { PHASES, allowed, files, gateOf, glob, groups, kits, repo, resolve, routes, ventureDir, ventures };

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => !!x && typeof x === "object";
/** A thrown value's message, or the value itself. */
const messageOf = (e: unknown): string => String((isObj(e) ? e.message : undefined) ?? e);
/** What a call logs in provenance beside the write. */
export type CallProvenance = { derived_from?: string[]; decision?: string; note?: string; agent?: { id?: string; [k: string]: unknown }; activity?: string; confidence?: number | string | null };
/** One router call: an action on a route for a venture. */
export type CallArgs = {
  venture?: string; route: string; action: string; input?: unknown; actor?: string; actor_id?: string; workspace?: string; via?: string;
  reads_as_of?: string | number | null; provenance?: CallProvenance; [PROJECTOR]?: boolean;
};
/**
 * What a router action answers: ok, and the result or an error, with whatever else the action adds. The result is
 * unknown unless a caller that knows the route names its shape as T.
 */
export type Answer<T = unknown> = { ok: boolean; error?: string; result?: T; [k: string]: unknown };
/** One entry of the route table (packages/naive/src/records/routes/routes.ts). Record routes carry files; command routes a script. */
export type RouteEntry = Route;
/** A record route: one with files. */
export type { RecordRoute };
/** A source a record type lives in (knowledge/sources.json, packages/naive/src/store/connectors), which names its connector. */
export type Source = { id: string; connector: string; [k: string]: unknown };
/** One item a connector reads. */
export type Item = { path: string; content: string; version?: string; commit?: string; permalink?: string; attributes?: Obj };
/** What a connector's write answers (the contract's Written, packages/naive/src/store/connectors/contract.ts). */
type Written = { version: string; commit?: string; pull_request?: { url: string } };
/** What a read needs of a store: a connector, or the as-of store (reads-as-of.ts asOfStore), which only reads. */
export type ReadStore = { list: () => Promise<{ path: string }[]>; read: (path: string) => Promise<Item | null> };
/** A connected connector, as the contract has it (packages/naive/src/store/connectors/contract.ts). */
export type Store = ReadStore & { writes: string; write: (path: string, content: string, opts?: { message?: string; title?: string; base?: string | null; append?: boolean }) => Promise<Written> };
/** Whether a store can be written: a connector, not the as-of store. */
const writable = (s: ReadStore | Store | undefined): s is Store => !!s && "write" in s;
type Attr = { attribute: string; source: Source; store: ReadStore | Store };

// Prefer a file that is already there, so an unmigrated venture keeps its old path. A new write uses the first path, which is the package layout.
const fileFor = (r: RecordRoute, params: { id?: string }, dir: string | null): string => {
  if (r.view_of) return "venture.json";
  const cands = (r.collection === "item" ? r.files.map((f) => f.replace("*", String(params.id))) : r.files).filter((f) => !f.includes("*"));
  if (dir) {
    const hit = cands.find((f) => existsSync(ventureFile(dir, f)));
    if (hit) return hit;
    // A new collection item joins the folder the venture already keeps that collection in.
    if (r.collection === "item") {
      const lived = cands.find((f) => { const d = ventureFile(dir, dirname(f)); return existsSync(d) && readdirSync(d).some((n) => n.endsWith(".json") || n.endsWith(".md") || n.endsWith(".mdx")); });
      if (lived) return lived;
    }
  }
  return cands[0];
};
// A recipe file (<pattern>.recipe.ts) is written only through recipes/<pattern> (packages/naive/src/router/recipes.ts),
// which scores the write against the tip and holds an agent's keep as a draft. Any other route that would write one,
// knowledge/recipe included, is refused with this answer, a person's call too (autoresearch build plan item 6).
const isRecipeFile = (file: unknown): file is string => typeof file === "string" && file.endsWith(".recipe.ts");
const recipeRefusal = (route: string, file: string | null) => {
  const pattern = isRecipeFile(file) ? file.slice(0, -".recipe.ts".length) : "<pattern>";
  return { ok: false, error: `${route} does not write a recipe: write recipes/${pattern} with { source, base }, which scores it against the tip inside the write (read recipes/${pattern} for the tip's sha)`,
    fix: { route: `recipes/${pattern}`, action: "write", input: "{ source, base }" } };
};
const draftPath = (file: string) => join("_drafts", `${file.replace(/\//g, "__")}.draft`);

/** Where an agent's draft of a gated record waits: { dir, file, draft, gate } or null. */
export function draftOf(route: string, venture: string | null | undefined, workspace?: string) {
  const { r, params } = resolve(route);
  const dir = ventureDir(venture, workspace);
  if (!r || r.kind !== "record" || r.collection === "list" || !dir) return null;
  const file = fileFor(r, params, dir);
  if (!file) return null; // a route with no concrete file (a pattern-only slot) has no draft
  return { dir, file, draft: draftPath(file), gate: gateOf(r, dir), route: r.collection === "item" ? r.route.replace("[id]", String(params.id)) : r.route };
}

type Chained = { path: string; text: string };
function agentsChain(dir: string | null, route: string): Chained[] {
  if (!dir) return [];
  const chain: Chained[] = [];
  const add = (rel: string) => { const f = ventureFile(dir, rel); if (existsSync(f)) chain.push({ path: rel, text: readFileSync(f, "utf8") }); };
  add("AGENTS.md");
  const parts = route.split("/").filter(Boolean);
  let acc = "";
  for (const p of parts) { acc = acc ? `${acc}/${p}` : p; add(`${acc}/AGENTS.md`); }
  return chain;
}
function instructionsOf(chain: Chained[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of chain) for (const line of file.text.split("\n")) {
    const m = line.match(/^([a-z][a-z0-9_-]*)\s*:\s*(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

/** A score below its threshold is uncertain: not an error and not an answer. It routes to the function owner. */
export function judge(score: number | undefined, threshold: number, owner?: string, at?: { dir?: string; question?: string; route?: string; model?: string }) {
  const out: { outcome: string; owner?: string; result: number | null } = typeof score !== "number" || score < threshold ? { outcome: "uncertain", owner, result: null } : { outcome: "answer", result: score };
  // Context hook: a judgment made for a venture (at.dir) is an instrumentation event (F-4).
  if (at?.dir) judgment(at.dir, { question: at.question, route: at.route, model: at.model, score, threshold, outcome: out.outcome, owner });
  return out;
}

/** Runs fn. A throw is the uncaught outcome. */
export function capture(fn: () => unknown): { outcome: string; error?: string } {
  try { fn(); return { outcome: "answer" }; }
  catch (e) { return { outcome: "uncaught", error: messageOf(e) }; }
}

/** The layout wrapping a route: system layer, the record's layer, and its package when one owns it.
 *  chain is the AGENTS.md files from the venture root down to the route, nearest last. */
export function layout(r: RouteEntry, dir: string | null) {
  const ks = kits();
  const owned = r.kit_path && (r.kit_path.startsWith("packages/naive/library/packages/") || r.kit_path.includes("/kits/")) ? ks.find((k) => k.path === r.kit_path) : null;
  const stack = [ks.find((k) => k.path === "packages/naive/src/records/layer.json"), ks.find((k) => k.path === `packages/naive/src/records/layers/${r.layer ?? r.route.split("/")[0]}/layer.json`), owned]
    .filter((k) => !!k).map((k) => {
      const refs = (k.references && existsSync(join(repo, k.references)) ? k.references : null)
        ?? [join(dirname(k.path), "references/references.json"), join(dirname(k.path), "references")].find((p) => existsSync(join(repo, p)));
      return { name: k.name, kit: k.name, path: k.path, purpose: k.purpose, skills: skillsOf(k).map((s: { path: string }) => s.path), references: refs ?? null, gaps: k.gaps ?? [] };
    });
  const chain = agentsChain(dir, r.route);
  const pkg = owned ? { skill: skillsOf(owned).map((s: { path: string }) => s.path), template: r.template ?? null, gates: owned.gates ?? [] } : null;
  const out: Obj & { need_now?: { phase: string; status: string; now: string; next: string; why: string } } = { route: r.route, stack, chain, instructions: instructionsOf(chain), package: pkg, note: r.note, groups: r.groups ?? [] };
  if (r.kind === "record") Object.assign(out, { schema: r.schema, template: r.template, checks: r.checks, gate: gateOf(r, dir) });
  { const brand = brandLayout(dir, r.route); if (brand) out.brand = brand; } // Brand hook: brand, voice and package terms at this route (Y-2, Y-3, T-2).
  if (dir && r.kind === "record") {
    try {
      // Caching hook (O-5): shared with the system/need-now command in the same action.
      const nn = JSON.parse(memo(`cmd:packages/naive/src/engine/need-now.ts ${dir} --json`, () => spawnSync("node", [join(repo, "packages/naive/src/engine/need-now.ts"), dir, "--json"], { encoding: "utf8" }), { dir }).stdout);
      const row = nn.rows.find((x: { type: string }) => x.type === r.record);
      if (row) out.need_now = { phase: nn.phase, status: row.status, now: row.now, next: row.next, why: row.why };
    } catch {}
  }
  return out;
}

const fix = (r: RouteEntry) => ({ skills: r.kit_path ? skillsOf(kits().find((k) => k.path === r.kit_path) ?? {}).map((s: { path: string }) => s.path) : [], template: r.template ?? null, schema: r.schema ?? null });

/**
 * Runs one action on one route for one venture. Returns { ok, result } or { ok: false, error }.
 * input: the record to write (write), or { value } for payouts; actor: "person" or "agent" (default
 * agent); actor_id: the role acting (default MENTURA_ACTOR_ID), checked against the team plan's
 * routes; via: the interface (cli, mcp, api; default router); provenance: { derived_from,
 * decision, note, agent } for the log.
 */
// Caching hook (F-2): one top-level call is one action; the calls it makes join it and share its memo.
// Context hook: every call is timed and measured for agent vitals (packages/naive/src/core/instrumentation.ts).
// Gate group hook (M-18): who is acting is checked on every call and carried on the answer.
// Writes hook (packages/naive/src/router/writes.ts): adds what reads, layouts and writes answer.
// The projector hook (packages/naive/src/router/acting.ts): whether the call carries the projector's symbol is read here and passed on.
// As-of hook (packages/naive/src/router/reads-as-of.ts): a researcher reads only as of its cut (reads_as_of, by default
// MENTURA_READS_AS_OF), and an as-of call is refused every action that reads the venture live, before anything runs.
export const call = (args: CallArgs): Promise<Answer> => actionScope(() => instrumented(args, (a: CallArgs) => actingCall(a, (b) => {
  const c = { ...b, reads_as_of: b.reads_as_of ?? process.env.MENTURA_READS_AS_OF, actor_id: b.actor_id ?? process.env.MENTURA_ACTOR_ID };
  const no = asOfRefusal(c);
  if (no) return no;
  const cut = cutFor(c);
  let table = null;
  try { table = resolve(c.route).r; } catch {}
  if (cut.ok && cut.cut !== null && !table) return { ok: false, error: `${c.route} is a package, group or venture route, which reads the venture live, so a call that reads as of a cut may not take it` };
  return around((d: CallArgs) => callInAction(d, isProjector(d)), c);
}, ventureDir), ventureDir));
async function callInAction({ venture, route, action, input, actor = "agent", actor_id = process.env.MENTURA_ACTOR_ID, workspace, via = "router", reads_as_of = null, provenance = {} }: CallArgs, projector = false): Promise<Answer> {
  if (actor === "public" && action !== "read") return { ok: false, error: `the public reader only reads; ${action} needs a person or an agent` };
  const requested = route;
  const inp = isObj(input) ? input : undefined;
  const { r, params, alias } = resolve(route);
  if (!r) return { ok: false, outcome: "error", error: `no route ${route}` };
  // Context hook (packages/naive/src/router/context.ts): navigate reads a route header first, with its layout once per
  // session, its template and prefetched refs; head stops after the header (N-3, L-2, O-4).
  if (action === "navigate" || action === "head") return (await import("./context.ts")).navigate({ ...(inp ?? {}), venture, route: requested, workspace, actor, actor_id, via, header_only: action === "head" || !!inp?.header_only });
  const deprecated = alias ? { deprecated: `${alias.from} is now ${alias.to}${alias.note ? `: ${alias.note}` : ""}` } : {};
  route = r.recipe ? `recipes/${params.pattern ?? ""}` : r.collection === "item" ? r.route.replace("[id]", String(params.id)) : r.route;
  if (r.kind === "record" && !r.recipe && r.record === "recipe" && (action === "write" || action === "append")) return { ...recipeRefusal(route, r.collection === "item" ? fileFor(r, params, null) : null), ...deprecated };
  if (!r.actions.includes(action)) return { ok: false, error: `${route} has no action ${action} (it has ${r.actions.join(", ")})` };
  // A research program's template is its own function's starter (packages/naive/src/functions/<function>/templates/research-program.md).
  if (action === "template" && r.record === "research-program" && r.collection === "item" && params.id !== undefined && isFunction(params.id)) return { ok: true, result: readFileSync(join(repo, templateOf(params.id)), "utf8"), ...deprecated };
  // A route offers template only when it has one (records/routes/routes.ts).
  if (action === "template" && r.template) return { ok: true, result: readFileSync(join(repo, r.template), "utf8"), ...deprecated };
  const dir = venture ? ventureDir(venture, workspace) : null;
  if (action === "layout") { if (venture && !dir) return { ok: false, error: `no venture ${venture}` }; return { ok: true, result: layout(r, dir), ...deprecated }; }
  if (!dir) return { ok: false, error: `no venture ${venture}` };
  // As-of hook: the cut this read answers as of, or null for a live read (a refused cut never reaches here).
  const asOf = cutFor({ action, actor_id, reads_as_of, route });
  const cut = asOf.ok ? asOf.cut : null;
  // No agent reads or writes the eval set (_eval/), as of a cut or not: it is the plan's, and a person's.
  if (actor !== "person" && r.kind === "record" && (r.collection === "item" || r.view_of ? [fileFor(r, params, dir)] : r.files).some(inEval)) return { ok: false, error: `${route} is in the eval set (_eval/), which no agent reads or writes` };
  const act = action === "write" || action === "append" || action === "claim" ? "write" : "read";
  // Gate group hook (F-5): a role that may read some items of a collection may read its list, filtered below.
  if (!allowed(dir, actor_id, act, requested) && !allowed(dir, actor_id, act, route) && !(act === "read" && r.collection === "list" && mayReadSome(dir, actor_id, route))) return { ok: false, error: `${actor_id} may not ${act} ${route} (team plan routes)` };
  // An activity a decision unlocks stays closed to agents until a person makes that decision (EE-058).
  const lock = actor !== "person" && (action === "write" || action === "append" || action === "claim" || action === "run") ? (locked(dir, requested, actor_id) || locked(dir, route, actor_id)) : null;
  if (lock) return { ok: false, error: `${route} is locked until decision ${lock.id} is made: ${lock.question}`, locked_by: lock.id,
    fix: { who: "a person, not an agent", command: `mentura decide ${lock.id} --venture ${venture} --by <their name> [--answer "<their wording>"]`, then: "retry this call" } };
  // Beta gate hook (packages/naive/src/engine/beta-gate.ts): with beta.enabled in naive.config.json, a locked capability's
  // routes are refused, naming the checkpoint feedback that unlocks them. Off by default. The tester is
  // NAIVE_BETA_TESTER, the same id as naive beta, never the acting role.
  const beta = betaBlocked(dir, requested, { table: r.route });
  if (beta) return { ok: false, error: beta.message, beta_locked: beta.capability, fix: { feedback: beta.needs, command: beta.needs.capability ? `naive beta feedback ${beta.needs.capability}` : null, then: "naive beta unlock, then retry this call" } };

  // Recipe hook (autoresearch build plan item 6): recipes/<pattern> reads a recipe's tip and writes an experiment, scored
  // inside the write (packages/naive/src/router/recipes.ts). It is imported only here, because it reaches the TypeScript
  // scorer, and Node strips no types under node_modules, where an app that installs Naive keeps it.
  if (r.recipe) return { ...(await (await import("./recipes.ts")).recipeAction({ dir, r, route, pattern: params.pattern, action, input, actor, actor_id, via, provenance })), ...deprecated };

  if (action === "view") {
    const inner = await call({ venture, route, action: r.kind === "command" ? "run" : "read", input, actor, actor_id, workspace, via, provenance, reads_as_of });
    return inner.ok ? { ok: true, result: render(route, inner), ...deprecated } : inner;
  }

  if (r.kind === "command") {
    if (r.internal === "overview") return { ok: true, result: await overview(venture, workspace), ...deprecated };
    if (r.internal === "robots") return { ok: true, result: robots(dir), ...deprecated };
    // Caching hook: system/cache, system/judge and system/answer are handled in packages/naive/src/engine/caching.ts.
    if (r.internal === "cache" || r.internal === "judge" || r.internal === "answer") return { ...(await cacheInternal(r.internal, { dir, venture: venture ?? "", workspace, input: inp as InternalInput | undefined, actor, actor_id, via, provenance }, { call: (req) => call({ ...req, provenance: req.provenance as CallProvenance | undefined }), resolve, draftOf })), ...deprecated };
    const lacking = (r.needs ?? []).filter((f: string) => !existsSync(ventureFile(dir, f)));
    if (lacking.length) return { ok: false, error: `${route} needs ${lacking.join(", ")} in ${venture}`, fix: { missing: lacking } };
    if (r.value_flag && !inp?.value) return { ok: false, error: `${route} needs a value (${r.note})` };
    // Every command route without a script is one the router answers itself, above (records/routes).
    const script = r.script;
    if (script === null) return { ok: false, error: `${route} has no script` };
    const args = r.venture_arg === "id" ? [dir, ...(inp?.value ? [String(inp.value)] : []), "--json"] : r.value_flag ? [dir, r.value_flag, String(inp?.value), "--json"] : [dir, ...(r.args ?? []), ...(r.as_is && inp?.as_is ? ["--as-is"] : []), "--json"];
    // Caching hook (C-3, H-3): a declared command's result comes from the record-level cache; the spawn is memoized per action (O-5).
    const p = await cachedCommand({ dir, route, script, args, input: inp, actor, actor_id }, () => memo(`cmd:${script} ${args.join(" ")}`, () => spawnSync("node", [join(repo, script), ...args], { encoding: "utf8" }), { dir }));
    const cache = p.cache ? { cache: p.cache } : {};
    if (p.status !== 0) return { ok: false, error: (p.stderr || p.stdout).trim() };
    // A command that needs input first (EE-050) answers needs_input: the caller asks the person
    // whether to fill the record in or run as is, and runs again with input as_is to go on.
    try { const out = JSON.parse(p.stdout); return { ok: true, result: out.needs_input ? null : out, ...(out.needs_input ? { needs_input: out.needs_input } : {}), ...cache, ...deprecated }; } catch { return { ok: true, result: p.stdout, ...cache, ...deprecated }; }
  }

  // Storage: the connector for the source this record type lives in.
  let src: Source | undefined, store: ReadStore | Store | undefined, attrs: Attr[] = [];
  if (r.kind === "record" && (action === "read" || action === "write" || action === "append" || action === "claim")) {
    const context = { actor, ...(r.collection === "item" && (r.record === "product" || r.record === "account") ? { [r.record]: params.id } : {}) };
    try {
      src = sourceFor(dir, r.record, context);
      // As-of hook: a read as of a cut answers from the provenance log and the blob store, never the source itself.
      const storeOf = async (s: Source): Promise<ReadStore | Store> => cut !== null && action === "read" ? asOfStore(dir, s, LOCAL, cut) : await connect(s, dir);
      store = await storeOf(src);
      // Attributes mastered elsewhere (EE-042): read from and written to their own system of record.
      attrs = r.files.every((f: string) => f.endsWith(".json")) ? await Promise.all(attributeSources(dir, r.record, context).map(async (a: { attribute: string; source: Source }) => ({ ...a, store: await storeOf(a.source) }))) : [];
    } catch (e) { return { ok: false, error: messageOf(e) }; }
  }
  const remote = src && src.id !== LOCAL;

  if (action === "read") {
    if (!src || !store) return { ok: false, error: `${route} has no source to read` }; // a record route always has one by here
    const cite = (x: Item) => ({ source: src.id, address: address(src.id, x.path), version: x.version, ...(x.commit ? { commit: x.commit } : {}), ...(x.permalink ? { permalink: x.permalink } : {}), ...(x.attributes ? { attributes: x.attributes } : {}) });
    // Approvals live in the venture folder's sidecars, so a public reader of another source fails closed.
    if (actor === "public" && remote) return { ok: false, error: `the public reader reads only records in the venture's own folder; ${route} lives in ${src.id}` };
    const patterns = r.collection === "item" || r.view_of ? [fileFor(r, params, dir)] : r.files;
    let items: Item[];
    try {
      // a file named _* is never an item; routable: private _folders (P-22)
      const paths = patterns.some((g: string) => g.includes("*")) ? (await store.list()).map((x) => x.path).filter((f) => !/(^|\/)_[^/]*$/.test(f) && patterns.some((g: string) => glob(g).test(f) && routable(f, g))) : patterns;
      // Caching hook (F-2): each record is read once per action and shared.
      items = (await Promise.all(paths.map((f: string): Promise<Item | null> => memo(cut === null ? `read:${src.id}:${f}` : `read-as-of:${cut}:${src.id}:${f}`, () => store.read(f), { dir })))).filter((x): x is Item => !!x);
      // No agent reads the eval set; as of a cut, no signal observed after it.
      if (actor !== "person") items = items.filter((x) => !inEval(x.path));
      if (cut !== null) items = items.filter((x) => observedBy(r.record, x, cut));
      // Gate group hook (F-5): access is checked again at the record; a list holds only the items the role may read.
      if (r.collection === "list" && actor_id) items = items.filter((x) => mayReadItem(dir, actor_id, route, itemId(r.files, x.path)));
      // Confidentiality (C2 and above): a record only its access list may know of is left out, as if absent.
      items = items.filter((x) => mayKnow(dir, x.path, { actor, id: actor === "person" ? process.env.MENTURA_PERSON ?? actor_id : actor_id }));
    } catch (e) { return { ok: false, error: `${src.id}: ${messageOf(e)}` }; }
    const found = items.map((x) => x.path);
    const draft = cut === null && !remote && r.collection !== "list" && fileFor(r, params, dir) && existsSync(ventureFile(dir, draftPath(fileFor(r, params, dir)))) ? draftPath(fileFor(r, params, dir)) : null;
    const loading: Obj = draft ? { pending_draft: { file: draft, since: provEntries(dir).filter((e: { entity: string }) => e.entity === draft).at(-1)?.at ?? null, accept: `mentura accept ${route} --venture ${venture}` } } : {};
    if (remote) {
      type Pr = Entry & { source: { pull_request: string } };
      const prs = provEntries(dir).filter((e): e is Pr => !!e.source?.pull_request && found.concat(patterns).some((f: string) => e.entity === address(src.id, f)));
      if (prs.length) loading.pending_pull_requests = prs.map((e) => ({ entity: e.entity, pull_request: e.source.pull_request, since: e.at }));
    }
    // Framework view hook: a migrated venture's telos is rendered from its canonical goals and exit criteria (frameworks/telos).
    if (!found.length && r.record === "telos" && !remote && actor !== "public" && cut === null) {
      const view = telosView(dir);
      if (view) return { ok: true, result: view, view: { framework: "telos", from: ["foundation/goals", "foundation/exit-criteria"] }, ...deprecated };
    }
    // As-of hook: an as-of answer says the instant it is as of, and carries nothing computed from the live venture.
    const asOfMark = cut === null ? {} : { as_of: { at: new Date(cut).toISOString(), role: actor_id ?? null } };
    const absent = () => {
      const pub = actor === "public";
      return { ok: true, result: null, not_found: { note: r.collection === "list" ? `no ${r.record} records yet` : `no ${r.record} record yet`, ...(remote ? { source: src.id } : {}), template: r.template, schema: r.schema, need_now: pub || cut !== null ? null : layout(r, dir).need_now ?? null, skills: fix(r).skills }, ...(pub ? {} : loading), ...asOfMark, ...deprecated };
    };
    if (!found.length) return absent();
    const parse = (x: Item): unknown => r.view_of ? coreOf(JSON.parse(x.content)) : x.path.endsWith(".json") ? JSON.parse(x.content) : x.path.endsWith(".jsonl") ? x.content.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : x.content;
    // Overlay each attribute mastered elsewhere with the value its system of record holds, and
    // cite where it came from. A source that holds nothing for it leaves the record's own value.
    const overlays = new Map<string, Obj>();
    for (const x of items) {
      const cites: Obj = {};
      for (const a of attrs) {
        let got: Item | null;
        try { got = await a.store.read(x.path); } catch (e) { return { ok: false, error: `${a.source.id}: ${messageOf(e)}` }; }
        const value = got ? JSON.parse(got.content)[a.attribute] : undefined;
        cites[a.attribute] = value === undefined || !got ? { source: a.source.id, missing: true } : { source: a.source.id, address: address(a.source.id, x.path), version: got.version };
        if (value !== undefined) overlays.set(x.path, { ...(overlays.get(x.path) ?? {}), [a.attribute]: value });
      }
      if (attrs.length) x.attributes = cites;
    }
    // Freshness (V-5): a stale record is still read, flagged stale until it is redone (stale-while-revalidate).
    const fresh = remote || cut !== null ? {} : await freshnessFlag(dir, found, r.collection === "list");
    Object.assign(loading, fresh);
    const parseOne = parse;
    const merged = (x: Item) => { const v = parseOne(x); return overlays.has(x.path) ? { ...(v as Obj), ...overlays.get(x.path) } : v; };
    // Field visibility: a public reader (actor "public", what a public component reads) sees only the fields
    // a person approved as public, or their approved variants; every other field is internal and left out.
    // This is the one place values are made, so list and single reads both pass through it.
    const parseWith = (x: Item): unknown => actor === "public" ? publicView(dir, x.path, merged(x)) : merged(x);
    if (r.collection === "list") {
      const idOf = (path: string): string => {
        for (const g of r.files) {
          if (!g.includes("*")) continue;
          const re = new RegExp("^" + g.split("*").map((s: string) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("([^/]*)") + "$");
          const m = path.match(re);
          if (m) return m[1];
        }
        return path;
      };
      // Per-record containment (E-6): an item that does not parse is named in errors; the rest come back.
      const { values, errors } = contain(items, parseWith, idOf);
      if (actor === "public") {
        const shown = values.filter(([, v]) => v && Object.keys(v).length);
        return { ok: true, result: Object.fromEntries(shown.map(([x, v]) => [idOf(x.path), v])), sources: Object.fromEntries(shown.map(([x]) => [idOf(x.path), cite(x)])), ...deprecated };
      }
      return { ok: true, result: Object.fromEntries(values.map(([x, v]) => [idOf(x.path), v])), sources: Object.fromEntries(values.map(([x]) => [idOf(x.path), cite(x)])), ...(Object.keys(errors).length ? { errors } : {}), ...fresh, ...asOfMark, ...deprecated };
    }
    // A public reader learns nothing of an item with no public field, not even that its id exists.
    const hidden = (x: Item) => { try { const v = parseWith(x); return !v || !Object.keys(v).length; } catch { return true; } };
    if (actor === "public" && r.collection === "item" && items.every(hidden)) return absent();
    const data = Object.fromEntries(items.map((x) => [x.path, parseWith(x)]));
    // V-9 hook: a summary whose source changed since it was written is marked stale (packages/naive/src/engine/stale.ts).
    const stale = !remote && cut === null && items.length === 1 ? staleOf(dir, found[0]) : null;
    return { ok: true, result: items.length === 1 ? data[found[0]] : data, ...(items.length === 1 ? { source: cite(items[0]) } : { sources: Object.fromEntries(items.map((x) => [x.path, cite(x)])) }), ...(actor === "public" ? {} : { ...loading, ...(stale ? { stale } : {}) }), ...asOfMark, ...deprecated };
  }

  if (action === "check") {
    // Gate group hook (P-7): the checks settings in naive.config.json turn a check off or make it warn only.
    const plan = checkPlan(dir, r.checks);
    const outs = plan.filter((p) => p.mode !== "off").map((p) => ({ check: p.check, mode: p.mode, ...spawnSync("node", [join(repo, p.check), dir], { encoding: "utf8" }) }));
    const ok = outs.every((o) => o.status === 0 || o.mode === "warn");
    return { ok, result: [...outs.map((o) => ({ check: o.check, passed: o.status === 0, ...(o.mode === "warn" ? { warn_only: true } : {}), output: (o.stdout + o.stderr).trim() })), ...plan.filter((p) => p.mode === "off").map((p) => ({ check: p.check, passed: null, off: true }))], ...(ok ? {} : { fix: fix(r) }), ...deprecated };
  }

  if (action === "append") {
    forget(dir); // Caching hook (H-3): what this action memoized for the venture is read again after an append.
    if (!src || !writable(store)) return { ok: false, error: `${route} has no source to write` }; // a record route always has one by here
    const file = fileFor(r, params, dir);
    if (isRecipeFile(file)) return { ...recipeRefusal(route, file), ...deprecated };
    // Gate group hook: one writer per file (writer projection or person in the data model).
    const owned = ownerOfWrite({ dir, r, route, file, projector, remote, actor, acting: !!actingAgent(provenance.agent?.id), role: actor_id });
    if (owned) return { ...owned, ...deprecated };
    const agent = agentFromEnv(actor === "person" ? "person" : "agent", via, { ...(actor_id && actor !== "person" ? { id: actor_id } : {}), ...provenance.agent });
    return { ...(await appendLine({ dir, r, id: params.id, route, requested, file, input, actor, actor_id, provenance, store, src, agent, remote })), ...deprecated };
  }

  if (action === "claim") {
    forget(dir); // Caching hook (H-3): what this action memoized for the venture is read again after a claim.
    if (!src || !writable(store)) return { ok: false, error: `${route} has no source to write` }; // a record route always has one by here
    // Handoff claim (packages/naive/src/router/handoff-claim.ts): ready, unclaimed and addressed to the acting role, or refused.
    const file = fileFor(r, params, dir);
    const owned = ownerOfWrite({ dir, r, route, file, projector, remote, actor, acting: !!actingAgent(provenance.agent?.id) });
    if (owned) return { ...owned, ...deprecated };
    const agent = agentFromEnv(actor === "person" ? "person" : "agent", via, { ...(actor_id && actor !== "person" ? { id: actor_id } : {}), ...provenance.agent });
    return { ...(await claimHandoff({ dir, r, id: params.id, route, requested, file, actor, actor_id, provenance, store, src, agent, remote })), ...deprecated };
  }

  if (action === "write") {
    forget(dir); // Caching hook (H-3): a write never uses the cache, and what this action memoized for the venture is read again after it.
    if (!src || !writable(store)) return { ok: false, error: `${route} has no source to write` }; // a record route always has one by here
    // Prose a person owns (writer person: a research program) is written whole as text, not as a JSON record.
    const prose = r.writer === "person" && (r.form === "prose" || r.form === "markdown");
    if (!prose && (!input || typeof input !== "object")) return { ok: false, error: "write needs the record as input" };
    if (r.collection === "item" && !/^[a-z0-9][a-z0-9-]*$/.test(String(params.id))) return { ok: false, error: `${params.id} is not a valid id (lowercase letters, digits and hyphens)` };
    const file = fileFor(r, params, dir);
    if (isRecipeFile(file)) return { ...recipeRefusal(route, file), ...deprecated };
    // Gate group hook: one writer per file. A projection record is the projector's alone, and the projector writes
    // nothing a person owns once it exists; a person-only record (a research program) is a person's alone, so every
    // agent is refused, a researcher included. Refused here, before the schema, the gate or any source is touched.
    const owned = ownerOfWrite({ dir, r, route, file, projector, remote, actor, acting: !!actingAgent(provenance.agent?.id), role: actor_id });
    if (owned) return { ...owned, ...deprecated };
    // Handoff claim hook (packages/naive/src/router/handoff-claim.ts): a handoff that names its requester is edited by
    // the requester before a claim; after one, the claimant writes progress and evidence and the requester the
    // verification and acceptance. claimBase is the version that rule read, which the write below names.
    let claimBase, claimed = false;
    if (r.record === "handoff" && inp) {
      const person = actor === "person" && !actingAgent(provenance.agent?.id);
      const rule = await handoffWriteRule({ store, file, input: inp, person, actorId: actor_id, agent: agentFromEnv(person ? "person" : "agent", via, { ...(actor_id && !person ? { id: actor_id } : {}), ...provenance.agent }) });
      if (!rule.ok) return { ...rule, ...deprecated };
      claimBase = rule.base;
      claimed = !!rule.stored?.requested_by && !!rule.stored?.claimed_by && rule.stored.role === actor_id;
    }
    // Function agent reach (reachOfWrite in packages/naive/src/router/gate-hooks.ts): <function>-agent writes only
    // decisions and its function's record routes, refused before the schema. A handoff addressed to its role that it
    // has claimed is the exception: the claim rule above already limits the claimant to progress and evidence.
    const outOfReach = claimed ? null : reachOfWrite({ r, route, projector, actor, acting: !!actingAgent(provenance.agent?.id), role: actor_id });
    if (outOfReach) return { ...outOfReach, ...deprecated };
    if (prose) return { ...(await writeProse({ dir, r, route, requested, file, input, actor, actor_id, via, provenance, store, remote, src, params, projector })), ...deprecated };
    // Not prose, so the input is the record, an object (checked above).
    let rec: Obj = inp ?? {};
    // A migrated venture's telos is a view of its canonical records; a telos.json written now would be a second record the lifecycle never reads.
    if (r.record === "telos" && !remote && migrated(dir)) return { ok: false, error: `${venture} keeps its goals and exit criteria as canonical records, so a telos.json is not written: write foundation/goals/telos (measures), foundation/goals/owner-outcome and foundation/exit-criteria/<phase> instead` };
    if (["idea-dump", "raw-source", "raw-text", "raw-dump", "triage"].includes(r.record) && existsSync(ventureFile(dir, file))) return { ok: false, error: `${route} is raw and immutable: add a new capture, do not edit this one` };
    // Agent drafts are refused here because accepting one moves the whole file into place, and this draft holds only a view of it.
    if (r.view_of && (actor !== "person" || actingAgent(provenance.agent?.id) || remote || attrs.length)) return { ok: false, error: `only a person writes ${route}, in the venture's own folder; it holds part of ${file}` };
    // A record that names its venture names the one it is written to (naive#71): a record carried over from another
    // venture is refused, not filed under the wrong name.
    if (typeof rec.venture === "string") {
      let own = null;
      try { own = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).id ?? null; } catch { own = null; }
      if (own && rec.venture !== own) return { ok: false, error: `the record names venture ${rec.venture}, but it is being written to ${own}: set its venture field to ${own}, or write it to ${rec.venture}`, fix: fix(r) };
    }
    const gate = gateOf(r, dir);
    const text = JSON.stringify(rec, null, 2) + "\n";
    // The schema first, through RecordValidator, so nothing reaches any source unless it matches.
    const failed = schemaFailure(schemaNameOf(String(r.schema)), JSON.parse(text));
    if (failed !== null) return { ok: false, error: `does not match ${r.schema}:\n${failed}`, fix: fix(r) };
    // The schema describes ends as after starts. A start that is not a time, or an end that is not after it, never opens.
    if (r.record === "time-box") { const span = timeBoxSpan(rec.starts, rec.ends); if (span) return { ok: false, error: span }; }
    const base = r.view_of ? readFileSync(ventureFile(dir, file), "utf8") : null;
    const whole = base && JSON.stringify(withCore(JSON.parse(base), rec), null, 2) + "\n";
    if (whole) {
      const w = schemaFailure("venture.schema.json", JSON.parse(whole));
      if (w !== null) return { ok: false, error: `${file} does not match packages/naive/src/records/venture.schema.json, so nothing was written:\n${w}`, fix: fix(r) };
    }
    const agent = agentFromEnv(actor === "person" ? "person" : "agent", via, { ...(actor_id && actor !== "person" ? { id: actor_id } : {}), ...provenance.agent });
    const log = (entity: string, activity: string, extra: Obj = {}) => prov(dir, { entity, route, activity, agent, derived_from: provenance.derived_from, decision: provenance.decision ?? gate?.class ?? undefined, note: provenance.note, ...extra });

    // Attributes mastered elsewhere (EE-042) go to their own system of record, each as a JSON
    // object holding only that attribute at the record's path, and leave the record's own file, so
    // the fact lives in one place. The whole record was checked against its schema above. A gated
    // agent write stays whole, as a draft, until a person accepts it.
    // Attributes written to their own source; a write is never as of a cut, so each store is a connector.
    const split = attrs.filter((a): a is Attr & { store: Store } => a.attribute in rec && writable(a.store));
    // A decision record that is open and fails closed, or waits on one that is, holds the record
    // (EE-054): an agent's write becomes a draft, as for a gated record.
    const held = !remote && actor !== "person" ? holding(dir, file) : null;
    // The venture's own fail-closed routes (naive.config.json, the gate, EE-073) hold an agent's write too.
    // Gate group hook (X-1 to X-6, U-4): the venture's gate decides; a refusal stops the write here.
    const configured = !remote ? gateWrite({ dir, r, route, requested, file, actor, actor_id, provenance, gate, projector }) : null;
    if (configured?.then === "refuse") return { ok: false, error: configured.why, gate_rule: configured.rule, refused_by: configured.source };
    // Only a person settles a decision (EE-058): an agent's write that marks one decided, or names who
    // approved it, is a draft whatever the decision's class.
    const isDecision = /^(decision|decision-record)$/.test(r.record);
    // One id, one file: a new file's id is its name and an existing file keeps its id, or a sibling
    // could answer for a decided decision and skip the draft below.
    if (r.record === "decision-record" && !remote) {
      const here = existsSync(ventureFile(dir, file)) ? (load(ventureFile(dir, file)) as DecisionRecord).id : basename(file, ".decision.json");
      const holder = typeof rec.id === "string" ? decisionFile(dir, rec.id) : null;
      if (rec.id !== here || (holder && holder !== file)) return { ok: false, error: `${file} holds decision ${here}, not ${rec.id}: a decision's id is its file name, and one id has one file` };
    }
    // Rewriting a decided record, to reopen it say, unsettles it, which is a person's act too (approve
    // would otherwise freeze its reasons afresh and clear their staleness).
    const unsettles = isDecision && !remote && existsSync(ventureFile(dir, file)) && (load(ventureFile(dir, file)) as DecisionRecord).status === "decided";
    const settles = isDecision && (unsettles || rec.status === "decided" || rec.approved_by != null || (isObj(rec.provenance) && rec.provenance.approved_by != null));
    // Known gap A: a decided decision names who decided it, whoever writes it; a person's write without one is refused.
    if (isDecision && actor === "person" && rec.status === "decided" && !(isObj(rec.provenance) && rec.provenance.approved_by)) return { ok: false, error: `a decided decision names who decided it (provenance.approved_by); approve it with mentura decide ${rec.id ?? "<id>"} --by <name>` };
    // The projector's write to a projection record is never a draft: no one but the projector could accept it.
    const gatedDraft = !remote && (!!gate?.drafts || !!held || !!configured || settles) && actor !== "person" && !(projector && r.writer === "projection");
    const attributeWrites: Obj[] = [];
    if (split.length && !gatedDraft) {
      for (const a of split) {
        if (a.store.writes === "none") return { ok: false, error: `${r.record}.${a.attribute} is mastered in ${a.source.id}, which is read-only` };
      }
      for (const a of split) {
        const part = JSON.stringify({ [a.attribute]: rec[a.attribute] }, null, 2) + "\n";
        let w;
        try { w = await a.store.write(file, part, { message: `${route}.${a.attribute}: ${provenance.note ?? "written through Mentura"}`, title: `Mentura: ${route}.${a.attribute} (${venture})` }); }
        catch (e) { return { ok: false, error: `${a.source.id}: ${messageOf(e)}` }; }
        const at = address(a.source.id, file);
        log(`${at}#${a.attribute}`, a.store.writes === "pull-request" ? "draft" : provenance.activity ?? "write", { sha256: createHash("sha256").update(part).digest("hex"), content: part,
          source: { id: a.source.id, connector: a.source.connector, version: w.version, ...(w.pull_request ? { pull_request: w.pull_request.url } : {}) } });
        attributeWrites.push({ attribute: a.attribute, written: at, version: w.version, ...(w.pull_request ? { pull_request: w.pull_request.url } : {}) });
      }
      rec = Object.fromEntries(Object.entries(rec).filter(([k]) => !split.some((a) => a.attribute === k)));
    }
    const attributesOut = attributeWrites.length ? { attributes: attributeWrites } : {};
    const recordText = whole ?? (attributeWrites.length ? JSON.stringify(rec, null, 2) + "\n" : text);

    if (remote) {
      // Another source: its connector decides how a write lands. A pull-request source opens a
      // draft pull request, which a person accepts by merging, so it is a draft for anyone.
      if (store.writes === "none") return { ok: false, error: `${route} lives in ${src.id}, which is read-only` };
      let w;
      try { w = await store.write(file, recordText, { message: `${route}: ${provenance.note ?? `written by ${actor === "person" ? "a person" : "an agent"} through Mentura`}`, title: `Mentura: ${route} (${venture})` }); }
      catch (e) { return { ok: false, error: `${src.id}: ${messageOf(e)}` }; }
      const draft = store.writes === "pull-request";
      const at = address(src.id, file);
      const entry = log(at, draft ? "draft" : provenance.activity ?? "write", { sha256: createHash("sha256").update(recordText).digest("hex"), content: recordText,
        source: { id: src.id, connector: src.connector, version: w.version, ...(w.commit ? { commit: w.commit } : {}), ...(w.pull_request ? { pull_request: w.pull_request.url } : {}) } });
      return { ok: true, result: { written: at, draft, gate: gate?.class ?? null, provenance: entry.hash, version: w.version, ...(w.pull_request ? { pull_request: w.pull_request.url } : {}),
        note: draft ? `opened draft pull request ${w.pull_request?.url}; merging it accepts the write` : "written", ...attributesOut }, ...deprecated };
    }

    const draft = gatedDraft;
    // Detection ledger hook (packages/naive/src/router/gate-hooks.ts): only when the venture keeps the gate detector, the gate's
    // confidence call becomes a trial, a person accepting a held draft resolves it as a false alarm, and a person's
    // revert of an accepted write resolves it as a miss. Without the detector file it is null and nothing changes.
    const ledger = ledgerHook({ dir, venture, workspace, r, route, file, draftFile: draftPath(file), actor, actor_id, via, provenance, draft });
    // Gate group hook (X-2): the held draft, the owner it was sent to and any variants kept side by side.
    const held2 = draft ? heldDraft(dir, { draft: draftPath(file), file, text, verdict: configured, route, agent, trial: ledger?.held }) : null;
    if (!held2) {
      if (base !== null && readFileSync(ventureFile(dir, file), "utf8") !== base) return { ok: false, error: `${file} changed while this was being checked, so nothing was written: try again` };
      if (claimBase === undefined) await store.write(file, recordText);
      else {
        try { await store.write(file, recordText, { base: claimBase }); }
        catch (e) {
          if (isObj(e) && e.code === "version-conflict") return { ok: false, error: `${file} changed while this was being checked, so nothing was written: read it again and retry` };
          throw e;
        }
      }
    }
    const entry = log(held2 ? held2.written : file, draft ? "draft" : provenance.activity ?? "write", r.view_of ? { statements: statementsIn(rec) } : {});
    const detector = ledger ? await ledger.after(entry.hash) : null;
    return { ok: true, result: { written: held2 ? held2.written : file, draft, gate: gate?.class ?? null, provenance: entry.hash, note: draft ? (gate?.drafts ? `${r.record} is a ${gate.class} decision (${gate.level}, owner ${gate.owner}): written as a draft for a person to accept` : held ? `decision ${held.id} ${held.why}: written as a draft for a person to accept` : configured ? configured.why : "only a person settles a decision: written as a draft for a person to accept") : "written", ...(held ? { held_by: held.id } : {}), ...(configured ? { gate_rule: configured.rule, ...(configured.owner ? { owner: configured.owner } : {}) } : {}), ...(held2?.variants ? { variant: held2.variant, variants: held2.variants, decision: held2.decision } : {}), ...attributesOut, ...(detector ? { detector } : {}) }, ...deprecated };
  }
  return { ok: false, error: `unhandled action ${action}` };
}

// A person's write of prose they own (writer person in the data model: programs/<function>.md, a function's research
// program; autoresearch design, everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md). ownerOfWrite has
// already refused every agent. The input is the whole text, as { text } or a string. It is kept only in the venture's
// own folder, meets the venture's gate (a refusal stops it; a person is never held), lands live, and its provenance
// line keeps the bytes in the blob store, so an as-of read returns the program as it was.
async function writeProse({ dir, r, route, requested, file, input, actor, actor_id, via, provenance, store, remote, src, params, projector }: {
  dir: string; r: RouteEntry; route: string; requested: string; file: string; input: unknown; actor: string; actor_id?: string; via: string; provenance: CallProvenance;
  store: Store; remote: boolean | undefined; src: Source; params: { id?: string }; projector: boolean;
}): Promise<Answer> {
  if (remote) return { ok: false, error: `${route} is kept in the venture's own folder, but the source map puts it in ${src.id}` };
  if (r.record === "research-program" && !isFunction(params.id ?? "")) return { ok: false, error: `${params.id} is not a function: a research program is programs/<function>.md for a function in packages/naive/src/functions/departments.json` };
  const raw = typeof input === "string" ? input : isObj(input) && typeof input.text === "string" ? input.text : null;
  if (raw === null || !raw.trim()) return { ok: false, error: `write ${route} with its whole text as input: { "text": "..." }` };
  const gate = gateOf(r, dir);
  const configured = gateWrite({ dir, r, route, requested, file, actor, actor_id, provenance, gate, projector });
  if (configured?.then === "refuse") return { ok: false, error: configured.why, gate_rule: configured.rule, refused_by: configured.source };
  await store.write(file, raw.endsWith("\n") ? raw : `${raw}\n`);
  const agent = agentFromEnv("person", via, { ...provenance.agent });
  const entry = prov(dir, { entity: file, route, activity: provenance.activity ?? "write", agent, derived_from: provenance.derived_from, decision: provenance.decision ?? gate?.class ?? undefined, note: provenance.note });
  return { ok: true, result: { written: file, draft: false, gate: gate?.class ?? null, provenance: entry.hash, note: "written" } };
}

// Views (pages): Markdown for people. A generic renderer: objects become headings and lists,
// arrays of flat objects become tables.
function md(x: unknown, depth = 2): string {
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
  const blocks: string[] = [];
  for (const [k, v] of Object.entries(x)) {
    if (v !== null && typeof v === "object") blocks.push(`${"#".repeat(Math.min(depth, 6))} ${k}\n\n${md(v, depth + 1)}`);
    else if (blocks.length && blocks.at(-1)?.startsWith("- **")) blocks[blocks.length - 1] += `\n- **${k}:** ${v}`;
    else blocks.push(`- **${k}:** ${v}`);
  }
  return blocks.join("\n\n");
}

type Slot = { slot: string; data?: unknown; error?: string };
// What a view reads of an answer: an overview's slots, a missing record's note, a waiting draft, else the result as it is.
type Viewed = { result?: { venture?: string; slots?: Slot[] } | null; not_found?: { note: string; template?: string | null; need_now?: { status: string; now: string } | null }; pending_draft?: { accept: string } };
function render(route: string, answer: Answer): string {
  // A view reads these fields of whatever the route answered; one it lacks is undefined, as before.
  const res = answer as Viewed;
  if (res.result?.slots) return [`# ${res.result.venture}: overview`, ...res.result.slots.map((s) => `## ${s.slot}\n\n${s.error ? `_could not render: ${s.error}_` : md(s.data, 3)}`)].join("\n\n");
  const head = `# ${route}`;
  if (res.result === null && res.not_found) return `${head}\n\n${res.not_found.note}.${res.not_found.template ? ` Start from \`${res.not_found.template}\`.` : ""}${res.not_found.need_now ? ` Need-now: ${res.not_found.need_now.status} (${res.not_found.need_now.now}).` : ""}`;
  return `${head}\n\n${res.pending_draft ? `> A draft is waiting for a person to accept: \`${res.pending_draft.accept}\`\n\n` : ""}${md(res.result)}`;
}

/** What the overview reads of purpose/validation/assess (packages/naive/src/engine/assess-problem.ts). */
type Assessed = { supports: unknown; next: unknown; assumptions: { assumption: string; label: string }[]; missing: unknown[] };
/** What the overview reads of system/time-to-ready (packages/naive/src/engine/time-to-ready.ts). */
type Ready = { running: { on?: string; missing: string[] }; layers: { layer: string; ready_on?: string; missing: string[] }[] };
// The overview's slots (@slot): each is computed on its own, so one failing does not stop the rest.
async function overview(venture: string | undefined, workspace: string | undefined) {
  const dir = ventureDir(venture, workspace);
  // callInAction answered "no venture" before reaching here, so dir is found.
  if (!dir) throw new Error(`no venture ${venture}`);
  const v = load<Venture>(join(dir, "venture.json"));
  const slot = async (name: string, f: () => unknown): Promise<Slot> => { try { return { slot: name, data: await f() }; } catch (e) { return { slot: name, error: messageOf(e).split("\n")[0] }; } };
  // Each slot names the shape of the command or record it reads (a parse boundary); a slot whose answer lacks a field fails alone, as before.
  const run = async <T>(route: string): Promise<T> => { const r = await call({ venture, route, action: "run", workspace }); if (!r.ok) throw new Error(r.error); return r.result as T; };
  const read = async <T>(route: string): Promise<T | string> => { const r = await call({ venture, route, action: "read", workspace }); if (!r.ok) throw new Error(r.error); return (r.result ?? (r as Answer & { not_found?: { note?: string } }).not_found?.note) as T | string; };
  return {
    venture: v.id,
    slots: await Promise.all([
      slot("@venture", () => ({ name: v.name, phase: v.phase, ambition: scale(dir, v), status: v.status, promise: v.core?.promise ?? null })),
      slot("@telos", async () => { const t = await read<{ end?: string; statement?: string; phases?: { phase: string }[] }>("purpose/telos"); return typeof t === "string" ? t : { end: t.end ?? t.statement ?? null, phases: (t.phases ?? []).map((p: { phase: string }) => p.phase) }; }),
      slot("@validation", async () => { const r = await call({ venture, route: "purpose/validation/assess", action: "run", input: { as_is: true }, workspace }); if (!r.ok) throw new Error(r.error); const a = r.result as Assessed; return { supports: a.supports, next: a.next, assumptions: a.assumptions.map((x: { assumption: string; label: string }) => `${x.assumption}: ${x.label}`).join(", "), missing: a.missing.length }; }),
      slot("@need-now", async () => (await run<{ rows: { status: string; type: string; now: string; why: string }[] }>("system/need-now")).rows.filter((x: { status: string }) => x.status === "suggest now").map((x: { type: string; now: string; why: string }) => ({ record: x.type, now: x.now, why: x.why }))),
      slot("@ready", async () => { const t = await run<Ready>("system/time-to-ready"); return { running: t.running.on ?? `not yet: ${t.running.missing.join(", ")}`, layers: t.layers.map((l: { layer: string; ready_on?: string; missing: string[] }) => ({ layer: l.layer, ready: l.ready_on ?? `missing ${l.missing.join(", ")}` })) }; }),
      slot("@team", async () => { const p = await read<TeamPlan>("people/team-plan"); if (typeof p === "string") return p; return p.roles.map((x: TeamPlan["roles"][number]) => ({ role: x.id, occupant: x.occupant, status: x.status, needed_by: x.needed_by })); }),
      slot("@packages", () => packageSlots(dir, venture)), // P-17: a package with nothing in it shows its default
      slot("@provenance", () => provEntries(dir).slice(-5).reverse().map((e) => ({ at: e.at, activity: e.activity, entity: e.entity, by: `${e.agent?.kind}${e.agent?.id ? ` ${e.agent.id}` : ""} via ${e.agent?.via}` }))),
    ]),
  };
}

// Robots: per role, the routes it may read and write.
function robots(dir: string) {
  const plan = [join(ventureFile(dir, "people/team-plan.json")), join(ventureFile(dir, "operations/team-plan.json"))].find((p) => existsSync(p));
  if (!plan) return { note: "no team plan: every actor may reach every route; gates still apply", roles: [] };
  return { note: "a role without routes may reach every route; gates still apply", roles: (load(plan) as TeamPlan).roles.map((r) => ({ role: r.id, occupant: r.occupant, read: (r.routes?.read ?? ["**"]).join(", "), write: (r.routes?.write ?? (r.routes ? [] : ["**"])).join(", ") || "none" })) };
}

/** The route table as Markdown, for docs/reference/ROUTES.md. */
export function routesMd() {
  const rows = routes().map((r: RouteEntry) => `| \`${r.route}\` | ${r.kind}${r.collection ? ` (${r.collection})` : ""} | ${r.actions.join(", ")} | ${r.kind === "record" ? `\`${(r.files ?? []).join("`, `")}\`` : r.script ? `\`${r.script}\`` : "router"} | ${r.decision_class ?? ""} | ${r.groups.join(" ")} | ${r.note.replace(/\|/g, "/")} |`);
  const gs = groups().map((g) => `| \`${g.group}\` | ${g.question} | ${g.routes.length ? g.routes.map((x: string) => `\`${x}\``).join(", ") : "none"} |`);
  return [
    "## Routes (generated by `node packages/naive/src/router/router.ts --md`)",
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
