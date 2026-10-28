// Evals for the knowledge layer's connectors (EE-037). Three parts:
//
//   contract   one suite every connector must pass, run on the filesystem connector (in a plain
//              folder and in a git repository) and on the GitHub connector against a fake of the
//              GitHub API: list, read, version, search, write in its mode, root scoping, refusals
//   router     a venture whose source map keeps one record type in a GitHub repository: reads
//              come from there with their version, a write opens a draft pull request and is
//              logged with the source's version, nothing invalid reaches the source, and every
//              other record stays in the venture folder
//   catalog    one index across both sources: finds items in each, keeps no content, and a
//              rebuild reads only what changed
//
//   node knowledge/connectors/eval.mjs
//
// Live GitHub: with MENTURA_EVAL_GITHUB_REPO=owner/name (and a token in GITHUB_TOKEN, or the
// variable MENTURA_EVAL_GITHUB_TOKEN names), the read half of the contract also runs against that
// repository (MENTURA_EVAL_GITHUB_REF, MENTURA_EVAL_GITHUB_ROOT narrow it), and with
// MENTURA_EVAL_GITHUB_WRITE=1 it opens one real draft pull request. Without them it says it skipped.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { blobSha, conformance } from "./contract.mjs";
import { fakeGitHub } from "./fake-github.mjs";
import { connect as fsConnect } from "./filesystem.mjs";
import { connect as ghConnect } from "./github.mjs";
import { useFetch } from "./index.mjs";
import { build, FILE, load, search } from "./catalog.mjs";

const repo = new URL("../..", import.meta.url).pathname;
let failed = 0, passed = 0, skipped = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? `\n       ${detail}` : ""}`); ok ? passed++ : failed++; };
const throws = async (f, re) => { try { await f(); return false; } catch (e) { return re ? re.test(e.message) : true; } };
const gitHash = (content) => spawnSync("git", ["hash-object", "--stdin"], { input: content, encoding: "utf8" }).stdout.trim();
const scratch = mkdtempSync(join(tmpdir(), "mentura-connectors-"));
const write = (root, files) => { for (const [p, c] of Object.entries(files)) { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), c); } };

// The fixture: three items under the source's root, one outside it that must never show.
const FIXTURE = {
  "notes/alpha.md": "# Alpha\n\nThe kettle pilot ran in October with nine households.\n",
  "notes/beta.md": "# Beta\n\nPricing interviews: most would pay monthly.\n",
  "records/item.json": JSON.stringify({ id: "item", name: "Item one", tags: ["fixture"] }, null, 2) + "\n",
};
const OUTSIDE = { "other/secret.md": "# Outside\n\nkettle text outside the root\n" };
const UNICODE = "# Café ☕\n\nLine one\nLine two with ünïcode, emoji 🫖 and a tab\tend\n";

// ---- Contract ----------------------------------------------------------------------------------
// make() gives { c, base(path) -> content on the branch or folder reads come from, later(path) ->
// content where a write lands (the folder, or the pull request's branch), pulls() }.
async function contract(name, make) {
  console.log(`\n# contract: ${name}`);
  const t = await make();
  const { c } = t;
  expect(`${name}: meets the contract (list, read, version, search, write; writes ${c.writes})`, conformance(c).length === 0, conformance(c).join("; "));
  const listed = await c.list();
  expect(`${name}: list gives every item under the root and nothing outside it, sorted`, JSON.stringify(listed.map((x) => x.path)) === JSON.stringify(Object.keys(FIXTURE).sort()), JSON.stringify(listed.map((x) => x.path)));
  expect(`${name}: list gives each item's version as its git blob SHA-1`, listed.every((x) => x.version === blobSha(FIXTURE[x.path])));
  expect(`${name}: list(prefix) keeps to the prefix`, JSON.stringify((await c.list("notes")).map((x) => x.path)) === JSON.stringify(["notes/alpha.md", "notes/beta.md"]));
  const a = await c.read("notes/alpha.md");
  expect(`${name}: read gives the exact content`, a?.content === FIXTURE["notes/alpha.md"]);
  expect(`${name}: read's version is what git hash-object prints for the content`, a?.version === gitHash(FIXTURE["notes/alpha.md"]), `${a?.version} vs ${gitHash(FIXTURE["notes/alpha.md"])}`);
  expect(`${name}: version(path) matches read`, (await c.version("notes/alpha.md")) === a?.version);
  expect(`${name}: JSON reads back as the same JSON`, JSON.parse((await c.read("records/item.json"))?.content ?? "null")?.name === "Item one");
  expect(`${name}: a missing item reads as null, and has no version`, (await c.read("notes/nope.md")) === null && (await c.version("notes/nope.md")) === null);
  expect(`${name}: a path that leaves the root is refused`, await throws(() => c.read("../other/secret.md"), /not a path inside/) && await throws(() => c.read("/etc/passwd"), /not a path inside/) && await throws(() => c.write("a/../../x.md", "x"), /not a path inside/));
  const hits = await c.search("kettle pilot");
  expect(`${name}: search finds the item holding every word, and only inside the root`, JSON.stringify(hits.map((x) => x.path)) === JSON.stringify(["notes/alpha.md"]) && hits[0].version === a?.version, JSON.stringify(hits));
  expect(`${name}: search for words in no item finds nothing`, (await c.search("zebra quantum")).length === 0);
  if (c.writes === "direct") {
    const w = await c.write("notes/gamma.md", UNICODE);
    expect(`${name}: a direct write lands in place and returns the new version`, w.version === blobSha(UNICODE) && (await c.read("notes/gamma.md"))?.content === UNICODE);
    const w2 = await c.write("notes/alpha.md", FIXTURE["notes/alpha.md"] + "Added.\n");
    expect(`${name}: overwriting changes the version`, w2.version !== a.version && (await c.version("notes/alpha.md")) === w2.version);
    expect(`${name}: a written item is listed`, (await c.list()).some((x) => x.path === "notes/gamma.md"));
  } else if (c.writes === "pull-request") {
    const w = await c.write("notes/gamma.md", UNICODE, { message: "Add gamma" });
    expect(`${name}: a write opens a draft pull request and returns its link and the new version`, /\/pull\/\d+$/.test(w.pull_request?.url ?? "") && w.version === blobSha(UNICODE) && t.pulls().at(-1)?.draft === true, JSON.stringify(w));
    expect(`${name}: the branch reads come from is unchanged until the pull request is merged`, (await c.read("notes/gamma.md")) === null && t.base("notes/gamma.md") === null);
    expect(`${name}: the pull request's branch holds the exact content`, t.later("notes/gamma.md", w.pull_request.branch) === UNICODE);
    const w2 = await c.write("notes/alpha.md", FIXTURE["notes/alpha.md"] + "Added.\n");
    expect(`${name}: overwriting an existing item opens its own pull request`, w2.pull_request.branch !== w.pull_request.branch && t.later("notes/alpha.md", w2.pull_request.branch).endsWith("Added.\n") && t.base("notes/alpha.md") === FIXTURE["notes/alpha.md"]);
  }
  const ro = await make({ writes: "none" });
  expect(`${name}: a read-only source refuses writes`, await throws(() => ro.c.write("notes/x.md", "x"), /read-only/));
  return t;
}

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
await contract("filesystem (plain folder)", fsMake(false));
const gitT = await contract("filesystem (git repository)", fsMake(true));
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

