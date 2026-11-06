// Publishing (packages/naive/src/engine/publish.mjs, packages/naive/src/engine/check-publications.mjs): build compiles public MDX into an artifact
// and leak-checks it; the gate writes a publish decision with its door, exposure and reversibility and
// refuses without a person; the manifest keeps the live sha256 and earlier versions; rollback, embargo,
// and a changed record marking the publication stale.

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { build, publish, rollback, stale, manifest, mayApprove, Refused } from "./publish.mjs";
import { checkVenture } from "./check-publications.mjs";

const dir = mkdtempSync(join(tmpdir(), "publish-"));
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const refused = async (fn, match) => { try { await fn(); return false; } catch (e) { return e instanceof Refused && (!match || match.test(e.message)); } };
const w = (rel, text) => { mkdirSync(join(dir, rel, ".."), { recursive: true }); writeFileSync(join(dir, rel), typeof text === "string" ? text : JSON.stringify(text, null, 2)); };
const load = (rel) => JSON.parse(readFileSync(join(dir, rel), "utf8"));
const decisions = () => readdirSync(join(dir, "decisions")).map((f) => load(`decisions/${f}`));

w("venture.json", { id: "t", name: "t", parent: null, phase: "discovery", owner: "self", status: "active", layers: {} });
w("foundation/problem.json", { statement: "internal wording of the problem" });
w("governance/publication-policy.json", { venture: "t", channels: [
  { id: "site", name: "Site", kind: "docs-site", rules: [] },
  { id: "x", name: "X", kind: "social", platform: "x", rules: [] },
] });
w("governance/delegation.json", { founder: ["Torian"], delegations: [{ class: "public-commitment", door: "two-way", role: "marketing", people: ["Ana"], max_exposure: "medium" }] });
w("marketing/content/home.mdx", "---\nvariant_of: foundation/problem.json#statement\npublish: true\napproved_by: Torian\nchannel: site, x\n---\nFounders lose weeks to decisions they could have made in a day.\n{/* internal: from foundation/problem.json */}\n");

// Build
const b = build(dir, "site");
expect("build compiles the channel's approved MDX into the artifact's output", b.sources.length === 1 && readFileSync(join(dir, b.output), "utf8").includes("Founders lose weeks"));
expect("the output has no MDX comments and passes the leak check", b.leaks.length === 0 && !readFileSync(join(dir, b.output), "utf8").includes("internal:"));
const art = load("artifacts/site.json");
expect("the artifact is built from the MDX and the record it varies, with the output's sha256", art.built_from.some((x) => x.record === "foundation/problem.json") && art.output.sha256 === b.sha256);
w("marketing/content/leak.mdx", "---\npublish: true\napproved_by: Torian\nchannel: x\n---\nSee foundation/icp.json and EE-012.\n");
const bx = build(dir, "x");
expect("build runs check-leaks on the output and reports leaks", bx.leaks.length >= 2);
expect("a leaking build cannot be published", await refused(() => publish(dir, "x", { by: "Torian" }), /internal text/));
rmSync(join(dir, "marketing/content/leak.mdx"));

// The publish lint runs inside the gate, on the MDX the output was built from.
w("marketing/content/secret.mdx", "---\npublish: true\napproved_by: Torian\nchannel: site\n---\nUse key sk-ant-abcdefghijklmnopqrstuvwxyz123456 to start.\n");
build(dir, "site");
expect("a publish the lint finds a secret in is refused", await refused(() => publish(dir, "site", { by: "Torian" }), /publish lint found secrets/));
rmSync(join(dir, "marketing/content/secret.mdx"));
build(dir, "site");

// With no founder list, no one approves as founder.
const bare = mkdtempSync(join(tmpdir(), "publish-bare-"));
expect("with no governance/delegation.json, --by alone does not make a founder", !mayApprove(bare, { by: "Anyone", door: "one-way", exposure: "high" }).ok);
rmSync(bare, { recursive: true, force: true });

// The CLI: naive publish check goes to the publish lint, everything else to the gate.
const naive = (...a) => spawnSync("node", [new URL("../interfaces/cli/naive.mjs", import.meta.url).pathname, ...a], { encoding: "utf8" });
w("pages/secret.mdx", "---\ntitle: Secret\n---\nUse key sk-ant-abcdefghijklmnopqrstuvwxyz123456 to start.\n");
const lc = naive("publish", "check", join(dir, "pages/secret.mdx"), "--venture", dir);
expect("naive publish check runs the publish lint", lc.status === 1 && /ERROR\s+secrets/.test(lc.stderr) && !/no channel/.test(lc.stderr), lc.stderr);
const lr = naive("publish", "check", "--report", "--venture", dir);
expect("naive publish check --report reports the findings log", lr.status === 0 && /finding\(s\) over/.test(lr.stdout), lr.stdout + lr.stderr);
const ls = naive("publish", "status", "--venture", dir);
expect("naive publish status still goes to the gate", ls.status === 0 && !ls.stderr && !/publish lint|usage/.test(ls.stdout), ls.stdout + ls.stderr);
rmSync(join(dir, "pages"), { recursive: true });

