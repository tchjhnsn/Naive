// Tests the spend register and its access matrix (docs/design/LEAD_AGENTS_2026-11-08.md, "The spend register and the
// access matrix", build plan item 2). A spend line (finance/spend/[id]) is written only by the finance agent
// (finance-agent) or a person: writer function in the data model, checked by writerRule before the team plan, so a
// role the team plan gives finance/** is refused too. The template's source map holds the register's access matrix
// field by field, and check-sources.mjs refuses a rule that ties with it.
// The finance agent holds spend-register-upkeep and cancel-or-downgrade straight from the founder. Every venture
// lives in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/spend-register-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call, routes } from "../../router/router.mjs";
import { entries } from "../../core/provenance.mjs";
import { writerRule } from "../../engine/gate.mjs";
import { resolve as resolveRule } from "../../store/connectors/resolve.mjs";
import { draft, describe } from "../../engine/generators/spend-register.ts";
import { readSchema } from "../../records/index.mjs";
import type { SpendRegister } from "../../records/types/records.d.ts";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "spend-register-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_READS_AS_OF", "MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_MODEL"]) { delete process.env[k]; delete env[k]; }
const node = (script: string, ...a: string[]) => spawnSync(process.execPath, [join(repo, script), ...a], { encoding: "utf8", env });
const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));

interface Reply { ok: boolean, error?: string, gate_rule?: string, result?: unknown }
const ask = async (a: { route: string, action?: string, input?: unknown, actor?: string, actor_id?: string }): Promise<Reply> =>
  await call({ venture: "lab", workspace: ws, action: "read", ...a }) as Reply;
const line = (over: Partial<SpendRegister> = {}): SpendRegister => ({ id: "figma", vendor: "Figma", purpose: "Design files for the product", amount: 15, currency: "USD", cadence: "monthly",
  renewal_date: "2026-12-01", account: "ops-checking", function: "products", status: "active", ...over });

