// The route table (EE-030, EE-032): every route a venture has, generated from packages/naive/src/records/data-model.json,
// the layer and package manifests and packages/naive/src/engine/need-now.json, never written by hand. Also the pure
// helpers that read it: glob, files, resolve, the venture folders, the gate on a record and a role's
// allowed routes. It moved here from packages/naive/src/router/router.ts, which re-exports all of it, so that
// schema/ and knowledge/ can read the route table without importing the router (the router imports
// them). It imports only Node built-ins and packages/naive/src/core; the command routes the function modules
// add are data in ./commands.ts.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { memo } from "../../core/action-scope.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import {
  BRAND_ROUTES, brandCommands, cacheRoutes, customersLintCommands, financeCommands, foundationLintCommands,
  investorsLintCommands, legalCommands, moneyCommands, peopleLintCommands, productCommands, validationCommands,
} from "./commands.ts";
import { readDataModel, venturePaths } from "../index.ts";
import type {
  DataModel, DecisionRights, DepartmentCatalog, Layer, LeanCanvas, PhaseModule, RouteAliases, TeamPlan, Venture, VentureAnatomy,
} from "../types/records.d.ts";

/** One record type in the data model. */
type DataModelRecord = DataModel["records"][number];
/** A skill a layer or package manifest names. */
export type ManifestSkill = Layer["skills"][number];
/**
 * A layer manifest (layer.schema.json) or a venture package manifest (packages/naive/library/packages/<name>/package.json,
 * which has no schema yet), as the route table reads it: with the path it came from, and its name also as `kit`.
 */
export type KitManifest = KitFile & { path: string; name: string; kit: string };
/** A manifest file's fields the route table and the router read; a layer's name is `name`, an older package's `kit`. */
type KitFile = {
  name?: string; kit?: string; records?: string[]; skills?: ManifestSkill[]; skill?: ManifestSkill;
  template_dir?: string; purpose?: string; references?: string; gaps?: string[]; gates?: unknown[]; extends?: { package?: string; command?: string };
  [key: string]: unknown;
};
/** A phase as the route table lists it. */
export type Phase = Pick<PhaseModule, "id" | "name" | "question" | "binding_constraint"> & { gate: string };
/** The fields every route has. */
type RouteBase = { route: string; actions: string[]; groups: string[]; note: string };
/**
 * A route to a record type: a whole record, a collection's list or one item of it, or the recipe route. Command
 * fields are absent, so code that reads one on any route gets undefined.
 */
export type RecordRoute = RouteBase & {
  kind: "record"; record: string; layer: DataModelRecord["layer"]; kit: string | null; package: string | null; kit_path: string | null;
  schema: string | null; form: NonNullable<DataModelRecord["form"]>; checks: string[]; template: string | null; decision_class: string | null;
  files: string[]; collection?: "list" | "item"; view_of?: string; writer?: Exclude<DataModelRecord["writer"], "any">;
  function?: DataModelRecord["function"]; recipe?: true;
  script?: undefined; args?: undefined; value_flag?: undefined; internal?: undefined; as_is?: undefined; needs?: undefined; venture_arg?: undefined;
};
/** What a command route may add: the arguments its script takes, how input reaches it, or the router's own handler. */
export type CommandExtra = {
  args?: string[]; value_flag?: string; internal?: string; as_is?: boolean; needs?: string[]; venture_arg?: string; actions?: string[];
};
/** A route that runs a script, or one the router answers itself (`internal`). Record fields are absent. */
export type CommandRoute = RouteBase & Omit<CommandExtra, "actions"> & {
  kind: "command"; script: string | null;
  record?: undefined; layer?: undefined; kit?: undefined; package?: undefined; kit_path?: undefined; schema?: undefined; form?: undefined;
  checks?: undefined; template?: undefined; decision_class?: undefined; files?: undefined; collection?: undefined; view_of?: undefined;
  writer?: undefined; function?: undefined; recipe?: undefined;
};
/** One entry of the route table. */
export type Route = RecordRoute | CommandRoute;
/** Builds a command route; the function modules' command lists (./commands.ts) take it. */
export type Cmd = (route: string, script: string | null, note: string, extra?: CommandExtra) => CommandRoute;
/** A concrete route matched to its table entry. */
export type Resolved = { r: Route | null; params: { id?: string; pattern?: string }; alias: RouteAliases["aliases"][number] | undefined };
/** The gate on a record route. */
export type Gate = { class: string; owner: string | null; level: DecisionRights["classes"][number]["level"]; drafts: boolean };
/** A venture under a workspace. A venture.json that cannot be read is listed by its folder, as broken. */
export type VentureEntry =
  | { id: string; name: string; phase: Venture["phase"]; path: string; dir: string; broken?: undefined }
  | { id: string; name: null; phase: null; path: string; dir: string; broken: true };
