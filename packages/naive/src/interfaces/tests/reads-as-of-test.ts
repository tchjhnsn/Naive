// Tests the researcher's read clamp (packages/naive/src/router/reads-as-of.mjs; everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, build plan item 7): a <function>-researcher role reads through the
// router and the agent filesystem only as of its cut. No read answers with anything written after the cut, a list
// holds only what existed then, a signal observed after the cut is left out, a researcher read with no cut is
// refused, actions that read the venture live are refused as of a cut, writes are not clamped, and nothing under
// _eval/ is ever an agent's. Every venture lives in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/reads-as-of-test.ts

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { call } from "../../router/router.mjs";
import { glob, ls, read, readRaw } from "../../router/agent-files.ts";
import { record } from "../../core/provenance.mjs";
import { blobHash } from "../../core/blobs.mjs";
import { cutFor, inEval, isResearcher } from "../../router/reads-as-of.mjs";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "reads-as-of-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
delete process.env.MENTURA_READS_AS_OF; delete process.env.MENTURA_ACTOR_ID;
const cli = (...a: string[]) => spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), ...a], { encoding: "utf8", env });
const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const solution = (statement: string) => ({ venture: "clamp", statement, alternatives: ["a receptionist"], evidence: [] });
const RESEARCHER = "strategy-researcher";

interface Reply { ok: boolean, error?: string, result?: unknown, as_of?: { at: string, role: string | null }, metadata?: unknown, not_found?: unknown }
type Args = { route: string, action?: string, input?: unknown, actor?: string, actor_id?: string, reads_as_of?: string | number };
const ask = async (a: Args): Promise<Reply> => await call({ venture: "clamp", workspace: ws, action: "read", ...a }) as Reply;
const statementOf = (r: Reply): unknown => (r.result as { statement?: string } | null)?.statement;

