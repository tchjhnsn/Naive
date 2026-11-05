// Design additions from the Next.js translation (EE-073): use model, the gate, uncertain.
// Layout, private and typegen are tested beside the router and check-private.

import { readFileSync } from "node:fs";
import { provenanceOf } from "../../schema/use-model.mjs";
import { hold, packageGates } from "../../schema/gate.mjs";
import { judge } from "../router.mjs";

let failed = 0;
const t = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const ok = (c, m) => { if (!c) throw new Error(m ?? "assertion failed"); };

t("a record downstream of use_model stays agent until a person confirms it or its checks pass", () => {
  ok(provenanceOf({ use_model: ["draft"], confirmed: false, checksPass: false }) === "agent");
  ok(provenanceOf({ use_model: ["draft"], confirmed: true, checksPass: false }) === "clear");
  ok(provenanceOf({ use_model: ["draft"], confirmed: false, checksPass: true }) === "clear");
  ok(provenanceOf({ use_model: [], confirmed: false, checksPass: false }) === "clear");
});

t("the gate holds a fail-closed write as a draft and makes no model or network call", () => {
  ok(hold({ fail_closed: ["foundation"] }, "foundation/problem", "agent")?.hold === "draft");
  ok(hold({ fail_closed: ["foundation"] }, "foundation/problem", "person") === null);
  ok(hold({ fail_closed: ["foundation"] }, "validation/solution", "agent") === null);
  const src = readFileSync(new URL("../../schema/gate.mjs", import.meta.url), "utf8");
  ok(!/\bfetch\s*\(|\bhttps?:\/\/|child_process|node:http|node:https/.test(src), "gate.mjs calls out");
  ok(packageGates().some((g) => g.package === "foundation"));
});

t("a judgment below its threshold is uncertain, not an error and not an answer", () => {
  const u = judge(0.4, 0.7, "founder");
  ok(u.outcome === "uncertain" && u.owner === "founder" && u.result === null && u.ok !== false, JSON.stringify(u));
  ok(judge(0.9, 0.7, "founder").outcome === "answer");
});

if (failed) { console.error(`${failed} test(s) failed`); process.exit(1); }
console.log("all design addition tests pass");
