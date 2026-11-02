// Behavior of the membership gate. Each fixture is a handoff package. The schema alone
// accepts the ones listed under "schema alone accepts"; the gate is what rejects them.
//
//   node schema/ontology-gate-test.ts

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "ontology-gate-"));
const fix = (name: string) => join(root, "schema/fixtures/ontology-gate", name);
let failed = 0;
let n = 0;
const expect = (name: string, ok: boolean) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) failed++; };

type Verdict = {
  verdict?: string;
  code?: string;
  witness?: string;
  owner?: string;
  replaced_by?: string;
  missing?: string;
  failed?: string[];
  detail?: string;
  disposition?: { on_reject?: string; retry_by?: string; retries?: number; then?: string; escalate_to?: string };
};

const run = (cmd: string, args: string[], env: Record<string, string> = {}) =>
  spawnSync(cmd, args, { encoding: "utf8", cwd: root, env: { ...process.env, ...env } });

const gate = (file: string, fn: string, extra: string[] = []) => {
  const ran = run(process.execPath, [join(root, "schema/check-nouns.mjs"), "--package", file, "--function", fn, ...extra]);
  let body: Verdict | null = null;
  try { body = JSON.parse(ran.stdout) as Verdict; } catch { body = null; }
  return { status: ran.status, stdout: ran.stdout, stderr: ran.stderr, body };
};

const schemaValid = (file: string) => run("python3", ["-I", join(root, "schema/validate.py"), "--schema", "handoff.schema.json", "--file", file]).status === 0;

const handoff = (id: string, ontology: Record<string, unknown>) => {
  const file = join(tmp, `${id}.json`);
  writeFileSync(file, JSON.stringify({
    id, title: id, venture: "fixture", role: "founder", brief: `${id}.md`,
    decision_classes: ["implementation-detail"],
    done_criteria: [{ id: "check", kind: "review", reviewer: "founder", check: "Is this package the one it claims to be?" }],
    status: "draft", attempts: 0, max_attempts: 3, run_cap: "2h", ontology,
  }));
  return file;
};

// What the handoff schema accepts, and what the gate decides. The schema column is the check
// that existed before this gate. Those rows are the failures the gate adds.
const rows: [string, string, string, string, string][] = [
  ["pricing-admit.json", "marketing-and-sales", "valid", "admit", "customer@marketing-and-sales"],
  ["pricing-admit.json", "finance", "valid", "refer", "pricing decision"],
  ["unknown-term.json", "marketing-and-sales", "valid", "reject", "not-a-real-noun"],
  ["retired-term.json", "marketing-and-sales", "valid", "reject", "client"],
  ["missing-touches.json", "products", "valid", "reject", "customer@finance"],
  ["pricing-no-finance.json", "marketing-and-sales", "valid", "reject", "pricing decision"],
  ["founder-properties.json", "strategy", "valid", "reject", "founder appointment"],
];
console.log("fixture | function | schema alone | gate | witness");
for (const [file, fn, schema, verdict, witness] of rows) console.log(`${file} | ${fn} | ${schema} | ${verdict} | ${witness}`);
console.log("schema alone accepts, and the gate rejects: unknown-term, retired-term, missing-touches, pricing-no-finance, founder-properties");

for (const [file, fn, , verdict, witness] of rows) {
  const path = fix(file);
  const got = gate(path, fn);
  expect(`${file} at ${fn} is ${verdict} on ${witness}`, schemaValid(path) && got.body?.verdict === verdict && got.body.witness === witness && (verdict === "admit" ? got.status === 0 : got.status !== 0));
}

