// The workspace: its schema, cross-venture reads, naive capture and the founder's inbox.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assign, canRead, capture, checkWorkspace, crossRead, inbox, loadWorkspace } from "./workspace.mjs";

const root = mkdtempSync(join(tmpdir(), "naive-ws-"));
const put = (f, o) => { mkdirSync(join(root, f, ".."), { recursive: true }); writeFileSync(join(root, f), typeof o === "string" ? o : JSON.stringify(o)); };
put("naive-workspace.json", { schema: "everything-ecosystem", schema_version: "0.5.0", name: "Naive workspace", ventures: ["bees", "boats"], settings: { cross_venture_reads: true, route_threshold: 0.5 } });
put("bees/venture.json", { id: "bees", name: "Bees" });
put("bees/foundation/problem.json", { statement: "Beekeepers lose hives to mites every winter and cannot track colony health" });
put("boats/venture.json", { id: "boats", name: "Boats" });
put("boats/foundation/problem.json", { statement: "Sailors cannot find marina berths or book moorings in the harbor" });
put("boats/artifacts/deck.json", { published: true, title: "Harbor deck" });
put("boats/artifacts/draft.json", { published: false });
put("boats/_private/artifacts/x.json", { published: true });
let pass = 0; const t = (n, f) => { f(); pass++; console.log(`pass  ${n}`); };
const w = loadWorkspace(root);

t("the workspace file matches its schema; settings default when absent", () => {
  assert.equal(checkWorkspace(root), null);
  assert.deepEqual(loadWorkspace(mkdtempSync(join(tmpdir(), "x-"))).settings, { cross_venture_reads: true, route_threshold: 0.8 });
});
t("a bad setting fails the schema", () => {
  const r2 = mkdtempSync(join(tmpdir(), "naive-ws-"));
  writeFileSync(join(r2, "naive-workspace.json"), JSON.stringify({ schema: "everything-ecosystem", schema_version: "0.5.0", ventures: [], settings: { route_threshold: 2 } }));
  assert.notEqual(checkWorkspace(r2), null);
});
t("cross-venture reads: published artifacts only, never records or _private", () => {
  assert.equal(canRead(w, "bees", "boats", "artifacts/deck.json").ok, true);
  assert.equal(canRead(w, "bees", "boats", "artifacts/draft.json").ok, false);
  assert.equal(canRead(w, "bees", "boats", "foundation/problem.json").ok, false);
  assert.equal(canRead(w, "bees", "boats", "_private/artifacts/x.json").ok, false);
  assert.equal(canRead({ ...w, settings: { ...w.settings, cross_venture_reads: false } }, "bees", "boats", "artifacts/deck.json").ok, false);
  assert.equal(crossRead(w, "bees", "boats", "artifacts/deck.json").artifact.title, "Harbor deck");
  assert.match(readFileSync(join(root, "meta/provenance.jsonl"), "utf8"), /cross-venture-read/);
});
let r;
t("naive capture keeps the whole text in raw/ and routes sure chunks to a venture inbox", () => {
  r = capture(w, "Mites killed three hives this winter; colony health tracking for beekeepers.\n\nSomething about lunch tomorrow.");
  assert.match(readFileSync(join(root, r.raw), "utf8"), /lunch tomorrow/);
  assert.equal(r.chunks.length, 2);
  assert.match(r.chunks[0].to, /^bees:raw\/inbox\//);
  assert.match(readFileSync(join(root, "bees/raw/inbox", `${r.chunks[0].id}.md`), "utf8"), /status: draft\nsource: workspace:raw\//);
  assert.equal(r.chunks[1].to, `inbox/${r.chunks[1].id}.json`);
});
t("naive inbox lists waiting chunks; assign moves one and logs the choice", () => {
  assert.equal(inbox(w).length, 1);
  assign(w, r.chunks[1].id, "boats");
  assert.equal(inbox(w).length, 0);
  assert.ok(existsSync(join(root, "boats/raw/inbox", `${r.chunks[1].id}.md`)));
  assert.equal(JSON.parse(readFileSync(join(root, "meta/routing-log.jsonl"), "utf8").trim()).chosen, "boats");
});
t("the CLI runs capture and inbox from inside a venture", () => {
  const cli = (...a) => spawnSync("node", [new URL("../interfaces/cli/naive.mjs", import.meta.url).pathname, ...a], { cwd: join(root, "bees"), encoding: "utf8" });
  assert.match(cli("capture", "harbor moorings").stdout, /kept raw\//);
  assert.equal(cli("inbox", "list").status, 0);
  assert.equal(cli("read", "boats", "foundation/problem.json").status, 1);
  assert.equal(readdirSync(join(root, "raw")).length, 2);
});
console.log(`\n${pass} passing`);
