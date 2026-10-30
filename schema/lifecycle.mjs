#!/usr/bin/env node
// The venture development lifecycle (VDL): where a venture is, what its phase's gate asks, and whether
// it may move on. Phases and gates are defined once in purpose/frameworks/product-anatomy/phases.json;
// each venture states its own exit criteria per phase in its telos. A criterion is met when a person
// says so, with evidence; a phase change is a person's decision, and the gate refuses it while the
// current phase has unmet criteria, unless the person overrides it with a reason (logged).
//
//   node schema/lifecycle.mjs <venture dir>                                  where the venture is, as text (--json)
//   node schema/lifecycle.mjs <venture dir> meet <criterion> [--evidence <text>] [--by <person>]
//   node schema/lifecycle.mjs <venture dir> advance <phase> [--reason <text>] [--override <why>] [--by <person>]
//
// advance goes one phase forward; a step back (a venture can return to discovery) needs --reason, and
// skipping a phase needs --override. The change itself, with its staleness, is schema/freshness.mjs's phase().
//
// The gate and the evidence that clears it come from the venture's lifecycle playbook (venture.json
// lifecycle_playbook; purpose/frameworks/product-anatomy/playbooks/). With none named, product-first is
// read and its evidence is reported only, so a venture that never chose keeps today's behavior. A venture
// that names a playbook cannot pass a gate until a met exit criterion supplies each piece of its evidence.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { agentFromEnv, record } from "../interface/provenance.mjs";
import { phase as changePhase } from "./freshness.mjs";
import { ventureFile } from "./venture-paths.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (f) => JSON.parse(readFileSync(f, "utf8"));
export const PHASES = load(join(root, "purpose/frameworks/product-anatomy/phases.json")).phases.map(({ id, name, question, gate, binding_constraint }) => ({ id, name, question, gate, binding_constraint }));
export const DEFAULT_PLAYBOOK = "product-first";
const playbookDir = join(root, "purpose/frameworks/product-anatomy/playbooks");
export const playbooks = () => existsSync(playbookDir) ? readdirSync(playbookDir).filter((f) => f.endsWith(".json")).map((f) => load(join(playbookDir, f))) : [];
export const playbookOf = (id) => playbooks().find((p) => p.id === id) ?? null;
// Where a venture keeps its telos: foundation/ (setup writes it there) or the older purpose/.
const TELOS = ["foundation/telos.json", "purpose/telos.json"];
const telosFile = (dir) => TELOS.map((t) => ventureFile(dir, t)).find(existsSync) ?? null;

/** Where the venture is in the lifecycle and what stands between it and the next phase. */
export function lifecycle(dir) {
  const v = load(join(dir, "venture.json"));
  const i = PHASES.findIndex((p) => p.id === v.phase);
  const tf = telosFile(dir);
  const telos = tf ? load(tf) : null;
  const criteria = (telos?.phases?.find((p) => p.phase === v.phase)?.exit_criteria ?? []).map((c) => ({ id: c.id, statement: c.statement, evidence: c.evidence ?? null, met: c.met ?? null }));
  const unmet = criteria.filter((c) => !c.met).map((c) => c.id);
  const chosen = !!v.lifecycle_playbook;
  const pb = playbookOf(v.lifecycle_playbook ?? DEFAULT_PLAYBOOK);
  const ph = pb?.phases.find((x) => x.phase === v.phase);
  // Each piece of the playbook's gate evidence, and the met criteria that supply it.
  const evidence = (ph?.evidence ?? []).map((e) => {
    const re = new RegExp(e.match, "i");
    const by = criteria.filter((c) => c.met && (re.test(c.id) || re.test(c.statement ?? "") || re.test(c.met.evidence ?? "") || re.test(c.evidence ?? ""))).map((c) => c.id);
    return { id: e.id, statement: e.statement, met_by: by, met: by.length > 0 };
  });
  const missing = chosen ? evidence.filter((e) => !e.met) : [];
  const blocking = [
    ...(!criteria.length ? [`no exit criteria for ${v.phase} in the telos: state what must be true to leave it`] : unmet.map((id) => `exit criterion ${id} is not met`)),
    ...(!pb && chosen ? [`no lifecycle playbook ${v.lifecycle_playbook}`] : []),
    ...missing.map((e) => `the ${pb.id} playbook clears ${v.phase} on ${e.statement}; no met exit criterion supplies it`),
  ];
  const cur = PHASES[i] ? { ...PHASES[i], gate: ph?.gate ?? PHASES[i].gate } : null;
  return {
    venture: v.id, phase: v.phase, step: i + 1, of: PHASES.length,
    current: cur, next: PHASES[i + 1] ?? null,
    playbook: pb ? { id: pb.id, version: pb.version, chosen } : null,
    gate_evidence: evidence,
    telos: tf ? tf.slice(dir.length + 1) : null,
    exit_criteria: criteria,
    ready: criteria.length > 0 && blocking.length === 0,
    blocking,
  };
}

