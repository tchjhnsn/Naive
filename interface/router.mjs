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
//   hierarchy     a read resolves layout, template, error, loading, not-found, then page (P-28);
//                 resolved_by names the level that answered (interface/reads.mjs)
//   writes        a write answers with what it changed and the next route to act on; a layout lists
//                 the actions open to the actor; package, group and venture routes; global errors
//                 (interface/writes.mjs wraps call)
//   storage       a record is read and written through the connector for the source its record
//                 type lives in (knowledge/connectors, EE-037): the venture's own folder unless its
//                 knowledge/sources.json names another, such as a GitHub repository, where a write
//                 opens a draft pull request. A read says which source and version it came from.
//
// Partial adoption: a route needs only its own record and what its kit reads.

import { mayKnow, publicView } from "../schema/visibility.mjs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { agentFromEnv, entries as provEntries, record as prov } from "./provenance.mjs";
import { address } from "../knowledge/connectors/contract.mjs";
import { holding, locked } from "../schema/decisions.mjs";
import { configOf, hold } from "../schema/gate.mjs";
import { blocked as betaBlocked } from "../schema/beta-gate.mjs";
// Freshness (Revalidating, V-1 to V-8): stale flags on reads, and the freshness and revalidate commands.
import { readFlag as freshnessFlag } from "../schema/freshness.mjs";
// Gate group hooks (M-18, F-5, X-2, X-4 to X-6, P-2, P-7, U-4): who is acting, access at the record,
// the gate's verdict, where held drafts wait, and check settings. The logic lives in these modules.
import { actingCall, itemId, mayReadItem, mayReadSome } from "./acting.mjs";
import { checkPlan, gateWrite, heldDraft } from "./gate-hooks.mjs";
import { LOCAL, attributeSources, connect, sourceFor } from "../knowledge/connectors/index.mjs";
// Caching (schema/caching.mjs): per-action memo, the record-level cache for command routes, and system/cache, system/judge, system/answer.
import { actionScope, cacheRoutes, command as cachedCommand, forget, internal as cacheInternal, memo } from "../schema/caching.mjs";
// Context hook: instrumentation of every call and judgment (interface/instrumentation.mjs, P-4, F-4).
import { instrumented, judgment } from "./instrumentation.mjs";
// Hooks for writes, reads and boundaries (wf/writes): the wrapper around call, per-record containment and private folders.
import { around } from "./writes.mjs";
import { contain } from "./boundaries.mjs";
import { packageSlots } from "./package-routes.mjs";
import { routable } from "../schema/structure.mjs";
// Brand hook (Y-2..Y-4, J-2..J-4, T-1, T-2, P-24, P-26): routes, commands and layout context from schema/brand.mjs.
import { BRAND_ROUTES, brandCommands, brandLayout } from "../schema/brand.mjs";
// Upgrades hook (V-9): a read says when what the record reads changed in its system of record.
import { staleOf } from "../schema/stale.mjs";
import { ventureFile } from "../schema/venture-paths.mjs";
import { telosView } from "../frameworks/telos/adapter.mjs";
import { migrated, scale } from "../schema/canonical.mjs";

export const repo = new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const defaultWorkspace = () => process.env.MENTURA_WORKSPACE ?? join(repo, "instance");
export const PHASES = load(join(repo, "purpose/frameworks/product-anatomy/phases.json")).phases;

export const glob = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*\*/g, "\u0001").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*").replace(/\u0001/g, ".*") + "$");
// A venture's files, stopping at a nested venture (which has its own records) and skipping dot and private folders.
export const files = (d, base = d) => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.name.startsWith(".") ? [] : e.isDirectory() ? (existsSync(join(d, e.name, "venture.json")) || (d === base && e.name.startsWith("_")) ? [] : files(join(d, e.name), base)) : [join(d, e.name).slice(base.length + 1)]) : [];

const skillsOf = (k) => (k.skills?.length ? k.skills : k.skill ? [k.skill] : []);

/** Layer manifests and any package that owns record types. `kit` is the name, kept so the board still groups routes. */
export function kits() {
  const model = load(join(repo, "schema/data-model.json"));
  const paths = [...model.layers.map((l) => `${l}/layer.json`), "schema/layer.json"];
  const pkgDir = join(repo, "packages");
  if (existsSync(pkgDir)) for (const d of readdirSync(pkgDir)) if (existsSync(join(pkgDir, d, "package.json"))) paths.push(`packages/${d}/package.json`);
  return paths.filter((p) => existsSync(join(repo, p))).map((p) => {
    const k = load(join(repo, p));
    const name = k.name ?? k.kit;
    return { path: p, ...k, name, kit: name };
  }).filter((k) => k.path.endsWith("/layer.json") || (k.records ?? []).length);
}

