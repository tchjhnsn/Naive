// The decision library (packages/naive/src/engine/frames.mjs): frames are checked to name no answer, a founder's words find
// their frame, premises are judged against the venture's records (here by a stand-in judge), code settles
// the verdicts, and the frame's decisions are proposed open for the founder.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";

const repo = new URL("../../../..", import.meta.url).pathname;
const base = mkdtempSync(join(tmpdir(), "frames-test-"));
const dir = join(base, "acme");
// finance=rho syncs through the app's command (packages/naive/src/core/sync.mjs); the test names a stand-in.
const env = { ...process.env, HOME: base, NAIVE_SYNC_RHO: `node ${join(repo, "packages/naive/src/records/examples/money-sync/sync.ts")}` };
for (const k of ["MENTURA_WORKSPACE", "TYPESAFE_API_KEY", "TYPESAFEAI_API_KEY", "MENTURA_TYPE_CMD"]) delete env[k];
const made = spawnSync("node", [join(repo, "packages/create-venture/index.mjs"), dir, "--type", "software-startup", "--name", "Pat Doe", "--source", "finance=rho", "--yes", "--skip-install", "--no-git"], { env, encoding: "utf8" });
if (made.status !== 0) { console.log(`FAIL create-venture: ${made.stderr}`); process.exit(1); }
for (const k of ["TYPESAFE_API_KEY", "TYPESAFEAI_API_KEY"]) delete process.env[k];
process.env.NAIVE_JUDGE_CMD = `node ${join(repo, "packages/naive/src/records/examples/frames/judge.mjs")}`;
process.env.MENTURA_WORKSPACE = base;
const F = await import("./frames.mjs");
const file = (id) => JSON.parse(readFileSync(ventureFile(dir, `decisions/${id}.decision.json`), "utf8"));

let failed = 0;
const ok = (c, m) => { if (!c) throw new Error(m ?? "assertion failed"); };
const t = async (name, fn) => { try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const SAID = "I need investors to scale, but I don't want to give up control";

await t("every frame matches its rules and names no instrument as the answer", async () => {
  ok(F.frames().length >= 1);
  const errs = F.frames().flatMap(F.check);
  ok(!errs.length, errs.join("\n"));
  const bad = { ...F.frameOf("fund-without-ceding-control"), reframe: "Raise on a SAFE to keep {goal} on track." };
  ok(F.check(bad).some((e) => /names "safe"/.test(e)), "a frame that names an instrument passed");
});

await t("the founder's words find their frame; unrelated words find none", async () => {
  ok(F.match(SAID)[0]?.id === "fund-without-ceding-control", JSON.stringify(F.match(SAID)));
  ok(F.match("what color should my logo be").length === 0);
});

await t("props come from the venture's records: revenue and runway from the Rho summary, unknowns say so", async () => {
  const { facts, sources } = await F.props(dir);
  ok(/USD a month in/.test(facts.revenue) && sources.revenue === "money/_summary.json", facts.revenue);
  ok(facts.goal === "not on record" && facts.control_rights === "not on record", JSON.stringify(facts));
});

await t("code settles the verdicts at the thresholds; a premise with no answer is unknown", async () => {
  const f = F.frameOf("fund-without-ceding-control");
  const v = F.verdicts(f, { "premise:needs-outside-money": { noul: 0.8 }, "premise:money-means-ownership": { noul: 0.2 }, "premise:ownership-means-control": { noul: 0.5 }, "dichotomy:false": { noul: 0.75 } });
  ok(v.premises["needs-outside-money"].verdict === "yes" && v.premises["money-means-ownership"].verdict === "no" && v.premises["ownership-means-control"].verdict === "unknown" && v.premises["control-is-one-thing"].verdict === "unknown");
  ok(v.dichotomy.reading === "false");
  const blind = F.verdicts(f, { "premise:control-is-one-thing": { noul: 0.02 } }, { control_rights: "not on record" });
  ok(blind.premises["control-is-one-thing"].verdict === "unknown" && blind.premises["control-is-one-thing"].overruled, "a judgment the facts cannot support was kept");
});

await t("a run proposes the frame's decisions open, drafted by an agent, with the reframe and verdicts in the note", async () => {
  const r = await F.run(dir, { text: SAID });
  ok(r.ok, r.error);
  ok(r.result.frame === "fund-without-ceding-control" && r.result.dichotomy.reading === "sequence" && r.result.verdicts["needs-outside-money"].verdict === "unknown", JSON.stringify(r.result.verdicts));
  const d = file("which-control-matters");
  ok(d.status === "open" && d.options.length === 6 && d.provenance.drafted_by.kind === "agent" && d.note.includes(SAID) && /which ways of funding/i.test(d.note), JSON.stringify(d));
  const how = file("fund-growth-how");
  ok(how.status === "open" && !how.options?.length && /dated, cited lookup/.test(how.note), JSON.stringify(how));
});

await t("lookup options are kept only when dated within the frame's freshness and cited", async () => {
  const now = Date.parse("2026-10-29T00:00:00Z");
  const r = await F.run(dir, { id: "fund-without-ceding-control", now, lookup: { options: [
    { option: "a structure that separates money from ownership", source: "https://example.org/a", as_of: "2026-09-01" },
    { option: "an old structure", source: "https://example.org/b", as_of: "2025-01-01" },
    { option: "an uncited structure", as_of: "2026-10-01" },
  ] } });
  ok(r.ok, r.error);
  const how = file("fund-growth-how");
  ok(how.options.length === 1 && how.options[0].includes("https://example.org/a") && how.options[0].includes("2026-09-01"), JSON.stringify(how.options));
});

await t("a second run asks the judge nothing new: the judgments are cached", async () => {
  const r = await F.run(dir, { text: SAID });
  ok(r.ok && r.result.judge.cache === "hit", JSON.stringify(r.result?.judge));
});

await t("without a judge, a run refuses and says how to get one", async () => {
  const saved = process.env.NAIVE_JUDGE_CMD; delete process.env.NAIVE_JUDGE_CMD;
  const r = await F.run(join(base, "acme"), { id: "fund-without-ceding-control" });
  process.env.NAIVE_JUDGE_CMD = saved;
  ok(r.ok || /no judge|NAIVE_JUDGE_CMD/.test(r.error), r.error);
});

console.log(failed ? `\n${failed} failing` : "\nall frame checks pass");
process.exit(failed ? 1 : 0);
