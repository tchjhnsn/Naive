// Faithful author (EE-188). The process that writes a record is the author. --name is the subject in
// people/, and it is not copied into the provenance agent. phase --override records a person only when
// the process is a person.
//
//   node packages/naive/src/terms/authorship-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import { authorFromProcess, authorshipFacts, processKind } from "./authorship.ts";
import { run } from "./engine.ts";
import { faithfulAuthor } from "./terms.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 500)}`}`);
  if (!ok) failed++;
};

const saved = {
  MENTURA_ACTOR: process.env.MENTURA_ACTOR,
  MENTURA_ACTOR_ID: process.env.MENTURA_ACTOR_ID,
  MENTURA_MODEL: process.env.MENTURA_MODEL,
};
function setEnv(actor: string | undefined, id: string | undefined): void {
  if (actor === undefined) delete process.env.MENTURA_ACTOR;
  else process.env.MENTURA_ACTOR = actor;
  if (id === undefined) delete process.env.MENTURA_ACTOR_ID;
  else process.env.MENTURA_ACTOR_ID = id;
}
function restoreEnv(): void {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

const agentFacts = authorshipFacts("agent", "agent", false);
expect("a matching agent passes faithful author", run(faithfulAuthor, agentFacts).pass);
const copied = run(faithfulAuthor, authorshipFacts("agent", "agent", true));
expect("a copied subject fails A3", !copied.pass && copied.failed.includes("A3"), copied.failed);
const mismatch = run(faithfulAuthor, authorshipFacts("agent", "person", false));
expect("a written person for an agent process fails A2", !mismatch.pass && mismatch.failed.includes("A2"), mismatch.failed);
const unconfirmed = run(faithfulAuthor, authorshipFacts("person", "person", false, false));
expect("unconfirmed facts fail P7", !unconfirmed.pass && unconfirmed.failed.includes("P7"), unconfirmed.failed);

try {
  setEnv("agent", "research-agent");
  expect("processKind reads an agent", processKind() === "agent");
  const ignored = authorFromProcess({ via: "cli", by: "ada-lovelace", claim: "person" });
  expect("an agent ignores --by and a person claim", ignored.kind === "agent" && ignored.id === "research-agent", ignored);
  setEnv("person", "torian");
  const person = authorFromProcess({ via: "cli", by: "ada-lovelace", claim: "person" });
  expect("a person id wins over --by", person.kind === "person" && person.id === "torian", person);
  setEnv("person", undefined);
  const named = authorFromProcess({ via: "cli", by: "mina", claim: "person" });
  expect("--by names a person when MENTURA_ACTOR_ID is unset", named.kind === "person" && named.id === "mina", named);
} finally {
  restoreEnv();
}

const root = mkdtempSync(join(tmpdir(), "authorship-"));
const home = join(root, "home");
const dir = join(root, "ada");
mkdirSync(home, { recursive: true });
type Line = { entity?: string; agent?: { kind?: string; id?: string } };
const logPath = (): string => ventureFile(dir, "provenance.jsonl");
const logText = (): string => readFileSync(logPath(), "utf8");
const logLines = (): Line[] => logText().split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Line);
const phaseOf = (): string => (JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")) as { phase: string }).phase;
function childEnv(extra: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, ".config"), npm_config_user_agent: "" };
  for (const k of ["MENTURA_ACTOR", "MENTURA_ACTOR_ID", "MENTURA_MODEL", "MENTURA_SESSION", "MENTURA_HARNESS"]) delete env[k];
  return { ...env, ...extra };
}
const runNode = (script: string, args: string[], env: NodeJS.ProcessEnv) => spawnSync(process.execPath, [join(repo, script), ...args], { encoding: "utf8", env });

