#!/usr/bin/env node
// Tests for the idea map (EE-059): ideas stay verbatim, tags stay within the conventions, and the
// .mdx round-trips. No network: Jev's answers are a fixture.
import { split, render, parse, clean, fromAnswers, summary, request, CONVENTIONS } from "./ideamap.mjs";
import { build, diff, GRAPH } from "./graph.mjs";
import { route, stageOf, ideasOf } from "./route.mjs";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile, spawnSync } from "node:child_process";
import { RELATIONS, namesBetween } from "../../../packages/naive/src/terms/relations.ts";
import { readSchema } from "../../../packages/naive/src/records/index.mjs";

// Tests start in order and may await a child process, so the command runs overlap; results print in order.
let failed = 0;
const results = [];
const t = (name, fn) => results.push((async () => fn())().then(() => `ok   ${name}`, (e) => { failed++; return `FAIL ${name}: ${e.message}`; }));
/** @returns {Promise<{ status: number | string, stdout: string, stderr: string }>} */
const node = (args) => new Promise((resolve) => execFile("node", args, { encoding: "utf8" }, (e, stdout, stderr) => resolve({ status: e ? (e.code ?? 1) : 0, stdout, stderr })));
const ok = (c, m) => { if (!c) throw new Error(m); };

const dump = `no shows are killing my clinic
I already built a google sheet that texts patients
- a $25 deposit {when} they book
- a waitlist <that> auto-texts

# marketing
facebook groups for PTs, there are huge ones and this sentence runs on long enough
that it wraps onto a second line in the dump`;

t("each bullet and line is one idea; a wrapped line joins its idea; headings name the section", () => {
  const ideas = split(dump);
  ok(ideas.length === 5, `got ${ideas.length}: ${JSON.stringify(ideas)}`);
  ok(ideas[4].section === "marketing" && ideas[4].text.endsWith("second line in the dump"), JSON.stringify(ideas[4]));
});

t("tags outside the conventions are dropped, and the pillar follows the first department", () => {
  const c = clean({ "i-01": { departments: ["products", "astrology"], records: ["product", "horoscope"], exists: true } });
  ok(JSON.stringify(c["i-01"]) === JSON.stringify({ departments: ["products"], records: ["product"], exists: true, pillar: "product" }), JSON.stringify(c));
});

t("the map round-trips, and every idea's text is unchanged, braces and angle brackets included", () => {
  const ideas = split(dump);
  const tags = { "i-03": { departments: ["finance"], records: ["validation-pricing"] } };
  const back = parse(render(ideas, tags, { venture: "kept", tagger: "fixture", created: "2026-10-28T00:00:00Z" }));
  ok(back.meta.tagged_by === "fixture" && back.ideas.length === ideas.length, JSON.stringify(back.meta));
  ideas.forEach((i, k) => ok(back.ideas[k].text === i.text, `${i.id}: ${back.ideas[k].text}`));
  ok(back.ideas[2].pillar === "business" && back.ideas[2].departments[0] === "finance", JSON.stringify(back.ideas[2]));
});

t("Jev's answers become tags at the threshold, at most two departments, strongest first", () => {
  const a = { "dept.finance:i-01": { noul: 0.95 }, "dept.strategy:i-01": { noul: 0.85 }, "dept.products:i-01": { noul: 0.9 }, "rec.product:i-01": { noul: 0.4 }, "exists:i-01": { noul: 0.9 } };
  const x = fromAnswers(a)["i-01"];
  ok(JSON.stringify(x.departments) === JSON.stringify(["finance", "products"]) && !x.records.length && x.exists, JSON.stringify(x));
});

t("an idea below the threshold still lands on its likeliest department, marked tentative", () => {
  const x = fromAnswers({ "dept.it:i-02": { noul: 0.6 }, "dept.finance:i-02": { noul: 0.3 } })["i-02"];
  ok(x.departments[0] === "it" && x.tentative, JSON.stringify(x));
});

