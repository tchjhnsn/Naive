// design-coverage: which design documents (domain, product, experience, interface, systems) exist for a scope, and which are missing.
// Registry: packages/naive/src/functions/capabilities/design-documents.registry.json
//
// Entity mode (normal use; reads the entity profile's `design-profile:` block):
//   node check.mjs --entity <vault entity folder> [--quick]
// Explicit mode:
//   node --env-file=<repo>/.env.local check.mjs --root <dir> [--root <dir> ...] [--include <regex>]
//        [--characteristics C-01,...] [--obligations O-01,...] [--entity-class business] [--layer domain|product|experience|interface|system|all] [--out <prefix>] [--quick]
//
// --quick: no model calls, no key, no cost. Finds candidate documents by filename, title, headings and frontmatter
//          type; reports `candidate` (something to check) or `null` (nothing found). For session start.
// deep (default): TypeSafe (Jev) judges, per registry question, whether the best candidates answer it.
//          Status: exists (>=80% answered) · partial (>=20%) · null · not_applicable (required_when not met) · not_started.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { join, basename, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { homedir } from "node:os";

const HERE = dirname(new URL(import.meta.url).pathname);
const REG = JSON.parse(readFileSync(join(HERE, "../../design-documents.registry.json"), "utf8"));
const MODEL = "jev-1.13.0";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes(k);
const home = (p) => p.replace(/^~(?=\/|$)/, homedir());
const tilde = (p) => p.replace(homedir(), "~");
const quick = flag("--quick");

// ---------- the design profile ----------
/**
 * @typedef {{ found: boolean, why?: string, entityClass?: string, name?: string, roots?: string[], include?: string,
 *   characteristics?: string[], obligations?: string[], [field: string]: string | string[] | boolean | undefined }} DesignProfile
 */
