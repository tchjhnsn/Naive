// Tests the handoff claim through the router (docs/design/LEAD_AGENTS_2026-11-08.md, "The handoff claim", build plan
// item 5): two claims race from separate processes and exactly one wins; a claim on a handoff that is not ready, is
// addressed to another role or is already claimed is refused; after a claim only the claimant writes progress and
// evidence and only the requester (requested_by) writes the verification and acceptance, so a lead cannot accept a
// handoff it did not request and a claimant cannot verify its own work; the requester sends work back and it is
// claimed again; a handoff without requested_by is written as before; and check-ready.mjs and check-execution.mjs
// refuse a review whose reviewer is not the requester. Every venture lives in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/handoff-claim-test.ts

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../../router/router.mjs";
import { routes } from "../../records/routes/routes.mjs";
import { ventureFile } from "../../core/venture-paths.mjs";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const show = (r: unknown): string => String(JSON.stringify(r)).slice(0, 400);
const ws = mkdtempSync(join(tmpdir(), "handoff-claim-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_SESSION", "MENTURA_MODEL", "MENTURA_PERSON"]) { delete env[k]; delete process.env[k]; }
const cli = (...a: string[]) => spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), ...a], { encoding: "utf8", env });

interface Reply { ok: boolean, error?: string, claimed_by?: string, result?: { claimed?: string, claimed_by?: string, status?: string, written?: string, draft?: boolean } }
type Handoff = Record<string, unknown> & { status?: string, claimed_by?: string, verification?: Record<string, unknown> };

const V = "claims";
const made = cli("init", join(ws, `ventures/${V}`), "--id", V, "--layers", "purpose");
if (made.status !== 0) throw new Error(made.stderr);
const dir = join(ws, `ventures/${V}`);

const ROLE = "finance-agent", LEAD = "finance-lead", OTHER_LEAD = "growth-lead";
const handoff = (id: string, extra: Record<string, unknown> = {}): Handoff => ({
  id, title: `Handoff ${id}`, venture: V, role: ROLE, brief: `${id}.md`, decision_classes: ["implementation-detail"],
  done_criteria: [
    { id: "holds", kind: "conformance", check: "node packages/naive/src/checks/check-execution.mjs ." },
    { id: "proof", kind: "self-proof", check: "node packages/naive/src/checks/check-ready.mjs ." },
    { id: "fit", kind: "review", reviewer: LEAD, check: "Does it answer the question the lead asked?" },
  ],
  status: "ready", attempts: 0, max_attempts: 3, run_cap: "2h", requested_by: LEAD, ...extra,
});
const route = (id: string) => `operations/handoff/${id}`;
const asPerson = async (id: string, h: Handoff): Promise<Reply> => await call({ venture: V, workspace: ws, route: route(id), action: "write", input: h, actor: "person" }) as Reply;
const write = async (id: string, h: Handoff, actor_id: string, session?: string): Promise<Reply> =>
  await call({ venture: V, workspace: ws, route: route(id), action: "write", input: h, actor: "agent", actor_id, provenance: session ? { agent: { session } } : {} }) as Reply;
const claim = async (id: string, actor_id: string, session?: string): Promise<Reply> =>
  await call({ venture: V, workspace: ws, route: route(id), action: "claim", actor: "agent", actor_id, provenance: session ? { agent: { session } } : {} }) as Reply;
const stored = (id: string): Handoff => JSON.parse(readFileSync(ventureFile(dir, `operations/handoffs/${id}.json`), "utf8")) as Handoff;

// The route table gives the handoff item, and only it, a claim action.
{
  const t = routes() as { route: string, actions: string[] }[];
  expect("operations/handoff/[id] has a claim action", !!t.find((r) => r.route === "operations/handoff/[id]")?.actions.includes("claim"));
  expect("no other route has a claim action", t.filter((r) => r.actions.includes("claim")).length === 1);
}

