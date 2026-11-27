#!/usr/bin/env node
// Proof that a phase's work was done (EE-227, docs/design/PROVING_WORK_2026-11-27.md). A venture leaves a phase only
// when it can prove it may: the records the phase's gate names exist and are the ones the venture recorded, and the
// work the phase runs was done and checks out. This reads the same evidence run-proof.ts reads, the provenance log and
// the blob store, and never a record's own say-so.
//
//   records  each record type the phase module's gate names as evidence (packages/naive/src/phases/<id>/phase.json
//            gate.evidence[].source), and the phase's exit criteria record, must have at least one file whose bytes
//            match the last live provenance line written for it: proven when that line is a write, an accept, a
//            merge, a rollback or a confirm, adopted when it is a person's baseline. A file with no line was written
//            outside the router, and a file whose bytes differ was changed after its last recorded write: neither
//            counts.
//   runs     the latest finished run of each workflow the phase lists must verify (run-proof.ts), so a run whose
//            claims do not check out holds the phase until it is run again or a person overrides.
//   intake   each intake workflow the phase lists, of a function the venture lists, must have a verified run or a
//            meeting closed with its goal reached (EE-200, the same test EE-217's prerequisites apply).
//
// lifecycle.ts adds every failing item to the gate's blocking list, so `naive phase <next>` refuses until it is
// proven or a person passes --override with a reason, which the phase change keeps.
//
//   node packages/naive/src/engine/phase-proof.ts <venture dir> [--phase <id>] [--json]
//
// judgePhase is pure. Reading the venture is an Effect through VentureFs (EE-125).

import { createHash } from "node:crypto";
import { Effect } from "effect";
import { VentureFs, readJson } from "../core/effect/fs.ts";
import type { NaiveError } from "../core/effect/errors.ts";
import { runMain, runSync } from "../core/effect/run.ts";
import { entriesEffect, type Entry } from "../core/provenance.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { loadPhase } from "../phases/phases.ts";
import { readDataModel, venturePaths } from "../records/index.ts";
import { exitCriteria } from "./canonical.ts";
import { readRuns, workflowsOf } from "./due.ts";
import { filesFor } from "./phase-gate.ts";
import { gatherFacts, judge } from "./prerequisites.ts";
import { proofFacts, verifyRun, type RunCheck } from "./run-proof.ts";

export type RecordState = "proven" | "adopted" | "unrecorded" | "changed" | "missing";
export type RecordProof = { type: string; file: string | null; state: RecordState; line: string | null; why: string };
export type WorkProof = { workflow: string; intake: boolean; run: string | null; verdict: RunCheck["verdict"] | "none"; meeting: boolean; ok: boolean; why: string };
export type PhaseProof = { phase: string; records: RecordProof[]; work: WorkProof[]; proven: boolean; blocking: string[] };

/** The provenance activities that put a record's current bytes down. A held draft does not: it waits for a person. */
export const SETTLES = new Set(["write", "accept", "merge", "rollback", "confirm", "baseline"]);
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** What one file's provenance says about its current bytes. Pure. */
export function proofOfFile(type: string, file: string, bytesSha: string, lines: readonly Entry[]): RecordProof {
  const last = [...lines].reverse().find((l) => l.entity === file && SETTLES.has(l.activity));
  if (!last) return { type, file, state: "unrecorded", line: null, why: `${file} has no line in the provenance log, so it was written outside the router` };
  if (last.sha256 !== bytesSha) return { type, file, state: "changed", line: last.hash ?? null, why: `${file} differs from its last recorded ${last.activity} (${last.at}), so it was changed outside the router since` };
  return last.activity === "baseline"
    ? { type, file, state: "adopted", line: last.hash ?? null, why: `${file} was adopted by ${last.agent?.id ?? "a person"} with these bytes (baseline)` }
    : { type, file, state: "proven", line: last.hash ?? null, why: `${file} is the bytes of its ${last.activity} at ${last.at} by ${last.agent?.id ?? last.agent?.kind ?? "someone"}` };
}

/** The verdict on a phase from what was gathered. Pure. */
export function judgePhase(phase: string, records: readonly RecordProof[][], work: readonly WorkProof[]): PhaseProof {
  // A type is proven when one of its files is; otherwise its best failure is reported.
  const best = records.map((files) => files.find((f) => f.state === "proven" || f.state === "adopted") ?? files[0]);
  const blocking = [
    ...best.filter((r) => r.state !== "proven" && r.state !== "adopted").map((r) => `${r.type}: ${r.why}`),
    ...work.filter((w) => !w.ok).map((w) => `${w.workflow}: ${w.why}`),
  ];
  return { phase, records: best, work: [...work], proven: blocking.length === 0, blocking };
}

