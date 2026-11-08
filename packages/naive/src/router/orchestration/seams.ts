// Seam detectors at run time (docs/design/LEAD_AGENTS_2026-11-08.md, "Seam detectors", build plan item 6). For each
// built seam (packages/naive/src/checks/check-seams.ts SEAMS) whose detector is in force for the venture (its own
// governance/detectors/<id>.json, else Naive's shipped default):
//
//   1. the sensor scores every subject on both sides of the seam, and the detector's criterion turns each score into
//      a call (packages/naive/src/engine/generators/detector-trial.ts call);
//   2. a no call is quiet: no trial, no decision;
//   3. a yes call (or an unsure one, when the criterion routes to a person) appends a trial to the detection ledger
//      (governance/detector-trial/<id>, action append) and opens a decision through the router (decisions/<id>,
//      action write) put to the detector's assign_to role, carrying the trial in detector_trial. The decision's id is
//      the detector, the subject and a hash of its findings, so a rerun files nothing new for the same drift, whether
//      that decision is open or settled. A changed set of findings is a new call;
//   4. each settled decision that carries a seam trial not yet resolved resolves it: decided (acted on) is a hit,
//      withdrawn or decided with an answer starting "Dismiss" is a false alarm (signal override). The resolver is the
//      person who approved it, else the last person whose provenance line touched the decision file, else founder.
//      An open or deferred decision resolves nothing: silence is no data.
//
//   node packages/naive/src/router/orchestration/seams.ts <venture dir> [--json]
//
// It runs no model and changes no record of either function: only a person acts on the decision.

import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { entries } from "../../core/provenance.mjs";
import { ventureFile } from "../../core/venture-paths.mjs";
import { decisionFile, decisionFiles } from "../../engine/decisions.mjs";
import { criterionFor, detectorFor } from "../../engine/detectors.mjs";
import { call as callAt } from "../../engine/generators/detector-trial.ts";
import { SEAMS } from "../../checks/check-seams.ts";
import type { Seam, Subject } from "../../checks/check-seams.ts";
import type { DecisionRecord, DetectorTrial } from "../../records/types/records.d.ts";
import { appendTrial, read as readLedger, resolveTrial } from "../detection-ledger.mjs";
import { call } from "../router.mjs";

/** The two answers a lead gives. An answer that starts with DISMISS settles the call as a false alarm. */
export const ACT = "Act on it: fix the records or the tool";
export const DISMISS = "Dismiss: the records agree, or the drift is intended";
const DRAFTER = "seam-detector";

type Reply = { ok: boolean; error?: string; result?: Record<string, unknown> };
type Criterion = NonNullable<DetectorTrial["criterion"]>;
export type Called = { detector: string; subject: string; path: string; score: number; call: string; trial?: string; decision?: string; assigned_to?: string; error?: string };
export type Resolved = { detector: string; trial: string; decision: string; outcome: "hit" | "false-alarm"; by: string; error?: string };
export type RunResult = { ok: boolean; venture: string; called: Called[]; quiet: number; kept: string[]; resolved: Resolved[]; skipped: { detector: string; why: string }[]; problems: string[] };

const load = (f: string): unknown => JSON.parse(readFileSync(f, "utf8"));
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** The decision a call opens: the detector, the subject and a hash of its findings, so the same drift is filed once. */
export function decisionId(detector: string, s: Pick<Subject, "kind" | "id" | "findings">): string {
  const sig = createHash("sha256").update(s.findings.map((f) => f.text).sort().join("\n")).digest("hex").slice(0, 8);
  return `${detector}-${s.kind}-${s.id}-${sig}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

/** Whether a settled decision means the call was acted on or dismissed, or null while it is not settled. */
export function outcomeOf(d: Pick<DecisionRecord, "status" | "answer">): "hit" | "false-alarm" | null {
  if (d.status === "withdrawn") return "false-alarm";
  if (d.status !== "decided") return null;
  return /^\s*dismiss/i.test(d.answer ?? "") ? "false-alarm" : "hit";
}

/** Who settled a decision: the approver, else the last person on its provenance, else the founder. */
function settledBy(dir: string, file: string, d: DecisionRecord): string {
  if (d.provenance?.approved_by) return d.provenance.approved_by;
  const last = (entries(dir) as { entity?: string; agent?: { kind?: string; id?: string } }[]).filter((e) => e.entity === file && e.agent?.kind === "person" && e.agent.id).at(-1);
  return last?.agent?.id ?? "founder";
}

async function callSeam(dir: string, venture: string, seam: Seam, out: RunResult): Promise<void> {
  const found = detectorFor(dir, seam.detector) as { detector: { assign_to?: string; title?: string } } | null;
  const crit = criterionFor(dir, seam.detector) as { criterion: Criterion } | null;
  if (!found || !crit) { out.skipped.push({ detector: seam.detector, why: "no detector record in force (neither the venture's nor Naive's default)" }); return; }
  const assign = found.detector.assign_to;
  const { subjects, problems } = seam.sense(dir);
  out.problems.push(...problems);
  const ctx = { venture, workspace: dir, via: "router" };
  for (const s of subjects) {
    const made = crit.criterion.route === "person" ? (s.score > 0 ? "unsure" : "no") : callAt(s.score, crit.criterion);
    if (made === "no") { out.quiet++; continue; }
    const id = decisionId(seam.detector, s);
    if (decisionFile(dir, id)) { out.kept.push(id); continue; }
    const row: Called = { detector: seam.detector, subject: `${s.kind}/${s.id}`, path: s.path, score: s.score, call: made, ...(assign ? { assigned_to: assign } : {}) };
    out.called.push(row);
    const trial = randomUUID();
    const t = await appendTrial({ ...ctx, actor: "agent" }, { detector: seam.detector, id: trial, score: s.score, criterion: crit.criterion, call: made,
      note: `${s.path}: ${s.findings.map((f) => f.code).join(", ")}` }) as Reply;
    if (!t.ok) { row.error = `trial: ${t.error}`; out.ok = false; continue; }
    row.trial = trial;
    const decision: DecisionRecord = {
      id, status: "open",
      question: `${seam.title} (${seam.functions.join(" and ")}): ${s.path} disagrees with the other function's records. ${s.findings.map((f) => f.text).join("; ")}. Act on it, or dismiss it?`,
      options: [ACT, DISMISS],
      decides: { record: s.record, path: s.path },
      boundary: "fail-open",
      ...(assign ? { assigned_to: assign } : {}),
      detector_trial: { detector: seam.detector, trial },
      note: `Opened by the ${seam.detector} detector's yes call (score ${s.score}). Deciding it resolves the trial as a hit; withdrawing it, or an answer that starts with Dismiss, as a false alarm.`,
      provenance: { drafted_by: { kind: "agent", id: DRAFTER } },
    };
    const w = await call({ venture, workspace: dir, route: `decisions/${id}`, action: "write", input: decision, actor: "agent", via: "router",
      provenance: { note: `${seam.detector} yes call on ${s.path}`, derived_from: [s.path] } }) as Reply;
    if (!w.ok) { row.error = `decision: ${w.error}`; out.ok = false; continue; }
    row.decision = id;
  }
}

