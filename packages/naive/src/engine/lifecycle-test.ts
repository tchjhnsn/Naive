// The venture development lifecycle (packages/naive/src/engine/lifecycle.ts): the gate between phases is the venture's own
// exit criteria, met by a person; an agent can never move the phase.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advance, lifecycle, meet } from "./lifecycle.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "lifecycle-"));
const dir = join(tmp, "tandem");
cpSync(join(repo, "packages/naive/src/records/examples/workspace/ventures/tandem"), dir, { recursive: true });
let failed = 0;
const expect = (name: string, ok: unknown, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const person = { kind: "person", via: "cli", id: "maya" };
// Proof of work (EE-227): the phase's intake for finance, a function Tandem lists, was walked in a meeting a person closed.
const closeIntake = (d: string): void => { mkdirSync(join(d, "operations/meetings"), { recursive: true }); writeFileSync(join(d, "operations/meetings/finance-intake.json"), JSON.stringify({ id: "finance-intake", title: "Finance intake", goal: "Settle how money is tracked.", outcome_expected: ["a budget"], workflow: "finance/intake", called_by: "maya", attendees: [{ id: "maya", kind: "person" }], status: "closed", agenda: [{ id: "money", title: "Money", status: "done" }], outcome: { reached: "yes", summary: "Settled." } })); };
const phaseOf = () => JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).phase;

const l = lifecycle(dir);
expect("the venture's phase, its question and its gate come from the phase definitions", l.phase === "validation" && l.current?.gate === "Product-market fit: retention holds" && l.next.id === "beachhead", JSON.stringify(l.current));
expect("the current phase's exit criteria come from the telos, none met yet", l.exit_criteria.map((c) => c.id).join() === "retention,time-saved" && !l.ready && l.blocking.filter((b) => !b.startsWith("proof:")).length === 2);
expect("an agent cannot move the phase", !advance(dir, "beachhead", { by: { kind: "agent", via: "mcp" } }).ok && phaseOf() === "validation");
let r = advance(dir, "beachhead", { by: person });
expect("the gate refuses while exit criteria are unmet, and says which", !r.ok && /retention/.test(r.error ?? "") && phaseOf() === "validation", r.error);
expect("skipping a phase needs an override", /skips beachhead/.test(advance(dir, "scale", { by: person }).error ?? ""));
expect("an agent cannot mark a criterion met", !meet(dir, "retention", { by: { kind: "agent", via: "mcp" } }).ok);
expect("a person marks a criterion met, with evidence", meet(dir, "retention", { evidence: "evidence/cohort-oct.json", by: person }).ok && lifecycle(dir).exit_criteria[0].met?.by === "maya");
meet(dir, "time-saved", { by: person });
expect("with every criterion met, the gate still waits on proof of the phase's work", !lifecycle(dir).ready && lifecycle(dir).blocking.every((b) => b.startsWith("proof: finance/intake")), lifecycle(dir).blocking);
closeIntake(dir);
expect("with every criterion met and the phase's work proven, the venture is ready", lifecycle(dir).ready, lifecycle(dir).blocking);
r = advance(dir, "beachhead", { by: person });
expect("the person moves the venture on, and the gate is recorded", r.ok && phaseOf() === "beachhead" && r.result !== undefined && "gate" in r.result && r.result.gate.passed === true, r.error);
expect("the move is in provenance", readFileSync(join(dir, "provenance.jsonl"), "utf8").includes("validation -> beachhead"));
expect("going back needs a reason", !advance(dir, "validation", { by: person }).ok && advance(dir, "validation", { reason: "retention fell", by: person }).ok);
const cli = spawnSync("node", [join(repo, "packages/naive/src/engine/lifecycle.ts"), dir], { encoding: "utf8" });
expect("the CLI shows where the venture is", cli.status === 0 && /phase 2 of 5/.test(cli.stdout), cli.stderr + cli.stdout);
rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
