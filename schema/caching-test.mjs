#!/usr/bin/env node
// Tests for caching (schema/caching.mjs; ledger rows C-1 to C-5, C-7, C-8, S-8, F-2, F-12, O-5 and
// H-3) on made-up ventures in a temp directory: a declared command's result is stored and reused
// until the venture changes; every cached value has a life; a judgment is asked again only when its
// state, question, model or package versions change; private results never cross people; one answer
// says which parts are confirmed, cached or fresh; reads are shared within one action; writes never
// use the cache. Nothing is written into the repository.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { actionScope, actionStats, cached, clear, command, configOf, declarationFor, entries, judge, keyOf, LIFE, lifeOf, lookup, memo, prune, stats, versionsOf } from "./caching.mjs";
import { call } from "../interface/router.mjs";
import { decisions, holding } from "./decisions.mjs";
import { route as http } from "../interface/api/server.mjs";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const throws = (f, re) => { try { f(); return false; } catch (e) { return re.test(e.message); } };

const ws = mkdtempSync(join(tmpdir(), "caching-test-"));
const init = (id) => { const r = spawnSync("node", [join(repo, "schema/init-venture.mjs"), join(ws, id), id, "--layers", "purpose"], { encoding: "utf8" }); if (r.status !== 0) throw new Error(r.stderr); return join(ws, id); };
const dir = init("kettle");
process.env.MENTURA_WORKSPACE = ws;
delete process.env.NAIVE_CACHE;
const run = (route, extra = {}) => call({ venture: "kettle", route, action: "run", workspace: ws, ...extra });

// C-4: every cached value has a life
expect("C-4: a cache without a life is refused", throws(() => lifeOf(undefined), /needs a life/));
expect("C-4: an unknown profile is refused", throws(() => lifeOf("fortnight"), /unknown cache life/));
expect("C-4: the Next.js cacheLife profiles are there", ["seconds", "minutes", "hours", "days", "weeks", "max", "default"].every((p) => LIFE[p]) && lifeOf("hours").expire === 86400);
expect("C-4: a custom life is { revalidate, expire } in seconds", lifeOf({ revalidate: 10, expire: 20 }).name === "custom" && lifeOf({ revalidate: 10, expire: 20 }).expire === 20);
let n = 0;
const t0 = Date.parse("2026-10-29T00:00:00Z");
const s = { level: "record", name: "probe", key: { a: 1 }, life: { revalidate: 10, expire: 100 } };
const a1 = await cached(dir, s, () => ++n, { now: t0 });
const a2 = await cached(dir, s, () => ++n, { now: t0 + 5000 });
const a3 = await cached(dir, s, () => ++n, { now: t0 + 20000, allowStale: true });
const a4 = await cached(dir, s, () => ++n, { now: t0 + 20000 });
const a5 = await cached(dir, s, () => ++n, { now: t0 + 200000 });
expect("C-4: fresh within revalidate (a hit, not computed again)", a1.cache.status === "miss" && a2.cache.status === "hit" && a2.value === 1);
expect("C-4: past revalidate, stale is served only when the caller accepts it", a3.cache.status === "stale" && a3.value === 1 && a4.cache.status === "revalidate" && a4.value === 2);
expect("C-4: past expire it is computed again", a5.cache.status === "expired" && a5.value === 3 && n === 3);
expect("C-4: a cache without a life cannot be used", await cached(dir, { level: "record", name: "x", key: {} }, () => 1).then(() => false, (e) => /needs a life/.test(e.message)));
expect("C-1: a failed computation (undefined) is not stored", (await cached(dir, { ...s, name: "nothing" }, () => undefined)).cache.status === "miss" && lookup(dir, { ...s, name: "nothing" }).status === "miss");

