#!/usr/bin/env node
// Tests for context (interface/context.mjs), instrumentation (interface/instrumentation.mjs) and agent
// vitals (interface/vitals.mjs): header first, layout once per session, sibling navigation, the
// template, prefetch and its budget, the context budget, scoped instructions, streaming, events,
// vitals and their check, and the trace a platform exporter ships. They run on a copy of the example
// workspace in a temp folder and never write into the repository.
//
//   node interface/context-test.mjs

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "context-test-"));
const ws = join(tmp, "workspace");
cpSync(join(repo, "schema/examples/workspace"), ws, { recursive: true });
process.env.MENTURA_WORKSPACE = ws;
process.env.NAIVE_SESSION_DIR = join(tmp, "sessions");
delete process.env.MENTURA_SESSION; delete process.env.NAIVE_INSTRUMENT;
const tandem = join(ws, "ventures/tandem");
const config = (c) => writeFileSync(join(tandem, "naive.config.json"), JSON.stringify(c, null, 2));
config({ instrumentation: { events: true } });

const { call, judge } = await import("./router.mjs");
const ctx = await import("./context.mjs");
const { events, register } = await import("./instrumentation.mjs");
const { vitals } = await import("./vitals.mjs");
const { handle } = await import("./mcp/server.mjs");
const { propose, approve } = await import("../schema/decisions.mjs");

let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const nav = async (route, input = {}) => call({ venture: "tandem", route, action: "navigate", input });
const cli = (...a) => spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), ...a], { encoding: "utf8", env: { ...process.env } });

// The fixtures: a second product, part of the first and written by an agent; the first rewritten by a person (confirmed).
const shop = JSON.parse(readFileSync(join(tandem, "products/shop-app.json"), "utf8"));
await call({ venture: "tandem", route: "product/shop-app", action: "write", input: shop, actor: "person" });
const lite = { ...shop, id: "shop-lite", name: "Tandem shop lite", part_of: ["shop-app"] };
const wl = await call({ venture: "tandem", route: "product/shop-lite", action: "write", input: lite });
expect("fixtures: a person and an agent write two products", wl.ok, wl.error);

// O-4: header first.
const head = await call({ venture: "tandem", route: "purpose/validation/problem", action: "head" });
expect("O-4 head returns the header and its cost, not the record", head.ok && head.result.header.record === "validation-problem" && head.result.header.tokens > 50
  && head.result.result === undefined && head.result.layout === undefined, JSON.stringify(head).slice(0, 300));
const full = await nav("purpose/validation/problem", { session: "s1" });
expect("O-4 navigate puts the header first, then the budget, layout, template, record and prefetch", full.ok
  && JSON.stringify(Object.keys(full.result)) === JSON.stringify(["header", "budget", "layout", "template", "result", "source", "prefetch"]), JSON.stringify(Object.keys(full.result ?? {})));
expect("O-4 the header says what the record is, its state, owner and title", full.result.header.state === "baseline" && full.result.header.owner === "founder" && typeof full.result.header.title === "string");

// L-2: the layout is sent once per session, then only what changed.
expect("L-2 a session's first read sends every layout part", full.result.layout.first === true && Object.keys(full.result.layout.parts).length >= 4 && full.result.layout.kept.length === 0);
const again = await nav("purpose/validation/problem", { session: "s1" });
expect("L-2 the same route again sends no layout parts, and keeps them all", Object.keys(again.result.layout.parts).length === 0 && again.result.layout.kept.length === Object.keys(full.result.layout.parts).length);
expect("L-2 keeping the layout makes the answer smaller", again.result.budget.parts.layout < full.result.budget.parts.layout / 5, `${again.result.budget.parts.layout} vs ${full.result.budget.parts.layout}`);
appendFileSync(join(tandem, "AGENTS.md"), "# Tandem\n\nvoice: plain\n");
const changed = await nav("purpose/validation/problem", { session: "s1" });
expect("L-2 a changed AGENTS.md is sent again, alone", JSON.stringify(Object.keys(changed.result.layout.parts)) === JSON.stringify(["chain:AGENTS.md", "instructions"]), JSON.stringify(Object.keys(changed.result.layout.parts)));
const other = await nav("purpose/validation/problem", { session: "s2" });
expect("L-2 another session gets the whole layout", other.result.layout.first === true && Object.keys(other.result.layout.parts).length >= 4);
const none = await nav("purpose/validation/problem");
expect("L-2 without a session the whole layout comes every time", none.result.layout.session === undefined && Object.keys(none.result.layout.parts).length >= 4);

