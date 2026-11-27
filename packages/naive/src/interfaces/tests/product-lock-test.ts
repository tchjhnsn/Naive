#!/usr/bin/env node
// An open decision that unlocks or decides product cards holds an agent's card until a person decides it. The dogfood
// run found the lock dead: init wrote product-exists with routes under their old names (purpose/product/*) and a
// folder path (products/) that matched no file, so an agent wrote product/naive while the decision was open and
// failed closed. Locks now follow route aliases, and init writes the current names. Every venture lives in a temporary workspace.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../../router/router.ts";
import { approve } from "../../engine/decisions.ts";
import { ventureFile } from "../../core/venture-paths.ts";

const repo = new URL("../../../../..", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: unknown, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "product-lock-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
delete env.MENTURA_ACTOR_ID;
delete process.env.MENTURA_ACTOR_ID;

type Answer = { ok: boolean, locked_by?: string, error?: string };
const writeCard = async (venture: string, id: string): Promise<Answer> => await call({ venture, route: `product/${id}`, action: "write", input: { id, name: id, description: `${id}, for testing the lock` }, workspace: ws, actor: "agent" }) as Answer;
const init = (id: string): string => {
  const r = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.ts"), "init", join(ws, "ventures", id), "--id", id, "--layers", "purpose"], { encoding: "utf8", env });
  expect(`a venture ${id} to test in`, r.status === 0, r.stderr);
  return join(ws, "ventures", id);
};

try {
  // A new venture: init writes product-exists with the current route and path names.
  const dir = init("lock");
  const exists = JSON.parse(readFileSync(ventureFile(dir, "products/decisions/product.exists.decision.json"), "utf8")) as { decides: { path: string }, unlocks: { routes: string[] }[] };
  expect("init writes product-exists over product/, the folder the card route writes", exists.decides.path === "product/" && exists.unlocks[0].routes.includes("product/*"), exists);
  const held = await writeCard("lock", "kettle");
  expect("an agent's card waits while product-exists is open", !held.ok && held.locked_by === "product-exists", held);
  const decided = approve(dir, "product-exists", { by: "Founder", answer: "Yes: one or more products exist" });
  expect("a person decides product-exists", decided.ok, decided);
  const after = await writeCard("lock", "kettle");
  expect("once it is decided, the card is no longer locked by it", after.locked_by !== "product-exists", after);

  // An open unlock holds every agent write it names, a correction of a live card included: the lock fails closed, and
  // a person corrects the card or decides (EE-058).
  const edit = init("edit");
  const person = await call({ venture: "edit", route: "product/kettle", action: "write", input: { id: "kettle", name: "Kettle", description: "A kettle, as first described" }, workspace: ws, actor: "person", actor_id: "Founder" }) as Answer;
  expect("a person writes the first card while product-exists is open", person.ok, person);
  const held2 = await writeCard("edit", "teapot");
  expect("an agent's first card for another product still waits", !held2.ok && held2.locked_by === "product-exists", held2);
  const corrected = await writeCard("edit", "kettle");
  expect("an agent's correction of a live card waits too, until a person decides", !corrected.ok && corrected.locked_by === "product-exists", corrected);

  // A venture made before the fix: its decision still names the old route and folder, and still locks.
  const old = init("legacy");
  const f = ventureFile(old, "products/decisions/product.exists.decision.json");
  const d = JSON.parse(readFileSync(f, "utf8")) as { decides: { path: string }, unlocks: { routes: string[] }[] };
  d.decides.path = "products/";
  d.unlocks[0].routes = ["purpose/product/*"];
  writeFileSync(f, JSON.stringify(d, null, 2) + "\n");
  const legacy = await writeCard("legacy", "kettle");
  expect("an unlock under a renamed route still locks, through the route aliases", !legacy.ok && legacy.locked_by === "product-exists", legacy);

} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("all passing");
