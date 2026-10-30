// What a read answers besides the record (Next.js translation L-9, L-10, O-1, O-2, O-3, P-28). The
// router's wrapper (interface/writes.mjs) adds these to every read and layout. Code computes all of
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
import { entries } from "./provenance.mjs";
import { ventureFile } from "../schema/venture-paths.mjs";

const load = (f) => JSON.parse(readFileSync(f, "utf8"));
const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);

/** Simple YAML frontmatter: key: value lines between --- fences. Lists in [a, b] form become arrays. */
export function frontmatter(text) {
  const m = typeof text === "string" ? text.match(/^---\n([\s\S]*?)\n---\n?/) : null;
  if (!m) return null;
  const out = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean);
    out[kv[1]] = v;
  }
  return out;
}

/** A record's state from the log and the drafts folder (O-2). */
export async function stateOf(dir, file) {
  const { confirmedIn } = await import("../schema/foundation.mjs");
  if (existsSync(join(ventureFile(dir, "_drafts"), `${file.replace(/\//g, "__")}.draft`))) return "draft";
  const es = entries(dir).filter((e) => e.entity === file);
  if (!es.length) return "unlogged";
  return confirmedIn(dir, file, null) ? "confirmed" : "agent";
}

/** The fields every record gets (O-3): id, created, updated and who wrote it last, from the provenance log, else the file. */
export function defaults(dir, file, id) {
  const es = entries(dir).filter((e) => e.entity === file);
  if (es.length) {
    const last = es.at(-1);
    return { id, created: es[0].at, updated: last.at, by: { kind: last.agent?.kind ?? null, ...(last.agent?.id ? { id: last.agent.id } : {}), via: last.agent?.via ?? null }, activity: last.activity, writes: es.length, from: "provenance" };
  }
  const st = existsSync(ventureFile(dir, file)) ? statSync(ventureFile(dir, file)) : null;
  return { id, created: st ? new Date(st.birthtimeMs || st.mtimeMs).toISOString() : null, updated: st ? st.mtime.toISOString() : null, by: null, writes: 0, from: "file", note: "written outside the router: mentura baseline adopts it into the log" };
}

/** Counts derived from a record (O-2): the length of each top-level list. */
const countsOf = (v) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([, x]) => Array.isArray(x)).map(([k, x]) => [k, x.length])) : {};

/** The function owning a record and its owner (O-2), from the package that holds it and venture.json's functions. */
export async function ownerOf(dir, type) {
  const { packageOfRecord, packageDef } = await import("./package-routes.mjs");
  const pkg = packageOfRecord(type);
  const def = pkg ? packageDef(pkg) : null;
  const fn = def?.function ?? def?.department ?? null;
  const v = load(join(dir, "venture.json"));
  const owner = fn ? v.functions?.[fn]?.owner ?? (!(v.members?.length) ? "the founder" : null) : null;
  return { package: pkg, function: fn, owner };
}

/** The metadata a read answers with (O-1, O-2, O-3). items maps each id to its venture-relative file. */
export async function metadataFor({ dir, r, route, params, result, items }) {
  const v = load(join(dir, "venture.json"));
  const fn = await ownerOf(dir, r.record);
  const one = async (id, file, value) => ({
    ...defaults(dir, file, id),
    ...(file.endsWith(".md") || file.endsWith(".mdx") ? { frontmatter: frontmatter(value) } : value && typeof value === "object" && (value.title || value.name) ? { title: value.title ?? value.name } : {}),
    derived: { state: await stateOf(dir, file), counts: countsOf(value) },
  });
  const base = {
    venture: { id: v.id, name: v.name, phase: v.phase, status: v.status },
    record: { type: r.record, route, schema: r.schema ?? null, form: r.form },
    derived: { phase: v.phase, function: fn.function, owner: fn.owner, package: fn.package, by: "code" },
  };
  if (r.collection === "list") {
    const per = {};
    for (const [id, file] of Object.entries(items)) per[id] = await one(id, file, result?.[id]);
    return { ...base, derived: { ...base.derived, count: Object.keys(per).length }, items: per };
  }
  const [id, file] = Object.entries(items)[0] ?? [];
  if (!file) return base;
  const own = await one(params.id ?? r.record, file, result);
  return { ...base, ...own, derived: { ...base.derived, ...own.derived } };
}

