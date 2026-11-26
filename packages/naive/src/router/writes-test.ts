#!/usr/bin/env node
// Tests for the writes group of the Next.js translation (M-3, M-9, M-17, E-5, E-6, E-8, P-3, P-15,
// P-17, P-22, P-28, P-32, P-36, P-37, L-6, L-9, L-10, O-1, O-2, O-3) on a venture made in a temp folder:
// what a write answers and where to go next, the actions a layout offers, package and group routes,
// private folders and reserved names, metadata, filters, params, the read hierarchy, and the error
// boundaries down to a broken venture.json and a broken data model. Never writes into the repository.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dataModelFile, recordsIn } from "../records/index.ts";
import type { CallArgs } from "./router.ts";

/** A row of a router answer, read field by field. */
type Row = Record<string, unknown>;
/** What a record's metadata holds (O-1, O-2, O-3), as far as these tests read it. */
type Metadata = {
  venture?: { id: string; phase: string }; record: { type: string; route: string }; id?: string; created?: string; updated?: string; by?: { kind: string };
  writes: number; from?: string; note: string; frontmatter?: { title?: string; tags: string[] }; items: Record<string, { id: string; by: { kind: string } }>;
  derived?: { function?: string; owner?: string; by?: string; state?: string; counts?: Record<string, number>; count?: number };
};
/** One level of the read hierarchy (P-28). */
type Level = { level: string; caught?: boolean; holds?: { chain?: string[]; need_now?: { status: string } } };
/** The fields a router answer carries beside its result, as far as these tests read them. */
type Extras = {
  params?: { id?: string }; filtered?: { matched: number; of: number }; filtered_out?: unknown; metadata?: Metadata; hierarchy?: Level[]; resolved_by?: string;
  errors?: Record<string, { error?: string }>; fix?: { schema?: string; template?: string; skills: unknown[] }; pending_drafts?: unknown[]; source?: { address?: string };
  global_error?: { scope: string; problem: string; recovery: string[]; template?: { id: string; layers: unknown } };
};
/** A router answer whose result has the shape T the route gives. The test names T at each call; the router types result as unknown. */
type Reply<T> = { ok: boolean; error?: string; result: T } & Extras;
/** What a write answers (M-3, M-17). */
type Written = {
  changed?: { record?: { from: string; to: string; package: string }; packages?: { package: string; progress: { from: number; to: number } }[]; moves_now?: Row[]; need_now?: Row[] };
  next?: { route: string; action: string; command: string; who?: string }; draft?: boolean;
};
/** A package's own route (L-6, P-37). */
type PackageRead = { package: string; kind?: string; records: Row[]; progress: number; moves_now: string[]; waits: unknown; loading: { drafts: { route: string; accept: string }[] } | null };
/** One route a layout lists with its actions (M-9). */
type ActionRow = { route: string; actions?: string[]; available: string[]; write?: { lands: string | null; why: string } };
/** A layout (L-9, P-36, M-9). */
type Layout = {
  params?: { id?: string }; instructions: Record<string, string>; chain: { path: string }[]; group?: { group: string; packages: string[]; context?: string };
  actions?: { folder: string; routes: ActionRow[] };
};
/** A list read: its items by id. */
type Items = Record<string, Row>;
/** One package as the overview's @packages slot shows it (P-17). */
type PackageSlot = { package: string; default?: boolean; shows: string; start: string; state?: unknown };
/** The overview (P-17). */
type Overview = { slots: { slot: string; data: PackageSlot[] }[] };
/** The venture route's manifest (P-3). */
type VentureRead = { packages: { declared: boolean; list: Row[] }; kits: { extends: string }[]; functions: { function: string; owner?: string }[] };

const repo = new URL("../../../..", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: unknown, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };

const ws = mkdtempSync(join(tmpdir(), "writes-test-"));
process.env.MENTURA_WORKSPACE = ws;
delete process.env.MENTURA_ACTOR_ID;
const env = { ...process.env, MENTURA_WORKSPACE: ws };
const cli = (...a: string[]) => spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.ts"), ...a], { encoding: "utf8", env });
const init = (id: string) => { const p = cli("init", join(ws, "ventures", id), "--id", id, "--layers", "purpose"); if (p.status !== 0) throw new Error(p.stderr); return join(ws, "ventures", id); };
const put = (dir: string, rel: string, x: unknown) => { mkdirSync(join(dir, rel, ".."), { recursive: true }); writeFileSync(join(dir, rel), typeof x === "string" ? x : JSON.stringify(x, null, 2) + "\n"); };