// The gate
expect("no approver is refused", await refused(() => publish(dir, "site", {}), /person must approve/));
process.env.MENTURA_ACTOR = "agent";
expect("an agent never approves", await refused(() => publish(dir, "site", { by: "Torian" }), /agent never approves/));
delete process.env.MENTURA_ACTOR;
expect("a refusal still writes the decision, open, with door, exposure and reversibility", decisions().some((d) => d.status === "open" && d.publish.door === "two-way" && d.publish.exposure.level === "low" && d.publish.reversibility.how));
expect("someone not a founder cannot approve as founder", await refused(() => publish(dir, "site", { by: "Ana" }), /not a founder/));
build(dir, "x");
expect("a social channel defaults to a one-way door, which a delegated role cannot approve", await refused(() => publish(dir, "x", { by: "Ana", as: "marketing" }), /founder only/));
expect("a delegated role cannot approve above its exposure", await refused(() => publish(dir, "site", { by: "Ana", as: "marketing", exposure: "high" }), /above what marketing/));
const p1 = await publish(dir, "site", { by: "Ana", as: "marketing", exposure: "medium", who: ["competitor"], url: "https://example.com" });
const d1 = load(p1.decision);
expect("a two-way door is approved by the delegated role, and the decision is decided under public-commitment", d1.status === "decided" && d1.provenance.authority === "public-commitment" && d1.publish.approver_role === "marketing");
expect("the manifest records artifact, url, sha256, approver and when", p1.entry.sha256 === b.sha256 && p1.entry.approved_by === "Ana" && p1.entry.url === "https://example.com" && p1.entry.at);
const prov = readFileSync(join(dir, "provenance.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
expect("the publish is logged in provenance with its decision", prov.some((e) => e.activity === "publish" && e.decision === p1.decision && e.sha256 === b.sha256));
expect("check-publications passes", checkVenture(dir).errors.length === 0, JSON.stringify(checkVenture(dir).errors));
const xp = await publish(dir, "x", { by: "Torian" });
expect("the founder approves a one-way door", xp.entry.door === "one-way" && load(xp.decision).publish.door === "one-way");

// Republish on change
w("foundation/problem.json", { statement: "the problem, reworded" });
const s = stale(dir);
expect("a changed source record marks the publications built from it stale", s.length === 2 && manifest(dir).entries.every((e) => e.stale));
expect("check-publications warns on a stale publication", checkVenture(dir).warnings.some((x) => /stale/.test(x)));
expect("a stale artifact is refused until it is rebuilt", await refused(() => publish(dir, "site", { by: "Torian" }), /stale/));
w("marketing/content/home.mdx", "---\nvariant_of: foundation/problem.json#statement\npublish: true\napproved_by: Torian\nchannel: site\n---\nFounders lose weeks to decisions a day would settle.\n");
const b2 = build(dir, "site");
const p2 = await publish(dir, "site", { by: "Torian" });
expect("republishing keeps the previous version", p2.entry.sha256 === b2.sha256 && p2.entry.previous[0].sha256 === b.sha256 && !p2.entry.stale);

// Rollback
const r = await rollback(dir, "site", { by: "Torian" });
expect("rollback restores the previous version and keeps the undone one", r.entry.sha256 === b.sha256 && r.entry.previous[0].sha256 === b2.sha256 && load(r.decision).publish.action === "rollback");
expect("check-publications passes after a rollback", checkVenture(dir).errors.length === 0, JSON.stringify(checkVenture(dir).errors));

// Embargo
const m = manifest(dir); m.entries.find((e) => e.channel === "site").not_before = "2999-01-01T00:00:00Z"; w("governance/publications.json", m);
build(dir, "site");
expect("an embargoed publish is refused before not_before", await refused(() => publish(dir, "site", { by: "Torian" }), /embargoed/));
expect("after not_before it goes", !(await refused(() => publish(dir, "site", { by: "Torian", now: new Date("3000-01-01") }))));

// The check's failures
const m2 = manifest(dir); const e = m2.entries.find((x) => x.channel === "site");
w("governance/publications.json", { entries: m2.entries.map((x) => x === e ? { ...x, sha256: "0".repeat(64), approved_by: undefined } : x) });
const c = checkVenture(dir).errors.join("\n");
expect("check-publications fails on a sha256 mismatch", /does not match/.test(c));
expect("check-publications fails on no approver", /no approver/.test(c));
w("governance/publications.json", { entries: m2.entries.filter((x) => x !== e) });
expect("check-publications fails when something is live without an entry", /live \(published\) with no entry/.test(checkVenture(dir).errors.join("\n")));

// A venture whose delegation names its founder lets that founder approve a one-way publish.
const named = join(import.meta.dirname, "../records/examples/software/ventures/relay");
expect("a venture's named founder may approve a one-way publish", mayApprove(named, { by: "Ada", door: "one-way", exposure: "high" }).ok, JSON.stringify(mayApprove(named, { by: "Ada", door: "one-way", exposure: "high" })));
expect("someone the delegation does not name may not approve a one-way publish", !mayApprove(named, { by: "Torian", door: "one-way", exposure: "high" }).ok);

rmSync(dir, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
