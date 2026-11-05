// Tests for naive publish build (the publishing gate, item 2): a canary in every internal field of a fixture
// venture never reaches any channel's output; an approved public variant does; an unapproved draft does not
// and is listed as pending; a variant that copies its source is refused at the gate; and a builder that
// reads a record directly is refused at the verify stage.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, CHANNELS } from "./publish-build.mjs";

const repo = new URL("../../", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };

const tmp = mkdtempSync(join(tmpdir(), "publish-build-"));
const v = join(tmp, "canary"), out = join(tmp, "out");
const w = (rel, x) => { mkdirSync(join(v, rel, ".."), { recursive: true }); writeFileSync(join(v, rel), typeof x === "string" ? x : JSON.stringify(x, null, 2)); };
const CANARY = "CANARY-9b1e";
w("venture.json", { id: "canary", name: "Canary", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery", core: { promise: `${CANARY} promise: we help founders know the next decision to make.` } });
w("people/people.json", { venture: "canary", mode: "solo", people: [{ id: "founder", name: "Founder", role: "founder" }] });
w("foundation/problem.json", { venture: "canary", statement: `${CANARY} problem: founders cannot tell which decision matters most this week.`, segment: `${CANARY} segment: solo founders building with agents`, forms: [{ id: "f", statement: `${CANARY} form: nobody uses what they built` }], evidence: [] });
w("foundation/alignment.json", { venture: "canary", principles: [{ id: "p", statement: `${CANARY} principle: people decide by default, always` }] });
const all = () => Object.keys(CHANNELS).flatMap((c) => CHANNELS[c].outputs.map((p) => { try { return readFileSync(join(out, p), "utf8"); } catch { return ""; } })).join("\n");

try {
  for (const c of Object.keys(CHANNELS)) {
    const r = build(c, v, { out });
    expect(`${c}: builds with no public variant`, r.ok, r);
  }
  expect("a canary in an internal field reaches no channel's output", !all().includes(CANARY), all().match(new RegExp(`${CANARY}[^"<]*`))?.[0]);

  w("operations/marketing/content/problem.mdx", "---\nvariant_of: foundation/problem.json#statement\naudience: founders\npublish: false\n---\nPicking the decision that matters is the hard part now.\n");
  let r = build("artifact", v, { out });
  expect("an unapproved draft is listed as pending and not published", r.ok && r.pending.length === 1 && r.sources.length === 0 && !all().includes("Picking the decision"), r);

  w("foundation/problem.visibility.json", { fields: { statement: { visibility: "variant" } } });
  w("operations/marketing/content/problem.mdx", "---\nvariant_of: foundation/problem.json#statement\naudience: founders\npublish: true\napproved_by: Founder\n---\nPicking the decision that matters is the hard part now.\n");
  r = build("artifact", v, { out });
  const page = readFileSync(join(out, "artifact/index.html"), "utf8");
  expect("an approved variant (variant_of record#field) passes the gate and reaches the artifact", r.ok && page.includes("Picking the decision that matters") && r.sources[0]?.approved_by === "Founder", r);
  r = build("foundation", v, { out });
  expect("the foundation one-pager shows the approved variant, and no internal wording", r.ok && readFileSync(join(out, "artifact/foundation.html"), "utf8").includes("Picking the decision that matters") && !all().includes(CANARY), r);
  const rec = JSON.parse(readFileSync(join(out, "generated/publish-build.artifact.json"), "utf8"));
  expect("the build record names each output's sha256 and the variants it drew on", rec.outputs.every((o) => /^[0-9a-f]{64}$/.test(o.sha256)) && rec.sources.length === 1, rec);

  w("operations/marketing/content/problem.mdx", "---\nvariant_of: foundation/problem.json#statement\naudience: founders\npublish: true\napproved_by: Founder\n---\nproblem: founders cannot tell which decision matters most this week.\n");
  r = build("site", v, { out });
  expect("a variant that copies ten words of its source field is refused at the gate", !r.ok && r.stage === "gate", r);
  w("operations/marketing/content/problem.mdx", "---\nvariant_of: foundation/problem.json#statement\naudience: founders\npublish: true\n---\nPicking the decision that matters is the hard part now.\n");
  r = build("site", v, { out });
  expect("a published variant with no approver is refused at the gate", !r.ok && r.stage === "gate", r);
  w("operations/marketing/content/problem.mdx", "---\nvariant_of: foundation/problem.json#statement\naudience: founders\npublish: true\napproved_by: Founder\n---\nPicking the decision that matters is the hard part now.\n");

  // A builder that reads a record directly, as site/scripts/foundation.mjs did before this gate.
  const bad = join(tmp, "bad-builder.mjs");
  writeFileSync(bad, `import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const p = JSON.parse(readFileSync(process.env.NAIVE_VENTURE + "/foundation/problem.json", "utf8"));
mkdirSync(process.env.NAIVE_PUBLISH_OUT + "/artifact", { recursive: true });
writeFileSync(process.env.NAIVE_PUBLISH_OUT + "/artifact/bad.html", "<p>" + p.segment + "</p>");\n`);
  r = build("bad", v, { out, channels: { bad: { outputs: ["artifact/bad.html"], scripts: [bad] } } });
  expect("a builder that renders a record's own wording is refused at the verify stage", !r.ok && r.stage === "verify" && /foundation\/problem\.json#segment/.test(r.errors.join(" ")), r);

  expect("an unknown channel is refused", !build("nope", v, { out }).ok);
  const cli = spawnSync("node", [join(repo, "operations/marketing/publish-build.mjs"), "site", v, "--out", out], { encoding: "utf8" });
  expect("the command line runs the build", cli.status === 0 && /built site for canary/.test(cli.stdout), cli.stdout + cli.stderr);
  expect("every published fact is confirmed by construction, so no fact carries a status", !Object.values(JSON.parse(readFileSync(join(out, "generated/venture-facts.json"), "utf8"))).some((f) => f && typeof f === "object" && "status" in f));
  expect("a marketing page cannot use the removed Term component", !readFileSync(join(repo, "site/scripts/check-content.mjs"), "utf8").includes('"Term"'));
  const repoVenture = spawnSync("node", [join(repo, "operations/marketing/publish-build.mjs"), "foundation", join(repo, "instance/ventures/everything-ecosystem"), "--out", out], { encoding: "utf8" });
  expect("the repository's own venture builds its foundation one-pager through the gate", repoVenture.status === 0, repoVenture.stdout + repoVenture.stderr);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(failed ? `${failed} failing` : "all passing");
process.exit(failed ? 1 : 0);
