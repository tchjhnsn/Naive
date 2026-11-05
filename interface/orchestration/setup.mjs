// Setup (EE-083): the questions that establish a venture's structure, in order: its people and their
// hats, where each function keeps its truth, the strategic foundation and the first decisions (the decision
// docket), and a goal for the discovery phase. It holds no view. The naive-setup skill
// (interface/skills/naive-setup) renders it in the model's harness, as a Claude artifact where there is one;
// interface/dev/setup.mjs serves the same state to a browser.
//
//   node interface/orchestration/setup.mjs <venture dir> state                     the state, as JSON
//   node interface/orchestration/setup.mjs <venture dir> artifact                  the state rendered into the skill's artifact template
//   node interface/orchestration/setup.mjs <venture dir> answer <decision id> <the founder's words> [--via mcp]
//   node interface/orchestration/setup.mjs <venture dir> point <function> <system> [address] [--via mcp]
//   node interface/orchestration/setup.mjs <venture dir> confirm [--yes]          confirm the answers the model relayed, as the founder

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { sync, syncCommand } from "../../packages/core/sync.mjs";
import { ventureFile } from "../../packages/core/venture-paths.mjs";

const repo = new URL("../..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
export const TEMPLATE = "interface/skills/naive-setup/artifact.html";

const GOAL = "discovery-goal";

export async function state(dir) {
  const { decisions } = await import("../../schema/decisions.mjs");
  const v = load(join(dir, "venture.json"));
  const people = existsSync(join(ventureFile(dir, "people/people.json"))) ? load(join(ventureFile(dir, "people/people.json"))) : null;
  const sources = existsSync(join(ventureFile(dir, "knowledge/sources.json"))) ? load(join(ventureFile(dir, "knowledge/sources.json"))) : { sources: [], records: {} };
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
    catalog, docket: now.map((d) => ({ id: d.id, question: d.question, source: d.source, status: d.status, options: d.options ?? [], answer: d.answer ?? null, why: d.why ?? [], statement: d.statement ?? null, relayed: relayed(d) })),
    // Answers the model wrote down from the founder's words; they wait for the founder to confirm them.
    waiting: [...now, ...(goal ? [goal] : [])].filter(relayed).map((d) => ({ id: d.id, question: d.question, answer: d.answer })),
    later: docket.filter((d) => d.render !== "now" && d.status !== "decided").length,
    goal: goal ? { status: goal.status, answer: goal.answer ?? null, relayed: relayed(goal) } : null,
    steps, done: Object.values(steps).every(Boolean), counts: { settled, of: now.length },
    // The systems the app named a sync command for (packages/core/sync.mjs): pointing at one syncs it.
    syncs: Object.keys(catalog.systems).filter((s) => syncCommand(s)),
  };
}

// An open decision whose wording an agent wrote: in setup, the founder's words the model relayed.
const relayed = (d) => d.status !== "decided" && !!d.answer && d.provenance?.drafted_by?.kind === "agent";

// One answer: a decision on file is approved; a foundation statement (or the goal) becomes a decision a person approves.
export async function decide(dir, { id, answer, via = "api", where = "/setup" }) {
  const { approve, decisions, founderName, propose } = await import("../../schema/decisions.mjs");
  if (!answer || !String(answer).trim()) return { ok: false, error: "write an answer first" };
  const by = founderName(dir);
  const d = decisions(dir).decisions.find((x) => x.id === id);
  if (id === GOAL && !d) {
    const p = propose(dir, { id: GOAL, question: "What must be true for the venture to leave discovery? Name the goal this phase works toward.", decides: { record: "exit-criteria", path: "foundation/exit-criteria/discovery.json" }, layer: "purpose", needed_in: "discovery", boundary: "fail-open" }, { via });
    if (!p.ok) return p;
    return approve(dir, GOAL, /** @type {Parameters<typeof approve>[2]} */ ({ by, answer: String(answer).trim(), via, note: `set at ${where}` }));
  }
  if (!d) return { ok: false, error: `no decision ${id}` };
  if (d.source === "foundation") {
    const sid = id.replace(/^foundation-/, "");
    const did = `statement-${sid}`;
    const p = propose(dir, { id: did, question: d.question, statement: sid, decides: d.decides, layer: d.layer === "system" ? "purpose" : d.layer, needed_in: d.needed_in }, { via });
    if (!p.ok) return p;
    return approve(dir, did, /** @type {Parameters<typeof approve>[2]} */ ({ by, answer: String(answer).trim(), via, note: `the founder's words at ${where}` }));
  }
  return approve(dir, id, /** @type {Parameters<typeof approve>[2]} */ ({ by, answer: String(answer).trim(), via, note: `decided at ${where}` }));
}

// One pointer: where a function keeps its truth, merged into knowledge/sources.json through the router.
/**
 * @param {string} dir
 * @param {{ fn: string, system: string, address: string, via?: string, actor?: string, agentId?: string }} p
 */
