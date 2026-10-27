// Publishing gate for the Everything Ecosystem public site (phase 2, SD-14).
// Systems design: everything-ecosystem/methodology/EVERYTHING_ECOSYSTEM_SYSTEMS_DESIGN_PHASE2_2026-10-11.md
//
// A file is published only if (a) the manifest's allowlist matches it and (b) no refusal rule fires.
// Refusal rules:
//   R1 outside the repository: an absolute path, a path through .., or a link that resolves outside the root.
//      Inside the root, publish.json's allowlist decides (R1 changed 2026-10-27, founder-approved: the method
//      moved from a vault folder into its own repository, so the old everything-ecosystem/ prefix no longer applies)
//   R2 ip-sensitivity: high, or under an _archive/ folder
//   R3 publish: absent or not true
//   R4 an assignment without visibility: public
//   R5 a raw capture (type raw-source or conversation-log)
//   R6 the text names a term the manifest lists as private (private-terms), e.g. an entity with no public presence
//   R7 the text names one of the owner's own use cases (use-case-terms); the site stands alone (decided 2026-10-11)
// The run fails if a published file embeds (![[...]]) a file that is not published.
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync, rmSync, realpathSync } from "node:fs";
import { join, relative, basename, dirname as dirOf, isAbsolute, sep } from "node:path";

// Glob to regex: `**/` matches zero or more folders, `**` anything, `*` anything within one path segment.
const esc = (x) => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
const seg = (p) => p.split("*").map(esc).join("[^/]*");
const globRe = (g) => new RegExp("^" + g.split("**/").map((part) => part.split("**").map(seg).join(".*")).join("(?:.*/)?") + "$");

function walk(dir, root, out = []) {
  for (const f of readdirSync(dir)) {
    if (f.startsWith(".") || f === "node_modules") continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, root, out);
    else if (f.endsWith(".md")) out.push(relative(root, p));
  }
  return out;
}

