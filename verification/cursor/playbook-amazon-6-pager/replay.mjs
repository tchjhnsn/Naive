#!/usr/bin/env node
// Replay the amazon-6-pager playbook against the router on a fixture venture.
//   node verification/cursor/playbook-amazon-6-pager/replay.mjs
//
// The fixture is a temporary venture. Nothing here is a founder's decision.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approve, propose } from "../../../schema/decisions.mjs";
import { call, resolve } from "../../../interface/router.mjs";

const repo = join(import.meta.dirname, "../../..");
const playbook = readFileSync(join(repo, "packages/decisions/playbooks/amazon-6-pager.md"), "utf8");
const spec = readFileSync(join(import.meta.dirname, "AmazonSixPager.tla"), "utf8");

const patternRoutes = [
  "foundation/problem",
  "foundation/icp",
  "foundation/alignment",
  "governance/decision-rights",
  "decisions/[id]",
  "evidence/[id]",
  "governance/decisions",
];

const rows = [];
const note = (rule, result, detail) => {
  rows.push({ rule, result, detail });
  console.log(`${result.padEnd(4)} ${rule}: ${detail}`);
};
const die = (msg) => { throw new Error(msg); };

function section(noteText, label) {
  const m = (noteText ?? "").match(new RegExp(`^${label}:\\s*(.*)$`, "m"));
  return m ? m[1].trim() : "";
}

function evaluate(decision, ctx) {
  const text = decision?.note ?? "";
  const risk = (decision?.outcomes ?? []).find((o) => o.id === "main-risk" && o.projected && (o.evidence ?? []).includes(ctx.findingId));
  return {
    customer: section(text, "Customer") === ctx.profileId,
    problem: section(text, "Problem") === ctx.statement,
    solution: section(text, "Solution").length > 0,
    principle: section(text, "Principle") === ctx.principleId,
    faq: (decision?.options ?? []).length >= 2
      && (decision?.options ?? []).some((o) => o.startsWith("Not doing it: "))
      && !!risk
      && ctx.findingReadable,
    stillOpen: decision?.status === "open"
      && typeof decision?.answer === "string" && decision.answer.length > 0
      && !decision?.provenance?.approved_by
      && !decision?.decided_by
      && !decision?.decided_at,
    personDecided: !(decision?.status === "decided" && !decision?.provenance?.approved_by),
  };
}

const ws = mkdtempSync(join(tmpdir(), "six-pager-"));
const init = (id) => {
  const dir = join(ws, id);
  const r = spawnSync("node", [join(repo, "schema/init-venture.mjs"), dir, id, "--phase", "validation", "--legal-form", "llc"], { encoding: "utf8" });
  if (r.status !== 0) die(r.stderr || r.stdout);
  return dir;
};

const opts = (venture) => ({ venture, workspace: ws, via: "replay" });

async function readRoute(venture, route) {
  return call({ ...opts(venture), route, action: "read", actor: "person" });
}
async function writeRoute(venture, route, input, actor = "person") {
  return call({ ...opts(venture), route, action: "write", input, actor, provenance: { note: "amazon-6-pager replay" } });
}

