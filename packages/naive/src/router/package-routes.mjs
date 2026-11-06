// Package routes, route groups and slot defaults (Next.js translation L-6, P-17, P-36, P-37, and the
// venture route for P-3). The router reaches these when a route is not in the route table, so the
// table, generated from the data model, stays as it is.
//
//   <package>            a package's own route (validation, foundation, marketing; packages/<name> works
//                        for every package, even one whose name is also a record route such as product).
//                        read returns its records and their state: progress, what moves now, what waits,
//                        and the drafts pending in it (its loading state, P-37). check runs its boundary
//                        (E-5). view is the same as a page. layout is its group's and its own context.
//   (<group>)            a route group (P-36): packages that share a layout, so they share context. The
//                        framework defines (go-to-market) for marketing, relationships and customers; a
//                        venture adds or changes groups in naive.config.json "groups", and may keep the
//                        group's own AGENTS.md in a (<group>)/ folder at its root. Only the packages in a
//                        group get its layout: the layout is opt-in.
//   venture              the venture's own route: read is the manifest venture.json declares (P-3), check
//                        runs every boundary (E-5).
//   @packages            the system/overview slot: each package in use, and for a package with nothing in
//                        it, its default: what to write first and where to start (P-17).

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";

const repo = new URL("../../../..", import.meta.url).pathname;
const load = (f) => JSON.parse(readFileSync(f, "utf8"));

/** The framework's route groups (P-36). A venture's naive.config.json "groups" adds to or replaces these. */
export const GROUPS = {
  "go-to-market": { packages: ["marketing", "relationships", "customers"], context: "Who the venture sells to and how it reaches them. Marketing and sales share the ICP, the offer and the accounts, so they share one layout." },
};

export const packageNames = () => existsSync(join(repo, "library", "packages")) ? readdirSync(join(repo, "library", "packages")).filter((n) => existsSync(join(repo, "library", "packages", n, "package.json"))) : [];
export const packageDef = (n) => load(join(repo, "library", "packages", n, "package.json"));

/** The venture's route groups: the framework's, then its own from naive.config.json. */
export function groupsOf(dir) {
  const f = dir && join(ventureFile(dir, "naive.config.json"));
  const own = f && existsSync(f) ? load(f).groups ?? {} : {};
  return { ...GROUPS, ...own };
}

/** The package a record type lives in: its core home first, else the data or folder package that declares it. */
export function packageOfRecord(type) {
  if (!type) return null;
  const names = packageNames();
  const core = names.find((n) => { const p = packageDef(n); return p.kind === "core" && [...(p.required ?? []), ...(p.optional ?? [])].includes(type); });
  if (core) return core;
  return names.find((n) => { const p = packageDef(n); return p.kind !== "handoff" && (p.records ?? []).includes(type); }) ?? null;
}

/** The group layout a package gets (P-36), or null when it is in no group. */
export function groupLayout(pkg, dir) {
  const gs = groupsOf(dir);
  const id = Object.keys(gs).find((g) => (gs[g].packages ?? []).includes(pkg));
  if (!id) return null;
  const g = gs[id];
  const agents = dir && existsSync(join(dir, `(${id})`, "AGENTS.md")) ? `(${id})/AGENTS.md` : null;
  const shares = [...new Set(g.packages.filter((n) => packageNames().includes(n)).flatMap((n) => packageDef(n).refs ?? []))];
  return { group: `(${id})`, packages: g.packages, context: g.context ?? null, shares, agents };
}

/** Which special route a name is: a package, a group or the venture. */
export function special(route) {
  if (route === "venture") return { kind: "venture" };
  const g = route.match(/^\(([a-z0-9-]+)\)$/);
  if (g) return { kind: "group", id: g[1] };
  const name = route.startsWith("packages/") ? route.slice("packages/".length) : route;
  return packageNames().includes(name) ? { kind: "package", name } : null;
}

/** The route of a record type: its item or single route, else its list route. */
export const routeOfType = async (type) => {
  const { routes } = await import("./router.mjs");
  const rs = routes().filter((r) => r.record === type);
  return (rs.find((r) => r.collection !== "list") ?? rs[0])?.route ?? null;
};

