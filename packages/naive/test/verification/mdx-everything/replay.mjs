// Replays each rule of PublicWords.tla against the real code, on a fixture venture and on Naive's example
// software venture, with Naive's stand-in channel builders (operations/marketing/fixtures/).
// Run from the repository root: node packages/naive/test/verification/mdx-everything/replay.mjs
// Prints one line per rule: what the replay did and what the code answered. The comparison with main's
// site one-pager, which this replay ran when the branch was verified, stays in everything-ecosystem with
// the site's code.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../../../../../operations/marketing/publish-build.mjs";
import { check } from "../../../src/engine/check-public.mjs";

const repo = new URL("../../../../../", import.meta.url).pathname;
const example = join(repo, "packages/naive/src/records/examples/software/ventures/relay");
const fx = (f) => join(repo, "operations/marketing/fixtures", f);
const channels = {
  site: { outputs: ["generated/venture-facts.json"], builders: [fx("facts.ts")] },
  artifact: { outputs: ["generated/venture-facts.json", "artifact/index.html"], builders: [fx("facts.ts"), fx("page.ts")] },
  foundation: { outputs: ["artifact/foundation.html"], builders: [fx("foundation.ts")] },
};
const tmp = mkdtempSync(join(tmpdir(), "replay-mdx-"));
const say = (rule, verdict, what) => console.log(`${rule.padEnd(26)} ${verdict.padEnd(5)} ${what}`);

try {
  // R1 on the branch: the same channel through operations/marketing/publish-build.mjs.
  for (const c of ["site", "artifact", "foundation"]) {
    const r = build(c, example, { out: join(tmp, "out"), channels });
    say(`NoInternalWords (${c})`, r.ok ? "PASS" : "FAIL", r.ok ? "built; verify found no internal wording and no internal-term match" : r.errors.join("; "));
  }

  // Fixture venture for R2 to R4.
  const v = join(tmp, "v");
  const w = (rel, x) => { mkdirSync(join(v, rel, ".."), { recursive: true }); writeFileSync(join(v, rel), typeof x === "string" ? x : JSON.stringify(x, null, 2)); };
  w("venture.json", { id: "v", name: "V", phase: "discovery", core: { promise: "We help founders know which decision matters most this week and why." } });
  w("foundation/problem.json", { statement: "Founders cannot tell which decision matters most this week, so they stall after building." });
  w("foundation/problem.visibility.json", { fields: { statement: { visibility: "variant" } } });
  const mdx = (meta, body) => w("operations/marketing/content/problem.mdx", `---\nvariant_of: foundation/problem.json#statement\naudience: founders\n${meta}\n---\n${body}\n`);

  mdx("publish: false", "Choosing what to do next is the hard part.");
  say("GateAcceptsHonestVariant", check(v).errors.length ? "FAIL" : "PASS", `check-public on a record#field draft: ${check(v).errors.length} blocked (main blocks it: "variant_of ... does not exist")`);

  mdx("publish: true\napproved_by: Founder", "Founders cannot tell which decision matters most this week, so they stall.");
  let r = build("site", v, { out: join(tmp, "o2"), channels });
  say("NoCopiedVariant", !r.ok && r.stage === "gate" ? "PASS" : "FAIL", `approved variant copying ten words: ${r.ok ? "built" : `refused at ${r.stage}`}`);

  // R3: an agent writes approved_by itself. Nothing tells its write from a person's.
  mdx("publish: true\napproved_by: Torian", "Choosing what to do next is the hard part.");
  r = build("site", v, { out: join(tmp, "o3"), channels });
  const shown = r.ok && readFileSync(join(tmp, "o3/generated/venture-facts.json"), "utf8").includes("Choosing what to do next");
  say("OnlyAPersonApproves", shown ? "FAIL" : "PASS", `variant with approved_by written by an agent: ${shown ? "published (gap reproduced, not fixed here)" : "not published"}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
