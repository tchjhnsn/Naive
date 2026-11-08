// The route table (EE-030, EE-032): every route a venture has, generated from packages/naive/src/records/data-model.json,
// the layer and package manifests and packages/naive/src/engine/need-now.json, never written by hand. Also the pure
// helpers that read it: glob, files, resolve, the venture folders, the gate on a record and a role's
// allowed routes. It moved here from packages/naive/src/router/router.mjs, which re-exports all of it, so that
// schema/ and knowledge/ can read the route table without importing the router (the router imports
// them). It imports only Node built-ins and packages/naive/src/core; the command routes the function modules
// add are data in ./commands.mjs.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { memo } from "../../core/action-scope.mjs";
import { ventureFile } from "../../core/venture-paths.mjs";
import {
  BRAND_ROUTES, brandCommands, cacheRoutes, customersLintCommands, financeCommands, foundationLintCommands,
  investorsLintCommands, legalCommands, moneyCommands, peopleLintCommands, productCommands, validationCommands,
} from "./commands.mjs";
import { readDataModel, venturePaths } from "../index.mjs";

export const repo = fileURLToPath(new URL("../../../../..", import.meta.url));
export const load = (p) => JSON.parse(readFileSync(p, "utf8"));
// The workspace is MENTURA_WORKSPACE, else the current directory: a framework never defaults to a folder of its own.
export const defaultWorkspace = () => process.env.MENTURA_WORKSPACE ?? process.cwd();
export const PHASES = load(join(repo, "packages/naive/src/functions/products/frameworks/product-anatomy/phases.json")).phases;

export const glob = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*\*/g, "\u0001").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*").replace(/\u0001/g, ".*") + "$");
// A venture's files, stopping at a nested venture (which has its own records) and skipping dot and private folders.
export const files = (d, base = d) => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.name.startsWith(".") ? [] : e.isDirectory() ? (existsSync(join(d, e.name, "venture.json")) || (d === base && e.name.startsWith("_")) ? [] : files(join(d, e.name), base)) : [join(d, e.name).slice(base.length + 1)]) : [];

export const skillsOf = (k) => (k.skills?.length ? k.skills : k.skill ? [k.skill] : []);

/** Layer manifests and any package that owns record types. `kit` is the name, kept so the board still groups routes. */
export function kits() {
  const model = readDataModel();
  const paths = [...model.layers.map((l) => `packages/naive/src/records/layers/${l}/layer.json`), "packages/naive/src/records/layer.json"];
  const pkgDir = join(repo, "packages/naive/library", "packages");
  if (existsSync(pkgDir)) for (const d of readdirSync(pkgDir)) if (existsSync(join(pkgDir, d, "package.json"))) paths.push(`packages/naive/library/packages/${d}/package.json`);
  return paths.filter((p) => existsSync(join(repo, p))).map((p) => {
    const k = load(join(repo, p));
    const name = k.name ?? k.kit;
    return { path: p, ...k, name, kit: name };
  }).filter((k) => k.path.endsWith("/layer.json") || (k.records ?? []).length);
}

const needNowPriors = () => load(join(repo, "packages/naive/src/engine/need-now.json"));
// The template folders of the function modules, in the order departments.json lists the functions.
const FUNCTION_TEMPLATES_OF = () => load(join(repo, "packages/naive/src/functions/departments.json")).departments.map((d) => `packages/naive/src/functions/${d.id}/templates`).filter((d) => existsSync(join(repo, d)));

/** The first segment of a recipe route: recipes/<pattern>. */
export const RECIPES = "recipes";

// Logs the router appends to, one hash-chained line per call (packages/naive/src/router/router.mjs append). Every other
// log is written by its own module and only read through the router.
const APPENDS = new Set(["detector-trial"]);
// Records the router claims for the acting role, once (packages/naive/src/router/handoff-claim.mjs, the handoff claim of
// docs/design/LEAD_AGENTS_2026-11-08.md).
const CLAIMS = new Set(["handoff"]);

