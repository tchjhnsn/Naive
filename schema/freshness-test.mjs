#!/usr/bin/env node
// Tests for freshness (Revalidating, V-1 to V-8) on made-up ventures in temporary folders: the two
// strategies (time and on demand), freshness profiles with a per-phase profile, live records that
// stay holes in a frozen shell, stale-while-revalidate on reads, a whole folder or a pivot marked
// stale, and tags preferred over paths. Never writes into the repository.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("..", import.meta.url).pathname;
const ws = mkdtempSync(join(tmpdir(), "freshness-test-"));
process.env.MENTURA_WORKSPACE = ws;
delete process.env.NAIVE_NOW;
const { call, routes } = await import("../interface/router.mjs");
const F = await import("./freshness.mjs");

let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const mentura = (...a) => spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), ...a], { encoding: "utf8", env: { ...process.env, MENTURA_WORKSPACE: ws } });
const init = (id, phase = "discovery") => { const p = spawnSync("node", [join(repo, "schema/init-venture.mjs"), join(ws, id), id, "--phase", phase, "--layers", "purpose"], { encoding: "utf8" }); if (p.status !== 0) throw new Error(p.stderr); return join(ws, id); };
const item = (f, path) => f.items.find((i) => i.path === path);
const write = (venture, route, input, provenance = {}) => call({ venture, route, action: "write", input, actor: "person", via: "cli", provenance });
const days = (n) => new Date(Date.now() + n * 86400e3).toISOString();

const solution = { venture: "v", statement: "Online booking that fills the calendar while the physio treats", alternatives: ["a receptionist"], evidence: [] };
const card = { id: "booking", name: "Clinic booking", description: "Online booking for solo physiotherapy clinics" };

// Profiles (V-2).
const P = F.profiles(null);
const ventureTypes = new Set(JSON.parse(readFileSync(join(repo, "schema/data-model.json"), "utf8")).records.filter((r) => r.level === "venture").map((r) => r.id));
expect("default profiles: every record type they name is a venture record type", Object.keys(P.records).every((t) => ventureTypes.has(t)), Object.keys(P.records).filter((t) => !ventureTypes.has(t)));
expect("default profiles follow cacheLife: stale, revalidate and expire, in seconds or units", F.seconds("30d") === 2592000 && F.seconds(90) === 90 && F.seconds("2w") === 1209600 && P.profiles.feedback.revalidate === "30d" && P.profiles.research.revalidate === "90d");
expect("default profiles add per_phase and live, which Next.js has no need for", P.profiles.assumption.per_phase === true && P.profiles.live.live === true);
let threw = null; try { F.seconds("soon"); } catch (e) { threw = e.message; }
expect("a duration that is not one is refused, so a typo never means never stale", /not a duration/.test(threw ?? ""));
const schemaCheck = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", "freshness-profiles.schema.json", "--file", join(repo, "knowledge/freshness.json")], { encoding: "utf8" });
expect("knowledge/freshness.json matches its schema", schemaCheck.status === 0, schemaCheck.stdout);

// A venture with a solution, a product card derived from it, and a customer.
const dir = init("clinic");
expect("write: the solution", (await write("clinic", "validation/solution", { ...solution, venture: "clinic" })).ok);
expect("write: a product card derived from the solution", (await write("clinic", "product/booking", card, { derived_from: ["validation/solution"] })).ok);
const cust = await write("clinic", "customers/ana", { id: "ana", name: "Ana's clinic" });
expect("write: a customer", cust.ok, cust);
let f = await F.freshness(dir);
expect("V-1: everything just written is fresh", f.summary.stale === 0 && f.summary.expired === 0 && f.items.every((i) => i.state === "fresh"), f.summary);
expect("V-4 tags: the product card depends on the solution (derived_from, written as a route)", item(f, "products/booking.json")?.depends_on.includes("validation/solution.json") || item(f, "product/booking.json")?.depends_on.includes("validation/solution.json"), f.items.map((i) => [i.path, i.depends_on]));
const cardPath = f.items.find((i) => i.record === "product").path;
expect("V-2: each record gets its profile (assumption, research, live)", item(f, "validation/solution.json").profile === "assumption" && item(f, cardPath).profile === "research" && f.items.find((i) => i.record === "customer").profile === "live");

