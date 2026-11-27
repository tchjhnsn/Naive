#!/usr/bin/env node
// The framework CLI (EE-072), the way `next` is Next.js's: run it inside a venture and it finds the
// venture.json in the current directory or its parents. mentura stays for platform commands and as an
// alias, so `mentura typegen` and `mentura upgrade` run these same commands.
//
//   naive new [dir] [--yes] [--type <type>] [...]    start a venture: create-venture's questions and scaffold (EE-082)
//   naive agent [list] | brief <role> | run <role> "<task>" | spawn <function>-agent --task "<text>"
//                                                   Naive's agents from the terminal: run uses NAIVE_AGENT_CMD (such as claude -p), else prints
//                                                   the prompt, and spawn records a temporary specialist of that agent and runs it (EE-213)
//   naive <route> <action> | decide | decisions | accept | ...
//                                                   every record command of mentura runs here too: see naive help
//   naive dev [--port 4331]                         the setup page at /setup and the board, live: edit a record and it updates; each saved
//                                                   record is checked against its schema as you go (I-17, I-24)
//   naive build                                     check every package and write a release (I-17)
//   naive start                                     serve the latest release read-only (I-17)
//   naive check                                     run every check that reads a venture, less the ones its config turns off (I-9)
//   naive info                                      versions, the venture, and which agents are connected (I-6)
//   naive mcp                                       serve the venture to an agent over MCP (stdio)
//   naive types                                     the venture types, each with its roles, packages and first decisions (EE-082)
//   naive setup [state|artifact|answer|point|confirm]  set the venture up: the state, an artifact of it, and
//                                                   confirming the answers the model relayed (EE-083)
//   naive frame "<the founder's words>"             match the words to a frame in the decision library, judge its
//                                                   premises against the venture and propose its decisions, open
//   naive roadmap [list | install <id>]             a decision roadmap: propose each step's frame decisions, open, in order
//   naive typegen                                   write .naive/types/ from the route table and the MCP tools
//   naive upgrade [<venture dir>] [--framework]     move a venture onto the next Naive layout; --framework first
//   naive upgrade --layout src [--check]          move a venture onto the src layout: src/<function>/<package>/ (EE-118 step 8)
//   naive upgrade --layout structured [--check]   move a flat venture onto the structured layout: k-base/, meta/ (EE-086)
//                                                   updates the installed framework with the venture's package manager (I-29)
//   naive phase [<next phase>] [--meet <criterion> --evidence <text>] [--reason] [--override <why>]
//                                                   the venture development lifecycle: where the venture is, its gate's exit
//                                                   criteria, and moving to the next phase once a person has met them
//   naive publish build <channel> | naive publish <channel> --by <person> [--as <role>] [--door] [--exposure] | naive publish rollback <channel> | naive publish status
//                                                   compile public MDX into an artifact, then publish it through the one-way/two-way door gate
//   naive port <folder> --venture <dir> [--to <path>]  plan moving a folder into the venture as it is (codebase/<name>)
//   naive port --venture <dir> --apply --confirm port
//                                                   carry out that plan (EE-076)
//   naive migrate --from <project> --venture <dir>  an agent rewrites the project as Naive records, as a plan and decisions
//   naive migrate --venture <dir> --apply           write what a person decided (EE-076)
//   naive publish check <paths>... [--json]         the publish lint: copy distance, leaks, brand, claims, marks,
//                                                   personal data, secrets; rules off|warn|error in naive.config.json
//   naive publish check --report                    the rules most often waived and leaks found after publish
//   naive capture "<text>"                          keep the text in the workspace's raw/, and file each chunk in the
//                                                   venture it fits, or in the workspace inbox when unsure
//   naive inbox [list | assign <chunk> <venture>]   the chunks waiting for the founder, and choosing their venture
//   naive read <venture> <path>                     read another venture's published artifact, if the workspace allows
//   naive framework list | new <id> | check [<id>] | publish <id> --dry-run
//                                                   the founder's own frameworks and playbooks in the workspace's frameworks/,
//                                                   beside the built-in ones; publishing only packs a bundle for now
//   naive diagnose [--since <iso>] [--dir <transcripts>] [--all]  find frameworks, playbooks, ideas and decisions in the founder's own
//                                                   words in agent transcripts (redacted first) and draft them as a raw source;
//                                                   --if-due runs it only past naive.config.json diagnose.threshold
//   naive activity [--from <date>] [--to <date>] [--write]  time spent in each venture per day from transcript timestamps:
//                                                   sessions, active minutes, messages, tokens in; --write keeps
//                                                   operations/activity/<date>.json and the streak (internal)
//   naive activities [list|propose] [--venture <dir>] [--json]
//                                                   what the activity catalog's scores propose for the venture's functions;
//                                                   propose files each as an open decision for a person (EE-169). Not
//                                                   `naive activity`, which is time spent
//   naive activities defaults [--function <id>] [--json]
//                                                   the activities a person performs by default for their kind: a
//                                                   decision, a value, a commitment or a relationship (EE-179)
//   naive activities briefing [--venture <dir>] [--function <id>] [--json]
//                                                   what each function's APQC process groups need from a person: the
//                                                   activities a person performs or approves, and how many are the
//                                                   agent's (EE-180)
//   naive goals [list] [--json]                     the goal tree: each goal under the goal it serves, its status,
//                                                   measures and owner, with the goals waiting as drafts (EE-210)
//   naive goals show <id> [--at <iso>] [--json]     one goal, as it is now or as it stood at a transaction time
//   naive goals history <id> [--json]               every version of it, from the provenance log and the blob store
//   naive goals status <id> <status> --by <person> [--note <text>] [--measure <id>=<value>] [--superseded-by <id>]
//                                                   a person moves a goal on: proposed, active, met, missed, dropped
//                                                   or superseded. Only a person settles a goal
//   naive due [--at <iso>] [--function <id>] [--json]  which function workflows are due now and why, from each workflow's
//                                                   trigger, the run log and the provenance log (EE-182)
//   naive due record <function>/<workflow> [--outcome done|failed|skipped] [--by <who>]
//                                                   record that a workflow ran
//   naive skipped [--function <id>] [--at <iso>] [--json]
//                                                   the work left behind, in hierarchical order: occurrences a person
//                                                   skipped and the steps a reporting run left out, each with what it
//                                                   blocks downstream (EE-213)
//   naive skipped handback <item> [--to <role>]     hand one item to the owning function agent as an open decision:
//                                                   it recommends do-now, defer or drop, and a person decides
//   naive problems [tree|rank] [--json]             the customer problem tree: each problem a narrower case (parent)
//                                                   or a cause (cause_of) of another, the one target and each
//                                                   profile's core problem; rank orders them by what the interviews
//                                                   counted, labelled primary, secondary and tertiary (EE-219)
//   naive blocked [--json]                          every workflow of the venture's functions, in hierarchical order,
//                                                   met or blocked, and what unblocks it first (EE-217)
//   naive bets [show [<id>]] [--json]               the venture's bets: each claim, the fixed form of it, what would
//                                                   show it wrong, the bets it rests on, the evidence for and
//                                                   against, the odds a person put on it and the outcome (EE-221)
//   naive bets register <id> --by <person>          a person fixes the claim: from then on its kind, statement,
//                                                   claim, rule, premises and falsified_by never change
//   naive bets confidence <id> --p <0..1> --by <person> --data-seen <answer> [--why <text>]
//                                                   a person puts odds on it, saying how much of the evidence they
//                                                   had seen. The first entry is the prior, and it is what is scored
//   naive bets resolve <id> <happened|did-not-happen|mixed|unresolvable> --by <person> [--observed <value>]
//                                                   a person records what happened, once. Only a person resolves
//   naive bets score [--json]                       the Brier score of each resolved bet and the mean, with the ones
//                                                   the venture worked to make true reported apart
//   naive prereg [show [<id>]] [--json]             the venture's pre-registrations: the thesis, the measures with the
//                                                   thresholds and dates they are judged by, what does not count as
//                                                   evidence, and what it said it would do on a pass and a fail (EE-220)
//   naive prereg register <id> --by <person>        a person fixes the plan: from then on its thesis, assumptions,
//                                                   method, measures, thresholds, dates, exclusions and decision rules
//                                                   never change, and a change is a deviation or a new version
//   naive prereg result <id> --measure <m>=<value> [--evidence <ref>] [--by <person>]
//                                                   what was observed for one measure, with its pass or fail against
//                                                   the registered threshold; the verdict over the test is a person's
//   naive owners [--function <id>] [--level <n>] [--json]
//                                                   the accountable owner of each APQC element the venture runs, a
//                                                   person or an agent, and where it came from (EE-187)
//   naive tools recommend [--goal <id>] [--activity <id>] [--function <id>] [--json] [--propose]
//                                                   which activities a goal needs to be visible, the tool kinds that
//                                                   cover each, how they score on visibility and ownership, and the
//                                                   blind spots; --propose files one open decision per function for a
//                                                   person (EE-222)
//   naive graph [--function <id>] [--element <id>] [--json] [--mermaid]
//                                                   the element graph: which APQC elements feed which through the
//                                                   routes the function workflows write and read, and the routes
//                                                   read that no workflow writes or written that none reads (EE-188)
//   naive effects [<element>] [--at <iso>] [--json]  each element's state, capability level (ISO/IEC 33020, capped at
//                                                   3) and the harm and caps it takes from what feeds it; for one
//                                                   element, what happens downstream if it were absent, weak or
//                                                   strong (EE-190)
//   naive loop [plan] [--at <iso>] [--json]         what the loop would do with each due workflow under the venture's
//                                                   loop modes; writes nothing (EE-183)
//   naive loop tick [--max <n>] [--json]            ask, skip and start once: an ask files a decision, a start runs the
//                                                   workflow as its function agent through NAIVE_AGENT_CMD
//   naive loop watch [--every <duration>] [--max <n>]
//                                                   tick now and again every 15 minutes, or every <duration>
//   naive loop mode [<manual|ask|auto> [--function <id> | --workflow <function>/<workflow>] --by <person>]
//                                                   show each workflow's mode, or set one as a person
//   naive workspace init [<dir>] [--name <name>] (--venture <name> | --port <folder> | --migrate <project>)
//                                                   a workspace with its clock, its calendar and its first venture
//   naive workspace rename <name>                   rename the workspace this runs in (logged in its meta/provenance.jsonl)
//   naive calendar [list [--from <date>] [--to <date>] | add --title <t> --start <local time> | export --ics <file>]
//                                                   the workspace calendar: stored events and those derived from dated records
//   naive beta status|feedback <capability>|unlock  the plugin beta: which capabilities are open, the checkpoint feedback
//                                                   that unlocks the next, and unlocking it (beta.enabled in naive.config.json)
//   naive bugs [--all]                              open P0 and P1 bugs; stable means none
//   naive handoff run <id> [--runner <id>]           a handoff's done-criteria, durable when naive.config.json sets durable.engine (EE-161)
//   naive run <file> [--json]                       a venture program on the venture runtime: an Effect or a function (EE-161)
//   naive trace append [--session <id>]             span lines on stdin, chained into traces/<session>.jsonl (EE-121)
//   naive trace show [<session>] [--json]           the venture's trace sessions, or one as a tree of spans, offline
//   naive signals emit <type> --props '<json>' [--subject <id>] [--time <date>] [--rating B2] [--by <person>] [--cite <url>]
//                     [--supersedes <signal id> | --retracts <signal id>]
//                                                   record a signal in the venture's local library, raw/signals/, as a person
//   naive signals pull [--now <iso>]                render what new signals say into records through the listeners, or
//                                                   through a pattern's live recipe in the sandbox, as the signal projector,
//                                                   with receptions beside each recipe's record and hindsight once the
//                                                   horizon passed; a pull after a pull writes nothing
//   naive signals explain <signal id> [--now <iso>] the signal at every listener: salient or noise, and why
//   naive signals replay                            render every projected record again from what it cites and report drift
//   naive recipes init <pattern> --by <person>     a person writes the starter recipe, the plain fold from the signal
//                                                   types' projects, at <pattern>.recipe.ts
//   naive recipes plan <pattern> --by <person> [--weights uniform|cited] [--gap <duration>] [--min-gain <n>]
//                                                   a person's eval plan: writes <pattern>.plan.json and freezes _eval/<sha>/
//   naive recipes check <pattern> [--json]          training feedback: per-row losses, settled and predicted, noise disagreements
//   naive recipes search <pattern> [--factor 2] [--shrinks 2] [--max-writes 200] [--json]
//                                                   knob descent with no model: each knob step an experiment write to
//                                                   recipes/<pattern>, scored by the router; keeps are held as drafts
//   naive sync link <business> [--host <url>]      sign this working copy in to a business store with a device code,
//                                                   and keep the token in the operating system's keychain
//   naive sync pull [--json]                        what the store changed since the sync point, merged field by
//                                                   field into the files; same-field conflicts become decisions
//   naive sync push [--json]                        what this working copy changed, each record with its base
//                                                   version; a store that moved is pulled, merged and tried again
//   naive sync status [--json]                      where this working copy stands, with no network
//   naive copy gaps [--page <id>] [--json]        what each page shows, the record that holds it, or what is missing
//                                                   and which upstream record a draft would come from (EE-216)
//   naive copy draft [--element <id>] [--propose] [--print]
//                                                   one open decision per missing or undecided element, with two or
//                                                   three options a person picks between, drafted through NAIVE_AGENT_CMD;
//                                                   with no harness it prints the prompt and files the gap alone
//   naive copy check [--json]                       the copy gate: it refuses while any element the sitemap plans has
//                                                   no record a person stands behind, and names each one
//   naive copy one-shot --by <person> [--why <text>]  a person skips approving the text: recorded as a decision, and
//                                                   every page built from then on is marked unapproved
//   naive render [<document kind>] [--format md|pdf|docx|pptx|html|site] [--json]
//                                                   the document catalog, or one document's reading copy written from
//                                                   the records it cites. Markdown is rendered here; a heavier format
//                                                   is the harness's, and a rung above the reading copy is refused
//                                                   until a person approved the one below (EE-218)
//   naive lint premises [<route>] [--drafts] [--json] [--propose]
//                                                   attack the premises of the venture's goals, requirements, exit criteria,
//                                                   constraints and decisions; --propose writes findings as open decisions
//
// --venture <dir> names the venture when you are not inside it.