// The GitHub connector, against the fake.
const ghMake = async ({ writes = "pull-request", search = "api" } = {}) => {
  const gh = fakeGitHub({ repo: "acme/knowledge", files: { ...Object.fromEntries(Object.entries(FIXTURE).map(([p, c]) => [`kb/${p}`, c])), ...OUTSIDE } });
  return { gh, c: ghConnect({ id: "acme", repo: "acme/knowledge", root: "kb", writes, search, token: "MENTURA_EVAL_FAKE_TOKEN", fetch: gh.fetch }),
    base: (p) => gh.files()[`kb/${p}`] ?? null, later: (p, branch) => gh.files(branch)[`kb/${p}`] ?? null, pulls: () => gh.pulls };
};
process.env.MENTURA_EVAL_FAKE_TOKEN = "fake";
const ghT = await contract("github (fake API)", ghMake);
{
  const a = await ghT.c.read("notes/alpha.md");
  expect("github (fake API): read gives the branch's commit and a permalink to the file at that commit", /^[0-9a-f]{40}$/.test(a.commit) && a.permalink === `https://github.com/acme/knowledge/blob/${a.commit}/kb/notes/alpha.md`);
  expect("github (fake API): a pull request targets the source's branch and says merging accepts it", ghT.gh.pulls.every((p) => p.base.ref === "main" && /Merging this pull request accepts the write/.test(p.body)));
  const scan = await ghMake({ search: "scan" });
  expect("github (fake API): search by scanning finds the same items as code search", JSON.stringify((await scan.c.search("kettle pilot")).map((x) => x.path)) === JSON.stringify(["notes/alpha.md"]));
  delete process.env.MENTURA_EVAL_FAKE_TOKEN;
  expect("github (fake API): without a token it fails and names the variable to set", await throws(() => ghT.c.list(), /no valid token in MENTURA_EVAL_FAKE_TOKEN/));
  process.env.MENTURA_EVAL_FAKE_TOKEN = "fake";
  expect("github: a source with no repo, or that asks to write directly, is refused", await throws(() => ghConnect({ repo: "nope" })) && await throws(() => ghConnect({ repo: "a/b", writes: "direct" })));
}

