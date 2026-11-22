// Setup (EE-083): the questions that establish a venture's structure, in order: its people and their
// hats, where each function keeps its truth, the strategic foundation and the first decisions (the decision
// docket), and a goal for the discovery phase. It holds no view. The naive-setup skill
// (packages/naive/src/interfaces/skills/naive-setup) renders it in the model's harness, as a Claude artifact where there is one;
// packages/naive/src/interfaces/dev/setup.ts serves the same state to a browser.
//
//   node packages/naive/src/router/orchestration/setup.ts <venture dir> state                     the state, as JSON
//   node packages/naive/src/router/orchestration/setup.ts <venture dir> artifact                  the state rendered into the skill's artifact template
//   node packages/naive/src/router/orchestration/setup.ts <venture dir> answer <decision id> <the founder's words> [--via mcp]
//   node packages/naive/src/router/orchestration/setup.ts <venture dir> point <function> <system> [address] [--via mcp]
//   node packages/naive/src/router/orchestration/setup.ts <venture dir> confirm [--yes]          confirm the answers the model relayed, as the founder

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { sync, syncCommand } from "../../core/sync.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import type { KnowledgeSources, People, SystemsCatalog, Venture, VentureTypes } from "../../records/types/records.d.ts";
import type { ProposeInput, RankedDecision } from "../../engine/decisions.ts";

type Functions = NonNullable<KnowledgeSources["functions"]>;
/** Where one function keeps its truth, in knowledge/sources.json. */
type FunctionTruth = NonNullable<Functions[keyof Functions]>;
type SystemPointer = FunctionTruth["systems"][number];
/** A decision as decisions() lists it, with only the fields setup reads. */
type Dec = RankedDecision & { options?: string[]; statement?: string | null };
/** An answer from the decision engine or the router. */
type Answer = { ok: boolean; result?: unknown; error?: unknown; [k: string]: unknown };

const repo = new URL("../../../../..", import.meta.url).pathname;
const load = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));
export const TEMPLATE = "packages/naive/src/interfaces/skills/naive-setup/artifact.html";

const GOAL = "discovery-goal";

export async function state(dir: string) {
  const { decisions } = await import("../../engine/decisions.ts");
  const v = load(join(dir, "venture.json")) as Venture;
  const people = existsSync(join(ventureFile(dir, "people/people.json"))) ? load(join(ventureFile(dir, "people/people.json"))) as People : null;
  const sources: KnowledgeSources = existsSync(join(ventureFile(dir, "knowledge/sources.json"))) ? load(join(ventureFile(dir, "knowledge/sources.json"))) as KnowledgeSources : { sources: [], records: {} };
  const catalog = load(join(repo, "packages/naive/src/engine/systems-catalog.json")) as SystemsCatalog;
  const types = (load(join(repo, "packages/naive/src/engine/venture-types.json")) as VentureTypes).types;
  const all: Dec[] = decisions(dir).decisions;
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
    // The systems the app named a sync command for (packages/naive/src/core/sync.ts): pointing at one syncs it.
    syncs: Object.keys(catalog.systems).filter((s) => syncCommand(s)),
  };
}

// An open decision whose wording an agent wrote: in setup, the founder's words the model relayed.
const relayed = (d: Dec) => d.status !== "decided" && !!d.answer && d.provenance?.drafted_by?.kind === "agent";

// One answer: a decision on file is approved; a foundation statement (or the goal) becomes a decision a person approves.
export async function decide(dir: string, { id, answer, via = "api", where = "/setup" }: { id: string; answer?: unknown; via?: string; where?: string }): Promise<Answer> {
  const { approve, decisions, founderName, propose } = await import("../../engine/decisions.ts");
  if (!answer || !String(answer).trim()) return { ok: false, error: "write an answer first" };
  const by = founderName(dir);
  const d = (decisions(dir).decisions as Dec[]).find((x) => x.id === id);
  if (id === GOAL && !d) {
    const p = propose(dir, { id: GOAL, question: "What must be true for the venture to leave discovery? Name the goal this phase works toward.", decides: { record: "exit-criteria", path: "foundation/exit-criteria/discovery.json" }, layer: "purpose", needed_in: "discovery", boundary: "fail-open" }, { via });
    if (!p.ok) return p;
    return approve(dir, GOAL, { by, answer: String(answer).trim(), via, note: `set at ${where}` } as Parameters<typeof approve>[2]);
  }
  if (!d) return { ok: false, error: `no decision ${id}` };
  // The door checks the proposal against the decision schema, so a resolved decision's null record or phase passes through to it as before.
  if (d.source === "foundation") {
    const sid = id.replace(/^foundation-/, "");
    const did = `statement-${sid}`;
    const p = propose(dir, { id: did, question: d.question, statement: sid, decides: d.decides as ProposeInput["decides"], layer: d.layer === "system" ? "purpose" : d.layer, needed_in: d.needed_in as string | undefined }, { via });
    if (!p.ok) return p;
    return approve(dir, did, { by, answer: String(answer).trim(), via, note: `the founder's words at ${where}` } as Parameters<typeof approve>[2]);
  }
  return approve(dir, id, { by, answer: String(answer).trim(), via, note: `decided at ${where}` } as Parameters<typeof approve>[2]);
}

