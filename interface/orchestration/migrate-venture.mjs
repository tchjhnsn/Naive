#!/usr/bin/env node
// naive migrate: brings an existing project into a new venture by rewriting it into the Naive
// convention (EE-076). An agent reads the project's text and proposes records in the shape of
// Naive's own schemas; nothing lands until a person decides, one decision per function; then each
// record is written through the router, so its schema, gates and provenance all apply. Port (files
// kept as they are) is the other way in: schema/port-venture.mjs.
//
//   node interface/orchestration/migrate-venture.mjs --from <project> --venture <new venture dir>
//        the agent writes the plan to <venture>/.release/migrate-plan.json and proposes the decisions
//   node interface/orchestration/migrate-venture.mjs --venture <dir> --apply
//        writes what a person decided ("bring in", "point to them" or "leave them"); open decisions wait
//
// The project is only ever read, and the agent gets its text and no tools. Files that look like
// secrets are never opened. The agent is `claude -p` with no tools, or MENTURA_AGENT_CMD (a command
// that reads the prompt on stdin and prints the answer).

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { call, routes } from "../router.mjs";
import { agentFromEnv, record as prov } from "../../packages/core/provenance.mjs";
import { propose } from "../../schema/decisions.mjs";
import { ventureFile } from "../../packages/core/venture-paths.mjs";
import { recordPath } from "../../packages/records/index.mjs";

export const PLAN = ".release/migrate-plan.json";
const MAX_FILE = 512 * 1024;
const MAX_PROMPT = 200_000;
const SKIP = new Set(["node_modules", ".git", ".next", ".naive", "dist", "build", ".venv", "venv", "__pycache__"]);
// Never opened: credentials and keys, by name, whatever is in them.
export const SECRET = /(^|\/)(\.env(\..*)?|.*\.(pem|key|p12|pfx|secret)|id_rsa.*|id_ed25519.*|credentials(\.json)?|\.npmrc|\.netrc)$/i;
const ANSWERS = { bring: "bring in", point: "point to them", leave: "leave them" };
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
const functionOf = (route) => route.split("/")[0];

/** The project's readable text files; what it will not read is listed with why. */
export function scan(src) {
  const files = [], skipped = [];
  const walk = (rel) => {
    for (const e of readdirSync(join(src, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? join(rel, e.name) : e.name;
      if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.startsWith(".")) walk(r); continue; }
      if (!e.isFile()) continue;
      if (SECRET.test(r)) { skipped.push({ from: r, why: "looks like a secret, so it was not opened" }); continue; }
      if (e.name.startsWith(".")) continue;
      if (statSync(join(src, r)).size > MAX_FILE) { skipped.push({ from: r, why: `larger than ${MAX_FILE / 1024} KB` }); continue; }
      const buf = readFileSync(join(src, r));
      if (buf.includes(0)) { skipped.push({ from: r, why: "not text, so the agent cannot read it" }); continue; }
      files.push({ path: r, text: buf.toString("utf8") });
    }
  };
  walk("");
  return { files, skipped };
}

/** Runs the agent on a prompt and returns its text. A login problem or refusal is an error that says so. */
export function runAgent(prompt) {
  const cmd = process.env.MENTURA_AGENT_CMD ? process.env.MENTURA_AGENT_CMD.split(" ") : ["claude", "-p", "--output-format", "json", "--tools", "", "--strict-mcp-config"];
  const p = spawnSync(cmd[0], cmd.slice(1), { input: prompt, encoding: "utf8", maxBuffer: 1 << 26 });
  if (p.error) throw new Error(`could not run the agent (${cmd[0]}): ${p.error.message}`);
  let text = p.stdout;
  try { const r = JSON.parse(p.stdout); if (r && typeof r.result === "string") { if (r.is_error) throw new Error(`the agent stopped: ${r.result}`); text = r.result; } }
  catch (e) { if (e.message.startsWith("the agent stopped")) throw e; }
  if (p.status !== 0) throw new Error(`the agent stopped with status ${p.status}: ${(p.stderr || text).trim().slice(0, 500)}${/login/i.test(p.stderr + text) ? " (run claude, then /login)" : ""}`);
  return text;
}

// The routes a migrated record can be written to: JSON records the router can write.
const writable = () => routes().filter((r) => r.kind === "record" && r.record && r.actions.includes("write") && r.files?.some((g) => g.endsWith(".json")) && r.collection !== "list" && r.record !== "provenance");

