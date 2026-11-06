#!/usr/bin/env node
// Replays the jobs playbook against the router on a fixture venture.
//
//   node packages/naive/test/verification/playbook-jtbd/replay.mjs
//
// Exit 0 when every replay matches the playbook. Exit 1 when one does not.
// The fixture is synthetic. It is not a claim about a real customer.

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { call, resolve } from "../../../src/router/router.mjs";

const repo = fileURLToPath(new URL("../../../../..", import.meta.url));
const root = mkdtempSync(join(tmpdir(), "jtbd-replay-"));
const rows = [];

function report(rule, pass, replay) {
  rows.push({ rule, pass, replay });
  console.log(`${pass ? "PASS" : "FAIL"}  ${rule}`);
  console.log(`       ${replay}`);
}

function venture(name) {
  const id = `jtbd-${name}`;
  const dir = join(root, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({
    id, name: `JTBD fixture ${name}`, parent: null, phase: "discovery", owner: "self", status: "active",
    layers: { purpose: true, knowledge: false, operations: false, evidence: false },
  }, null, 2) + "\n");
  return { id, dir, workspace: root };
}

function problem() {
  return {
    venture: "placeholder",
    statement: "Fixture: the books are still open at the end of the week.",
    segment: "Fixture segment",
    workarounds: ["A spreadsheet kept by hand"],
    forms: [{ id: "late-close", statement: "Fixture form: the books close late." }],
    evidence: [{
      id: "fixture-note",
      kind: "stated",
      summary: "Fixture evidence for the replay. Not a study.",
      source: { title: "Fixture" },
      audience: "unknown",
      collected: "2026-10-29",
    }],
  };
}

const PROFILE = "foundation/icp/shop-owners";

function profile(jobs = [], over = {}) {
  return {
    venture: "placeholder",
    id: "shop-owners",
    who: "Owners of small shops",
    short: "Shop owners",
    primary: true,
    traits: ["Keeps the books themselves"],
    jobs,
    problem_forms: ["late-close"],
    ...over,
  };
}

function put(v, route, record, actor = "person") {
  const input = record.venture === "placeholder" ? { ...record, venture: v.id } : record;
  return call({ venture: v.id, workspace: v.workspace, route, action: "write", input, actor, via: "replay" });
}

async function read(v, route) {
  return call({ venture: v.id, workspace: v.workspace, route, action: "read", via: "replay" });
}

function accept(v, route) {
  return spawnSync("node", [
    join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), "accept", route,
    "--venture", v.id, "--workspace", v.workspace, "--confirm", route,
  ], { encoding: "utf8" });
}

// The playbook's checks 1 and 2, on a list of profile records and the product job strings already read.
function jobsCheck(profiles, productJobs) {
  const failures = [];
  for (const p of profiles) {
    const jobs = p.jobs;
    if (!Array.isArray(jobs) || jobs.length === 0 || jobs.some((j) => typeof j !== "string" || j.trim() === "")) {
      failures.push(`${p.id}: no job`);
      continue;
    }
    const banned = new Set([p.who, p.short, ...(p.traits ?? []), ...productJobs].filter((s) => typeof s === "string"));
    for (const j of jobs) if (banned.has(j)) failures.push(`${p.id}: job copies a banned string`);
  }
  if (!profiles.length) failures.push("no profiles");
  return failures;
}

function foundation(dir) {
  return spawnSync("node", [join(repo, "packages/naive/src/engine/foundation.mjs"), dir], { encoding: "utf8" });
}

function icpStatus(report) {
  const who = (report ?? []).find((q) => q.question === "who");
  return who?.statements?.find((s) => s.id === "icp")?.status ?? null;
}

const named = [
  ["foundation/problem", "read"],
  ["foundation/icp", "read"],
  [PROFILE, "write"],
  ["product", "read"],
  ["product/ledger", "read"],
  ["purpose/foundation", "run"],
];