/** Reads `design-profile:` from an entity profile's frontmatter (a small, fixed shape; no YAML dependency). */
/** @returns {DesignProfile} */
export function readDesignProfile(entityDir) {
  const p = join(entityDir, "entity-profile.md");
  if (!existsSync(p)) return { found: false, why: "no entity-profile.md" };
  const t = readFileSync(p, "utf8");
  const fm = t.startsWith("---") ? t.slice(3, t.indexOf("\n---", 3)) : "";
  const entityClass = (fm.match(/^entity-class:\s*([\w-]+)/m) || [])[1];
  const name = (t.match(/^#\s+(.+)$/m) || [])[1] ?? basename(entityDir);
  const i = fm.search(/^design-profile:\s*(#.*)?$/m);
  if (i < 0) return { found: false, entityClass, name, why: "design-profile not declared in entity-profile.md" };
  const dp = {};
  for (const line of fm.slice(i).split("\n").slice(1)) {
    if (!/^\s{2,}\S/.test(line)) break;
    const m = line.match(/^\s+([\w-]+):\s*(.*)$/); if (!m) continue;
    let v = m[2].trim().replace(/\s+#.*$/, "");
    dp[m[1]] = v.startsWith("[") ? v.slice(1, -1).split(",").map((x) => x.trim().replace(/^["']|["']$/g, "")).filter(Boolean) : v.replace(/^["']|["']$/g, "");
  }
  return { found: true, entityClass, name, ...dp };
}

const entityDir = opt("--entity") ? resolve(home(opt("--entity"))) : null;
const profile = entityDir ? readDesignProfile(entityDir) : null;
const listArg = (k) => (opt(k, "") || "").split(",").filter(Boolean);
const roots = [
  ...(entityDir ? [entityDir] : []),
  ...((profile?.roots ?? []).map(home)),
  ...args.flatMap((a, i) => (a === "--root" ? [home(args[i + 1])] : [])),
].filter((r) => existsSync(r));
const includeSrc = opt("--include") ?? (profile?.include || null);
const include = includeSrc ? new RegExp(includeSrc) : null;
const chars = new Set(listArg("--characteristics").length ? listArg("--characteristics") : profile?.characteristics ?? []);
const obls = new Set(listArg("--obligations").length ? listArg("--obligations") : profile?.obligations ?? []);
const entityClass = opt("--entity-class") ?? profile?.entityClass ?? "";
const systemsDesign = profile?.["systems-design"] ?? (entityDir ? "not-started" : "active"); // active | not-started | n/a
// Experience and interface design apply to anything people use; they are active unless the profile says n/a (no human users)
// or not-started. Default active so their gaps are visible (SAD v3.0.14).
const layerState = { system: systemsDesign, experience: profile?.["experience-design"] ?? "active", interface: profile?.["interface-design"] ?? "active" };
const layer = opt("--layer", "all");
const outDefault = entityDir ? join(entityDir, "_meta", "design-coverage", quick ? "latest-quick" : "latest") : "design-coverage";
const out = opt("--out", outDefault);
if (!roots.length) { console.error("need --entity <dir> or --root <dir>"); process.exit(1); }
if (!quick && !process.env.TYPESAFE_API_KEY) { console.error("deep check needs TYPESAFE_API_KEY (run with --env-file), or use --quick"); process.exit(2); }

// ---------- collect documents ----------
function walk(d, top, acc = []) {
  for (const n of readdirSync(d)) {
    if (n.startsWith(".") || ["node_modules", "_archive", "dist", "build", ".next", "data", "_meta"].includes(n)) continue;
    const p = join(d, n); let s; try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) {
      // In entity mode, a nested child entity is its own scope.
      if (entityDir && p !== top && existsSync(join(p, "entity-profile.md")) && !include) continue;
      walk(p, top, acc);
    } else if (/\.(md|json|ya?ml)$/i.test(n) && s.size < 2_000_000 && (!include || include.test(p))) acc.push(p);
  }
  return acc;
}
const files = roots.flatMap((r) => walk(r, r)).map((p) => {
  const t = readFileSync(p, "utf8");
  const fm = t.startsWith("---") ? t.slice(3, t.indexOf("\n---", 3)) : "";
  const type = (fm.match(/^type:\s*(.+)$/m) || [])[1]?.trim() ?? "";
  const title = (t.match(/^#\s+(.+)$/m) || [])[1] ?? basename(p);
  const heads = [...t.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1]).join(" | ");
  return { path: p, type, title, heads, text: t };
});

function score(doc, f) {
  const hay = `${basename(f.path)} ${f.title} ${f.heads}`.toLowerCase();
  let s = 0;
  for (const t of doc.evidence.title_patterns) if (hay.includes(t.toLowerCase())) s += 2;
  if (doc.evidence.frontmatter_types.includes(f.type)) s += 1;
  if (new RegExp(`\\b${doc.id}\\b`, "i").test(`${f.title} ${f.heads}`)) s += 4; // a title or heading that names the id claims to answer it
  for (const g of doc.evidence.path_globs) { const re = new RegExp(g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "(.*/)?").replace(/\*/g, "[^/]*")); if (re.test(f.path)) s += 3; }
  for (const q of doc.questions) for (const w of q.text.toLowerCase().match(/[a-z]{6,}/g) || []) if (f.heads.toLowerCase().includes(w)) s += 0.2;
  return s;
}
// A candidate needs a strong signal: a title pattern in the name, title or headings, a heading naming the id, or a path match.
// A frontmatter type and shared question words alone matched unrelated documents (SAD v3.0.14 audit: 12 of 18 false).
function strong(doc, f) {
  const name = `${basename(f.path).replace(/[_-]+/g, " ")} ${f.title}`.toLowerCase(); // headings are too noisy for a strong signal
  if (doc.evidence.title_patterns.some((t) => name.includes(t.toLowerCase()))) return true;
  if (new RegExp(`\\b${doc.id}\\b`, "i").test(`${f.title} ${f.heads}`)) return true; // the id in the title or a heading
  return doc.evidence.path_globs.some((g) => new RegExp(g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "(.*/)?").replace(/\*/g, "[^/]*")).test(f.path));
}
function required(doc) {
  const st = layerState[doc.layer];
  if (st && st !== "active") return { ok: false, status: st === "n/a" ? "not_applicable" : "not_started", why: st === "n/a" ? `${doc.layer} design not applicable to this entity` : `${doc.layer} design not started (design-profile ${doc.layer}-design)` };
  const r = doc.required_when;
  if (r === "always" || !r.includes(":")) return { ok: true, why: r };
  const [k, v] = r.split(":"); const want = v.split("|");
  const have = k === "characteristics" ? chars : k === "obligations" ? obls : k === "entity-class" ? new Set([entityClass]) : new Set();
  return want.some((w) => have.has(w)) ? { ok: true, why: r } : { ok: false, status: "not_applicable", why: r };
}

// ---------- TypeSafe ----------
const cachePath = `${out.replace(/latest(-quick)?$/, "")}typesafe-cache.json`;
mkdirSync(dirname(out), { recursive: true });
const cache = !quick && existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
let tokens = 0;
async function ask(state, questions) {
  const k = createHash("sha256").update(JSON.stringify({ state, questions })).digest("hex");
  if (cache[k]) return cache[k];
  for (let a = 0; a < 5; a++) {
    const res = await fetch("https://api.typesafe.ai/v1/systemone", { method: "POST",
      headers: { authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, state, questions }), signal: AbortSignal.timeout(90000) });
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 2500 * (a + 1))); continue; }
    if (!res.ok) throw new Error(`TypeSafe ${res.status}`);
    const o = /** @type {{ usage?: { input_tokens?: number } }} */ (await res.json()); tokens += o.usage?.input_tokens ?? 0; cache[k] = o; return o;
  }
  throw new Error("retries exhausted");
}
function excerpt(f, doc) {
  const t = f.text; const keep = [f.title, f.heads];
  const words = [...doc.evidence.title_patterns, doc.id].map((w) => w.toLowerCase());
  for (const s of t.split(/\n(?=#{2,3}\s)/)) if (words.some((w) => s.slice(0, 200).toLowerCase().includes(w))) keep.push(s);
  keep.push(t.slice(0, 4000));
  return keep.join("\n\n").slice(0, 9000);
}

const docs = REG.documents.filter((d) => layer === "all" || d.layer === layer);
/** @typedef {{ id: string, name: string, layer: string, stage: string, status: string, reason?: string, answered?: number, total?: number, candidates: { path: string }[], [field: string]: unknown }} Result */
/** @type {Result[]} */
const results = [];
for (const doc of docs) {
  const base = { id: doc.id, name: doc.name, layer: doc.layer, stage: doc.stage };
  const req = required(doc);
  if (!req.ok) { results.push({ ...base, status: req.status, reason: req.why, candidates: [] }); continue; }
  const cands = files.map((f) => ({ f, s: score(doc, f) })).filter((x) => x.s >= 2 && strong(doc, x.f)).sort((a, b) => b.s - a.s).slice(0, 3);
  if (!cands.length) { results.push({ ...base, status: "null", answered: 0, total: doc.questions.length, unanswered: doc.questions.map((q) => q.text), candidates: [] }); continue; }
  if (quick) { results.push({ ...base, status: "candidate", total: doc.questions.length, candidates: cands.map(({ f, s }) => ({ path: tilde(f.path), match_score: +s.toFixed(1) })) }); continue; }
  const answered = new Array(doc.questions.length).fill(0); const per = [];
  for (const { f, s } of cands) {
    const r = await ask({ document_path: tilde(f.path), document_excerpt: excerpt(f, doc) },
      Object.fromEntries(doc.questions.map((q, i) => [`q${i}`, { type: "noul",
        instructions: `Does \`document_excerpt\` give a specific, written answer to this design question: "${q.text}"? A heading or a passing mention is not an answer.`,
        criteria: { true: "Yes, it answers it specifically", false: "No, or only vaguely" } }])));
    const vals = doc.questions.map((_, i) => r.answers[`q${i}`].noul);
    vals.forEach((v, i) => { answered[i] = Math.max(answered[i], v); });
    per.push({ path: tilde(f.path), match_score: +s.toFixed(1), answers: vals.map((v) => +v.toFixed(2)) });
  }
  const n = answered.filter((v) => v > 0.5).length, frac = n / doc.questions.length;
  results.push({ ...base, status: frac >= 0.8 ? "exists" : frac >= 0.2 ? "partial" : "null", answered: n, total: doc.questions.length,
    unanswered: doc.questions.filter((_, i) => answered[i] <= 0.5).map((q) => q.text), candidates: per });
}
if (!quick) writeFileSync(cachePath, JSON.stringify(cache));

const required_ = results.filter((r) => !["not_applicable", "not_started"].includes(r.status));
const gaps = required_.filter((r) => r.status !== "exists" && r.status !== "candidate");
const report = { generated: new Date().toISOString(), mode: quick ? "quick" : "deep", model: quick ? null : MODEL, registry: REG.version,
  entity: entityDir ? { path: tilde(entityDir), name: profile?.name, entityClass, designProfile: profile?.found ? "declared" : profile?.why, systemsDesign, experienceDesign: layerState.experience, interfaceDesign: layerState.interface } : null,
  roots: roots.map(tilde), include: include?.source ?? null, characteristics: [...chars], obligations: [...obls],
  tokens, usd: +((tokens / 1e6) * 0.042).toFixed(4),
  summary: Object.fromEntries(["exists", "partial", "candidate", "null", "not_started", "not_applicable"].map((s) => [s, results.filter((r) => r.status === s).length])),
  gaps: gaps.map((g) => `${g.id} ${g.name}: ${g.status}`), results };
writeFileSync(`${out}.json`, JSON.stringify(report, null, 1));
const sym = { exists: "✓", partial: "↺", null: "✗", candidate: "?", not_applicable: "N/A", not_started: "—" };
const md = [
  `# Design coverage${profile?.name ? `: ${profile.name}` : ""} (${report.generated.slice(0, 10)}, ${report.mode})`, "",
  ...(profile && !profile.found ? [`> **Gap: ${profile.why}.** Declare it (SAD v3.0.13) so the right documents are required; until then only documents required for every scope are checked.`, ""] : []),
  `Registry ${REG.version} · roots: ${report.roots.join(", ")}${report.include ? ` · include /${report.include}/` : ""} · entity-class: ${entityClass || "—"} · characteristics: ${[...chars].join(", ") || "none"} · obligations: ${[...obls].join(", ") || "none"} · systems: ${systemsDesign} · experience: ${layerState.experience} · interface: ${layerState.interface}${quick ? " · quick (no model calls; `?` = a candidate exists, run deep to judge it)" : ` · TypeSafe ${MODEL}, ≈$${report.usd}`}`, "",
  `**Summary:** ${Object.entries(report.summary).filter(([, v]) => v).map(([k, v]) => `${sym[k]} ${k} ${v}`).join(" · ")}`, "",
  "| ID | Document | Stage | Status | Answered | Best candidate |", "|---|---|---|---|---|---|",
  ...results.map((r) => `| ${r.id} | ${r.name} | ${r.stage} | ${sym[r.status]} ${r.status} | ${r.answered !== undefined && r.total ? `${r.answered}/${r.total}` : "—"} | ${r.candidates?.[0]?.path.split("/").pop() ?? (r.reason ?? "")} |`)];
writeFileSync(`${out}.md`, md.join("\n") + "\n");
console.log(JSON.stringify({ out: tilde(out), mode: report.mode, summary: report.summary, gaps: report.gaps.length, usd: report.usd }));
