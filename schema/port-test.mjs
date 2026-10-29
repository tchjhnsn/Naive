#!/usr/bin/env node
// Tests for naive port (EE-076) on a made-up project: files land where their names point, a nested
// repository becomes a pointer, code and bank data stay behind, the project is never written to,
// nothing in the venture is overwritten, and a plan goes stale when its source changes.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entries } from "../interface/provenance.mjs";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const naive = (...a) => spawnSync("node", [join(repo, "interface/cli/naive.mjs"), ...a], { encoding: "utf8" });
const tree = (d, r = "") => readdirSync(join(d, r), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? tree(d, join(r, e.name))
  : [`${join(r, e.name)} ${createHash("sha256").update(readFileSync(join(d, r, e.name))).digest("hex")} ${statSync(join(d, r, e.name)).mtimeMs}`]).sort();

const ws = mkdtempSync(join(tmpdir(), "port-test-"));
const src = join(ws, "old-project");
const files = {
  "README.md": "# Old project\n",
  "notes/problem-statement.md": "Clinics lose a day a week to scheduling.\n",
  "notes/icp.md": "Solo physiotherapy clinics.\n",
  "research/interview-ana.md": "Ana spends Mondays on the phone.\n",
  "money/pricing.md": "$49 a month.\n",
  "money/bank-statement-2026-09.csv": "date,amount\n",
  "marketing/landing-copy.md": "Book in one tap.\n",
  "Brand/brand-guide.md": "Teal and white.\n",
  "docs/roadmap.md": "Q4: reminders.\n",
  "legal/operating-agreement.md": "Members: one.\n",
  "misc/random-thoughts.md": "Maybe a podcast.\n",
  "app/package.json": "{}\n",
  "app/index.js": "console.log(1)\n",
  "scripts/deploy.sh": "echo deploy\n",
};
for (const [f, text] of Object.entries(files)) { mkdirSync(join(src, f, ".."), { recursive: true }); writeFileSync(join(src, f), text); }
const before = tree(src);

const dir = join(ws, "ventures", "clinic");
const init = spawnSync("node", [join(repo, "schema/init-venture.mjs"), dir, "clinic"], { encoding: "utf8" });
expect("a new venture is created to port into", init.status === 0, init.stderr);

const p = naive("port", "--from", src, "--venture", dir);
expect("port writes a plan", p.status === 0 && existsSync(join(dir, ".release/port-plan.json")), p.stderr);
const planned = JSON.parse(readFileSync(join(dir, ".release/port-plan.json"), "utf8"));
const item = (f) => planned.items.find((i) => i.from === f);
expect("writing the plan changes nothing in the venture's package directories", !existsSync(join(dir, "foundation/problem-statement.md")));
expect("a problem statement goes to foundation/, kept as it is", item("notes/problem-statement.md")?.to === "foundation/problem-statement.md" && item("notes/problem-statement.md").confidence === "high");
expect("an ICP goes to foundation/", item("notes/icp.md")?.to === "foundation/icp.md");
expect("an interview goes to validation/", item("research/interview-ana.md")?.to === "validation/interview-ana.md");
expect("pricing goes to finance/", item("money/pricing.md")?.to === "finance/pricing.md");
expect("landing copy goes to marketing/", item("marketing/landing-copy.md")?.to === "marketing/landing-copy.md");
expect("a roadmap goes to product/", item("docs/roadmap.md")?.to === "product/roadmap.md");
expect("a legal document goes to _private/legal/", item("legal/operating-agreement.md")?.to === "_private/legal/operating-agreement.md");
expect("bank data is left behind for the bank connection", item("money/bank-statement-2026-09.csv")?.action === "leave");
expect("a nested code repository becomes a pointer, not files", item("app")?.action === "point" && !item("app/index.js"));
expect("loose code is left behind", item("scripts/deploy.sh")?.action === "leave");
expect("a file that matches nothing is left behind by name", item("misc/random-thoughts.md")?.action === "leave" && /migrate/.test(item("misc/random-thoughts.md").reason));

const unconfirmed = naive("port", "--venture", dir, "--apply");
expect("applying needs the founder to type the confirmation", unconfirmed.status !== 0 && !existsSync(join(dir, "foundation/icp.md")));

// The founder changes one item before applying: the brand guide stays behind.
planned.items.find((i) => i.from === "Brand/brand-guide.md").action = "leave";
writeFileSync(join(dir, ".release/port-plan.json"), JSON.stringify(planned, null, 2));
const a = naive("port", "--venture", dir, "--apply", "--confirm", "port");
expect("the plan is carried out", a.status === 0, a.stderr);
expect("ported files are byte for byte the originals", readFileSync(join(dir, "foundation/problem-statement.md"), "utf8") === files["notes/problem-statement.md"]);
expect("an item the founder set to leave is not ported", !existsSync(join(dir, "marketing/brand-guide.md")));
const log = entries(dir).filter((e) => e.activity === "port");
expect("every port is in provenance with the file it came from", log.some((e) => e.entity === "foundation/icp.md" && e.derived_from?.[0] === `file://${join(src, "notes/icp.md")}`));
const sources = JSON.parse(readFileSync(join(dir, "knowledge/sources.json"), "utf8"));
expect("the repository is a read-only filesystem source", sources.sources.some((s) => s.id === "app" && s.connector === "filesystem" && s.writes === "none" && s.root === join(src, "app")));
const chk = spawnSync("node", [join(repo, "schema/check-sources.mjs"), join(ws)], { encoding: "utf8" });
expect("the source map it writes passes the sources check", chk.status === 0, chk.stdout + chk.stderr);
expect("the project is never written to", JSON.stringify(tree(src)) === JSON.stringify(before));

const again = naive("port", "--venture", dir, "--apply", "--confirm", "port");
expect("applying twice refuses to overwrite", again.status !== 0 && /never overwrites/.test(again.stderr));
const replan = JSON.parse(naive("port", "--from", src, "--venture", dir).status === 0 ? readFileSync(join(dir, ".release/port-plan.json"), "utf8") : "{}");
expect("a fresh plan leaves behind what the venture already has", replan.items?.find((i) => i.from === "notes/icp.md")?.action === "leave");

writeFileSync(join(src, "notes/problem-statement.md"), "Changed.\n");
const stale = JSON.parse(readFileSync(join(dir, ".release/port-plan.json"), "utf8"));
stale.items.find((i) => i.from === "Brand/brand-guide.md").action = "port";
writeFileSync(join(dir, ".release/port-plan.json"), JSON.stringify(stale));
writeFileSync(join(src, "Brand/brand-guide.md"), "Changed too.\n");
const s = naive("port", "--venture", dir, "--apply", "--confirm", "port");
expect("a plan whose source changed is refused", s.status !== 0 && /changed since the plan/.test(s.stderr));

const inside = spawnSync("node", [join(repo, "schema/init-venture.mjs"), join(src, "v"), "v"], { encoding: "utf8" });
const ins = naive("port", "--from", src, "--venture", join(src, "v"));
expect("a venture inside the project it ports from is refused", inside.status === 0 && ins.status !== 0);

const up = naive("upgrade");
expect("naive upgrade runs the layout upgrade (and asks for a venture)", up.status === 2 && /upgrade-venture/.test(up.stderr));

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
