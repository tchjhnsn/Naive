#!/usr/bin/env node
// The public gate for marketing content (EE-064): marketing records are public variants of internal
// records, written by marketing agents as their own MDX, never internal records published as they are.
// Every file in operations/marketing/content/ must name the internal record it is a variant of, the
// audience it is for, and whether it is published; a published file must name the person who approved
// it (EE-025). And it must not copy the internal record: any run of ten words shared with it is a leak,
// unless the run is a public field (the venture's name and tagline, a product's name).
//
//   node operations/marketing/check-public.mjs <venture> [--json]

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ventureFile } from "../../schema/venture-paths.mjs";

export const CONTENT = "operations/marketing/content";
const RUN = 10;
const words = (s) => s.toLowerCase().replace(/<[^>]+>/g, " ").match(/[a-z0-9$%']+/g) ?? [];
const runs = (s) => { const w = words(s), out = new Set(); for (let i = 0; i + RUN <= w.length; i++) out.add(w.slice(i, i + RUN).join(" ")); return out; };
const strings = (x) => typeof x === "string" ? [x] : Array.isArray(x) ? x.flatMap(strings) : x && typeof x === "object" ? Object.values(x).flatMap(strings) : [];

export function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = Object.fromEntries(m[1].split("\n").map((l) => l.match(/^([a-z_]+):\s*(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.replace(/^["']|["']$/g, "").trim()]));
  if (meta.publish) meta.publish = meta.publish === "true";
  return { meta, body: m[2] };
}

function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => statSync(ventureFile(dir, f)).isDirectory() ? files(ventureFile(dir, f)) : f.endsWith(".mdx") ? [ventureFile(dir, f)] : []);
}

export function check(dir) {
  const venture = existsSync(join(dir, "venture.json")) ? JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")) : {};
  const publicText = [venture.name, venture.brand?.tagline].filter(Boolean);
  const pdir = join(ventureFile(dir, "products"));
  if (existsSync(pdir)) for (const f of readdirSync(pdir).filter((f) => f.endsWith(".json"))) publicText.push(JSON.parse(readFileSync(join(pdir, f), "utf8")).name ?? "");
  const allowed = new Set(publicText.flatMap((t) => [...runs(t)]));
  const results = files(ventureFile(dir, CONTENT)).map((f) => {
    const rel = relative(dir, f), { meta, body } = frontmatter(readFileSync(f, "utf8")), errors = [];
    // variant_of names a record (foundation/problem.json) or one field of it (foundation/problem.json#statement,
    // the form schema/visibility.mjs variantOf reads); a field narrows the copy check to that field's text.
    const [srcRel, field] = (meta.variant_of ?? "").split("#");
    if (!meta.variant_of) errors.push("names no internal record (variant_of): marketing content is a variant of an internal record");
    else if (!existsSync(ventureFile(dir, srcRel))) errors.push(`variant_of ${meta.variant_of} does not exist`);
    if (!meta.audience) errors.push("names no audience");
    if (meta.publish === undefined) errors.push("does not say whether it is published (publish: true or false)");
    if (meta.publish === true && !meta.approved_by) errors.push("is published without a person's approval (approved_by, EE-025)");
    if (meta.variant_of && existsSync(ventureFile(dir, srcRel))) {
      const src = ventureFile(dir, srcRel);
      const raw = readFileSync(src, "utf8");
      const record = src.endsWith(".json") ? JSON.parse(raw) : raw;
      const text = field && typeof record === "object" ? field.split(".").reduce((x, k) => (x == null ? undefined : x[k]), record) : record;
      if (field && text === undefined) errors.push(`variant_of ${meta.variant_of}: the record has no field ${field}`);
      const internal = new Set(strings(text ?? "").flatMap((s) => [...runs(s)]));
      const leaks = [...runs(body)].filter((r) => internal.has(r) && !allowed.has(r));
      if (leaks.length) errors.push(`copies ${leaks.length} run(s) of ${RUN} words from ${meta.variant_of}, such as "${leaks[0]}": write the public variant in its own words`);
    }
    return { file: rel, publish: meta.publish ?? null, errors };
  });
  return { venture: venture.id ?? null, files: results.length, errors: results.filter((r) => r.errors.length), results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node operations/marketing/check-public.mjs <venture> [--json]"); process.exit(2); }
  const r = check(dir);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`${r.files} marketing content file(s); ${r.errors.length} blocked at the public gate`);
    for (const x of r.errors) for (const e of x.errors) console.log(`  ${x.file}: ${e}`);
  }
  process.exit(r.errors.length ? 1 : 0);
}
