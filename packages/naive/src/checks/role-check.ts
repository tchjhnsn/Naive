#!/usr/bin/env node
// naive role check (EE-237): runs one role's program, or every role's, and logs what it finds. The programs, the
// default checks and the loader are packages/naive/src/checks/role-program.ts.
//
//   node packages/naive/src/checks/role-check.ts <role> [<venture dir>] [--json]
//   node packages/naive/src/checks/role-check.ts --all [<venture dir>] [--json]
//   naive role check <role> [--venture <dir>] [--json]
//   naive role check --all [--venture <dir>] [--json]
//
// In a venture, every finding is appended to .naive/lint-findings.jsonl with lint "role". With no venture, only the
// checks that need none run and nothing is logged. Any error exits 1; a role that does not exist, or a library role.ts
// that is not a valid RoleProgram, exits 1 or 2 as runMain maps it.

import { Effect } from "effect";
import { runMain } from "../core/effect/run.ts";
import { LOG } from "../engine/lint-findings.ts";
import { checkRoles } from "./role-program.ts";

const argv = process.argv.slice(2);
const all = argv.includes("--all");
const words = argv.filter((a) => !a.startsWith("--"));
const id = all ? null : words.shift();
const venture = words[0] ?? null;
if (!all && !id) { console.error("usage: node packages/naive/src/checks/role-check.ts <role> | --all [<venture dir>] [--json]"); process.exit(2); }

await runMain(Effect.map(checkRoles(id ? [id] : "all", { venture }), (r) => {
  if (argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.roles) {
      console.log(`${x.id}: ${x.checks} check(s)${x.source ? `, extended by ${x.source}` : ""}`);
      if (x.ignored) console.log(`  note: ${x.ignored} is not loaded; Naive runs only the library's role.ts`);
    }
    for (const f of r.findings) console.log(`${f.severity.padEnd(5)}  ${(f.family ?? "").padEnd(8)} ${(f.role ?? "").padEnd(20)} ${f.rule.padEnd(22)} ${f.message}`);
    console.log(`${r.roles.length} role${r.roles.length === 1 ? "" : "s"} checked: ${r.errors} error(s), ${r.findings.length - r.errors} warning(s)${venture ? `, logged to ${LOG}` : ", no venture so nothing logged"}`);
  }
  process.exitCode = r.errors ? 1 : 0;
}));
