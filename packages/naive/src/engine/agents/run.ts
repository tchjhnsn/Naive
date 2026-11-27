// naive agent: Naive's agents from the terminal (EE-162). It lists the roles, prints a role's brief, and runs a role on
// a task through the harness the person names in NAIVE_AGENT_CMD (such as `claude -p`), with the prompt on stdin and
// MENTURA_ACTOR_ID set to the role, so every write the agent makes through naive meets the gate as that role's.
// Without NAIVE_AGENT_CMD, or with --print, it prints the prompt for the person to paste into any agent.
// No model and no network here: the harness is the host's choice, and in hosted mode the variable is ignored.
//
//   naive agent [list] [--venture <dir>]                      every role, and with a venture whether it is staffed
//   naive agent brief <role> [--venture <dir>] [--json]       how to act as the role
//   naive agent run <role> "<task>" [--venture <dir>] [--workflow <function>/<workflow>] [--print]
//   naive agent spawn <parent-role> --task "<text>" [--skills a,b] [--ttl "2 hours"] [--writes a,b] [--print]
//
// spawn is a function agent dividing its own work (EE-213): it records a temporary specialist of itself in the venture
// with reach equal to or narrower than its own and an expiry, runs it exactly as run does, and marks it finished when
// that run returns, after which the router refuses its writes. A specialist of a specialist is refused, and only the
// parent agent itself or a person may spawn one.
//
// With --workflow, the run is refused when that workflow's prerequisites are not met (EE-217,
// packages/naive/src/engine/prerequisites.ts). An agent never overrides a lock: only a person opens one.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSync } from "../../core/effect/run.ts";
import { envCommand } from "../../core/runtime.ts";
import { prerequisitesOf } from "../prerequisites.ts";
import type { AgentBrief } from "./brief.ts";
import { agentBrief, agentRoles } from "./brief.ts";
import { end, liveSpecialists, spawn } from "./specialist.ts";

const fence = (label: string, body: string): string => `### ${label}\n\n\`\`\`json\n${body}\n\`\`\``;
const pretty = (v: unknown): string => JSON.stringify(v, null, 2);

/** The prompt that staffs a role on one task: the brief's instructions, workflows, decision matrix and reach, then the task. */
export function agentPrompt(brief: AgentBrief, task: string, venture: string | null): string {
  const writes = (brief.spec.writes as readonly string[] | undefined) ?? [];
  return [
    `You are ${brief.role}, one of Naive's ${brief.kind === "lead" ? "lead agents" : brief.kind === "specialist" ? "temporary specialists" : "function agents"}${venture ? `, working in the venture at ${venture}` : ""}.`,
    brief.how,
    `## Task\n\n${task}`,
    `## How to read and write records\n\nRun naive from the venture folder with MENTURA_ACTOR_ID=${brief.role} set, which this run already sets: \`naive <route> read\`, \`naive <route> write --input <file>\`, \`naive decisions\`. A write outside your reach is refused, and a write the gate holds waits as a draft for a person. Raise a decision instead of guessing on anything the decision matrix escalates.`,
    // The levers that keep skipped work and extra skills inside the system (EE-213), named only where they apply.
    brief.kind === "function-agent"
      ? `## When you finish, and when you cannot\n\nRecord every workflow run with \`naive due record <function>/<workflow> --steps <the ids of the steps you finished>\`, so a step you did not finish stays on \`naive skipped\` instead of being lost, and say in the run why you left it. For a task inside your reach that needs skills you do not have, spawn one temporary specialist of your own: \`naive agent spawn ${brief.role} --task "<the one task>" [--skills a,b] [--ttl "2 hours"]\`. Its reach is never wider than yours, it ends with its ttl, and anything beyond its task comes back to you.`
      : "",
    `## What you may write\n\n${writes.length ? writes.map((w) => `- ${w}`).join("\n") : "Nothing outside decisions."}`,
    brief.instructions ? `## Instructions (${brief.instructions.path})\n\n${brief.instructions.text.trim()}` : "",
    brief.skill ? `## Skill (${brief.skill.path})\n\n${brief.skill.text.trim()}` : "",
    ...(brief.skills ?? []).map((s) => `## Skill (${s.path})\n\n${s.text.trim()}`),
    brief.assignments?.length ? `## Activity assignments\n\nFollow each rule. A person decided the ones marked assigned for this venture. The ones marked default follow from the activity's kind until the venture assigns them.\n\n${brief.assignments.map((a) => `- ${a.id} (${a.source}): ${a.statement} ${a.rule}`).join("\n")}` : "",
    brief.workflows?.length ? `## Workflows\n\n${brief.workflows.map((w) => fence(w.id, pretty(w.content))).join("\n\n")}` : "",
    brief.decisions ? `## Decision matrix\n\n${fence(brief.decisions.path, pretty(brief.decisions.content))}` : "",
  ].filter(Boolean).join("\n\n") + "\n";
}

/** The nearest venture.json in the current folder or its parents, as the other naive commands find it. */
function findVenture(from: string = process.cwd()): string | null {
  for (let d = resolve(from); ; d = dirname(d)) {
    if (existsSync(join(d, "venture.json"))) return d;
    if (dirname(d) === d) return null;
  }
}