t("the request asks every department, every record and exists, for every idea", () => {
  const r = request(split(dump), { id: "kept", phase: "discovery" });
  const per = Object.keys(CONVENTIONS.departments).length + Object.keys(CONVENTIONS.records).length + 1;
  ok(Object.keys(r.questions).length === 5 * per, `${Object.keys(r.questions).length}`);
});

t("the summary says what exists and which founder records the dump never mentions", () => {
  const s = summary({ ideas: [{ id: "i-01", text: "built it", pillar: "product", departments: ["products"], records: ["product"], exists: true }] });
  ok(s.product.exists.length === 1 && s.unasked.some((u) => u.record === "icp"), JSON.stringify(s));
});

const ideas = [
  { id: "i-01", text: "no-shows cost the clinic money", departments: ["strategy"], records: ["validation-problem"] },
  { id: "i-02", text: "a deposit when patients book", departments: ["products"], records: ["product"] },
  { id: "i-03", text: "charge $49 a month", departments: ["finance"], records: ["validation-pricing"] },
  { id: "i-04", text: "never sell patient data", departments: ["risk-and-compliance"], records: ["alignment"] },
];
const dep = (a, b, p) => ({ [`dep:${a}>${b}`]: { type: "noul", noul: p } });
const answers = { ...dep("i-01", "i-02", 0.9), ...dep("i-02", "i-03", 0.8), ...dep("i-01", "i-03", 0.7), ...dep("i-03", "i-01", 0.6), ...dep("i-01", "i-04", 0.2) };

t("the graph is a DAG: a dependency that closes a cycle is dropped, and implied ones are reduced", () => {
  const g = build(ideas, { answers });
  const e = g.edges.map((x) => `${x.from}>${x.to}`).sort();
  ok(JSON.stringify(e) === JSON.stringify(["i-01>i-02", "i-02>i-03"]), `edges ${e}`);
  ok(g.dropped.some((x) => x.from === "i-03" && x.to === "i-01"), JSON.stringify(g.dropped));
});

t("ideas tied by dependencies move in order; an idea tied to nothing moves on its own", () => {
  const g = build(ideas, { answers });
  const sync = g.lanes.find((l) => l.mode === "sync"), lone = g.lanes.find((l) => l.ideas.includes("i-04"));
  ok(sync && JSON.stringify(sync.ideas) === JSON.stringify(["i-01", "i-02", "i-03"]) && lone.mode === "async", JSON.stringify(g.lanes));
  ok(g.nodes.find((n) => n.id === "i-03").depth === 2, "depth");
});

t("the hash is Merkle: changing an idea changes its hash and every hash that builds on it, and nothing else", () => {
  const a = build(ideas, { answers });
  const b = build(ideas.map((i) => i.id === "i-02" ? { ...i, text: "a $25 deposit when patients book" } : i), { answers });
  const d = diff(a, b);
  ok(JSON.stringify(d.changed.sort()) === JSON.stringify(["i-02", "i-03"]) && a.root !== b.root, JSON.stringify(d));
});

t("signal favours what the phase needs and what others build on", () => {
  const g = build(ideas, { answers });
  ok(g.nodes[0].id === "i-01" && g.next[0] === "i-01", JSON.stringify(g.nodes.map((n) => [n.id, n.signal])));
});

t("without a judge, Naive's record order supplies the dependencies", () => {
  const g = build([{ ...ideas[0], departments: ["products"] }, ideas[1]]);
  ok(g.judged_by === "convention" && g.edges.length === 1 && g.edges[0].from === "i-01", JSON.stringify(g.edges));
});

t("a stated builds_on that the convention already gives is one edge, and the root does not move", () => {
  const pair = [{ ...ideas[0], departments: ["products"] }, ideas[1]];
  const plain = build(pair), twice = build([pair[0], { ...pair[1], relations: [{ relation: "builds_on", to: "i-01" }] }]);
  ok(twice.root === plain.root && twice.edges.length === 1 && JSON.stringify(twice.nodes.find((n) => n.id === "i-02").builds_on) === JSON.stringify(["i-01"]), JSON.stringify(twice.edges));
});

