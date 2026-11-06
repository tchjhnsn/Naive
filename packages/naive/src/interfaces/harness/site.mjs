#!/usr/bin/env node
// Site presence, end to end (EE-062): read a venture's website, have a judge say which pages say what,
// and score how present the venture's public records are, weighed by who the site must speak to now.
// The reading and the judging are the app's commands, never named here (EE-041); the scoring is Naive's:
//
//   NAIVE_SITE_CMD    reads a site, run as <cmd> <url> --pages <n>, and prints { site, via, pages }
//   NAIVE_JUDGE_CMD   a judge that answers the Jev protocol
//
// Without a judge the scoring falls back to the matrix's keywords and says so.
//
//   node packages/naive/src/interfaces/harness/site.mjs <url> [--venture <dir>] [--raising] [--hiring] [--contributors] [--pages 10] [--json]

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { judgeCommand } from "../../engine/caching.mjs";
import { factsOf, icpOf, request, score, PRESENCE } from "../../../../../operations/marketing/site/presence.mjs";

const run = (cmd, args, input) => new Promise((resolve) => {
  const p = spawn(cmd[0], [...cmd.slice(1), ...args], { stdio: ["pipe", "pipe", "pipe"] });
  let out = "", err = "";
  p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
  p.on("close", (code) => resolve({ code, out, err }));
  p.stdin.end(input ?? "");
});

/**
 * Read, judge and score one site. Returns the presence result; writes it into the venture if given.
 * @param {string} url @param {{ venture?: string | null, flags?: Record<string, boolean>, pages?: number, log?: (m: string) => void }} [opts]
 */
export async function scan(url, { venture = null, flags = {}, pages = 10, log = () => {} } = {}) {
  const t0 = Date.now();
  const reader = judgeCommand(process.env.NAIVE_SITE_CMD);
  if (!reader) throw new Error("no site reader: set NAIVE_SITE_CMD to the app's command that reads a site");
  const r = await run(reader, [url, "--pages", String(pages)]);
  if (r.code !== 0) throw new Error(`could not read ${url}: ${r.err.trim() || `exit ${r.code}`}`);
  const site = JSON.parse(r.out);
  log(`read ${site.pages.filter((p) => !p.error).length} pages of ${site.site} via ${site.via} in ${Date.now() - t0} ms`);
  const icp = icpOf(venture, site);
  let answers = null;
  const judge = judgeCommand(process.env.NAIVE_JUDGE_CMD);
  if (judge) {
    const j = await run(judge, [], JSON.stringify(request(site, icp)));
    if (j.code === 0) { const a = JSON.parse(j.out); answers = a.answers; log(`Jev answered ${Object.keys(answers).length} typed questions in ${a.ms} ms`); }
    else log(`Jev failed (${j.err.trim().slice(0, 200)}); judging by keywords instead`);
  } else log("no judge (NAIVE_JUDGE_CMD): judging by keywords, which is rougher");
  const facts = factsOf(venture, flags);
  const result = score(site, { answers, facts, icp, venture: venture ? JSON.parse(readFileSync(join(venture, "venture.json"), "utf8")).id : null });
  if (venture) { mkdirSync(join(venture, dirname(PRESENCE)), { recursive: true }); writeFileSync(join(venture, PRESENCE), JSON.stringify(result, null, 2) + "\n"); }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  const opt = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };
  const has = (n) => process.argv.includes(`--${n}`);
  if (!url || url.startsWith("--")) { console.error("usage: node packages/naive/src/interfaces/harness/site.mjs <url> [--venture <dir>] [--raising] [--hiring] [--contributors] [--pages 10] [--json]"); process.exit(2); }
  const flags = Object.fromEntries(["raising", "hiring", "contributors"].filter(has).map((k) => [k, true]));
  scan(url, { venture: opt("venture"), flags, pages: Number(opt("pages") ?? 10), log: (m) => console.error(m) }).then((r) => {
    if (has("json")) return console.log(JSON.stringify(r, null, 2));
    console.log(`${r.site}: site presence ${r.score}/100 (${r.judged_by})`);
    console.log(`Customers: ${r.icp.types.map((t) => `${t.label}${t.p != null ? ` ${t.p}` : ""}`).join(", ")}; ICP from ${r.icp.cite}`);
    for (const n of r.sitemap) console.log(`  ${n.ghost ? "+" : " "} ${n.path.padEnd(28)} ${n.type.padEnd(9)} ${n.rating == null ? (n.read ? "-" : "not read") : n.rating}${n.missing.length ? `  missing: ${n.missing.join(", ")}` : ""}`);
    console.log(`By audience: ${Object.entries(r.audiences).map(([k, v]) => `${k} ${v.score}${v.weight >= 0.5 ? "" : " (not a priority)"}`).join(", ")}`);
    for (const x of r.items) console.log(`${x.score === 1 ? "ok  " : x.score ? "low " : "miss"} ${x.label.padEnd(28)} ${x.note}`);
    console.log(`Fix first: ${r.fix_first.join(", ") || "nothing"}`);
  }, (e) => { console.error(e.message); process.exit(1); });
}
