#!/usr/bin/env node
// Tests for naive migrate (EE-076), with a stand-in agent (schema/examples/migrate/agent.mjs): the
// agent's records become a plan and one open decision per function; nothing is written until a
// person decides; then records go through the router's schema with provenance; the project is never
// written to; secrets are never opened; and a failing agent says why.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entries } from "../packages/core/provenance.mjs";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };

const base = mkdtempSync(join(tmpdir(), "migrate-test-"));
const src = join(base, "old-project"), ws = join(base, "workspace");
mkdirSync(join(src, "notes"), { recursive: true }); mkdirSync(join(ws, "ventures"), { recursive: true });
writeFileSync(join(src, "notes/plan.md"), "# Plan\n\nWe sell kettles to cafes.\n");
writeFileSync(join(src, "brand.md"), "# Brand\n\nWarm, plain, local.\n");
writeFileSync(join(src, ".env"), "NOT_A_REAL_KEY=1\n");
writeFileSync(join(src, "id_rsa"), "NOT_A_REAL_KEY\n");
writeFileSync(join(src, "logo.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]));
const fingerprint = () => createHash("sha256").update(JSON.stringify(readdirSync(src, { recursive: true }).sort()
  .map((f) => [f, statSync(join(src, f)).isFile() ? readFileSync(join(src, f)).toString("hex") : "dir"]))).digest("hex");
const before = fingerprint();

const env = { ...process.env, MENTURA_WORKSPACE: ws, MENTURA_AGENT_CMD: `node ${join(repo, "schema/examples/migrate/agent.mjs")}` };
const naive = (...a) => spawnSync("node", [join(repo, "interface/cli/naive.mjs"), ...a], { env, encoding: "utf8" });
const mentura = (...a) => spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), ...a], { env, encoding: "utf8" });
const init = (id) => spawnSync("node", [join(repo, "schema/init-venture.mjs"), join(ws, "ventures", id), id], { encoding: "utf8" }).status === 0;

const dir = join(ws, "ventures", "kettle");
expect("a new venture is created to migrate into", init("kettle"));
const p = naive("migrate", "--from", src, "--venture", dir);
expect("migrate writes a plan", p.status === 0 && existsSync(join(dir, ".release/migrate-plan.json")), p.stderr);
const planned = JSON.parse(readFileSync(join(dir, ".release/migrate-plan.json"), "utf8"));
expect("the agent's record is planned on a real route, citing the file it came from", planned.items.length === 1 && planned.items[0].route === "product/kettle" && planned.items[0].from[0] === "notes/plan.md");
expect("what the agent did not use is left behind, with why", planned.left_behind.some((l) => l.from === "brand.md") && planned.left_behind.some((l) => l.from === "logo.png"));
expect("secrets are never opened, and never reach the plan or the agent", planned.left_behind.filter((l) => /secret/.test(l.why)).length === 2 && !readFileSync(join(dir, ".release/migrate-plan.json"), "utf8").includes("NOT_A_REAL_KEY"));
expect("one open decision per function is proposed", existsSync(join(dir, "decisions/migrate-product.decision.json")) && JSON.parse(readFileSync(join(dir, "decisions/migrate-product.decision.json"), "utf8")).status === "open");

const waiting = naive("migrate", "--venture", dir, "--apply");
expect("nothing is written while the decision is open", waiting.status === 0 && /1 waiting/.test(waiting.stdout) && !existsSync(join(dir, "product/kettle.json")), waiting.stdout + waiting.stderr);

const d = mentura("decide", "migrate-product", "--venture", "kettle", "--by", "Test", "--confirm", "migrate-product");
expect("a person decides", d.status === 0, d.stderr);
const a = mentura("migrate", "--venture", "kettle", "--apply");
expect("apply writes the record through the router", a.status === 0 && /1 brought/.test(a.stdout), a.stdout + a.stderr);
const rec = existsSync(join(dir, "product/kettle.json")) ? JSON.parse(readFileSync(join(dir, "product/kettle.json"), "utf8")) : {};
expect("the record holds what the project said, rewritten into Naive's shape", rec.description === "We sell kettles to cafes.");
expect("its provenance names the decision and the file it was derived from", entries(dir).some((e) => e.entity === "product/kettle.json" && e.decision === "migrate-product" && e.derived_from?.[0] === `file://${join(src, "notes/plan.md")}`));
expect("the project is never written to", fingerprint() === before);
for (const c of ["check-ventures", "check-provenance", "check-sources"]) {
  const r = spawnSync("node", [join(repo, `schema/${c}.mjs`), ws], { encoding: "utf8" });
  expect(`the migrated venture passes ${c}`, r.status === 0, r.stdout + r.stderr);
}

expect("a second venture for the failing agent", init("kettle2"));
const bad = spawnSync("node", [join(repo, "interface/cli/naive.mjs"), "migrate", "--from", src, "--venture", join(ws, "ventures", "kettle2")], { env: { ...env, MENTURA_AGENT_CMD: "node -e process.exit(3)" }, encoding: "utf8" });
expect("a failing agent stops the migrate and says so, with nothing planned", bad.status === 1 && /agent/.test(bad.stderr) && !existsSync(join(ws, "ventures/kettle2/.release/migrate-plan.json")), bad.stderr);

const up = mentura("migrate", "--venture", "kettle");
expect("mentura migrate without --from still runs upgrade for one release, with a notice", /now naive upgrade/.test(up.stderr));

// Port opens no file at all: its plan names the folder, never what is in it.
const pdir = join(ws, "ventures", "kettle3");
init("kettle3");
const port = naive("port", src, "--venture", pdir);
const pplan = readFileSync(join(pdir, ".release/port-plan.json"), "utf8");
expect("port never opens a secret either", port.status === 0 && !/NOT_A_REAL_KEY|kettles/.test(pplan) && !/sha256/.test(pplan), port.stderr);

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
