// People lint (people/lint): a role with no function, a hire before the team plan names the role,
// and a decision owned by no person. Fixtures are temp ventures. The CLI is what a founder runs.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lint } from "./lint-people.mjs";
import { routes } from "../interface/router.mjs";

const root = new URL("..", import.meta.url).pathname;
const cli = join(root, "schema/lint-people.mjs");
let failed = 0;
const t = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const ok = (c, m) => { if (!c) throw new Error(m ?? "assertion failed"); };
const rulesOf = (r, id) => r.findings.filter((x) => x.rule === id);
const venture = (files) => {
  const dir = mkdtempSync(join(tmpdir(), "people-lint-"));
  for (const [rel, body] of Object.entries(files)) {
    const p = join(dir, rel);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, typeof body === "string" ? body : JSON.stringify(body, null, 2) + "\n");
  }
  return dir;
};
const run = (dir, extra = []) => spawnSync(process.execPath, [cli, dir, ...extra], { encoding: "utf8" });

const founder = (extra = {}) => ({ id: "ada", name: "Ada Lovelace", role: "founder", hats: ["products"], ...extra });
const plan = (roles, recruiting = []) => ({ venture: "kept", roles, ...(recruiting.length ? { recruiting } : {}) });
const role = (id, occupant, extra = {}) => ({ id, occupant, needed_by: "discovery", status: occupant === "person" && id !== "founder" ? "open" : "filled", ...(id === "founder" ? {} : { name: id }), ...extra });
const decided = (extra = {}) => ({
  id: "pay", question: "Whom do we pay first?", status: "decided",
  provenance: { drafted_by: { kind: "person", id: "ada" }, approved_by: "Ada Lovelace", approved_at: "2026-10-29T00:00:00Z", phase: "discovery", wording: "own" },
  ...extra,
});
const base = (over = {}) => ({
  "venture.json": { id: "kept", name: "Kept", phase: "discovery", departments: ["products"] },
  "people/people.json": { venture: "kept", mode: "solo", people: [founder()] },
  "people/team-plan.json": plan([role("founder", "person"), role("architect", "agent")]),
  "decisions/pay.decision.json": decided(),
  ...over,
});

t("a clean venture is silent and exits 0", () => {
  const dir = venture(base());
  const r = lint(dir);
  ok(r.ok && r.findings.length === 0, JSON.stringify(r.findings));
  ok(r.rules.every((x) => x.mode === "fail-open" && x.severity === "warn"), JSON.stringify(r.rules));
  const cliRun = run(dir, ["--json"]);
  ok(cliRun.status === 0 && JSON.parse(cliRun.stdout).findings.length === 0, cliRun.stdout + cliRun.stderr);
});

t("role-no-function fires when a founder owns no function, and clears when the function is given", () => {
  const dir = venture(base({
    "people/people.json": { venture: "kept", mode: "solo", people: [founder({ hats: [] })] },
  }));
  const fired = lint(dir);
  ok(rulesOf(fired, "role-no-function").length === 1 && rulesOf(fired, "hire-before-plan").length === 0 && rulesOf(fired, "decision-no-person").length === 0, JSON.stringify(fired.findings));
  ok(fired.findings[0].file === "people/people.json" && /ada|Ada/.test(fired.findings[0].message) && fired.findings[0].suggestion, JSON.stringify(fired.findings[0]));
  writeFileSync(join(dir, "people/people.json"), JSON.stringify({ venture: "kept", mode: "solo", people: [founder()] }, null, 2) + "\n");
  ok(lint(dir).findings.length === 0, JSON.stringify(lint(dir).findings));
});

t("a person role on the team plan with no function fires, and an advisor does not", () => {
  const dir = venture(base({
    "people/team-plan.json": plan([role("founder", "person"), role("engineer", "person"), role("advisor", "person")]),
  }));
  const hits = rulesOf(lint(dir), "role-no-function");
  ok(hits.length === 1 && hits[0].file === "people/team-plan.json" && /engineer/.test(hits[0].message), JSON.stringify(hits));
});

