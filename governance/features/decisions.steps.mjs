// Step definitions for decisions.feature (EE-054, EE-057), run by schema/bdd.mjs, on a copy of the
// example workspace.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const repo = new URL("../../", import.meta.url).pathname;
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
const node = (w, script, ...a) => spawnSync("node", [join(repo, script), ...a], { encoding: "utf8", env: { ...process.env, MENTURA_WORKSPACE: w.ws }, input: "" });
const put = (w, file, d) => { const f = join(w.dir, file); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(d, null, 2)); };
const decide = (w, id, d) => put(w, `governance/decisions/${id}.decision.json`, { id, question: `What about ${id}?`, decides: { record: "decision-rights", path: "governance/decision-rights.json" }, status: "open", ...d });
const venture = (w, f) => { const p = join(w.dir, "venture.json"); const v = JSON.parse(readFileSync(p, "utf8")); f(v); writeFileSync(p, JSON.stringify(v, null, 2)); };
const find = (w, id) => (w.report ??= JSON.parse(node(w, "schema/decisions.mjs", w.dir, "--json").stdout)).decisions.find((d) => d.id === id);

export const steps = [
  [/^the example venture "([a-z-]+)"$/, (w, id) => {
    const d = mkdtempSync(join(tmpdir(), "decisions-"));
    cpSync(join(repo, "schema/examples/workspace"), join(d, "workspace"), { recursive: true });
    w.ws = join(d, "workspace"); w.venture = id; w.dir = join(w.ws, "ventures", id); w.cleanup = () => rmSync(d, { recursive: true, force: true });
  }],
  [/^an open decision "([a-z-]+)" that fails closed$/, (w, id) => decide(w, id, { boundary: "fail-closed" })],
  [/^an open decision "([a-z-]+)" under "([a-z-]+)"$/, (w, id, parent) => decide(w, id, { parent })],
  [/^an open decision "([a-z-]+)" needed in "([a-z]+)"$/, (w, id, phase) => decide(w, id, { needed_in: phase })],
  [/^an open decision "([a-z-]+)" about the product "([a-z-]+)"( that fails closed)?$/, (w, id, product, closed) =>
    put(w, `products/decisions/${product}.${id}.decision.json`, { id, question: `What about ${id}?`, status: "open", ...(closed ? { boundary: "fail-closed" } : {}) })],
  [/^a decision "([a-z-]+)"(?: under "([a-z-]+)")? decided at "([^"]+)"( by nobody)?$/, (w, id, parent, at, nobody) =>
    decide(w, id, { ...(parent ? { parent } : {}), status: "decided", answer: "yes", provenance: { drafted_by: { kind: "agent", id: "claude" }, ...(nobody ? {} : { approved_by: "Founder", approved_at: at, phase: "discovery", wording: "approved" }) } })],
  [/^an agent's wording for an open decision "([a-z-]+)"$/, (w, id) => decide(w, id, { answer: "Charge per seat", provenance: { drafted_by: { kind: "agent", id: "claude" } } })],
  [/^a decision "([a-z-]+)" with the outcome "([a-z-]+)" marked "([a-z]+)" and no actual outcome$/, (w, id, o, result) =>
    decide(w, id, { status: "decided", answer: "yes", provenance: { drafted_by: { kind: "person", id: "Founder" }, approved_by: "Founder", approved_at: "2026-10-20T00:00:00Z", phase: "validation", wording: "own" }, outcomes: [{ id: o, projected: "Ten paying shops", result }] })],
  [/^"([a-z-]+)" awaits approval$/, (w, id) => ok(find(w, id)?.awaiting === "approval", `${id}: ${JSON.stringify(find(w, id))}`)],
  [/^"([a-z-]+)" was approved by "([^"]+)" in "([a-z]+)"$/, (w, id, by, ph) => { const p = find(w, id)?.provenance; ok(p?.approved_by === by && p?.phase === ph, `${id}: ${JSON.stringify(p)}`); }],
  [/^a deferred decision "([a-z-]+)" for the statement "([a-z-]+)"$/, (w, id, statement) => put(w, `purpose/decisions/telos.${id}.decision.json`, { id, question: `What is the ${statement}?`, statement, status: "deferred" })],
  [/^the workspace is a product without a venture$/, (w) => venture(w, (v) => { v.kind = "product"; })],
  [/^the venture is in "([a-z]+)"$/, (w, phase) => venture(w, (v) => { v.phase = phase; })],
  [/^the founder asks for the decisions$/, (w) => { w.report = null; find(w, "venture"); }],
  [/^the decisions are checked$/, (w) => { w.p = node(w, "schema/decisions.mjs", w.dir); }],
  [/^"([a-z-]+)" renders "([a-z]+)"$/, (w, id, r) => ok(find(w, id)?.render === r, `${id} renders ${find(w, id)?.render}, not ${r}`)],
  [/^"([a-z-]+)" fails open$/, (w, id) => ok(find(w, id)?.boundary === "fail-open", `${id} is ${find(w, id)?.boundary}`)],
  [/^"([a-z-]+)" is "([a-z]+)"$/, (w, id, f) => ok(find(w, id)?.firmness === f, `${id} is ${find(w, id)?.firmness}, not ${f}`)],
  [/^there is no decision "([a-z-]+)"$/, (w, id) => ok(!find(w, id), `${id} is listed`)],
  [/^the check fails naming "([^"]+)"$/, (w, s) => ok(w.p.status === 1 && w.p.stderr.includes(s), `check: ${w.p.status} ${w.p.stderr}`)],
  [/^an agent writes the product "([a-z-]+)"$/, (w, id) => {
    const f = join(w.ws, "product.json");
    writeFileSync(f, readFileSync(join(w.dir, "products", `${id}.json`)));
    w.p = spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), `purpose/product/${id}`, "write", "--venture", w.venture, "--input", f], { encoding: "utf8", env: { ...process.env, MENTURA_WORKSPACE: w.ws }, input: "" });
  }],
  [/^the product write is a draft held by "([a-z-]+)"$/, (w, id) => {
    ok(w.p.status === 0, `write: ${w.p.stdout}${w.p.stderr}`);
    const r = JSON.parse(w.p.stdout);
    ok(r.draft === true && r.held_by === id, `write: ${w.p.stdout}`);
  }],
];