// The drafts waiting in a package's records (P-37): its pending state.
async function pendingIn(dir, types, venture) {
  const { recordOf } = await import("../engine/decisions.mjs");
  const { entries } = await import("../core/provenance.mjs");
  const d = join(ventureFile(dir, "_drafts"));
  if (!existsSync(d)) return [];
  const log = entries(dir);
  const out = [];
  for (const f of readdirSync(d).filter((x) => x.endsWith(".draft"))) {
    const file = f.slice(0, -".draft".length).replace(/__/g, "/");
    const type = recordOf(file);
    if (!types.includes(type)) continue;
    const route = await routeOfType(type);
    const id = route?.endsWith("[id]") ? file.split("/").at(-1).replace(/\.json$/, "") : null;
    const concrete = id ? route.replace("[id]", id) : route;
    out.push({ record: type, route: concrete, draft: `_drafts/${f}`, since: log.filter((e) => e.entity === `_drafts/${f}`).at(-1)?.at ?? null, accept: `mentura accept ${concrete} --venture ${venture}` });
  }
  return out;
}

/** A package's own route read (L-6, P-37): its records and their state, what moves now, what waits, what is pending. */
export async function packageState(dir, name, venture) {
  const def = packageDef(name);
  const { venturePackage } = await import("./orchestration/venture-package.mjs");
  const all = venturePackage(dir);
  const p = [...all.core, ...all.handoff].find((x) => x.id === name);
  if (p?.kind === "core") {
    const records = await Promise.all(p.records.map(async (r) => ({ record: r.record, title: r.title, role: r.role, route: await routeOfType(r.record), status: r.status, moves: r.moves, ...(r.waits_on ? { waits_on: r.waits_on } : {}), files: r.files })));
    const pending = await pendingIn(dir, p.records.filter((r) => r.role !== "reads").map((r) => r.record), venture);
    return { package: name, kind: "core", title: p.title, purpose: p.purpose, function: def.function ?? def.department ?? null, fit: p.fit, in: p.in, state: p.state, progress: p.progress,
      records, moves_now: records.filter((r) => r.moves === "now" && r.role !== "reads").map((r) => r.route), waits: records.filter((r) => r.moves === "waits").map((r) => ({ route: r.route, on: r.waits_on })),
      loading: pending.length ? { drafts: pending, note: `${pending.length} draft${pending.length > 1 ? "s" : ""} waiting for a person to accept` } : null, unlocks: p.unlocks, missing: p.missing, to_review: p.to_review };
  }
  if (p?.kind === "handoff") return { package: name, kind: "handoff", title: p.title, for: p.for, from: p.from, fit: p.fit, in: p.in, state: p.state, progress: p.progress, waits_on: p.waits_on, unlocks: p.unlocks, loading: null };
  // Data, folder and raw packages: never complete; their state is what they hold.
  const { routes, glob } = await import("./router.mjs");
  const { files } = await import("./router.mjs");
  const here = files(dir);
  const records = await Promise.all((def.records ?? []).map(async (t) => {
    const r = routes().find((x) => x.record === t);
    const held = r ? here.filter((f) => r.files.some((g) => glob(g).test(f))) : [];
    return { record: t, route: await routeOfType(t), items: held.length, files: held };
  }));
  const pending = await pendingIn(dir, def.records ?? [], venture);
  return { package: name, kind: def.kind, title: def.title, purpose: def.purpose, state: records.some((r) => r.items) ? "holding" : "empty", records, gates: def.gates ?? [],
    loading: pending.length ? { drafts: pending, note: `${pending.length} draft${pending.length > 1 ? "s" : ""} waiting for a person to accept` } : null };
}

/** The overview's @packages slot (P-17): each package in use, and the default a package with nothing in it shows. */
export async function packageSlots(dir, venture) {
  const { manifest } = await import("../engine/structure.mjs");
  const m = await manifest(dir);
  const out = [];
  for (const { name, known } of m.packages.list) {
    if (!known) { out.push({ package: name, shows: "not a Naive package: check venture.json packages" }); continue; }
    const s = await packageState(dir, name, venture);
    const empty = s.kind === "core" ? s.records.filter((r) => r.role !== "reads").every((r) => r.status === "missing") : s.kind === "handoff" ? false : s.state === "empty";
    if (!empty) { out.push({ package: name, title: s.title, state: s.state, progress: s.progress ?? null, moving: (s.moves_now ?? []).join(", ") || "none" }); continue; }
    // The default: nothing written yet, and where to start.
    const first = s.kind === "core" ? s.records.find((r) => r.role === "required" && r.moves === "now") ?? s.records.find((r) => r.role !== "reads") : s.records[0];
    const route = first?.route ?? null;
    const concrete = route?.endsWith("[id]") ? route.replace("[id]", "<id>") : route;
    const { routes } = await import("./router.mjs");
    const acts = routes().find((x) => x.route === route)?.actions ?? [];
    const write = acts.includes("write") ? `mentura ${concrete} write --venture ${venture} --input <file>` : null;
    const start = !concrete ? null : acts.includes("template") ? `mentura ${concrete} template${write ? `, then ${write}` : ""}` : write ?? `mentura ${concrete} layout --venture ${venture}`;
    out.push({ package: name, title: s.title, default: true, shows: `${s.title}: nothing written yet`, start });
  }
  return out;
}

