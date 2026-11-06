// Behavior of the membership gate. Each fixture is a handoff package. The schema alone
// accepts the ones listed under "schema alone accepts"; the gate is what rejects them.
//
//   node packages/naive/src/terms/ontology-gate-test.ts

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, constants, cpSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, statSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { stealDeadLock, takeStaleLock } from "../core/provenance.mjs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "ontology-gate-"));
const fix = (name: string) => join(root, "packages/naive/src/terms/fixtures/ontology-gate", name);
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
  const ran = run(process.execPath, [join(root, "packages/naive/src/checks/check-nouns.mjs"), "--package", file, "--function", fn, ...extra]);
  let body: Verdict | null = null;
  try { body = JSON.parse(ran.stdout) as Verdict; } catch { body = null; }
  return { status: ran.status, stdout: ran.stdout, stderr: ran.stderr, body };
};

const schemaValid = (file: string) => run("python3", ["-I", join(root, "packages/naive/src/records/validate.py"), "--schema", "handoff.schema.json", "--file", file]).status === 0;

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
{
  // On fe748f5 the record path dropped boolean facts, so this was admitted.
  const src = JSON.parse(readFileSync(fix("founder-properties.json"), "utf8")) as { ontology: { facts: { F1: { value: { stake?: boolean } }; F4: { value: unknown; quote: string } } } };
  src.ontology.facts.F1.value.stake = true;
  src.ontology.facts.F4 = { value: false, quote: "No stake." };
  const file = join(tmp, "founder-false-claim.json");
  writeFileSync(file, JSON.stringify(src));
  const got = gate(file, "strategy");
  expect("a false fact is still checked when another fact carries the record", got.status !== 0 && got.body?.verdict === "reject" && got.body.code === "properties" && got.body.failed?.includes("F4") === true);
}
{
  // On f8b1b52 only boolean false was rejected. null, 0, strings and arrays were admitted once any fact was a record.
  const claim = (value: unknown, name: string) => {
    const src = JSON.parse(readFileSync(fix("founder-properties.json"), "utf8")) as { ontology: { facts: { F1: { value: { stake?: boolean } }; F4: { value: unknown; quote: string } } } };
    src.ontology.facts.F1.value.stake = true;
    src.ontology.facts.F4 = { value, quote: "The claim about the stake." };
    const file = join(tmp, name);
    writeFileSync(file, JSON.stringify(src));
    return gate(file, "strategy");
  };
  for (const [label, value] of [["null", null], ["zero", 0], ["string", "no stake"], ["array", []], ["one", 1]] as [string, unknown][]) {
    const got = claim(value, `claim-${label}.json`);
    expect(`a fact value of ${label} fails its property`, got.status !== 0 && got.body?.verdict === "reject" && got.body?.code === "properties" && got.body?.failed?.includes("F4") === true);
  }
  const clash = JSON.parse(readFileSync(fix("founder-properties.json"), "utf8")) as { ontology: { facts: { F1: { value: { stake?: boolean } }; F4: { value: unknown; quote: string } } } };
  clash.ontology.facts.F1.value.stake = false;
  clash.ontology.facts.F4 = { value: { stake: true }, quote: "This record says there is a stake." };
  const clashFile = join(tmp, "claim-clash.json");
  writeFileSync(clashFile, JSON.stringify(clash));
  const clashed = gate(clashFile, "strategy");
  expect("records that disagree are a reject, not a merge", clashed.status !== 0 && clashed.body?.verdict === "reject" && clashed.body?.failed?.includes("F4") === true);
  const agree = JSON.parse(readFileSync(fix("founder-properties.json"), "utf8")) as { ontology: { facts: { F1: { value: { stake?: boolean } }; F4: { value: unknown; quote: string } } } };
  agree.ontology.facts.F1.value.stake = true;
  agree.ontology.facts.F4 = { value: { stake: true }, quote: "The same stake." };
  const agreeFile = join(tmp, "claim-agree.json");
  writeFileSync(agreeFile, JSON.stringify(agree));
  expect("records that agree on a field still admit", gate(agreeFile, "strategy").body?.verdict === "admit");
}
{
  // On a2375b8 the term engine throws and the gate reports a broken tool (exit 2, no verdict, no sidecar).
  const broken = (label: string, mutate: (value: Record<string, unknown>) => void) => {
    const src = JSON.parse(readFileSync(fix("founder-properties.json"), "utf8")) as { ontology: { facts: { F1: { value: Record<string, unknown> } } } };
    mutate(src.ontology.facts.F1.value);
    const dir = join(tmp, `shape-${label}`);
    mkdirSync(dir);
    const file = join(dir, "founder-properties.json");
    writeFileSync(file, JSON.stringify(src));
    const ran = run(process.execPath, [join(root, "packages/naive/src/checks/check-nouns.mjs"), "--package", file, "--function", "strategy", "--record"]);
    let body: Verdict | null = null;
    try { body = JSON.parse(ran.stdout) as Verdict; } catch { body = null; }
    const side = join(dir, "founder-properties.provenance.jsonl");
    const recorded = existsSync(side) && readFileSync(side, "utf8").includes("\"properties\"");
    const failed = body?.failed ?? [];
    const every = ["F1", "F2", "F3", "F4", "F5"].every((id) => failed.includes(id));
    expect(`a record the term cannot read (${label}) is a properties reject and is recorded`, ran.status === 1 && body?.verdict === "reject" && body?.code === "properties" && every && recorded);
  };
  broken("missing-field", (value) => { delete value.contributions; });
  broken("bad-field", (value) => { value.contributions = "x"; });
  broken("empty-record", (value) => { for (const key of Object.keys(value)) delete value[key]; });
}
{
  const got = gate(fix("pricing-admit.json"), "human-capital");
  expect("a department with no function noun is not a receiver", got.body?.code === "unknown" && got.body.verdict === "reject" && got.body.owner === undefined);
}
{
  const file = handoff("extra-touch", { type: "pricing decision", terms: ["customer@marketing-and-sales"], touches: ["finance", "strategy"] });
  const got = gate(file, "marketing-and-sales");
  expect("a touch the package does not use is incomplete", got.body?.code === "incomplete" && got.body.witness === "strategy");
}
{
  const dir = join(tmp, "tool");
  mkdirSync(dir);
  const file = join(dir, "pricing-admit.json");
  cpSync(fix("pricing-admit.json"), file);
  const ran = run(process.execPath, [join(root, "packages/naive/src/checks/check-nouns.mjs"), "--package", file, "--function", "marketing-and-sales", "--record"], { NAIVE_VALIDATE_NO_JSONSCHEMA: "1" });
  expect("a missing schema checker is a tool error and records nothing", ran.status === 2 && !ran.stdout.includes("\"verdict\"") && !existsSync(join(dir, "pricing-admit.provenance.jsonl")));
}
{
  const dir = join(tmp, "crash");
  mkdirSync(dir);
  const file = join(dir, "pricing-admit.json");
  cpSync(fix("pricing-admit.json"), file);
  const ran = run(process.execPath, [join(root, "packages/naive/src/checks/check-nouns.mjs"), "--package", file, "--function", "marketing-and-sales", "--record"], { NAIVE_VALIDATE_CRASH: "1" });
  expect("a schema checker crash is a tool error and records nothing", ran.status === 2 && !ran.stdout.includes("\"verdict\"") && !existsSync(join(dir, "pricing-admit.provenance.jsonl")));
}
{
  const bad = join(tmp, "not-json.json");
  writeFileSync(bad, "{");
  const got = gate(bad, "marketing-and-sales");
  expect("a package that is not JSON is a schema reject, not a tool error", got.status === 1 && got.body?.code === "schema");
}
{
  const dir = join(tmp, "stale-lock");
  mkdirSync(dir);
  const file = join(dir, "pricing-admit.json");
  cpSync(fix("pricing-admit.json"), file);
  const lock = join(dir, "pricing-admit.provenance.jsonl.lock");
  writeFileSync(lock, "");
  const then = (Date.now() - 10000) / 1000;
  utimesSync(lock, then, then);
  const ran = run(process.execPath, [join(root, "packages/naive/src/checks/check-nouns.mjs"), "--package", file, "--function", "marketing-and-sales", "--record"]);
  expect("a dead sidecar lock is taken and the gate still records", ran.status === 0 && existsSync(join(dir, "pricing-admit.provenance.jsonl")));
}
{
  const dir = join(tmp, "lock-dir");
  mkdirSync(dir);
  const file = join(dir, "pricing-admit.json");
  cpSync(fix("pricing-admit.json"), file);
  mkdirSync(join(dir, "pricing-admit.provenance.jsonl.lock"));
  const ran = run(process.execPath, [join(root, "packages/naive/src/checks/check-nouns.mjs"), "--package", file, "--function", "marketing-and-sales", "--record"]);
  expect("a lock error exits 2 and records nothing", ran.status === 2 && !ran.stdout.includes("\"verdict\"") && !existsSync(join(dir, "pricing-admit.provenance.jsonl")));
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
  expect("the sidecar line matches the provenance schema", run("python3", ["-I", join(root, "packages/naive/src/records/validate.py"), "--schema", "provenance-entry.schema.json", "--file", fresh]).status === 0);
  const body = createHash("sha256").update(readFileSync(file)).digest("hex");
  expect("the line's sha256 is the package body", line.sha256 === body);
  const checked = run(process.execPath, [join(root, "packages/naive/src/checks/check-provenance.mjs"), "--package", file]);
  expect("the sidecar chain holds", checked.status === 0);
  const tampered = once.replace(line.hash ?? "", "0".repeat(64));
  writeFileSync(side, tampered);
  expect("an edited sidecar line breaks the chain", run(process.execPath, [join(root, "packages/naive/src/checks/check-provenance.mjs"), "--package", file]).status !== 0);
  writeFileSync(side, once + once);
  expect("the same gate line recorded twice fails", run(process.execPath, [join(root, "packages/naive/src/checks/check-provenance.mjs"), "--package", file]).status !== 0);
}
{
  const dir = join(tmp, "order");
  mkdirSync(dir);
  const file = join(dir, "pricing-admit.json");
  cpSync(fix("pricing-admit.json"), file);
  const referred = gate(file, "finance", ["--record"]);
  expect("a gate can be the first line, with no earlier gate", referred.body?.verdict === "refer" && run(process.execPath, [join(root, "packages/naive/src/checks/check-provenance.mjs"), "--package", file]).status === 0 && readFileSync(join(dir, "pricing-admit.provenance.jsonl"), "utf8").trim().split("\n").length === 1);
  const admitted = gate(file, "marketing-and-sales", ["--record"]);
  const text = readFileSync(join(dir, "pricing-admit.provenance.jsonl"), "utf8");
  expect("a second function on the same body appends a second line", admitted.body?.verdict === "admit" && text.trim().split("\n").length === 2 && run(process.execPath, [join(root, "packages/naive/src/checks/check-provenance.mjs"), "--package", file]).status === 0);
  expect("re-running the second gate does not append", gate(file, "marketing-and-sales", ["--record"]).status === 0 && readFileSync(join(dir, "pricing-admit.provenance.jsonl"), "utf8") === text);
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { title: string };
  parsed.title = "A different body";
  writeFileSync(file, JSON.stringify(parsed));
  const warned = run(process.execPath, [join(root, "packages/naive/src/checks/check-provenance.mjs"), "--package", file]);
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
    "packages/naive/src/interfaces/references/references.json",
    "operations/departments.json",
  ]) {
    mkdirSync(join(dir, dirname(rel)), { recursive: true });
    cpSync(join(root, rel), join(dir, rel));
  }
  mkdirSync(join(dir, "docs"), { recursive: true });
  const ontology = JSON.parse(readFileSync(join(root, "packages/naive/src/terms/ontology.json"), "utf8")) as { nouns: Record<string, unknown>[] };
  edit(ontology);
  writeFileSync(join(dir, "packages/naive/src/terms/ontology.json"), JSON.stringify(ontology));
  return dir;
}
const noun = (ontology: { nouns: Record<string, unknown>[] }, name: string) => ontology.nouns.find((item) => item.noun === name);
const check = (dir: string) => run(process.execPath, [join(root, "packages/naive/src/checks/check-nouns.mjs")], { EE_ROOT: dir });