import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { basename, join, relative, resolve } from "node:path";
import { CODE_OVER_DOCS } from "../../core/code-over-docs.ts";
import { asRouted, findVenture } from "./find-venture.ts";
import { logical } from "../../core/venture-paths.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import { checkWorkspace, ensureWorkspace, findWorkspace } from "../../engine/workspace.ts";
import { checkCopies } from "../../engine/effect-pin.ts";
import { checksFor, configFor } from "../../engine/naive-config.ts";
import { schemaNameOf } from "../../records/index.ts";
import { naiveScript, PACKAGE_ROOT } from "../../core/scripts.ts";
import { validateFile } from "../../records/validate.ts";
import type { VentureRole, VentureTypes } from "../../records/types/records.d.ts";
import { blockingStdio } from "../../core/stdio.ts";

blockingStdio();
const repo = new URL("../../../../..", import.meta.url).pathname;
const [cmd, ...rest] = process.argv.slice(2);
const opt = (n: string): string | undefined => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };
const run = (script: string, args: string[], opts: SpawnSyncOptions = {}): number => spawnSync("node", [join(repo, script), ...args], { stdio: "inherit", ...opts }).status ?? 1;
const version = () => JSON.parse(readFileSync(join(repo, "package.json"), "utf8")).version;

// The venture: --venture <dir>, else the one this command runs inside.
function here() {
  const named = opt("venture");
  const dir = named ? (existsSync(join(resolve(named), "venture.json")) ? resolve(named) : null) : findVenture();
  if (!dir) {
    console.error(named ? `${named} has no venture.json` : `no venture here: run naive ${cmd} inside a venture (a directory with venture.json), or pass --venture <dir>`);
    process.exit(1);
  }
  return dir;
}


