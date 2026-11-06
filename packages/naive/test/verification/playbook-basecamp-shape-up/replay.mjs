#!/usr/bin/env node
// Replays the Shape Up cycle playbook against the router and the checkers.
//   node packages/naive/test/verification/playbook-basecamp-shape-up/replay.mjs
//
// A temp venture is created under the system temp dir and removed at the end.
// Prints one line per rule: PASS or FAIL, and the observation.

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { call, resolve } from "../../../src/router/router.mjs";
import { approve } from "../../../src/engine/decisions.mjs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const root = mkdtempSync(join(tmpdir(), "shapeup-replay-"));
const venture = "shapeup-replay";
const dir = join(root, venture);
const rows = [];
const note = (rule, ok, detail) => {
  rows.push({ rule, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${rule}: ${detail}`);
};

const cli = (args) => spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), ...args, "--workspace", root], { encoding: "utf8" });
const writeRoute = async (route, record, actor) => call({
  venture, route, action: "write", input: record, actor, workspace: root, via: "replay",
  provenance: { note: "shape-up replay" },
});
const readRoute = (route) => call({ venture, route, action: "read", actor: "person", workspace: root, via: "replay" });

function brief(appetite) {
  return `# Cycle

## Outcome

Customers can finish the job the product card names, inside this cycle.

## Work

Build the elements in the solution section. Cut anything the no-gos exclude.

## Problem

A person in the ICP hits a wall in the current product and has a workaround that wastes the afternoon.

## Appetite

${appetite}

## Solution

One path through the product that removes that workaround. Details of layout stay with the builder.

## Rabbit holes

Custom domains and a second user role are out of this cycle.

## No-gos

No redesign of the rest of the product. No new market.
`;
}

function handoff(extra = {}) {
  return {
    id: "cycle-one",
    title: "Six-week cycle",
    venture,
    products: ["offering"],
    governed_by: ["EE-017"],
    role: "builder",
    brief: "cycle-one.md",
    decision_classes: ["implementation-detail", "accept-verified-work"],
    done_criteria: [
      { id: "pitch-sections", kind: "conformance", check: "node packages/naive/test/verification/playbook-basecamp-shape-up/pitch-check.mjs BRIEF" },
      { id: "shipped", kind: "self-proof", check: "node -e \"console.error('replace this command with one that runs the cycle work'); process.exit(1)\"" },
      { id: "scope-fit", kind: "review", reviewer: "architect", check: "Does what shipped stay inside the no-gos?" },
    ],
    status: "draft",
    attempts: 0,
    max_attempts: 3,
    run_cap: "2h",
    ...extra,
  };
}

const bet = {
  id: "bet-cycle-one",
  question: "Do we bet one six-week cycle on this pitch?",
  status: "open",
  options: ["bet", "decline"],
  answer: null,
  decides: { record: "handoff", path: "operations/handoffs/cycle-one.json" },
  boundary: "fail-closed",
  needed_in: "validation",
  layer: "operations",
  provenance: { drafted_by: { kind: "agent", id: "replay" } },
};

const init = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.mjs"), dir, venture, "--phase", "validation"], { encoding: "utf8" });
if (init.status !== 0) {
  console.error(init.stdout, init.stderr);
  process.exit(1);
}

const routes = [
  "product/offering",
  "foundation/icp",
  "governance/decision-rights",
  "operations/handoff/cycle-one",
  "decisions/bet-cycle-one",
  "evidence/cycle-one-shipped",
  "system/provenance",
];
const resolved = routes.map((route) => ({ route, hit: resolve(route).r?.route ?? null }));
note("RouteIsReal", resolved.every((r) => r.hit), resolved.map((r) => `${r.route} -> ${r.hit ?? "none"}`).join("; "));

const missing = await readRoute("shapeup/cycle");
note("RouteIsReal-unknown", missing.ok === false && /no route shapeup\/cycle/.test(missing.error ?? ""), missing.error ?? JSON.stringify(missing));

const product = await writeRoute("product/offering", {
  id: "offering", name: "Offering", description: "A product the cycle is about.",
}, "person");
note("ReadProduct-write", product.ok === true && product.result?.draft === false, product.ok ? product.result.written : product.error);

const noIcp = await readRoute("foundation/icp");
note("IcpStop-empty-read", noIcp.ok === true && noIcp.result === null && noIcp.not_found != null, noIcp.not_found?.note ?? noIcp.error ?? "unexpected record");

const icp = await writeRoute("foundation/icp/operators", {
  venture, id: "operators", who: "People who run the work this product is for.", primary: true,
}, "person");
note("ReadIcp-write", icp.ok === true, icp.ok ? `${icp.result.written} draft=${icp.result.draft}` : icp.error);

const offer = await readRoute("product/offering");
const who = await readRoute("foundation/icp");
note("ReadsWereProvided-present", offer.ok && offer.result?.id === "offering" && who.ok && who.result?.operators?.primary === true,
  `product=${offer.result?.id ?? offer.not_found?.note ?? offer.error}; icp=${who.result?.operators?.id ?? who.not_found?.note ?? who.error}`);

const early = await readRoute("operations/handoff/cycle-one");
note("ReadsWereProvided-early-pitch", early.ok === true && early.result === null && early.not_found != null,
  early.not_found?.note ?? early.error ?? "unexpected record");

const rights = await readRoute("governance/decision-rights");
note("ReadRights", rights.ok === true, rights.result ? "record present" : (rights.not_found?.note ?? rights.error));

mkdirSync(join(dir, "operations/handoffs"), { recursive: true });
const fullBrief = join(dir, "operations/handoffs/cycle-one.md");
writeFileSync(fullBrief, brief("Six weeks for one designer and one or two programmers."));
const thinBrief = join(dir, "operations/handoffs/cycle-one-thin.md");
writeFileSync(thinBrief, brief("Six weeks for one designer and one or two programmers.").replace(/## No-gos\n\nNo redesign of the rest of the product\. No new market\.\n/, "## No-gos\n\n"));
const shortBrief = join(dir, "operations/handoffs/cycle-one-short.md");
writeFileSync(shortBrief, brief("One week, if it stays small."));

const checkBrief = (file) => spawnSync("node", [join(repo, "packages/naive/test/verification/playbook-basecamp-shape-up/pitch-check.mjs"), file], { encoding: "utf8" });
const passBrief = checkBrief(fullBrief);
const failBlank = checkBrief(thinBrief);
const failShort = checkBrief(shortBrief);
note("PitchCheckHonest", passBrief.status === 0 && failBlank.status === 1 && failShort.status === 1,
  `full=${passBrief.status} (${passBrief.stdout.trim() || passBrief.stderr.trim()}); blank=${failBlank.status} (${failBlank.stderr.trim()}); short=${failShort.status} (${failShort.stderr.trim()})`);

const cycle = await writeRoute("operations/handoff/cycle-one", handoff(), "person");
note("WritePitch", cycle.ok === true && cycle.result?.draft === false, cycle.ok ? cycle.result.written : cycle.error);

const proposed = await writeRoute("decisions/bet-cycle-one", bet, "agent");
note("ProposeBet", proposed.ok === true && proposed.result?.draft === false, proposed.ok ? proposed.result.written : proposed.error);

const held = await writeRoute("operations/handoff/cycle-one", handoff({ title: "Six-week cycle, edited while the bet is open" }), "agent");
note("NoBuildBeforeBet", held.ok === true && held.result?.draft === true, held.ok ? `${held.result.written} draft=${held.result.draft} ${held.result.note ?? ""}` : held.error);

const forged = await writeRoute("decisions/bet-cycle-one", { ...bet, status: "decided", provenance: { drafted_by: { kind: "agent", id: "replay" }, approved_by: "replay-agent" } }, "agent");
const stillOpen = await readRoute("decisions/bet-cycle-one");
note("AgentCannotDecide", forged.ok === true && forged.result?.draft === true && stillOpen.result?.status === "open",
  forged.ok ? `${forged.result.written} draft=${forged.result.draft}; record status=${stillOpen.result?.status}` : forged.error);

const approved = approve(dir, "bet-cycle-one", { by: "Founder Replay", answer: "bet", via: "replay" });
note("YouBet", approved.ok === true && approved.result?.wording != null, approved.ok ? JSON.stringify(approved.result) : approved.error);

const betCheck = async (cycleId, betId) => {
  const cycle = (await readRoute(`operations/handoff/${cycleId}`)).result;
  if (cycle?.status === "draft") return true;
  const decision = (await readRoute(`decisions/${betId}`)).result;
  const log = (await readRoute("system/provenance")).result ?? [];
  const accepted = log.some((e) => e.entity === `decisions/${betId}.decision.json` && e.activity === "accept" && e.agent?.kind === "person");
  return decision?.status === "decided" && decision.answer === "bet" && decision.provenance?.approved_by != null && accepted;
};

const opened = await writeRoute("operations/handoff/cycle-one", handoff(), "agent");
note("OpenCycle", opened.ok === true && opened.result?.draft === false, opened.ok ? `${opened.result.written} draft=${opened.result.draft}` : opened.error);

const declinedPitch = { ...handoff(), id: "cycle-two" };
await writeRoute("operations/handoff/cycle-two", declinedPitch, "person");
await writeRoute("decisions/bet-cycle-two", { ...bet, id: "bet-cycle-two", decides: { record: "handoff", path: "operations/handoffs/cycle-two.json" } }, "agent");
const declined = approve(dir, "bet-cycle-two", { by: "Founder Replay", answer: "decline", via: "replay" });
const declinedDraft = await betCheck("cycle-two", "bet-cycle-two");
const moved = await writeRoute("operations/handoff/cycle-two", { ...declinedPitch, status: "ready" }, "agent");
const declinedMoved = await betCheck("cycle-two", "bet-cycle-two");
await writeRoute("operations/handoff/cycle-one", handoff({ status: "ready" }), "person");
const betMoved = await betCheck("cycle-one", "bet-cycle-one");
await writeRoute("operations/handoff/cycle-one", handoff(), "person");
note("YouDecline", declined.ok === true && moved.result?.draft === false && declinedDraft === true && declinedMoved === false && betMoved === true,
  `declined at draft passes=${declinedDraft}; declined and moved to ready passes=${declinedMoved}; answered bet and ready passes=${betMoved}`);
await writeRoute("operations/handoff/cycle-two", declinedPitch, "person");

const ready = spawnSync("node", [join(repo, "packages/naive/src/checks/check-ready.mjs"), dir, "cycle-one"], { encoding: "utf8" });
note("CheckReady-pass", ready.status === 0, (ready.stdout + ready.stderr).trim().split("\n").slice(-3).join(" | "));

writeFileSync(fullBrief, brief("Six weeks for one designer and one or two programmers.").replace("## Outcome\n\nCustomers can finish the job the product card names, inside this cycle.\n\n", "## Outcome\n\n"));
const readyFail = spawnSync("node", [join(repo, "packages/naive/src/checks/check-ready.mjs"), dir, "cycle-one"], { encoding: "utf8" });
writeFileSync(fullBrief, brief("Six weeks for one designer and one or two programmers."));
note("CheckReady-fail", readyFail.status === 1 && /Outcome/.test(readyFail.stdout + readyFail.stderr),
  (readyFail.stdout + readyFail.stderr).trim().split("\n").filter((l) => l.startsWith("FAIL") || l.includes("not ready")).join(" | "));

const execDraft = spawnSync("node", [join(repo, "packages/naive/src/checks/check-execution.mjs"), dir], { encoding: "utf8" });
note("CheckExecution-draft-pass", execDraft.status === 0, (execDraft.stdout + execDraft.stderr).trim().split("\n").pop());

const doneBare = await writeRoute("operations/handoff/cycle-one", handoff({ status: "done", claimed_by: "replay", pr: "https://example.com/pull/1" }), "person");
const execDone = spawnSync("node", [join(repo, "packages/naive/src/checks/check-execution.mjs"), dir], { encoding: "utf8" });
note("NoShipWithoutEvidence", doneBare.ok === true && execDone.status === 1 && /no passing evidence|done without/.test(execDone.stdout + execDone.stderr),
  (execDone.stdout + execDone.stderr).trim().split("\n").slice(0, 4).join(" | "));

const evidence = await writeRoute("evidence/cycle-one-shipped", {
  id: "cycle-one-shipped",
  subject: { kind: "handoff", id: "cycle-one", version: "replay" },
  ran_at: "2026-10-29T22:40:00Z",
  runner: "replay",
  results: [
    { criterion: "pitch-sections", kind: "conformance", passed: true },
    { criterion: "shipped", kind: "self-proof", passed: true },
    { criterion: "scope-fit", kind: "review", passed: true, by: "architect" },
  ],
  passed: true,
}, "person");
const shipped = await writeRoute("operations/handoff/cycle-one", handoff({
  status: "done", claimed_by: "replay", pr: "https://example.com/pull/1",
  evidence: ["../../evidence/results/cycle-one-shipped.json"],
}), "person");
const execShip = spawnSync("node", [join(repo, "packages/naive/src/checks/check-execution.mjs"), dir], { encoding: "utf8" });
note("Ship", evidence.ok === true && shipped.ok === true && execShip.status === 0,
  `evidence=${evidence.ok ? evidence.result.written : evidence.error}; execution=${(execShip.stdout + execShip.stderr).trim().split("\n").pop()}`);

const tripped = await writeRoute("operations/handoff/cycle-one", handoff({
  status: "escalated",
  claimed_by: "replay",
  escalations: [{ class: "attempts", question: "The six-week appetite is spent. Shape a new pitch before any more time is bet.", to: "founder" }],
}), "person");
const execTrip = spawnSync("node", [join(repo, "packages/naive/src/checks/check-execution.mjs"), dir], { encoding: "utf8" });
note("BreakerHolds", tripped.ok === true && execTrip.status === 0, (execTrip.stdout + execTrip.stderr).trim().split("\n").pop());

const silent = await writeRoute("operations/handoff/cycle-one", handoff({ status: "escalated", claimed_by: "replay", escalations: [] }), "person");
const execSilent = spawnSync("node", [join(repo, "packages/naive/src/checks/check-execution.mjs"), dir], { encoding: "utf8" });
note("Breaker-needs-a-question", silent.ok === true && execSilent.status === 1 && /no open question/.test(execSilent.stdout + execSilent.stderr),
  (execSilent.stdout + execSilent.stderr).trim().split("\n")[0]);

await writeRoute("operations/handoff/cycle-one", handoff({ status: "draft" }), "person");
writeFileSync(join(dir, "operations/handoffs/cooldown-one.md"), brief("Two weeks with no scheduled pitch. Six weeks is the next cycle, not this one.").replace("Six weeks for one designer and one or two programmers.", "Two weeks with nothing scheduled. People fix bugs or shape the next pitch."));
const earlyCool = await writeRoute("operations/handoff/cooldown-one", {
  ...handoff(),
  id: "cooldown-one",
  title: "Cool-down",
  brief: "cooldown-one.md",
  done_criteria: [
    { id: "bugs", kind: "conformance", check: "node -e \"process.exit(0)\"" },
    { id: "explored", kind: "self-proof", check: "node -e \"process.exit(0)\"" },
  ],
}, "person");
const cycleNow = await readRoute("operations/handoff/cycle-one");
const coolNow = await readRoute("operations/handoff/cooldown-one");
const earlyBad = coolNow.result && !["done", "escalated"].includes(cycleNow.result?.status);
note("CooldownAfterCycle-early-fails", earlyCool.ok === true && earlyBad === true,
  `cycle status=${cycleNow.result?.status}; cooldown written=${coolNow.result?.id}`);

await writeRoute("operations/handoff/cycle-one", handoff({
  status: "escalated",
  claimed_by: "replay",
  escalations: [{ class: "attempts", question: "The six-week appetite is spent. Shape a new pitch before any more time is bet.", to: "founder" }],
}), "person");
const cycleLate = await readRoute("operations/handoff/cycle-one");
const coolLate = await readRoute("operations/handoff/cooldown-one");
note("CooldownAfterCycle", cycleLate.result?.status === "escalated" && coolLate.result?.id === "cooldown-one",
  `cycle=${cycleLate.result?.status}; cooldown=${coolLate.result?.id}`);

const prov = await readRoute("system/provenance");
const text = JSON.stringify(prov.result ?? "");
note("YouBet-provenance", prov.ok === true && /bet-cycle-one/.test(text), prov.ok ? "provenance log readable and mentions the bet" : (prov.error ?? "empty"));

const routeCheck = await call({ venture, route: "operations/handoff/cycle-one", action: "check", actor: "person", workspace: root, via: "replay" });
const readyLine = (routeCheck.result ?? []).find((r) => String(r.check).includes("check-ready"));
note("RouteCheck-needs-id", routeCheck.ok === false && readyLine != null && /usage:/.test(readyLine.output ?? ""),
  readyLine ? readyLine.output.split("\n")[0] : (routeCheck.error ?? "no check-ready line"));

rmSync(root, { recursive: true, force: true });
const failed = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - failed.length}/${rows.length} replay checks passed`);
if (failed.length) process.exit(1);