expect("the repository ontology passes", run(process.execPath, [join(root, "packages/naive/src/checks/check-nouns.mjs")]).status === 0);
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
{
  const dir = sparse((o) => { o.nouns.push({ noun: "vendor@finance", level: "venture", meaning: "A stand-in sense.", standard: "ours", status: "proposed", function: "products", handoff_type: false }); });
  const ran = check(dir);
  expect("a scoped noun must be owned by the function it names", ran.status !== 0 && /vendor@finance: function products does not match its scope finance/.test(ran.stderr));
}
{
  const dir = sparse((o) => { o.nouns.push({ noun: "customer", level: "venture", meaning: "The unscoped word.", standard: "ours", status: "proposed", function: null, handoff_type: false }); });
  const ran = check(dir);
  expect("a bare noun cannot sit beside a scoped sense", ran.status !== 0 && /customer: bare noun beside a scoped sense/.test(ran.stderr));
}
{
  const dir = sparse((o) => { o.nouns.push({ noun: "vendor@nope", level: "venture", meaning: "A sense with no function.", standard: "ours", status: "proposed", function: null, handoff_type: false }); });
  const ran = check(dir);
  expect("a scope that is not a function id fails", ran.status !== 0 && /vendor@nope: scope nope is not a function id/.test(ran.stderr));
}
{
  const dir = sparse((o) => { o.nouns.push({ noun: "customer", level: "venture", meaning: "Retired once the word was split.", standard: "ours", status: "retired", replaced_by: "customer@finance", function: null, handoff_type: false }); });
  const ran = check(dir);
  expect("a retired bare noun may sit beside its scoped senses", ran.status === 0);
}

