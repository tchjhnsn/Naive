#!/usr/bin/env node
// Tests the goal ledger through the router (EE-210, the hook in packages/naive/src/router/router.ts over
// packages/naive/src/engine/goals.ts): an agent proposes a goal and the write is held as a draft for a person; an
// agent's write that settles a goal is never live, as a write that settles a decision is never live (EE-058); a
// person's write lands; an agent does not reword a goal a person adopted; and nobody breaks the lifecycle. The
// venture lives in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/goal-ledger-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../../router/router.ts";
import { entries } from "../../core/provenance.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import { GOALS } from "../../engine/goals.ts";
import type { Goal } from "../../records/types/records.d.ts";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: unknown, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 500)}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "goal-ledger-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_READS_AS_OF", "MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_MODEL"]) { delete process.env[k]; delete env[k]; }

interface Reply { ok: boolean, error?: string, gate_rule?: string, result?: { written?: string, draft?: boolean } }
const write = async (input: Partial<Goal>, who: { actor: string, actor_id?: string }): Promise<Reply> =>
  await call({ venture: "lab", workspace: ws, route: `${GOALS}/${input.id}`, action: "write", input, ...who }) as Reply;

const goal = (over: Partial<Goal> & { id: string }): Goal => ({ statement: `the goal ${over.id}`, kind: "venture", ...over });
const dir = join(ws, "ventures/lab");
const liveGoal = (id: string): Goal | null => { const f = ventureFile(dir, `${GOALS}/${id}.json`); return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) as Goal : null; };

try {
  const made = spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/init-venture.ts"), dir, "lab", "--type", "software-startup"], { encoding: "utf8", env });
  if (made.status !== 0) throw new Error(made.stderr || made.stdout);

  // An agent proposes a goal. The goal's decision class holds every agent write as a draft, so nothing is live yet.
  const proposed = await write(goal({ id: "end", statement: "Ten customers pay" }), { actor: "agent", actor_id: "strategy-agent" });
  expect("an agent may propose a goal", proposed.ok, proposed);
  expect("the proposal waits as a draft, so a list read of the live goals finds none", proposed.result?.draft === true && !liveGoal("end"), proposed.result);

  // A person writes the goal, so there is something live to settle.
  const byPerson = await write(goal({ id: "end", statement: "Ten customers pay" }), { actor: "person" });
  expect("a person's write lands", byPerson.ok && byPerson.result?.draft !== true && liveGoal("end")?.statement === "Ten customers pay", byPerson);

  // An agent that would settle it is held, whatever the gate says: only a person's acceptance puts it live.
  const settling = await write({ ...goal({ id: "end", statement: "Ten customers pay" }), status: "active", status_by: "strategy-agent" }, { actor: "agent", actor_id: "strategy-agent" });
  expect("an agent's write that settles a goal is held, not live", settling.ok && settling.result?.draft === true, settling);
  expect("the live goal is still proposed", (liveGoal("end")?.status ?? "proposed") === "proposed", liveGoal("end"));

  // A person adopts it, with an owner and a measure, so check-goals is satisfied too.
  const adopted = { ...goal({ id: "end", statement: "Ten customers pay" }), status: "active" as const, status_by: "Founder", status_at: "2026-11-26T00:00:00Z", owner: "Founder", measures: [{ id: "paying", statement: "Paying customers", target: 10 }] };
  const live = await write(adopted, { actor: "person" });
  expect("a person adopts it, and the record is live", live.ok && liveGoal("end")?.status === "active", live);

  // An agent does not reword what a person adopted.
  const reworded = await write({ ...adopted, statement: "Five customers pay" }, { actor: "agent", actor_id: "strategy-agent" });
  expect("an agent rewording an adopted goal is refused, and told to supersede it",
    !reworded.ok && !!reworded.error?.includes("supersedes") && liveGoal("end")?.statement === "Ten customers pay", reworded);

  // Nobody breaks the lifecycle, a person included: a settled goal reopens only to active.
  const met = await write({ ...adopted, status: "met", result: { note: "Twelve paying customers" } }, { actor: "person" });
  expect("a person settles it as met", met.ok && liveGoal("end")?.status === "met", met);
  const jumped = await write({ ...adopted, status: "missed", result: { note: "no" } }, { actor: "person" });
  expect("a met goal does not become missed, even for a person", !jumped.ok && !!jumped.error?.includes("does not become missed") && liveGoal("end")?.status === "met", jumped);

  // A new goal is never refused for its lifecycle, and the whole history is in provenance.
  const next = await write(goal({ id: "end-2", statement: "A hundred customers pay", supersedes: ["end"] }), { actor: "person" });
  expect("a person writes the goal that replaces it", next.ok, next);
  const lines = entries(dir).filter((e) => e.entity === `${GOALS}/end.json`);
  expect("every write of the goal is in the provenance log, each with the bytes it wrote",
    lines.length === 3 && lines.every((e) => !!e.sha256) && lines.map((e) => e.activity).join(" ") === "write write write", lines.map((e) => [e.activity, e.agent?.kind]));
  const history = spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/goals.ts"), dir, "history", "end", "--json"], { encoding: "utf8", env });
  const versions = (JSON.parse(history.stdout) as { versions: { status: string | null }[] }).versions;
  expect("naive goals history reads every version back", history.status === 0 && versions.map((v) => v.status).join(" ") === "proposed active met", versions.map((v) => v.status));

  const check = spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-goals.ts"), dir], { encoding: "utf8", env });
  expect("check-goals passes on the venture the router wrote", check.status === 0, check.stdout + check.stderr);
} finally {
  rmSync(ws, { recursive: true, force: true });
}

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("goal ledger: all passed");
