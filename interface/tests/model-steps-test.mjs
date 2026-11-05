#!/usr/bin/env node
// Tests for model steps (use model, EE-073) on a made-up venture with two customers, a stand-in model
// and temp folders: the five kinds, decomposed state, batches per package in parallel, the payload,
// computed values first, provenance downstream of a model, field paths at the leaves, plain JSON, kept
// computed values, a kit's boundary, model-only drafts, the outcomes (expected, uncaught, uncertain),
// typed output and code winning, the waterfall, one failure not sinking the rest, speculative fan-out,
// and the founder answering what the model was not sure of. Nothing is written into the repository.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../router.mjs";
import { entries } from "../../packages/core/provenance.mjs";
import { checkKit, wrap } from "../kit-boundary.mjs";
import { approve } from "../../schema/decisions.mjs";
import {
  KINDS, Uncaught, answersModel, assertJson, checkRequest, checkStep, checkSteps, commandModel, confirm, expectDeterministic,
  keepComputed, outcomeOf, payload, provenanceOf, run, settle, stepsOf, typed, waterfall, waves,
} from "../../schema/model-steps.mjs";

const repo = new URL("../..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const mentura = (args, env = {}) => spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), ...args], { encoding: "utf8", env: { ...process.env, ...env } });

// A workspace with one venture per scenario, each with two customers a person wrote.
const ws = mkdtempSync(join(tmpdir(), "model-steps-test-"));
const venture = async (id, extra = {}) => {
  const r = mentura(["init", join(ws, id), "--id", id, "--layers", "purpose"]);
  if (r.status !== 0) throw new Error(r.stderr);
  for (const c of [
    { id: "ada", name: "Ada Clinic", notes: "Signed the annual plan last week and added two more rooms.", seats: 12, ...(extra.ada ?? {}) },
    { id: "bo", name: "Bo Physio", notes: "Asked for a demo, then went quiet.", seats: 3, ...(extra.bo ?? {}) },
  ]) {
    const w = await call({ venture: id, workspace: ws, route: `customers/${c.id}`, action: "write", input: c, actor: "person" });
    if (!w.ok) throw new Error(w.error);
  }
  return join(ws, id);
};
const customers = stepsOf({ packages: ["customers"] });
const goodAnswers = {
  "customers/stage/ada": { value: "paying", confidence: 0.92 },
  "customers/stage/bo": { value: "trying", confidence: 0.81 },
  "customers/summary/ada": { value: "Ada Clinic pays for {{seats}} seats and just added two rooms." },
  "customers/summary/bo": { value: "Bo Physio is trying it on {{seats}} seats and has gone quiet." },
};
/** @param {*} answers @param {{ delay?: number, fail?: (key: string) => boolean }} [opts] */
const recorder = (answers, { delay = 0, fail } = {}) => {
  const calls = [];
  const ask = async (req) => {
    const c = { keys: Object.keys(req.questions), req, start: Date.now() };
    calls.push(c);
    await sleep(delay);
    c.end = Date.now();
    if (fail && c.keys.some(fail)) throw new Error("the model request failed");
    return { model: "stand-in", answers: Object.fromEntries(c.keys.filter((k) => k in answers).map((k) => [k, answers[k]])) };
  };
  return { ask, calls };
};

// S-2: a model classifies, judges fit, chooses, rates or drafts; one atomic call each.
{
  const base = { package: "p", step: "s", inputs: ["item.notes"], for_each: "customers", question: "About {item.notes}?" };
  const ok = [{ kind: "classify", options: ["a", "b"] }, { kind: "noul" }, { kind: "choice", options: ["a", "b"] }, { kind: "score", scale: [1, 5] }, { kind: "draft" }]
    .every((k) => checkStep({ ...base, ...k }).length === 0);
  expect("S-2 the five kinds are declared: classify, noul, choice, score, draft", ok && Object.keys(KINDS).length === 5);
  expect("S-2 an unknown kind is refused", checkStep({ ...base, kind: "chat" }).some((e) => /kind is one of/.test(e)));
  expect("S-2 each kind's answer is typed", typed({ kind: "noul" }, { value: "yes", confidence: 0.9 }).value === true && typed({ kind: "score", scale: [1, 5] }, { value: "4", confidence: 0.9 }).value === 4
    && typed({ kind: "classify", options: ["a", "b"] }, { value: "b", confidence: 1 }).ok && typed({ kind: "draft" }, { value: "text" }).ok);
  expect("S-2 the customers package declares its model steps", customers.map((s) => `${s.step}:${s.kind}`).join(",") === "stage:choice,summary:draft");
}

// S-6, S-4, S-12: the payload, decomposed, in plain JSON; no model is asked and nothing is written.
const v1 = await venture("payload-venture");
{
  const p = await payload(v1, customers);
  const stage = p.pending.find((x) => x.placeholder === "customers/stage/ada");
  const summary = p.pending.find((x) => x.placeholder === "customers/summary/ada");
  expect("S-6 the payload has what code computed, a placeholder per judgment and the state each receives",
    p.computed["customers/summary/ada"]?.seats === 12 && p.pending.length === 4 && stage && summary?.state.steps.stage.pending === "customers/stage/ada", JSON.stringify(p).slice(0, 300));
  expect("S-4 a model gets only the fields its question needs", JSON.stringify(stage.state) === JSON.stringify({ item: { notes: "Signed the annual plan last week and added two more rooms." } }) && !JSON.stringify(p.pending).includes("Ada Clinic"));
  expect("S-6 the payload asks no model and writes nothing", !existsSync(join(v1, "knowledge/judgments")));
  expect("S-12 the question points at a path in the state", stage.question.includes('`state["customers/stage/ada"].item.notes`'));
  const r = mentura(["system/steps", "run", "--venture", "payload-venture", "--json"], { MENTURA_WORKSPACE: ws });
  expect("S-6 system/steps run is the payload through the router", r.status === 0 && JSON.parse(r.stdout).result.pending.length === 4, r.stderr);
}

// S-12: state is plain JSON, and every path a question points at is in it.
{
  let threw = 0;
  for (const bad of [{ a: undefined }, { a: NaN }, { a: new Date() }, { a: () => 1 }]) { try { assertJson(bad); } catch { threw++; } }
  expect("S-12 undefined, NaN, a Date and a function are not plain JSON", threw === 4);
  let caught = null;
  try { checkRequest({ state: { k: { item: { notes: "x" } } }, questions: { k: { instructions: "Read `state[\"k\"].item.name`" } } }); } catch (e) { caught = e; }
  expect("S-12 a question pointing at a path not in its state is a bug (uncaught)", caught instanceof Uncaught);
  expect("S-12 a question pointing at paths in its state passes", checkRequest({ state: { k: { item: { notes: "x" } } }, questions: { k: { instructions: "Read `state[\"k\"].item.notes`" } } }));
}

// S-5, S-7, S-9, S-10, S-13, F-10: a run.
const v2 = await venture("run-venture");
{
  const before = sha(join(v2, "customers/ada.json"));
  const { ask, calls } = recorder(goodAnswers, { delay: 30 });
  const events = [];
  const r = await run(v2, customers, { ask, onEvent: (e) => events.push(e) });
  expect("S-5 one request per package per wave, asking every item at once", calls.length === 2 && calls[0].keys.length === 2 && calls[1].keys.length === 2, JSON.stringify(calls.map((c) => c.keys)));
  expect("F-10 a step waits on the step it reads first: summary after stage", calls[0].keys.every((k) => k.includes("/stage/")) && calls[1].keys.every((k) => k.includes("/summary/")) && calls[1].start >= calls[0].end);
  expect("S-7 code's results come first, judgments as they arrive, done last", events[0].event === "computed" && events.at(-1).event === "done" && events.filter((e) => e.event === "judgment").length === 4, events.map((e) => e.event).join(","));
  const j = load(join(v2, "knowledge/judgments/customers-summary-ada.json"));
  expect("S-13 a draft written around a computed count carries it unchanged", j.answer === "Ada Clinic pays for 12 seats and just added two rooms." && j.kept.seats === 12 && j.outcome === "answer");
  expect("S-13 the later step was given the earlier answer", calls[1].req.state["customers/summary/ada"].steps.stage === "paying" && j.reads.includes("knowledge/judgments/customers-stage-ada.json#answer"));
  const pj = await provenanceOf(v2, "knowledge/judgments/customers-stage-ada.json");
  expect("S-9 a model's judgment carries agent provenance", pj.status === "agent" && pj.model === true, JSON.stringify(pj));
  const pc = await provenanceOf(v2, "customers/ada.json");
  expect("S-10 the person's record passed into the step stays the person's, unchanged", pc.status === "person" && sha(join(v2, "customers/ada.json")) === before, JSON.stringify(pc));
  const e = entries(v2).filter((x) => x.entity === "knowledge/judgments/customers-stage-ada.json").at(-1);
  expect("S-9 the judgment's log entry is the agent's and names what it was derived from", e.agent.kind === "agent" && e.agent.id === "model-step" && e.agent.model === "stand-in" && e.derived_from.includes("customers/ada.json"));
  // Downstream: an agent's record derived from the judgment is the agent's until a person confirms the judgment.
  const w = await call({ venture: "run-venture", workspace: ws, route: "knowledge/where-used", action: "write", input: { facts: [] }, actor: "agent", provenance: { derived_from: ["knowledge/judgments/customers-stage-ada.json"] } });
  const down = await provenanceOf(v2, "knowledge/where-used.json");
  expect("S-9 a record downstream of a model's output carries agent provenance", w.ok && down.status === "agent" && down.downstream_of_model.includes("knowledge/judgments/customers-stage-ada.json"), JSON.stringify(down));
  const cleared = await provenanceOf(v2, "knowledge/where-used.json", { checks: true });
  expect("S-9 ...until its checks pass", cleared.status === "clear" && /checks pass/.test(cleared.why), JSON.stringify(cleared));
  confirm(v2, "customers-stage-ada", { by: "Ana" });
  const after = await provenanceOf(v2, "knowledge/where-used.json");
  const pj2 = await provenanceOf(v2, "knowledge/judgments/customers-stage-ada.json");
  expect("S-9 ...or a person confirms the model's output", pj2.status === "person" && after.downstream_of_model.length === 0, JSON.stringify([pj2, after]));
  const p = spawnSync("node", [join(repo, "schema/check-provenance.mjs"), ws], { encoding: "utf8" });
  const v = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", "judgment.schema.json", "--file", join(v2, "knowledge/judgments/customers-summary-ada.json")], { encoding: "utf8" });
  expect("judgments match their schema and the provenance chain holds", p.status === 0 && v.status === 0, p.stderr + v.stdout + v.stderr);
  const again = recorder(goodAnswers);
  const r2 = await run(v2, customers, { ask: again.ask });
  expect("a second run on unchanged state asks nothing and reuses the judgments", again.calls.length === 0 && r2.reused.length === 4, JSON.stringify(again.calls.map((c) => c.keys)));
  const fresh = recorder(goodAnswers);
  await run(v2, customers, { ask: fresh.ask, fresh: true });
  expect("--fresh asks again, but keeps a person's confirmed answer", fresh.calls.length === 2 && fresh.calls[0].keys.join() === "customers/stage/bo", JSON.stringify(fresh.calls.map((c) => c.keys)));
  expect("S-2 each call is atomic: one question per item", r.judgments.every((x) => x.key.split("/").length === 3));
}

// S-11: keep model calls at the leaves.
{
  const base = { package: "p", step: "s", kind: "noul", for_each: "customers", question: "About {item}?", inputs: ["item"] };
  expect("S-11 handing a whole item to a model is refused", checkStep(base).some((e) => /whole item/.test(e)));
  expect("S-11 handing a whole record or package is refused", checkStep({ ...base, for_each: undefined, inputs: ["customers"], question: "About {customers}?" }).some((e) => /whole record or package/.test(e))
    && checkStep({ ...base, for_each: undefined, inputs: ["foundation/problem#"], question: "About {foundation/problem#}?" }).some((e) => /whole record/.test(e)));
  expect("S-11 a field given to the model that the question never points at is refused", checkStep({ ...base, inputs: ["item.notes", "item.name"], question: "About {item.notes}?" }).some((e) => /never points at it/.test(e)));
  const v = await venture("budget-venture", { ada: { notes: "x".repeat(3000) } });
  const { ask, calls } = recorder({ "p/s/bo": { value: true, confidence: 0.9 } });
  const r = await run(v, [{ package: "p", step: "s", kind: "noul", for_each: "customers", question: "Is {item.notes} upbeat?", inputs: ["item.notes"], budget: 500 }], { ask });
  expect("S-11 a state over its context budget is not sent", r.errors.some((e) => e.key === "p/s/ada" && /context budget/.test(e.error)) && calls[0].keys.join() === "p/s/bo", JSON.stringify(r.errors));
}

// S-13 and E-9: a draft that changes a computed value, a malformed answer, a low confidence, and code winning.
const v3 = await venture("failure-venture");
{
  const { ask } = recorder({ ...goodAnswers, "customers/stage/bo": { value: "maybe", confidence: 0.9 }, "customers/summary/ada": { value: "Ada Clinic pays for 10 seats." } });
  const r = await run(v3, customers, { ask });
  const ada = r.judgments.find((j) => j.key === "customers/summary/ada");
  expect("S-13 a draft that changed the computed seats does not come back; the code's value stands", ada.outcome === "uncertain" && ada.answer === null && /did not come through unchanged/.test(ada.why), JSON.stringify(ada));
  const bo = r.judgments.find((j) => j.key === "customers/stage/bo");
  expect("E-9 a malformed answer cannot come back: it is uncertain", bo.outcome === "uncertain" && bo.answer === null && /malformed/.test(bo.why), JSON.stringify(bo));
  expect("F-10 a step whose earlier step is uncertain waits", r.skipped.some((s) => s.key === "customers/summary/bo" && /waits on customers\/stage\/bo/.test(s.why)));
  expect("E-9 a low-confidence answer is uncertain", settle({ kind: "choice", options: ["a", "b"] }, { value: "a", confidence: 0.4 }).outcome === "uncertain");
  const code = settle({ kind: "choice", options: ["paying", "trying"], check: { equals: "stage" } }, { value: "trying", confidence: 0.95 }, { stage: "paying" });
  expect("E-9 when a judgment and a code check disagree, the code wins", code.outcome === "overruled" && code.answer === "paying" && code.overruled.judgment === "trying", JSON.stringify(code));
  expect("S-13 keep fills {{name}} and finds a stray placeholder", keepComputed("{{seats}} seats", { seats: 4 }).value === "4 seats" && !keepComputed("{{price}}", { seats: 4 }).ok);
  expect("E-1 uncertain judgments go to the founder as open decisions", existsSync(join(v3, "knowledge/decisions/judge-customers-stage-bo.decision.json"))
    && load(join(v3, "knowledge/decisions/judge-customers-stage-bo.decision.json")).status === "open" && r.uncertain.length === 2);
  // The founder answers; the next run writes their answer as the judgment and moves on.
  const a = approve(v3, "judge-customers-stage-bo", /** @type {Parameters<typeof approve>[2]} */ ({ by: "Ana", answer: "trying" }));
  const next = recorder(goodAnswers);
  const r2 = await run(v3, customers, { ask: next.ask });
  const jb = load(join(v3, "knowledge/judgments/customers-stage-bo.json"));
  expect("E-1 the founder's answer becomes the judgment, written as theirs", a.ok && jb.by.kind === "person" && jb.by.name === "Ana" && jb.answer === "trying" && entries(v3).filter((e) => e.entity === "knowledge/judgments/customers-stage-bo.json").at(-1).agent.kind === "person");
  expect("F-10 ...and the step that waited on it is asked", next.calls.some((c) => c.keys.includes("customers/summary/bo")) && r2.waiting.some((w) => w.key === "customers/summary/ada"), JSON.stringify(r2.waiting));
}

// S-17: drafting is model-only.
{
  let threw = false;
  try { expectDeterministic(customers.find((s) => s.kind === "draft")); } catch (e) { threw = e instanceof Uncaught; }
  expect("S-17 code cannot expect a deterministic answer from a draft", threw && expectDeterministic(customers.find((s) => s.kind === "choice")));
  const d = { package: "p", step: "d", kind: "draft", for_each: "customers", question: "Write about {item.notes}", inputs: ["item.notes"] };
  expect("S-17 a draft has no threshold and no code check", checkStep({ ...d, threshold: 0.5 }).some((e) => /no threshold/.test(e)) && checkStep({ ...d, computed: { s: { item: "seats" } }, check: { equals: "s" } }).some((e) => /model-only/.test(e)));
  const p = await payload(v1, customers);
  expect("S-17 the payload marks drafts as not deterministic", p.pending.filter((x) => x.kind === "draft").every((x) => x.deterministic === false) && p.pending.filter((x) => x.kind === "choice").every((x) => x.deterministic));
}

// E-1: expected, uncaught and uncertain outcomes.
const v4 = await venture("outcome-venture");
{
  writeFileSync(join(v4, "naive.config.json"), JSON.stringify({ gate: { fail_closed: ["customers"] } }));
  const invalid = await call({ venture: "outcome-venture", workspace: ws, route: "customers/cy", action: "write", input: { name: 1 }, actor: "person" });
  const missing = await call({ venture: "outcome-venture", workspace: ws, route: "customers/zed", action: "read" });
  const held = await call({ venture: "outcome-venture", workspace: ws, route: "customers/cy", action: "write", input: { id: "cy" }, actor: "agent" });
  expect("E-1 an invalid write is expected", outcomeOf(invalid).outcome === "expected" && outcomeOf(invalid).kind === "invalid write", JSON.stringify(outcomeOf(invalid)));
  expect("E-1 a missing record is expected", outcomeOf(missing).outcome === "expected" && outcomeOf(missing).kind === "missing record");
  expect("E-1 a gate that holds is expected", outcomeOf(held).outcome === "expected" && outcomeOf(held).kind === "gate holds", JSON.stringify(held));
  let cyc = null;
  try { waves([{ package: "p", step: "a", after: ["b"] }, { package: "p", step: "b", after: ["a"] }]); } catch (e) { cyc = e; }
  expect("E-1 a cycle in the step order is uncaught", outcomeOf(cyc).outcome === "uncaught" && /cycle in the step order: p\/a -> p\/b -> p\/a/.test(cyc.message), cyc?.message);
  expect("E-1 a judgment below threshold is uncertain", outcomeOf(settle({ kind: "noul" }, { value: true, confidence: 0.2 })).outcome === "uncertain");
  const kit = join(ws, "cycle-kit.json");
  writeFileSync(kit, JSON.stringify({ name: "cyc", package: "customers", boundary: { reads: ["customers"], writes: ["knowledge/judgment/**"], use_model: [
    { step: "a", kind: "noul", for_each: "customers", after: ["b"], question: "Is {item.notes} upbeat?", inputs: ["item.notes"] },
    { step: "b", kind: "noul", for_each: "customers", after: ["a"], question: "Is {item.notes} short?", inputs: ["item.notes"] }] } }));
  const answers = join(ws, "none.json"); writeFileSync(answers, "{}");
  const r = mentura(["steps", "run", "--venture", "outcome-venture", "--kit", kit, "--answers", answers], { MENTURA_WORKSPACE: ws });
  expect("E-1 the CLI exits 1 on an uncaught bug and says so", r.status === 1 && /uncaught: .*cycle/s.test(r.stderr), r.stderr);
  const n = mentura(["steps", "run", "--venture", "outcome-venture"], { MENTURA_WORKSPACE: ws, MENTURA_MODEL_CMD: "" });
  expect("E-1 running with no model is an expected error, not a fake answer", n.status === 1 && /no model/.test(n.stderr), n.stderr);
}

// F-10: the venture's real order.
{
  const w = await waterfall(v1);
  const wave = (t) => w.records.find((r) => r.record === t).wave;
  expect("F-10 a record waits on the records it reads first", wave("telos") > wave("validation-problem") && wave("validation-go-to-market") > wave("validation-pricing")
    && w.records.find((r) => r.record === "telos").waits_on.includes("validation-problem"), JSON.stringify(w.order));
  let cyc = null;
  try { await waterfall(null, { graph: { a: ["b"], b: ["c"], c: ["a"] } }); } catch (e) { cyc = e; }
  expect("F-10 a cycle in the record order is uncaught", cyc instanceof Uncaught && /a -> b -> c -> a/.test(cyc.message), cyc?.message);
}

// F-11: independent packages at once; one failure or one low-confidence answer does not sink the rest.
const v5 = await venture("parallel-venture");
{
  const steps = ["pa", "pb", "pc"].map((p) => ({ package: p, step: "upbeat", kind: "noul", for_each: "customers", question: "Are the notes {item.notes} upbeat?", inputs: ["item.notes"] }));
  const ans = { "pb/upbeat/ada": { value: true, confidence: 0.9 }, "pb/upbeat/bo": { value: false, confidence: 0.3 }, "pc/upbeat/ada": { value: true, confidence: 0.95 }, "pc/upbeat/bo": { value: false, confidence: 0.9 } };
  const { ask, calls } = recorder(ans, { delay: 80, fail: (k) => k.startsWith("pa/") });
  const r = await run(v5, steps, { ask });
  expect("F-11 packages are asked in parallel", calls.length === 3 && Math.max(...calls.map((c) => c.start)) < Math.min(...calls.map((c) => c.end)));
  expect("F-11 one failed request does not sink the rest", r.errors.filter((e) => e.key.startsWith("pa/")).length === 2 && r.uncaught.length === 0 && existsSync(join(v5, "knowledge/judgments/pc-upbeat-bo.json")), JSON.stringify(r.errors));
  expect("F-11 one low-confidence answer goes to the founder without failing the batch", r.uncertain.map((u) => u.key).join() === "pb/upbeat/bo" && existsSync(join(v5, "knowledge/judgments/pb-upbeat-ada.json"))
    && existsSync(join(v5, "knowledge/decisions/judge-pb-upbeat-bo.decision.json")));
}

// F-13: speculative fan-out.
const v6 = await venture("speculate-venture");
{
  const step = { package: "spec", step: "more-seats", kind: "noul", for_each: "customers", question: "Do the notes {item.notes} suggest they want more seats?", inputs: ["item.notes"],
    computed: { seats: { item: "seats" } }, when: { computed: "seats", gte: 10 } };
  const ans = { "spec/more-seats/ada": { value: true, confidence: 0.9 }, "spec/more-seats/bo": { value: false, confidence: 0.9 } };
  const slow = { compute: async (f) => { await sleep(300); return f(); } };
  const a = recorder(ans, { delay: 300 });
  const plain = await run(v6, [step], { ask: a.ask, hooks: slow, write: false });
  const b = recorder(ans, { delay: 300 });
  const spec = await run(v6, [step], { ask: b.ask, hooks: slow, write: false, speculate: true });
  expect("F-13 without speculation, code computes first and only the judgments needed are asked", a.calls[0].keys.join() === "spec/more-seats/ada" && plain.skipped.some((s) => s.key === "spec/more-seats/bo") && plain.ms >= 600, `${plain.ms}ms`);
  expect("F-13 with speculation, the judgments start while code computes", b.calls[0].keys.length === 2 && spec.ms < 550, `${spec.ms}ms`);
  expect("F-13 ...and the ones not used are discarded", spec.discarded.map((d) => d.key).join() === "spec/more-seats/bo" && spec.judgments.map((j) => j.key).join() === "spec/more-seats/ada");
}

// S-15: a kit's agent workflow inside a declared boundary.
const v7 = await venture("kit-venture", { bo: { private_fields: ["notes"] } });
{
  const kit = { name: "follow-up", package: "customers", boundary: { reads: ["customers", "customers/*"], writes: ["knowledge/judgment/**"], use_model: [
    { step: "call", kind: "noul", for_each: "customers", question: "Do the notes {item.notes} call for a follow-up call?", inputs: ["item.notes"] }] } };
  expect("S-15 a kit's boundary checks: what it reads, writes, and which steps use a model", (await checkKit(kit)).length === 0, (await checkKit(kit)).join("; "));
  const outside = { ...kit, boundary: { ...kit.boundary, writes: [], use_model: [{ ...kit.boundary.use_model[0], inputs: ["item.notes", "foundation/problem#statement"], question: "Do {item.notes} and {foundation/problem#statement} call for it?" }] } };
  const errs = await checkKit(outside);
  expect("S-15 a step reading outside the kit's reads, or a model kit not declaring judgments, is refused", errs.some((e) => /outside the kit's reads/.test(e)) && errs.some((e) => /declare knowledge\/judgment/.test(e)), errs.join("; "));
  expect("S-15 a kit without a boundary is refused", (await checkKit({ name: "x", package: "customers" })).some((e) => /declares a boundary/.test(e)));
  const guarded = wrap(kit);
  const refused = await guarded({ venture: "kit-venture", workspace: ws, route: "customers/ada", action: "write", input: { id: "ada" }, actor: "person" });
  const read = await guarded({ venture: "kit-venture", workspace: ws, route: "foundation/problem", action: "read" });
  expect("S-15 the wrapped call refuses a write and a read outside the boundary", !refused.ok && /declares no write/.test(refused.error) && !read.ok && /declares no read/.test(read.error));
  const { ask } = recorder({ "follow-up/call/ada": { value: false, confidence: 0.9 } });
  const r = await run(v7, stepsOf({ kit }), { ask, call: guarded });
  const e = entries(v7).filter((x) => x.entity === "knowledge/judgments/follow-up-call-ada.json").at(-1);
  expect("S-15 the kit's workflow runs inside its boundary as the kit's agent", r.judgments.length === 1 && e.agent.kind === "agent" && e.agent.id === "kit-follow-up", JSON.stringify(e?.agent));
  expect("private fields never reach a model: withheld at run time", r.withheld.some((w) => w.key === "follow-up/call/bo" && /private field/.test(w.why)));
  const c = await checkSteps(stepsOf({ kit }), { dir: v7 });
  expect("private fields never reach a model: the check names them", c.some((x) => /input item.notes of bo is a private field/.test(x)), c.join("; "));
  writeFileSync(join(ws, "follow-up.kit.json"), JSON.stringify(kit));
  const k = spawnSync("node", [join(repo, "interface/kit-boundary.mjs"), join(ws, "follow-up.kit.json")], { encoding: "utf8" });
  expect("S-15 node interface/kit-boundary.mjs checks a kit.json", k.status === 0 && /inside its boundary/.test(k.stdout), k.stderr);
}

// The model behind a command (the Jev protocol) and an answers file, through mentura steps.
{
  const v = await venture("cli-venture");
  const model = join(ws, "model.mjs");
  writeFileSync(model, `let s = ""; for await (const c of process.stdin) s += c; const req = JSON.parse(s);
const answers = {}; for (const [k, q] of Object.entries(req.questions)) answers[k] = q.type === "draft" ? { value: "They hold {{seats}} seats." } : { value: q.options[0], confidence: 0.9 };
console.log(JSON.stringify({ model: "command-stand-in", answers }));\n`);
  const r = mentura(["steps", "run", "--venture", "cli-venture", "--json"], { MENTURA_WORKSPACE: ws, MENTURA_MODEL_CMD: `node ${model}` });
  const out = r.status === 0 ? JSON.parse(r.stdout) : null;
  expect("MENTURA_MODEL_CMD: a command that reads the request on stdin answers it", out?.judgments.length === 4 && load(join(v, "knowledge/judgments/customers-summary-bo.json")).answer === "They hold 3 seats.", r.stderr);
  const f = join(ws, "answers.json");
  writeFileSync(f, JSON.stringify({ model: "file", answers: goodAnswers }));
  const s = mentura(["steps", "run", "--venture", "cli-venture", "--answers", f, "--fresh", "--stream"], { MENTURA_WORKSPACE: ws });
  const lines = s.stdout.trim().split("\n").map((l) => JSON.parse(l));
  expect("S-7 --stream prints computed values first and each judgment as a line as it arrives", s.status === 0 && lines[0].event === "computed" && lines.at(-1).event === "done" && lines.filter((l) => l.event === "judgment").length === 4, s.stderr);
  const am = await answersModel({ answers: { a: 1 } })({ questions: { a: {}, b: {} } });
  const cm = await commandModel(`node ${model}`)({ state: {}, questions: { k: { type: "choice", options: ["x"] } } });
  expect("answersModel and commandModel answer only what was asked", JSON.stringify(am.answers) === '{"a":1}' && cm.answers.k.value === "x");
  const chk = mentura(["steps", "check", "--venture", "cli-venture"], { MENTURA_WORKSPACE: ws });
  expect("mentura steps check passes on the repository's packages", chk.status === 0, chk.stderr);
}

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