// Claims race from separate processes and exactly one wins, in each of several rounds.
{
  const mod = new URL("../../router/router.mjs", import.meta.url).href;
  const rounds = 5, racers = 6;
  const code = (id: string, i: number) => `const { call } = await import(${JSON.stringify(mod)});
const r = await call({ venture: ${JSON.stringify(V)}, workspace: ${JSON.stringify(ws)}, route: "operations/handoff/${id}", action: "claim", actor: "agent", actor_id: ${JSON.stringify(ROLE)} });
process.stdout.write(JSON.stringify({ i: ${i}, ok: r.ok, by: r.result?.claimed_by ?? null, error: r.error ?? null }));`;
  for (let n = 1; n <= rounds; n++) {
    const id = `race-${n}`;
    const set = await asPerson(id, handoff(id));
    if (n === 1) expect("a person writes a ready handoff that names its requester", set.ok, show(set));
    const outs = await Promise.all(Array.from({ length: racers }, (_, i) => new Promise<{ i: number, ok: boolean, by: string | null, error: string | null }>((done) => {
      let out = "";
      const p = spawn(process.execPath, ["--input-type=module", "-e", code(id, i)], { env: { ...env, MENTURA_SESSION: `run-${n}-${i}` }, stdio: ["ignore", "pipe", "inherit"] });
      p.stdout.on("data", (b: Buffer) => { out += b.toString(); });
      p.on("close", () => { try { done(JSON.parse(out)); } catch { done({ i, ok: false, by: null, error: `no answer: ${out}` }); } });
    })));
    const wins = outs.filter((o) => o.ok);
    expect(`round ${n}: exactly one of ${racers} racing claims wins`, wins.length === 1, show(outs));
    expect(`round ${n}: every other racing claim is refused as already claimed`, outs.filter((o) => !o.ok).every((o) => /already claimed/.test(o.error ?? "")), show(outs));
    const h = stored(id);
    expect(`round ${n}: the handoff is in progress, claimed by the winner's run id`, h.status === "in-progress" && h.claimed_by === `run-${n}-${wins[0]?.i}` && wins[0]?.by === h.claimed_by, show(h));
  }
  const again = await claim("race-1", ROLE, "run-late");
  expect("a later claim of a claimed handoff is refused", !again.ok && /already claimed/.test(again.error ?? ""), show(again));
}

// A claim on a handoff that is not ready, or is addressed to another role, is refused.
{
  await asPerson("drafted", handoff("drafted", { status: "draft" }));
  const draft = await claim("drafted", ROLE, "run-d");
  expect("a claim on a draft handoff is refused", !draft.ok && /only a ready handoff is claimed/.test(draft.error ?? ""), show(draft));
  await asPerson("wrong-role", handoff("wrong-role"));
  const wrong = await claim("wrong-role", "marketing-agent", "run-w");
  expect("a claim by a role the handoff is not addressed to is refused", !wrong.ok && /addressed to finance-agent/.test(wrong.error ?? ""), show(wrong));
  expect("the refused claims change nothing", stored("drafted").status === "draft" && stored("wrong-role").claimed_by === undefined);
  const noRole = await call({ venture: V, workspace: ws, route: route("wrong-role"), action: "claim", actor: "agent" }) as Reply;
  expect("a claim with no acting role is refused", !noRole.ok && /acting role/.test(noRole.error ?? ""), show(noRole));
  const none = await claim("missing", ROLE, "run-m");
  expect("a claim on a missing handoff is refused", !none.ok, show(none));
  const fallback = await claim("wrong-role", "marketing-agent");
  expect("still refused without a run id", !fallback.ok);
}

// After a claim: the claimant writes progress and evidence; nobody else does.
{
  await asPerson("work", handoff("work"));
  const c = await claim("work", ROLE, "run-a");
  expect("the role the handoff names claims it", c.ok && c.result?.claimed_by === "run-a" && c.result?.status === "in-progress", show(c));
  const done = { ...stored("work"), status: "done", attempts: 1, pr: "https://example.com/pull/1", evidence: ["../../evidence/results/work-1.json"] };
  const other = await write("work", done, ROLE, "run-b");
  expect("another run in the same role may not write the claimant's progress", !other.ok && /claimed by run-a/.test(other.error ?? ""), show(other));
  const lead = await write("work", done, LEAD);
  expect("the requester may not write progress or evidence", !lead.ok && /writes only the verification and acceptance/.test(lead.error ?? ""), show(lead));
  const progress = await write("work", done, ROLE, "run-a");
  expect("the claimant writes progress and evidence", progress.ok && stored("work").status === "done", show(progress));
  const self = await write("work", { ...stored("work"), verification: { by: LEAD, at: "2026-11-08T20:00:00Z", outcome: "accepted" } }, ROLE, "run-a");
  expect("a claimant cannot verify its own work", !self.ok && /may not verify its own work/.test(self.error ?? ""), show(self));
  const brief = await write("work", { ...stored("work"), title: "retitled" }, ROLE, "run-a");
  expect("the claimant writes nothing but progress and evidence", !brief.ok && /not title/.test(brief.error ?? ""), show(brief));
  const steal = await write("work", { ...stored("work"), requested_by: ROLE }, ROLE, "run-a");
  expect("requested_by does not change", !steal.ok && /does not change/.test(steal.error ?? ""), show(steal));
}

// Verification and acceptance are the requester's alone.
{
  const accepted = { ...stored("work"), verification: { by: OTHER_LEAD, at: "2026-11-08T20:00:00Z", outcome: "accepted" } };
  const notMine = await write("work", accepted, OTHER_LEAD);
  expect("a lead cannot accept a handoff it did not request", !notMine.ok && /requested by finance-lead/.test(notMine.error ?? ""), show(notMine));
  const forged = await write("work", accepted, LEAD);
  expect("the requester's verification names the requester", !forged.ok && /is by its requester/.test(forged.error ?? ""), show(forged));
  const mine = await write("work", { ...stored("work"), verification: { by: LEAD, at: "2026-11-08T20:00:00Z", outcome: "accepted" } }, LEAD);
  expect("the requester accepts the done work", mine.ok && stored("work").verification?.outcome === "accepted" && stored("work").status === "done", show(mine));
}

