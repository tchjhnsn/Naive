#!/usr/bin/env node
// The decision library: frames (packages/naive/src/records/frame.schema.json). A frame is a recurring venture problem as a
// shape, the way a component is a reusable piece of UI. It holds no answer. This module:
//
//   match    finds the frames whose triggers the founder's words fit (code, by word overlap)
//   props    reads the facts a frame needs from the venture's records, never from the frame
//   request  asks a model to judge each premise yes, no or unknown, and whether the trade is false, a
//            real trade-off or a sequence (one typed question each, the Jev protocol)
//   run      settles the verdicts in code and proposes the frame's decisions, open, beside the venture's
//            other decisions; options come from the frame's own parts or from a dated, cited lookup
//   check    a frame matches its schema's rules and names no instrument as an answer
//   eval     judges the frame's worked cases and compares the verdicts with what they expect
//
// Judgments go through the judgment cache (packages/naive/src/engine/caching.mjs) with the command in NAIVE_JUDGE_CMD
// (the app that hosts Naive names its judge there). Lookups are a kit's job: run reads one from --lookup.
//
//   node packages/naive/src/engine/frames.mjs list
//   node packages/naive/src/engine/frames.mjs match "<the founder's words>"
//   node packages/naive/src/engine/frames.mjs check
//   node packages/naive/src/engine/frames.mjs run <venture dir> [<frame id>] [--text "<the founder's words>"] [--lookup <file>]
//   node packages/naive/src/engine/frames.mjs eval <frame id>

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";
import { envCommand, hostHook, isHosted, missingHook } from "../core/runtime.mjs";

const repo = new URL("../../../..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
export const YES = 0.7, NO = 0.3, MATCH = 0.34;

/** The premise attacks: the reusable reasoning moves frames call, as hooks are called by components. */
export const ATTACKS = {
  "test-the-goal": "Make the goal concrete (a number and a date) and check whether the problem serves it at all.",
  "split-the-dimension": "Break a bundled thing (control, ownership, price) into the parts that can move separately.",
  "name-the-control": "Name the specific right that matters: direction, votes, board seats, vetoes, day-to-day authority or the mission.",
  "false-dichotomy": "Ask whether the founder can have both. Answer false, a real trade-off, or a sequence.",
  "sequence-not-choose": "Ask whether both can happen in order, and which comes first.",
  "invert": "Ask what would guarantee the bad outcome, and avoid that first.",
  "who-solved-this": "Find ventures that faced the same shape, through a dated lookup, without copying their answer.",
};

// Words that would make a frame an answer: named instruments, which go stale and can be wrong. A frame
// that says "use a SAFE" carries the error that a SAFE gives up no equity; it converts at a later round.
export const NEVER = ["safe", "convertible note", "revenue-based financing", "venture debt", "dual-class", "preferred stock", "crowdfunding", "bootstrap", "term sheet", "series a"];

const framesDir = (pkg) => join(repo, "packages/naive/library", "packages", pkg, "frames");
export function frames() {
  if (!existsSync(join(repo, "packages/naive/library", "packages"))) return [];
  return readdirSync(join(repo, "packages/naive/library", "packages")).filter((p) => existsSync(framesDir(p))).flatMap((p) =>
    readdirSync(framesDir(p)).filter((f) => f.endsWith(".frame.json")).map((f) => ({ ...load(join(framesDir(p), f)), package: p, file: `packages/naive/library/packages/${p}/frames/${f}` })));
}
export const frameOf = (id) => frames().find((f) => f.id === id) ?? null;

// ---- check ----

const placeholders = (s) => [...String(s).matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]);
export function check(f) {
  const errors = [];
  const text = JSON.stringify({ ...f, cases: undefined }).toLowerCase();
  for (const w of NEVER) if (new RegExp(`\\b${w.replace(/[-]/g, "[- ]")}\\b`).test(text)) errors.push(`${f.id}: names "${w}", an answer; a frame describes the problem and a lookup supplies current options`);
  for (const a of f.attacks) if (!ATTACKS[a]) errors.push(`${f.id}: unknown attack ${a}`);
  for (const p of f.premises) {
    if (!f.attacks.includes(p.attack)) errors.push(`${f.id}: premise ${p.id} uses ${p.attack}, which the frame does not list in attacks`);
    for (const r of p.reads ?? []) if (!f.props.includes(r)) errors.push(`${f.id}: premise ${p.id} reads ${r}, which is not one of its props`);
  }
  for (const s of [f.goal, f.reframe]) for (const ph of placeholders(s)) if (!f.props.includes(ph)) errors.push(`${f.id}: {${ph}} is not one of its props`);
  if (f.package && f.package !== f.functions[0]) errors.push(`${f.id}: lives in packages/naive/library/packages/${f.package} but its first function is ${f.functions[0]}`);
  for (const e of f.emits) if ((e.options_from ?? "frame") === "frame" && !e.options?.length) errors.push(`${f.id}: ${e.id} takes its options from the frame but lists none`);
  for (const c of f.cases ?? []) for (const k of Object.keys(c.expect)) if (k !== "dichotomy" && !f.premises.some((p) => p.id === k)) errors.push(`${f.id}: case ${c.id} expects a verdict for ${k}, which is not a premise`);
  return errors;
}

