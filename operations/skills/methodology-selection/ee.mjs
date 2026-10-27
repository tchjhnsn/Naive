// ee: the Everything Ecosystem methodology catalog, artifact catalog and assignment register.
// Systems design: everything-ecosystem/methodology/EVERYTHING_ECOSYSTEM_SYSTEMS_DESIGN_PHASE1_2026-10-10.md
//
//   node ee.mjs validate [--root <everything-ecosystem dir>] [--previous <dir>] [--json]
//   node ee.mjs list     [--kind methodology|artifact-type|question|assignment] [--domain software] [--family spec-driven] [--lifecycle listed] [--json]
//   node ee.mjs report   [--stale-days 180] [--json]   assumed-heavy entries, research triggers, stale entries, assignments without evidence
//   node --env-file=<repo>/.env.local ee.mjs recommend --system <system file> [--repeat 3] [--json]
//        TypeSafe judges each listed methodology against the system's M1-M12 answers; saves inputs and output
//        under register/_recommendations/ (SD-17). Prints the ranking and research triggers.
//   node ee.mjs propose --from <recommendation .json> [--methodology a,b,c]
//        Writes register/A-NNN-<slug>.md with status: proposed. It never writes a ratified assignment (I2).
//   node ee.mjs evidence A-NNN --title "..." --note "..." [--source "..."] [--methodology a,b] [--tested tdd:M7,spec-as-source:M2]
//        Appends a dated block under '## Evidence' in the assignment (append-only, I6). Adds the assignment to each
//        methodology's evidence list and moves listed -> evidenced. --tested marks catalog answers as tested (DD-06).
//   node ee.mjs publish --dry-run | --out <site folder>   gate, then write redacted pages (phase 2, SD-14, SD-07)
//   node ee.mjs index    [--root <dir>]   writes catalog/INDEX.md and register/INDEX.md (generated; never hand-edit)
//
// --root      defaults to the everything-ecosystem folder this script lives in.
// --previous  a copy of the tree to compare against for lifecycle and ratified-assignment checks.
//             Defaults to the last git commit (HEAD). Used by the fixture tests.
// Slices 1-5 implement validate, index, list, report, recommend, propose and evidence. list, report, recommend, propose and evidence follow in later slices.
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";

const HERE = dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes(k);

// ---------- frontmatter (a fixed YAML subset; no dependency) ----------
// Supports: `key: scalar`, `key: [a, b]`, `key: { k: v }`, and under a bare `key:` either
// indented `- item` lines or indented `k: v` lines (one level; values may be flow maps or lists).
function scalar(v) {
  v = v.trim();
  if (v === "") return "";
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (/^-?\d+$/.test(v)) return Number(v);
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}
function splitTop(s) {
  const out = []; let depth = 0, q = null, cur = "";
  for (const c of s) {
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === "[" || c === "{") depth++;
    if (c === "]" || c === "}") depth--;
    if (c === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim() !== "") out.push(cur);
  return out;
}
function value(v) {
  v = v.trim();
  if (v.startsWith("[") && v.endsWith("]")) return splitTop(v.slice(1, -1)).map(value);
  if (v.startsWith("{") && v.endsWith("}")) {
    const o = {};
    for (const part of splitTop(v.slice(1, -1))) {
      const i = part.indexOf(":");
      if (i < 0) throw new Error(`bad flow map entry: ${part}`);
      o[part.slice(0, i).trim()] = value(part.slice(i + 1));
    }
    return o;
  }
  return scalar(v);
}
export function parseFrontmatter(text) {
  if (!text.startsWith("---")) throw new Error("no frontmatter");
  const end = text.indexOf("\n---", 3);
  if (end < 0) throw new Error("frontmatter not closed");
  const lines = text.slice(3, end).split("\n");
  const o = {}; let key = null;
  lines.forEach((raw, n) => {
    const line = raw.replace(/\s+#.*$/, "");
    if (line.trim() === "") return;
    const ln = n + 2;
    if (!/^\s/.test(line)) {
      const m = line.match(/^([\w-]+):\s?(.*)$/);
      if (!m) throw new Error(`line ${ln}: expected 'key: value'`);
      key = m[1];
      o[key] = m[2].trim() === "" ? null : value(m[2]);
      return;
    }
    if (!key) throw new Error(`line ${ln}: indented line with no key`);
    const t = line.trim();
    if (t.startsWith("- ")) {
      if (o[key] === null) o[key] = [];
      if (!Array.isArray(o[key])) throw new Error(`line ${ln}: list item under a non-list key`);
      o[key].push(value(t.slice(2)));
      return;
    }
    const m = t.match(/^([\w-]+):\s?(.*)$/);
    if (!m) throw new Error(`line ${ln}: unsupported YAML`);
    if (o[key] === null) o[key] = {};
    if (typeof o[key] !== "object" || Array.isArray(o[key])) throw new Error(`line ${ln}: map entry under a non-map key`);
    o[key][m[1]] = value(m[2]);
  });
  for (const k of Object.keys(o)) if (o[k] === null) o[k] = "";
  return o;
}

// ---------- schema (the JSON Schema subset the catalog schemas use) ----------
function check(schema, v, path, errs) {
  if (schema.enum && !schema.enum.includes(v)) { errs.push(`${path}: must be one of ${schema.enum.join(", ")} (got ${JSON.stringify(v)})`); return; }
  const t = schema.type;
  if (t === "string" && typeof v !== "string") { errs.push(`${path}: must be a string`); return; }
  if (t === "integer" && !Number.isInteger(v)) { errs.push(`${path}: must be an integer`); return; }
  if (t === "array" && !Array.isArray(v)) { errs.push(`${path}: must be a list`); return; }
  if (t === "object" && (typeof v !== "object" || v === null || Array.isArray(v))) { errs.push(`${path}: must be a map`); return; }
  if (schema.pattern && typeof v === "string" && !new RegExp(schema.pattern).test(v)) errs.push(`${path}: does not match ${schema.pattern}`);
  if (schema.pattern && typeof v !== "string" && !new RegExp(schema.pattern).test(String(v))) errs.push(`${path}: does not match ${schema.pattern}`);
  if (Array.isArray(v)) {
    if (schema.minItems && v.length < schema.minItems) errs.push(`${path}: needs at least ${schema.minItems} item(s)`);
    if (schema.items) v.forEach((x, i) => check(schema.items, x, `${path}[${i}]`, errs));
  }
  if (t === "object" && v && typeof v === "object") {
    for (const r of schema.required ?? []) if (!(r in v)) errs.push(`${path ? path + "." : ""}${r}: required`);
    for (const [k, x] of Object.entries(v)) {
      if (schema.propertyNames?.pattern && !new RegExp(schema.propertyNames.pattern).test(k)) errs.push(`${path}.${k}: key does not match ${schema.propertyNames.pattern}`);
      if (schema.properties?.[k]) check(schema.properties[k], x, path ? `${path}.${k}` : k, errs);
      else if (typeof schema.additionalProperties === "object") check(schema.additionalProperties, x, `${path}.${k}`, errs);
    }
  }
}

// ---------- loading ----------
const KINDS = {
  methodology: { dir: "catalog/methodologies", schema: "methodology.schema.json", state: "lifecycle" },
  "artifact-type": { dir: "catalog/artifact-types", schema: "artifact-type.schema.json", state: "lifecycle" },
  question: { dir: "catalog/questions", schema: "question.schema.json" },
  assignment: { dir: "register", schema: "assignment.schema.json", state: "status" },
};
const SCHEMA_DIR = join(HERE, "../../catalog/_schema");
const COMMON = JSON.parse(readFileSync(join(SCHEMA_DIR, "common.json"), "utf8"));
const mdFiles = (d) => existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "INDEX.md" && statSync(join(d, f)).isFile()) : [];

