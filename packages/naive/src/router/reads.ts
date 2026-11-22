// What a read answers besides the record (Next.js translation L-9, L-10, O-1, O-2, O-3, P-28). The
// router's wrapper (packages/naive/src/router/writes.ts) adds these to every read and layout. Code computes all of
// it from the files and the provenance log; no model writes any of it.
//
//   params     L-9   the dynamic segment's value ({ id: "kettle" } for product/kettle), given to the
//                    read and to every layout below it: the item's own folder AGENTS.md joins the
//                    chain, and "[id]" in an instruction becomes the id, so a product's layout knows
//                    which product
//   where      L-10  route inputs that change what a read returns: input.where { status, phase,
//                    function, state, or any field by dot path }. A list keeps the items that match;
//                    a single record that does not match comes back null with filtered_out
//   metadata   O-1   the static metadata: the venture's identity from venture.json and the record's
//                    own frontmatter (Markdown) or title
//              O-2   derived fields, computed by code from the record: counts, the phase, the
//                    function and its owner, and its state (confirmed, agent, draft, unlogged)
//              O-3   the fields the framework adds to every record without being asked: id,
//                    created, updated, and who wrote it last (person or agent), from provenance
//   hierarchy  P-28  the order the router resolves a read: layout (context), template (fresh
//                    context), error (failed checks), loading (pending drafts), not-found (missing
//                    record), then page (the record). resolved_by names the level that answered;
//                    input.hierarchy returns every level

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { entries } from "../core/provenance.ts";
import { ventureFile } from "../core/venture-paths.ts";

import type { RouteEntry } from "./router.ts";

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => !!x && typeof x === "object";
/** The metadata a read answers with, as filterRead and hierarchy read it. */
type Meta = { derived?: { state?: unknown; function?: unknown; owner?: unknown; count?: number }; venture?: { phase?: unknown }; items?: Record<string, { derived?: Meta["derived"] }>; function?: unknown; owner?: unknown; phase?: unknown };
/** A read or layout answer, as this file reads it. */
type ReadAnswer = { ok: boolean; result?: unknown; sources?: unknown; metadata?: unknown; error?: string; errors?: unknown; fix?: unknown; pending_draft?: unknown; pending_pull_requests?: unknown; not_found?: unknown; filtered_out?: unknown; [k: string]: unknown };
type Chained = { path: string; text: string };
/** A layout, as withParams and hierarchy read it. */
export type Layout = { chain?: Chained[]; stack?: { name: string }[]; need_now?: unknown; gate?: unknown; [k: string]: unknown };

const load = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const get = (o: unknown, p: string) => p.split(".").reduce<unknown>((x, k) => (x == null ? undefined : (x as Obj)[k]), o);

/** Simple YAML frontmatter: key: value lines between --- fences. Lists in [a, b] form become arrays. */
export function frontmatter(text: unknown): Record<string, string | string[]> | null {
  const m = typeof text === "string" ? text.match(/^---\n([\s\S]*?)\n---\n?/) : null;
  if (!m) return null;
  const out: Record<string, string | string[]> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    let v: string | string[] = kv[2].trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean);
    out[kv[1]] = v;
  }
  return out;
}

/** A record's state from the log and the drafts folder (O-2). */
export async function stateOf(dir: string, file: string) {
  const { confirmedIn } = await import("../engine/foundation.ts");
  if (existsSync(join(ventureFile(dir, "_drafts"), `${file.replace(/\//g, "__")}.draft`))) return "draft";
  const es = entries(dir).filter((e: { entity: string }) => e.entity === file);
  if (!es.length) return "unlogged";
  return confirmedIn(dir, file, null) ? "confirmed" : "agent";
}

