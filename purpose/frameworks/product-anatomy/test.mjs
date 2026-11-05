// Role-rule tests for the Product Anatomy runner. Builds a small venture in a temp folder,
// runs `anatomy.mjs matrix` on it and checks the portfolio roles.
//
//   node purpose/frameworks/product-anatomy/test.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "anatomy-test-"));
const write = (p, v) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), JSON.stringify(v)); };
const card = (id, extra = {}) => ({ id, name: id, description: id, allowed_from: "validation", ...extra });
const a = (o) => ({ promise_delivery: 1, competence_draw: 1, promise_breach: 0.1, job_intensity: 1, ready: 3, revenue: 0, reversibility: 2, ...o });

write("v/venture.json", { id: "t", name: "t", phase: "discovery", core: { promise: "p" } });
write("v/products/kit.json", card("kit"));
write("v/products/part.json", card("part", { part_of: ["kit"] }));
write("v/products/feeder.json", card("feeder", { flows_to: ["kit"] }));
write("v/products/other.json", card("other"));
write("low.json", { scorer: "test", answers: {
  kit: a({ promise_delivery: 3, competence_draw: 3, job_intensity: 3, revenue: 1 }),
  part: a({ promise_delivery: 2, competence_draw: 2, revenue: 1 }),
  feeder: a({ revenue: 1 }),
  other: a({ promise_delivery: 2, competence_draw: 2, revenue: 1 }),
} });

const run = (answers, json) => execFileSync("node", [join(here, "anatomy.mjs"), "matrix", join(dir, "v"), join(dir, answers), ...(json ? ["--json"] : [])], { encoding: "utf8" });
// Roles in the Validation phase, read from the JSON output (A-001), not by parsing the Markdown.
const roles = (answers) => Object.fromEntries(Object.entries(JSON.parse(run(answers, true)).phases.find((p) => p.id === "validation").roles).map(([p, r]) => [p, r.roles.join(" + ")]));

let failed = 0;
const expect = (name, ok) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) failed++; };

const low = roles("low.json");
expect("no revenue engine when the top revenue score is below the threshold", !Object.values(low).some((r) => r.includes("revenue-engine")));
expect("a standalone part of the flagship kit is a wedge", low.part === "wedge");
expect("a product that flows into the flagship is a wedge", low.feeder === "wedge");
expect("a product with neither tie is not a wedge", low.other === "end-product");

write("high.json", { scorer: "test", answers: {
  kit: a({ promise_delivery: 3, competence_draw: 3, job_intensity: 3, revenue: 1 }),
  part: a({ promise_delivery: 2, competence_draw: 2, revenue: 1 }),
  feeder: a({ revenue: 1 }),
  other: a({ promise_delivery: 2, competence_draw: 2, revenue: 2 }),
} });
const high = roles("high.json");
expect("a product at the threshold is the revenue engine", high.other === "revenue-engine");

const md = run("high.json", false).split("\n## ")[0];
const data = JSON.parse(run("high.json", true));
expect("the JSON and the Markdown report the same roles", data.phases.every((ph, i) =>
  Object.entries(ph.role_text).every(([p, r]) => md.split("\n").some((l) => l.startsWith(`| ${p} |`) && l.split("|")[i + 2].trim() === r))));
expect("the JSON names the substrate and a flagship per phase", data.substrate === "kit" && data.phases.every((ph) => ph.flagship === "kit"));

rmSync(dir, { recursive: true, force: true });
if (failed) process.exit(1);
console.log("all role rules hold");
