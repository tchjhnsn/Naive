#!/usr/bin/env node
// Tests for releases (naive build and naive start; C-10 to C-18, H-4, N-10, P-25, P-31, O-7, Z-3,
// I-17) on a made-up venture in a temp workspace. Never writes into the repository.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { lineHash } from "../packages/core/provenance.mjs";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${String(detail).slice(0, 600)}`}`); if (!ok) failed++; };

const ws = mkdtempSync(join(tmpdir(), "releases-test-"));
const ventures = join(ws, "ventures");
const env = /** @type {NodeJS.ProcessEnv} */ ({ ...process.env, MENTURA_WORKSPACE: ventures, MENTURA_AGENT_CMD: `node ${join(ws, "agent-called.mjs")}` });
delete env.MENTURA_MODEL; delete env.MENTURA_ACTOR; delete env.MENTURA_ACTOR_ID;
// A stand-in agent that leaves a mark if anything calls a model (C-10: building calls none).
writeFileSync(join(ws, "agent-called.mjs"), `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(join(ws, "AGENT_CALLED"))}, "1"); console.log("{}");\n`);
const run = (args, extra = {}, input) => spawnSync("node", args, { cwd: repo, env: { ...env, ...extra }, encoding: "utf8", input });
const mentura = (...a) => run([join(repo, "interface/cli/mentura.mjs"), ...a]);
const build = (dir, ...a) => run([join(repo, "interface/orchestration/build-release.mjs"), dir, ...a]);
const start = (dir, ...a) => run([join(repo, "schema/start-release.mjs"), dir, ...a]);
const get = (dir, path) => { const r = start(dir, "--get", path); let body = null; try { body = JSON.parse(r.stdout); } catch { body = r.stdout; } return { status: r.status, body }; };
const writeJson = (f, o) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(o, null, 2) + "\n"); };
const manifest = (dir) => JSON.parse(readFileSync(join(dir, ".release/release.json"), "utf8"));
const tree = (d, base = d) => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? tree(join(d, e.name), base) : [join(d, e.name).slice(base.length + 1)]) : [];

const dir = join(ventures, "kettle");
expect("init a venture", mentura("init", dir, "--id", "kettle", "--layers", "purpose").status === 0);

// ---- I-17, C-10: a fresh venture builds; the same records give the same release, whatever "now" is ----
let b = build(dir, "--now", "2026-10-29T00:00:00Z", "--port", "9");
expect("I-17: node interface/orchestration/build-release.mjs <venture dir> runs (and takes --port)", b.status === 0, b.stderr);
const first = manifest(dir);
expect("C-11: an empty venture's release is a shell of named holes (its four open framework decisions)", first.records.length === 0 && first.holes.filter((h) => h.kind === "decision").length === 4, JSON.stringify(first.holes.map((h) => h.name)));
b = build(dir, "--now", "2026-12-01T00:00:00Z");
const second = manifest(dir);
expect("C-10: the same venture gives the same release id; now is an input recorded in the manifest", second.release === first.release && second.now === "2026-12-01T00:00:00Z" && first.now === "2026-10-29T00:00:00Z", `${first.release} ${second.release}`);
expect("C-17: the second build reuses the local cache", second.cache.fresh === false && second.cache.hits > 0, JSON.stringify(second.cache));

// ---- C-13: an agent's unconfirmed write or a waiting draft in an open package blocks the build ----
const problem = { venture: "kettle", statement: "Cafes lose an hour a day to slow kettles", segment: "Independent cafes", evidence: [] };
writeJson(join(ws, "problem.json"), problem);
const w = mentura("foundation/problem", "write", "--venture", "kettle", "--input", join(ws, "problem.json"));
expect("an agent's write of the problem is held as a draft", w.status === 0 && existsSync(join(dir, "_drafts/foundation__problem.json.draft")), w.stdout + w.stderr);
b = build(dir);
expect("C-13: a draft in an open package blocks the build, names the file and the fix, exit 1", b.status === 1 && /foundation cannot be released/.test(b.stderr) && /_drafts\/foundation__problem\.json\.draft/.test(b.stderr) && /accept foundation\/problem/.test(b.stderr), b.stderr);
expect("C-13: a refused build leaves the last release as it was", manifest(dir).release === first.release);
expect("accept the draft as a person", mentura("accept", "foundation/problem", "--venture", "kettle", "--confirm", "foundation/problem").status === 0);
const solution = { venture: "kettle", statement: "A kettle that boils in a minute", alternatives: ["two kettles"], evidence: [] };
writeJson(join(ws, "solution.json"), solution);
const sw = mentura("validation/solution", "write", "--venture", "kettle", "--input", join(ws, "solution.json"));
b = build(dir, "--json");
const refused = (() => { try { return JSON.parse(b.stdout); } catch { return null; } })();
expect("C-13: an agent's unconfirmed write of a required record blocks its package", sw.status === 0 && b.status === 1 && refused?.blockers?.some((x) => x.file === "validation/solution.json" && /agent wrote it/.test(x.why) && /--as person/.test(x.fix)) && refused.packages.find((p) => p.id === "validation")?.releasable === false, b.stdout + b.stderr);
expect("write the solution again as a person", mentura("validation/solution", "write", "--venture", "kettle", "--input", join(ws, "solution.json"), "--as", "person").status === 0);