// Typed relations (S2-PR9): an idea's stated relations become typed edges, checked through the term typed-link.
const graphCli = new URL("./graph.mjs", import.meta.url).pathname;
const repoFile = (f) => new URL(`../../../${f}`, import.meta.url).pathname;
const examples = repoFile("packages/naive/src/records/examples/workspace/people/p-0a0a0a0a/ideas");
const checkFiles = (files) => {
  const d = mkdtempSync(join(tmpdir(), "ideas-"));
  for (const [f, r] of Object.entries(files)) writeFileSync(join(d, f), JSON.stringify(r));
  return node([graphCli, "check", d]);
};
const ideasFolder = (records) => checkFiles(Object.fromEntries(records.map((r) => [`${r.id}.json`, r])));

t("a stated relation becomes a typed edge; dependencies are builds_on, and only they shape the hashes", () => {
  const plain = build(ideas, { answers });
  const typed = build(ideas.map((i) => i.id === "i-04" ? { ...i, relations: [{ relation: "contradicts", to: "i-02" }, { relation: "builds_on", to: "i-03" }] } : i), { answers });
  ok(plain.edges.every((e) => e.relation === "builds_on"), JSON.stringify(plain.edges));
  ok(typed.edges.some((e) => e.from === "i-02" && e.to === "i-04" && e.relation === "contradicts" && e.by === "stated"), JSON.stringify(typed.edges));
  ok(JSON.stringify(typed.nodes.find((n) => n.id === "i-04").builds_on) === JSON.stringify(["i-03"]), "a stated builds_on joins the DAG");
  const noBuild = build(ideas.map((i) => i.id === "i-04" ? { ...i, relations: [{ relation: "contradicts", to: "i-02" }] } : i), { answers });
  ok(noBuild.root === plain.root && JSON.stringify(noBuild.nodes.map((n) => n.hash)) === JSON.stringify(plain.nodes.map((n) => n.hash)), "contradicts leaves every hash alone");
});

t("a relation outside the closed set is rejected through the term engine, by the check command and by the build", async () => {
  const r = await ideasFolder([{ id: "a", text: "x", captured: "2026-11-05", relations: [{ relation: "rebuts", to: "b" }] }, { id: "b", text: "y", captured: "2026-11-05" }]);
  ok(r.status === 1 && /a: rebuts b: rebuts is not a relation between ideas/.test(r.stdout), r.stdout + r.stderr);
  let threw = "";
  try { build([{ id: "i-01", text: "x", relations: [{ relation: "rebuts", to: "i-02" }] }, { id: "i-02", text: "y" }]); } catch (e) { threw = e.message; }
  ok(/rejected relations/.test(threw) && /rebuts/.test(threw), threw);
});

t("the example ideas pass: a contradicts relation, a builds_on, and an amends scope", async () => {
  const r = await node([graphCli, "check", examples]);
  ok(r.status === 0 && /typed-link passes/.test(r.stdout), r.stdout + r.stderr);
});

t("check refuses an id that does not name its file, so a second record with one id cannot hide a cycle", async () => {
  const r = await checkFiles({ "a.json": { id: "a", text: "x", captured: "2026-11-05", relations: [{ relation: "broader", to: "b" }] }, "az.json": { id: "a", text: "x", captured: "2026-11-05" },
    "b.json": { id: "b", text: "y", captured: "2026-11-05", relations: [{ relation: "broader", to: "a" }] } });
  ok(r.status === 1 && /FAIL az\.json: id a does not match the file name/.test(r.stdout) && /FAIL a: the same id in a\.json, az\.json/.test(r.stdout), r.stdout + r.stderr);
});

t("check names a relations entry that is not an object, and exits 1 without a stack", async () => {
  const r = await ideasFolder([{ id: "a", text: "x", captured: "2026-11-05", relations: [null, 7] }]);
  ok(r.status === 1 && /FAIL a: relations\[0\] is null/.test(r.stdout) && /FAIL a: relations\[1\] is 7/.test(r.stdout) && !r.stderr, r.stdout + r.stderr);
});

