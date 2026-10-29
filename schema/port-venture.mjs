#!/usr/bin/env node
// naive port: brings an existing project into a new venture by keeping its files as they are (EE-076).
// Each file is placed, unchanged, in the package directory its name or folder points to; a code
// repository or anything that should stay where it is becomes a pointer in knowledge/sources.json;
// what fits nowhere is left behind, by name, so nothing disappears silently. Migrate (rewriting a
// project into the Naive convention) is the other way in, and is not this command.
//
//   node schema/port-venture.mjs --from <project> --venture <new venture dir>
//        writes the plan to <venture>/.release/port-plan.json and prints it; changes nothing else
//   node schema/port-venture.mjs --venture <dir> --apply --confirm port
//        carries out the plan as it now reads; the founder may first set any item's action to
//        port, point or leave
//
// The project is only ever read. A port never overwrites a file in the venture, refuses a plan
// whose source files changed since it was written, and records every copy in provenance.jsonl
// with the source path it was derived from.

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { record } from "../interface/provenance.mjs";
import { SECRET } from "./migrate-venture.mjs";
import { ventureFile } from "./venture-paths.mjs";

export const PLAN = ".release/port-plan.json";
const SKIP = new Set([".git", "node_modules", ".next", ".turbo", "dist", "build", ".venv", "__pycache__", ".DS_Store"]);
const REPO_MARKERS = [".git", "package.json", "Cargo.toml", "go.mod", "pyproject.toml", "Gemfile", "pom.xml"];
const CODE = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".rb", ".go", ".rs", ".java", ".kt", ".swift", ".c", ".h", ".cpp", ".cs", ".php", ".sh", ".sql", ".css", ".scss", ".html", ".lock", ".yml", ".yaml", ".toml"]);
const MAX_BYTES = 5 * 1024 * 1024;

// The first rule whose pattern matches wins: the file name is tried before its folders, so a file
// says more about itself than the folder it sits in. Patterns match words in lowercase paths.
const RULES = [
  [/\b(problem|pain[- ]?points?)\b/, "foundation", "states the problem"],
  [/\b(icp|personas?|ideal[- ]customer|customer[- ]profile|segments?)\b/, "foundation", "describes the customer"],
  [/\b(vision|mission|tagline|values|manifesto|one[- ]pager|strategy)\b/, "foundation", "states what the venture is for"],
  [/\b(interviews?|surveys?|user[- ]research|customer[- ]research|discovery|experiments?|hypothes[ie]s|validation)\b/, "validation", "is evidence about the problem or the solution"],
  [/\b(investors?|pitch|deck|fundrais\w*|safe|term[- ]sheet|cap[- ]table|data[- ]room)\b/, "investors", "is for or about investors"],
  [/\b(pricing|prices?|revenue|budget|forecast|runway|financ\w*|p&l|burn|unit[- ]economics|model)\b/, "finance", "is about money the venture plans or earns"],
  [/\b(brand\w*|marketing|copy|landing|seo|social|launch|blog|newsletter|campaigns?|content|go[- ]to[- ]market|gtm)\b/, "marketing", "is marketing or sales"],
  [/\b(roadmap|specs?|prd|requirements|features?|product|designs?|ux|ui|wireframes?|mockups?|backlog)\b/, "product", "describes the product"],
  [/\b(team|hiring|roles?|org[- ]chart|founders?|equity|vesting|people|onboarding|handbook|culture)\b/, "people", "is about the people"],
  [/\b(customers?|clients?|accounts|crm|leads|pipeline)\b/, "customers", "is about customers"],
  [/\b(decisions?|adrs?|decision[- ]log)\b/, "decisions", "records decisions"],
  [/\b(legal|contracts?|agreements?|incorporation|bylaws|operating[- ]agreement|nda|terms|privacy|trademark|ip)\b/, "_private/legal", "is a legal document, kept private so it never reaches a model"],
];
const BANK = /\b(bank|transactions?|ledger|payroll|tax(es)?)\b/;

const words = (s) => s.toLowerCase().replace(/[_.]+/g, " ");
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";

/** Where one file goes, or why it stays behind. `rel` is relative to the project root. */
export function place(rel, bytes) {
  const name = basename(rel, extname(rel));
  const ext = extname(rel).toLowerCase();
  if (bytes > MAX_BYTES) return { action: "leave", reason: `larger than ${MAX_BYTES / 1024 / 1024} MB; point to it instead` };
  if (CODE.has(ext)) return { action: "leave", reason: "code or configuration: it stays in its repository" };
  const folders = dirname(rel) === "." ? [] : dirname(rel).split(sep).reverse();
  for (const [where, confidence] of [[name, "high"], ...folders.map((f) => [f, "low"])]) {
    if (BANK.test(words(where))) return { action: "leave", reason: "bank and payroll data come from the bank connection, not from files" };
    const hit = RULES.find(([re]) => re.test(words(where)));
    if (hit) return { action: "port", to: `${hit[1]}/${basename(rel)}`, function: hit[1].split("/").at(-1), confidence, reason: `${confidence === "high" ? "its name" : `its folder ${where}`} ${hit[2]}` };
  }
  if (/^readme$/i.test(name)) return { action: "leave", reason: "the venture has its own AGENTS.md and profile.md; read this to write profile.md" };
  return { action: "leave", reason: "nothing in its name or folders matches a package; place it by hand or migrate it" };
}

