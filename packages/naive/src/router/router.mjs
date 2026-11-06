// The routes' actions, shared by the CLI, the MCP server and the HTTP API (EE-030, EE-032). The route
// table itself is packages/naive/src/records/routes/routes.mjs, re-exported here: routes are generated from the data
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
//                 resolved_by names the level that answered (packages/naive/src/router/reads.mjs)
//   writes        a write answers with what it changed and the next route to act on; a layout lists
//                 the actions open to the actor; package, group and venture routes; global errors
//                 (packages/naive/src/router/writes.mjs wraps call)
//   storage       a record is read and written through the connector for the source its record
//                 type lives in (packages/naive/src/store/connectors, EE-037): the venture's own folder unless its
//                 knowledge/sources.json names another, such as a GitHub repository, where a write
//                 opens a draft pull request. A read says which source and version it came from.
//
// Partial adoption: a route needs only its own record and what its kit reads.

import { mayKnow, publicView } from "../engine/visibility.mjs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { actingAgent, agentFromEnv, entries as provEntries, record as prov } from "../core/provenance.mjs";
import { address } from "../store/connectors/contract.mjs";
import { decisionFile, holding, locked } from "../engine/decisions.mjs";
import { configOf, hold } from "../engine/gate.mjs";
import { blocked as betaBlocked } from "../engine/beta-gate.mjs";
// Freshness (Revalidating, V-1 to V-8): stale flags on reads, and the freshness and revalidate commands.
import { readFlag as freshnessFlag } from "../engine/freshness.mjs";
// Gate group hooks (M-18, F-5, X-2, X-4 to X-6, P-2, P-7, U-4): who is acting, access at the record,
// the gate's verdict, where held drafts wait, and check settings. The logic lives in these modules.
import { actingCall, itemId, mayReadItem, mayReadSome } from "./acting.mjs";
import { checkPlan, gateWrite, heldDraft } from "./gate-hooks.mjs";
import { LOCAL, attributeSources, connect, sourceFor } from "../store/connectors/index.mjs";
// Caching (packages/naive/src/engine/caching.mjs): per-action memo, the record-level cache for command routes, and system/cache, system/judge, system/answer.
import { command as cachedCommand, forget, internal as cacheInternal } from "../engine/caching.mjs";
import { actionScope, memo } from "../core/action-scope.mjs";
// Context hook: instrumentation of every call and judgment (packages/naive/src/core/instrumentation.mjs, P-4, F-4).
import { instrumented, judgment } from "../core/instrumentation.mjs";
// Hooks for writes, reads and boundaries (wf/writes): the wrapper around call, per-record containment and private folders.
import { around } from "./writes.mjs";
import { contain } from "./boundaries.mjs";
import { packageSlots } from "./package-routes.mjs";
import { routable } from "../engine/structure.mjs";
// Brand hook (Y-2..Y-4, J-2..J-4, T-1, T-2, P-24, P-26): routes, commands and layout context from packages/naive/src/engine/brand.mjs.
import { brandLayout } from "../engine/brand.mjs";
// Investors lint hook: investors/lint (packages/naive/src/checks/lint-investors.mjs).
// Customers lint: a customer that matches no ICP, and a promise the product record does not keep.
// Legal lint hook: legal/lint (packages/naive/src/checks/lint-legal.mjs). A lint, not legal advice.
// Upgrades hook (V-9): a read says when what the record reads changed in its system of record.
import { staleOf } from "../engine/stale.mjs";
import { ventureFile } from "../core/venture-paths.mjs";
import { coreOf, statementsIn, withCore } from "../engine/venture-core.mjs";
import { telosView } from "../../../../frameworks/telos/adapter.mjs";
import { migrated, scale } from "../engine/canonical.mjs";
import { schemaNameOf } from "../records/index.mjs";
import {
  PHASES, allowed, defaultWorkspace, files, gateOf, glob, groups, kits, load, repo, resolve, routes, skillsOf, ventureDir, ventures,
} from "../records/routes/routes.mjs";
// The route table lives in packages/naive/src/records/routes so that schema/ can read it without importing this file.
export { PHASES, allowed, files, gateOf, glob, groups, kits, repo, resolve, routes, ventureDir, ventures };

