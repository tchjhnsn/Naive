#!/usr/bin/env node
// The venture package with the idea map's routing (EE-067, EE-069, EE-061). schema/packages.mjs computes
// the package; route() in purpose/frameworks/idea-map/route.mjs says where the founder's ideas for each
// record stand and the one step that moves it. The idea map reads schema/ itself, so schema/packages.mjs
// cannot import it without a cycle; this module composes the two (router inversion, step 4c).
//
//   node interface/orchestration/venture-package.mjs <venture> [--raising] [--hiring] [--answers <jev.json>] [--write] [--json]
//   node interface/orchestration/venture-package.mjs request <venture>   the Jev request for the questions the records leave open
//
// --write renders the readable view into <venture>/package/ (write() in schema/packages.mjs).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { packages, request, write } from "../../schema/packages.mjs";
import { route } from "../../purpose/frameworks/idea-map/route.mjs";

const load = (p) => JSON.parse(readFileSync(p, "utf8"));

/** The idea map's routing for a venture, or null when it cannot be computed (no idea map, a bad record). */
export function routesOf(dir) {
  try { return route(dir); } catch { return null; }
}

/**
 * The venture package with each record's idea-map title and route.
 * @param {string} dir
 * @param {{ flags?: Record<string, boolean>, answers?: * }} [opts]
 */
export function venturePackage(dir, opts = {}) {
  return packages(dir, { ...opts, routes: routesOf(dir) });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };
  const has = (n) => args.includes(`--${n}`);
  if (args[0] === "request") { console.log(JSON.stringify(request(args[1]))); process.exit(0); }
  const dir = args[0];
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node interface/orchestration/venture-package.mjs <venture> [--raising] [--hiring] [--answers <jev.json>] [--write] [--json] | request <venture>"); process.exit(2); }
  const answers = opt("answers") ? load(opt("answers")).answers : null;
  const r = venturePackage(dir, { flags: Object.fromEntries(["raising", "hiring"].filter(has).map((k) => [k, true])), answers });
  if (has("write")) console.error(`wrote ${write(dir, r)}`);
  if (has("json")) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`${r.name} (${r.phase}): ${Math.round(r.progress * 100)}% across the open core packages; complete: ${r.complete.join(", ") || "none yet"}`);
    for (const p of r.core) console.log(`core    ${p.in.padEnd(5)} ${p.title.padEnd(22)} fit ${String(p.fit).padEnd(5)} ${p.in === "now" ? `${p.state.padEnd(9)} ${Math.round(p.progress * 100)}%  moving: ${p.moving.join(", ") || "none"}` : p.why}`);
    for (const p of r.handoff) console.log(`handoff ${p.in.padEnd(5)} ${p.title.padEnd(22)} fit ${String(p.fit).padEnd(5)} ${p.in === "now" ? `waits on ${p.waits_on.join(", ") || "nothing"}` : p.why}`);
    const open = r.situation.questions.filter((q) => q.value == null);
    if (open.length) console.log(`Open: ${open.map((q) => q.ask).join(" ")}`);
  }
}