const acme = init("acme");
const other = init("other");
const { call, routes, ventures } = await import("./router.ts");
const { next } = await import("./writes.ts");
const { structure, manifest, checkManifest, routable } = await import("../engine/structure.ts");
const { boundaries, recover, ventureHealth, frameworkHealth } = await import("./boundaries.ts");
const c = async <T = Items>(route: string, action: string, extra: Partial<CallArgs> = {}) => (await call({ venture: "acme", route, action, workspace: ws, ...extra })) as Reply<T>;

// M-3 and M-17: a write answers with what it changed and the next route.
const problem = { venture: "acme", statement: "Solo physios lose their evenings to booking calls", segment: "solo physiotherapy clinics", evidence: [] };
const w1 = await c<Written>("foundation/problem", "write", { input: problem, actor: "person" });
const ch = w1.result?.changed;
expect("M-3: a write answers with the record's state before and after", ch?.record?.from === "missing" && ch?.record?.to === "confirmed" && ch?.record?.package === "foundation", ch);
expect("M-3: it names each package whose progress moved", ch?.packages?.some((p: { package: string; progress: { from: number; to: number } }) => p.package === "foundation" && p.progress.to > p.progress.from), ch?.packages);
expect("M-3: it names the records that move now because of it", ch?.moves_now?.some((m: Row) => m.record === "validation-solution" && m.route === "validation/solution"), ch?.moves_now);
// naive#71: a record that names another venture is refused, and nothing is written.
const wrongVenture = await c<Written>("foundation/problem", "write", { venture: "other", input: problem, actor: "person" });
expect("a record whose venture field names another venture is refused", !wrongVenture.ok && /names venture acme, but it is being written to other/.test(wrongVenture.error ?? ""), wrongVenture);
expect("M-3: it names the need-now rows it settled", ch?.need_now?.some((n: Row) => n.record === "validation-problem" && n.from === "suggest now" && n.to === "held"), ch?.need_now);
expect("M-17: a write answers with the next route: the next required record in its package", w1.result?.next?.route === "foundation/icp/[id]" && w1.result.next.action === "write" && /mentura foundation\/icp\/<id> write --venture acme/.test(w1.result.next.command), w1.result?.next);
const w2 = await c<Written>("validation/solution", "write", { input: { venture: "acme", statement: "Online booking", alternatives: ["a receptionist"], evidence: [] } });
expect("M-17: after an agent's write, the next step is a person reviewing it", w2.result?.next?.action === "review" && w2.result.next.route === "validation/solution" && w2.result.next.who === "a person", w2.result?.next);
const w3 = await c<Written>("foundation/problem", "write", { input: { ...problem, statement: "Physios lose evenings" } });
expect("M-17: after a write held as a draft, the next route is accepting it", w3.result?.draft === true && w3.result.next?.action === "accept" && w3.result.next.command === "mentura accept foundation/problem --venture acme", w3.result?.next);
const cliW = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.ts"), "validation/solution", "write", "--venture", "acme", "--input", "-", "--as", "person"], { encoding: "utf8", env, input: JSON.stringify({ venture: "acme", statement: "Online booking", alternatives: ["a receptionist"], evidence: [] }) });
const cliOut = JSON.parse(cliW.stdout || "{}");
expect("M-3 and M-17 through the CLI: the answer carries changed and next", cliW.status === 0 && cliOut.changed?.record?.to === "confirmed" && cliOut.next?.route, cliW.stderr || cliOut);