const needNowPriors = () => load(join(repo, "schema/need-now.json"));

/** The route table, generated from schema/data-model.json, the kit manifests and schema/need-now.json. */
// Caching hook (F-12): built once per action and shared.
export function routes() { return memo("routes", buildRoutes); }
function buildRoutes() {
  const model = load(join(repo, "schema/data-model.json"));
  const ks = kits();
  const owner = new Map(ks.flatMap((k) => k.records.map((r) => [r, k])));
  const N = needNowPriors();
  const out = [];
  for (const r of model.records.filter((x) => x.level === "venture" && x.id !== "venture")) {
    const k = owner.get(r.id);
    const sub = k?.path.match(/^[a-z]+\/kits\/([^/]+)\//)?.[1] ?? (k?.path.startsWith("packages/") && r.id.startsWith(`${k.name}-`) ? k.name : null);
    const short = sub && r.id.startsWith(`${sub}-`) ? r.id.slice(sub.length + 1) : r.id;
    const filesOf = r.paths.filter((p) => p.startsWith("instance/**/")).map((p) => p.slice("instance/**/".length));
    if (filesOf.length && filesOf.every((f) => f.startsWith(".naive/"))) continue; // .naive/ is local and never routed.
    // The template is the package's template dir, or <manifest folder>/templates/<record>.md, or one whose name starts <record>- (telos-based-smart.md).
    const tdir = k?.template_dir ?? (k && !k.path.startsWith("packages/") ? join(dirname(k.path), "templates") : null);
    const tname = tdir && existsSync(join(repo, tdir)) ? readdirSync(join(repo, tdir)).filter((f) => f === `${short}.md` || (f.startsWith(`${short}-`) && f.endsWith(".md"))).sort((a, b) => (a === `${short}.md` ? -1 : b === `${short}.md` ? 1 : a.localeCompare(b)))[0] : null;
    const template = tname ? `${tdir}/${tname}` : null;
    const checks = [...new Set((r.refs ?? []).map((x) => x.checked_by).filter((c) => c && c.startsWith("schema/check-") && c !== "schema/check-data-model.mjs"))];
    const legacy = [r.layer === "system" ? "system" : r.layer, sub, short].filter(Boolean).join("/");
    const base = PACKAGE_ROUTE[r.id] ?? legacy;
    const form = r.form ?? "json";
    const groups = PHASES.map((p) => p.id).filter((p) => (N.records[r.id]?.base?.[p] ?? 0) >= N.suggest).map((p) => `(${p})`);
    const common = { kind: "record", record: r.id, layer: r.layer, kit: k?.name ?? null, package: k?.path?.startsWith("packages/") ? k.name : null, kit_path: k?.path ?? null, schema: r.schema, form, checks, template,
      decision_class: r.decision_class ?? null, groups, note: r.note ?? "" };
    // A collection's one wildcard is a whole id at the start of a path segment (products/*.json, accounts/*/account.json).
    const collection = filesOf.length >= 1 && filesOf.every((p) => (p.match(/\*/g) ?? []).length === 1 && /(^|\/)\*[./]/.test(p) && !p.includes("**"));
    const concrete = filesOf.every((f) => !f.includes("*"));
    const writable = !!(r.schema && form === "json" && (collection || concrete));
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
    cmd("system/package", "schema/packages.mjs", "The venture package (EE-067, EE-069): the core packages open now and the handoffs, each record confirmed, to review or to write, what moves on its own and what waits, and what completion unlocks; --write renders the view and records a version. Assumes a solo founder or small founding team in Discovery and Validation; agents are a package enhancement"),
    cmd("system/need-now", "schema/need-now.mjs", "What the venture needs now, soon, or should hold back (EE-028)"),
    cmd("system/time-to-ready", "schema/time-to-ready.mjs", "Time to running, and to ready per layer and MAD tier"),
    // Model steps hook (use model, EE-073): the logic is schema/model-steps.mjs; this route only shows the payload.
    cmd("system/steps", "schema/model-steps.mjs", "The model steps' payload (use model, EE-073): what code computed, a placeholder for each judgment a model has yet to give, and the only fields each one receives; asks no model. mentura steps run asks one", { args: ["payload"] }),
    cmd("purpose/validation/assess", "schema/assess-problem.mjs", "What the problem's evidence is strong enough for: each assumption labelled demonstrated, inferred, assumed, unknown or contradicted, the commitment it supports and the next test (EE-050). Asks first when the record is incomplete; input as_is runs it anyway", { as_is: true }),
    cmd("governance/analytics", "schema/decision-analytics.mjs", "Decision analytics (EE-072): how many decisions of each type each function has made, open against decided, in whose words, in which phase, and their outcomes. Data only; a view is the platform's, or a visualization skill's", { actions: ["run", "layout"] }),
    cmd("governance/decisions", "schema/decisions.mjs", "The decision matrix: every decision the venture owes by layer and phase, with its parent and boundary, and whether it renders now, waits, comes later, is stale or deferred (EE-054, EE-057)"),
    cmd("operations/marketing/sitemap", "operations/marketing/site/plan.mjs", "Plan the public site from the venture's records: the product decides whom it is offered to, that decides the audiences, and each page gets its sections in order with the MDX component, need, audience, reason, condition, source record and the public variant to write (EE-064)"),
    cmd("operations/marketing/public", "operations/marketing/check-public.mjs", "The public gate: every marketing content file is a variant of a named internal record, says its audience and whether it is published, has a person's approval when published, and copies no run of ten words from its internal record (EE-064)"),
    cmd("operations/marketing/site", "operations/marketing/site/presence.mjs", "How present the venture's public records are on its marketing site: a score weighed by who the site must speak to now (raising, hiring, contributors, ICPs), and each item missing, not prominent enough or present, with where it belongs (EE-062). Read the site first with interface/harness/site.mjs"),
    cmd("purpose/ideas/routes", "purpose/frameworks/idea-map/route.mjs", "Where each idea goes in the framework: the records it feeds, each destination's stage (routed, drafted, your decision, waiting, done), whether it moves in order or on its own, and the one step that moves it; plus the decision docket traced to the ideas (EE-061)"),
    cmd("purpose/ideas/graph", "purpose/frameworks/idea-map/graph.mjs", "The idea graph: which ideas build on which, each idea's signal, the lanes that move in order and the ones that can move on their own, and the ideas to develop next (EE-060)"),
    cmd("purpose/ideas", "purpose/frameworks/idea-map/ideamap.mjs", "The founder's idea dump mapped onto Naive's conventions: each idea verbatim with its departments, records and whether it exists, where the ideas cluster, what the dump never mentions, and what it says about whether a product exists (EE-059)"),
    cmd("purpose/foundation", "schema/foundation.mjs", "The venture's strategic foundation by the Five Ws and How plus whether, each confirmed, drafted by an agent, waiting as a draft, or missing (EE-051)"),
    cmd("purpose/validation/score", "schema/check-validation.mjs", "Held (EE-050): the single validation score from graded evidence (EE-026); purpose/validation/assess replaces it for the problem", { args: ["--score"] }),
    cmd("governance/payouts", "schema/payouts.mjs", "Who gets what at a sale value, from the cap table (EE-022); input value, else the scenarios in exit.json", { needs: ["governance/ownership.json"], venture_arg: "id" }),
    cmd("system/overview", null, "The venture at a glance: telos, validation, need-now, time to ready, team and recent provenance, rendered as parallel slots", { internal: "overview" }),
    cmd("system/robots", null, "Which roles may read and write which routes, from the team plan", { internal: "robots" }),
    // Context hook (interface/vitals.mjs, interface/context.mjs): agent vitals and the context budget (N-6, C-15, N-13).
    cmd("system/vitals", "interface/vitals.mjs", "Agent vitals (N-6): calls per task, tokens of context per call, time to a useful answer and time from a decision opening to a person deciding it, at the 75th percentile, each checked against its threshold (C-15). Reads the events log that instrumentation writes"),
    cmd("system/context", "interface/context.mjs", "The context budget (N-13): what every route sends an agent, in tokens, against its budget, with the largest part and where to move it (S-14, F-6)", { args: ["budget"] }),
    cmd("knowledge/catalog", "knowledge/connectors/catalog.mjs", "Build or refresh the catalog: every item in every source the venture keeps records in, with its address and version, no content (EE-037)"),
    cmd("knowledge/search", "knowledge/connectors/catalog.mjs", "Find items across every source through the catalog; input value is the query (EE-037)", { value_flag: "--search" }),
    // The live decision index: schema/decision-index.mjs, a cache in .naive/ updated from provenance.
    cmd("system/decision-index", "schema/decision-index.mjs", "The live decision index: every open decision scored by the docket, its structural impact (functions, records, linked decisions), its phase weight and requirement lift, and requirement violations flagged now; each run re-scores every active decision, so an update equals a rebuild, and appends rank history for what moved. Input value update (default), rebuild or read", { venture_arg: "id" }),
    // Freshness (Revalidating, V-1 to V-8): schema/freshness.mjs.
    cmd("system/freshness", "schema/freshness.mjs", "What is fresh, stale or expired, and which records are live holes: by time (freshness profiles, per phase too) and on demand (a dependency changed, a where-used parent drifted, a tag, path or package was revalidated)"),
    cmd("system/revalidate", "schema/freshness.mjs", "Mark records stale on demand: input value tag:<route> (the record and what depends on it), path:<folder>, package:<name>, or pivot (the validation package); a plain folder is refused in favour of exact tags", { value_flag: "--revalidate" }),
  );
  out.push(...cacheRoutes(cmd)); // Caching hook: system/cache, system/judge, system/answer (schema/caching.mjs).
  out.push(...brandCommands(cmd)); // Brand hook: brand tokens, voice, glossary terms, sitemap.xml, asset facts (schema/brand.mjs).
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
  // A broken venture.json is found by its folder name, so its global error can answer (E-8, interface/boundaries.mjs).
  for (const d of walkVentures(workspace)) { let vid; try { vid = load(join(d, "venture.json")).id; } catch { vid = basename(d); } if (vid === id) return d; }
  return null;
}

/** The ventures under a workspace: id, name, phase, path (the [...venture] segment) and folder. */
export function ventures(workspace = defaultWorkspace()) {
  const root = existsSync(join(workspace, "ventures")) ? join(workspace, "ventures") : workspace;
  return walkVentures(workspace).map((d) => { let v; try { v = load(join(d, "venture.json")); } catch { return { id: basename(d), name: null, phase: null, path: relative(root, d), dir: d, broken: true }; } return { id: v.id, name: v.name, phase: v.phase, path: relative(root, d), dir: d }; });
}

// The venture's decision rights: the template, tightened by the venture's own file.
function decisionRights(dir) {
  const t = load(join(repo, "governance/venture-template/decision-rights.json"));
  const classes = new Map(t.classes.map((c) => [c.id, c]));
  const own = join(ventureFile(dir, "governance/decision-rights.json"));
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
export function allowed(dir, actorId, action, route) {
  if (!actorId || !dir) return true;
  const plan = [join(ventureFile(dir, "people/team-plan.json")), join(ventureFile(dir, "operations/team-plan.json"))].find((p) => existsSync(p));
  if (!plan) return true;
  const role = load(plan).roles.find((x) => x.id === actorId);
  if (!role?.routes) return true;
  const list = action === "write" ? role.routes.write ?? [] : role.routes.read ?? ["**"];
  return list.some((g) => glob(g).test(route));
}

const PACKAGE_ROUTE = {
  "validation-problem": "foundation/problem", icp: "foundation/icp", telos: "foundation/telos", alignment: "foundation/alignment",
  goal: "foundation/goals", requirement: "foundation/requirements", "exit-criteria": "foundation/exit-criteria", constraints: "foundation/constraints",
  "validation-solution": "validation/solution", "validation-pricing": "validation/pricing", "validation-go-to-market": "validation/go-to-market",
  "validation-product-market-fit": "validation/product-market-fit", "validation-operations-readiness": "validation/operations-readiness",
  "validation-team": "people/team", "team-plan": "people/team-plan", "marketing-sitemap": "marketing/sitemap", "marketing-content": "marketing/content",
  "idea-dump": "raw/dump", "idea-map": "ideas/map", "idea-graph": "ideas/graph", product: "product", evidence: "evidence",
  "anatomy-answers": "product/anatomy-answers", "anatomy-input": "product/anatomy", "venture-package": ".release/venture-package",
  "decision-record": "decisions",
  "validation-interview": "validation/interviews", "validation-feedback": "validation/feedback", bug: "product/bugs",
  customer: "customers", investor: "investors", "money-account": "money", "raw-source": "raw/sources",
  people: "people", founder: "people/founders", "fund-thesis": "fund/thesis", "fund-terms": "fund/terms", deal: "deals",
  ...BRAND_ROUTES, // Brand hook: marketing/brand, public/assets, glossary (schema/brand.mjs).
};

// Prefer a file that is already there, so an unmigrated venture keeps its old path. A new write uses the first path, which is the package layout.
const fileFor = (r, params, dir) => {
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
  const owned = r.kit_path && (r.kit_path.startsWith("packages/") || r.kit_path.includes("/kits/")) ? ks.find((k) => k.path === r.kit_path) : null;
  const stack = [ks.find((k) => k.path === "schema/layer.json"), ks.find((k) => k.path === `${r.layer ?? r.route.split("/")[0]}/layer.json`), owned]
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
      const nn = JSON.parse(memo(`cmd:schema/need-now.mjs ${dir} --json`, () => spawnSync("node", [join(repo, "schema/need-now.mjs"), dir, "--json"], { encoding: "utf8" }), { dir }).stdout);
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
// Context hook: every call is timed and measured for agent vitals (interface/instrumentation.mjs).
// Gate group hook (M-18): who is acting is checked on every call and carried on the answer.
// Writes hook (interface/writes.mjs): adds what reads, layouts and writes answer.
export const call = (args) => actionScope(() => instrumented(args, (a) => actingCall(a, (b) => around(callInAction, b), ventureDir), ventureDir));
async function callInAction({ venture, route, action, input, actor = "agent", actor_id = process.env.MENTURA_ACTOR_ID, workspace, via = "router", provenance = {} }) {
  if (actor === "public" && action !== "read") return { ok: false, error: `the public reader only reads; ${action} needs a person or an agent` };
  const requested = route;
  const { r, params, alias } = resolve(route);
  if (!r) return { ok: false, outcome: "error", error: `no route ${route}` };
  // Context hook (interface/context.mjs): navigate reads a route header first, with its layout once per
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
  // Beta gate hook (schema/beta-gate.mjs): with beta.enabled in naive.config.json, a locked capability's
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
    // Caching hook: system/cache, system/judge and system/answer are handled in schema/caching.mjs.
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
    const patterns = r.collection === "item" ? [fileFor(r, params, dir)] : r.files;
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
    if (!found.length && r.record === "telos" && !remote) {
      const view = telosView(dir);
      if (view) return { ok: true, result: view, view: { framework: "telos", from: ["foundation/goals", "foundation/exit-criteria"] }, ...deprecated };
    }
    if (!found.length) {
      const l = layout(r, dir);
      return { ok: true, result: null, not_found: { note: r.collection === "list" ? `no ${r.record} records yet` : `no ${r.record} record yet`, ...(remote ? { source: src.id } : {}), template: r.template, schema: r.schema, need_now: l.need_now ?? null, skills: fix(r).skills }, ...loading, ...deprecated };
    }
    const parse = (x) => x.path.endsWith(".json") ? JSON.parse(x.content) : x.path.endsWith(".jsonl") ? x.content.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : x.content;
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
      return { ok: true, result: Object.fromEntries(values.map(([x, v]) => [idOf(x.path), v])), sources: Object.fromEntries(values.map(([x]) => [idOf(x.path), cite(x)])), ...(Object.keys(errors).length ? { errors } : {}), ...fresh, ...deprecated };
    }
    const data = Object.fromEntries(items.map((x) => [x.path, parseWith(x)]));
    // V-9 hook: a summary whose source changed since it was written is marked stale (schema/stale.mjs).
    const stale = !remote && items.length === 1 ? staleOf(dir, found[0]) : null;
    return { ok: true, result: items.length === 1 ? data[found[0]] : data, ...(items.length === 1 ? { source: cite(items[0]) } : { sources: Object.fromEntries(items.map((x) => [x.path, cite(x)])) }), ...loading, ...(stale ? { stale } : {}), ...deprecated };
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
    const gate = gateOf(r, dir);
    const text = JSON.stringify(input, null, 2) + "\n";
    // The schema first, on a scratch copy, so nothing reaches any source unless it matches.
    const scratch = mkdtempSync(join(tmpdir(), "mentura-write-"));
    const tmp = join(scratch, basename(file));
    writeFileSync(tmp, text);
    const v = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", r.schema.replace(/^schema\//, ""), "--file", tmp], { encoding: "utf8" });
    rmSync(scratch, { recursive: true, force: true });
    if (v.status !== 0) return { ok: false, error: `does not match ${r.schema}:\n${(v.stdout + v.stderr).trim()}`, fix: fix(r) };
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
    const settles = isDecision && (input?.status === "decided" || input?.approved_by != null || input?.provenance?.approved_by != null);
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
    const recordText = attributeWrites.length ? JSON.stringify(input, null, 2) + "\n" : text;

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
    else await store.write(file, recordText);
    const entry = log(draft ? held2.written : file, draft ? "draft" : provenance.activity ?? "write");
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