// N-7: a sibling keeps the shared layout and swaps only the record's context.
const sib = await nav("purpose/validation/solution", { session: "s1" });
expect("N-7 a sibling route keeps the stack and AGENTS.md and swaps only the record's part", JSON.stringify(Object.keys(sib.result.layout.parts)) === JSON.stringify(["record:validation/solution"])
  && sib.result.layout.kept.includes("stack:purpose/layer.json") && sib.result.layout.kept.includes("chain:AGENTS.md"), JSON.stringify(sib.result.layout));

// P-12 and F-6: the template is recomputed every time, never part of the layout, and never blocks.
expect("P-12 the template holds need-now and open decisions, computed now", again.result.template.need_now?.phase && typeof again.result.template.decisions?.open === "number"
  && again.result.template.computed_at !== full.result.template.computed_at);
expect("F-6 no layout part holds a computed value", !/need_now|"decisions"/.test(JSON.stringify(full.result.layout)));
config({ instrumentation: { events: true }, context: { template_ms: 1 } });
const t0 = Date.now();
const slow = await nav("purpose/validation/problem");
expect("F-6 a template that runs past its limit comes back pending and the read still answers", slow.ok && slow.result.template.pending?.length === 2 && slow.result.result?.evidence?.length > 0 && Date.now() - t0 < 4000, JSON.stringify(slow.result?.template));
config({ instrumentation: { events: true } });

// N-3, L-12: prefetch the refs, what it reads first, what waits on it and the next step.
const lt = await nav("product/shop-lite");
const pf = (r) => Object.fromEntries((r.result.prefetch?.entries ?? []).map((e) => [e.route, e]));
expect("L-12 a ref (part_of) is prefetched as its item route", pf(lt)["product/shop-app"]?.why === "ref part_of", JSON.stringify(lt.result.prefetch));
const pr = pf(full);
expect("N-3 prefetch includes what waits on the record (the after links) and the next step", pr["foundation/telos"]?.why === "waits on this" && pr["validation/solution"]?.why === "waits on this"
  && Object.values(pr).some((e) => e.why === "next step"), JSON.stringify(Object.values(pr).map((e) => [e.route, e.why])));
const off = await nav("purpose/validation/problem", { prefetch: false });
expect("N-3 prefetch can be turned off", off.result.prefetch === undefined);

// N-4: confirmed records in full when small; changing ones send only their state.
expect("N-4 a confirmed record is prefetched in full", pf(lt)["product/shop-app"]?.state === "confirmed" && pf(lt)["product/shop-app"]?.full?.id === "shop-app");
expect("N-4 a record that is not confirmed sends only its state", pr["validation/solution"]?.state === "baseline" && pr["validation/solution"].full === undefined && pr["validation/solution"].title === undefined);
const shopNav = await nav("product/shop-app", { prefetch: ["product/shop-lite"] });
expect("N-4 a route asked for (hover) comes in full even while it changes", pf(shopNav)["product/shop-lite"]?.why === "asked" && pf(shopNav)["product/shop-lite"]?.full?.id === "shop-lite" && pf(shopNav)["product/shop-lite"].state === "agent-written");

// N-12: a large collection sends a count, unless the task names it.
config({ instrumentation: { events: true }, context: { large_collection: 1 } });
const big = await nav("product/shop-app", { prefetch: ["product"] });
expect("N-12 a large collection asked for by route comes with its items", pf(big)["product"]?.items?.length === 2);
const counted = await ctx.prefetch({ r: { kind: "record", record: "anatomy-answers", route: "product/anatomy-answers" }, record: null, template: null, venture: "tandem", dir: tandem, workspace: ws, set: { ...ctx.DEFAULTS, large_collection: 1 } });
const named = await ctx.prefetch({ r: { kind: "record", record: "anatomy-answers", route: "product/anatomy-answers" }, record: null, template: null, venture: "tandem", dir: tandem, workspace: ws, task: "compare the products", set: { ...ctx.DEFAULTS, large_collection: 1 } });
const prodOf = (p) => p.entries.find((e) => e.route === "product");
expect("N-12 a collection over large_collection sends only its count", prodOf(counted)?.count === 2 && prodOf(counted).items === undefined, JSON.stringify(counted));
expect("N-12 the same collection comes with its items when the task names it", prodOf(named)?.items?.length === 2, JSON.stringify(named));

