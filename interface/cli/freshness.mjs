// The freshness commands of the mentura CLI (Revalidating, V-1 to V-8). mentura.mjs hands these
// commands here; the logic is schema/freshness.mjs.
//
//   mentura revalidate <target> --venture <id> [--reason <text>] [--as person] [--json]
//          target: tag:<route or file> (the record and what depends on it), path:<folder>,
//          package:<name>, or a plain route or file (a tag); a plain folder is refused with the tags to use
//   mentura revalidate --pivot --venture <id> [--reason <text>]    every assumption in the validation package
//   mentura verify <route|folder> --venture <id> [--reason <text>] [--as person]
//          checked and still right, unchanged: its age starts again
//   mentura phase <phase> --venture <id> --as person [--reason <text>]
//          the venture changes phase; records with a per-phase profile go stale
//   mentura freshness --venture <id> [--json] [--now <iso>] [--freeze <out dir>]
//          what is fresh, stale, expired or a live hole; --freeze writes the static shell

import { resolve } from "node:path";
import { agentFromEnv } from "../provenance.mjs";
import { ventureDir } from "../router.mjs";
import { freeze, freshness, phase, revalidate, verify } from "../../schema/freshness.mjs";

export const COMMANDS = ["revalidate", "verify", "phase", "freshness"];

/** Runs one freshness command. Returns the exit code. */
export async function main(cmd, argv, workspace) {
  const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const flag = (n) => argv.includes(`--${n}`);
  const target = argv[1] && !argv[1].startsWith("--") ? argv[1] : undefined;
  const venture = opt("venture");
  const dir = venture && ventureDir(venture, workspace);
  const print = (x) => console.log(typeof x === "string" ? x : JSON.stringify(x, null, 2));
  if (!dir) { console.error(venture ? `no venture ${venture}` : `usage: mentura ${cmd} ${cmd === "freshness" ? "" : "<target> "}--venture <id>`); return venture ? 1 : 2; }
  const by = agentFromEnv(opt("as") === "person" ? "person" : "agent", "cli");
  const now = opt("now");
  let r;
  if (cmd === "revalidate") {
    if (!target && !flag("pivot")) { console.error("usage: mentura revalidate <tag:route|path:folder|package:name|route> --venture <id>, or --pivot"); return 2; }
    r = await revalidate(dir, flag("pivot") ? "pivot" : target, { reason: opt("reason"), by, now });
  } else if (cmd === "verify") {
    if (!target) { console.error("usage: mentura verify <route|folder> --venture <id>"); return 2; }
    r = verify(dir, target, { reason: opt("reason"), by, now });
  } else if (cmd === "phase") {
    if (!target) { console.error("usage: mentura phase <phase> --venture <id> --as person"); return 2; }
    // A phase change is the founder's decision: an agent may suggest it, not make it.
    if (opt("as") !== "person") { console.error(`a phase change is a person's: run mentura phase ${target} --venture ${venture} --as person`); return 1; }
    r = phase(dir, target, { reason: opt("reason"), by, now });
  } else if (cmd === "freshness") {
    if (opt("freeze")) r = await freeze(dir, resolve(opt("freeze")), { now });
    else { const f = await freshness(dir, { now }); print(flag("json") ? f : [`${f.venture} (${f.phase}): ${f.summary.fresh} fresh, ${f.summary.stale} stale, ${f.summary.expired} expired, ${f.summary.holes} live ${f.summary.holes === 1 ? "hole" : "holes"}, of ${f.summary.records} records.`,
      ...f.items.filter((i) => i.state !== "fresh").map((i) => `  ${i.state.padEnd(7)} ${i.route}: ${i.reasons.map((x) => x.note).join("; ")}`),
      ...f.copies.filter((c) => c.state !== "fresh").map((c) => `  ${c.state.padEnd(7)} ${c.path} (copy of ${c.parent}): ${c.note}`),
      ...f.warnings.map((w) => `warning: ${w}`)].join("\n")); return 0; }
  }
  if (!r.ok) {
    console.error(r.error);
    if (r.suggest) console.error(`  ${r.suggest.join("\n  ")}\n  or, for the whole folder: mentura revalidate ${r.or} --venture ${venture}`);
    return 1;
  }
  print(flag("json") ? r.result : r.result.note ?? r.result);
  return 0;
}