function walk(root, rel = "", out = { files: [], repos: [], secrets: [] }) {
  for (const e of readdirSync(join(root, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (SKIP.has(e.name) || e.isSymbolicLink()) continue;
    const r = rel ? join(rel, e.name) : e.name;
    if (e.isDirectory()) {
      if (REPO_MARKERS.some((m) => existsSync(join(root, r, m)))) out.repos.push(r);
      else walk(root, r, out);
    } else if (e.isFile() && SECRET.test(r)) out.secrets.push(r);
    else if (e.isFile() && !e.name.startsWith(".")) out.files.push(r);
  }
  return out;
}

/** The plan for porting `from` into the venture at `dir`. Reads both, writes neither. */
export function plan(from, dir) {
  const src = resolve(from);
  if (!existsSync(src) || !statSync(src).isDirectory()) throw new Error(`${from} is not a directory`);
  if (!existsSync(join(dir, "venture.json"))) throw new Error(`${dir} is not a venture: create one first with naive init`);
  if (resolve(dir).startsWith(src + sep) || resolve(dir) === src) throw new Error("the venture cannot sit inside the project it ports from");
  const { files, repos, secrets } = walk(src);
  const items = secrets.map((f) => ({ from: f, action: "leave", reason: "looks like a secret, so it was never opened" }));
  // The project itself is a repository when it carries a marker at its root: point to it, and still
  // port its documents.
  for (const r of REPO_MARKERS.some((m) => existsSync(join(src, m))) ? ["", ...repos] : repos)
    items.push({ from: r || ".", action: "point", source: slug(r ? basename(r) : basename(src)), reason: "a code repository stays where it is; the venture points to it" });
  const taken = new Set();
  for (const f of files) {
    const p = place(f, statSync(join(src, f)).size);
    if (p.action === "port") {
      // Two files with one name in one package: the second keeps its folder name in front.
      if (taken.has(p.to)) p.to = `${dirname(p.to)}/${slug(basename(dirname(f)))}-${basename(f)}`;
      if (taken.has(p.to) || existsSync(ventureFile(dir, p.to))) Object.assign(p, { action: "leave", reason: `${p.to} already exists in the venture; a port never overwrites` });
      else taken.add(p.to);
    }
    items.push({ from: f, sha256: sha(join(src, f)), ...p });
  }
  const count = (a) => items.filter((i) => i.action === a).length;
  return { from: src, venture: JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).id, at: new Date().toISOString(),
    summary: { port: count("port"), point: count("point"), leave: count("leave") }, items };
}

/** Carries out a plan as the founder left it. Returns what was done. */
export function apply(dir, p, agent = { kind: "person", via: "cli" }) {
  const src = p.from;
  for (const i of p.items.filter((x) => x.action === "port")) {
    if (!existsSync(join(src, i.from)) || sha(join(src, i.from)) !== i.sha256) throw new Error(`${i.from} changed since the plan was written; write the plan again`);
    if (existsSync(ventureFile(dir, i.to))) throw new Error(`${i.to} already exists in the venture; a port never overwrites`);
  }
  const done = { ported: [], pointed: [] };
  for (const i of p.items.filter((x) => x.action === "port")) {
    mkdirSync(dirname(ventureFile(dir, i.to)), { recursive: true });
    copyFileSync(join(src, i.from), ventureFile(dir, i.to));
    record(dir, { entity: i.to, activity: "port", agent, derived_from: [`file://${join(src, i.from)}`], note: `ported unchanged: ${i.reason}` });
    done.ported.push(i.to);
  }
  const points = p.items.filter((x) => x.action === "point");
  if (points.length) {
    const f = join(ventureFile(dir, "knowledge/sources.json"));
    const map = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { sources: [], records: {} };
    for (const i of points) {
      if (map.sources.some((s) => s.id === i.source)) continue;
      map.sources.push({ id: i.source, connector: "filesystem", writes: "none", root: join(src, i.from === "." ? "" : i.from), note: `ported as a pointer: ${i.reason}` });
      done.pointed.push(i.source);
    }
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, JSON.stringify(map, null, 2) + "\n");
    if (done.pointed.length) record(dir, { entity: "knowledge/sources.json", activity: "port", agent, note: `pointers to ${done.pointed.join(", ")}` });
  }
  return done;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(`--${k}`); return i < 0 ? undefined : args[i + 1]; };
  const dir = opt("venture");
  if (!dir) { console.error("usage: node schema/port-venture.mjs --from <project> --venture <dir> | --venture <dir> --apply --confirm port"); process.exit(2); }
  try {
    if (args.includes("--apply")) {
      if (opt("confirm") !== "port") { console.error("type --confirm port to carry out the plan"); process.exit(1); }
      if (!existsSync(ventureFile(dir, PLAN))) { console.error(`no plan at ${ventureFile(dir, PLAN)}: run with --from first`); process.exit(1); }
      const d = apply(dir, JSON.parse(readFileSync(ventureFile(dir, PLAN), "utf8")));
      console.log(`ported ${d.ported.length} files unchanged; pointed to ${d.pointed.length} source${d.pointed.length === 1 ? "" : "s"}`);
    } else {
      const from = opt("from");
      if (!from) { console.error("--from <project> is needed to write a plan"); process.exit(2); }
      const p = plan(from, dir);
      mkdirSync(join(ventureFile(dir, ".release")), { recursive: true });
      writeFileSync(ventureFile(dir, PLAN), JSON.stringify(p, null, 2) + "\n");
      for (const i of p.items) console.log(`${i.action.padEnd(5)}  ${i.from}${i.to ? `  ->  ${i.to}` : i.source ? `  ->  source ${i.source}` : ""}   (${i.reason})`);
      console.log(`\n${p.summary.port} to port, ${p.summary.point} to point to, ${p.summary.leave} left behind. Nothing has changed yet.`);
      console.log(`Read ${relative(process.cwd(), ventureFile(dir, PLAN))}, set any item's action to port, point or leave, then run with --apply --confirm port.`);
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}
