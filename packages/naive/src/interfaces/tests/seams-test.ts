// Tests the seam detectors (docs/design/LEAD_AGENTS_2026-11-08.md, "Seam detectors", build plan item 6): the tools
// against spend sensor (packages/naive/src/checks/check-seams.ts) scores each drift and nothing on a clean pair; a run
// (packages/naive/src/router/orchestration/seams.ts) stays quiet on a clean venture, and on a drifted one appends a yes
// trial per disagreeing record and opens a decision for the finance lead carrying that trial; a rerun files nothing
// new; a decision acted on resolves its trial as a hit, and one dismissed (withdrawn, or answered Dismiss) as a false
// alarm, once. Every venture lives in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/seams-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { call } from "../../router/router.mjs";
import { ledgerPath, verify } from "../../router/detection-ledger.mjs";
import { approve } from "../../engine/decisions.mjs";
import { detectorFor } from "../../engine/detectors.mjs";
import { validateValue } from "../../records/validate.mjs";
import { NOT_BUILT, SEAMS, toolsAgainstSpend } from "../../checks/check-seams.ts";
import { ACT, DISMISS, decisionId, outcomeOf, run } from "../../router/orchestration/seams.ts";
import { draft as connectionDraft } from "../../engine/generators/connection.ts";
import type { Connection, SpendRegister } from "../../records/types/records.d.ts";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "seams-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_READS_AS_OF", "MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_MODEL", "MENTURA_PERSON"]) { delete process.env[k]; delete env[k]; }
const node = (script: string, ...a: string[]) => spawnSync(process.execPath, [join(repo, script), ...a], { encoding: "utf8", env });
const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const put = (p: string, o: unknown): void => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 2) + "\n"); };

const DETECTOR = "seam-tools-spend";
const connection = (id: string, status: Connection["status"]): Connection => {
  const d = connectionDraft({ id, cluster: "runtime-and-data", status, access: { reads: [{ what: "projects", scope: "read" }], writes: [] },
    external_id: { field: "project_id" }, idempotency: { key: "request id", retries: { max: 3 }, reconciliation: { compares: "project ids" } },
    exit: { deletion: "delete the workspace", export: "export the files", disconnect: "revoke the token" }, failure: { stale: [], blocks: [], degrades: [] } });
  if (!d.ok || !d.draft) throw new Error(`connection fixture: ${JSON.stringify(d.errors)}`);
  return d.draft;
};
const line = (id: string, over: Partial<SpendRegister> = {}): SpendRegister => ({ id, vendor: id, purpose: `The ${id} tool`, amount: 10, currency: "USD", cadence: "monthly",
  renewal_date: "2026-12-01", account: "ops-checking", function: "products", status: "active", connection: id, approval: id, ...over });

