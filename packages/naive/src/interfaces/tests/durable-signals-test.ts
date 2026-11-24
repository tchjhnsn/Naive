// The durable signal pull (EE-161, Effect runtime plan phase 12b): with durable.engine sqlite, a pull killed right after
// its first record write lands resumes on the next run with the plan it made. Every projected record is written once,
// with one provenance line, the chain holds, the cursor moves, and a pull after that writes nothing.
//
//   node packages/naive/src/interfaces/tests/durable-signals-test.ts

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { CURSOR } from "../../engine/signals.ts";
import { durableFile } from "../../core/effect/durable.ts";

const repo = fileURLToPath(new URL("../../../../..", import.meta.url));
let failed = 0;
const ok = (name: string, cond: boolean, detail = "") => { console.log(`${cond ? "pass" : "FAIL"}  ${name}${cond || !detail ? "" : `: ${detail}`}`); if (!cond) failed++; };

const NOW = "2026-11-07T00:00:00Z";
const ws = mkdtempSync(join(tmpdir(), "durable-signals-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_PERSON", "NAIVE_RUNTIME", "NAIVE_DURABLE_KILL"]) delete env[k];
const node = (script: string, a: string[], extra: NodeJS.ProcessEnv = {}) => spawnSync(process.execPath, [join(repo, script), ...a], { encoding: "utf8", env: { ...env, ...extra }, input: "" });
const read = (f: string): unknown => JSON.parse(readFileSync(f, "utf8"));

// Every file under the venture with a hash of its bytes, less the durable engine's own state, which a new run changes.
function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => { for (const e of readdirSync(d)) { const f = join(d, e); const rel = relative(dir, f); if (/^\.naive\/durable/.test(rel)) continue; if (statSync(f).isDirectory()) walk(f); else out[rel] = createHash("sha1").update(readFileSync(f)).digest("hex"); } };
  walk(dir);
  return out;
}

try {
  // The shared library and the venture, built as the signal pull test builds alpha.
  cpSync(join(repo, "packages/naive/src/records/examples/signals/library"), join(ws, "library"), { recursive: true });
  rmSync(join(ws, "library/types"), { recursive: true });
  cpSync(join(repo, "packages/naive/library/packages/competitors/signals/types"), join(ws, "library/types"), { recursive: true });
  const dir = join(ws, "ventures", "alpha");
  const made = node("packages/naive/src/interfaces/cli/mentura.ts", ["init", dir, "--id", "alpha", "--layers", "purpose"]);
  if (made.status !== 0) throw new Error(made.stderr);
  const cfgPath = join(dir, "naive.config.json");
  const cfg = existsSync(cfgPath) ? read(cfgPath) as Record<string, unknown> : {};
  writeFileSync(cfgPath, JSON.stringify({ ...cfg, durable: { engine: "sqlite" }, listeners: [
    { id: "competitor-master", hears: "organization@^1", consumer: { route: "competitors/[id]" }, then: "project" },
    { id: "track-competitors", hears: "competitor-funding@^1", consumer: { route: "competitors/[id]/signals" },
      criterion: { rating: { reliability: "C", credibility: 3 }, predicates: [{ id: "known-competitor", field: "subject", op: "in", value: { ids: "competitors" }, why: "Only companies already made competitors" }] }, then: "project" },
    { id: "rival-raised", hears: "competitor-funding@^1", consumer: { decision: "rival-raised" }, criterion: { rating: { reliability: "B", credibility: 2 }, predicates: [{ id: "in-our-markets", field: "props.org.domain", op: "exists" }] }, then: "propose", max_age: "14d" },
  ], listeners_off: ["name-competitors", "track-launches", "launch-revalidates-stance"] }, null, 2) + "\n");
  mkdirSync(join(dir, "knowledge"), { recursive: true });
  writeFileSync(join(dir, "knowledge/sources.json"), JSON.stringify({ sources: [{ id: "market", connector: "filesystem", root: "../../library", writes: "none", carries: "signals", note: "The shared library, read in place" }], records: {} }, null, 2) + "\n");

  const pull = (extra: NodeJS.ProcessEnv = {}) => node("packages/naive/src/router/orchestration/signals.ts", [dir, "pull", "--now", NOW, "--json"], extra);
  const records = ["competitors/acme-robotics.json", "competitors/acme-robotics/signals.json"];
  const log = () => readFileSync(join(dir, "provenance.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as { entity?: string; agent?: { id?: string } });
  const projected = (file: string) => log().filter((e) => e.entity === file && e.agent?.id === "projector").length;

  // ---- The first pull dies right after its first record write lands ----
  const marker = join(ws, "crashed");
  const first = pull({ NAIVE_DURABLE_KILL: `write/:${marker}` });
  ok("the first pull is killed after a write step", first.signal === "SIGKILL" && existsSync(marker) && readFileSync(marker, "utf8").startsWith("write/"), `${first.status} ${first.signal} ${first.stdout}${first.stderr}`);
  ok("its first record write landed, the second did not", projected(records[0]) === 1 && !existsSync(join(dir, records[1])), `${projected(records[0])} ${existsSync(join(dir, records[1]))}`);
  ok("the cursor did not move", !existsSync(join(dir, CURSOR)));
  ok("the run is open and its state kept in .naive/durable-signals.sqlite", existsSync(durableFile(dir, "signals")) && existsSync(join(dir, ".naive/durable-runs/signals-pull.json")));

  // ---- The next pull resumes with the plan it made ----
  const second = pull();
  const r2 = (() => { try { return JSON.parse(second.stdout) as { ok: boolean; status: string; written: string[]; proposed: string[] }; } catch { return null; } })();
  ok("the next pull resumes and finishes", second.status === 0 && r2?.ok === true && r2.status === "pulled", `${second.status} ${second.stdout}${second.stderr}`);
  ok("it reports both records written, from the plan the first run made", r2?.written.join() === records.join(), JSON.stringify(r2?.written));
  ok("every projected record is written once: one provenance line each", records.every((f) => projected(f) === 1), records.map((f) => `${f}:${projected(f)}`).join(" "));
  ok("the proposal is made once", r2?.proposed.join() === "rival-raised-acme-robotics" && log().filter((e) => e.entity === "decisions/rival-raised-acme-robotics.decision.json").length === 1, JSON.stringify(r2?.proposed));
  const chain = node("packages/naive/src/checks/check-provenance.ts", [dir]);
  ok("the provenance chain holds", chain.status === 0, chain.stdout + chain.stderr);
  ok("the cursor moved", existsSync(join(dir, CURSOR)) && (read(join(dir, CURSOR)) as { pulled_at?: string }).pulled_at === NOW);
  ok("the run is closed", !existsSync(join(dir, ".naive/durable-runs/signals-pull.json")));

  // ---- A pull after that writes nothing ----
  const before = snapshot(dir);
  const lines = log().length;
  const third = pull();
  const r3 = (() => { try { return JSON.parse(third.stdout) as { ok: boolean; status: string }; } catch { return null; } })();
  ok("a third pull has nothing new", third.status === 0 && r3?.status === "nothing new", `${third.status} ${third.stdout}${third.stderr}`);
  ok("and writes nothing: files and provenance unchanged", JSON.stringify(before) === JSON.stringify(snapshot(dir)) && log().length === lines);
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
