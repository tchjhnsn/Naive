// Tests a founder's own frameworks: list, new, check (schema and canonical maps_to) and publish (dry run only).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkUserFrameworks, listFrameworks, newFramework, publishFramework, resolveFramework } from "./user-frameworks.mjs";

const ws = mkdtempSync(join(tmpdir(), "naive-fw-"));
writeFileSync(join(ws, "naive-workspace.json"), JSON.stringify({ schema: "everything-ecosystem", schema_version: "0.5.0", ventures: ["v"] }));
mkdirSync(join(ws, "v"));
const cli = (...a) => spawnSync("node", [new URL("../interface/cli/naive.mjs", import.meta.url).pathname, ...a], { cwd: join(ws, "v"), encoding: "utf8" });

// new scaffolds the three files, and list marks built-in and workspace frameworks
newFramework("now-what", join(ws, "v"), { owner: "Torian" });
for (const f of ["framework.json", "template.md", "playbook.md"]) assert.ok(existsSync(join(ws, "frameworks/now-what", f)), f);
const all = listFrameworks(join(ws, "v")).frameworks;
assert.ok(all.some((f) => f.id === "telos" && f.source === "built-in"));
assert.ok(all.some((f) => f.id === "now-what" && f.source === "workspace"));
assert.equal(resolveFramework("now-what", join(ws, "v")).source, "workspace", "a venture resolves a workspace framework like a built-in one");
assert.throws(() => newFramework("now-what", ws), /already exists/);
assert.throws(() => newFramework("Bad Id", ws), /lowercase/);
assert.match(cli("framework", "list").stdout, /\[workspace\] now-what/);

// check: valid as scaffolded; fails on a non-canonical route, a bad enum and a missing playbook
assert.deepEqual(checkUserFrameworks("now-what", ws).errors, []);
assert.equal(cli("framework", "check", "now-what").status, 0);
const p = join(ws, "frameworks/now-what/framework.json");
const good = readFileSync(p, "utf8");
const bad = JSON.parse(good);
bad.maps_to[0].canonical_route = "purpose/telos";
bad.status = "final";
bad.playbook = "frameworks/now-what/missing.md";
writeFileSync(p, JSON.stringify(bad));
const errs = checkUserFrameworks("now-what", ws).errors.join("\n");
assert.match(errs, /not a canonical route/);
assert.match(errs, /final/);
assert.match(errs, /missing\.md not found/);
assert.equal(cli("framework", "check").status, 1);
writeFileSync(p, good);

// publish: packs a bundle on --dry-run, refuses a real publish with exit 2, and flags a secret in the bundle
const dry = publishFramework("now-what", ws, { dryRun: true });
assert.equal(dry.code, 0, dry.message);
const bundle = JSON.parse(readFileSync(join(ws, ".naive/publish/frameworks/now-what.json"), "utf8"));
assert.deepEqual(Object.keys(bundle.files).sort(), ["framework.json", "playbook.md", "template.md"]);
assert.equal(publishFramework("now-what", ws).code, 2);
assert.equal(cli("framework", "publish", "now-what").status, 2);
writeFileSync(join(ws, "frameworks/now-what/playbook.md"), "token: ghp_" + "a".repeat(36) + "\n");
assert.equal(publishFramework("now-what", ws, { dryRun: true }).code, 1, "a secret in the bundle fails the dry run");
console.log("user frameworks: list, new, check and publish --dry-run behave");