// ---- the rest of the venture ----
writeJson(join(ws, "icp.json"), { venture: "kettle", id: "cafes", who: "Independent cafe owners" });
mentura("foundation/icp/cafes", "write", "--venture", "kettle", "--input", join(ws, "icp.json"), "--as", "person");
writeJson(join(ws, "pricing.json"), { venture: "kettle", product: "kettle", model: "subscription", buyer: "cafe owner", evidence: [], points: [{ name: "Cafe", amount: 49, currency: "USD", period: "month" }] });
mentura("validation/pricing", "write", "--venture", "kettle", "--input", join(ws, "pricing.json"), "--as", "person");
// C-14: the product's description is mastered in the shop's own folder; the rest of the product is the venture's.
const rule = (o) => ({ record: "product", attribute: "*", phase: "*", product: "*", account: "*", actor: "*", owner: "founder", ...o });
mkdirSync(join(ws, "shop"), { recursive: true });
writeJson(join(dir, "knowledge/sources.json"), { sources: [{ id: "shop", connector: "filesystem", root: "../../shop" }], records: {}, rules: [rule({ system_of_record: "venture" }), rule({ attribute: "description", system_of_record: "shop" })] });
writeJson(join(ws, "kettle-product.json"), { id: "kettle", name: "Kettle", description: "Boils in a minute" });
const pw = mentura("product/kettle", "write", "--venture", "kettle", "--input", join(ws, "kettle-product.json"), "--as", "person");
expect("write a product as a person, its description to the shop source", pw.status === 0 && existsSync(join(ws, "shop/product/kettle.json")), pw.stdout + pw.stderr);
// Customers: one confirmed with a private field, one private record, one stream.
writeJson(join(ws, "bean.json"), { id: "bean", name: "Bean Cafe", phone: "555-0100", private_fields: ["phone"] });
mentura("customers/bean", "write", "--venture", "kettle", "--input", join(ws, "bean.json"), "--as", "person");
writeJson(join(ws, "secret.json"), { id: "secret", name: "SECRET-CAFE-NAME", private: true });
mentura("customers/secret", "write", "--venture", "kettle", "--input", join(ws, "secret.json"), "--as", "person");
writeJson(join(dir, "customers/_streams/orders/stream.json"), { id: "orders", sensitive: false });
writeFileSync(join(dir, "customers/_streams/orders/events.jsonl"), '{"at":"2026-10-29","order":1}\n');
writeJson(join(ws, "bank.json"), { id: "bank", name: "Checking", balance: 1200 });
mentura("money/bank", "write", "--venture", "kettle", "--input", join(ws, "bank.json"), "--as", "person");
// P-31: notes, private files and an agent's unconfirmed optional record never ship.
writeFileSync(join(dir, "foundation/notes.md"), "NOTES-NEVER-SHIP\n");
mkdirSync(join(dir, "_private/legal"), { recursive: true });
writeFileSync(join(dir, "_private/legal/term-sheet.md"), "PRIVATE-TERMS\n");
writeJson(join(ws, "pmf.json"), { venture: "kettle", product: "kettle", segment: "AGENT-PMF-UNCONFIRMED", evidence: [] });
const tw = mentura("validation/product-market-fit", "write", "--venture", "kettle", "--input", join(ws, "pmf.json"));
expect("an agent writes product-market fit (optional in the validation package)", tw.status === 0, tw.stderr);
// A draft beside a confirmed record: the confirmed one ships, the draft does not.
writeJson(join(ws, "icp2.json"), { venture: "kettle", id: "cafes", who: "DRAFT-WHO" });
mentura("foundation/icp/cafes", "write", "--venture", "kettle", "--input", join(ws, "icp2.json"));

