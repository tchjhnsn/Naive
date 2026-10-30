// The gate (EE-073, P-5, X-1 to X-6): what happens to a write before it lands. One gate per venture
// (X-5). Its rules come from three places: the venture's naive.config.json (fail_closed routes and
// rules), each package's gate_rules in its package definition (imported, unless the config leaves a
// package out), and two the framework always applies: pinned package versions (U-4) and the acting
// role's write access (P-27). A rule names the routes it covers in the router's own path patterns
// (X-6) and says what happens: hold the write as a draft, send it as a draft to the function owner
// (X-2), or refuse it.
//
// The gate is fast and never calls a model (X-4). Confidence routing reads a score the write already
// carries; a write without a score is never held for confidence. Access is checked here and again
// at the record by the router, on every read and write (F-5). The gate decides; storing a held
// write, and keeping differing drafts side by side, is schema/gate-drafts.mjs.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { may } from "./access.mjs";
import { configFor, functionOf, packageDefs, packagesOf, pinsBlocking, threshold } from "./naive-config.mjs";

const repo = new URL("..", import.meta.url).pathname;

/** Package gates, imported from packages/<name>/package.json: the completion gates, as written. No model, no network. */
export function packageGates() {
  const dir = join(repo, "packages");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name, "package.json");
    if (!existsSync(p)) return [];
    const pkg = JSON.parse(readFileSync(p, "utf8"));
    return (pkg.gates ?? []).map((rule) => ({ package: pkg.name, rule }));
  });
}

/**
 * Whether an agent write is held as a draft by fail_closed alone. fail_closed names path prefixes
 * (foundation, or foundation/problem). A person is not held. Kept for callers of the first gate.
 */
export function hold(config, route, actor) {
  if (actor === "person") return null;
  const closed = config?.fail_closed ?? [];
  const hit = closed.find((g) => route === g || route.startsWith(`${g}/`));
  return hit ? { hold: "draft", rule: hit } : null;
}

/** The gate section of the venture's naive.config.json, with its defaults. */
export function configOf(dir) {
  return configFor(dir).gate;
}

/**
 * A route pattern as a regular expression, in the router's own path syntax (X-6): a plain route
 * matches itself; an [id] (any [name]) segment or * is one segment; ** is any depth, and a trailing
 * /** covers the route above it too (validation/** covers validation).
 */
export function patternRe(pattern) {
  const segs = pattern.split("/").filter(Boolean);
  let re = "", sep = false;
  segs.forEach((s, i) => {
    if (s === "**") {
      if (i === segs.length - 1) re += sep ? "(?:/.*)?" : ".*";
      else { re += sep ? "(?:/[^/]+)*/" : "(?:[^/]+/)*"; sep = false; }
      return;
    }
    re += (sep ? "/" : "") + (/^\[[a-z.]+\]$/.test(s) || s === "*" ? "[^/]+" : s.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"));
    sep = true;
  });
  return new RegExp(`^${re}$`);
}

/** Whether a rule's pattern covers a write: the concrete route (product/kettle) or its table route (product/[id]). */
export function matches(pattern, route, tableRoute) {
  const re = patternRe(pattern);
  return re.test(route) || (!!tableRoute && (pattern === tableRoute || re.test(tableRoute)));
}

/** Gate rules imported from the package definitions (X-5): each package's gate_rules, tagged with the package. */
export function packageRules(config) {
  const sel = config?.gate?.packages ?? true;
  if (sel === false) return [];
  return packageDefs().filter((p) => sel === true || sel[p.name] !== false)
    .flatMap((p) => (p.gate_rules ?? []).map((r) => ({ ...r, source: `package ${p.name}`, package: p.name })));
}

/** Every rule the venture's gate applies, in order: fail_closed, the config's rules, then the packages'. */
export function rulesFor(config) {
  const g = config?.gate ?? {};
  return [
    ...(g.fail_closed ?? []).map((p) => ({ id: p, routes: [p, `${p}/**`], then: "draft", actors: ["agent"], source: "naive.config.json", fail_closed: true })),
    ...(g.rules ?? []).map((r) => ({ ...r, source: "naive.config.json" })),
    ...packageRules(config),
  ];
}

const SEVERITY = { pass: 0, draft: 1, owner: 2, refuse: 3 };

/**
 * The gate's verdict on one write. Input: config (resolved, from configFor), dir (for access),
 * route (concrete), table (its route-table pattern), record (type), actor (person or agent), role
 * (team-plan id), confidence (a score the write carries, or undefined), exists (the record exists
 * now), decisionOwner (the owner of the record's decision class, if any).
 * Returns { then: pass | draft | owner | refuse, rule, source, owner, variants, why, matched }.
 * @param {{ config: *, dir?: string, route: string, table?: string, requested?: *, record?: string, actor?: string, role?: string, confidence?: number, exists?: boolean, decisionOwner?: string }} q
 */
export function evaluate({ config, dir, route, table, requested, record, actor = "agent", role, confidence, exists, decisionOwner }) {
  const pins = pinsBlocking(config, record);
  if (pins.length) return { then: "refuse", rule: "pinned-version", source: "naive.config.json packages", matched: ["pinned-version"],
    why: pins.map((p) => `${p.package} is pinned to ${p.pinned} but ${p.installed ?? "nothing"} is installed`).join("; ") + ": change the pin or the install first" };
  if (dir && role && ![route, table, requested].some((x) => x && may(dir, role, "write", x)))
    return { then: "refuse", rule: "access", source: "team plan", matched: ["access"], why: `${role} may not write ${route} (team plan routes)` };
  const hits = [];
  for (const r of rulesFor(config)) {
    if (!(r.actors ?? ["agent"]).includes(actor)) continue;
    if (r.roles?.length && !r.roles.includes(role)) continue;
    if (!r.routes.some((p) => matches(p, route, table))) continue;
    const w = r.when ?? {};
    if (w.exists !== undefined && w.exists !== !!exists) continue;
    if (w.confidence_below !== undefined) {
      const limit = typeof w.confidence_below === "number" ? w.confidence_below : threshold(config, w.confidence_below, threshold(config, "confidence", 0.7));
      if (typeof confidence !== "number" || confidence >= limit) continue;
    }
    hits.push(r);
  }
  if (!hits.length) return { then: "pass", rule: null, source: null, matched: [] };
  const top = hits.reduce((a, b) => (SEVERITY[b.then] > SEVERITY[a.then] ? b : a));
  const fn = functionOf(record);
  // The owner: the rule's, else naive.config.json owners by function or by package, else the record's decision-class owner, else the founder.
  const keys = [fn, top.package, ...packagesOf(record).map((p) => p.name)].filter(Boolean);
  const owner = top.then === "owner" ? top.owner ?? keys.map((k) => config?.owners?.[k]).find(Boolean) ?? decisionOwner ?? "founder" : undefined;
  const variants = !!(top.variants ?? config?.gate?.variants);
  const where = top.fail_closed ? `${top.id} fails closed in naive.config.json` : `rule ${top.id} (${top.source})`;
  const why = top.then === "refuse" ? `${where} refuses this write${top.note ? `: ${top.note}` : ""}`
    : top.then === "owner" ? `${where} sends this write to its function owner, ${owner}: written as a draft for them to accept`
    : `${where}: written as a draft for a person to accept`;
  return { then: top.then, rule: top.id, source: top.source, ...(owner ? { owner, function: fn } : {}), variants, why, matched: hits.map((h) => h.id) };
}
