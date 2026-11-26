// Modeled ventures (EE-187), the org slice: subjects stay subjects, and unknown owners and makers stay null.
// Creates ventures with create-venture and runs the check as a process. It does not import the check.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import { judgeMaker, judgeOrg, makerFacts, orgFacts, reportingCycle } from "../terms/makers.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
const base = mkdtempSync(join(tmpdir(), "modeled-org-"));
const home = join(base, "home");
const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, ".config"), npm_config_user_agent: "" };
for (const k of ["TYPESAFE_API_KEY", "TYPESAFEAI_API_KEY", "MENTURA_TYPE_CMD", "MENTURA_ACTOR", "MENTURA_ACTOR_ID", "MENTURA_WORKSPACE"]) delete env[k];

const create = (args: string[], extra: Record<string, string> = {}) => spawnSync(process.execPath, [join(repo, "packages/create-venture/index.mjs"), ...args], { cwd: base, env: { ...env, ...extra }, encoding: "utf8" });
const check = (dir: string) => spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-modeled.ts"), dir], { encoding: "utf8" });
const lint = (dir: string) => spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/lint-people.ts"), dir, "--json"], { encoding: "utf8" });
const peopleCheck = (dir: string) => spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-people.ts"), dir], { encoding: "utf8" });

let failed = 0;
const ok = (c: unknown, m?: string) => { if (!c) throw new Error(m ?? "assertion failed"); };
const t = (name: string, fn: () => void) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${(e as Error).message}`); } };
const load = (p: string) => JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;

const decisions = (dir: string): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".decision.json")) out.push(p);
    }
  };
  walk(dir);
  return out;
};

t("open maker, named maker and org link judge the facts", () => {
  ok(judgeMaker(makerFacts(null, { resolves: false, isActor: false })).pass, "null is open");
  ok(judgeMaker(makerFacts(undefined, { resolves: false, isActor: false })).pass, "absent is open");
  ok(judgeMaker(makerFacts("ada-lovelace", { resolves: true, isActor: false })).pass, "a resolving person is named");
  ok(!judgeMaker(makerFacts("research-agent", { resolves: true, isActor: true })).pass, "the actor is not the maker");
  ok(!judgeMaker(makerFacts("ada-lovelace", { resolves: true, isActor: false, guessed: true })).pass, "a guess fails");
  ok(!judgeMaker(makerFacts("nobody", { resolves: false, isActor: false })).pass, "a name that does not resolve fails");
  ok(judgeOrg(orgFacts("ada", null, new Set(["ada"]), false)).pass, "null reports_to passes");
  ok(judgeOrg(orgFacts("ada", undefined, new Set(["ada"]), false)).pass, "absent reports_to passes");
  ok(judgeOrg(orgFacts("ada", "charles", new Set(["ada", "charles"]), false)).pass, "a known target passes");
  ok(!judgeOrg(orgFacts("ada", "grace", new Set(["ada"]), false)).pass, "a missing target fails");
  const cycle = reportingCycle([{ id: "ada", reports_to: "charles" }, { id: "charles", reports_to: "ada" }]);
  ok(cycle.has("ada") && cycle.has("charles"), [...cycle].join());
  ok(!judgeOrg(orgFacts("ada", "charles", new Set(["ada", "charles"]), cycle.has("ada"))).pass, "a cycle fails");
  ok(reportingCycle([{ id: "ada", reports_to: null }]).size === 0, "no link is not a cycle");
});

t("a modeled venture leaves owners and the decision-maker null and records the agent", () => {
  const r = create(["ada-labs", "--yes", "--skip-install", "--no-git", "--modeled", "--name", "Ada Lovelace"], { MENTURA_ACTOR: "agent", MENTURA_ACTOR_ID: "research-agent" });
  ok(r.status === 0, r.stderr + r.stdout);
  const dir = join(base, "ada-labs");
  const venture = load(join(dir, "venture.json"));
  ok(venture.mode === "modeled", JSON.stringify(venture.mode));
  const functions = venture.functions as Record<string, { owner: unknown }>;
  ok(Object.values(functions).every((f) => f.owner === null), JSON.stringify(functions));
  const roster = load(ventureFile(dir, "people/people.json"));
  ok(roster.mode === null, JSON.stringify(roster.mode));
  const people = roster.people as { id: string; name: string }[];
  ok(people[0].id === "ada-lovelace" && people[0].name === "Ada Lovelace", JSON.stringify(people[0]));
  const found = decisions(dir).map((p) => load(p));
  ok(found.length > 0 && found.every((d) => d.decision_maker === null), JSON.stringify(found.map((d) => d.decision_maker)));
  const founding = load(ventureFile(dir, "decisions/venture.team.decision.json"));
  ok(typeof founding.question === "string" && !/you/i.test(founding.question) && !/\bI\b/.test(founding.question), String(founding.question));
  const options = founding.options as string[];
  ok(options.every((o) => !o.includes("I am") && !o.includes("I want")), JSON.stringify(options));
  const lines = readFileSync(ventureFile(dir, "provenance.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as { agent?: { id?: string } });
  ok(lines.some((l) => l.agent?.id === "research-agent"), JSON.stringify(lines.map((l) => l.agent)));
  ok(lines.every((l) => l.agent?.id !== "ada-lovelace"), JSON.stringify(lines.map((l) => l.agent)));

  const held = check(dir);
  ok(held.status === 0, held.stdout + held.stderr);
  const peopleHeld = peopleCheck(dir);
  ok(peopleHeld.status === 0, peopleHeld.stdout + peopleHeld.stderr);
  const linted = lint(dir);
  ok(linted.status === 0, linted.stdout + linted.stderr);
  const findings = JSON.parse(linted.stdout) as { findings: { rule: string }[] };
  ok(!findings.findings.some((f) => f.rule === "role-no-function"), JSON.stringify(findings.findings));

  const rosterFile = ventureFile(dir, "people/people.json");
  const body = load(rosterFile);
  const listed = body.people as { id: string; reports_to?: string | null }[];
  listed.push({ id: "charles", name: "Charles Babbage", role: "co-founder" } as { id: string; reports_to?: string | null });
  listed[0].reports_to = "charles";
  writeFileSync(rosterFile, JSON.stringify(body, null, 2) + "\n");
  const linked = check(dir);
  ok(linked.status === 0, linked.stdout + linked.stderr);

  listed[1].reports_to = "ada-lovelace";
  writeFileSync(rosterFile, JSON.stringify(body, null, 2) + "\n");
  const cycled = check(dir);
  ok(cycled.status === 1, cycled.stdout);

  listed[0].reports_to = "grace";
  listed[1].reports_to = null;
  writeFileSync(rosterFile, JSON.stringify(body, null, 2) + "\n");
  const missing = check(dir);
  ok(missing.status === 1, missing.stdout);

  listed[0].reports_to = null;
  writeFileSync(rosterFile, JSON.stringify(body, null, 2) + "\n");
  const foundingFile = ventureFile(dir, "decisions/venture.team.decision.json");
  const decision = load(foundingFile);
  decision.decision_maker = "research-agent";
  decision.provenance = { drafted_by: { kind: "agent", id: "research-agent" } };
  writeFileSync(foundingFile, JSON.stringify(decision, null, 2) + "\n");
  const actor = check(dir);
  ok(actor.status === 1, actor.stdout);

  decision.decision_maker = "founder";
  writeFileSync(foundingFile, JSON.stringify(decision, null, 2) + "\n");
  const role = check(dir);
  ok(role.status === 0, role.stdout + role.stderr);

  delete decision.decision_maker;
  writeFileSync(foundingFile, JSON.stringify(decision, null, 2) + "\n");
  const absent = check(dir);
  ok(absent.status === 0, absent.stdout + absent.stderr);
  ok(!("decision_maker" in load(foundingFile)), "the field stayed absent");
});

t("a run venture keeps solo ownership and does not add decision_maker", () => {
  const r = create(["run-labs", "--yes", "--skip-install", "--no-git", "--name", "Ada Lovelace"]);
  ok(r.status === 0, r.stderr + r.stdout);
  const dir = join(base, "run-labs");
  const venture = load(join(dir, "venture.json"));
  ok(!("mode" in venture), JSON.stringify(venture.mode));
  const functions = venture.functions as Record<string, { owner: unknown }>;
  ok(Object.values(functions).every((f) => f.owner === "ada-lovelace"), JSON.stringify(functions));
  const roster = load(ventureFile(dir, "people/people.json"));
  ok(roster.mode === "solo", JSON.stringify(roster.mode));
  const found = decisions(dir).map((p) => load(p));
  ok(found.every((d) => !("decision_maker" in d)), JSON.stringify(found.map((d) => Object.keys(d))));
  const held = check(dir);
  ok(held.status === 0, held.stdout + held.stderr);
  ok(existsSync(ventureFile(dir, "decisions/venture.team.decision.json")));
});

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("modeled org: all pass");