function spawnGate(file: string, fn: string): Promise<{ status: number | null }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, "packages/naive/src/checks/check-nouns.mjs"), "--package", file, "--function", fn, "--record"], { cwd: root });
    child.on("close", (status) => resolve({ status }));
  });
}
let races = 0;
for (let i = 0; i < 15; i++) {
  const dir = join(tmp, `race-${i}`);
  mkdirSync(dir);
  const file = join(dir, "pricing-admit.json");
  cpSync(fix("pricing-admit.json"), file);
  await Promise.all(["finance", "marketing-and-sales", "products"].map((fn) => spawnGate(file, fn)));
  const side = join(dir, "pricing-admit.provenance.jsonl");
  const checked = run(process.execPath, [join(root, "packages/naive/src/checks/check-provenance.mjs"), "--package", file]);
  const count = existsSync(side) ? readFileSync(side, "utf8").trim().split("\n").length : 0;
  if (checked.status !== 0 || count !== 3) races++;
}
expect("concurrent gates on one package keep a single chain", races === 0);

{
  const lock = join(tmp, "live.lock");
  writeFileSync(lock, String(process.pid));
  const old = (Date.now() - 10000) / 1000;
  utimesSync(lock, old, old);
  const held = statSync(lock);
  expect("a live holder's lock is never stolen, however old it is", stealDeadLock(lock) === false && statSync(lock).ino === held.ino);
  unlinkSync(lock);
  writeFileSync(lock, "");
  utimesSync(lock, old, old);
  const judged = statSync(lock);
  unlinkSync(lock);
  const fd = openSync(lock, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR);
  writeFileSync(lock, String(process.pid));
  const live = statSync(lock);
  const took = takeStaleLock(lock, { ino: judged.ino, mtimeMs: judged.mtimeMs });
  const after = statSync(lock);
  closeSync(fd);
  expect("a stale-lock cleanup never deletes a live lock that replaced it", took === false && after.ino === live.ino);
}

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("ontology membership gate: all passed");