t("without the term engine, check refuses stated relations instead of passing them", async () => {
  const r = await node(["--no-experimental-strip-types", graphCli, "check", examples]);
  ok(r.status === 1 && /5 stated relation\(s\) need the EE-095 term engine/.test(r.stdout), r.stdout + r.stderr);
});

t("importing the router does not load the term engine; checking a stated relation does", async () => {
  const probe = `import { registerHooks } from "node:module";
const seen = new Set();
registerHooks({ resolve(s, c, next) { const r = next(s, c); seen.add(r.url); return r; } });
const engine = () => [...seen].some((u) => u.endsWith("/packages/naive/src/terms/engine.ts"));
await import(${JSON.stringify(repoFile("packages/naive/src/router/router.mjs"))});
const router = engine();
const { checkRelations } = await import(${JSON.stringify(graphCli)});
const problems = checkRelations([{ id: "a", relations: [{ relation: "related", to: "b" }] }, { id: "b" }]);
console.log(JSON.stringify({ router, check: engine(), problems }));`;
  const r = await node(["--input-type=module", "-e", probe]);
  ok(r.stdout.trim() === JSON.stringify({ router: false, check: true, problems: [] }), r.stdout + r.stderr);
});

t("a cycle stated through broader and narrower is one cycle; a self link, a missing idea and an unlisted scope are named", async () => {
  const [cyc, mixed, odd, notList, fresh] = await Promise.all([
    ideasFolder([{ id: "a", text: "x", captured: "2026-11-05", relations: [{ relation: "broader", to: "b" }] }, { id: "b", text: "y", captured: "2026-11-05", relations: [{ relation: "broader", to: "a" }] }]),
    ideasFolder([{ id: "a", text: "x", captured: "2026-11-05", relations: [{ relation: "broader", to: "b" }, { relation: "narrower", to: "b" }] }, { id: "b", text: "y", captured: "2026-11-05" }]),
    ideasFolder([{ id: "a", text: "x", captured: "2026-11-05", relations: [{ relation: "related", to: "a" }, { relation: "supports", to: "gone" }], scope: { scope: "naive@astrology", via: "amends" } }]),
    ideasFolder([{ id: "a", text: "x", captured: "2026-11-05", relations: { relation: "rebuts", to: "a" } }]),
    ideasFolder([{ id: "a", text: "x", captured: "2026-11-05", scope: { scope: "naive@astrology", via: "creates" } }]),
  ]);
  ok(cyc.status === 1 && /broader cycle through: a, b/.test(cyc.stdout), cyc.stdout);
  ok(mixed.status === 1 && /broader cycle through: a, b/.test(mixed.stdout), mixed.stdout);
  ok(odd.status === 1 && /relate to itself/.test(odd.stdout) && /supports gone: no idea has that id/.test(odd.stdout) && /naive@astrology: not a scope/.test(odd.stdout), odd.stdout);
  ok(notList.status === 1 && /a: relations is not a list/.test(notList.stdout), notList.stdout);
  ok(fresh.status === 0, `creates may name a scope the catalog does not list yet: ${fresh.stdout}`);
});

