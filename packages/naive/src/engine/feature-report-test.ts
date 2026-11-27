// Tests for feature reports (EE-228, packages/naive/src/engine/feature-report.ts): the pure core over facts built
// here, then an end-to-end run on a copy of the relay example, where a person writes a capability through the router
// (proven, its status history and its RICE from provenance), a hand edit makes it changed, a bug names it, a support
// case goes through that bug and telemetry counts its use. Then the CLI, the route and check-ventures.ts.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSync } from "../core/effect/run.ts";
import {
  coverOf, featureReport, gatherFacts, pathOf, portfolioReport, priorityOf, proofOf, renderFeature, renderPortfolio, riceScore,
  type CapabilityFacts, type Facts, type FeatureReport, type PortfolioReport, type Version,
} from "./feature-report.ts";
import type { ProductCapability, Telemetry } from "../records/types/records.d.ts";

let failed = 0;
const expect = (name: string, ok: unknown, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const repo = new URL("../../../../", import.meta.url).pathname;

// ---- The pure core ----
const cap = (over: Partial<ProductCapability> & { id: string }): ProductCapability => ({ name: over.id, product: "cli", kind: "capability", parent: "releasing", owner: `${over.id}-agent`, status: "live", ...over });
const rice = { reach: 100, impact: 2 as const, confidence: 0.8, effort: 4, set_by: "ana", at: "2026-11-27" };
const ver = (over: Partial<Version>): Version => ({ at: "2026-11-01T00:00:00Z", activity: "write", by: "ana", kind: "person", sha256: "a", record: null, ...over });
const facts = (caps: CapabilityFacts[], over: Partial<Facts> = {}): Facts => ({
  venture: "relay", capabilities: caps, products: [{ file: "products/cli.json", record: { id: "cli", name: "Relay CLI", features: [{ id: "changelog", job: "ship-release" }] } as Facts["products"][number]["record"] }],
  goals: [], requirements: [], bugs: [], cases: [], feedback: [], telemetry: null, ...over,
});
const located = (c: ProductCapability, versions: Version[] = [], sha256 = "now"): CapabilityFacts => ({ file: `product/capabilities/${c.id}.json`, record: c, sha256, versions });
const event = (capability: string, session: string, at: string, outcome: Telemetry["outcome"] = "ok"): Telemetry => ({ name: "route.write", capability, at, venture: "0123456789abcdef", session, outcome });

const tree = [cap({ id: "releasing", kind: "category", parent: null }), cap({ id: "changelog" }), cap({ id: "signing", kind: "category" }), cap({ id: "notarize", parent: "signing" })];
expect("a category covers itself and every capability under it, in tree order", coverOf(tree, "releasing").join() === "releasing,changelog,signing,notarize", coverOf(tree, "releasing"));
expect("a capability's path is the categories above it, the top one first", pathOf(tree, "notarize").join() === "releasing,signing", pathOf(tree, "notarize"));

expect("a file no provenance line names is unrecorded", proofOf("f", "x", []).state === "unrecorded");
expect("a file whose bytes differ from its last write is changed", proofOf("f", "x", [ver({ sha256: "y" })]).state === "changed");
expect("a file that is the bytes of its last write is proven", proofOf("f", "x", [ver({ sha256: "x" })]).state === "proven");
expect("a person's baseline is adopted", proofOf("f", "x", [ver({ sha256: "x", activity: "baseline" })]).state === "adopted");
expect("a held draft after the write does not count", proofOf("f", "x", [ver({ sha256: "x" }), ver({ sha256: "z", activity: "draft" })]).state === "proven");

expect("RICE is reach times impact times confidence over effort", riceScore(rice) === 40, riceScore(rice));
expect("no inputs is not scored, and names who sets them", priorityOf(undefined, []).state === "not-scored" && priorityOf(undefined, []).score === null);
const unconfirmed = priorityOf(rice, []);
expect("inputs no provenance line holds are computed but unconfirmed", unconfirmed.state === "unconfirmed" && unconfirmed.score === 40, unconfirmed);
const withRice = cap({ id: "changelog", rice });
const scored = priorityOf(rice, [ver({ record: cap({ id: "changelog" }) }), ver({ at: "2026-11-02T00:00:00Z", record: withRice }), ver({ at: "2026-11-03T00:00:00Z", by: "changelog-agent", kind: "agent", record: { ...withRice, summary: "x" } })]);
expect("inputs a person wrote are scored, and an agent's later edit of another field does not change who set them", scored.state === "scored" && scored.score === 40 && scored.why.includes("ana") && scored.why.includes("2026-11-02"), scored);
const byAgent = priorityOf(rice, [ver({ by: "changelog-agent", kind: "agent", record: withRice })]);
expect("inputs an agent wrote are not scored, whatever set_by says", byAgent.state === "not-scored" && byAgent.score === null && byAgent.why.includes("changelog-agent"), byAgent);

const f = facts(tree.map((c) => located(c.id === "changelog" ? { ...c, goals: ["grow", "grow/paying", "gone"], requirements: ["fast", "missing"], since: "2026-11-01" } : c,
  c.id === "changelog" ? [ver({ sha256: "now", record: { ...c, status: "building" } }), ver({ at: "2026-11-05T00:00:00Z", sha256: "now", record: c })] : [])), {
  goals: [{ file: "foundation/goals/grow.json", record: { id: "grow", statement: "Grow as a small tools company", kind: "scale", status: "active", measures: [{ id: "paying", statement: "Ten paying teams" }] } }],
  requirements: [{ file: "foundation/requirements/fast.json", record: { id: "fast", statement: "A release takes under a minute", derives_from: ["grow"] } }],
  bugs: [
    { file: "product/bugs/b1.json", record: { id: "b1", title: "Empty changelog", severity: "P1", status: "open", found_in: "0.1", capability: "changelog" } },
    { file: "product/bugs/b2.json", record: { id: "b2", title: "Typo", severity: "P3", status: "fixed", found_in: "0.1", capability: "changelog" } },
    { file: "product/bugs/b3.json", record: { id: "b3", title: "No signature", severity: "P0", status: "open", found_in: "0.1", capability: "notarize" } },
    { file: "product/bugs/b4.json", record: { id: "b4", title: "Somewhere", severity: "P2", status: "open", found_in: "0.1" } },
  ],
  cases: [{ file: "support/cases/c1.json", record: { id: "c1", opened: "2026-11-02", channel: "email", kind: "problem", summary: "empty", status: "open", bug: "b1" } }],
  feedback: [{ file: "validation/feedback/f1.json", record: { id: "f1", tester: "t1", capability: "changelog", checkpoint: "first-release", answers: {}, at: "2026-11-03T00:00:00Z" } }],
  telemetry: { events: [event("changelog", "s1", "2026-11-02T10:00:00Z"), event("changelog", "s1", "2026-11-02T11:00:00Z", "error"), event("changelog", "s2", "2026-11-04T09:00:00Z"), event("notarize", "s3", "2026-11-05T09:00:00Z")], unreadable: 0 },
});
const r = featureReport(f, "changelog") as FeatureReport;
expect("an unknown id has no report", featureReport(f, "nope") === null);
expect("place: the product, the path and the product's name", r.place.product_name === "Relay CLI" && r.place.path.join() === "releasing" && r.place.sources.includes("products/cli.json"), r.place);
expect("lifecycle: one entry per status change, with who and when", r.lifecycle.history.length === 2 && r.lifecycle.history[0].status === "building" && r.lifecycle.history[1].status === "live" && r.lifecycle.history[1].by === "ana", r.lifecycle.history);
expect("why: each goal with its status, a measure's own statement, and a goal that is not there is a hole", r.why.goals[0].status === "active" && r.why.goals[1].statement === "Ten paying teams" && r.why.goals[2].statement === null && r.why.holes.some((h) => h.fact === "goal gone"), r.why);
expect("why: requirements resolve, a missing one is a hole, and the product card gives the job", r.why.requirements[0].statement === "A release takes under a minute" && r.why.holes.some((h) => h.fact === "requirement missing") && r.why.job === "ship-release", r.why);
expect("quality: open bugs by severity count only open ones that name it", r.quality.open.P1 === 1 && r.quality.open.P3 === 0 && r.quality.open.P0 === 0 && r.quality.bugs.length === 2, r.quality);
expect("quality: support cases come through its bugs, and an unlinked bug is a hole", r.quality.cases.length === 1 && r.quality.cases[0].bug === "b1" && r.quality.holes.some((h) => h.fact.includes("1 bug(s)")), r.quality);
expect("feedback: the feedback records for its id", r.feedback.items.length === 1 && r.feedback.sources[0] === "validation/feedback/f1.json", r.feedback);
expect("adoption: events, sessions, outcomes and first and last seen are counted from telemetry", r.adoption.events === 3 && r.adoption.sessions === 2 && r.adoption.outcomes.error === 1 && r.adoption.first_seen === "2026-11-02T10:00:00Z" && r.adoption.last_seen === "2026-11-04T09:00:00Z", r.adoption);
expect("adoption: breadth is never estimated, it is a hole naming the eligible users", r.adoption.breadth === null && r.adoption.holes.some((h) => h.fact.startsWith("breadth")), r.adoption.holes);
expect("proof: its bytes are the ones last written", r.proof.state === "proven", r.proof);
const cat = featureReport(f, "releasing") as FeatureReport;
expect("a category's quality and adoption cover everything under it", cat.quality.open.P0 === 1 && cat.quality.open.P1 === 1 && cat.adoption.events === 4 && cat.place.children.join() === "changelog,signing", { q: cat.quality.open, a: cat.adoption.events });
const bare = featureReport(facts([located(cap({ id: "solo", parent: null, kind: "category" }))]), "solo") as FeatureReport;
expect("with no telemetry log, usage is a hole that says telemetry is opt-in", bare.adoption.events === 0 && bare.adoption.sources.length === 0 && bare.adoption.holes.some((h) => h.fill.includes("opt-in")), bare.adoption);
expect("with no bug records, zero open bugs is marked as no records, not as no bugs", bare.quality.holes.some((h) => h.fact.includes("keeps no bug records")), bare.quality.holes);
expect("an unrecorded capability has no history, and the hole names the router write", bare.lifecycle.history.length === 0 && bare.lifecycle.holes.some((h) => h.fill.includes("mentura product/capabilities/solo write")) && bare.proof.state === "unrecorded", bare.lifecycle);

const p = portfolioReport(f);
expect("the portfolio lists every feature of each product in tree order with its depth", p.products.length === 1 && p.products[0].features.map((x) => `${x.id}:${x.depth}`).join() === "releasing:0,changelog:1,signing:1,notarize:2", p.products[0].features.map((x) => [x.id, x.depth]));
const row = p.products[0].features.find((x) => x.id === "changelog");
expect("a portfolio row carries status, owner, open P0 and P1, RICE, proof and sessions", row?.blocking === 1 && row.rice === "not-scored" && row.proof === "proven" && row.sessions === 2 && row.owner === "changelog-agent", row);
expect("the portfolio counts what is not scored and not proven", p.counts.features === 4 && p.counts.not_scored === 4 && p.counts.unproven === 3, p.counts);
expect("with no telemetry, a row's sessions are null, not zero", portfolioReport(facts([located(cap({ id: "solo", parent: null }))])).products[0].features[0].sessions === null);
expect("the text renders say where facts came from and name every hole", renderFeature(r).includes("from product/capabilities/changelog.json") && renderFeature(r).includes("hole: goal gone") && renderPortfolio(p).includes("notarize"));
expect("the Markdown renders use headings and a table", renderFeature(r, true).startsWith("# ") && renderFeature(r, true).includes("## Adoption") && renderPortfolio(p, true).includes("| Feature |"));

// ---- End to end on a copy of the relay example ----
const ws = mkdtempSync(join(tmpdir(), "feature-report-"));
try {
  const dir = join(ws, "relay");
  cpSync(join(repo, "packages/naive/src/records/examples/software/ventures/relay"), dir, { recursive: true });
  const env = { ...process.env, MENTURA_WORKSPACE: ws, MENTURA_ACTOR_ID: "", MENTURA_SESSION: "" };
  const node = (...args: string[]) => spawnSync(process.execPath, args, { cwd: repo, encoding: "utf8", env });
  const capFile = join(dir, "product/capabilities/changelog.json");
  const base = JSON.parse(readFileSync(capFile, "utf8")) as ProductCapability;
  const write = (record: ProductCapability, name: string) => {
    const input = join(ws, name);
    writeFileSync(input, JSON.stringify(record, null, 2));
    return node("packages/naive/src/interfaces/cli/mentura.ts", "product/capabilities/changelog", "write", "--venture", "relay", "--as", "person", "--input", input, "--json");
  };
  const w1 = write({ ...base, goals: ["scale"], rice: { ...rice, set_by: "torian" } }, "w1.json");
  expect("a person writes the capability through the router", w1.status === 0, w1.stderr || w1.stdout);
  const w2 = write({ ...base, goals: ["scale"], rice: { ...rice, set_by: "torian" }, status: "live", since: "2026-11-27" }, "w2.json");
  expect("and moves it to live", w2.status === 0, w2.stderr || w2.stdout);
  mkdirSync(join(dir, "product/bugs"), { recursive: true });
  writeFileSync(join(dir, "product/bugs/empty-log.json"), JSON.stringify({ id: "empty-log", title: "The changelog is empty after a squash merge", severity: "P1", status: "open", found_in: "0.3.0", capability: "changelog" }, null, 2));
  mkdirSync(join(dir, "support/cases"), { recursive: true });
  writeFileSync(join(dir, "support/cases/c-1.json"), JSON.stringify({ id: "c-1", opened: "2026-11-26", channel: "email", kind: "problem", summary: "Release notes came out blank", status: "open", bug: "empty-log" }, null, 2));
  mkdirSync(join(dir, ".naive"), { recursive: true });
  writeFileSync(join(dir, ".naive/telemetry.jsonl"), [
    event("changelog", "sess-0001", "2026-11-25T10:00:00Z"), event("changelog", "sess-0001", "2026-11-25T10:05:00Z"), event("changelog", "sess-0002", "2026-11-26T09:00:00Z", "error"),
  ].map((e) => JSON.stringify(e)).join("\n") + "\n{\"not\":\"an event\"}\n");

  const live = runSync(gatherFacts(dir));
  expect("the gatherer reads the telemetry log and counts a line the schema refuses as unreadable", live.telemetry?.events.length === 3 && live.telemetry.unreadable === 1, live.telemetry);
  const one = featureReport(live, "changelog") as FeatureReport;
  expect("a capability written through the router is proven", one.proof.state === "proven", one.proof);
  expect("its status history comes from provenance: building, then live, each by a person", one.lifecycle.history.map((x) => `${x.status}:${x.kind}`).join() === "building:person,live:person", one.lifecycle.history);
  expect("its RICE is scored, because a person wrote the inputs", one.priority.state === "scored" && one.priority.score === 40, one.priority);
  expect("the goal it serves comes with its record", one.why.goals[0]?.goal === "scale" && one.why.goals[0].statement !== null, one.why.goals);
  expect("the bug that names it is an open P1, with the support case through it", one.quality.open.P1 === 1 && one.quality.cases[0]?.id === "c-1", one.quality);
  expect("adoption counts its sessions from telemetry", one.adoption.sessions === 2 && one.adoption.events === 3 && one.adoption.outcomes.error === 1, one.adoption);

  writeFileSync(capFile, JSON.stringify({ ...JSON.parse(readFileSync(capFile, "utf8")) as ProductCapability, summary: "Edited by hand" }, null, 2));
  const edited = featureReport(runSync(gatherFacts(dir)), "changelog") as FeatureReport;
  expect("a hand edit after the write makes it changed", edited.proof.state === "changed", edited.proof);
  expect("the category above it was never written through the router: unrecorded", featureReport(runSync(gatherFacts(dir)), "releasing")?.proof.state === "unrecorded");

  // The CLI.
  const naive = (...args: string[]) => spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/naive.ts"), ...args], { cwd: dir, encoding: "utf8", env });
  const list = naive("features");
  expect("naive features lists the portfolio", list.status === 0 && list.stdout.includes("changelog") && list.stdout.includes("P0/P1 1") && list.stdout.includes("RICE 40"), list.stderr || list.stdout);
  const json = naive("features", "list", "--json");
  expect("--json prints the portfolio", json.status === 0 && (JSON.parse(json.stdout) as PortfolioReport).counts.features === 2, json.stderr || json.stdout.slice(0, 300));
  const report = naive("features", "report", "changelog", "--md");
  expect("naive features report <id> --md prints one feature in Markdown", report.status === 0 && report.stdout.startsWith("# Changelog from commits") && report.stdout.includes("## Proof"), report.stderr || report.stdout.slice(0, 300));
  expect("an unknown feature exits 1, a bad subcommand 2", naive("features", "report", "nope").status === 1 && naive("features", "bogus").status === 2);

  // The route.
  const route = (...extra: string[]) => node("packages/naive/src/interfaces/cli/mentura.ts", "product/features", "run", "--venture", "relay", ...extra, "--json");
  const whole = route();
  const parsed = (out: string): unknown => { try { return (JSON.parse(out) as { result?: unknown }).result ?? JSON.parse(out); } catch { return null; } };
  expect("product/features returns the portfolio", whole.status === 0 && (parsed(whole.stdout) as PortfolioReport | null)?.counts?.features === 2, whole.stderr || whole.stdout.slice(0, 300));
  const byValue = route("--value", "changelog");
  expect("product/features with a value returns that feature's report", byValue.status === 0 && (parsed(byValue.stdout) as FeatureReport | null)?.id === "changelog", byValue.stderr || byValue.stdout.slice(0, 300));

  // check-ventures.ts: a bug that names no capability, and a capability serving a goal that is not there.
  writeFileSync(join(dir, "product/bugs/stray.json"), JSON.stringify({ id: "stray", title: "x", severity: "P3", status: "open", found_in: "0.1", capability: "nope" }));
  writeFileSync(capFile, JSON.stringify({ ...base, goals: ["scale/nope", "gone"], requirements: ["missing"] }, null, 2));
  const check = node("packages/naive/src/checks/check-ventures.ts", ws);
  const out = check.stdout + check.stderr;
  expect("check-ventures fails on a bug naming no capability, an unknown goal, an unknown measure and an unknown requirement",
    check.status === 1 && out.includes("product/bugs/stray: capability nope") && out.includes("serves goal gone") && out.includes("has no measure nope") && out.includes("requirement missing"), out);
} finally { rmSync(ws, { recursive: true, force: true }); }

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("feature reports: all pass");
