// naive agent: Naive's agents from the terminal (EE-162). It lists the roles, prints a role's brief, and runs a role on
// a task through the harness the person names in NAIVE_AGENT_CMD (such as `claude -p`), with the prompt on stdin and
// MENTURA_ACTOR_ID set to the role, so every write the agent makes through naive meets the gate as that role's.
// Without NAIVE_AGENT_CMD, or with --print, it prints the prompt for the person to paste into any agent.
// No model and no network here: the harness is the host's choice, and in hosted mode the variable is ignored.
//
//   naive agent [list] [--venture <dir>]                      every role, and with a venture whether it is staffed
//   naive agent brief <role> [--venture <dir>] [--json]       how to act as the role
//   naive agent run <role> "<task>" [--venture <dir>] [--print]

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { envCommand } from "../../core/runtime.ts";
import type { AgentBrief } from "./brief.ts";
import { agentBrief, agentRoles } from "./brief.ts";

const fence = (label: string, body: string): string => `### ${label}\n\n\`\`\`json\n${body}\n\`\`\``;
const pretty = (v: unknown): string => JSON.stringify(v, null, 2);

/** The prompt that staffs a role on one task: the brief's instructions, workflows, decision matrix and reach, then the task. */
export function agentPrompt(brief: AgentBrief, task: string, venture: string | null): string {
  const writes = (brief.spec.writes as readonly string[] | undefined) ?? [];
  return [
    `You are ${brief.role}, one of Naive's ${brief.kind === "lead" ? "lead agents" : "function agents"}${venture ? `, working in the venture at ${venture}` : ""}.`,
    brief.how,
    `## Task\n\n${task}`,
    `## How to read and write records\n\nRun naive from the venture folder with MENTURA_ACTOR_ID=${brief.role} set, which this run already sets: \`naive <route> read\`, \`naive <route> write --input <file>\`, \`naive decisions\`. A write outside your reach is refused, and a write the gate holds waits as a draft for a person. Raise a decision instead of guessing on anything the decision matrix escalates.`,
    `## What you may write\n\n${writes.length ? writes.map((w) => `- ${w}`).join("\n") : "Nothing outside decisions."}`,
    brief.instructions ? `## Instructions (${brief.instructions.path})\n\n${brief.instructions.text.trim()}` : "",
    brief.skill ? `## Skill (${brief.skill.path})\n\n${brief.skill.text.trim()}` : "",
    brief.assignments?.length ? `## Activity assignments\n\nA person decided these for this venture. Follow each rule.\n\n${brief.assignments.map((a) => `- ${a.id}: ${a.statement} ${a.rule}`).join("\n")}` : "",
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
  const positional = rest.filter((a, i) => !a.startsWith("--") && !(i > 0 && ["--venture"].includes(rest[i - 1])));
  const dir = venture(rest);
  if (cmd === "list") {
    for (const role of agentRoles()) {
      const b = brief(role, dir);
      console.log(`${role.padEnd(26)} ${b.kind}${dir ? (b.staffed ? "  staffed" : "  not staffed") : ""}`);
    }
    return 0;
  }
  if (cmd === "brief") {
    const b = brief(positional[0], dir);
    console.log(rest.includes("--json") ? pretty(b) : agentPrompt(b, "(none yet: a task is given with naive agent run)", dir));
    return 0;
  }
  if (cmd === "run") {
    const [role, ...words] = positional;
    const task = words.join(" ").trim();
    if (!task) throw new Error('give a task: naive agent run <role> "<task>"');
    const b = brief(role, dir);
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
  console.error('usage: naive agent [list] | brief <role> [--json] | run <role> "<task>" [--print]   (each takes --venture <dir>)');
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { process.exit(main(process.argv.slice(2))); } catch (e) { console.error((e as Error).message); process.exit(1); }
}