/** need-now.json: per record type, its prior for each phase, and the prior from which need-now suggests it. It has no schema. */
type NeedNowPriors = { suggest: number; records: Record<string, { base?: Partial<Record<string, number>> } | undefined> };
type DecisionClass = DecisionRights["classes"][number];

export const repo = fileURLToPath(new URL("../../../../..", import.meta.url));
/** A JSON file Naive ships or a venture keeps, read as the type its schema gives it; unknown when no type is named. */
export const load = <T = unknown>(p: string): T => JSON.parse(readFileSync(p, "utf8"));
// The workspace is MENTURA_WORKSPACE, else the current directory: a framework never defaults to a folder of its own.
export const defaultWorkspace = (): string => process.env.MENTURA_WORKSPACE ?? process.cwd();
// The phases, read from the phase modules (packages/naive/src/phases/<id>/phase.json, EE-126) in lifecycle order. Read
// here as data rather than through packages/naive/src/phases/phases.ts, because the phases unit comes after records.
const phasesDir = join(repo, "packages/naive/src/phases");
export const PHASES: Phase[] = (existsSync(phasesDir) ? readdirSync(phasesDir) : []).filter((d) => existsSync(join(phasesDir, d, "phase.json")))
  .map((d) => load<PhaseModule>(join(phasesDir, d, "phase.json"))).sort((a, b) => a.step - b.step)
  .map(({ id, name, question, gate, binding_constraint }) => ({ id, name, question, gate: gate.name, binding_constraint }));

export const glob = (g: string): RegExp => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*\*/g, "\u0001").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*").replace(/\u0001/g, ".*") + "$");
// A venture's files, stopping at a nested venture (which has its own records) and skipping dot and private folders.
export const files = (d: string, base: string = d): string[] => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.name.startsWith(".") ? [] : e.isDirectory() ? (existsSync(join(d, e.name, "venture.json")) || (d === base && e.name.startsWith("_")) ? [] : files(join(d, e.name), base)) : [join(d, e.name).slice(base.length + 1)]) : [];

export const skillsOf = (k: Pick<KitManifest, "skills" | "skill">): ManifestSkill[] => (k.skills?.length ? k.skills : k.skill ? [k.skill] : []);

/** Layer manifests and any package that owns record types. `kit` is the name, kept so the board still groups routes. */
export function kits(): KitManifest[] {
  const model = readDataModel();
  const paths = [...model.layers.map((l) => `packages/naive/src/records/layers/${l}/layer.json`), "packages/naive/src/records/layer.json"];
  const pkgDir = join(repo, "packages/naive/library", "packages");
  if (existsSync(pkgDir)) for (const d of readdirSync(pkgDir)) if (existsSync(join(pkgDir, d, "package.json"))) paths.push(`packages/naive/library/packages/${d}/package.json`);
  return paths.filter((p) => existsSync(join(repo, p))).map((p) => {
    const k = load<KitFile>(join(repo, p));
    const name = k.name ?? k.kit ?? "";
    return { path: p, ...k, name, kit: name };
  }).filter((k) => k.path.endsWith("/layer.json") || (k.records ?? []).length);
}

const needNowPriors = () => load<NeedNowPriors>(join(repo, "packages/naive/src/engine/need-now.json"));
// The template folders of the function modules, in the order departments.json lists the functions.
const FUNCTION_TEMPLATES_OF = () => load<DepartmentCatalog>(join(repo, "packages/naive/src/functions/departments.json")).departments.map((d) => `packages/naive/src/functions/${d.id}/templates`).filter((d) => existsSync(join(repo, d)));

/** The first segment of a recipe route: recipes/<pattern>. */
export const RECIPES = "recipes";

