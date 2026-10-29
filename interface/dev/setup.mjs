// The setup page (EE-083): what `naive dev` serves at /setup, the way next dev serves a first page. It
// walks a founder through establishing the venture's structure, in order: the venture and its people,
// where each function keeps its truth, the strategic foundation and the first decisions (the decision
// docket), and a goal for the discovery phase. Every answer is written as the code would write it:
// a decision a person approves (schema/decisions.mjs), or knowledge/sources.json through the router, with
// provenance. When the docket's first decisions are settled, the page says the structure is established
// and what comes next.
//
//   handle(req, res, dir) -> true when it answered a /setup request

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const repo = new URL("../..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const body = (req) => new Promise((ok) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { try { ok(JSON.parse(b || "{}")); } catch { ok({}); } }); });
const GOAL = "discovery-goal";

async function state(dir) {
  const { decisions } = await import("../../schema/decisions.mjs");
  const v = load(join(dir, "venture.json"));
  const people = existsSync(join(dir, "people/people.json")) ? load(join(dir, "people/people.json")) : null;
  const sources = existsSync(join(dir, "knowledge/sources.json")) ? load(join(dir, "knowledge/sources.json")) : { sources: [], records: {} };
  const catalog = load(join(repo, "schema/systems-catalog.json"));
  const types = load(join(repo, "schema/venture-types.json")).types;
  const all = decisions(dir).decisions;
  // The roots (venture, foundation) structure the docket; they are not questions to answer here.
  const docket = all.filter((d) => d.id !== GOAL && d.status !== "deferred" && !["venture", "foundation"].includes(d.id));
  const now = docket.filter((d) => d.render === "now" || d.status === "decided");
  const goal = all.find((d) => d.id === GOAL) ?? null;
  const settled = now.filter((d) => d.status === "decided").length;
  const pointed = Object.values(sources.functions ?? {}).filter((f) => f.systems.length).length;
  const steps = { venture: true, people: !!people, truth: pointed > 0, docket: now.length > 0 && settled === now.length, goal: goal?.status === "decided" };
  return {
    venture: { id: v.id, name: v.name, phase: v.phase, type: types.find((t) => t.id === v.type) ?? null },
    people, functions: sources.functions ?? {}, truth: sources.truth ?? "local",
    catalog, docket: now.map((d) => ({ id: d.id, question: d.question, source: d.source, status: d.status, options: d.options ?? [], answer: d.answer ?? null, why: d.why ?? [], statement: d.statement ?? null })),
    later: docket.filter((d) => d.render !== "now" && d.status !== "decided").length,
    goal: goal ? { status: goal.status, answer: goal.answer ?? null } : null,
    steps, done: Object.values(steps).every(Boolean), counts: { settled, of: now.length },
    rho: existsSync(join(repo, "platform/integrations/rho.mjs")),
  };
}

const founderName = (dir) => existsSync(join(dir, "people/people.json")) ? load(join(dir, "people/people.json")).people[0]?.name ?? "Founder" : "Founder";

// One answer: a decision on file is approved; a foundation statement (or the goal) becomes a decision a person approves.
async function decide(dir, { id, answer }) {
  const { approve, decisions, propose } = await import("../../schema/decisions.mjs");
  if (!answer || !String(answer).trim()) return { ok: false, error: "write an answer first" };
  const by = founderName(dir);
  const d = decisions(dir).decisions.find((x) => x.id === id);
  if (id === GOAL && !d) {
    const p = propose(dir, { id: GOAL, question: "What must be true for the venture to leave discovery? Name the goal this phase works toward.", decides: { record: "telos", path: "foundation/telos.json" }, layer: "purpose", needed_in: "discovery", boundary: "fail-open" }, { via: "api" });
    if (!p.ok) return p;
    return approve(dir, GOAL, { by, answer: String(answer).trim(), via: "api", note: "set at /setup" });
  }
  if (!d) return { ok: false, error: `no decision ${id}` };
  if (d.source === "foundation") {
    const sid = id.replace(/^foundation-/, "");
    const did = `statement-${sid}`;
    const p = propose(dir, { id: did, question: d.question, statement: sid, decides: d.decides, layer: d.layer === "system" ? "purpose" : d.layer, needed_in: d.needed_in }, { via: "api" });
    if (!p.ok) return p;
    return approve(dir, did, { by, answer: String(answer).trim(), via: "api", note: "the founder's words at /setup" });
  }
  return approve(dir, id, { by, answer: String(answer).trim(), via: "api", note: "decided at /setup" });
}

// One pointer: where a function keeps its truth, merged into knowledge/sources.json through the router.
async function point(dir, { fn, system, address }) {
  const catalog = load(join(repo, "schema/systems-catalog.json"));
  if (!catalog.functions[fn]?.includes(system)) return { ok: false, error: `${system} is not offered for ${fn}` };
  const file = join(dir, "knowledge/sources.json");
  const map = existsSync(file) ? load(file) : { sources: [], records: {}, truth: "local" };
  const f = (map.functions ??= {})[fn] ??= { systems: [] };
  const entry = { system, ...(address ? { address } : {}), status: "pointed" };
  if (system === "rho" && existsSync(join(repo, "platform/integrations/rho.mjs"))) {
    const live = Boolean(process.env.RHO_API_TOKEN);
    const r = spawnSync("node", [join(repo, "platform/integrations/rho.mjs"), "sync", "--venture", dir, ...(live ? ["--live"] : [])], { encoding: "utf8", env: process.env });
    if (r.status === 0) Object.assign(entry, { status: "connected", synced: new Date().toISOString().replace(/\.\d+Z$/, "Z"), address: address || (live ? "live" : "sandbox") });
  }
  f.systems = [...f.systems.filter((s) => s.system !== system), entry];
  const { call } = await import("../router.mjs");
  const r = await call({ workspace: dirname(dir), venture: basename(dir), route: "knowledge/knowledge-sources", action: "write", input: map, actor: "person", via: "api", provenance: { note: `${fn}: ${system}${address ? ` at ${address}` : ""} (${entry.status})` } });
  return r.ok ? { ok: true, result: entry } : r;
}

export async function handle(req, res, dir) {
  const u = new URL(req.url, "http://x");
  if (!u.pathname.startsWith("/setup")) return false;
  if (u.pathname === "/setup" || u.pathname === "/setup/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(PAGE); return true; }
  if (u.pathname === "/setup/state") { json(res, 200, await state(dir)); return true; }
  if (req.method === "POST" && u.pathname === "/setup/decide") { const r = await decide(dir, await body(req)); json(res, r.ok ? 200 : 400, r); return true; }
  if (req.method === "POST" && u.pathname === "/setup/point") { const r = await point(dir, await body(req)); json(res, r.ok ? 200 : 400, r); return true; }
  json(res, 404, { error: "no such setup route" });
  return true;
}

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Set up your venture</title>
<style>
:root { --bg:#f6f7f4; --panel:#fff; --fg:#1d2320; --muted:#5d675f; --line:#d9ded8; --accent:#2f6b4f; --accent-soft:#e3efe8; --warn:#8a5a00; --warn-soft:#f6ecd8;
  --body: "Source Sans 3", system-ui, -apple-system, "Segoe UI", sans-serif; --mono: ui-monospace, "SF Mono", Menlo, monospace; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg:#121614; --panel:#1a201d; --fg:#e4e9e5; --muted:#9aa59d; --line:#2b332e; --accent:#86c4a3; --accent-soft:#1d2b24; --warn:#e3b25c; --warn-soft:#2c2414; color-scheme: dark; } }
* { box-sizing: border-box } body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.55 var(--body); }
.wrap { max-width: 860px; margin: 0 auto; padding: 32px max(16px, env(safe-area-inset-left)) 80px; display: grid; gap: 28px; }
header { display:grid; gap:6px } h1 { margin:0; font-size:1.9rem; letter-spacing:-.01em } h2 { margin:0 0 4px; font-size:1.2rem }
.muted { color: var(--muted) } .mono { font-family: var(--mono); font-size: .88em }
.progress { display:flex; gap:6px; flex-wrap:wrap } .step { font:600 .78rem/1 var(--mono); padding:7px 10px; border-radius:999px; border:1px solid var(--line); color:var(--muted) }
.step.ok { background: var(--accent-soft); color: var(--accent); border-color: transparent }
section { background: var(--panel); border:1px solid var(--line); border-radius:10px; padding:20px; display:grid; gap:14px }
table { width:100%; border-collapse: collapse; font-size:.95rem } td, th { text-align:left; padding:8px 6px; border-bottom:1px solid var(--line); vertical-align: top } th { font: 600 .74rem/1.2 var(--mono); text-transform: uppercase; letter-spacing:.05em; color: var(--muted) }
.pill { display:inline-block; font:600 .72rem/1 var(--mono); padding:4px 7px; border-radius:999px; background: var(--accent-soft); color: var(--accent); margin: 0 4px 4px 0 } .pill.pointed { background: var(--line); color: var(--fg) } .pill.none { background: var(--warn-soft); color: var(--warn) }
.card { border:1px solid var(--line); border-radius:8px; padding:14px; display:grid; gap:10px } .card.done { opacity:.75 }
.card .q { font-weight:600 } textarea, input, select { font: inherit; color: inherit; background: var(--bg); border:1px solid var(--line); border-radius:6px; padding:8px; width:100% }
.row { display:flex; gap:8px; flex-wrap:wrap; align-items:center } .row > * { flex: 1 1 140px }
button { font: 600 .92rem var(--body); background: var(--accent); color: var(--bg); border: 0; border-radius: 6px; padding: 9px 14px; cursor: pointer; flex: 0 0 auto }
button.ghost { background: transparent; color: var(--accent); border:1px solid var(--accent) } button:focus-visible, textarea:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }
.err { color: var(--warn); font-size: .9rem } .celebrate { text-align:center; padding: 32px 20px; display:grid; gap:10px; background: var(--accent-soft); border-color: transparent }
.celebrate .big { font-size: 2.2rem; font-weight: 700; color: var(--accent) } ol { margin:0; padding-left: 1.2em; display:grid; gap:6px; text-align:left }
@media (prefers-reduced-motion: no-preference) { .celebrate { animation: pop .5s ease-out } @keyframes pop { from { transform: scale(.97); opacity:.4 } to { transform: none; opacity:1 } } }
</style></head><body><div class="wrap" id="app"><p class="muted">Loading your venture…</p></div>
<script>
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" })[c]);
const post = (u, b) => fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json());
let S = null;
async function load() { S = await fetch("/setup/state").then((r) => r.json()); render(); }
function render() {
  const v = S.venture, st = S.steps;
  const label = (k, t) => '<span class="step ' + (st[k] ? "ok" : "") + '">' + (st[k] ? "✓ " : "") + t + "</span>";
  const people = S.people ? '<table><tr><th>Person</th><th>Role</th><th>Hats</th></tr>' + S.people.people.map((p) => "<tr><td>" + esc(p.name) + "</td><td class=mono>" + esc(p.role) + "</td><td>" + (p.hats.map((h) => '<span class="pill pointed">' + esc(h) + "</span>").join("") || '<span class="muted">none</span>') + "</td></tr>").join("") + "</table>" : '<p class="err">No people/people.json yet: create the venture with create-venture.</p>';
  const fns = [...new Set([...Object.keys(S.catalog.functions).filter((f) => f === "legal" || (S.people?.people ?? []).some((p) => p.hats.includes(f))), ...Object.keys(S.functions)])];
  const truth = '<table><tr><th>Function</th><th>Source of truth</th></tr>' + fns.map((f) => { const x = S.functions[f]; const sys = x?.systems?.length ? x.systems.map((s) => '<span class="pill ' + (s.status === "connected" ? "" : "pointed") + '">' + esc(S.catalog.systems[s.system]?.label ?? s.system) + (s.address ? " · " + esc(s.address) : "") + " · " + s.status + (s.fixture ? " (fixture)" : "") + "</span>").join("") : '<span class="pill none">none yet</span>' + (x?.note ? ' <span class="muted">' + esc(x.note) + "</span>" : ""); return "<tr><td>" + esc(f === "legal" ? "legal documents" : f) + "</td><td>" + sys + "</td></tr>"; }).join("") + "</table>"
    + '<div class="row"><select id="fn">' + fns.map((f) => "<option>" + f + "</option>").join("") + '</select><select id="sys"></select><input id="addr" placeholder="address, such as acme/web"><button id="point">Point</button></div><div class="err" id="perr"></div>';
  const cards = S.docket.map((d) => '<div class="card ' + (d.status === "decided" ? "done" : "") + '" data-id="' + esc(d.id) + '"><div class="q">' + esc(d.question) + "</div>" + (d.status === "decided" ? '<div>✓ <span class="muted">' + esc(d.answer) + "</span></div>" : (d.options.length ? '<div class="row">' + d.options.map((o) => '<button class="ghost opt">' + esc(o) + "</button>").join("") + "</div>" : "") + '<textarea rows="2" placeholder="In your own words"></textarea><div class="row"><button class="ans">Save</button><span class="err"></span></div>') + "</div>").join("");
  const goal = S.goal?.status === "decided" ? '<p>✓ ' + esc(S.goal.answer) + "</p>" : '<textarea id="goal" rows="2" placeholder="For example: ten clinic owners confirm the scheduling problem in interviews by December"></textarea><div class="row"><button id="setgoal">Set the goal</button><span class="err" id="gerr"></span></div>';
  const done = S.done ? '<section class="celebrate"><div class="big">Your venture is structured.</div><p>' + esc(v.name) + " has its people and their hats, a source of truth for its functions, a settled foundation, and a goal for discovery. Every decision from here routes through the docket.</p><ol><li>Run <span class=mono>npm run dev</span> and keep the board open: decisions waiting on you show there first.</li><li>Orient each next decision around the discovery goal; a sprint or campaign is a set of decisions toward it.</li><li>To operate the venture with your team and agents (tasks, documents, money and people in one workspace), connect it to Mentura.</li></ol>" + (S.later ? '<p class="muted">' + S.later + " more decisions come later, as the venture needs them.</p>" : "") + "</section>" : "";
  $("#app").innerHTML = '<header><span class="muted mono">' + esc(v.type?.label ?? "venture") + " · " + esc(v.phase) + '</span><h1>Set up ' + esc(v.name) + '</h1><p class="muted">Establish the structure of your venture. Each answer is saved as you go.</p><div class="progress">' + label("people", "People and hats") + label("truth", "Sources of truth") + label("docket", "Foundation and first decisions " + S.counts.settled + "/" + S.counts.of) + label("goal", "Discovery goal") + "</div></header>" + done
    + "<section><h2>1. People and hats</h2>" + people + "</section>"
    + '<section><h2>2. Sources of truth</h2><p class="muted">Point Naive at where each function keeps its truth. Naive keeps pointers, never copies; Rho is read through its API.</p>' + truth + "</section>"
    + '<section><h2>3. Foundation and first decisions</h2><p class="muted">The decision docket: what the venture must settle first, in order.</p>' + cards + "</section>"
    + '<section><h2>4. A goal for discovery</h2><p class="muted">What must be true to leave discovery? Every decision after this one works toward it.</p>' + goal + "</section>";
  const sysFor = () => { $("#sys").innerHTML = (S.catalog.functions[$("#fn").value] ?? []).map((s) => '<option value="' + s + '">' + esc(S.catalog.systems[s].label) + "</option>").join(""); $("#addr").placeholder = S.catalog.systems[$("#sys").value]?.address ?? "address"; };
  $("#fn").onchange = sysFor; sysFor(); $("#sys").onchange = () => ($("#addr").placeholder = S.catalog.systems[$("#sys").value]?.address ?? "address");
  $("#point").onclick = async () => { const r = await post("/setup/point", { fn: $("#fn").value, system: $("#sys").value, address: $("#addr").value.trim() || undefined }); if (!r.ok) $("#perr").textContent = r.error; else load(); };
  document.querySelectorAll(".card").forEach((c) => {
    const id = c.dataset.id, ta = c.querySelector("textarea");
    c.querySelectorAll(".opt").forEach((b) => (b.onclick = () => { ta.value = b.textContent; }));
    const save = c.querySelector(".ans"); if (save) save.onclick = async () => { const r = await post("/setup/decide", { id, answer: ta.value }); if (!r.ok) c.querySelector(".err").textContent = r.error; else load(); };
  });
  const g = $("#setgoal"); if (g) g.onclick = async () => { const r = await post("/setup/decide", { id: "${GOAL}", answer: $("#goal").value }); if (!r.ok) $("#gerr").textContent = r.error; else load(); };
}
load();
</script></body></html>`;
