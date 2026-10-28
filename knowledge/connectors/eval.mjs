// Evals for the framework's connectors (EE-037, EE-041). The framework ships one connector, the
// file system, which works offline and names no vendor; connectors that reach a vendor are
// platform and have their own evals (platform/connectors/eval.mjs), against the same suite.
// Three parts:
//
//   contract   the shared suite (suite.mjs) on the filesystem connector, in a plain folder and in
//              a git repository, plus the venture-folder rules
//   router     a venture whose source map keeps one record type in another folder: reads come
//              from there with their version, a write lands there and is logged by address,
//              nothing invalid reaches the source, and every other record stays in the venture
//   catalog    one index across both sources, and a rebuild reads only what changed
//
//   node knowledge/connectors/eval.mjs

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { blobSha } from "./contract.mjs";
import { contract, FIXTURE, harness, OUTSIDE } from "./suite.mjs";
import { connect as fsConnect } from "./filesystem.mjs";
import { build, FILE, load, search } from "./catalog.mjs";

const repo = new URL("../..", import.meta.url).pathname;
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

// ---- Router --------------------------------------------------------------------------------------
console.log("\n# router over a mapped source");
const ws = join(scratch, "workspace");
cpSync(join(repo, "schema/examples/workspace"), ws, { recursive: true });
process.env.MENTURA_WORKSPACE = ws;
const tandem = join(ws, "ventures/tandem");
const shared = join(ws, "shared");
const { call } = await import("../../interface/router.mjs");
const { entries } = await import("../../interface/provenance.mjs");
const kettle = { ...Object.values((await call({ venture: "tandem", route: "purpose/product", action: "read" })).result)[0], id: "kettle", name: "Kettle (in the shared folder)" };
write(shared, { "products/kettle.json": JSON.stringify(kettle, null, 2) + "\n", "notes/launch.md": "# Launch plan\n\nShip the kettle subscription in spring.\n" });
const map = { sources: [{ id: "shared", connector: "filesystem", root: "../../shared" }], records: { product: "shared" } };
write(tandem, { "knowledge/sources.json": JSON.stringify(map, null, 2) + "\n" });
const localProducts = existsSync(join(tandem, "products")) ? spawnSync("ls", [join(tandem, "products")], { encoding: "utf8" }).stdout.trim().split("\n") : [];

const list = await call({ venture: "tandem", route: "purpose/product", action: "read" });
expect("router: a mapped record type is read from its source, not the venture folder", list.ok && JSON.stringify(Object.keys(list.result)) === JSON.stringify(["kettle"]) && localProducts.length > 0, JSON.stringify(list).slice(0, 300));
const one = await call({ venture: "tandem", route: "purpose/product/kettle", action: "read" });
expect("router: a read says which source and version it came from", one.result?.name === "Kettle (in the shared folder)" && one.source?.address === "shared://products/kettle.json"
  && one.source.version === blobSha(JSON.stringify(kettle, null, 2) + "\n"), JSON.stringify(one.source));