try {
  // The record type, its route and its schema.
  const item = (routes() as { route: string, actions: string[], writer?: string, function?: string, record?: string }[]).find((r) => r.route === "finance/spend/[id]");
  expect("finance/spend/[id] is a writable route for spend-register with writer function and function finance",
    !!item && item.record === "spend-register" && item.actions.includes("write") && item.writer === "function" && item.function === "finance", JSON.stringify(item));
  const departments = load(join(repo, "packages/naive/src/functions/departments.json")).departments.map((d: { id: string }) => d.id);
  expect("the schema's function list is departments.json's", JSON.stringify(readSchema("spend-register").properties.function.enum) === JSON.stringify(departments));
  const gen = draft({ vendor: "Linear", purpose: "Issue tracking", amount: 8, currency: "USD", cadence: "monthly", renewal_date: "2026-12-05", account: "ops-checking", function: "products" });
  expect("the generator drafts a line with an id from the vendor and status active", gen.ok && gen.draft?.id === "linear" && gen.draft.status === "active" && gen.route === "finance/spend/linear", JSON.stringify(gen));
  expect("the generator gives a one-time charge no renewal date", draft({ ...line(), cadence: "one-time" }).draft?.renewal_date === null);
  expect("the generator does not ask for the id or status", !describe().ask.some((q: { field: string }) => ["id", "status"].includes(q.field)));
  expect("the schema refuses a card number as the paying account", !draft({ ...line(), account: "4111111111111111" }).ok);
  expect("the schema refuses a status outside active, cancel-requested and cancelled", !draft({ ...line(), status: "paused" as unknown as "active" }).ok);

  // The rule itself, without a venture.
  expect("writerRule passes finance-agent", writerRule({ route: "finance/spend/figma", writer: "function", fn: "finance", role: "finance-agent" }) === null);
  expect("writerRule passes a person", writerRule({ route: "finance/spend/figma", writer: "function", fn: "finance", actor: "person" }) === null);
  expect("writerRule refuses it-agent", writerRule({ route: "finance/spend/figma", writer: "function", fn: "finance", role: "it-agent" })?.rule === "function-only");
  expect("writerRule refuses an agent acting in no role", writerRule({ route: "finance/spend/figma", writer: "function", fn: "finance" })?.rule === "function-only");
  expect("writerRule refuses a person's call while an agent other than finance-agent is acting",
    writerRule({ route: "finance/spend/figma", writer: "function", fn: "finance", actor: "person", acting: true, role: "builder" })?.rule === "function-only");
  expect("writerRule refuses the projector, even in the finance-agent role",
    writerRule({ route: "finance/spend/figma", writer: "function", fn: "finance", role: "finance-agent", projector: true })?.rule === "function-only");

  // Through the router.
  const made = node("packages/naive/src/engine/init-venture.mjs", join(ws, "ventures/lab"), "lab");
  if (made.status !== 0) throw new Error(made.stderr || made.stdout);
  const dir = join(ws, "ventures/lab");
  const file = join(dir, "finance/spend/figma.json");
  for (const role of ["it-agent", "finance-lead", "chief-of-staff"]) {
    const w = await ask({ route: "finance/spend/figma", action: "write", input: line(), actor_id: role });
    expect(`a write by ${role} is refused, and nothing lands`, !w.ok && w.gate_rule === "function-only" && !existsSync(file) && !existsSync(join(dir, "_drafts/finance/spend/figma.json")), JSON.stringify(w));
  }
  const none = await ask({ route: "finance/spend/figma", action: "write", input: line() });
  expect("a write by an agent acting in no role is refused", !none.ok && none.gate_rule === "function-only", JSON.stringify(none));
  // A team plan that gives another role finance/** does not widen it: writer function is checked first.
  mkdirSync(join(dir, "people"), { recursive: true });
  writeFileSync(join(dir, "people/team-plan.json"), JSON.stringify({ roles: [
    { id: "finance-agent", name: "Finance agent", occupant: "agent", needed_by: "discovery", status: "filled", why: "finance", routes: { write: ["decisions/*", "finance/spend/*"] } },
    { id: "it-agent", name: "IT agent", occupant: "agent", needed_by: "discovery", status: "filled", why: "it", routes: { write: ["finance/**"] } },
  ] }, null, 2));
  const wide = await ask({ route: "finance/spend/figma", action: "write", input: line(), actor_id: "it-agent" });
  expect("a role whose team-plan routes reach finance/** is still refused", !wide.ok && wide.gate_rule === "function-only" && !existsSync(file), JSON.stringify(wide));
  const ok = await ask({ route: "finance/spend/figma", action: "write", input: line(), actor_id: "finance-agent" });
  const landed = existsSync(file) ? load(file) : null;
  expect("a write by finance-agent passes and lands live", ok.ok && (ok.result as { draft?: boolean }).draft === false && landed?.vendor === "Figma", JSON.stringify(ok));
  const last = entries(dir).at(-1);
  expect("its provenance line names the line and finance-agent", last?.entity === "finance/spend/figma.json" && last?.agent?.id === "finance-agent", JSON.stringify(last));
  const bad = await ask({ route: "finance/spend/figma", action: "write", input: line({ account: "4111111111111111" }), actor_id: "finance-agent" });
  expect("finance-agent's write of a card number as the account is refused by the schema", !bad.ok && load(file).account === "ops-checking", JSON.stringify(bad));
  const person = await ask({ route: "finance/spend/figma", action: "write", input: line({ status: "cancel-requested" }), actor: "person" });
  expect("a person's write lands live", person.ok && load(file).status === "cancel-requested", JSON.stringify(person));
  const read = await ask({ route: "finance/spend/figma", actor_id: "it-agent" });
  expect("any role still reads a line", read.ok && JSON.stringify(read.result).includes("Figma"), JSON.stringify(read).slice(0, 300));

  // The access matrix: the template's source map, field by field.
  const map = load(join(repo, "packages/naive/template/knowledge/sources.json"));
  const sor = (attribute: string) => resolveRule(map, { record: "spend-register", attribute })?.rule.system_of_record;
  expect("the bank statement sync masters amount, currency and dates", ["amount", "currency", "last_charged", "renewal_date"].every((a) => sor(a) === "bank-statement-sync"));
  expect("finance owns status, in the venture folder", sor("status") === "venture" && resolveRule(map, { record: "spend-register", attribute: "status" })?.rule.owner === "finance-agent");
  expect("IT's tool record masters approval", sor("approval") === "it-tools" && resolveRule(map, { record: "spend-register", attribute: "approval" })?.rule.owner === "it-agent");
  expect("every other field resolves to the whole record in the venture folder", sor("vendor") === "venture");
  const copy = (name: string, change: (_m: { rules: Record<string, string>[] }) => void) => {
    const v = join(ws, "maps", name);
    mkdirSync(join(v, "knowledge"), { recursive: true });
    writeFileSync(join(v, "venture.json"), JSON.stringify({ id: name, name, parent: null, phase: "discovery" }));
    const m = load(join(repo, "packages/naive/template/knowledge/sources.json"));
    change(m);
    writeFileSync(join(v, "knowledge/sources.json"), JSON.stringify(m, null, 2));
    return node("packages/naive/src/checks/check-sources.mjs", v);
  };
  const clean = copy("clean", () => {});
  expect("check-sources passes the template's source map", clean.status === 0, clean.stderr + clean.stdout);
  const tie = copy("tie", (m) => { m.rules.push({ record: "spend-register", attribute: "amount", phase: "*", product: "*", account: "*", actor: "*", system_of_record: "venture", owner: "finance-agent" }); });
  expect("check-sources refuses a rule that ties on a register field", tie.status === 1 && /tie at the same specificity/.test(tie.stderr), tie.stderr + tie.stdout);

  // Delegation: the finance agent holds the register's classes straight from the founder.
  const d = load(join(repo, "packages/naive/template/governance/delegation.json"));
  const g = d.grants.find((x: { id: string }) => x.id === "founder-to-finance-agent");
  expect("founder-to-finance-agent grants spend-register-upkeep and cancel-or-downgrade over finance/, not re-delegable",
    g?.from === "founder" && g.to === "finance-agent" && g.scope === "finance/" && g.may_redelegate === false && ["spend-register-upkeep", "cancel-or-downgrade"].every((c) => g.classes.includes(c)), JSON.stringify(g));
  expect("no other grant holds the register's classes", d.grants.filter((x: { classes: string[] }) => x.classes.some((c) => ["spend-register-upkeep", "cancel-or-downgrade"].includes(c))).length === 1);
  const del = node("packages/naive/src/checks/check-delegation.mjs");
  expect("check-delegation passes the template", del.status === 0, del.stdout);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
