// Venture packages (EE-067, EE-069): core packages by department, handoff packages by receiver, which
// open now, what moves on its own inside them, how complete each is, the question matrix, versions.
// Builds small ventures in a temp folder; no network.

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packages, request, situation, write, PACKAGES, HOME } from "./packages.mjs";
import { readDataModel } from "../records/index.mjs";

const MODEL = readDataModel();
let failed = 0;
const t = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const ok = (c, m) => { if (!c) throw new Error(m ?? "assertion failed"); };
const venture = (files) => {
  const v = mkdtempSync(join(tmpdir(), "pkg-"));
  for (const [f, x] of Object.entries(files)) { mkdirSync(join(v, f, ".."), { recursive: true }); writeFileSync(join(v, f), typeof x === "string" ? x : JSON.stringify(x)); }
  return v;
};
const person = (...es) => es.map((e) => JSON.stringify({ entity: e, activity: "write", agent: { kind: "person", id: "founder" } })).join("\n") + "\n";
const base = { "venture.json": { id: "kept", name: "Kept", phase: "discovery" }, "purpose/validation/problem.json": { statement: "Solo clinics lose visits to no-shows" } };
const by = (r) => Object.fromEntries([...r.core, ...r.handoff].map((p) => [p.id, p]));

t("every record lives in exactly one core package, and every reference and dependency names a known record type", () => {
  const ids = new Set(MODEL.records.map((r) => r.id)), seen = new Set();
  for (const [id, p] of Object.entries(PACKAGES.core)) {
    for (const r of [...p.required, ...p.optional]) { ok(ids.has(r), `${id}: ${r}`); ok(!seen.has(r), `${r} has two homes`); seen.add(r); }
    for (const r of p.refs) ok(HOME[r], `${id} reads ${r}, which has no home`);
  }
  for (const [r, x] of Object.entries(PACKAGES.records)) { ok(seen.has(r), `${r} is in no package`); for (const a of x.after) ok(PACKAGES.records[a], `${r} waits on unknown ${a}`); }
  for (const [id, h] of Object.entries(PACKAGES.handoff)) for (const c of h.from) ok(PACKAGES.core[c], `${id} draws on unknown ${c}`);
});

t("the assumed model leaves out what it does not model: no legal, operations or relationships package is computed", () => {
  const r = packages(venture(base));
  ok(PACKAGES.assumes.phases.join() === "discovery,validation", "assumes the first two phases");
  ok(!r.core.some((p) => ["legal", "operations", "relationships"].includes(p.id)) && r.not_modeled.some((x) => x.id === "legal"), JSON.stringify(r.not_modeled));
});

t("a discovery venture opens foundation and validation, and holds the investor handoff", () => {
  const p = by(packages(venture(base)));
  ok(p.foundation.in === "now" && p.validation.in === "now" && p.investor.in === "held", JSON.stringify(Object.values(p).map((x) => [x.id, x.in])));
  ok(p.foundation.state === "building" && p.foundation.missing.includes("icp"), JSON.stringify(p.foundation.missing));
});

t("inside a package a record moves on its own once what it reads first is confirmed, and waits otherwise", () => {
  const v = venture({ ...base, "provenance.jsonl": person("purpose/validation/problem.json") });
  const val = by(packages(v)).validation.records;
  const of = (id) => val.find((x) => x.record === id);
  ok(of("validation-solution").moves === "now" && of("validation-pricing").moves === "waits" && of("validation-pricing").waits_on[0] === "validation-solution", JSON.stringify(val.map((x) => [x.record, x.moves, x.waits_on])));
  ok(of("validation-problem").role === "reads" && of("validation-problem").home === "foundation", "the problem is read from Foundation");
});

t("the situation moves packages: raising opens the investor handoff, a partner-led ICP the partner handoff", () => {
  const v = venture({ ...base, "purpose/icp.json": { profiles: [{ id: "billers", who: "billing companies" }, { id: "clinics", who: "solo clinics", reached_through: ["billers"] }] } });
  const r = packages(v, { flags: { raising: true } });
  const p = by(r);
  ok(p.investor.in === "now" && p.partner.in === "now" && /raising/.test(p.investor.why), JSON.stringify([p.investor, p.partner].map((x) => [x.in, x.why])));
  ok(r.situation.questions.find((q) => q.id === "partner_led").by === "records", "partner-led settled by the records");
});

t("the question matrix asks Jev only what the records leave open, and its answers set or clear facts", () => {
  const v = venture(base);
  const q = request(v);
  ok(q.questions["q:raising"] && !q.questions["q:regulated"], Object.keys(q.questions).join(","));
  const s = situation(v, { answers: { "q:raising": { noul: 0.9 }, "q:hiring": { noul: 0.1 }, "q:site": { noul: 0.5 } } });
  const x = Object.fromEntries(s.questions.map((y) => [y.id, y]));
  ok(x.raising.value === true && x.raising.by === "jev" && x.hiring.value === false && x.site.value === null && x.site.by === "open", JSON.stringify(x));
});

t("a package is complete only when a person confirmed its required records and everything it reads", () => {
  const files = { ...base, "foundation/icp/a.json": { id: "a", who: "solo clinics" }, "products/kept.json": { id: "kept", name: "Kept" } };
  const some = packages(venture({ ...files, "provenance.jsonl": person("purpose/validation/problem.json", "foundation/icp/a.json") }));
  ok(by(some).foundation.state === "review", "the product it reads is not confirmed yet");
  const all = packages(venture({ ...files, "provenance.jsonl": person("purpose/validation/problem.json", "foundation/icp/a.json", "products/kept.json") }));
  ok(by(all).foundation.state === "complete" && all.complete.includes("foundation"), JSON.stringify(by(all).foundation));
});

t("the written view has a manifest with versions, an index naming what is assumed and not included, and a document per open package", () => {
  const v = venture(base);
  const out = write(v, packages(v));
  ok(existsSync(join(out, "venture-package.json")) && existsSync(join(out, "foundation.md")) && !existsSync(join(out, "investor.md")), "files");
  const idx = readFileSync(join(out, "README.md"), "utf8");
  ok(/^---\ntype: venture-package/.test(idx) && /## Assumed/.test(idx) && /## Not included\n\n- Agents\./.test(idx), idx.slice(0, 300));
  ok(/Solo clinics lose visits to no-shows/.test(readFileSync(join(out, "foundation.md"), "utf8")), "the problem rendered");
  const m = JSON.parse(readFileSync(join(out, "venture-package.json"), "utf8"));
  ok(m.versions.length === 1 && m.versions[0].tag === "package/kept/v1", JSON.stringify(m.versions));
  write(v, packages(v));
  ok(JSON.parse(readFileSync(join(out, "venture-package.json"), "utf8")).versions.length === 1, "no new version without a change");
});

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