{
  const got = gate(fix("pricing-admit.json"), "finance");
  expect("a pricing package sent to finance is referred to marketing-and-sales", got.body?.verdict === "refer" && got.body.owner === "marketing-and-sales" && got.body.disposition === undefined);
  const home = gate(fix("pricing-admit.json"), "marketing-and-sales");
  expect("the same package is admitted to exactly one function", home.body?.verdict === "admit" && got.body?.verdict !== "admit");
}
{
  const got = gate(fix("retired-term.json"), "marketing-and-sales");
  expect("a retired term points at its replacement", got.body?.code === "retired" && got.body.replaced_by === "account (relationship: client)");
}
{
  const got = gate(fix("missing-touches.json"), "products");
  expect("a term owned elsewhere, with no touch, is incomplete", got.body?.code === "incomplete" && got.body.missing === "finance");
}
{
  const got = gate(fix("pricing-no-finance.json"), "marketing-and-sales");
  expect("a pricing package without finance in touches is incomplete", got.body?.code === "incomplete" && got.body.missing === "finance" && got.body.witness === "pricing decision");
}
{
  const got = gate(fix("founder-properties.json"), "strategy");
  expect("the founder term's own check fails a stake the quote claims", got.body?.code === "properties" && got.body.failed?.join(",") === "F4");
  expect("a rejection tells the lead to retry once, then the founder", got.body?.disposition?.on_reject === "retry" && got.body?.disposition?.retry_by === "lead" && got.body?.disposition?.retries === 1 && got.body?.disposition?.then === "escalate" && got.body?.disposition?.escalate_to === "founder");
}
{
  const bad = join(tmp, "not-a-handoff.json");
  writeFileSync(bad, JSON.stringify({ id: "not-a-handoff" }));
  const got = gate(bad, "marketing-and-sales");
  expect("a package that fails the handoff schema is rejected", !schemaValid(bad) && got.body?.code === "schema" && got.body.verdict === "reject");
}
{
  const file = handoff("shared-word", { type: "pricing decision", terms: ["venture", "customer@marketing-and-sales"], touches: ["finance"] });
  const got = gate(file, "marketing-and-sales");
  expect("a shared noun may appear and does not decide the type", got.body?.verdict === "admit" && got.body.witness === "customer@marketing-and-sales");
}
{
  const file = handoff("no-owned-term", { type: "pricing decision", terms: ["venture"], touches: ["finance"] });
  const got = gate(file, "marketing-and-sales");
  expect("no term owned by the receiver is incomplete", got.body?.code === "incomplete" && /no term owned by marketing-and-sales/.test(got.body?.detail ?? ""));
}
{
  const file = handoff("not-a-type", { type: "product", terms: ["product"], touches: [] });
  const got = gate(file, "products");
  expect("a noun that is not a handoff type cannot type a package", got.body?.code === "not-a-type" && got.body.witness === "product");
}
{
  const file = handoff("unknown-and-touch", { type: "pricing decision", terms: ["not-a-real-noun", "customer@finance"], touches: [] });
  const got = gate(file, "marketing-and-sales");
  expect("the first failing check is the only verdict", got.body?.code === "unknown" && got.body.witness === "not-a-real-noun");
}
{
  const got = gate(fix("pricing-admit.json"), "nope");
  expect("an unknown receiving function is rejected", got.body?.code === "unknown" && got.body.witness === "nope");
}
{
  const src = JSON.parse(readFileSync(fix("founder-properties.json"), "utf8")) as { ontology: { facts: { F1: { value: { stake: boolean } } } } };
  src.ontology.facts.F1.value.stake = true;
  const file = join(tmp, "founder-holds.json");
  writeFileSync(file, JSON.stringify(src));
  const got = gate(file, "strategy");
  expect("the same founder package is admitted when the stake holds", got.body?.verdict === "admit" && got.status === 0);
}
{
  const file = handoff("founder-asserted", {
    type: "founder appointment", terms: ["founder appointment"], touches: [],
    facts: { F1: { value: true, quote: "A person." }, F2: { value: true, quote: "There at the start." }, F3: { value: true, quote: "An evidenced idea." }, F4: { value: false, quote: "No stake." }, F5: { value: true, quote: "Decisions on the record." } },
  });
  const got = gate(file, "strategy");
  expect("a boolean assertion the term's rule rejects names that property", got.body?.code === "properties" && got.body?.failed?.includes("F4") === true);
}

