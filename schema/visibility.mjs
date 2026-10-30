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
//   node schema/visibility.mjs <venture dir> <record path> [--json]   each field's visibility

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "./venture-paths.mjs";

export const LEVELS = ["public", "variant", "internal", "confidential"];
const load = (f) => JSON.parse(readFileSync(f, "utf8"));
export const hash = (v) => createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex");
const get = (o, path) => path.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);

/** The visibility sidecar of a venture-relative record path (foundation/problem.json), or {}. */
export function sidecar(dir, rel) {
  const f = ventureFile(dir, rel.replace(/\.json$/, ".visibility.json"));
  return existsSync(f) ? load(f).fields ?? {} : {};
}

/** One field's visibility now: its declared level, demoted to variant when the approved wording changed. */
export function visibilityOf(dir, rel, field) {
  const v = sidecar(dir, rel)[field];
  if (!v || !LEVELS.includes(v.visibility)) return { visibility: "internal", declared: null };
  if (v.visibility !== "public") return { visibility: v.visibility, declared: v.visibility, level: v.level ?? null };
  const f = ventureFile(dir, rel);
  const value = existsSync(f) ? get(load(f), field) : undefined;
  if (value === undefined) return { visibility: "internal", declared: "public", stale: "the field is missing" };
  if (v.sha256 !== hash(value)) return { visibility: "variant", declared: "public", stale: "the wording changed after it was approved as public" };
  return { visibility: "public", declared: "public", approved_by: v.approved_by ?? null };
}

/** The approved public variant of a field: an MDX file whose frontmatter has variant_of: <rel>#<field> and publish: true. */
export function variantOf(dir, rel, field, contentDirs = ["marketing/content", "operations/marketing/content"]) {
  for (const d of contentDirs) {
    const root = ventureFile(dir, d);
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root, { recursive: true }).map(String).filter((n) => n.endsWith(".mdx"))) {
      const text = readFileSync(join(root, name), "utf8");
      const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (!m) continue;
      const meta = Object.fromEntries(m[1].split("\n").map((l) => l.match(/^([a-z_]+):\s*(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.replace(/^["']|["']$/g, "").trim()]));
      if (meta.variant_of === `${rel}#${field}` && meta.publish === "true" && meta.approved_by) return { value: m[2].trim(), file: `${d}/${name}`, approved_by: meta.approved_by };
    }
  }
  return null;
}

/** What a public component may show for a field: its own wording when public, its approved variant when variant, else null. */
export function publicValue(dir, rel, field) {
  const v = visibilityOf(dir, rel, field);
  if (v.visibility === "public") return { value: get(load(ventureFile(dir, rel)), field), from: "field", approved_by: v.approved_by };
  if (v.visibility === "variant") { const x = variantOf(dir, rel, field); return x ? { value: x.value, from: x.file, approved_by: x.approved_by } : null; }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, rel] = process.argv.slice(2);
  if (!dir || !rel) { console.error("usage: node schema/visibility.mjs <venture dir> <record path> [--json]"); process.exit(2); }
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

export function confidentialityOf(dir, rel) {
  const f = ventureFile(dir, rel.replace(/\.(json|md|mdx)$/, ".visibility.json"));
  const r = existsSync(f) ? load(f).record : null;
  return r?.visibility === "confidential" ? { level: CONFIDENTIAL_LEVELS.includes(r.level) ? r.level : "C2", access: r.access ?? [] } : null;
}

/** Whether this actor may know the record exists. actor: "person" or "agent"; id: their person or role id. */
export function mayKnow(dir, rel, { actor = "agent", id } = {}) {
  const c = confidentialityOf(dir, rel);
  if (!c || c.level === "C1") return true;
  if (!id || !c.access.includes(id)) return false;
  return c.level !== "C4" || actor === "person";
}