const local = await call({ venture: "tandem", route: "purpose/validation/problem", action: "read" });
expect("router: every record type the map does not name stays in the venture folder", local.ok && local.source?.source === "venture" && local.source.version === blobSha(readFileSync(join(tandem, "purpose/validation/problem.json"))));
const teapot = { ...kettle, id: "teapot", name: "Teapot" };
const bad = await call({ venture: "tandem", route: "purpose/product/teapot", action: "write", input: { id: "teapot" } });
expect("router: a write that does not match the schema never reaches the source", !bad.ok && /does not match/.test(bad.error) && !existsSync(join(shared, "products/teapot.json")));
const w = await call({ venture: "tandem", route: "purpose/product/teapot", action: "write", input: teapot, actor: "person", via: "cli", provenance: { note: "add the teapot" } });
expect("router: a write lands in the mapped source, not the venture folder", w.ok && JSON.parse(readFileSync(join(shared, "products/teapot.json"), "utf8")).name === "Teapot" && !existsSync(join(tandem, "products/teapot.json")), JSON.stringify(w));
const e = entries(tandem).at(-1);
expect("router: the write is logged by address, with the source's version", e.entity === "shared://products/teapot.json" && e.source?.connector === "filesystem" && e.source.version === blobSha(readFileSync(join(shared, "products/teapot.json"))), JSON.stringify(e));
const prov = spawnSync("node", [join(repo, "schema/check-provenance.mjs"), ws], { encoding: "utf8" });
const srcCheck = (d) => spawnSync("node", [join(repo, "schema/check-sources.mjs"), d], { encoding: "utf8" });
expect("router: check-provenance accepts entries for records in another source", prov.status === 0, prov.stderr);
expect("router: check-sources accepts the map", srcCheck(ws).status === 0, srcCheck(ws).stderr);
const valid = spawnSync("python3", ["-I", join(repo, "schema/validate.py"), "--schema", "knowledge-sources.schema.json", "--file", join(tandem, "knowledge/sources.json")], { encoding: "utf8" });
expect("router: the map matches its schema", valid.status === 0, valid.stdout + valid.stderr);
write(tandem, { "knowledge/sources.json": JSON.stringify({ sources: [{ id: "team-repo", connector: "notion" }], records: { product: "team-repo", venture: "team-repo" } }) });
const broken = srcCheck(ws);
expect("router: check-sources refuses an unknown connector and a record type that must stay in the folder", broken.status === 1 && /no connector notion/.test(broken.stderr) && /venture stays in the venture folder/.test(broken.stderr), broken.stderr);
const refused = await call({ venture: "tandem", route: "purpose/product", action: "read" });
expect("router: a read through an unknown connector fails and says which connectors exist", !refused.ok && /no connector notion: .*filesystem/.test(refused.error), refused.error);
write(tandem, { "knowledge/sources.json": JSON.stringify({ ...map, sources: [{ ...map.sources[0], writes: "none" }] }) });
const ro = await call({ venture: "tandem", route: "purpose/product/teapot", action: "write", input: teapot, actor: "person" });
expect("router: a write to a read-only source is refused", !ro.ok && /read-only/.test(ro.error));
write(tandem, { "knowledge/sources.json": JSON.stringify(map, null, 2) + "\n" });

// ---- Catalog -------------------------------------------------------------------------------------
console.log("\n# catalog");
const { stats } = await build(tandem);
const cat = load(tandem);
expect("catalog: indexes every item in both sources", cat.items.some((x) => x.source === "shared" && x.path === "notes/launch.md") && cat.items.some((x) => x.source === "venture" && x.path === "purpose/validation/problem.json") && stats.errors.length === 0, JSON.stringify(stats));
expect("catalog: every item has an address and its version", cat.items.every((x) => x.address === `${x.source}://${x.path}` && /^[0-9a-f]{40}$/.test(x.version)));
expect("catalog: records are tied to their routes, wherever they live", cat.items.find((x) => x.address === "shared://products/kettle.json")?.route === "purpose/product/kettle" && cat.items.find((x) => x.path === "purpose/validation/problem.json")?.route === "purpose/validation/problem");
const s1 = search(cat, "kettle subscription spring");
expect("catalog: search finds an item in the mapped source", s1[0]?.address === "shared://notes/launch.md" && s1[0].title === "Launch plan", JSON.stringify(s1.slice(0, 2)));
const research = readFileSync(join(tandem, "knowledge/research/pilot-2026-10.md"), "utf8");
expect("catalog: search finds an item in the venture folder", search(cat, "pilot").some((x) => x.address === "venture://knowledge/research/pilot-2026-10.md"));
const raw = readFileSync(join(tandem, FILE), "utf8");
const phrase = research.split("\n").find((l) => l.split(" ").length > 6)?.slice(0, 40);
expect("catalog: keeps no content (no sentence of an item appears in it)", phrase && !raw.includes(phrase) && !raw.includes("Ship the kettle subscription"), phrase);
const again = (await build(tandem)).stats;
expect("catalog: a rebuild with nothing changed reads nothing", again.read === 0 && again.reused === stats.items, JSON.stringify(again));
write(shared, { "notes/later.md": "# Later\n\nAdded after the first build.\n" });
const changed = (await build(tandem)).stats;
expect("catalog: after a change, a rebuild reads only the new item", changed.read === 1 && load(tandem).items.some((x) => x.address === "shared://notes/later.md"), JSON.stringify(changed));

finish();
