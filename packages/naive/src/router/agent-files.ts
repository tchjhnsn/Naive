// The agent filesystem (EE-122): the six file operations deep agents work through (ls, read, write, edit, glob,
// grep), over Naive's router. A path is a route with a leading slash (/foundation/mission, /decisions/pricing),
// a folder is a route prefix or a collection, and a file's content is its record, as JSON. Every operation goes
// through call(), so a read meets team plan access and confidentiality, a write meets the schema, the gate,
// decision rights and provenance, and a gated agent write comes back as a draft for a person to accept. Each
// operation is a tool span (execute_tool naive_<op>) when the venture has traces on, with the router's call span
// under it. Nothing here imports LangChain: an app wraps these as a deepagents backend.
//
//   node packages/naive/src/router/agent-files.ts <venture> ls [<path>] | read <path> | glob <pattern> | grep <pattern> [<path>]
//   node packages/naive/src/router/agent-files.ts <venture> write <path> < record.json
//   node packages/naive/src/router/agent-files.ts <venture> edit <path> <old> <new> [--all]

import { readFileSync } from "node:fs";
import { call, glob as routeGlob, routes, ventureDir } from "./router.mjs";
import { withSpan } from "../core/instrumentation.mjs";

export interface Context { venture: string, workspace?: string, actor_id?: string, via?: string }
export interface FileInfo { path: string, is_dir: boolean, exists?: boolean }
export interface GrepMatch { path: string, line: number, text: string }
export interface WriteResult { ok: boolean, path: string, error?: string, draft?: boolean, written?: string, note?: string }
export interface EditResult extends WriteResult { occurrences?: number }

interface Route { route: string, kind: string, collection?: string, actions: string[] }
interface Reply { ok: boolean, result?: unknown, error?: string, not_found?: { note?: string }, pending_draft?: { file: string } }

const clean = (p: string): string => p.replace(/^\/+|\/+$/g, "");
const slash = (p: string): string => `/${clean(p)}`;
const records = (): Route[] => (routes() as Route[]).filter((r) => r.kind === "record" && r.actions.includes("read"));
const heads = (): string[] => records().filter((r) => r.route.endsWith("/[id]")).map((r) => r.route.slice(0, -"/[id]".length));
const singles = (): string[] => records().filter((r) => r.collection !== "list" && !r.route.includes("[")).map((r) => r.route);

async function route(ctx: Context, path: string, action: string, input?: unknown): Promise<Reply> {
  return await call({ venture: ctx.venture, workspace: ctx.workspace, actor_id: ctx.actor_id, via: ctx.via ?? "agent-files", route: clean(path), action, input }) as Reply;
}

/** Runs one operation as a tool span when the venture keeps traces. */
async function op<T>(ctx: Context, name: string, path: string, fn: () => Promise<T>): Promise<T> {
  const dir = ventureDir(ctx.venture, ctx.workspace) as string | null;
  if (!dir) return await fn();
  return await withSpan(dir, { name: `execute_tool naive_${name}`, kind: "tool", attributes: { "gen_ai.tool.name": `naive_${name}`, "naive.path": path } }, fn) as T;
}

/** The ids a collection holds now, read through the router. */
async function ids(ctx: Context, head: string): Promise<string[]> {
  const r = await route(ctx, head, "read");
  return r.ok && r.result && typeof r.result === "object" ? Object.keys(r.result) : [];
}

/** Whether a record is there now. */
async function exists(ctx: Context, path: string): Promise<boolean> {
  const r = await route(ctx, path, "read");
  return r.ok && r.result !== null && r.result !== undefined;
}

/** Every record that exists under a folder: single records, and each item of each collection. */
async function walk(ctx: Context, under = "/"): Promise<string[]> {
  const p = clean(under);
  const inside = (x: string) => !p || x === p || x.startsWith(`${p}/`);
  const out: string[] = [];
  for (const r of singles().filter(inside)) if (await exists(ctx, r)) out.push(slash(r));
  for (const h of heads().filter((x) => inside(x) || p.startsWith(`${x}/`) || p === x)) out.push(...(await ids(ctx, h)).map((id) => slash(`${h}/${id}`)).filter((f) => inside(clean(f))));
  return [...new Set(out)].sort();
}

/** The folders and files directly inside a path. A file is a record route; exists says whether it holds a record now. */
export function ls(ctx: Context, path = "/"): Promise<FileInfo[]> {
  return op(ctx, "ls", path, async () => {
    const p = clean(path);
    const under = (x: string) => !p ? x : x.startsWith(`${p}/`) ? x.slice(p.length + 1) : null;
    const seen = new Map<string, boolean>();
    for (const r of singles()) { const rest = under(r); if (rest) { const [first, ...more] = rest.split("/"); seen.set(first, seen.get(first) || more.length > 0); } }
    for (const h of heads()) {
      const rest = under(h);
      if (rest) seen.set(rest.split("/")[0], true);
      if (h === p) for (const id of await ids(ctx, h)) seen.set(id, seen.get(id) ?? false);
    }
    const out: FileInfo[] = [];
    for (const [name, is_dir] of [...seen].sort(([a], [b]) => a.localeCompare(b))) {
      const path = slash(p ? `${p}/${name}` : name);
      out.push(is_dir ? { path: `${path}/`, is_dir } : { path, is_dir, exists: await exists(ctx, path) });
    }
    return out;
  });
}

