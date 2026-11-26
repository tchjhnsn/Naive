#!/usr/bin/env node
// Tests withdrawing a decision as a duplicate (mentura withdraw, withdraw() in packages/naive/src/engine/decisions.ts).
// The dogfood run asked who owns the business three times, in three decisions with options that did not line up, and
// had no way to keep one: a person now withdraws the others as duplicates of it. Every venture lives in a temporary
// workspace.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decisions, propose, withdraw } from "../../engine/decisions.ts";
import { entries } from "../../core/provenance.ts";
import { ventureFile } from "../../core/venture-paths.ts";

const repo = new URL("../../../../..", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: unknown, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "decision-withdraw-"));
const dir = join(ws, "own");

try {
  const init = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.ts"), dir, "own"], { encoding: "utf8" });
  expect("a venture to test in", init.status === 0, init.stderr);
  for (const [id, q] of [["finance-who-owns", "Who owns the business?"], ["rc-entity", "Which entity owns it, and who controls it?"], ["er-who-raises", "Who raises: you or the business?"]]) {
    expect(`an agent proposes ${id}`, propose(dir, { at: "governance", id, question: q, class: "ownership-or-control" }, { agentId: "finance-agent" }).ok);
  }

  const agent = withdraw(dir, "rc-entity", { by: "finance-agent", duplicateOf: "finance-who-owns" });
  expect("an agent cannot withdraw a decision", !agent.ok && /only a person/.test(agent.error), agent);
  expect("a duplicate of a decision that does not exist is refused", !withdraw(dir, "rc-entity", { by: "Founder", duplicateOf: "nobody" }).ok);
  expect("a decision cannot duplicate itself", !withdraw(dir, "rc-entity", { by: "Founder", duplicateOf: "rc-entity" }).ok);
  expect("withdrawing needs a person's name", !withdraw(dir, "rc-entity", { duplicateOf: "finance-who-owns" }).ok);

  const w = withdraw(dir, "rc-entity", { by: "Founder", duplicateOf: "finance-who-owns" });
  expect("a person withdraws rc-entity as a duplicate of finance-who-owns", w.ok, w);
  const rec = JSON.parse(readFileSync(ventureFile(dir, "governance/decisions/rc-entity.decision.json"), "utf8")) as { status: string, duplicate_of?: string, withdrawn_by?: string };
  expect("the record is withdrawn, names what it duplicates and who withdrew it", rec.status === "withdrawn" && rec.duplicate_of === "finance-who-owns" && rec.withdrawn_by === "Founder", rec);
  expect("the withdrawal is in provenance as the person's", entries(dir).some((e) => e.entity === "governance/decisions/rc-entity.decision.json" && /duplicate of finance-who-owns/.test(e.note ?? "")));
  const m = decisions(dir);
  expect("it leaves the queue, and the decision it duplicates stays", m.decisions.find((d) => d.id === "rc-entity")?.rank === null && m.decisions.find((d) => d.id === "rc-entity")?.render === "withdrawn" && m.decisions.find((d) => d.id === "finance-who-owns")?.rank !== null, m.decisions.map((d) => [d.id, d.render, d.rank]));
  expect("the matrix has no errors", m.errors.length === 0, m.errors);
  expect("a withdrawn decision cannot be withdrawn again", !withdraw(dir, "rc-entity", { by: "Founder" }).ok);
  expect("nothing can be a duplicate of a withdrawn decision", !withdraw(dir, "er-who-raises", { by: "Founder", duplicateOf: "rc-entity" }).ok);

  // The CLI asks for the decision's id to confirm.
  const cli = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.ts"), "withdraw", "er-who-raises", "--venture", "own", "--by", "Founder", "--duplicate-of", "finance-who-owns", "--confirm", "er-who-raises"], { encoding: "utf8", env: { ...process.env, MENTURA_WORKSPACE: ws } });
  expect("mentura withdraw withdraws a duplicate", cli.status === 0 && JSON.parse(cli.stdout).duplicate_of === "finance-who-owns", cli.stdout + cli.stderr);

  // A hand-edited record whose duplicate_of names nothing, or that is still open, is an error in the matrix.
  const f = ventureFile(dir, "governance/decisions/finance-who-owns.decision.json");
  const open = JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>;
  writeFileSync(f, JSON.stringify({ ...open, duplicate_of: "nobody" }, null, 2));
  const errs = decisions(dir).errors.join("\n");
  expect("an open decision marked as a duplicate, of a decision that does not exist, is reported", /a duplicate is withdrawn/.test(errs) && /which is no decision here/.test(errs), errs);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("decision withdraw: all passed");