t("hire-before-plan follows team plan edits and hires in either order", () => {
  const unnamed = venture(base({
    "people/people.json": { venture: "kept", mode: "team", people: [founder(), { id: "bea", name: "Bea", role: "operator" }] },
  }));
  const early = lint(unnamed);
  ok(rulesOf(early, "hire-before-plan").length === 1 && rulesOf(early, "role-no-function").length === 0, JSON.stringify(early.findings));
  writeFileSync(join(unnamed, "people/team-plan.json"), JSON.stringify(plan([role("founder", "person"), role("operator", "person", { name: "Operator" })]), null, 2) + "\n");
  ok(rulesOf(lint(unnamed), "hire-before-plan").length === 0, JSON.stringify(lint(unnamed).findings));

  const named = venture(base({
    "people/team-plan.json": plan([role("founder", "person"), role("operator", "person", { name: "Operator" })]),
    "people/people.json": { venture: "kept", mode: "team", people: [founder(), { id: "bea", name: "Bea", role: "operator" }] },
  }));
  ok(rulesOf(lint(named), "hire-before-plan").length === 0, JSON.stringify(lint(named).findings));

  const recruiting = venture(base({
    "people/team-plan.json": plan([role("founder", "person")], [{ role: "engineer", kind: "hire", brief: "briefs/engineer.md" }]),
  }));
  ok(rulesOf(lint(recruiting), "hire-before-plan").length === 1 && /engineer/.test(lint(recruiting).findings[0].message), JSON.stringify(lint(recruiting).findings));
  writeFileSync(join(recruiting, "people/team-plan.json"), JSON.stringify(plan([role("founder", "person"), role("engineer", "agent")], [{ role: "engineer", kind: "hire", brief: "briefs/engineer.md" }]), null, 2) + "\n");
  ok(lint(recruiting).findings.length === 0, JSON.stringify(lint(recruiting).findings));
});

t("a cofounder recruiting entry and an advisor on the roster are not hires", () => {
  const dir = venture(base({
    "people/people.json": { venture: "kept", mode: "team", people: [founder(), { id: "cy", name: "Cy", role: "advisor" }] },
    "people/team-plan.json": plan([role("founder", "person")], [{ role: "friend", kind: "cofounder", brief: "briefs/friend.md" }]),
  }));
  ok(lint(dir).findings.length === 0, JSON.stringify(lint(dir).findings));
});

t("decision-no-person fires on a decided decision with no person, and stays silent when a person decides or it is open", () => {
  const dir = venture(base({
    "decisions/pay.decision.json": decided({ provenance: { drafted_by: { kind: "agent", id: "builder" } } }),
    "decisions/open.decision.json": { id: "open", question: "Later?", status: "open", provenance: { drafted_by: { kind: "agent", id: "builder" } } },
  }));
  const fired = lint(dir);
  ok(rulesOf(fired, "decision-no-person").length === 1 && rulesOf(fired, "decision-no-person")[0].file === "decisions/pay.decision.json", JSON.stringify(fired.findings));
  writeFileSync(join(dir, "decisions/pay.decision.json"), JSON.stringify(decided(), null, 2) + "\n");
  ok(lint(dir).findings.length === 0, "naming Ada did not clear it");
  const agentName = venture(base({
    "decisions/pay.decision.json": decided({ decided_by: "builder", provenance: { drafted_by: { kind: "agent", id: "builder" }, approved_by: "builder" } }),
  }));
  ok(rulesOf(lint(agentName), "decision-no-person").length === 1, JSON.stringify(lint(agentName).findings));
});

t("exit 1 if and only if a fail-closed rule has a finding", () => {
  const dir = venture(base({
    "people/people.json": { venture: "kept", mode: "solo", people: [founder({ hats: [] })] },
    "decisions/pay.decision.json": decided({ provenance: { drafted_by: { kind: "agent", id: "builder" } } }),
  }));
  const open = run(dir);
  ok(open.status === 0 && /2 finding/.test(open.stdout), open.stdout + open.stderr);
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ people_lint: { rules: { "hire-before-plan": { mode: "fail-closed" } } } }) + "\n");
  ok(run(dir).status === 0, "a closed rule with no finding must exit 0");
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ people_lint: { rules: { "role-no-function": { mode: "fail-closed" }, "hire-before-plan": { mode: "fail-open" } } } }) + "\n");
  const closed = run(dir, ["--json"]);
  const body = JSON.parse(closed.stdout);
  ok(closed.status === 1 && body.ok === false && body.findings.some((x) => x.rule === "role-no-function" && x.mode === "fail-closed") && body.findings.some((x) => x.rule === "decision-no-person" && x.mode === "fail-open"), closed.stdout);
  writeFileSync(join(dir, "people/people.json"), JSON.stringify({ venture: "kept", mode: "solo", people: [founder()] }, null, 2) + "\n");
  writeFileSync(join(dir, "decisions/pay.decision.json"), JSON.stringify(decided(), null, 2) + "\n");
  ok(run(dir).status === 0, "fail-closed with no findings must exit 0");
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ people_lint: { rules: { "role-no-function": { mode: "shut" } } } }) + "\n");
  writeFileSync(join(dir, "people/people.json"), JSON.stringify({ venture: "kept", mode: "solo", people: [founder({ hats: [] })] }, null, 2) + "\n");
  ok(run(dir).status === 0 && lint(dir).findings[0].mode === "fail-open", "an unknown mode stays fail-open");
});

