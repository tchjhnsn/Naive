// Tests for the detection ledger through the router (docs/design/SIGNAL_DETECTION_2026-11-07.md, build plan item 4): a
// held draft a person accepts resolves the gate's yes call as a false alarm; an accepted write a person reverts
// resolves its no call as a miss; a venture without governance/detectors/gate-confidence.json writes no ledger line
// and answers as before; the chain holds after parallel appends from separate processes; a duplicate or unknown
// resolution is refused. Every venture lives in a temporary workspace; nothing is written into the repository.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "./router.mjs";
import { appendTrial, ledgerPath, read, resolveTrial, verify } from "./detection-ledger.mjs";
import { entries } from "../core/provenance.mjs";
import { validateValue } from "../records/validate.mjs";

const repo = new URL("../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "detection-ledger-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
delete env.MENTURA_ACTOR_ID;
delete env.MENTURA_PERSON;
delete process.env.MENTURA_ACTOR_ID;
delete process.env.MENTURA_PERSON;
const cliPath = join(repo, "packages/naive/src/interfaces/cli/mentura.mjs");
const cli = (...a: string[]) => spawnSync(process.execPath, [cliPath, ...a], { encoding: "utf8", env });
const json = (o: unknown): string => JSON.stringify(o, null, 2) + "\n";
const solution = (statement: string) => ({ venture: "x", statement, alternatives: ["a receptionist"], evidence: [] });
const DETECTOR = {
  id: "gate-confidence", tier: "low", call_site: "packages/naive/src/engine/gate.mjs confidence_below",
  question: { verb: "hold", noun: "write", asking_function: "governance", text: "Does this write need a person?" },
  evidence: { kind: "founder-agent", sensor: "the writing agent", scale: { min: 0, max: 1, meaning: "the agent's confidence in its write" }, sources: [{ source: "venture", records: "system/provenance" }] },
  criterion: { yes: { value: 0.7, set_by: "test" } },
  costs: { hit: 1, miss: 1, false_alarm: 1, correct_rejection: 1, set_by: "tier" },
  base_rate: { source: "ledger" },
  resolution: { resolver: { kind: "record", id: "accepted draft or reverted write" }, time_to_detect: "7d" },
};

interface Reply { ok: boolean, error?: string, conflict?: { current: string | null }, result?: Record<string, unknown> & { detector?: Record<string, unknown>, draft?: boolean, written?: string } }
interface LedgerLine { kind: string, id: string, call?: string, outcome?: string, signal?: string, trial?: string, provenance?: string, score?: number, criterion?: Record<string, unknown>, by?: { kind: string, id: string } }

function venture(id: string, withDetector: boolean): string {
  const made = cli("init", join(ws, `ventures/${id}`), "--id", id, "--layers", "purpose");
  if (made.status !== 0) throw new Error(made.stderr);
  const dir = join(ws, `ventures/${id}`);
  if (withDetector) { mkdirSync(join(dir, "governance/detectors"), { recursive: true }); writeFileSync(join(dir, "governance/detectors/gate-confidence.json"), json(DETECTOR)); }
  return dir;
}
const write = async (v: string, input: unknown, extra: Record<string, unknown> = {}): Promise<Reply> => await call({ venture: v, route: "validation/solution", action: "write", input, workspace: ws, ...extra }) as Reply;
const ledgerLines = (dir: string): LedgerLine[] => {
  const f = join(dir, ledgerPath("gate-confidence"));
  return existsSync(f) ? readFileSync(f, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as LedgerLine) : [];
};
const ctx = (v: string) => ({ venture: v, workspace: ws });

// A held draft, accepted by a person, resolves the gate's yes call as a false alarm (signal override).
{
  const dir = venture("held", true);
  const held = await write("held", solution("held, then accepted"), { provenance: { confidence: 0.4 } });
  const trial = ledgerLines(dir)[0];
  expect("an agent's low-confidence write is held as before", held.ok && held.result?.draft === true, JSON.stringify(held));
  expect("the held write is a yes trial with the score, the criterion in force and the draft's provenance line",
    trial?.kind === "trial" && trial.call === "yes" && trial.score === 0.4 && JSON.stringify(trial.criterion) === JSON.stringify({ yes: 0.7, yes_when: "below" }) && trial.provenance === held.result?.provenance, JSON.stringify(trial));
  expect("the write answers which ledger line it appended", held.result?.detector?.appended === "trial" && held.result.detector.line === trial?.id, JSON.stringify(held.result?.detector));
  const side = JSON.parse(readFileSync(join(dir, "_drafts/validation__solution.json.draft.gate"), "utf8")) as { variants: { trial?: string }[] };
  expect("the held draft's sidecar names its trial", side.variants[0]?.trial === trial?.id, JSON.stringify(side));
  const ok = cli("accept", "validation/solution", "--venture", "held");
  const lines = ledgerLines(dir);
  const res = lines[1];
  expect("a person accepts the draft as before", ok.status === 0 && /accepted/.test(ok.stdout), ok.stdout + ok.stderr);
  expect("accepting it resolves the trial as a false alarm, by a person, with signal override",
    lines.length === 2 && res?.kind === "resolution" && res.trial === trial?.id && res.outcome === "false-alarm" && res.signal === "override" && res.by?.kind === "person", JSON.stringify(lines));
  expect("the ledger's chain verifies", verify(lines as never).ok, verify(lines as never).errors.join("; "));
  expect("each ledger line is a provenance entry", entries(dir).filter((e: { entity: string }) => e.entity === ledgerPath("gate-confidence")).length === 2);
  const invalid = lines.map((l) => validateValue("detector-trial.schema.json", l)).filter((v) => v.status !== 0);
  expect("every ledger line matches detector-trial.schema.json", !invalid.length, invalid.map((v) => v.stdout + v.stderr).join(""));
}

// An accepted write, reverted by a person, resolves the gate's no call as a miss (signal correction).
{
  const dir = venture("reverted", true);
  const first = await write("reverted", solution("the person's own version"), { actor: "person" });
  expect("a person's write makes no trial", first.ok && !first.result?.detector && !ledgerLines(dir).length, JSON.stringify(first.result));
  const agent = await write("reverted", solution("an agent's confident version"), { provenance: { confidence: 0.95 } });
  const trial = ledgerLines(dir)[0];
  expect("a confident agent write lands as before and is a no trial", agent.ok && agent.result?.draft === false && trial?.call === "no" && trial.provenance === agent.result?.provenance, JSON.stringify(trial));
  const input = join(ws, "revert.json");
  writeFileSync(input, json(solution("the person's own version")));
  const back = cli("validation/solution", "write", "--venture", "reverted", "--input", input, "--as", "person", "--revert");
  const lines = ledgerLines(dir);
  expect("a person reverts the write with --revert, logged as a rollback", back.status === 0 && entries(dir).at(-2)?.activity === "rollback", back.stdout + back.stderr);
  expect("reverting it resolves the no trial as a miss, with signal correction",
    lines.length === 2 && lines[1]?.trial === trial?.id && lines[1]?.outcome === "miss" && lines[1]?.signal === "correction" && lines[1]?.by?.kind === "person", JSON.stringify(lines));
  const again = cli("validation/solution", "write", "--venture", "reverted", "--input", input, "--as", "person", "--revert");
  expect("a second revert finds no unresolved no call and appends nothing", again.status === 0 && ledgerLines(dir).length === 2, again.stdout + again.stderr);
  expect("the chain verifies", verify(ledgerLines(dir) as never).ok);
}

// A venture without the detector file writes no ledger line and answers exactly as before.
{
  const dir = venture("plain", false);
  const held = await write("plain", solution("held without a detector"), { provenance: { confidence: 0.4 } });
  const side = JSON.parse(readFileSync(join(dir, "_drafts/validation__solution.json.draft.gate"), "utf8")) as { variants: Record<string, unknown>[] };
  const ok = cli("accept", "validation/solution", "--venture", "plain");
  const passed = await write("plain", solution("passed without a detector"), { provenance: { confidence: 0.95 } });
  expect("without the detector the gate holds and passes as before", held.ok && held.result?.draft === true && ok.status === 0 && passed.ok && passed.result?.draft === false);
  expect("without the detector no answer names one, and the sidecar names no trial", !held.result?.detector && !passed.result?.detector && !("trial" in (side.variants[0] ?? {})));
  expect("without the detector no ledger file or folder is made", !existsSync(join(dir, "governance/detectors")));
  expect("without the detector provenance holds no ledger entry", !entries(dir).some((e: { entity: string }) => e.entity.includes("detectors")));
}

// The chain verifies after parallel appends from separate processes.
{
  const dir = venture("parallel", true);
  const writers = 6, each = 5;
  const mod = new URL("./detection-ledger.mjs", import.meta.url).href;
  const code = `const { appendTrial } = await import(${JSON.stringify(mod)});
for (let i = 0; i < ${each}; i++) { const r = await appendTrial({ venture: "parallel", workspace: ${JSON.stringify(ws)} }, { detector: "gate-confidence", score: Math.random(), criterion: { yes: 0.7 }, call: "no" }); if (!r.ok) { console.error(r.error); process.exit(1); } }`;
  const runs = await Promise.all(Array.from({ length: writers }, () => new Promise<number>((done) => {
    const p = spawn(process.execPath, ["--input-type=module", "-e", code], { env, stdio: ["ignore", "ignore", "inherit"] });
    p.on("close", (status) => done(status ?? 1));
  })));
  const lines = ledgerLines(dir);
  expect("every parallel writer finished", runs.every((s) => s === 0), runs.join(","));
  expect("every parallel append landed", lines.length === writers * each, String(lines.length));
  const v = verify(lines as never);
  expect("the ledger's chain verifies after parallel appends", v.ok, v.errors.slice(0, 3).join("; "));
  const prov = spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-provenance.mjs"), dir], { encoding: "utf8" });
  expect("the provenance chain verifies after parallel appends", prov.status === 0, prov.stdout + prov.stderr);
  // Parallel resolutions of one trial: exactly one lands.
  const target = lines[0]?.id ?? "";
  const resolveCode = `const { resolveTrial } = await import(${JSON.stringify(mod)});
const r = await resolveTrial({ venture: "parallel", workspace: ${JSON.stringify(ws)} }, { detector: "gate-confidence", trial: ${JSON.stringify(target)}, outcome: "correct-rejection", by: { kind: "person", id: "founder" } });
process.exit(r.ok ? 0 : 3);`;
  const res = await Promise.all(Array.from({ length: 4 }, () => new Promise<number>((done) => {
    const p = spawn(process.execPath, ["--input-type=module", "-e", resolveCode], { env, stdio: "ignore" });
    p.on("close", (status) => done(status ?? 1));
  })));
  const after = ledgerLines(dir);
  expect("parallel resolutions of one trial: exactly one lands, the rest are refused", res.filter((s) => s === 0).length === 1 && res.filter((s) => s === 3).length === 3 && after.filter((l) => l.trial === target).length === 1, res.join(","));
  expect("the chain still verifies", verify(after as never).ok);
}

// A duplicate, unknown or mismatched resolution is refused; a stale base is a conflict; a line for another detector is refused.
{
  const dir = venture("refuse", true);
  const t = await appendTrial(ctx("refuse"), { detector: "gate-confidence", score: 0.3, criterion: { yes: 0.7 }, call: "yes" });
  const id = (t.result as { line: { id: string } } | undefined)?.line.id ?? "";
  const by = { kind: "person" as const, id: "founder" };
  const unknown = await resolveTrial(ctx("refuse"), { detector: "gate-confidence", trial: "no-such-trial", outcome: "hit", by });
  expect("a resolution for an unknown trial is refused", !unknown.ok && /holds no trial/.test(unknown.error), JSON.stringify(unknown));
  const wrong = await resolveTrial(ctx("refuse"), { detector: "gate-confidence", trial: id, outcome: "miss", by });
  expect("a yes call cannot resolve as a miss", !wrong.ok && /cannot resolve as miss/.test(wrong.error), JSON.stringify(wrong));
  const first = await resolveTrial(ctx("refuse"), { detector: "gate-confidence", trial: id, outcome: "hit", by });
  const dup = await resolveTrial(ctx("refuse"), { detector: "gate-confidence", trial: id, outcome: "false-alarm", by });
  expect("the first resolution lands", first.ok, JSON.stringify(first));
  expect("a second resolution of the same trial is refused", !dup.ok && /already resolved/.test(dup.error), JSON.stringify(dup));
  const sameId = await call({ venture: "refuse", workspace: ws, route: "governance/detector-trial/gate-confidence", action: "append", input: { line: { kind: "trial", id, detector: "gate-confidence", at: new Date().toISOString(), score: 0.1, criterion: { yes: 0.7 }, call: "yes" } } }) as Reply;
  expect("a line whose id the ledger holds is refused", !sameId.ok && /already holds a line/.test(sameId.error ?? ""), JSON.stringify(sameId));
  const { version } = await read(ctx("refuse"), "gate-confidence");
  const stale = await call({ venture: "refuse", workspace: ws, route: "governance/detector-trial/gate-confidence", action: "append", input: { base: "0".repeat(40), line: { kind: "trial", id: "stale", detector: "gate-confidence", at: new Date().toISOString(), score: 0.1, criterion: { yes: 0.7 }, call: "yes" } } }) as Reply;
  expect("an append with a stale base is refused with the current version", !stale.ok && stale.conflict?.current === version, JSON.stringify(stale));
  const other = await call({ venture: "refuse", workspace: ws, route: "governance/detector-trial/gate-confidence", action: "append", input: { line: { kind: "trial", id: "other", detector: "feedback-route", at: new Date().toISOString(), score: 0.1, criterion: { yes: 0.7 }, call: "yes" } } }) as Reply;
  expect("a line for another detector is refused", !other.ok && /not feedback-route/.test(other.error ?? ""), JSON.stringify(other));
  const bad = await call({ venture: "refuse", workspace: ws, route: "governance/detector-trial/gate-confidence", action: "append", input: { line: { kind: "trial", id: "bad", detector: "gate-confidence", at: new Date().toISOString(), call: "yes" } } }) as Reply;
  expect("a line that does not match the schema is refused", !bad.ok && /does not match/.test(bad.error ?? ""), JSON.stringify(bad));
  const lines = ledgerLines(dir);
  expect("only the trial and its one resolution were appended", lines.length === 2 && verify(lines as never).ok, JSON.stringify(lines.map((l) => l.id)));
  const write = await call({ venture: "refuse", workspace: ws, route: "governance/detector-trial/gate-confidence", action: "write", input: {} }) as Reply;
  expect("the ledger takes no whole-file write", !write.ok && /has no action write/.test(write.error ?? ""), JSON.stringify(write));
}

rmSync(ws, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("detection ledger: all passed");
