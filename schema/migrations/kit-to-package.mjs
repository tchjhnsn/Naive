// Migration kit-to-package (framework 0.3.0, EE-071): packages are Naive's, kits are Mentura's. The
// first record migration, like a Next.js codemod that rewrites code for a renamed API:
//
//   1. naive.config.json: before 0.3.0, `kits` listed the venture's Naive packages. A name that is a
//      Naive package moves into `packages` (pinned by the upgrader); a Mentura kit stays in `kits`; any
//      other name is escalated, never guessed.
//   2. Routes inside records: decision unlocks, the team plan's route globs (who may read and write
//      what) and the where-used list's parent routes still name layer and kit routes
//      (purpose/validation/solution). Each is rewritten to its package route through the route aliases
//      (validation/solution), so access and locks keep meaning what they meant. A glob that spans
//      routes now in several packages (purpose/**) cannot be rewritten safely and is escalated.
//
// Every change goes through ctx (schema/upgrades.mjs).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../../packages/core/venture-paths.mjs";
import { kit } from "../kits.mjs";

export const id = "kit-to-package";
export const describe = "Moves Naive packages out of naive.config.json kits into packages, and rewrites layer and kit routes inside records (decision unlocks, team-plan access, where-used parents) to package routes";

const repo = new URL("../..", import.meta.url).pathname;

function aliases() {
  const f = process.env.MENTURA_ROUTE_ALIASES ?? join(repo, "interface/route-aliases.json");
  // Longest first, so purpose/validation/problem wins over a shorter alias it starts with.
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")).aliases.slice().sort((a, b) => b.from.length - a.from.length) : [];
}

/** A route or route glob rewritten through the aliases: { to } when it moved, { escalate } when it spans moved routes, else null. */
export function rewriteRoute(route, list = aliases()) {
  if (typeof route !== "string") return null;
  const hit = list.find((a) => route === a.from || route.startsWith(`${a.from}/`));
  if (hit) return { to: hit.to + route.slice(hit.from.length), alias: hit };
  const star = route.indexOf("*");
  if (star >= 0) {
    const head = route.slice(0, star).replace(/\/$/, "");
    // A glob from the root (**) still covers every route after the move.
    const spans = head === "" ? [] : list.filter((a) => a.from === head || a.from.startsWith(`${head}/`));
    if (spans.length) return { escalate: `${route} spans routes that moved to ${[...new Set(spans.map((a) => a.to.split("/")[0]))].join(", ")}` };
  }
  return null;
}

export function apply(dir, ctx) {
  const list = aliases();

  // 1. kits that are Naive packages become packages.
  const cfg = ctx.config;
  if (Array.isArray(cfg.kits) && cfg.kits.length) {
    const keep = [];
    for (const name of cfg.kits) {
      if (existsSync(join(repo, "library", "packages", name, "package.json"))) {
        cfg.packages = { ...(cfg.packages ?? {}), [name]: cfg.packages?.[name] ?? {} };
        ctx.note(`naive.config.json: ${name} is a Naive package, so it moved from kits to packages`);
      } else if (kit(name)) keep.push(name);
      else { keep.push(name); ctx.escalate(`naive.config.json: kits names ${name}, which is neither a Naive package nor a Mentura kit; left as it is`); }
    }
    if (keep.length !== cfg.kits.length) ctx.configChanged();
    if (keep.length) cfg.kits = keep; else delete cfg.kits;
  }

  // 2. Routes inside records.
  const rewrite = (file, value, where) => {
    const r = rewriteRoute(value, list);
    if (!r) return value;
    if (r.escalate) { ctx.escalate(`${file}: ${where} ${r.escalate}; rewrite it yourself`); return value; }
    return r.to;
  };
  const rewriteFile = (file, fn) => {
    if (!existsSync(ventureFile(dir, file))) return;
    const before = readFileSync(ventureFile(dir, file), "utf8");
    const rec = JSON.parse(before);
    fn(rec);
    const after = JSON.stringify(rec, null, 2) + "\n";
    if (after.trim() !== before.trim()) ctx.write(file, after, { note: "routes renamed from layer and kit routes to package routes (EE-071)" });
  };

  const decisionFiles = (sub = "") => readdirSync(ventureFile(dir, sub), { withFileTypes: true }).flatMap((e) => {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) return e.name.startsWith(".") || e.name.startsWith("_") || existsSync(join(dir, rel, "venture.json")) ? [] : decisionFiles(rel);
    return e.name.endsWith(".decision.json") ? [rel] : [];
  });
  for (const f of decisionFiles()) rewriteFile(f, (d) => {
    for (const u of d.unlocks ?? []) if (Array.isArray(u.routes)) u.routes = u.routes.map((g) => rewrite(f, g, "unlocks route"));
  });

  for (const f of ["people/team-plan.json", "operations/team-plan.json"]) rewriteFile(f, (p) => {
    for (const role of p.roles ?? []) for (const k of ["read", "write"]) if (Array.isArray(role.routes?.[k])) role.routes[k] = role.routes[k].map((g) => rewrite(f, g, `role ${role.id} ${k}`));
  });

  rewriteFile("knowledge/where-used.json", (w) => {
    for (const fact of w.facts ?? []) if (fact.parent?.route) fact.parent.route = rewrite("knowledge/where-used.json", fact.parent.route, `fact ${fact.id} parent`);
  });
}
