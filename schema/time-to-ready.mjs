// Time to running, and time to ready per layer and per MAD tier (the telos's Option B measure).
//
//   running: the venture is operating when its core promise is written, a product is live with at
//     least one account, and the next phase's exit criteria exist in the telos.
//     The date is the latest of the dates those records first appeared.
//   layer ready: every record the need-now score suggests for the current phase exists in that
//     layer; the date is when the last of them first appeared. A layer still missing one is not
//     ready, and the missing records are listed.
//   tier ready: the operations-readiness record's ready_on per MAD tier.
// A record's date is when git first saw the file, else the file's own updated or opened date.
//
//   node schema/time-to-ready.mjs <venture dir> [--json]

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { needNow } from "./need-now.mjs";
import { ventureFile } from "../packages/core/venture-paths.mjs";
import { exitCriteria } from "./canonical.mjs";
import { readDataModel } from "../packages/records/index.mjs";

const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const day = (d) => d ? d.slice(0, 10) : null;
const days = (a, b) => a && b ? Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5) : null;

function firstSeen(file) {
  try {
    const out = execFileSync("git", ["log", "--diff-filter=A", "--follow", "--format=%as", "--", file], { cwd: dirname(file), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").filter(Boolean);
    if (out.length) return out[out.length - 1];
  } catch {}
  try { const j = load(file); if (j.updated || j.opened) return day(j.updated ?? j.opened); } catch {}
  return day(statSync(file).mtime.toISOString());
}

const files = (d, base = d) => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? files(join(d, e.name), base) : [join(d, e.name).slice(base.length + 1)]) : [];
const glob = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*") + "$");

export function timeToReady(dir) {
  const model = readDataModel();
  const v = load(join(dir, "venture.json"));
  const start = day(v.opened) ?? firstSeen(join(dir, "venture.json"));
  const here = files(dir);
  const where = (type) => {
    const rels = (model.records.find((r) => r.id === type)?.paths ?? []).filter((p) => p.startsWith("instance/**/")).map((p) => p.slice("instance/**/".length));
    return here.filter((x) => rels.some((g) => glob(g).test(x)));
  };
  const seen = (type) => { const fs = where(type); return fs.length ? fs.map((f) => firstSeen(ventureFile(dir, f))).sort()[0] : null; };

  // Running.
  const nn = needNow(dir);
  const products = where("product").map((f) => ({ f, p: load(ventureFile(dir, f)) }));
  const offered = products.filter(({ p }) => p.status === "live");
  // The next phase's exit criteria, canonical or (unmigrated) the telos's, read through schema/canonical.mjs.
  const nextExit = nn.next ? exitCriteria(dir, nn.next) : null;
  const conditions = {
    promise: v.core?.promise ? firstSeen(join(dir, "venture.json")) : null,
    product_offered: offered.length ? offered.map(({ f }) => firstSeen(ventureFile(dir, f))).sort()[0] : null,
    first_account: seen("account"),
    next_exit_criteria: nextExit?.criteria.length && nextExit.file ? firstSeen(ventureFile(dir, nextExit.file)) : null,
  };
  const missing = Object.entries(conditions).filter(([, d]) => !d).map(([k]) => k);
  const runningOn = missing.length ? null : Object.values(conditions).sort().at(-1);

  // Layers.
  const layers = {};
  for (const row of nn.rows.filter((r) => r.status === "held" || r.status === "suggest now")) {
    const l = row.layer ?? "system";
    if (l !== "system" && v.layers && !v.layers[l] && row.status !== "held") continue; // a layer the venture turned off (or never turned on) is not asked for
    layers[l] ??= { dates: [], missing: [] };
    const d = seen(row.type);
    if (d) layers[l].dates.push(d); else layers[l].missing.push(row.type);
  }
  const layerRows = Object.entries(layers).map(([layer, x]) => {
    const on = x.missing.length ? null : x.dates.sort().at(-1) ?? null;
    return { layer, ready_on: on, days: days(start, on), missing: x.missing };
  });

  // MAD tiers.
  const opsFile = where("validation-operations-readiness")[0];
  const tiers = opsFile ? load(ventureFile(dir, opsFile)).tiers.map((t) => ({ tier: t.tier, ready_on: t.ready_on ?? null, days: days(start, t.ready_on) })) : [];

  return { venture: v.id, phase: nn.phase, started: start, running: { on: runningOn, days: days(start, runningOn), missing, conditions }, layers: layerRows, tiers };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node schema/time-to-ready.mjs <venture dir> [--json]"); process.exit(2); }
  const r = timeToReady(dir);
  if (process.argv.includes("--json")) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
  console.log(`${r.venture}: started ${r.started}, phase ${r.phase}`);
  console.log(r.running.on ? `running since ${r.running.on} (${r.running.days} days to running)` : `not running yet: missing ${r.running.missing.join(", ")}`);
  console.log("\nlayer ready (for what the current phase needs)");
  for (const l of r.layers) console.log(`  ${l.layer.padEnd(12)} ${l.ready_on ? `${l.ready_on} (${l.days} days)` : `not ready: ${l.missing.join(", ")}`}`);
  if (r.tiers.length) { console.log("\nMAD tier ready"); for (const t of r.tiers) console.log(`  ${t.tier.padEnd(22)} ${t.ready_on ? `${t.ready_on} (${t.days} days)` : "not ready"}`); }
}