// One pointer: where a function keeps its truth, merged into knowledge/sources.json through the router.
export async function point(dir: string, { fn, system, address, via = "api", actor = "person", agentId }: { fn: string; system: string; address?: string; via?: string; actor?: string; agentId?: string }): Promise<Answer> {
  const catalog = load(join(repo, "packages/naive/src/engine/systems-catalog.json")) as SystemsCatalog;
  if (!(catalog.functions as Record<string, string[] | undefined>)[fn]?.includes(system)) return { ok: false, error: `${system} is not offered for ${fn}` };
  const file = join(ventureFile(dir, "knowledge/sources.json"));
  const map: KnowledgeSources = existsSync(file) ? load(file) as KnowledgeSources : { sources: [], records: {}, truth: "local" };
  // A function id the catalog offers is a key of functions; the router checks the map against its schema on write.
  const f = ((map.functions ??= {}) as Record<string, FunctionTruth | undefined>)[fn] ??= { systems: [] };
  const entry: SystemPointer = { system, ...(address ? { address } : {}), status: "pointed" };
  const synced = sync(system, dir);
  if (synced.ran && synced.ok) Object.assign(entry, { status: "connected", synced: new Date().toISOString().replace(/\.\d+Z$/, "Z"), ...(synced.fixture ? { fixture: true } : {}), ...(address || synced.address ? { address: address || synced.address } : {}) });
  f.systems = [...f.systems.filter((s) => s.system !== system), entry];
  const { call } = await import("../router.ts");
  const r = await call({ workspace: dirname(dir), venture: basename(dir), route: "knowledge/knowledge-sources", action: "write", input: map, actor, ...(agentId ? { actor_id: agentId } : {}), via, provenance: { note: `${fn}: ${system}${address ? ` at ${address}` : ""} (${entry.status})` } });
  return r.ok ? { ok: true, result: entry } : r;
}

/** The model relays the founder's answer: proposed with the founder's words as its wording, by an agent,
 *  so it stays open until the founder confirms it (an agent never decides, EE-058). */
export async function relay(dir: string, { id, answer, agentId, harness, model }: { id: string; answer?: unknown; agentId?: string; harness?: string; model?: string }): Promise<Answer> {
  const { decisions, propose } = await import("../../engine/decisions.ts");
  if (!answer || !String(answer).trim()) return { ok: false, error: "pass the founder's answer, in their words" };
  const words = String(answer).trim();
  const note = `the founder's words, relayed from ${harness ?? "the model's harness"} during setup`;
  const opts = { agentId, via: "mcp", harness, model };
  const d = (decisions(dir).decisions as Dec[]).find((x) => x.id === id);
  if (id === GOAL) return propose(dir, { ...(d ? {} : { decides: { record: "exit-criteria", path: "foundation/exit-criteria/discovery.json" }, layer: "purpose", needed_in: "discovery", boundary: "fail-open" }), id: GOAL, question: d?.question ?? "What must be true for the venture to leave discovery? Name the goal this phase works toward.", answer: words, note }, opts);
  if (!d) return { ok: false, error: `no decision ${id}` };
  if (d.status === "decided") return { ok: false, error: `${id} is decided; only the founder can change it` };
  // As above: the door checks the proposal against the decision schema.
  if (d.source === "foundation") {
    const sid = id.replace(/^foundation-/, "");
    return propose(dir, { id: `statement-${sid}`, question: d.question, statement: sid, decides: d.decides as ProposeInput["decides"], layer: d.layer === "system" ? "purpose" : d.layer, needed_in: d.needed_in as string | undefined, answer: words, note }, opts);
  }
  return propose(dir, { id, question: d.question, answer: words, note }, opts);
}

/** The founder confirms the answers the model relayed, at the keyboard: each becomes a decision they made. */
export async function confirm(dir: string, { by }: { by?: string } = {}): Promise<Answer> {
  by ??= (await import("../../engine/decisions.ts")).founderName(dir);
  const { approve } = await import("../../engine/decisions.ts");
  const out: string[] = [];
  for (const w of (await state(dir)).waiting) {
    const r = approve(dir, w.id, { by, via: "cli", note: `confirmed at setup: ${by}'s words, relayed by the model` } as Parameters<typeof approve>[2]);
    if (!r.ok) return { ...r, confirmed: out };
    out.push(w.id);
  }
  return { ok: true, result: { confirmed: out, by } };
}

/** The state rendered into the skill's artifact template: one self-contained page, no network. */
export async function artifact(dir: string) {
  const s = await state(dir);
  const data = JSON.stringify(s).replace(/</g, "\\u003c");
  return readFileSync(join(repo, TEMPLATE), "utf8").replace("__NAIVE_SETUP_STATE__", () => data);
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const [dirArg, cmd, ...rest] = process.argv.slice(2);
  const flag = (n: string) => { const i = rest.indexOf(`--${n}`); if (i < 0) return undefined; const v = rest[i + 1]; rest.splice(i, 2); return v; };
  const via = flag("via") ?? "cli";
  if (!["cli", "mcp", "api"].includes(via)) { console.error(`--via is cli, mcp or api, not ${via}`); process.exit(2); }
  if (!dirArg || !existsSync(join(dirArg, "venture.json"))) { console.error("usage: node packages/naive/src/router/orchestration/setup.ts <venture dir> state|artifact|answer|point|confirm ..."); process.exit(2); }
  const dir = resolve(dirArg);
  let r: Answer;
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
