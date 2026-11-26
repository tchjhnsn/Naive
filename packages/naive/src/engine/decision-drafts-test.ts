// Tests that every agent's draft held for a person gets a decision that accepts it (decisions in ./decisions.ts): a
// draft of a single-file record, a lone draft of a foundation statement settled through the statement, and several
// drafts of one foundation collection (two ICP profiles), each with its own accept decision that renders now and never
// waits on the statement it would settle.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import { decisions } from "./decisions.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail?: unknown): void => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};

const repo = new URL("../../../..", import.meta.url).pathname;
const ws = mkdtempSync(join(tmpdir(), "decision-drafts-"));
const dir = join(ws, "acme");
const made = spawnSync("node", ["packages/naive/src/engine/init-venture.ts", dir, "acme", "--type", "software-startup"], { cwd: repo, encoding: "utf8" });
expect("a software startup venture starts", made.status === 0, made.stderr);

const hold = (path: string, rec: unknown) => {
  mkdirSync(ventureFile(dir, "_drafts"), { recursive: true });
  writeFileSync(ventureFile(dir, `_drafts/${path.replace(/\//g, "__")}.draft`), JSON.stringify(rec) + "\n");
};
/** The open decisions whose action accepts the record at route, with how each renders. */
const acceptsOf = (route: string) => decisions(dir).decisions.filter((d) => d.status === "open" && d.action?.kind === "accept" && d.action.route === route);

try {
  hold("foundation/icp/shop-owners.json", { id: "shop-owners", name: "Shop owners" });
  const one = acceptsOf("foundation/icp/shop-owners");
  expect("a lone ICP draft is accepted through its statement, which names the draft", one.length === 1 && one[0].id === "foundation-icp" && one[0].render === "now" && one[0].question.includes("foundation/icp/shop-owners.json"), one);

  hold("foundation/icp/cafe-owners.json", { id: "cafe-owners", name: "Cafe owners" });
  const routes = ["foundation/icp/cafe-owners", "foundation/icp/shop-owners"];
  const each = routes.map(acceptsOf);
  expect("with two ICP drafts, each has exactly one decision that accepts it", each.every((ds) => ds.length === 1), each.map((ds) => ds.map((d) => d.id)));
  expect("each accept decision renders now: none waits on the statement it settles", each.flat().every((d) => d.render === "now"), each.flat().map((d) => [d.id, d.render, d.held_by]));
  expect("each is part of the foundation", each.flat().every((d) => d.part_of === "foundation"), each.flat().map((d) => d.part_of));

  hold("marketing/brand.json", { name: "Acme" });
  const brand = acceptsOf("marketing/brand");
  expect("a draft of a record outside the foundation gets its own accept decision, as before", brand.length === 1 && brand[0].id === "draft-marketing-brand" && brand[0].render === "now" && brand[0].part_of === undefined, brand);

  expect("the matrix has no errors", decisions(dir).errors.length === 0, decisions(dir).errors);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("decision drafts: all pass");