// C-16: each prefetch costs tokens from its budget.
config({ instrumentation: { events: true }, context: { prefetch_budget: 25 } });
const tight = await nav("purpose/validation/problem");
expect("C-16 prefetch stays within its budget, every entry priced, the rest dropped", tight.result.prefetch.spent <= 25 && tight.result.prefetch.entries.every((e) => e.cost > 0) && tight.result.prefetch.dropped?.length > 0, JSON.stringify(tight.result.prefetch));

// N-13: a context budget per route, measured like bundle size.
config({ instrumentation: { events: true }, context: { routes: { "foundation/**": 300 } } });
const over = await nav("purpose/validation/problem");
expect("N-13 an answer reports its size by part against the route's budget", over.result.budget.limit === 300 && over.result.budget.over === true && over.result.budget.parts.result > 0);
expect("N-13 over budget, prefetch is given back first", over.result.prefetch.entries.length === 0 && over.result.prefetch.dropped.length > 0);
const report = spawnSync("node", [join(repo, "interface/context.mjs"), tandem, "budget", "--check", "--json"], { encoding: "utf8" });
const rep = JSON.parse(report.stdout);
expect("N-13 the budget report lists every route, flags the ones over, and --check exits 1", report.status === 1 && rep.over.includes("foundation/problem") && rep.routes.length > 20
  && rep.routes.find((x) => x.route === "foundation/problem").advice, report.stderr);
config({ instrumentation: { events: true } });
const viaRoute = await call({ venture: "tandem", route: "system/context", action: "run" });
expect("N-13 the report is the route system/context", viaRoute.ok && viaRoute.result.routes.length > 20 && viaRoute.result.over.length === 0, viaRoute.error);

// S-14: context as low in the tree as it is needed.
appendFileSync(join(tandem, "AGENTS.md"), "[foundation/problem] evidence: cite every source by path\n");
const scoped = await nav("purpose/validation/problem");
const unscoped = await nav("purpose/telos");
expect("S-14 a scoped instruction reaches only its routes", scoped.result.layout.parts.instructions.evidence && unscoped.result.layout.parts.instructions.evidence === undefined);
expect("S-14 the router's plain layout ignores scoped lines", (await call({ venture: "tandem", route: "purpose/telos", action: "layout" })).result.instructions.evidence === undefined);
appendFileSync(join(tandem, "AGENTS.md"), "need_now: telos first\n");
const rules = (await ctx.budget(tandem)).rules;
expect("S-14 the report says to move a scoped line into the folder it serves", rules.some((x) => x.rule === "S-14" && /foundation\/problem\/AGENTS.md|foundation\/AGENTS.md/.test(x.fix)), JSON.stringify(rules));
expect("F-6 the report flags a computed value written into a layout", rules.some((x) => x.rule === "F-6" && x.key === "need_now"));
writeFileSync(join(tandem, "AGENTS.md"), "# Tandem\n\nvoice: plain\n");

// N-9: a computed route answers at once with its state, then the result.
const parts = [];
const nn1 = await nav("system/need-now", { onPart: (p) => parts.push(p.part) });
expect("N-9 a computed route sends its header (state computing) before its result", nn1.ok && parts[0] === "header" && parts.indexOf("result") > 0 && nn1.result.header.state === "computed" && nn1.result.result.rows?.length > 0, JSON.stringify(parts));
const parts2 = [];
const nn2 = await nav("system/need-now", { onPart: (p) => parts2.push(p) });
expect("N-9 the next time, the last result comes at once, marked with its time, before the new one", parts2[0].data.state === "computing" && parts2[1].part === "stale_result" && parts2[1].data.as_of && nn2.result.header.last_at, JSON.stringify(parts2.map((p) => p.part)));