// Logs the router appends to, one hash-chained line per call (packages/naive/src/router/router.ts append). Every other
// log is written by its own module and only read through the router.
const APPENDS = new Set(["detector-trial"]);
// Records the router claims for the acting role, once (packages/naive/src/router/handoff-claim.ts, the handoff claim of
// docs/design/LEAD_AGENTS_2026-11-08.md).
const CLAIMS = new Set(["handoff"]);

/** The route table, generated from packages/naive/src/records/data-model.json, the kit manifests and packages/naive/src/engine/need-now.json. */
// Caching hook (F-12): built once per action and shared.
export function routes(): Route[] { return memo("routes", buildRoutes); }
function buildRoutes(): Route[] {
  const model = readDataModel();
  const ks = kits();
  const owner = new Map(ks.flatMap((k) => (k.records ?? []).map((r): [string, KitManifest] => [r, k])));
  const N = needNowPriors();
  const out: Route[] = [];
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
    const pick = (tdir: string) => existsSync(join(repo, tdir)) ? readdirSync(join(repo, tdir)).filter((f) => f === `${short}.md` || (f.startsWith(`${short}-`) && f.endsWith(".md"))).sort((a, b) => (a === `${short}.md` ? -1 : b === `${short}.md` ? 1 : a.localeCompare(b)))[0] : null;
    const found = tdirs.map((tdir): [string, string | null | undefined] => [tdir, pick(tdir)]).find(([, n]) => n);
    const template = found ? `${found[0]}/${found[1]}` : null;
    const checks = [...new Set((r.refs ?? []).map((x) => x.checked_by).filter((c): c is string => !!c && /^packages\/naive\/src\/[a-z]+\/check-[a-z-]+\.(mjs|ts)$/.test(c) && c !== "packages/naive/src/checks/check-data-model.ts"))];
    const legacy = [r.layer === "system" ? "system" : r.layer, sub, short].filter(Boolean).join("/");
    const base = PACKAGE_ROUTE[r.id] ?? legacy;
    const form = r.form ?? "json";
    const groups = PHASES.map((p) => p.id).filter((p) => (N.records[r.id]?.base?.[p] ?? 0) >= N.suggest).map((p) => `(${p})`);
    const common = { kind: "record" as const, record: r.id, layer: r.layer, kit: k?.name ?? null, package: k?.path?.startsWith("packages/naive/library/packages/") ? k.name : null, kit_path: k?.path ?? null, schema: r.schema, form, checks, template,
      decision_class: r.decision_class ?? null, groups, note: r.note ?? "", ...(r.view_of ? { view_of: r.view_of } : {}), ...(r.writer && r.writer !== "any" ? { writer: r.writer } : {}),
      // writer function: the route carries the record type's function, so the gate knows the one agent role, <function>-agent, that may write it.
      ...(r.writer === "function" ? { function: r.function } : {}) } satisfies Omit<RecordRoute, "route" | "files" | "actions" | "collection">;
    // A collection's one wildcard is a whole id at the start of a path segment (products/*.json, accounts/*/account.json).
    const collection = filesOf.length >= 1 && filesOf.every((p) => (p.match(/\*/g) ?? []).length === 1 && /(^|\/)\*[./]/.test(p) && !p.includes("**"));
    const concrete = filesOf.every((f) => !f.includes("*"));
    // A JSON record with a schema is written whole and checked against it. Prose a person owns (writer person, a
    // research program) is written whole as text; it has no schema, and only a person writes it (writerRule).
    const prose = r.writer === "person" && (form === "prose" || form === "markdown");
    const writable = !!(((r.schema && form === "json") || prose) && (collection || concrete));
    if (collection) {
      out.push({ ...common, route: base, files: filesOf, collection: "list" as const, actions: ["read", "view", "layout", ...(checks.length ? ["check"] : []), ...(template ? ["template"] : [])] });
      out.push({ ...common, route: `${base}/[id]`, files: filesOf, collection: "item" as const,
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
  const cmd: Cmd = (route, script, note, extra = {}) => ({ route, kind: "command", actions: ["run", "view", "layout"], script, groups: [], note, ...extra });
  out.push(
    cmd("system/package", "packages/naive/src/router/orchestration/venture-package.ts", "The venture package (EE-067, EE-069): the core packages open now and the handoffs, each record confirmed, to review or to write, what moves on its own and what waits, and what completion unlocks; --write renders the view and records a version. Assumes a solo founder or small founding team in Discovery and Validation; agents are a package enhancement"),
    cmd("system/need-now", "packages/naive/src/engine/need-now.ts", "What the venture needs now, soon, or should hold back (EE-028)"),
    cmd("system/time-to-ready", "packages/naive/src/engine/time-to-ready.ts", "Time to running, and to ready per layer and MAD tier"),
    // Model steps hook (use model, EE-073): the logic is packages/naive/src/router/orchestration/model-steps.ts; this route only shows the payload.
    cmd("system/steps", "packages/naive/src/router/orchestration/model-steps.ts", "The model steps' payload (use model, EE-073): what code computed, a placeholder for each judgment a model has yet to give, and the only fields each one receives; asks no model. mentura steps run asks one", { args: ["payload"] }),
    cmd("purpose/validation/assess", "packages/naive/src/engine/assess-problem.ts", "What the problem's evidence is strong enough for: each assumption labelled demonstrated, inferred, assumed, unknown or contradicted, the commitment it supports and the next test (EE-050). Asks first when the record is incomplete; input as_is runs it anyway", { as_is: true }),
    cmd("governance/analytics", "packages/naive/src/engine/decision-analytics.ts", "Decision analytics (EE-072): how many decisions of each type each function has made, open against decided, in whose words, in which phase, and their outcomes. Data only; a view is the platform's, or a visualization skill's", { actions: ["run", "layout"] }),
    cmd("governance/decisions", "packages/naive/src/engine/decisions.ts", "The decision matrix: every decision the venture owes by layer and phase, with its parent and boundary, and whether it renders now, waits, comes later, is stale or deferred (EE-054, EE-057)"),
    cmd("operations/marketing/sitemap", "packages/naive/src/functions/marketing-and-sales/marketing/site/plan.ts", "Plan the public site from the venture's records: the product decides whom it is offered to, that decides the audiences, and each page gets its sections in order with the MDX component, need, audience, reason, condition, source record and the public variant to write (EE-064)"),
    cmd("operations/marketing/public", "packages/naive/src/engine/check-public.ts", "The public gate: every marketing content file is a variant of a named internal record, says its audience and whether it is published, has a person's approval when published, and copies no run of ten words from its internal record (EE-064)"),
    cmd("operations/marketing/site", "packages/naive/src/functions/marketing-and-sales/marketing/site/presence.ts", "How present the venture's public records are on its marketing site: a score weighed by who the site must speak to now (raising, hiring, contributors, ICPs), and each item missing, not prominent enough or present, with where it belongs (EE-062). Read the site first with packages/naive/src/interfaces/harness/site.ts"),
    cmd("purpose/ideas/routes", "packages/naive/src/functions/strategy/frameworks/idea-map/route.ts", "Where each idea goes in the framework: the records it feeds, each destination's stage (routed, drafted, your decision, waiting, done), whether it moves in order or on its own, and the one step that moves it; plus the decision docket traced to the ideas (EE-061)"),
    cmd("purpose/ideas/graph", "packages/naive/src/functions/strategy/frameworks/idea-map/graph.ts", "The idea graph: which ideas build on which, each idea's signal, the lanes that move in order and the ones that can move on their own, and the ideas to develop next (EE-060)"),
    cmd("purpose/ideas", "packages/naive/src/functions/strategy/frameworks/idea-map/ideamap.ts", "The founder's idea dump mapped onto Naive's conventions: each idea verbatim with its departments, records and whether it exists, where the ideas cluster, what the dump never mentions, and what it says about whether a product exists (EE-059)"),
    // The Lean Canvas, the venture's shared kernel (EE-155): the whole canvas, and each box at its own route.
    cmd("identity/lean-canvas", "packages/naive/src/engine/lean-canvas.ts", "The Lean Canvas as the venture's shared kernel (EE-155): nine boxes, each a reference to a record its owning function writes, with status, what filling it unlocks and the roadmap (the current gate's evidence first)"),
    ...load<LeanCanvas>(join(repo, "packages/naive/src/functions/strategy/lean-canvas.json")).boxes.map((b) =>
      cmd(`identity/lean-canvas/${b.id}`, "packages/naive/src/engine/lean-canvas.ts", `One box of the Lean Canvas, ${b.label}: the ${b.record} record it references, its owner, status and what it unlocks (EE-155)`, { args: ["--box", b.id] })),
    // The Venture Anatomy Matrix (EE-157): the whole matrix, and each sub-matrix at its own route.
    cmd("identity/venture-anatomy", "packages/naive/src/engine/venture-anatomy.ts", "The Venture Anatomy Matrix, the venture's architecture description after ISO/IEC/IEEE 42010 (EE-157): eleven sub-matrices, each with its owner, cells known, estimated or unknown, the confidence share, Regulation S-K coverage and nesting"),
    ...load<VentureAnatomy>(join(repo, "packages/naive/src/functions/strategy/venture-anatomy.json")).submatrices.map((s) =>
      cmd(`identity/venture-anatomy/${s.id}`, "packages/naive/src/engine/venture-anatomy.ts", `One sub-matrix of the Venture Anatomy Matrix, ${s.label}: the ${s.record ?? "(not built)"} records it reads, its owner, cells by status and the S-K items it covers (EE-157)`, { args: ["--sub", s.id] })),
    // The briefing a person reads (EE-180): the whole briefing, and each function's at its own route.
    cmd("operations/activity-briefing", "packages/naive/src/engine/activity-briefing.ts", "The briefing a person reads about the venture's activities, APQC levels 1 and 2 (EE-180): each function the venture lists with its APQC category and process groups, and under each group the activities a person performs, the activities an agent performs and a person approves, each by the venture's assignment or by default from its kind, and how many are left to the function's agent. Derived on each read from operations/activity-assignments and the catalog's kinds; writes nothing, and open decisions, handoffs and results are not in it (not built)"),
    ...load<DepartmentCatalog>(join(repo, "packages/naive/src/functions/departments.json")).departments.map((d) =>
      cmd(`operations/activity-briefing/${d.id}`, "packages/naive/src/engine/activity-briefing.ts", `The briefing for one function, ${d.id}: its APQC category and process groups, with what a person performs or approves in each and how many activities are left to the agent (EE-180). Refused when the venture does not list the function`, { args: ["--function", d.id] })),
    cmd("purpose/foundation", "packages/naive/src/engine/foundation.ts", "The venture's strategic foundation by the Five Ws and How plus whether, each confirmed, drafted by an agent, waiting as a draft, or missing (EE-051)"),
    cmd("purpose/validation/score", "packages/naive/src/checks/check-validation.ts", "Held (EE-050): the single validation score from graded evidence (EE-026); purpose/validation/assess replaces it for the problem", { args: ["--score"] }),
    cmd("governance/payouts", "packages/naive/src/engine/payouts.ts", "Who gets what at a sale value, from the cap table (EE-022); input value, else the scenarios in exit.json", { needs: ["governance/ownership.json"], venture_arg: "id" }),
    cmd("system/overview", null, "The venture at a glance: telos, validation, need-now, time to ready, team and recent provenance, rendered as parallel slots", { internal: "overview" }),
    cmd("system/robots", null, "Which roles may read and write which routes, from the team plan", { internal: "robots" }),
    // Context hook (packages/naive/src/router/vitals.ts, packages/naive/src/router/context.ts): agent vitals and the context budget (N-6, C-15, N-13).
    cmd("system/vitals", "packages/naive/src/router/vitals.ts", "Agent vitals (N-6): calls per task, tokens of context per call, time to a useful answer and time from a decision opening to a person deciding it, at the 75th percentile, each checked against its threshold (C-15). Reads the events log that instrumentation writes"),
    // Traces (EE-121): packages/naive/src/core/instrumentation.ts writes them, packages/naive/src/engine/trace-cli.ts reads them.
    cmd("system/traces", "packages/naive/src/engine/trace-cli.ts", "The venture's trace sessions in traces/, one span per step of an agent run after the OpenTelemetry GenAI conventions, hash-chained and linked from provenance; read offline. naive trace show <session> prints one as a tree", { args: ["show"], actions: ["run", "layout"] }),
    cmd("system/context", "packages/naive/src/router/context.ts", "The context budget (N-13): what every route sends an agent, in tokens, against its budget, with the largest part and where to move it (S-14, F-6)", { args: ["budget"] }),
    cmd("knowledge/catalog", "packages/naive/src/store/connectors/catalog.ts", "Build or refresh the catalog: every item in every source the venture keeps records in, with its address and version, no content (EE-037)"),
    cmd("knowledge/search", "packages/naive/src/store/connectors/catalog.ts", "Find items across every source through the catalog; input value is the query (EE-037)", { value_flag: "--search" }),
    // The live decision index: packages/naive/src/engine/decision-index.ts, a cache in .naive/ updated from provenance.
    cmd("system/decision-index", "packages/naive/src/engine/decision-index.ts", "The live decision index: every open decision scored by the docket, its structural impact (functions, records, linked decisions), its phase weight and requirement lift, and requirement violations flagged now; each run re-scores every active decision, so an update equals a rebuild, and appends rank history for what moved; adds the decision queue across functions (by_function, themes, queue: the score weighted by the function's weight in the phase, one item per theme, with its lead). Input value update (default), rebuild or read", { venture_arg: "id" }),
    // Gate strength (EE-156): packages/naive/src/engine/phase-gate.ts, policies in packages/naive/src/phases/gate-policies.json.
    cmd("system/phase-gate", "packages/naive/src/engine/phase-gate.ts", "Gate strength (EE-156): each item of the current phase gate on its evidence ladder (very low, low, moderate, high), the minimum the venture's policy sets and its boundary (fail-closed refuses the phase change, fail-open reports an open risk), what reaches the next level, the policy's strictness, and whether the gate is ready"),
    // Gate calibration (EE-157): packages/naive/src/engine/gate-calibration.ts, rules in packages/naive/src/phases/gate-calibration.json.
    cmd("system/phase-gate/calibrate", "packages/naive/src/engine/gate-calibration.ts", "Gate calibration (EE-157): the current phase gate's thresholds derived from the venture's primary market (markets/<id>.json) and its industry (industries/<id>.json): interview counts per level, items raised or made fail-closed, how old evidence may be, what an override needs and how the problem is confirmed, each with the rule and its reason; unknown or lapsed cells adjust nothing and become assumptions for the validation plan. Reads only; the CLI's --propose files the open decision"),
    // Freshness (Revalidating, V-1 to V-8): packages/naive/src/engine/freshness.ts.
    cmd("system/freshness", "packages/naive/src/engine/freshness.ts", "What is fresh, stale or expired, and which records are live holes: by time (freshness profiles, per phase too) and on demand (a dependency changed, a where-used parent drifted, a tag, path or package was revalidated)"),
    // The signal pull (signal library design, build item 5): packages/naive/src/router/orchestration/signals.ts commits, as the
    // signal projector, what packages/naive/src/engine/signals.ts decides.
    cmd("system/signals", "packages/naive/src/router/orchestration/signals.ts", "Pull signals: render what new signals in the venture's libraries say into records through its listeners, write each new or changed record as the signal projector, verify an unchanged one, propose decisions and mark records stale; a pull after a pull writes nothing", { args: ["pull"] }),
    cmd("system/signals/replay", "packages/naive/src/router/orchestration/signals.ts", "Render every projected record again from the signals it cites and report drift; writes nothing", { args: ["replay"] }),
    cmd("system/signals/explain", "packages/naive/src/router/orchestration/signals.ts", "One signal at every listener: salient or noise, and every failed predicate; input value is the signal id", { value_flag: "--explain" }),
    cmd("system/revalidate", "packages/naive/src/engine/freshness.ts", "Mark records stale on demand: input value tag:<route> (the record and what depends on it), path:<folder>, package:<name>, or pivot (the validation package); a plain folder is refused in favour of exact tags", { value_flag: "--revalidate" }),
  );
  out.push(...cacheRoutes(cmd)); // Caching hook: system/cache, system/judge, system/answer (packages/naive/src/engine/caching.ts).
  out.push(...brandCommands(cmd)); // Brand hook: brand tokens, voice, glossary terms, sitemap.xml, asset facts (packages/naive/src/engine/brand.ts).
  out.push(...investorsLintCommands(cmd)); // Investors lint hook: investors/lint (packages/naive/src/checks/lint-investors.ts).
  out.push(...productCommands(cmd)); // Product lint hook: product/lint (packages/naive/src/checks/lint-product.ts).
  out.push(...moneyCommands(cmd)); // Money lint: transfer decisions and account owners (packages/naive/src/checks/lint-money.ts).
  out.push(...customersLintCommands(cmd)); // Customers lint: ICP match and promises read from product records by key.
  out.push(...validationCommands(cmd)); // Validation lint: claims, shelf life, agent grades, Discovery-grade decisions (packages/naive/src/checks/lint-validation.ts).
  out.push(...financeCommands(cmd)); // Finance lint: spend, price below cost, metric targets (packages/naive/src/checks/lint-finance.ts).
  out.push(...legalCommands(cmd)); // Legal lint hook: public claims and agreements (packages/naive/src/checks/lint-legal.ts).
  out.push(...peopleLintCommands(cmd)); // People lint: role, hire and decision alignment (packages/naive/src/checks/lint-people.ts).
  out.push(...foundationLintCommands(cmd)); // Foundation lint: mission, ICP jobs, alignment checks, problem forms (packages/naive/src/checks/lint-foundation.ts).
  return out.sort((a, b) => a.route.localeCompare(b.route));
}

/** Route groups: (phase) gathers the routes need-now suggests in that phase. The path is unchanged. */
export function groups(): { group: string; phase: Phase["id"]; question: string; gate: string; routes: string[] }[] {
  const rs = routes();
  return PHASES.map((p) => ({ group: `(${p.id})`, phase: p.id, question: p.question, gate: p.gate, routes: rs.filter((r) => r.groups.includes(`(${p.id})`)).map((r) => r.route) }));
}

// Aliases for renamed routes (stability): packages/naive/src/router/route-aliases.json, or MENTURA_ROUTE_ALIASES.
function aliases(): RouteAliases["aliases"] {
  const f = process.env.MENTURA_ROUTE_ALIASES ?? join(repo, "packages/naive/src/router/route-aliases.json");
  return existsSync(f) ? load<RouteAliases>(f).aliases : [];
}

/** A route, or a glob over routes, under its current name: an alias's old prefix becomes its new one
 *  (purpose/product/* becomes product/*). Anything no alias names comes back unchanged. */
export function canonical(route: string): string {
  const alias = aliases().find((a) => a.from === route || route.startsWith(`${a.from}/`));
  return alias ? alias.to + route.slice(alias.from.length) : route;
}

/** Matches a concrete route (purpose/product/kettle) to its table entry and params. Follows aliases. */
export function resolve(route: string): Resolved {
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

const walkVentures = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") || e.name.startsWith("_") ? []
  : e.isDirectory() ? walkVentures(join(d, e.name)) : e.name === "venture.json" ? [d] : []);

/**
 * Finds a venture folder ([...venture]): by id, or by its folder path under the workspace or its
 * ventures/ folder, so a nested venture can be named studio/print.
 */
export function ventureDir(id: string | null | undefined, workspace: string = defaultWorkspace()): string | null {
  if (!id) return null;
  if (id.includes("/")) {
    for (const base of [workspace, join(workspace, "ventures")]) {
      const d = join(base, id);
      if (!relative(workspace, d).startsWith("..") && existsSync(join(d, "venture.json"))) return d;
    }
    return null;
  }
  // A broken venture.json is found by its folder name, so its global error can answer (E-8, packages/naive/src/router/boundaries.ts).
  for (const d of walkVentures(workspace)) { let vid; try { vid = load<Venture>(join(d, "venture.json")).id; } catch { vid = basename(d); } if (vid === id) return d; }
  return null;
}

/** The ventures under a workspace: id, name, phase, path (the [...venture] segment) and folder. */
export function ventures(workspace: string = defaultWorkspace()): VentureEntry[] {
  const root = existsSync(join(workspace, "ventures")) ? join(workspace, "ventures") : workspace;
  return walkVentures(workspace).map((d): VentureEntry => { let v; try { v = load<Venture>(join(d, "venture.json")); } catch { return { id: basename(d), name: null, phase: null, path: relative(root, d), dir: d, broken: true }; } return { id: v.id, name: v.name, phase: v.phase, path: relative(root, d), dir: d }; });
}

// The venture's decision rights: the template, tightened by the venture's own file.
function decisionRights(dir: string): Map<string, DecisionClass> {
  const t = load<DecisionRights>(join(repo, "packages/naive/template/governance/decision-rights.json"));
  const classes = new Map(t.classes.map((c) => [c.id, c]));
  const own = join(ventureFile(dir, "governance/decision-rights.json"));
  if (existsSync(own)) for (const c of load<DecisionRights>(own).classes) classes.set(c.id, { ...classes.get(c.id), ...c, level: classes.get(c.id)?.level === "escalate" ? "escalate" : c.level });
  return classes;
}

/** The gate on a record: its decision class from the data model, and whether an agent's write is a draft. */
export function gateOf(r: { decision_class?: string | null }, dir?: string | null): Gate | null {
  if (!r.decision_class) return null;
  const c = dir ? decisionRights(dir).get(r.decision_class) : null;
  const level = c?.level ?? "escalate";
  return { class: r.decision_class, owner: c?.owner ?? null, level, drafts: level === "escalate" || level === "recommend-approve" };
}

// Robots: a team-plan role may list the routes it may read and write (globs over routes).
export function allowed(dir: string | null | undefined, actorId: string | null | undefined, action: string, route: string): boolean {
  if (!actorId || !dir) return true;
  const plan = [join(ventureFile(dir, "people/team-plan.json")), join(ventureFile(dir, "operations/team-plan.json"))].find((p) => existsSync(p));
  if (!plan) return true;
  const role = load<TeamPlan>(plan).roles.find((x) => x.id === actorId);
  if (!role?.routes) return true;
  const list = action === "write" ? role.routes.write ?? [] : role.routes.read ?? ["**"];
  return list.some((g) => glob(g).test(route));
}

const PACKAGE_ROUTE: Readonly<Record<string, string>> = {
  "validation-problem": "foundation/problem", icp: "foundation/icp", telos: "foundation/telos", alignment: "foundation/alignment",
  goal: "foundation/goals", requirement: "foundation/requirements", "exit-criteria": "foundation/exit-criteria", constraints: "foundation/constraints", "venture-core": "foundation/core",
  "validation-solution": "validation/solution", "validation-pricing": "validation/pricing", "validation-plan": "validation/plan", "validation-go-to-market": "validation/go-to-market",
  "validation-product-market-fit": "validation/product-market-fit", "validation-operations-readiness": "validation/operations-readiness",
  "validation-team": "people/team", "team-plan": "people/team-plan", "marketing-sitemap": "marketing/sitemap", "marketing-content": "marketing/content",
  "idea-dump": "raw/dump", "idea-map": "ideas/map", "idea-graph": "ideas/graph", product: "product", evidence: "evidence",
  "anatomy-answers": "product/anatomy-answers", "anatomy-input": "product/anatomy", "venture-package": ".release/venture-package",
  "decision-record": "decisions",
  "validation-interview": "validation/interviews", "validation-feedback": "validation/feedback", bug: "product/bugs",
  customer: "customers", investor: "investors", "money-account": "money", "raw-source": "raw/sources", triage: "raw/triage",
  "spend-register": "finance/spend", budget: "finance/budget", "lead-plan": "operations/lead", "time-box": "operations/time-box",
  "fixed-asset": "assets/register", lease: "assets/leases", risk: "legal/risks", obligation: "legal/obligations",
  people: "people", founder: "people/founders", "fund-thesis": "fund/thesis", "fund-terms": "fund/terms", deal: "deals",
  connection: "it/connections",
  "market-anatomy": "markets", "industry-anatomy": "industries",
  supplier: "supply-chain/suppliers", "purchase-order": "supply-chain/purchase-orders",
  "service-offer": "service-delivery/offers", engagement: "service-delivery/engagements",
  opportunity: "sales/opportunities", "support-policy": "support/policy", "support-case": "support/cases",
  raise: "investor-relations/raises", "stakeholder-update": "investor-relations/updates",
  process: "capabilities/processes", postmortem: "capabilities/postmortems",
  ...BRAND_ROUTES, // Brand hook: marketing/brand, public/assets, glossary (packages/naive/src/engine/brand.ts).
};
