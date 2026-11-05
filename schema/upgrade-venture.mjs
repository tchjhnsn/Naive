#!/usr/bin/env node
// naive upgrade: moves one venture onto the installed Naive, like next upgrade and its codemods
// (EE-076, U-1 to U-6). The work is in schema/upgrades.mjs; this is its command line.
//
//   node schema/upgrade-venture.mjs <venture dir>                 run the migrations and pin the framework and packages
//   node schema/upgrade-venture.mjs <venture dir> --check         say what it would do; change nothing
//   node schema/upgrade-venture.mjs <venture dir> --guide [x.y.z] the guide for each version it crosses, or for one
//   node schema/upgrade-venture.mjs <venture dir> --canary|--stable   the channel (experimental packages need canary)
//   node schema/upgrade-venture.mjs <venture dir> --adopt <package>   adopt a later phase's package now
//   node schema/upgrade-venture.mjs <venture dir> --drop <package>    undo that
//   node schema/upgrade-venture.mjs <venture dir> --stage         upgrade a copy under .naive/upgrade/ and run the checks
//   node schema/upgrade-venture.mjs <venture dir> --agent         the same, with an agent working the copy (a Mentura kit)
//   node schema/upgrade-venture.mjs <venture dir> --status        the staged upgrade and its checks
//   node schema/upgrade-venture.mjs <venture dir> --accept --confirm upgrade   land a staged upgrade whose checks pass
//   node schema/upgrade-venture.mjs <venture dir> --reject        discard it
//   node schema/upgrade-venture.mjs --framework [<venture dir>]   update the installed framework first (git pull --ff-only)
//
// Files move with git mv when git tracks them. Provenance is appended, never rewritten. Old routes keep
// resolving through interface/route-aliases.json. --json prints the result as JSON.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { accept, adopt, check, CONFIRM, draft, drop, guide, plan, registry, reject, setChannel, stage, updateFramework, upgrade } from "./upgrades.mjs";
import { kitFor } from "./kits.mjs";

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : undefined; };
const valued = new Set(["guide", "adopt", "drop", "confirm", "by"]);
const dirArg = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && valued.has(argv[i - 1].slice(2))));
const json = has("json");
const say = (x, text) => console.log(json ? JSON.stringify(x, null, 2) : text);
const fail = (e) => { console.error(e.message ?? String(e)); process.exit(1); };
const usage = () => { console.error("usage: node schema/upgrade-venture.mjs <venture dir> [--check | --guide [version] | --canary | --stable | --adopt <package> | --drop <package> | --stage | --agent | --status | --accept --confirm upgrade | --reject] [--json]\n       node schema/upgrade-venture.mjs --framework [<venture dir>]"); process.exit(2); };

if (has("framework")) {
  const r = updateFramework();
  if (!r.ok) fail(new Error(r.error));
  console.log(r.commits ? `updated Naive from ${r.from} to ${r.to} (${r.commits} commits)` : `Naive ${r.to} is up to date`);
  if (!dirArg) process.exit(0);
  // The upgrade runs in the code just pulled, not the code this process loaded.
  const rest = argv.filter((a) => a !== "--framework");
  process.exit(spawnSync("node", [new URL(import.meta.url).pathname, ...rest], { stdio: "inherit" }).status ?? 1);
}

if (!dirArg || !existsSync(join(dirArg, "venture.json"))) usage();
const dir = resolve(dirArg);
const id = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).id;