try {
  const made = cli("init", join(ws, "ventures/clamp"), "--id", "clamp", "--layers", "purpose,knowledge");
  if (made.status !== 0) throw new Error(made.stderr);
  const dir = join(ws, "ventures/clamp");

  // Two versions of one record and one competitor, written by a person through the router, with a cut between them.
  const w1 = await ask({ route: "validation/solution", action: "write", input: solution("first"), actor: "person" });
  const c1 = await ask({ route: "purpose/competitor/acme", action: "write", input: { id: "acme", name: "Acme Robotics" }, actor: "person" });
  if (!w1.ok || !c1.ok) throw new Error(`setup writes failed: ${JSON.stringify([w1, c1])}`);
  await pause(10);
  const cut = new Date().toISOString();
  await pause(10);
  const w2 = await ask({ route: "validation/solution", action: "write", input: solution("second"), actor: "person" });
  const c2 = await ask({ route: "purpose/competitor/beta", action: "write", input: { id: "beta", name: "Beta Machines" }, actor: "person" });
  if (!w2.ok || !c2.ok) throw new Error(`setup writes failed: ${JSON.stringify([w2, c2])}`);

  // A researcher with no cut is refused, never served live.
  const bare = await ask({ route: "validation/solution", actor_id: RESEARCHER });
  expect("a researcher's read with no cut is refused", !bare.ok && /reads_as_of/.test(bare.error ?? ""), JSON.stringify(bare));
  expect("a researcher's view with no cut is refused too", !(await ask({ route: "validation/solution", action: "view", actor_id: RESEARCHER })).ok);

  // As of the cut: the version written before it, never the one after.
  const then = await ask({ route: "validation/solution", actor_id: RESEARCHER, reads_as_of: cut });
  expect("as of the cut, a researcher reads the version written before it", then.ok && statementOf(then) === "first", JSON.stringify(then));
  expect("an as-of answer names its instant and role, and carries no live metadata", then.as_of?.at === cut && then.as_of?.role === RESEARCHER && then.metadata === undefined, JSON.stringify(then.as_of));
  const before = await ask({ route: "validation/solution", actor_id: RESEARCHER, reads_as_of: Date.parse(cut) - 60_000 });
  expect("as of a time before the first write, the record is not there", before.ok && before.result === null && !!before.not_found, JSON.stringify(before));
  const live = await ask({ route: "validation/solution" });
  expect("a read with no cut by another role is live", live.ok && statementOf(live) === "second" && live.as_of === undefined);
  const anyone = await ask({ route: "validation/solution", reads_as_of: cut });
  expect("any role may read as of a cut", anyone.ok && statementOf(anyone) === "first");

  // The live file is never read: an edit outside the router changes the live read only.
  writeFileSync(join(dir, "validation/solution.json"), JSON.stringify(solution("edited by hand"), null, 2) + "\n");
  expect("an edit to the live file does not reach an as-of read", statementOf(await ask({ route: "validation/solution", actor_id: RESEARCHER, reads_as_of: cut })) === "first");

  // A list as of the cut holds only what existed then.
  const list = await ask({ route: "purpose/competitor", actor_id: RESEARCHER, reads_as_of: cut });
  expect("a list as of the cut holds only the items written before it", list.ok && JSON.stringify(Object.keys(list.result as object)) === '["acme"]', JSON.stringify(list.result));
  const later = await ask({ route: "purpose/competitor/beta", actor_id: RESEARCHER, reads_as_of: cut });
  expect("an item written after the cut is not there as of it", later.ok && later.result === null);

  // A signal observed after the cut is left out, even though its file was written before the cut.
  const signal = (id: string, observed: string) => ({ id, type: "competitor-funding@1.0", producer: "local/person", subject: "acme", time: "2026-11-01T00:00:00Z", observed, props: {}, rating: { reliability: "B", credibility: 2 } });
  const put = (path: string, value: unknown) => {
    const content = JSON.stringify(value, null, 2) + "\n";
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
    record(dir, { entity: path, activity: "write", agent: { kind: "person", via: "cli" }, content, sha256: blobHash(content), note: "test signal" });
  };
  put("raw/signals/signals/competitor-funding/acme/2026-11-01-aaaaaaaaaaaaaaaaaaaaaaaa.json", signal("aaaaaaaaaaaaaaaaaaaaaaaa", "2026-11-01T00:00:00Z"));
  put("raw/signals/signals/competitor-funding/acme/2026-11-02-bbbbbbbbbbbbbbbbbbbbbbbb.json", signal("bbbbbbbbbbbbbbbbbbbbbbbb", "2099-01-01T00:00:00Z"));
  await pause(5);
  const now = new Date().toISOString();
  const signals = await ask({ route: "knowledge/signal", actor_id: RESEARCHER, reads_as_of: now });
  // knowledge/signal is one route over many files: one file comes back as the record, several as a map by path.
  const text = (r: Reply) => JSON.stringify(r.result ?? null);
  expect("as of a cut, a signal observed after it is left out and one observed before it is read", signals.ok && text(signals).includes("aaaaaaaaaaaaaaaaaaaaaaaa") && !text(signals).includes("bbbbbbbbbbbbbbbbbbbbbbbb"), JSON.stringify(signals));
  const liveSignals = await ask({ route: "knowledge/signal" });
  expect("a live read still holds both signals", liveSignals.ok && text(liveSignals).includes("aaaaaaaaaaaaaaaaaaaaaaaa") && text(liveSignals).includes("bbbbbbbbbbbbbbbbbbbbbbbb"));

  // As of a cut, only reads, views, writes, appends and templates: the rest reads the venture live.
  for (const action of ["layout", "navigate", "check"]) {
    const r = await ask({ route: "validation/solution", action, actor_id: RESEARCHER, reads_as_of: cut });
    expect(`as of a cut, ${action} is refused`, !r.ok && /reads the venture live/.test(r.error ?? ""), JSON.stringify(r).slice(0, 200));
  }
  const view = await ask({ route: "validation/solution", action: "view", actor_id: RESEARCHER, reads_as_of: cut });
  expect("as of a cut, a record's view renders the as-of version", view.ok && String(view.result).includes("first") && !String(view.result).includes("second"), String(view.result).slice(0, 200));
  const pkg = await ask({ route: "validation", actor_id: RESEARCHER, reads_as_of: cut });
  expect("as of a cut, a package or group route is refused", !pkg.ok, JSON.stringify(pkg).slice(0, 200));

  // Writes are not clamped: a researcher writes with no cut, and the write goes through the gate as usual.
  const write = await ask({ route: "validation/solution", action: "write", input: solution("from the researcher"), actor_id: RESEARCHER });
  expect("a researcher's write needs no cut and goes through as any agent write does", write.ok, JSON.stringify(write).slice(0, 300));

  // The agent filesystem honours the cut: read, ls and glob see the venture as of it.
  const at = { venture: "clamp", workspace: ws, actor_id: RESEARCHER, reads_as_of: cut };
  expect("agent files: a researcher's read with no cut is an error", (await read({ venture: "clamp", workspace: ws, actor_id: RESEARCHER }, "/validation/solution")).startsWith("Error:"));
  const raw = await readRaw(at, "/validation/solution");
  expect("agent files: read as of the cut gives the version before it", raw.ok && (raw.content ?? "").includes('"first"'), JSON.stringify(raw).slice(0, 200));
  const files = await ls(at, "/purpose/competitor");
  expect("agent files: ls of a collection as of the cut lists only its items then", files.some((f) => f.path === "/purpose/competitor/acme") && !files.some((f) => f.path === "/purpose/competitor/beta"), JSON.stringify(files));
  const found = (await glob(at, "purpose/competitor/*")).map((f) => f.path);
  expect("agent files: glob as of the cut finds only what existed then", JSON.stringify(found) === '["/purpose/competitor/acme"]', JSON.stringify(found));

  // The eval set is never an agent's, and the clamp's own rules.
  expect("_eval/ at any depth is the eval set, and so is an address into it", inEval("_eval/abc/outcomes.json") && inEval("competitors/_eval/x.json") && inEval("lib://_eval/x.json") && !inEval("evaluation/x.json") && !inEval("my_eval/x.json"));
  expect("a researcher is a <function>-researcher role", isResearcher("strategy-researcher") && isResearcher("marketing-and-sales-researcher") && !isResearcher("researcher") && !isResearcher("strategy") && !isResearcher(undefined));
  expect("a cut that is not a time is refused", !cutFor({ action: "read", actor_id: RESEARCHER, reads_as_of: "yesterday" }).ok);
  const everything = (await glob(at, "**")).map((f) => f.path);
  expect("agent files: nothing under _eval/ is ever listed", !everything.some((p) => inEval(p)), JSON.stringify(everything));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

if (failed) { console.error(`${failed} as-of clamp check(s) failed`); process.exit(1); }
console.log("researcher read clamp: ok");
