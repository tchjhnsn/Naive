// Decision roadmaps and lifecycle playbooks: a roadmap orders frames and is rejected for cycles, unknown
// frames, steps with no decider and one-way doors delegated away from the founder; installing it proposes
// each step's decisions open and decides nothing. The phase gate reads its evidence from the venture's
// playbook: product-first by default (unchanged), revenue-first clearing Validation on people paid.

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, ordered, roadmapOf, roadmaps } from "./check-roadmap.mjs";
import { install } from "./roadmaps.mjs";
import { ventureFile } from "../core/venture-paths.mjs";
import { advance, lifecycle, meet, playbookOf, playbooks } from "./lifecycle.mjs";

const repo = new URL("../../../..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "roadmap-"));
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const valid = (schema, file) => spawnSync("python3", [join(repo, "packages/naive/src/records/validate.py"), "--schema", schema, "--file", file], { encoding: "utf8" });

// ---- roadmaps ----
const brand = roadmapOf("brand");
expect("the brand roadmap is in packages/naive/library/packages/marketing and passes its check", brand?.package === "marketing" && check(brand).length === 0, check(brand ?? {}).join("; "));
for (const r of roadmaps()) { const v = valid("decision-roadmap.schema.json", join(repo, r.file)); expect(`${r.file} matches its schema`, v.status === 0, v.stdout + v.stderr); }
expect("the brand roadmap runs ethos to stand, and the stand is the founder's one-way door", ordered(brand).map((s) => s.id).join() === "ethos,audiences,tagline,visual-identity,first-campaign,stand" && brand.steps.find((s) => s.id === "stand").door === "one-way");
const bad = (patch) => check({ ...brand, steps: brand.steps.map((s) => patch[s.id] ? { ...s, ...patch[s.id] } : s) });
expect("a cycle is rejected", bad({ ethos: { depends_on: ["stand"] } }).some((e) => /cycle/.test(e)));
expect("an unknown frame is rejected", bad({ ethos: { frame: "no-such-frame" } }).some((e) => /does not have/.test(e)));
expect("a step with no decider is rejected", bad({ tagline: { decided_by: "" } }).some((e) => /no decider/.test(e)));
expect("a decider that is not a role is rejected", bad({ tagline: { decided_by: "marketing" } }).some((e) => /not a role/.test(e)));
expect("a one-way door delegated away from the founder is rejected", bad({ stand: { decided_by: "marketing-lead" } }).some((e) => /one-way door delegated/.test(e)));
const cli = spawnSync("node", [join(repo, "packages/naive/src/engine/check-roadmap.mjs")], { encoding: "utf8" });
expect("the check passes on the repository's roadmaps", cli.status === 0, cli.stderr);

// ---- install ----
const dir = join(tmp, "tandem");
cpSync(join(repo, "packages/naive/src/records/examples/workspace/ventures/tandem"), dir, { recursive: true });
const { decisions, approve } = await import("./decisions.mjs");
let r = await install(dir, "brand");
expect("install proposes one open decision per step, in order", r.ok && r.result.proposed.map((p) => p.step).join() === "ethos,audiences,tagline,visual-identity,first-campaign,stand", r.error ?? JSON.stringify(r.result));
const ds = decisions(dir).decisions.filter((d) => d.id.startsWith("brand-"));
expect("nothing is decided: every brand decision is open, drafted by an agent", ds.length === 6 && ds.every((d) => d.status === "open"), JSON.stringify(ds.map((d) => [d.id, d.status])));
expect("the stand says it is a one-way door for the founder", /one-way door, decided by founder/.test(readFileSync(ventureFile(dir, "decisions/brand-stand.decision.json"), "utf8")));
approve(dir, "brand-ethos", { by: "maya", answer: "Work should leave people more capable" });
r = await install(dir, "brand");
expect("installing again keeps a decision already made", r.ok && r.result.kept.some((k) => k.id === "brand-ethos") && decisions(dir).decisions.find((d) => d.id === "brand-ethos").status === "decided", JSON.stringify(r.result?.kept));
expect("an unknown roadmap is refused", !(await install(dir, "nope")).ok);

// ---- playbooks ----
expect("product-first and revenue-first exist", ["product-first", "revenue-first"].every((id) => playbookOf(id)));
for (const p of playbooks()) { const f = join(repo, "packages/naive/src/functions/products/frameworks/product-anatomy/playbooks", `${p.id}.json`); const v = valid("lifecycle-playbook.schema.json", f); expect(`${p.id} matches its schema`, v.status === 0, v.stdout + v.stderr); }
const person = { kind: "person", via: "cli", id: "maya" };
let l = lifecycle(dir);
expect("with no playbook named, product-first is read and the gate is unchanged", l.playbook.id === "product-first" && !l.playbook.chosen && l.current.gate === "Product-market fit: retention holds" && l.gate_evidence[0].id === "retention");
const vf = join(dir, "venture.json");
const v = JSON.parse(readFileSync(vf, "utf8"));
writeFileSync(vf, JSON.stringify({ ...v, lifecycle_playbook: "revenue-first" }, null, 2));
const vs = valid("venture.schema.json", vf);
expect("venture.json accepts lifecycle_playbook", vs.status === 0, vs.stdout + vs.stderr);
meet(dir, "retention", { evidence: "evidence/cohort-oct.json", by: person });
meet(dir, "time-saved", { by: person });
l = lifecycle(dir);
expect("under revenue-first, Validation clears on people paid, and retention alone does not clear it", l.current.gate === "People paid" && !l.ready && l.blocking.some((b) => /people paid/i.test(b)), JSON.stringify(l.blocking));
expect("the gate refuses the move", !advance(dir, "beachhead", { by: person }).ok);
writeFileSync(vf, JSON.stringify({ ...v, lifecycle_playbook: "product-first" }, null, 2));
l = lifecycle(dir);
expect("under product-first, met retention evidence clears Validation", l.ready && l.gate_evidence[0].met_by.includes("retention"), JSON.stringify(l));
rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
