// A raw source write (EE-192): { source, text } becomes source.json and text.md.
// Create-only and a duplicate text are path and sha256 checks. The host policy is judgeSource.

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import { schemaFailure, logWrite as prov } from "./write-effects.ts";
import type { SourceJudgment } from "../terms/sources.ts";
import type { EntryAgent } from "../core/provenance.ts";

type Obj = Record<string, unknown>;
const isRecord = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

const nullableString = (value: unknown, name: string): { ok: true; value: string | null } | { ok: false; error: string } => {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: `${name} is a string or null` };
  return { ok: true, value };
};

/** Other sources in this venture that already name a sha256. */
export function sourceHashes(dir: string, id: string): { id: string; sha256: string }[] {
  const root = ventureFile(dir, "raw/sources");
  if (!existsSync(root)) return [];
  const out: { id: string; sha256: string }[] = [];
  for (const name of readdirSync(root)) {
    if (name === id || name.startsWith(".")) continue;
    const file = join(root, name, "source.json");
    if (!existsSync(file)) continue;
    try {
      const rec = JSON.parse(readFileSync(file, "utf8")) as Obj;
      if (typeof rec.sha256 === "string") out.push({ id: name, sha256: rec.sha256 });
    } catch { /* a source that does not parse is not a duplicate */ }
  }
  return out;
}

export function sourceOccupied(dir: string, sourceFile: string, textFile: string): boolean {
  return existsSync(ventureFile(dir, sourceFile)) || existsSync(ventureFile(dir, textFile));
}

type Plan = { ok: true; record: Obj; text: string; sha256: string } | { ok: false; error: string };

/** The record the router will write, or why it will not. Writes nothing. */
export function planRawSource(id: string, input: unknown, existing: { id: string; sha256: string }[], judge: (input: { url: string | null; archiveOf: string | null; loggedIn: boolean }) => SourceJudgment): Plan {
  if (!isRecord(input) || !isRecord(input.source) || typeof input.text !== "string") return { ok: false, error: "write needs { source, text }" };
  if ("logged_in" in input && typeof input.logged_in !== "boolean") return { ok: false, error: "logged_in is true or false" };
  const source = input.source;
  if (source.id !== undefined && source.id !== id) return { ok: false, error: `the source id is ${String(source.id)}, but the route is raw/sources/${id}` };
  if (typeof source.origin !== "string" || source.origin === "") return { ok: false, error: "a source needs an origin" };
  const url = nullableString(source.url, "url");
  if (url.ok === false) return { ok: false, error: url.error };
  const archive = nullableString(source.archive_of, "archive_of");
  if (archive.ok === false) return { ok: false, error: archive.error };
  if (url.value !== null && !/^[a-z][a-z0-9+.-]*:/i.test(url.value)) return { ok: false, error: "url is not a URL" };
  if (archive.value !== null && !/^[a-z][a-z0-9+.-]*:/i.test(archive.value)) return { ok: false, error: "archive_of is not a URL" };
  try { if (url.value !== null) new URL(url.value); } catch { return { ok: false, error: "url is not a URL" }; }
  try { if (archive.value !== null) new URL(archive.value); } catch { return { ok: false, error: "archive_of is not a URL" }; }
  if (source.title !== undefined && typeof source.title !== "string") return { ok: false, error: "title is a string" };
  if (source.fetched !== undefined && typeof source.fetched !== "string") return { ok: false, error: "fetched is a date" };
  const fetchedAt = nullableString(source.fetched_at, "fetched_at");
  if (fetchedAt.ok === false) return { ok: false, error: fetchedAt.error };
  if (source.http_status !== undefined && source.http_status !== null && !Number.isInteger(source.http_status)) return { ok: false, error: "http_status is an integer or null" };
  if (source.self_reported !== undefined && source.self_reported !== null && typeof source.self_reported !== "boolean") return { ok: false, error: "self_reported is true, false or null" };
  const judged = judge({ url: url.value, archiveOf: archive.value, loggedIn: input.logged_in === true });
  if (judged.verdict === "refused") return { ok: false, error: `this source is not an allowed source (${judged.result.failed.join(", ")})` };
  const hash = sha256(input.text);
  const prior = existing.find((s) => s.sha256 === hash);
  if (prior) return { ok: false, error: `raw/sources/${prior.id} already holds this text` };
  const record: Obj = {
    id, origin: source.origin,
    ...(typeof source.title === "string" ? { title: source.title } : {}),
    ...(typeof source.fetched === "string" ? { fetched: source.fetched } : {}),
    fetched_at: fetchedAt.value,
    url: url.value,
    archive_of: archive.value,
    http_status: source.http_status === undefined ? null : source.http_status,
    sha256: hash,
    self_reported: source.self_reported === undefined ? null : source.self_reported,
  };
  return { ok: true, record, text: input.text, sha256: hash };
}

type Store = { writes: string; write: (path: string, content: string) => Promise<unknown> };

/** Writes source.json and text.md, then one provenance line. A refusal writes nothing. */
export async function commitRawSource({ dir, id, route, input, store, sourceFile, agent, note, schemaName }: {
  dir: string; id: string; route: string; input: unknown; store: Store; sourceFile: string;
  agent: EntryAgent; note?: string; schemaName: string;
}): Promise<{ ok: true; result: { written: string; provenance: string; sha256: string; note: string } } | { ok: false; error: string }> {
  const textFile = sourceFile.replace(/source\.json$/, "text.md");
  if (sourceOccupied(dir, sourceFile, textFile)) return { ok: false, error: `${route} is raw and immutable: add a new capture, do not edit this one` };
  const { judgeSource } = await import("../terms/sources.ts");
  const planned = planRawSource(id, input, sourceHashes(dir, id), judgeSource);
  if (planned.ok === false) return { ok: false, error: planned.error };
  const recordText = JSON.stringify(planned.record, null, 2) + "\n";
  const failed = schemaFailure(schemaName, JSON.parse(recordText) as unknown);
  if (failed !== null) return { ok: false, error: `does not match ${schemaName}:\n${failed}` };
  if (store.writes === "none") return { ok: false, error: `${route} is read-only` };
  try { await store.write(textFile, planned.text); }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
  try { await store.write(sourceFile, recordText); }
  catch (e) {
    try { unlinkSync(ventureFile(dir, textFile)); } catch { /* the text file is the leftover of a failed write */ }
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const entry = prov(dir, { entity: sourceFile, route, activity: "write", agent, note: note ?? "raw source and its text", derived_from: [textFile] });
  return { ok: true, result: { written: sourceFile, provenance: entry.hash, sha256: planned.sha256, note: "written" } };
}