t("missing or malformed records do not crash, and a bad file does not hide another", () => {
  const empty = venture({ "venture.json": { id: "kept", name: "Kept", phase: "discovery" } });
  ok(lint(empty).findings.length === 0 && run(empty).status === 0, "missing records");
  const garbled = venture({
    "venture.json": { id: "kept", name: "Kept", phase: "discovery" },
    "people/people.json": "{",
    "people/team-plan.json": "not json",
    "decisions/pay.decision.json": "{",
    "naive.config.json": "{",
  });
  ok(lint(garbled).findings.length === 0 && run(garbled).status === 0, "malformed records");
  const mixed = venture(base({
    "people/people.json": "[",
    "people/team-plan.json": plan([role("architect", "agent")]),
    "decisions/pay.decision.json": decided({ provenance: { drafted_by: { kind: "agent", id: "builder" } } }),
  }));
  const mixedRun = lint(mixed);
  ok(rulesOf(mixedRun, "decision-no-person").length === 1 && rulesOf(mixedRun, "role-no-function").length === 0 && rulesOf(mixedRun, "hire-before-plan").length === 0, JSON.stringify(mixedRun.findings));
  const odd = venture(base({ "people/people.json": { venture: "kept", mode: "solo", people: "nope" }, "people/team-plan.json": { venture: "kept", roles: "nope", recruiting: { kind: "hire" } } }));
  ok(Array.isArray(lint(odd).findings), "odd shapes threw");
});

t("records are read through ventureFile, including a structured venture", () => {
  const dir = venture({
    "venture.json": { id: "kept", name: "Kept", phase: "discovery", layout: "structured", functions: { product: { owner: "decoy" } } },
    "people/people.json": { venture: "kept", mode: "solo", people: [{ id: "decoy", name: "Decoy", role: "founder" }] },
    "k-base/people/people.json": { venture: "kept", mode: "solo", people: [{ id: "kbase", name: "Kbase", role: "founder" }] },
    "naive.config.json": { people_lint: { rules: { "role-no-function": { mode: "fail-open" } } } },
    "meta/naive.config.json": { people_lint: { rules: { "role-no-function": { mode: "fail-closed" } } } },
    "decisions/pay.decision.json": decided({ provenance: { drafted_by: { kind: "person", id: "decoy" }, approved_by: "Decoy" } }),
    "k-base/decisions/pay.decision.json": decided({ provenance: { drafted_by: { kind: "agent", id: "builder" } } }),
  });
  const cliRun = run(dir, ["--json"]);
  const body = JSON.parse(cliRun.stdout);
  ok(cliRun.status === 1, cliRun.stdout + cliRun.stderr);
  ok(body.findings.some((x) => x.rule === "role-no-function" && x.file === "people/people.json" && /Kbase/.test(x.message)), JSON.stringify(body.findings));
  ok(body.findings.some((x) => x.rule === "decision-no-person" && x.file === "decisions/pay.decision.json"), JSON.stringify(body.findings));
  ok(!body.findings.some((x) => /Decoy/.test(x.message)), JSON.stringify(body.findings));
});

t("people/team-plan.json wins over operations/team-plan.json when both exist", () => {
  const dir = venture(base({
    "operations/team-plan.json": plan([role("founder", "person")], [{ role: "engineer", kind: "hire", brief: "briefs/engineer.md" }]),
  }));
  ok(lint(dir).findings.length === 0, JSON.stringify(lint(dir).findings));
  const onlyOps = venture({
    "venture.json": { id: "kept", name: "Kept", phase: "discovery", departments: ["products"] },
    "people/people.json": { venture: "kept", mode: "solo", people: [founder()] },
    "operations/team-plan.json": plan([role("founder", "person")], [{ role: "engineer", kind: "hire", brief: "briefs/engineer.md" }]),
    "decisions/pay.decision.json": decided(),
  });
  ok(rulesOf(lint(onlyOps), "hire-before-plan").length === 1 && lint(onlyOps).findings[0].file === "operations/team-plan.json", JSON.stringify(lint(onlyOps).findings));
});

t("the people/lint route is registered on the router", () => {
  const route = routes().find((r) => r.route === "people/lint");
  ok(route && route.kind === "command" && route.script === "schema/lint-people.mjs" && route.actions.includes("run"), JSON.stringify(route));
});

t("usage with no venture exits 2", () => {
  const r = spawnSync(process.execPath, [cli], { encoding: "utf8" });
  ok(r.status === 2 && /usage/.test(r.stderr), r.stderr);
});

process.exit(failed ? 1 : 0);