let routesOk = true;
const routeNotes = [];
for (const [route, action] of named) {
  const hit = resolve(route);
  const ok = !!hit.r && hit.r.actions.includes(action);
  routesOk &&= ok;
  routeNotes.push(`${route} ${action} -> ${hit.r ? `${hit.r.route} [${hit.r.actions.join(", ")}]` : "no route"}`);
}
const list = resolve("foundation/icp");
const listRefusesWrite = !!list.r && !list.r.actions.includes("write");
routesOk &&= listRefusesWrite;
routeNotes.push(`foundation/icp offers write=${!listRefusesWrite}`);
report("EveryRouteReal", routesOk, routeNotes.join("; "));

// ReadsAreProvided: a product card that is not in the venture, then one that is.
{
  const v = venture("reads");
  await put(v, "foundation/problem", problem());
  await put(v, PROFILE, profile([]));
  const list = await read(v, "product");
  const card = await read(v, "product/ledger");
  const usedField = card.result != null && "job" in (card.result ?? {});
  const absentOk = list.ok && list.result == null && list.not_found && card.ok && card.result == null && card.not_found && !usedField;
  const problemRead = await read(v, "foundation/problem");
  const icpRead = await read(v, "foundation/icp");
  const providedOk = problemRead.ok && problemRead.result?.statement && icpRead.ok && Object.keys(icpRead.result ?? {}).join() === "shop-owners";
  const wrote = await put(v, "product/ledger", { id: "ledger", name: "Ledger", description: "Fixture card", job: "Close the books" });
  const present = await read(v, "product/ledger");
  const presentOk = wrote.ok && wrote.result?.draft === false && present.result?.job === "Close the books";
  report(
    "ReadsAreProvided",
    absentOk && providedOk && presentOk,
    `product list not_found=${!!list.not_found}; product/ledger not_found=${!!card.not_found}; used job field while absent=${usedField}; problem and icp provided=${providedOk}; write ok=${wrote.ok} draft=${wrote.result?.draft}; card job after the venture has one=${present.result?.job ?? wrote.error ?? "missing"}`,
  );
}

// Check 1 and 2 pass and fail. Check 3 passes and fails. The jobs check is decisive.
{
  const v = venture("checks");
  await put(v, "foundation/problem", problem());
  await put(v, PROFILE, profile([]));
  await put(v, "product/ledger", { id: "ledger", name: "Ledger", description: "Fixture card", job: "Close the books" });
  const live = Object.values((await read(v, "foundation/icp")).result ?? {});
  const emptyFail = jobsCheck(live, ["Close the books"]);
  const blankFail = jobsCheck([profile([""])], []);
  const copyWho = jobsCheck([profile(["Owners of small shops"])], []);
  const copyTrait = jobsCheck([profile(["Keeps the books themselves"])], []);
  const copyProduct = jobsCheck([profile(["Close the books"])], ["Close the books"]);
  const progress = "When the books are still open at the end of the week, get them closed before Monday.";
  const pass = jobsCheck([profile([progress])], ["Close the books"]);
  const bad = profile([progress], { venture: v.id, problem_forms: ["not-a-form"] });
  await put(v, PROFILE, bad, "agent");
  const formsPass = foundation(v.dir);
  writeFileSync(join(v.dir, `${PROFILE}.json`), JSON.stringify(bad, null, 2) + "\n");
  const formsFail = foundation(v.dir);
  const decisive = emptyFail.length > 0 && blankFail.length > 0 && copyWho.length > 0 && copyTrait.length > 0 && copyProduct.length > 0 && pass.length === 0
    && formsPass.status === 0 && formsFail.status !== 0 && /not-a-form/.test(formsFail.stderr + formsFail.stdout);
  report(
    "CheckMatchesJobs",
    decisive,
    `empty=${emptyFail.join(",") || "pass"}; blank=${blankFail.join(",") || "pass"}; copy-who=${copyWho.join(",") || "pass"}; copy-trait=${copyTrait.join(",") || "pass"}; copy-product=${copyProduct.join(",") || "pass"}; progress=${pass.join(",") || "pass"}; foundation.mjs with a bad form only in a draft exit=${formsPass.status}; bad form live exit=${formsFail.status}`,
  );
}