// ---- Router --------------------------------------------------------------------------------------
console.log("\n# router over a mapped source");
const ws = join(scratch, "workspace");
cpSync(join(repo, "schema/examples/workspace"), ws, { recursive: true });
process.env.MENTURA_WORKSPACE = ws;
const tandem = join(ws, "ventures/tandem");
const { call } = await import("../../interface/router.mjs");
const { entries } = await import("../../interface/provenance.mjs");
const kettle = { ...Object.values((await call({ venture: "tandem", route: "purpose/product", action: "read" })).result)[0], id: "kettle", name: "Kettle (in GitHub)" };
const team = fakeGitHub({ repo: "acme/tandem", files: { "ventures/tandem/products/kettle.json": JSON.stringify(kettle, null, 2) + "\n", "ventures/tandem/notes/launch.md": "# Launch plan\n\nShip the kettle subscription in spring.\n" } });
useFetch(team.fetch);
process.env.MENTURA_EVAL_FAKE_TOKEN = "fake";
const map = { sources: [{ id: "team-repo", connector: "github", repo: "acme/tandem", ref: "main", root: "ventures/tandem", token: "MENTURA_EVAL_FAKE_TOKEN" }], records: { product: "team-repo" } };
write(tandem, { "knowledge/sources.json": JSON.stringify(map, null, 2) + "\n" });
const localProducts = existsSync(join(tandem, "products")) ? spawnSync("ls", [join(tandem, "products")], { encoding: "utf8" }).stdout.trim().split("\n") : [];

const list = await call({ venture: "tandem", route: "purpose/product", action: "read" });
expect("router: a mapped record type is read from its source, not the venture folder", list.ok && JSON.stringify(Object.keys(list.result)) === JSON.stringify(["kettle"]) && localProducts.length > 0, JSON.stringify(list).slice(0, 300));
const one = await call({ venture: "tandem", route: "purpose/product/kettle", action: "read" });
expect("router: a read says which source and version it came from, with a permalink to cite", one.result?.name === "Kettle (in GitHub)" && one.source?.address === "team-repo://products/kettle.json"
  && one.source.version === blobSha(JSON.stringify(kettle, null, 2) + "\n") && /github\.com\/acme\/tandem\/blob\/[0-9a-f]{40}\/ventures\/tandem\/products\/kettle\.json$/.test(one.source.permalink ?? ""), JSON.stringify(one.source));
const local = await call({ venture: "tandem", route: "purpose/validation/problem", action: "read" });
expect("router: every record type the map does not name stays in the venture folder", local.ok && local.source?.source === "venture" && local.source.version === blobSha(readFileSync(join(tandem, "purpose/validation/problem.json"))));
const teapot = { ...kettle, id: "teapot", name: "Teapot" };
const puts = () => team.calls.filter((x) => x.startsWith("PUT")).length;
const before = puts();
const bad = await call({ venture: "tandem", route: "purpose/product/teapot", action: "write", input: { id: "teapot" } });
expect("router: a write that does not match the schema never reaches the source", !bad.ok && /does not match/.test(bad.error) && puts() === before);
const w = await call({ venture: "tandem", route: "purpose/product/teapot", action: "write", input: teapot, actor: "person", via: "cli", provenance: { derived_from: [one.source.permalink], note: "add the teapot" } });
expect("router: a write to a pull-request source opens a draft pull request, for a person as for an agent", w.ok && w.result.draft === true && /^https:\/\/github\.com\/acme\/tandem\/pull\/1$/.test(w.result.pull_request ?? "") && team.pulls[0]?.draft === true, JSON.stringify(w));
expect("router: nothing lands in the venture folder or on the source's branch until the pull request is merged",
  !existsSync(join(tandem, "products/teapot.json")) && !team.files()["ventures/tandem/products/teapot.json"] && JSON.parse(team.files(team.pulls[0].head.ref)["ventures/tandem/products/teapot.json"]).name === "Teapot");
const e = entries(tandem).at(-1);
expect("router: the write is logged by address, with the source's version and the pull request",
  e.entity === "team-repo://products/teapot.json" && e.activity === "draft" && e.source?.version === w.result.version && e.source.pull_request === w.result.pull_request && e.source.connector === "github" && e.derived_from?.[0] === one.source.permalink, JSON.stringify(e));