// The schema a venture file is checked against, from the route table (records only).
async function schemaFor(file: string): Promise<string | null> {
  const { glob, routes } = await import("../../router/router.ts");
  return routes().find((r) => r.kind === "record" && r.schema && (r.files ?? []).some((g) => glob(g).test(file)))?.schema ?? null;
}

async function dev(dir: string): Promise<void> {
  // The root layout is required (I-21): a venture without AGENTS.md gets a stub, as next dev writes a root layout.
  if (!existsSync(join(dir, "AGENTS.md"))) {
    writeFileSync(join(dir, "AGENTS.md"), `# AGENTS.md: ${basename(dir)}\n\nThe map of this venture for agents. Read it, then a route's layout, before writing anything here.\n\n- ${CODE_OVER_DOCS}\n\n## Instructions\n\nphase: ${JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).phase}\nprivate: _private/\n`);
    console.log("   wrote AGENTS.md, the venture's root layout, because it was missing");
  }
  const { workspace, venture } = asRouted(dir);
  process.env.MENTURA_WORKSPACE = workspace;
  // One origin: /setup is the setup page (packages/naive/src/interfaces/dev/setup.ts); everything else is the board, served
  // on a port of its own and passed through.
  const { serve } = await import("../demo/board.ts");
  const { handle } = await import("../dev/setup.ts");
  // Each server listens before its address is printed or used, so no other process can take a port between a probe and
  // the listen (the board takes any free port; the setup server the one asked for, else the next free one).
  const board = serve(0, venture);
  if (!board.listening) await new Promise((ok) => board.once("listening", ok));
  const boardPort = (board.address() as AddressInfo).port;
  const { createServer: http, request } = await import("node:http");
  const server = http(async (req, res) => {
    if (await handle(req, res, dir)) return;
    const up = request({ host: "127.0.0.1", port: boardPort, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode ?? 502, r.headers); r.pipe(res); });
    up.on("error", (e) => { res.writeHead(502); res.end(String(e.message)); });
    req.pipe(up);
  });
  const port = await new Promise<number>((ok, fail) => {
    const at = (p: number) => {
      server.once("error", (e: NodeJS.ErrnoException) => e.code === "EADDRINUSE" && p !== 0 ? at(p + 1) : fail(e));
      server.listen(p, "127.0.0.1", () => { server.removeAllListeners("error"); ok((server.address() as AddressInfo).port); });
    };
    at(Number(opt("port") ?? 4331));
  });
  const name = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).name ?? venture;
  console.log(`\n  ▲ Naive ${version()}\n  - Venture:  ${name} (${relative(process.cwd(), dir) || "."})\n  - Setup:    http://127.0.0.1:${port}/setup\n  - Board:    http://127.0.0.1:${port}/\n  - Map:      http://127.0.0.1:${port}/map\n\n  Watching for changes. Each saved record is checked against its schema. Ctrl-C to stop.\n`);
  // Live feedback on save (I-24): a record that no longer matches its schema says so at once.
  const pending = new Map<string, NodeJS.Timeout>();
  watch(dir, { recursive: true }, (_, raw) => {
    if (!raw || !raw.endsWith(".json") || raw.startsWith("node_modules") || raw.startsWith(".naive")) return;
    // The record's logical path (packages/naive/src/core/venture-paths.ts): knowledge/foundation/icp.json is foundation/icp.json.
    const physicalPath = raw, f = logical(dir, raw);
    if (f.startsWith("_private")) return;
    clearTimeout(pending.get(f));
    pending.set(f, setTimeout(async () => {
      pending.delete(f);
      if (!existsSync(ventureFile(dir, physicalPath))) return;
      const schema = await schemaFor(f);
      if (!schema) return;
      const v = validateFile(schemaNameOf(schema), ventureFile(dir, physicalPath));
      const out = (v.stdout + v.stderr).trim();
      if (v.status === 0) console.log(`  ✓ ${f}`);
      else console.log(`  ✗ ${f} does not match ${schema}\n${out.split("\n").map((l) => `      ${l}`).join("\n")}`);
    }, 150));
  });
}