/** Gathers and judges the proof of a venture's phase (its current phase unless named). */
export const phaseProof = (dir: string, phaseId?: string): Effect.Effect<PhaseProof, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const venture = (yield* readJson(ventureFile(dir, "venture.json"))) as { phase?: string };
  const phase = phaseId ?? venture.phase ?? "discovery";
  const def = yield* loadPhase(phase);
  const lines = yield* entriesEffect(dir);
  const model = readDataModel() as { records: { id: string; paths?: string[] }[] };
  const globsOf = (type: string) => venturePaths(model.records.find((x) => x.id === type));
  const records: RecordProof[][] = [];
  const types = [...new Set([...def.gate.evidence.map((e) => e.source), "exit-criteria"])];
  for (const type of types) {
    // The exit criteria are the canonical record, or the telos before telos-to-goals migrated it (canonical.ts).
    const ec = type === "exit-criteria" ? exitCriteria(dir, phase).file : null;
    const files = type === "exit-criteria" ? (ec ? [ec] : []) : yield* filesFor(dir, globsOf(type));
    const out: RecordProof[] = [];
    for (const f of files) {
      if (!(yield* fs.exists(ventureFile(dir, f)))) continue;
      out.push(proofOfFile(type, f, sha(yield* fs.readBytes(ventureFile(dir, f))), lines));
    }
    records.push(out.length ? out : [{ type, file: null, state: "missing", line: null, why: type === "exit-criteria" ? `the venture states no exit criteria for ${phase} (foundation/exit-criteria/${phase}.json)` : `no ${type} record exists, and the ${def.gate.name} gate needs one` }]);
  }
  const flows = new Map((yield* workflowsOf(dir)).map((w) => [`${w.function}/${w.id}`, w]));
  const runs = yield* readRuns(dir);
  const facts = yield* proofFacts(dir);
  const work: WorkProof[] = [];
  for (const key of def.workflows) {
    const flow = flows.get(key);
    if (!flow) continue; // a workflow of a function the venture does not list
    const intake = flow.trigger.kind === "intake";
    const latest = runs.filter((r) => r.workflow === key && r.outcome === "done").at(-1);
    const check = latest ? verifyRun(latest, flow, facts) : null;
    const met = intake ? judge([{ kind: "meeting", ref: key }], yield* gatherFacts(dir, [{ kind: "meeting", ref: key }])).met : false;
    const verified = check?.verdict === "verified";
    // A run whose claims do not check out blocks whatever else holds: it is a false record of work until rerun.
    const ok = check ? verified : !intake || met;
    const why = check && !verified
      ? `its latest run (${check.run}) does not verify: ${check.problems.slice(0, 3).join("; ")}${check.problems.length > 3 ? "; and more" : ""}. Run it again with naive workflow run ${key}`
      : !check && intake && !met ? `the intake has no verified run and no meeting closed with its goal reached: hold the meeting or run naive workflow run ${key}`
      : check ? `its latest run (${check.run}) verifies` : intake ? "its meeting closed with its goal reached" : "it has not run in this phase, and nothing claims it did";
    work.push({ workflow: key, intake, run: check?.run ?? null, verdict: check?.verdict ?? "none", meeting: met, ok, why });
  }
  return judgePhase(phase, records, work);
});

export const phaseProofSync = (dir: string, phaseId?: string): PhaseProof => runSync(phaseProof(dir, phaseId));

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--phase");
  if (!dir) { console.error("usage: node packages/naive/src/engine/phase-proof.ts <venture dir> [--phase <id>] [--json]"); process.exit(2); }
  const phaseId = args.includes("--phase") ? args[args.indexOf("--phase") + 1] : undefined;
  await runMain(Effect.map(phaseProof(dir, phaseId), (p) => {
    if (args.includes("--json")) console.log(JSON.stringify(p, null, 2));
    else {
      console.log(`${p.phase}: ${p.proven ? "proven" : "NOT PROVEN"}`);
      for (const r of p.records) console.log(`  ${r.state === "proven" || r.state === "adopted" ? "✓" : "✗"} ${r.type}: ${r.why}`);
      for (const w of p.work) console.log(`  ${w.ok ? "✓" : "✗"} ${w.workflow}: ${w.why}`);
    }
    if (!p.proven) process.exitCode = 1;
  }));
}