const pageOf = (s) => {
  const lines = [`# ${s.title ?? s.package}`, "", s.purpose ?? "", ""];
  if (s.state) lines.push(`State: ${s.state}${s.progress != null ? ` (${Math.round(s.progress * 100)}%)` : ""}.`, "");
  if (s.loading) lines.push(`> ${s.loading.note}: ${s.loading.drafts.map((d) => `\`${d.accept}\``).join(", ")}`, "");
  if (s.records?.length) {
    const cols = s.kind === "core" ? ["route", "role", "status", "moves"] : ["route", "items"];
    lines.push(`| ${cols.join(" | ")} |`, `| ${cols.map(() => "---").join(" | ")} |`, ...s.records.map((r) => `| ${cols.map((c) => String(r[c] ?? "")).join(" | ")} |`), "");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
};

/** Answers a call to a package, group or venture route; null when the route is none of them. */
export async function specialCall({ venture, route, action, workspace }) {
  const sp = special(route);
  if (!sp) return null;
  const { ventureDir } = await import("./router.mjs");
  const actions = sp.kind === "group" ? ["read", "view", "layout"] : ["read", "view", "check", "layout"];
  if (!actions.includes(action)) return { ok: false, error: `${route} has no action ${action} (it has ${actions.join(", ")})` };
  const dir = venture ? ventureDir(venture, workspace) : null;
  if (!dir && !(action === "layout" && sp.kind !== "venture")) return { ok: false, error: `no venture ${venture}` };
  if (sp.kind === "venture") {
    const { manifest } = await import("../engine/structure.mjs");
    const { boundaries } = await import("./boundaries.mjs");
    if (action === "check") { const b = await boundaries(dir); return { ok: b.ok, result: b }; }
    const m = await manifest(dir);
    if (action === "view") return { ok: true, result: `# ${m.identity.name}\n\nPhase: ${m.phase}. Packages: ${m.packages.list.map((p) => p.name).join(", ")}.\n\n| Function | Owner | Packages |\n| --- | --- | --- |\n${m.functions.map((f) => `| ${f.function} | ${f.owner ?? "nobody yet"} | ${f.packages.join(", ")} |`).join("\n")}\n` };
    if (action === "layout") return { ok: true, result: { route: "venture", manifest: m } };
    return { ok: true, result: m };
  }
  if (sp.kind === "group") {
    const gs = groupsOf(dir);
    const g = gs[sp.id];
    if (!g) return { ok: false, error: `no route group (${sp.id}): the groups are ${Object.keys(gs).map((x) => `(${x})`).join(", ")}` };
    const lay = groupLayout(g.packages[0], dir);
    if (action === "layout" || !dir) return { ok: true, result: { ...lay, chain: lay.agents && dir ? [{ path: lay.agents, text: readFileSync(ventureFile(dir, lay.agents), "utf8") }] : [] } };
    const states = [];
    for (const n of g.packages.filter((x) => packageNames().includes(x))) states.push(await packageState(dir, n, venture));
    const res = { group: `(${sp.id})`, context: g.context ?? null, packages: states.map((s) => ({ package: s.package, state: s.state, progress: s.progress ?? null, pending: s.loading?.drafts.length ?? 0 })) };
    return { ok: true, result: action === "view" ? `# (${sp.id})\n\n${res.context ?? ""}\n\n${res.packages.map((p) => `- ${p.package}: ${p.state}${p.progress != null ? ` (${Math.round(p.progress * 100)}%)` : ""}${p.pending ? `, ${p.pending} pending` : ""}`).join("\n")}\n` : res };
  }
  const name = sp.name;
  if (action === "layout") {
    const def = packageDef(name);
    return { ok: true, result: { route: name, package: { name, title: def.title, purpose: def.purpose, function: def.function ?? def.department ?? null, skill: def.skill?.path ?? null, gates: def.gates ?? [] }, group: groupLayout(name, dir) } };
  }
  if (action === "check") { const { boundaries } = await import("./boundaries.mjs"); const b = await boundaries(dir, { only: [name] }); return { ok: b.packages.every((p) => p.ok), result: b.packages[0] ?? { package: name, ok: true, note: "not in use by this venture" } }; }
  const s = await packageState(dir, name, venture);
  return action === "view" ? { ok: true, result: pageOf(s) } : { ok: true, result: s, ...(s.loading ? { pending_drafts: s.loading.drafts } : {}) };
}
