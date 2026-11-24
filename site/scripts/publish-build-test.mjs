// The site's channels through Naive's publish build (the publishing gate): a venture names them in its
// naive.config.json (publish_build: site, artifact and foundation, with the builders in site/scripts/), and each
// builds through the gate. The company venture's records live in the tenant's store since EE-118 step 9c, so the
// test gives a copy of Naive's example software venture (relay) the same channels. These were the site cases of Naive's
// operations/marketing/publish-build-test.mjs before EE-118 ("the repository's own venture builds its foundation
// one-pager", "a marketing page cannot use the removed Term component"); Naive now tests the build with stand-ins.
//
//   node site/scripts/publish-build-test.mjs

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, channelsFor } from "naive-framework/src/functions/marketing-and-sales/marketing/publish-build.mjs";
import { naivePath } from "./naive.ts";

const repo = new URL("../..", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "site-publish-build-"));
const venture = join(out, "venture");
cpSync(naivePath("packages/naive/src/records/examples/software/ventures/relay"), venture, { recursive: true });
const script = (name) => join(repo, "site/scripts", name);
writeFileSync(join(venture, "naive.config.json"), JSON.stringify({ publish_build: { out: join(out, "site"), channels: {
  site: { outputs: ["generated/venture-facts.json"], builders: [script("venture-facts.mjs")] },
  artifact: { outputs: ["generated/venture-facts.json", "artifact/index.html"], builders: [script("venture-facts.mjs"), script("artifact.mjs")] },
  foundation: { outputs: ["artifact/foundation.html"], builders: [script("foundation.mjs")] },
} } }, null, 2));
let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };

try {
  const { channels } = channelsFor(venture);
  expect("the venture names the site's three channels, each builder a script in site/scripts/", Object.keys(channels).join() === "site,artifact,foundation"
    && Object.values(channels).every((c) => c.builders.every((b) => b.startsWith(join(repo, "site/scripts/")) && existsSync(b))), channels);
  // The artifact channel is left out: its page names Mentura, which the company venture's internal terms hold back, so
  // the gate refuses it there (a known finding, not tested before EE-118 either).
  for (const c of ["site", "foundation"]) {
    const r = build(c, venture, { out });
    expect(`${c}: a venture with the site's channels builds it through the gate`, r.ok, r);
  }
  const cli = spawnSync("node", [naivePath("packages/naive/src/functions/marketing-and-sales/marketing/publish-build.mjs"), "foundation", venture, "--out", out], { encoding: "utf8" });
  expect("a venture builds its foundation one-pager through the gate from the command line", cli.status === 0, cli.stdout + cli.stderr);
  expect("every published fact is confirmed by construction, so no fact carries a status", !Object.values(JSON.parse(readFileSync(join(out, "generated/venture-facts.json"), "utf8"))).some((f) => f && typeof f === "object" && "status" in f));
  expect("a marketing page cannot use the removed Term component", !readFileSync(join(repo, "site/scripts/check-content.mjs"), "utf8").includes('"Term"'));
} finally {
  rmSync(out, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nall passing");