/** A person marks one of the current phase's exit criteria met, with the evidence for it. */
export function meet(dir, id, { evidence, by } = {}) {
  const tf = telosFile(dir);
  if (!tf) return { ok: false, error: "the venture has no telos yet, so no exit criteria to meet" };
  const v = load(join(dir, "venture.json"));
  const t = load(tf);
  const c = t.phases?.find((p) => p.phase === v.phase)?.exit_criteria?.find((x) => x.id === id);
  if (!c) return { ok: false, error: `${v.phase} has no exit criterion ${id}` };
  const agent = by ?? agentFromEnv("person", "cli");
  if (agent.kind !== "person") return { ok: false, error: "only a person can say an exit criterion is met; an agent can propose it" };
  c.met = { at: new Date().toISOString(), by: agent.id ?? "person", ...(evidence ? { evidence } : {}) };
  // Checked against its schema on a scratch copy first, so a bad telos never lands.
  const scratch = mkdtempSync(join(tmpdir(), "telos-"));
  writeFileSync(join(scratch, "telos.json"), JSON.stringify(t));
  const ok = spawnSync("python3", [join(root, "schema/validate.py"), "--schema", "telos.schema.json", "--file", join(scratch, "telos.json")], { encoding: "utf8" });
  rmSync(scratch, { recursive: true, force: true });
  if (ok.status !== 0) return { ok: false, error: `the telos would not match its schema:\n${(ok.stdout + ok.stderr).trim()}` };
  writeFileSync(tf, JSON.stringify(t, null, 2) + "\n");
  record(dir, { entity: tf.slice(dir.length + 1), route: "foundation/telos", activity: "confirm", agent, note: `exit criterion ${v.phase}/${id} met${evidence ? `: ${evidence}` : ""}` });
  return { ok: true, result: lifecycle(dir) };
}

/** A person moves the venture to another phase, through the gate. */
export function advance(dir, to, { reason, override, by, now } = {}) {
  const agent = by ?? agentFromEnv("person", "cli");
  if (agent.kind !== "person") return { ok: false, error: "a phase change is a person's decision; an agent can suggest it, never make it" };
  const l = lifecycle(dir);
  const from = PHASES.findIndex((p) => p.id === l.phase), target = PHASES.findIndex((p) => p.id === to);
  if (target < 0) return { ok: false, error: `${to} is not a phase (${PHASES.map((p) => p.id).join(", ")})` };
  if (target === from) return { ok: false, error: `${l.venture} is already in ${to}` };
  if (target < from && !reason) return { ok: false, error: `going back to ${to} needs --reason` };
  if (target > from + 1 && !override) return { ok: false, error: `${to} skips ${PHASES.slice(from + 1, target).map((p) => p.id).join(", ")}; pass --override "<why>" to skip` };
  if (target > from && !l.ready && !override) return { ok: false, error: `the ${l.current.gate} gate is not passed: ${l.blocking.join("; ")}. Meet them with naive phase --meet <id>, or pass --override "<why>"`, result: l };
  const why = [reason, override && `gate overridden: ${override}`].filter(Boolean).join("; ");
  const r = changePhase(dir, to, { reason: why || `${l.current.gate} passed`, by: agent, now });
  if (r.ok) r.result.gate = { phase: l.phase, gate: l.current.gate, passed: l.ready, overridden: override ?? null };
  return r;
}

const text = (l) => [
  `${l.venture}: ${l.current?.name ?? l.phase} (phase ${l.step} of ${l.of})`,
  l.current ? `  ${l.current.question}` : "",
  l.current ? `  Gate: ${l.current.gate}${l.playbook ? ` (${l.playbook.id} playbook${l.playbook.chosen ? "" : ", the default"})` : ""}` : "",
  ...l.gate_evidence.map((e) => `  ${e.met ? "✓" : "○"} evidence ${e.id}: ${e.statement}${e.met ? `  (from ${e.met_by.join(", ")})` : ""}`),
  ...(l.exit_criteria.length ? l.exit_criteria.map((c) => `  ${c.met ? "✓" : "○"} ${c.id}: ${c.statement}${c.met ? `  (met ${c.met.at.slice(0, 10)} by ${c.met.by})` : ""}`) : [`  ○ ${l.blocking[0]}`]),
  l.next ? `Next: ${l.next.name}, ${l.next.question}${l.ready ? "  Ready: naive phase " + l.next.id : ""}` : "This is the last phase.",
].filter(Boolean).join("\n");

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, cmd, arg, ...rest] = process.argv.slice(2);
  const all = process.argv.slice(2);
  const opt = (k) => { const i = all.indexOf(`--${k}`); return i < 0 ? undefined : all[i + 1]; };
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node schema/lifecycle.mjs <venture dir> [meet <criterion> | advance <phase>]"); process.exit(2); }
  const by = opt("by") ? agentFromEnv("person", "cli", { id: opt("by") }) : undefined;
  const out = (r) => { if (!r.ok) { console.error(r.error); process.exit(1); } return r.result; };
  if (!cmd || cmd.startsWith("--")) { const l = lifecycle(dir); console.log(all.includes("--json") ? JSON.stringify(l, null, 2) : text(l)); }
  else if (cmd === "meet") console.log(text(out(meet(dir, arg, { evidence: opt("evidence"), by }))));
  else if (cmd === "advance") { const r = out(advance(dir, arg, { reason: opt("reason"), override: opt("override"), by })); console.log(`${r.venture}: ${r.from} -> ${r.to}. ${r.note}`); }
  else { console.error(`unknown command ${cmd}`); process.exit(2); }
  void rest;
}