try {
  const made = runNode("packages/create-venture/index.mjs", [dir, "--type", "software-startup", "--name", "Ada Lovelace", "--by", "someone", "--yes", "--skip-install", "--no-git"], childEnv({ MENTURA_ACTOR: "agent", MENTURA_ACTOR_ID: "research-agent" }));
  expect("create-venture exits 0", made.status === 0, (made.stdout ?? "") + (made.stderr ?? ""));
  if (made.status === 0) {
    const founder = ventureFile(dir, "people/founders/ada-lovelace.json");
    expect("agent plus --name Ada Lovelace writes people/founders/ada-lovelace.json", existsSync(founder));
    const founderLines = logLines().filter((l) => l.entity === "people/founders/ada-lovelace.json");
    expect("the founder write is kind agent id research-agent", founderLines.length === 1 && founderLines[0]?.agent?.kind === "agent" && founderLines[0]?.agent?.id === "research-agent", founderLines);
    expect("the subject id is not copied into any provenance agent", logLines().every((l) => l.agent?.kind === "agent" && l.agent?.id === "research-agent") && !logLines().some((l) => l.agent?.id === "ada-lovelace" || l.agent?.id === "someone"), logLines().map((l) => l.agent));

    const before = logText();
    const agentPhase = runNode("packages/naive/src/interfaces/cli/naive.ts", ["phase", "validation", "--override", "an agent must not", "--venture", dir], childEnv({ MENTURA_ACTOR: "agent", MENTURA_ACTOR_ID: "research-agent" }));
    expect("naive phase --override with MENTURA_ACTOR=agent is refused", agentPhase.status !== 0, (agentPhase.stdout ?? "") + (agentPhase.stderr ?? ""));
    expect("the phase stays discovery", phaseOf() === "discovery", phaseOf());
    expect("an agent override writes no provenance line", logText() === before);

    const menturaPhase = runNode("packages/naive/src/interfaces/cli/mentura.ts", ["phase", "validation", "--venture", "ada", "--as", "person", "--override", "an agent must not"], childEnv({ MENTURA_ACTOR: "agent", MENTURA_ACTOR_ID: "research-agent", MENTURA_WORKSPACE: root }));
    expect("mentura phase --as person --override with MENTURA_ACTOR=agent is refused", menturaPhase.status !== 0, (menturaPhase.stdout ?? "") + (menturaPhase.stderr ?? ""));
    expect("mentura phase leaves the phase put", phaseOf() === "discovery", phaseOf());
    expect("mentura phase writes no person line", logText() === before);

    const criteria = ventureFile(dir, "foundation/exit-criteria/discovery.json");
    mkdirSync(dirname(criteria), { recursive: true });
    writeFileSync(criteria, JSON.stringify({ phase: "discovery", criteria: [{ id: "problem", statement: "The problem is real" }] }, null, 2) + "\n");
    const beforeMeet = logText();
    const met = runNode("packages/naive/src/engine/lifecycle.ts", [dir, "meet", "problem"], childEnv({ MENTURA_ACTOR: "agent", MENTURA_ACTOR_ID: "research-agent" }));
    expect("meet with MENTURA_ACTOR=agent is refused", met.status !== 0, (met.stdout ?? "") + (met.stderr ?? ""));
    expect("meet writes no person line", logText() === beforeMeet);
    const criterion = JSON.parse(readFileSync(criteria, "utf8")) as { criteria: { met?: unknown }[] };
    expect("the criterion stays unmet", criterion.criteria[0]?.met == null);

    const beforePerson = logText();
    const personPhase = runNode("packages/naive/src/interfaces/cli/naive.ts", ["phase", "validation", "--override", "the founder asked", "--venture", dir], childEnv({ MENTURA_ACTOR: "person", MENTURA_ACTOR_ID: "torian" }));
    expect("a person with MENTURA_ACTOR=person and MENTURA_ACTOR_ID=torian may override", personPhase.status === 0 && phaseOf() === "validation", (personPhase.stdout ?? "") + (personPhase.stderr ?? ""));
    const added = logText().slice(beforePerson.length).split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Line);
    expect("the new lines name torian", added.length > 0 && added.every((l) => l.agent?.kind === "person" && l.agent?.id === "torian"), added.map((l) => l.agent));
  }

  const check = (args: string[]) => spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-authorship.ts"), ...args], { encoding: "utf8" });
  expect("the check passes a matching agent", check(["--process", "agent", "--written", "agent"]).status === 0);
  expect("the check fails a copied subject", check(["--process", "agent", "--written", "agent", "--subject-copied"]).status === 1);
  expect("the check fails an unconfirmed write", check(["--process", "person", "--written", "person", "--unconfirmed"]).status === 1);
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