b = build(dir, "--now", "2026-10-30T00:00:00Z");
expect("build passes once every required record is confirmed or not yet written", b.status === 0, b.stderr + b.stdout);
const m = manifest(dir);
const files = m.records.map((r) => r.file);
const all = tree(join(dir, ".release")).map((f) => readFileSync(join(dir, ".release", f), "utf8")).join("\n");

// C-11: confirmed records frozen in, holes for what stays live.
expect("C-11: confirmed records are frozen in with their sha256, date and who confirmed them",
  ["foundation/problem.json", "foundation/icp/cafes.json", "validation/solution.json", "validation/pricing.json", "product/kettle.json", "customers/bean.json"].every((f) => files.includes(f)) && m.records.every((r) => /^[0-9a-f]{64}$/.test(r.sha256) && r.as_of && r.confirmed_by), JSON.stringify(files));
expect("C-11: the frozen copy is the record as confirmed", JSON.parse(readFileSync(join(dir, ".release/records/foundation/problem.json"), "utf8")).statement === problem.statement);
const kinds = new Set(m.holes.map((h) => h.kind));
expect("C-11: open decisions, streams and money are named live holes", ["decision", "stream", "money", "attribute"].every((k) => kinds.has(k)) && !files.includes("money/bank.json"), JSON.stringify([...kinds]));
// C-14: holes sit at the leaves.
const attr = m.holes.find((h) => h.kind === "attribute");
const frozenProduct = JSON.parse(readFileSync(join(dir, ".release/records/product/kettle.json"), "utf8"));
expect("C-14: a field mastered elsewhere is a hole at the field; the rest of the record is frozen", attr?.field === "description" && attr.file === "product/kettle.json" && frozenProduct.name === "Kettle" && !("description" in frozenProduct), JSON.stringify(attr));
const productPkg = m.packages.find((p) => p.id === "product");
expect("C-14: a package with a live leaf still releases, and reports its shell share", productPkg?.releasable && productPkg.shell > 0 && productPkg.shell < 1 && productPkg.frozen.includes("product/kettle.json"), JSON.stringify(productPkg));
expect("C-14: each hole is one item (one decision, one stream, one account), with how to move it", m.holes.every((h) => h.name && h.why && h.to_freeze) && m.holes.filter((h) => h.kind === "decision").every((h) => /decide/.test(h.to_freeze)));
// C-13: the packages report.
expect("C-13: every open package is reported releasable, with the gaps it still has", m.packages.length >= 3 && m.packages.every((p) => p.releasable) && m.packages.find((p) => p.id === "validation").gaps.includes("validation-go-to-market"), JSON.stringify(m.packages.map((p) => [p.id, p.gaps])));
// P-31: only confirmed records ship.
expect("P-31: notes, _private/, drafts and an agent's unconfirmed record never ship", !/NOTES-NEVER-SHIP|PRIVATE-TERMS|AGENT-PMF-UNCONFIRMED|DRAFT-WHO/.test(all) && !files.some((f) => f.startsWith("_") || f.includes("_drafts")), files.join(", "));
expect("P-31: an unconfirmed optional record and a draft beside a confirmed record are listed as left out, with why", m.left_out.some((x) => /validation(\/|__)product-market-fit\.json/.test(x.file) && /agent|draft/.test(x.why)) && m.left_out.some((x) => x.file === "_drafts/foundation__icp__cafes.json.draft" && /confirmed version ships/.test(x.why)) && m.left_out.some((x) => x.file === "foundation/notes.md"), JSON.stringify(m.left_out));
expect("P-31: a private record and a private field are withheld, by count and by field name only", !/SECRET-CAFE-NAME|555-0100/.test(all) && m.withheld.private_records === 1 && m.withheld.private_folder_files === 1 && m.records.find((r) => r.file === "customers/bean.json")?.withheld_fields?.[0] === "phone", JSON.stringify(m.withheld));
// N-10: items known at build time are enumerated.
expect("N-10: collection items known at build time are enumerated", JSON.stringify(m.items["product/[id]"]) === '["kettle"]' && JSON.stringify(m.items["customers/[id]"]) === '["bean"]', JSON.stringify(m.items));
// H-4: a read that touches no model and no live data is frozen; one that does is a hole.
const route = (r) => m.routes.find((x) => x.route === r);
expect("H-4: a command that reads only records is run at build time and frozen in", route("purpose/foundation")?.in === "release" && m.commands["purpose/foundation"]?.result && m.commands["purpose/foundation"].built_from === m.release, JSON.stringify(route("purpose/foundation")));
expect("H-4: a command that reads the clock or calls a model is a live hole that says why", route("governance/decisions")?.in === "hole" && /clock/.test(route("governance/decisions").why) && route("system/package")?.in === "hole" && /model/.test(route("system/package").why), JSON.stringify([route("governance/decisions"), route("system/package")]));
expect("H-4, C-10: frozen answers are computed from the confirmed records alone", !JSON.stringify(m.commands).includes("AGENT-PMF") && !JSON.stringify(m.commands).includes(ws), "a frozen answer leaks an unconfirmed value or a temp path");
expect("H-4: record routes say whether the release holds them", route("foundation/problem")?.in === "release" && route("money/[id]")?.in === "hole" && route("validation/go-to-market")?.in === "empty" && route("raw/dump")?.in === "left out", JSON.stringify([route("foundation/problem"), route("money/[id]"), route("validation/go-to-market")]));
expect("C-10: building called no model", !existsSync(join(ws, "AGENT_CALLED")));

