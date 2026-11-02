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
/** The loader reports the validate.py line that names this field. */
const agrees = (file: string, field: string) => {
  const ran = python(file);
  const message = throws(() => readOperatingRules(file));
  const line = (ran.stdout ?? "").split("\n").map((l) => l.trim()).find((l) => l.includes(field));
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
expect("a one_way_door package skips the retry and goes to the founder", rules.rejection.retry.one_way_door.retries === 0 && rules.rejection.retry.one_way_door.then === "escalate" && rules.rejection.retry.one_way_door.escalate_to === "founder" && rules.rejection.retry.retries === 1);
expect("impact is the max of four scores, and only the founder may lower a tier", rules.questions.impact.tiers.join(",") === "low,costly,one_way_door" && rules.questions.impact.scores.join(",") === "severity,reversibility,time_to_detect,blast_radius" && rules.questions.impact.score_min === 1 && rules.questions.impact.score_max === 3 && rules.questions.impact.tier_of === "max" && rules.questions.impact.agent === "raise" && rules.questions.impact.founder === "lower");
expect("one_way_door and delete never stand, and the founder still approves a rule", rules.questions.standing.bound === "wilson_lower" && rules.questions.standing.history === "full" && rules.questions.standing.one_way_door === "never" && rules.questions.standing.delete === "never" && rules.questions.standing.founder_approves === true && rules.questions.standing.pause_when === "founder_answers_differently");
expect("a rule is lost by SPRT and the statistic is floored at 0", rules.questions.loss.method === "sprt" && rules.questions.loss.statistic_floor === 0);
expect("signals count override and correction, and not silence or frustration", rules.questions.signals.against.join(",") === "override,correction" && rules.questions.signals.silence === "no_data" && rules.questions.signals.frustration === "confirming_question" && rules.questions.signals.spot_checks === "sample" && rules.questions.signals.package_rejection === "failure");
expect("outcomes wait for time_to_detect, and a slow type stays costly or higher", rules.questions.time_to_detect.scope === "question_type" && rules.questions.time_to_detect.score_when === "after_it_passes" && rules.questions.time_to_detect.slow_minimum_tier === "costly");
expect("a suspended rule restarts from zero after a cooldown", rules.questions.suspension.restart === "from_zero" && rules.questions.suspension.after === "cooldown" && rules.questions.suspension.long_running === "periodic_reconfirmation");
expect("notifications follow the tier", rules.questions.notifications.one_way_door === "interrupt" && rules.questions.notifications.costly === "veto_window" && rules.questions.notifications.low === "daily_digest");
expect("Lean is required before one_way_door math is used", rules.questions.lean.one_way_door === "proven_before_use" && rules.questions.lean.one_way_door_ci === "block" && rules.questions.lean.costly === "record_only_until_proven" && rules.questions.lean.low === "tests" && rules.questions.lean.low_lean === "optional");

{
  const file = copyModule((m) => { (m.rejection as { retry: { retries: number } }).retry.retries = -1; });
  expect("a negative retry count is invalid", agrees(file, "retries"));
}
{
  const file = copyModule((m) => { m.extra = true; });
  expect("an unknown field is invalid", agrees(file, "extra"));
}
{
  const file = copyModule((m) => { (m.jev as { yes: number }).yes = 0.2; });
  const message = throws(() => readOperatingRules(file));
  expect("a yes threshold that is not above no is invalid", python(file).status === 0 && /jev.yes must be above jev.no/.test(message));
}
{
  const file = copyModule((m) => { (m.questions as { standing: { z: number } }).standing.z = 0; });
  expect("a Wilson z of 0 is invalid", agrees(file, "standing/z"));
}
{
  const file = copyModule((m) => { (m.questions as { standing: { z: number } }).standing.z = 50; });
  expect("a Wilson z of 50 is invalid", agrees(file, "standing/z"));
}
{
  const file = copyModule((m) => { (m.questions as { standing: { low: number } }).standing.low = 1.2; });
  expect("a low-tier Wilson threshold above 1 is invalid", agrees(file, "standing/low"));
}
{
  const file = copyModule((m) => { (m.questions as { standing: { costly: number } }).standing.costly = 0.5; });
  const message = throws(() => readOperatingRules(file));
  expect("a costly threshold below the low one is invalid", python(file).status === 0 && /costly must be at least/.test(message));
}
{
  const file = copyModule((m) => { (m.questions as { loss: { p0: number } }).loss.p0 = 0; });
  expect("an SPRT p0 of 0 is invalid", agrees(file, "loss/p0"));
}
{
  const file = copyModule((m) => { (m.questions as { loss: { p1: number } }).loss.p1 = 1; });
  expect("an SPRT p1 of 1 is invalid", agrees(file, "loss/p1"));
}
{
  const file = copyModule((m) => { (m.questions as { loss: { alpha: number } }).loss.alpha = 1; });
  expect("an SPRT alpha of 1 is invalid", agrees(file, "loss/alpha"));
}
{
  const file = copyModule((m) => { (m.questions as { loss: { alpha: number; beta: number } }).loss.alpha = 0.6; (m.questions as { loss: { beta: number } }).loss.beta = 0.6; });
  const message = throws(() => readOperatingRules(file));
  expect("SPRT alpha + beta must be below 1", python(file).status === 0 && /alpha \+ questions.loss.beta must be below 1/.test(message));
}
{
  const file = copyModule((m) => { (m.questions as { loss: { statistic_floor: number } }).loss.statistic_floor = 5; });
  expect("an SPRT statistic floor other than 0 is invalid", agrees(file, "statistic_floor"));
}
{
  const file = copyModule((m) => { (m.questions as { loss: { p0: number; p1: number } }).loss.p0 = 0.4; (m.questions as { loss: { p1: number } }).loss.p1 = 0.2; });
  const message = throws(() => readOperatingRules(file));
  expect("SPRT p0 must be below p1", python(file).status === 0 && /p0 must be below/.test(message));
}
{
  const rule = { id: "drop-price", verb: "delete", kind: "remove", to: "standing_answer", answer: "No." };
  const file = copyModule((m) => { ((m.questions as { routing: { rules: unknown[] } }).routing.rules) = [rule]; });
  expect("a standing answer on a delete verb is invalid", agrees(file, "delete"));
}
{
  const rule = { id: "bad-kind", verb: "create", kind: "remove", noun: "pricing decision", to: "founder" };
  const file = copyModule((m) => { ((m.questions as { routing: { rules: unknown[] } }).routing.rules) = [rule]; });
  expect("a kind from another verb is invalid", agrees(file, "rules/0"));
}
{
  const rule = { id: "bare", to: "founder" };
  const file = copyModule((m) => { ((m.questions as { routing: { rules: unknown[] } }).routing.rules) = [rule]; });
  expect("a rule that names no part is invalid", agrees(file, "rules/0"));
}
{
  const rule = { id: "no-agent", verb: "amend", kind: "revise", noun: "pricing decision", to: "function_agent" };
  const file = copyModule((m) => { ((m.questions as { routing: { rules: unknown[] } }).routing.rules) = [rule]; });
  expect("a function agent with no function is invalid", agrees(file, "function"));
}

const venture = join(tmp, "venture");
mkdirSync(venture);
writeFileSync(join(venture, "venture.json"), JSON.stringify({ id: "fixture", name: "Fixture" }));
writeFileSync(join(venture, "operating-rules.json"), JSON.stringify({
  rejection: { retry: { retries: 4, escalate_to: "architect" } },
  questions: {
    standing: { low: 0.5 },
    loss: { alpha: 0.2 },
    routing: { rules: [{ id: "price-home", verb: "amend", kind: "revise", noun: "pricing decision", asking_function: "finance", to: "founder" }] },
  },
}));
const resolved = operatingRulesFor(root, join(venture, "package.json"));
expect("a venture overlay changes the retry and leaves the rest", resolved.rejection.retry.retries === 4 && resolved.rejection.retry.escalate_to === "architect" && resolved.rejection.retry.retry_by === "lead" && resolved.self_fix.requires_founder_approval === true && resolved.jev.mode === "record-only");
expect("a venture overlay changes a provisional threshold without dropping the decided rules", resolved.questions.standing.low === 0.5 && resolved.questions.standing.one_way_door === "never" && resolved.questions.standing.delete === "never" && resolved.questions.loss.alpha === 0.2 && resolved.questions.loss.method === "sprt" && resolved.questions.loss.p0 === rules.questions.loss.p0 && resolved.questions.routing.rules.length === 1 && resolved.questions.routing.tie === "founder");
{
  let caught: unknown;
  try { applyOverlay(rules, { rejection: { retry: { retries: -1 } } }, "overlay"); }
  catch (e) { caught = e; }
  expect("an overlay that drives the retry count negative is refused", caught instanceof OperatingRulesError && /retries/.test(caught.message));
}
{
  const message = throws(() => applyOverlay(rules, { questions: { loss: { p0: 0 } } }, "overlay"));
  expect("an overlay cannot set SPRT p0 to 0", /p0/.test(message));
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
writeFileSync(join(structured, "operating-rules.json"), JSON.stringify({ questions: { loss: { p0: 0.2 } } }));
writeFileSync(join(structured, "meta/operating-rules.json"), JSON.stringify({ rejection: { retry: { retries: 2 } } }));
const fromMeta = operatingRulesFor(root, join(structured, "package.json"));
expect("a structured venture reads meta/operating-rules.json", fromMeta.rejection.retry.retries === 2 && fromMeta.questions.loss.p0 === rules.questions.loss.p0 && fromMeta.questions.loss.p0 !== 0.2);

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