// C-5: the key is the arguments plus captured values
expect("C-5: keys do not depend on property order", keyOf({ a: 1, b: { c: 2, d: 3 } }) === keyOf({ b: { d: 3, c: 2 }, a: 1 }));
expect("C-5: package versions are part of a judgment key", JSON.stringify(versionsOf(["foundation"])) !== JSON.stringify(versionsOf(["decisions"])) && versionsOf().naive === readFileSync(join(repo, "schema/VERSION"), "utf8").trim());

// C-2 and C-3: on in the recommended defaults; declared in package definitions
expect("C-2: caching is on in the recommended defaults", configOf(dir).enabled === true);
expect("C-3: packages declare use_cache (foundation, decisions, validation)", ["purpose/foundation", "governance/decisions", "purpose/validation/assess"].every((r) => declarationFor(dir, r)?.by?.startsWith("packages/")));
expect("C-3: a route nobody declares is not cached", declarationFor(dir, "knowledge/catalog") === null);

// C-1, C-3, S-8: a derived record is stored and reused until the venture changes
const r1 = await run("system/need-now");
const r2 = await run("system/need-now");
expect("C-1: the first run computes and stores", r1.ok && r1.cache?.status === "miss", JSON.stringify(r1.cache));
expect("C-1: the second run is a hit with the same answer", r2.cache?.status === "hit" && JSON.stringify(r2.result) === JSON.stringify(r1.result));
const problem = { venture: "kettle", statement: "Kettles boil over.", segment: "home cooks", evidence: [] };
const pw = await call({ venture: "kettle", route: "foundation/problem", action: "write", input: problem, actor: "person", workspace: ws });
expect("H-3: a write never uses the cache", pw.ok && pw.cache === undefined && !JSON.stringify(pw).includes('"cache"'), JSON.stringify(pw).slice(0, 300));
const r3 = await run("system/need-now");
expect("C-5: changing the venture's files changes the key, so it is computed again", r3.cache?.status === "miss" && r3.cache.key !== r1.cache.key);
const d1 = await run("governance/decisions");
expect("C-3: a package-declared route is cached with its life", d1.cache?.by === "packages/decisions" && d1.cache.life === "minutes");
const bypass = await run("system/need-now", { input: { cache: "no-store" } });
expect("H-3: a read can opt out with cache no-store", bypass.cache?.status === "bypass");
let calls = 0;
const failing = await command({ dir, route: "system/need-now", script: "x", args: [dir, "--fail"] }, () => { calls++; return { status: 1, stdout: "", stderr: "boom" }; });
const failing2 = await command({ dir, route: "system/need-now", script: "x", args: [dir, "--fail"] }, () => { calls++; return { status: 1, stdout: "", stderr: "boom" }; });
expect("C-1: a failing run is never cached", failing.status === 1 && failing2.status === 1 && calls === 2);

// C-2: turned off by naive.config.json or NAIVE_CACHE
const off = init("off");
writeFileSync(join(off, "naive.config.json"), JSON.stringify({ cache: { enabled: false } }));
const o = await call({ venture: "off", route: "system/need-now", action: "run", workspace: ws });
expect("C-2: naive.config.json can turn caching off", o.ok && o.cache?.status === "off" && !existsSync(join(off, ".naive/cache")));
const envOff = spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), "system/need-now", "run", "--venture", "kettle", "--json"], { encoding: "utf8", env: { ...process.env, NAIVE_CACHE: "off" } });
expect("C-2: NAIVE_CACHE=off turns it off for one command", envOff.status === 0 && JSON.parse(envOff.stdout).cache?.status === "off", envOff.stderr);
const cli1 = spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), "system/time-to-ready", "run", "--venture", "kettle", "--json"], { encoding: "utf8" });
const cli2 = spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), "system/time-to-ready", "run", "--venture", "kettle", "--json"], { encoding: "utf8" });
expect("C-1: the cache holds across processes (the CLI twice)", JSON.parse(cli1.stdout).cache?.status === "miss" && JSON.parse(cli2.stdout).cache?.status === "hit", cli1.stderr + cli2.stderr);
writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ cache: { routes: { "system/need-now": false, "system/robots": "hours" } } }));
expect("C-3: a venture's naive.config.json can switch a route off or on", declarationFor(dir, "system/need-now") === null && declarationFor(dir, "system/robots")?.life === "hours");
writeFileSync(join(dir, "naive.config.json"), "{}\n");