// The requester sends work back, and the role claims it again.
{
  await asPerson("rework", handoff("rework"));
  await claim("rework", ROLE, "run-r1");
  await write("rework", { ...stored("rework"), status: "done", attempts: 1, pr: "https://example.com/pull/2" }, ROLE, "run-r1");
  const early = await write("rework", { ...stored("rework"), status: "ready" }, LEAD);
  expect("a send-back that does not record rework and clear the claim is refused", !early.ok && /sends it back only/.test(early.error ?? ""), show(early));
  const rest: Handoff = { ...stored("rework") };
  delete rest.claimed_by;
  const back = await write("rework", { ...rest, status: "ready", verification: { by: LEAD, at: "2026-11-08T20:00:00Z", outcome: "rework", reason: "the forecast skips payroll tax" } }, LEAD);
  expect("the requester sends the work back for rework", back.ok && stored("rework").status === "ready" && stored("rework").claimed_by === undefined, show(back));
  const second = await claim("rework", ROLE, "run-r2");
  expect("the role claims the reworked handoff again", second.ok && stored("rework").claimed_by === "run-r2", show(second));
}

// Before a claim, only the requester edits a handoff that names it, and nothing but the claim action claims it.
{
  await asPerson("unclaimed", handoff("unclaimed"));
  const other = await write("unclaimed", { ...stored("unclaimed"), title: "taken over" }, OTHER_LEAD);
  expect("another lead may not edit a handoff it did not request", !other.ok && /only its requester finance-lead/.test(other.error ?? ""), show(other));
  const edit = await write("unclaimed", { ...stored("unclaimed"), title: "sharper" }, LEAD);
  expect("the requester edits its handoff before a claim", edit.ok && stored("unclaimed").title === "sharper", show(edit));
  const sneak = await write("unclaimed", { ...stored("unclaimed"), status: "in-progress", claimed_by: "run-x" }, LEAD);
  expect("a plain write may not claim a handoff", !sneak.ok && /only through the claim action/.test(sneak.error ?? ""), show(sneak));
  const forge = await write("forged", handoff("forged", { requested_by: LEAD }), OTHER_LEAD);
  expect("an agent writes a new handoff only as its own requester", !forge.ok && /only as its requester/.test(forge.error ?? ""), show(forge));
  const own = await write("own", handoff("own", { requested_by: OTHER_LEAD }), OTHER_LEAD);
  expect("a lead writes a new handoff that names itself as requester", own.ok, show(own));
}

// A handoff without requested_by is written as before.
{
  const legacy: Handoff = handoff("legacy");
  delete legacy.requested_by;
  const first = await write("legacy", legacy, "builder");
  const progress = await write("legacy", { ...legacy, status: "in-progress", claimed_by: "session-1" }, "someone-else");
  expect("a handoff without requested_by is written by any agent, as before", first.ok && progress.ok && stored("legacy").claimed_by === "session-1", show([first, progress]));
  const c = await claim("legacy", "builder", "run-l");
  expect("the claim action still refuses a claimed handoff without requested_by", !c.ok && /already claimed/.test(c.error ?? ""), show(c));
}

// check-ready.mjs and check-execution.mjs refuse a review whose reviewer is not the requester.
{
  const mismatch = handoff("mismatch", { done_criteria: [
    { id: "holds", kind: "conformance", check: "node packages/naive/src/checks/check-execution.mjs ." },
    { id: "proof", kind: "self-proof", check: "node packages/naive/src/checks/check-ready.mjs ." },
    { id: "fit", kind: "review", reviewer: "architect", check: "Is it right?" },
  ] });
  await asPerson("mismatch", mismatch);
  const ready = spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-ready.mjs"), dir, "mismatch"], { encoding: "utf8", env });
  expect("check-ready refuses a review not judged by the requester", /FAIL {2}every review is judged by its requester finance-lead: fit names architect/.test(ready.stdout), ready.stdout + ready.stderr);
  const exec = spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-execution.mjs"), dir], { encoding: "utf8", env });
  expect("check-execution refuses a review not judged by the requester", exec.status !== 0 && /handoff\/mismatch\/fit: review is judged by the requester finance-lead, not architect/.test(exec.stderr), exec.stdout + exec.stderr);
  expect("check-execution takes the requester's own verification", !/handoff\/work: verified by/.test(exec.stderr), exec.stderr);
}

rmSync(ws, { recursive: true, force: true });
if (failed) { console.error(`${failed} handoff claim check(s) failed`); process.exit(1); }
console.log("handoff claim: claims race and one wins, and only the claimant and the requester write their parts");