/** The route table, generated from packages/naive/src/records/data-model.json, the kit manifests and packages/naive/src/engine/need-now.json. */
// Caching hook (F-12): built once per action and shared.
export function routes() { return memo("routes", buildRoutes); }
function buildRoutes() {
  const model = readDataModel();
  const ks = kits();
  const owner = new Map(ks.flatMap((k) => k.records.map((r) => [r, k])));
  const N = needNowPriors();
  const out = [];
  for (const r of model.records.filter((x) => x.level === "venture" && x.id !== "venture")) {
    const k = owner.get(r.id);
    const sub = k?.path.match(/(?:^|\/)kits\/([^/]+)\//)?.[1] ?? (k?.path.startsWith("packages/naive/library/packages/") && r.id.startsWith(`${k.name}-`) ? k.name : null);
    const short = sub && r.id.startsWith(`${sub}-`) ? r.id.slice(sub.length + 1) : r.id;
    const filesOf = venturePaths(r);
    if (filesOf.length && filesOf.every((f) => f.startsWith(".naive/"))) continue; // .naive/ is local and never routed.
    // The template is the package's template dir, or <manifest folder>/templates/<record>.md, or one whose name starts <record>- (telos-based-smart.md).
    // A layer manifest (packages/naive/src/records/layers/<layer>/layer.json) keeps no templates beside it since EE-118 step 7: its templates sit in
    // the function modules, packages/naive/src/functions/<function>/templates/.
    const layerManifest = k?.path?.startsWith("packages/naive/src/records/layers/");
    const tdirs = k?.template_dir ? [k.template_dir] : !k || k.path.startsWith("packages/naive/library/packages/") ? []
      : layerManifest ? FUNCTION_TEMPLATES_OF() : [join(dirname(k.path), "templates")];
    const pick = (tdir) => existsSync(join(repo, tdir)) ? readdirSync(join(repo, tdir)).filter((f) => f === `${short}.md` || (f.startsWith(`${short}-`) && f.endsWith(".md"))).sort((a, b) => (a === `${short}.md` ? -1 : b === `${short}.md` ? 1 : a.localeCompare(b)))[0] : null;
    const found = tdirs.map((tdir) => [tdir, pick(tdir)]).find(([, n]) => n);
    const template = found ? `${found[0]}/${found[1]}` : null;
    const checks = [...new Set((r.refs ?? []).map((x) => x.checked_by).filter((c) => c && /^packages\/naive\/src\/[a-z]+\/check-[a-z-]+\.mjs$/.test(c) && c !== "packages/naive/src/checks/check-data-model.mjs"))];
    const legacy = [r.layer === "system" ? "system" : r.layer, sub, short].filter(Boolean).join("/");
    const base = PACKAGE_ROUTE[r.id] ?? legacy;
    const form = r.form ?? "json";
    const groups = PHASES.map((p) => p.id).filter((p) => (N.records[r.id]?.base?.[p] ?? 0) >= N.suggest).map((p) => `(${p})`);
    const common = { kind: "record", record: r.id, layer: r.layer, kit: k?.name ?? null, package: k?.path?.startsWith("packages/naive/library/packages/") ? k.name : null, kit_path: k?.path ?? null, schema: r.schema, form, checks, template,
      decision_class: r.decision_class ?? null, groups, note: r.note ?? "", ...(r.view_of ? { view_of: r.view_of } : {}), ...(r.writer && r.writer !== "any" ? { writer: r.writer } : {}) };
    // A collection's one wildcard is a whole id at the start of a path segment (products/*.json, accounts/*/account.json).
    const collection = filesOf.length >= 1 && filesOf.every((p) => (p.match(/\*/g) ?? []).length === 1 && /(^|\/)\*[./]/.test(p) && !p.includes("**"));
    const concrete = filesOf.every((f) => !f.includes("*"));
    // A JSON record with a schema is written whole and checked against it. Prose a person owns (writer person, a
    // research program) is written whole as text; it has no schema, and only a person writes it (writerRule).
    const prose = r.writer === "person" && (form === "prose" || form === "markdown");
    const writable = !!(((r.schema && form === "json") || prose) && (collection || concrete));
    if (collection) {
      out.push({ ...common, route: base, files: filesOf, collection: "list", actions: ["read", "view", "layout", ...(checks.length ? ["check"] : []), ...(template ? ["template"] : [])] });
      out.push({ ...common, route: `${base}/[id]`, files: filesOf, collection: "item",
        actions: ["read", "view", "layout", ...(writable ? ["write"] : []), ...(APPENDS.has(r.id) ? ["append"] : []), ...(CLAIMS.has(r.id) ? ["claim"] : []), ...(checks.length ? ["check"] : []), ...(template ? ["template"] : [])] });
    } else {
      out.push({ ...common, route: base, files: filesOf,
        actions: ["read", "view", "layout", ...(writable && !filesOf[0]?.includes("*") ? ["write"] : []), ...(checks.length ? ["check"] : []), ...(template ? ["template"] : [])] });
    }
  }
  // Recipe writes (autoresearch build plan item 6, everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md,
  // "Keep and discard through the router"): recipes/<pattern> reads a recipe's tip and writes one experiment, scored inside
  // the write by packages/naive/src/router/recipes.ts. The pattern is the rest of the route, slashes and a literal [id]
  // included (recipes/competitors/[id]/signals), so the route ends in a catch-all segment and names no files of its own.
  const recipe = model.records.find((x) => x.id === "recipe");
  if (recipe) out.push({ kind: "record", record: "recipe", layer: recipe.layer, kit: owner.get("recipe")?.name ?? null, package: null, kit_path: owner.get("recipe")?.path ?? null,
    schema: recipe.schema, form: recipe.form ?? "typescript", checks: [], template: null, decision_class: null, groups: [], recipe: true, route: `${RECIPES}/[...pattern]`, files: [],
    note: "One recipe's experiments (autoresearch build plan item 6): read gives the tip (the source a write edits from and its sha), the live recipe and the dev evaluations spent under the plan; write takes { source, base } and scores it inside the write. A keep is held as a draft for an agent (the evidence package's gate rule) and lands live for a person; a discard or fail is refused with its verdict; a retry returns the logged line and spends nothing. accept (a person only, build plan item 8) runs the one-bit holdout check and writes the held tip live on a pass, or over a failed check with { over_holdout: true }, which is logged; monitor scores the forward points since the live recipe changed against the one before it and proposes a rollback decision on a regression",
    actions: ["read", "write", "accept", "monitor", "layout"] });
  const cmd = (route, script, note, extra = {}) => ({ route, kind: "command", actions: ["run", "view", "layout"], script, groups: [], note, ...extra });
  out.push(
    cmd("system/package", "packages/naive/src/router/orchestration/venture-package.mjs", "The venture package (EE-067, EE-069): the core packages open now and the handoffs, each record confirmed, to review or to write, what moves on its own and what waits, and what completion unlocks; --write renders the view and records a version. Assumes a solo founder or small founding team in Discovery and Validation; agents are a package enhancement"),
    cmd("system/need-now", "packages/naive/src/engine/need-now.mjs", "What the venture needs now, soon, or should hold back (EE-028)"),
    cmd("system/time-to-ready", "packages/naive/src/engine/time-to-ready.mjs", "Time to running, and to ready per layer and MAD tier"),
    // Model steps hook (use model, EE-073): the logic is packages/naive/src/router/orchestration/model-steps.mjs; this route only shows the payload.
    cmd("system/steps", "packages/naive/src/router/orchestration/model-steps.mjs", "The model steps' payload (use model, EE-073): what code computed, a placeholder for each judgment a model has yet to give, and the only fields each one receives; asks no model. mentura steps run asks one", { args: ["payload"] }),
    cmd("purpose/validation/assess", "packages/naive/src/engine/assess-problem.mjs", "What the problem's evidence is strong enough for: each assumption labelled demonstrated, inferred, assumed, unknown or contradicted, the commitment it supports and the next test (EE-050). Asks first when the record is incomplete; input as_is runs it anyway", { as_is: true }),
    cmd("governance/analytics", "packages/naive/src/engine/decision-analytics.mjs", "Decision analytics (EE-072): how many decisions of each type each function has made, open against decided, in whose words, in which phase, and their outcomes. Data only; a view is the platform's, or a visualization skill's", { actions: ["run", "layout"] }),
    cmd("governance/decisions", "packages/naive/src/engine/decisions.mjs", "The decision matrix: every decision the venture owes by layer and phase, with its parent and boundary, and whether it renders now, waits, comes later, is stale or deferred (EE-054, EE-057)"),
    cmd("operations/marketing/sitemap", "packages/naive/src/functions/marketing-and-sales/marketing/site/plan.mjs", "Plan the public site from the venture's records: the product decides whom it is offered to, that decides the audiences, and each page gets its sections in order with the MDX component, need, audience, reason, condition, source record and the public variant to write (EE-064)"),
    cmd("operations/marketing/public", "packages/naive/src/engine/check-public.mjs", "The public gate: every marketing content file is a variant of a named internal record, says its audience and whether it is published, has a person's approval when published, and copies no run of ten words from its internal record (EE-064)"),
    cmd("operations/marketing/site", "packages/naive/src/functions/marketing-and-sales/marketing/site/presence.mjs", "How present the venture's public records are on its marketing site: a score weighed by who the site must speak to now (raising, hiring, contributors, ICPs), and each item missing, not prominent enough or present, with where it belongs (EE-062). Read the site first with packages/naive/src/interfaces/harness/site.mjs"),
    cmd("purpose/ideas/routes", "packages/naive/src/functions/strategy/frameworks/idea-map/route.mjs", "Where each idea goes in the framework: the records it feeds, each destination's stage (routed, drafted, your decision, waiting, done), whether it moves in order or on its own, and the one step that moves it; plus the decision docket traced to the ideas (EE-061)"),
    cmd("purpose/ideas/graph", "packages/naive/src/functions/strategy/frameworks/idea-map/graph.mjs", "The idea graph: which ideas build on which, each idea's signal, the lanes that move in order and the ones that can move on their own, and the ideas to develop next (EE-060)"),
    cmd("purpose/ideas", "packages/naive/src/functions/strategy/frameworks/idea-map/ideamap.mjs", "The founder's idea dump mapped onto Naive's conventions: each idea verbatim with its departments, records and whether it exists, where the ideas cluster, what the dump never mentions, and what it says about whether a product exists (EE-059)"),
    cmd("purpose/foundation", "packages/naive/src/engine/foundation.mjs", "The venture's strategic foundation by the Five Ws and How plus whether, each confirmed, drafted by an agent, waiting as a draft, or missing (EE-051)"),
    cmd("purpose/validation/score", "packages/naive/src/checks/check-validation.mjs", "Held (EE-050): the single validation score from graded evidence (EE-026); purpose/validation/assess replaces it for the problem", { args: ["--score"] }),
    cmd("governance/payouts", "packages/naive/src/engine/payouts.mjs", "Who gets what at a sale value, from the cap table (EE-022); input value, else the scenarios in exit.json", { needs: ["governance/ownership.json"], venture_arg: "id" }),
    cmd("system/overview", null, "The venture at a glance: telos, validation, need-now, time to ready, team and recent provenance, rendered as parallel slots", { internal: "overview" }),
    cmd("system/robots", null, "Which roles may read and write which routes, from the team plan", { internal: "robots" }),
    // Context hook (packages/naive/src/router/vitals.mjs, packages/naive/src/router/context.mjs): agent vitals and the context budget (N-6, C-15, N-13).
    cmd("system/vitals", "packages/naive/src/router/vitals.mjs", "Agent vitals (N-6): calls per task, tokens of context per call, time to a useful answer and time from a decision opening to a person deciding it, at the 75th percentile, each checked against its threshold (C-15). Reads the events log that instrumentation writes"),
    // Traces (EE-121): packages/naive/src/core/instrumentation.mjs writes them, packages/naive/src/engine/trace-cli.ts reads them.
    cmd("system/traces", "packages/naive/src/engine/trace-cli.ts", "The venture's trace sessions in traces/, one span per step of an agent run after the OpenTelemetry GenAI conventions, hash-chained and linked from provenance; read offline. naive trace show <session> prints one as a tree", { args: ["show"], actions: ["run", "layout"] }),
    cmd("system/context", "packages/naive/src/router/context.mjs", "The context budget (N-13): what every route sends an agent, in tokens, against its budget, with the largest part and where to move it (S-14, F-6)", { args: ["budget"] }),
    cmd("knowledge/catalog", "packages/naive/src/store/connectors/catalog.mjs", "Build or refresh the catalog: every item in every source the venture keeps records in, with its address and version, no content (EE-037)"),
    cmd("knowledge/search", "packages/naive/src/store/connectors/catalog.mjs", "Find items across every source through the catalog; input value is the query (EE-037)", { value_flag: "--search" }),
    // The live decision index: packages/naive/src/engine/decision-index.mjs, a cache in .naive/ updated from provenance.
    cmd("system/decision-index", "packages/naive/src/engine/decision-index.mjs", "The live decision index: every open decision scored by the docket, its structural impact (functions, records, linked decisions), its phase weight and requirement lift, and requirement violations flagged now; each run re-scores every active decision, so an update equals a rebuild, and appends rank history for what moved. Input value update (default), rebuild or read", { venture_arg: "id" }),
    // Freshness (Revalidating, V-1 to V-8): packages/naive/src/engine/freshness.mjs.
    cmd("system/freshness", "packages/naive/src/engine/freshness.mjs", "What is fresh, stale or expired, and which records are live holes: by time (freshness profiles, per phase too) and on demand (a dependency changed, a where-used parent drifted, a tag, path or package was revalidated)"),
    // The signal pull (signal library design, build item 5): packages/naive/src/router/orchestration/signals.ts commits, as the
    // signal projector, what packages/naive/src/engine/signals.ts decides.
    cmd("system/signals", "packages/naive/src/router/orchestration/signals.ts", "Pull signals: render what new signals in the venture's libraries say into records through its listeners, write each new or changed record as the signal projector, verify an unchanged one, propose decisions and mark records stale; a pull after a pull writes nothing", { args: ["pull"] }),
    cmd("system/signals/replay", "packages/naive/src/router/orchestration/signals.ts", "Render every projected record again from the signals it cites and report drift; writes nothing", { args: ["replay"] }),
    cmd("system/signals/explain", "packages/naive/src/router/orchestration/signals.ts", "One signal at every listener: salient or noise, and every failed predicate; input value is the signal id", { value_flag: "--explain" }),
    cmd("system/revalidate", "packages/naive/src/engine/freshness.mjs", "Mark records stale on demand: input value tag:<route> (the record and what depends on it), path:<folder>, package:<name>, or pivot (the validation package); a plain folder is refused in favour of exact tags", { value_flag: "--revalidate" }),
  );
  out.push(...cacheRoutes(cmd)); // Caching hook: system/cache, system/judge, system/answer (packages/naive/src/engine/caching.mjs).
  out.push(...brandCommands(cmd)); // Brand hook: brand tokens, voice, glossary terms, sitemap.xml, asset facts (packages/naive/src/engine/brand.mjs).
  out.push(...investorsLintCommands(cmd)); // Investors lint hook: investors/lint (packages/naive/src/checks/lint-investors.mjs).
  out.push(...productCommands(cmd)); // Product lint hook: product/lint (packages/naive/src/checks/lint-product.mjs).
  out.push(...moneyCommands(cmd)); // Money lint: transfer decisions and account owners (packages/naive/src/checks/lint-money.mjs).
  out.push(...customersLintCommands(cmd)); // Customers lint: ICP match and promises read from product records by key.
  out.push(...validationCommands(cmd)); // Validation lint: claims, shelf life, agent grades, Discovery-grade decisions (packages/naive/src/checks/lint-validation.mjs).
  out.push(...financeCommands(cmd)); // Finance lint: spend, price below cost, metric targets (packages/naive/src/checks/lint-finance.mjs).
  out.push(...legalCommands(cmd)); // Legal lint hook: public claims and agreements (packages/naive/src/checks/lint-legal.mjs).
  out.push(...peopleLintCommands(cmd)); // People lint: role, hire and decision alignment (packages/naive/src/checks/lint-people.mjs).
  out.push(...foundationLintCommands(cmd)); // Foundation lint: mission, ICP jobs, alignment checks, problem forms (packages/naive/src/checks/lint-foundation.mjs).
  return out.sort((a, b) => a.route.localeCompare(b.route));
}

/** Route groups: (phase) gathers the routes need-now suggests in that phase. The path is unchanged. */
export function groups() {
  const rs = routes();
  return PHASES.map((p) => ({ group: `(${p.id})`, phase: p.id, question: p.question, gate: p.gate, routes: rs.filter((r) => r.groups.includes(`(${p.id})`)).map((r) => r.route) }));
}

// Aliases for renamed routes (stability): packages/naive/src/router/route-aliases.json, or MENTURA_ROUTE_ALIASES.
function aliases() {
  const f = process.env.MENTURA_ROUTE_ALIASES ?? join(repo, "packages/naive/src/router/route-aliases.json");
  return existsSync(f) ? load(f).aliases : [];
}

/** Matches a concrete route (purpose/product/kettle) to its table entry and params. Follows aliases. */
export function resolve(route) {
  const rs = routes();
  const alias = aliases().find((a) => a.from === route || route.startsWith(`${a.from}/`));
  const concrete = alias ? alias.to + route.slice(alias.from.length) : route;
  const exact = rs.find((r) => r.route === concrete);
  if (exact) return { r: exact, params: {}, alias };
  // A catch-all segment takes the rest of the route, slashes included: recipes/competitors/[id]/signals.
  for (const r of rs.filter((x) => x.route.endsWith("/[...pattern]"))) {
    const head = r.route.slice(0, -"/[...pattern]".length);
    if (concrete.startsWith(`${head}/`) && concrete.length > head.length + 1) return { r, params: { pattern: concrete.slice(head.length + 1) }, alias };
  }
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
  // A broken venture.json is found by its folder name, so its global error can answer (E-8, packages/naive/src/router/boundaries.mjs).
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
  const t = load(join(repo, "packages/naive/template/governance/decision-rights.json"));
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
  goal: "foundation/goals", requirement: "foundation/requirements", "exit-criteria": "foundation/exit-criteria", constraints: "foundation/constraints", "venture-core": "foundation/core",
  "validation-solution": "validation/solution", "validation-pricing": "validation/pricing", "validation-go-to-market": "validation/go-to-market",
  "validation-product-market-fit": "validation/product-market-fit", "validation-operations-readiness": "validation/operations-readiness",
  "validation-team": "people/team", "team-plan": "people/team-plan", "marketing-sitemap": "marketing/sitemap", "marketing-content": "marketing/content",
  "idea-dump": "raw/dump", "idea-map": "ideas/map", "idea-graph": "ideas/graph", product: "product", evidence: "evidence",
  "anatomy-answers": "product/anatomy-answers", "anatomy-input": "product/anatomy", "venture-package": ".release/venture-package",
  "decision-record": "decisions",
  "validation-interview": "validation/interviews", "validation-feedback": "validation/feedback", bug: "product/bugs",
  customer: "customers", investor: "investors", "money-account": "money", "raw-source": "raw/sources",
  people: "people", founder: "people/founders", "fund-thesis": "fund/thesis", "fund-terms": "fund/terms", deal: "deals",
  ...BRAND_ROUTES, // Brand hook: marketing/brand, public/assets, glossary (packages/naive/src/engine/brand.mjs).
};