// N-5: long runs and batches report progress; the MCP server sends it as notifications.
const prog = [];
const streamed = await ctx.runStreaming({ venture: "tandem", route: "system/need-now", workspace: ws }, (p) => prog.push(p), 20);
expect("N-5 a long run reports progress while it runs, then its result", streamed.ok && streamed.result.rows?.length > 0 && prog.length >= 3 && /^started/.test(prog[0].message) && /^finished/.test(prog.at(-1).message), JSON.stringify(prog.slice(0, 3)));
const bprog = [];
const b = await ctx.batch({ venture: "tandem", calls: [{ route: "purpose/telos", action: "read" }, { route: "product", action: "read" }, { route: "system/time-to-ready", action: "run" }] }, (p) => bprog.push(p));
expect("N-5 a batch reports each call as it finishes", b.ok && bprog.map((p) => `${p.progress}/${p.total}`).join(" ") === "1/3 2/3 3/3");
const notes = [];
const mr = await handle({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "mentura_run", arguments: { venture: "tandem", route: "system/need-now" }, _meta: { progressToken: "p1" } } }, (n) => notes.push(n));
expect("N-5 MCP sends progress notifications for a run that carries a progress token", !mr.result.isError && notes.length >= 2 && notes.every((n) => n.method === "notifications/progress" && n.params.progressToken === "p1")
  && notes.every((n, i) => i === 0 || n.params.progress > notes[i - 1].params.progress));
const rnotes = [];
const rr = await handle({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "mentura_read", arguments: { venture: "tandem", route: "purpose/validation/problem", session: "mcp" }, _meta: { progressToken: 7 } } }, (n) => rnotes.push(n));
expect("N-5 an MCP read streams its parts, header first", /^header: /.test(rnotes[0]?.params.message) && JSON.parse(rr.result.content[0].text).header.record === "validation-problem");
const hr = await handle({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "mentura_read", arguments: { venture: "tandem", route: "purpose/validation/problem", header_only: true } } });
expect("O-4 an MCP agent can ask for the header only", JSON.stringify(Object.keys(JSON.parse(hr.result.content[0].text))) === JSON.stringify(["header", "budget"]));

// The CLI: head, navigate with --stream (NDJSON parts, header first), and batch.
const ch = cli("purpose/validation/problem", "head", "--venture", "tandem");
expect("CLI head prints the header", ch.status === 0 && JSON.parse(ch.stdout).header.record === "validation-problem", ch.stderr);
const cs = cli("purpose/validation/problem", "navigate", "--venture", "tandem", "--session", "cli", "--stream");
const lines = cs.stdout.trim().split("\n").map((l) => JSON.parse(l));
expect("CLI navigate --stream prints one part per line, header first", cs.status === 0 && lines[0].part === "header" && lines.some((l) => l.part === "prefetch"), cs.stderr);
writeFileSync(join(tmp, "calls.json"), JSON.stringify([{ route: "purpose/telos", action: "read" }, { route: "system/need-now", action: "run" }]));
const cb = cli("batch", "--venture", "tandem", "--input", join(tmp, "calls.json"), "--stream");
expect("CLI batch --stream prints progress then the results", cb.status === 0 && JSON.parse(cb.stdout.split("\n")[0]).progress.total === 2, cb.stderr);

// F-4 and P-4: instrumentation.
const seen = [];
const off1 = register((e) => seen.push(e));
await call({ venture: "tandem", route: "purpose/telos", action: "read" });
judge(0.4, 0.7, "founder", { dir: tandem, question: "is the problem real?", model: "stand-in" });
off1();
const ev = events(tandem);
expect("F-4 every read is logged with its time and size", ev.some((e) => e.kind === "call" && e.action === "read" && e.route === "purpose/telos" && typeof e.ms === "number" && e.tokens > 0));
expect("F-4 a call made inside another names its parent", ev.some((e) => e.kind === "call" && e.parent && ev.some((p) => p.id === e.parent)));
expect("F-4 a judgment is logged with its score and outcome", ev.some((e) => e.kind === "judgment" && e.outcome === "uncertain" && e.score === 0.4 && e.question === "is the problem real?"));
expect("P-4 a registered listener gets every event", seen.some((e) => e.kind === "call") && seen.some((e) => e.kind === "judgment"));
expect("P-4 every provenance entry is an event", ev.some((e) => e.kind === "provenance" && e.activity === "write" && e.entity === "products/shop-lite.json"));
const p1 = propose(tandem, { id: "pricing-tier", question: "Charge per shop or per seat?", answer: "Per shop", at: "purpose" }, /** @type {*} */ ({ agentId: "builder" }));
const a1 = approve(tandem, "pricing-tier", /** @type {*} */ ({ by: "Torian" }));
expect("P-4 a decision proposed and decided emits draft and accept events", p1.ok && a1.ok && events(tandem).some((e) => e.kind === "provenance" && e.activity === "accept" && /pricing-tier/.test(e.entity)), p1.error ?? a1.error);
const before = events(tandem).length;
process.env.NAIVE_INSTRUMENT = "0";
await call({ venture: "tandem", route: "purpose/telos", action: "read" });
delete process.env.NAIVE_INSTRUMENT;
config({});
await call({ venture: "tandem", route: "purpose/telos", action: "read" });
expect("P-4 instrumentation is opt-in: off by env or without the config, nothing is logged", events(tandem).length === before);
config({ instrumentation: { events: true } });