// Time (V-1, V-2).
f = await F.freshness(dir, { now: days(40) });
expect("by time: a research record is still fresh at 40 days", item(f, cardPath).state === "fresh");
f = await F.freshness(dir, { now: days(100) });
expect("by time: past revalidate (90 days) the solution and card are stale, with an age reason", item(f, "validation/solution.json").state === "stale" && item(f, "validation/solution.json").reasons[0].kind === "age" && item(f, cardPath).state === "stale");
expect("by time: age does not spread to dependents as a separate reason", !item(f, cardPath).reasons.some((r) => r.kind === "depends"));
f = await F.freshness(dir, { now: days(400) });
expect("by time: past expire (365 days) the solution has expired", item(f, "validation/solution.json").state === "expired");
process.env.NAIVE_NOW = days(400);
f = await F.freshness(dir);
expect("now is an input: NAIVE_NOW sets it (C-9)", item(f, "validation/solution.json").state === "expired");
delete process.env.NAIVE_NOW;
const shellBlocked = await F.freeze(dir, join(ws, "shell-expired"), { now: days(400) });
expect("an expired record blocks the shell, by name", !shellBlocked.ok && shellBlocked.blocked.includes("validation/solution.json"), shellBlocked);

// The venture's own profiles (naive.config.json, like next.config.js cacheLife).
writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ freshness: { profiles: { weekly: { revalidate: "7d", expire: "30d" } }, records: { product: "weekly" } } }));
f = await F.freshness(dir, { now: days(10) });
expect("naive.config.json: a venture profile assigned to a record type applies", item(f, cardPath).profile === "weekly" && item(f, cardPath).state === "stale");
writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ freshness: { records: { validation: "weekly" } } }));
threw = null; try { await F.freshness(dir); } catch (e) { threw = e.message; }
expect("naive.config.json: a record assigned an undefined profile is refused, naming it", /weekly, which is not defined/.test(threw ?? ""), threw);
writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ freshness: { profiles: { weekly: { revalidate: "7d" } }, records: { validation: "weekly" } } }));
f = await F.freshness(dir, { now: days(10) });
expect("naive.config.json: a route prefix beats the record type", item(f, "validation/solution.json").profile === "weekly" && item(f, cardPath).profile === "research");
writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ freshness: {} }));

// On demand: tags (V-5) and stale-while-revalidate on reads.
const tag = await F.revalidate(dir, "tag:validation/solution", { reason: "a competitor launched online booking" });
expect("V-5 revalidate a tag: the record and what depends on it are marked", tag.ok && tag.result.records[0] === "validation/solution.json" && tag.result.dependents.includes(cardPath), tag);
f = await F.freshness(dir);
expect("V-5: the solution is stale by its tag; the card by depending on it", item(f, "validation/solution.json").reasons[0].kind === "tag" && item(f, cardPath).reasons.some((r) => r.kind === "depends" && r.dependency === "validation/solution.json"));
let read = await call({ venture: "clinic", route: "product/booking", action: "read" });
expect("V-5 stale-while-revalidate: the card is still read, with a stale flag and the fix", read.ok && read.result?.name === "Clinic booking" && read.freshness?.state === "stale" && /mentura verify/.test(read.freshness.fix), read);
const list = await call({ venture: "clinic", route: "product", action: "read" });
expect("V-5: a list read flags its stale items by file", list.ok && list.freshness?.[cardPath]?.state === "stale", list.freshness);
const viaMcpShape = await call({ venture: "clinic", route: "validation/solution", action: "read", via: "mcp" });
expect("V-5: every interface gets the flag (it is the router's)", viaMcpShape.freshness?.reasons?.[0]?.kind === "tag");
// V-6: the founder's own write is fresh at once.
expect("V-6 rewrite: the solution written again", (await write("clinic", "validation/solution", { ...solution, venture: "clinic", alternatives: ["a receptionist", "phone and paper"] })).ok);
read = await call({ venture: "clinic", route: "validation/solution", action: "read" });
expect("V-6: the next read after your own write shows it fresh, with no flag", read.ok && read.result.alternatives.length === 2 && !read.freshness, read.freshness);
f = await F.freshness(dir);
expect("on demand: the card is now stale because what it was derived from changed", item(f, cardPath).reasons[0].kind === "changed", item(f, cardPath).reasons);
const v = F.verify(dir, "product/booking", { reason: "still describes the product" });
f = await F.freshness(dir);
expect("verify: a record checked and still right is fresh again, unchanged", v.ok && item(f, cardPath).state === "fresh" && /freshness log: verified/.test(item(f, cardPath).basis), item(f, cardPath));