const flag = (args: string[], name: string): string | null => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] ?? null : null; };
const list = (args: string[], name: string): string[] | undefined => flag(args, name)?.split(",").map((s) => s.trim()).filter(Boolean);
/** Every flag that takes a value, so the positional arguments can be told from them. */
const VALUED = ["--venture", "--workflow", "--task", "--skills", "--ttl", "--writes", "--by"];

function venture(args: string[]): string | null {
  const v = flag(args, "--venture");
  if (!v) return findVenture();
  const d = resolve(v);
  if (!existsSync(join(d, "venture.json"))) throw new Error(`no venture.json in ${d}`);
  return d;
}

function brief(role: string | undefined, dir: string | null): AgentBrief {
  if (!role) throw new Error("name a role: naive agent list shows them");
  const b = agentBrief(role, dir);
  if (b instanceof Error) throw b;
  return b;
}

/** Runs the CLI; returns the exit code. */
export function main(argv: string[]): number {
  const [cmd = "list", ...rest] = argv;
  const positional = rest.filter((a, i) => !a.startsWith("--") && !(i > 0 && VALUED.includes(rest[i - 1])));
  const dir = venture(rest);
  if (cmd === "list") {
    for (const role of agentRoles()) {
      const b = brief(role, dir);
      console.log(`${role.padEnd(26)} ${b.kind}${dir ? (b.staffed ? "  staffed" : "  not staffed") : ""}`);
    }
    // A specialist is a role in one venture, not in Naive's data, so it is listed only when a venture is given.
    if (dir) for (const s of runSync(liveSpecialists(dir, new Date().toISOString()))) console.log(`${s.id.padEnd(26)} specialist  of ${s.parent} until ${s.expires}`);
    return 0;
  }
  if (cmd === "brief") {
    const b = brief(positional[0], dir);
    console.log(rest.includes("--json") ? pretty(b) : agentPrompt(b, taskOf(b), dir));
    return 0;
  }
  if (cmd === "run") {
    const [role, ...words] = positional;
    const task = words.join(" ").trim();
    if (!task) throw new Error('give a task: naive agent run <role> "<task>"');
    // Prerequisites (EE-217): a blocked workflow is not run, by the loop or by hand. Only a person opens the lock.
    const workflow = flag(rest, "--workflow");
    if (workflow && dir) {
      const p = prerequisitesOf(dir, workflow);
      if (!p.met) throw new Error(`${workflow} is blocked, so it was not run: ${p.missing.map((m) => m.why).join("; ")}. Run naive blocked to see what unblocks it first.`);
    }
    return start(brief(role, dir), task, dir, rest);
  }
  if (cmd === "spawn") {
    // A function agent spawning one temporary specialist of itself (EE-213), then running it like any other role.
    if (!dir) throw new Error("naive agent spawn needs a venture: run it inside one or pass --venture <dir>");
    const parent = positional[0];
    if (!parent) throw new Error('name the parent: naive agent spawn <function>-agent --task "<text>"');
    const rec = runSync(spawn(dir, { parent, task: flag(rest, "--task") ?? "", skills: list(rest, "--skills"), ttl: flag(rest, "--ttl") ?? undefined, writes: list(rest, "--writes"), by: flag(rest, "--by") ?? process.env.MENTURA_ACTOR_ID ?? "person" }));
    console.error(`spawned ${rec.id}, a specialist of ${rec.parent}, until ${rec.expires}. It writes ${rec.writes.join(", ")}.`);
    const code = start(brief(rec.id, dir), rec.task, dir, rest);
    // Its run has ended, so its reach is gone whatever the exit code says. --print started nothing, so it stays live.
    if (!rest.includes("--print") && envCommand("NAIVE_AGENT_CMD")) runSync(end(dir, rec.id, "finished"));
    return code;
  }
  console.error('usage: naive agent [list] | brief <role> [--json] | run <role> "<task>" [--workflow <function>/<workflow>] [--print] | spawn <function>-agent --task "<text>" [--skills a,b] [--ttl "2 hours"] [--writes a,b]   (each takes --venture <dir>)');
  return 2;
}

/** The task a brief already carries: a specialist's is its spawn record's. */
const taskOf = (b: AgentBrief): string => (typeof b.spec.task === "string" ? b.spec.task : "(none yet: a task is given with naive agent run)");

/** Runs one role on one task through NAIVE_AGENT_CMD, or prints the prompt when there is none. Returns the exit code. */
function start(b: AgentBrief, task: string, dir: string | null, rest: string[]): number {
  const prompt = agentPrompt(b, task, dir);
  const harness = envCommand("NAIVE_AGENT_CMD");
  if (!harness || rest.includes("--print")) {
    process.stdout.write(prompt);
    if (!harness) console.error(`\nNo NAIVE_AGENT_CMD is set, so this is the prompt. Paste it into any agent with MENTURA_ACTOR_ID=${b.role} set, or set NAIVE_AGENT_CMD (for example "claude -p") and run again.`);
    return 0;
  }
  const [bin, ...binArgs] = harness.trim().split(/\s+/);
  const p = spawnSync(bin, binArgs, { input: prompt, stdio: ["pipe", "inherit", "inherit"], cwd: dir ?? process.cwd(), env: { ...process.env, MENTURA_ACTOR_ID: b.role } });
  if (p.error) throw new Error(`NAIVE_AGENT_CMD did not start: ${p.error.message}`);
  return p.status ?? 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { process.exit(main(process.argv.slice(2))); } catch (e) { console.error((e as Error).message); process.exit(1); }
}