// ---- match ----

const words = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
const STOP = new Set(["the", "and", "but", "want", "need", "don't", "dont", "not", "can", "how", "what", "with", "for", "that", "this", "too", "much", "have", "get", "give", "away", "without", "keep", "lose", "losing", "my", "our", "you"]);
/** Frames whose triggers the founder's words fit, best first: the share of a trigger's words they use. */
export function match(text) {
  const said = words(text);
  return frames().map((f) => {
    const best = Math.max(...f.triggers.map((t) => { const w = words(t); return w.size ? [...w].filter((x) => said.has(x)).length / w.size : 0; }));
    return { id: f.id, title: f.title, score: Math.round(best * 100) / 100 };
  }).filter((m) => m.score >= MATCH).sort((a, b) => b.score - a.score);
}

// ---- props ----

const NONE = "not on record";
const money = (m) => (m ? `${(m.amount / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${m.currency}` : null);
/** The facts a frame reads, from the venture's records; a fact the records do not hold is "not on record". */
export async function props(dir) {
  const { decisions } = await import("./decisions.mjs");
  const v = load(join(dir, "venture.json"));
  const ds = decisions(dir).decisions;
  const answer = (id) => { const d = ds.find((x) => x.id === id); return d?.status === "decided" ? d.answer : null; };
  const sum = existsSync(join(ventureFile(dir, "money/_summary.json"))) ? load(join(ventureFile(dir, "money/_summary.json"))) : null;
  const own = existsSync(join(ventureFile(dir, "governance/ownership.json"))) ? load(join(ventureFile(dir, "governance/ownership.json"))) : null;
  const people = existsSync(join(ventureFile(dir, "people/people.json"))) ? load(join(ventureFile(dir, "people/people.json"))) : null;
  const out = {
    phase: v.phase,
    goal: answer("discovery-goal") ?? NONE,
    revenue: sum ? `${money(sum.monthly_inflow)} a month in, as of ${sum.as_of.slice(0, 10)} (${sum.source})` : NONE,
    runway: sum ? (sum.runway_months == null ? `cash ${money(sum.cash)}, net cash flow ${money(sum.monthly_net)} a month, so no runway limit (${sum.source}, as of ${sum.as_of.slice(0, 10)})` : `${sum.runway_months} months (${sum.source}, as of ${sum.as_of.slice(0, 10)})`) : NONE,
    cap_table: own ? own.holders.map((h) => h.name ?? h.id).join(", ") : people ? `${people.people.map((p) => p.name).join(", ")}; no ownership record yet` : NONE,
    control_rights: answer("which-control-matters") ?? NONE,
    jurisdiction: v.profile?.jurisdiction ?? v.form?.jurisdiction ?? NONE,
  };
  return { facts: out, sources: { revenue: sum ? "money/_summary.json" : null, runway: sum ? "money/_summary.json" : null, goal: answer("discovery-goal") ? "decisions: discovery-goal" : null } };
}
const fill = (s, facts) => String(s).replace(/\{([a-z_]+)\}/g, (_, k) => (facts[k] && facts[k] !== NONE ? facts[k] : `the venture's ${k.replace(/_/g, " ")}`));

// ---- request and verdicts ----