// A next write is suggested only when that route has the action. knowledge/venture-profile has read, view and layout.
type RouteRow = { route: string; kind: string; record?: string; actions: string[]; collection?: string };
type Hint = { route: string | null; action: string | null; command?: string };
const routeTable = routes() as RouteRow[];
const quiet = {
  packages: { core: [] as { id: string; title?: string; records: { record: string; role?: string; moves?: string; status?: string }[] }[], handoff: [] as [] },
  need: { rows: [] as { type: string; status: string; now: number; why?: string }[] },
  decisions: null as null,
};
const probe = { record: undefined as string | undefined, route: "probe", draft: null, venture: "acme", change: { moves_now: [] as { record: string; package: string; route: string | null }[] } };
const named = (route: string | null, action: string | null) => !!route && !!action && routeTable.some((r) => r.route === route && r.actions.includes(action));
const violations: string[] = [];
const checkHint = (label: string, hint: Hint) => { if (hint.route && hint.action && !named(hint.route, hint.action)) violations.push(`${label} -> ${hint.route} ${hint.action}`); };
const recordTypes = [...new Set(routeTable.filter((r) => r.kind === "record" && r.record).map((r) => String(r.record)))];
for (const type of recordTypes) {
  checkHint(`need-now ${type}`, await next({ ...quiet, need: { rows: [{ type, status: "suggest now", now: 1, why: "probe" }] } }, probe) as Hint);
  checkHint(`required ${type}`, await next({
    ...quiet,
    packages: { core: [{ id: "foundation", title: "Foundation", records: [
      { record: "validation-problem", role: "required", moves: "now", status: "confirmed" },
      { record: type, role: "required", moves: "now", status: "missing" },
    ] }], handoff: [] },
  }, { ...probe, record: "validation-problem", route: "foundation/problem" }) as Hint);
}
for (const r of routeTable) {
  if (r.kind !== "record") continue;
  checkHint(`moves ${r.route}`, await next(quiet, { ...probe, change: { moves_now: [{ record: r.record ?? r.route, package: "p", route: r.route }] } }) as Hint);
}
expect("every next the router can produce names a route that has the suggested action", violations.length === 0, violations.filter((v) => v.includes("venture-profile")).concat(violations).slice(0, 8).join("; "));
const profileHint = await next({ ...quiet, need: { rows: [{ type: "venture-profile", status: "suggest now", now: 1, why: "A few sentences on what the venture is" }] } }, probe) as Hint;
expect("need-now gives no next for knowledge/venture-profile, which has no write", profileHint.route === null && profileHint.action === null && profileHint.command === undefined, profileHint);
const problemHint = await next({ ...quiet, need: { rows: [{ type: "validation-problem", status: "suggest now", now: 1, why: "probe" }] } }, probe) as Hint;
expect("need-now still suggests a write when the route has one", problemHint.action === "write" && problemHint.route === "foundation/problem" && named(problemHint.route, problemHint.action) && /mentura foundation\/problem write --venture acme/.test(problemHint.command ?? ""), problemHint);
const movedProfile = await next(quiet, { ...probe, change: { moves_now: [{ record: "venture-profile", package: "knowledge", route: "knowledge/venture-profile" }] } }) as Hint;
expect("a record that now moves is not a next write when its route has no write", movedProfile.route === null && movedProfile.action === null, movedProfile);

const badFile = join(ws, "not.json");
writeFileSync(badFile, "not json\n");
const provPath = join(acme, "provenance.jsonl");
const beforeProv = existsSync(provPath) ? readFileSync(provPath, "utf8") : "";
const badW = cli("knowledge/venture-profile", "write", "--venture", "acme", "--input", badFile, "--as", "person");
const afterProv = existsSync(provPath) ? readFileSync(provPath, "utf8") : "";
const errLine = badW.stderr.trim();
expect("a write with non-JSON input exits 2 with one line naming the file and the parse error, and writes no provenance",
  badW.status === 2 && errLine.split("\n").length === 1 && errLine.startsWith(`${badFile}: `) && /Unexpected token/.test(errLine) && /not valid JSON/.test(errLine) && afterProv === beforeProv && badW.stdout === "",
  { status: badW.status, stderr: badW.stderr.slice(0, 400), stdout: badW.stdout });

