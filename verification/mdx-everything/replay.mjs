// Replays each rule of PublicWords.tla against the real code, on a fixture venture and on the repository's
// own venture. Run from the repository root: node verification/mdx-everything/replay.mjs
// Prints one line per rule: what the replay did and what the code answered.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, internalWording } from "../../operations/marketing/publish-build.mjs";
import { check } from "../../operations/marketing/check-public.mjs";
import { leaks } from "../../schema/check-leaks.mjs";

const repo = new URL("../../", import.meta.url).pathname;
const ee = join(repo, "instance/ventures/everything-ecosystem");
const tmp = mkdtempSync(join(tmpdir(), "replay-mdx-"));
const say = (rule, verdict, what) => console.log(`${rule.padEnd(26)} ${verdict.padEnd(5)} ${what}`);

try {
  // R1 on main: main's foundation.mjs prints statements whatever their visibility.
  const old = join(repo, "site/scripts/.replay-main-foundation.mjs");
  writeFileSync(old, execFileSync("git", ["-C", repo, "show", "origin/main:site/scripts/foundation.mjs"]));
  try { spawnSync("node", [old], { encoding: "utf8" }); } finally { rmSync(old, { force: true }); }
  const page = readFileSync(join(repo, "site/artifact/foundation.html"), "utf8").replace(/&amp;/g, "&");
  const verbatim = internalWording(ee).filter((w) => page.includes(w.text)).length;
  say("NoInternalWords (main)", verbatim ? "FAIL" : "PASS", `main's foundation one-pager carries ${verbatim} internal field(s) word for word and ${leaks([join(repo, "site/artifact/foundation.html")]).length} internal-term match(es)`);
  // R1 on the branch: the same channel through naive publish build.
  for (const c of ["site", "artifact", "foundation"]) {
    const r = build(c, ee, { out: join(tmp, "out") });
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
  let r = build("site", v, { out: join(tmp, "o2") });
  say("NoCopiedVariant", !r.ok && r.stage === "gate" ? "PASS" : "FAIL", `approved variant copying ten words: ${r.ok ? "built" : `refused at ${r.stage}`}`);

  // R3: an agent writes approved_by itself. Nothing tells its write from a person's.
  mdx("publish: true\napproved_by: Torian", "Choosing what to do next is the hard part.");
  r = build("site", v, { out: join(tmp, "o3") });
  const shown = r.ok && readFileSync(join(tmp, "o3/generated/venture-facts.json"), "utf8").includes("Choosing what to do next");
  say("OnlyAPersonApproves", shown ? "FAIL" : "PASS", `variant with approved_by written by an agent: ${shown ? "published (gap reproduced, not fixed here)" : "not published"}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