t("the schemas, the term engine and Lean name the same relations", () => {
  const idea = readSchema("founder-idea");
  const graph = readSchema("idea-graph");
  ok(JSON.stringify(idea.$defs.relation.enum) === JSON.stringify(namesBetween("idea")), `relation enum ${idea.$defs.relation.enum}`);
  ok(JSON.stringify(idea.$defs.attachment.enum) === JSON.stringify(namesBetween("scope")), `attachment enum ${idea.$defs.attachment.enum}`);
  ok(graph.properties.edges.items.properties.relation.$ref === "founder-idea.schema.json#/$defs/relation", "graph edges share the relation list");
  const lean = readFileSync(repoFile("packages/naive/lean/Naive/Terms.lean"), "utf8");
  const camel = (n) => n.replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase());
  const ctors = /inductive IdeaRelation((?:\s*\|\s*\w+)+)/.exec(lean)?.[1].split("|").map((x) => x.trim()).filter(Boolean);
  ok(JSON.stringify(ctors) === JSON.stringify(namesBetween("idea").map(camel)), `Lean IdeaRelation ${ctors}`);
  const arms = (fn) => Object.fromEntries([...(new RegExp(`def IdeaRelation\\.${fn}[^]*?\\n\\n`).exec(lean)?.[0] ?? "").matchAll(/\| \.(\w+) => some \.(\w+)/g)].map((m) => [m[1], m[2]]));
  const table = (field) => Object.fromEntries(namesBetween("idea").filter((n) => RELATIONS[n][field]).map((n) => [camel(n), camel(RELATIONS[n][field])]));
  ok(JSON.stringify(arms("inverse")) === JSON.stringify(table("inverse")), `inverse: Lean ${JSON.stringify(arms("inverse"))}`);
  ok(JSON.stringify(arms("order")) === JSON.stringify(table("order")), `order: Lean ${JSON.stringify(arms("order"))}`);
});

// Routes (EE-061): the graph's ideas go to the framework's destinations, each with a stage and a step.
const venture = (() => {
  const v = join(mkdtempSync(join(tmpdir(), "routes-")), "kept");
  spawnSync("node", [new URL("../../../packages/naive/src/engine/init-venture.mjs", import.meta.url).pathname, v, "kept", "--phase", "discovery"], { encoding: "utf8" });
  mkdirSync(join(v, "purpose/ideas"), { recursive: true });
  const tagged = [{ ...ideas[0], records: ["validation-problem"] }, { ...ideas[1], records: ["product"], exists: true }, { id: "i-03", text: "never sell patient data", departments: ["risk-and-compliance"], records: ["alignment"] }, { id: "i-04", text: "a vibe", departments: ["strategy"], records: [] }];
  writeFileSync(join(v, GRAPH), JSON.stringify(build(tagged)));
  return v;
})();

t("each tagged idea reaches its destination; an untagged one stays loose", () => {
  const r = route(venture);
  const problem = r.destinations.find((d) => d.id === "validation-problem");
  ok(problem && problem.ideas[0].id === "i-01" && r.loose.some((i) => i.id === "i-04"), JSON.stringify(r.destinations.map((d) => [d.id, d.ideas.map((i) => i.id)])));
});

t("a destination with ideas and nothing drafted is routed to an agent; Naive's product question is the founder's", () => {
  const r = route(venture);
  const problem = r.destinations.find((d) => d.id === "validation-problem"), products = r.destinations.find((d) => d.id === "product");
  ok(problem.stage === "routed" && problem.next.by === "agent", JSON.stringify(problem));
  ok(products.stage === "yours" && products.next.decision === "product-exists", JSON.stringify(products));
});

t("the team question fails open, so its destination moves on its own", () => {
  const team = route(venture).destinations.find((d) => d.id === "validation-team");
  ok(team && team.lane === "async", JSON.stringify(team));
});

t("docket stages follow what moves a decision next, and decisions trace to the ideas they cite", () => {
  ok(stageOf({ render: "now", action: { kind: "write" } }) === "routed" && stageOf({ render: "now", awaiting: "approval", action: { kind: "decide" } }) === "drafted"
    && stageOf({ render: "now", action: { kind: "decide" } }) === "yours" && stageOf({ render: "waiting" }) === "waiting" && stageOf({ render: "done" }) === "done", "stages");
  ok(JSON.stringify(ideasOf({ ideas: ["i-02"], question: "Lead with i-03?", answer: "Yes, i-03 and i-02" })) === JSON.stringify(["i-02", "i-03"]), "ideasOf");
});

for (const line of await Promise.all(results)) console.log(line);
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nall passing");