/** The plan for migrating `from` into the venture at `dir`: the agent's records, checked against the routes. */
export function plan(from, dir, { agent = runAgent } = {}) {
  const src = resolve(from);
  if (!existsSync(src) || !statSync(src).isDirectory()) throw new Error(`${from} is not a directory`);
  if (!existsSync(join(dir, "venture.json"))) throw new Error(`${dir} is not a venture: create one first with naive init`);
  if (resolve(dir).startsWith(src + sep) || resolve(dir) === src) throw new Error("the venture cannot sit inside the project it migrates from");
  const { files, skipped } = scan(src);
  const left = [...skipped], given = [];
  let size = 0;
  for (const f of files) {
    if (size + f.text.length > MAX_PROMPT) { left.push({ from: f.path, why: "past what one agent pass reads; migrate the rest in another pass" }); continue; }
    size += f.text.length; given.push(f);
  }
  const rs = writable();
  const schemaOf = (r) => { try { return load(recordPath(r.schema)); } catch { return null; } };
  const prompt = `You are moving an existing project into Naive, a venture development framework. Read the files below and rewrite what they contain as Naive records.

Rules:
- Use only the routes listed, and make each record match its JSON schema exactly. For a route with [id], put the id in the route (product/kettle).
- Use only what the files say. Do not invent facts; leave out a field you cannot fill from them.
- One file can feed several records, and several files can feed one.
- Every file you do not use goes in left_behind, with why.
Answer with JSON only, no prose: {"items": [{"route": "...", "from": ["path", ...], "record": {...}, "reshaping": "what you changed and why", "confidence": 0.0-1.0}], "left_behind": [{"from": "path", "why": "..."}]}

Routes and schemas: ${JSON.stringify(rs.map((r) => ({ route: r.route, record: r.record, schema: schemaOf(r) })))}

Files: ${JSON.stringify(Object.fromEntries(given.map((f) => [f.path, f.text])))}`;
  const text = agent(prompt);
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0) throw new Error(`the agent did not answer with JSON: ${text.trim().slice(0, 300)}`);
  const answer = JSON.parse(text.slice(start, end + 1));
  const known = new Map(rs.map((r) => [r.route, r]));
  const items = [], used = new Set();
  for (const it of answer.items ?? []) {
    const base = it.route?.replace(/\/[a-z0-9-]+$/, "/[id]");
    const r = known.get(it.route) ?? (known.get(base)?.collection === "item" ? known.get(base) : null);
    const cited = (it.from ?? []).filter((p) => given.some((f) => f.path === p));
    if (!r || !cited.length || typeof it.record !== "object") { left.push({ from: (it.from ?? []).join(", ") || "(none)", why: `the agent proposed ${it.route ?? "no route"}, which is not a record route or cites no file it was given` }); continue; }
    cited.forEach((p) => used.add(p));
    items.push({ id: `m-${items.length + 1}`, from: cited, route: it.route, record: it.record, reshaping: String(it.reshaping ?? ""), confidence: Number(it.confidence ?? 0.5), status: "planned" });
  }
  for (const l of answer.left_behind ?? []) if (l?.from) { used.add(l.from); left.push({ from: l.from, why: String(l.why ?? "the agent left it") }); }
  for (const f of given) if (!used.has(f.path)) left.push({ from: f.path, why: "the agent did not place it" });
  return { from: src, venture: load(join(dir, "venture.json")).id, at: new Date().toISOString(), items, left_behind: left };
}

/** Writes the plan into the venture and proposes one open decision per function it touches. */
export function proposeDecisions(dir, p) {
  mkdirSync(join(dir, dirname(PLAN)), { recursive: true });
  writeFileSync(ventureFile(dir, PLAN), JSON.stringify(p, null, 2) + "\n");
  prov(dir, /** @type {Parameters<typeof prov>[1]} */ ({ entity: PLAN, activity: "draft", agent: agentFromEnv("agent", "migrate", { id: "naive-migrate" }), note: `migrate plan from ${p.from}: ${p.items.length} records, ${p.left_behind.length} left behind` }));
  const groups = new Map();
  for (const it of p.items) groups.set(functionOf(it.route), [...(groups.get(functionOf(it.route)) ?? []), it]);
  const proposed = [];
  for (const [fn, its] of groups) {
    const r = propose(dir, {
      id: `migrate-${fn}`,
      question: `Migrate ${its.length} record${its.length === 1 ? "" : "s"} from ${basename(p.from)} into ${fn}, as ${PLAN} plans them?`,
      options: Object.values(ANSWERS), answer: ANSWERS.bring, decides: { path: PLAN },
      note: its.map((it) => `${it.id}: ${it.from.join(", ")} -> ${it.route}`).join("; "),
    }, /** @type {Parameters<typeof propose>[2]} */ ({ agentId: "naive-migrate", via: "migrate" }));
    if (!r.ok) throw new Error(r.error);
    proposed.push(r.result.proposed);
  }
  return proposed;
}

