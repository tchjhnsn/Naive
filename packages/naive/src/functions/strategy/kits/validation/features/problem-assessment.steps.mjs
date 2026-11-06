// Step definitions for problem-assessment.feature (EE-050), run by packages/naive/src/engine/bdd.mjs. Records are
// written to a temp venture folder; interface scenarios run on a copy of the example workspace.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assess } from "../../../../../engine/assess-problem.mjs";

const repo = new URL("../../../../../../../../", import.meta.url).pathname;
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
const TODAY = new Date().toISOString().slice(0, 10);

const venture = (w) => w.dir ??= (() => { const d = mkdtempSync(join(tmpdir(), "assess-")); w.cleanup = () => rmSync(d, { recursive: true, force: true }); return d; })();
const save = (w) => { mkdirSync(join(venture(w), "purpose/validation"), { recursive: true }); writeFileSync(join(w.dir, "purpose/validation/problem.json"), JSON.stringify(w.rec)); };
const writeAt = (w, rel) => { const d = venture(w); mkdirSync(join(d, rel.split("/").slice(0, -1).join("/")), { recursive: true }); writeFileSync(join(d, rel), JSON.stringify(w.rec)); };
const item = (w, e) => { w.rec.evidence.push({ id: `e${w.rec.evidence.length + 1}`, summary: "test", collected: TODAY, ...e }); save(w); };
const result = (w) => w.out ??= assess(venture(w));
const label = (w, a) => result(w).assumptions?.find((x) => x.assumption === a)?.label;

// The example workspace, for interface scenarios.
const example = (w, id) => {
  const d = mkdtempSync(join(tmpdir(), "assess-ws-"));
  cpSync(join(repo, "packages/naive/src/records/examples/workspace"), join(d, "workspace"), { recursive: true });
  const was = process.env.MENTURA_WORKSPACE;
  process.env.MENTURA_WORKSPACE = join(d, "workspace");
  w.venture = id; w.cleanup = () => { process.env.MENTURA_WORKSPACE = was; if (was === undefined) delete process.env.MENTURA_WORKSPACE; rmSync(d, { recursive: true, force: true }); };
};
const router = () => import(join(repo, "packages/naive/src/router/router.mjs"));
const cli = (w, ...a) => spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), ...a, "--venture", w.venture], { encoding: "utf8", env: process.env, input: "" });