// S-8 and C-5: judgments, through a stand-in judge that logs every question it is asked
const judgeLog = join(ws, "asked.log");
const judgeScript = join(ws, "judge.mjs");
writeFileSync(judgeScript, `import { appendFileSync } from "node:fs";
let s = ""; for await (const c of process.stdin) s += c;
const req = JSON.parse(s);
appendFileSync(${JSON.stringify(judgeLog)}, Object.keys(req.questions).join(",") + "\\n");
console.log(JSON.stringify({ model: req.model, answers: Object.fromEntries(Object.keys(req.questions).map((k) => [k, { noul: 0.9 }])) }));
`);
const asked = () => existsSync(judgeLog) ? readFileSync(judgeLog, "utf8").trim().split("\n").filter(Boolean) : [];
const cmd = ["node", judgeScript];
const q = (text) => ({ type: "noul", instructions: text, criteria: { true: "yes", false: "no" } });
const req = { state: { idea: "a kettle that never boils over" }, model: "jev-latest", questions: { a: q("Is it a product?"), b: q("Is it for cooks?") } };
const j1 = await judge(dir, req, { cmd });
const j2 = await judge(dir, req, { cmd });
expect("S-8: the first judgment asks the judge", j1.cache.status === "miss" && asked().length === 1 && j1.answers.a.noul === 0.9);
expect("S-8: the same state and question reuse the answer; the judge is not asked again", j2.cache.status === "hit" && asked().length === 1 && JSON.stringify(j2.answers) === JSON.stringify(j1.answers));
await judge(dir, { ...req, questions: { ...req.questions, c: q("Is it hardware?") } }, { cmd });
expect("S-8: only the new question goes to the judge", asked().at(-1) === "c");
await judge(dir, { ...req, state: { idea: "a kettle that sings" } }, { cmd });
expect("C-5: a changed state is asked again", asked().at(-1) === "a,b");
await judge(dir, { ...req, model: "jev-next" }, { cmd });
expect("C-5: a changed model is asked again", asked().at(-1) === "a,b");
const before = asked().length;
await judge(dir, req, { cmd, packages: ["foundation"] });
expect("C-5: a different package version set is asked again", asked().length === before + 1);
expect("S-8: with nothing cached and no judge, it says so", await judge(dir, { ...req, state: { new: 1 } }, { cmd: "" }).then(() => false, (e) => /NAIVE_JUDGE_CMD/.test(e.message)));
process.env.NAIVE_JUDGE_CMD = `node ${judgeScript}`;
const viaRoute = await call({ venture: "kettle", route: "system/judge", action: "run", input: req, workspace: ws });
expect("S-8: system/judge runs a request through the router and the cache", viaRoute.ok && viaRoute.result.cache.status === "hit", JSON.stringify(viaRoute).slice(0, 300));
const reqFile = join(ws, "req.json");
writeFileSync(reqFile, JSON.stringify(req));
const viaCli = spawnSync("node", [join(repo, "schema/caching.mjs"), "judge", dir, "--request", reqFile], { encoding: "utf8", env: process.env });
expect("S-8: node schema/caching.mjs judge reuses the stored answers", viaCli.status === 0 && JSON.parse(viaCli.stdout).cache.status === "hit", viaCli.stderr);