// The checks that read a venture, run on this venture: it and the ventures nested in it, not its neighbours.
// Every checker that takes a venture folder is here. A checker of Naive's own files (the data model, nouns, the docs)
// is not: node test.ts runs those. checks.off and checks.warn in naive.config.json are honoured, by the checker's
// path in Naive (packages/naive/src/checks/check-telos.ts), as the router's check action honours them.
const CHECKS = ["check-ventures", "check-config", "check-people", "check-owners", "check-departments", "check-team", "check-delegation", "check-governance",
  "check-provenance", "check-traces", "check-sources", "check-records", "check-data-packages", "check-where-used", "check-private", "check-connections", "check-signals",
  "check-telos", "check-goals", "check-problems", "check-validation", "check-pre-registration", "check-execution", "check-detectors", "check-documents",
  "check-bets", "check-reasons", "check-validation-study", "check-recipes", "check-assets", "check-brand", "check-publication", "check-citations",
  "lint-investors", "lint-product", "lint-money", "lint-customers", "lint-validation", "lint-finance", "lint-legal", "lint-people", "lint-foundation"];
function check(dir: string): number {
  let failed = 0;
  let plan: { check: string; mode: string }[];
  const short = (c: string) => c.replace(/^check-/, "");
  // A config that cannot be read turns nothing off: every check runs, and check-config says what is wrong with it.
  const path = (c: string) => `packages/naive/src/checks/${c}.ts`;
  try { plan = checksFor(configFor(dir), CHECKS.map(path)); } catch { plan = CHECKS.map((c) => ({ check: path(c), mode: "run" })); }
  for (const [i, c] of CHECKS.entries()) {
    const mode = plan[i]?.mode ?? "run";
    if (mode === "off") { console.log(`off   ${short(c)}: turned off in naive.config.json`); continue; }
    const r = spawnSync("node", [naiveScript(c), dir], { encoding: "utf8" });
    const last = (r.stdout + r.stderr).trim().split("\n").filter(Boolean).at(-1) ?? "";
    const bad = r.status !== 0;
    if (bad && mode !== "warn") failed++;
    console.log(`${!bad ? "pass" : mode === "warn" ? "warn" : "FAIL"}  ${short(c)}: ${last}`);
    if (bad) console.log((r.stdout + r.stderr).trim().split("\n").slice(0, 12).map((l) => `      ${l}`).join("\n"));
  }
  // One Effect, shared (EE-161): the venture pins Naive's exact effect version and loads the copy Naive loads.
  const effect = checkCopies(dir);
  if (!effect.ok) failed++;
  console.log(`${effect.ok ? "pass" : "FAIL"}  effect: ${effect.message}`);
  // The workspace the venture sits in: its naive-workspace.json matches the schema.
  const ws = findWorkspace(dir);
  if (ws) { const e = checkWorkspace(ws); if (e) failed++; console.log(`${e ? "FAIL" : "pass"}  workspace: ${e ? e.split("\n")[0] : "naive-workspace.json matches its schema"}`); }
  console.log(failed ? `\n${failed} failing` : "\nall passing");
  return failed ? 1 : 0;
}

function info(dir: string | null): void {
  const v = dir && JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"));
  // Supported agents (I-6): the MCP clients Naive is tested with, and whether this venture is connected to each.
  /** An MCP client config file: only the servers it names. */
  type McpConfig = { mcpServers?: Record<string, unknown> } | null;
  const agents: [string, string, (j: McpConfig) => unknown][] = [
    ["Claude Code", ".mcp.json", (j) => j?.mcpServers?.naive || j?.mcpServers?.mentura],
    ["Cursor", ".cursor/mcp.json", (j) => j?.mcpServers?.naive || j?.mcpServers?.mentura],
  ];
  const read = (f: string): McpConfig => { try { return JSON.parse(readFileSync(f, "utf8")) as McpConfig; } catch { return null; } };
  const lines = [
    `Naive        ${version()} (${repo.replace(/\/$/, "")})`,
    `Node         ${process.version}`,
    `Platform     ${process.platform} ${process.arch}`,
    `Venture      ${v ? `${v.name ?? v.id} (${v.phase}) at ${dir}` : "none here"}`,
    "Agents       " + agents.map(([name, f, ok]) => `${name}: ${dir && ok(read(ventureFile(dir, f))) ? "connected" : "not connected"}`).join(", "),
  ];
  console.log(lines.join("\n"));
}