function load(root, readFile) {
  return loadWithBody(root, readFile);
}
function loadWithBody(root, readFile) {
  const recs = [], errs = [];
  for (const [kind, k] of Object.entries(KINDS)) {
    for (const f of readFile.list(join(root, k.dir))) {
      const file = join(k.dir, f);
      try { const text = readFile.read(join(root, file)); recs.push({ kind, file, data: parseFrontmatter(text), body: text.slice(text.indexOf("\n---", 3) + 4) }); }
      catch (e) { errs.push({ file, msg: `cannot parse frontmatter: ${e.message}` }); }
    }
  }
  return { recs, errs };
}
const disk = { list: mdFiles, read: (p) => readFileSync(p, "utf8") };
function gitHead(root) {
  const top = execFileSync("git", ["-C", root, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const rel = relative(top, resolve(root));
  const tracked = (dir) => {
    try {
      return execFileSync("git", ["-C", top, "ls-tree", "--name-only", `HEAD:${join(rel, dir)}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
        .split("\n").filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "INDEX.md");
    } catch { return []; }
  };
  return {
    list: (abs) => tracked(relative(resolve(root), abs)),
    read: (abs) => execFileSync("git", ["-C", top, "show", `HEAD:${join(rel, relative(resolve(root), abs))}`], { encoding: "utf8" }),
  };
}

// ---------- validate ----------
export function validate(root, previous) {
  const { recs, errs } = load(root, disk);
  const err = (file, msg) => errs.push({ file, msg });
  const ids = {};
  for (const r of recs) {
    const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, KINDS[r.kind].schema), "utf8"));
    const e = []; check(schema, r.data, "", e);
    e.forEach((m) => err(r.file, m));
    const id = r.data.id;
    if (id) {
      ids[r.kind] ??= {};
      if (ids[r.kind][id]) err(r.file, `duplicate id ${id} (also in ${ids[r.kind][id].file})`);
      else ids[r.kind][id] = r;
      const stem = r.file.split("/").pop().replace(/\.md$/, "");
      if (r.kind !== "assignment" && stem !== id) err(r.file, `file name must match id (${id}.md)`);
      if (r.kind === "assignment" && !stem.startsWith(id)) err(r.file, `file name must start with the id (${id}-…)`);
    }
  }
  // I5: an entry states when not to use it, unless it is still a candidate (I7).
  for (const r of recs)
    if ((r.kind === "methodology" || r.kind === "artifact-type") && r.data.lifecycle !== "candidate" && !(r.data["unfit-when"]?.length))
      err(r.file, "unfit-when: needs at least 1 condition once the entry is past candidate (I5)");
  // References resolve (I7: anything outside the catalog must first be added as a candidate entry).
  const has = (kind, id) => Boolean(ids[kind]?.[id]);
  for (const r of recs) {
    for (const a of (r.kind === "methodology" || r.kind === "assignment" ? r.data["artifact-types"] ?? [] : []))
      if (!has("artifact-type", a)) err(r.file, `artifact type '${a}' is not in the catalog; add it as a candidate entry (I7)`);
    if (r.kind === "assignment") {
      for (const m of r.data.methodology ?? []) if (!has("methodology", m)) err(r.file, `methodology '${m}' is not in the catalog; add it as a candidate entry (I7)`);
      const ratifiedState = ["ratified", "in-force", "switched", "retired"].includes(r.data.status);
      if (ratifiedState && (!r.data["ratified-by"] || !r.data["ratified-on"])) err(r.file, `status ${r.data.status} needs ratified-by and ratified-on (I1)`);
      if (r.data.status === "proposed" && r.data["ratified-by"]) err(r.file, "a proposed assignment cannot name a ratifier (I2)");
      if (r.data.supersedes && !has("assignment", r.data.supersedes)) err(r.file, `supersedes unknown assignment ${r.data.supersedes}`);
    }
    if (r.kind === "methodology") for (const a of r.data.evidence ?? []) if (!has("assignment", a)) err(r.file, `evidence cites unknown assignment ${a}`);
  }
  // History: legal lifecycle steps; ratified assignments never edited (I3, DD-06).
  let prev = null;
  try { prev = previous ? load(previous, disk).recs : load(root, gitHead(root)).recs; } catch { prev = null; }
  if (prev) {
    for (const p of prev) {
      const cur = recs.find((r) => r.kind === p.kind && r.data.id === p.data.id);
      if (!cur) { if (p.kind === "assignment" && p.data.status !== "proposed") err(p.file, "a ratified assignment was deleted; retire or switch it instead"); continue; }
      const st = KINDS[p.kind].state;
      if (st) {
        const from = p.data[st], to = cur.data[st];
        const table = p.kind === "assignment" ? COMMON["assignment-transitions"] : COMMON.transitions;
        if (from !== to && !(table[from] ?? []).includes(to)) err(cur.file, `${st} cannot move from ${from} to ${to}`);
      }
      if (p.kind === "assignment") {
        const before = evidenceBlocks(p.body ?? ""), after = evidenceBlocks(cur.body ?? "");
        if (before && !after.startsWith(before)) err(cur.file, "evidence was edited or removed; evidence is append-only (I6)");
      }
      if (p.kind === "question" && Number(cur.data.version) < Number(p.data.version)) err(cur.file, `question version went down (${p.data.version} -> ${cur.data.version})`);
      if (p.kind === "question" && cur.data.text !== p.data.text && Number(cur.data.version) === Number(p.data.version)) err(cur.file, "question text changed without a new version (DD-06)");
      if (p.kind === "assignment" && p.data.status !== "proposed") {
        const strip = (d) => { const { status, ...rest } = d; return JSON.stringify(rest); };
        if (strip(p.data) !== strip(cur.data)) err(cur.file, "a ratified assignment's fields were edited; record a new assignment that supersedes it (I3)");
      }
    }
  }
  const counts = Object.fromEntries(Object.keys(KINDS).map((k) => [k, recs.filter((r) => r.kind === k).length]));
  return { ok: errs.length === 0, counts, errors: errs, history: prev ? (previous ? "previous dir" : "git HEAD") : "none" };
}

// ---------- list and report ----------
export function list(root, f = {}) {
  const { recs } = load(root, disk);
  return recs.filter((r) =>
    (!f.kind || r.kind === f.kind) &&
    (!f.domain || String(r.data.domain ?? "").startsWith(f.domain)) &&
    (!f.family || r.data.family === f.family) &&
    (!f.lifecycle || (r.data.lifecycle ?? r.data.status) === f.lifecycle));
}
const answersOf = (r) => Object.entries(r.data.answers ?? {});
const evidenceCount = (r) => { const i = r.body.indexOf("## Evidence"); return i < 0 ? 0 : (r.body.slice(i).match(/^### /gm) ?? []).length; };
export function report(root, { staleDays = 180, today = new Date() } = {}) {
  const { recs } = load(root, disk);
  const out = { assumedHeavy: [], researchTriggers: [], stale: [], noEvidence: [], candidates: [] };
  for (const r of recs) {
    const a = answersOf(r);
    const assumed = a.filter(([, v]) => v.basis === "assumed");
    if ((r.kind === "methodology" || r.kind === "assignment") && r.data.lifecycle !== "candidate" && a.length && assumed.length / a.length >= 0.5)
      out.assumedHeavy.push({ file: r.file, id: r.data.id, assumed: assumed.length, of: a.length });
    // K3 / research rule: an assumed answer where the cost of error (M4) is high.
    const m4 = a.find(([k]) => k === "M4")?.[1];
    if (m4 && /high/i.test(String(m4.value)) && assumed.length)
      out.researchTriggers.push({ file: r.file, id: r.data.id, cost: m4.value, assumed: assumed.map(([k]) => k) });
    if (r.data["last-checked"]) {
      const days = Math.floor((today - new Date(r.data["last-checked"])) / 86400000);
      if (days > staleDays) out.stale.push({ file: r.file, id: r.data.id, days });
    }
    if (r.kind === "assignment" && ["ratified", "in-force"].includes(r.data.status) && evidenceCount(r) === 0)
      out.noEvidence.push({ file: r.file, id: r.data.id, status: r.data.status });
    if (r.data.lifecycle === "candidate") out.candidates.push({ file: r.file, id: r.data.id, kind: r.kind });
  }
  return out;
}
function printReport(o, staleDays) {
  const sec = (t, rows, f) => `## ${t} (${rows.length})\n\n${rows.length ? rows.map((r) => `- ${f(r)}`).join("\n") : "_None._"}\n`;
  return ["# ee report\n",
    sec("Research triggers: assumed answers where the cost of error is high", o.researchTriggers, (r) => `**${r.id}** (cost: ${r.cost}): assumed ${r.assumed.join(", ")} — ${r.file}`),
    sec("Mostly assumed (half or more of the answers)", o.assumedHeavy, (r) => `${r.id}: ${r.assumed}/${r.of} assumed`),
    sec("Ratified assignments with no evidence yet", o.noEvidence, (r) => `${r.id} (${r.status}) — ${r.file}`),
    sec(`Stale (last checked more than ${staleDays} days ago)`, o.stale, (r) => `${r.id}: ${r.days} days`),
    sec("Candidates awaiting research or promotion", o.candidates, (r) => `${r.id} (${r.kind})`)].join("\n");
}

// ---------- recommend and propose ----------
export const MODEL = "jev-1.13.0";
export async function typesafe(state, questions) {
  for (let a = 0; a < 5; a++) {
    const res = await fetch("https://api.typesafe.ai/v1/systemone", { method: "POST",
      headers: { authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, state, questions }), signal: AbortSignal.timeout(90000) });
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 2500 * (a + 1))); continue; }
    if (!res.ok) throw new Error(`TypeSafe ${res.status}`);
    return res.json();
  }
  throw new Error("TypeSafe retries exhausted");
}
const QTEXT = (recs) => Object.fromEntries(recs.filter((r) => r.kind === "question").map((r) => [r.data.id, r.data.text]));
function catalogVersion(root, recs) {
  const h = createHash("sha256");
  for (const r of recs.filter((r) => r.kind !== "assignment").sort((a, b) => a.file.localeCompare(b.file))) h.update(r.file + JSON.stringify(r.data));
  return h.digest("hex").slice(0, 12);
}
// Scoring v2 (2026-10-10), stated as principles before re-running the golden and held-out cases:
//  1. Fitting the whole system counts more than fitting some part (0.6 / 0.4).
//  2. The methodology's own fits-when conditions count: the mean probability they hold scales the score from 0.5x to 1x.
//  3. An unfit-when condition penalises only as far as the judge is confident it holds: 0 at p <= 0.5, full at p = 1.
// v1 (max(whole, part) x (1 - worst unfit)) ranked prose spec-anchored first on the first assignment; kept in register/_recommendations.
export const SCORING = "v2";
export function score(whole, part, fitPs, unfitPs) {
  const base = 0.6 * whole + 0.4 * part;
  const support = fitPs.length ? 0.5 + 0.5 * (fitPs.reduce((a, b) => a + b, 0) / fitPs.length) : 0.75;
  const certainty = Math.max(0, ...unfitPs.map((x) => (x - 0.5) / 0.5));
  return +(base * support * (1 - certainty)).toFixed(2);
}
/** Ranks listed and evidenced methodologies for one system. `ask` is injectable for tests. */
/** An `ask` that reads answers a reasoning model wrote by hand, when Jev is not available.
 *  The file maps methodology name to {whole, part, fit0.., unfit0..} probabilities and names its `scorer`. */
export function answersFile(path) {
  const f = JSON.parse(readFileSync(path, "utf8"));
  const ask = async (state, qs) => {
    const name = qs.whole.instructions.match(/Methodology "([^"]+)"/)[1];
    const a = f.answers[name];
    if (!a) throw new Error(`answers file has no entry for "${name}"`);
    return { answers: Object.fromEntries(Object.keys(qs).map((k) => {
      if (a[k] === undefined) throw new Error(`answers file: "${name}" has no ${k}`);
      return [k, { noul: a[k] }];
    })) };
  };
  ask.scorer = f.scorer;
  return ask;
}
export async function recommend(root, systemFile, ask = typesafe, repeat = 1) {
  const { recs } = load(root, disk);
  const sys = parseFrontmatter(readFileSync(systemFile, "utf8"));
  const qt = QTEXT(recs);
  const answers = Object.entries(sys.answers ?? {}).map(([k, v]) => `${k} ${qt[k] ?? ""}\n  Answer: ${v.value} (${v.basis})`).join("\n");
  const state = { system: sys.system, description: sys.description ?? "", decision_question_answers: answers };
  // Methodologies in the system's development domain (DD-04). With no domain declared, software is assumed (phase 1 default).
  // Candidates in the domain are judged too and flagged, so a domain with no researched entries is visible, not hidden (I7, K3).
  const topDomain = (d) => String(d ?? "software").split("/")[0];
  const sysDomain = sys.domain ?? "software";
  const ms = recs.filter((r) => r.kind === "methodology" && topDomain(r.data.domain) === topDomain(sysDomain) && ["listed", "evidenced", "candidate"].includes(r.data.lifecycle));
  const ranked = [];
  let tokens = 0;
  for (const m of ms) {
    const unfit = m.data["unfit-when"] ?? [], fits = m.data["fits-when"] ?? [];
    const qs = {
      whole: { type: "noul", instructions: `Methodology "${m.data.name}" (source of truth: ${m.data["source-of-truth"]}). Is it a good fit for building this whole system, given the system and its decision-question answers?`, criteria: { true: "A good fit for the whole system", false: "Not a good fit for the whole system" } },
      part: { type: "noul", instructions: `Methodology "${m.data.name}" (source of truth: ${m.data["source-of-truth"]}). Is it a good fit for at least one clearly identifiable part of this system?`, criteria: { true: "A good fit for some part", false: "Not a good fit for any part" } },
      ...Object.fromEntries(fits.map((c, i) => [`fit${i}`, { type: "noul", instructions: `Does this condition hold for this system: "${c}"?`, criteria: { true: "It holds", false: "It does not hold" } }])),
      ...Object.fromEntries(unfit.map((c, i) => [`unfit${i}`, { type: "noul", instructions: `Does this condition hold for this system: "${c}"?`, criteria: { true: "It holds", false: "It does not hold" } }])),
    };
    const runs = [];
    for (let n = 0; n < repeat; n++) { const r = await ask({ ...state, ...(n ? { repeat: n } : {}) }, qs); tokens += r.usage?.input_tokens ?? 0; runs.push(r); }
    const pr = (k, r) => +r.answers[k].noul;
    const p = (k) => +(runs.reduce((a, r) => a + pr(k, r), 0) / runs.length).toFixed(2);
    const perRun = runs.map((r) => score(pr("whole", r), pr("part", r), fits.map((_, i) => pr(`fit${i}`, r)), unfit.map((_, i) => pr(`unfit${i}`, r))));
    const fitHits = fits.map((c, i) => ({ c, p: p(`fit${i}`) })).filter((x) => x.p > 0.5);
    const unfitHits = unfit.map((c, i) => ({ c, p: p(`unfit${i}`) })).filter((x) => x.p > 0.5);
    ranked.push({ id: m.data.id, name: m.data.name, candidate: m.data.lifecycle === "candidate", whole: p("whole"), part: p("part"),
      score: score(p("whole"), p("part"), fits.map((_, i) => p(`fit${i}`)), unfit.map((_, i) => p(`unfit${i}`))), fits_met: fitHits, unfit_met: unfitHits,
      runs: perRun, spread: +(Math.max(...perRun) - Math.min(...perRun)).toFixed(2) });
  }
  ranked.sort((a, b) => b.score - a.score);
  // Tie bands: a new band starts when a score is more than BAND below the top of the current band.
  // 0.1 is the run-to-run movement observed in runs 2-5 (recommender run log, kept with the private register).
  const BAND = 0.1;
  let band = 0, top = ranked[0]?.score ?? 0;
  for (const r of ranked) { if (top - r.score > Math.max(BAND, r.spread)) { band++; top = r.score; } r.band = band + 1; }
  const sa = Object.entries(sys.answers ?? {});
  const m4 = sys.answers?.M4;
  const researchTriggers = m4 && /high/i.test(String(m4.value)) ? sa.filter(([, v]) => v.basis === "assumed").map(([k, v]) => ({ question: k, answer: v.value })) : [];
  const unresearched = ranked.length > 0 && ranked.every((r) => r.candidate);
  return { created: new Date().toISOString(), model: ask === typesafe ? MODEL : ask.scorer ?? "injected", scoring: SCORING, repeat, domain: sysDomain, unresearched, catalog_version: catalogVersion(root, recs),
    system_file: relative(root, resolve(systemFile)), entity: sys.entity, system: sys.system, inputs: state, ranked, research_triggers: researchTriggers,
    usd: +((tokens / 1e6) * 0.042).toFixed(4), note: "A recommendation only. The founder ratifies (I2)." };
}
const slug = (t) => String(t).toLowerCase().replace(/\[\[|\]\]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
export function saveRecommendation(root, rec) {
  const dir = join(root, "register/_recommendations"); mkdirSync(dir, { recursive: true });
  // Seconds in the name: two recommendations in the same minute must not overwrite each other.
  const base = `R-${rec.created.slice(0, 19).replace(/[:T]/g, "-")}-${slug(rec.system)}-scoring-${rec.scoring}`;
  writeFileSync(join(dir, `${base}.json`), JSON.stringify(rec, null, 2));
  return join("register/_recommendations", `${base}.json`);
}
export function printRecommendation(rec) {
  let last = 0;
  const rows = rec.ranked.map((r, i) => `${r.band !== last ? `${(last = r.band) > 1 ? "\n" : ""}Band ${r.band}${r.band === 1 ? " (treat as tied)" : ""}\n` : ""}${String(i + 1).padStart(2)}. ${(r.id + (r.candidate ? " (candidate)" : "")).padEnd(26)} score ${r.score.toFixed(2)}${rec.repeat > 1 ? ` ±${(r.spread / 2).toFixed(2)}` : ""}  whole ${r.whole.toFixed(2)}  part ${r.part.toFixed(2)}` +
    (r.unfit_met.length ? `\n      unfit: ${r.unfit_met.map((x) => `${x.c} (${x.p})`).join("; ")}` : "") +
    (r.fits_met.length ? `\n      fits: ${r.fits_met.map((x) => `${x.c} (${x.p})`).join("; ")}` : ""));
  const trig = rec.research_triggers.length ? `\nResearch before choosing (cost of error is high and these answers are assumed): ${rec.research_triggers.map((t) => t.question).join(", ")}` : "";
  const warn = rec.unresearched ? `\nEvery methodology in domain '${rec.domain}' is an unresearched candidate: research them before choosing (K3).` : rec.ranked.some((r) => r.candidate) ? "\nCandidates are unresearched; their scores rest on the name and source of truth only." : "";
  return `${rec.ranked.length ? "" : `No methodology in domain '${rec.domain}'. Add candidate entries first (I7).\n`}Recommendation for ${rec.system} · domain ${rec.domain} · model ${rec.model} · scoring ${rec.scoring} · ${rec.repeat} run(s) · catalog ${rec.catalog_version} · ≈$${rec.usd}\n${rows.join("\n")}${trig}${warn}\n${rec.note}`;
}
export function propose(root, recFile, picks) {
  const rec = JSON.parse(readFileSync(resolve(root, recFile), "utf8"));
  const { recs } = load(root, disk);
  const sys = parseFrontmatter(readFileSync(resolve(root, rec.system_file), "utf8"));
  const chosen = picks?.length ? picks : rec.ranked.filter((r) => r.score >= 0.5).slice(0, 3).map((r) => r.id);
  if (!chosen.length) throw new Error("no methodology scored 0.5 or more; pass --methodology explicitly");
  for (const c of chosen) if (!recs.some((r) => r.kind === "methodology" && r.data.id === c)) throw new Error(`methodology '${c}' is not in the catalog; add it as a candidate entry first (I7)`);
  const n = Math.max(0, ...recs.filter((r) => r.kind === "assignment").map((r) => Number(String(r.data.id).slice(2)))) + 1;
  const id = `A-${String(n).padStart(3, "0")}`;
  const arts = [...new Set(chosen.flatMap((c) => recs.find((r) => r.data.id === c).data["artifact-types"] ?? []))];
  const q = (v) => `"${String(v).replace(/"/g, "'")}"`;
  const ans = Object.entries(sys.answers ?? {}).map(([k, v]) => `  ${k}: { value: ${q(v.value)}, basis: ${v.basis} }`).join("\n");
  const opts = rec.ranked.map((r) => `- **${r.id}** — score ${r.score} (whole ${r.whole}, part ${r.part})${r.unfit_met.length ? `; unfit: ${r.unfit_met.map((x) => x.c).join("; ")}` : ""}${chosen.includes(r.id) ? " — **proposed**" : ""}`).join("\n");
  const text = `---\ntype: methodology-assignment\nid: ${id}\nentity: ${q(sys.entity ?? "")}\nsystem: ${q(sys.system)}\nmethodology: [${chosen.join(", ")}]\nstatus: proposed\nanswers:\n${ans}\nartifact-types: [${arts.join(", ")}]\nrecommendation-ref: ${q(recFile)}\nsource: machine\ncreated: ${new Date().toISOString().slice(0, 10)}\nai-model: ${q(`ee propose; recommendation by ${rec.model}`)}\ntags: [assignment, proposed]\n---\n\n# ${id} ${sys.system}\n\n**Proposed, not ratified.** The founder ratifies by editing \`status\`, \`ratified-by\` and \`ratified-on\` and recording the decision in the entity's ledger (I1, I2).\n\n${sys.description ?? ""}\n\n## Options considered (from ${recFile})\n\n${opts}\n\n## Research before ratifying\n\n${rec.research_triggers.length ? rec.research_triggers.map((t) => `- ${t.question}: ${t.answer} (assumed)`).join("\n") : "_None flagged._"}\n\n## Evidence\n\n_None recorded yet._\n`;
  const file = join("register", `${id}-${slug(sys.system)}.md`);
  writeFileSync(join(root, file), text);
  return { id, file, methodology: chosen };
}

// ---------- evidence ----------
const evidenceBlocks = (body) => { const i = body.indexOf("## Evidence"); if (i < 0) return ""; const t = body.slice(i); const j = t.search(/^### /m); return j < 0 ? "" : t.slice(j).trimEnd(); };
export function evidence(root, id, { title, note, source, methodology, tested = [], date = new Date().toISOString().slice(0, 10) }) {
  if (!title || !note) throw new Error("evidence needs --title and --note");
  const { recs } = load(root, disk);
  const a = recs.find((r) => r.kind === "assignment" && r.data.id === id);
  if (!a) throw new Error(`no assignment ${id}`);
  const path = join(root, a.file);
  let text = readFileSync(path, "utf8");
  if (!text.includes("\n## Evidence")) text = text.trimEnd() + "\n\n## Evidence\n";
  text = text.replace(/\n_None recorded yet[^\n]*_\n?/, "\n");
  const block = `### ${date} — ${title}\n\n${note}\n${source ? `\nSource: ${source}\n` : ""}${tested.length ? `\nCatalog answers marked tested: ${tested.join(", ")}\n` : ""}`;
  writeFileSync(path, text.trimEnd() + "\n\n" + block);
  const ms = methodology?.length ? methodology : a.data.methodology;
  const changed = [];
  for (const mid of ms) {
    const m = recs.find((r) => r.kind === "methodology" && r.data.id === mid);
    if (!m) throw new Error(`methodology '${mid}' is not in the catalog`);
    const mp = join(root, m.file);
    let t = readFileSync(mp, "utf8");
    const ev = new Set(m.data.evidence ?? []); ev.add(id);
    t = t.replace(/^evidence:.*$/m, `evidence: [${[...ev].sort().join(", ")}]`);
    if (m.data.lifecycle === "listed") t = t.replace(/^lifecycle: listed$/m, "lifecycle: evidenced");
    for (const pair of tested.filter((x) => x.startsWith(`${mid}:`))) {
      const q = pair.split(":")[1];
      const re = new RegExp(`^(  ${q}: \\{.*basis: )assumed( \\})$`, "m");
      if (!re.test(t)) throw new Error(`${mid} has no assumed answer ${q}`);
      t = t.replace(re, "$1tested$2");
    }
    t = t.replace(/^last-checked: .*$/m, `last-checked: ${date}`);
    writeFileSync(mp, t); changed.push(m.file);
  }
  return { assignment: a.file, changed };
}

// ---------- index (generated views) ----------
const cell = (v) => String(Array.isArray(v) ? v.join(", ") : v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const link = (r) => `[[${r.file.split("/").pop().replace(/\.md$/, "")}\\|${cell(r.data.name ?? r.data.id)}]]`;
const head = (title, desc) => `---\ntype: reference\nsource: machine\ncreated: ${new Date().toISOString().slice(0, 10)}\nai-model: \"none (generated by script)\"\ngenerated-by: "ee index"\ntags: [generated, index]\ndescription: "${desc}"\n---\n\n# ${title}\n\n> Generated by \`node everything-ecosystem/skills/methodology-selection/ee.mjs index\`. Do not edit; edit the entry files.\n\n`;
function table(rows, cols) {
  return `| ${cols.map((c) => c[0]).join(" | ")} |\n|${cols.map(() => "---").join("|")}|\n` + rows.map((r) => `| ${cols.map((c) => c[1](r)).join(" | ")} |`).join("\n") + "\n";
}
export function index(root) {
  const { recs } = load(root, disk);
  const by = (k) => recs.filter((r) => r.kind === k).sort((a, b) => String(a.data.domain ?? "").localeCompare(String(b.data.domain ?? "")) || String(a.data.id).localeCompare(String(b.data.id), "en", { numeric: true }));
  const assumed = (r) => { const a = Object.values(r.data.answers ?? {}); return a.length ? `${a.filter((x) => x.basis === "assumed").length}/${a.length}` : "—"; };
  let c = head("Catalog index", "Generated view of the methodology catalog, artifact catalog and decision questions.");
  c += "## Methodologies\n\n" + table(by("methodology"), [["Methodology", link], ["Domain", (r) => cell(r.data.domain)], ["Family", (r) => cell(r.data.family)], ["Lifecycle", (r) => cell(r.data.lifecycle)], ["Source of truth", (r) => cell(r.data["source-of-truth"])], ["Assumed answers", assumed], ["Unfit when", (r) => cell(r.data["unfit-when"])], ["Evidence", (r) => cell(r.data.evidence)]]);
  c += "\n## Artifact types\n\n" + table(by("artifact-type"), [["Artifact type", link], ["Question answered", (r) => cell(r.data["question-answered"])], ["Readers", (r) => cell(r.data.readers)], ["Use", (r) => cell(r.data.use)], ["Formats", (r) => cell(r.data.formats)], ["Alternatives", (r) => cell(r.data.alternatives)], ["Lifecycle", (r) => cell(r.data.lifecycle)]]);
  c += "\n## Decision questions\n\n" + table(by("question"), [["Id", (r) => `[[${r.data.id}]]`], ["Set", (r) => cell(r.data.set)], ["Question", (r) => cell(r.data.text)], ["Version", (r) => cell(r.data.version)]]);
  writeFileSync(join(root, "catalog/INDEX.md"), c);
  let g = head("Assignment register", "Generated view of the methodology assignment register.");
  g += table(by("assignment"), [["Id", (r) => `[[${r.file.split("/").pop().replace(/\.md$/, "")}\\|${r.data.id}]]`], ["Entity", (r) => cell(r.data.entity)], ["System", (r) => cell(r.data.system)], ["Methodology", (r) => cell(r.data.methodology)], ["Status", (r) => cell(r.data.status)], ["Ratified", (r) => cell([r.data["ratified-by"], r.data["ratified-on"]].filter(Boolean).join(" "))], ["Assumed answers", assumed]]);
  writeFileSync(join(root, "register/INDEX.md"), g);
  return { catalog: "catalog/INDEX.md", register: "register/INDEX.md" };
}

// ---------- cli ----------
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const cmd = args[0];
  const root = resolve(opt("--root", join(HERE, "../..")));
  if (cmd === "validate") {
    const res = validate(root, opt("--previous") && resolve(opt("--previous")));
    if (flag("--json")) console.log(JSON.stringify(res, null, 2));
    else {
      console.log(`ee validate: ${res.ok ? "OK" : `${res.errors.length} error(s)`} · ${Object.entries(res.counts).map(([k, n]) => `${n} ${k}`).join(", ")} · history: ${res.history}`);
      for (const e of res.errors) console.log(`  ✗ ${e.file}: ${e.msg}`);
    }
    process.exit(res.ok ? 0 : 1);
  }
  if (cmd === "list") {
    const rows = list(root, { kind: opt("--kind"), domain: opt("--domain"), family: opt("--family"), lifecycle: opt("--lifecycle") });
    if (flag("--json")) console.log(JSON.stringify(rows.map((r) => ({ kind: r.kind, file: r.file, ...r.data })), null, 2));
    else for (const r of rows) console.log(`${r.kind.padEnd(13)} ${String(r.data.id).padEnd(28)} ${String(r.data.lifecycle ?? r.data.status ?? "").padEnd(10)} ${r.data.domain ?? r.data.set ?? r.data.entity ?? ""}  ${r.data.name ?? r.data.system ?? r.data.text ?? ""}`);
    process.exit(0);
  }
  if (cmd === "report") {
    const staleDays = Number(opt("--stale-days", 180));
    const o = report(root, { staleDays });
    console.log(flag("--json") ? JSON.stringify(o, null, 2) : printReport(o, staleDays));
    process.exit(0);
  }
  if (cmd === "recommend") {
    // --answers <file>: answers written by a reasoning model when Jev is unavailable; the file's scorer is recorded.
    const manual = opt("--answers");
    if (!manual && !process.env.TYPESAFE_API_KEY) { console.error("recommend needs TYPESAFE_API_KEY (run node with --env-file), or --answers <file>"); process.exit(2); }
    const rec = manual ? await recommend(root, resolve(opt("--system")), answersFile(resolve(manual)), 1)
      : await recommend(root, resolve(opt("--system")), typesafe, Number(opt("--repeat", 3)));
    const saved = saveRecommendation(root, rec);
    console.log(flag("--json") ? JSON.stringify({ saved, ...rec }, null, 2) : `${printRecommendation(rec)}\nSaved: ${saved}`);
    process.exit(0);
  }
  if (cmd === "propose") {
    const out = propose(root, opt("--from"), opt("--methodology")?.split(",").map((x) => x.trim()).filter(Boolean));
    const v = validate(root);
    console.log(`ee propose: wrote ${out.file} (${out.id}, status proposed: ${out.methodology.join(", ")}) · validate ${v.ok ? "OK" : "FAILED"}`);
    for (const e of v.errors) console.log(`  ✗ ${e.file}: ${e.msg}`);
    process.exit(v.ok ? 0 : 1);
  }
  if (cmd === "evidence") {
    const list2 = (k) => opt(k)?.split(",").map((x) => x.trim()).filter(Boolean);
    const out = evidence(root, args[1], { title: opt("--title"), note: opt("--note"), source: opt("--source"), methodology: list2("--methodology"), tested: list2("--tested") ?? [] });
    const v = validate(root);
    console.log(`ee evidence: appended to ${out.assignment}; updated ${out.changed.join(", ")} · validate ${v.ok ? "OK" : "FAILED"}`);
    for (const e of v.errors) console.log(`  ✗ ${e.file}: ${e.msg}`);
    process.exit(v.ok ? 0 : 1);
  }
  if (cmd === "publish") {
    const { plan, report: publishReport, write } = await import("./publish.mjs");
    // publish.private.json (local, not committed) appends private term lists to the committed manifest.
    // publish.json sits at the repository root, one level above the operations layer that holds the catalog.
    const home = existsSync(join(root, "publish.json")) ? root : resolve(root, "..");
    const manifest = JSON.parse(readFileSync(join(home, "publish.json"), "utf8"));
    const privPath = join(home, "publish.private.json");
    if (existsSync(privPath)) for (const [k, v] of Object.entries(JSON.parse(readFileSync(privPath, "utf8")))) if (Array.isArray(v)) manifest[k] = [...(manifest[k] ?? []), ...v];
    const res = plan(resolve(root, ".."), manifest, parseFrontmatter);
    if (flag("--dry-run")) { console.log(flag("--json") ? JSON.stringify(res, null, 2) : publishReport(res)); process.exit(res.ok ? 0 : 1); }
    if (!res.ok) { console.log(publishReport(res)); process.exit(1); }
    const out = opt("--out"); if (!out) { console.log("ee publish: give --out <public repo site folder> or --dry-run"); process.exit(2); }
    const w = write(resolve(root, ".."), res, resolve(out), parseFrontmatter);
    mkdirSync(join(root, "_publish"), { recursive: true });
    writeFileSync(join(root, "_publish/last-report.md"), `---\ntype: verification-log\nsource: machine\ncreated: ${new Date().toISOString().slice(0, 10)}\nai-model: "none (generated by script)"\ntags: [publish, private]\n---\n\n${w.privateReport}`);
    console.log(`ee publish: wrote ${w.written} page(s) to ${out}/src/content/docs; removed ${w.removed.length}; public report at ${out}/publish-report.md; full report with refusals at everything-ecosystem/_publish/last-report.md (private). Review the diff; ee never commits or pushes.`);
    process.exit(0);
  }
  if (cmd === "index") {
    const v = validate(root, opt("--previous") && resolve(opt("--previous")));
    if (!v.ok) { console.log(`ee index: validation failed (${v.errors.length} error(s)); run ee validate`); process.exit(1); }
    const out = index(root);
    console.log(`ee index: wrote ${out.catalog}, ${out.register}`);
    process.exit(0);
  }
  console.log("usage: node ee.mjs validate|list|report|recommend|propose|evidence|publish|index [--root <dir>] [--previous <dir>] [--json]");
  process.exit(2);
}