function venture(id: string, connections: Connection[], spend: SpendRegister[]): string {
  const dir = join(ws, `ventures/${id}`);
  const made = node("packages/naive/src/engine/init-venture.mjs", dir, id);
  if (made.status !== 0) throw new Error(made.stderr || made.stdout);
  for (const c of connections) put(join(dir, `it/connections/${c.id}.json`), c);
  for (const s of spend) put(join(dir, `finance/spend/${s.id}.json`), s);
  return dir;
}
const seamDecisions = (dir: string): string[] => existsSync(join(dir, "decisions")) ? readdirSync(join(dir, "decisions")).filter((f) => f.startsWith(`${DETECTOR}-`)) : [];
const ledger = (dir: string): { kind: string; id: string; call?: string; trial?: string; outcome?: string; signal?: string; by?: { kind: string; id: string } }[] => {
  const f = join(dir, ledgerPath(DETECTOR));
  return existsSync(f) ? readFileSync(f, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : [];
};

try {
  // The shipped detector and the sensor, without a venture.
  const shipped = detectorFor(undefined, DETECTOR)?.detector;
  expect("the shipped seam detector names the finance lead, the costly tier and both functions' records as sources",
    shipped?.assign_to === "finance-lead" && shipped.tier === "costly" && shipped.costs.miss === 3 && shipped.costs.false_alarm === 1
      && JSON.stringify(shipped.evidence.sources.map((s: { records: string }) => s.records)) === JSON.stringify(["it/connections/[id]", "finance/spend/[id]"]), JSON.stringify(shipped));
  expect("the shipped seam detector matches detector.schema.json", validateValue("detector.schema.json", shipped).status === 0);
  expect("tools against spend is the one built seam, and the others are listed as not built with the record they miss",
    SEAMS.map((s) => s.detector).join() === DETECTOR && NOT_BUILT.length === 5 && NOT_BUILT.every((n) => n.missing.length > 0) && NOT_BUILT.some((n) => /runway/i.test(n.seam)));

  const clean = toolsAgainstSpend([{ id: "figma", status: "connected" }, { id: "draft-tool", status: "planned" }], [line("figma"), line("old", { status: "cancelled", connection: "gone", approval: undefined })]);
  expect("the sensor scores a paid, approved, connected tool and a cancelled line zero", clean.every((s) => s.score === 0), JSON.stringify(clean));
  const drift = toolsAgainstSpend(
    [{ id: "slack", status: "connected" }, { id: "zoom", status: "disconnected" }],
    [line("notion", { approval: undefined }), line("zoom"), line("rent", { connection: undefined, approval: "lease" })]);
  const codes = (id: string) => drift.find((s) => s.id === id)?.findings.map((f) => f.code).join(",");
  expect("a connected connection that no active line pays for scores one (unpaid-connection)", codes("slack") === "unpaid-connection", JSON.stringify(drift));
  expect("a line citing a connection that does not exist and no approval scores two", codes("notion") === "missing-connection,unapproved-spend" && drift.find((s) => s.id === "notion")?.score === 2);
  expect("a line citing a disconnected connection scores one (disconnected-connection)", drift.find((s) => s.kind === "spend" && s.id === "zoom")?.findings.map((f) => f.code).join() === "disconnected-connection");
  expect("a line whose approval names no connection record scores one (unapproved-spend)", codes("rent") === "unapproved-spend");
  expect("a disconnected connection is not called unpaid", drift.find((s) => s.kind === "connection" && s.id === "zoom")?.score === 0);
  expect("the decision id is stable for the same findings and changes with them",
    decisionId(DETECTOR, drift[0]) === decisionId(DETECTOR, { ...drift[0] }) && decisionId(DETECTOR, drift[0]) !== decisionId(DETECTOR, { ...drift[0], findings: [] }));
  expect("acted on is a hit; withdrawn or answered Dismiss is a false alarm; open or deferred is unsettled",
    outcomeOf({ status: "decided", answer: ACT }) === "hit" && outcomeOf({ status: "decided", answer: DISMISS }) === "false-alarm" && outcomeOf({ status: "withdrawn", answer: null }) === "false-alarm"
      && outcomeOf({ status: "open", answer: null }) === null && outcomeOf({ status: "deferred", answer: null }) === null);

  // A clean venture stays quiet.
  const quietDir = venture("quiet", [connection("figma", "connected")], [line("figma")]);
  const q = await run(quietDir);
  expect("a run on a clean venture calls nothing, appends no trial and opens no decision",
    q.ok && q.called.length === 0 && q.quiet === 2 && !existsSync(join(quietDir, ledgerPath(DETECTOR))) && !seamDecisions(quietDir).length, JSON.stringify(q));
  const cliClean = node("packages/naive/src/checks/check-seams.ts", quietDir);
  expect("check-seams on a clean venture reports 0 disagree and exits 0", cliClean.status === 0 && /seam-tools-spend \(it and finance\): 0 disagree, 2 clean/.test(cliClean.stdout), cliClean.stdout + cliClean.stderr);

  // A drifted copy fires.
  const dir = venture("drift", [connection("figma", "connected"), connection("slack", "connected"), connection("zoom", "disconnected")],
    [line("figma"), line("notion", { approval: undefined }), line("zoom")]);
  const cliDrift = node("packages/naive/src/checks/check-seams.ts", dir, "--json");
  const report = JSON.parse(cliDrift.stdout || "{}");
  expect("check-seams on a drifted copy lists the three records that disagree and exits 0 (drift is a call, not a failure)",
    cliDrift.status === 0 && report.seams?.[0]?.subjects?.length === 3 && report.not_built?.length === 5, cliDrift.stdout + cliDrift.stderr);
  const r = await run(dir);
  expect("a run on the drifted copy makes three yes calls, each with a trial and a decision", r.ok && r.called.length === 3 && r.called.every((c) => c.call === "yes" && c.trial && c.decision), JSON.stringify(r));
  const lines = ledger(dir);
  expect("the ledger holds three yes trials, its chain verifies and each line matches detector-trial.schema.json",
    lines.length === 3 && lines.every((l) => l.kind === "trial" && l.call === "yes") && verify(lines as never).ok && lines.every((l) => validateValue("detector-trial.schema.json", l).status === 0), JSON.stringify(lines));
  const decisions = r.called.map((c) => load(join(dir, `decisions/${c.decision}.decision.json`)));
  expect("each decision is open, put to finance-lead, drafted by an agent and carries its trial",
    decisions.every((d, i) => d.status === "open" && d.assigned_to === "finance-lead" && d.provenance?.drafted_by?.kind === "agent" && d.detector_trial?.detector === DETECTOR && d.detector_trial.trial === r.called[i].trial),
    JSON.stringify(decisions));
  expect("each decision matches decision-record.schema.json and offers act and dismiss",
    decisions.every((d) => validateValue("decision-record.schema.json", d).status === 0 && JSON.stringify(d.options) === JSON.stringify([ACT, DISMISS])));
  expect("the decisions are listed by the decision matrix", node("packages/naive/src/engine/decisions.mjs", dir, "--json").stdout.includes(r.called[0].decision ?? "no decision"));

  const again = await run(dir);
  expect("a rerun files nothing new and keeps the three decisions", again.ok && again.called.length === 0 && again.kept.length === 3 && ledger(dir).length === 3, JSON.stringify(again));

  // Settling the decisions resolves their trials.
  const byPath = (p: string) => r.called.find((c) => c.path === p) as { decision: string; trial: string };
  const slack = byPath("it/connections/slack.json"), notion = byPath("finance/spend/notion.json"), zoom = byPath("finance/spend/zoom.json");
  const acted = approve(dir, slack.decision, { by: "Torian", answer: ACT });
  const dismissed = approve(dir, notion.decision, { by: "Torian", answer: DISMISS });
  const z = load(join(dir, `decisions/${zoom.decision}.decision.json`));
  const withdrawn = await call({ venture: "drift", workspace: ws, route: `decisions/${zoom.decision}`, action: "write", input: { ...z, status: "withdrawn" }, actor: "person", provenance: { agent: { id: "Torian" } } }) as { ok: boolean; error?: string };
  expect("a person acts on one decision, dismisses one and withdraws one", acted.ok && dismissed.ok && withdrawn.ok, JSON.stringify([acted, dismissed, withdrawn]));
  const settled = await run(dir);
  const res = ledger(dir).filter((l) => l.kind === "resolution");
  const outcome = (trial: string) => res.find((l) => l.trial === trial);
  expect("the decision acted on resolves its trial as a hit, by the person who decided", outcome(slack.trial)?.outcome === "hit" && outcome(slack.trial)?.by?.id === "Torian" && outcome(slack.trial)?.by?.kind === "person", JSON.stringify(res));
  expect("the decision answered Dismiss resolves its trial as a false alarm, signal override", outcome(notion.trial)?.outcome === "false-alarm" && outcome(notion.trial)?.signal === "override", JSON.stringify(res));
  expect("the withdrawn decision resolves its trial as a false alarm, by the person who withdrew it", outcome(zoom.trial)?.outcome === "false-alarm" && outcome(zoom.trial)?.by?.id === "Torian", JSON.stringify(res));
  expect("the run reports three resolutions and calls nothing new (the dismissed drift stays filed)", settled.ok && settled.resolved.length === 3 && settled.called.length === 0, JSON.stringify(settled));
  expect("the ledger's chain still verifies", verify(ledger(dir) as never).ok, verify(ledger(dir) as never).errors.join("; "));
  const twice = await run(dir);
  expect("a run after that resolves nothing twice", twice.ok && twice.resolved.length === 0 && ledger(dir).length === 6, JSON.stringify(twice));
  const cli = node("packages/naive/src/router/orchestration/seams.ts", dir);
  expect("the seams command runs on the venture and exits 0", cli.status === 0 && /0 called, \d+ quiet, 3 already filed, 0 resolved/.test(cli.stdout), cli.stdout + cli.stderr);

  // A venture's own copy of the detector moves the line.
  const own = venture("own-line", [connection("slack", "connected")], []);
  const d = structuredClone(shipped);
  d.criterion.yes = { value: 2, set_by: "founder" };
  put(join(own, `governance/detectors/${DETECTOR}.json`), d);
  const ownRun = await run(own);
  expect("with a venture's yes line at 2, a subject scoring 1 is a no call: quiet", ownRun.ok && ownRun.called.length === 0 && ownRun.quiet === 1, JSON.stringify(ownRun));

  // A record that is not JSON is a problem, not a call.
  const broken = venture("broken", [], []);
  mkdirSync(join(broken, "finance/spend"), { recursive: true });
  writeFileSync(join(broken, "finance/spend/bad.json"), "{ not json");
  const b = node("packages/naive/src/checks/check-seams.ts", broken);
  expect("check-seams exits 1 on a spend line that is not JSON, naming it", b.status === 1 && /finance\/spend\/bad\.json: not JSON/.test(b.stdout), b.stdout + b.stderr);
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
