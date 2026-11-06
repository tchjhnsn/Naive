// The venture development lifecycle (packages/naive/src/engine/lifecycle.mjs): the gate between phases is the venture's own
// exit criteria, met by a person; an agent can never move the phase.

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advance, lifecycle, meet } from "./lifecycle.mjs";

const repo = new URL("../../../..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "lifecycle-"));
const dir = join(tmp, "tandem");
cpSync(join(repo, "packages/naive/src/records/examples/workspace/ventures/tandem"), dir, { recursive: true });
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const person = { kind: "person", via: "cli", id: "maya" };
const phaseOf = () => JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).phase;

let l = lifecycle(dir);
expect("the venture's phase, its question and its gate come from the phase definitions", l.phase === "validation" && l.current.gate === "Product-market fit: retention holds" && l.next.id === "beachhead", JSON.stringify(l.current));
expect("the current phase's exit criteria come from the telos, none met yet", l.exit_criteria.map((c) => c.id).join() === "retention,time-saved" && !l.ready && l.blocking.length === 2);
expect("an agent cannot move the phase", !advance(dir, "beachhead", { by: { kind: "agent", via: "mcp" } }).ok && phaseOf() === "validation");
let r = advance(dir, "beachhead", { by: person });
expect("the gate refuses while exit criteria are unmet, and says which", !r.ok && /retention/.test(r.error) && phaseOf() === "validation", r.error);
expect("skipping a phase needs an override", /skips beachhead/.test(advance(dir, "scale", { by: person }).error ?? ""));
expect("an agent cannot mark a criterion met", !meet(dir, "retention", { by: { kind: "agent", via: "mcp" } }).ok);
expect("a person marks a criterion met, with evidence", meet(dir, "retention", { evidence: "evidence/cohort-oct.json", by: person }).ok && lifecycle(dir).exit_criteria[0].met?.by === "maya");
meet(dir, "time-saved", { by: person });
expect("with every criterion met the venture is ready", lifecycle(dir).ready);
r = advance(dir, "beachhead", { by: person });
expect("the person moves the venture on, and the gate is recorded", r.ok && phaseOf() === "beachhead" && r.result.gate.passed === true, r.error);
expect("the move is in provenance", readFileSync(join(dir, "provenance.jsonl"), "utf8").includes("validation -> beachhead"));
expect("going back needs a reason", !advance(dir, "validation", { by: person }).ok && advance(dir, "validation", { reason: "retention fell", by: person }).ok);
const cli = spawnSync("node", [join(repo, "packages/naive/src/engine/lifecycle.mjs"), dir], { encoding: "utf8" });
expect("the CLI shows where the venture is", cli.status === 0 && /phase 2 of 5/.test(cli.stdout), cli.stderr + cli.stdout);
rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
