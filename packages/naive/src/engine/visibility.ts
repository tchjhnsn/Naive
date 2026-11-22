// Field visibility (publishing gate): whether a record's field may be published, and how.
//
//   public        the internal and public wording are the same: a public component may render the field
//   variant       publishable only through a separate public variant (an MDX file that names its source)
//   internal      never published (the default for every field)
//   confidential  above internal, known only to an access list; see `level` C1 to C4
//
// A record's visibility lives beside it: <record>.visibility.json, as
//   { "fields": { "statement": { "visibility": "public", "sha256": "<of the approved wording>", "approved_by": "Torian" } } }
// Approving a field as public pins its wording: when the field's value no longer hashes to the
// approved sha256, it is treated as variant until a person approves the new wording.
//
//   node packages/naive/src/engine/visibility.ts <venture dir> <record path> [--json]   each field's visibility

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { frontmatter } from "./publish-lint.ts";
import { ventureFile } from "../core/venture-paths.ts";

/** One field's entry in a record's visibility sidecar. */
export type SidecarField = { visibility?: string, level?: string, sha256?: string, approved_by?: string, approved_at?: string, proposed?: { visibility: string, sha256: string, by: string, at: string } };
/** A field's visibility now, and why when it differs from what was declared. */
export type Visibility = { visibility: string, declared: string | null, level?: string | null, stale?: string, approved_by?: string };

export const LEVELS = ["public", "variant", "internal", "confidential"];
const load = (f: string) => JSON.parse(readFileSync(f, "utf8"));
export const hash = (v: unknown) => createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex");
const get = (o: unknown, path: string) => path.split(".").reduce<unknown>((x, k) => (x == null ? undefined : (x as Record<string, unknown>)[k]), o);

/** The visibility sidecar of a venture-relative record path (foundation/problem.json), or {}. */
export function sidecar(dir: string, rel: string): Record<string, SidecarField> {
  const f = ventureFile(dir, rel.replace(/\.json$/, ".visibility.json"));
  return existsSync(f) ? load(f).fields ?? {} : {};
}

/** One field's visibility now: its declared level, demoted to variant when the approved wording changed. */
export function visibilityOf(dir: string, rel: string, field: string): Visibility {
  const v = sidecar(dir, rel)[field];
  if (!v || !LEVELS.includes(v.visibility ?? "")) return { visibility: "internal", declared: null };
  if (v.visibility !== "public") return { visibility: v.visibility ?? "internal", declared: v.visibility ?? null, level: v.level ?? null };
  const f = ventureFile(dir, rel);
  const value = existsSync(f) ? get(load(f), field) : undefined;
  if (value === undefined) return { visibility: "internal", declared: "public", stale: "the field is missing" };
  if (v.sha256 !== hash(value)) return { visibility: "variant", declared: "public", stale: "the wording changed after it was approved as public" };
  // Only a person sets public (a recorded two-way-door decision): no approver, or a role's id, is no approval.
  if (!isPerson(dir, v.approved_by)) return { visibility: "internal", declared: "public", stale: v.approved_by ? `${v.approved_by} is not a person in people/people.json: only a person approves a field as public` : "no person approved it as public" };
  return { visibility: "public", declared: "public", approved_by: v.approved_by };
}

/** Whether an approver id names a known person: an id or name in the venture's people/people.json. */
export function isPerson(dir: string, id: unknown) {
  if (!id || typeof id !== "string") return false;
  const f = ventureFile(dir, "people/people.json");
  if (!existsSync(f)) return false;
  try { return (load(f).people ?? []).some((p: { id?: string, name?: string }) => p.id === id || p.name === id); } catch { return false; }
}

/** A record as the public may see it: each top-level field that is public or has an approved variant. */
export function publicView(dir: string, rel: string, rec: unknown) {
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) return null;
  return Object.fromEntries(Object.keys(rec).map((k) => [k, publicValue(dir, rel, k)] as const).filter((e): e is readonly [string, NonNullable<ReturnType<typeof publicValue>>] => Boolean(e[1])).map(([k, v]) => [k, v.value]));
}

/**
 *  A person approves a field as public: pins its current wording by sha256 in the record's sidecar. An
 *  agent may only propose (proposed: "public"), which leaves the field as it was. Returns the sidecar entry.
 */