// Prefer a file that is already there, so an unmigrated venture keeps its old path. A new write uses the first path, which is the package layout.
const fileFor = (r, params, dir) => {
  if (r.view_of) return "venture.json";
  const cands = (r.collection === "item" ? r.files.map((f) => f.replace("*", params.id)) : r.files).filter((f) => !f.includes("*"));
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
const draftPath = (file) => join("_drafts", `${file.replace(/\//g, "__")}.draft`);

/** Where an agent's draft of a gated record waits: { dir, file, draft, gate } or null. */
export function draftOf(route, venture, workspace) {
  const { r, params } = resolve(route);
  const dir = ventureDir(venture, workspace);
  if (!r || r.kind !== "record" || r.collection === "list" || !dir) return null;
  const file = fileFor(r, params, dir);
  if (!file) return null; // a route with no concrete file (a pattern-only slot) has no draft
  return { dir, file, draft: draftPath(file), gate: gateOf(r, dir), route: r.collection === "item" ? r.route.replace("[id]", params.id) : r.route };
}

function agentsChain(dir, route) {
  if (!dir) return [];
  const chain = [];
  const add = (rel) => { const f = ventureFile(dir, rel); if (existsSync(f)) chain.push({ path: rel, text: readFileSync(f, "utf8") }); };
  add("AGENTS.md");
  const parts = route.split("/").filter(Boolean);
  let acc = "";
  for (const p of parts) { acc = acc ? `${acc}/${p}` : p; add(`${acc}/AGENTS.md`); }
  return chain;
}
function instructionsOf(chain) {
  const out = {};
  for (const file of chain) for (const line of file.text.split("\n")) {
    const m = line.match(/^([a-z][a-z0-9_-]*)\s*:\s*(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

/** A score below its threshold is uncertain: not an error and not an answer. It routes to the function owner. */
export function judge(score, threshold, owner, at) {
  const out = typeof score !== "number" || score < threshold ? { outcome: "uncertain", owner, result: null } : { outcome: "answer", result: score };
  // Context hook: a judgment made for a venture (at.dir) is an instrumentation event (F-4).
  if (at?.dir) judgment(at.dir, { question: at.question, route: at.route, model: at.model, score, threshold, outcome: out.outcome, owner });
  return out;
}

/** Runs fn. A throw is the uncaught outcome. */
export function capture(fn) {
  try { fn(); return { outcome: "answer" }; }
  catch (e) { return { outcome: "uncaught", error: String(e.message ?? e) }; }
}

/** The layout wrapping a route: system layer, the record's layer, and its package when one owns it.
 *  chain is the AGENTS.md files from the venture root down to the route, nearest last. */
export function layout(r, dir) {
  const ks = kits();
  const owned = r.kit_path && (r.kit_path.startsWith("packages/naive/library/packages/") || r.kit_path.includes("/kits/")) ? ks.find((k) => k.path === r.kit_path) : null;
  const stack = [ks.find((k) => k.path === "packages/naive/src/records/layer.json"), ks.find((k) => k.path === `${r.layer ?? r.route.split("/")[0]}/layer.json`), owned]
    .filter(Boolean).map((k) => {
      const refs = (k.references && existsSync(join(repo, k.references)) ? k.references : null)
        ?? [join(dirname(k.path), "references/references.json"), join(dirname(k.path), "references")].find((p) => existsSync(join(repo, p)));
      return { name: k.name, kit: k.name, path: k.path, purpose: k.purpose, skills: skillsOf(k).map((s) => s.path), references: refs ?? null, gaps: k.gaps ?? [] };
    });
  const chain = agentsChain(dir, r.route);
  const pkg = owned ? { skill: skillsOf(owned).map((s) => s.path), template: r.template ?? null, gates: owned.gates ?? [] } : null;
  const out = { route: r.route, stack, chain, instructions: instructionsOf(chain), package: pkg, note: r.note, groups: r.groups ?? [] };
  if (r.kind === "record") Object.assign(out, { schema: r.schema, template: r.template, checks: r.checks, gate: gateOf(r, dir) });
  { const brand = brandLayout(dir, r.route); if (brand) out.brand = brand; } // Brand hook: brand, voice and package terms at this route (Y-2, Y-3, T-2).
  if (dir && r.kind === "record") {
    try {
      // Caching hook (O-5): shared with the system/need-now command in the same action.
      const nn = JSON.parse(memo(`cmd:packages/naive/src/engine/need-now.mjs ${dir} --json`, () => spawnSync("node", [join(repo, "packages/naive/src/engine/need-now.mjs"), dir, "--json"], { encoding: "utf8" }), { dir }).stdout);
      const row = nn.rows.find((x) => x.type === r.record);
      if (row) out.need_now = { phase: nn.phase, status: row.status, now: row.now, next: row.next, why: row.why };
    } catch {}
  }
  return out;
}

const fix = (r) => ({ skills: r.kit_path ? skillsOf(kits().find((k) => k.path === r.kit_path) ?? {}).map((s) => s.path) : [], template: r.template ?? null, schema: r.schema ?? null });

/**
 * Runs one action on one route for one venture. Returns { ok, result } or { ok: false, error }.
 * input: the record to write (write), or { value } for payouts; actor: "person" or "agent" (default
 * agent); actor_id: the role acting (default MENTURA_ACTOR_ID), checked against the team plan's
 * routes; via: the interface (cli, mcp, api; default router); provenance: { derived_from,
 * decision, note, agent } for the log.
 */
// Caching hook (F-2): one top-level call is one action; the calls it makes join it and share its memo.
// Context hook: every call is timed and measured for agent vitals (packages/naive/src/core/instrumentation.mjs).
// Gate group hook (M-18): who is acting is checked on every call and carried on the answer.
// Writes hook (packages/naive/src/router/writes.mjs): adds what reads, layouts and writes answer.
export const call = (args) => actionScope(() => instrumented(args, (a) => actingCall(a, (b) => around(callInAction, b), ventureDir), ventureDir));
/** @param {{ venture: string, route: string, action: string, input?: *, actor?: string, actor_id?: string, workspace?: string, via?: string, provenance?: { derived_from?: string[], decision?: string, note?: string, agent?: Record<string, any>, activity?: string, confidence?: number | string | null } }} args */
async function callInAction({ venture, route, action, input, actor = "agent", actor_id = process.env.MENTURA_ACTOR_ID, workspace, via = "router", provenance = {} }) {
  if (actor === "public" && action !== "read") return { ok: false, error: `the public reader only reads; ${action} needs a person or an agent` };
  const requested = route;
  const { r, params, alias } = resolve(route);
  if (!r) return { ok: false, outcome: "error", error: `no route ${route}` };
  // Context hook (packages/naive/src/router/context.mjs): navigate reads a route header first, with its layout once per
  // session, its template and prefetched refs; head stops after the header (N-3, L-2, O-4).
  if (action === "navigate" || action === "head") return (await import("./context.mjs")).navigate({ ...(input ?? {}), venture, route: requested, workspace, actor, actor_id, via, header_only: action === "head" || !!input?.header_only });
  const deprecated = alias ? { deprecated: `${alias.from} is now ${alias.to}${alias.note ? `: ${alias.note}` : ""}` } : {};
  route = r.collection === "item" ? r.route.replace("[id]", params.id) : r.route;
  if (!r.actions.includes(action)) return { ok: false, error: `${route} has no action ${action} (it has ${r.actions.join(", ")})` };
  if (action === "template") return { ok: true, result: readFileSync(join(repo, r.template), "utf8"), ...deprecated };
  const dir = venture ? ventureDir(venture, workspace) : null;
  if (action === "layout") { if (venture && !dir) return { ok: false, error: `no venture ${venture}` }; return { ok: true, result: layout(r, dir), ...deprecated }; }
  if (!dir) return { ok: false, error: `no venture ${venture}` };
  const act = action === "write" ? "write" : "read";
  // Gate group hook (F-5): a role that may read some items of a collection may read its list, filtered below.
  if (!allowed(dir, actor_id, act, requested) && !allowed(dir, actor_id, act, route) && !(act === "read" && r.collection === "list" && mayReadSome(dir, actor_id, route))) return { ok: false, error: `${actor_id} may not ${act} ${route} (team plan routes)` };
  // An activity a decision unlocks stays closed to agents until a person makes that decision (EE-058).
  const lock = actor !== "person" && (action === "write" || action === "run") ? (locked(dir, requested, actor_id) || locked(dir, route, actor_id)) : null;
  if (lock) return { ok: false, error: `${route} is locked until decision ${lock.id} is made: ${lock.question}`, locked_by: lock.id,
    fix: { who: "a person, not an agent", command: `mentura decide ${lock.id} --venture ${venture} --by <their name> [--answer "<their wording>"]`, then: "retry this call" } };
  // Beta gate hook (packages/naive/src/engine/beta-gate.mjs): with beta.enabled in naive.config.json, a locked capability's
  // routes are refused, naming the checkpoint feedback that unlocks them. Off by default. The tester is
  // NAIVE_BETA_TESTER, the same id as naive beta, never the acting role.
  const beta = betaBlocked(dir, requested, { table: r.route });
  if (beta) return { ok: false, error: beta.message, beta_locked: beta.capability, fix: { feedback: beta.needs, command: beta.needs.capability ? `naive beta feedback ${beta.needs.capability}` : null, then: "naive beta unlock, then retry this call" } };

  if (action === "view") {
    const inner = await call({ venture, route, action: r.kind === "command" ? "run" : "read", input, actor, actor_id, workspace, via, provenance });
    return inner.ok ? { ok: true, result: render(route, inner), ...deprecated } : inner;
  }

  if (r.kind === "command") {
    if (r.internal === "overview") return { ok: true, result: await overview(venture, workspace), ...deprecated };
    if (r.internal === "robots") return { ok: true, result: robots(dir), ...deprecated };
    // Caching hook: system/cache, system/judge and system/answer are handled in packages/naive/src/engine/caching.mjs.
    if (["cache", "judge", "answer"].includes(r.internal)) return { ...(await cacheInternal(r.internal, { dir, venture, workspace, input, actor, actor_id, via, provenance }, { call, resolve, draftOf })), ...deprecated };
    const lacking = (r.needs ?? []).filter((f) => !existsSync(ventureFile(dir, f)));
    if (lacking.length) return { ok: false, error: `${route} needs ${lacking.join(", ")} in ${venture}`, fix: { missing: lacking } };
    if (r.value_flag && !input?.value) return { ok: false, error: `${route} needs a value (${r.note})` };
    const args = r.venture_arg === "id" ? [dir, ...(input?.value ? [String(input.value)] : []), "--json"] : r.value_flag ? [dir, r.value_flag, String(input.value), "--json"] : [dir, ...(r.args ?? []), ...(r.as_is && input?.as_is ? ["--as-is"] : []), "--json"];
    // Caching hook (C-3, H-3): a declared command's result comes from the record-level cache; the spawn is memoized per action (O-5).
    const p = await cachedCommand({ dir, route, script: r.script, args, input, actor, actor_id }, () => memo(`cmd:${r.script} ${args.join(" ")}`, () => spawnSync("node", [join(repo, r.script), ...args], { encoding: "utf8" }), { dir }));
    const cache = p.cache ? { cache: p.cache } : {};
    if (p.status !== 0) return { ok: false, error: (p.stderr || p.stdout).trim() };
    // A command that needs input first (EE-050) answers needs_input: the caller asks the person
    // whether to fill the record in or run as is, and runs again with input as_is to go on.
    try { const out = JSON.parse(p.stdout); return { ok: true, result: out.needs_input ? null : out, ...(out.needs_input ? { needs_input: out.needs_input } : {}), ...cache, ...deprecated }; } catch { return { ok: true, result: p.stdout, ...cache, ...deprecated }; }
  }

  // Storage: the connector for the source this record type lives in.
  let src, store, attrs = [];
  if (r.kind === "record" && (action === "read" || action === "write")) {
    const context = { actor, ...(r.collection === "item" && (r.record === "product" || r.record === "account") ? { [r.record]: params.id } : {}) };
    try {
      src = sourceFor(dir, r.record, context); store = await connect(src, dir);
      // Attributes mastered elsewhere (EE-042): read from and written to their own system of record.
      attrs = r.files.every((f) => f.endsWith(".json")) ? await Promise.all(attributeSources(dir, r.record, context).map(async (a) => ({ ...a, store: await connect(a.source, dir) }))) : [];
    } catch (e) { return { ok: false, error: String(e.message ?? e) }; }
  }
  const remote = src && src.id !== LOCAL;
  const cite = (x) => ({ source: src.id, address: address(src.id, x.path), version: x.version, ...(x.commit ? { commit: x.commit } : {}), ...(x.permalink ? { permalink: x.permalink } : {}), ...(x.attributes ? { attributes: x.attributes } : {}) });

  if (action === "read") {
    // Approvals live in the venture folder's sidecars, so a public reader of another source fails closed.
    if (actor === "public" && remote) return { ok: false, error: `the public reader reads only records in the venture's own folder; ${route} lives in ${src.id}` };
    const patterns = r.collection === "item" || r.view_of ? [fileFor(r, params, dir)] : r.files;
    let items;
    try {
      // a file named _* is never an item; routable: private _folders (P-22)
      const paths = patterns.some((g) => g.includes("*")) ? (await store.list()).map((x) => x.path).filter((f) => !/(^|\/)_[^/]*$/.test(f) && patterns.some((g) => glob(g).test(f) && routable(f, g))) : patterns;
      // Caching hook (F-2): each record is read once per action and shared.
      items = (await Promise.all(paths.map((f) => memo(`read:${src.id}:${f}`, () => store.read(f), { dir })))).filter(Boolean);
      // Gate group hook (F-5): access is checked again at the record; a list holds only the items the role may read.
      if (r.collection === "list" && actor_id) items = items.filter((x) => mayReadItem(dir, actor_id, route, itemId(r.files, x.path)));
      // Confidentiality (C2 and above): a record only its access list may know of is left out, as if absent.
      items = items.filter((x) => mayKnow(dir, x.path, { actor, id: actor === "person" ? process.env.MENTURA_PERSON ?? actor_id : actor_id }));
    } catch (e) { return { ok: false, error: `${src.id}: ${String(e.message ?? e)}` }; }
    const found = items.map((x) => x.path);
    const draft = !remote && r.collection !== "list" && fileFor(r, params, dir) && existsSync(ventureFile(dir, draftPath(fileFor(r, params, dir)))) ? draftPath(fileFor(r, params, dir)) : null;
    const loading = draft ? { pending_draft: { file: draft, since: provEntries(dir).filter((e) => e.entity === draft).at(-1)?.at ?? null, accept: `mentura accept ${route} --venture ${venture}` } } : {};
    if (remote) {
      const prs = provEntries(dir).filter((e) => e.source?.pull_request && found.concat(patterns).some((f) => e.entity === address(src.id, f)));
      if (prs.length) loading.pending_pull_requests = prs.map((e) => ({ entity: e.entity, pull_request: e.source.pull_request, since: e.at }));
    }
    // Framework view hook: a migrated venture's telos is rendered from its canonical goals and exit criteria (frameworks/telos).
    if (!found.length && r.record === "telos" && !remote && actor !== "public") {
      const view = telosView(dir);
      if (view) return { ok: true, result: view, view: { framework: "telos", from: ["foundation/goals", "foundation/exit-criteria"] }, ...deprecated };
    }
    const absent = () => {
      const pub = actor === "public";
      return { ok: true, result: null, not_found: { note: r.collection === "list" ? `no ${r.record} records yet` : `no ${r.record} record yet`, ...(remote ? { source: src.id } : {}), template: r.template, schema: r.schema, need_now: pub ? null : layout(r, dir).need_now ?? null, skills: fix(r).skills }, ...(pub ? {} : loading), ...deprecated };
    };
    if (!found.length) return absent();
    const parse = (x) => r.view_of ? coreOf(JSON.parse(x.content)) : x.path.endsWith(".json") ? JSON.parse(x.content) : x.path.endsWith(".jsonl") ? x.content.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : x.content;
    // Overlay each attribute mastered elsewhere with the value its system of record holds, and
    // cite where it came from. A source that holds nothing for it leaves the record's own value.
    const overlays = new Map();
    for (const x of items) {
      const cites = {};
      for (const a of attrs) {
        let got;
        try { got = await a.store.read(x.path); } catch (e) { return { ok: false, error: `${a.source.id}: ${String(e.message ?? e)}` }; }
        const value = got ? JSON.parse(got.content)[a.attribute] : undefined;
        cites[a.attribute] = value === undefined ? { source: a.source.id, missing: true } : { source: a.source.id, address: address(a.source.id, x.path), version: got.version };
        if (value !== undefined) overlays.set(x.path, { ...(overlays.get(x.path) ?? {}), [a.attribute]: value });
      }
      if (attrs.length) x.attributes = cites;
    }
    // Freshness (V-5): a stale record is still read, flagged stale until it is redone (stale-while-revalidate).
    const fresh = remote ? {} : await freshnessFlag(dir, found, r.collection === "list");
    Object.assign(loading, fresh);
    const parseOne = parse;
    const merged = (x) => { const v = parseOne(x); return overlays.has(x.path) ? { ...v, ...overlays.get(x.path) } : v; };
    // Field visibility: a public reader (actor "public", what a public component reads) sees only the fields
    // a person approved as public, or their approved variants; every other field is internal and left out.
    // This is the one place values are made, so list and single reads both pass through it.
    const parseWith = (x) => actor === "public" ? publicView(dir, x.path, merged(x)) : merged(x);
    if (r.collection === "list") {
      const idOf = (path) => {
        for (const g of r.files) {
          if (!g.includes("*")) continue;
          const re = new RegExp("^" + g.split("*").map((s) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("([^/]*)") + "$");
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
      return { ok: true, result: Object.fromEntries(values.map(([x, v]) => [idOf(x.path), v])), sources: Object.fromEntries(values.map(([x]) => [idOf(x.path), cite(x)])), ...(Object.keys(errors).length ? { errors } : {}), ...fresh, ...deprecated };
    }
    // A public reader learns nothing of an item with no public field, not even that its id exists.
    const hidden = (x) => { try { const v = parseWith(x); return !v || !Object.keys(v).length; } catch { return true; } };
    if (actor === "public" && r.collection === "item" && items.every(hidden)) return absent();
    const data = Object.fromEntries(items.map((x) => [x.path, parseWith(x)]));
    // V-9 hook: a summary whose source changed since it was written is marked stale (packages/naive/src/engine/stale.mjs).
    const stale = !remote && items.length === 1 ? staleOf(dir, found[0]) : null;
    return { ok: true, result: items.length === 1 ? data[found[0]] : data, ...(items.length === 1 ? { source: cite(items[0]) } : { sources: Object.fromEntries(items.map((x) => [x.path, cite(x)])) }), ...(actor === "public" ? {} : { ...loading, ...(stale ? { stale } : {}) }), ...deprecated };
  }

  if (action === "check") {
    // Gate group hook (P-7): the checks settings in naive.config.json turn a check off or make it warn only.
    const plan = checkPlan(dir, r.checks);
    const outs = plan.filter((p) => p.mode !== "off").map((p) => ({ check: p.check, mode: p.mode, ...spawnSync("node", [join(repo, p.check), dir], { encoding: "utf8" }) }));
    const ok = outs.every((o) => o.status === 0 || o.mode === "warn");
    return { ok, result: [...outs.map((o) => ({ check: o.check, passed: o.status === 0, ...(o.mode === "warn" ? { warn_only: true } : {}), output: (o.stdout + o.stderr).trim() })), ...plan.filter((p) => p.mode === "off").map((p) => ({ check: p.check, passed: null, off: true }))], ...(ok ? {} : { fix: fix(r) }), ...deprecated };
  }

  if (action === "write") {
    forget(dir); // Caching hook (H-3): a write never uses the cache, and what this action memoized for the venture is read again after it.
    if (!input || typeof input !== "object") return { ok: false, error: "write needs the record as input" };
    if (r.collection === "item" && !/^[a-z0-9][a-z0-9-]*$/.test(params.id)) return { ok: false, error: `${params.id} is not a valid id (lowercase letters, digits and hyphens)` };
    const file = fileFor(r, params, dir);
    // A migrated venture's telos is a view of its canonical records; a telos.json written now would be a second record the lifecycle never reads.
    if (r.record === "telos" && !remote && migrated(dir)) return { ok: false, error: `${venture} keeps its goals and exit criteria as canonical records, so a telos.json is not written: write foundation/goals/telos (measures), foundation/goals/owner-outcome and foundation/exit-criteria/<phase> instead` };
    if (["idea-dump", "raw-source", "raw-text"].includes(r.record) && existsSync(ventureFile(dir, file))) return { ok: false, error: `${route} is raw and immutable: add a new capture, do not edit this one` };
    // Agent drafts are refused here because accepting one moves the whole file into place, and this draft holds only a view of it.
    if (r.view_of && (actor !== "person" || actingAgent(provenance.agent?.id) || remote || attrs.length)) return { ok: false, error: `only a person writes ${route}, in the venture's own folder; it holds part of ${file}` };
    const gate = gateOf(r, dir);
    const text = JSON.stringify(input, null, 2) + "\n";
    // The schema first, on a scratch copy, so nothing reaches any source unless it matches.
    const scratch = mkdtempSync(join(tmpdir(), "mentura-write-"));
    const tmp = join(scratch, basename(file));
    writeFileSync(tmp, text);
    const v = spawnSync("python3", [join(repo, "packages/naive/src/records/validate.py"), "--schema", schemaNameOf(r.schema), "--file", tmp], { encoding: "utf8" });
    rmSync(scratch, { recursive: true, force: true });
    if (v.status !== 0) return { ok: false, error: `does not match ${r.schema}:\n${(v.stdout + v.stderr).trim()}`, fix: fix(r) };
    const base = r.view_of ? readFileSync(ventureFile(dir, file), "utf8") : null;
    const whole = base && JSON.stringify(withCore(JSON.parse(base), input), null, 2) + "\n";
    if (whole) {
      const held = mkdtempSync(join(tmpdir(), "mentura-write-")), copy = join(held, basename(file));
      writeFileSync(copy, whole);
      const w = spawnSync("python3", [join(repo, "packages/naive/src/records/validate.py"), "--schema", "venture.schema.json", "--file", copy], { encoding: "utf8" });
      rmSync(held, { recursive: true, force: true });
      if (w.status !== 0) return { ok: false, error: `${file} does not match packages/naive/src/records/venture.schema.json, so nothing was written:\n${(w.stdout + w.stderr).trim()}`, fix: fix(r) };
    }
    const agent = agentFromEnv(actor === "person" ? "person" : "agent", via, { ...(actor_id && actor !== "person" ? { id: actor_id } : {}), ...provenance.agent });
    const log = (entity, activity, extra = {}) => prov(dir, { entity, route, activity, agent, derived_from: provenance.derived_from, decision: provenance.decision ?? gate?.class ?? undefined, note: provenance.note, ...extra });

    // Attributes mastered elsewhere (EE-042) go to their own system of record, each as a JSON
    // object holding only that attribute at the record's path, and leave the record's own file, so
    // the fact lives in one place. The whole record was checked against its schema above. A gated
    // agent write stays whole, as a draft, until a person accepts it.
    const split = attrs.filter((a) => a.attribute in input);
    // A decision record that is open and fails closed, or waits on one that is, holds the record
    // (EE-054): an agent's write becomes a draft, as for a gated record.
    const held = !remote && actor !== "person" ? holding(dir, file) : null;
    // The venture's own fail-closed routes (naive.config.json, the gate, EE-073) hold an agent's write too.
    // Gate group hook (X-1 to X-6, U-4): the venture's gate decides; a refusal stops the write here.
    const configured = !remote ? gateWrite({ dir, r, route, requested, file, actor, actor_id, provenance, gate }) : null;
    if (configured?.then === "refuse") return { ok: false, error: configured.why, gate_rule: configured.rule, refused_by: configured.source };
    // Only a person settles a decision (EE-058): an agent's write that marks one decided, or names who
    // approved it, is a draft whatever the decision's class.
    const isDecision = /^(decision|decision-record)$/.test(r.record);
    // One id, one file: a new file's id is its name and an existing file keeps its id, or a sibling
    // could answer for a decided decision and skip the draft below.
    if (r.record === "decision-record" && !remote) {
      const here = existsSync(ventureFile(dir, file)) ? load(ventureFile(dir, file)).id : basename(file, ".decision.json");
      const holder = decisionFile(dir, input?.id);
      if (input?.id !== here || (holder && holder !== file)) return { ok: false, error: `${file} holds decision ${here}, not ${input?.id}: a decision's id is its file name, and one id has one file` };
    }
    // Rewriting a decided record, to reopen it say, unsettles it, which is a person's act too (approve
    // would otherwise freeze its reasons afresh and clear their staleness).
    const unsettles = isDecision && !remote && existsSync(ventureFile(dir, file)) && load(ventureFile(dir, file)).status === "decided";
    const settles = isDecision && (unsettles || input?.status === "decided" || input?.approved_by != null || input?.provenance?.approved_by != null);
    // Known gap A: a decided decision names who decided it, whoever writes it; a person's write without one is refused.
    if (isDecision && actor === "person" && input?.status === "decided" && !input?.provenance?.approved_by) return { ok: false, error: `a decided decision names who decided it (provenance.approved_by); approve it with mentura decide ${input?.id ?? "<id>"} --by <name>` };
    const gatedDraft = !remote && (!!gate?.drafts || !!held || !!configured || settles) && actor !== "person";
    const attributeWrites = [];
    if (split.length && !gatedDraft) {
      for (const a of split) {
        if (a.store.writes === "none") return { ok: false, error: `${r.record}.${a.attribute} is mastered in ${a.source.id}, which is read-only` };
      }
      for (const a of split) {
        const part = JSON.stringify({ [a.attribute]: input[a.attribute] }, null, 2) + "\n";
        let w;
        try { w = await a.store.write(file, part, { message: `${route}.${a.attribute}: ${provenance.note ?? "written through Mentura"}`, title: `Mentura: ${route}.${a.attribute} (${venture})` }); }
        catch (e) { return { ok: false, error: `${a.source.id}: ${String(e.message ?? e)}` }; }
        const at = address(a.source.id, file);
        log(`${at}#${a.attribute}`, a.store.writes === "pull-request" ? "draft" : provenance.activity ?? "write", { sha256: createHash("sha256").update(part).digest("hex"),
          source: { id: a.source.id, connector: a.source.connector, version: w.version, ...(w.pull_request ? { pull_request: w.pull_request.url } : {}) } });
        attributeWrites.push({ attribute: a.attribute, written: at, version: w.version, ...(w.pull_request ? { pull_request: w.pull_request.url } : {}) });
      }
      input = Object.fromEntries(Object.entries(input).filter(([k]) => !split.some((a) => a.attribute === k)));
    }
    const attributesOut = attributeWrites.length ? { attributes: attributeWrites } : {};
    const recordText = whole ?? (attributeWrites.length ? JSON.stringify(input, null, 2) + "\n" : text);

    if (remote) {
      // Another source: its connector decides how a write lands. A pull-request source opens a
      // draft pull request, which a person accepts by merging, so it is a draft for anyone.
      if (store.writes === "none") return { ok: false, error: `${route} lives in ${src.id}, which is read-only` };
      let w;
      try { w = await store.write(file, recordText, { message: `${route}: ${provenance.note ?? `written by ${actor === "person" ? "a person" : "an agent"} through Mentura`}`, title: `Mentura: ${route} (${venture})` }); }
      catch (e) { return { ok: false, error: `${src.id}: ${String(e.message ?? e)}` }; }
      const draft = store.writes === "pull-request";
      const at = address(src.id, file);
      const entry = log(at, draft ? "draft" : provenance.activity ?? "write", { sha256: createHash("sha256").update(recordText).digest("hex"),
        source: { id: src.id, connector: src.connector, version: w.version, ...(w.commit ? { commit: w.commit } : {}), ...(w.pull_request ? { pull_request: w.pull_request.url } : {}) } });
      return { ok: true, result: { written: at, draft, gate: gate?.class ?? null, provenance: entry.hash, version: w.version, ...(w.pull_request ? { pull_request: w.pull_request.url } : {}),
        note: draft ? `opened draft pull request ${w.pull_request.url}; merging it accepts the write` : "written", ...attributesOut }, ...deprecated };
    }

    const draft = gatedDraft;
    // Gate group hook (X-2): the held draft, the owner it was sent to and any variants kept side by side.
    let held2 = null;
    if (draft) held2 = heldDraft(dir, { draft: draftPath(file), file, text, verdict: configured, route, agent });
    else {
      if (base !== null && readFileSync(ventureFile(dir, file), "utf8") !== base) return { ok: false, error: `${file} changed while this was being checked, so nothing was written: try again` };
      await store.write(file, recordText);
    }
    const entry = log(draft ? held2.written : file, draft ? "draft" : provenance.activity ?? "write", r.view_of ? { statements: statementsIn(input) } : {});
    return { ok: true, result: { written: draft ? held2.written : file, draft, gate: gate?.class ?? null, provenance: entry.hash, note: draft ? (gate?.drafts ? `${r.record} is a ${gate.class} decision (${gate.level}, owner ${gate.owner}): written as a draft for a person to accept` : held ? `decision ${held.id} ${held.why}: written as a draft for a person to accept` : configured ? configured.why : "only a person settles a decision: written as a draft for a person to accept") : "written", ...(held ? { held_by: held.id } : {}), ...(configured ? { gate_rule: configured.rule, ...(configured.owner ? { owner: configured.owner } : {}) } : {}), ...(held2?.variants ? { variant: held2.variant, variants: held2.variants, decision: held2.decision } : {}), ...attributesOut }, ...deprecated };
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
async function overview(venture, workspace) {
  const dir = ventureDir(venture, workspace);
  const v = load(join(dir, "venture.json"));
  const slot = async (name, f) => { try { return { slot: name, data: await f() }; } catch (e) { return { slot: name, error: String(e.message ?? e).split("\n")[0] }; } };
  const run = async (route) => { const r = await call({ venture, route, action: "run", workspace }); if (!r.ok) throw new Error(r.error); return r.result; };
  const read = async (route) => { const r = await call({ venture, route, action: "read", workspace }); if (!r.ok) throw new Error(r.error); return r.result ?? r.not_found?.note; };
  return {
    venture: v.id,
    slots: await Promise.all([
      slot("@venture", () => ({ name: v.name, phase: v.phase, ambition: scale(dir, v), status: v.status, promise: v.core?.promise ?? null })),
      slot("@telos", async () => { const t = await read("purpose/telos"); return typeof t === "string" ? t : { end: t.end ?? t.statement ?? null, phases: (t.phases ?? []).map((p) => p.phase) }; }),
      slot("@validation", async () => { const r = await call({ venture, route: "purpose/validation/assess", action: "run", input: { as_is: true }, workspace }); if (!r.ok) throw new Error(r.error); const a = r.result; return { supports: a.supports, next: a.next, assumptions: a.assumptions.map((x) => `${x.assumption}: ${x.label}`).join(", "), missing: a.missing.length }; }),
      slot("@need-now", async () => (await run("system/need-now")).rows.filter((x) => x.status === "suggest now").map((x) => ({ record: x.type, now: x.now, why: x.why }))),
      slot("@ready", async () => { const t = await run("system/time-to-ready"); return { running: t.running.on ?? `not yet: ${t.running.missing.join(", ")}`, layers: t.layers.map((l) => ({ layer: l.layer, ready: l.ready_on ?? `missing ${l.missing.join(", ")}` })) }; }),
      slot("@team", async () => { const p = await read("people/team-plan"); if (typeof p === "string") return p; return p.roles.map((x) => ({ role: x.id, occupant: x.occupant, status: x.status, needed_by: x.needed_by })); }),
      slot("@packages", () => packageSlots(dir, venture)), // P-17: a package with nothing in it shows its default
      slot("@provenance", () => provEntries(dir).slice(-5).reverse().map((e) => ({ at: e.at, activity: e.activity, entity: e.entity, by: `${e.agent.kind}${e.agent.id ? ` ${e.agent.id}` : ""} via ${e.agent.via}` }))),
    ]),
  };
}

// Robots: per role, the routes it may read and write.
function robots(dir) {
  const plan = [join(ventureFile(dir, "people/team-plan.json")), join(ventureFile(dir, "operations/team-plan.json"))].find((p) => existsSync(p));
  if (!plan) return { note: "no team plan: every actor may reach every route; gates still apply", roles: [] };
  return { note: "a role without routes may reach every route; gates still apply", roles: load(plan).roles.map((r) => ({ role: r.id, occupant: r.occupant, read: (r.routes?.read ?? ["**"]).join(", "), write: (r.routes?.write ?? (r.routes ? [] : ["**"])).join(", ") || "none" })) };
}

/** The route table as Markdown, for docs/reference/ROUTES.md. */
export function routesMd() {
  const rows = routes().map((r) => `| \`${r.route}\` | ${r.kind}${r.collection ? ` (${r.collection})` : ""} | ${r.actions.join(", ")} | ${r.kind === "record" ? `\`${r.files.join("`, `")}\`` : r.script ? `\`${r.script}\`` : "router"} | ${r.decision_class ?? ""} | ${r.groups.join(" ")} | ${r.note.replace(/\|/g, "/")} |`);
  const gs = groups().map((g) => `| \`${g.group}\` | ${g.question} | ${g.routes.length ? g.routes.map((x) => `\`${x}\``).join(", ") : "none"} |`);
  return [
    "## Routes (generated by `node packages/naive/src/router/router.mjs --md`)",
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
