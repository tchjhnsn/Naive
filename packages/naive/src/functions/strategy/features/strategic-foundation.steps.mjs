// Step definitions for strategic-foundation.feature (EE-051), run by packages/naive/src/engine/bdd.mjs, on a copy of
// the example workspace.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("../../../../../../", import.meta.url).pathname;
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
const node = (w, script, ...a) => spawnSync("node", [join(repo, script), ...a], { encoding: "utf8", env: { ...process.env, MENTURA_WORKSPACE: w.ws }, input: "" });
const cli = (w, ...a) => node(w, "packages/naive/src/interfaces/cli/mentura.mjs", ...a);
const report = (w) => Object.fromEntries(JSON.parse(node(w, "packages/naive/src/engine/foundation.mjs", w.dir, "--json").stdout).flatMap((q) => q.statements.map((s) => [s.id, s.status])));
// One ICP profile record, foundation/icp/owners.json.
const icp = (id, forms) => ({ venture: id, updated: "2026-10-28", id: "owners", who: "Owners of small service shops", primary: true, ...(forms ? { problem_forms: forms } : {}) });
const putIcp = (w, rec) => { mkdirSync(join(w.dir, "foundation/icp"), { recursive: true }); writeFileSync(join(w.dir, "foundation/icp/owners.json"), JSON.stringify(rec)); };

export const steps = [
  [/^the example venture "([a-z-]+)"$/, (w, id) => {
    const d = mkdtempSync(join(tmpdir(), "foundation-"));
    cpSync(join(repo, "packages/naive/src/records/examples/workspace"), join(d, "workspace"), { recursive: true });
    w.ws = join(d, "workspace"); w.venture = id; w.dir = join(w.ws, "ventures", id); w.cleanup = () => rmSync(d, { recursive: true, force: true });
  }],
  // venture.json has no write route, so an agent's write is logged straight to the provenance log.
  [/^an agent writes the venture record$/, (w) => {
    const r = spawnSync("node", ["--input-type=module", "-e", `import { record, agentFromEnv } from ${JSON.stringify(join(repo, "packages/naive/src/core/provenance.mjs"))}; record(${JSON.stringify(w.dir)}, { entity: "venture.json", route: "venture", activity: "write", agent: agentFromEnv("agent", "router") });`], { encoding: "utf8" });
    ok(r.status === 0, r.stderr);
  }],
  [/^the founder asks for the strategic foundation$/, (w) => { w.report = report(w); }],
  [/^"([a-z-]+)" shows "([^"]+)"$/, (w, id, v) => {
    const s = JSON.parse(node(w, "packages/naive/src/engine/foundation.mjs", w.dir, "--json").stdout).flatMap((q) => q.statements).find((x) => x.id === id);
    ok(s?.value === v, `${id} shows ${JSON.stringify(s?.value)}`);
  }],
  [/^an ICP for "([a-z-]+)" that names no problem form$/, (w, id) => putIcp(w, icp(id))],
  [/^it answers "([a-z]+)", "([a-z]+)", "([a-z]+)", "([a-z]+)", "([a-z]+)", "([a-z]+)", "([a-z]+)" and "([a-z]+)"$/, (w, ...qs) => {
    const got = JSON.parse(node(w, "packages/naive/src/engine/foundation.mjs", w.dir, "--json").stdout).map((q) => q.question);
    ok(got.join() === qs.join(), `questions: ${got.join()}`);
  }],
  [/^"([a-z-]+)" is "([a-z]+)"$/, (w, id, status) => ok((w.report ??= report(w))[id] === status, `${id} is ${w.report[id]}, not ${status}`)],
  [/^the founder confirms "([a-z-]+)" by typing "([^"]+)"$/, (w, id, typed) => { w.p = cli(w, "confirm", id, "--venture", w.venture, "--confirm", typed); }],
  [/^the command is refused$/, (w) => ok(w.p.status !== 0, `it was not refused: ${w.p.stdout}`)],
  [/^an agent writes an ICP for "([a-z-]+)"$/, (w, id) => { const f = join(w.ws, "icp.json"); writeFileSync(f, JSON.stringify(icp(id))); w.p = cli(w, "foundation/icp/owners", "write", "--venture", w.venture, "--input", f); }],
  [/^the ICP write is a draft$/, (w) => ok(w.p.status === 0 && JSON.parse(w.p.stdout).draft === true, `write: ${w.p.stdout}${w.p.stderr}`)],
  [/^the founder accepts "([^"]+)" by typing "([^"]+)"$/, (w, rt, typed) => { w.p = cli(w, "accept", rt, "--venture", w.venture, "--confirm", typed); if (typed === rt) ok(w.p.status === 0, `accept failed: ${w.p.stdout}${w.p.stderr}`); }],
  [/^an ICP for "([a-z-]+)" that names the problem form "([a-z-]+)"$/, (w, id, form) => putIcp(w, icp(id, [form]))],
  [/^the strategic foundation are checked$/, (w) => { w.p = node(w, "packages/naive/src/engine/foundation.mjs", w.dir); }],
  [/^the check fails naming "([^"]+)"$/, (w, s) => ok(w.p.status === 1 && w.p.stderr.includes(s), `check: ${w.p.stderr}`)],
];
