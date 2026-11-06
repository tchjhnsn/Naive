// The connector contract suite (EE-037), shared by every connector's evals: the framework's
// (packages/naive/src/store/connectors/eval.mjs) and the platform's (platform/connectors/eval.mjs). A connector
// written anywhere proves itself against this one suite (EE-041).
//
//   const h = harness("name");          expect, throws, gitHash, write, scratch, finish
//   await contract(h, "label", make);   make(opts) -> { c, base(path), later(path, branch), pulls() }

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { blobSha, conformance } from "./contract.mjs";

export function harness(name) {
  let failed = 0, passed = 0, skipped = 0;
  const scratch = mkdtempSync(join(tmpdir(), `mentura-${name}-`));
  return {
    scratch,
    expect: (n, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${n}${!ok && detail ? `\n       ${detail}` : ""}`); ok ? passed++ : failed++; },
    throws: async (f, re) => { try { await f(); return false; } catch (e) { return re ? re.test(e.message) : true; } },
    skip: (why) => { console.log(`skip ${why}`); skipped++; },
    gitHash: (content) => spawnSync("git", ["hash-object", "--stdin"], { input: content, encoding: "utf8" }).stdout.trim(),
    write: (root, files) => { for (const [p, c] of Object.entries(files)) { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), c); } },
    finish: () => {
      rmSync(scratch, { recursive: true, force: true });
      console.log(`\n${passed} passed, ${failed} failing${skipped ? `, ${skipped} skipped` : ""}`);
      process.exit(failed ? 1 : 0);
    },
  };
}

// The fixture: three items under the source's root, one outside it that must never show.
export const FIXTURE = {
  "notes/alpha.md": "# Alpha\n\nThe kettle pilot ran in October with nine households.\n",
  "notes/beta.md": "# Beta\n\nPricing interviews: most would pay monthly.\n",
  "records/item.json": JSON.stringify({ id: "item", name: "Item one", tags: ["fixture"] }, null, 2) + "\n",
};
export const OUTSIDE = { "other/secret.md": "# Outside\n\nkettle text outside the root\n" };
export const UNICODE = "# Café ☕\n\nLine one\nLine two with ünïcode, emoji 🫖 and a tab\tend\n";

// ---- Contract ----------------------------------------------------------------------------------
// make() gives { c, base(path) -> content on the branch or folder reads come from, later(path) ->
// content where a write lands (the folder, or the pull request's branch), pulls() }.
export async function contract({ expect, throws, gitHash }, name, make) {
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