/** The fields every record gets (O-3): id, created, updated and who wrote it last, from the provenance log, else the file. */
export function defaults(dir: string, file: string, id: string) {
  const es = entries(dir).filter((e: { entity: string }) => e.entity === file);
  if (es.length) {
    const last = es[es.length - 1];
    return { id, created: es[0].at, updated: last.at, by: { kind: last.agent?.kind ?? null, ...(last.agent?.id ? { id: last.agent.id } : {}), via: last.agent?.via ?? null }, activity: last.activity, writes: es.length, from: "provenance" };
  }
  const st = existsSync(ventureFile(dir, file)) ? statSync(ventureFile(dir, file)) : null;
  return { id, created: st ? new Date(st.birthtimeMs || st.mtimeMs).toISOString() : null, updated: st ? st.mtime.toISOString() : null, by: null, writes: 0, from: "file", note: "written outside the router: mentura baseline adopts it into the log" };
}

/** Counts derived from a record (O-2): the length of each top-level list. */
const countsOf = (v: unknown) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([, x]) => Array.isArray(x)).map(([k, x]) => [k, x.length])) : {};

/** The function owning a record and its owner (O-2), from the package that holds it and venture.json's functions. */
export async function ownerOf(dir: string, type: string | undefined) {
  const { packageOfRecord, packageDef } = await import("./package-routes.ts");
  const pkg = packageOfRecord(type);
  const def = pkg ? packageDef(pkg) : null;
  const fn = def?.function ?? def?.department ?? null;
  const v = load(join(dir, "venture.json"));
  const owner = fn ? v.functions?.[fn]?.owner ?? (!(v.members?.length) ? "the founder" : null) : null;
  return { package: pkg, function: fn, owner };
}

/** The metadata a read answers with (O-1, O-2, O-3). items maps each id to its venture-relative file. */
export async function metadataFor({ dir, r, route, params, result, items }: {
  dir: string; r: RouteEntry; route: string; params: { id?: string }; result: unknown; items: Record<string, string>;
}) {
  const v = load(join(dir, "venture.json"));
  const fn = await ownerOf(dir, r.record);
  const one = async (id: string, file: string, value: unknown) => ({
    ...defaults(dir, file, id),
    ...(file.endsWith(".md") || file.endsWith(".mdx") ? { frontmatter: frontmatter(value) } : isObj(value) && (value.title || value.name) ? { title: value.title ?? value.name } : {}),
    derived: { state: await stateOf(dir, file), counts: countsOf(value) },
  });
  const base = {
    venture: { id: v.id, name: v.name, phase: v.phase, status: v.status },
    record: { type: r.record, route, schema: r.schema ?? null, form: r.form },
    derived: { phase: v.phase, function: fn.function, owner: fn.owner, package: fn.package, by: "code" },
  };
  if (r.collection === "list") {
    const per: Record<string, unknown> = {};
    for (const [id, file] of Object.entries(items)) per[id] = await one(id, file, result == null ? undefined : (result as Obj)[id]);
    return { ...base, derived: { ...base.derived, count: Object.keys(per).length }, items: per };
  }
  const [id, file] = Object.entries(items)[0] ?? [];
  if (!file) return base;
  const own = await one(params.id ?? String(r.record), file, result);
  return { ...base, ...own, derived: { ...base.derived, ...own.derived } };
}

// One filter test: a field by dot path on the record, else a derived field.
function matches(value: unknown, meta: Meta | undefined, where: Obj): boolean {
  return Object.entries(where).every(([k, want]) => {
    let have = get(value ?? {}, k);
    if (have === undefined) have = ({ state: meta?.derived?.state, function: meta?.function, owner: meta?.owner, phase: meta?.phase } as Obj)[k];
    const wants = Array.isArray(want) ? want.map(String) : [String(want)];
    return Array.isArray(have) ? have.some((x) => wants.includes(String(typeof x === "object" ? (isObj(x) ? x.id ?? x.name : undefined) : x))) : have !== undefined && have !== null && wants.includes(String(have));
  });
}

