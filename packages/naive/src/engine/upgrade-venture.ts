#!/usr/bin/env node
// naive upgrade: moves one venture onto the installed Naive, like next upgrade and its codemods
// (EE-076, U-1 to U-6). The work is in packages/naive/src/engine/upgrades.ts; this is its command line.
//
//   node packages/naive/src/engine/upgrade-venture.ts <venture dir>                 run the migrations and pin the framework and packages
//   node packages/naive/src/engine/upgrade-venture.ts <venture dir> --check         say what it would do; change nothing
//   node packages/naive/src/engine/upgrade-venture.ts <venture dir> --guide [x.y.z] the guide for each version it crosses, or for one
//   node packages/naive/src/engine/upgrade-venture.ts <venture dir> --canary|--stable   the channel (experimental packages need canary)
//   node packages/naive/src/engine/upgrade-venture.ts <venture dir> --adopt <package>   adopt a later phase's package now
//   node packages/naive/src/engine/upgrade-venture.ts <venture dir> --drop <package>    undo that
//   node packages/naive/src/engine/upgrade-venture.ts <venture dir> --stage         upgrade a copy under .naive/upgrade/ and run the checks
//   node packages/naive/src/engine/upgrade-venture.ts <venture dir> --agent         the same, with an agent working the copy (a Mentura kit)
//   node packages/naive/src/engine/upgrade-venture.ts <venture dir> --status        the staged upgrade and its checks
//   node packages/naive/src/engine/upgrade-venture.ts <venture dir> --accept --confirm upgrade   land a staged upgrade whose checks pass
//   node packages/naive/src/engine/upgrade-venture.ts <venture dir> --reject        discard it
//   node packages/naive/src/engine/upgrade-venture.ts --framework [<venture dir>]   update the installed framework first (git pull --ff-only)
//
// Files move with git mv when git tracks them. Provenance is appended, never rewritten. Old routes keep
// resolving through packages/naive/src/router/route-aliases.json. Each function listed in venture.json departments gets
// its starter research program at programs/<function>.md when that file is missing (packages/naive/src/engine/research-programs.ts).
// --json prints the result as JSON.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { accept, adopt, check, CONFIRM, draft, drop, guide, plan, registry, reject, setChannel, stage, updateFramework, upgrade } from "./upgrades.ts";
import { kitFor } from "./kits.ts";

const argv = process.argv.slice(2);
const has = (n: string) => argv.includes(`--${n}`);
const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : undefined; };
const valued = new Set(["guide", "adopt", "drop", "confirm", "by"]);
const dirArg = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && valued.has(argv[i - 1].slice(2))));
const json = has("json");
const say = (x: unknown, text: string) => console.log(json ? JSON.stringify(x, null, 2) : text);
function fail(e: unknown): never { console.error((e as Error).message ?? String(e)); process.exit(1); }
function usage(): never { console.error("usage: node packages/naive/src/engine/upgrade-venture.ts <venture dir> [--check | --guide [version] | --canary | --stable | --adopt <package> | --drop <package> | --stage | --agent | --status | --accept --confirm upgrade | --reject] [--json]\n       node packages/naive/src/engine/upgrade-venture.ts --framework [<venture dir>]"); process.exit(2); }

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

const guideVersion = opt("guide"), adoptName = opt("adopt"), dropName = opt("drop");