try {
  if (has("guide")) {
    const reg = registry();
    const versions = opt("guide") ? [opt("guide")] : plan(dir).steps.map((s) => s.version);
    if (!versions.length) { say({ guides: [] }, `${id} is on Naive ${reg.framework}: no guide to read`); process.exit(0); }
    const gs = versions.map((v) => guide(v, { reg }) ?? { version: v, path: null, text: `Naive ${v} has no guide.` });
    say(gs, gs.map((g) => `${g.path ? `# ${g.path}\n\n` : ""}${g.text.replace(/^---\n[\s\S]*?\n---\n\n?/, "")}`).join("\n"));
  } else if (has("canary") || has("stable")) {
    const r = setChannel(dir, has("canary") ? "canary" : "stable");
    say(r, r.changed ? `${id} is on the ${r.channel} channel` : `${id} was already on the ${r.channel} channel`);
  } else if (opt("adopt")) {
    const r = adopt(dir, opt("adopt"));
    say(r, r.changed ? `adopted ${r.name} ${r.version} early${r.channel === "experimental" ? " (experimental)" : ""}: it opens now in the venture package` : r.note);
  } else if (opt("drop")) {
    const r = drop(dir, opt("drop"));
    say(r, `dropped ${r.name}: it fits by its phase again`);
  } else if (has("stage")) {
    await stage(dir);
    const d = check(dir);
    report(d);
  } else if (has("agent")) {
    // The agent-run upgrade is a Mentura kit (U-3, I-29): the framework finds it and runs it as its own process.
    const k = kitFor("upgrade --agent");
    if (!k) fail(new Error("an agent-run upgrade is a Mentura kit (agent-upgrade, in the folder NAIVE_KITS names), and none is installed here; --stage upgrades a copy without an agent"));
    process.exit(spawnSync("node", [join(k.dir, k.entry), dir, ...(json ? ["--json"] : [])], { stdio: "inherit" }).status ?? 1);
  } else if (has("status")) {
    const d = draft(dir);
    if (!d) { say(null, `no upgrade is staged for ${id}`); process.exit(0); }
    report(check(dir));
  } else if (has("accept")) {
    const r = await accept(dir, { confirm: opt("confirm"), by: opt("by") ?? process.env.MENTURA_PERSON });
    say(r, `accepted: ${id} is on Naive ${r.accepted} (${r.added} added, ${r.changed} changed, ${r.removed} removed)`);
  } else if (has("reject")) {
    say(reject(dir), `rejected the staged upgrade of ${id}; the venture is as it was`);
  } else {
    const r = await upgrade(dir, { dry: has("check") });
    if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
    const moves = r.release.migrations.reduce((n, m) => n + m.moves.length, 0), rewrites = r.release.migrations.reduce((n, m) => n + m.rewrote.length, 0);
    const pinned = r.packages.filter((x) => !x.missing && x.from !== x.to);
    if (!r.pending && !r.changed) console.log(`${id} is on Naive ${r.to}, every package pinned: nothing to upgrade.`);
    else console.log(`${r.dry ? "would upgrade" : "upgraded"} ${id} from Naive ${r.from} to ${r.to}: ${moves} files moved, ${rewrites} records rewritten, ${pinned.length} packages pinned, ${r.release.escalated.length} escalated for a decision.`);
    for (const m of r.release.migrations) if (m.moves.length || m.rewrote.length || m.notes.length) console.log(`migrate   ${m.id} (${m.version}): ${m.moves.length} moved, ${m.rewrote.length} rewritten${m.notes.length ? `; ${m.notes.join("; ")}` : ""}`);
    for (const e of r.release.escalated) console.log(`escalate  ${e}`);
    for (const g of r.release.guides) console.log(`guide     ${g}`);
    if (r.release.guides.length) console.log(`Read the guides: node interface/cli/naive.mjs upgrade ${dirArg} --guide`);
  }
} catch (e) { fail(e); }

function report(d) {
  if (json) { console.log(JSON.stringify(d, null, 2)); return; }
  console.log(`staged upgrade of ${id} from Naive ${d.from} to ${d.to}${d.by && d.by !== "naive" ? `, worked by ${d.by}` : ""}: ${d.status}`);
  if (d.changes) console.log(`changes   ${d.changes.added.length} added, ${d.changes.changed.length} changed, ${d.changes.removed.length} removed`);
  for (const c of d.checks ?? []) console.log(`${c.passed ? "pass" : "FAIL"}      ${c.check}${c.passed ? "" : `: ${c.output.split("\n").slice(-2).join(" / ")}`}`);
  for (const e of d.escalated ?? []) console.log(`escalate  ${e}`);
  if (d.status === "ready") console.log(`Nothing has landed. To land it: node interface/cli/naive.mjs upgrade ${dirArg} --accept --confirm ${CONFIRM}`);
  else if (d.status === "checks-failed") console.log(`Nothing has landed, and it cannot until the checks pass. Fix the copy in ${dirArg}/.naive/upgrade/venture and run --status, or --reject.`);
}