// C-7: private results are cached per person and never shared
const priv = (actor_id) => judge(dir, { ...req, state: { mine: "founder notes" } }, { cmd, private: true, actor: "agent", actor_id });
const p0 = asked().length;
const pa = await priv("ana"); const pa2 = await priv("ana"); const pb = await priv("ben");
expect("C-7: a private result is reused for the same person", pa.cache.status === "miss" && pa2.cache.status === "hit");
expect("C-7: another person never gets it; they are asked for their own", pb.cache.status === "miss" && asked().length === p0 + 2);
const anon1 = await priv(undefined); const anon2 = await priv(undefined);
expect("C-7: a private result with no named actor is never stored", anon2.cache.status === "miss" && anon1.cache.status === "miss");
const seenByBen = entries(dir, { identity: "ben" }).filter((e) => e.private);
expect("C-7: listing shows a person only their own private entries", seenByBen.length === 2 && entries(dir, { identity: "ana" }).filter((e) => e.private).every((e) => !seenByBen.some((b) => b.file === e.file)) && entries(dir).every((e) => !e.private), JSON.stringify(entries(dir, { identity: "ben" }).map((e) => [e.file, e.private])));
writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ cache: { routes: { "system/need-now": { life: "hours", vary: ["actor"] } } } }));
const na = await call({ venture: "kettle", route: "system/need-now", action: "run", actor: "agent", actor_id: "ana", workspace: ws });
const na2 = await call({ venture: "kettle", route: "system/need-now", action: "run", actor: "agent", actor_id: "ana", workspace: ws });
const nb = await call({ venture: "kettle", route: "system/need-now", action: "run", actor: "agent", actor_id: "ben", workspace: ws });
const nx = await call({ venture: "kettle", route: "system/need-now", action: "run", actor: "agent", workspace: ws, actor_id: undefined });
expect("C-7: a route that varies on the actor is cached per person", na.cache?.private && na2.cache?.status === "hit" && nb.cache?.status === "miss" && nx.cache?.status === "skip", JSON.stringify([na.cache, na2.cache, nb.cache, nx.cache]));
writeFileSync(join(dir, "naive.config.json"), "{}\n");

// C-8: one answer mixes confirmed records, agent records, cached judgments and fresh computation
await run("system/time-to-ready");
const ans = await call({ venture: "kettle", route: "system/answer", action: "run", workspace: ws,
  input: { routes: ["foundation/problem", "foundation/telos", "system/time-to-ready", "purpose/foundation"], judge: req } });
const kinds = Object.fromEntries((ans.result?.parts ?? []).map((p) => [p.route, p.kind]));
expect("C-8: a record a person wrote is confirmed", kinds["foundation/problem"] === "confirmed", JSON.stringify(kinds));
expect("C-8: a record not written yet is missing", kinds["foundation/telos"] === "missing");
expect("C-8: a cached command result is cached, a new one fresh", kinds["system/time-to-ready"] === "cached" && kinds["purpose/foundation"] === "fresh", JSON.stringify(kinds));
expect("C-8: a judgment part says it came from the cache", kinds["system/judge"] === "cached" && ans.result.parts.find((p) => p.route === "system/judge").level === "judgment");
expect("C-8: the answer counts its mix", ans.result.mix.confirmed === 1 && ans.result.mix.cached === 2 && ans.result.mix.fresh === 1, JSON.stringify(ans.result?.mix));
const agentWrite = await call({ venture: "kettle", route: "system/answer", action: "run", workspace: ws, input: { value: "foundation/problem" } });
expect("C-8: value a,b names the routes too", agentWrite.ok && agentWrite.result.parts.length === 1);