async function settle(dir: string, venture: string, out: RunResult): Promise<void> {
  const seams = new Set(SEAMS.map((s) => s.detector));
  const settled: { file: string; d: DecisionRecord; outcome: "hit" | "false-alarm" }[] = [];
  for (const file of decisionFiles(dir) as string[]) {
    let d: unknown;
    try { d = load(ventureFile(dir, file)); } catch { continue; }
    if (!isObj(d) || !isObj(d.detector_trial) || !seams.has(String(d.detector_trial.detector))) continue;
    const rec = d as unknown as DecisionRecord;
    const outcome = outcomeOf(rec);
    if (outcome) settled.push({ file, d: rec, outcome });
  }
  const ledgers = new Map<string, Set<string>>();
  for (const { file, d, outcome } of settled) {
    const { detector, trial } = d.detector_trial as { detector: string; trial: string };
    if (!ledgers.has(detector)) {
      const { lines } = await readLedger({ venture, workspace: dir }, detector) as { lines: { kind: string; trial?: string }[] };
      ledgers.set(detector, new Set(lines.filter((l) => l.kind === "resolution").map((l) => l.trial ?? "")));
    }
    if (ledgers.get(detector)?.has(trial)) continue;
    const by = settledBy(dir, file, d);
    const res = await resolveTrial({ venture, workspace: dir, actor: "person", via: "router" }, { detector, trial, outcome, by: { kind: "person", id: by },
      ...(outcome === "false-alarm" ? { signal: "override" as const } : {}), note: `decision ${d.id} was ${outcome === "hit" ? "acted on" : "dismissed"}` }) as Reply;
    const row: Resolved = { detector, trial, decision: d.id, outcome, by };
    if (!res.ok) { row.error = res.error; out.ok = false; } else ledgers.get(detector)?.add(trial);
    out.resolved.push(row);
  }
}

/** One pass over a venture: resolve the trials settled decisions carry, then call every built seam. */
export async function run(dir: string): Promise<RunResult> {
  const v = load(join(dir, "venture.json")) as { id: string };
  const out: RunResult = { ok: true, venture: v.id, called: [], quiet: 0, kept: [], resolved: [], skipped: [], problems: [] };
  await settle(dir, v.id, out);
  for (const seam of SEAMS) await callSeam(dir, v.id, seam, out);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir || !existsSync(join(dir, "venture.json"))) {
    console.error("usage: node packages/naive/src/router/orchestration/seams.ts <venture dir> [--json]");
    process.exit(2);
  }
  const r = await run(dir);
  if (args.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.resolved) console.log(`resolved  ${x.detector} trial ${x.trial}: ${x.outcome} (decision ${x.decision}, by ${x.by})${x.error ? `  error: ${x.error}` : ""}`);
    for (const x of r.called) console.log(`called    ${x.detector} ${x.call} on ${x.path} (score ${x.score})${x.decision ? `: decision ${x.decision} for ${x.assigned_to ?? "the founder"}` : ""}${x.error ? `  error: ${x.error}` : ""}`);
    for (const id of r.kept) console.log(`kept      ${id}: already filed`);
    for (const s of r.skipped) console.log(`skipped   ${s.detector}: ${s.why}`);
    for (const p of r.problems) console.log(`problem   ${p}`);
    console.log(`${r.called.length} called, ${r.quiet} quiet, ${r.kept.length} already filed, ${r.resolved.length} resolved`);
  }
  process.exit(r.ok && !r.problems.length ? 0 : 1);
}