// Provenance stays off the handoff. The sidecar binds to the body's sha256, so the same gate
// on the same body writes nothing the second time, and a later gate does not need an earlier one.
{
  const dir = join(tmp, "side");
  mkdirSync(dir);
  const file = join(dir, "pricing-admit.json");
  cpSync(fix("pricing-admit.json"), file);
  expect("recording an admit succeeds", gate(file, "marketing-and-sales", ["--record"]).status === 0);
  const side = join(dir, "pricing-admit.provenance.jsonl");
  const once = readFileSync(side, "utf8");
  expect("recording it again leaves the same line", gate(file, "marketing-and-sales", ["--record"]).status === 0 && readFileSync(side, "utf8") === once && once.trim().split("\n").length === 1);
  const line = JSON.parse(once) as { sha256?: string; activity?: string; judgment?: Verdict; hash?: string };
  const fresh = join(tmp, "one-line.json");
  writeFileSync(fresh, once.trim());
  expect("the sidecar line matches the provenance schema", run("python3", ["-I", join(root, "schema/validate.py"), "--schema", "provenance-entry.schema.json", "--file", fresh]).status === 0);
  const body = createHash("sha256").update(readFileSync(file)).digest("hex");
  expect("the line's sha256 is the package body", line.sha256 === body);
  const checked = run(process.execPath, [join(root, "schema/check-provenance.mjs"), "--package", file]);
  expect("the sidecar chain holds", checked.status === 0);
  const tampered = once.replace(line.hash ?? "", "0".repeat(64));
  writeFileSync(side, tampered);
  expect("an edited sidecar line breaks the chain", run(process.execPath, [join(root, "schema/check-provenance.mjs"), "--package", file]).status !== 0);
  writeFileSync(side, once + once);
  expect("the same gate line recorded twice fails", run(process.execPath, [join(root, "schema/check-provenance.mjs"), "--package", file]).status !== 0);
}
{
  const dir = join(tmp, "order");
  mkdirSync(dir);
  const file = join(dir, "pricing-admit.json");
  cpSync(fix("pricing-admit.json"), file);
  const referred = gate(file, "finance", ["--record"]);
  expect("a gate can be the first line, with no earlier gate", referred.body?.verdict === "refer" && run(process.execPath, [join(root, "schema/check-provenance.mjs"), "--package", file]).status === 0 && readFileSync(join(dir, "pricing-admit.provenance.jsonl"), "utf8").trim().split("\n").length === 1);
  const admitted = gate(file, "marketing-and-sales", ["--record"]);
  const text = readFileSync(join(dir, "pricing-admit.provenance.jsonl"), "utf8");
  expect("a second function on the same body appends a second line", admitted.body?.verdict === "admit" && text.trim().split("\n").length === 2 && run(process.execPath, [join(root, "schema/check-provenance.mjs"), "--package", file]).status === 0);
  expect("re-running the second gate does not append", gate(file, "marketing-and-sales", ["--record"]).status === 0 && readFileSync(join(dir, "pricing-admit.provenance.jsonl"), "utf8") === text);
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { title: string };
  parsed.title = "A different body";
  writeFileSync(file, JSON.stringify(parsed));
  const warned = run(process.execPath, [join(root, "schema/check-provenance.mjs"), "--package", file]);
  expect("a changed body is a warning, and the old line stays", warned.status === 0 && /different body/.test(warned.stderr));
}

// The ontology's own rules, on a copy that has the references the noun check resolves.
function sparse(edit: (_ontology: { nouns: Record<string, unknown>[] }) => void): string {
  const dir = join(tmp, `ont-${++n}`);
  for (const rel of [
    "purpose/references/references.json",
    "purpose/kits/validation/references/references.json",
    "governance/references/references.json",
    "operations/references/references.json",
    "interface/references/references.json",
    "operations/departments.json",
  ]) {
    mkdirSync(join(dir, dirname(rel)), { recursive: true });
    cpSync(join(root, rel), join(dir, rel));
  }
  mkdirSync(join(dir, "docs"), { recursive: true });
  const ontology = JSON.parse(readFileSync(join(root, "docs/ontology.json"), "utf8")) as { nouns: Record<string, unknown>[] };
  edit(ontology);
  writeFileSync(join(dir, "docs/ontology.json"), JSON.stringify(ontology));
  return dir;
}
const noun = (ontology: { nouns: Record<string, unknown>[] }, name: string) => ontology.nouns.find((item) => item.noun === name);
const check = (dir: string) => run(process.execPath, [join(root, "schema/check-nouns.mjs")], { EE_ROOT: dir });

expect("the repository ontology passes", run(process.execPath, [join(root, "schema/check-nouns.mjs")]).status === 0);
{
  const dir = sparse((o) => { const item = noun(o, "venture"); if (item) delete item.standard; });
  const ran = check(dir);
  expect("a noun with no standard fails", ran.status !== 0 && /venture: no standard/.test(ran.stderr));
}
{
  const dir = sparse((o) => { const item = noun(o, "strategy"); if (item) item.capabilities = []; });
  const ran = check(dir);
  expect("an active function with no capabilities fails", ran.status !== 0 && /function strategy: no capabilities/.test(ran.stderr));
}
{
  const dir = sparse((o) => { const item = noun(o, "product decision"); if (item) item.function = "finance"; });
  const ran = check(dir);
  expect("a capability owned by another function fails", ran.status !== 0 && /capability product decision is owned by finance/.test(ran.stderr));
}
{
  const dir = sparse((o) => { const item = noun(o, "venture"); if (item) item.function = "nope"; });
  const ran = check(dir);
  expect("a function that is not a department fails", ran.status !== 0 && /function nope is not a department id/.test(ran.stderr));
}
{
  const dir = sparse((o) => { const item = noun(o, "finance"); if (item) item.capabilities = ["client"]; });
  const ran = check(dir);
  expect("a retired capability fails", ran.status !== 0 && /capability client is retired/.test(ran.stderr));
}

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("ontology membership gate: all passed");