try {
  for (const route of patternRoutes) {
    const hit = resolve(route);
    if (!hit.r) die(`router has no route ${route}`);
    if (!playbook.includes(route)) die(`playbook does not name ${route}`);
    if (!spec.includes(`"${route}"`)) die(`model does not name ${route}`);
  }
  note("RoutesReal", "PASS", `resolve() found ${patternRoutes.join(", ")}`);

  const venture = "memo";
  const dir = init(venture);
  const statement = "Fixture problem: the owner retypes the same order into three tools every morning.";
  const profileId = "shop-owners";
  const principleId = "no-unshown-promise";
  const findingId = "faq-finding";

  const problem = {
    venture,
    statement,
    segment: "Fixture segment: owners of one shop.",
    evidence: [],
  };
  const icp = {
    venture,
    profiles: [{ id: profileId, who: "Fixture profile: a person who owns one shop.", primary: true }],
  };
  const alignment = {
    venture,
    principles: [{ id: principleId, statement: "Do not promise a result the records do not show.", source: "fixture, 2026-10-29" }],
  };
  const rights = {
    register: "decision-rights",
    classes: [{ id: "strategy-or-constitution", owner: "founder", level: "escalate" }],
  };

  for (const [route, input] of [
    ["foundation/problem", problem],
    ["foundation/icp", icp],
    ["foundation/alignment", alignment],
    ["governance/decision-rights", rights],
  ]) {
    const w = await writeRoute(venture, route, input);
    if (!w.ok) die(`write ${route}: ${w.error}`);
    const back = await readRoute(venture, route);
    if (!back.ok || back.result == null) die(`read ${route} after write: ${JSON.stringify(back)}`);
  }
  note("NoReadBeforeProvided", "PASS", "the four inputs were written, then read, before any memo");

  const bare = "bare";
  init(bare);
  const missing = await readRoute(bare, "foundation/problem");
  if (!missing.not_found) die(`expected foundation/problem to be missing on ${bare}, got ${JSON.stringify(missing)}`);
  note("NoReadBeforeProvided", "PASS", `on a venture with no problem record, foundation/problem read is not_found (${missing.not_found.note}); the replay does not write a memo there`);

  const ctx = { profileId, statement, principleId, findingId, findingReadable: false };
  const gapInput = { id: "gap-memo", question: "Should we leave the sections empty?", status: "open" };
  const gapProposed = propose(dir, gapInput, { agentId: "replay", via: "replay" });
  if (!gapProposed.ok) die(`propose gap: ${gapProposed.error}`);
  const gap = await readRoute(venture, "decisions/gap-memo");
  if (gap.result?.status !== "open") die(`gap status ${gap.result?.status}`);
  const gapChecks = evaluate(gap.result, ctx);
  const gapFails = ["customer", "problem", "solution", "principle", "faq", "stillOpen"].filter((k) => gapChecks[k]);
  if (gapFails.length) die(`gap memo should fail those checks, passed: ${gapFails.join(", ")}`);
  if (!gapChecks.personDecided) die("an open gap memo must not look self-decided");
  note("ChecksCanPassAndFail", "PASS", "decisions/gap-memo is an open draft and fails customer, problem, solution, principle, faq, and still-open");

  const dotted = await writeRoute(venture, "decisions/bad.id", { id: "bad-id", question: "Bad?", status: "open" });
  if (dotted.ok) die("decisions/bad.id should be rejected");
  note("RoutesReal", "PASS", `decisions/[id] rejects an id with a dot: ${dotted.error.split("\n")[0]}`);

  const refused = propose(dir, { id: "refuse-decided", question: "Can the memo decide itself?", status: "decided", answer: "Yes" }, { agentId: "replay", via: "replay" });
  if (refused.ok) die("propose() accepted status decided");
  const refusedRead = await readRoute(venture, "decisions/refuse-decided");
  if (!refusedRead.not_found) die("propose() of status decided wrote a record");
  note("MemoNeverDecides", "PASS", `mentura propose / propose() refused status decided and wrote nothing: ${refused.error}`);

  const narrative = [
    `Customer: ${profileId}`,
    `Problem: ${statement}`,
    "Solution: One list, filled once, that the owner does not retype.",
    "Difference: Today the order is typed again in each tool. This keeps a single list.",
    `Principle: ${principleId}`,
  ].join("\n");
  const drafted = propose(dir, {
    id: "full-memo",
    question: "Should we keep one list instead of retyping the order?",
    status: "open",
    needed_in: "validation",
    note: narrative,
  }, { agentId: "replay", via: "replay" });
  if (!drafted.ok) die(`propose draft: ${drafted.error}`);
  const mid = await readRoute(venture, "decisions/full-memo");
  if (mid.result?.status !== "open" || mid.result?.answer) die("draft should be open with no answer");
  const midChecks = evaluate(mid.result, ctx);
  if (!(midChecks.customer && midChecks.problem && midChecks.solution && midChecks.principle)) die(`narrative checks: ${JSON.stringify(midChecks)}`);
  if (midChecks.faq || midChecks.stillOpen) die("draft must still fail faq and still-open, before the FAQ and the answer");

  const finding = {
    id: findingId,
    subject: { kind: "venture", id: venture },
    ran_at: "2026-10-29T22:00:00Z",
    runner: "replay",
    results: [{ criterion: "internal-faq", kind: "review", passed: true, output: "Fixture finding: a second list would add a tool the owner already avoids." }],
    passed: true,
  };
  const findingWrite = await writeRoute(venture, `evidence/${findingId}`, finding);
  if (!findingWrite.ok) die(`write evidence: ${findingWrite.error}`);
  const findingRead = await readRoute(venture, `evidence/${findingId}`);
  if (findingRead.result?.id !== findingId) die(`evidence read: ${JSON.stringify(findingRead)}`);
  ctx.findingReadable = true;
  note("NoReadBeforeProvided", "PASS", "evidence/faq-finding was written, then read, before the FAQ cited it");

  const proposed = propose(dir, {
    id: "full-memo",
    question: "Should we keep one list instead of retyping the order?",
    status: "open",
    needed_in: "validation",
    note: `${narrative}\nExternal FAQ: Where does the list live? In the one place the owner already opens.\nInternal FAQ: The risk is a second list. See ${findingId}.`,
    options: [
      "Not doing it: the owner keeps retyping the order each morning.",
      "Keep one list and stop retyping the order.",
    ],
    answer: "Keep one list, and do not add a second tool.",
    outcomes: [{ id: "main-risk", projected: "A second list adds a tool and the retyping remains.", evidence: [findingId] }],
  }, { agentId: "replay", via: "replay" });
  if (!proposed.ok) die(`propose full: ${proposed.error}`);
  const full = await readRoute(venture, "decisions/full-memo");
  if (full.result?.status !== "open") die(`proposed status ${full.result?.status}`);
  if (full.result?.provenance?.approved_by || full.result?.decided_by) die("propose set an approver");
  if (full.result?.provenance?.drafted_by?.kind !== "agent") die(`propose drafted_by ${JSON.stringify(full.result?.provenance)}`);
  const fullChecks = evaluate(full.result, ctx);
  const fullMiss = Object.entries(fullChecks).filter(([, v]) => !v).map(([k]) => k);
  if (fullMiss.length) die(`full memo failed ${fullMiss.join(", ")}: ${JSON.stringify(fullChecks)}`);
  note("ChecksCanPassAndFail", "PASS", "decisions/full-memo after propose passes customer, problem, solution, principle, faq, still-open, and person-decided");
  note("MemoNeverDecides", "PASS", "after propose, status is open, drafted_by.kind is agent, and approved_by is absent");

  const matrix = await call({ ...opts(venture), route: "governance/decisions", action: "run", actor: "person" });
  if (!matrix.ok) die(`governance/decisions: ${matrix.error}`);
  const listed = matrix.result?.decisions ?? matrix.result;
  const rowsOf = Array.isArray(listed) ? listed : listed?.decisions;
  if (!Array.isArray(rowsOf)) die(`matrix shape ${JSON.stringify(matrix.result).slice(0, 400)}`);
  const seenGap = rowsOf.find((d) => d.id === "gap-memo");
  const seenFull = rowsOf.find((d) => d.id === "full-memo");
  if (seenGap?.status !== "open" || seenFull?.status !== "open") die(`matrix statuses gap=${seenGap?.status} full=${seenFull?.status}`);
  note("RoutesReal", "PASS", `governance/decisions run lists gap-memo and full-memo, both status open, phase ${matrix.result.phase}`);

  const decided = approve(dir, "full-memo", { by: "Avery Founder", via: "replay" });
  if (!decided.ok) die(`approve: ${decided.error}`);
  const after = await readRoute(venture, "decisions/full-memo");
  if (after.result?.status !== "decided" || after.result?.provenance?.approved_by !== "Avery Founder") {
    die(`approve readback ${JSON.stringify(after.result?.status)} ${after.result?.provenance?.approved_by}`);
  }
  const afterChecks = evaluate(after.result, ctx);
  if (!afterChecks.personDecided) die("approved record failed person-decided");
  if (afterChecks.stillOpen) die("a decided record must not still pass the propose-time still-open check");
  const again = approve(dir, "full-memo", { by: "Avery Founder", via: "replay" });
  if (again.ok) die("approve() allowed a second decide");
  note("MemoNeverDecides", "PASS", `mentura decide / approve() set status decided and approved_by Avery Founder; a second approve was refused: ${again.error}`);

  const raw = await writeRoute(venture, "decisions/raw-decided", {
    id: "raw-decided",
    question: "Can a raw write mark this decided?",
    status: "decided",
    answer: "The memo says so.",
  }, "agent");
  if (!raw.ok) {
    note("MemoNeverDecides", "PASS", `a raw agent write of status decided was refused: ${raw.error.split("\n")[0]}`);
  } else {
    const rawRead = await readRoute(venture, "decisions/raw-decided");
    const rawChecks = evaluate(rawRead.result, ctx);
    if (rawRead.result?.status !== "decided" || rawChecks.personDecided || rawChecks.stillOpen) {
      die(`raw write did not reproduce a self-decided memo: ${JSON.stringify({ status: rawRead.result?.status, rawChecks, draft: raw.result?.draft })}`);
    }
    note("MemoNeverDecides", "PASS", "playbook steps do not do this; a raw agent write of decisions/raw-decided stored status decided with no approved_by, and the check fails on that record");
    note("ChecksCanPassAndFail", "PASS", "still-open and person-decided fail on decisions/raw-decided");
  }

  console.log("\nreplay ok");
} catch (error) {
  console.error(error.message ?? error);
  process.exitCode = 1;
} finally {
  rmSync(ws, { recursive: true, force: true });
}

const failed = rows.filter((r) => r.result !== "PASS");
if (failed.length) {
  console.error(failed);
  process.exit(1);
}