const pending = await call({ venture: "tandem", route: "purpose/product/teapot", action: "read" });
expect("router: reading it before the merge says a pull request is waiting", pending.result === null && pending.pending_pull_requests?.[0]?.pull_request === w.result.pull_request);
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
expect("catalog: indexes every item in both sources", cat.items.some((x) => x.source === "team-repo" && x.path === "notes/launch.md") && cat.items.some((x) => x.source === "venture" && x.path === "purpose/validation/problem.json") && stats.errors.length === 0, JSON.stringify(stats));
expect("catalog: every item has an address and its version", cat.items.every((x) => x.address === `${x.source}://${x.path}` && /^[0-9a-f]{40}$/.test(x.version)));
expect("catalog: records are tied to their routes, wherever they live", cat.items.find((x) => x.address === "team-repo://products/kettle.json")?.route === "purpose/product/kettle" && cat.items.find((x) => x.path === "purpose/validation/problem.json")?.route === "purpose/validation/problem");
const s1 = search(cat, "kettle subscription spring");
expect("catalog: search finds an item in the GitHub source", s1[0]?.address === "team-repo://notes/launch.md" && s1[0].title === "Launch plan", JSON.stringify(s1.slice(0, 2)));
const research = readFileSync(join(tandem, "knowledge/research/pilot-2026-10.md"), "utf8");
const s2 = search(cat, "pilot");
expect("catalog: search finds an item in the venture folder", s2.some((x) => x.address === "venture://knowledge/research/pilot-2026-10.md"));
const raw = readFileSync(join(tandem, FILE), "utf8");
const phrase = research.split("\n").find((l) => l.split(" ").length > 6)?.slice(0, 40);
expect("catalog: keeps no content (no sentence of an item appears in it)", phrase && !raw.includes(phrase) && !raw.includes("Ship the kettle subscription"), phrase);
const again = (await build(tandem)).stats;
expect("catalog: a rebuild with nothing changed reads nothing", again.read === 0 && again.reused === stats.items, JSON.stringify(again));
team.branches.set("main", team.branches.get(team.pulls[0].head.ref)); // the pull request is merged
const merged = (await build(tandem)).stats;
expect("catalog: after the merge, a rebuild reads only the new item", merged.read === 1 && load(tandem).items.some((x) => x.address === "team-repo://products/teapot.json"), JSON.stringify(merged));
expect("router: after the merge the record reads from the source", (await call({ venture: "tandem", route: "purpose/product/teapot", action: "read" })).result?.name === "Teapot");
useFetch(null);

// ---- Live GitHub (optional) ------------------------------------------------------------------------
console.log("\n# live github");
const live = process.env.MENTURA_EVAL_GITHUB_REPO;
const tokenVar = process.env.MENTURA_EVAL_GITHUB_TOKEN ?? "GITHUB_TOKEN";
if (!live || !process.env[tokenVar]) {
  console.log(`skip live GitHub: set MENTURA_EVAL_GITHUB_REPO=owner/name and a token in ${tokenVar} to run it`);
  skipped++;
} else {
  const c = ghConnect({ id: "live", repo: live, ref: process.env.MENTURA_EVAL_GITHUB_REF ?? "main", root: process.env.MENTURA_EVAL_GITHUB_ROOT ?? "", token: tokenVar });
  try {
    const items = await c.list();
    expect(`live github: lists ${live}`, items.length > 0);
    const first = items.find((x) => /\.(md|json|txt)$/.test(x.path)) ?? items[0];
    const r = await c.read(first.path);
    expect("live github: read gives content whose git blob SHA-1 is the version GitHub reports", r && blobSha(r.content) === r.version && r.version === first.version);
    expect("live github: read gives a permalink at a commit", /\/blob\/[0-9a-f]{40}\//.test(r.permalink ?? ""));
    const word = r.content.split(/[^A-Za-z]+/).find((x) => x.length > 6);
    if (word) { const hits = await c.search(word); expect(`live github: search for "${word}" returns items with versions`, hits.every((x) => /^[0-9a-f]{40}$/.test(x.version))); }
    if (process.env.MENTURA_EVAL_GITHUB_WRITE === "1") {
      const w = await c.write(`mentura-eval/${Date.now()}.md`, "# Mentura eval\n\nSafe to close.\n", { message: "Mentura connector eval (safe to close)" });
      expect("live github: a write opens a draft pull request", /\/pull\/\d+$/.test(w.pull_request?.url ?? ""), JSON.stringify(w));
      console.log(`     opened ${w.pull_request?.url}; close it and delete branch ${w.pull_request?.branch}`);
    }
  } catch (err) { expect("live github: reachable", false, err.message); }
}

rmSync(scratch, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failing${skipped ? `, ${skipped} skipped` : ""}`);
process.exit(failed ? 1 : 0);
