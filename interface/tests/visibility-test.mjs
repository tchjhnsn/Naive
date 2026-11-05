// Tests for field visibility beyond the leak canaries (schema/leaks-test.mjs): only a person sets public,
// an agent only proposes, the router's public reader sees only public fields, and the publish check
// (schema/check-visibility.mjs) refuses a page that uses a fact no person approved.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hash, variantOf, visibilityOf } from "../../schema/visibility.mjs";
import { refusals } from "../../schema/check-visibility.mjs";
import { context } from "../../schema/upgrades.mjs";
import * as telosToGoals from "../../schema/migrations/telos-to-goals.mjs";

const repo = new URL("../..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "visibility-"));
const v = join(ws, "vis");
const w = (rel, x) => { mkdirSync(join(v, rel, ".."), { recursive: true }); writeFileSync(join(v, rel), typeof x === "string" ? x : JSON.stringify(x, null, 2)); };
const cli = (args, env = {}) => spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), ...args, "--venture", "vis"], { env: { ...process.env, MENTURA_WORKSPACE: ws, ...env }, encoding: "utf8" });
const STATEMENT = "Building is easy now. Knowing what to decide next is not.";

try {
  w("venture.json", { id: "vis", name: "Vis", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery" });
  w("foundation/problem.json", { venture: "vis", statement: STATEMENT, segment: "INTERNAL-SEGMENT-9c1", evidence: [] });
  w("people/people.json", { venture: "vis", mode: "solo", people: [{ id: "founder", name: "Founder", role: "founder" }] });

  w("foundation/problem.visibility.json", { fields: { statement: { visibility: "public", sha256: hash(STATEMENT) } } });
  expect("a public field no person approved stays internal", visibilityOf(v, "foundation/problem.json", "statement").visibility === "internal");
  w("foundation/problem.visibility.json", { fields: { statement: { visibility: "public", sha256: hash(STATEMENT), approved_by: "chief-of-staff" } } });
  expect("a public field a role approved stays internal", visibilityOf(v, "foundation/problem.json", "statement").visibility === "internal");
  rmSync(join(v, "foundation/problem.visibility.json"));

  const byRole = cli(["visibility", "foundation/problem", "statement", "--public", "--by", "chief-of-staff"]);
  expect("a role cannot approve a field as public", byRole.status !== 0 && /only a person/.test(byRole.stderr), byRole.stderr);
  const stranger = cli(["visibility", "foundation/problem", "statement", "--public", "--by", "Somebody Else"]);
  expect("a name not in people/people.json cannot approve a field as public", stranger.status !== 0 && /not a person/.test(stranger.stderr), stranger.stderr);
  const agentAsPerson = cli(["visibility", "foundation/problem", "statement", "--public", "--by", "Founder"], { MENTURA_ACTOR_ID: "marketing-lead" });
  expect("an agent cannot approve public by naming a person", agentAsPerson.status !== 0 && /agent .* is acting/.test(agentAsPerson.stderr) && visibilityOf(v, "foundation/problem.json", "statement").visibility === "internal", agentAsPerson.stderr);
  const prop = cli(["visibility", "foundation/problem", "statement", "--propose"], { MENTURA_ACTOR_ID: "marketing-lead" });
  expect("an agent proposes public, and the field stays internal", prop.status === 0 && visibilityOf(v, "foundation/problem.json", "statement").visibility === "internal", prop.stdout + prop.stderr);
  const ok = cli(["visibility", "foundation/problem", "statement", "--public", "--by", "Founder"]);
  const side = JSON.parse(readFileSync(join(v, "foundation/problem.visibility.json"), "utf8")).fields.statement;
  expect("a person approves it: the wording is pinned by sha256", ok.status === 0 && side.visibility === "public" && side.sha256 === hash(STATEMENT) && side.approved_by === "Founder", side);
  expect("the approval is a line in provenance", readFileSync(join(v, "provenance.jsonl"), "utf8").includes("approved foundation/problem.json#statement as public"));

  const pub = cli(["foundation/problem", "read", "--as", "public", "--json"]);
  const seen = JSON.parse(pub.stdout).result;
  expect("the router's public reader sees the public field and nothing internal", seen?.statement === STATEMENT && !pub.stdout.includes("INTERNAL-SEGMENT"), pub.stdout.slice(0, 400) + pub.stderr);
  w("evidence/results/e1.json", { id: "e1", note: "INTERNAL-EVIDENCE-4f2" });
  const list = cli(["evidence", "read", "--as", "public", "--json"]);
  expect("the router's public reader of a list route sees no internal field", list.status === 0 && JSON.parse(list.stdout).ok && !list.stdout.includes("INTERNAL-EVIDENCE"), list.stdout.slice(0, 400) + list.stderr);
  mkdirSync(join(ws, "shared/foundation"), { recursive: true });
  writeFileSync(join(ws, "shared/foundation/problem.json"), JSON.stringify({ venture: "vis", statement: STATEMENT, segment: "INTERNAL-REMOTE-7a3", evidence: [] }));
  w("knowledge/sources.json", { sources: [{ id: "shared", connector: "filesystem", root: "../shared" }], records: { "validation-problem": "shared" } });
  const far = cli(["foundation/problem", "read", "--as", "public", "--json"]);
  expect("the router's public reader of another source fails closed", far.status !== 0 && !far.stdout.includes("INTERNAL-REMOTE") && /venture's own folder/.test(far.stdout + far.stderr), far.stdout.slice(0, 400) + far.stderr);
  expect("an internal reader still reads the other source", cli(["foundation/problem", "read", "--json"]).stdout.includes("INTERNAL-REMOTE"));
  rmSync(join(v, "knowledge/sources.json"));
  expect("the router's public reader cannot write", cli(["foundation/problem", "write", "--as", "public", "--input", join(v, "foundation/problem.json")]).status !== 0);

  const asAgent = cli(["visibility", "foundation/problem", "segment", "--public", "--by", "Founder"], { MENTURA_ACTOR: "agent" });
  expect("MENTURA_ACTOR=agent cannot approve a field as public, even naming a person", asAgent.status === 1 && /only a person approves/.test(asAgent.stderr) && visibilityOf(v, "foundation/problem.json", "segment").visibility === "internal", asAgent.stdout + asAgent.stderr);

  w("customers/acme-secret-deal.json", { id: "acme-secret-deal" });
  for (const args of [["foundation", "view"], ["foundation", "read"], ["venture", "read"]]) {
    const r = cli([...args, "--as", "public", "--json"]);
    expect(`the public reader is refused on ${args.join(" ")}`, r.status !== 0 && /public reader/.test(r.stdout + r.stderr) && !(r.stdout + r.stderr).includes("acme-secret-deal"), r.stdout.slice(0, 400) + r.stderr);
  }

  const customers = cli(["customers", "read", "--as", "public", "--json"]);
  expect("a list route does not name an item with no public field to the public reader", customers.status === 0 && !customers.stdout.includes("acme-secret-deal"), customers.stdout.slice(0, 400) + customers.stderr);

  const missing = JSON.parse(cli(["customers/nope", "read", "--as", "public", "--json"]).stdout);
  const internalItem = cli(["customers/acme-secret-deal", "read", "--as", "public", "--json"]);
  const scrub = (a) => JSON.stringify(a).replaceAll("acme-secret-deal", "nope");
  expect("an item with no public field answers the same as a missing one", scrub(JSON.parse(internalItem.stdout)) === scrub(missing) && missing.not_found, { internal: internalItem.stdout.slice(0, 400), missing });
  w("customers/corrupt-deal.json", "CANARY-CORRUPT-ITEM");
  const corruptItem = cli(["customers/corrupt-deal", "read", "--as", "public", "--json"]);
  expect("an item that does not parse answers the same as a missing one", JSON.stringify(JSON.parse(corruptItem.stdout)).replaceAll("corrupt-deal", "nope") === JSON.stringify(missing), corruptItem.stdout.slice(0, 400));
  rmSync(join(v, "customers/corrupt-deal.json"));

  const INTERNAL_KEYS = ["metadata", "hierarchy", "pending_draft", "stale"];
  const internalKeys = (a) => INTERNAL_KEYS.filter((k) => k in a);
  const direct = await import("../router.mjs");
  const read = (route, input, actor = "public") => direct.call({ venture: "vis", route, action: "read", actor, input, workspace: ws });
  for (const [route, input] of [["foundation/problem", undefined], ["foundation/problem", { hierarchy: true }], ["evidence", undefined], ["customers/nope", { hierarchy: true }]]) {
    const a = await read(route, input);
    expect(`the public read of ${route}${input ? " with hierarchy" : ""} carries no internal metadata`, a.ok && !internalKeys(a).length && a.not_found?.need_now == null, a);
  }
  expect("a person's read still carries metadata", !!(await read("foundation/problem", undefined, "person")).metadata);

  const before = readFileSync(join(v, "foundation/problem.json"), "utf8");
  w("foundation/problem.json", "CANARY-CORRUPT");
  const corrupt = cli(["foundation/problem", "read", "--as", "public", "--json"]);
  expect("a parse error on a single record echoes no record bytes to the public reader", !(corrupt.stdout + corrupt.stderr).includes("CANARY") && /does not parse/.test(corrupt.stdout + corrupt.stderr), corrupt.stdout.slice(0, 400));
  const corruptAgent = cli(["foundation/problem", "read", "--json"]);
  expect("an agent still sees the parse detail", (corruptAgent.stdout + corruptAgent.stderr).includes("CANARY"), corruptAgent.stderr.slice(0, 400));
  w("foundation/problem.json", before);

  const tws = mkdtempSync(join(tmpdir(), "visibility-telos-"));
  try {
    const tandem = join(tws, "ventures/tandem");
    cpSync(join(repo, "schema/examples/workspace/ventures/tandem"), tandem, { recursive: true });
    telosToGoals.apply(tandem, context(tandem, { dry: false, git: false, cfg: {}, at: new Date().toISOString(), onConfig() {} }));
    const telos = (actor) => direct.call({ venture: "tandem", route: "foundation/telos", action: "read", actor, workspace: tws });
    const shown = await telos("public");
    expect("the telos view on a migrated venture gives the public reader nothing", shown.ok && shown.result === null && !shown.view, shown);
    expect("the telos view still renders for an agent", (await telos("agent")).view?.framework === "telos");
  } finally {
    rmSync(tws, { recursive: true, force: true });
  }

  w("marketing/content/variant.mdx", '---\nvariant_of: foundation/problem.json#segment\npublish: true\napproved_by:\n  - Founder\n---\nA public wording.\n');
  expect("a variant's list-form approved_by reads through the shared frontmatter parser", variantOf(v, "foundation/problem.json", "segment")?.value === "A public wording.");
  rmSync(join(v, "marketing/content/variant.mdx"));

  w("site/why.mdx", '<Section>\n  <Fact name="problem" />\n  <Fact name="segment" />\n</Section>\n');
  w("facts.json", { venture: "vis", problem: { value: STATEMENT, status: "confirmed", source: "foundation/problem.json#statement" } });
  const r = refusals(v, { content: join(v, "site"), facts: join(v, "facts.json") });
  expect("the publish check refuses a page using an internal field and names it", r.length === 1 && r[0].name === "segment" && r[0].visibility === "internal", r);
  w("foundation/problem.json", { venture: "vis", statement: STATEMENT + " Edited.", segment: "INTERNAL-SEGMENT-9c1", evidence: [] });
  const r2 = refusals(v, { content: join(v, "site"), facts: join(v, "facts.json") });
  expect("after an edit the approved field is refused until re-approved", r2.some((x) => x.name === "problem" && x.visibility === "variant"), r2);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nfield visibility holds");