const DICHOTOMY = { false: "a false choice: the founder can have both", "trade-off": "a real trade-off: gaining one costs the other", sequence: "a sequence: both, one after the other" };
/** The typed request: one noul question per premise, and one per reading of the trade. */
export function request(f, facts) {
  const questions = {};
  for (const p of f.premises) questions[`premise:${p.id}`] = { type: "noul", instructions: `Given only the facts in \`venture\` (a fact that says "${NONE}" is unknown), is this true: ${p.claim}`, criteria: { true: "Yes: the facts show it is true for this venture", false: "No: the facts show it is false for this venture" } };
  if (f.dichotomy) for (const [k, d] of Object.entries(DICHOTOMY)) questions[`dichotomy:${k}`] = { type: "noul", instructions: `The founder's sentence forces this trade: "${f.dichotomy}" Given only the facts in \`venture\`, is that trade ${d}?`, criteria: { true: "Yes", false: "No" } };
  return { state: { guidelines: "Judge each question against the venture's facts alone, as an experienced founder and investor would. Do not assume facts that are not given.", venture: facts, frame: { problem: f.title, goal: fill(f.goal, facts) } }, model: "jev-latest", questions };
}
const p = (a) => (typeof a?.noul === "number" ? a.noul : a?.noul === true ? 1 : a?.noul === false ? 0 : null);
/** Code settles the verdicts: yes at 0.7 or above, no at 0.3 or below, unknown between or unanswered. */
// When every fact a premise reads is missing from the records, the verdict is unknown whatever the model
// said: code wins over a judgment the facts cannot support.
export function verdicts(f, answers, facts = null) {
  const out = {};
  for (const x of f.premises) {
    const v = p(answers[`premise:${x.id}`]);
    const blind = facts && x.reads?.length && x.reads.every((r) => !facts[r] || facts[r] === NONE);
    out[x.id] = { claim: x.claim, attack: x.attack, move: ATTACKS[x.attack], p: v, verdict: blind || v == null ? "unknown" : v >= YES ? "yes" : v <= NO ? "no" : "unknown", ...(blind ? { overruled: `the records hold none of: ${x.reads.join(", ")}` } : {}) };
  }
  let dichotomy = null;
  if (f.dichotomy) {
    const ranked = Object.keys(DICHOTOMY).map((k) => ({ k, p: p(answers[`dichotomy:${k}`]) ?? 0 })).sort((a, b) => b.p - a.p);
    dichotomy = { trade: f.dichotomy, reading: ranked[0].p >= YES ? ranked[0].k : "unknown", p: ranked[0].p };
  }
  return { premises: out, dichotomy };
}

const judgeCmd = () => envCommand("NAIVE_JUDGE_CMD") || null;
async function ask(dir, req) {
  const cmd = judgeCmd();
  if (isHosted() && !hostHook("judge")) throw missingHook("judging a frame's premises", "judge");
  if (!cmd && !isHosted()) throw new Error("no judge: set NAIVE_JUDGE_CMD (a command that answers the Jev protocol)");
  const { judge } = await import("./caching.mjs");
  return judge(dir, req, { ...(cmd ? { cmd } : {}), packages: [req.package].filter(Boolean) });
}

// ---- run ----

/** Options a lookup found, kept only when dated within the frame's freshness and cited. */
export function fresh(f, lookup, now = Date.now()) {
  const max = f.freshness.max_age_days * 864e5;
  const list = (lookup?.options ?? lookup ?? []);
  const kept = list.filter((o) => o.option && o.source && o.as_of && now - Date.parse(o.as_of) <= max);
  return { kept, dropped: list.length - kept.length };
}

/**
 * Match (or take) a frame, judge its premises against the venture, and propose its decisions, open.
 * via is the interface the proposals are recorded as coming through (mcp unless the caller says).
 * @param {string} dir
 * @param {{ id?: string, text?: string, lookup?: *, now?: number, agentId?: string, harness?: string, model?: string, via?: string }} [opts]
 */