// One filter test: a field by dot path on the record, else a derived field.
function matches(value, meta, where) {
  return Object.entries(where).every(([k, want]) => {
    let have = get(value ?? {}, k);
    if (have === undefined) have = { state: meta?.derived?.state, function: meta?.function, owner: meta?.owner, phase: meta?.phase }[k];
    const wants = Array.isArray(want) ? want.map(String) : [String(want)];
    return Array.isArray(have) ? have.some((x) => wants.includes(String(typeof x === "object" ? x?.id ?? x?.name : x))) : have !== undefined && have !== null && wants.includes(String(have));
  });
}

/** Applies input.where to a read answer (L-10): a list keeps matching items; a record that does not match comes back null. */
export function filterRead(answer, where, r) {
  if (!where || typeof where !== "object" || !Object.keys(where).length || answer.result == null) return answer;
  const md = answer.metadata ?? {};
  const shared = { function: md.derived?.function, owner: md.derived?.owner, phase: md.venture?.phase };
  if (r.collection === "list") {
    const keep = Object.keys(answer.result).filter((id) => matches(answer.result[id], { ...shared, derived: md.items?.[id]?.derived }, where));
    const pick = (o) => o ? Object.fromEntries(Object.entries(o).filter(([id]) => keep.includes(id))) : o;
    return { ...answer, result: pick(answer.result), sources: pick(answer.sources), ...(md.items ? { metadata: { ...md, items: pick(md.items), derived: { ...md.derived, count: keep.length } } } : {}), filtered: { where, matched: keep.length, of: Object.keys(answer.result).length } };
  }
  if (matches(answer.result, { ...shared, derived: md.derived }, where)) return { ...answer, filtered: { where, matched: 1, of: 1 } };
  return { ...answer, result: null, filtered_out: { where, note: "the record exists but does not match the filter" } };
}

const parseInstructions = (chain) => {
  const out = {};
  for (const f of chain) for (const line of f.text.split("\n")) { const m = line.match(/^([a-z][a-z0-9_-]*)\s*:\s*(.+)$/); if (m) out[m[1]] = m[2].trim(); }
  return out;
};

/**
 * The layout with params (L-9) and its group (P-36): the group's AGENTS.md after the venture root's,
 * then the item's own folders' AGENTS.md, nearest last; "[id]" in an instruction becomes the id.
 */
export function withParams(layout, { dir, params, file, group }) {
  const chain = [...(layout.chain ?? [])];
  const have = new Set(chain.map((c) => c.path));
  const add = (rel, at = chain.length) => { if (dir && !have.has(rel) && existsSync(ventureFile(dir, rel))) { chain.splice(at, 0, { path: rel, text: readFileSync(ventureFile(dir, rel), "utf8") }); have.add(rel); } };
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
export function hierarchy({ answer, layout }) {
  const levels = [
    { level: "layout", holds: layout ? { chain: layout.chain.map((c) => c.path), stack: layout.stack?.map((s) => s.name) } : null },
    { level: "template", holds: layout ? { need_now: layout.need_now ?? null, gate: layout.gate ?? null, note: "recomputed on every action" } : null },
    { level: "error", caught: !answer.ok || !!answer.errors, holds: !answer.ok ? { error: answer.error, fix: answer.fix ?? null } : answer.errors ?? null },
    { level: "loading", caught: !!(answer.pending_draft || answer.pending_pull_requests), holds: answer.pending_draft ?? answer.pending_pull_requests ?? null },
    { level: "not-found", caught: answer.ok && answer.result === null && !!answer.not_found, holds: answer.not_found ?? null },
    { level: "page", caught: answer.ok && answer.result !== null && answer.result !== undefined, holds: answer.ok && answer.result != null ? "the record" : null },
  ];
  return { levels, resolved_by: resolvedBy(answer) };
}

/** The level that answered a read (P-28): error, then loading, then not-found, then page. */
export function resolvedBy(answer) {
  if (!answer.ok) return "error";
  if (answer.pending_draft || answer.pending_pull_requests) return "loading";
  if (answer.result === null && answer.not_found) return "not-found";
  if (answer.result === null && answer.filtered_out) return "page";
  return "page";
}
