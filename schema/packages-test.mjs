// Venture packages (EE-067): which packages fit a venture now, how complete each is, and what the
// question matrix asks. Builds small ventures in a temp folder; no network.

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packages, request, situation, write, PACKAGES } from "./packages.mjs";

const MODEL = JSON.parse(readFileSync(new URL("./data-model.json", import.meta.url), "utf8"));
let failed = 0;
const t = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const ok = (c, m) => { if (!c) throw new Error(m ?? "assertion failed"); };
const venture = (files) => {
  const v = mkdtempSync(join(tmpdir(), "pkg-"));
  for (const [f, x] of Object.entries(files)) { mkdirSync(join(v, f, ".."), { recursive: true }); writeFileSync(join(v, f), typeof x === "string" ? x : JSON.stringify(x)); }
  return v;
};
const base = { "venture.json": { id: "kept", name: "Kept", phase: "discovery" }, "purpose/validation/problem.json": { statement: "Solo clinics lose visits to no-shows" } };

t("every package names record types the data model knows", () => {
  const ids = new Set(MODEL.records.map((r) => r.id));
  for (const [id, p] of Object.entries(PACKAGES.packages)) for (const r of [...p.required, ...p.optional]) ok(ids.has(r), `${id}: ${r}`);
  for (const q of PACKAGES.questions.items) for (const m of q.moves) ok(PACKAGES.packages[m], `${q.id} moves ${m}`);
});

t("a discovery venture gets the foundation and validation packages, and holds the investor package", () => {
  const r = packages(venture(base));
  const by = Object.fromEntries(r.packages.map((p) => [p.id, p]));
  ok(by.foundation.in === "now" && by.validation.in === "now" && by.investor.in === "held" && by.governance.in === "held", JSON.stringify(r.packages.map((p) => [p.id, p.in])));
  ok(by.foundation.state === "building" && by.foundation.missing.includes("icp"), JSON.stringify(by.foundation));
});

t("the situation moves packages: raising brings the investor package, a partner-led ICP the partner package", () => {
  const v = venture({ ...base, "purpose/icp.json": { profiles: [{ id: "billers", who: "billing companies" }, { id: "clinics", who: "solo clinics", reached_through: ["billers"] }] } });
  const r = packages(v, { flags: { raising: true } });
  const by = Object.fromEntries(r.packages.map((p) => [p.id, p]));
  ok(by.investor.in === "now" && by.partner.in === "now" && /raising/.test(by.investor.why), JSON.stringify([by.investor, by.partner].map((p) => [p.in, p.why])));
  ok(r.situation.questions.find((q) => q.id === "partner_led").by === "records", "partner-led settled by the records");
});

t("the question matrix asks Jev only what the records leave open, and its answers set or clear facts", () => {
  const v = venture(base);
  const q = request(v);
  ok(q.questions["q:raising"] && !q.questions["q:regulated"], Object.keys(q.questions).join(","));
  const s = situation(v, { answers: { "q:raising": { noul: 0.9 }, "q:hiring": { noul: 0.1 }, "q:site": { noul: 0.5 } } });
  const by = Object.fromEntries(s.questions.map((x) => [x.id, x]));
  ok(by.raising.value === true && by.raising.by === "jev" && by.hiring.value === false && by.site.value === null && by.site.by === "open", JSON.stringify(by));
});

t("a package is ready to hand off only when a person confirmed every required record", () => {
  const v = venture({ ...base, "purpose/icp.json": { profiles: [{ id: "a", who: "solo clinics" }] }, "products/kept.json": { id: "kept", name: "Kept" },
    "provenance.jsonl": ["purpose/validation/problem.json", "purpose/icp.json", "products/kept.json"].map((e) => JSON.stringify({ entity: e, activity: "write", agent: { kind: "person", id: "founder" } })).join("\n") + "\n" });
  const r = packages(v);
  const f = r.packages.find((p) => p.id === "foundation");
  ok(f.state === "ready" && r.ready.includes("foundation"), JSON.stringify(f));
});

t("the written package has a manifest, an index that says agents are not included, and a document per fitting package", () => {
  const v = venture(base);
  const r = packages(v);
  const out = write(v, r);
  ok(existsSync(join(out, "venture-package.json")) && existsSync(join(out, "foundation.md")) && !existsSync(join(out, "investor.md")), "files");
  const idx = readFileSync(join(out, "README.md"), "utf8");
  ok(/^---\ntype: venture-package/.test(idx) && /## Not included\n\n- Agents\./.test(idx), idx.slice(0, 300));
  ok(/Solo clinics lose visits to no-shows/.test(readFileSync(join(out, "foundation.md"), "utf8")), "the problem rendered");
});

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