export async function point(dir, { fn, system, address, via = "api", actor = "person", agentId }) {
  const catalog = load(join(repo, "schema/systems-catalog.json"));
  if (!catalog.functions[fn]?.includes(system)) return { ok: false, error: `${system} is not offered for ${fn}` };
  const file = join(ventureFile(dir, "knowledge/sources.json"));
  const map = existsSync(file) ? load(file) : { sources: [], records: {}, truth: "local" };
  const f = (map.functions ??= {})[fn] ??= { systems: [] };
  const entry = { system, ...(address ? { address } : {}), status: "pointed" };
  const synced = sync(system, dir);
  if (synced.ran && synced.ok) Object.assign(entry, { status: "connected", synced: new Date().toISOString().replace(/\.\d+Z$/, "Z"), ...(synced.fixture ? { fixture: true } : {}), ...(address || synced.address ? { address: address || synced.address } : {}) });
  f.systems = [...f.systems.filter((s) => s.system !== system), entry];
  const { call } = await import("../router.mjs");
  const r = await call({ workspace: dirname(dir), venture: basename(dir), route: "knowledge/knowledge-sources", action: "write", input: map, actor, ...(agentId ? { actor_id: agentId } : {}), via, provenance: { note: `${fn}: ${system}${address ? ` at ${address}` : ""} (${entry.status})` } });
  return r.ok ? { ok: true, result: entry } : r;
}

/** The model relays the founder's answer: proposed with the founder's words as its wording, by an agent,
 *  so it stays open until the founder confirms it (an agent never decides, EE-058). */
export async function relay(dir, { id, answer, agentId, harness, model }) {
  const { decisions, propose } = await import("../../schema/decisions.mjs");
  if (!answer || !String(answer).trim()) return { ok: false, error: "pass the founder's answer, in their words" };
  const words = String(answer).trim();
  const note = `the founder's words, relayed from ${harness ?? "the model's harness"} during setup`;
  const opts = { agentId, via: "mcp", harness, model };
  const d = decisions(dir).decisions.find((x) => x.id === id);
  if (id === GOAL) return propose(dir, { ...(d ? {} : { decides: { record: "exit-criteria", path: "foundation/exit-criteria/discovery.json" }, layer: "purpose", needed_in: "discovery", boundary: "fail-open" }), id: GOAL, question: d?.question ?? "What must be true for the venture to leave discovery? Name the goal this phase works toward.", answer: words, note }, opts);
  if (!d) return { ok: false, error: `no decision ${id}` };
  if (d.status === "decided") return { ok: false, error: `${id} is decided; only the founder can change it` };
  if (d.source === "foundation") {
    const sid = id.replace(/^foundation-/, "");
    return propose(dir, { id: `statement-${sid}`, question: d.question, statement: sid, decides: d.decides, layer: d.layer === "system" ? "purpose" : d.layer, needed_in: d.needed_in, answer: words, note }, opts);
  }
  return propose(dir, { id, question: d.question, answer: words, note }, opts);
}

/** The founder confirms the answers the model relayed, at the keyboard: each becomes a decision they made.
 *  @param {string} dir @param {{ by?: string }} [opts] */
export async function confirm(dir, { by } = {}) {
  by ??= (await import("../../schema/decisions.mjs")).founderName(dir);
  const { approve } = await import("../../schema/decisions.mjs");
  const out = [];
  for (const w of (await state(dir)).waiting) {
    const r = approve(dir, w.id, /** @type {Parameters<typeof approve>[2]} */ ({ by, via: "cli", note: `confirmed at setup: ${by}'s words, relayed by the model` }));
    if (!r.ok) return { ...r, confirmed: out };
    out.push(w.id);
  }
  return { ok: true, result: { confirmed: out, by } };
}

/** The state rendered into the skill's artifact template: one self-contained page, no network. */
export async function artifact(dir) {
  const s = await state(dir);
  const data = JSON.stringify(s).replace(/</g, "\\u003c");
  return readFileSync(join(repo, TEMPLATE), "utf8").replace("__NAIVE_SETUP_STATE__", () => data);
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const [dirArg, cmd, ...rest] = process.argv.slice(2);
  const flag = (n) => { const i = rest.indexOf(`--${n}`); if (i < 0) return undefined; const v = rest[i + 1]; rest.splice(i, 2); return v; };
  const via = flag("via") ?? "cli";
  if (!["cli", "mcp", "api"].includes(via)) { console.error(`--via is cli, mcp or api, not ${via}`); process.exit(2); }
  if (!dirArg || !existsSync(join(dirArg, "venture.json"))) { console.error("usage: node interface/orchestration/setup.mjs <venture dir> state|artifact|answer|point|confirm ..."); process.exit(2); }
  const dir = resolve(dirArg);
  let r;
  if (cmd === "state") r = { ok: true, result: await state(dir) };
  else if (cmd === "artifact") { process.stdout.write(await artifact(dir)); process.exit(0); }
  else if (cmd === "answer") r = await decide(dir, { id: rest[0], answer: rest.slice(1).join(" "), via, where: via === "mcp" ? "setup in the model's harness" : "setup" });
  else if (cmd === "confirm") {
    const waiting = (await state(dir)).waiting;
    if (!waiting.length) { console.log("Nothing waits for you to confirm."); process.exit(0); }
    for (const w of waiting) console.log(`\n  ${w.question}\n  > ${w.answer}`);
    let yes = rest.includes("--yes");
    if (!yes) {
      const { createInterface } = await import("node:readline/promises");
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      yes = (await rl.question(`\nAre these ${waiting.length} answers yours, as written? Type yes to confirm them: `)).trim().toLowerCase() === "yes";
      rl.close();
    }
    if (!yes) { console.log("Nothing confirmed. Change an answer in the chat, or run this again."); process.exit(1); }
    r = await confirm(dir);
  }
  else if (cmd === "point") r = await point(dir, { fn: rest[0], system: rest[1], address: rest[2], via });
  else { console.error(`unknown command ${cmd}: state, artifact, answer, point or confirm`); process.exit(2); }
  console.log(JSON.stringify(r.ok && cmd === "state" ? r.result : r, null, 2));
  process.exit(r.ok ? 0 : 1);
}
