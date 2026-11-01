#!/usr/bin/env node
// Replay the lean-validation playbook against the router on fixture ventures.
//   node verification/playbook-lean-validation/replay.mjs
// Prints one PASS or FAIL per rule. Exits 1 if any FAIL.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("../../", import.meta.url).pathname;
const today = new Date().toISOString().slice(0, 10);
const rows = [];
const scratch = mkdtempSync(join(tmpdir(), "lean-inputs-"));
const inputFile = (name, record) => {
  const file = join(scratch, `${name}.json`);
  writeFileSync(file, JSON.stringify(record));
  return file;
};
const ok = (rule, pass, detail) => { rows.push({ rule, pass, detail }); if (!pass) console.error(`FAIL ${rule}: ${detail}`); };

const mentura = (workspace, venture, args) => spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), ...args, "--venture", venture, "--workspace", workspace, "--json"], { encoding: "utf8" });
const jsonOf = (p) => { try { return JSON.parse(p.stdout); } catch { return null; } };

function venture(id) {
  const workspace = mkdtempSync(join(tmpdir(), "lean-replay-"));
  const dir = join(workspace, id);
  const init = spawnSync("node", [join(repo, "schema/init-venture.mjs"), dir, id, "--phase", "discovery"], { encoding: "utf8" });
  if (init.status !== 0) throw new Error(init.stderr || init.stdout);
  return { workspace, id, dir, cleanup: () => rmSync(workspace, { recursive: true, force: true }) };
}

const icp = (id) => ({
  venture: id, id: "shop-owners", who: "Independent shop owners with one location", primary: true,
  where_to_find: ["the Tuesday market"], not: ["friends who do not run a shop"],
});
const claim = (id, evidence) => ({
  venture: id,
  statement: "A fixture claim used only to replay the playbook routes.",
  segment: "Independent shop owners with one location",
  cost: "Six hours a week",
  why_now: "A fixture reason, not a researched fact.",
  evidence,
});
const source = (id, title) => ({ id, origin: "founder-supplied", title, fetched: today });
const behavior = (id, assumption) => ({
  id, kind: "behavior", summary: "Fixture: five people in the segment already pay for a workaround.",
  supports: true, source: { path: "raw/sources/problem-interview-notes/text.md" },
  audience: "target", sample: { n: 5 }, specificity: "specific", collected: today,
  assumption, origin: "first-hand",
});