// P-25, O-7: the release card.
const card = JSON.parse(readFileSync(join(dir, ".release/card.json"), "utf8"));
const price = card.headline.find((h) => h.label === "Price");
expect("P-25, O-7: the release card holds name, phase, headline numbers with their dates, and who confirmed them", card.name === "kettle" && card.phase === "discovery" && card.release === m.release && price?.value === 49 && price.unit === "USD per month" && card.headline.every((h) => h.as_of) && card.confirmed_by.length > 0, JSON.stringify(card.headline));
const svg = run([join(repo, "schema/release-card.mjs"), dir]);
expect("O-7: the interface draws the card; the release holds no picture or styles", svg.status === 0 && svg.stdout.startsWith("<svg") && svg.stdout.includes("kettle") && svg.stdout.includes("49") && !tree(join(dir, ".release")).some((f) => /\.(svg|css|html|png)$/.test(f)), svg.stderr);

// C-17: stores and keys.
expect("C-17: the cache lives in .naive/, ignored by git, never in the release", existsSync(join(dir, ".naive/cache/release.json")) && readFileSync(join(dir, ".naive/.gitignore"), "utf8").includes("*") && !tree(join(dir, ".release")).some((f) => f.includes(".naive")));
expect("C-17: the release and cache key holds the framework version, the package definitions and the model", m.key.framework === readFileSync(join(repo, "schema/VERSION"), "utf8").trim() && /^[0-9a-f]{16}$/.test(m.key.packages) && m.key.model === null);
const again = (b = build(dir, "--now", "2026-10-30T00:00:00Z"), manifest(dir));
expect("C-17: a rebuild with nothing changed reuses the cache and gives the same release", again.release === m.release && again.cache.fresh === false && again.cache.misses === 0, JSON.stringify(again.cache));
b = run([join(repo, "interface/orchestration/build-release.mjs"), dir, "--now", "2026-10-30T00:00:00Z"], { MENTURA_MODEL: "claude-opus-5-5" });
const modelled = manifest(dir);
expect("C-17: changing the model starts the cache fresh (and changes the release key)", b.status === 0 && modelled.cache.fresh === true && modelled.cache.previous_key?.model === null && modelled.key.model === "claude-opus-5-5" && modelled.release !== m.release, JSON.stringify(modelled.cache));
build(dir, "--now", "2026-10-30T00:00:00Z");
const base = manifest(dir);
expect("the build is in the provenance log as a release", readFileSync(join(dir, "provenance.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).some((e) => e.activity === "release" && e.entity === ".release/release.json" && e.note.includes(base.release)));
const viaRouter = mentura("system/release", "read", "--venture", "kettle", "--json");
expect("the release is a record the router reads too (system/release), for agents in the venture", viaRouter.status === 0 && JSON.parse(viaRouter.stdout).result[".release/release.json"]?.release === base.release, viaRouter.stdout.slice(0, 300) + viaRouter.stderr);
const provCheck = run([join(repo, "schema/check-provenance.mjs"), dir]);
expect("the log still checks after building", provCheck.status === 0, provCheck.stderr);

// ---- C-12: read without the router ----
const imports = (f, seen = new Set()) => { if (seen.has(f)) return seen; seen.add(f); for (const x of readFileSync(f, "utf8").matchAll(/(?:from|import\()\s*["'](\.{1,2}\/[^"']+)["']/g)) imports(resolve(dirname(f), x[1]), seen); return seen; };
const served = [...imports(join(repo, "schema/start-release.mjs"))].map((f) => f.slice(repo.length));
expect("C-12: start-release reads the release without the router (no import reaches interface/router.mjs)", !served.includes("interface/router.mjs") && served.includes("schema/release-read.mjs"), served.join(", "));
let g = get(dir, "/");
expect("C-12: the index names the release, its routes and its holes", g.status === 0 && g.body.release === base.release && g.body.routes.includes("foundation/problem") && g.body.holes.length === base.holes.length, JSON.stringify(g.body).slice(0, 300));
g = get(dir, "/foundation/problem");
expect("C-12: a frozen record is served with its date and who confirmed it", g.status === 0 && g.body.record.statement === problem.statement && g.body.as_of && g.body.confirmed_by, JSON.stringify(g.body));
g = get(dir, "/product/kettle");
expect("C-14: a served record names its live fields", g.status === 0 && g.body.live_fields?.[0] === "description", JSON.stringify(g.body));
g = get(dir, "/money/bank");
expect("C-11: a hole is served as a hole, with where to read it live", g.status === 0 && g.body.hole === true && /money\/bank read/.test(g.body.live), JSON.stringify(g.body));
g = get(dir, "/product");
expect("N-10: a list route serves the items known at build time", g.status === 0 && Object.keys(g.body.items).join() === "kettle", JSON.stringify(g.body).slice(0, 200));
g = get(dir, "/purpose/foundation");
expect("H-4: a frozen command answer is served from the release", g.status === 0 && g.body.frozen === true && g.body.built_from, JSON.stringify(g.body).slice(0, 200));
// Change the venture after the build: the release still answers as built.
rmSync(join(dir, "foundation/problem.json"));
g = get(dir, "/foundation/problem");
expect("C-12: the release answers as built after the venture's records change", g.status === 0 && g.body.record.statement === problem.statement);
mentura("accept", "foundation/problem", "--venture", "kettle", "--confirm", "foundation/problem");
writeJson(join(ws, "problem.json"), problem);
mentura("foundation/problem", "write", "--venture", "kettle", "--input", join(ws, "problem.json"), "--as", "person");

// The server itself.
const server = spawn("node", [join(repo, "schema/start-release.mjs"), dir, "--port", "0"], { cwd: repo, env });
const port = await new Promise((ok) => { let out = ""; server.stdout.on("data", (d) => { out += d; const x = out.match(/127\.0\.0\.1:(\d+)/); if (x) ok(Number(x[1])); }); setTimeout(() => ok(null), 8000); });
expect("I-17: node schema/start-release.mjs <venture dir> --port n serves on 127.0.0.1", !!port);
if (port) {
  const at = (p, o) => fetch(`http://127.0.0.1:${port}${p}`, o);
  const idx = /** @type {{ release: string }} */ (await at("/").then((r) => r.json()));
  const post = await at("/foundation/problem", { method: "POST", body: "{}" });
  const svgRes = await at("/card.svg");
  const missing = await at("/customers/acme");
  expect("C-12: the server serves the release index", idx.release === base.release);
  expect("C-12: a release is read-only: a POST answers 405", post.status === 405 && post.headers.get("allow") === "GET, HEAD");
  expect("O-7: /card.svg is the card drawn by the interface", svgRes.status === 200 && /image\/svg\+xml/.test(svgRes.headers.get("content-type")) && (await svgRes.text()).includes("kettle"));
  const miss = /** @type {{ not_in_release?: boolean, items: string[], add: string }} */ (await missing.json());
  expect("C-18: an item not known at build time answers 404 with the shell's items and the command that adds it", missing.status === 404 && miss.not_in_release && miss.items.includes("bean") && /--add customers\/acme/.test(miss.add), JSON.stringify(miss));
  // C-18: add one new item without rebuilding the rest.
  writeJson(join(ws, "acme.json"), { id: "acme", name: "Acme Coffee" });
  mentura("customers/acme", "write", "--venture", "kettle", "--input", join(ws, "acme.json"), "--as", "person");
  const before = manifest(dir);
  const mtimes = Object.fromEntries(before.records.map((r) => [r.file, statSync(join(dir, ".release/records", r.file)).mtimeMs]));
  const a = build(dir, "--add", "customers/acme");
  const after = manifest(dir);
  const live = await at("/customers/acme");
  expect("C-18: --add puts a new item into the release, served at once", a.status === 0 && live.status === 200 && /** @type {{ record: { name: string } }} */ (await live.json()).record.name === "Acme Coffee", a.stderr);
  expect("C-18: nothing else is rebuilt: every other entry and frozen file is untouched", before.records.every((r) => JSON.stringify(after.records.find((x) => x.file === r.file)) === JSON.stringify(r) && statSync(join(dir, ".release/records", r.file)).mtimeMs === mtimes[r.file]) && after.built_at === before.built_at && after.incremental.at(-1)?.from === before.release && after.release !== before.release, JSON.stringify(after.incremental));
  expect("C-18: the card follows the release", JSON.parse(readFileSync(join(dir, ".release/card.json"), "utf8")).headline.find((h) => h.label === "Customers")?.value === 2);
  server.kill();
} else server.kill();
const dup = build(dir, "--add", "customers/acme");
expect("C-18: adding an item already in the release is refused", dup.status === 1 && /already in release/.test(dup.stderr), dup.stderr);
writeJson(join(ws, "beta.json"), { id: "beta", name: "Beta Beans" });
mentura("customers/beta", "write", "--venture", "kettle", "--input", join(ws, "beta.json"));
const unconfirmedAdd = build(dir, "--add", "customers/beta");
expect("C-18: an item no person confirmed cannot be added", unconfirmedAdd.status === 1 && /agent wrote it/.test(unconfirmedAdd.stderr) && !manifest(dir).records.some((r) => r.file === "customers/beta.json"), unconfirmedAdd.stderr);

// ---- Z-3: export ----
const out = join(ws, "export");
const ex = build(dir, "--export", out);
const exported = tree(out);
const exText = exported.map((f) => readFileSync(join(out, f), "utf8")).join("\n");
const exManifest = JSON.parse(readFileSync(join(out, "release.json"), "utf8"));
expect("Z-3: export writes the release as Markdown and JSON files", ex.status === 0 && exported.includes("README.md") && exported.includes("records/foundation/problem.json") && exported.includes("records/foundation/problem.md"), ex.stderr + exported.join(","));
expect("Z-3: an export has no live holes, only their count", !("holes" in exManifest) && exManifest.export.holes === 0 && exManifest.export.live_left_out > 0 && !/founding-team|_streams|money\/bank/.test(exText), JSON.stringify(exManifest.export));
expect("Z-3: every number and record in an export carries its date", JSON.parse(readFileSync(join(out, "card.json"), "utf8")).headline.every((h) => h.as_of) && /As of 20\d\d-/.test(readFileSync(join(out, "records/foundation/problem.md"), "utf8")) && exManifest.records.every((r) => r.as_of));
const ex2 = build(dir, "--export", out);
expect("Z-3: an export never writes over files", ex2.status === 1 && /not empty/.test(ex2.stderr));

// ---- C-13: a failing check refuses the release ----
const broken = join(ventures, "broken");
mentura("init", broken, "--id", "broken", "--layers", "purpose");
writeJson(join(ws, "bp.json"), { venture: "broken", statement: "x", segment: "y", evidence: [] });
mentura("foundation/problem", "write", "--venture", "broken", "--input", join(ws, "bp.json"), "--as", "person");
const lines = readFileSync(join(broken, "provenance.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
lines[0].note = "edited after the fact";
writeFileSync(join(broken, "provenance.jsonl"), lines.map((e) => JSON.stringify(e)).join("\n") + "\n");
const bb = build(broken);
expect("C-13: a failing check (an edited provenance line) refuses the release", bb.status === 1 && /check-provenance/.test(bb.stderr) && !existsSync(join(broken, ".release/release.json")), bb.stderr);
lines[0].hash = lineHash("genesis", lines[0]);
writeFileSync(join(broken, "provenance.jsonl"), lines.map((e) => JSON.stringify(e)).join("\n") + "\n");
writeFileSync(join(broken, "foundation/problem.json"), JSON.stringify({ ...JSON.parse(readFileSync(join(broken, "foundation/problem.json"), "utf8")), statement: "edited by hand" }));
const edited = build(broken);
expect("C-13, P-31: a confirmed record edited by hand afterwards is no longer confirmed, and blocks", edited.status === 1 && /changed since its last provenance entry/.test(edited.stderr), edited.stderr);
expect("start-release without a release says to build one, exit 1", start(broken, "--get", "/").status === 1);

rmSync(ws, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
