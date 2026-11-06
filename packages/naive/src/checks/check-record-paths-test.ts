// Tests the record types' resolver (packages/naive/src/records/index.mjs) and the check that every record path goes through
// it (packages/naive/src/checks/check-record-paths.ts). Each rule of the check fails on a copy that breaks it.
//
//   node packages/naive/src/checks/check-record-paths-test.ts

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ALLOW, check, disagreements, RESOLVER, scan, staleAllow } from "./check-record-paths.ts";
import {
  APP_DATA_MODEL, dataModelFile, listSchemas, readDataModel, readSchema, RECORDS, recordPath, recordRelative, recordsIn, ROOT, schemaFile, schemaName, schemaNameOf,
} from "../records/index.mjs";

const root = fileURLToPath(new URL("../../../..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "check-record-paths-"));
let passed = 0;
const test = (name: string, fn: () => void): void => {
  fn();
  passed++;
  console.log(`ok ${name}`);
};

/** A small repository on disk with the real resolver and packages/naive/src/records/validate.py copied in, plus the given files. */
let copies = 0;
function repo(files: Record<string, string>): { dir: string; paths: string[] } {
  const dir = join(tmp, `r${++copies}`);
  const all: Record<string, string> = {
    [RESOLVER]: readFileSync(join(root, RESOLVER), "utf8"),
    "packages/naive/src/records/validate.py": readFileSync(join(root, "packages/naive/src/records/validate.py"), "utf8"),
    ...files,
  };
  for (const [path, text] of Object.entries(all)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return { dir, paths: Object.keys(all) };
}
const kinds = (dir: string, paths: string[]): string[] => scan(dir, paths, {}).map((f) => `${f.file}:${f.line} ${f.kind}`);

try {
  // The resolver.
  test("RECORDS is the record types' folder of this repository, computed from the module's own place", () => {
    assert.equal(join(RECORDS), join(root, "packages/naive/src/records"));
    assert.equal(join(ROOT), join(root));
    assert.equal(dataModelFile(), join(root, "packages/naive/src/records/data-model.json"));
  });

  test("every schema file resolves by name and by stored path, and parses", () => {
    const names = listSchemas();
    assert.ok(names.length > 100, `found ${names.length} schemas`);
    for (const name of names) {
      const file = schemaFile(name);
      assert.ok(existsSync(file), name);
      assert.equal(schemaFile(name.replace(/\.schema\.json$/, "")), file, `${name} without its suffix`);
      assert.equal(recordPath(`schema/${name}`), file, `the stored path of ${name}`);
      assert.equal(typeof readSchema(name), "object", name);
    }
  });

  test("every schema the data model names resolves to a file", () => {
    const model = readDataModel() as { records: { id: string; schema: string | null }[] };
    for (const r of model.records) if (r.schema) assert.ok(existsSync(recordPath(r.schema)), `${r.id}: ${r.schema}`);
  });

  test("a stored path under another folder resolves from the repository root, and an absolute path is kept", () => {
    assert.equal(recordPath("app/schemas/claim.schema.json"), join(root, "app/schemas/claim.schema.json"));
    assert.equal(recordRelative("app/schemas/claim.schema.json"), null);
    assert.equal(recordPath("/x/y.schema.json"), "/x/y.schema.json");
    assert.equal(recordRelative("./schema/venture.schema.json"), "venture.schema.json");
  });

  test("schemaNameOf gives the name packages/naive/src/records/validate.py takes, and keeps another folder's path whole", () => {
    assert.equal(schemaNameOf("packages/naive/src/records/venture.schema.json"), "venture.schema.json");
    assert.equal(schemaNameOf("app/schemas/claim.schema.json"), "app/schemas/claim.schema.json");
  });

  test("a schema name is a name: a path or an empty name is refused", () => {
    assert.equal(schemaName("venture"), "venture.schema.json");
    assert.throws(() => schemaName("packages/naive/src/records/venture.schema.json"), /no folder/);
    assert.throws(() => schemaName(""), /non-empty/);
  });

  test("recordsIn points the same functions at another copy of the repository", () => {
    const other = recordsIn(join(tmp, "copy"));
    assert.equal(other.RECORDS, join(tmp, "copy", "packages/naive/src/records"));
    assert.equal(other.schemaFile("venture"), join(tmp, "copy", "packages/naive/src/records", "venture.schema.json"));
    assert.equal(other.recordPath("schema/x.schema.json"), join(tmp, "copy", "packages/naive/src/records", "x.schema.json"));
    assert.equal(other.recordPath("packages/naive/src/records/x.schema.json"), join(tmp, "copy", "packages/naive/src/records", "x.schema.json"));
    assert.equal(other.recordPath("docs/x.json"), join(tmp, "copy", "docs", "x.json"));
  });

  test("an app's naive.data-model.json adds record types and ignore entries; anything else is refused", () => {
    const dir = join(tmp, "app");
    mkdirSync(join(dir, "packages/naive/src/records"), { recursive: true });
    writeFileSync(join(dir, "packages/naive/src/records", "data-model.json"), JSON.stringify({ version: 1, layers: [], records: [{ id: "a" }], ignore: [] }));
    const at = recordsIn(dir);
    assert.deepEqual(at.readDataModel().records.map((r: { id: string }) => r.id), ["a"]);
    writeFileSync(join(dir, APP_DATA_MODEL), JSON.stringify({ records: [{ id: "b" }], ignore: [{ path: "x.json", reason: "test" }] }));
    const merged = at.readDataModel();
    assert.deepEqual(merged.records.map((r: { id: string }) => r.id), ["a", "b"]);
    assert.deepEqual(merged.ignore.map((i: { path: string }) => i.path), ["x.json"]);
    writeFileSync(join(dir, APP_DATA_MODEL), JSON.stringify({ layers: ["mine"] }));
    assert.throws(() => at.readDataModel(), /adds only "records" and "ignore"/);
  });

  // The check.
  test("the repository passes as it is", () => {
    assert.deepEqual(check(root), []);
  });

  test("each way of building a record path from the folder name fails, named by file, line and kind", () => {
    const r = repo({
      "a/folder.mjs": `const s = readFileSync(join(framework, "schema", schema), "utf8");`,
      "a/literal.mjs": `const model = load(join(repo, "packages/naive/src/records/data-model.json"));`,
      "a/relative.mjs": `const model = load(join(here, "../../schema/data-model.json"));`,
      "a/template.ts": "const f = join(root, `schema/${name}.schema.json`);",
      "a/beside.mjs": `const m = JSON.parse(readFileSync(new URL("../records/data-model.json", import.meta.url), "utf8"));`,
      "a/listed.mjs": `const fixed = ["packages/naive/src/records/venture.schema.json", "library/packages/catalog.json"];`,
      "a/concat.js": `const f = "schema/" + name + ".schema.json";`,
      "a/prefix.mjs": `const name = r.schema.replace(/^schema\\//, "");\nif (schema?.startsWith("schema/")) n = schema.slice("schema/".length);`,
      "a/path.py": `model = json.loads((root / "packages/naive/src/records/data-model.json").read_text())\nschemas = (root / "schema").glob("*.schema.json")\nok = s.startswith("schema/")`,
    });
    assert.deepEqual(kinds(r.dir, r.paths), [
      "a/folder.mjs:1 folder argument",
      "a/literal.mjs:1 path literal",
      "a/relative.mjs:1 path literal",
      "a/template.ts:1 path literal",
      "a/beside.mjs:1 path literal",
      "a/listed.mjs:1 path literal",
      "a/concat.js:1 concatenation",
      "a/prefix.mjs:1 stored prefix",
      "a/prefix.mjs:2 stored prefix",
      "a/path.py:1 python path",
      "a/path.py:2 python path",
      "a/path.py:3 stored prefix",
    ]);
  });

  test("names, messages, comments, other files in the folder, the resolver and allowlisted files pass", () => {
    const r = repo({
      "b/name.mjs": `spawnSync("python3", [validator, "--schema", "venture.schema.json", "--file", f]);`,
      "b/message.mjs": "return { error: `does not match packages/naive/src/records/venture.schema.json, so nothing was written` };",
      "b/comment.mjs": `// load(join(repo, "packages/naive/src/records/data-model.json"))\n/* join(root, "schema", schema) */\n * "schema/" + name`,
      "b/script.mjs": `spawnSync("node", [join(root, "schema", script), dir]);\nconst v = join(repo, "packages/naive/src/records/validate.py");`,
      "b/field.mjs": `expect(fix.schema === "packages/naive/src/records/validation-problem.schema.json");\nconst note = { path: "packages/naive/src/records/handoff.schema.json" };`,
      "b/allowed.mjs": `const model = load(join(repo, "packages/naive/src/records/data-model.json"));`,
      "docs/design/preserved/old.mjs": `const model = load(join(repo, "packages/naive/src/records/data-model.json"));`,
    });
    assert.deepEqual(scan(r.dir, r.paths, { "b/allowed.mjs": "a fixture" }), []);
  });

  test("a resolver and packages/naive/src/records/validate.py that disagree fail, on the folder and on the prefixes", () => {
    const folder = repo({});
    const py = join(folder.dir, "packages/naive/src/records/validate.py");
    writeFileSync(py, readFileSync(py, "utf8").replace(/^RECORDS_FOLDER = "packages\/naive\/src\/records"$/m, `RECORDS_FOLDER = "schema"`));
    assert.match(disagreements(folder.dir).join("\n"), /the folder differs/);

    const prefixes = repo({});
    const js = join(prefixes.dir, RESOLVER);
    writeFileSync(js, readFileSync(js, "utf8").replace(`Object.freeze(["packages/naive/src/records/", "schema/"])`, `Object.freeze(["packages/naive/src/records/"])`));
    assert.match(disagreements(prefixes.dir).join("\n"), /the stored prefixes differ/);

    assert.deepEqual(disagreements(repo({}).dir), []);
  });

  test("a mapping the check cannot find fails loudly rather than passing", () => {
    const r = repo({});
    const py = join(r.dir, "packages/naive/src/records/validate.py");
    writeFileSync(py, readFileSync(py, "utf8").replace(/^RECORDS_FOLDER = .*$/m, ""));
    assert.throws(() => disagreements(r.dir), /cannot find RECORDS_FOLDER/);
  });

  test("an allowlist entry for a file that is gone fails, so the list holds only live reasons", () => {
    const r = repo({ "c/kept.mjs": "export {};" });
    assert.deepEqual(staleAllow(r.dir, r.paths, { "c/kept.mjs": "kept", "c/gone.mjs": "gone" }), ["c/gone.mjs"]);
    for (const [file, reason] of Object.entries(ALLOW)) assert.ok(reason.length > 20, `${file} gives a reason`);
  });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`record paths: ${passed} passed`);