export async function run(dir, { id, text, lookup, now = Date.now(), agentId = "frames", harness, model, via = "mcp" } = {}) {
  const f = id ? frameOf(id) : (text ? frameOf(match(text)[0]?.id) : null);
  if (!f) return { ok: false, error: id ? `no frame ${id}` : `no frame fits "${text ?? ""}"; node packages/naive/src/engine/frames.mjs list shows them` };
  const bad = check(f);
  if (bad.length) return { ok: false, error: bad.join("\n") };
  const { facts, sources } = await props(dir);
  const req = request(f, facts);
  let judged;
  try { judged = await ask(dir, req); } catch (e) { return { ok: false, error: e.message, request: req }; }
  const v = verdicts(f, judged.answers, facts);
  const reframe = fill(f.reframe, facts);
  const { propose, decisions } = await import("./decisions.mjs");
  const said = text ? `The founder said: "${text}". ` : "";
  const summary = Object.entries(v.premises).map(([k, x]) => `${k} ${x.verdict}`).join("; ");
  const proposed = [], skipped = [];
  for (const e of f.emits) {
    const existing = decisions(dir).decisions.find((d) => d.id === e.id);
    if (existing?.status === "decided") { skipped.push({ id: e.id, why: "decided already" }); continue; }
    const looked = (e.options_from ?? "frame") === "lookup" ? fresh(f, lookup, now) : null;
    const options = looked ? looked.kept.map((o) => `${o.option} (${o.source}, ${o.as_of.slice(0, 10)})`) : e.options;
    const note = `${said}From the frame ${f.id}: ${reframe} Premises: ${summary}${v.dichotomy ? `; the trade reads as ${v.dichotomy.reading}` : ""}.${looked && !looked.kept.length ? ` Options come from a dated, cited lookup for: ${f.freshness.look_for.join("; ")} (no more than ${f.freshness.max_age_days} days old); none is on file yet.` : ""}`;
    const r = propose(dir, { id: e.id, question: e.question, ...(options?.length ? { options } : {}), ...(e.layer ? { layer: e.layer } : {}), ...(e.needed_in ? { needed_in: e.needed_in } : {}), note }, { agentId, via, harness, model: judged.model ?? model });
    if (!r.ok) return { ok: false, error: r.error };
    proposed.push({ id: e.id, question: e.question, options: options ?? [], awaiting: "the founder" });
  }
  return { ok: true, result: { frame: f.id, title: f.title, goal: fill(f.goal, facts), facts, sources, verdicts: v.premises, dichotomy: v.dichotomy, reframe, proposed, skipped, judge: { model: judged.model, cache: judged.cache.status } } };
}

// ---- eval ----

/** Judge each worked case and compare the verdicts with what the case expects. */
// Its judgments are cached outside the repository, so an eval never writes into it.
export async function evaluate(id, { dir = join(tmpdir(), "naive-frame-evals") } = {}) {
  const f = frameOf(id);
  if (!f) return { ok: false, error: `no frame ${id}` };
  const rows = [];
  for (const c of f.cases ?? []) {
    const { answers, model } = await ask(dir, request(f, c.facts));
    const v = verdicts(f, answers, c.facts);
    const got = { ...Object.fromEntries(Object.entries(v.premises).map(([k, x]) => [k, x.verdict])), ...(v.dichotomy ? { dichotomy: v.dichotomy.reading } : {}) };
    const right = Object.entries(c.expect).filter(([k, x]) => got[k] === x).length;
    rows.push({ case: c.id, model, right, of: Object.keys(c.expect).length, got, expect: c.expect });
  }
  const right = rows.reduce((s, r) => s + r.right, 0), of = rows.reduce((s, r) => s + r.of, 0);
  return { ok: true, result: { frame: id, cases: rows, accuracy: of ? Math.round((right / of) * 100) / 100 : null } };
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const [cmd, ...rest] = process.argv.slice(2);
  const flag = (n) => { const i = rest.indexOf(`--${n}`); if (i < 0) return undefined; const v = rest[i + 1]; rest.splice(i, 2); return v; };
  const show = (r) => { console.log(JSON.stringify(r.ok === undefined ? r : r.ok ? r.result : { error: r.error }, null, 2)); process.exit(r.ok === false ? 1 : 0); };
  if (cmd === "list") show(frames().map((f) => ({ id: f.id, title: f.title, package: f.package, triggers: f.triggers })));
  else if (cmd === "match") show(match(rest.join(" ")));
  else if (cmd === "check") {
    const errs = frames().flatMap(check);
    if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
    console.log(`${frames().length} frame(s): each describes a problem and names no answer.`);
  } else if (cmd === "run") {
    const text = flag("text"), lk = flag("lookup");
    const [dirArg, id] = rest;
    if (!dirArg || !existsSync(join(dirArg, "venture.json"))) { console.error("usage: node packages/naive/src/engine/frames.mjs run <venture dir> [<frame id>] [--text ...] [--lookup <file>]"); process.exit(2); }
    show(await run(resolve(dirArg), { id, text, lookup: lk ? load(lk) : null }));
  } else if (cmd === "eval") show(await evaluate(rest[0]));
  else { console.error("usage: node packages/naive/src/engine/frames.mjs list|match|check|run|eval"); process.exit(2); }
}