const answerOf = (d) => { const a = String(d?.answer ?? "").toLowerCase(); return a.startsWith("point") ? "point" : a.startsWith("leave") ? "leave" : a.startsWith("bring") ? "bring" : null; };

/** Writes what a person decided, through the router. Open decisions wait. */
export async function apply(dir) {
  const p = load(ventureFile(dir, PLAN));
  const decisionOf = (fn) => { const f = join(ventureFile(dir, "decisions"), `migrate-${fn}.decision.json`); return existsSync(f) ? load(f) : null; };
  const done = { brought: 0, drafted: 0, pointed: 0, left: 0, waiting: 0, failed: 0 };
  let pointed = false;
  for (const it of p.items.filter((x) => x.status === "planned")) {
    const d = decisionOf(functionOf(it.route));
    if (d?.status !== "decided") { done.waiting++; continue; }
    const a = answerOf(d);
    if (a === "leave" || !a) { it.status = "left"; done.left++; continue; }
    if (a === "point") { it.status = "pointed"; pointed = true; done.pointed++; continue; }
    const r = await call({ workspace: dirname(dir), venture: basename(dir), route: it.route, action: "write", input: it.record, actor: "agent", actor_id: "naive-migrate", via: "migrate",
      provenance: { note: `migrated from ${it.from.map((f) => join(p.from, f)).join(", ")}: ${it.reshaping}`, decision: d.id, derived_from: it.from.map((f) => `file://${join(p.from, f)}`) } });
    if (!r.ok) { it.status = "failed"; it.why = r.error; done.failed++; continue; }
    it.status = r.result?.draft ? "drafted" : "brought";
    it.at = r.result?.draft ?? r.result?.written;
    done[it.status]++;
  }
  if (pointed) {
    const f = join(ventureFile(dir, "knowledge/sources.json"));
    const s = existsSync(f) ? load(f) : { sources: [], records: {} };
    const id = slug(basename(p.from));
    if (!s.sources.some((x) => x.id === id)) s.sources.push({ id, connector: "filesystem", writes: "none", root: p.from, note: "migrate: a person chose to point to these files rather than rewrite them" });
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, JSON.stringify(s, null, 2) + "\n");
    prov(dir, /** @type {Parameters<typeof prov>[1]} */ ({ entity: "knowledge/sources.json", activity: "write", agent: agentFromEnv("agent", "migrate", { id: "naive-migrate" }), note: `points to ${p.from}, read-only` }));
  }
  writeFileSync(ventureFile(dir, PLAN), JSON.stringify(p, null, 2) + "\n");
  return done;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(`--${k}`); return i < 0 ? undefined : args[i + 1]; };
  const dir = opt("venture");
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node interface/orchestration/migrate-venture.mjs --from <project> --venture <dir> | --venture <dir> --apply"); process.exit(2); }
  try {
    if (args.includes("--apply")) {
      if (!existsSync(ventureFile(dir, PLAN))) { console.error(`no plan at ${ventureFile(dir, PLAN)}: run with --from first`); process.exit(1); }
      const d = await apply(dir);
      console.log(Object.entries(d).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ") || "nothing to do");
    } else {
      if (!opt("from")) { console.error("--from <project> is needed to write a plan"); process.exit(2); }
      const p = plan(opt("from"), dir);
      const decisions = proposeDecisions(dir, p);
      for (const i of p.items) console.log(`${i.id}  ${i.from.join(", ")}  ->  ${i.route}   (${i.reshaping})`);
      for (const l of p.left_behind) console.log(`left  ${l.from}   (${l.why})`);
      console.log(`\n${p.items.length} records planned, ${p.left_behind.length} left behind. Nothing is written yet.`);
      if (decisions.length) console.log(`Read ${relative(process.cwd(), ventureFile(dir, PLAN))}, then decide ${decisions.join(", ")} with mentura decide (answer "bring in", "point to them" or "leave them"), then run with --apply.`);
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}
