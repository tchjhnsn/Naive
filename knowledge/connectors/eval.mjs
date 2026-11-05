// Evals for the framework's connectors (EE-037, EE-041). The framework ships one connector, the
// file system, which works offline and names no vendor; connectors that reach a vendor are
// platform and have their own evals (platform/connectors/eval.mjs), against the same suite.
//
//   contract   the shared suite (suite.mjs) on the filesystem connector, in a plain folder and in
//              a git repository, plus the venture-folder rules
//
// The router, catalog, source-of-truth matrix and attribute evals run routes through the router,
// so they are in interface/tests/connectors-router-test.mjs (router inversion, step 4).
//
//   node knowledge/connectors/eval.mjs

import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { contract, FIXTURE, harness, OUTSIDE } from "./suite.mjs";
import { connect as fsConnect } from "./filesystem.mjs";

const h = harness("connectors");
const { expect, write, scratch, finish } = h;

// The filesystem connector, in a plain folder.
const fsMake = (git) => async ({ writes = "direct" } = {}) => {
  const d = mkdtempSync(join(scratch, "fs-"));
  write(join(d, "kb"), FIXTURE);
  write(d, OUTSIDE);
  if (git) {
    const g = (...a) => spawnSync("git", ["-C", d, ...a], { encoding: "utf8" });
    g("init", "-q"); g("add", "."); g("-c", "user.name=eval", "-c", "user.email=eval@example.com", "commit", "-qm", "fixture");
  }
  return { c: fsConnect({ id: "folder", root: join(d, "kb"), writes }), dir: d };
};
await contract(h, "filesystem (plain folder)", fsMake(false));
const gitT = await contract(h, "filesystem (git repository)", fsMake(true));
{
  const fresh = await fsMake(true)();
  const r = await fresh.c.read("notes/beta.md");
  const head = spawnSync("git", ["-C", fresh.dir, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
  expect("filesystem (git repository): a committed, unchanged item gives the commit that last touched it", r.commit === head);
  await fresh.c.write("notes/beta.md", "changed\n");
  expect("filesystem (git repository): a changed item gives no commit, since no commit holds that version", !(await fresh.c.read("notes/beta.md")).commit);
  void gitT;
}
{
  const d = mkdtempSync(join(scratch, "venture-"));
  write(d, { "venture.json": "{}", "purpose/telos.json": "{}", "_drafts/x.draft": "{}", "studio/venture.json": "{}", "studio/purpose/telos.json": "{}" });
  const v = fsConnect({ root: d, venture: true });
  expect("filesystem (venture folder): listing stops at a nested venture and skips private _ folders", JSON.stringify((await v.list()).map((x) => x.path)) === JSON.stringify(["purpose/telos.json", "venture.json"]));
}

finish();