// P-37 and L-6: a package's own route.
const fnd = await c<PackageRead>("foundation", "read");
expect("L-6: a package's route returns its records and their state", fnd.ok && fnd.result.package === "foundation" && fnd.result.records.some((r: Row) => r.route === "foundation/problem" && r.status === "draft") && typeof fnd.result.progress === "number", fnd);
expect("L-6: it says what moves now and what waits", fnd.result?.moves_now?.includes("foundation/icp/[id]") && Array.isArray(fnd.result.waits), fnd.result);
expect("P-37: a package's pending state lists its drafts and how to accept them", fnd.result?.loading?.drafts?.[0]?.route === "foundation/problem" && fnd.result.loading.drafts[0].accept === "mentura accept foundation/problem --venture acme" && fnd.pending_drafts?.length === 1, fnd.result?.loading);
const val = await c<PackageRead>("validation", "read");
expect("P-37: a package with no drafts has no pending state", val.ok && val.result.loading === null, val.result?.loading);
const prod = await c<PackageRead>("packages/product", "read");
expect("L-6: packages/<name> reaches a package whose name is also a record route", prod.ok && prod.result.package === "product" && prod.result.kind === "core", prod);
const view = await c<string>("validation", "view");
expect("L-6: a package's view is a Markdown page", view.ok && /^# Validation\n/.test(view.result) && /\| validation\/solution \|/.test(view.result), view.result);
expect("L-6: a package route refuses an action it does not have", (await c("validation", "write", { input: {} })).ok === false);

// L-9 and L-10: params and filters.
await c("customers/ada", "write", { input: { id: "ada", name: "Ada", status: "active", segment: "clinic" }, actor: "person" });
await c("customers/bo", "write", { input: { id: "bo", name: "Bo", status: "lapsed", segment: "gym" }, actor: "person" });
const ada = await c<Row>("customers/ada", "read");
expect("L-9: a read of an item carries its params", ada.ok && ada.params?.id === "ada" && ada.result.name === "Ada", ada);
put(acme, "customers/AGENTS.md", "# Customers\n\ncustomer: [id]\n");
put(acme, "accounts/ada/AGENTS.md", "# Ada's account\n\naccount_note: keep it short\n");
const lay = await c<Layout>("customers/ada", "layout");
expect("L-9: an item's params reach every layout below it: [id] in an instruction becomes the id", lay.ok && lay.result.params?.id === "ada" && lay.result.instructions.customer === "ada", lay.result?.instructions);
const acct = await c<Layout>("purpose/account/ada", "layout");
expect("L-9: the item's own folder AGENTS.md joins its layout chain", acct.ok && acct.result.chain.map((x: Row) => x.path).includes("accounts/ada/AGENTS.md") && acct.result.instructions.account_note === "keep it short", acct.result?.chain?.map((x: Row) => x.path));
const active = await c("customers", "read", { input: { where: { status: "active" } } });
expect("L-10: where filters a list by a field", active.ok && Object.keys(active.result).join() === "ada" && active.filtered?.matched === 1 && active.filtered.of === 2, active);
const bySeg = await c("customers", "read", { input: { where: { segment: ["gym", "school"] } } });
expect("L-10: a filter value may be a list of values", Object.keys(bySeg.result ?? {}).join() === "bo", bySeg.result);
const byState = await c("customers", "read", { input: { where: { state: "confirmed" } } });
expect("L-10: where can filter by a derived field (state)", Object.keys(byState.result ?? {}).sort().join() === "ada,bo", byState.result);
const miss = await c<Row | null>("customers/ada", "read", { input: { where: { status: "lapsed" } } });
expect("L-10: a single record that does not match comes back null with filtered_out", miss.ok && miss.result === null && miss.filtered_out, miss);
const cliWhere = cli("customers", "read", "--venture", "acme", "--where", "status=lapsed");
expect("L-10: the CLI's --where filters a read", cliWhere.status === 0 && Object.keys(JSON.parse(cliWhere.stdout)).join() === "bo", cliWhere.stdout + cliWhere.stderr);
const cliAny = cli("customers", "read", "--venture", "acme", "--where", "status=lapsed|trial");
expect("L-10: a CLI filter value lists alternatives with |", cliAny.status === 0 && Object.keys(JSON.parse(cliAny.stdout)).join() === "bo", cliAny.stdout + cliAny.stderr);

// O-1, O-2, O-3: metadata.
const pr = await c<Row>("validation/solution", "read");
const md = pr.metadata;
expect("O-1: a read's metadata carries the venture's identity and the record's type", md?.venture?.id === "acme" && md.venture.phase === "discovery" && md.record.type === "validation-solution" && md.record.route === "validation/solution", md);
expect("O-2: derived fields come from code: function, owner, state, counts", md?.derived?.function === "strategy" && md.derived.owner === "the founder" && md.derived.by === "code" && md.derived.state === "confirmed" && md.derived.counts?.alternatives === 1, md?.derived);
expect("O-3: every record gets id, created, updated and who wrote it last", md?.id === "validation-solution" && md.created && md.updated && md.by?.kind === "person" && md.writes >= 2 && md.from === "provenance", md);
const list = await c("customers", "read");
expect("O-2 and O-3: a list's metadata counts its items and gives each one its fields", list.metadata?.derived?.count === 2 && list.metadata.items.ada.id === "ada" && list.metadata.items.ada.by.kind === "person", list.metadata);
put(acme, "ideas/map.mdx", "---\ntitle: Acme's ideas\ntags: [ideas, acme]\n---\n\n## Ideas\n");
const map = await c<string>("ideas/map", "read");
expect("O-1: a Markdown record's frontmatter is its metadata", map.metadata?.frontmatter?.title === "Acme's ideas" && map.metadata.frontmatter.tags.join() === "ideas,acme", map.metadata);
expect("O-3: a file written outside the router says so and how to adopt it", map.metadata?.from === "file" && /baseline/.test(map.metadata.note), map.metadata);

// P-28: the hierarchy.
const h1 = await c<Row | null>("foundation/icp", "read", { input: { hierarchy: true } });
expect("P-28: a read lists its levels in order: layout, template, error, loading, not-found, page", h1.hierarchy?.map((l: Row) => l.level).join() === "layout,template,error,loading,not-found,page", h1.hierarchy);
expect("P-28: a missing record resolves at not-found", h1.resolved_by === "not-found" && h1.hierarchy?.find((l) => l.level === "not-found")?.caught, h1.resolved_by);
expect("P-28: the layout and template levels hold the context and the fresh context", h1.hierarchy?.[0].holds?.chain?.[0] === "AGENTS.md" && h1.hierarchy[1].holds?.need_now?.status, h1.hierarchy?.slice(0, 2));
expect("P-28: a record with a draft waiting resolves at loading", (await c("foundation/problem", "read")).resolved_by === "loading");
expect("P-28: a record that is there resolves at page", (await c("validation/solution", "read")).resolved_by === "page");
const cliH = cli("foundation/icp", "read", "--venture", "acme", "--hierarchy");
expect("P-28: the CLI's --hierarchy shows the levels", cliH.status === 0 && JSON.parse(cliH.stdout).hierarchy?.length === 6, cliH.stdout + cliH.stderr);

// E-6: per-record containment.
put(acme, "customers/cy.json", "{ \"id\": \"cy\", ");
const contained = await c("customers", "read");
expect("E-6: one bad record does not fail its list: the others come back", contained.ok && Object.keys(contained.result).sort().join() === "ada,bo", contained);
expect("E-6: the bad record is named with why", /customers\/cy\.json does not parse/.test(contained.errors?.cy?.error ?? ""), contained.errors);
const bad = await c<Row | null>("customers/cy", "read");
expect("E-6: reading the bad record alone is that record's error, not a crash", bad.ok === false && /does not parse/.test(bad.error ?? "") && bad.fix?.schema && bad.resolved_by === "error", bad);
const cliBad = cli("customers", "read", "--venture", "acme");
expect("E-6: the CLI shows the contained error beside the good records", cliBad.status === 0 && JSON.parse(cliBad.stdout).errors?.cy, cliBad.stdout + cliBad.stderr);
rmSync(join(acme, "customers/cy.json"));

// P-22: private folders.
put(acme, "customers/_notes/dee.json", { id: "dee" });
put(acme, "customers/_old.json", { id: "old" });
put(acme, "customers/_streams/visits/stream.json", { id: "visits", sensitive: false });
put(acme, "marketing/content/home.mdx", "---\naudience: owners\n---\n\nHi\n");
put(acme, "marketing/content/_notes/idea.mdx", "---\naudience: owners\n---\n\nNot yet\n");
const priv = await c("customers", "read");
expect("P-22: a file under a private folder or with a private name is never routed", priv.ok && Object.keys(priv.result).sort().join() === "ada,bo", Object.keys(priv.result ?? {}));
const streams = await c("purpose/data-stream", "read");
expect("P-22: a private folder the data model names (_streams) is still routed", streams.ok && streams.result && Object.keys(streams.result).includes("visits"), streams);
const content = await c<string>("marketing/content", "read");
expect("P-22: a ** route never descends into a private folder", content.ok && /Hi/.test(content.result) && !/Not yet/.test(content.result) && /home\.mdx$/.test(content.source?.address ?? ""), content);
expect("P-22: routable() needs each private segment named in the pattern", routable("customers/_streams/v/stream.json", "customers/_streams/*/stream.json") && !routable("customers/_old.json", "customers/*.json"));
const st = structure(acme);
expect("P-22: the structure check lists the private folders and what each holds", st.errors.length === 0 && st.private.some((p) => p.folder === "_drafts/") && st.private.some((p) => p.folder === "customers/_notes/" && /notes/.test(p.holds)), st);

// P-32: reserved names.
put(acme, "marketing/layout.md", "# not a layout yet\n");
put(acme, "marketing/_streams/x/stream.json", { id: "x", sensitive: false });
put(acme, "validation/naive.config.json", "{}");
const s2 = structure(acme);
expect("P-32: a name reserved for a later convention warns", s2.warnings.some((w) => /marketing\/layout\.md: layout\.md is reserved/.test(w)), s2.warnings);
expect("P-32: _streams outside a data package is an error", s2.errors.some((e) => /marketing\/_streams\/: _streams\/ belongs directly under a data package/.test(e)), s2.errors);
expect("P-32: naive.config.json away from the root is an error", s2.errors.some((e) => /validation\/naive\.config\.json/.test(e)), s2.errors);
const cliS = spawnSync("node", [join(repo, "packages/naive/src/engine/structure.ts"), acme], { encoding: "utf8" });
expect("P-32: node packages/naive/src/engine/structure.ts exits 1 on a misused reserved name", cliS.status === 1 && /_streams/.test(cliS.stderr), cliS.stdout + cliS.stderr);
rmSync(join(acme, "marketing/layout.md")); rmSync(join(acme, "marketing/_streams"), { recursive: true }); rmSync(join(acme, "validation/naive.config.json"));

// P-36: route groups.
put(acme, "(go-to-market)/AGENTS.md", "# Go to market\n\naudience: clinic owners\n");
const gl = await c<Layout>("marketing/sitemap", "layout");
expect("P-36: a package in a group gets the group's layout", gl.ok && gl.result.group?.group === "(go-to-market)" && gl.result.group.packages.includes("relationships"), gl.result?.group);
expect("P-36: the group's AGENTS.md sits after the venture root's in the chain", gl.result?.chain?.map((x: Row) => x.path).slice(0, 2).join() === "AGENTS.md,(go-to-market)/AGENTS.md" && gl.result.instructions.audience === "clinic owners", gl.result?.chain?.map((x: Row) => x.path));
const fl = await c<Layout>("foundation/problem", "layout");
expect("P-36: the group layout is opt-in: a package outside it does not get it", fl.ok && !fl.result.group && !fl.result.chain.some((x: { path: string }) => x.path.startsWith("(")), fl.result?.group);
put(acme, "naive.config.json", { groups: { strategy: { packages: ["foundation", "validation"], context: "The problem and the proof travel together." } } });
const fl2 = await c<Layout>("foundation/problem", "layout");
expect("P-36: a venture adds a group in naive.config.json", fl2.result?.group?.group === "(strategy)" && fl2.result.group.context === "The problem and the proof travel together.", fl2.result?.group);
const gr = await c<{ packages: Row[] }>("(go-to-market)", "read");
expect("P-36: a group's route reads its packages' states", gr.ok && gr.result.packages.map((p: Row) => p.package).join() === "marketing,relationships,customers", gr.result);
expect("P-36: a group folder holding only its AGENTS.md passes the structure check", structure(acme).errors.length === 0, structure(acme).errors);
put(acme, "(go-to-market)/plan.json", {});
expect("P-36: a group folder holding records fails the structure check", structure(acme).errors.some((e) => /\(go-to-market\)\/: a route group/.test(e)));
rmSync(join(acme, "(go-to-market)/plan.json"));

// M-9: a layout lists the actions available in its folder.
const al = await c<Layout>("validation/solution", "layout");
const pricing = al.result?.actions?.routes?.find((x: Row) => x.route === "validation/pricing");
expect("M-9: a layout lists the routes in its folder with their actions", al.result?.actions?.folder === "validation" && al.result.actions.routes.length >= 5 && pricing?.actions?.includes("write"), al.result?.actions);
expect("M-9: it says whether an agent's write lands as the record", pricing?.write?.lands === "record" && pricing.available.includes("write"), pricing);
const fa = await c<Layout>("foundation/problem", "layout");
expect("M-9: a gated record's write lands as a draft for an agent, with why", fa.result?.actions?.routes?.find((x: Row) => x.route === "foundation/problem")?.write?.lands === "draft", fa.result?.actions?.routes);
const fp = await c<Layout>("foundation/problem", "layout", { actor: "person" });
expect("M-9: for a person the same write lands as the record", fp.result?.actions?.routes?.find((x: Row) => x.route === "foundation/problem")?.write?.lands === "record");
put(acme, "validation/decisions/pricing.decision.json", { id: "pricing-model", question: "Do we charge per clinic or per seat?", layer: "purpose", boundary: "fail-open", needed_in: "discovery", status: "open", unlocks: [{ activity: "Write the pricing record", routes: ["validation/pricing"] }] });
const locked = (await c<Layout>("validation/solution", "layout")).result.actions?.routes.find((x: Row) => x.route === "validation/pricing");
expect("M-9: a route a decision keeps locked offers no write, and names the decision", locked?.write?.lands === null && /pricing-model/.test(locked.write.why) && !locked.available.includes("write"), locked);
put(acme, "people/team-plan.json", { roles: [{ id: "scribe", occupant: "agent", status: "filled", routes: { read: ["**"], write: ["foundation/**"] } }] });
const robot = (await c<Layout>("validation/solution", "layout", { actor_id: "scribe" })).result.actions?.routes.find((x: Row) => x.route === "validation/solution");
expect("M-9: a role the team plan keeps out of a route is told so", robot?.write?.lands === null && /team plan/.test(robot.write.why), robot);
rmSync(join(acme, "people/team-plan.json")); rmSync(join(acme, "validation/decisions"), { recursive: true });

// P-17: the overview's default for a package with nothing in it.
const ov = await c<Overview>("system/overview", "run");
const slot = ov.result?.slots?.find((s: Row) => s.slot === "@packages")?.data;
expect("P-17: the overview has a @packages slot", Array.isArray(slot), ov.result?.slots?.map((s: Row) => s.slot));
const empty = slot?.find((p: Row) => p.package === "product");
expect("P-17: a package with nothing in it shows its default: what to write first", empty?.default === true && /nothing written yet/.test(empty.shows) && empty.start === "mentura product/<id> write --venture acme --input <file>" , empty);
const fresh = (await c<Overview>("system/overview", "run", { venture: "other" })).result.slots.find((s) => s.slot === "@packages")?.data.find((p) => p.package === "validation");
expect("P-17: the default starts from the template when the route has one", fresh?.default && fresh.start === "mentura validation/solution template, then mentura validation/solution write --venture other --input <file>", fresh);
expect("P-17: a package with records shows its state instead", slot?.find((p: Row) => p.package === "foundation")?.default === undefined && slot?.find((p) => p.package === "foundation")?.state, slot);

// P-3: venture.json declares packages, kits and function owners.
const m0 = await manifest(acme);
expect("P-3: the manifest derives the packages in use when venture.json lists none", !m0.packages.declared && m0.packages.list.some((p: Row) => p.name === "foundation") && m0.packages.list.some((p: Row) => p.name === "customers"), m0.packages);
expect("P-3: a solo founder owns every function", m0.functions.find((f) => f.function === "strategy")?.owner === "the founder", m0.functions);
const vj = JSON.parse(readFileSync(join(acme, "venture.json"), "utf8"));
writeFileSync(join(acme, "venture.json"), JSON.stringify({ ...vj, packages: ["foundation", "validation", "customers"], kits: [{ id: "interviews", extends: "validation" }], functions: { strategy: { owner: "Torian" } } }, null, 2));
const valid = spawnSync(process.execPath, [join(repo, "packages/naive/src/records/validate.ts"), "--schema", "venture.schema.json", "--file", join(acme, "venture.json")], { encoding: "utf8" });
expect("P-3: venture.json with packages, kits and functions matches its schema", valid.status === 0, valid.stdout + valid.stderr);
const m1 = (await c<VentureRead>("venture", "read")).result;
expect("P-3: the venture route reads the manifest: declared packages, kits and owners", m1?.packages?.declared && m1.packages.list.map((p: Row) => p.name).join() === "foundation,validation,customers" && m1.kits[0].extends === "validation" && m1.functions.find((f) => f.function === "strategy")?.owner === "Torian", m1);
expect("P-3: a declared owner reaches a record's derived metadata", (await c("validation/solution", "read")).metadata?.derived?.owner === "Torian");
writeFileSync(join(acme, "venture.json"), JSON.stringify({ ...vj, packages: ["foundation", "nope"], kits: [{ id: "x", extends: "marketing" }], functions: { strategy: {}, dancing: { owner: "me" } } }, null, 2));
const errs = checkManifest(acme);
expect("P-3: the check refuses an unknown package, a kit on a package not in use, an ownerless or unknown function", errs.some((e) => /nope is not a Naive package/.test(e)) && errs.some((e) => /x extends marketing, which the venture does not list/.test(e)) && errs.some((e) => /strategy has no owner/.test(e)) && errs.some((e) => /dancing is not a function/.test(e)), errs);
writeFileSync(join(acme, "venture.json"), JSON.stringify(vj, null, 2) + "\n");

// E-5: boundaries.
writeFileSync(join(acme, "validation/solution.json"), JSON.stringify({ venture: "acme", statement: 5 }));
const b = await boundaries(acme);
const vb = b.packages.find((p) => p.package === "validation"), fb = b.packages.find((p) => p.package === "foundation");
expect("E-5: a failing record in one package is contained there", !b.ok && b.reached === "package" && b.contained?.includes("validation") && vb?.records?.some((r) => r.file === "validation/solution.json" && !r.ok && r.fix?.schema), b);
expect("E-5: the other packages proceed", b.venture.ok && fb?.ok && b.proceeds.includes("foundation"), { venture: b.venture, foundation: fb });
const pc = await c<{ package: string; records: Row[] }>("validation", "check");
expect("E-5: a package's own check runs its boundary", pc.ok === false && pc.result.package === "validation" && pc.result.records.some((r: Row) => !r.ok), pc);
expect("E-5: a sound package's check passes", (await c("foundation", "check")).ok === true);
put(acme, "marketing/_drafts/x.draft", "{}");
const vb2 = await boundaries(acme);
expect("E-5: a venture-level failure reaches the venture", vb2.reached === "venture" && !vb2.venture.ok && vb2.venture.errors?.some((e) => /_drafts\/ is reserved/.test(e)), vb2.venture);
const vc = cli("venture", "check", "--venture", "acme");
expect("E-5: mentura venture check exits 1 when a boundary fails", vc.status === 1, vc.stdout);
rmSync(join(acme, "marketing/_drafts"), { recursive: true });
writeFileSync(join(acme, "validation/solution.json"), JSON.stringify({ venture: "acme", statement: "Online booking", alternatives: [], evidence: [] }, null, 2));

// E-8 and P-15: global errors.
writeFileSync(join(other, "venture.json"), "{ \"id\": \"other\", \"name\": ");
expect("E-8: one broken venture.json does not stop the router finding the others", (await c("validation/solution", "read")).ok);
expect("E-8: ventures lists the broken one as broken", ventures(ws).find((v: Row) => v.id === "other")?.broken === true);
const ge = await c<Row | null>("foundation/problem", "read", { venture: "other" });
expect("E-8: a broken venture.json answers with what is wrong and the recovery steps", !ge.ok && ge.global_error?.scope === "venture" && /does not parse/.test(ge.global_error.problem) && /line 1/.test(ge.global_error.problem) && /Recovery:/.test(ge.error ?? "") && ge.global_error.recovery.some((s: string) => /boundaries\.ts recover/.test(s)), ge);
expect("P-15: the global error carries a minimal venture.json to start from", ge.global_error?.template?.id === "other" && ge.global_error.template.layers, ge.global_error?.template);
const cge = cli("foundation/problem", "read", "--venture", "other");
expect("E-8: the CLI prints the recovery steps and exits 1", cge.status === 1 && /Recovery:/.test(cge.stderr) && !/at .*\.(?:mjs|ts):\d+/.test(cge.stderr), cge.stderr);
writeFileSync(join(other, "venture.json"), JSON.stringify({ id: "other", name: "Other", parent: null, phase: "nowhere", owner: "self", status: "active", layers: {} }));
expect("E-8: a venture.json that parses but has a bad phase is a global error too", /phase "nowhere"/.test(ventureHealth(other)?.problem ?? ""), ventureHealth(other));
writeFileSync(join(other, "venture.json"), "not json");
const rec = cli("venture", "read", "--venture", "other");
const rv = spawnSync("node", [join(repo, "packages/naive/src/router/boundaries.ts"), "recover", other, "--confirm", "recover"], { encoding: "utf8" });
expect("E-8: recover rebuilds a minimal venture.json and keeps the broken one in _private/", rec.status === 1 && rv.status === 0 && ventureHealth(other) === null && readdirSync(join(other, "_private")).some((f) => f.startsWith("venture.json.broken-")), rv.stdout + rv.stderr);
expect("E-8: after recover the venture reads again", (await call({ venture: "other", route: "venture", action: "read", workspace: ws })).ok);
expect("E-8: recover refuses without --confirm recover", spawnSync("node", [join(repo, "packages/naive/src/router/boundaries.ts"), "recover", other], { encoding: "utf8" }).status === 1);
expect("E-8: the framework is sound in this repository", frameworkHealth() === null, frameworkHealth());
// A broken data model, in a copy of the framework so the repository is never touched.
const copy = mkdtempSync(join(tmpdir(), "writes-framework-"));
for (const d of ["schema", "interface", "knowledge", "purpose", "operations", "evidence", "governance", "library", "packages", "platform", "frameworks"]) if (existsSync(join(repo, d))) cpSync(join(repo, d), join(copy, d), { recursive: true });
// The copy resolves its packages (effect, EE-125) from the repository's node_modules.
symlinkSync(join(repo, "node_modules"), join(copy, "node_modules"), "dir");
writeFileSync(recordsIn(copy).dataModelFile(), readFileSync(dataModelFile(), "utf8").slice(0, 500));
const fw = spawnSync("node", [join(copy, "packages/naive/src/interfaces/cli/mentura.ts"), "foundation/problem", "read", "--venture", "acme"], { encoding: "utf8", env });
expect("E-8: a broken data model answers with recovery steps, not a stack trace", fw.status === 1 && /the framework is broken: packages\/naive\/src\/records\/data-model\.json/.test(fw.stderr) && /Recovery:/.test(fw.stderr) && /check-data-model/.test(fw.stderr), fw.stderr.slice(0, 400));
rmSync(copy, { recursive: true, force: true });
const fix = await c<Written>("foundation/problem", "write", { input: { statement: 5 }, actor: "person" });
expect("P-15: a write that fails answers with the package's skill and template", !fix.ok && fix.fix?.template && fix.fix.skills.length, fix.fix);

rmSync(ws, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