export function setPublic(dir: string, rel: string, field: string, { by, propose = false, agentId }: { by?: string, propose?: boolean, agentId?: string } = {}) {
  const f = ventureFile(dir, rel);
  if (!existsSync(f)) return { ok: false, error: `no record ${rel}` };
  const value = get(load(f), field);
  if (value === undefined) return { ok: false, error: `${rel} has no field ${field}` };
  const sf = ventureFile(dir, rel.replace(/\.json$/, ".visibility.json"));
  const side = existsSync(sf) ? load(sf) : {};
  const fields: Record<string, SidecarField> = side.fields ?? {};
  const at = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  if (propose) fields[field] = { ...(fields[field] ?? { visibility: "internal" }), proposed: { visibility: "public", sha256: hash(value), by: agentId ?? "agent", at } };
  else {
    if (!isPerson(dir, by)) return { ok: false, error: by ? `${by} is not a person in people/people.json: only a person approves a field as public; an agent proposes (--propose)` : "approving a field as public needs the person's name (--by)" };
    fields[field] = { visibility: "public", sha256: hash(value), approved_by: by, approved_at: at };
  }
  writeFileSync(sf, JSON.stringify({ ...side, fields }, null, 2) + "\n");
  return { ok: true, result: { record: rel, field, ...fields[field] } };
}

/** The approved public variant of a field: an MDX file whose frontmatter has variant_of: <rel>#<field> and publish: true. */
export function variantOf(dir: string, rel: string, field: string, contentDirs = ["marketing/content", "operations/marketing/content"]) {
  for (const d of contentDirs) {
    const root = ventureFile(dir, d);
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root, { recursive: true }).map(String).filter((n) => n.endsWith(".mdx"))) {
      const { meta, body } = frontmatter(readFileSync(join(root, name), "utf8"));
      const approved_by = [meta.approved_by].flat().find((p) => isPerson(dir, p));
      if (meta.variant_of === `${rel}#${field}` && meta.publish === true && approved_by) return { value: body.trim(), file: `${d}/${name}`, approved_by };
    }
  }
  return null;
}

/** What a public component may show for a field: its own wording when public, its approved variant when variant, else null. */
export function publicValue(dir: string, rel: string, field: string) {
  const v = visibilityOf(dir, rel, field);
  if (v.visibility === "public") return { value: get(load(ventureFile(dir, rel)), field), from: "field", approved_by: v.approved_by };
  if (v.visibility === "variant") { const x = variantOf(dir, rel, field); return x ? { value: x.value, from: x.file, approved_by: x.approved_by } : null; }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, rel] = process.argv.slice(2);
  if (!dir || !rel) { console.error("usage: node packages/naive/src/engine/visibility.ts <venture dir> <record path> [--json]"); process.exit(2); }
  const f = ventureFile(dir, rel);
  const fields = existsSync(f) ? Object.keys(load(f)) : [];
  const out = Object.fromEntries(fields.map((k) => [k, visibilityOf(dir, rel, k)]));
  console.log(process.argv.includes("--json") ? JSON.stringify(out, null, 2) : Object.entries(out).map(([k, v]) => `${k.padEnd(20)} ${v.visibility}${v.stale ? ` (${v.stale})` : ""}`).join("\n"));
}

// Confidentiality (above internal). A record's sidecar may say
//   { "record": { "visibility": "confidential", "level": "C3", "access": ["Torian", "cfo"] } }
// C1 restricted: internal, by role. C2 confidential and C3 secret: only ids in access may know the record
// exists. C4 founder-only: only a person in access, never an agent. Reads answer "no such record" to anyone
// else, so existence is not revealed.
export const CONFIDENTIAL_LEVELS = ["C1", "C2", "C3", "C4"];

export function confidentialityOf(dir: string, rel: string): { level: string, access: string[] } | null {
  // Only a record file has a sidecar; a log such as freshness.jsonl has none, and must not be read as one.
  if (!/\.(json|md|mdx)$/.test(rel) || /\.visibility\.json$/.test(rel)) return null;
  const f = ventureFile(dir, rel.replace(/\.(json|md|mdx)$/, ".visibility.json"));
  const r = existsSync(f) ? load(f).record : null;
  return r?.visibility === "confidential" ? { level: CONFIDENTIAL_LEVELS.includes(r.level) ? r.level : "C2", access: r.access ?? [] } : null;
}

/** Whether this actor may know the record exists. actor: "person" or "agent"; id: their person or role id. */
export function mayKnow(dir: string, rel: string, { actor = "agent", id }: { actor?: string, id?: string } = {}) {
  const c = confidentialityOf(dir, rel);
  if (!c || c.level === "C1") return true;
  if (!id || !c.access.includes(id)) return false;
  return c.level !== "C4" || actor === "person";
}