// Where-used drift: a child record that repeats a fact goes stale when the parent changes.
writeFileSync(join(dir, "profile.md"), "Clinic booking for solo clinics.\n");
writeFileSync(join(dir, "knowledge/where-used.json"), JSON.stringify({ facts: [{ id: "product-name", parent: { route: "product/booking", pointer: "/name" }, children: [
  { source: "venture", path: "profile.md", match: { kind: "text", template: "{value}" }, status: "live", deliver: "agent" },
  { source: "venture", path: "public/index.md", match: { kind: "text", template: "{value}" }, status: "live", deliver: "person" }] }] }));
writeFileSync(join(dir, "public/index.md"), "Clinic booking\n");
f = await F.freshness(dir);
expect("where-used: children that show the parent's value are fresh", item(f, "profile.md").state === "fresh" && f.copies[0]?.state === "fresh", [item(f, "profile.md"), f.copies]);
expect("write: the product renamed", (await write("clinic", "product/booking", { ...card, name: "ClinicBook" })).ok);
f = await F.freshness(dir);
expect("V-5 where-used: the profile repeating the old name has drifted and is stale, exactly", item(f, "profile.md").reasons[0]?.kind === "drift" && item(f, "profile.md").precise, item(f, "profile.md"));
expect("V-5 where-used: a page that is not a record is listed as a stale copy, with who delivers", f.copies.find((c) => c.path === "public/index.md")?.state === "stale" && f.copies[0].deliver === "person", f.copies);

// Paths (V-7) and preferring tags (V-8).
const plain = await F.revalidate(dir, "validation");
expect("V-8: a plain folder is refused, with the exact tags to use instead and the path form", !plain.ok && /Prefer tags/.test(plain.error) && plain.suggest.includes("tag:validation/solution") && plain.or === "path:validation", plain);
const cli = mentura("revalidate", "validation", "--venture", "clinic");
expect("V-8: the CLI refuses a plain folder (exit 1) and prints the tags", cli.status === 1 && /tag:validation\/solution/.test(cli.stderr), cli.stderr);
const path = await F.revalidate(dir, "path:validation", { reason: "new interviews" });
expect("V-7 revalidate a path: every record under the folder is marked", path.ok && path.result.records.includes("validation/solution.json"), path);
f = await F.freshness(dir);
expect("V-7: the card depending on the solution follows", item(f, cardPath).reasons.some((r) => r.kind === "depends"));
expect("V-8: a record stale both by a dependency and a folder lists the exact reason first", item(f, cardPath).reasons[0].kind === "drift" || ["changed", "depends", "tag"].includes(item(f, cardPath).reasons[0].kind), item(f, cardPath).reasons);
expect("V-8: the summary counts stale by dependency apart from stale by folder only", f.summary.stale_by_folder_only >= 1 && f.summary.stale_by_dependency >= 1, f.summary);
const missing = await F.revalidate(dir, "tag:validation/pricing");
expect("a tag that is not a record in the venture is refused", !missing.ok && /not a record/.test(missing.error));
F.verify(dir, "path:validation"); F.verify(dir, "product/booking"); F.verify(dir, "profile.md");
const pivot = mentura("revalidate", "--pivot", "--venture", "clinic", "--reason", "from clinics to gyms", "--as", "person", "--json");
const pv = JSON.parse(pivot.stdout || "{}");
expect("V-7 pivot: revalidates the validation package, so every assumption is tested again", pivot.status === 0 && pv.pivot === true && pv.target === "package:validation" && pv.records.includes("validation/solution.json"), pivot.stderr || pivot.stdout);
f = await F.freshness(dir);
expect("pivot: the solution is stale with a pivot reason; the customer is not", item(f, "validation/solution.json").reasons.some((r) => r.kind === "package" && r.pivot) && f.items.find((i) => i.record === "customer").state === "fresh");
F.verify(dir, "path:validation"); F.verify(dir, "product/booking");