/** Decides what may be published. `vault` is the repository root; paths in the manifest are relative to it. */
export function plan(vault, manifest, parseFrontmatter) {
  const include = (manifest.include ?? []).map(globRe), exclude = (manifest.exclude ?? []).map(globRe);
  const explicit = new Set((manifest.include ?? []).filter((g) => !g.includes("*")));
  // Walk only the folders the allowlist points at; a file that escapes the root is listed as refused (R1),
  // visible in the report, rather than silently skipped.
  const bases = new Set((manifest.include ?? []).filter((g) => g.includes("*")).map((g) => g.slice(0, g.indexOf("*")).replace(/\/[^/]*$/, "")));
  const files = [...bases].filter((b) => existsSync(join(vault, b))).flatMap((b) => walk(join(vault, b), vault));
  const candidates = new Set([...files, ...[...explicit].filter((f) => existsSync(join(vault, f)))]);
  const realRoot = realpathSync(vault);
  const outside = (f) => isAbsolute(f) || f.split(/[\\/]/).includes("..") || !(realpathSync(join(vault, f)) + sep).startsWith(realRoot + sep);
  const published = [], refused = [];
  for (const file of [...candidates].sort()) {
    if (!include.some((r) => r.test(file)) || exclude.some((r) => r.test(file))) continue;
    const why = [];
    if (outside(file)) { refused.push({ file, why: ["R1 outside the repository"] }); continue; }
    let fm = {};
    try { fm = parseFrontmatter(readFileSync(join(vault, file), "utf8")); } catch { why.push("no readable frontmatter"); }
    if (fm["ip-sensitivity"] === "high" || /(^|\/)_archive\//.test(file)) why.push("R2 archived or ip-sensitivity high");
    if (fm.publish !== true) why.push("R3 publish: true not set");
    if (fm.type === "methodology-assignment" && fm.visibility !== "public") why.push("R4 assignment not visibility: public");
    if (["raw-source", "conversation-log"].includes(fm.type)) why.push("R5 raw capture");
    const text = existsSync(join(vault, file)) ? readFileSync(join(vault, file), "utf8").toLowerCase() : "";
    const hits = (manifest["private-terms"] ?? []).filter((t) => text.includes(String(t).toLowerCase()));
    if (hits.length) why.push(`R6 names private term(s): ${hits.join(", ")}`);
    // Evidence ids are redacted to a count by the writer, so the evidence line is not checked here.
    const raw = (existsSync(join(vault, file)) ? readFileSync(join(vault, file), "utf8") : "").replace(/^evidence:.*$/m, "");
    const uses = (manifest["use-case-terms"] ?? []).filter((t) => raw.includes(String(t)));
    if (uses.length) why.push(`R7 refers to a use case: ${uses.join(", ")}`);
    (why.length ? refused : published).push(why.length ? { file, why } : { file, data: fm });
  }
  // Embeds of unpublished files fail the run (a private note must not be pulled in by transclusion).
  const pubNames = new Set(published.map((p) => basename(p.file, ".md")));
  const errors = [];
  for (const p of published) {
    const text = readFileSync(join(vault, p.file), "utf8");
    for (const m of text.matchAll(/!\[\[([^\]|#]+)/g)) {
      const target = basename(m[1].trim(), ".md");
      if (!pubNames.has(target)) errors.push({ file: p.file, msg: `embeds unpublished note '${target}'` });
    }
  }
  return { ok: errors.length === 0, published, refused, errors };
}

/** Wikilinks to published notes become site links; others become plain text (W4). */
export function rewriteLinks(text, pubPaths) {
  const byName = new Map(pubPaths.map((f) => [basename(f, ".md"), "/" + f.replace(/^everything-ecosystem\//, "").replace(/\.md$/, "/").toLowerCase()]));
  return text.replace(/(!?)\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, bang, target, anchor, label) => {
    const name = basename(target.trim(), ".md"), shown = label ?? name, url = byName.get(name);
    if (bang) return url ? `[${shown}](${url})` : "";
    return url ? `[${shown}](${url}${anchor ? anchor.toLowerCase().replace(/[^a-z0-9#-]+/g, "-") : ""})` : shown;
  });
}

export function report(res) {
  const lines = [`# Publish report`, "", `${res.published.length} published · ${res.refused.length} refused · ${res.errors.length} error(s)`, ""];
  if (res.errors.length) lines.push("## Errors (run fails)", "", ...res.errors.map((e) => `- ${e.file}: ${e.msg}`), "");
  lines.push("## Published", "", ...res.published.map((p) => `- ${p.file}`), "", "## Refused", "", ...res.refused.map((r) => `- ${r.file}: ${r.why.join("; ")}`));
  return lines.join("\n");
}

// ---------- writer (slice 3) ----------
const STRIP = ["public-edition-of", "ratified-by", "recommendation-ref", "publish", "governed-by", "lineage-from", "related", "ledger-ref"];
/** Writes published files into <out>/src/content/docs/, redacted (SD-07). Returns what changed. */
export function write(vault, res, out, parse) {
  const dest = join(out, "src/content/docs");
  const ledgerPath = join(out, "src/content/.generated.json");
  const before = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, "utf8")) : [];
  const pubPaths = res.published.map((p) => p.file);
  const publicAssignments = new Set(res.published.filter((p) => p.data.type === "methodology-assignment").map((p) => p.data.id ?? basename(p.file).match(/^A-\d{3}/)?.[0]));
  const now = [];
  for (const p of res.published) {
    const raw = readFileSync(join(vault, p.file), "utf8");
    const fm = { ...parse(raw) };
    for (const k of STRIP) delete fm[k];
    if (Array.isArray(fm.evidence)) {
      const priv = fm.evidence.filter((a) => !publicAssignments.has(a));
      fm.evidence = fm.evidence.filter((a) => publicAssignments.has(a));
      if (priv.length) fm["evidence-private-count"] = priv.length;
    }
    if (fm.type === "methodology-assignment" && fm.status && fm.status !== "proposed") fm["ratified-by"] = "the founder";
    fm["source-path"] = p.file.replace(/^everything-ecosystem\//, "");
    const body = rewriteLinks(raw.slice(raw.indexOf("\n---", 3) + 4), pubPaths);
    const rel = p.file.replace(/^everything-ecosystem\//, "");
    mkdirSync(dirOf(join(dest, rel)), { recursive: true });
    writeFileSync(join(dest, rel), `---\n${JSON.stringify(fm, null, 2)}\n---\n${body}`);
    now.push(rel);
  }
  const removed = before.filter((f) => !now.includes(f));
  for (const f of removed) rmSync(join(dest, f), { force: true });
  writeFileSync(ledgerPath, JSON.stringify(now.sort(), null, 2));
  // The public report lists only what went public; refusals name private files and stay in the vault (privateReport).
  const removedMd = `\n\n## Removed since last export\n\n${removed.map((f) => `- ${f}`).join("\n") || "_None._"}\n`;
  writeFileSync(join(out, "publish-report.md"), `# Publish report\n\n${now.length} page(s) published.\n\n## Published\n\n${now.map((f) => `- ${f}`).join("\n")}${removedMd}`);
  return { written: now.length, removed, privateReport: report(res) + removedMd };
}