/** One record as text: JSON for a JSON record, the text itself otherwise. */
export function readRaw(ctx: Context, path: string): Promise<{ ok: boolean, content?: string, error?: string, pending_draft?: string }> {
  return op(ctx, "read", path, async () => {
    const r = await route(ctx, path, "read");
    if (!r.ok) return { ok: false, error: r.error ?? `cannot read ${slash(path)}` };
    if (r.result === null || r.result === undefined) return { ok: false, error: `${slash(path)}: ${r.not_found?.note ?? "no record yet"}` };
    const content = typeof r.result === "string" ? r.result : JSON.stringify(r.result, null, 2) + "\n";
    return { ok: true, content, ...(r.pending_draft ? { pending_draft: r.pending_draft.file } : {}) };
  });
}

/** One record with line numbers, from offset (0-based) for limit lines, as deep agents read files. */
export async function read(ctx: Context, path: string, offset = 0, limit = 2000): Promise<string> {
  const r = await readRaw(ctx, path);
  if (!r.ok || r.content === undefined) return `Error: ${r.error}`;
  const lines = r.content.replace(/\n$/, "").split("\n").slice(offset, offset + limit);
  return lines.map((l, i) => `${String(offset + i + 1).padStart(6)}\t${l}`).join("\n");
}

/** Writes a record (its JSON) through the router: the schema, the gate and provenance decide what happens. */
export function write(ctx: Context, path: string, content: string): Promise<WriteResult> {
  return op(ctx, "write", path, async () => {
    let input: unknown;
    try { input = JSON.parse(content); } catch { return { ok: false, path: slash(path), error: `${slash(path)} is a record: write its JSON` }; }
    const r = await route(ctx, path, "write", input);
    if (!r.ok) return { ok: false, path: slash(path), error: r.error ?? "not written" };
    const res = (r.result ?? {}) as { written?: string, draft?: boolean, note?: string };
    return { ok: true, path: slash(path), written: res.written, draft: !!res.draft, ...(res.note ? { note: res.note } : {}) };
  });
}

/** Replaces old with new in a record's JSON text (once, unless all), then writes it back through the router. */
export function edit(ctx: Context, path: string, oldText: string, newText: string, all = false): Promise<EditResult> {
  return op(ctx, "edit", path, async () => {
    const r = await readRaw(ctx, path);
    if (!r.ok || r.content === undefined) return { ok: false, path: slash(path), error: r.error };
    const occurrences = r.content.split(oldText).length - 1;
    if (!occurrences) return { ok: false, path: slash(path), error: `${slash(path)} does not contain the text to replace`, occurrences };
    if (occurrences > 1 && !all) return { ok: false, path: slash(path), error: `${slash(path)} contains the text ${occurrences} times: give more context, or replace all`, occurrences };
    const w = await write(ctx, path, all ? r.content.split(oldText).join(newText) : r.content.replace(oldText, () => newText));
    return { ...w, occurrences };
  });
}

/** The files whose path matches a glob (* within a segment, ** across them), under a folder. */
export function glob(ctx: Context, pattern: string, under = "/"): Promise<FileInfo[]> {
  return op(ctx, "glob", pattern, async () => {
    const re = routeGlob(clean(pattern)) as RegExp;
    return (await walk(ctx, under)).filter((f) => re.test(clean(f))).map((path) => ({ path, is_dir: false, exists: true }));
  });
}

/** Lines matching a regular expression in the records under a folder, optionally only files matching a glob. */
export function grep(ctx: Context, pattern: string, under = "/", only?: string): Promise<GrepMatch[] | string> {
  return op(ctx, "grep", pattern, async () => {
    let re: RegExp;
    try { re = new RegExp(pattern); } catch (e) { return `Error: ${(e as Error).message}`; }
    const filter = only ? routeGlob(clean(only)) as RegExp : null;
    const out: GrepMatch[] = [];
    for (const f of await walk(ctx, under)) {
      if (filter && !filter.test(clean(f)) && !filter.test(clean(f).split("/").at(-1) ?? "")) continue;
      const r = await readRaw(ctx, f);
      if (!r.ok || r.content === undefined) continue;
      r.content.split("\n").forEach((text, i) => { if (re.test(text)) out.push({ path: f, line: i + 1, text }); });
    }
    return out;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [venture, cmd, ...rest] = process.argv.slice(2);
  const ctx: Context = { venture: venture ?? "", via: "agent-files" };
  const show = (x: unknown) => console.log(typeof x === "string" ? x : JSON.stringify(x, null, 2));
  const fail = (x: { ok: boolean }) => { if (!x.ok) process.exitCode = 1; };
  if (!venture || !cmd) { console.error("usage: node packages/naive/src/router/agent-files.ts <venture> ls [<path>] | read <path> | write <path> | edit <path> <old> <new> [--all] | glob <pattern> | grep <pattern> [<path>]"); process.exit(2); }
  if (cmd === "ls") show(await ls(ctx, rest[0]));
  else if (cmd === "read") show(await read(ctx, rest[0]));
  else if (cmd === "write") { const w = await write(ctx, rest[0], readFileSync(0, "utf8")); show(w); fail(w); }
  else if (cmd === "edit") { const e = await edit(ctx, rest[0], rest[1], rest[2], rest.includes("--all")); show(e); fail(e); }
  else if (cmd === "glob") show(await glob(ctx, rest[0]));
  else if (cmd === "grep") show(await grep(ctx, rest[0], rest[1]));
  else { console.error(`unknown operation ${cmd}: ls, read, write, edit, glob or grep`); process.exit(2); }
}