try {
  if (has("guide")) {
    const reg = registry();
    const versions = guideVersion ? [guideVersion] : plan(dir).steps.map((s) => s.version);
    if (!versions.length) { say({ guides: [] }, `${id} is on Naive ${reg.framework}: no guide to read`); process.exit(0); }
    const gs = versions.map((v) => guide(v, { reg }) ?? { version: v, path: null, text: `Naive ${v} has no guide.` });
    say(gs, gs.map((g) => `${g.path ? `# ${g.path}\n\n` : ""}${g.text.replace(/^---\n[\s\S]*?\n---\n\n?/, "")}`).join("\n"));
  } else if (has("canary") || has("stable")) {
    const r = setChannel(dir, has("canary") ? "canary" : "stable");
    say(r, r.changed ? `${id} is on the ${r.channel} channel` : `${id} was already on the ${r.channel} channel`);
  } else if (adoptName) {
    const r = adopt(dir, adoptName);
    say(r, r.changed ? `adopted ${r.name} ${r.version} early${r.channel === "experimental" ? " (experimental)" : ""}: it opens now in the venture package` : r.note);
  } else if (dropName) {
    const r = drop(dir, dropName);
    say(r, `dropped ${r.name}: it fits by its phase again`);
  } else if (has("stage")) {
    await stage(dir);
    const d = check(dir);
    report(d);
  } else if (has("agent")) {
    // The agent-run upgrade is a Mentura kit (U-3, I-29): the framework finds it and runs it as its own process.
    const k = kitFor("upgrade --agent");
    if (!k) fail(new Error("an agent-run upgrade is a Mentura kit (agent-upgrade, in the folder NAIVE_KITS names), and none is installed here; --stage upgrades a copy without an agent"));
    // kit.schema.json leaves entry optional. Without one, join() threw and the catch below exited 1; this exits 1 too, naming why.
    if (!k.entry) fail(new Error(`the ${k.name} kit names no entry to run (kit.json entry)`));
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
    if (!r.pending && !r.changed && !r.release.programs.length) console.log(`${id} is on Naive ${r.to}, every package pinned: nothing to upgrade.`);
    else if (!r.pending && r.release.programs.length && !r.packages.some((x) => !x.missing && x.from !== x.to)) console.log(`${id} is on Naive ${r.to}, every package pinned: ${r.dry ? "would copy" : "copied"} ${r.release.programs.length} missing research programs.`);
    else console.log(`${r.dry ? "would upgrade" : "upgraded"} ${id} from Naive ${r.from} to ${r.to}: ${moves} files moved, ${rewrites} records rewritten, ${pinned.length} packages pinned, ${r.release.escalated.length} escalated for a decision.`);
    for (const m of r.release.migrations) if (m.moves.length || m.rewrote.length || m.notes.length) console.log(`migrate   ${m.id} (${m.version}): ${m.moves.length} moved, ${m.rewrote.length} rewritten${m.notes.length ? `; ${m.notes.join("; ")}` : ""}`);
    for (const x of r.release.programs) console.log(`program   ${x.path} from ${x.template}`);
    for (const e of r.release.escalated) console.log(`escalate  ${e}`);
    for (const g of r.release.guides) console.log(`guide     ${g}`);
    if (r.release.guides.length) console.log(`Read the guides: node packages/naive/src/interfaces/cli/naive.ts upgrade ${dirArg} --guide`);
  }
} catch (e) { fail(e); }

function report(d: ReturnType<typeof check>) {
  if (json) { console.log(JSON.stringify(d, null, 2)); return; }
  console.log(`staged upgrade of ${id} from Naive ${d.from} to ${d.to}${d.by && d.by !== "naive" ? `, worked by ${d.by}` : ""}: ${d.status}`);
  if (d.changes) console.log(`changes   ${d.changes.added.length} added, ${d.changes.changed.length} changed, ${d.changes.removed.length} removed`);
  for (const c of d.checks ?? []) console.log(`${c.passed ? "pass" : "FAIL"}      ${c.check}${c.passed ? "" : `: ${c.output.split("\n").slice(-2).join(" / ")}`}`);
  for (const e of d.escalated ?? []) console.log(`escalate  ${e}`);
  if (d.status === "ready") console.log(`Nothing has landed. To land it: node packages/naive/src/interfaces/cli/naive.ts upgrade ${dirArg} --accept --confirm ${CONFIRM}`);
  else if (d.status === "checks-failed") console.log(`Nothing has landed, and it cannot until the checks pass. Fix the copy in ${dirArg}/.naive/upgrade/venture and run --status, or --reject.`);
}