export const steps = [
  // Records.
  [/^a problem record with a statement and a segment only$/, (w) => { w.rec = { venture: "t", statement: "It hurts", segment: "Shop owners", evidence: [] }; save(w); }],
  [/^a complete problem record$/, (w) => { w.rec = { venture: "t", statement: "It hurts", segment: "Shop owners", cost: "Six hours a week", why_now: "Agents can now do the admin", evidence: [] }; save(w);
    for (const a of ["exists", "segment", "hurts", "why-now"]) item(w, { kind: "desk-research", audience: "unknown", assumption: a, source: { url: "https://example.com", checked: TODAY } }); }],
  [/^a venture with no problem record$/, (w) => { venture(w); }],
  [/^a problem record with a statement and a segment only, at foundation\/problem.json$/, (w) => { w.rec = { venture: "t", statement: "It hurts", segment: "Shop owners", evidence: [] }; writeAt(w, "foundation/problem.json"); }],
  [/^a complete problem record at foundation\/problem.json$/, (w) => {
    w.rec = { venture: "t", statement: "It hurts", segment: "Shop owners", cost: "Six hours a week", why_now: "Agents can now do the admin", evidence: [] };
    for (const a of ["exists", "segment", "hurts", "why-now"]) w.rec.evidence.push({ id: `e${w.rec.evidence.length + 1}`, summary: "test", collected: TODAY, kind: "desk-research", audience: "unknown", assumption: a, source: { url: "https://example.com", checked: TODAY } });
    writeAt(w, "foundation/problem.json");
  }],
  [/^it does not list "([^"]+)" as missing$/, (w, f) => ok(!(result(w).needs_input?.missing ?? result(w).missing ?? []).some((m) => m.field === f), `${f} was listed as missing`)],
  [/^a reported item that competitors have paying customers, bearing on "([a-z-]+)"$/, (w, a) => item(w, { kind: "behavior", audience: "adjacent", assumption: a, sample: { n: 1000 }, source: { url: "https://example.com/competitor", checked: TODAY } })],
  [/^a reported item that people pay for workarounds, bearing on "([a-z-]+)"$/, (w, a) => item(w, { kind: "desk-research", audience: "target", assumption: a, source: { url: "https://example.com/report", checked: TODAY } })],
  [/^an item against "([a-z-]+)" from the wrong audience$/, (w, a) => item(w, { kind: "opinion", audience: "wrong", assumption: a, supports: false, source: { path: "notes/friends.md" } })],
  [/^first-hand behavior from (\d+) people in the segment, bearing on "([a-z-]+)"$/, (w, n, a) => item(w, { kind: "behavior", audience: "target", assumption: a, sample: { n: Number(n) }, source: { path: "notes/interviews.md" } })],
  [/^first-hand behavior from (\d+) people in the segment against "([a-z-]+)"$/, (w, n, a) => item(w, { kind: "behavior", audience: "target", assumption: a, supports: false, sample: { n: Number(n) }, source: { path: "notes/interviews.md" } })],
  [/^behavior from (\d+) people in the segment reported by a vendor, bearing on "([a-z-]+)"$/, (w, n, a) => item(w, { kind: "behavior", audience: "target", assumption: a, sample: { n: Number(n) }, source: { url: "https://vendor.example.com", checked: TODAY } })],

  [/^the forms "([a-z-]+)" and "([a-z-]+)"$/, (w, a, b) => { w.rec.forms = [{ id: a, statement: `${a} problem` }, { id: b, statement: `${b} problem` }]; save(w); }],
  [/^the form "([a-z-]+)" is dropped$/, (w, a) => { w.rec.forms.find((f) => f.id === a).status = "dropped"; save(w); }],
  [/^first-hand behavior from (\d+) people in the segment, bearing on "([a-z-]+)" for the form "([a-z-]+)"$/, (w, n, a, f) => item(w, { kind: "behavior", audience: "target", assumption: a, form: f, sample: { n: Number(n) }, source: { path: "notes/interviews.md" } })],

  // Running.
  [/^the founder runs the assessment$/, (w) => { w.out = assess(venture(w)); }],
  [/^the founder runs the assessment as is$/, (w) => { w.out = assess(venture(w), { as_is: true }); }],

  // Asking first.
  [/^it does not assess yet$/, (w) => ok(result(w).needs_input && !result(w).assumptions, "it assessed without asking")],
  [/^it lists "([^"]+)" as missing$/, (w, f) => ok((result(w).needs_input?.missing ?? result(w).missing).some((m) => m.field === f), `${f} not listed as missing`)],
  [/^it offers to fill them in or to run as is$/, (w) => ok(result(w).needs_input?.options.map((o) => o.choice).join() === "fill-in,run-as-is", "the two choices are not offered")],
  [/^it assesses$/, (w) => ok(Array.isArray(result(w).assumptions), "it did not assess")],
  [/^it reports that it ran as is$/, (w) => ok(result(w).ran_as_is && result(w).missing.length > 0, "it did not report running as is")],
  [/^it does not report that it ran as is$/, (w) => ok(!result(w).ran_as_is, "it reported running as is")],

  // Labels and the ladder.
  [/^"([a-z-]+)" is "([a-z]+)"$/, (w, a, l) => ok(label(w, a) === l, `${a} is ${label(w, a)}, not ${l}`)],
  [/^"([a-z-]+)" is "([a-z]+)" when assessed$/, (w, a, l) => { w.out = assess(venture(w)); ok(label(w, a) === l, `${a} is ${label(w, a)}, not ${l}`); }],
  [/^no assumption is "contradicted"$/, (w) => ok(!result(w).assumptions.some((x) => x.label === "contradicted"), "an assumption is contradicted")],
  [/^the result never says "([^"]+)"$/, (w, s) => ok(!JSON.stringify(result(w)).toLowerCase().includes(s.toLowerCase()), `the result says ${s}`)],
  [/^the evidence supports "([a-z]+)"$/, (w, r) => ok(result(w).supports === r, `supports ${result(w).supports}, not ${r}`)],
  [/^to reach "([a-z]+)" it needs "([a-z-]+)" demonstrated$/, (w, r, a) => ok(result(w).next === r && result(w).blocking.some((b) => b.assumption === a && b.needs === "demonstrated"), `${a} is not named as blocking ${r}`)],
  [/^every blocking assumption has a test$/, (w) => ok(result(w).blocking.length > 0 && result(w).blocking.every((b) => b.test), "a blocking assumption has no test")],

  [/^the form "([a-z-]+)" has "([a-z-]+)" "([a-z]+)"$/, (w, f, a, l) => { const got = result(w).forms.find((x) => x.form === f)?.assumptions.find((x) => x.assumption === a)?.label; ok(got === l, `form ${f}: ${a} is ${got}, not ${l}`); }],
  [/^only the form "([a-z-]+)" is assessed$/, (w, f) => ok(result(w).forms.map((x) => x.form).join() === f, `forms assessed: ${result(w).forms.map((x) => x.form).join()}`)],

  // Interfaces.
  [/^the example venture "([a-z-]+)"$/, (w, id) => example(w, id)],
  [/^an agent runs "([^"]+)" through the router$/, async (w, rt) => { w.route = rt; w.r = await (await router()).call({ venture: w.venture, route: rt, action: "run" }); }],
  [/^the router answers with needs_input listing what is missing$/, (w) => ok(w.r.ok && w.r.needs_input?.missing.length > 0 && w.r.result === null, "no needs_input from the router")],
  [/^running it again with as_is assesses$/, async (w) => { const r = await (await router()).call({ venture: w.venture, route: w.route, action: "run", input: { as_is: true } }); ok(r.ok && r.result?.assumptions && !r.needs_input, "as_is did not assess"); }],
  [/^the founder runs "([^"]+)" through the CLI$/, (w, rt) => { w.route = rt; w.p = cli(w, rt, "run"); }],
  [/^the CLI prints the question and both choices$/, (w) => ok(w.p.status === 0 && /Fill them in first, or run it as is\?/.test(w.p.stdout) && /Fill in:/.test(w.p.stdout) && /Run as is:/.test(w.p.stdout), `CLI printed: ${w.p.stdout}${w.p.stderr}`)],
  [/^running it again with --as-is assesses$/, (w) => { const p = cli(w, w.route, "run", "--as-is"); ok(p.status === 0 && JSON.parse(p.stdout).assumptions?.length === 4, `CLI --as-is printed: ${p.stdout}${p.stderr}`); }],
  [/^an agent calls mentura_run for "([^"]+)" through MCP$/, async (w, rt) => { w.route = rt; const { handle } = await import(join(repo, "packages/naive/src/interfaces/mcp/server.mjs")); w.mcp = handle;
    w.m = await handle({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "mentura_run", arguments: { venture: w.venture, route: rt } } }); }],
  [/^the tool result tells the agent to ask the person and lists what is missing$/, (w) => ok(!w.m.result.isError && /^Ask the person before running/.test(w.m.result.content[0].text) && /"missing"/.test(w.m.result.content[0].text), "MCP did not ask")],
  [/^calling it again with as_is assesses$/, async (w) => { const m = await w.mcp({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "mentura_run", arguments: { venture: w.venture, route: w.route, as_is: true } } }); ok(JSON.parse(m.result.content[0].text).assumptions?.length === 4, "MCP as_is did not assess"); }],
  [/^a client posts to "([^"]+)" through the API$/, async (w, p) => { w.path = `/ventures/${w.venture}/${p}`; const { route } = await import(join(repo, "packages/naive/src/interfaces/api/server.mjs")); w.http = route; w.a = await route("POST", w.path); }],
  [/^the API answers with needs_input listing what is missing$/, (w) => ok(w.a[0] === 200 && w.a[1].needs_input?.missing.length > 0, "API did not answer needs_input")],
  [/^posting again with as_is assesses$/, async (w) => { const a = await w.http("POST", w.path, { as_is: true }); ok(a[0] === 200 && a[1].result?.assumptions?.length === 4, "API as_is did not assess"); }],
  [/^an agent writes the problem record through the router$/, async (w) => { const { call } = await router(); const cur = (await call({ venture: w.venture, route: "purpose/validation/problem", action: "read" })).result; w.r = await call({ venture: w.venture, route: "purpose/validation/problem", action: "write", input: cur }); }],
  [/^the write is a draft waiting for a person to accept it$/, (w) => ok(w.r.ok && w.r.result.draft === true, `write: ${JSON.stringify(w.r).slice(0, 200)}`)],
  [/^the problem-validation skill$/, (w) => { w.skill = readFileSync(join(repo, "packages/naive/src/functions/strategy/kits/validation/skills/problem-validation/SKILL.md"), "utf8"); }],
  [/^it tells the agent to show what is missing and ask whether to fill it in or run as is$/, (w) => ok(/Show the person that list and ask whether to fill it in or run as is/.test(w.skill) && /only after they chose it/.test(w.skill), "the skill does not say to ask first")],
];
