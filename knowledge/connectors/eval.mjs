// Evals for the framework's connectors (EE-037, EE-041). The framework ships one connector, the
// file system, which works offline and names no vendor; a connector that reaches a vendor belongs
// to the app that hosts Naive, which registers it (registerConnector) and runs the same suite on it.
//
//   contract   the shared suite (suite.mjs) on the filesystem connector, in a plain folder and in
//              a git repository, plus the venture-folder rules
//   register   an app's connector, registered by absolute path, is in the registry and connects
//
// The router, catalog, source-of-truth matrix and attribute evals run routes through the router,
// so they are in interface/tests/connectors-router-test.mjs (router inversion, step 4).
//
//   node knowledge/connectors/eval.mjs

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contract, FIXTURE, harness, OUTSIDE } from "./suite.mjs";
import { connect as fsConnect } from "./filesystem.mjs";
import { connect, registerConnector, registry } from "./index.mjs";

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

{
  // An app registers its own connector; here a stand-in that wraps the filesystem connector.
  const d = mkdtempSync(join(scratch, "app-"));
  const mod = join(d, "stand-in.mjs");
  writeFileSync(mod, `export { connect } from ${JSON.stringify(new URL("./filesystem.mjs", import.meta.url).pathname)};\n`);
  let refused = false;
  try { registerConnector("app-store", { module: "stand-in.mjs", writes: ["direct"] }); } catch { refused = true; }
  expect("register: a relative module path is refused", refused);
  registerConnector("app-store", { module: mod, writes: ["direct"], options: ["root"] });
  expect("register: the app's connector is in the registry beside the framework's", registry().has("app-store") && registry().has("filesystem"));
  write(join(d, "kb"), FIXTURE);
  const c = await connect({ id: "app", connector: "app-store", root: join(d, "kb") }, d);
  expect("register: a source on the app's connector connects and lists", (await c.list()).length > 0);
}

finish();