function upgradeFramework(dir: string): number {
  const pkg = join(dir, "package.json");
  const deps = existsSync(pkg) ? { ...JSON.parse(readFileSync(pkg, "utf8")).devDependencies, ...JSON.parse(readFileSync(pkg, "utf8")).dependencies } : {};
  const name = Object.keys(deps).find((d) => d === "naive-framework");
  if (!name) { console.error("this venture does not install the framework from its package.json, so there is nothing to update; upgrading its layout only"); return 0; }
  const pm = existsSync(join(dir, "pnpm-lock.yaml")) ? "pnpm" : existsSync(join(dir, "yarn.lock")) ? "yarn" : existsSync(join(dir, "bun.lockb")) || existsSync(join(dir, "bun.lock")) ? "bun" : "npm";
  // A git pin (naive#70) moves to the commit of the Naive running this command when that is a clone, and installs from
  // the clone, so the update needs no network; the new pin is what another machine installs. The clone is the
  // package root, above dist/ when this runs compiled (EE-159).
  const gitPin = /^(git\+|github:)/.test(deps[name]) && deps[name].includes("#");
  const head = gitPin && existsSync(join(PACKAGE_ROOT, "test.ts")) ? spawnSync("git", ["rev-parse", "HEAD"], { cwd: PACKAGE_ROOT, encoding: "utf8" }).stdout?.trim() : "";
  if (pm === "npm" && /^[0-9a-f]{40}$/.test(head ?? "")) {
    const pin = deps[name].replace(/#.*$/, `#${head}`);
    const j = JSON.parse(readFileSync(pkg, "utf8"));
    for (const k of ["devDependencies", "dependencies"]) if (j[k]?.[name]) j[k][name] = pin;
    writeFileSync(pkg, JSON.stringify(j, null, 2) + "\n");
    console.log(`updating the framework: pinned ${pin}; npm install --no-save ${PACKAGE_ROOT}`);
    return spawnSync("npm", ["install", "--no-save", PACKAGE_ROOT], { cwd: dir, stdio: "inherit" }).status ?? 1;
  }
  const spec = deps[name].startsWith("file:") || gitPin ? deps[name] : `${name}@latest`;
  const args = pm === "npm" ? ["install", "--save-dev", spec] : pm === "yarn" ? ["add", "--dev", spec] : ["add", "-D", spec];
  console.log(`updating the framework: ${pm} ${args.join(" ")}`);
  return spawnSync(pm, args, { cwd: dir, stdio: "inherit" }).status ?? 1;
}

if (cmd === "dev") await dev(here());
else if (cmd === "check") process.exit(check(here()));
else if (cmd === "types") {
  // What create-venture can make, for an agent to offer the founder: each type with its roles, by name.
  const { roles, types } = await import("../../engine/venture-type.ts");
  const R = new Map((roles() as VentureRole["roles"]).map((r) => [r.id, r.name]));
  console.log(JSON.stringify((types() as VentureTypes["types"]).map((t) => ({ id: t.id, label: t.label, description: t.description, examples: t.examples, roles: t.roles.map((r) => ({ id: r, name: R.get(r) })), default_role: t.default_role, first_decisions: t.decisions })), null, 2));
}
else if (cmd === "mcp") {
  // The MCP server, on the venture this runs in: `claude mcp add naive -- npx naive mcp`. Outside a
  // venture (a plugin starts it in every project), the current folder is the workspace, so a venture
  // created here is found at once.
  const env = { ...process.env };
  const at = opt("venture") ? here() : findVenture();
  if (!env.MENTURA_WORKSPACE) env.MENTURA_WORKSPACE = at ? asRouted(at).workspace : process.cwd();
  process.exit(spawnSync("node", [join(repo, "packages/naive/src/interfaces/mcp/server.ts")], { stdio: "inherit", env }).status ?? 1);
}
else if (cmd === "info") { const named = opt("venture"); info(findVenture() ?? (named && existsSync(join(resolve(named), "venture.json")) ? resolve(named) : null)); }
else if (cmd === "build" || cmd === "start") {
  // The release itself is written and served by packages/naive/src/router/orchestration/build-release.ts and packages/naive/src/engine/start-release.ts.
  const script = cmd === "build" ? "packages/naive/src/router/orchestration/build-release.ts" : "packages/naive/src/engine/start-release.ts";
  if (!existsSync(join(repo, script))) { console.error(`naive ${cmd} runs ${script}, which this version of Naive does not have yet`); process.exit(1); }
  process.exit(run(script, [here(), ...rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture")]));
} else if (cmd === "upgrade") {
  // Outside a venture with none named, upgrade-venture.ts prints its usage.
  const dir = rest[0] && !rest[0].startsWith("--") ? resolve(rest[0]) : (opt("venture") ? here() : findVenture());
  if (dir && rest.includes("--framework") && upgradeFramework(dir) !== 0) process.exit(1);
  // --layout src (EE-118 step 8) or structured (EE-086): move a venture onto that layout. No logical path changes,
  // so routes, citations and the provenance log read the same; --check says what would move.
  const LAYOUTS: Record<string, [string, string]> = { src: ["../../engine/migrations/src-layout.ts", "src/<function>/ beside public/ (EE-118 step 8)"], structured: ["../../engine/migrations/structured-layout.ts", "k-base/ and meta/ (EE-086)"] };
  const layout = opt("layout");
  if (dir && layout) {
    if (!LAYOUTS[layout]) { console.error(`unknown layout ${layout}: src or structured`); process.exit(2); }
    const { apply } = await import(LAYOUTS[layout][0]);
    const dry = rest.includes("--check"), notes: string[] = [], escalated: string[] = [];
    apply(dir, { dry, note: (m: string) => notes.push(m), escalate: (m: string) => escalated.push(m) });
    if (!notes.length && !escalated.length) console.log(`this venture is already on the ${layout} layout`);
    for (const n of notes) console.log(`${dry ? "would: " : ""}${n}`);
    for (const e of escalated) console.log(`decide: ${e}`);
    if (!dry && notes.length) {
      const { agentFromEnv, record } = await import("../../core/provenance.ts");
      record(dir, { entity: "venture.json", activity: "write", agent: agentFromEnv("person", "cli"), note: `moved onto the ${layout} layout: ${LAYOUTS[layout][1]}` });
    }
    process.exit(0);
  }
  // Flags (--check, --guide, --adopt, --canary, --agent, --accept, --confirm) pass through to upgrade-venture.ts; --framework and --venture are handled here.
  const flags = rest.filter((a, i) => !(i === 0 && !a.startsWith("--")) && a !== "--framework" && a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("packages/naive/src/engine/upgrade-venture.ts", dir ? [dir, ...flags] : flags));
} else if (cmd === "frame") {
  // The decision library (packages/naive/src/engine/frames.ts): naive frame "<the founder's words>" runs the frame those words fit.
  const sub = rest[0];
  if (["list", "match", "check", "eval"].includes(sub)) process.exit(run("packages/naive/src/engine/frames.ts", rest));
  const words = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture" && a !== "--frame" && rest[i - 1] !== "--frame" && a !== "--lookup" && rest[i - 1] !== "--lookup").join(" ");
  const frame = opt("frame"), lookup = opt("lookup");
  process.exit(run("packages/naive/src/engine/frames.ts", ["run", here(), ...(frame ? [frame] : []), ...(words ? ["--text", words] : []), ...(lookup ? ["--lookup", lookup] : [])]));
} else if (cmd === "roadmap") {
  // Decision roadmaps (packages/naive/src/engine/roadmaps.ts): naive roadmap install <id> proposes each step's decisions, open.
  if (rest[0] === "install") process.exit(run("packages/naive/src/engine/roadmaps.ts", ["install", here(), rest[1]]));
  process.exit(run("packages/naive/src/engine/roadmaps.ts", ["list"]));
} else if (cmd === "phase") {
  // The venture development lifecycle (packages/naive/src/engine/lifecycle.ts): where the venture is, its gate, and moving on.
  // naive phase | naive phase --meet <criterion> [--evidence <text>] | naive phase <next> [--reason] [--override]
  const target = rest.find((a, i) => !a.startsWith("--") && !["--venture", "--meet", "--evidence", "--reason", "--override", "--by"].includes(rest[i - 1]));
  const pass = ["evidence", "reason", "override", "by"].flatMap((k) => { const v = opt(k); return v !== undefined ? [`--${k}`, v] : []; });
  const meet = opt("meet");
  process.exit(run("packages/naive/src/engine/lifecycle.ts", [here(), ...(meet ? ["meet", meet] : target ? ["advance", target] : []), ...pass, ...(rest.includes("--json") ? ["--json"] : [])]));
} else if (cmd === "setup") {
  // Setup in the model's harness (EE-083): the state, the artifact, and the founder confirming relayed answers.
  process.exit(run("packages/naive/src/router/orchestration/setup.ts", [here(), ...(rest.length ? rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture") : ["state"])]));
} else if (cmd === "publish") {
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  if (args[0] === "check") {
    // The publish lint (packages/naive/src/engine/publish-lint.ts). Inside a venture, --venture defaults to it.
    const v = opt("venture") ?? findVenture();
    process.exit(run("packages/naive/src/engine/publish-lint.ts", [...args, ...(v ? ["--venture", v] : [])]));
  }
  // The publishing gate (packages/naive/src/engine/publish.ts): build, publish, rollback, status.
  const sub = ["build", "rollback", "status"].includes(args[0]) ? args.shift() ?? "publish" : "publish";
  process.exit(run("packages/naive/src/engine/publish.ts", [here(), sub, ...args]));
} else if (cmd === "port" || cmd === "migrate") {
  // Inside a venture, --venture defaults to it.
  const args = rest.includes("--venture") ? rest : [...rest, "--venture", here()];
  process.exit(run(cmd === "migrate" ? "packages/naive/src/router/orchestration/migrate-venture.ts" : "packages/naive/src/engine/port-venture.ts", args));
} else if (cmd === "capture" || cmd === "inbox" || cmd === "read") {
  // The workspace (packages/naive/src/engine/workspace.ts): the one above the venture this runs in, else above this folder.
  const venture = opt("venture") ? here() : findVenture();
  const ws = findWorkspace(venture ?? process.cwd());
  if (!ws) { console.error("no naive-workspace.json here or above"); process.exit(1); }
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  // naive read names the venture this session is in as the one reading.
  const from = venture ? JSON.parse(readFileSync(join(venture, "venture.json"), "utf8")).id ?? basename(venture) : "";
  process.exit(run("packages/naive/src/engine/workspace.ts", cmd === "read" ? ["read", ws, from, ...args] : [cmd, ws, ...args]));
} else if (cmd === "framework") {
  // A founder's own frameworks (packages/naive/src/engine/user-frameworks.ts): the workspace above the venture, else above this folder.
  const from = opt("venture") ? here() : process.cwd();
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  const [sub = "list", ...more] = args;
  process.exit(run("packages/naive/src/engine/user-frameworks.ts", [sub, ...more, from]));
} else if (cmd === "diagnose") {
  process.exit(run("scripts/diagnose-transcripts.ts", rest));
} else if (cmd === "activity") {
  process.exit(run("packages/naive/src/engine/activity.ts", rest));
} else if (cmd === "workspace") {
  // A workspace (packages/naive/src/engine/workspace-init.ts): made with its clock, calendar and first venture; renamed in place.
  const [sub, ...args] = rest;
  if (sub === "init") process.exit(run("packages/naive/src/engine/workspace-init.ts", args));
  if (sub === "rename") {
    const ws = findWorkspace(opt("workspace") ?? process.cwd());
    if (!ws) { console.error("no naive-workspace.json here or above"); process.exit(1); }
    process.exit(run("packages/naive/src/engine/workspace.ts", ["rename", ws, ...args.filter((a, i) => a !== "--workspace" && args[i - 1] !== "--workspace")]));
  }
  console.error("naive workspace init [<dir>] [--name <name>] (--venture <name> | --port <folder> | --migrate <project>)\nnaive workspace rename <name>");
  process.exit(2);
} else if (cmd === "calendar") {
  const ws = findWorkspace(opt("workspace") ?? process.cwd());
  if (!ws) { console.error("no naive-workspace.json here or above"); process.exit(1); }
  // A workspace from before the calendar gets its clock and calendar the first time it asks for them.
  try { if (!existsSync(join(ws, "calendar/calendars"))) ensureWorkspace(ws); } catch (e) { console.error((e as Error).message); process.exit(1); }
  const [sub = "list", ...args] = rest[0] && !rest[0].startsWith("--") ? rest : ["list", ...rest];
  process.exit(run("packages/naive/src/engine/calendar.ts", [sub, ws, ...args.filter((a, i) => a !== "--workspace" && args[i - 1] !== "--workspace")]));
} else if (cmd === "beta" || cmd === "bugs") {
  // The plugin beta's gate (packages/naive/src/engine/beta-gate.ts) and the bug summary (packages/naive/src/engine/bugs.ts).
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run(cmd === "beta" ? "packages/naive/src/engine/beta-gate.ts" : "packages/naive/src/engine/bugs.ts", [here(), ...(cmd === "beta" && !args.length ? ["status"] : args)]));
} else if (cmd === "handoff") {
  // A handoff's done-criteria: a durable workflow when durable.engine is sqlite or postgres, else run-handoff.ts (EE-161).
  const [what, id, ...args] = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  if (what !== "run" || !id) { console.error("usage: naive handoff run <id> [--runner <id>] [--venture <dir>]"); process.exit(2); }
  const dir = here();
  const { durableEngine } = await import("../../router/orchestration/durable-handoff.ts");
  const durable = durableEngine(dir) !== "memory";
  process.exit(run(durable ? "packages/naive/src/router/orchestration/durable-handoff.ts" : "packages/naive/src/engine/run-handoff.ts", [dir, id, ...args]));
} else if (cmd === "run") {
  // A venture program on the venture runtime (packages/naive/src/engine/venture-program.ts, EE-161).
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("packages/naive/src/engine/venture-program.ts", [...args, "--venture", here()]));
} else if (cmd === "trace") {
  // Traces in the venture's files (packages/naive/src/engine/trace-cli.ts, EE-121).
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("packages/naive/src/engine/trace-cli.ts", [here(), ...(args.length ? args : ["show"])]));
} else if (cmd === "goals") {
  // The goal ledger (packages/naive/src/engine/goals.ts, EE-210): the tree, one goal, its history, and a person
  // settling it. Not `naive goal`, and not the discovery goal of the setup page, which is a decision.
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  const [what = "list"] = args.filter((a) => !a.startsWith("--"));
  if (!["list", "show", "history", "status"].includes(what)) { console.error("usage: naive goals [list] | show <id> [--at <iso>] | history <id> | status <id> <status> --by <person> [--note <text>] [--measure <id>=<value>] [--superseded-by <id>] [--venture <dir>] [--json]"); process.exit(2); }
  process.exit(run("packages/naive/src/engine/goals.ts", [here(), ...args]));
} else if (cmd === "due") {
  // Which function workflows are due, and recording a run (packages/naive/src/engine/due.ts, EE-182).
  // --at, --function and --json pass through, and --outcome, --by and --steps for record.
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("packages/naive/src/engine/due.ts", [here(), ...args]));
} else if (cmd === "blocked") {
  // Which workflows may run and which are locked, in hierarchical order (packages/naive/src/engine/prerequisites.ts,
  // EE-217). --json passes through.
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("packages/naive/src/engine/prerequisites.ts", [here(), ...args]));
} else if (cmd === "graph") {
  // The element graph over the shipped function modules (packages/naive/src/engine/element-graph.ts, EE-188), with
  // --function <id>, --element <id>, --json and --mermaid passed through. It needs no venture.
  process.exit(run("packages/naive/src/engine/element-graph.ts", rest));
} else if (cmd === "effects") {
  // Each element's state, capability level and effects for the venture (packages/naive/src/engine/element-effects.ts,
  // EE-190), or for one element what happens downstream if it were absent, weak or strong. --at and --json pass through.
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("packages/naive/src/engine/element-effects.ts", [here(), ...args]));
} else if (cmd === "loop") {
  // The loop that starts due workflows as far as the venture's mode allows (packages/naive/src/engine/loop.ts, EE-183).
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("packages/naive/src/engine/loop.ts", [here(), ...args]));
} else if (cmd === "tools") {
  // Tool recommendations for a goal or an activity, scored on the visibility rubric
  // (packages/naive/src/engine/tool-recommendations.ts, EE-222). --goal, --activity, --function, --json and --propose
  // pass through.
  const given = rest.filter((a, i) => !(a === "--venture" || rest[i - 1] === "--venture"));
  const args = given[0] && !given[0].startsWith("--") ? given : ["recommend", ...given];
  const [what, ...more] = args;
  if (what !== "recommend") { console.error("usage: naive tools recommend [--goal <id>] [--activity <id>] [--function <id>] [--json] [--propose] [--venture <dir>]"); process.exit(2); }
  process.exit(run("packages/naive/src/engine/tool-recommendations.ts", [here(), ...more]));
} else if (cmd === "skipped") {
  // The work left behind, and handing one item to its function agent (packages/naive/src/engine/skipped.ts, EE-213).
  // --function, --at and --json pass through, and --to for handback.
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("packages/naive/src/engine/skipped.ts", [here(), ...args]));
} else if (cmd === "render") {
  // A document's reading copy from the records the catalog says it is made of (packages/naive/src/engine/render-document.ts,
  // EE-218). With no kind it prints the catalog. --format and --json pass through; a rung above the reading copy is
  // refused until a person approved the one below, and the heavier formats are the harness's, not Naive's.
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("packages/naive/src/engine/render-document.ts", [here(), ...args]));
} else if (cmd === "problems") {
  // The customer problem tree and its ranking (packages/naive/src/engine/problems.ts, EE-219). The subcommand, tree or
  // rank, and --json pass through. It reads only.
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("packages/naive/src/engine/problems.ts", [here(), ...args]));
} else if (cmd === "bets") {
  // The venture's strategic claims (EE-221, packages/naive/src/router/orchestration/bets.ts). register, confidence
  // and resolve are a person's; show and score read only.
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  const [what = "show"] = args.filter((a) => !a.startsWith("--"));
  if (!["show", "register", "confidence", "resolve", "score"].includes(what)) { console.error("usage: naive bets [show [<id>]] | register <id> --by <person> | confidence <id> --p <0..1> --by <person> --data-seen <answer> | resolve <id> <happened|did-not-happen|mixed|unresolvable> --by <person> | score [--venture <dir>] [--json]"); process.exit(2); }
  process.exit(run("packages/naive/src/router/orchestration/bets.ts", [here(), ...args]));
} else if (cmd === "prereg") {
  // Pre-registrations: the plan for a test, fixed before it runs (EE-220,
  // packages/naive/src/router/orchestration/pre-registration.ts). register is a person's.
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("packages/naive/src/router/orchestration/pre-registration.ts", [here(), ...(args.length ? args : ["show"])]));
} else if (cmd === "owners") {
  // Who is accountable for each element of APQC's framework (packages/naive/src/engine/element-owners.ts, EE-187).
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("packages/naive/src/engine/element-owners.ts", [here(), ...args]));
} else if (cmd === "activities") {
  // What the activity catalog's scores propose for this venture (packages/naive/src/engine/activity-proposals.ts, EE-169).
  const [what = "list", ...args] = rest.filter((a, i) => !(a === "--venture" || rest[i - 1] === "--venture"));
  // The activities a person performs by default for their kind (packages/naive/src/engine/activity-kinds.ts, EE-179).
  if (what === "defaults") process.exit(run("packages/naive/src/engine/activity-kinds.ts", args));
  // The briefing a person reads, APQC levels 1 and 2 (packages/naive/src/engine/activity-briefing.ts, EE-180).
  if (what === "briefing") process.exit(run("packages/naive/src/engine/activity-briefing.ts", [here(), ...args]));
  if (!["list", "propose"].includes(what)) { console.error("usage: naive activities [list|propose] [--venture <dir>] [--json], naive activities defaults [--function <id>] [--json], or naive activities briefing [--venture <dir>] [--function <id>] [--json] (time spent is naive activity)"); process.exit(2); }
  process.exit(run("packages/naive/src/engine/activity-proposals.ts", [here(), what, ...args]));
} else if (cmd === "signals") {
  // The signal library (signal library design, build item 5): packages/naive/src/router/orchestration/signals.ts.
  const [what, ...args] = rest.filter((a, i) => !(a === "--venture" || rest[i - 1] === "--venture"));
  if (!["emit", "pull", "explain", "replay"].includes(what)) { console.error("usage: naive signals emit <type> --props '<json>' | pull | explain <signal id> | replay [--venture <dir>]"); process.exit(2); }
  process.exit(run("packages/naive/src/router/orchestration/signals.ts", [here(), what, ...args]));
} else if (cmd === "recipes") {
  // Starter recipes, eval plans and training feedback for a venture's recipes (packages/naive/src/engine/recipes/cli.ts).
  // That script reads --by, --weights, --gap, --min-gain and --json; the rest pass through. The knob search writes
  // through the router (packages/naive/src/router/orchestration/recipe-search.ts).
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  if (args[0] === "search") process.exit(run("packages/naive/src/router/orchestration/recipe-search.ts", [here(), ...args.slice(1)]));
  process.exit(run("packages/naive/src/engine/recipes/cli.ts", [here(), ...args]));
} else if (cmd === "sync") {
  // Offline sync with the business store (EE-178, packages/naive/src/engine/sync.ts). Refused in hosted mode.
  const args = rest.filter((a, i) => !(a === "--venture" || rest[i - 1] === "--venture"));
  const [what = "status", ...more] = args;
  if (!["link", "pull", "push", "status"].includes(what)) { console.error("usage: naive sync link <business> [--host <url>] | pull | push | status [--json] [--venture <dir>]"); process.exit(2); }
  process.exit(run("packages/naive/src/engine/sync.ts", [here(), what, ...more]));
} else if (cmd === "lint") {
  const [what, ...args] = rest.filter((a, i) => !(a === "--venture" || rest[i - 1] === "--venture"));
  if (what !== "premises") { console.error("usage: naive lint premises [<route>] [--drafts] [--json] [--propose]"); process.exit(2); }
  process.exit(run("packages/naive/src/checks/premise-lint.ts", [here(), ...args]));
} else if (cmd === "copy") {
  // The site's words before the site (EE-216): packages/naive/src/functions/marketing-and-sales/marketing/copy.ts.
  const args = rest.filter((a, i) => !(a === "--venture" || rest[i - 1] === "--venture"));
  const [what = "gaps"] = args;
  if (!["gaps", "check", "draft", "one-shot"].includes(what)) { console.error("usage: naive copy gaps [--page <id>] | check | draft [--element <id>] [--propose] [--print] | one-shot --by <person> [--why <text>]   [--venture <dir>] [--json]"); process.exit(2); }
  process.exit(run("packages/naive/src/functions/marketing-and-sales/marketing/copy.ts", [here(), ...args]));
} else if (cmd === "typegen") {
  const { TOOLS } = await import("../mcp/server.ts");
  const { routes } = await import("../../router/router.ts");
  const out = join(repo, ".naive/types");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "tools.json"), JSON.stringify(TOOLS, null, 2) + "\n");
  writeFileSync(join(out, "routes.json"), JSON.stringify(routes().map((r: { route: string, actions: string[], kind: string }) => ({ route: r.route, actions: r.actions, kind: r.kind })), null, 2) + "\n");
  console.log(`wrote ${out}`);
} else if (cmd === "agent") {
  // list, brief and run for the function and lead agents (packages/naive/src/engine/agents/run.ts, EE-124).
  // --json, --print and --workflow pass through; a run whose --workflow is blocked is refused (EE-217).
  process.exit(run("packages/naive/src/engine/agents/run.ts", rest));
} else if (cmd === "new") {
  // A new venture: create-venture's questions and scaffold, so the whole lifecycle starts from this one command.
  process.exit(run("packages/create-venture/index.mjs", rest));
} else if (cmd && cmd !== "help" && cmd !== "--help" && !rest.includes("--help")) {
  // Every other command is a record command: the routes, drafts, decisions and freshness over the router (EE-030).
  // They live in mentura.ts, and naive runs them, so one CLI covers the whole venture; mentura stays as an alias.
  process.exit(run("packages/naive/src/interfaces/cli/mentura.ts", [cmd, ...rest]));
} else {
  const lines = (file: URL, from: string): string[] => readFileSync(file, "utf8").split("\n").filter((l) => l.startsWith("//   ")).map((l) => (from ? l.slice(5).replace(from, "naive ") : l.slice(5)));
  const records = lines(new URL("./mentura.ts", import.meta.url), "mentura ");
  console.error([...lines(new URL(import.meta.url), ""), "", "Record commands (the same as mentura <command>):", ...records].join("\n"));
  process.exit(cmd && cmd !== "help" && cmd !== "--help" ? 1 : cmd ? 0 : 2);
}