// N-6: agent vitals.
const v = vitals(tandem);
const s1 = v.tasks.find((t) => t.session === "s1");
expect("N-6 vitals count calls per task and tokens per call", s1 && s1.calls >= 4 && s1.tokens_per_call > 0 && s1.max_tokens >= s1.tokens_per_call, JSON.stringify(s1));
expect("N-6 vitals measure time to a useful answer", typeof s1.time_to_useful_ms === "number" && s1.time_to_useful_ms >= 0);
expect("N-6 vitals measure time from a decision opening to a person deciding it", v.decisions.some((d) => d.id === "pricing-tier" && !d.open && d.hours >= 0) && v.vitals.decision_hours.n >= 1);
expect("N-6 each vital is assessed at p75 against its threshold", ["calls_per_task", "tokens_per_call", "time_to_useful_ms", "decision_hours"].every((k) => v.vitals[k].threshold > 0 && "p75" in v.vitals[k] && v.vitals[k].status));

// C-15: vitals are checked, not only measured.
const good = spawnSync("node", [join(repo, "interface/vitals.mjs"), tandem, "--check"], { encoding: "utf8" });
expect("C-15 vitals within their thresholds pass the check", good.status === 0, good.stdout + good.stderr);
config({ instrumentation: { events: true }, vitals: { calls_per_task: 1 } });
const bad = spawnSync("node", [join(repo, "interface/vitals.mjs"), tandem, "--check"], { encoding: "utf8" });
expect("C-15 a vital over its threshold fails the check", bad.status === 1 && /calls_per_task/.test(bad.stderr), bad.stdout + bad.stderr);
const vr = await call({ venture: "tandem", route: "system/vitals", action: "run" });
expect("C-15 system/vitals reports the failing vital", vr.ok && vr.result.passed === false && vr.result.failing.includes("calls_per_task"));
config({ instrumentation: { events: true } });

// P-4: the events as a trace, shipped by the platform's LangSmith exporter (here to a local stand-in).
const tr = spawnSync("node", [join(repo, "interface/vitals.mjs"), tandem, "--trace", "--session", "s1"], { encoding: "utf8" });
writeFileSync(join(tmp, "trace.json"), tr.stdout);
const trace = JSON.parse(tr.stdout);
expect("P-4 the trace has a run per call, nested calls under their parent, and the vitals as feedback", trace.children.length === s1.calls && trace.feedback.length >= 3);
const got = [];
const server = createServer((req, res) => { let body = ""; req.on("data", (d) => { body += d; }); req.on("end", () => { got.push({ url: req.url, body: body ? JSON.parse(body) : null }); res.setHeader("content-type", "application/json"); res.end(req.url.startsWith("/sessions") ? "[]" : "{}"); }); });
await /** @type {Promise<void>} */ (new Promise((ok) => server.listen(0, "127.0.0.1", ok)));
const up = await new Promise((done) => {
  const p = spawn("node", [join(repo, "platform/integrations/langsmith.mjs"), join(tmp, "trace.json"), "--project", "naive-vitals"],
    { env: { ...process.env, LANGSMITH_API_KEY: "stand-in", LANGSMITH_ENDPOINT: `http://127.0.0.1:${/** @type {import("node:net").AddressInfo} */ (server.address()).port}` } });
  let out = ""; p.stdout.on("data", (d) => { out += d; }); p.on("close", (code) => done({ code, out }));
});
server.close();
const batchPost = got.find((g) => g.url === "/runs/batch");
expect("P-4 the platform exporter ships the trace as runs and the vitals as feedback", up.code === 0 && batchPost?.body.post.length >= trace.children.length + 1 && got.filter((g) => g.url === "/feedback").length === trace.feedback.length, up.out);

expect("nothing was written into the repository", !existsSync(join(repo, "schema/examples/workspace/ventures/tandem/.naive")) && !existsSync(join(repo, "schema/examples/workspace/ventures/tandem/naive.config.json")));

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nall passing");