/** Applies input.where to a read answer (L-10): a list keeps matching items; a record that does not match comes back null. */
export function filterRead(answer: ReadAnswer, where: unknown, r: RouteEntry): ReadAnswer {
  if (!isObj(where) || !Object.keys(where).length || answer.result == null) return answer;
  const result = answer.result as Obj;
  const md = (answer.metadata ?? {}) as Meta; // metadataFor's answer
  const shared = { function: md.derived?.function, owner: md.derived?.owner, phase: md.venture?.phase };
  if (r.collection === "list") {
    const keep = Object.keys(result).filter((id) => matches(result[id], { ...shared, derived: md.items?.[id]?.derived }, where));
    const pick = (o: unknown) => isObj(o) ? Object.fromEntries(Object.entries(o).filter(([id]) => keep.includes(id))) : o;
    return { ...answer, result: pick(answer.result), sources: pick(answer.sources), ...(md.items ? { metadata: { ...md, items: pick(md.items), derived: { ...md.derived, count: keep.length } } } : {}), filtered: { where, matched: keep.length, of: Object.keys(result).length } };
  }
  if (matches(answer.result, { ...shared, derived: md.derived }, where)) return { ...answer, filtered: { where, matched: 1, of: 1 } };
  return { ...answer, result: null, filtered_out: { where, note: "the record exists but does not match the filter" } };
}

const parseInstructions = (chain: Chained[]) => {
  const out: Record<string, string> = {};
  for (const f of chain) for (const line of f.text.split("\n")) { const m = line.match(/^([a-z][a-z0-9_-]*)\s*:\s*(.+)$/); if (m) out[m[1]] = m[2].trim(); }
  return out;
};

/**
 * The layout with params (L-9) and its group (P-36): the group's AGENTS.md after the venture root's,
 * then the item's own folders' AGENTS.md, nearest last; "[id]" in an instruction becomes the id.
 */
export function withParams(layout: Layout, { dir, params, file, group }: {
  dir: string | null; params?: { id?: string }; file?: string | null; group?: { agents?: string | null; [k: string]: unknown } | null;
}): Layout {
  const chain = [...(layout.chain ?? [])];
  const have = new Set(chain.map((c) => c.path));
  const add = (rel: string, at = chain.length) => { if (dir && !have.has(rel) && existsSync(ventureFile(dir, rel))) { chain.splice(at, 0, { path: rel, text: readFileSync(ventureFile(dir, rel), "utf8") }); have.add(rel); } };
  if (group?.agents) add(group.agents, chain.findIndex((c) => c.path === "AGENTS.md") + 1);
  if (file) {
    const parts = dirname(file).split("/").filter((p) => p && p !== ".");
    let acc = "";
    for (const p of parts) { acc = acc ? `${acc}/${p}` : p; add(`${acc}/AGENTS.md`); }
  }
  const instructions = parseInstructions(chain);
  if (params?.id) for (const k of Object.keys(instructions)) instructions[k] = instructions[k].replace(/\[id\]/g, params.id);
  return { ...layout, chain, instructions, params: params ?? {}, ...(group ? { group } : {}) };
}

/** The read's hierarchy (P-28), outermost first, and the level that answered. */
export function hierarchy({ answer, layout }: { answer: ReadAnswer; layout: Layout | null }) {
  const levels = [
    { level: "layout", holds: layout ? { chain: (layout.chain ?? []).map((c) => c.path), stack: layout.stack?.map((s) => s.name) } : null },
    { level: "template", holds: layout ? { need_now: layout.need_now ?? null, gate: layout.gate ?? null, note: "recomputed on every action" } : null },
    { level: "error", caught: !answer.ok || !!answer.errors, holds: !answer.ok ? { error: answer.error, fix: answer.fix ?? null } : answer.errors ?? null },
    { level: "loading", caught: !!(answer.pending_draft || answer.pending_pull_requests), holds: answer.pending_draft ?? answer.pending_pull_requests ?? null },
    { level: "not-found", caught: answer.ok && answer.result === null && !!answer.not_found, holds: answer.not_found ?? null },
    { level: "page", caught: answer.ok && answer.result !== null && answer.result !== undefined, holds: answer.ok && answer.result != null ? "the record" : null },
  ];
  return { levels, resolved_by: resolvedBy(answer) };
}

/** The level that answered a read (P-28): error, then loading, then not-found, then page. */
export function resolvedBy(answer: ReadAnswer): string {
  if (!answer.ok) return "error";
  if (answer.pending_draft || answer.pending_pull_requests) return "loading";
  if (answer.result === null && answer.not_found) return "not-found";
  if (answer.result === null && answer.filtered_out) return "page";
  return "page";
}