const main = () => {
  const a = venture("main-path");
  const b = venture("profile-provided");
  try {
    const readMissing = mentura(a.workspace, a.id, ["foundation/icp", "read"]);
    const missing = jsonOf(readMissing);
    ok("WhoWasProvided: a read of foundation/icp before any profile is not a record", readMissing.status === 0 && missing?.result == null && missing?.not_found, JSON.stringify(missing?.not_found ?? readMissing.stderr));

    const wroteIcp = mentura(a.workspace, a.id, ["foundation/icp/shop-owners", "write", "--as", "person", "--input", inputFile("icp", icp(a.id))]);
    const icpBody = jsonOf(wroteIcp);
    ok("RouteExists: foundation/icp/shop-owners write", wroteIcp.status === 0 && icpBody?.ok && icpBody?.result?.draft === false, icpBody?.error ?? wroteIcp.stderr);

    const readIcp = jsonOf(mentura(a.workspace, a.id, ["foundation/icp", "read"]));
    ok("WhoWasProvided: the profile can be read after it is written", readIcp?.result?.["shop-owners"]?.primary === true, JSON.stringify(readIcp?.result ?? readIcp));

    const drafted = jsonOf(mentura(a.workspace, a.id, ["foundation/problem", "write", "--input", inputFile("claim", claim(a.id, []))]));
    ok("AgentDraftsClaim: an agent write is a draft", drafted?.ok && drafted?.result?.draft === true, drafted?.error ?? JSON.stringify(drafted));
    ok("DraftIsNotTheRecord: the accepted file is absent while the draft waits", !existsSync(join(a.dir, "foundation/problem.json")), "foundation/problem.json exists");

    const assessDraft = jsonOf(mentura(a.workspace, a.id, ["purpose/validation/assess", "run"]));
    const draftMissing = assessDraft?.needs_input?.missing?.some((m) => m.field === "purpose/validation/problem.json");
    ok("CheckAgrees: the assessment asks while the claim is only a draft", assessDraft?.ok && draftMissing, JSON.stringify(assessDraft?.needs_input ?? assessDraft));

    const accepted = mentura(a.workspace, a.id, ["accept", "foundation/problem", "--confirm", "foundation/problem"]);
    ok("AcceptClaim: you accept the draft", accepted.status === 0 && existsSync(join(a.dir, "foundation/problem.json")), accepted.stderr || accepted.stdout);

    const asked = jsonOf(mentura(a.workspace, a.id, ["purpose/validation/assess", "run"]));
    const askedFor = asked?.needs_input?.missing?.find((m) => m.field === "evidence")?.items ?? [];
    ok("CheckAgrees: a complete claim with no evidence asks instead of assessing", asked?.ok && ["exists", "segment", "hurts", "why-now"].every((id) => askedFor.includes(id)), JSON.stringify(asked?.needs_input ?? asked));
    const asIs = jsonOf(mentura(a.workspace, a.id, ["purpose/validation/assess", "run", "--as-is"]));
    ok("CheckAgrees: running as is on that claim supports explore", asIs?.result?.supports === "explore", JSON.stringify(asIs?.result ?? asIs?.needs_input));

    const emptyCheck = mentura(a.workspace, a.id, ["foundation/problem", "check"]);
    ok("CheckAgrees: the source check passes when no path is cited", emptyCheck.status === 0, emptyCheck.stderr || emptyCheck.stdout);

    const plan = jsonOf(mentura(a.workspace, a.id, ["raw/sources/problem-interview-plan", "write", "--as", "person", "--input", inputFile("plan", source("problem-interview-plan", "Fixture plan: learn segment and hurts. Ask for a next meeting."))]));
    ok("RouteExists: raw/sources/problem-interview-plan write", plan?.ok === true, plan?.error ?? JSON.stringify(plan));
    const planRead = jsonOf(mentura(a.workspace, a.id, ["raw/sources/problem-interview-plan", "read"]));
    ok("PlanFollowsClaim: the plan reads back", planRead?.result?.id === "problem-interview-plan", JSON.stringify(planRead?.result ?? planRead));

    const notesEarly = jsonOf(mentura(a.workspace, a.id, ["purpose/raw/text/problem-interview-notes", "read"]));
    ok("NotesFollowPlan: the notes route is not found before the file exists", notesEarly?.result == null && notesEarly?.not_found, JSON.stringify(notesEarly?.not_found ?? notesEarly));

    const notes = jsonOf(mentura(a.workspace, a.id, ["raw/sources/problem-interview-notes", "write", "--as", "person", "--input", inputFile("notes", source("problem-interview-notes", "Fixture notes from five conversations."))]));
    ok("RouteExists: raw/sources/problem-interview-notes write", notes?.ok === true, notes?.error ?? JSON.stringify(notes));
    const notesDir = join(a.dir, "raw/sources/problem-interview-notes");
    mkdirSync(notesDir, { recursive: true });
    writeFileSync(join(notesDir, "text.md"), "Fixture notes. Five shop owners described money already spent. No real person is named.\n");
    const notesRead = jsonOf(mentura(a.workspace, a.id, ["purpose/raw/text/problem-interview-notes", "read"]));
    ok("RouteExists: purpose/raw/text/problem-interview-notes read", typeof notesRead?.result === "string" && notesRead.result.includes("Five shop owners"), JSON.stringify(notesRead?.result ?? notesRead));

    const bad = mentura(a.workspace, a.id, ["foundation/problem", "write", "--as", "person", "--input", inputFile("bad", claim(a.id, [{ ...behavior("bad-cite", "hurts"), source: { path: "raw/sources/does-not-exist/text.md" } }]))]);
    ok("CiteMissingPath: a write that cites a missing file is accepted by the schema", bad.status === 0, bad.stderr || bad.stdout);
    const badCheck = mentura(a.workspace, a.id, ["foundation/problem", "check"]);
    ok("CheckAgrees: the source check fails when the cited file is missing", badCheck.status === 1 && /not found/.test(badCheck.stderr), badCheck.stderr || badCheck.stdout);

    const goodEvidence = [behavior("segment-pay", "segment"), behavior("hurts-pay", "hurts"), {
      id: "exists-report", kind: "desk-research", summary: "Fixture desk note, not a real report.",
      supports: true, source: { url: "https://example.com/fixture", checked: today },
      audience: "unknown", collected: today, assumption: "exists",
    }, {
      id: "why-now-note", kind: "desk-research", summary: "Fixture note that something changed, not a real report.",
      supports: true, source: { url: "https://example.com/fixture-why", checked: today },
      audience: "unknown", collected: today, assumption: "why-now",
    }];
    const good = mentura(a.workspace, a.id, ["foundation/problem", "write", "--as", "person", "--input", inputFile("good", claim(a.id, goodEvidence))]);
    ok("EvidenceFollowsNotes: evidence citing the notes file is written", good.status === 0, good.stderr || good.stdout);
    const goodCheck = mentura(a.workspace, a.id, ["foundation/problem", "check"]);
    ok("CheckAgrees: the source check passes when the cited file exists", goodCheck.status === 0, goodCheck.stderr || goodCheck.stdout);
    const held = jsonOf(mentura(a.workspace, a.id, ["purpose/validation/assess", "run"]));
    ok("CheckAgrees: first-hand behavior from five people supports charge", held?.result?.supports === "charge", JSON.stringify(held?.result ?? held?.needs_input));
    ok("CheckReadsTheRecordTheTemplateWrote: the assessment read foundation/problem.json", existsSync(join(a.dir, "foundation/problem.json")) && !existsSync(join(a.dir, "purpose/validation/problem.json")) && held?.result?.supports === "charge", "assess did not use the route file");

    mkdirSync(join(b.dir, "foundation/icp"), { recursive: true });
    writeFileSync(join(b.dir, "foundation/icp/shop-owners.json"), JSON.stringify(icp(b.id), null, 2) + "\n");
    const seeded = jsonOf(mentura(b.workspace, b.id, ["foundation/icp", "read"]));
    ok("WhoWasProvided: a profile the venture already has can be read", seeded?.result?.["shop-owners"]?.who?.includes("shop owners"), JSON.stringify(seeded?.result ?? seeded));
    const second = { id: "market-stalls", who: "Market stall holders with one pitch" };
    const draftedIcp = jsonOf(mentura(b.workspace, b.id, ["foundation/icp/market-stalls", "write", "--input", inputFile("icp-b", second)]));
    const whileDraft = jsonOf(mentura(b.workspace, b.id, ["foundation/icp", "read"]));
    ok("WhoWasProvided: an agent's profile is a draft and the list does not show it", draftedIcp?.result?.draft === true && whileDraft?.result?.["market-stalls"] == null, JSON.stringify(draftedIcp?.error ?? whileDraft?.result));
    const acceptedIcp = mentura(b.workspace, b.id, ["accept", "foundation/icp/market-stalls", "--confirm", "foundation/icp/market-stalls"]);
    const afterAccept = jsonOf(mentura(b.workspace, b.id, ["foundation/icp", "read"]));
    ok("WhoWasProvided: the accepted profile is in the list", acceptedIcp.status === 0 && afterAccept?.result?.["market-stalls"]?.id === "market-stalls", acceptedIcp.stderr || JSON.stringify(afterAccept?.result));
    const person = jsonOf(mentura(b.workspace, b.id, ["foundation/problem", "write", "--as", "person", "--input", inputFile("claim-b", claim(b.id, []))]));
    ok("PersonWritesClaim: a person write is the accepted file", person?.ok && person?.result?.draft === false && existsSync(join(b.dir, "foundation/problem.json")), person?.error ?? JSON.stringify(person));
  } finally {
    a.cleanup();
    b.cleanup();
    rmSync(scratch, { recursive: true, force: true });
  }
  for (const r of rows) console.log(`${r.pass ? "PASS" : "FAIL"}\t${r.rule}`);
  if (rows.some((r) => !r.pass)) process.exit(1);
};

main();