// Per phase (V-2).
const agentPhase = mentura("phase", "validation", "--venture", "clinic");
expect("phase: an agent may not change the phase", agentPhase.status === 1 && /a person's/.test(agentPhase.stderr));
const ph = mentura("phase", "validation", "--venture", "clinic", "--as", "person", "--json");
expect("phase: a person moves the venture to validation; venture.json says so", ph.status === 0 && JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).phase === "validation", ph.stderr);
expect("phase: leaving Discovery adds the empty core product, as init does, and says to fill it in", JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).core?.promise === "" && /core product/.test(ph.stdout));
expect("phase: moving to the phase it is already in is refused", mentura("phase", "validation", "--venture", "clinic", "--as", "person").status === 1);
f = await F.freshness(dir);
expect("V-2 per phase: assumption records are stale after the phase change; research records are not", item(f, "validation/solution.json").reasons.some((r) => r.kind === "phase") && item(f, cardPath).state === "fresh" && f.phase_changed?.to === "validation", [item(f, "validation/solution.json").reasons, item(f, cardPath).reasons]);
F.verify(dir, "validation/solution");
f = await F.freshness(dir);
expect("per phase: checked in the new phase, it is fresh again", item(f, "validation/solution.json").state === "fresh");
// A phase changed by hand is noticed.
const vj = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"));
writeFileSync(join(dir, "venture.json"), JSON.stringify({ ...vj, phase: "beachhead" }, null, 2) + "\n");
const later = new Date(Date.now() + 5000); utimesSync(join(dir, "venture.json"), later, later);
f = await F.freshness(dir);
expect("per phase: a phase changed by hand in venture.json counts, with a warning to record it", item(f, "validation/solution.json").reasons.some((r) => r.kind === "phase") && f.warnings.some((w) => /mentura phase beachhead/.test(w)), f.warnings);
writeFileSync(join(dir, "venture.json"), JSON.stringify(vj, null, 2) + "\n");

// Live holes and the shell (V-3).
const outside = join(ws, "shell");
const fr = await F.freeze(dir, outside);
const shell = fr.ok && JSON.parse(readFileSync(join(outside, "shell.json"), "utf8"));
expect("V-3 freeze: records are copied into the shell", fr.ok && existsSync(join(outside, "validation/solution.json")) && shell.frozen.some((x) => x.path === "validation/solution.json" && /^[0-9a-f]{64}$/.test(x.sha256)), fr);
expect("V-3: the customer is never frozen; it stays a live hole, with the route that reads it", !existsSync(join(outside, "customers/ana.json")) && shell.holes.some((h) => h.path === "customers/ana.json" && h.route === "customers/ana" && /read --venture clinic/.test(h.read)), shell.holes);
const inside = await F.freeze(dir, join(dir, "validation/shell"));
expect("V-3: freezing into a routed folder of the venture is refused", !inside.ok && /inside the venture/.test(inside.error));
const custRead = await call({ venture: "clinic", route: "customers/ana", action: "read" });
expect("V-3: reading a live record says it is a hole", custRead.ok && custRead.freshness?.hole === true, custRead.freshness);
f = await F.freshness(dir, { now: days(10) });
expect("V-3: a live record not synced within its window is stale but still a hole", f.items.find((i) => i.record === "customer").state === "stale" && f.items.find((i) => i.record === "customer").hole);

// Routes (every interface) and records.
const rs = routes();
expect("routes: system/freshness and system/revalidate are command routes", rs.some((r) => r.route === "system/freshness" && r.kind === "command") && rs.some((r) => r.route === "system/revalidate" && r.value_flag === "--revalidate"));
const run = await call({ venture: "clinic", route: "system/freshness", action: "run" });
expect("route system/freshness run reports the venture", run.ok && run.result.venture === "clinic" && run.result.summary.records >= 4, run.error);
const rr = await call({ venture: "clinic", route: "system/revalidate", action: "run", input: { value: "tag:product/booking" } });
expect("route system/revalidate run marks a tag", rr.ok && rr.result.records.includes(cardPath), rr.error);
const rf = await call({ venture: "clinic", route: "system/revalidate", action: "run", input: { value: "validation" } });
expect("route system/revalidate run refuses a plain folder", !rf.ok && /Prefer tags/.test(rf.error));
const log = await call({ venture: "clinic", route: "knowledge/freshness-log", action: "read" });
expect("the freshness log is a record: read through knowledge/freshness-log", log.ok && Array.isArray(log.result) && log.result.some((e) => e.event === "phase") && log.result.some((e) => e.pivot), log.error);
const lines = readFileSync(join(dir, "knowledge/freshness.jsonl"), "utf8").trim().split("\n");
let valid = true;
for (const l of lines) { const t = join(ws, "line.json"); writeFileSync(t, l); if (spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", "freshness-log.schema.json", "--file", t]).status !== 0) valid = false; }
expect("every freshness log line matches its schema", valid && lines.length >= 8);
const chain = spawnSync("node", [join(repo, "schema/check-provenance.mjs"), dir], { encoding: "utf8" });
expect("every revalidate, verify and phase is in the provenance log, and the chain holds", chain.status === 0 && /every chain holds/.test(chain.stdout), chain.stderr);
const report = spawnSync("node", [join(repo, "schema/freshness.mjs"), dir], { encoding: "utf8" });
expect("node schema/freshness.mjs prints the report", report.status === 0 && /clinic \(validation\)/.test(report.stdout), report.stderr);

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