// An agent write is a draft. Accepting a failed check would make the copy live, so the playbook does not.
// Accepting a progress sentence makes it the live record and purpose/foundation says confirmed.
{
  const v = venture("draft");
  await put(v, "foundation/problem", problem());
  await put(v, PROFILE, profile([]));
  const second = "foundation/icp/bookkeepers";
  await put(v, second, profile([], { id: "bookkeepers", who: "Bookkeepers for small shops", short: "Bookkeepers", primary: false }));
  const progress = "When the books are still open at the end of the week, get them closed before Monday.";
  const refused = await put(v, "foundation/icp", { profiles: [profile([progress])] }, "agent");
  const draftWrite = await put(v, PROFILE, profile([progress]), "agent");
  const secondDraft = await put(v, second, profile([progress], { id: "bookkeepers", who: "Bookkeepers for small shops", short: "Bookkeepers", primary: false }), "agent");
  const after = await read(v, PROFILE);
  const draftPath = after.pending_draft?.file;
  const draftBody = draftPath ? JSON.parse(readFileSync(join(v.dir, draftPath), "utf8")) : null;
  const liveStillEmpty = Array.isArray(after.result?.jobs) && after.result.jobs.length === 0;
  const draftHasJob = draftBody ? jobsCheck([draftBody], []).length === 0 : false;
  const before = await call({ venture: v.id, workspace: v.workspace, route: "purpose/foundation", action: "run", via: "replay" });
  const statusBefore = icpStatus(before.result);
  const accepted1 = accept(v, PROFILE);
  const midRun = await call({ venture: v.id, workspace: v.workspace, route: "purpose/foundation", action: "run", via: "replay" });
  const statusMid = icpStatus(midRun.result);
  const accepted2 = accept(v, second);
  const accepted = await read(v, PROFILE);
  const afterRun = await call({ venture: v.id, workspace: v.workspace, route: "purpose/foundation", action: "run", via: "replay" });
  const statusAfter = icpStatus(afterRun.result);
  const liveJob = accepted.result?.jobs?.[0];
  const ok = refused.ok === false && draftWrite.ok && draftWrite.result?.draft === true && secondDraft.result?.draft === true && liveStillEmpty && draftHasJob
    && statusBefore === "draft" && accepted1.status === 0 && statusMid === "draft" && accepted2.status === 0 && !accepted.pending_draft
    && liveJob === progress && statusAfter === "confirmed";
  report(
    "NotLiveUntilYouAccept",
    ok,
    `list write refused=${refused.ok === false}; agent draft=${draftWrite.result?.draft}; live jobs before accept=${JSON.stringify(after.result?.jobs)}; purpose/foundation before=${statusBefore}; after one of two accepts=${statusMid}; accept exits=${accepted1.status},${accepted2.status}; pending_draft after=${!!accepted.pending_draft}; purpose/foundation after=${statusAfter}; ${accepted2.stderr?.trim() || ""}`,
  );

  const v2 = venture("accept-fail");
  await put(v2, "foundation/problem", problem());
  await put(v2, PROFILE, profile([]));
  const copied = await put(v2, PROFILE, profile(["Owners of small shops"]), "agent");
  const copiedRead = await read(v2, PROFILE);
  const copiedDraft = JSON.parse(readFileSync(join(v2.dir, copiedRead.pending_draft.file), "utf8"));
  const copyFails = jobsCheck([copiedDraft], []).length > 0;
  const acceptCopy = accept(v2, PROFILE);
  const liveCopy = await read(v2, PROFILE);
  const liveFails = jobsCheck([liveCopy.result], []).length > 0;
  report(
    "AcceptFail (probe, not a playbook step)",
    copied.ok && copyFails && acceptCopy.status === 0 && liveFails,
    `the router will accept a draft the jobs check failed; live jobs=${JSON.stringify(liveCopy.result?.jobs)}; check failures=${liveFails}. The playbook does not take this step.`,
  );
}

console.log("\n| Rule | Result | Replay |");
console.log("| --- | --- | --- |");
for (const r of rows) console.log(`| ${r.rule} | ${r.pass ? "PASS" : "FAIL"} | ${r.replay.replace(/\|/g, "/")} |`);

rmSync(root, { recursive: true, force: true });
process.exit(rows.every((r) => r.pass) ? 0 : 1);