// F-2, F-12, O-5: within one action, reads and computed values are shared
const st = await actionScope(async () => { const ov = await call({ venture: "kettle", route: "system/overview", action: "run", workspace: ws }); return { ok: ov.ok, ...actionStats() }; });
const nnKey = Object.keys(st.computed).find((k) => k.startsWith("cmd:schema/need-now.mjs"));
expect("O-5: need-now runs once for the overview, shared by the layouts and the command", st.ok && nnKey && st.computed[nnKey] === 1 && (st.shared[nnKey] ?? 0) >= 1, JSON.stringify({ c: st.computed[nnKey], s: st.shared[nnKey] }));
expect("F-12: the route table is built once per action and shared", st.computed.routes === 1 && st.shared.routes >= 5, JSON.stringify(st));
const dl = await actionScope(async () => { const first = decisions(dir); holding(dir, "foundation/problem.json"); return { same: decisions(dir) === first, ...actionStats() }; });
expect("F-12: the decision list is computed once per action and shared", dl.same && dl.computed.decisions === 1 && dl.shared.decisions === 2, JSON.stringify(dl));
expect("F-12: an explicit now is computed, not shared", decisions(dir, Date.now()) !== decisions(dir, Date.now()));
expect("F-2: the venture state is hashed once per action", st.computed.state === 1);
const twice = await actionScope(async () => { await Promise.all([1, 2].map(() => call({ venture: "kettle", route: "foundation/problem", action: "read", workspace: ws }))); return actionStats(); });
const readKey = Object.keys(twice.computed).find((k) => k.startsWith("read:") && k.endsWith("foundation/problem.json"));
expect("F-2: the same record asked for twice in one action is read once", readKey && twice.computed[readKey] === 1 && twice.shared[readKey] === 1, JSON.stringify(twice));
const after = await actionScope(async () => {
  const x = await call({ venture: "kettle", route: "foundation/problem", action: "read", workspace: ws });
  await call({ venture: "kettle", route: "foundation/problem", action: "write", input: { ...problem, statement: "Kettles scald." }, actor: "person", workspace: ws });
  const y = await call({ venture: "kettle", route: "foundation/problem", action: "read", workspace: ws });
  return [x.result.statement, y.result.statement];
});
expect("F-2: a write in the action forgets what was read, so the next read sees it", after[0] === "Kettles boil over." && after[1] === "Kettles scald.", JSON.stringify(after));
expect("F-12: outside an action a memo computes every time", memo("k", () => 1) === 1 && actionStats() === null);
const separate = [await call({ venture: "kettle", route: "foundation/problem", action: "read", workspace: ws }), await call({ venture: "kettle", route: "foundation/problem", action: "read", workspace: ws })];
expect("F-2: two top-level calls are two actions, each reading fresh", separate.every((x) => x.ok && x.result.statement === "Kettles scald."));

// H-3: through the HTTP API, reads may use the cache and writes never do
const g1 = await http("POST", "/ventures/kettle/system/need-now/run");
const g2 = await http("POST", "/ventures/kettle/system/need-now/run");
expect("H-3: an API read uses the cache", g1[0] === 200 && g2[0] === 200 && g2[1].cache?.status === "hit", JSON.stringify([g1[1].cache, g2[1].cache]));
const put = await http("PUT", "/ventures/kettle/foundation/problem", { ...problem, statement: "Kettles whistle." });
expect("H-3: an API write never does, and the next read is computed again", put[1].ok && put[1].cache === undefined && (await http("POST", "/ventures/kettle/system/need-now/run"))[1].cache?.status === "miss", JSON.stringify(put[1]).slice(0, 300));

// C-1, C-17: looking after the store
const sts = stats(dir);
expect("C-17: the store is the venture's .naive/cache, which the router never routes", sts.store === ".naive/cache" && sts.entries > 3 && existsSync(join(dir, ".naive/cache/shared")));
const listed = await call({ venture: "kettle", route: "system/cache", action: "run", input: { value: "list" }, workspace: ws });
expect("C-1: system/cache lists the entries", listed.ok && listed.result.length === entries(dir).length);
expect("C-4: prune removes only expired entries", prune(dir, { now: Date.now() }) >= 0 && prune(dir, { now: Date.now() + 2 * 365 * 864e5 }) > 0 && entries(dir).every((e) => e.expires_at === null));
expect("C-1: clear empties the store", clear(dir) >= 0 && entries(dir).length === 0 && readdirSync(join(dir, ".naive/cache")).length >= 0);
expect("C-17: nothing was written into the repository", !existsSync(join(repo, ".naive/cache")));

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
