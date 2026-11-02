// The operating-rules module: the default validates, an invalid module is refused,
// and a venture overlay changes the resolved rules. The membership gate reads the
// retry rule from that resolution.
//
//   node schema/operating-rules-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyOverlay, OperatingRulesError, operatingRulesFor, readOperatingRules } from "./operating-rules.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "operating-rules-"));
const modulePath = join(root, "operations/operating-rules.json");
let failed = 0;
const expect = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail && !ok ? `: ${detail}` : ""}`);
  if (!ok) failed++;
};

const python = (file: string) => spawnSync("python3", ["-I", join(root, "schema/validate.py"), "--schema", "operating-rules.schema.json", "--file", file], { encoding: "utf8", cwd: root });
type GateBody = { disposition?: { retries?: number; escalate_to?: string; retry_by?: string } };
const gate = (file: string, fn: string, extra: string[] = []) => {
  const ran = spawnSync(process.execPath, [join(root, "schema/check-nouns.mjs"), "--package", file, "--function", fn, ...extra], { encoding: "utf8", cwd: root });
  let body: GateBody | null = null;
  try { body = JSON.parse(ran.stdout) as GateBody; } catch { body = null; }
  return { status: ran.status, stdout: ran.stdout, stderr: ran.stderr, body };
};
const writeJson = (name: string, value: unknown) => {
  const file = join(tmp, name);
  writeFileSync(file, JSON.stringify(value));
  return file;
};
const copyModule = (edit: (_value: Record<string, unknown>) => void) => {
  const value = JSON.parse(readFileSync(modulePath, "utf8")) as Record<string, unknown>;
  edit(value);
  return writeJson(`bad-${++n}.json`, value);
};
let n = 0;
const throws = (fn: () => unknown) => {
  try { fn(); return ""; }
  catch (e) { return e instanceof Error ? e.message : String(e); }
};
/** The loader reports the same line schema/validate.py prints. */
const agrees = (file: string) => {
  const ran = python(file);
  const message = throws(() => readOperatingRules(file));
  const line = (ran.stdout ?? "").split("\n").map((l) => l.trim()).find((l) => l && l !== "valid");
  return ran.status !== 0 && !!line && message.includes(line);
};

const rules = readOperatingRules(modulePath);
const schema = python(modulePath);
expect("the default module validates", schema.status === 0 && rules.id === "default", schema.stdout);
expect("the default retry is one by the lead, then the founder", rules.rejection.retry.retries === 1 && rules.rejection.retry.retry_by === "lead" && rules.rejection.retry.escalate_to === "founder" && rules.rejection.retry.on_reject === "retry" && rules.rejection.retry.then === "escalate");
expect("the parent who may edit is the chief-of-staff role", rules.rejection.edit.who === "parent" && rules.rejection.edit.role === "chief-of-staff" && existsSync(join(root, "governance/venture-template/roles", `${rules.rejection.edit.role}.json`)));
expect("a rejecting function returns the package and does not modify it", rules.rejection.rejector.may_modify === false && rules.rejection.rejector.return_to === "parent" && rules.rejection.rejector.carries.join(",") === "failing_gate,reason");
expect("self-fix proposals need founder approval", rules.self_fix.requires_founder_approval === true);
expect("gates run before a design is shown", rules.design.gates_before_founder === true);
expect("the design-diff verb set is create, amend and delete", rules.design.diff.move_keeps_id === "rename" && rules.design.diff.one_kind_per_line === true && rules.design.diff.split_compound === true && rules.design.diff.verbs.create.kinds.join(",") === "originate,derive" && rules.design.diff.verbs.create.derive_names === "source" && rules.design.diff.verbs.amend.kinds.join(",") === "append,rename,deprecate,revise" && rules.design.diff.verbs.delete.kinds.join(",") === "remove,merge" && rules.design.diff.verbs.delete.merge_names === "successor");
expect("Jev records and does not block, at the suggested Noul thresholds", rules.jev.mode === "record-only" && rules.jev.yes === 0.7 && rules.jev.no === 0.3);
expect("a question type is verb, noun and asking function", rules.questions.type.parts.join(",") === "verb,noun,asking_function");
expect("the most specific routing rule wins, and a tie goes to the founder", rules.questions.routing.specificity === "most_specific" && rules.questions.routing.tie === "founder" && rules.questions.routing.match === "any_subset" && rules.questions.routing.destinations.join(",") === "function_agent,founder,standing_answer" && rules.questions.routing.rules.length === 0);
expect("pattern learning keeps the rules that are decided", rules.questions.pattern_learning.founder_approves === true && rules.questions.pattern_learning.never_verb === "delete" && rules.questions.pattern_learning.pause_when === "founder_answers_differently");
expect("standing-rule decay keeps the outcomes that are decided", rules.questions.decay.satisfied.join(",") === "acceptance,moving_on" && rules.questions.decay.unsatisfied.join(",") === "override,correction,frustration" && rules.questions.decay.frustration === "jev_noul" && rules.questions.decay.below_floor === "suspend_and_ask" && rules.questions.decay.show === "uses_that_lowered_it");

{
  const file = copyModule((m) => { (m.rejection as { retry: { retries: number } }).retry.retries = -1; });
  expect("a negative retry count is invalid", agrees(file));
}
{
  const file = copyModule((m) => { m.extra = true; });
  expect("an unknown field is invalid", agrees(file));
}
{
  const file = copyModule((m) => { (m.jev as { yes: number }).yes = 0.2; });
  const message = throws(() => readOperatingRules(file));
  expect("a yes threshold that is not above no is invalid", python(file).status === 0 && /jev.yes must be above jev.no/.test(message));
}
{
  const file = copyModule((m) => { (m.questions as { pattern_learning: { min_answers: number } }).pattern_learning.min_answers = 0; });
  expect("pattern learning with no minimum answers is invalid", agrees(file));
}
{
  const file = copyModule((m) => { (m.questions as { pattern_learning: { wilson_lower_bound: number } }).pattern_learning.wilson_lower_bound = 0; });
  expect("a Wilson lower bound of 0 is invalid", agrees(file));
}
{
  const file = copyModule((m) => { (m.questions as { decay: { decay_floor: number } }).decay.decay_floor = 0; });
  expect("a decay floor of 0 is invalid", agrees(file));
}
{
  const file = copyModule((m) => { (m.questions as { decay: { decay_floor: number } }).decay.decay_floor = 1.2; });
  expect("a decay floor above 1 is invalid", agrees(file));
}
{
  const file = copyModule((m) => { (m.questions as { decay: { decay_window: number } }).decay.decay_window = 0; });
  expect("a decay window of 0 is invalid", agrees(file));
}
{
  const rule = { id: "drop-price", verb: "delete", kind: "remove", to: "standing_answer", answer: "No." };
  const file = copyModule((m) => { ((m.questions as { routing: { rules: unknown[] } }).routing.rules) = [rule]; });
  expect("a standing answer on a delete verb is invalid", agrees(file));
}
{
  const rule = { id: "bad-kind", verb: "create", kind: "remove", noun: "pricing decision", to: "founder" };
  const file = copyModule((m) => { ((m.questions as { routing: { rules: unknown[] } }).routing.rules) = [rule]; });
  expect("a kind from another verb is invalid", agrees(file));
}
{
  const rule = { id: "bare", to: "founder" };
  const file = copyModule((m) => { ((m.questions as { routing: { rules: unknown[] } }).routing.rules) = [rule]; });
  expect("a rule that names no part is invalid", agrees(file));
}
{
  const rule = { id: "no-agent", verb: "amend", kind: "revise", noun: "pricing decision", to: "function_agent" };
  const file = copyModule((m) => { ((m.questions as { routing: { rules: unknown[] } }).routing.rules) = [rule]; });
  expect("a function agent with no function is invalid", agrees(file));
}

const venture = join(tmp, "venture");
mkdirSync(venture);
writeFileSync(join(venture, "venture.json"), JSON.stringify({ id: "fixture", name: "Fixture" }));
writeFileSync(join(venture, "operating-rules.json"), JSON.stringify({
  rejection: { retry: { retries: 4, escalate_to: "architect" } },
  questions: {
    pattern_learning: { min_answers: 12 },
    decay: { decay_window: 30 },
    routing: { rules: [{ id: "price-home", verb: "amend", kind: "revise", noun: "pricing decision", asking_function: "finance", to: "founder" }] },
  },
}));
const resolved = operatingRulesFor(root, join(venture, "package.json"));
expect("a venture overlay changes the retry and leaves the rest", resolved.rejection.retry.retries === 4 && resolved.rejection.retry.escalate_to === "architect" && resolved.rejection.retry.retry_by === "lead" && resolved.self_fix.requires_founder_approval === true && resolved.jev.mode === "record-only");
expect("a venture overlay changes pattern learning and decay without dropping their other fields", resolved.questions.pattern_learning.min_answers === 12 && resolved.questions.pattern_learning.wilson_lower_bound === rules.questions.pattern_learning.wilson_lower_bound && resolved.questions.pattern_learning.founder_approves === true && resolved.questions.decay.decay_window === 30 && resolved.questions.decay.decay_floor === rules.questions.decay.decay_floor && resolved.questions.decay.below_floor === "suspend_and_ask" && resolved.questions.routing.rules.length === 1 && resolved.questions.routing.tie === "founder");
{
  let caught: unknown;
  try { applyOverlay(rules, { rejection: { retry: { retries: -1 } } }, "overlay"); }
  catch (e) { caught = e; }
  expect("an overlay that drives the retry count negative is refused", caught instanceof OperatingRulesError && /retries/.test(caught.message));
}
{
  const message = throws(() => applyOverlay(rules, { questions: { decay: { decay_floor: 0 } } }, "overlay"));
  expect("an overlay cannot set the decay floor to 0", /decay_floor/.test(message));
}
{
  const message = throws(() => applyOverlay(rules, { questions: { routing: { rules: [
    { id: "same", noun: "pricing decision", to: "founder" },
    { id: "same", verb: "create", kind: "originate", to: "founder" },
  ] } } }, "overlay"));
  expect("two routing rules cannot share an id", /duplicate id same/.test(message));
}

const structured = join(tmp, "structured");
mkdirSync(join(structured, "meta"), { recursive: true });
writeFileSync(join(structured, "venture.json"), JSON.stringify({ id: "structured", name: "Structured", layout: "structured" }));
writeFileSync(join(structured, "operating-rules.json"), JSON.stringify({ questions: { decay: { decay_floor: 0.25 } } }));
writeFileSync(join(structured, "meta/operating-rules.json"), JSON.stringify({ rejection: { retry: { retries: 2 } } }));
const fromMeta = operatingRulesFor(root, join(structured, "package.json"));
expect("a structured venture reads meta/operating-rules.json", fromMeta.rejection.retry.retries === 2 && fromMeta.questions.decay.decay_floor === rules.questions.decay.decay_floor && fromMeta.questions.decay.decay_floor !== 0.25);

const packageFile = join(venture, "unknown-term.json");
cpSync(join(root, "schema/fixtures/ontology-gate/unknown-term.json"), packageFile);
const overridden = gate(packageFile, "marketing-and-sales");
expect("the gate reads the venture retry rule", overridden.body?.disposition?.retries === 4 && overridden.body?.disposition?.escalate_to === "architect" && overridden.body?.disposition?.retry_by === "lead");
const plain = gate(join(root, "schema/fixtures/ontology-gate/unknown-term.json"), "marketing-and-sales");
expect("a package outside a venture keeps the default retry", plain.body?.disposition?.retries === 1 && plain.body?.disposition?.escalate_to === "founder");

writeFileSync(join(venture, "operating-rules.json"), JSON.stringify({ rejection: { retry: { retries: -1 } } }));
const broken = gate(packageFile, "marketing-and-sales", ["--record"]);
expect("an invalid venture module is a tool error and records nothing", broken.status === 2 && !broken.stdout.includes("\"verdict\"") && !existsSync(join(venture, "unknown-term.provenance.jsonl")));

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("operating rules: all passed");
